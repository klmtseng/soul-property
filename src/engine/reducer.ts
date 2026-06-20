import type { Action, ChapterData, Effect, GameState } from "./types.js";
import { evalCondition, visibleOptions } from "./conditions.js";

/** 從章節資料建立初始狀態。數值初始值來自資料層，不在程式碼寫死。 */
export function initState(chapter: ChapterData): GameState {
  return {
    chapter,
    phase: "intro",
    doneInteractions: [],
    activeInteractionId: null,
    dialogueCursor: 0,
    nightChoiceIndex: 0,
    vars: { ...chapter.night.startVars },
    lastOutcome: null,
    collected: [],
    endingId: null,
    permanentLoss: false,
  };
}

/** 真相是否揭露 = revealCondition 內每個旗標都已收集。 */
export function isTruthRevealed(state: GameState): boolean {
  const have = new Set(state.collected);
  return state.chapter.truth.revealCondition.every((id) => have.has(id));
}

/** 白天線索碎片是否全數蒐齊（入夜門檻；flavor 互動不在此列，為可選）。 */
export function allFragmentsCollected(state: GameState): boolean {
  const have = new Set(state.collected);
  return state.chapter.day.fragments.every((f) => have.has(f.id));
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
      if (state.dialogueCursor < it.dialogue.length - 1) {
        return { ...state, dialogueCursor: state.dialogueCursor + 1 };
      }
      // 對話讀完：授予碎片/旗標，回到互動選單。
      let collected = state.collected;
      if (it.grantsFragment) collected = addFlag(collected, it.grantsFragment);
      if (it.grantsFlag) collected = addFlag(collected, it.grantsFlag);
      return {
        ...state,
        doneInteractions: [...state.doneInteractions, it.id],
        collected,
        activeInteractionId: null,
        dialogueCursor: 0,
      };
    }

    case "ENTER_NIGHT": {
      if (state.phase !== "day") return state;
      if (!allFragmentsCollected(state)) return state; // 線索碎片未齊不得入夜
      return { ...state, phase: "night", nightChoiceIndex: 0, lastOutcome: null };
    }

    case "CHOOSE": {
      if (state.phase !== "night" || state.lastOutcome) return state;
      const choice = chapter.night.choices[state.nightChoiceIndex];
      if (!choice) return state;
      const opts = visibleOptions(choice, state.collected, state.vars);
      const opt = opts[action.optionIndex];
      if (!opt) return state;
      return {
        ...state,
        vars: applyEffects(state.vars, opt.effects),
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
      const flags = new Set(state.collected);
      const chosen =
        chapter.endings.find((e) => evalCondition(e.when, flags, state.vars)) ??
        chapter.endings[chapter.endings.length - 1];
      return {
        ...state,
        phase: "ending",
        endingId: chosen.id,
        permanentLoss: chosen.permanentLoss ?? false,
      };
    }

    default:
      return state;
  }
}

function addFlag(collected: string[], flag: string): string[] {
  return collected.includes(flag) ? collected : [...collected, flag];
}

function applyEffects(
  vars: Record<string, number>,
  effects: Effect[] | undefined,
): Record<string, number> {
  if (!effects || effects.length === 0) return vars;
  const next = { ...vars };
  for (const e of effects) next[e.var] = (next[e.var] ?? 0) + e.delta;
  return next;
}
