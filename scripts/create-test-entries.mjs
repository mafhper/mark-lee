import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const ROOT = "D:\\mafhp\\Documents\\GitHub\\mark-lee\\test-journal";
const ENTRIES = join(ROOT, ".marklee", "entries");
const ASSETS = join(ROOT, ".marklee", "assets");

const now = new Date();
const todayStr = now.toISOString().slice(0, 10);
const todayFull = now.toISOString();

// Same month/day, last year
const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
const lastYearStr = lastYear.toISOString().slice(0, 10);

// A few months ago (not today)
const monthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 15);
const monthsAgoStr = monthsAgo.toISOString().slice(0, 10);

function makeEntry(id, date, overrides = {}) {
  const title = overrides.title || `Test Entry ${id}`;
  const tags = overrides.tags || ["test"];
  const favorite = overrides.favorite ?? false;
  const mood = overrides.mood || undefined;
  const location = overrides.location || undefined;

  const frontmatter = {
    schema: "marklee-entry",
    schemaVersion: 1,
    id,
    date,
    title,
    tags,
    createdAt: date + "T10:00:00.000Z",
    updatedAt: date + "T10:00:00.000Z",
  };
  if (favorite) frontmatter.favorite = true;
  if (mood) frontmatter.mood = mood;
  if (location) frontmatter.location = location;

  // Serialize YAML-like manually to avoid yaml dep
  const yamlLines = ["---"];
  for (const [k, v] of Object.entries(frontmatter)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      yamlLines.push(`${k}:`);
      for (const item of v) yamlLines.push(`  - ${item}`);
    } else if (typeof v === "object" && v !== null) {
      yamlLines.push(`${k}:`);
      for (const [sk, sv] of Object.entries(v)) {
        if (sv !== undefined) yamlLines.push(`  ${sk}: ${sv}`);
      }
    } else if (typeof v === "boolean") {
      yamlLines.push(`${k}: ${v}`);
    } else {
      yamlLines.push(`${k}: ${v}`);
    }
  }
  yamlLines.push("---");
  yamlLines.push("");
  yamlLines.push(`Body of ${title}.`);
  yamlLines.push("");
  yamlLines.push("Some **markdown** content here.");
  yamlLines.push("");
  if (favorite) yamlLines.push("This is a favorite entry!");
  yamlLines.push("");
  yamlLines.push("---");
  if (location) yamlLines.push(`Written in ${location.label}`);

  return yamlLines.join("\n");
}

const entries = [
  // 1. Entry from today (for "Neste dia")
  makeEntry("e1", todayStr, { title: "Today's Entry", mood: "great" }),
  // 2. Entry from today, favorite (for both filters)
  makeEntry("e2", todayStr, { title: "Today's Favorite", favorite: true, mood: "excited" }),
  // 3. Entry from same month/day last year (for "Neste dia")
  makeEntry("e3", lastYearStr, { title: "Last Year Same Day", mood: "thankful" }),
  // 4. Entry from months ago, favorite (for "Favoritos")
  makeEntry("e4", monthsAgoStr, { title: "Old Favorite", favorite: true, tags: ["test", "important"] }),
  // 5. Entry from months ago, with location
  makeEntry("e5", monthsAgoStr, { title: "Travel Entry", tags: ["travel"], location: { label: "Paris, France", city: "Paris", country: "France" } }),
  // 6. Normal entry
  makeEntry("e6", monthsAgoStr, { title: "Regular Post", tags: ["test", "notes"] }),
];

const manifest = {
  schema: "marklee-journal",
  schemaVersion: 1,
  name: "Test Journal",
  description: "Journal with test entries for validation",
  language: "pt-BR",
  createdAt: todayFull,
  updatedAt: todayFull,
};

async function main() {
  await mkdir(ENTRIES, { recursive: true });
  await mkdir(ASSETS, { recursive: true });

  await writeFile(join(ROOT, ".marklee", "journal.json"), JSON.stringify(manifest, null, 2), "utf-8");

  for (let i = 0; i < entries.length; i++) {
    const filename = `entry-${String(i + 1).padStart(3, "0")}.md`;
    await writeFile(join(ENTRIES, filename), entries[i], "utf-8");
    console.log(`Created ${filename}`);
  }

  console.log(`\nTest journal created at: ${ROOT}`);
  console.log("To use: open Mark-Lee, add existing journal from this folder.");
  console.log("\nEntries:");
  console.log("  e1: Today's Entry        — shows in 'Neste dia'");
  console.log("  e2: Today's Favorite     — shows in 'Neste dia' AND 'Favoritos'");
  console.log("  e3: Last Year Same Day   — shows in 'Neste dia'");
  console.log("  e4: Old Favorite         — shows in 'Favoritos'");
  console.log("  e5: Travel Entry         — shows in 'Posts/Lista' only");
  console.log("  e6: Regular Post         — shows in 'Posts/Lista' only");
}

main().catch(console.error);
