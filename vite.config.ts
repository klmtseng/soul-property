/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// 三層分離:Vite 只負責打包呈現層 (React)。引擎為純 TS，可獨立被 Vitest 測試。
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["tests/**/*.spec.ts"],
  },
});
