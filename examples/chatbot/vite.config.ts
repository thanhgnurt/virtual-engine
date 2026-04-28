import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8001,
    strictPort: true,
    host: "localhost",
  },
  resolve: {
    alias: {
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      "react-virtual-chatbot": path.resolve(
        __dirname,
        "../../packages/ui/react-virtual-chatbot/src/index.ts",
      ),
      "virtual-chatbot": path.resolve(
        __dirname,
        "../../packages/core/virtual-chatbot/src/index.ts",
      ),
    },
  },
});
