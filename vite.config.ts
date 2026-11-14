import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: { host: "127.0.0.1", port: 5173, strictPort: true, proxy: { "/api/structure": { target: "https://zh-tw-structure-api-6wahhjmeha-de.a.run.app", changeOrigin: true } } },
});
