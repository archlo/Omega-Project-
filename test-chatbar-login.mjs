import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });

await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(5000);

const canvas = await page.$('canvas');
await canvas?.click();
await page.waitForTimeout(500);

const fi = await page.evaluate(() => {
  const g = globalThis.__game;
  return { scale: g.frameScale, fx: g.frameContainer.x, fy: g.frameContainer.y };
});
function toScreen(fx, fy) { return { x: fx * fi.scale + fi.fx, y: fy * fi.scale + fi.fy }; }

let p = toScreen(351, 278); await page.mouse.click(p.x, p.y); await page.waitForTimeout(200);
await page.keyboard.type('admin', { delay: 50 });
p = toScreen(351, 302); await page.mouse.click(p.x, p.y); await page.waitForTimeout(200);
await page.keyboard.type('admin', { delay: 50 });
await page.keyboard.press('Enter');
await page.waitForTimeout(4000);
await page.keyboard.press('Enter'); await page.waitForTimeout(3000);
await page.keyboard.press('Enter'); await page.waitForTimeout(3000);
await page.keyboard.press('Enter'); await page.waitForTimeout(5000);

let stage = await page.evaluate(() => globalThis.__game?.stageDirector?._current?.constructor?.name);
if (stage !== 'GameStage') { console.log('Not in game'); process.exit(0); }
await page.waitForTimeout(3000);

// Check state
const state = await page.evaluate(() => {
  const bar = globalThis.__game.stageDirector._current._chatBar;
  return {
    chatType: bar._chatType,
    chatHeight: bar._chatHeight,
    chatWndY: bar._chatWndY,
    bgVisible: bar._bg?.visible,
    inputBgVisible: bar._inputBg?.visible,
    comboBgVisible: bar._comboBg?.visible,
    layerSpace: !!bar._layerSpace,
    layerEnter: !!bar._layerEnter,
    comboSprite: !!bar._comboSprite,
    comboLabel: bar._comboLabel?.text,
  };
});
console.log('State:', JSON.stringify(state, null, 2));

// Focus and type
await page.evaluate(() => globalThis.__game.stageDirector._current._chatBar.focus());
await page.waitForTimeout(300);
await page.keyboard.type('Hello World!', { delay: 40 });
await page.keyboard.press('Enter');
await page.waitForTimeout(500);

await page.screenshot({ path: 'chatbar-test/v8-01-game.png', fullPage: false });
await page.screenshot({ path: 'chatbar-test/v8-02-bottom.png', clip: { x: 0, y: 400, width: 1024, height: 368 } });

let final = await page.evaluate(() => {
  const bar = globalThis.__game.stageDirector._current._chatBar;
  return {
    chatType: bar._chatType,
    chatWndY: bar._chatWndY,
    stored: bar._chatLog?.length,
    lastLine: bar._chatLog?.[bar._chatLog.length - 1]?.text,
  };
});
console.log('Final:', JSON.stringify(final, null, 2));

console.log('\nDone!');
