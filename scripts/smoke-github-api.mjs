const GITHUB_API_ORIGIN = "https://api.github.com";
const REPOSITORY_PATH = "/repos/mafhper/mark-lee";
const RELEASE_URL = "https://github.com/mafhper/mark-lee/releases/tag/v1.3.2";
const RELEASE_DOWNLOAD_URL =
  "https://github.com/mafhper/mark-lee/releases/download/v1.3.2";

function jsonFixture(value) {
  return {
    status: 200,
    contentType: "application/json",
    headers: {
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    },
    body: JSON.stringify(value),
  };
}

function commitFixture(index) {
  const suffix = String(index + 1).padStart(2, "0");
  const sha = `${suffix}`.repeat(20);
  return {
    sha,
    html_url: `https://github.com/mafhper/mark-lee/commit/${sha}`,
    commit: {
      message: `Deterministic smoke commit ${index + 1}`,
      author: {
        date: `2026-06-${String(29 - index).padStart(2, "0")}T12:00:00Z`,
        name: "Mark-Lee CI",
      },
    },
  };
}

export function createGitHubApiFixture(requestUrl) {
  let url;
  try {
    url = new URL(requestUrl);
  } catch {
    return null;
  }

  if (url.origin !== GITHUB_API_ORIGIN) return null;

  if (url.pathname === `${REPOSITORY_PATH}/commits`) {
    return jsonFixture([commitFixture(0), commitFixture(1), commitFixture(2)]);
  }

  if (url.pathname === `${REPOSITORY_PATH}/releases`) {
    return jsonFixture([
      {
        draft: false,
        prerelease: false,
        html_url: RELEASE_URL,
        assets: [
          {
            name: "Mark-Lee_1.3.2_x64_en-US.msi",
            browser_download_url: `${RELEASE_DOWNLOAD_URL}/Mark-Lee_1.3.2_x64_en-US.msi`,
          },
          {
            name: "Mark-Lee_1.3.2_x64-setup.exe",
            browser_download_url: `${RELEASE_DOWNLOAD_URL}/Mark-Lee_1.3.2_x64-setup.exe`,
          },
          {
            name: "Mark-Lee_1.3.2_amd64.AppImage",
            browser_download_url: `${RELEASE_DOWNLOAD_URL}/Mark-Lee_1.3.2_amd64.AppImage`,
          },
        ],
      },
    ]);
  }

  return null;
}
