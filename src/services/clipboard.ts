export type ClipboardFailureReason = "unavailable" | "denied" | "failed";

export type ClipboardResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: ClipboardFailureReason; error?: unknown };

function isClipboardAvailable(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.clipboard) && typeof navigator.clipboard.readText === "function";
}

function isNotAllowedError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === "NotAllowedError";
  }
  if (error instanceof Error) {
    return error.name === "NotAllowedError";
  }
  return false;
}

export async function readText(): Promise<ClipboardResult<string>> {
  if (!isClipboardAvailable()) {
    return { ok: false, reason: "unavailable" };
  }

  try {
    const value = await navigator.clipboard.readText();
    return { ok: true, value };
  } catch (error) {
    if (isNotAllowedError(error)) {
      return { ok: false, reason: "denied", error };
    }
    return { ok: false, reason: "failed", error };
  }
}

export async function writeText(text: string): Promise<ClipboardResult<void>> {
  if (!isClipboardAvailable()) {
    return { ok: false, reason: "unavailable" };
  }

  try {
    await navigator.clipboard.writeText(text);
    return { ok: true, value: undefined };
  } catch (error) {
    if (isNotAllowedError(error)) {
      return { ok: false, reason: "denied", error };
    }
    return { ok: false, reason: "failed", error };
  }
}
