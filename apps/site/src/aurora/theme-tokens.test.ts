import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ORDERED_THEMES, RECORD_THEMES, THEME_ORDER } from "@/aurora/theme-tokens";

/**
 * O site mostra a paleta do aplicativo, nao uma paleta parecida.
 *
 * A fonte independente e o proprio `src/constants.ts`: este teste le o arquivo
 * do editor e compara os hexadecimais. Se alguem ajustar uma cor no aplicativo
 * e esquecer o site, o teste falha — e a cor errada nunca chega ao ar em
 * silencio.
 */
const appConstantsPath = path.resolve(process.cwd(), "..", "..", "src", "constants.ts");

const readAppThemes = (): Record<string, Record<string, string>> => {
  const source = readFileSync(appConstantsPath, "utf8");
  const themes: Record<string, Record<string, string>> = {};

  for (const [, id, body] of source.matchAll(/\[Theme\.(\w+)\]:\s*\{([\s\S]*?)\n {2}\},/g)) {
    const tokens: Record<string, string> = {};
    for (const [, key, value] of body.matchAll(/(\w+Hex):\s*"([^"]+)"/g)) {
      tokens[key] = value;
    }
    themes[id.toLowerCase()] = tokens;
  }

  return themes;
};

describe("theme tokens", () => {
  it("mirrors every color declared in the application", () => {
    const appThemes = readAppThemes();
    expect(Object.keys(appThemes)).toHaveLength(12);

    for (const theme of RECORD_THEMES) {
      const appTheme = appThemes[theme.id];
      expect(appTheme, `${theme.id} should exist in src/constants.ts`).toBeDefined();
      expect(
        {
          bgHex: theme.bgHex,
          fgHex: theme.fgHex,
          uiHex: theme.uiHex,
          uiBorderHex: theme.uiBorderHex,
          editorBgHex: theme.editorBgHex,
          editorFgHex: theme.editorFgHex,
          accentHex: theme.accentHex,
        },
        `${theme.id} should match the application tokens`,
      ).toEqual(appTheme);
    }

    expect(new Set(RECORD_THEMES.map((theme) => theme.id)).size).toBe(12);
  });

  it("lists all twelve in the mockup order, four per row", () => {
    // Tres linhas de quatro na grade: se um tema ficar de fora, a grade mente.
    expect(THEME_ORDER).toHaveLength(12);
    expect(new Set(THEME_ORDER).size).toBe(12);
    expect(ORDERED_THEMES.map((theme) => theme.id)).toEqual(THEME_ORDER);
    expect(THEME_ORDER.slice(0, 4)).toEqual(["midnight", "sepia", "forest", "nord"]);
    expect([...THEME_ORDER].sort()).toEqual(RECORD_THEMES.map((theme) => theme.id).sort());
  });
});
