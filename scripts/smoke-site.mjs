import { spawn } from "node:child_process";
import { createServer } from "node:net";
import process from "node:process";
import { gzipSync } from "node:zlib";
import { chromium } from "playwright";
import { createGitHubApiFixture } from "./smoke-github-api.mjs";

const preferredPort = Number(process.env.SITE_SMOKE_PORT || 43180);
const isWindows = process.platform === "win32";
const legacyRoutes = [
  "/pt-BR/galeria",
  "/pt-BR/engenharia",
  "/pt-BR/contribuir",
  "/pt-BR/faq",
  "/pt-BR/downloads",
  "/en-US/gallery",
  "/es-ES/ingenieria",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function findFreePort(startPort) {
  for (let port = startPort; port < startPort + 50; port += 1) {
    const free = await new Promise((resolve) => {
      const tester = createServer();
      tester.once("error", () => resolve(false));
      tester.once("listening", () => tester.close(() => resolve(true)));
      tester.listen(port, "127.0.0.1");
    });
    if (free) return port;
  }
  throw new Error(`Could not find a free port in range ${startPort}-${startPort + 49}`);
}

async function waitForServer(url, timeoutMs = 45_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) return;
    } catch {
      // Retry until the preview server is ready.
    }
    await sleep(400);
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function killProcessTree(child) {
  if (!child?.pid) return;
  if (isWindows) {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      killer.on("close", resolve);
      killer.on("error", resolve);
    });
    return;
  }
  // The server is spawned detached (its own process group), so signal the whole
  // group with a negative pid — otherwise `vite preview` child workers survive and
  // keep the parent's event loop alive until the CI step times out.
  const signalGroup = (signal) => {
    try {
      process.kill(-child.pid, signal);
    } catch {
      child.kill(signal);
    }
  };
  signalGroup("SIGTERM");
  await Promise.race([new Promise((resolve) => child.once("close", resolve)), sleep(1200)]);
  if (child.exitCode === null && child.signalCode === null) signalGroup("SIGKILL");
}

function createServerProcess(port) {
  if (isWindows) {
    return spawn(`npx vite preview --host 127.0.0.1 --port ${port} --strictPort`, {
      cwd: "apps/site",
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
  }
  return spawn("npx", ["vite", "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: "apps/site",
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
}

async function assertLandingRedirect(page, baseUrl) {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.waitForURL(/\/(pt-BR|en-US|es-ES)\/?$/i, { timeout: 5000 });
}

async function assertLegacyRoutes(page, baseUrl) {
  for (const route of legacyRoutes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    if (!(await page.locator("#main-content").isVisible()) || (await page.locator("h1, h2").count()) === 0) {
      throw new Error(`Legacy route ${route} did not render its content.`);
    }
  }
}

async function assertHomeContract(page, baseUrl) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/pt-BR`, { waitUntil: "networkidle" });

  await page.getByRole("heading", { level: 1, name: /Editor\.\s*Memórias\.\s*Markdown\./ }).waitFor();
  const downloadHref = await page.getByRole("link", { name: "Baixar Mark-Lee" }).first().getAttribute("href");
  if (downloadHref !== "/pt-BR/downloads") throw new Error(`Unexpected download CTA: ${downloadHref}`);

  for (const section of ["leituras", "arquivo", "recursos", "temas", "codigo", "download"]) {
    if ((await page.locator(`#${section}`).count()) !== 1) throw new Error(`Missing unique #${section} section.`);
  }

  const chapterImages = page.locator("main img");
  for (let index = 0; index < (await chapterImages.count()); index += 1) {
    const image = chapterImages.nth(index);
    await image.scrollIntoViewIfNeeded();
    await page.waitForFunction((img) => img.complete && img.naturalWidth > 0, await image.elementHandle());
  }

  /* O palco tem DUAS leituras. Uma terceira (o markdown cru) saiu: o Editor ja
   * mostra o texto numerado por linha. Se alguem reintroduzir uma aba sem
   * querer, este numero denuncia. */
  const stageTabs = page.locator("#leituras [role='tab']");
  const stageTabCount = await stageTabs.count();
  if (stageTabCount !== 2) throw new Error(`Stage should expose 2 readings, found ${stageTabCount}.`);
  const stageTabNames = await stageTabs.allInnerTexts();
  if (stageTabNames.join("|") !== "Editor|Memórias") {
    throw new Error(`Unexpected stage tabs: ${stageTabNames.join("|")}`);
  }

  await assertHeaderBaseline(page);
}

async function assertHeaderBaseline(page) {
  /* Uma linha de base só para os quatro grupos do cabeçalho. O flex centraliza
   * caixas, e com tamanhos de letra diferentes isso vira três linhas: os
   * deslocamentos que corrigem moram no `Header`, e este check existe para eles
   * não envelhecerem em silêncio. */
  const baselines = await page.evaluate(() => {
    const baselineOf = (element) => {
      const probe = document.createElement("span");
      probe.style.cssText =
        "display:inline-block;width:0;height:0;line-height:0;font-size:0;vertical-align:baseline";
      element.appendChild(probe);
      const at = probe.getBoundingClientRect().top;
      probe.remove();
      return at;
    };

    const header = document.querySelector("header");
    const wordmark = header.querySelector('a[aria-label="Mark-Lee"]');
    return [
      baselineOf(wordmark.querySelector("span > span")),
      ...[...header.querySelectorAll("nav a")].map((link) => baselineOf(link)),
      baselineOf(header.querySelector("div.ml-auto a > span")),
    ];
  });

  const spread = Math.max(...baselines) - Math.min(...baselines);
  if (spread > 0.5) {
    throw new Error(
      `Header baselines are not on one line: spread ${spread.toFixed(2)}px (${baselines
        .map((value) => value.toFixed(2))
        .join(", ")})`,
    );
  }
}

async function assertAnchorNavigation(page, baseUrl) {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${baseUrl}/pt-BR`, { waitUntil: "networkidle" });
  await page.locator("header nav").getByRole("link", { name: "Produto", exact: true }).click();
  await page.waitForURL(/\/pt-BR#leituras$/);
  await page.waitForTimeout(120);
  /* O cabecalho deixou de ser `sticky`: o alvo do ancora encosta no topo da
   * viewport, sem a folga de 56px que compensava a barra grudada. */
  const homeTargetTop = await page.locator("#leituras").evaluate((node) => node.getBoundingClientRect().top);
  if (homeTargetTop < -1 || homeTargetTop > 8) {
    throw new Error(`Home anchor did not align at the top: ${homeTargetTop}`);
  }

  await page.goto(`${baseUrl}/pt-BR/faq`, { waitUntil: "networkidle" });
  await page.locator("header nav").getByRole("link", { name: "Arquivos", exact: true }).click();
  await page.waitForURL(/\/pt-BR#arquivo$/);
  await page.waitForTimeout(160);
  const secondaryTargetTop = await page.locator("#arquivo").evaluate((node) => node.getBoundingClientRect().top);
  if (secondaryTargetTop < -1 || secondaryTargetTop > 8) {
    throw new Error(`Secondary-route anchor did not align at the top: ${secondaryTargetTop}`);
  }
}

async function assertMobileAndKeyboard(page, baseUrl) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/pt-BR`, { waitUntil: "networkidle" });
  await page.keyboard.press("Tab");
  if ((await page.evaluate(() => document.activeElement?.tagName)) === "BODY") {
    throw new Error("Keyboard focus did not enter the page.");
  }

  await page.getByRole("button", { name: "Abrir menu principal" }).click();
  const mobile = page.getByRole("navigation", { name: "Menu móvel" });
  for (const label of ["Produto", "Arquivos", "Personalização", "Baixar"]) {
    if (!(await mobile.getByRole("link", { name: label, exact: true }).isVisible())) {
      throw new Error(`Mobile menu is missing ${label}.`);
    }
  }
  await mobile.getByRole("link", { name: "Personalização", exact: true }).click();
  await page.waitForURL(/\/pt-BR#temas$/);
}

async function assertNoHorizontalOverflow(page, baseUrl) {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${baseUrl}/pt-BR`, { waitUntil: "networkidle" });
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    if (dimensions.scrollWidth > dimensions.clientWidth) {
      throw new Error(`Horizontal overflow at ${viewport.width}px: ${JSON.stringify(dimensions)}`);
    }
  }
}

async function assertPerformanceBudgets(page, baseUrl) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/pt-BR`, { waitUntil: "networkidle" });
  const resources = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((entry) => entry.name),
  );
  const assetUrls = [...new Set(resources.filter((url) => /\.(js|css)(\?|$)/.test(url)))];
  let jsGzip = 0;
  let cssGzip = 0;
  for (const url of assetUrls) {
    const content = Buffer.from(await (await fetch(url)).arrayBuffer());
    const bytes = gzipSync(content).byteLength;
    if (/\.js(\?|$)/.test(url)) jsGzip += bytes;
    if (/\.css(\?|$)/.test(url)) cssGzip += bytes;
  }

  // Orcamento de JS recalibrado por decisao do dono (2026-11-03): o teto e
  // FOLGA DE SEGURANCA, nao meta. A meta de qualidade do site e Lighthouse 100
  // e otimizacao continua; um teto apertado transformava qualquer linha nova em
  // falha de build e empurrava o esforco para o lugar errado. Se este numero
  // comecar a incomodar, o sinal e a medicao do Lighthouse — nao o teto.
  if (jsGzip > 150 * 1024) {
    throw new Error(`Initial JS exceeds the 150 KiB safety ceiling: ${jsGzip} bytes.`);
  }
  if (cssGzip > 18_000) throw new Error(`Initial CSS exceeds 18 KB gzip: ${cssGzip} bytes.`);

  const heroResponse = await fetch(`${baseUrl}/assets/product/editor.png`);
  const heroBytes = (await heroResponse.arrayBuffer()).byteLength;
  if (heroBytes > 450_000) throw new Error(`Hero image exceeds 450 KB: ${heroBytes} bytes.`);

  const externalFonts = resources.filter((url) => /\.(woff2?|ttf|otf)(\?|$)/.test(url) && !url.startsWith(baseUrl));
  if (externalFonts.length) throw new Error(`External font request(s): ${externalFonts.join(", ")}`);

  console.log(`Budgets: JS ${jsGzip} B gzip, CSS ${cssGzip} B gzip, hero ${heroBytes} B.`);
}

async function assertStaticMetadata(baseUrl) {
  const checks = [
    ["/pt-BR/", "pt-BR", "Editor e Memórias"],
    ["/en-US/gallery/", "en-US", "Experience"],
    ["/es-ES/faq/", "es-ES", "FAQ"],
  ];
  for (const [route, locale, titleFragment] of checks) {
    const html = await (await fetch(`${baseUrl}${route}`)).text();
    if (!html.includes(`<html lang="${locale}">`) || !html.includes(titleFragment)) {
      throw new Error(`Static metadata is not localized for ${route}.`);
    }
    if (!html.includes('meta name="description"') || !html.includes('property="og:title"')) {
      throw new Error(`Static metadata tags are incomplete for ${route}.`);
    }
  }
}

async function run() {
  const port = await findFreePort(preferredPort);
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = createServerProcess(port);
  const stderr = [];
  server.stderr?.on("data", (data) => stderr.push(String(data)));

  try {
    await waitForServer(baseUrl);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const browserErrors = [];
    const unexpectedApiRequests = [];

    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("status of 404")) browserErrors.push(message.text());
    });
    page.on("pageerror", (error) => browserErrors.push(String(error)));
    await page.route("https://api.github.com/**", async (route) => {
      const fixture = createGitHubApiFixture(route.request().url());
      if (!fixture) {
        unexpectedApiRequests.push(route.request().url());
        await route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
        return;
      }
      await route.fulfill(fixture);
    });

    await assertLandingRedirect(page, baseUrl);
    await assertHomeContract(page, baseUrl);
    await assertAnchorNavigation(page, baseUrl);
    await assertMobileAndKeyboard(page, baseUrl);
    await assertLegacyRoutes(page, baseUrl);
    await assertNoHorizontalOverflow(page, baseUrl);
    await assertPerformanceBudgets(page, baseUrl);
    await assertStaticMetadata(baseUrl);

    await browser.close();
    if (browserErrors.length) throw new Error(`Browser errors: ${browserErrors.join(" | ")}`);
    if (unexpectedApiRequests.length) throw new Error(`Unexpected GitHub API request(s): ${unexpectedApiRequests.join(", ")}`);
    console.log("Site smoke passed: CTA, anchors, mobile keyboard flow, legacy routes, assets, metadata, and overflow are healthy.");
  } finally {
    await killProcessTree(server);
    const logs = stderr.join("").trim();
    if (logs) console.log(`\n[serve stderr]\n${logs}`);
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Site smoke failed:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
