import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const root = process.cwd();
const distPath = path.join(root, "dist", "index.html");
const outputDir = path.join(root, "apps", "site", "public", "assets", "illustrations");
const manifestFile = path.join(root, "apps", "site", "src", "content", "fixtures", "illustrations.capture.json");
const fixtureTextFile = path.join(root, "apps", "site", "src", "content", "fixtures", "capture-fixtures.json");
const isWindows = process.platform === "win32";

const localized = (pt, en, es) => ({ "pt-BR": pt, "en-US": en, "es-ES": es });

async function fileExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function findFreePort(startPort = 43280) {
  for (let port = startPort; port < startPort + 40; port += 1) {
    const ok = await new Promise((resolve) => {
      const server = createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => {
        server.close(() => resolve(true));
      });
      server.listen(port, "127.0.0.1");
    });
    if (ok) return port;
  }
  throw new Error("No free port available for capture server.");
}

async function waitForServer(url, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function killTree(child) {
  if (!child?.pid) return;
  if (isWindows) {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      killer.on("close", () => resolve());
      killer.on("error", () => resolve());
    });
    return;
  }
  child.kill("SIGTERM");
}

async function ensureDesktopBuild() {
  const hasDist = await fileExists(distPath);
  if (hasDist) return;
  await new Promise((resolve, reject) => {
    const child = spawn("npm run build", { shell: true, stdio: "inherit", cwd: root });
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`Build failed with code ${code}`))));
    child.on("error", reject);
  });
}

async function main() {
  await ensureDesktopBuild();
  await mkdir(outputDir, { recursive: true });
  const fixtureText = JSON.parse(await readFile(fixtureTextFile, "utf8")).meetingNotes;

  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(`npx serve dist -l ${port} --no-clipboard`, {
    shell: true,
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stderr = [];
  server.stderr?.on("data", (data) => stderr.push(String(data)));

  try {
    await waitForServer(baseUrl);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    const editor = page.locator(".cm-content").first();
    if (await editor.count()) {
      await editor.click();
      await page.keyboard.press("Control+A").catch(() => {});
      await page.keyboard.type(fixtureText.slice(0, 1100), { delay: 1 });
      await page.waitForTimeout(300);
    }

    const fullCapture = path.join(outputDir, "home-workflows-capture.png");
    await page.screenshot({ path: fullCapture, fullPage: false });

    const sideCapture = path.join(outputDir, "engineering-stack-capture.png");
    const workspaceItem = page.locator("[data-file-entry]").first();
    if (await workspaceItem.count()) {
      await workspaceItem.click().catch(() => {});
      await page.waitForTimeout(250);
    }
    await page.screenshot({ path: sideCapture, fullPage: false });
    await browser.close();

    const now = new Date().toISOString();
    const manifest = [
      {
        key: "home.workflows.capture",
        source: "capture",
        ratio: "3:2",
        path: "assets/illustrations/home-workflows-capture.png",
        alt: localized(
          "Captura real da versão browser do Mark-Lee com texto de reunião no editor.",
          "Real browser capture of Mark-Lee with meeting text inside the editor.",
          "Captura real de la versión browser de Mark-Lee con texto de reunión en el editor."
        ),
        updatedAt: now,
        localeNeutral: true,
      },
      {
        key: "engineering.capture",
        source: "capture",
        ratio: "3:2",
        path: "assets/illustrations/engineering-stack-capture.png",
        alt: localized(
          "Captura real da interface com foco em editor e estrutura de workspace.",
          "Real interface capture focused on editor and workspace structure.",
          "Captura real de la interfaz con foco en editor y estructura del workspace."
        ),
        updatedAt: now,
        localeNeutral: true,
      },
    ];

    await writeFile(manifestFile, JSON.stringify(manifest, null, 2), "utf8");
    console.log("Captured fallback browser illustrations.");
  } finally {
    await killTree(server);
    if (stderr.length) {
      const logs = stderr.join("").trim();
      if (logs) console.log(logs);
    }
  }
}

main().catch((error) => {
  console.error("Failed to capture browser fixtures:", error);
  process.exit(1);
});
