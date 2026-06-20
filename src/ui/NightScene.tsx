import { useState } from "react";
import type { Action, View } from "../engine/index.js";
import { Portrait } from "./Portrait.js";
import { DialogueBox } from "./DialogueBox.js";
import { ChoiceList } from "./ChoiceList.js";

type NightView = Extract<View, { phase: "night" }>;

export function NightScene({
  view,
  dispatch,
}: {
  view: NightView;
  dispatch: (a: Action) => void;
}) {
  const [rulesOpen, setRulesOpen] = useState(true);

  if (view.mode === "outcome") {
    return (
      <div className="scene__body scene__body--night">
        <Portrait portrait={view.portrait} />
        <DialogueBox
          line={view.outcome}
          hint="▼ 繼續"
          onAdvance={() => dispatch({ type: "ACK_OUTCOME" })}
        />
      </div>
    );
  }

  return (
    <div className="scene__body scene__body--night">
      <Portrait portrait={view.portrait} />
      <p className="phase-tag phase-tag--night">夜晚 · 恐怖層</p>

      <div className={`rules ${rulesOpen ? "" : "rules--collapsed"}`}>
        <button className="rules__toggle" onClick={() => setRulesOpen((v) => !v)}>
          《夜間守則》{rulesOpen ? "▲" : "▼"}
        </button>
        {rulesOpen && (
          <ol>
            {view.rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ol>
        )}
      </div>

      <ChoiceList
        prompt={view.prompt}
        options={view.options}
        onChoose={(i) => dispatch({ type: "CHOOSE", optionIndex: i })}
      />
    </div>
  );
}
