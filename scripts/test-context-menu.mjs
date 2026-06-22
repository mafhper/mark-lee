import { spawn } from "node:child_process";
import process from "node:process";
import { chromium } from "playwright";

const port = Number(process.env.CONTEXT_MENU_TEST_PORT || 5199);
const baseUrl = `http://127.0.0.1:${port}/?dev=context-menu`;
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

async function run() {
  const command = `npx vite --port ${port} --strictPort`;
  const server = spawn(command, {
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, TAURI_DEV_HOST: "" },
  });

  const stdout = [];
  const stderr = [];
  server.stdout?.on("data", (data) => stdout.push(String(data)));
  server.stderr?.on("data", (data) => stderr.push(String(data)));

  const failures = [];
  let browser;

  try {
    await waitForServer(baseUrl, 45000);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForSelector("text=ContextMenu Dev Harness", { timeout: 10000 });

    // 1. Portal: o menu deve ser renderizado em document.body (não dentro da superfície)
    {
      const surface = page.locator("text=Superfície 1").locator("..");
      await surface.click({ button: "right" });
      await page.waitForSelector('[role="menu"]', { timeout: 3000 });
      const menuInBody = await page.evaluate(() => {
        const menu = document.querySelector('[role="menu"]');
        if (!menu) return false;
        return document.body.contains(menu) && !menu.closest("[tabindex]");
      });
      if (!menuInBody) failures.push("portal: menu não renderizado em document.body");
      await page.keyboard.press("Escape");
      await page.waitForSelector('[role="menu"]', { state: "detached" });
    }

    // 2. Foco inicial no primeiro item habilitado
    {
      const surface = page.locator("text=Superfície 1").locator("..");
      await surface.click({ button: "right" });
      await page.waitForSelector('[role="menu"]', { timeout: 3000 });
      const firstItemLabel = await page.evaluate(() => {
        const item = document.querySelector('[role="menuitem"]:not([disabled])');
        return item?.textContent?.trim() ?? null;
      });
      if (!firstItemLabel || !firstItemLabel.includes("Cortar")) {
        failures.push(`foco inicial: esperado "Cortar", obtido "${firstItemLabel}"`);
      }
      const focusedLabel = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.textContent?.trim() ?? null;
      });
      if (!focusedLabel || !focusedLabel.includes("Cortar")) {
        failures.push(`foco inicial: item focado não é o primeiro habilitado ("${focusedLabel}")`);
      }
      await page.keyboard.press("Escape");
      await page.waitForSelector('[role="menu"]', { state: "detached" });
    }

    // 3. ArrowDown move o foco
    {
      const surface = page.locator("text=Superfície 1").locator("..");
      await surface.click({ button: "right" });
      await page.waitForSelector('[role="menu"]', { timeout: 3000 });
      await page.keyboard.press("ArrowDown");
      const focusedLabel = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
      if (!focusedLabel.includes("Copiar")) {
        failures.push(`ArrowDown: esperado "Copiar", obtido "${focusedLabel}"`);
      }
      await page.keyboard.press("Escape");
      await page.waitForSelector('[role="menu"]', { state: "detached" });
    }

    // 4. ArrowDown pula item disabled
    {
      const surface = page.locator("text=Superfície 2").locator("..");
      await surface.click({ button: "right" });
      await page.waitForSelector('[role="menu"]', { timeout: 3000 });
      // Foco começa em "Cortar". ArrowDown -> Copiar -> Colar -> Renomear -> Excluir -> (disabled) -> Cortar
      for (let i = 0; i < 5; i += 1) {
        await page.keyboard.press("ArrowDown");
      }
      const focusedLabel = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
      if (focusedLabel.includes("desabilitado")) {
        failures.push(`ArrowDown pula disabled: foco caiu em disabled ("${focusedLabel}")`);
      }
      await page.keyboard.press("Escape");
      await page.waitForSelector('[role="menu"]', { state: "detached" });
    }

    // 5. Home vai ao primeiro item
    {
      const surface = page.locator("text=Superfície 1").locator("..");
      await surface.click({ button: "right" });
      await page.waitForSelector('[role="menu"]', { timeout: 3000 });
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Home");
      const focusedLabel = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
      if (!focusedLabel.includes("Cortar")) {
        failures.push(`Home: esperado "Cortar", obtido "${focusedLabel}"`);
      }
      await page.keyboard.press("Escape");
      await page.waitForSelector('[role="menu"]', { state: "detached" });
    }

    // 6. End vai ao último item habilitado
    {
      const surface = page.locator("text=Superfície 1").locator("..");
      await surface.click({ button: "right" });
      await page.waitForSelector('[role="menu"]', { timeout: 3000 });
      await page.keyboard.press("End");
      const focusedLabel = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
      if (!focusedLabel.includes("Excluir")) {
        failures.push(`End: esperado "Excluir", obtido "${focusedLabel}"`);
      }
      await page.keyboard.press("Escape");
      await page.waitForSelector('[role="menu"]', { state: "detached" });
    }

    // 7. Enter executa o item e fecha o menu
    {
      const surface = page.locator("text=Superfície 1").locator("..");
      await surface.click({ button: "right" });
      await page.waitForSelector('[role="menu"]', { timeout: 3000 });
      await page.keyboard.press("Enter");
      const menuGone = await page.waitForSelector('[role="menu"]', { state: "detached", timeout: 3000 }).then(() => true).catch(() => false);
      if (!menuGone) {
        failures.push("Enter: menu não fechou após executar item");
      }
    }

    // 8. Escape fecha e restaura foco ao sourceElement
    {
      const surface = page.locator("text=Superfície 1").locator("..");
      await surface.focus();
      await surface.click({ button: "right" });
      await page.waitForSelector('[role="menu"]', { timeout: 3000 });
      await page.keyboard.press("Escape");
      await page.waitForSelector('[role="menu"]', { state: "detached" });
      const focusedIsSurface = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.getAttribute("tabindex") === "0" && el?.textContent?.includes("Superfície 1");
      });
      if (!focusedIsSurface) {
        failures.push("Escape: foco não restaurado ao sourceElement");
      }
    }

    // 9. Clique externo fecha sem roubar foco do alvo do clique
    {
      const surface = page.locator("text=Superfície 1").locator("..");
      await surface.click({ button: "right" });
      await page.waitForSelector('[role="menu"]', { timeout: 3000 });
      const input = page.locator('input[type="text"]');
      await input.click();
      const menuGone = await page.waitForSelector('[role="menu"]', { state: "detached", timeout: 3000 }).then(() => true).catch(() => false);
      if (!menuGone) {
        failures.push("clique externo: menu não fechou");
      }
      const focusedIsInput = await page.evaluate(() => document.activeElement?.tagName === "INPUT");
      if (!focusedIsInput) {
        failures.push("clique externo: foco não foi para o input (provider roubou foco)");
      }
    }

    // 10. Shift+F10 abre o menu pelo elemento focado
    {
      const surface = page.locator("text=Superfície 1").locator("..");
      await surface.focus();
      await page.keyboard.press("Shift+F10");
      const menuVisible = await page.waitForSelector('[role="menu"]', { timeout: 3000 }).then(() => true).catch(() => false);
      if (!menuVisible) {
        failures.push("Shift+F10: menu não abriu pelo elemento focado");
      }
      await page.keyboard.press("Escape");
      await page.waitForSelector('[role="menu"]', { state: "detached" });
    }

    // 11. Tecla ContextMenu abre o menu
    {
      const surface = page.locator("text=Superfície 1").locator("..");
      await surface.focus();
      await page.keyboard.press("ContextMenu");
      const menuVisible = await page.waitForSelector('[role="menu"]', { timeout: 3000 }).then(() => true).catch(() => false);
      if (!menuVisible) {
        failures.push("ContextMenu key: menu não abriu");
      }
      await page.keyboard.press("Escape");
      await page.waitForSelector('[role="menu"]', { state: "detached" });
    }

    // 12. Shift+F10 NÃO abre menu em input sem registro (preserva menu nativo)
    {
      const input = page.locator('input[type="text"]');
      await input.focus();
      await page.keyboard.press("Shift+F10");
      const menuVisible = await page.waitForSelector('[role="menu"]', { timeout: 1500 }).then(() => true).catch(() => false);
      if (menuVisible) {
        failures.push("Shift+F10 em input sem registro: menu customizado abriu (deveria preservar nativo)");
        await page.keyboard.press("Escape");
      }
    }

    // 13. resize fecha o menu
    {
      const surface = page.locator("text=Superfície 1").locator("..");
      await surface.click({ button: "right" });
      await page.waitForSelector('[role="menu"]', { timeout: 3000 });
      await page.setViewportSize({ width: 800, height: 600 });
      const menuGone = await page.waitForSelector('[role="menu"]', { state: "detached", timeout: 3000 }).then(() => true).catch(() => false);
      if (!menuGone) {
        failures.push("resize: menu não fechou");
      }
      await page.setViewportSize({ width: 1280, height: 800 });
    }

    // 14. Clamping: menu próximo à borda direita não transborda
    {
      const surface = page.locator("text=Borda superior-direita").locator("..");
      await surface.click({ button: "right" });
      await page.waitForSelector('[role="menu"]', { timeout: 3000 });
      const clamped = await page.evaluate(() => {
        const menu = document.querySelector('[role="menu"]');
        if (!menu) return false;
        const rect = menu.getBoundingClientRect();
        return rect.right <= window.innerWidth + 1;
      });
      if (!clamped) {
        failures.push("clamping: menu transborda borda direita");
      }
      await page.keyboard.press("Escape");
      await page.waitForSelector('[role="menu"]', { state: "detached" });
    }

    await browser.close();
    browser = null;
  } catch (error) {
    failures.push(` exceção: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
    await killProcessTree(server);
    if (stderr.length) {
      const serverStderr = stderr.join("");
      if (serverStderr.trim()) {
        console.log("\n[dev stderr]");
        console.log(serverStderr.trim().split("\n").slice(-8).join("\n"));
      }
    }
  }

  if (failures.length > 0) {
    console.error("\nContext menu Playwright tests FAILED:");
    for (const f of failures) console.error(`  - ${f}`);
    process.exitCode = 1;
    return;
  }

  console.log("\nContext menu Playwright tests passed (14 checks).");
}

run().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
