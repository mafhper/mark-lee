import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const tauriHost = process.env.TAURI_DEV_HOST || "127.0.0.1";
const devPort = Number(process.env.TAURI_DEV_PORT || "5173");
const hmrPort = Number(process.env.TAURI_HMR_PORT || String(devPort + 1));
const isTauriRuntime = Boolean(process.env.TAURI_DEV_HOST);

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: devPort,
    strictPort: isTauriRuntime,
    host: tauriHost,
    hmr: isTauriRuntime
      ? {
          protocol: "ws",
          host: tauriHost,
          port: hmrPort,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    // Copy public HTML files to dist during build
    copyPublicDir: true, // This ensures public directory is copied
    // Optimize for production
    minify: 'esbuild',
    cssMinify: true,
    target: 'esnext',
    sourcemap: false,
    rollupOptions: {}
  },
}));

