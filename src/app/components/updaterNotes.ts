import { createElement, type ReactElement } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { markdownSanitizeSchema } from "../markdown/sanitizeSchema.ts";

/**
 * As notas da release, lidas como Markdown — e não como o texto cru do feed.
 *
 * **Por que existe.** O corpo da release chega do feed com `##`, `###`, listas e
 * `**ênfase**`, e o cartão de Atualizações o despejava dentro de um único `<p>`:
 * a pessoa via os marcadores literais em vez do que eles querem dizer. O
 * pipeline é o mesmo do preview do editor — `react-markdown` com `remark-gfm`,
 * `rehype-raw` e **`rehype-sanitize` com o schema do app** —, que é o que
 * transforma marcador em elemento sem abrir a porta para HTML da rede.
 *
 * **O conteúdo é remoto, então a decisão é conservadora.** A nota vem do feed de
 * release: é entrada de terceiro dentro da tela de Ajustes. O schema é o do
 * preview, não um mais permissivo, e três coisas mudam aqui em relação a ele:
 *
 * - **sem imagem**: o corpo da release começa com o banner publicado; os Ajustes
 *   não pedem rede para abrir uma tela, e um banner num cartão de poucas linhas
 *   empurraria o texto para fora. A imagem sai, e o parágrafo que sobra vazio
 *   junto com ela também;
 * - **sem link navegável**: em Tauri, um `<a href>` clicado navega a webview — a
 *   tela do app viraria a página de destino. O texto do link continua legível e
 *   o destino fica no `title`, sem transformar o cartão numa porta de saída;
 * - **sem âncora de título**: `rehype-slug`/`rehype-autolink-headings` servem à
 *   navegação dentro do documento aberto, que aqui não existe — e deixariam um
 *   `<a>` em volta do título, justamente o que a linha acima não quer.
 *
 * **Onde a regra mora.** Este módulo não tem JSX porque `.tsx` não roda no runner
 * de teste deste projeto (`node:test` + `--experimental-strip-types` remove tipo,
 * não transforma JSX). Aqui há React puro, então a conversão é executável e
 * `updaterNotes.test.ts` a prova com a nota real da v1.8.5 — que o cartão a use é
 * provado no mesmo arquivo, lendo a fonte do componente.
 */
export function renderUpdaterNotes(notes: string): ReactElement {
  return createElement(
    ReactMarkdown,
    {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeRaw, [rehypeSanitize, markdownSanitizeSchema]],
      components,
    },
    notes
  );
}

/** O mínimo de `hast` que esta decisão enxerga — um tipo estrutural local, em vez
 *  de acoplar o módulo ao nome de tipo que a biblioteca exporta hoje. */
type NotesNode = {
  type?: string;
  tagName?: string;
  value?: string;
  children?: NotesNode[];
};

/** Imagem sozinha — ou uma ligação que só envolve imagens. */
function isImageOnly(node: NotesNode): boolean {
  if (node.type !== "element") return false;
  if (node.tagName === "img") return true;
  if (node.tagName !== "a") return false;
  const children = node.children ?? [];
  return children.length > 0 && children.every(isImageOnly);
}

/** Um parágrafo que só continha imagem fica sem nada: não vale o espaço. */
function paragraphHasContent(node: NotesNode | undefined): boolean {
  const children = node?.children;
  if (!children) return true;
  return children.some((child) =>
    child.type === "text" ? Boolean(child.value && child.value.trim().length > 0) : !isImageOnly(child)
  );
}

const components: Components = {
  a: ({ href, children }) =>
    createElement("span", { className: "ml-updater-notes-link", title: href ?? undefined }, children),
  img: () => null,
  p: ({ node, children }) =>
    paragraphHasContent(node) ? createElement("p", null, children) : null,
};
