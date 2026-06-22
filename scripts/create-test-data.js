import { writeFile, mkdir, cp, readdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = "D:\\mafhp\\Documents\\Mark-Lee-Diary";
const SCREENSHOTS_DIR = "D:\\mafhp\\Pictures\\Screenshots";

const manifest = {
  schema: "marklee-journal",
  schemaVersion: 1,
  id: "test-journal-001",
  name: "Test Journal",
  description: "Sample journal for testing all features",
  createdAt: new Date().toISOString(),
  entryDirectory: "entries",
  assetDirectory: "assets",
  defaultLanguage: "pt-BR",
  trackerDefinitions: [
    { id: "water", name: "Water intake", type: "number", unit: "cups", color: "#3b82f6" },
    { id: "sleep", name: "Sleep hours", type: "number", unit: "hours", color: "#8b5cf6" },
    { id: "mood-score", name: "Mood score", type: "number", unit: "/10", color: "#f59e0b" },
    { id: "exercise", name: "Exercise", type: "boolean", unit: "", color: "#10b981" },
    { id: "notes", name: "Daily notes", type: "string", unit: "", color: "#ec4899" },
  ],
};

function e(id, dateStr, title, body, extra = {}) {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  const filename = `${y}-${m}-${d}--${hh}${mm}${ss}--${id}.md`;
  const path = `entries/${y}/${m}/${filename}`;

  const frontmatter = {
    schema: "marklee-entry",
    schemaVersion: 1,
    id,
    date: date.toISOString(),
    title,
    tags: extra.tags ?? [],
    mood: extra.mood ?? "",
    favorite: extra.favorite ?? false,
    trackers: extra.trackers ?? {},
    cover: extra.cover ?? "",
    createdAt: date.toISOString(),
    updatedAt: date.toISOString(),
  };

  const yaml = Object.entries(frontmatter)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `  ${v.map((vi) => `"${vi}"`).join("\n  ")}`;
      if (typeof v === "object" && v !== null) {
        const entries = Object.entries(v).filter(([, vv]) => vv !== undefined && vv !== null && vv !== "");
        if (entries.length === 0) return `${k}: {}`;
        return `${k}:\n${entries.map(([kk, vv]) => `  ${kk}: ${typeof vv === "string" ? `"${vv}"` : vv}`).join("\n")}`;
      }
      if (typeof v === "boolean") return `${k}: ${v}`;
      if (typeof v === "number") return `${k}: ${v}`;
      return `${k}: "${v}"`;
    })
    .join("\n");

  const content = `---\n${yaml}\n---\n\n${body}\n`;
  return { path, content, dir: `entries/${y}/${m}` };
}

const entries = [
  e("entry-welcome", "2026-06-20T08:00:00", "Welcome to Mark-Lee Journal",
    "This is a sample entry demonstrating various features.\n\n## Features available\n\n- **Mood tracking**: Click the smiley face to set your mood\n- **Tags**: Add tags to organize entries\n- **Favorites**: Heart icon marks favorites\n- **Trackers**: Log numeric, text or boolean data\n- **Photos**: Insert images into your entries\n- **Cover images**: Highlight an entry with a cover\n- **Tables**: Insert structured data\n- **Export**: Save as Markdown, HTML or ZIP\n\n## Next steps\n\nTry creating your own entry and explore each feature!",
    { tags: ["welcome", "getting-started"], mood: "excited", favorite: true, trackers: { "mood-score": 9 } }
  ),

  e("entry-mood", "2026-06-19T18:30:00", "A great day outside",
    "Spent the afternoon at the park. The weather was perfect.\n\n## Highlights\n\n- Walked around the lake\n- Read a book under a tree\n- Had ice cream with friends\n\nFeeling really good about this week.",
    { tags: ["personal", "nature"], mood: "great", favorite: true, trackers: { "mood-score": 8, "exercise": true } }
  ),

  e("entry-trackers", "2026-06-18T22:00:00", "Tracking my habits",
    "Logging today's metrics:\n\n- Drank 6 cups of water throughout the day\n- Slept 7.5 hours last night\n- Did 30 minutes of exercise\n\nConsistency is key!",
    { tags: ["health", "habits"], mood: "good", trackers: { water: 6, sleep: 7.5, "mood-score": 7, exercise: true, notes: "Consistent day" } }
  ),

  e("entry-travel", "2026-06-17T14:00:00", "Trip planning",
    "Planning my next trip!\n\n## Destinations\n\n1. **Tokyo** - 5 days\n2. **Kyoto** - 3 days\n3. **Osaka** - 2 days\n\n## Packing list\n\n- [ ] Passport\n- [ ] Camera\n- [ ] Adapter\n- [ ] Travel insurance\n\nCan't wait!",
    { tags: ["travel", "plans"], mood: "excited", favorite: true }
  ),

  e("entry-gratitude", "2026-06-16T20:00:00", "Gratitude journal",
    "Three things I'm grateful for today:\n\n1. **Health** - Feeling strong and energetic\n2. **Family** - Had a lovely dinner together\n3. **Work** - Got positive feedback on my project\n\n---\n\n> \"Gratitude turns what we have into enough.\"",
    { tags: ["gratitude", "reflection"], mood: "loved", trackers: { "mood-score": 9, notes: "Grateful day" } }
  ),

  e("entry-review", "2026-06-15T09:00:00", "Week review",
    "## Wins\n\n- Finished the quarterly report\n- Started journaling regularly\n- Exercised 4 times\n\n## Challenges\n\n- Need to improve sleep schedule\n- Desk posture could be better\n\n## Goals for next week\n\n- [ ] Read one book\n- [ ] Meditate daily\n- [ ] Organize workspace",
    { tags: ["review", "goals"], mood: "neutral", trackers: { "mood-score": 6, sleep: 6, exercise: true } }
  ),

  e("entry-photos", "2026-06-14T12:00:00", "Weekend captures",
    "Some screenshots from this weekend's projects.\n\nA coding session:\n\nAnd another view:\n\nGreat progress on the Mark-Lee journal features!",
    { tags: ["dev", "screenshots"], mood: "good", trackers: { "mood-score": 7 } }
  ),

  e("entry-sick", "2026-06-13T10:00:00", "Feeling under the weather",
    "Woke up with a headache. Staying in bed today.\n\n## Symptoms\n\n- Headache\n- Fatigue\n- Slight fever\n\nDrank tea and rested. Hope tomorrow is better.",
    { tags: ["health"], mood: "sick", favorite: false, trackers: { water: 4, "mood-score": 3, exercise: false, notes: "Sick day" } }
  ),

  e("entry-creative", "2026-06-12T16:00:00", "Creative burst",
    "Spent the afternoon writing and sketching.\n\n## Ideas\n\n- Started a short story\n- Designed a logo concept\n- Brainstormed app features\n\n| Project | Status | Priority |\n|---------|--------|----------|\n| Story   | Draft  | Medium   |\n| Logo    | Concept| Low      |\n| App     | Design | High     |\n\nSometimes the best ideas come when you least expect them.",
    { tags: ["creative", "writing"], mood: "creative", trackers: { "mood-score": 8, notes: "Very productive" } }
  ),

  e("entry-night", "2026-06-11T23:00:00", "Late night thoughts",
    "Can't sleep, so writing helps.\n\nThinking about the future and all the possibilities. Some random thoughts:\n\n> The best time to plant a tree was 20 years ago. The second best time is now.\n\nTomorrow will be a better day.",
    { tags: ["personal", "reflection"], mood: "anxious", trackers: { sleep: 4, "mood-score": 5 } }
  ),
];

async function main() {
  // Create directories
  const dirs = new Set(entries.map((e) => e.dir));
  for (const dir of dirs) {
    await mkdir(join(ROOT, dir), { recursive: true });
  }

  // Write manifest
  await writeFile(join(ROOT, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");

  // Write entries
  for (const entry of entries) {
    await writeFile(join(ROOT, entry.path), entry.content, "utf-8");
  }

  // Copy some screenshots into the first few entries
  try {
    const screenshots = await readdir(SCREENSHOTS_DIR);
    const pngFiles = screenshots.filter((f) => f.endsWith(".png")).slice(0, 6);

    // Assign screenshots to image entries
    const photoEntry = entries.find((e) => e.path.includes("entry-photos"));
    if (photoEntry && pngFiles.length >= 2) {
      const entryDir = join(ROOT, photoEntry.dir);
      for (let i = 0; i < 2 && i < pngFiles.length; i++) {
        await cp(join(SCREENSHOTS_DIR, pngFiles[i]), join(entryDir, `screenshot-${i + 1}.png`));
      }
      // Update the entry body to reference the images
      photoEntry.content = photoEntry.content.replace(
        "A coding session:\n\nAnd another view:",
        `A coding session:\n\n![Screenshot 1](screenshot-1.png)\n\nAnd another view:\n\n![Screenshot 2](screenshot-2.png)`
      );
      await writeFile(join(ROOT, photoEntry.path), photoEntry.content, "utf-8");
    }

    // Set a cover for the mood entry
    const moodEntry = entries.find((e) => e.path.includes("entry-mood"));
    if (moodEntry && pngFiles.length >= 3) {
      const entryDir = join(ROOT, moodEntry.dir);
      await cp(join(SCREENSHOTS_DIR, pngFiles[2]), join(entryDir, "cover.png"));
      // Update frontmatter to include cover
      moodEntry.content = moodEntry.content.replace("cover: \"\"", "cover: \"cover.png\"");
      await writeFile(join(ROOT, moodEntry.path), moodEntry.content, "utf-8");
    }
  } catch {
    console.log("Warning: could not copy screenshots (directory may not exist)");
  }

  console.log(`✓ Created ${entries.length} entries in ${ROOT}`);
}

main().catch(console.error);
