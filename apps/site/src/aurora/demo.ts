/** Documento de demonstracao: um registro ficticio no esquema marklee-entry. */

export const DEMO_FILE_NAME = "registro-2026-10-14.md";

export const DEMO_FILE_LINES = [
  "---",
  "schema: marklee-entry",
  "schemaVersion: 1",
  "id: registro-2026-10-14",
  "date: 2026-10-14",
  "title: Registro de campo",
  "tags:",
  "  - campo",
  "  - observacoes",
  "createdAt: 2026-10-14T09:00:00.000Z",
  "updatedAt: 2026-10-14T09:00:00.000Z",
  "---",
  "",
  "# Registro de campo",
  "",
  "Anotações sobre a visita ao viveiro.",
  "",
  "## Observações",
  "",
  "- Mudas transplantadas na semana anterior.",
  "- Irrigação pela manhã; solo úmido às 15h.",
  "",
  "## Pendências",
  "",
  "Voltar em duas semanas e comparar com as fotografias de hoje.",
];

export const DEMO_TREE: Array<{ depth: number; name: string; kind: "dir" | "file"; active?: boolean }> = [
  { depth: 0, name: "caderno/", kind: "dir" },
  { depth: 1, name: "notas/", kind: "dir" },
  { depth: 2, name: "leia-me.md", kind: "file" },
  { depth: 2, name: "rascunho.md", kind: "file" },
  { depth: 1, name: "registros/", kind: "dir" },
  { depth: 2, name: "2026/", kind: "dir" },
  { depth: 3, name: "registro-2026-09-30.md", kind: "file" },
  { depth: 3, name: "registro-2026-10-14.md", kind: "file", active: true },
  { depth: 3, name: "registro-2026-10-21.md", kind: "file" },
  { depth: 1, name: "imagens/", kind: "dir" },
];
