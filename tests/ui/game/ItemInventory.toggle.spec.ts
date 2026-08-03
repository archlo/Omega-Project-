import { describe, it, expect } from 'vitest';
import { Texture, Sprite } from 'pixi.js';
import { ItemInventory } from '../../../src/ui/game/ItemInventory.js';
import { Button } from '../../../src/ui/Button.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';
import { WzPackage } from '../../../src/wz/WzPackage.js';

// PixiJS `Text.width` measurement needs a canvas 2D context. In the Node
// test env there is no document/OffscreenCanvas, so provide a minimal shim
// that returns a fake 2D context whose measureText width scales with length.
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

// Regression: clicking BtSmall (minimize) did not re-collapse the panel because
// the invisible BtFull sat at the same (147,267) spot and swallowed the click
// before BtSmall — Button hit-testing ignored container.visible, and both
// toggle buttons were created at once instead of one per mode (OG behavior).
describe('ItemInventory expand/collapse toggle + meso', () => {
  function fakeIcons() {
    const texture = Texture.EMPTY;
    const fakeSprite = new Sprite(texture);
    return { LoadIcon: () => ({ Texture: texture, ToPixi: () => fakeSprite }) } as any;
  }

  it('invisible buttons do not handle clicks', () => {
    const b = new Button('x');
    let clicked = 0;
    b.onClick = () => clicked++;
    // Hidden button: click inside its default 120x28 bounds must be ignored.
    b.container.visible = false;
    b.handleMouseButton(10, 10, true);
    b.handleMouseButton(10, 10, false);
    expect(clicked).toBe(0);
    // Visible button: same click fires.
    b.container.visible = true;
    b.handleMouseButton(10, 10, true);
    b.handleMouseButton(10, 10, false);
    expect(clicked).toBe(1);
  });

  it('renders the meso counter in small mode (right-aligned, light color)', () => {
    const inv = new ItemInventory({ icons: fakeIcons() });
    inv.isVisible = true;
    inv.setMeso(1234567);
    const meso = inv['_mesoText'] as any;
    expect(meso.text).toBe('1,234,567');
    expect(meso.visible).toBe(true);
    expect(meso.y).toBe(268);
    // OG: x = 126 - CalcTextWidth(meso)
    expect(meso.x).toBe(126 - meso.width);
    // OG: FONT_NO_BLACK_SMALL — light glyphs on the panel's dark bottom strip.
    expect(meso.style.fill).toBe('#FFF');
  });

  it('expands and re-collapses via the real WZ toggle buttons', () => {
    const loader = new WzTextureLoader();
    const ui = WzPackage.OpenBase('wz_client', 'UI');
    const inv = new ItemInventory({ loader, uiWz: ui, icons: fakeIcons() });
    inv.isVisible = true;
    // OG button hit region: WZ origin (-147,-267) → panel-local (147,267).
    const clickToggle = () => {
      inv.handleMouseButton(370 + 147 + 8, 50 + 267 + 8, true);
      inv.handleMouseButton(370 + 147 + 8, 50 + 267 + 8, false);
    };
    expect(inv['_extended']).toBe(false);
    clickToggle(); // BtFull → expand
    expect(inv['_extended']).toBe(true);
    clickToggle(); // BtSmall → minimize
    expect(inv['_extended']).toBe(false);
  });
});
