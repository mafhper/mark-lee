/** Documentos de demonstracao: registros ficticios no esquema marklee-entry. */

export type DemoTreeNode = { depth: number; name: string; kind: "dir" | "file"; active?: boolean };

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

export const DEMO_TREE: DemoTreeNode[] = [
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

/**
 * O registro de demonstracao do palco.
 *
 * Ele mora aqui como dado, nao como texto solto: o arquivo `.md` e o painel
 * de codigo sao gerados a partir dele (`recordToMarkdown`), e a leitura de
 * Memorias usa os mesmos campos. Assim as tres leituras nao podem discordar —
 * se alguem trocar um paragrafo, as tres mudam juntas.
 */
export interface DemoRecordSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface DemoRecord {
  fileName: string;
  schema: string;
  schemaVersion: number;
  id: string;
  date: string;
  title: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lead: string;
  sections: DemoRecordSection[];
}

export const RECORD: DemoRecord = {
  fileName: "nebulosa-de-orion.md",
  schema: "marklee-entry",
  schemaVersion: 1,
  id: "nebulosa-de-orion",
  date: "2026-11-02",
  title: "Nebulosa de Órion",
  tags: ["céu-profundo", "observação"],
  createdAt: "2026-11-02T21:40:00.000Z",
  updatedAt: "2026-11-03T01:15:00.000Z",
  lead: "Primeira noite sem nuvens em três semanas. A constelação ficou alta o bastante para fotografar a espada.",
  sections: [
    {
      heading: "Observação",
      paragraphs: [
        "Cheguei ao mirante às 21h40, com o céu ainda claro no oeste. Esperei a Lua descer.",
        "A transparência melhorou depois das 23h. A Via Láctea cruzava o zênite a olho nu.",
      ],
    },
    {
      heading: "Equipamento",
      paragraphs: [],
      bullets: [
        "Refrator de 80 mm, distância focal de 600 mm.",
        "Ocular de 25 mm para localizar o alvo.",
        "Exposições de 90 s, ISO 1600, foco manual.",
      ],
    },
    {
      heading: "Pendências",
      paragraphs: [],
      bullets: [
        "Empilhar as 24 exposições e comparar com as da semana passada.",
        "Anotar a temperatura de cada sessão.",
      ],
    },
  ],
};

/** O mesmo registro, no formato que o arquivo tem no disco. */
export function recordToMarkdown(record: DemoRecord): string[] {
  const lines = [
    "---",
    `schema: ${record.schema}`,
    `schemaVersion: ${record.schemaVersion}`,
    `id: ${record.id}`,
    `date: ${record.date}`,
    `title: ${record.title}`,
    "tags:",
    ...record.tags.map((tag) => `  - ${tag}`),
    `createdAt: ${record.createdAt}`,
    `updatedAt: ${record.updatedAt}`,
    "---",
    "",
    `# ${record.title}`,
    "",
    record.lead,
  ];

  for (const section of record.sections) {
    lines.push("", `## ${section.heading}`);
    for (const paragraph of section.paragraphs) {
      lines.push("", paragraph);
    }
    if (section.bullets?.length) {
      lines.push("", ...section.bullets.map((bullet) => `- ${bullet}`));
    }
  }

  return lines;
}

export const RECORD_SOURCE_LINES = recordToMarkdown(RECORD);

/** Arvore do workspace na visao Editor: a pasta do registro, aberta. */
export const RECORD_TREE: DemoTreeNode[] = [
  { depth: 0, name: "caderno/", kind: "dir" },
  { depth: 1, name: "registros/", kind: "dir" },
  { depth: 2, name: "2026/", kind: "dir" },
  { depth: 3, name: "nebulosa-de-orion.md", kind: "file", active: true },
  { depth: 3, name: "vento-sul.md", kind: "file" },
  { depth: 3, name: "primeira-geada.md", kind: "file" },
  { depth: 1, name: "notas/", kind: "dir" },
  { depth: 2, name: "revisao.md", kind: "file" },
  { depth: 1, name: "imagens/", kind: "dir" },
  { depth: 1, name: "leia-me.md", kind: "file" },
];

/** Registros vizinhos, como Memorias os lista por data. */
export const RECENT_RECORDS: Array<{ date: string; title: string; summary: string; active?: boolean }> = [
  { date: "2026-11-02", title: "Nebulosa de Órion", summary: "Primeira noite sem nuvens em três semanas.", active: true },
  { date: "2026-10-28", title: "Vento sul", summary: "Rajadas fortes durante a madrugada." },
  { date: "2026-10-19", title: "Primeira geada", summary: "A horta amanheceu coberta de gelo fino." },
  { date: "2026-10-12", title: "Maré baixa", summary: "As pedras do costão ficaram expostas por duas horas." },
];

/**
 * O caderno de demonstracao.
 *
 * Memorias nao lista pastas: ela lista **cadernos**, e o caderno aberto e que
 * tem registros. O app mostra esse caderno como um cartao com capa, nome e
 * descricao; aqui a capa e um gradiente do tema, porque usar uma foto de
 * terceiro no lugar da capa do caderno seria inventar imagem que o produto nao
 * tem.
 */
export const DEMO_JOURNAL = {
  name: "Memórias de leitura",
  description: "Caderno de demonstração: céu, leitura e jardim.",
  entries: 4,
};

/** Contagem de palavras do registro, como o aplicativo mostra na leitura. */
export function recordWordCount(record: DemoRecord): number {
  const parts = [
    record.lead,
    ...record.sections.flatMap((section) => [section.heading, ...section.paragraphs, ...(section.bullets ?? [])]),
  ];
  return parts.join(" ").split(/\s+/).filter(Boolean).length;
}
