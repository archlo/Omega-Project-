import { test, expect } from '@playwright/test';

test.describe('Phase 13: Map Rendering Completeness', () => {
  test('map loads and renders tile layers', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Wait for the game to load (wait for canvas to appear)
    await page.waitForSelector('canvas', { timeout: 30000 });
    
    // Check that canvas is visible and has content
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Check canvas has non-zero dimensions
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(canvasBox!.width).toBeGreaterThan(0);
    expect(canvasBox!.height).toBeGreaterThan(0);
    
    // Take a screenshot for visual verification
    await page.screenshot({ path: 'test-results/map-rendering.png', fullPage: true });
  });

  test('map shows tile layers', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('canvas', { timeout: 30000 });
    
    // Check that map background is rendered (non-transparent pixels)
    const canvas = page.locator('canvas');
    const canvasElement = await canvas.elementHandle();
    
    // Check canvas has been drawn to (not just cleared)
    const hasContent = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Check if any pixel is non-transparent
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 0) return true;
      }
      return false;
    });
    
    expect(hasContent).toBe(true);
  });
});