import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { readFileSync } from "fs";

const { version } = JSON.parse(
  readFileSync(
    path.resolve(__dirname, "../../packages/react/package.json"),
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
        "../../packages/react/src/index.ts",
      ),
      "virtual-engine": path.resolve(
        __dirname,
        "../../packages/core/src/index.ts",
      ),
    },
  },
});
