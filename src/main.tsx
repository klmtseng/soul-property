import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { loadChapter } from "./engine/index.js";
import { App } from "./ui/App.js";
import rawCh01 from "./data/chapters/ch01_knocking.json";
import "./ui/styles.css";

// 唯一接線點:資料層 JSON → 引擎驗證/載入 → 呈現層 React。
const chapter = loadChapter(rawCh01);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App chapter={chapter} />
  </StrictMode>,
);
