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
  child.kill("SIGTERM");
  await Promise.race([new Promise((resolve) => child.once("close", resolve)), sleep(1200)]);
  if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
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

  await page.getByRole("heading", { level: 1, name: "Escreva o que precisa. Guarde o que importa." }).waitFor();
  const downloadHref = await page.getByRole("link", { name: "Baixar Mark-Lee" }).first().getAttribute("href");
  if (downloadHref !== "/pt-BR/downloads") throw new Error(`Unexpected download CTA: ${downloadHref}`);

  for (const section of ["dois-contextos", "editor", "memorias", "local"]) {
    if ((await page.locator(`#${section}`).count()) !== 1) throw new Error(`Missing unique #${section} section.`);
  }

  const productImages = page.locator("main img[src*='/assets/product/']");
  for (let index = 0; index < (await productImages.count()); index += 1) {
    const image = productImages.nth(index);
    await image.scrollIntoViewIfNeeded();
    await page.waitForFunction((img) => img.complete && img.naturalWidth > 0, await image.elementHandle());
  }
}

async function assertAnchorNavigation(page, baseUrl) {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${baseUrl}/pt-BR`, { waitUntil: "networkidle" });
  await page.locator("header nav").getByRole("link", { name: "Editor", exact: true }).click();
  await page.waitForURL(/\/pt-BR#editor$/);
  await page.waitForTimeout(120);
  const homeTargetTop = await page.locator("#editor").evaluate((node) => node.getBoundingClientRect().top);
  if (homeTargetTop < 45 || homeTargetTop > 80) {
    throw new Error(`Home anchor did not align below the header: ${homeTargetTop}`);
  }

  await page.goto(`${baseUrl}/pt-BR/faq`, { waitUntil: "networkidle" });
  await page.locator("header nav").getByRole("link", { name: "Memórias", exact: true }).click();
  await page.waitForURL(/\/pt-BR#memorias$/);
  await page.waitForTimeout(160);
  const secondaryTargetTop = await page.locator("#memorias").evaluate((node) => node.getBoundingClientRect().top);
  if (secondaryTargetTop < 45 || secondaryTargetTop > 80) {
    throw new Error(`Secondary-route anchor did not align below the header: ${secondaryTargetTop}`);
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
  for (const label of ["Editor", "Memórias", "Local-first", "Baixar"]) {
    if (!(await mobile.getByRole("link", { name: label, exact: true }).isVisible())) {
      throw new Error(`Mobile menu is missing ${label}.`);
    }
  }
  await mobile.getByRole("link", { name: "Local-first", exact: true }).click();
  await page.waitForURL(/\/pt-BR#local$/);
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

  if (jsGzip > 100 * 1024) throw new Error(`Initial JS exceeds 100 KiB gzip: ${jsGzip} bytes.`);
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

run().catch((error) => {
  console.error("Site smoke failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
