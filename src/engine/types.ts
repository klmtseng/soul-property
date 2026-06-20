// ── 資料層型別 (與 schema/chapter.schema.json 對齊) ──────────────────────
// 引擎只認這些型別；任何台詞、守則、數值都來自外部章節 JSON，不在程式碼寫死。

export type Expression = "calm" | "uneasy" | "broken";

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
    startRage: number;
    rageThreshold: number;
    rules: string[];
    choices: NightChoice[];
  };
  truth: {
    /** 需全部集齊的旗標 id（可來自白天 fragment 或夜晚 option.unlocks）才揭露真相。 */
    revealCondition: string[];
    text: string;
  };
  endings: {
    good: { id: string; text: string };
    bad: { id: string; permanentLoss: boolean; text: string };
  };
}

export interface DayInteraction {
  id: string;
  trigger: string;
  dialogue: string[];
  /** 完成此互動時授予的 fragment id（同時寫入 collected 旗標集）。 */
  grantsFragment: string;
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
  rageDelta: number;
  /** 做出此選項時解鎖的真相線索旗標 id（寫入 collected 旗標集）。 */
  unlocks?: string;
  scare?: boolean;
  outcome: string;
}

// ── 引擎狀態 ──────────────────────────────────────────────────────────────

export type Phase = "intro" | "day" | "night" | "truth" | "ending";
export type EndingKind = "rest" | "dissipate";

export interface GameState {
  chapter: ChapterData;
  phase: Phase;

  // 白天
  /** 已完成的互動 id。 */
  doneInteractions: string[];
  /** 目前展開中的互動（null = 在選互動的選單）。 */
  activeInteractionId: string | null;
  /** 展開互動時的對話游標。 */
  dialogueCursor: number;

  // 夜晚
  /** 目前進行到第幾個夜晚抉擇。 */
  nightChoiceIndex: number;
  rage: number;
  /** 上一個抉擇選完後要顯示的 outcome（null = 尚未選或已讀過）。 */
  lastOutcome: string | null;

  // 跨層收集的旗標（fragment id + unlocks id 共用同一個集合）
  collected: string[];

  // 結局
  ending: EndingKind | null;
  permanentLoss: boolean;
}

// ── Actions（呈現層唯一能對引擎做的事）──────────────────────────────────
export type Action =
  | { type: "BEGIN" } // intro -> day
  | { type: "OPEN_INTERACTION"; id: string }
  | { type: "ADVANCE_DIALOGUE" } // 推進對話 / 對話讀完則收下碎片並回到選單
  | { type: "ENTER_NIGHT" } // day -> night（需三碎片到齊）
  | { type: "CHOOSE"; optionIndex: number } // 做夜晚抉擇
  | { type: "ACK_OUTCOME" } // 讀完 outcome，進下一抉擇 / 進真相
  | { type: "REVEAL_TO_ENDING" }; // truth -> ending（結算）
