#!/usr/bin/env bash
# Resolve the release banner image to a URL that actually answers 200.
#
# Usage: release-banner.sh <repo> <ref> <minor>
#   Prints the resolved image URL on stdout.
#   Exits non-zero when no candidate resolves — the caller fails the release job.
#
# Why a script and not inline YAML: this logic was copy-pasted into the three
# release-body steps (release, release-macos-dmg, finalize-release) and drifted.
# The fix for the 404 banner landed in one copy while the others kept the silent
# fallback. One implementation, three call sites, and a test that counts them.
#
# The real image format must match the extension: a WebP named .png is served as
# image/png and renders broken in the release body.

set -euo pipefail

repo="${1:-}"
ref="${2:-}"
minor="${3:-}"

if [ -z "$repo" ] || [ -z "$ref" ] || [ -z "$minor" ]; then
  echo "usage: release-banner.sh <repo> <ref> <minor>" >&2
  exit 2
fi

banner_dir="public/releases"

img_path=""
if [ -f "${banner_dir}/release-feed-${minor}.webp" ]; then
  img_path="${banner_dir}/release-feed-${minor}.webp"
else
  latest_img="$(ls "${banner_dir}"/release-feed-*.webp 2>/dev/null | sort -V | tail -n 1 || true)"
  if [ -n "$latest_img" ]; then
    img_path="$latest_img"
  fi
fi
if [ -z "$img_path" ]; then
  img_path="apps/site/public/assets/product/og-mark-lee.png"
fi

url_for() {
  printf 'https://raw.githubusercontent.com/%s/%s/%s' "$repo" "$1" "$img_path"
}

resolves() {
  curl -sf -o /dev/null "$(url_for "$1")"
}

# The tag can be cut before the banner is committed, which makes ${ref} 404.
# Try the tag, then main, and fail loudly rather than degrade to a stale banner.
if resolves "$ref"; then
  url_for "$ref"
  exit 0
fi

echo "release image not available at ${ref}, trying main" >&2
if resolves main; then
  url_for main
  exit 0
fi

echo "release image does not resolve over HTTP: $(url_for main)" >&2
exit 1
