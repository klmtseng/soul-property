/**
 * 檢查點 review 材料：用真引擎 + selectors 走完整局，逐字印出 UI 會顯示的文字。
 *   執行：npx vite-node tools/playthrough.ts
 */
import {
  loadChapter,
  initState,
  reduce,
  getView,
  currentExpression,
  visibleOptions,
  type GameState,
} from "../src/engine/index.js";
import rawCh01 from "../src/data/chapters/ch01_knocking.json";

const ch = loadChapter(rawCh01);
const expr = (s: GameState) => `[立繪:${currentExpression(s)}]`;

function render(s: GameState): string {
  const v = getView(s);
  switch (v.phase) {
    case "opening":
      return `${expr(s)} 〔開場〕${v.speaker ? v.speaker + "：" : "（旁白）"}${v.line}`;
    case "intro":
      return `${expr(s)} 〔開場〕${v.residentName}（${v.age}）「${v.obsession}」`;
    case "day":
      if (v.mode === "dialogue") return `${expr(s)} 〔白天〕${v.speaker}:「${v.line}」`;
      return `${expr(s)} 〔白天·選單〕碎片 ${v.fragments.length}/${v.fragmentTotal}${v.canEnterNight ? "（可入夜）" : ""}`;
    case "night":
      if (v.mode === "outcome") return `${expr(s)} 〔夜晚·結果〕${v.outcome}`;
      return `${expr(s)} 〔夜晚·抉擇〕${v.prompt}\n      可選:${v.options.map((o) => o.label).join(" / ")}`;
    case "truth":
      return `${expr(s)} 〔真相 revealed=${v.revealed}〕\n${v.text}`;
    case "ending":
      return `${expr(s)} 〔結局 rank=${v.rank} permanentLoss=${v.permanentLoss}〕\n${v.text}`;
  }
}

function playDay(s: GameState, skip: string[] = []): GameState {
  for (const it of ch.day.interactions) {
    if (skip.includes(it.id)) continue;
    s = reduce(s, { type: "OPEN_INTERACTION", id: it.id });
    console.log(`  · ${it.trigger}`);
    for (let i = 0; i < it.dialogue.length; i++) {
      s = reduce(s, { type: "ADVANCE_DIALOGUE" });
      if (s.activeInteractionId) console.log("    " + render(s));
    }
  }
  return s;
}

function choose(s: GameState, label: string): GameState {
  const c = ch.night.choices[s.nightChoiceIndex];
  const idx = visibleOptions(c, s.collected, s.vars).findIndex((o) => o.label === label);
  console.log(`\n  抉擇〔${c.id}〕:${c.prompt}`);
  console.log(`  · 玩家:${label}`);
  s = reduce(s, { type: "CHOOSE", optionIndex: idx });
  console.log("    " + render(s).replace(/\n/g, "\n    "));
  return reduce(s, { type: "ACK_OUTCOME" });
}

function playPath(title: string, skip: string[], picks: string[]) {
  console.log(`\n${"═".repeat(64)}\n${title}\n${"═".repeat(64)}`);
  let s = initState(ch);
  console.log("\n── 開場〈交接〉──");
  while (getView(s).phase === "opening") {
    console.log("  " + render(s));
    s = reduce(s, { type: "ADVANCE_OPENING" });
  }
  console.log(render(s));
  s = reduce(s, { type: "BEGIN" });
  console.log("\n── 白天 ──");
  s = playDay(s, skip);
  console.log("\n── 夜晚 ──");
  ch.night.rules.forEach((r, i) => console.log(`  守則${i + 1}. ${r}`));
  s = reduce(s, { type: "ENTER_NIGHT" });
  for (const p of picks) s = choose(s, p);
  console.log("\n── 真相 ──\n  " + render(s).replace(/\n/g, "\n  "));
  console.log(`  vars=${JSON.stringify(s.vars)}`);
  s = reduce(s, { type: "REVEAL_TO_ENDING" });
  console.log("\n── 結局 ──\n  " + render(s).replace(/\n/g, "\n  "));
}

playPath("最好結局 —— 回應 + 接住歌 + 替他帶話 + 想通三下", [], [
  "回敲，試著回應她",
  "聽完，一個字都不打斷",
  "跟著哼，替她接上下半句",
  "「我會替他，把話帶到。」",
  "替那個敲不動的早晨，敲完最後三下",
]);
playPath("最壞結局 —— 開門撞見", [], [
  "開門查看",
  "聽完，一個字都不打斷",
  "後退，離牆遠一點",
  "「我不是他。」（糾正她）",
  "催她，天亮了，該走了",
]);
