// 呈現層資產解析：把章節 JSON 內的「檔名」對應到打包後的真實 URL。
// 引擎只給檔名（如 chen_calm.png），由這裡負責載入 —— 引擎不關心圖怎麼來。

const portraitMods = import.meta.glob("../../assets/portraits/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const bgMods = import.meta.glob("../../assets/backgrounds/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

function byBasename(mods: Record<string, string>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const key in mods) {
    const base = key.split("/").pop();
    if (base) map[base] = mods[key];
  }
  return map;
}

const portraits = byBasename(portraitMods);
const backgrounds = byBasename(bgMods);

export const portraitUrl = (file: string): string | undefined => portraits[file];
export const backgroundUrl = (file: string): string | undefined => backgrounds[file];
