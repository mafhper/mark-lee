import { RELEASES_URL, REPO_URL } from "@/i18n";

const CACHE_TTL_MS = 15 * 60 * 1000;
const RELEASE_CACHE_KEY = "marklee:site:stable-release-v1";
const COMMITS_CACHE_KEY = "marklee:site:recent-commits-v1";

interface CacheEnvelope<T> {
  createdAt: number;
  value: T;
}

interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  draft: boolean;
  prerelease: boolean;
  html_url: string;
  assets: GitHubAsset[];
}

interface GitHubCommitApi {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author?: {
      date?: string;
      name?: string;
    };
  };
}

export interface ReleaseAssetMap {
  windows: string;
  macos: string;
  linux: string;
  releaseUrl: string;
}

export interface RecentCommit {
  sha: string;
  message: string;
  date: string;
  url: string;
  author: string;
}

function parseRepoFromUrl(url: string): { owner: string; repo: string } {
  const cleaned = url.replace(/\.git$/, "").replace(/\/+$/, "");
  const parts = cleaned.split("/");
  return {
    owner: parts[parts.length - 2] ?? "mafhper",
    repo: parts[parts.length - 1] ?? "mark-lee",
  };
}

const repoInfo = parseRepoFromUrl(REPO_URL);

function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as CacheEnvelope<T>;
    if (Date.now() - data.createdAt > CACHE_TTL_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    return data.value;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    const payload: CacheEnvelope<T> = { createdAt: Date.now(), value };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Intentionally ignore cache persistence issues.
  }
}

function pickAsset(assets: GitHubAsset[], patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const found = assets.find((asset) => pattern.test(asset.name));
    if (found) return found.browser_download_url;
  }
  return null;
}

function fallbackReleaseMap(): ReleaseAssetMap {
  const latestUrl = `${RELEASES_URL}/latest`;
  return {
    windows: latestUrl,
    macos: latestUrl,
    linux: latestUrl,
    releaseUrl: latestUrl,
  };
}

export async function fetchStableReleaseAssets(): Promise<ReleaseAssetMap> {
  const cached = readCache<ReleaseAssetMap>(RELEASE_CACHE_KEY);
  if (cached) return cached;

  const endpoint = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/releases?per_page=10`;

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/vnd.github+json" },
    });

    if (!response.ok) {
      return fallbackReleaseMap();
    }

    const releases = (await response.json()) as GitHubRelease[];
    const stableRelease = releases.find((release) => !release.draft && !release.prerelease);
    if (!stableRelease) {
      return fallbackReleaseMap();
    }

    const assets = stableRelease.assets ?? [];
    const releaseMap: ReleaseAssetMap = {
      windows:
        pickAsset(assets, [/\.msi$/i, /setup.*\.exe$/i, /\.exe$/i]) ??
        `${RELEASES_URL}/latest`,
      macos:
        pickAsset(assets, [/\.dmg$/i, /\.app\.tar\.gz$/i, /\.pkg$/i]) ??
        `${RELEASES_URL}/latest`,
      linux:
        pickAsset(assets, [/appimage/i, /\.deb$/i, /\.rpm$/i, /linux.*\.tar\.gz$/i]) ??
        `${RELEASES_URL}/latest`,
      releaseUrl: stableRelease.html_url || `${RELEASES_URL}/latest`,
    };

    writeCache(RELEASE_CACHE_KEY, releaseMap);
    return releaseMap;
  } catch {
    return fallbackReleaseMap();
  }
}

export async function fetchRecentCommits(limit = 3): Promise<RecentCommit[]> {
  const cacheKey = `${COMMITS_CACHE_KEY}:${limit}`;
  const cached = readCache<RecentCommit[]>(cacheKey);
  if (cached) return cached;

  const endpoint = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/commits?per_page=${limit}`;

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/vnd.github+json" },
    });

    if (!response.ok) {
      return [];
    }

    const commits = (await response.json()) as GitHubCommitApi[];
    const mapped = commits.map((item) => ({
      sha: item.sha.slice(0, 7),
      message: item.commit.message.split("\n")[0] ?? "",
      date: item.commit.author?.date ?? "",
      url: item.html_url,
      author: item.commit.author?.name ?? "",
    }));

    writeCache(cacheKey, mapped);
    return mapped;
  } catch {
    return [];
  }
}

export function formatCommitDate(isoDate: string, locale: string): string {
  if (!isoDate) return "";
  try {
    const date = new Date(isoDate);
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(date);
  } catch {
    return isoDate;
  }
}
