export type FrontmatterValue = string | number | boolean | string[];

export type FrontmatterData = Record<string, FrontmatterValue>;

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

function stripQuotes(value: string) {
  return value.trim().replace(/^["']|["']$/g, "");
}

function parseValue(value: string): FrontmatterValue {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map(stripQuotes)
      .filter(Boolean);
  }
  return stripQuotes(trimmed);
}

export function parseMarkdownFrontmatter(content: string): {
  meta: FrontmatterData;
  body: string;
} {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match) return { meta: {}, body: content };

  const meta: FrontmatterData = {};
  const lines = match[1].split(/\r?\n/);
  let currentArrayKey: string | null = null;

  for (const line of lines) {
    const arrayMatch = line.match(/^\s+-\s+(.+)$/);
    if (arrayMatch && currentArrayKey) {
      const current = meta[currentArrayKey];
      meta[currentArrayKey] = [
        ...(Array.isArray(current) ? current : []),
        stripQuotes(arrayMatch[1]),
      ];
      continue;
    }

    currentArrayKey = null;
    const keyValueMatch = line.match(/^([\w-]+):\s*(.*)$/);
    if (!keyValueMatch) continue;

    const [, key, rawValue] = keyValueMatch;
    if (!rawValue.trim()) {
      meta[key] = [];
      currentArrayKey = key;
      continue;
    }
    meta[key] = parseValue(rawValue);
  }

  return {
    meta,
    body: content.slice(match[0].length),
  };
}

export function frontmatterValueToText(value: FrontmatterValue) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}
