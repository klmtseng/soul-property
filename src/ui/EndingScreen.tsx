import { useEffect, useState } from "react";
import type { EndingRank, View } from "../engine/index.js";
import { Portrait } from "./Portrait.js";

type EndingView = Extract<View, { phase: "ending" }>;

const TITLES: Record<EndingRank, string> = {
  best: "圓滿 · 安息",
  good: "安息 · 退租",
  bad: "魂飛魄散",
  worst: "誤棄 · 消散",
};

export function EndingScreen({
  view,
  onRestart,
}: {
  view: EndingView;
  onRestart: () => void;
}) {
  // bad/worst 的情感重量靠遺憾承載 —— 刻意不給輕佻的立即重玩按鈕，
  // 讓沉默留久一點，過一段時間才浮出極低調的入口。
  const isBad = view.rank === "bad" || view.rank === "worst";
  const [showExit, setShowExit] = useState(false);
  useEffect(() => {
    const delay = isBad ? 7000 : 2500;
    const t = setTimeout(() => setShowExit(true), delay);
    return () => clearTimeout(t);
  }, [isBad]);

  return (
    <div className={`ending ending--${view.rank}`}>
      <Portrait portrait={view.portrait} />
      <div className="ending__title">{TITLES[view.rank]}</div>
      <p className="ending__text">{view.text}</p>
      {isBad && view.permanentLoss && (
        <p className="ending__loss">她不會再回來了。這一局，不能重來。</p>
      )}

      {showExit &&
        (isBad ? (
          <button className="ending__quiet-exit" onClick={onRestart}>
            ——（重新開始）
          </button>
        ) : (
          <button className="primary-btn" onClick={onRestart}>
            {view.rank === "best" ? "再陪她走一次" : "重新開始"}
          </button>
        ))}
    </div>
  );
}
