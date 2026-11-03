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

/**
 * Os registros que o caderno demo tem no disco, na ordem em que a lista os
 * mostra: mais novo primeiro, agrupado por mes.
 *
 * Isto deixou de ser invencao: cada linha aqui sai do front-matter do arquivo
 * real (`.dev/tmp/memorias-real/dados.mjs` le e imprime). A contagem de
 * palavras usa a mesma regra do app — `body.trim().split(/\s+/).length` — e a
 * miniatura existe em toda entrada que tem `cover` ou `images`.
 */
export interface DemoEntryRow {
  date: string;
  title: string;
  summary: string;
  mood?: string;
  words: number;
  hasImage: boolean;
  active?: boolean;
}

export const NOTEBOOK_RECORDS: DemoEntryRow[] = [
  {
    date: "2026-11-02",
    title: "Nebulosa de Órion",
    summary: "Primeira noite sem nuvens em três semanas. A constelação ficou alta o bastante para fotografar a espada.",
    mood: "excited",
    words: 101,
    hasImage: true,
    active: true,
  },
  {
    date: "2026-10-28",
    title: "Balanço do mês",
    summary: "O que rendeu, o que ficou pela metade, e o que sai da lista em novembro.",
    mood: "neutral",
    words: 222,
    hasImage: false,
  },
  {
    date: "2026-10-18",
    title: "Relendo Florbela em outubro",
    summary: "Amar! é um poema de repetição, e a repetição é o argumento.",
    mood: "loved",
    words: 198,
    hasImage: true,
  },
  {
    date: "2026-03-21",
    title: "Terminei Dom Casmurro",
    summary: "Segunda leitura, agora sabendo o final. O livro muda de assunto.",
    mood: "thankful",
    words: 210,
    hasImage: true,
  },
  {
    date: "2026-02-03",
    title: "O manjericão dobrou de tamanho",
    summary: "Duas semanas depois da poda no topo, dois ramos novos por corte.",
    mood: "creative",
    words: 196,
    hasImage: true,
  },
  {
    date: "2026-01-12",
    title: "Noite limpa no mirante",
    summary: "Céu Bortle 5, sem Lua até 23h. O Trapézio apareceu no binóculo.",
    mood: "excited",
    words: 188,
    hasImage: true,
  },
];

/** O emoji de cada humor, como os `MOOD_EMOJI` do app. */
export const MOOD_EMOJI: Record<string, string> = {
  excited: "🤩",
  neutral: "😐",
  loved: "🥰",
  thankful: "🙏",
  creative: "✨",
};

/** Estatistica de tag do caderno inteiro (`collectTagStats`). */
export const NOTEBOOK_TAGS: Array<{ tag: string; count: number }> = [
  { tag: "céu-profundo", count: 2 },
  { tag: "observação", count: 2 },
  { tag: "rotina", count: 2 },
  { tag: "astronomia", count: 1 },
  { tag: "balanço", count: 1 },
  { tag: "domínio-público", count: 1 },
  { tag: "florbela-espanca", count: 1 },
  { tag: "jardinagem", count: 1 },
  { tag: "leitura", count: 1 },
  { tag: "machado-de-assis", count: 1 },
  { tag: "poesia", count: 1 },
  { tag: "romance", count: 1 },
  { tag: "varanda", count: 1 },
];

/** Contagem por status de tarefa — nenhuma memoria do caderno e tarefa. */
export const NOTEBOOK_TASKS: Array<{ status: string; count: number }> = [
  { status: "pending", count: 0 },
  { status: "in_progress", count: 0 },
  { status: "completed", count: 0 },
  { status: "cancelled", count: 0 },
];

/** Os pins do caderno, no periodo que abre selecionado ("Mes"). Os rotulos e os
 *  valores saem do manifesto e das entradas reais; `pct` alimenta a barra do pin
 *  com `format: "bar"` (Horas de sono, alvo 8h). */
export const NOTEBOOK_PINS: Array<{ id: string; label: string; value: string; color: string; pct?: number }> = [
  { id: "words", label: "Palavras", value: "101", color: "#8fb5ff" },
  { id: "entries", label: "Entradas", value: "1", color: "#8fb5ff" },
  { id: "sleep", label: "Horas de sono", value: "méd 7.8 h", color: "#6366f1", pct: 7.8 / 8 },
];

/**
 * O caderno de demonstracao.
 *
 * Memorias nao lista pastas: ela lista **cadernos**, e o caderno aberto e que
 * tem registros. O app mostra esse caderno como um cartao com capa, nome e
 * descricao — capa, aqui, e o acento do tema em gradiente, e nao a foto de
 * outra pessoa fazendo papel de capa de um caderno que nao existe.
 */
export const DEMO_JOURNAL = {
  name: "Memórias de leitura",
  description: "Caderno de demonstração: céu, horta e livros, com imagens e trackers.",
  /** `journal.color` do manifesto: e ele que desenha o contorno do cartao ativo,
   *  nao o acento do tema. */
  color: "#7c3aed",
};

/** O corpo do registro como o app o entrega ao editor e a leitura: sem o
 *  front-matter e sem repetir o `# titulo` (o titulo vem do front-matter, e as
 *  cinco entradas reais do caderno comecam em `##`). E daqui que saem as linhas
 *  do painel de codigo e a contagem de palavras. */
export function recordToBodyLines(record: DemoRecord): string[] {
  const lines = [record.lead];
  for (const section of record.sections) {
    lines.push("", `## ${section.heading}`);
    for (const paragraph of section.paragraphs) lines.push("", paragraph);
    if (section.bullets?.length) lines.push("", ...section.bullets.map((bullet) => `- ${bullet}`));
  }
  return lines;
}

/** Contagem de palavras do registro, como o aplicativo mostra na leitura. */
export function recordWordCount(record: DemoRecord): number {
  return recordToBodyLines(record).join(" ").split(/\s+/).filter(Boolean).length;
}
