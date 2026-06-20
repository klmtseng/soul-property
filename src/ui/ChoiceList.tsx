export function ChoiceList({
  prompt,
  options,
  onChoose,
}: {
  prompt?: string;
  options: { label: string }[];
  onChoose: (index: number) => void;
}) {
  return (
    <div className="choices">
      {prompt && <div className="choices__prompt">{prompt}</div>}
      <div className="choices__list">
        {options.map((o, i) => (
          <button key={i} className="choice-btn" onClick={() => onChoose(i)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
