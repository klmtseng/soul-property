import type { Expression, GameState } from "./types.js";
import { isTruthRevealed } from "./reducer.js";

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
      fragments: string[]; // 已蒐集到的碎片描述（按蒐集順序）
      fragmentTotal: number; // 本章線索碎片總數
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
      kind: "rest" | "dissipate";
      permanentLoss: boolean;
      text: string;
    };

export interface PortraitView {
  expression: Expression;
  /** 章節 JSON 指定的檔名（呈現層負責拼 /assets/portraits/ 路徑載入）。 */
  file: string;
}

/**
 * 立繪表情驅動規則（檢查點 review 重點）：
 *   - 白天 / 開場   → calm（溫情層，平靜為主）
 *   - 夜晚 / 真相   → 由 rage 相對 startRage、rageThreshold 推導：
 *        rage > rageThreshold        → broken（怨氣失控）
 *        rage >= startRage           → uneasy（尚未安撫，陰時不安）
 *        rage <  startRage           → calm（你的回應正在安撫她）
 *   - 結局         → rest=calm / dissipate=broken
 * 表情完全由「劇情節點 + rage 區間」決定，不在程式碼寫死任一句台詞。
 */
export function currentExpression(state: GameState): Expression {
  const { phase, rage, ending, chapter } = state;
  if (ending === "rest") return "calm";
  if (ending === "dissipate") return "broken";
  if (phase === "night" || phase === "truth") {
    if (rage > chapter.night.rageThreshold) return "broken";
    if (rage >= chapter.night.startRage) return "uneasy";
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
        canEnterNight:
          state.doneInteractions.length === chapter.day.interactions.length,
      };
    }

    case "night": {
      if (state.lastOutcome) {
        return { phase: "night", mode: "outcome", portrait, outcome: state.lastOutcome };
      }
      const choice = chapter.night.choices[state.nightChoiceIndex];
      return {
        phase: "night",
        mode: "choice",
        portrait,
        rules: chapter.night.rules,
        prompt: choice.prompt,
        options: choice.options.map((o) => ({ label: o.label })),
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
      const kind = state.ending!;
      const text =
        kind === "rest" ? chapter.endings.good.text : chapter.endings.bad.text;
      return {
        phase: "ending",
        portrait,
        kind,
        permanentLoss: state.permanentLoss,
        text,
      };
    }
  }
}
