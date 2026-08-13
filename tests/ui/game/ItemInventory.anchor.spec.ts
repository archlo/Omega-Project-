import { describe, it, expect } from 'vitest';
import { Texture, Sprite } from 'pixi.js';
import { WzPackage } from '../../../src/wz/WzPackage.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';
import { ItemInventory } from '../../../src/ui/game/ItemInventory.js';

// PixiJS Text.width needs a canvas 2D context; provide the standard shim.
function installCanvasShim(): void {
  if ((globalThis as any).__mapleclaudeCanvasShim) return;
  (globalThis as any).__mapleclaudeCanvasShim = true;
  class Fake2DContext {
    _font = '';
    set font(v: string) { this._font = v; }
    get font() { return this._font; }
    letterSpacing = '0px';
    textLetterSpacing = '0px';
    measureText(text: string) {
      const width = String(text).length * 8;
      return {
        width,
        actualBoundingBoxAscent: 10,
        actualBoundingBoxDescent: 3,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: width,
        fontBoundingBoxAscent: 10,
        fontBoundingBoxDescent: 3,
        height: 13,
      };
    }
    fillText() {}
    strokeText() {}
    clearRect() {}
    fillRect() {}
    getImageData() { return { data: new Uint8ClampedArray(0), width: 0, height: 0 }; }
  }
  class FakeOffscreenCanvas {
    width = 0;
    height = 0;
    private _ctx: any;
    getContext(_kind: string) {
      if (!this._ctx) this._ctx = new Fake2DContext();
      return this._ctx;
    }
  }
  (globalThis as any).CanvasRenderingContext2D = Fake2DContext;
  (globalThis as any).OffscreenCanvas = FakeOffscreenCanvas;
  (globalThis as any).document = {
    createElement(tag: string) {
      if (tag === 'canvas') return new FakeOffscreenCanvas() as any;
      return {};
    },
  };
}
installCanvasShim();

// Regression: CUIItem::DrawItemIconForSlot anchors the item icon's WZ ORIGIN at the
// slot's BOTTOM-LEFT corner (Copy(x - cx, y - cy) with x = rcSlot.left,
// y = rcSlot.bottom), not centered. The current code was centering the icon by
// texture size, which offset every icon from its slot.
describe('ItemInventory item icon anchoring (DrawItemIconForSlot)', () => {
  function fakeIcons(originX = 0, originY = 0) {
    const texture = Texture.EMPTY;
    const fakeSprite = new Sprite(texture);
    fakeSprite.anchor.set(originX / 32, originY / 32);
    return { LoadIcon: () => ({ Texture: texture, ToPixi: () => fakeSprite, OriginX: originX, OriginY: originY }) } as any;
  }

  it('places the icon origin at the slot bottom-left (10, 51+32)', () => {
    const inv = new ItemInventory({ icons: fakeIcons(0, 32) });
    inv.isVisible = true;
    inv.applyOps([{ opType: 0, invType: 1, pos: 1, itemId: 1302000, quantity: 1 }]);

    const slot0 = inv['_slotBgs'][0] as any;
    const iconSpr = slot0.children.find((c: any) => c.anchor && c.anchor.y > 0);
    // OG: Copy(pCanvas, rcSlot.left - cx, rcSlot.bottom - cy) → origin at
    // (slot.left, slot.bottom) = (10, 51 + 32).
    expect(iconSpr.x).toBe(10);
    expect(iconSpr.y).toBe(51 + 32);
  });
});

describe('ItemInventory close button (CUIItem ctor type 5)', () => {
  function fakeIcons() {
    const texture = Texture.EMPTY;
    const fakeSprite = new Sprite(texture);
    return { LoadIcon: () => ({ Texture: texture, ToPixi: () => fakeSprite }) } as any;
  }

  it('uses BtClose3 (type 5) at (150, 6) collapsed', () => {
    const loader = new WzTextureLoader();
    const ui = WzPackage.OpenBase('wz_client', 'UI');
    const inv = new ItemInventory({ loader, uiWz: ui, icons: fakeIcons() });
    const btn = inv['_wndCloseBtn'] as any;
    expect(btn).not.toBeNull();
    expect(inv['_wndCloseType']).toBe(5);
    expect(inv['_wndCloseX']).toBe(150);
    expect(inv['_wndCloseY']).toBe(6);
    expect(btn.container.position.x).toBe(150);
    expect(btn.container.position.y).toBe(6);
    // WZ BtClose3 must load (NOT the fallback Graphics "X"): the panel close
    // button should be the 13x13 BtClose3 sprite.
    expect(ui.GetItem('Basic.img/BtClose3')).not.toBeNull();
    expect((btn.container.children[0] as any)?.__buttonInstance ?? btn.container.children.length).toBeGreaterThan(0);
  });

  it('moves the close button to (574, 6) when extended', () => {
    const inv = new ItemInventory({ icons: fakeIcons() });
    inv.isVisible = true;
    inv['_setExtended'](true);
    const btn = inv['_wndCloseBtn'] as any;
    expect(inv['_wndCloseX']).toBe(574);
    expect(btn.container.position.x).toBe(574);
    expect(btn.container.position.y).toBe(6);
  });
});

// Regression: CUIItem::OnCreate creates mode-dependent buttons — BtCoin always;
// extended → BtSmall + BtCashshop; collapsed → BtFull. BtCashshop must NOT
// exist in collapsed mode (its origin sits on the 594px extended panel).
describe('ItemInventory per-mode button visibility (CUIItem::OnCreate)', () => {
  function fakeIcons() {
    const texture = Texture.EMPTY;
    const fakeSprite = new Sprite(texture);
    return { LoadIcon: () => ({ Texture: texture, ToPixi: () => fakeSprite }) } as any;
  }

  // Return the rendered (origin-anchored) screen positions of all WZ buttons.
  function buttonPositions(inv: any): { name: string; x: number; y: number; w: number }[] {
    const out: { name: string; x: number; y: number; w: number }[] = [];
    for (const b of inv['_allButtons'] as any[]) {
      const spr = b.container.children[0] as any;
      if (!spr?.texture?.width) continue;
      const ox = -(spr.anchor.x * spr.texture.width);
      const oy = -(spr.anchor.y * spr.texture.height);
      out.push({ name: (b as any).__label ?? 'btn', x: ox, y: oy, w: spr.texture.width });
    }
    return out;
  }

  it('collapsed mode has BtFull (147,267) + BtCoin (9,267) + arrange (129,267), no BtCashshop', () => {
    const loader = new WzTextureLoader();
    const ui = WzPackage.OpenBase('wz_client', 'UI');
    const inv = new ItemInventory({ loader, uiWz: ui, icons: fakeIcons() });
    inv.isVisible = true;
    const pos = buttonPositions(inv);
    const widths = pos.map(p => p.w).sort((a, b) => a - b);
    // 16px (BtFull) + 16px (BtGather) + 40px (BtCoin) — no 82px BtCashshop.
    expect(widths).toEqual([16, 16, 40]);
    expect(pos.find(p => p.x === 147 && p.y === 267)).toBeTruthy(); // BtFull
    expect(pos.find(p => p.x === 9 && p.y === 267)).toBeTruthy();    // BtCoin
    expect(pos.find(p => p.x === 129 && p.y === 267)).toBeTruthy();  // BtGather
  });

  it('extended mode adds BtCashshop (502,267) and swaps BtFull for BtSmall', () => {
    const loader = new WzTextureLoader();
    const ui = WzPackage.OpenBase('wz_client', 'UI');
    const inv = new ItemInventory({ loader, uiWz: ui, icons: fakeIcons() });
    inv.isVisible = true;
    inv['_setExtended'](true);
    const pos = buttonPositions(inv);
    const widths = pos.map(p => p.w).sort((a, b) => a - b);
    expect(widths).toEqual([16, 16, 40, 82]);
    expect(pos.find(p => p.x === 502 && p.y === 267)).toBeTruthy(); // BtCashshop
    expect(pos.find(p => p.x === 9 && p.y === 267)).toBeTruthy();   // BtCoin
    expect(pos.find(p => p.x === 129 && p.y === 267)).toBeTruthy(); // BtGather
    expect(inv['_btFull']).toBeNull();
    expect(inv['_btSmall']).not.toBeNull();
  });

  it('meso quantity renders white on the panel bottom strip (y=268)', () => {
    const inv = new ItemInventory({ icons: fakeIcons() });
    inv.isVisible = true;
    inv.setMeso(1234567);
    const m = inv['_mesoText'] as any;
    expect(m.text).toBe('1,234,567');
    expect(m.visible).toBe(true);
    expect(m.y).toBe(268);
    // Right-aligned ending at x=126 (OG: 126 - CalcTextWidth).
    expect(m.x).toBe(126 - m.width);
  });
});
