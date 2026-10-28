// Makes the app icons from Inaara's face: node tools/make-icons.mjs (needs Playwright).
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { serve } from './serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const server = await serve(8093);
const browser = await chromium.launch();
const page = await browser.newPage();
const icons = [['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['maskable-512.png', 512, 1], ['apple-touch-icon.png', 180, 1]];
for (const [name, size, mask] of icons) {
  await page.goto(`http://localhost:8093/tools/icon.html?size=${size}&mask=${mask}`);
  await page.waitForFunction(() => document.title === 'done');
  const data = await page.evaluate(() => document.getElementById('c').toDataURL('image/png'));
  await writeFile(new URL(`../assets/icons/${name}`, import.meta.url), Buffer.from(data.split(',')[1], 'base64'));
  console.log('made', name);
}
await browser.close();
server.close();
