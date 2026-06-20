import type { EndingRank, Expression, GameState } from "./types.js";
import { isTruthRevealed } from "./reducer.js";
import { visibleOptions } from "./conditions.js";

// 呈現層只消費這個 view-model；它不直接讀 chapter 內部結構、也不跑任何判定邏輯。

export interface InteractionMenuItem {
  id: string;
  trigger: string;
  done: boolean;
}

export type View =
  | { phase: "intro"; residentName: string; age: number; obsession: string; portrait: PortraitView }
  | {
      phase: "day";
      mode: "menu";
      portrait: PortraitView;
      interactions: InteractionMenuItem[];
      fragments: string[];
      fragmentTotal: number;
      canEnterNight: boolean;
    }
  | {
      phase: "day";
      mode: "dialogue";
      portrait: PortraitView;
      speaker: string;
      line: string;
      hasNext: boolean;
    }
  | {
      phase: "night";
      mode: "choice";
      portrait: PortraitView;
      rules: string[];
      prompt: string;
      options: { label: string }[];
    }
  | { phase: "night"; mode: "outcome"; portrait: PortraitView; outcome: string }
  | { phase: "truth"; portrait: PortraitView; revealed: boolean; text: string }
  | {
      phase: "ending";
      portrait: PortraitView;
      rank: EndingRank;
      permanentLoss: boolean;
      text: string;
    };

export interface PortraitView {
  expression: Expression;
  file: string;
}

/**
 * 立繪表情驅動規則（檢查點 review 重點）：
 *   - 白天 / 開場 → calm（溫情層）
 *   - 夜晚 / 真相 → 以 rage 相對 startVars.rage 推導：
 *        rage ≥ 基準+2 → broken；rage ≥ 基準 → uneasy；rage < 基準 → calm
 *   - 結局 → 依 rank：best/good = calm；bad/worst = broken
 * 表情完全由「劇情節點 + rage 區間」決定，不在程式碼寫死台詞。
 */
export function currentExpression(state: GameState): Expression {
  const { phase, chapter } = state;
  if (state.endingId) {
    const e = chapter.endings.find((x) => x.id === state.endingId);
    return e && (e.rank === "best" || e.rank === "good") ? "calm" : "broken";
  }
  if (phase === "night" || phase === "truth") {
    const rage = state.vars.rage ?? 0;
    const base = chapter.night.startVars.rage ?? 0;
    if (rage >= base + 2) return "broken";
    if (rage >= base) return "uneasy";
    return "calm";
  }
  return "calm";
}

function portraitOf(state: GameState): PortraitView {
  const expression = currentExpression(state);
  return { expression, file: state.chapter.resident.portraits[expression] };
}

export function getView(state: GameState): View {
  const { chapter } = state;
  const portrait = portraitOf(state);

  switch (state.phase) {
    case "intro":
      return {
        phase: "intro",
        residentName: chapter.resident.name,
        age: chapter.resident.age,
        obsession: chapter.resident.obsessionOneLiner,
        portrait,
      };

    case "day": {
      if (state.activeInteractionId) {
        const it = chapter.day.interactions.find(
          (i) => i.id === state.activeInteractionId,
        )!;
        return {
          phase: "day",
          mode: "dialogue",
          portrait,
          speaker: chapter.resident.name,
          line: it.dialogue[state.dialogueCursor],
          hasNext: state.dialogueCursor < it.dialogue.length - 1,
        };
      }
      const fragmentText = (id: string) =>
        chapter.day.fragments.find((f) => f.id === id)?.text ?? "";
      const collectedFragments = state.collected
        .filter((id) => chapter.day.fragments.some((f) => f.id === id))
        .map(fragmentText);
      return {
        phase: "day",
        mode: "menu",
        portrait,
        interactions: chapter.day.interactions.map((i) => ({
          id: i.id,
          trigger: i.trigger,
          done: state.doneInteractions.includes(i.id),
        })),
        fragments: collectedFragments,
        fragmentTotal: chapter.day.fragments.length,
        canEnterNight: chapter.day.fragments.every((f) =>
          state.collected.includes(f.id),
        ),
      };
    }

    case "night": {
      if (state.lastOutcome) {
        return { phase: "night", mode: "outcome", portrait, outcome: state.lastOutcome };
      }
      const choice = chapter.night.choices[state.nightChoiceIndex];
      const opts = visibleOptions(choice, state.collected, state.vars);
      return {
        phase: "night",
        mode: "choice",
        portrait,
        rules: chapter.night.rules,
        prompt: choice.prompt,
        options: opts.map((o) => ({ label: o.label })),
      };
    }

    case "truth": {
      const revealed = isTruthRevealed(state);
      return {
        phase: "truth",
        portrait,
        revealed,
        text: revealed
          ? chapter.truth.text
          : "碎片仍有缺漏——有些事，你終究沒能拼湊起來。",
      };
    }

    case "ending": {
      const e = chapter.endings.find((x) => x.id === state.endingId)!;
      return {
        phase: "ending",
        portrait,
        rank: e.rank,
        permanentLoss: state.permanentLoss,
        text: e.text,
      };
    }
  }
}
