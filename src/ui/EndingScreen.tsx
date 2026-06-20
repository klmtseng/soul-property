import { useState } from "react";
import type { EndingRank, View } from "../engine/index.js";
import { Portrait } from "./Portrait.js";
import { VNText } from "./VNText.js";

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
  const isBad = view.rank === "bad" || view.rank === "worst";
  const [read, setRead] = useState(false);

  return (
    <div className={`ending ending--${view.rank}`}>
      <Portrait file={view.portrait.file} expression={view.portrait.expression} />
      <div className="ending__title">{TITLES[view.rank]}</div>
      <VNText text={view.text} hint="　" onComplete={() => setRead(true)} />
      {read && isBad && view.permanentLoss && (
        <p className="ending__loss">她不會再回來了。這一局，不能重來。</p>
      )}

      {/* bad/worst 讀完才浮出極低調的重啟入口，不沖淡遺憾 */}
      {read &&
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
