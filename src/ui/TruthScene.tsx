import { useState } from "react";
import type { Action, View } from "../engine/index.js";
import { Portrait } from "./Portrait.js";
import { VNText } from "./VNText.js";

type TruthView = Extract<View, { phase: "truth" }>;

export function TruthScene({
  view,
  dispatch,
}: {
  view: TruthView;
  dispatch: (a: Action) => void;
}) {
  const [read, setRead] = useState(false);

  return (
    <div className="scene__body scene__body--night">
      <Portrait file={view.portrait.file} expression={view.portrait.expression} />
      <p className="phase-tag">真相</p>
      <VNText text={view.text} hint="▼" onComplete={() => setRead(true)} />
      {read && (
        <button className="primary-btn" onClick={() => dispatch({ type: "REVEAL_TO_ENDING" })}>
          {view.revealed ? "送她最後一程" : "面對結局"}
        </button>
      )}
    </div>
  );
}
