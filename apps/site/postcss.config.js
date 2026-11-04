import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";

// O site continua no Tailwind v3. O shell novo (header + abertura) e o unico
// arquivo compilado pelo v4, e isso acontece antes, no plugin
// `auroraTailwindV4` de `vite.config.ts`.
//
// Quando `aurora.css` chega aqui ele ja saiu do v4 — o `@layer utilities` do
// resultado nao tem `@tailwind utilities` correspondente e o v3 abortaria. Por
// isso o v3 se retira, e so desse arquivo: todo o resto do site atravessa
// exatamente a mesma pipeline de antes.
const AURORA_CSS = /[\\/]src[\\/]aurora[\\/]aurora\.css$/;

const tailwindSite = (options) => {
  const inner = tailwindcss(options);

  return {
    postcssPlugin: "tailwindcss-site",
    plugins: (inner.plugins ?? []).map((hook) => async (root, result) => {
      if (AURORA_CSS.test(String(result.opts.from ?? ""))) return;
      return hook(root, result);
    }),
  };
};

export default {
  plugins: [tailwindSite(), autoprefixer()],
};
