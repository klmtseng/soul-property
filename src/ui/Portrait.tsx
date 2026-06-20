import type { PortraitView } from "../engine/index.js";
import { portraitUrl } from "./assets.js";

export function Portrait({ portrait }: { portrait: PortraitView }) {
  const url = portraitUrl(portrait.file);
  return (
    <div className={`portrait portrait--${portrait.expression}`}>
      {url ? (
        <img src={url} alt={portrait.expression} draggable={false} />
      ) : (
        <div className="portrait__missing">{portrait.file}</div>
      )}
    </div>
  );
}
