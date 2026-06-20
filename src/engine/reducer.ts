import type { Action, ChapterData, GameState } from "./types.js";

/** 從章節資料建立初始狀態。怨氣起始值來自資料層，不在程式碼寫死。 */
export function initState(chapter: ChapterData): GameState {
  return {
    chapter,
    phase: "intro",
    doneInteractions: [],
    activeInteractionId: null,
    dialogueCursor: 0,
    nightChoiceIndex: 0,
    rage: chapter.night.startRage,
    lastOutcome: null,
    collected: [],
    ending: null,
    permanentLoss: false,
  };
}

/** 真相是否揭露 = revealCondition 內每個旗標都已收集。 */
export function isTruthRevealed(state: GameState): boolean {
  const have = new Set(state.collected);
  return state.chapter.truth.revealCondition.every((id) => have.has(id));
}

/** 純函式狀態機。相同 (state, action) 永遠得到相同結果；不碰 DOM、不做 I/O。 */
export function reduce(state: GameState, action: Action): GameState {
  const { chapter } = state;

  switch (action.type) {
    case "BEGIN": {
      if (state.phase !== "intro") return state;
      return { ...state, phase: "day" };
    }

    case "OPEN_INTERACTION": {
      if (state.phase !== "day" || state.activeInteractionId) return state;
      const it = chapter.day.interactions.find((i) => i.id === action.id);
      if (!it || state.doneInteractions.includes(it.id)) return state;
      return { ...state, activeInteractionId: it.id, dialogueCursor: 0 };
    }

    case "ADVANCE_DIALOGUE": {
      if (state.phase !== "day" || !state.activeInteractionId) return state;
      const it = chapter.day.interactions.find(
        (i) => i.id === state.activeInteractionId,
      )!;
      // 還有下一句：推進游標。
      if (state.dialogueCursor < it.dialogue.length - 1) {
        return { ...state, dialogueCursor: state.dialogueCursor + 1 };
      }
      // 對話讀完：收下碎片旗標，回到互動選單。
      return {
        ...state,
        doneInteractions: [...state.doneInteractions, it.id],
        collected: addFlag(state.collected, it.grantsFragment),
        activeInteractionId: null,
        dialogueCursor: 0,
      };
    }

    case "ENTER_NIGHT": {
      if (state.phase !== "day") return state;
      // 必須蒐齊全部白天碎片才入夜。
      if (state.doneInteractions.length < chapter.day.interactions.length) {
        return state;
      }
      return { ...state, phase: "night", nightChoiceIndex: 0, lastOutcome: null };
    }

    case "CHOOSE": {
      if (state.phase !== "night" || state.lastOutcome) return state;
      const choice = chapter.night.choices[state.nightChoiceIndex];
      const opt = choice?.options[action.optionIndex];
      if (!opt) return state;
      return {
        ...state,
        rage: state.rage + opt.rageDelta,
        collected: opt.unlocks ? addFlag(state.collected, opt.unlocks) : state.collected,
        lastOutcome: opt.outcome,
      };
    }

    case "ACK_OUTCOME": {
      if (state.phase !== "night" || !state.lastOutcome) return state;
      const nextIndex = state.nightChoiceIndex + 1;
      const moreChoices = nextIndex < chapter.night.choices.length;
      return {
        ...state,
        lastOutcome: null,
        nightChoiceIndex: nextIndex,
        phase: moreChoices ? "night" : "truth",
      };
    }

    case "REVEAL_TO_ENDING": {
      if (state.phase !== "truth") return state;
      const revealed = isTruthRevealed(state);
      const good = revealed && state.rage <= chapter.night.rageThreshold;
      return {
        ...state,
        phase: "ending",
        ending: good ? "rest" : "dissipate",
        permanentLoss: good ? false : chapter.endings.bad.permanentLoss,
      };
    }

    default:
      return state;
  }
}

function addFlag(collected: string[], flag: string): string[] {
  return collected.includes(flag) ? collected : [...collected, flag];
}
