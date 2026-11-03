import path from "node:path";
import tailwindV4 from "@tailwindcss/postcss";
import react from "@vitejs/plugin-react-swc";
import postcss from "postcss";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import { assertPortFree } from "../../scripts/sonda-porta";

const AURORA_CSS = /[\\/]src[\\/]aurora[\\/]aurora\.css$/;

/**
 * O shell novo (header + abertura) e o unico arquivo do site compilado pelo
 * Tailwind v4; todo o resto continua no v3, pela `postcss.config.js`.
 *
 * Compilar aqui, antes da pipeline de CSS do Vite, e o que mantem as duas
 * versoes separadas: o `postcss-import` do Vite inlineria os imports do v4 e
 * entregaria um arquivo sem as diretivas que ele precisa ver.
 */
const auroraTailwindV4 = (): Plugin => ({
  name: "aurora-tailwind-v4",
  enforce: "pre",
  async transform(code, id) {
    const file = id.split("?")[0];
    if (!AURORA_CSS.test(file)) return null;

    const result = await postcss([tailwindV4()]).process(code, { from: file, map: null });
    for (const warning of result.warnings()) this.warn(warning.toString());
    return { code: result.css, map: null };
  },
});

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
    plugins: [react(), auroraTailwindV4()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
