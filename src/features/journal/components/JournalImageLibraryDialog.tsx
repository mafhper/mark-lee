import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Image as ImageIcon, Plus, X } from "lucide-react";
import type { ThemeConfig, WorkspaceNode } from "../../../types";
import { loadImage, readWorkspaceTree } from "../../../services/filesystem";

const IMAGE_EXTENSION_RE = /\.(?:png|jpe?g|gif|webp|svg|bmp)$/i;

export interface JournalLibraryImage {
  path: string;
  relativePath: string;
  name: string;
  url: string | null;
}

function collectImageNodes(root: WorkspaceNode): WorkspaceNode[] {
  const images: WorkspaceNode[] = [];
  const visit = (node: WorkspaceNode) => {
    if (node.path.startsWith("__mark_lee_virtual__:")) return;
    if (!node.is_dir && IMAGE_EXTENSION_RE.test(node.name)) images.push(node);
    node.children?.forEach(visit);
  };
  visit(root);
  return images.slice(0, 160);
}

function relativeToRoot(rootPath: string, path: string): string {
  const root = rootPath.replace(/\\/g, "/").replace(/\/$/, "");
  const normalized = path.replace(/\\/g, "/");
  return normalized.toLowerCase().startsWith(`${root.toLowerCase()}/`)
    ? normalized.slice(root.length + 1)
    : normalized;
}

interface JournalImageLibraryDialogProps {
  open: boolean;
  t: Record<string, string>;
  tConfig: ThemeConfig;
  journalRootPath: string;
  multiple?: boolean;
  onClose: () => void;
  onSelect: (images: JournalLibraryImage[]) => void;
  onEmpty: () => void;
}

export function JournalImageLibraryDialog({
  open, t, tConfig, journalRootPath, multiple = false, onClose, onSelect, onEmpty,
}: JournalImageLibraryDialogProps) {
  const [images, setImages] = useState<JournalLibraryImage[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const emptyHandledRef = useRef(false);
  const onEmptyRef = useRef(onEmpty);
  const onCloseRef = useRef(onClose);
  onEmptyRef.current = onEmpty;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    let active = true;
    emptyHandledRef.current = false;
    setSelected(new Set());
    setError("");
    setLoading(true);
    readWorkspaceTree(journalRootPath)
      .then(async (tree) => {
        const nodes = collectImageNodes(tree);
        if (!active) return;
        if (nodes.length === 0) {
          setImages([]);
          setLoading(false);
          if (!emptyHandledRef.current) {
            emptyHandledRef.current = true;
            onEmptyRef.current();
            onCloseRef.current();
          }
          return;
        }
        const next = await Promise.all(nodes.map(async (node): Promise<JournalLibraryImage> => {
          let url: string | null = null;
          try { url = await loadImage(node.path); } catch { /* keep placeholder */ }
          return { path: node.path, relativePath: relativeToRoot(journalRootPath, node.path), name: node.name, url };
        }));
        if (active) {
          setImages(next);
          setLoading(false);
        }
      })
      .catch((cause) => {
        if (!active) return;
        setLoading(false);
        setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => { active = false; };
  }, [open, journalRootPath]);

  const selectedImages = useMemo(() => images.filter((image) => selected.has(image.path)), [images, selected]);

  if (!open) return null;

  const choose = (image: JournalLibraryImage) => {
    if (!multiple) {
      onSelect([image]);
      onClose();
      return;
    }
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(image.path)) next.delete(image.path); else next.add(image.path);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[280] flex items-center justify-center bg-black/55" role="dialog" aria-modal="true"
      aria-label={t["journal.projectImages"] || "Imagens do caderno"} onClick={onClose}>
      <div className="flex max-h-[86vh] w-[760px] max-w-[94vw] flex-col rounded-lg border shadow-2xl"
        style={{ backgroundColor: tConfig.bgHex, borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}
        onClick={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b px-5 py-4" style={{ borderColor: tConfig.uiBorderHex }}>
          <div>
            <h3 className="text-sm font-semibold">{t["journal.projectImages"] || "Imagens do caderno"}</h3>
            <p className="text-xs" style={{ color: tConfig.fgHex + "65" }}>
              {t["journal.projectImagesDesc"] || "Reutilize uma imagem que já pertence a este caderno."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 hover:opacity-70" aria-label={t["journal.close"] || "Fechar"}><X size={16} /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="py-12 text-center text-xs" style={{ color: tConfig.fgHex + "60" }}>{t["journal.loading"] || "Carregando…"}</div>
          ) : error ? (
            <div className="rounded border px-3 py-2 text-xs" role="alert" style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex + "CC" }}>{error}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {images.map((image) => {
                const active = selected.has(image.path);
                return (
                  <button key={image.path} type="button" onClick={() => choose(image)} aria-pressed={active}
                    className="group overflow-hidden rounded-lg border text-left transition-opacity hover:opacity-90"
                    style={{ borderColor: active ? tConfig.accentHex : tConfig.uiBorderHex, backgroundColor: active ? tConfig.accentHex + "0D" : tConfig.uiHex + "55" }}>
                    <div className="relative aspect-[4/3] overflow-hidden" style={{ backgroundColor: tConfig.accentHex + "08" }}>
                      {image.url ? <img src={image.url} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={22} className="absolute inset-0 m-auto" style={{ color: tConfig.fgHex + "35" }} />}
                      {active && <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full" style={{ color: "#fff", backgroundColor: tConfig.accentHex }}><Check size={13} /></span>}
                    </div>
                    <div className="px-2 py-2">
                      <p className="truncate text-xs font-medium" title={image.name}>{image.name}</p>
                      <p className="truncate text-[10px]" style={{ color: tConfig.fgHex + "55" }} title={image.relativePath}>{image.relativePath}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t px-5 py-3" style={{ borderColor: tConfig.uiBorderHex }}>
          <button type="button" onClick={() => { onEmpty(); onClose(); }}
            className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex + "85" }}>
            <Plus size={13} /> {t["journal.addFromComputer"] || "Adicionar do computador"}
          </button>
          {multiple && (
            <button type="button" disabled={selectedImages.length === 0} onClick={() => { onSelect(selectedImages); onClose(); }}
              className="rounded px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              style={{ color: "#fff", backgroundColor: tConfig.accentHex }}>
              {t["journal.useSelected"] || "Usar selecionadas"} ({selectedImages.length})
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
