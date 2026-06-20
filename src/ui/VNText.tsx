import { useEffect, useMemo, useRef, useState } from "react";
import { splitSentences } from "./segment.js";

const CHAR_MS = 28; // 打字機速度

/**
 * VN 文字框：把一段文字切成句子，一次顯示一句、逐字打字機浮現。
 * 點擊：打字中→補完整句；已完成且有下一句→下一句；最後一句完成→onComplete()。
 * 只負責文字（立繪由場景各自渲染）。
 */
export function VNText({
  text,
  speaker,
  hint,
  onComplete,
}: {
  text: string;
  speaker?: string;
  hint?: string;
  onComplete: () => void;
}) {
  const sentences = useMemo(() => splitSentences(text), [text]);
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState(0);

  // 換新文字塊時重置
  useEffect(() => {
    setIdx(0);
    setTyped(0);
  }, [text]);

  const current = sentences[idx] ?? "";
  const done = typed >= current.length;

  // 打字機
  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setTyped((n) => n + 1), CHAR_MS);
    return () => clearTimeout(t);
  }, [typed, done, idx, text]);

  const tapRef = useRef<() => void>(() => {});
  tapRef.current = () => {
    if (!done) {
      setTyped(current.length); // 補完整句
    } else if (idx < sentences.length - 1) {
      setIdx((i) => i + 1);
      setTyped(0);
    } else {
      onComplete();
    }
  };

  const isLast = idx === sentences.length - 1;
  const tail = done ? (isLast ? (hint ?? "▼") : "▼") : "";

  return (
    <button className="dialogue" onClick={() => tapRef.current()} aria-label="繼續">
      {speaker && <div className="dialogue__speaker">{speaker}</div>}
      <div className="dialogue__line">
        {current.slice(0, typed)}
        {!done && <span className="dialogue__caret">▍</span>}
      </div>
      <div className="dialogue__hint">{tail}</div>
    </button>
  );
}
