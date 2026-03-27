import { spawn } from "node:child_process";
import process from "node:process";
import { chromium } from "playwright";

const port = Number(process.env.SMOKE_PORT || 4173);
const baseUrl = `http://127.0.0.1:${port}`;
const isWindows = process.platform === "win32";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // no-op
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
  child.kill("SIGTERM");
}

function createServerProcess() {
  const command = `npx vite preview --host 127.0.0.1 --port ${port} --strictPort`;
  return spawn(command, {
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function run() {
  const server = createServerProcess();
  const stdout = [];
  const stderr = [];

  server.stdout?.on("data", (data) => stdout.push(String(data)));
  server.stderr?.on("data", (data) => stderr.push(String(data)));

  try {
    await waitForServer(baseUrl, 45000);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const consoleErrors = [];
    const pageErrors = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    page.on("pageerror", (error) => {
      pageErrors.push(String(error));
    });

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);

    const newTabButton = page.locator("button[aria-label='new-tab']");
    const newTabButtonCount = await newTabButton.count();
    if (newTabButtonCount === 0) {
      const bodyText = (await page.textContent("body")) || "";
      throw new Error(`New tab button not found. Body sample: ${bodyText.slice(0, 220)}`);
    }
    await newTabButton.first().click();
    await page.waitForTimeout(400);
    const hasTwoTabs = await page
      .getByText(/\b2 tabs\b/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (!hasTwoTabs) {
      throw new Error("New tab button did not create a second tab.");
    }

    await browser.close();

    if (consoleErrors.length || pageErrors.length) {
      console.error("Smoke static failed: browser runtime errors detected.");
      if (consoleErrors.length) {
        console.error("Console errors:");
        for (const err of consoleErrors) console.error(`- ${err}`);
      }
      if (pageErrors.length) {
        console.error("Page errors:");
        for (const err of pageErrors) console.error(`- ${err}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log("Smoke static passed: no browser runtime errors detected.");
  } finally {
    await killProcessTree(server);
    if (stderr.length) {
      const serverStderr = stderr.join("");
      if (serverStderr.trim()) {
        console.log("\n[serve stderr]");
        console.log(serverStderr.trim());
      }
    }
  }
}

run().catch(async (error) => {
  console.error("Smoke static failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
