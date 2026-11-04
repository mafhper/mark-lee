import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attachZenTrigger } from "@/aurora/zen-trigger";
import { ZenMotionTokens } from "@/aurora/zen-tokens";

/**
 * O gatilho: quem acende, o que publica e quando apaga.
 *
 * O que este teste protege é a decisão que o olho cobra — passar por cima da
 * janela a caminho de um link não pode acender o véu por um quadro, e quem sai
 * não pode esperar nada. O estado publicado é `body[data-zen]` porque é ele que
 * o CSS anima; o motor recebe o mesmo aviso por `setLit`.
 */
const DWELL = ZenMotionTokens.timings.dwellMs;

describe("zen trigger", () => {
  let element: HTMLDivElement;
  let child: HTMLSpanElement;
  let calls: boolean[];
  let detach: () => void;

  const dispatch = (type: string, target: EventTarget = element, init?: EventInit & { relatedTarget?: Node | null }) => {
    const event = type.startsWith("focus") ? new FocusEvent(type, init) : new MouseEvent(type, init);
    target.dispatchEvent(event);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    calls = [];
    element = document.createElement("div");
    child = document.createElement("span");
    element.appendChild(child);
    document.body.appendChild(element);
    detach = attachZenTrigger(element, { setLit: (lit) => calls.push(lit) });
  });

  afterEach(() => {
    detach();
    element.remove();
    delete document.body.dataset.zen;
    vi.useRealTimers();
  });

  it("does not light for a cursor that just crosses the window", () => {
    dispatch("mouseenter");
    vi.advanceTimersByTime(DWELL - 1);

    expect(document.body.dataset.zen).toBeUndefined();
    expect(calls).toEqual([]);

    dispatch("mouseleave");
    vi.advanceTimersByTime(1000);

    expect(document.body.dataset.zen).toBeUndefined();
    expect(calls).toEqual([]);
  });

  it("lights after the dwell and publishes it on the body", () => {
    dispatch("mouseenter");
    vi.advanceTimersByTime(DWELL);

    expect(document.body.dataset.zen).toBe("true");
    expect(calls).toEqual([true]);
  });

  it("douses immediately when the pointer leaves", () => {
    dispatch("mouseenter");
    vi.advanceTimersByTime(DWELL);
    dispatch("mouseleave");

    /* Sem espera nenhuma: quem saiu já decidiu navegar. */
    expect(document.body.dataset.zen).toBeUndefined();
    expect(calls).toEqual([true, false]);
  });

  it("keeps the veil up while the focus stays inside", () => {
    dispatch("mouseenter");
    vi.advanceTimersByTime(DWELL);
    dispatch("focusin");
    dispatch("mouseleave");

    expect(document.body.dataset.zen).toBe("true");
    expect(calls).toEqual([true]);

    dispatch("focusout");
    expect(document.body.dataset.zen).toBeUndefined();
    expect(calls).toEqual([true, false]);
  });

  it("does not douse when the focus only moves to a child", () => {
    dispatch("focusin");
    vi.advanceTimersByTime(DWELL);
    dispatch("focusout", element, { relatedTarget: child });

    expect(document.body.dataset.zen).toBe("true");
    expect(calls).toEqual([true]);
  });

  it("waits for the dwell on keyboard focus too", () => {
    dispatch("focusin");
    vi.advanceTimersByTime(DWELL - 1);
    expect(document.body.dataset.zen).toBeUndefined();

    vi.advanceTimersByTime(1);
    expect(document.body.dataset.zen).toBe("true");
  });

  it("leaves nothing behind when it is detached mid-flight", () => {
    dispatch("mouseenter");
    vi.advanceTimersByTime(DWELL);
    detach();

    expect(document.body.dataset.zen).toBeUndefined();
    expect(calls).toEqual([true, false]);

    dispatch("mouseenter");
    vi.advanceTimersByTime(DWELL);
    expect(calls).toEqual([true, false]);
  });

  it("cancels a pending dwell when it is detached before it fires", () => {
    dispatch("mouseenter");
    detach();
    vi.advanceTimersByTime(DWELL * 10);

    expect(document.body.dataset.zen).toBeUndefined();
    expect(calls).toEqual([]);
  });
});
