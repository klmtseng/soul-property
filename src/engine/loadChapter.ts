import Ajv from "ajv";
import type { ChapterData } from "./types.js";
import schema from "../../schema/chapter.schema.json";

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

/**
 * 載入並驗證一份章節資料。兩道把關互補：
 *  1. ajv —— 驗「格式」是否合 schema（欄位、型別、必填）。
 *  2. 指涉完整性 —— 驗「斷鏈」：grantsFragment / revealCondition / 內部引用的旗標
 *     是否都能在章節內解析得到。ajv 驗不出這種內容 bug。
 * 任一不過即 throw，讓壞章節在載入期就爆，而非跑到一半才出錯。
 */
export function loadChapter(raw: unknown): ChapterData {
  if (!validate(raw)) {
    const msg = (validate.errors ?? [])
      .map((e) => `  - ${e.instancePath || "(root)"} ${e.message}`)
      .join("\n");
    throw new Error(`章節 schema 驗證失敗:\n${msg}`);
  }

  const chapter = raw as unknown as ChapterData;
  assertReferentialIntegrity(chapter);
  return chapter;
}

/** 確認所有 id 引用都能在章節內解析得到，否則 throw。 */
export function assertReferentialIntegrity(chapter: ChapterData): void {
  const errors: string[] = [];

  const fragmentIds = new Set(chapter.day.fragments.map((f) => f.id));
  const unlockIds = new Set<string>();
  for (const choice of chapter.night.choices) {
    for (const opt of choice.options) {
      if (opt.unlocks) unlockIds.add(opt.unlocks);
    }
  }
  // 所有能進入 collected 集合的旗標來源
  const grantableFlags = new Set<string>([...fragmentIds, ...unlockIds]);

  // 每個白天互動的 grantsFragment 必須指向真實 fragment
  for (const it of chapter.day.interactions) {
    if (!fragmentIds.has(it.grantsFragment)) {
      errors.push(
        `interaction "${it.id}".grantsFragment="${it.grantsFragment}" 找不到對應 fragment`,
      );
    }
  }

  // revealCondition 內每個 id 必須是「能被收集到」的旗標
  for (const id of chapter.truth.revealCondition) {
    if (!grantableFlags.has(id)) {
      errors.push(
        `truth.revealCondition 的 "${id}" 無法被任何 fragment 或 unlocks 解鎖（死條件）`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `章節「${chapter.chapterId}」指涉完整性檢查失敗:\n` +
        errors.map((e) => `  - ${e}`).join("\n"),
    );
  }
}
