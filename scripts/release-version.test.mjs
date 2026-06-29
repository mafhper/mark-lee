import assert from "node:assert/strict";
import test from "node:test";
import { assertAlignedVersions } from "./release-version.mjs";

test("accepts an aligned desktop version", () => {
  assert.equal(
    assertAlignedVersions({
      "package.json": "1.3.2",
      "tauri.conf.json": "1.3.2",
      "Cargo.toml": "1.3.2",
    }),
    "1.3.2",
  );
});

test("rejects a release when desktop versions diverge", () => {
  assert.throws(
    () =>
      assertAlignedVersions({
        "package.json": "1.3.0",
        "tauri.conf.json": "1.3.2",
        "Cargo.toml": "1.3.0",
      }),
    /package\.json=1\.3\.0, tauri\.conf\.json=1\.3\.2, Cargo\.toml=1\.3\.0/,
  );
});
