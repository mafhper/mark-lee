import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { parse } from "yaml";

const read = (path) => readFileSync(path, "utf8");
const NO_EMOJI = /\p{Extended_Pictographic}/u;

const CONFIG_PATH = ".github/release.config.json";
const config = existsSync(CONFIG_PATH) ? JSON.parse(read(CONFIG_PATH)) : null;
const minor = JSON.parse(read("package.json")).version.split(".").slice(0, 2).join(".");
const workflow = read(".github/workflows/release.yml");

test("release runs through the release-core protocol", () => {
  // The protocol is a reusable workflow. Pinned to an immutable version: @main is
  // never a permanent dependency.
  const uses = workflow.match(/uses:\s*mafhper\/release-core\/\.github\/workflows\/release\.yml@(\S+)/);
  assert.ok(uses, "release.yml does not delegate to mafhper/release-core");
  assert.match(uses[1], /^v\d+\.\d+\.\d+$/, `release-core must be pinned to a semver, got ${uses[1]}`);

  // The bespoke pipeline must not creep back: it is what drifted from the protocol.
  for (const marker of [
    "id: release-body",
    "id: create-release",
    "finalize-release",
    "tauri-apps/tauri-action",
    "gh release create",
  ]) {
    assert.ok(
      !workflow.includes(marker),
      `release.yml re-introduces "${marker}" — the protocol owns this, the caller only describes the project`,
    );
  }

  // CI and deploy stay in the consumer; only the release is delegated.
  assert.ok(existsSync(".github/workflows/ci.yml"), "ci.yml must stay in the consumer");
});

test("the contract describes the project", () => {
  assert.ok(config, `missing ${CONFIG_PATH}`);
  assert.ok(config.release?.title, "release.title is required");
  assert.ok(!NO_EMOJI.test(read(CONFIG_PATH)));

  // desktop + npm at the repo root
  assert.equal(config.desktop?.enabled, true);
  assert.equal(config.desktop?.project_path, ".");
  assert.equal(config.build?.package_manager, "npm");
  assert.ok(existsSync("package-lock.json"), "package_manager is npm but there is no lockfile");

  // The tag gate is the invariant `npm run release` maintains: all three manifests
  // stay in sync. versions.files has no default — what is not declared is not checked.
  const declared = (config.versions?.files ?? []).map((f) => f.path);
  for (const path of ["package.json", "src-tauri/tauri.conf.json", "src-tauri/Cargo.toml"]) {
    assert.ok(declared.includes(path), `versions.files must cover ${path}`);
  }
});

test("the release artwork is versioned and matches the current line", () => {
  const art = config.release.image;
  const dir = art?.path ?? "docs/images/releases";
  const ext = art?.ext ?? ".webp";
  const line = `${dir}/${art?.prefix ?? "release"}-v${minor}${ext}`;

  assert.ok(existsSync(line), `missing artwork for the v${minor} line: ${line}`);

  // Release Core reads the artwork from the checked-out tag, so an ignored file is
  // an image gate failure waiting to happen. This is the check that would have
  // caught /docs/ swallowing docs/images/releases/.
  const tracked = execFileSync("git", ["ls-files", line], { encoding: "utf8" }).trim();
  assert.ok(tracked, `${line} is not tracked by git — the image gate cannot see it`);

  // Regression probe: `git check-ignore` exits 0 when a path IS ignored, 1 when it is
  // not. `--no-index` is required — without it git skips paths already tracked, so a
  // freshly added ignore rule would go unnoticed and a fresh clone would lose the art.
  const probe = spawnSync("git", ["check-ignore", "-q", "--no-index", line]);
  assert.equal(probe.status, 1, `${line} is ignored by .gitignore — the image gate cannot see it`);
});

test("per-version notes follow the declared granularity", () => {
  const granularity = config?.release?.notes?.granularity ?? "tag";
  const expected =
    granularity === "minor" ? `.github/release-notes/v${minor}.md` : null;
  assert.ok(expected, `unexpected notes granularity: ${granularity}`);
  assert.ok(existsSync(expected), `missing ${expected}`);
  assert.ok(!NO_EMOJI.test(read(expected)), `${expected} contains emoji`);
});
