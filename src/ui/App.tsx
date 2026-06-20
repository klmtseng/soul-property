import { useMemo, useReducer } from "react";
import {
  initState,
  reduce,
  getView,
  type Action,
  type ChapterData,
  type GameState,
} from "../engine/index.js";
import { backgroundUrl } from "./assets.js";
import { Portrait } from "./Portrait.js";
import { DayScene } from "./DayScene.js";
import { NightScene } from "./NightScene.js";
import { EndingScreen } from "./EndingScreen.js";

type AppAction = Action | { type: "RESTART" };

function appReducer(chapter: ChapterData) {
  return (state: GameState, action: AppAction): GameState =>
    action.type === "RESTART" ? initState(chapter) : reduce(state, action);
}

export function App({ chapter }: { chapter: ChapterData }) {
  const reducer = useMemo(() => appReducer(chapter), [chapter]);
  const [state, dispatch] = useReducer(reducer, chapter, initState);
  const view = getView(state);

  const isNightlike =
    view.phase === "night" ||
    view.phase === "truth" ||
    (view.phase === "ending" && (view.rank === "bad" || view.rank === "worst"));
  const bg = backgroundUrl(isNightlike ? "night.png" : "day.png");

  return (
    <div
      className={`stage ${isNightlike ? "stage--night" : "stage--day"}`}
      style={bg ? { backgroundImage: `url(${bg})` } : undefined}
    >
      <div className="stage__inner">
        {view.phase === "intro" && (
          <div className="scene__body intro">
            <Portrait portrait={view.portrait} />
            <h1 className="intro__title">靈魂物業公司</h1>
            <p className="intro__sub">第一章 ·《敲牆的人》</p>
            <p className="intro__resident">
              新住戶：{view.residentName}（{view.age}）
            </p>
            <blockquote className="intro__obsession">「{view.obsession}」</blockquote>
            <button className="primary-btn" onClick={() => dispatch({ type: "BEGIN" })}>
              接下這位住戶
            </button>
          </div>
        )}

        {view.phase === "day" && <DayScene view={view} dispatch={dispatch} />}
        {view.phase === "night" && <NightScene view={view} dispatch={dispatch} />}

        {view.phase === "truth" && (
          <div className="scene__body scene__body--night">
            <Portrait portrait={view.portrait} />
            <p className="phase-tag">真相</p>
            <p className="truth__text">{view.text}</p>
            <button
              className="primary-btn"
              onClick={() => dispatch({ type: "REVEAL_TO_ENDING" })}
            >
              {view.revealed ? "送她最後一程" : "面對結局"}
            </button>
          </div>
        )}

        {view.phase === "ending" && (
          <EndingScreen view={view} onRestart={() => dispatch({ type: "RESTART" })} />
        )}
      </div>
    </div>
  );
}
