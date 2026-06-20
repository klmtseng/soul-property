# PROGRESS —《靈魂物業公司》

> 里程碑錨點 + backlog。每次動工先讀這裡，知道現在在哪、下一步是什麼。

## 現況:ch01 擴寫版（小說優先→分支化）技術項完成，**等人類情緒/長度驗收**

里程碑路徑(spec 7.2):M1 純文字 → M2 接佔位圖驗呈現層 → M3 Blender 真實美術 → M4 第二章驗模組化。

### ch01 擴寫（2026-06-20，小說優先）

- [x] Phase A:`STORY_knocking.md` 正典短篇小說（~2,700 字，含四結局光譜）→ 已過人類驗收。
- [x] Phase B 引擎一般化:`rage`→多數值 `vars`/`effects`、選項 `requires` 條件適配、分級結局
  `endings[]`(best/good/bad/worst) 結構化 `when` 依序結算、入夜門檻改線索碎片、互動 `grantsFlag`、
  `loadChapter` 三道把關（schema+指涉+數值/條件）、`conditions.ts`(evalCondition/visibleOptions)。
- [x] Phase C:白天 7 互動（3 碎片必做 + 4 可選旗標）、夜晚 **4 層**（敲牆/收音機/哭聲哼歌/送別）
  每層 3–4 選項、**4 級結局**。唯 best 需在白天學到歌+夜晚接住歌；開門→最壞；缺線索→壞。
- [x] Vitest **15/15 綠**（四級結局各可達 + requires 過濾 + 三道把關斷鏈）。tsc/build 綠。
- [x] 已部署 https://soul-property.vercel.app（git push 自動部署）。

> 內容總字數 ~2,712;單次通關實際讀 ~1,600–1,700 字 + 7 互動探索 + 4 層抉擇 ≈ 10–13 分鐘，
> 集滿四結局 ≈ 20+ 分鐘。**若要單次通關就撐到 15–20 分鐘,需再加厚（backlog）。**

---

### M1 完成項（2026-06-20，擴寫前的基礎，保留備查）

- [x] 三層分離骨架就位:資料層 JSON / 引擎層純 TS / 呈現層 React。
- [x] `ch01_knocking.json` —《敲牆的人》全內容（spec 第 4 節文案）。
- [x] 章節 JSON Schema + ajv 驗證 + 載入期指涉完整性檢查（`loadChapter`）。
- [x] 引擎:`initState / reduce / selectors`，純函式、零 DOM。
- [x] Vitest 12 測試全綠:可達性表 4 列 + 唯一安息路徑 + 載入把關 + 純函式不變式。
- [x] `tsc --noEmit` 零錯誤;`vite build` 成功。
- [x] PIL 佔位圖產線 `tools/gen_placeholders.py`（3 立繪 + 2 背景）。
- [x] React 呈現層:開場/白天/夜晚/真相/結局 + 手機直式 CSS。

### 怨氣數值（釘死，見計畫 2.1）

`startRage=3`、`rageThreshold=3`;回敲 −1 / 不理會 +1 / 開門 +2(scare)、聽完 −1 / 關掉 +1。
安息唯一路徑 = 回敲 + 聽完(rage=1，兩線索旗標到齊)。

### 已部署（手機測試用）

- 線上:https://soul-property.vercel.app  · repo:https://github.com/klmtseng/soul-property
- `git push` 自動重新部署（vercel git connect 已串）。

### 待人類驗收（檢查點，spec 7.3）

- [ ] 手機開 https://soul-property.vercel.app 走兩結局，確認**情緒是否到位**（恐怖→鼻酸）。
- [ ] review 重點一:立繪表情驅動（白天 calm；夜晚由 rage 區間 calm/uneasy/broken；結局 rest=calm、dissipate=broken）。
- [ ] review 重點二:魂飛魄散畫面 —— 遺憾承載、無輕佻立即重玩按鈕（7 秒後才浮低調入口）。

## Backlog（M1 之後，不在當前範圍）

- M2 真實佔位圖切換驗證、M3 Blender 立繪、M4 第二章。
- spec 第 3 節 ⚑:公司由誰創立、玩家身世、報酬 —— 待拍板。
- 收音機「重新接上頻率」的安息演出可再加強（目前以文字呈現）。
- 發佈 GitHub + Vercel（走 `gh-vercel-publish`）。
