import path from "node:path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

const base = process.env.SITE_BASE ?? "/";

export default defineConfig({
  base,
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
