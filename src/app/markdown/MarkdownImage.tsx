import React, { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../../services/runtime";

type CachedImage =
  | { status: "ready"; src: string; width: number; height: number }
  | { status: "error"; message: string };

const localImageCache = new Map<string, CachedImage>();

type ImageState =
  | { status: "loading" }
  | { status: "ready"; src: string }
  | { status: "error"; message: string };

type MarkdownImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  basePath?: string | null;
};

function isRemoteImage(src: string) {
  return /^(https?:)?\/\//i.test(src) || src.startsWith("data:");
}

function decodeImagePath(src: string) {
  const stripped = src.trim().replace(/^</, "").replace(/>$/, "");
  try {
    return decodeURIComponent(stripped);
  } catch {
    return stripped;
  }
}

function normalizeWindowsExtendedPath(path: string) {
  if (path.startsWith("\\\\?\\UNC\\")) {
    return `\\\\${path.slice("\\\\?\\UNC\\".length)}`;
  }
  if (path.startsWith("\\\\?\\")) {
    return path.slice("\\\\?\\".length);
  }
  return path;
}

function resolveLocalImagePath(src: string, basePath?: string | null) {
  let cleanPath = decodeImagePath(src);
  if (!/^[a-zA-Z]:\\/i.test(cleanPath) && !cleanPath.startsWith("/") && basePath) {
    const baseDir = basePath.replace(/[/\\][^/\\]*$/, "");
    cleanPath = `${baseDir}/${cleanPath.replace(/^\.\//, "")}`;
  }
  return normalizeWindowsExtendedPath(cleanPath);
}

function mayHaveTransparency(src: string) {
  const path = src.split("?")[0].toLowerCase();
  return path.endsWith(".png") || path.endsWith(".svg") || path.endsWith(".webp");
}

function imageCopy() {
  const lang = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "en";
  if (lang.startsWith("pt")) {
    return {
      notFound: "Imagem indisponivel",
      empty: "Origem da imagem vazia",
      failed: "Falha ao carregar imagem",
      unsupported: "Tipo de imagem sem suporte",
    };
  }
  if (lang.startsWith("es")) {
    return {
      notFound: "Imagen no disponible",
      empty: "Origen de imagen vacio",
      failed: "No se pudo cargar la imagen",
      unsupported: "Tipo de imagen no compatible",
    };
  }
  return {
    notFound: "Image not found",
    empty: "Image source is empty",
    failed: "Image failed to load",
    unsupported: "Unsupported image type",
  };
}

function localizeImageError(message: string) {
  const copy = imageCopy();
  const unsupported = message.match(/Unsupported image type:\s*([^\s]+)/i);
  if (unsupported) return `${copy.unsupported}: ${unsupported[1]}`;
  if (/Image source is empty/i.test(message)) return copy.empty;
  if (/Image failed to load/i.test(message)) return copy.failed;
  return message;
}

export default function MarkdownImage({
  src,
  alt,
  title,
  className,
  basePath,
  width: attrWidth,
  height: attrHeight,
  ...props
}: MarkdownImageProps) {
  const originalSrc = typeof src === "string" ? src : "";
  const cacheKey = useMemo(() => {
    if (isRemoteImage(originalSrc) || !isTauriRuntime()) return originalSrc;
    return resolveLocalImagePath(originalSrc, basePath);
  }, [originalSrc, basePath]);

  const [state, setState] = useState<ImageState>(() => {
    const cached = localImageCache.get(cacheKey);
    if (cached) return cached;
    return { status: "loading" };
  });

  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(() => {
    const cached = localImageCache.get(cacheKey);
    if (cached && cached.status === "ready") {
      return { width: cached.width, height: cached.height };
    }
    return null;
  });

  const caption = title || (alt && alt !== originalSrc ? alt : "");
  const transparent = useMemo(() => mayHaveTransparency(originalSrc), [originalSrc]);

  useEffect(() => {
    if (!originalSrc) {
      setState({ status: "error", message: imageCopy().empty });
      return;
    }

    if (isRemoteImage(originalSrc) || !isTauriRuntime()) {
      setState({ status: "ready", src: originalSrc });
      return;
    }

    const cached = localImageCache.get(cacheKey);
    if (cached) {
      setState(cached);
      if (cached.status === "ready") {
        setDimensions({ width: cached.width, height: cached.height });
      }
      return;
    }

    let mounted = true;
    setState({ status: "loading" });

    const loadImage = async () => {
      try {
        const dataUrl = await invoke<string>("load_image", { path: cacheKey });
        
        // Pre-load to get dimensions and avoid flicker
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        if (!mounted) return;

        const result: CachedImage = {
          status: "ready",
          src: dataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
        };
        localImageCache.set(cacheKey, result);
        setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setState(result);
      } catch (error) {
        if (!mounted) return;
        const errorResult: CachedImage = {
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        };
        localImageCache.set(cacheKey, errorResult);
        setState(errorResult);
      }
    };

    loadImage();
    return () => {
      mounted = false;
    };
  }, [cacheKey, originalSrc]);

  const figureStyle = useMemo(() => {
    const style: React.CSSProperties = {};

    // 1. Determine the intrinsic ratio (must come from a consistent source)
    const intrinsicW = dimensions?.width || (attrWidth && attrHeight ? Number(attrWidth) : 0);
    const intrinsicH = dimensions?.height || (attrWidth && attrHeight ? Number(attrHeight) : 0);

    if (intrinsicW > 0 && intrinsicH > 0) {
      style.aspectRatio = `${intrinsicW} / ${intrinsicH}`;
    }

    // 2. Determine the display width constraint
    const displayW = attrWidth || (dimensions?.width ? `${dimensions.width}px` : undefined);
    if (displayW) {
      const numericWidth = Number(displayW);
      if (!isNaN(numericWidth)) {
        style.width = `${numericWidth}px`;
      } else {
        style.width = displayW;
      }
    }

    return Object.keys(style).length > 0 ? style : undefined;
  }, [attrWidth, attrHeight, dimensions]);

  const content =
    state.status === "ready" ? (
      <img
        {...props}
        alt={alt ?? ""}
        className={["ml-preview-img", transparent ? "ml-preview-img--transparent" : "", className ?? ""]
          .filter(Boolean)
          .join(" ")}
        loading={isRemoteImage(originalSrc) ? "lazy" : "eager"}
        decoding="async"
        onError={() => setState({ status: "error", message: imageCopy().failed })}
        src={state.src}
        title={title}
        width={attrWidth}
        height={attrHeight}
        data-ml-original-src={originalSrc || undefined}
        data-ml-resolved-path={!isRemoteImage(originalSrc) && isTauriRuntime() ? cacheKey : undefined}
        data-ml-alt={alt || undefined}
      />
    ) : state.status === "loading" ? (
      <div className="ml-preview-image-placeholder ml-preview-image-placeholder--loading" aria-hidden="true">
        <span />
      </div>
    ) : (
      <div className="ml-preview-image-placeholder" role="img" aria-label={alt ?? imageCopy().notFound}>
        <span className="ml-preview-image-placeholder-title">{imageCopy().notFound}</span>
        <code>{decodeImagePath(originalSrc)}</code>
        <span className="ml-preview-image-placeholder-detail">{localizeImageError(state.message)}</span>
      </div>
    );

  return (
    <figure
      className="ml-preview-figure"
      data-ml-media="image"
      data-ml-original-src={originalSrc || undefined}
      data-ml-resolved-path={!isRemoteImage(originalSrc) && isTauriRuntime() ? cacheKey : undefined}
      data-ml-alt={alt || undefined}
      style={figureStyle}
    >
      {content}
      {caption ? <figcaption className="ml-preview-figcaption">{caption}</figcaption> : null}
    </figure>
  );
}
