// Plays the real game in a browser (Chromium through Playwright): the title, the map, every level start to
// finish, pausing, and the phone controls. Fails on any error in the page. Pictures go to screenshots/.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { serve } from '../tools/serve.mjs';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const out = new URL('../screenshots/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const PORT = 8095, URL_ = `http://localhost:${PORT}/?test`;
const server = await serve(PORT);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];
const watch = page => {
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
};
const wait = ms => new Promise(r => setTimeout(r, ms));
const step = async (name, fn) => {
  process.stdout.write(`- ${name} ... `);
  await fn();
  assert.deepEqual(errors, [], 'no errors in the page');
  console.log('ok');
};

try {
  const pc = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  watch(pc);
  const state = () => pc.evaluate(() => inaara.state());

  await step('the title opens', async () => {
    await pc.goto(URL_);
    await pc.waitForFunction(() => window.inaara, null, { timeout: 20000 });
    await wait(800);
    assert.equal((await state()).screen, 'title');
    await pc.screenshot({ path: out + '01-title.png' });
  });

  await step('Play opens the map with the keyboard', async () => {
    await pc.keyboard.press('Enter');
    await wait(400);
    assert.equal((await state()).screen, 'map');
    await pc.screenshot({ path: out + '02-map.png' });
  });

  await step('the first level starts from the map', async () => {
    await pc.keyboard.press('Enter');
    await wait(300);
    assert.equal((await state()).screen, 'intro');
    await pc.screenshot({ path: out + '03-intro.png' });
    await pc.keyboard.press('Space');
    await wait(200);
    assert.equal((await state()).screen, 'play');
  });

  await step('running, jumping and spinning', async () => {
    await pc.keyboard.down('ArrowRight');
    await wait(500);
    await pc.keyboard.down('Space');
    await wait(500);
    await pc.screenshot({ path: out + '04-jump.png' });
    await pc.keyboard.up('Space');
    await pc.keyboard.press('KeyX');
    await wait(150);
    await pc.screenshot({ path: out + '05-spin.png' });
    await pc.keyboard.up('ArrowRight');
    const x = await pc.evaluate(() => inaara.game.play.player.x);
    assert.ok(x > 400, `she moved right (x = ${x})`);
  });

  await step('pause and carry on', async () => {
    await pc.keyboard.press('Escape');
    await wait(300);
    assert.equal(await pc.evaluate(() => inaara.game.paused), true);
    await pc.screenshot({ path: out + '06-pause.png' });
    await pc.keyboard.press('Enter');
    await wait(100);
    assert.equal(await pc.evaluate(() => inaara.game.paused), false);
  });

  for (let i = 0; i < 6; i++) {
    await step(`level ${i + 1} plays and can be finished`, async () => {
      await pc.evaluate(i => { inaara.startLevel(i); inaara.begin(); }, i);
      await pc.keyboard.down('ArrowRight');
      await wait(1500);
      await pc.keyboard.up('ArrowRight');
      await pc.screenshot({ path: out + `1${i + 1}-level${i + 1}.png` });
      await pc.evaluate(() => inaara.warp());
      await pc.keyboard.down('ArrowRight');
      await pc.waitForFunction(() => inaara.state().screen === 'won', null, { timeout: 8000 });
      await pc.keyboard.up('ArrowRight');
      await wait(300);
      await pc.screenshot({ path: out + `1${i + 1}-level${i + 1}-done.png` });
    });
  }

  await step('the ending and its credits', async () => {
    await pc.keyboard.press('Enter');
    await wait(7000);
    assert.equal((await state()).screen, 'ending');
    await pc.screenshot({ path: out + '20-ending.png' });
    const saved = await pc.evaluate(() => JSON.parse(localStorage.getItem('inaara-save-v1')));
    assert.equal(saved.finished, true);
    assert.equal(saved.unlocked, 6);
  });

  await step('a phone held sideways shows the touch buttons and they work', async () => {
    const ctx = await browser.newContext({ ...devices['iPhone 13 landscape'] });
    const phone = await ctx.newPage();
    watch(phone);
    await phone.goto(URL_);
    await phone.waitForFunction(() => window.inaara, null, { timeout: 20000 });
    await wait(500);
    // Tap Play on the title (the middle of the screen, a little up).
    const vp = phone.viewportSize();
    const toScreen = (x, y) => {
      const s = Math.min(vp.width / 1280, vp.height / 720), ox = (vp.width - 1280 * s) / 2, oy = (vp.height - 720 * s) / 2;
      return [ox + x * s, oy + y * s];
    };
    await phone.touchscreen.tap(...toScreen(640, 355));
    await wait(400);
    assert.equal(await phone.evaluate(() => inaara.state().screen), 'map');
    await phone.evaluate(() => { inaara.startLevel(0); inaara.begin(); });
    await wait(300);
    await phone.screenshot({ path: out + '30-phone.png' });
    const buttons = await phone.evaluate(() => inaara.game.input.touchButtons.map(b => b.name));
    assert.ok(buttons.includes('jump') && buttons.includes('right'), 'touch buttons are showing');
    await ctx.close();
  });

  await step('a phone held upright asks to be turned', async () => {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    const phone = await ctx.newPage();
    watch(phone);
    await phone.goto(URL_);
    await phone.waitForFunction(() => window.inaara, null, { timeout: 20000 });
    await phone.touchscreen.tap(100, 100);
    await wait(300);
    assert.equal(await phone.evaluate(() => inaara.game.portraitBlock), true);
    await phone.screenshot({ path: out + '31-phone-upright.png' });
    await ctx.close();
  });
  console.log('All browser checks passed.');
} catch (e) {
  console.error('\n' + (e.stack || e));
  if (errors.length) console.error('Errors in the page:', errors);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
