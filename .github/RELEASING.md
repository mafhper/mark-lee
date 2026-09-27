# RELEASING

Order of operations and the two failure modes that have actually shipped broken releases.

## Order

The banner is committed **before** the tag is cut. The workflow points the banner at
`${ref}` (the tag), so a tag cut first makes that URL 404.

```
1. add  public/releases/release-feed-X.Y.webp      (real format, real extension)
2. add  .github/release-notes/vX.Y.md             (highlights, no emoji)
3. npm run release -- patch|minor|major           (bumps package.json, tauri.conf.json, Cargo.toml)
4. git commit -m "chore: release vX.Y.Z"
5. git tag vX.Y.Z
6. git push && git push --tags
```

A working tree that has drifted from a released tag is normal — do not re-tag a published
release. Fix the published body with `gh release edit --notes-file`, rebuilt from
`.github/release-notes/vX.Y.md`.

## Banner format must match the extension

The workflow checks the file exists, not that it is served correctly. A WebP named `.png`
is served as `image/png` and renders broken in the release body. Check the magic bytes:

```bash
node -e "const b=require('fs').readFileSync('public/releases/release-feed-1.6.webp');console.log(b.subarray(0,12).toString('hex'))"
# 52494646..57454250 = "RIFF".."WEBP"
```

The workflow now resolves the banner over HTTP and exits non-zero if it does not answer
200, so a missing image fails the job loudly rather than shipping.

## Never verify UTF-8 by reading the console

`gh --jq` emits UTF-8. PowerShell decodes it through the console code page, so `ó` (`C3 B3`)
*renders* as `ó` even when the stored bytes are corrupted. A release body containing a BOM
and mojibake (`Mem├│rias`) was read as "accents are fine" and declared correct three times
before anyone looked at the bytes.

Verify by re-reading through the API and escaping to ASCII — that admits no misinterpretation:

```bash
node -e "const b=JSON.parse(require('child_process').execFileSync('gh',['api','repos/OWNER/REPO/releases/tags/TAG'],{encoding:'utf8'})).body;
console.log(JSON.stringify({bom:b.charCodeAt(0)===0xfeff, mojibake:/[─-▟]/.test(b), sample:[...b.slice(0,60)].map(c=>c.codePointAt(0)<128?c:'\\\\u'+c.codePointAt(0).toString(16).padStart(4,'0')).join('')}))"
```

Write release bodies with `fs.writeFileSync(p, s, "utf8")` (no BOM). Never `Out-File`.

## Gates

- `npm run test:release-workflow` — asserts the workflow keeps the HTTP banner gate and the
  image-led body. Run it after touching `release.yml`.
- `npm run contrast:check` — theme contrast, part of CI.
