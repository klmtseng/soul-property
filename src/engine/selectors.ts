import type { EndingRank, Expression, GameState } from "./types.js";
import { isTruthRevealed } from "./reducer.js";
import { visibleOptions } from "./conditions.js";

// 呈現層只消費這個 view-model；它不直接讀 chapter 內部結構、也不跑任何判定邏輯。

export type View =
  | { phase: "opening"; speaker?: string; line: string; hasNext: boolean; portraitFile?: string }
  | { phase: "intro"; residentName: string; age: number; obsession: string; portrait: PortraitView }
  | {
      phase: "day";
      portrait: PortraitView;
      speaker?: string; // 無 speaker = 情境敘述
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
 *   立繪表情「節點優先、rage 後備」（修正 N1：避免溫情高潮配崩壞臉）：
 *   - 結局 → 依 rank：best/good = calm；bad/worst = broken
 *   - 真相 → 依 revealed：揭露=calm(釋然) / 未揭露=uneasy（不看 rage）
 *   - 夜晚 outcome → 觸發選項的 expression（無則依 rage）
 *   - 夜晚 抉擇中 → 該關卡 mood（無則依 rage）
 *   - 白天 / 開場 → calm
 */
export function currentExpression(state: GameState): Expression {
  const { phase, chapter } = state;
  if (state.endingId) {
    const e = chapter.endings.find((x) => x.id === state.endingId);
    return e && (e.rank === "best" || e.rank === "good") ? "calm" : "broken";
  }
  if (phase === "truth") {
    return isTruthRevealed(state) ? "calm" : "uneasy";
  }
  if (phase === "night") {
    const choice = chapter.night.choices[state.nightChoiceIndex];
    if (state.lastOutcome) {
      // outcome 拍：用觸發選項的 expression（找出 outcome 對應的選項）
      const opt = choice?.options.find((o) => o.outcome === state.lastOutcome);
      if (opt?.expression) return opt.expression;
    } else if (choice?.mood) {
      return choice.mood;
    }
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
    case "opening": {
      const lines = chapter.opening ?? [];
      const beat = lines[state.openingCursor];
      return {
        phase: "opening",
        speaker: beat?.speaker,
        line: beat?.text ?? "",
        hasNext: state.openingCursor < lines.length - 1,
        portraitFile: beat?.speaker ? chapter.cast?.[beat.speaker] : undefined,
      };
    }

    case "intro":
      return {
        phase: "intro",
        residentName: chapter.resident.name,
        age: chapter.resident.age,
        obsession: chapter.resident.obsessionOneLiner,
        portrait,
      };

    case "day": {
      // 黃昏過場：互動全讀完、activeInteractionId 為 null。
      if (!state.activeInteractionId) {
        const dusk = chapter.day.dusk ?? [];
        return {
          phase: "day",
          portrait,
          speaker: undefined,
          line: dusk[state.duskCursor] ?? "",
          hasNext: state.duskCursor < dusk.length - 1,
        };
      }
      const interactions = chapter.day.interactions;
      const idx = interactions.findIndex((i) => i.id === state.activeInteractionId);
      const it = interactions[idx] ?? interactions[0];
      // 行序列：cursor 0 = 情境敘述(trigger)；其後 = 她的對話
      const isNarration = state.dialogueCursor === 0;
      const line = isNarration ? it.trigger : it.dialogue[state.dialogueCursor - 1];
      const lineCount = 1 + it.dialogue.length;
      const moreInThis = state.dialogueCursor < lineCount - 1;
      const moreInteractions = idx < interactions.length - 1;
      return {
        phase: "day",
        portrait,
        speaker: isNarration ? undefined : chapter.resident.name,
        line,
        hasNext: moreInThis || moreInteractions,
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
