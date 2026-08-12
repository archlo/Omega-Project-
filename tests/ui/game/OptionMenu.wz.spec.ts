import { describe, it, expect } from 'vitest';
import { WzPackage } from '../../../src/wz/WzPackage.js';
import { WzProperty } from '../../../src/wz/WzProperty.js';
import { WzCanvas } from '../../../src/wz/WzCanvas.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';
import { OptionMenu } from '../../../src/ui/game/OptionMenu.js';

(globalThis as any).window ??= { innerWidth: 800, innerHeight: 600 };

describe('OptionMenu WZ parity (real UI.nx)', () => {
  const nx = process.env.MAPLECLAUDE_NX_DIR;
  if (!nx) {
    it('skipped', () => console.log('MAPLECLAUDE_NX_DIR not set'));
    return;
  }
  it('loads the authentic CUISysOpt assets from UI.nx', () => {
    const ui = WzPackage.Open(`${nx}/UI.nx`);
    const sysOpt = ui.GetItem('UIWindow2.img/SysOpt');
    expect(sysOpt).toBeInstanceOf(WzProperty);

    // backgrnd 283x419 + backgrnd2 271x365 (content layer)
    const bg = (sysOpt as WzProperty).Get('backgrnd');
    const bg2 = (sysOpt as WzProperty).Get('backgrnd2');
    expect(bg).toBeInstanceOf(WzCanvas);
    expect(bg2).toBeInstanceOf(WzCanvas);
    expect((bg as WzCanvas).Width).toBe(283);
    expect((bg as WzCanvas).Height).toBe(419);
    expect((bg2 as WzCanvas).Width).toBe(271);
    expect((bg2 as WzCanvas).Height).toBe(365);

    // BtOK / BtCancle 40x16 buttons
    const btOk = (sysOpt as WzProperty).Get('BtOK');
    const btCan = (sysOpt as WzProperty).Get('BtCancle');
    expect(btOk).toBeInstanceOf(WzProperty);
    expect(btCan).toBeInstanceOf(WzProperty);

    // slider thumbs scroll/0..3 (28x11)
    const scroll = (sysOpt as WzProperty).Get('scroll') as WzProperty;
    for (let i = 0; i < 4; i++) {
      const c = scroll.Get(String(i));
      expect(c).toBeInstanceOf(WzCanvas);
      expect((c as WzCanvas).Width).toBe(28);
      expect((c as WzCanvas).Height).toBe(11);
    }

    // checkbox glyphs Basic.img/CheckBox/0..3 (11x11)
    const cb = ui.GetItem('Basic.img/CheckBox') as WzProperty;
    expect(cb).toBeInstanceOf(WzProperty);
    for (let i = 0; i < 4; i++) {
      const c = cb.Get(String(i));
      expect(c).toBeInstanceOf(WzCanvas);
      expect((c as WzCanvas).Width).toBe(11);
      expect((c as WzCanvas).Height).toBe(11);
    }

    // loadWz should wire the background, buttons, and glyphs without throwing
    const panel = new OptionMenu();
    panel.loadWz(new WzTextureLoader(), ui as any);
    expect(panel['_bg']).not.toBeNull();
    expect(panel['_bg2']).not.toBeNull();
    expect(panel['_btOk']).not.toBeNull();
    expect(panel['_btCancel']).not.toBeNull();
    expect(panel['_knob'].length).toBe(4);
    expect(panel['_checkGlyphs'].length).toBe(4);

    // BtOK origin (-99,-392) → button placed at (99,392); BtCancle → (144,392)
    const okB = panel['_btOk']!.bounds;
    expect(okB.x).toBe(99);
    expect(okB.y).toBe(392);
    const canB = panel['_btCancel']!.bounds;
    expect(canB.x).toBe(144);
    expect(canB.y).toBe(392);
  });
});
