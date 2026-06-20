// 中文斷句（純函式，呈現層用）。依句末標點與換行切句，保留標點。
// 例：「噓——你聽。……沒有嗎？好。」→ ["噓——你聽。", "……沒有嗎？", "好。"]

const TERMINATORS = "。！？!?";

export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let buf = "";

  const flush = () => {
    const t = buf.trim();
    if (t) out.push(t);
    buf = "";
  };

  for (const ch of text) {
    if (ch === "\n") {
      flush();
      continue;
    }
    buf += ch;
    if (TERMINATORS.includes(ch)) {
      flush();
    }
  }
  flush();

  return out.length > 0 ? out : [text.trim()];
}
