import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const fixturesDir = path.join(root, "apps", "site", "src", "content", "fixtures");
const mockFile = path.join(fixturesDir, "illustrations.mock.json");
const manifestFile = path.join(fixturesDir, "illustrations.manifest.json");

async function exists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function main() {
  await mkdir(fixturesDir, { recursive: true });

  if (!(await exists(mockFile))) {
    throw new Error("Missing illustrations.mock.json. Run site-generate-illustrations first.");
  }

  const mock = await readJson(mockFile);
  const manifest = [...mock];
  const invalid = manifest.filter((entry) => entry.source !== "mock");
  if (invalid.length > 0) {
    throw new Error(`Mock-only policy violated. Found ${invalid.length} non-mock entries in mock fixture.`);
  }

  await writeFile(manifestFile, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Illustration manifest generated (${manifest.length} items, 100% mock policy).`);
}

main().catch((error) => {
  console.error("Failed to generate illustration manifest:", error);
  process.exit(1);
});
