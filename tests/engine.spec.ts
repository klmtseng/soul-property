import { describe, it, expect } from "vitest";
import {
  loadChapter,
  initState,
  reduce,
  getView,
  visibleOptions,
  type ChapterData,
  type EndingRank,
  type GameState,
} from "../src/engine/index.js";
import rawCh01 from "../src/data/chapters/ch01_knocking.json";

const ch01 = loadChapter(rawCh01);

// ── 路徑模擬輔助 ────────────────────────────────────────────────────────

/** 白天為線性 VN：一路推進到自動入夜。 */
function playDay(s: GameState): GameState {
  let guard = 0;
  while (s.phase === "day") {
    s = reduce(s, { type: "ADVANCE_DIALOGUE" });
    if (++guard > 1000) throw new Error("白天推進未收斂");
  }
  return s;
}

/** 用 label 在「目前可見選項」中做抉擇並確認 outcome。 */
function chooseByLabel(s: GameState, label: string): GameState {
  const choice = s.chapter.night.choices[s.nightChoiceIndex];
  const visible = visibleOptions(choice, s.collected, s.vars);
  const idx = visible.findIndex((o) => o.label === label);
  expect(idx, `關卡 ${choice.id} 找不到可見選項「${label}」`).toBeGreaterThanOrEqual(0);
  s = reduce(s, { type: "CHOOSE", optionIndex: idx });
  return reduce(s, { type: "ACK_OUTCOME" });
}

/** 走完開場〈交接〉到 intro，再 BEGIN 進白天。 */
function enterDay(s: GameState): GameState {
  while (s.phase === "opening") s = reduce(s, { type: "ADVANCE_OPENING" });
  return reduce(s, { type: "BEGIN" });
}

interface Path {
  knock: string;
  radio: string;
  grief: string;
  identity: string;
  farewell: string;
}

function play(path: Path): GameState {
  let s = initState(ch01);
  s = enterDay(s);
  s = playDay(s);
  expect(s.phase).toBe("night");
  s = chooseByLabel(s, path.knock);
  s = chooseByLabel(s, path.radio);
  s = chooseByLabel(s, path.grief);
  s = chooseByLabel(s, path.identity);
  s = chooseByLabel(s, path.farewell);
  expect(s.phase).toBe("truth");
  return reduce(s, { type: "REVEAL_TO_ENDING" });
}

function rankOf(s: GameState): EndingRank {
  return ch01.endings.find((e) => e.id === s.endingId)!.rank;
}

// ── 四級結局各有一條可達路徑 ────────────────────────────────────────────

describe("四級結局可達性", () => {
  it("最好(best)：回應+聽完+跟著哼+替他帶話+敲三下 → best", () => {
    const s = play({
      knock: "回敲，試著回應她",
      radio: "聽完，一個字都不打斷",
      grief: "跟著哼，替她接上下半句",
      identity: "「我會替他，把話帶到。」",
      farewell: "替那個敲不動的早晨，敲完最後三下",
    });
    expect(rankOf(s)).toBe("best");
    expect(s.permanentLoss).toBe(false);
    expect(s.collected).toEqual(
      expect.arrayContaining(["learned_song", "soothed", "bridged"]),
    );
  });

  it("好(good)：接到了歌，但身分那關沒替他帶話(缺 bridged) → good 而非 best", () => {
    const s = play({
      knock: "回敲，試著回應她",
      radio: "聽完，一個字都不打斷",
      grief: "跟著哼，替她接上下半句",
      identity: "「是我。我回來了。」（順著她）",
      farewell: "替那個敲不動的早晨，敲完最後三下",
    });
    expect(rankOf(s)).toBe("good");
    expect(s.collected).toContain("soothed");
    expect(s.collected).not.toContain("bridged");
  });

  it("壞(bad)：回應了也敲了三下，但關掉收音機(缺 truth_clue_radio) → bad(不可逆)", () => {
    const s = play({
      knock: "回敲，試著回應她",
      radio: "關掉",
      grief: "出聲安撫她",
      identity: "沉默，不忍心回答",
      farewell: "替那個敲不動的早晨，敲完最後三下",
    });
    expect(rankOf(s)).toBe("bad");
    expect(s.permanentLoss).toBe(true);
    expect(s.collected).toContain("truth_clue_knock");
    expect(s.collected).not.toContain("truth_clue_radio");
    expect(s.collected).not.toContain("door_opened");
  });

  it("最壞(worst)：開門查看 → worst(不可逆)", () => {
    const s = play({
      knock: "開門查看",
      radio: "聽完，一個字都不打斷",
      grief: "出聲安撫她",
      identity: "沉默，不忍心回答",
      farewell: "沉默地陪著她",
    });
    expect(rankOf(s)).toBe("worst");
    expect(s.permanentLoss).toBe(true);
    expect(s.collected).toContain("door_opened");
  });
});

// ── requires 條件適配 ───────────────────────────────────────────────────

describe("requires 選項過濾", () => {
  it("線性白天讀完會蒐齊所有碎片與可選旗標", () => {
    let s = initState(ch01);
    s = enterDay(s);
    s = playDay(s);
    expect(s.phase).toBe("night");
    for (const f of ch01.day.fragments) expect(s.collected).toContain(f.id);
    expect(s.collected).toContain("learned_song");
    expect(s.collected).toContain("took_candy");
  });

  it("學到歌 → grief 關卡看得到「跟著哼」", () => {
    let s = initState(ch01);
    s = enterDay(s);
    s = playDay(s); // 全部互動，含 humming
    s = chooseByLabel(s, "回敲，試著回應她");
    s = chooseByLabel(s, "聽完，一個字都不打斷");
    const grief = ch01.night.choices[s.nightChoiceIndex];
    const labels = visibleOptions(grief, s.collected, s.vars).map((o) => o.label);
    expect(labels).toContain("跟著哼，替她接上下半句");
  });

  it("L1 沒回應(不理會) → L4 看不到「敲完最後三下」(requires answered)", () => {
    let s = initState(ch01);
    s = enterDay(s);
    s = playDay(s);
    s = chooseByLabel(s, "不理會，把頭埋進被子");
    s = chooseByLabel(s, "聽完，一個字都不打斷");
    s = chooseByLabel(s, "出聲安撫她");
    s = chooseByLabel(s, "沉默，不忍心回答");
    const farewell = ch01.night.choices[s.nightChoiceIndex];
    const labels = visibleOptions(farewell, s.collected, s.vars).map((o) => o.label);
    expect(farewell.id).toBe("farewell");
    expect(s.collected).not.toContain("answered");
    expect(labels).not.toContain("替那個敲不動的早晨，敲完最後三下");
  });

  it("L1 有回應(回敲) → L4 看得到「敲完最後三下」", () => {
    let s = initState(ch01);
    s = enterDay(s);
    s = playDay(s);
    s = chooseByLabel(s, "回敲，試著回應她");
    s = chooseByLabel(s, "聽完，一個字都不打斷");
    s = chooseByLabel(s, "出聲安撫她");
    s = chooseByLabel(s, "沉默，不忍心回答");
    const farewell = ch01.night.choices[s.nightChoiceIndex];
    const labels = visibleOptions(farewell, s.collected, s.vars).map((o) => o.label);
    expect(s.collected).toContain("answered");
    expect(labels).toContain("替那個敲不動的早晨，敲完最後三下");
  });
});

// ── 機制不變式 ──────────────────────────────────────────────────────────

describe("引擎機制", () => {
  it("白天線性推進，讀完所有互動後自動入夜", () => {
    let s = initState(ch01);
    s = enterDay(s);
    expect(s.phase).toBe("day");
    // 第一拍是情境敘述（無 speaker），第二拍才是她開口
    expect(getView(s).phase).toBe("day");
    s = playDay(s);
    expect(s.phase).toBe("night");
  });

  it("reduce 為純函式：不修改輸入 state", () => {
    const s = initState(ch01);
    const snapshot = JSON.parse(JSON.stringify(s));
    reduce(s, { type: "BEGIN" });
    expect(s).toEqual(snapshot);
  });

  it("開場 opening → intro → day 的相位轉換", () => {
    let s = initState(ch01);
    expect(s.phase).toBe("opening");
    const lines = ch01.opening!;
    // 點完每一拍才會進 intro
    for (let i = 0; i < lines.length - 1; i++) {
      s = reduce(s, { type: "ADVANCE_OPENING" });
      expect(s.phase).toBe("opening");
    }
    s = reduce(s, { type: "ADVANCE_OPENING" });
    expect(s.phase).toBe("intro");
    s = reduce(s, { type: "BEGIN" });
    expect(s.phase).toBe("day");
  });

  it("getView 在各 phase 都能產出對應 view", () => {
    let s = initState(ch01);
    expect(getView(s).phase).toBe("opening");
    s = enterDay(s);
    expect(getView(s).phase).toBe("day");
    s = playDay(s);
    expect(getView(s).phase).toBe("night");
  });
});

// ── 載入期把關 ──────────────────────────────────────────────────────────

describe("loadChapter 把關", () => {
  it("ch01 通過 schema 與完整性", () => {
    expect(() => loadChapter(rawCh01)).not.toThrow();
  });

  it("schema 不合 → throw", () => {
    expect(() => loadChapter({ ...(rawCh01 as object), chapterId: 123 })).toThrow(/schema/);
  });

  it("revealCondition 指向不存在旗標 → throw", () => {
    const broken = structuredClone(rawCh01) as ChapterData;
    broken.truth.revealCondition = [...broken.truth.revealCondition, "ghost_flag"];
    expect(() => loadChapter(broken)).toThrow(/完整性/);
  });

  it("effects 用未宣告的 var → throw", () => {
    const broken = structuredClone(rawCh01) as ChapterData;
    broken.night.choices[0].options[0].effects = [{ var: "nonsense", delta: 1 }];
    expect(() => loadChapter(broken)).toThrow(/完整性/);
  });

  it("ending.when 引用無法解鎖的旗標 → throw", () => {
    const broken = structuredClone(rawCh01) as ChapterData;
    broken.endings[0].when = { allFlags: ["never_grantable"] };
    expect(() => loadChapter(broken)).toThrow(/完整性/);
  });

  it("最後一個結局帶 when（非 catch-all）→ throw", () => {
    const broken = structuredClone(rawCh01) as ChapterData;
    broken.endings[broken.endings.length - 1].when = { allFlags: ["fragA"] };
    expect(() => loadChapter(broken)).toThrow(/catch-all|完整性/);
  });

  it("opening speaker 不在 cast → throw", () => {
    const broken = structuredClone(rawCh01) as ChapterData;
    broken.cast = {};
    expect(() => loadChapter(broken)).toThrow(/完整性/);
  });
});
