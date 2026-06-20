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
  if (view.mode === "dialogue") {
    return (
      <div className="scene__body">
        <Portrait file={view.portrait.file} expression={view.portrait.expression} />
        <VNText
          text={view.line}
          speaker={view.speaker}
          hint={view.hasNext ? "▼" : "▼ 收下這片執念"}
          onComplete={() => dispatch({ type: "ADVANCE_DIALOGUE" })}
        />
      </div>
    );
  }

  // menu
  return (
    <div className="scene__body">
      <Portrait file={view.portrait.file} expression={view.portrait.expression} />
      <div className="day-menu">
        <p className="phase-tag phase-tag--day">白天 · 溫情層</p>
        {view.interactions.map((it) => (
          <button
            key={it.id}
            className="interaction-btn"
            disabled={it.done}
            onClick={() => dispatch({ type: "OPEN_INTERACTION", id: it.id })}
          >
            {it.done ? "✓ " : ""}
            {it.trigger}
          </button>
        ))}

        {view.fragments.length > 0 && (
          <div className="fragments">
            <div className="fragments__title">
              執念碎片 ({view.fragments.length}/{view.fragmentTotal})
            </div>
            <ul>
              {view.fragments.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          className="primary-btn"
          disabled={!view.canEnterNight}
          onClick={() => dispatch({ type: "ENTER_NIGHT" })}
        >
          {view.canEnterNight ? "入夜，開始巡樓 →" : "先聽完她想說的話…"}
        </button>
      </div>
    </div>
  );
}
