import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Entry points
        popup: resolve(__dirname, "index.html"),
        background: resolve(__dirname, "src/background.js"),
        content: resolve(__dirname, "src/content.js"),
      },
      output: {
        // FIX: Remove "assets/" to put files in root, matching manifest.json
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
  },
});