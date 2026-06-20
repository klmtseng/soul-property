/**
 * 檢查點 review 材料產生器：用「真正的引擎 + selectors」走完一局，
 * 把每一步 UI 會顯示的文字逐字印出來。輸出 = 玩家實際會看到的內容。
 *   執行：npx vite-node tools/playthrough.ts
 */
import {
  loadChapter,
  initState,
  reduce,
  getView,
  currentExpression,
  type Action,
  type GameState,
} from "../src/engine/index.js";
import rawCh01 from "../src/data/chapters/ch01_knocking.json";

const chapter = loadChapter(rawCh01);

function expr(s: GameState) {
  return `[立繪:${currentExpression(s)}]`;
}

function render(s: GameState): string {
  const v = getView(s);
  switch (v.phase) {
    case "intro":
      return `${expr(s)} 〔開場〕${v.residentName}（${v.age}）「${v.obsession}」`;
    case "day":
      if (v.mode === "dialogue")
        return `${expr(s)} 〔白天·對話〕${v.speaker}:「${v.line}」`;
      return `${expr(s)} 〔白天·選單〕碎片 ${v.fragments.length}/3${
        v.canEnterNight ? "（可入夜）" : ""
      }`;
    case "night":
      if (v.mode === "outcome") return `${expr(s)} 〔夜晚·結果〕${v.outcome}`;
      return `${expr(s)} 〔夜晚·抉擇〕${v.prompt}\n      選項:${v.options
        .map((o) => o.label)
        .join(" / ")}`;
    case "truth":
      return `${expr(s)} 〔真相 revealed=${v.revealed}〕\n${v.text}`;
    case "ending":
      return `${expr(s)} 〔結局:${v.kind} permanentLoss=${v.permanentLoss}〕\n${
        v.text
      }`;
  }
}

function step(s: GameState, a: Action, label?: string): GameState {
  const next = reduce(s, a);
  if (label) console.log(`  · 玩家:${label}`);
  console.log("    " + render(next).replace(/\n/g, "\n    "));
  return next;
}

function playDay(s: GameState): GameState {
  for (const it of chapter.day.interactions) {
    s = reduce(s, { type: "OPEN_INTERACTION", id: it.id });
    console.log(`  · 互動:${it.trigger}`);
    for (let i = 0; i < it.dialogue.length; i++) {
      s = reduce(s, { type: "ADVANCE_DIALOGUE" });
      if (s.activeInteractionId) console.log("    " + render(s));
    }
    console.log(`    → 收下碎片`);
  }
  return s;
}

function playPath(title: string, knock: string, broadcast: string) {
  console.log(`\n${"═".repeat(60)}\n${title}\n${"═".repeat(60)}`);
  let s = initState(chapter);
  console.log(render(s));
  s = reduce(s, { type: "BEGIN" });

  console.log("\n── 白天 ──");
  s = playDay(s);

  console.log("\n── 夜晚 ──");
  console.log("  《夜間守則》");
  chapter.night.rules.forEach((r, i) => console.log(`    ${i + 1}. ${r}`));
  s = reduce(s, { type: "ENTER_NIGHT" });

  for (const label of [knock, broadcast]) {
    const v = getView(s);
    if (v.phase === "night" && v.mode === "choice") {
      const idx = chapter.night.choices[s.nightChoiceIndex].options.findIndex(
        (o) => o.label === label,
      );
      console.log(`\n  抉擇:${v.prompt}`);
      s = step(s, { type: "CHOOSE", optionIndex: idx }, label);
      s = reduce(s, { type: "ACK_OUTCOME" });
    }
  }

  console.log("\n── 真相 ──");
  console.log("  " + render(s).replace(/\n/g, "\n  "));
  console.log(`  rage=${s.rage} / threshold=${chapter.night.rageThreshold}`);

  console.log("\n── 結局 ──");
  s = reduce(s, { type: "REVEAL_TO_ENDING" });
  console.log("  " + render(s).replace(/\n/g, "\n  "));
}

playPath("路徑 A —— 回敲 + 聽完（唯一安息路徑）", "回敲三下", "聽完");
playPath("路徑 B —— 開門 + 關掉（魂飛魄散）", "開門查看", "關掉");
