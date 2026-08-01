import { chromium } from 'playwright';

const SCREENSHOT_DIR = 'test-screenshots';

export async function launchAndLogin() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('404')) {
      console.log('  [error]', msg.text());
    }
  });
  
  console.log('Navigating to game...');
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(5000);
  
  console.log('Logging in as admin...');
  await page.click('canvas');
  await page.waitForTimeout(500);
  await page.keyboard.type('admin');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(200);
  await page.keyboard.type('admin');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(5000);
  
  console.log('Selecting first world...');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  
  console.log('Selecting CH1...');
  await page.click('canvas', { position: { x: 500, y: 340 } });
  await page.waitForTimeout(3000);
  
  console.log('Selecting first character...');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/before-char.png` });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/after-char.png` });
  
  // If still on char select, try clicking on first character slot
  const stillOnChar = await page.evaluate(() => {
    const game = globalThis.__game;
    const stage = game?.stageDirector?._current;
    return stage?.constructor.name;
  });
  
  if (stillOnChar === 'CharSelectStage') {
    console.log('Still on char select, trying to click first slot...');
    await page.click('canvas', { position: { x: 400, y: 350 } });
    await page.waitForTimeout(2000);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(8000);
  }
  
  const state = await page.evaluate(() => {
    const game = globalThis.__game;
    const stage = game?.stageDirector?._current;
    return {
      stageName: stage?.constructor.name,
      hasMiniMap: !!stage?._miniMap,
    };
  });
  
  console.log(`State: ${state.stageName}, MiniMap: ${state.hasMiniMap}`);
  return { browser, page };
}

export async function getGameState(page) {
  return await page.evaluate(() => {
    const game = globalThis.__game;
    const stage = game?.stageDirector?._current;
    if (!stage) return { error: 'No stage' };
    
    const miniMap = stage._miniMap;
    return {
      stageName: stage.constructor.name,
      hasMiniMap: !!miniMap,
      miniMap: miniMap ? {
        mode: miniMap._mode,
        miniMapType: miniMap._miniMapType,
        isVisible: miniMap.isVisible,
        hasData: !!miniMap._data,
        fieldId: miniMap._fieldId,
        showMiniMap: miniMap._showMiniMap,
        mapName: miniMap._mapName,
        streetName: miniMap._streetName,
      } : null,
    };
  });
}

export async function screenshot(page, name) {
  const { mkdirSync } = await import('fs');
  try { mkdirSync(SCREENSHOT_DIR, { recursive: true }); } catch {}
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png` });
  console.log(`Screenshot: ${SCREENSHOT_DIR}/${name}.png`);
}

if (process.argv[1]?.endsWith('login-helper.mjs')) {
  const { browser, page } = await launchAndLogin();
  const state = await getGameState(page);
  console.log('Game state:', JSON.stringify(state, null, 2));
  await screenshot(page, 'login-helper-result');
  console.log('Browser open - press Ctrl+C to close');
  await new Promise(() => {});
}
