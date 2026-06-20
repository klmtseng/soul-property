// 引擎層公開接口（呈現層只從這裡 import；不得碰引擎內部實作）。
export type {
  Action,
  ChapterData,
  Condition,
  Effect,
  Ending,
  EndingRank,
  Expression,
  GameState,
  OpeningLine,
  Phase,
} from "./types.js";
export { loadChapter, assertReferentialIntegrity } from "./loadChapter.js";
export {
  initState,
  reduce,
  isTruthRevealed,
  allFragmentsCollected,
} from "./reducer.js";
export { evalCondition, visibleOptions } from "./conditions.js";
export { getView, currentExpression } from "./selectors.js";
export type { View, PortraitView, InteractionMenuItem } from "./selectors.js";
