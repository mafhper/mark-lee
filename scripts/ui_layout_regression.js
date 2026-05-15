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

const editorFixture = [
  '# Mark-Lee selection regression',
  '',
  'Short selection target for the editor canvas.',
  'This line is intentionally long so wrapped selections can exercise the CodeMirror selection layer without creating oversized rectangles outside the editor viewport.',
  'Multiline selection target starts here and continues across the next rendered row.',
  'Final line for the regression fixture.',
].join('\n');

async function assertSelectionBackgroundsInsideEditor(page, label) {
  const result = await page.evaluate((selectionLabel) => {
    const editor = document.querySelector('.cm-editor');
    if (!editor) {
      return { ok: false, label: selectionLabel, reason: 'missing .cm-editor' };
    }

    const editorRect = editor.getBoundingClientRect();
    const backgrounds = Array.from(document.querySelectorAll('.cm-selectionBackground'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        };
      })
      .filter((rect) => rect.width > 0 && rect.height > 0);

    if (backgrounds.length === 0) {
      return { ok: false, label: selectionLabel, reason: 'no visible .cm-selectionBackground elements' };
    }

    const tolerance = 2;
    const outside = backgrounds.filter((rect) =>
      rect.left < editorRect.left - tolerance ||
      rect.top < editorRect.top - tolerance ||
      rect.right > editorRect.right + tolerance ||
      rect.bottom > editorRect.bottom + tolerance
    );

    return {
      ok: outside.length === 0,
      label: selectionLabel,
      editorRect: {
        left: Math.round(editorRect.left),
        top: Math.round(editorRect.top),
        right: Math.round(editorRect.right),
        bottom: Math.round(editorRect.bottom),
      },
      backgrounds: backgrounds.map((rect) => ({
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      })),
      outside: outside.map((rect) => ({
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      })),
    };
  }, label);

  if (!result.ok) {
    throw new Error(`Selection layout regression failed for ${label}: ${JSON.stringify(result, null, 2)}`);
  }
}

async function runEditorSelectionRegression(page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://127.0.0.1:5173');
  await page.waitForSelector('.cm-editor');

  const editor = page.locator('.cm-content').first();
  await editor.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type(editorFixture);
  await page.waitForTimeout(250);

  await page.keyboard.press('Control+Home');
  for (let i = 0; i < 9; i += 1) {
    await page.keyboard.press('Shift+ArrowRight');
  }
  await page.waitForTimeout(120);
  await assertSelectionBackgroundsInsideEditor(page, 'simple-selection');
  await page.screenshot({ path: path.join(outDir, 'editor_selection_simple.png') });

  await page.keyboard.press('Control+Home');
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press('ArrowDown');
  }
  await page.keyboard.press('Home');
  for (let i = 0; i < 45; i += 1) {
    await page.keyboard.press('Shift+ArrowRight');
  }
  await page.waitForTimeout(120);
  await assertSelectionBackgroundsInsideEditor(page, 'long-line-selection');
  await page.screenshot({ path: path.join(outDir, 'editor_selection_long_line.png') });

  await page.keyboard.press('Control+Home');
  for (let i = 0; i < 2; i += 1) {
    await page.keyboard.press('ArrowDown');
  }
  await page.keyboard.press('Home');
  for (let i = 0; i < 2; i += 1) {
    await page.keyboard.press('Shift+ArrowDown');
  }
  await page.waitForTimeout(120);
  await assertSelectionBackgroundsInsideEditor(page, 'multiline-selection');
  await page.screenshot({ path: path.join(outDir, 'editor_selection_multiline.png') });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.addInitScript(() => {
    window.DEBUG_SHOW_TITLEBAR = true;
  });

  await runEditorSelectionRegression(page);

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
