import Ajv from "ajv";
import type { ChapterData, Condition } from "./types.js";
import schema from "../../schema/chapter.schema.json";

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

/**
 * 載入並驗證一份章節資料。三道把關互補：
 *  1. ajv —— 驗「格式」是否合 schema。
 *  2. 指涉完整性 —— 驗旗標/碎片「斷鏈」。
 *  3. 數值/條件完整性 —— effects/requires/when 引用的 var 與旗標都要真實存在。
 * 任一不過即 throw，讓壞章節在載入期就爆。
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

export function assertReferentialIntegrity(chapter: ChapterData): void {
  const errors: string[] = [];

  // 可被收集的旗標來源：碎片 id ∪ 互動 grantsFlag ∪ 夜晚 option.unlocks
  const fragmentIds = new Set(chapter.day.fragments.map((f) => f.id));
  const grantableFlags = new Set<string>(fragmentIds);
  for (const it of chapter.day.interactions) {
    if (it.grantsFlag) grantableFlags.add(it.grantsFlag);
  }
  for (const choice of chapter.night.choices) {
    for (const opt of choice.options) {
      if (opt.unlocks) grantableFlags.add(opt.unlocks);
    }
  }

  // 已宣告的數值名（startVars 的 key）
  const varNames = new Set(Object.keys(chapter.night.startVars));

  // grantsFragment（若有）必須指向真實 fragment
  for (const it of chapter.day.interactions) {
    if (it.grantsFragment && !fragmentIds.has(it.grantsFragment)) {
      errors.push(`interaction "${it.id}".grantsFragment="${it.grantsFragment}" 找不到對應 fragment`);
    }
  }

  // revealCondition 內每個 id 必須可被收集
  for (const id of chapter.truth.revealCondition) {
    if (!grantableFlags.has(id)) {
      errors.push(`truth.revealCondition 的 "${id}" 無法被任何 fragment/flag/unlocks 解鎖（死條件）`);
    }
  }

  // 夜晚選項：effects 的 var 要存在；requires 的旗標/var 要可解析
  for (const choice of chapter.night.choices) {
    for (const opt of choice.options) {
      for (const e of opt.effects ?? []) {
        if (!varNames.has(e.var)) {
          errors.push(`choice "${choice.id}" 選項「${opt.label}」effects 用了未宣告的 var "${e.var}"`);
        }
      }
      checkCondition(opt.requires, `choice "${choice.id}" 選項「${opt.label}」requires`, grantableFlags, varNames, errors);
    }
  }

  // 結局：when 條件可解析；最後一個必須是 catch-all（無 when）
  chapter.endings.forEach((e, i) => {
    checkCondition(e.when, `ending "${e.id}".when`, grantableFlags, varNames, errors);
    const isLast = i === chapter.endings.length - 1;
    if (isLast && e.when) {
      errors.push(`最後一個結局 "${e.id}" 必須無 when（catch-all），否則可能沒有任何結局成立`);
    }
  });

  if (errors.length > 0) {
    throw new Error(
      `章節「${chapter.chapterId}」完整性檢查失敗:\n` + errors.map((e) => `  - ${e}`).join("\n"),
    );
  }
}

function checkCondition(
  cond: Condition | undefined,
  label: string,
  grantableFlags: ReadonlySet<string>,
  varNames: ReadonlySet<string>,
  errors: string[],
): void {
  if (!cond) return;
  for (const f of [...(cond.allFlags ?? []), ...(cond.anyFlags ?? []), ...(cond.notFlags ?? [])]) {
    if (!grantableFlags.has(f)) errors.push(`${label} 引用了無法解鎖的旗標 "${f}"`);
  }
  for (const k of [...Object.keys(cond.minVars ?? {}), ...Object.keys(cond.maxVars ?? {})]) {
    if (!varNames.has(k)) errors.push(`${label} 引用了未宣告的 var "${k}"`);
  }
}
