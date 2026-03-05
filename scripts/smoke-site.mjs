import { spawn } from "node:child_process";
import { createServer } from "node:net";
import process from "node:process";
import { chromium } from "playwright";

const preferredPort = Number(process.env.SITE_SMOKE_PORT || 43180);
const isWindows = process.platform === "win32";

const routesToCheck = [
  "/pt-BR",
  "/pt-BR/galeria",
  "/en-US/gallery",
  "/es-ES/ingenieria",
  "/en-US/contributing",
  "/es-ES/faq",
  "/pt-BR/downloads",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findFreePort(startPort) {
  for (let port = startPort; port < startPort + 50; port += 1) {
    const free = await new Promise((resolve) => {
      const tester = createServer();
      tester.once("error", () => resolve(false));
      tester.once("listening", () => {
        tester.close(() => resolve(true));
      });
      tester.listen(port, "127.0.0.1");
    });
    if (free) return port;
  }
  throw new Error(`Could not find a free port in range ${startPort}-${startPort + 49}`);
}

async function waitForServer(url, timeoutMs = 45000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) return;
    } catch {
      // Retry until timeout.
    }
    await sleep(500);
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function killProcessTree(child) {
  if (!child?.pid) return;
  if (isWindows) {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
      });
      killer.on("close", () => resolve());
      killer.on("error", () => resolve());
    });
    return;
  }
  await new Promise((resolve) => {
    const killer = spawn("bash", ["-lc", `pkill -TERM -P ${child.pid} || true`], {
      stdio: "ignore",
    });
    killer.on("close", () => resolve());
    killer.on("error", () => resolve());
  });

  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("close", resolve)),
    sleep(1200),
  ]);

  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
  }
}

function createServerProcess(port) {
  if (isWindows) {
    return spawn(`npx serve apps/site/dist -l ${port} --no-clipboard`, {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
  }

  return spawn("npx", ["serve", "apps/site/dist", "-l", String(port), "--no-clipboard"], {
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function assertLandingRedirect(page, baseUrl) {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  const url = page.url();
  const redirected = /\/(pt-BR|en-US|es-ES)\/?$/i.test(url);
  if (!redirected) {
    throw new Error(`Landing did not redirect to locale route. Current URL: ${url}`);
  }
}

async function assertRouteHealth(page, route, baseUrl) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(350);

  const hasMain = await page
    .locator("main")
    .first()
    .isVisible()
    .catch(() => false);
  if (!hasMain) {
    throw new Error(`Route ${route} did not render a visible <main>.`);
  }

  const headingCount = await page.locator("h1, h2").count();
  if (headingCount === 0) {
    throw new Error(`Route ${route} rendered no headings.`);
  }
}

async function assertNoLanguageSwitcher(page, baseUrl) {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${baseUrl}/pt-BR`, { waitUntil: "networkidle" });

  const localeLinks = await page
    .locator("header a[href*='/en-US'], header a[href*='/es-ES']")
    .count();

  if (localeLinks > 0) {
    throw new Error("Header still contains locale switch links.");
  }
}

async function assertDesktopNavLabel(page, baseUrl) {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${baseUrl}/pt-BR`, { waitUntil: "networkidle" });

  const experienceLink = page
    .locator("header nav[aria-label='Primary']")
    .getByRole("link", { name: /^Experiência$/i })
    .first();

  if (!(await experienceLink.isVisible())) {
    throw new Error("Desktop nav is missing the 'Experiência' label.");
  }
}

async function assertScrollResetOnNavigation(page, baseUrl) {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${baseUrl}/pt-BR/galeria`, { waitUntil: "networkidle" });

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(150);

  const before = await page.evaluate(() => window.scrollY);
  if (before < 120) {
    throw new Error("Could not establish deep scroll before navigation.");
  }

  await page
    .locator("header nav[aria-label='Primary']")
    .getByRole("link", { name: /^Engenharia$/i })
    .first()
    .click();

  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(200);

  const after = await page.evaluate(() => window.scrollY);
  if (after > 30) {
    throw new Error(`Scroll was not reset to top after route change. Current scrollY: ${after}`);
  }
}

async function assertMobileNavigation(page, baseUrl) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/pt-BR`, { waitUntil: "networkidle" });

  await page.keyboard.press("Tab");
  const focusTag = await page.evaluate(() => document.activeElement?.tagName ?? "");
  if (!focusTag || focusTag === "BODY") {
    throw new Error("Keyboard focus did not move to a focusable element.");
  }

  const openButton = page.getByRole("button", { name: /abrir menu principal/i });
  await openButton.click();

  const experienceLink = page
    .locator("#mobile-main-nav")
    .getByRole("link", { name: /^Experiência$/i })
    .first();
  if (!(await experienceLink.isVisible())) {
    throw new Error("Mobile navigation did not render the 'Experiência' primary route.");
  }

  const localeChipCount = await page
    .locator("#mobile-main-nav a")
    .filter({ hasText: /^(PT|EN|ES)$/i })
    .count();

  if (localeChipCount > 0) {
    throw new Error("Mobile navigation still shows locale switch chips.");
  }

  await experienceLink.click();
  await page.waitForLoadState("networkidle");

  if (!/\/pt-BR\/galeria\/?$/i.test(page.url())) {
    throw new Error(`Mobile navigation did not route to /pt-BR/galeria. Current URL: ${page.url()}`);
  }
}

async function assertSpaFallback(baseUrl) {
  const response = await fetch(`${baseUrl}/en-US/gallery`);
  if (![200, 404].includes(response.status)) {
    throw new Error(`Unexpected status for deep-link request: ${response.status}`);
  }

  const html = await response.text();
  if (!html.includes('<div id="root"></div>')) {
    throw new Error("Deep-link response is missing SPA root container.");
  }
}

async function run() {
  const port = await findFreePort(preferredPort);
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = createServerProcess(port);
  const stderr = [];
  let serverSpawnError = null;

  server.stderr?.on("data", (data) => stderr.push(String(data)));
  server.on("error", (error) => {
    serverSpawnError = error;
  });

  try {
    if (serverSpawnError) {
      throw serverSpawnError;
    }
    await waitForServer(baseUrl);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const consoleErrors = [];
    const pageErrors = [];

    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      if (text.includes("status of 404")) return;
      consoleErrors.push(text);
    });

    page.on("pageerror", (error) => {
      pageErrors.push(String(error));
    });

    await assertLandingRedirect(page, baseUrl);

    for (const route of routesToCheck) {
      await assertRouteHealth(page, route, baseUrl);
    }

    await assertNoLanguageSwitcher(page, baseUrl);
    await assertDesktopNavLabel(page, baseUrl);
    await assertScrollResetOnNavigation(page, baseUrl);
    await assertMobileNavigation(page, baseUrl);
    await assertSpaFallback(baseUrl);

    await browser.close();

    if (consoleErrors.length || pageErrors.length) {
      if (consoleErrors.length) {
        console.error("Browser console errors:");
        for (const err of consoleErrors) console.error(`- ${err}`);
      }
      if (pageErrors.length) {
        console.error("Browser page errors:");
        for (const err of pageErrors) console.error(`- ${err}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log("Site smoke passed: routes, nav behavior, and SPA fallback are healthy.");
  } finally {
    await killProcessTree(server);
    if (stderr.length) {
      const logs = stderr.join("").trim();
      if (logs) {
        console.log("\n[serve stderr]");
        console.log(logs);
      }
    }
  }
}

run()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((error) => {
    console.error("Site smoke failed:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
