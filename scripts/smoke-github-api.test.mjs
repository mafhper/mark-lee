import assert from "node:assert/strict";
import test from "node:test";
import { createGitHubApiFixture } from "./smoke-github-api.mjs";

test("provides deterministic commit data for the site smoke", () => {
  const fixture = createGitHubApiFixture(
    "https://api.github.com/repos/mafhper/mark-lee/commits?per_page=3",
  );
  assert.equal(fixture?.status, 200);

  const commits = JSON.parse(fixture.body);
  assert.equal(commits.length, 3);
  assert.match(commits[0].html_url, /^https:\/\/github\.com\/mafhper\/mark-lee\/commit\//);
});

test("provides deterministic release assets for the site smoke", () => {
  const fixture = createGitHubApiFixture(
    "https://api.github.com/repos/mafhper/mark-lee/releases?per_page=10",
  );
  assert.equal(fixture?.status, 200);

  const releases = JSON.parse(fixture.body);
  assert.equal(releases.length, 1);
  assert.equal(releases[0].draft, false);
  assert.equal(releases[0].prerelease, false);
  assert.ok(releases[0].assets.some((asset) => asset.name.endsWith(".msi")));
});

test("does not mock unrelated requests", () => {
  assert.equal(createGitHubApiFixture("https://example.com/data"), null);
  assert.equal(
    createGitHubApiFixture("https://api.github.com/repos/mafhper/mark-lee/issues"),
    null,
  );
});
