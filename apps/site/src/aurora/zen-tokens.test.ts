import path from "node:path";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ZenMotionTokens } from "@/aurora/zen-tokens";

/**
 * O contrato entre os tokens e o CSS.
 *
 * O CSS não importa TypeScript, então as durações, as curvas e a atenuação
 * aparecem duas vezes: como objeto em `zen-tokens.ts` e como custom property em
 * `aurora.css`. Duas cópias de um número divergem em silêncio — a página fica
 * "um pouco estranha" e ninguém sabe por quê. Este teste é a única coisa que
 * liga os dois lados.
 *
 * Os valores esperados vêm dos tokens; o CSS é lido do disco, do jeito que o
 * navegador vai receber.
 */
const css = readFileSync(path.resolve(process.cwd(), "src/aurora/aurora.css"), "utf8");

function customProperty(name: string): string | undefined {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(css);
  return match?.[1].trim().replace(/\s+/g, " ");
}

const bezier = (curve: readonly [number, number, number, number]) => `cubic-bezier(${curve.join(", ")})`;

describe("zen tokens against the stylesheet", () => {
  it("declares the entry and exit durations of the motion sheet", () => {
    expect(customProperty("duration-zen-enter")).toBe(`${ZenMotionTokens.timings.enterMs}ms`);
    expect(customProperty("duration-zen-exit")).toBe(`${ZenMotionTokens.timings.exitMs}ms`);
  });

  it("declares the same easings", () => {
    expect(customProperty("ease-zen-in")).toBe(bezier(ZenMotionTokens.easings.enter));
    expect(customProperty("ease-zen-out")).toBe(bezier(ZenMotionTokens.easings.exit));
  });

  it("declares the window elevation", () => {
    expect(customProperty("zen-window-lift")).toBe(`${ZenMotionTokens.transform.modalTranslateY}px`);
    expect(customProperty("zen-window-scale")).toBe(`${ZenMotionTokens.transform.modalScale}`);
  });

  it("declares the attenuation of the rest of the page", () => {
    expect(customProperty("zen-background-opacity")).toBe(`${ZenMotionTokens.attenuation.backgroundOpacity}`);
  });

  it("declares the theme swap duration the wash also uses", () => {
    /* A janela troca de tema pelo CSS e o wash re-tinge pelo motor: os dois
     * leem o mesmo número, e é isso que faz a troca parecer uma coisa só. */
    expect(customProperty("duration-theme-swap")).toBe(`${ZenMotionTokens.timings.themeMs}ms`);
  });

  it("hides the stage text in the first 40% and brings it back in the last 40%", () => {
    /* O texto do palco não pode aparecer lavado por baixo do wash. A conta está
     * no CSS como fração da duração; se alguém trocar o fator, o texto volta a
     * brigar com o campo. */
    expect(css).toContain("body[data-zen] #leituras [data-zen-chrome]");
    expect(css).toMatch(/calc\(var\(--duration-zen-enter\) \* 0\.4\)/);
    expect(css).toMatch(/calc\(var\(--duration-zen-exit\) \* 0\.6\)/);
  });

  it("keeps the veil driven by the attribute the trigger publishes", () => {
    /* O CSS só reage a `body[data-zen]`; um seletor de `:hover` sobrando ali
     * faria o efeito piscar em passagem, que é justamente o que o dwell evita. */
    expect(css).toContain("body[data-zen]");
    expect(css).not.toContain(":hover");
  });
});
