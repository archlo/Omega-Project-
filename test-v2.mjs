import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(5000);
  
  // Login
  await page.click('canvas');
  await page.waitForTimeout(500);
  await page.keyboard.type('admin');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(200);
  await page.keyboard.type('admin');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(5000);
  
  // Navigate to game
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(5000);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(8000);
  
  // Take screenshot
  await page.screenshot({ path: 'test-screenshots/minimap-v2.png' });
  
  // Move right
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(2000);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'test-screenshots/minimap-v2-moved.png' });
  
  // Check state
  const state = await page.evaluate(() => {
    const game = globalThis.__game;
    const stage = game.stageDirector?._current;
    const mm = stage._miniMap;
    return {
      stageName: stage.constructor.name,
      hasMiniMap: !!mm,
      playerPos: mm?.playerWorldPos,
      physicsPos: stage._physics?.Position,
    };
  });
  
  console.log('State:', state);
  
  await browser.close();
}

test().catch(console.error);
