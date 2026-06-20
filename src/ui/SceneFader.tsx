import { useEffect, useRef, useState, type ReactNode } from "react";

const FADE_MS = 220;

/**
 * 相位切換轉場：sceneKey 改變時，內容淡出 → 換成新內容 → 淡入。
 * 同一 sceneKey 內（例如逐句推進）即時更新、不淡出，避免每點一下就閃。
 */
export function SceneFader({
  sceneKey,
  children,
}: {
  sceneKey: string;
  children: ReactNode;
}) {
  const [shown, setShown] = useState<ReactNode>(children);
  const [visible, setVisible] = useState(true);
  const keyRef = useRef(sceneKey);

  useEffect(() => {
    if (sceneKey === keyRef.current) {
      setShown(children); // 同場景：即時更新
      return;
    }
    setVisible(false); // 換場景：先淡出
    const t = setTimeout(() => {
      keyRef.current = sceneKey;
      setShown(children);
      setVisible(true); // 換內容後淡入
    }, FADE_MS);
    return () => clearTimeout(t);
  }, [sceneKey, children]);

  return <div className={`fader ${visible ? "fader--in" : "fader--out"}`}>{shown}</div>;
}
