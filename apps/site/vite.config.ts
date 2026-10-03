import path from "node:path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { assertPortFree } from "../../scripts/sonda-porta";

const base = process.env.SITE_BASE ?? "/";
// Porta nomeada: 5281 (a app do desktop usa 5280). Fora das faixas do Vite
// (5173-5175 / 4173-4175). Antes era 8080, que nao disputava com ninguem da
// frota — mas 8080 nao e nomeado e nao tem convencao de centena, entao ela
// tambem virou alvo de outro projeto (personalnews).
const DEV_PORT = 5281;

export default defineConfig(async ({ command }) => {
  // `host: '::'` e IPv6-only no Windows: `127.0.0.1:8080` da ECONNRESET e
  // `[::1]:8080` responde 200 (medido em 2026-10-01 com uma sonda local de
  // alcance de host). Como `::` aceita o bind mesmo com `127.0.0.1:8080`
  // ocupado, `strictPort` sozinho nunca dispara.
  //
  // O site nao tem Tauri nem `devUrl` fixo, entao a porta PODE ser realocada —
  // mas o `site:test:smoke` e o `site:build` do monorepo podem esperar 8080.
  // Por isso verifica e ABORTA, em vez de silenciosamente cair para 8081.
  if (command === "serve") {
    await assertPortFree(DEV_PORT);
  }

  return {
    base,
    server: {
      host: "::",
      port: DEV_PORT,
      strictPort: true,
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
  };
});
