// Guarda de caminho para imagens do preview.
//
// `load_image` (Rust) lê **qualquer arquivo do disco** que o frontend pedir e não
// tem escopo próprio — a contenção é responsabilidade de quem chama. Ver a
// docstring de `resolveEntryAssetPath` em
// `features/journal/domain/export-paths.ts`, que faz o mesmo por outro caminho.
// Aqui a regra é a mesma, aplicada ao preview do Markdown.

const HAS_SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/**
 * Um `src` é remoto quando é http/https ou data:.
 *
 * `^(https?:)?//` aceita também o protocolo-relativo `//host/x`, que **não** é
 * remoto aos olhos deste editor: não tem autoridade conhecida e sairia para a
 * rede sem que o autor do documento tivesse nomeado um destino. Classificá-lo como
 * remoto fazia o componente ir para o ramo remoto e nunca passar pela guarda de
 * caminho — as duas decisões precisam sair do mesmo lugar por isso.
 */
export function isRemoteImagePath(src: string): boolean {
  if (/^\/\//.test(src.trim())) return false;
  return /^(https?:)?\/\//i.test(src) || src.startsWith("data:");
}

export function decodeImagePath(src: string): string {
  const stripped = src.trim().replace(/^</, "").replace(/>$/, "");
  try {
    return decodeURIComponent(stripped);
  } catch {
    /* mantém o valor bruto quando não é percent-encoding válido */
    return stripped;
  }
}

export function normalizeWindowsExtendedPath(path: string): string {
  if (path.startsWith("\\\\?\\UNC\\")) {
    return `\\\\${path.slice("\\\\?\\UNC\\".length)}`;
  }
  if (path.startsWith("\\\\?\\")) {
    return path.slice("\\\\?\\".length);
  }
  return path;
}

/**
 * Resolve um `src` de imagem para um caminho absoluto, ou `null` quando não há
 * destino correto.
 *
 * Regras:
 * - relativo **exige** `basePath`. Sem pasta do documento (Untitled, conteúdo
 *   colado) não existe base, e devolver o caminho cru fazia o navegador resolvê-lo
 *   contra a origem da própria aplicação — um `.md` colado lia a árvore servida.
 * - `..` é rejeitado: sem isso, `../../../../Users/alguem/x.png` sai da pasta do
 *   documento. O sistema de arquivos resolve `..`; o JavaScript não normaliza.
 * - caminho absoluto é preservado: é funcionalidade existente e legítima.
 */
export function resolveLocalImagePath(src: string, basePath?: string | null): string | null {
  const decoded = decodeImagePath(src);
  const slashed = decoded.replace(/\\/g, "/");

  if (!slashed) {
    return null;
  }

  // Protocolo-relativo (//host/x) traz uma autoridade, não um caminho: tem de ser
  // recusado ANTES do teste de absoluto, senão `//` parece POSIX.
  if (slashed.startsWith("//")) {
    return null;
  }

  // Caminho absoluto ANTES do teste de esquema: `C:` parece um esquema e seria
  // recusado como desconhecido, quebrando toda imagem em caminho absoluto.
  if (/^[a-zA-Z]:\//.test(slashed) || slashed.startsWith("/")) {
    return normalizeWindowsExtendedPath(decoded);
  }

  // Qualquer coisa com esquema (http:, data:, javascript:, ...) não é caminho
  // local e não deve chegar ao disco.
  if (HAS_SCHEME_RE.test(slashed)) {
    return null;
  }

  // Relativo: sem pasta do documento não há base válida.
  if (!basePath) {
    return null;
  }

  const baseDir = basePath.replace(/[/\\][^/\\]*$/, "");
  // `baseDir === basePath` significa que o documento não tem componente de
  // diretório ("README.md"); nesse caso não há base. `!baseDir` cobre "/arquivo".
  if (!baseDir || baseDir === basePath) {
    return null;
  }

  const segments: string[] = [];
  for (const seg of slashed.split("/")) {
    if (seg === "" || seg === ".") continue;
    // Qualquer escalada de diretório é recusada, como em safeRelativeAssetPath.
    if (seg === "..") return null;
    segments.push(seg);
  }
  if (segments.length === 0) {
    return null;
  }

  return `${baseDir}/${segments.join("/")}`;
}
