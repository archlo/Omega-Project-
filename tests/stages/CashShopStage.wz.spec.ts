import { describe, expect, it } from 'vitest';
import { CashShopStage } from '../../src/stages/CashShopStage.js';
import { WzPackage } from '../../src/wz/WzPackage.js';
import { WzTextureLoader } from '../../src/render/WzTextureLoader.js';

// Integration test against the real v95 UI.nx. Verifies the authentic
// CashShop.img asset wiring (Base/backgrnd, CSTab/Tab/1-9, CSList/Base,
// CSStatus buttons, CSDiscount digits) actually resolves — same pattern as
// QuestLog.wz.spec.ts / ItemInventory.toggle.spec.ts.
describe('CashShopStage WZ asset resolution (real UI.nx)', () => {
  it('loads background, tabs, plates, buttons and discount digits from UI.nx', () => {
    (globalThis as any).window ??= {};
    const ui = WzPackage.OpenBase('wz_client', 'UI');
    const stage = new CashShopStage(ui) as any;
    stage._loader = new WzTextureLoader();
    stage._loadAssets();

    // Full-screen 800x600 background
    expect(stage._bg).not.toBeNull();
    expect(stage._bg.Width).toBe(800);
    expect(stage._bg.Height).toBe(600);

    // 9 tab canvases (508x78 each)
    expect(stage._tabSprites).toHaveLength(9);
    expect(stage._tabSprites.every((s: any) => s !== null)).toBe(true);
    expect(stage._tabSprites[0].Width).toBe(508);
    expect(stage._tabSprites[0].Height).toBe(78);

    // Item plate background (200x80)
    expect(stage._bgList).not.toBeNull();
    expect(stage._bgList.Width).toBe(200);
    expect(stage._bgList.Height).toBe(80);

    // Status bar buttons
    expect(stage._btExit).not.toBeNull();
    expect(stage._btCharge).not.toBeNull();

    // Discount digit sprites (0-9)
    expect(stage._discountDigits).toHaveLength(10);
    expect(stage._discountDigits.every((d: any) => d !== null)).toBe(true);

    // Character preview backgrounds (3 job variants)
    expect(stage._previewBgs).toHaveLength(3);
    expect(stage._previewBgs.every((p: any) => p !== null)).toBe(true);
  });
});
