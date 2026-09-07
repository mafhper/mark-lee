import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { parse } from "yaml";

const read = (path) => readFileSync(path, "utf8");
const NO_EMOJI = /\p{Extended_Pictographic}/u;

const pkg = JSON.parse(read("package.json"));
const minor = pkg.version.split(".").slice(0, 2).join(".");

test("builds installers for Windows, Linux, and macOS release tags", () => {
  const workflow = read(".github/workflows/release.yml");
  const tauriConfig = JSON.parse(read("src-tauri/tauri.conf.json"));

  assert.ok(workflow.includes("windows-latest"));
  assert.ok(workflow.includes("ubuntu-latest"));
  assert.ok(workflow.includes("macos-latest"));
  assert.ok(workflow.includes("tauri-apps/tauri-action"));
  assert.ok(workflow.includes("--bundles app"));
  assert.ok(workflow.includes("--bundles dmg"));
  assert.ok(workflow.includes("_x64-setup.exe"));
  assert.ok(workflow.includes("_x64_en-US.msi"));
  assert.ok(workflow.includes("_aarch64.dmg"));
  assert.ok(workflow.includes(".app.tar.gz"));
  assert.ok(workflow.includes("_amd64.AppImage"));
  assert.ok(workflow.includes("_amd64.deb"));
  assert.ok(workflow.includes("Mark-Lee-${version}-1.x86_64.rpm"));
  assert.equal(tauriConfig.bundle.targets, "all");
});

test("publishes image-led release notes without emojis", () => {
  const workflow = read(".github/workflows/release.yml");
  const releaseConfigPath = ".github/release.yml";
  const notesPath = `.github/release-notes/v${minor}.md`;
  const imagePath = `public/releases/release-feed-${minor}.png`;

  assert.ok(
    workflow.includes(
      "releaseId: ${{ steps.create-release.outputs.release_id }}",
    ),
  );
  assert.ok(workflow.includes("generateReleaseNotes: false"));
  assert.ok(workflow.includes("id: release-body"));
  assert.ok(workflow.includes("id: create-release"));
  assert.ok(!workflow.includes("releaseBody:"));
  assert.ok(workflow.includes("gh release edit"));
  assert.ok(workflow.includes(".github/release-notes/${minor_tag}.md"));
  assert.ok(workflow.includes("releases/generate-notes"));
  assert.ok(workflow.includes("## Destaques"));
  assert.ok(workflow.includes("## Downloads"));
  assert.ok(workflow.includes('<p align="center">'));
  assert.ok(workflow.includes("public/releases/release-feed-${minor}.png"));
  assert.ok(
    workflow.includes(
      "https://raw.githubusercontent.com/${repo}/${ref}/${img}",
    ),
  );
  assert.ok(!workflow.includes("generateReleaseNotes: true"));
  assert.ok(!NO_EMOJI.test(workflow));

  assert.ok(existsSync(notesPath), `missing ${notesPath}`);
  assert.ok(!NO_EMOJI.test(read(notesPath)));

  assert.ok(existsSync(imagePath), `missing ${imagePath}`);

  assert.ok(existsSync(releaseConfigPath), "missing .github/release.yml");
  const releaseConfig = read(releaseConfigPath);
  const releaseConfigYaml = parse(releaseConfig);
  assert.deepEqual(
    releaseConfigYaml.changelog.categories.map((c) => c.title),
    ["Novidades e melhorias", "Correções", "Outras mudanças"],
  );
  assert.ok(releaseConfig.includes("- dependencies"));
  assert.ok(!NO_EMOJI.test(releaseConfig));
});