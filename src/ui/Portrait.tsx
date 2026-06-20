import type { Expression } from "../engine/index.js";
import { portraitUrl } from "./assets.js";

/** 渲染一張立繪。expression 僅用於 CSS class（情緒光暈），可省略。 */
export function Portrait({
  file,
  expression = "calm",
  alt,
}: {
  file: string;
  expression?: Expression;
  alt?: string;
}) {
  const url = portraitUrl(file);
  return (
    <div className={`portrait portrait--${expression}`}>
      {url ? (
        <img src={url} alt={alt ?? expression} draggable={false} />
      ) : (
        <div className="portrait__missing">{file}</div>
      )}
    </div>
  );
}
