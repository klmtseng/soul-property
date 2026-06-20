# PROGRESS —《靈魂物業公司》

> 里程碑錨點 + backlog。每次動工先讀這裡，知道現在在哪、下一步是什麼。

## 現況:M1（純文字單章）技術項已完成，**等人類情緒驗收**

里程碑路徑(spec 7.2):M1 純文字 → M2 接佔位圖驗呈現層 → M3 Blender 真實美術 → M4 第二章驗模組化。

### M1 完成項（2026-06-20）

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

### 待人類驗收（檢查點，spec 7.3）

- [ ] `npm run dev` 走兩結局，確認**情緒是否到位**（恐怖→鼻酸）。
- [ ] review 重點一:立繪表情驅動（白天 calm；夜晚由 rage 區間 calm/uneasy/broken；結局 rest=calm、dissipate=broken）。
- [ ] review 重點二:魂飛魄散畫面 —— 遺憾承載、無輕佻立即重玩按鈕（7 秒後才浮低調入口）。

## Backlog（M1 之後，不在當前範圍）

- M2 真實佔位圖切換驗證、M3 Blender 立繪、M4 第二章。
- spec 第 3 節 ⚑:公司由誰創立、玩家身世、報酬 —— 待拍板。
- 收音機「重新接上頻率」的安息演出可再加強（目前以文字呈現）。
- 發佈 GitHub + Vercel（走 `gh-vercel-publish`）。
