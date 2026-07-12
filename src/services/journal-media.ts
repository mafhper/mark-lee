import { copyImageToDocumentDir, deleteWorkspacePath, loadImage, writeBinaryFile } from "./filesystem";
import { DEFAULT_JOURNAL_MEDIA_SETTINGS } from "../constants";
import type { JournalMediaSettings } from "../types";

function documentDir(documentPath: string): string {
  const normalized = documentPath.replace(/\\/g, "/");
  return normalized.substring(0, normalized.lastIndexOf("/"));
}

function basename(path: string): string {
  return path.replace(/\\/g, "/").split("/").pop() || "image";
}

function stem(path: string): string {
  return basename(path).replace(/\.[^.]+$/, "") || "image";
}

function sanitizeFilename(name: string): string {
  return name.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_") || "image";
}

function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return blob.arrayBuffer().then((buffer) => new Uint8Array(buffer));
}

async function imageToWebpBytes(dataUrl: string, maxSize: number, quality: number) {
  const img = await dataUrlToImage(dataUrl);
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
  const height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error("WebP conversion failed")), "image/webp", quality);
  });
  return blobToBytes(blob);
}

function shouldOptimize(path: string, settings: JournalMediaSettings): boolean {
  if (!settings.optimizeWebp) return false;
  const ext = basename(path).split(".").pop()?.toLowerCase();
  return !!ext && !["svg", "gif", "webp"].includes(ext);
}

function shouldRemoveOriginal(settings: JournalMediaSettings, imagePath: string, documentPath: string): boolean {
  if (settings.preserveOriginals) return false;
  if (settings.importMode === "ask") {
    return window.confirm(
      `Mover a imagem original para dentro do caderno?\n\nOrigem:\n${imagePath}\n\nPasta de destino:\n${documentDir(documentPath)}\n\nOK copia para o caderno e remove o arquivo original. Cancelar copia e preserva o original.`,
    );
  }
  if (settings.importMode === "move") {
    return window.confirm(
      `Confirmar movimento da imagem original?\n\nOrigem:\n${imagePath}\n\nPasta de destino:\n${documentDir(documentPath)}\n\nOK copia para o caderno e remove o arquivo original. Cancelar copia e preserva o original.`,
    );
  }
  return false;
}

export async function importJournalImage(
  imagePath: string,
  documentPath: string,
  settings: JournalMediaSettings = DEFAULT_JOURNAL_MEDIA_SETTINGS,
): Promise<string> {
  const normalized = { ...DEFAULT_JOURNAL_MEDIA_SETTINGS, ...settings };

  if (shouldOptimize(imagePath, normalized)) {
    const dataUrl = await loadImage(imagePath);
    const bytes = await imageToWebpBytes(dataUrl, normalized.maxDimension, normalized.quality);
    const relative = sanitizeFilename(`${stem(imagePath)}-optimized-${Date.now()}.webp`);
    await writeBinaryFile(`${documentDir(documentPath)}/${relative}`, bytes);
    return relative;
  }

  const removeOriginal = shouldRemoveOriginal(normalized, imagePath, documentPath);
  const relative = await copyImageToDocumentDir(imagePath, documentPath);
  if (removeOriginal) {
    const target = `${documentDir(documentPath)}/${relative}`.replace(/\\/g, "/");
    const source = imagePath.replace(/\\/g, "/");
    if (source !== target) {
      await deleteWorkspacePath(imagePath);
    }
  }
  return relative;
}
