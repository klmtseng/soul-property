// ── 資料層型別 (與 schema/chapter.schema.json 對齊) ──────────────────────
// 引擎只認這些型別；任何台詞、守則、數值、條件都來自外部章節 JSON，不在程式碼寫死。

export type Expression = "calm" | "uneasy" | "broken";

/** 結構化條件（純資料，引擎判斷，不用 eval）。省略視為恆真。 */
export interface Condition {
  allFlags?: string[]; // 全部旗標都要有
  anyFlags?: string[]; // 至少一個旗標
  notFlags?: string[]; // 全部旗標都不能有
  minVars?: Record<string, number>; // 各數值 >= 門檻
  maxVars?: Record<string, number>; // 各數值 <= 門檻
}

/** 選項對數值的影響。 */
export interface Effect {
  var: string;
  delta: number;
}

export interface ChapterData {
  schemaVersion: number;
  chapterId: string;
  resident: {
    id: string;
    name: string;
    age: number;
    portraits: Record<Expression, string>;
    obsessionOneLiner: string;
  };
  day: {
    interactions: DayInteraction[];
    fragments: Fragment[];
  };
  night: {
    /** 各數值初始值（含 rage 等）。 */
    startVars: Record<string, number>;
    rules: string[];
    choices: NightChoice[];
  };
  truth: {
    /** 需全部集齊的旗標 id（可來自白天 fragment/flag 或夜晚 option.unlocks）才揭露真相。 */
    revealCondition: string[];
    text: string;
  };
  /** 分級結局：引擎依序取第一個 when 成立者；最後一個必須無 when（catch-all）。 */
  endings: Ending[];
}

export type EndingRank = "best" | "good" | "bad" | "worst";

export interface Ending {
  id: string;
  rank: EndingRank;
  text: string;
  permanentLoss?: boolean;
  when?: Condition; // 省略 = catch-all
}

export interface DayInteraction {
  id: string;
  trigger: string;
  dialogue: string[];
  /** 完成時授予的 fragment id（線索碎片，計入 X/N，且為入夜門檻）。 */
  grantsFragment?: string;
  /** 完成時授予的一般旗標（純角色支線可給可選旗標，如 learned_song）。 */
  grantsFlag?: string;
}

export interface Fragment {
  id: string;
  text: string;
}

export interface NightChoice {
  id: string;
  prompt: string;
  options: NightOption[];
}

export interface NightOption {
  label: string;
  /** 對數值的影響（怨氣/理解/連繫…）。 */
  effects?: Effect[];
  /** 做出此選項時解鎖的旗標 id。 */
  unlocks?: string;
  /** 只有滿足此條件，選項才會出現（後面關卡可依前面抉擇適配）。 */
  requires?: Condition;
  scare?: boolean;
  outcome: string;
}

// ── 引擎狀態 ──────────────────────────────────────────────────────────────

export type Phase = "intro" | "day" | "night" | "truth" | "ending";

export interface GameState {
  chapter: ChapterData;
  phase: Phase;

  // 白天
  doneInteractions: string[];
  activeInteractionId: string | null;
  dialogueCursor: number;

  // 夜晚
  nightChoiceIndex: number;
  /** 各數值現值（含 rage）。 */
  vars: Record<string, number>;
  lastOutcome: string | null;

  // 跨層收集的旗標（fragment id + flag + unlocks id 共用同一集合）
  collected: string[];

  // 結局
  endingId: string | null;
  permanentLoss: boolean;
}

// ── Actions（呈現層唯一能對引擎做的事）──────────────────────────────────
export type Action =
  | { type: "BEGIN" }
  | { type: "OPEN_INTERACTION"; id: string }
  | { type: "ADVANCE_DIALOGUE" }
  | { type: "ENTER_NIGHT" }
  | { type: "CHOOSE"; optionIndex: number } // optionIndex 對「可見選項」而言
  | { type: "ACK_OUTCOME" }
  | { type: "REVEAL_TO_ENDING" };
