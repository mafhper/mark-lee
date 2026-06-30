import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as i18n from "@/i18n";

const locales = ["pt-BR", "en-US", "es-ES"] as const;

describe("promo-site contract", () => {
  it("provides the same home narrative in every locale", () => {
    for (const locale of locales) {
      const copy = i18n.getCopy(locale) as unknown as {
        nav: Record<string, string>;
        pages: { home: Record<string, unknown> };
      };

      expect(copy.nav).toMatchObject({
        editor: expect.any(String),
        memories: expect.any(String),
        localFirst: expect.any(String),
      });
      expect(copy.pages.home).toMatchObject({
        hero: expect.any(Object),
        continuity: expect.any(Object),
        editor: expect.any(Object),
        memories: expect.any(Object),
        localProof: expect.any(Object),
        closingCta: expect.any(Object),
      });
    }
  });

  it("builds localized home section paths and metadata", () => {
    const homeSectionPath = (
      i18n as unknown as {
        homeSectionPath: (locale: string, section: string) => string;
      }
    ).homeSectionPath;
    const getPageMeta = (
      i18n as unknown as {
        getPageMeta: (locale: string, page: string) => { title: string; description: string };
      }
    ).getPageMeta;

    expect(typeof homeSectionPath).toBe("function");
    expect(homeSectionPath("pt-BR", "memorias")).toBe("/pt-BR#memorias");
    expect(getPageMeta("en-US", "home")).toMatchObject({
      title: expect.stringContaining("Mark-Lee"),
      description: expect.stringContaining("Memories"),
    });
  });

  it("ships bounded product captures and a social image", () => {
    const assets = [
      ["editor.png", 450_000],
      ["editor-secondary.png", 450_000],
      ["continuity-reading.png", 450_000],
      ["memories-reading.png", 450_000],
      ["memories-reading-dark.png", 450_000],
      ["memories-explore.png", 450_000],
      ["memories-places.png", 450_000],
      ["og-mark-lee.png", 650_000],
    ] as const;

    for (const [fileName, maxBytes] of assets) {
      const filePath = path.resolve(process.cwd(), "public", "assets", "product", fileName);
      expect(existsSync(filePath), `${fileName} should exist`).toBe(true);
      if (existsSync(filePath)) {
        expect(statSync(filePath).size, `${fileName} should fit the asset budget`).toBeLessThanOrEqual(
          maxBytes
        );
      }
    }
  });
});
