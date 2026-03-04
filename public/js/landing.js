(function () {
  const REPO_OWNER = "mafhper";
  const REPO_NAME = "mark-lee";
  let cachedTargetRepo = undefined;

  async function fetchJson(url) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/vnd.github+json",
        },
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async function resolveTargetRepo() {
    if (cachedTargetRepo !== undefined) return cachedTargetRepo;

    const repos = await fetchJson(`https://api.github.com/users/${REPO_OWNER}/repos?sort=updated&per_page=100`);
    if (!Array.isArray(repos)) {
      cachedTargetRepo = null;
      return null;
    }

    cachedTargetRepo =
      repos.find((repo) => String(repo?.name || "").toLowerCase() === REPO_NAME) ?? null;

    return cachedTargetRepo;
  }

  function classifyAsset(name) {
    const n = name.toLowerCase();
    if (n.endsWith(".exe") || n.endsWith(".msi")) return "windows";
    if (n.endsWith(".dmg") || n.endsWith(".app.tar.gz") || n.includes("macos")) return "macos";
    if (n.endsWith(".appimage") || n.endsWith(".deb") || n.endsWith(".rpm")) return "linux";
    return null;
  }

  function renderLinks(containerId, assets) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!assets.length) {
      container.innerHTML = `<span>Sem artefatos públicos no momento.</span>`;
      return;
    }
    container.innerHTML = assets
      .map(
        (asset) =>
          `<a href="${asset.browser_download_url}" target="_blank" rel="noreferrer">${asset.name}</a>`
      )
      .join("");
  }

  async function loadReleaseAssets() {
    const repo = await resolveTargetRepo();
    if (!repo?.url) {
      renderLinks("downloads-windows", []);
      renderLinks("downloads-macos", []);
      renderLinks("downloads-linux", []);
      return;
    }

    const releases = await fetchJson(`${repo.url}/releases`);
    if (!Array.isArray(releases)) {
      renderLinks("downloads-windows", []);
      renderLinks("downloads-macos", []);
      renderLinks("downloads-linux", []);
      return;
    }

    const latest = releases.find((release) => !release.draft && !release.prerelease) || releases[0];
    if (!latest) {
      renderLinks("downloads-windows", []);
      renderLinks("downloads-macos", []);
      renderLinks("downloads-linux", []);
      return;
    }

    const grouped = { windows: [], macos: [], linux: [] };
    for (const asset of latest.assets || []) {
      const platform = classifyAsset(asset.name || "");
      if (platform) grouped[platform].push(asset);
    }

    renderLinks("downloads-windows", grouped.windows);
    renderLinks("downloads-macos", grouped.macos);
    renderLinks("downloads-linux", grouped.linux);
  }

  async function loadFeaturedProjects() {
    const container = document.getElementById("featured-projects");
    if (!container) return;

    const repos = await fetchJson(`https://api.github.com/users/${REPO_OWNER}/repos?sort=updated&per_page=30`);
    if (!Array.isArray(repos)) {
      container.innerHTML = `<article class="card"><h3>GitHub</h3><p>Nao foi possivel carregar projetos agora.</p></article>`;
      return;
    }

    const selected = repos
      .filter((repo) => String(repo?.name || "").toLowerCase() !== REPO_NAME)
      .slice(0, 2);

    container.innerHTML = selected
      .map(
        (repo) => `
            <article class="card">
              <h3>${repo.name}</h3>
              <p>${repo.description || "No description."}</p>
              <p style="margin-top:10px;"><a href="${repo.html_url}" target="_blank" rel="noreferrer">GitHub ↗</a></p>
            </article>
          `
      )
      .join("");

    if (!container.innerHTML.trim()) {
      container.innerHTML = `<article class="card"><h3>GitHub</h3><p>Nenhum projeto publico encontrado.</p></article>`;
    }
  }

  async function loadLatestCommit() {
    const slot = document.getElementById("last-commit");
    if (!slot) return;
    const repo = await resolveTargetRepo();
    if (!repo?.url) {
      slot.textContent = "Ultimo commit indisponivel (repo privado ou nao encontrado).";
      return;
    }

    const commits = await fetchJson(`${repo.url}/commits?per_page=1`);
    if (!Array.isArray(commits) || !commits[0]) {
      slot.textContent = "Nao foi possivel sincronizar o ultimo commit.";
      return;
    }

    const latest = commits[0];
    const sha = String(latest.sha || "").slice(0, 7);
    const commitDate = latest?.commit?.author?.date ? new Date(latest.commit.author.date) : null;
    const date = commitDate ? commitDate.toLocaleDateString() : "--";
    slot.innerHTML = `Ultimo commit <a href="${latest.html_url}" target="_blank" rel="noreferrer" style="color:#b7cbff;">${sha}</a> • ${date}`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadReleaseAssets();
    loadFeaturedProjects();
    loadLatestCommit();
  });
})();
