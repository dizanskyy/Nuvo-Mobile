import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
  ],
  clearScreen: false,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: "dist-mobile",
    emptyOutDir: true,
  },
});
