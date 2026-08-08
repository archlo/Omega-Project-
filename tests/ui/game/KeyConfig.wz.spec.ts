import { describe, it, expect } from 'vitest';
import { KeyConfig } from '../../../src/ui/game/KeyConfig.js';
import { WzPackage } from '../../../src/wz/WzPackage.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';

(globalThis as any).window ??= {};

// OG CUIKeyConfig::OnCreate @0x7dc5d0: all five buttons are added via
// CLayoutMan::AddButton(path, nId, 0, 0) — layout offset (0,0). The WZ canvas
// origin (negative, e.g. BtOK (-526,-239)) is baked into WzSprite's anchor, so
// a button whose container sits at (0,0) is *drawn* at 0 - origin = (526,239).
// This mirrors the ChannelSelect (CUIChannelShift) convention: container pos =
// the layout offset, Button.fromDevice renders at (pos - origin).
//
// Regression guard: never place the container at the negation of the WZ origin
// (that was the previous bug — it double-offset the buttons off the 622px panel).
describe('KeyConfig WZ-origin buttons (real UI.nx)', () => {
  const ui = WzPackage.OpenBase('wz_client', 'UI');
  const loader = new WzTextureLoader();

  const expected = [
    // AddButton path suffix + private field name → WZ canvas origin → drawn top-left at -origin
    ['BtOK', '_btOk', { x: 526, y: 239, w: 40, h: 16 }],
    ['BtCancel', '_btCancel', { x: 572, y: 239, w: 40, h: 16 }],
    ['BtDefault', '_btDefault', { x: 10, y: 239, w: 57, h: 16 }],
    ['BtDelete', '_btDelete', { x: 73, y: 239, w: 68, h: 16 }],
    ['BtQuickSlot', '_btQuickSlot', { x: 147, y: 239, w: 93, h: 16 }],
  ] as const;

  const keyConfig = new KeyConfig(loader, ui, null);
  keyConfig.isVisible = true;
  keyConfig.update(0);

  it.each(expected)('(%s) container stays at the (0,0) layout offset', (_name, field) => {
    const btn = keyConfig[field] as { container: { x: number; y: number } } | null;
    expect(btn).not.toBeNull();
    expect(btn!.container.x).toBe(0);
    expect(btn!.container.y).toBe(0);
  });

  it('draws each button sprite exactly at its WZ origin cell, inside the 622px panel', () => {
    for (const [_name, field, cell] of expected) {
      const bounds = (keyConfig[field] as { bounds: { x: number; y: number; width: number; height: number } }).bounds;
      expect(bounds.x, `${_name} left`).toBe(cell.x);
      expect(bounds.y, `${_name} top`).toBe(cell.y);
      expect(bounds.width, `${_name} width`).toBe(cell.w);
      expect(bounds.height, `${_name} height`).toBe(cell.h);
      // all buttons must be on-panel (panel is 622 wide, 374 high)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(622);
    }
  });

  it('hit-tests OK/Cancel/Default exactly over their origin cells', () => {
    for (const [_name, field, cell] of expected) {
      const btn = keyConfig[field] as { container: { x: number; y: number }; hitTest(x: number, y: number): boolean };
      const cx = btn.container.x + cell.x + 5; // a point inside the button rect
      const cy = btn.container.y + cell.y + 5;
      expect(btn.hitTest(cx, cy), `${_name} hit`).toBe(true);
    }
  });
});