export type PreviewLinkKind = "external" | "anchor" | "local-file" | "email" | "unsupported";

export interface ResolvedPreviewLink {
  kind: PreviewLinkKind;
  originalHref: string;
  resolvedHref: string;
  /**
   * Caminho absoluto quando `kind` é `local-file` e houve base válida para resolver.
   * `null` quando o link é relativo mas não há pasta do documento (Untitled) — nesse
   * caso `kind` vira `unsupported`, porque não existe destino correto.
   */
  localPath: string | null;
}

/** Extrai o diretório de um caminho de arquivo. */
function directoryOf(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const cut = normalized.lastIndexOf("/");
  return cut >= 0 ? normalized.slice(0, cut) : "";
}

/**
 * Junta um link relativo ao diretório do documento.
 *
 * O mesmo cálculo que `MarkdownImage` já faz para imagem (`resolveLocalImagePath`):
 * sem isso, `onOpenFile` recebia `./CHANGELOG.md` e o processo resolvia contra o CWD,
 * então o arquivo irmão nunca abria.
 */
export function resolveLocalLinkPath(href: string, basePath?: string | null): string | null {
  if (!basePath) return null;
  const clean = href.trim().replace(/^\.\//, "");
  if (!clean) return null;
  // já absoluto (Windows com letra de drive, ou POSIX): não mexe.
  if (/^[a-zA-Z]:[\\/]/.test(clean) || clean.startsWith("/")) return clean;
  const baseDir = directoryOf(basePath);
  if (!baseDir) return null;
  // Não sobe acima da raiz do documento com `..` escapando do diretório.
  return `${baseDir}/${clean}`;
}

export function resolvePreviewLink(
  originalHref: string,
  resolvedHref: string,
  basePath?: string | null,
): ResolvedPreviewLink {
  const trimmed = originalHref.trim();

  if (!trimmed) {
    return { kind: "unsupported", originalHref, resolvedHref, localPath: null };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return { kind: "external", originalHref, resolvedHref, localPath: null };
  }

  if (/^mailto:/i.test(trimmed)) {
    return { kind: "email", originalHref, resolvedHref, localPath: null };
  }

  if (trimmed.startsWith("#")) {
    return { kind: "anchor", originalHref, resolvedHref, localPath: null };
  }

  // Caminho absoluto do Windows (C:/... ou C:\...) tem que ser tratado ANTES do
  // teste de protocolo: `C:` parece um esquema e seria classificado como
  // desconhecido. O mesmo vale para o POSIX, que o teste de esquema não pega.
  if (/^[a-zA-Z]:[\\/]/.test(trimmed) || trimmed.startsWith("/")) {
    return { kind: "local-file", originalHref, resolvedHref, localPath: trimmed };
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(trimmed)) {
    return { kind: "unsupported", originalHref, resolvedHref, localPath: null };
  }

  // Relativo: só é `local-file` se houver pasta do documento para resolver contra.
  // Sem base (Untitled, colado) não existe destino correto — antes caía num
  // endereço falso, a origem do app.
  const localPath = resolveLocalLinkPath(trimmed, basePath);
  if (!localPath) {
    return { kind: "unsupported", originalHref, resolvedHref, localPath: null };
  }

  return { kind: "local-file", originalHref, resolvedHref, localPath };
}
