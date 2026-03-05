import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.join(process.cwd(), '.dev', 'img', 'validation', 'regression');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const positions = ['top', 'bottom', 'left', 'right'];
const sizes = [
  { name: 'normal', width: 700, height: 600 },
  { name: 'maximized', width: 1280, height: 800 },
  { name: 'small', width: 520, height: 560 },
  { name: 'tiny', width: 420, height: 520 },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.addInitScript(() => {
    window.DEBUG_SHOW_TITLEBAR = true;
  });

  for (const pos of positions) {
    for (const size of sizes) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto('http://127.0.0.1:5173');
      await page.evaluate((anchor) => {
        const raw = localStorage.getItem('mark-lee-settings');
        let settings = {};
        try { settings = raw ? JSON.parse(raw) : {}; } catch { }
        settings.floatingToolbarAnchor = anchor;
        localStorage.setItem('mark-lee-settings', JSON.stringify(settings));
      }, pos);
      await page.reload();
      await page.waitForTimeout(900);

      await page.screenshot({ path: path.join(outDir, `toolbar_${pos}_${size.name}.png`) });

      const trigger = page.locator('[data-overflow-trigger]').first();
      if ((await trigger.count()) > 0) {
        await trigger.hover();
        await page.waitForTimeout(220);
        await page.screenshot({ path: path.join(outDir, `toolbar_${pos}_${size.name}_hover.png`) });
      }
    }
  }

  await browser.close();
  console.log('UI layout regression screenshots saved to', outDir);
})();
