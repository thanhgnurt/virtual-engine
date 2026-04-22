import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { readFileSync } from "fs";

const { version } = JSON.parse(
  readFileSync(
    path.resolve(__dirname, "../../packages/ui/react-virtual-engine/package.json"),
    "utf-8",
  ),
);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    port: 8000,
    strictPort: true,
    host: "localhost",
  },
  esbuild: {
    drop: ["console", "debugger"],
  },

  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
      sass: {
        api: "modern-compiler",
      },
    },
  },
  resolve: {
    alias: {
      "react-virtual-engine": path.resolve(
        __dirname,
        "../../packages/ui/react-virtual-engine/src/index.ts",
      ),
      "virtual-engine": path.resolve(
        __dirname,
        "../../packages/core/virtual-engine/src/index.ts",
      ),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          highlighter: ["react-syntax-highlighter"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
