import type { Action, ChapterData, Effect, GameState } from "./types.js";
import { evalCondition, visibleOptions } from "./conditions.js";

/** 從章節資料建立初始狀態。數值初始值來自資料層，不在程式碼寫死。 */
export function initState(chapter: ChapterData): GameState {
  return {
    chapter,
    phase: chapter.opening && chapter.opening.length > 0 ? "opening" : "intro",
    openingCursor: 0,
    doneInteractions: [],
    activeInteractionId: null,
    dialogueCursor: 0,
    duskCursor: 0,
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
    case "ADVANCE_OPENING": {
      if (state.phase !== "opening") return state;
      const lines = chapter.opening ?? [];
      if (state.openingCursor < lines.length - 1) {
        return { ...state, openingCursor: state.openingCursor + 1 };
      }
      return { ...state, phase: "intro" };
    }

    case "BEGIN": {
      if (state.phase !== "intro") return state;
      // 白天為線性 VN：直接開場第一個互動。
      const first = chapter.day.interactions[0];
      return {
        ...state,
        phase: "day",
        activeInteractionId: first ? first.id : null,
        dialogueCursor: 0,
      };
    }

    case "ADVANCE_DIALOGUE": {
      if (state.phase !== "day") return state;
      const dusk = chapter.day.dusk ?? [];

      // 黃昏過場狀態（互動全讀完、activeInteractionId 為 null）。
      if (!state.activeInteractionId) {
        if (state.duskCursor < dusk.length - 1) {
          return { ...state, duskCursor: state.duskCursor + 1 };
        }
        return { ...state, phase: "night", nightChoiceIndex: 0, lastOutcome: null };
      }

      const interactions = chapter.day.interactions;
      const idx = interactions.findIndex((i) => i.id === state.activeInteractionId);
      const it = interactions[idx];
      // 每個互動的行序列 = [情境敘述(trigger)] + [她的對話...]
      const lineCount = 1 + it.dialogue.length;
      if (state.dialogueCursor < lineCount - 1) {
        return { ...state, dialogueCursor: state.dialogueCursor + 1 };
      }
      // 此互動讀完：授予碎片/旗標。
      let collected = state.collected;
      if (it.grantsFragment) collected = addFlag(collected, it.grantsFragment);
      if (it.grantsFlag) collected = addFlag(collected, it.grantsFlag);
      const done = [...state.doneInteractions, it.id];
      const next = interactions[idx + 1];
      if (next) {
        // 自動接下一個互動。
        return {
          ...state,
          collected,
          doneInteractions: done,
          activeInteractionId: next.id,
          dialogueCursor: 0,
        };
      }
      // 全部互動讀完 → 若有黃昏過場先播，否則直接入夜。
      if (dusk.length > 0) {
        return {
          ...state,
          collected,
          doneInteractions: done,
          activeInteractionId: null,
          duskCursor: 0,
        };
      }
      return {
        ...state,
        collected,
        doneInteractions: done,
        activeInteractionId: null,
        phase: "night",
        nightChoiceIndex: 0,
        lastOutcome: null,
      };
    }

    case "CHOOSE": {
      if (state.phase !== "night" || state.lastOutcome) return state;
      const choice = chapter.night.choices[state.nightChoiceIndex];
      if (!choice) return state;
      const opts = visibleOptions(choice, state.collected, state.vars);
      const opt = opts[action.optionIndex];
      if (!opt) return state;
      const vars = applyEffects(state.vars, opt.effects);
      const collected = opt.unlocks ? addFlag(state.collected, opt.unlocks) : state.collected;
      // 終局選項：直接收束到指定結局，跳過 outcome 拍、其餘夜晚層與真相。
      if (opt.endsNightTo) {
        const ending = chapter.endings.find((e) => e.id === opt.endsNightTo);
        return {
          ...state,
          vars,
          collected,
          lastOutcome: null,
          phase: "ending",
          endingId: ending ? ending.id : opt.endsNightTo,
          permanentLoss: ending?.permanentLoss ?? false,
        };
      }
      return { ...state, vars, collected, lastOutcome: opt.outcome };
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
