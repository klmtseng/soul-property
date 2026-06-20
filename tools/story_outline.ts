/**
 * 從 ch01 章節 JSON 產生「劇情樹狀圖 + 全對話清單 + 字數統計」。
 * 結局用真引擎模擬，保證與實際遊玩一致。
 *   執行：npx vite-node tools/story_outline.ts > STORY_OUTLINE.md
 */
import {
  loadChapter,
  initState,
  reduce,
  visibleOptions,
  type GameState,
} from "../src/engine/index.js";
import rawCh01 from "../src/data/chapters/ch01_knocking.json";

const ch = loadChapter(rawCh01);
const out: string[] = [];
const p = (s = "") => out.push(s);
const count = (s: string) =>
  (s.replace(/\s/g, "").match(/[㐀-鿿豈-﫿A-Za-z0-9]/g) ?? []).length;

// 模擬一條路徑（白天可跳過 flavor），回傳終局
function sim(skip: string[], picks: string[]): GameState {
  let s = initState(ch);
  s = reduce(s, { type: "BEGIN" });
  for (const it of ch.day.interactions) {
    if (skip.includes(it.id)) continue;
    s = reduce(s, { type: "OPEN_INTERACTION", id: it.id });
    for (let i = 0; i < it.dialogue.length; i++) s = reduce(s, { type: "ADVANCE_DIALOGUE" });
  }
  s = reduce(s, { type: "ENTER_NIGHT" });
  for (const label of picks) {
    const c = ch.night.choices[s.nightChoiceIndex];
    const idx = visibleOptions(c, s.collected, s.vars).findIndex((o) => o.label === label);
    s = reduce(s, { type: "CHOOSE", optionIndex: idx });
    s = reduce(s, { type: "ACK_OUTCOME" });
  }
  return reduce(s, { type: "REVEAL_TO_ENDING" });
}

p(`# 《敲牆的人》劇情結構 + 全文清單\n`);
p(`> 由 ch01_knocking.json 自動產生，與實際遊玩一致。`);
p(`> 住戶:${ch.resident.name}（${ch.resident.age}）· 執念:「${ch.resident.obsessionOneLiner}」\n`);

// ── PART 1 樹狀圖 ───────────────────────────────────────────────────────
p(`\n## 一、劇情樹狀圖\n`);
p("```");
p("【開場】接下住戶");
p("   │");
p(`【白天 · 溫情層】${ch.day.interactions.length} 個互動`);
ch.day.interactions.forEach((it, i) => {
  const last = i === ch.day.interactions.length - 1;
  const tag = it.grantsFragment
    ? `🧩 碎片 ${it.grantsFragment}（必做）`
    : it.grantsFlag
      ? `💬 旗標 ${it.grantsFlag}（可選）`
      : "💬 純細節";
  p(`   ${last ? "└" : "├"}─ ${it.id.padEnd(8)} [${tag}]`);
});
p("   │   入夜門檻 = 蒐齊 3 片線索碎片（flavor 互動可選，蒐越全結局越好）");
p("   ▼");
p(`【夜晚 · 恐怖層】守則 ${ch.night.rules.length} 條 → ${ch.night.choices.length} 個循序抉擇層`);
ch.night.choices.forEach((c, ci) => {
  p(`   │`);
  p(`   ◆ L${ci + 1}〔${c.id}〕${c.prompt}`);
  c.options.forEach((o, oi) => {
    const last = oi === c.options.length - 1;
    const fx: string[] = [];
    for (const e of o.effects ?? []) fx.push(`${e.var}${e.delta >= 0 ? "+" : ""}${e.delta}`);
    if (o.unlocks) fx.push(`🔓${o.unlocks}`);
    if (o.requires?.allFlags) fx.push(`需${o.requires.allFlags.join(",")}`);
    if (o.scare) fx.push("😱");
    p(`   ${last ? "└" : "├"}─ ${o.label}  ⟨${fx.join(" / ") || "—"}⟩`);
  });
});
p("   ▼");
p(`【真相門檻】truthRevealed = ${ch.truth.revealCondition.join(" + ")}`);
p("   ▼");
p(`【分級結局】引擎依序取第一個成立者:`);
ch.endings.forEach((e) => {
  const cond = e.when
    ? JSON.stringify(e.when).replace(/"/g, "")
    : "(catch-all 預設)";
  p(`   · [${e.rank}] ${e.id}　when ${cond}`);
});
p("```");

// ── 四級結局代表路徑（引擎實算）────────────────────────────────────────
p(`\n### 四級結局 · 代表路徑（引擎實算）\n`);
const paths: { name: string; skip: string[]; picks: string[] }[] = [
  { name: "回應+聽完+跟著哼+最後敲三下（全互動）", skip: [], picks: ["回敲，試著回應她", "聽完，一個字都不打斷", "跟著哼，替她接上下半句", "替那個敲不動的早晨，敲完最後三下"] },
  { name: "回應+聽完+敲三下，但沒接到歌", skip: [], picks: ["回敲，試著回應她", "聽完，一個字都不打斷", "出聲安撫她", "替那個敲不動的早晨，敲完最後三下"] },
  { name: "回應+敲三下但關掉收音機", skip: [], picks: ["回敲，試著回應她", "關掉", "出聲安撫她", "替那個敲不動的早晨，敲完最後三下"] },
  { name: "開門查看", skip: [], picks: ["開門查看", "聽完，一個字都不打斷", "後退，離牆遠一點", "沉默地陪著她"] },
];
p(`| 代表路徑 | vars | 結局 rank |`);
p(`|---|---|:--:|`);
for (const path of paths) {
  const s = sim(path.skip, path.picks);
  const e = ch.endings.find((x) => x.id === s.endingId)!;
  p(`| ${path.name} | ${JSON.stringify(s.vars)} | **${e.rank}** |`);
}

// ── PART 2 全文清單 ─────────────────────────────────────────────────────
p(`\n## 二、全對話與敘述清單（附字數）\n`);
let grand = 0;
const section = (title: string, lines: string[]) => {
  const n = lines.reduce((a, l) => a + count(l), 0);
  grand += n;
  p(`\n### ${title}　〔${n} 字〕`);
  lines.forEach((l) => p(`- ${l}`));
};

section("開場", [`執念:「${ch.resident.obsessionOneLiner}」`]);
p(`\n#### 白天互動`);
ch.day.interactions.forEach((it) => {
  const tag = it.grantsFragment ? `碎片 ${it.grantsFragment}` : it.grantsFlag ? `旗標 ${it.grantsFlag}` : "細節";
  section(`互動「${it.id}」(${tag})`, [`〔敘述〕${it.trigger}`, ...it.dialogue.map((d) => `「${d}」`)]);
});
p(`\n#### 執念碎片文字`);
section("碎片", ch.day.fragments.map((f) => `[${f.id}] ${f.text}`));
section("夜間守則", ch.night.rules);
p(`\n#### 夜晚抉擇（${ch.night.choices.length} 層）`);
ch.night.choices.forEach((c) => {
  section(`L · 抉擇「${c.id}」`, [
    `〔提示〕${c.prompt}`,
    ...c.options.flatMap((o) => [`【選項】${o.label}`, `　↳${o.outcome}`]),
  ]);
});
section("真相揭露", [ch.truth.text]);
p(`\n#### 四級結局`);
ch.endings.forEach((e) => section(`結局[${e.rank}]「${e.id}」`, [e.text]));

// ── PART 3 字數 ─────────────────────────────────────────────────────────
p(`\n## 三、字數統計\n`);
const dayC = ch.day.interactions.reduce((a, it) => a + count(it.trigger) + it.dialogue.reduce((b, d) => b + count(d), 0), 0);
const fragC = ch.day.fragments.reduce((a, f) => a + count(f.text), 0);
const ruleC = ch.night.rules.reduce((a, r) => a + count(r), 0);
const nightC = ch.night.choices.reduce((a, c) => a + count(c.prompt) + c.options.reduce((b, o) => b + count(o.label) + count(o.outcome), 0), 0);
const truthC = count(ch.truth.text);
const endC = ch.endings.reduce((a, e) => a + count(e.text), 0);
p(`| 區塊 | 字數 |`);
p(`|---|--:|`);
p(`| 白天互動（敘述+對話） | ${dayC} |`);
p(`| 執念碎片 | ${fragC} |`);
p(`| 夜間守則 | ${ruleC} |`);
p(`| 夜晚抉擇（${ch.night.choices.length}層，提示+選項+結果） | ${nightC} |`);
p(`| 真相揭露 | ${truthC} |`);
p(`| 四級結局 | ${endC} |`);
p(`| **內容總字數** | **${dayC + fragC + ruleC + nightC + truthC + endC}** |`);
const dlgLines = ch.day.interactions.reduce((a, it) => a + it.dialogue.length, 0);
const optCount = ch.night.choices.reduce((a, c) => a + c.options.length, 0);
p(`\n> 白天 ${ch.day.interactions.length} 互動 / ${dlgLines} 句對話；夜晚 ${ch.night.choices.length} 層 / 共 ${optCount} 個選項；4 級結局。`);
p(`> 單次通關實際讀到約 = 白天(視蒐集) + 守則 + 該局 4 個抉擇 + 真相 + 1 結局。`);

console.log(out.join("\n"));
