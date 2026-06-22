import type { Action, View } from "../engine/index.js";
import { Portrait } from "./Portrait.js";
import { VNText } from "./VNText.js";

type DayView = Extract<View, { phase: "day" }>;

export function DayScene({
  view,
  dispatch,
}: {
  view: DayView;
  dispatch: (a: Action) => void;
}) {
  return (
    <div className="scene__body">
      <Portrait file={view.portrait.file} expression={view.portrait.expression} />
      <p className="phase-tag phase-tag--day">白天 · 溫情層</p>
      <VNText
        text={view.line}
        speaker={view.speaker}
        hint={view.hasNext ? "▼" : "▼ 天，慢慢黑了"}
        onComplete={() => dispatch({ type: "ADVANCE_DIALOGUE" })}
      />
    </div>
  );
}
