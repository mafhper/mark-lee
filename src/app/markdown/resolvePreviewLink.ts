export type PreviewLinkKind = "external" | "anchor" | "local-file" | "email" | "unsupported";

export interface ResolvedPreviewLink {
  kind: PreviewLinkKind;
  originalHref: string;
  resolvedHref: string;
}

export function resolvePreviewLink(originalHref: string, resolvedHref: string): ResolvedPreviewLink {
  const trimmed = originalHref.trim();

  if (!trimmed) {
    return { kind: "unsupported", originalHref, resolvedHref };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return { kind: "external", originalHref, resolvedHref };
  }

  if (/^mailto:/i.test(trimmed)) {
    return { kind: "email", originalHref, resolvedHref };
  }

  if (trimmed.startsWith("#")) {
    return { kind: "anchor", originalHref, resolvedHref };
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(trimmed)) {
    return { kind: "unsupported", originalHref, resolvedHref };
  }

  return { kind: "local-file", originalHref, resolvedHref };
}
