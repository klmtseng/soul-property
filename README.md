# 靈魂物業公司 — Soul Property Co.

一款**恐怖中帶溫情**的敘事遊戲。你是「靈魂物業公司」的物業經理，管理一棟住著滯留亡靈的公寓：白天溫情經營、蒐集住戶執念；夜晚遵守靈異守則巡樓求生。理解一位住戶的死亡真相、滿足他的心願就能送他安息；判斷錯誤，他將魂飛魄散、永久消失。

> **核心情緒主張:慈悲的恐怖** —— 嚇你的鬼，往往是最可憐的人。

目前進度:**M1（純文字單章，第一章《敲牆的人》）**。詳見 [PROGRESS.md](./PROGRESS.md)。

## 架構:三層徹底分離

| 層 | 位置 | 職責 |
|----|------|------|
| 資料層 | `src/data/chapters/*.json` | 每章一份 JSON，所有台詞/守則/抉擇/結局。**引擎不得硬編碼任何劇情。** |
| 引擎層 | `src/engine/` | 純 TS 狀態機:`loadChapter` / `reduce` / `selectors`。零 DOM、可單元測試。 |
| 呈現層 | `src/ui/` | React，只渲染引擎吐出的 view-model、只發 action。換 UI/美術不動引擎與資料。 |

接口:資料 →（`loadChapter`）→ 引擎 →（`getView` / `reduce`）→ 呈現。任一層可替換，其他兩層不需改動。
新增章節只要照 `schema/chapter.schema.json` 格式加一份 JSON，**無需改引擎**。

## 開發

```bash
npm install
npm run dev         # 開發伺服器（手機直式為主，相容 PC）
npm test            # Vitest 引擎測試
npm run typecheck   # tsc 型別檢查
npm run build       # 產出 dist/

python3 tools/gen_placeholders.py   # 重新產生 M1 佔位圖
```

## 驗證重點

- 引擎全鏈 + 結局可達性由 `tests/engine.spec.ts` 鎖定（見計畫 2.1 表）。
- 創意/情緒品質一律停在檢查點等人類確認，不自行通過（spec 7.3）。
