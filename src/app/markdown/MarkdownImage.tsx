import React, { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../../services/runtime";

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

function resolveLocalImagePath(src: string, basePath?: string | null) {
  let cleanPath = decodeImagePath(src);
  if (!/^[a-zA-Z]:\\/i.test(cleanPath) && !cleanPath.startsWith("/") && basePath) {
    const baseDir = basePath.replace(/[/\\][^/\\]*$/, "");
    cleanPath = `${baseDir}/${cleanPath.replace(/^\.\//, "")}`;
  }
  return cleanPath;
}

function mayHaveTransparency(src: string) {
  const path = src.split("?")[0].toLowerCase();
  return path.endsWith(".png") || path.endsWith(".svg") || path.endsWith(".webp");
}

export default function MarkdownImage({
  src,
  alt,
  title,
  className,
  basePath,
  ...props
}: MarkdownImageProps) {
  const [state, setState] = useState<ImageState>({ status: "loading" });
  const originalSrc = typeof src === "string" ? src : "";
  const caption = title || (alt && alt !== originalSrc ? alt : "");
  const transparent = useMemo(() => mayHaveTransparency(originalSrc), [originalSrc]);

  useEffect(() => {
    if (!originalSrc) {
      setState({ status: "error", message: "Image source is empty" });
      return;
    }

    if (isRemoteImage(originalSrc) || !isTauriRuntime()) {
      setState({ status: "ready", src: originalSrc });
      return;
    }

    let mounted = true;
    setState({ status: "loading" });

    const loadImage = async () => {
      try {
        const path = resolveLocalImagePath(originalSrc, basePath);
        const dataUrl = await invoke<string>("load_image", { path });
        if (mounted) setState({ status: "ready", src: dataUrl });
      } catch (error) {
        if (!mounted) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    };

    loadImage();
    return () => {
      mounted = false;
    };
  }, [basePath, originalSrc]);

  const content =
    state.status === "ready" ? (
      <img
        {...props}
        alt={alt ?? ""}
        className={["ml-preview-img", transparent ? "ml-preview-img--transparent" : "", className ?? ""]
          .filter(Boolean)
          .join(" ")}
        loading="lazy"
        onError={() => setState({ status: "error", message: "Image failed to load" })}
        src={state.src}
        title={title}
      />
    ) : state.status === "loading" ? (
      <div className="ml-preview-image-placeholder ml-preview-image-placeholder--loading" aria-hidden="true">
        <span />
      </div>
    ) : (
      <div className="ml-preview-image-placeholder" role="img" aria-label={alt ?? "Image not found"}>
        <span className="ml-preview-image-placeholder-title">Image not found</span>
        <code>{decodeImagePath(originalSrc)}</code>
        <span className="ml-preview-image-placeholder-detail">{state.message}</span>
      </div>
    );

  return (
    <figure className="ml-preview-figure">
      {content}
      {caption ? <figcaption className="ml-preview-figcaption">{caption}</figcaption> : null}
    </figure>
  );
}
