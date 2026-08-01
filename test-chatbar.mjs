import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });

// Navigate to the game client
await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
console.log('Page loaded, waiting for canvas to appear...');

// Wait for the PixiJS canvas to render
await page.waitForSelector('canvas', { timeout: 30000 });
console.log('Canvas found, waiting for game to initialize...');

// Give the game time to fully initialize (login screen, load assets, etc.)
await page.waitForTimeout(5000);

// Screenshot the initial state
await page.screenshot({ path: 'chatbar-test/01-initial.png', fullPage: false });
console.log('Screenshot 1: Initial state saved');

// Check if there are any console errors
const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});

// Wait a bit more for game to load
await page.waitForTimeout(3000);

// Try to find the canvas and check its dimensions
const canvasInfo = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return null;
  return {
    width: canvas.width,
    height: canvas.height,
    style: canvas.style.cssText,
    offsetWidth: canvas.offsetWidth,
    offsetHeight: canvas.offsetHeight
  };
});
console.log('Canvas info:', JSON.stringify(canvasInfo, null, 2));

// Check if we need to click to start or login
await page.screenshot({ path: 'chatbar-test/02-after-wait.png', fullPage: false });
console.log('Screenshot 2: After 8s wait saved');

// Try clicking in the center to interact with the game
await page.mouse.click(512, 384);
await page.waitForTimeout(2000);
await page.screenshot({ path: 'chatbar-test/03-after-click.png', fullPage: false });
console.log('Screenshot 3: After click saved');

// Check for any visible text on the page (login screen elements)
const pageText = await page.evaluate(() => {
  return document.body?.innerText || '';
});
console.log('Page text content (first 500 chars):', pageText.substring(0, 500));

// Log console errors
if (errors.length > 0) {
  console.log('Console errors:', errors);
}

console.log('\nDone! Check chatbar-test/ folder for screenshots.');
console.log('Browser will stay open - press Ctrl+C to close.');
