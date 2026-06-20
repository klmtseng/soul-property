import { describe, it, expect } from "vitest";
import {
  loadChapter,
  initState,
  reduce,
  getView,
  type Action,
  type ChapterData,
  type GameState,
} from "../src/engine/index.js";
import rawCh01 from "../src/data/chapters/ch01_knocking.json";

const ch01 = loadChapter(rawCh01);

// ── 測試輔助：把一局從頭走到結局 ────────────────────────────────────────

/** 白天：依序開啟並讀完每個互動，蒐齊全部碎片，然後入夜。 */
function playDayThenEnterNight(s: GameState): GameState {
  for (const it of s.chapter.day.interactions) {
    s = reduce(s, { type: "OPEN_INTERACTION", id: it.id });
    // 讀完該互動所有對話（最後一次 ADVANCE 會收下碎片並回選單）
    for (let i = 0; i < it.dialogue.length; i++) {
      s = reduce(s, { type: "ADVANCE_DIALOGUE" });
    }
  }
  return reduce(s, { type: "ENTER_NIGHT" });
}

/** 夜晚：用 label 找選項做抉擇並確認 outcome。 */
function chooseByLabel(s: GameState, label: string): GameState {
  const choice = s.chapter.night.choices[s.nightChoiceIndex];
  const idx = choice.options.findIndex((o) => o.label === label);
  expect(idx, `找不到選項「${label}」`).toBeGreaterThanOrEqual(0);
  s = reduce(s, { type: "CHOOSE", optionIndex: idx });
  s = reduce(s, { type: "ACK_OUTCOME" });
  return s;
}

/** 走完一局：白天蒐碎片 → 兩抉擇 → 真相 → 結局。回傳終局狀態。 */
function playChapter(knock: string, broadcast: string): GameState {
  let s = initState(ch01);
  s = reduce(s, { type: "BEGIN" });
  s = playDayThenEnterNight(s);
  s = chooseByLabel(s, knock);
  s = chooseByLabel(s, broadcast);
  expect(s.phase).toBe("truth");
  s = reduce(s, { type: "REVEAL_TO_ENDING" });
  return s;
}

// ── 2.1 可達性表：四列逐一驗證 ──────────────────────────────────────────

describe("結局可達性 (計畫 2.1 表)", () => {
  it("第1列 全做對：回敲 + 聽完 → 安息 (rage=1)", () => {
    const s = playChapter("回敲三下", "聽完");
    expect(s.rage).toBe(1);
    expect(s.ending).toBe("rest");
    expect(s.permanentLoss).toBe(false);
  });

  it("第2列 全做錯：開門 + 關掉 → 魂飛魄散 (rage=6, 不可逆)", () => {
    const s = playChapter("開門查看", "關掉");
    expect(s.rage).toBe(6);
    expect(s.ending).toBe("dissipate");
    expect(s.permanentLoss).toBe(true);
  });

  it("第3列 缺回敲：不理會 + 聽完 → 魂飛魄散 (truth_clue_knock 缺席)", () => {
    const s = playChapter("不理會", "聽完");
    expect(s.collected).not.toContain("truth_clue_knock");
    expect(s.collected).toContain("truth_clue_radio");
    expect(s.ending).toBe("dissipate");
  });

  it("第4列 缺收音機：回敲 + 關掉 → 魂飛魄散 (truth_clue_radio 缺席)", () => {
    const s = playChapter("回敲三下", "關掉");
    expect(s.collected).toContain("truth_clue_knock");
    expect(s.collected).not.toContain("truth_clue_radio");
    expect(s.ending).toBe("dissipate");
  });
});

// ── 機制不變式 ──────────────────────────────────────────────────────────

describe("引擎機制", () => {
  it("白天必須蒐齊全部碎片才能入夜", () => {
    let s = initState(ch01);
    s = reduce(s, { type: "BEGIN" });
    // 只完成第一個互動就嘗試入夜 → 應被拒（仍停在 day）
    const first = ch01.day.interactions[0];
    s = reduce(s, { type: "OPEN_INTERACTION", id: first.id });
    for (let i = 0; i < first.dialogue.length; i++) {
      s = reduce(s, { type: "ADVANCE_DIALOGUE" });
    }
    s = reduce(s, { type: "ENTER_NIGHT" });
    expect(s.phase).toBe("day");
  });

  it("唯一安息路徑：四種抉擇組合中只有一種給好結局", () => {
    const combos: [string, string][] = [
      ["回敲三下", "聽完"],
      ["回敲三下", "關掉"],
      ["不理會", "聽完"],
      ["不理會", "關掉"],
      ["開門查看", "聽完"],
      ["開門查看", "關掉"],
    ];
    const restCount = combos.filter(
      ([k, b]) => playChapter(k, b).ending === "rest",
    ).length;
    expect(restCount).toBe(1);
  });

  it("reduce 為純函式：不修改輸入 state", () => {
    const s = initState(ch01);
    const snapshot = JSON.parse(JSON.stringify(s));
    reduce(s, { type: "BEGIN" });
    expect(s).toEqual(snapshot);
  });

  it("getView 在每個 phase 都能產出對應 view", () => {
    let s = initState(ch01);
    expect(getView(s).phase).toBe("intro");
    s = reduce(s, { type: "BEGIN" });
    expect(getView(s).phase).toBe("day");
    s = playDayThenEnterNight(s);
    expect(getView(s).phase).toBe("night");
  });
});

// ── 載入期把關：schema + 指涉完整性 ────────────────────────────────────

describe("loadChapter 把關", () => {
  it("ch01 通過 schema 與指涉完整性", () => {
    expect(() => loadChapter(rawCh01)).not.toThrow();
  });

  it("schema 不合 → throw", () => {
    const bad = { ...(rawCh01 as object), chapterId: 123 };
    expect(() => loadChapter(bad)).toThrow(/schema/);
  });

  it("指涉斷鏈（revealCondition 指向不存在的旗標）→ throw", () => {
    const broken = structuredClone(rawCh01) as ChapterData;
    broken.truth.revealCondition = [...broken.truth.revealCondition, "ghost_flag"];
    expect(() => loadChapter(broken)).toThrow(/指涉完整性/);
  });

  it("指涉斷鏈（grantsFragment 指向不存在的 fragment）→ throw", () => {
    const broken = structuredClone(rawCh01) as ChapterData;
    broken.day.interactions[0].grantsFragment = "fragZ";
    expect(() => loadChapter(broken)).toThrow(/指涉完整性/);
  });
});

// 抑制未使用型別匯入告警（Action 用於型別檢查文件）
export type _Action = Action;
