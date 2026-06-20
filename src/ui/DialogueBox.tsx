export function DialogueBox({
  speaker,
  line,
  hint,
  onAdvance,
}: {
  speaker?: string;
  line: string;
  hint?: string;
  onAdvance: () => void;
}) {
  return (
    <button className="dialogue" onClick={onAdvance} aria-label="繼續">
      {speaker && <div className="dialogue__speaker">{speaker}</div>}
      <div className="dialogue__line">{line}</div>
      <div className="dialogue__hint">{hint ?? "▼ 點擊繼續"}</div>
    </button>
  );
}
