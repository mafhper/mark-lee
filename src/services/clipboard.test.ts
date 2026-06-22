import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readText, writeText } from "./clipboard.ts";

function createMockClipboard({ readText, writeText }: { readText?: () => Promise<string>; writeText?: (text: string) => Promise<void> }) {
  return {
    readText: readText ?? (() => Promise.resolve("")),
    writeText: writeText ?? (() => Promise.resolve()),
  };
}

const originalClipboard = navigator.clipboard;

function setClipboard(mock: unknown) {
  Object.defineProperty(navigator, "clipboard", {
    value: mock,
    configurable: true,
    writable: true,
  });
}

function removeClipboard() {
  Object.defineProperty(navigator, "clipboard", {
    value: undefined,
    configurable: true,
    writable: true,
  });
}

describe("clipboard.readText", () => {
  beforeEach(() => {
    // restore original
    if (originalClipboard !== undefined) {
      setClipboard(originalClipboard);
    }
  });

  afterEach(() => {
    if (originalClipboard !== undefined) {
      setClipboard(originalClipboard);
    } else {
      removeClipboard();
    }
  });

  it("retorna ok:true com valor quando clipboard tem conteúdo", async () => {
    setClipboard(createMockClipboard({ readText: () => Promise.resolve("hello world") }));
    const result = await readText();
    assert.equal(result.ok, true);
    assert.equal(result.value, "hello world");
  });

  it("retorna ok:true com string vazia quando clipboard está vazio", async () => {
    setClipboard(createMockClipboard({ readText: () => Promise.resolve("") }));
    const result = await readText();
    assert.equal(result.ok, true);
    assert.equal(result.value, "");
  });

  it("retorna ok:false reason:unavailable quando navigator.clipboard não existe", async () => {
    removeClipboard();
    const result = await readText();
    assert.equal(result.ok, false);
    assert.equal(result.reason, "unavailable");
  });

  it("retorna ok:false reason:denied quando NotAllowedError é lançado", async () => {
    setClipboard(
      createMockClipboard({
        readText: () => Promise.reject(new DOMException("Permission denied", "NotAllowedError")),
      })
    );
    const result = await readText();
    assert.equal(result.ok, false);
    assert.equal(result.reason, "denied");
  });

  it("retorna ok:false reason:failed para outros erros", async () => {
    setClipboard(
      createMockClipboard({
        readText: () => Promise.reject(new Error("Unexpected failure")),
      })
    );
    const result = await readText();
    assert.equal(result.ok, false);
    assert.equal(result.reason, "failed");
  });
});

describe("clipboard.writeText", () => {
  beforeEach(() => {
    if (originalClipboard !== undefined) {
      setClipboard(originalClipboard);
    }
  });

  afterEach(() => {
    if (originalClipboard !== undefined) {
      setClipboard(originalClipboard);
    } else {
      removeClipboard();
    }
  });

  it("retorna ok:true quando escrita succeeds", async () => {
    setClipboard(createMockClipboard({ writeText: () => Promise.resolve() }));
    const result = await writeText("test");
    assert.equal(result.ok, true);
    assert.equal(result.value, undefined);
  });

  it("retorna ok:false reason:unavailable quando navigator.clipboard não existe", async () => {
    removeClipboard();
    const result = await writeText("test");
    assert.equal(result.ok, false);
    assert.equal(result.reason, "unavailable");
  });

  it("retorna ok:false reason:denied quando NotAllowedError é lançado", async () => {
    setClipboard(
      createMockClipboard({
        writeText: () => Promise.reject(new DOMException("Permission denied", "NotAllowedError")),
      })
    );
    const result = await writeText("test");
    assert.equal(result.ok, false);
    assert.equal(result.reason, "denied");
  });

  it("retorna ok:false reason:failed para outros erros", async () => {
    setClipboard(
      createMockClipboard({
        writeText: () => Promise.reject(new Error("Write failed")),
      })
    );
    const result = await writeText("test");
    assert.equal(result.ok, false);
    assert.equal(result.reason, "failed");
  });
});
