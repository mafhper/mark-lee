import { describe, expect, it } from "vitest";
import { RECORD, RECORD_SOURCE_LINES } from "@/aurora/demo";

/**
 * O arquivo e uma fixture, nao um espelho do gerador: esta lista foi escrita a
 * mao a partir do esquema `marklee-entry`, e o teste falha se o gerador mudar a
 * forma do documento (fence, indentacao de lista, linha em branco entre
 * secoes). Comparar o gerador com ele mesmo nao provaria nada.
 */
const EXPECTED_FILE = [
  "---",
  "schema: marklee-entry",
  "schemaVersion: 1",
  "id: nebulosa-de-orion",
  "date: 2026-11-02",
  "title: Nebulosa de Órion",
  "tags:",
  "  - céu-profundo",
  "  - observação",
  "createdAt: 2026-11-02T21:40:00.000Z",
  "updatedAt: 2026-11-03T01:15:00.000Z",
  "---",
  "",
  "# Nebulosa de Órion",
  "",
  "Primeira noite sem nuvens em três semanas. A constelação ficou alta o bastante para fotografar a espada.",
  "",
  "## Observação",
  "",
  "Cheguei ao mirante às 21h40, com o céu ainda claro no oeste. Esperei a Lua descer.",
  "",
  "A transparência melhorou depois das 23h. A Via Láctea cruzava o zênite a olho nu.",
  "",
  "## Equipamento",
  "",
  "- Refrator de 80 mm, distância focal de 600 mm.",
  "- Ocular de 25 mm para localizar o alvo.",
  "- Exposições de 90 s, ISO 1600, foco manual.",
  "",
  "## Pendências",
  "",
  "- Empilhar as 24 exposições e comparar com as da semana passada.",
  "- Anotar a temperatura de cada sessão.",
];

describe("demo record", () => {
  it("writes the entry as a marklee-entry file", () => {
    expect(RECORD_SOURCE_LINES).toEqual(EXPECTED_FILE);
  });

  it("keeps the front matter in the schema shape the journal reads", () => {
    const [opening, ...rest] = RECORD_SOURCE_LINES;
    const closingIndex = rest.indexOf("---");

    expect(opening).toBe("---");
    expect(closingIndex).toBeGreaterThan(0);

    const frontMatter = rest.slice(0, closingIndex);
    const keys = frontMatter.filter((line) => !line.startsWith(" ")).map((line) => line.split(":")[0]);
    expect(keys).toEqual([
      "schema",
      "schemaVersion",
      "id",
      "date",
      "title",
      "tags",
      "createdAt",
      "updatedAt",
    ]);
    expect(frontMatter[0]).toBe(`schema: ${RECORD.schema}`);
    expect(frontMatter.every((line) => /^(\s{2}- |[a-zA-Z]+:)/.test(line))).toBe(true);

    const body = rest.slice(closingIndex + 1);
    expect(body).toContain(`# ${RECORD.title}`);
    for (const section of RECORD.sections) {
      expect(body).toContain(`## ${section.heading}`);
    }
  });
});
