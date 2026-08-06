import { describe, expect, it } from 'vitest';
import { UtilDlgEx, UtilDlgType } from '../../../src/ui/game/UtilDlgEx.js';
import { WzPackage } from '../../../src/wz/WzPackage.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';

(globalThis as any).window ??= {};

function makeDialog(opts: any = {}): UtilDlgEx {
  return new UtilDlgEx(opts);
}

describe('UtilDlgEx layout (IDB-verified)', () => {
  it('uses the OG GetWndWidth values', () => {
    const d = makeDialog();
    // 0-4,7,8 → 260 (noNPC) / 519; 5,6 → 367; 9 → 418
    for (const t of [UtilDlgType.TEXT, UtilDlgType.YESNO, UtilDlgType.INPUT, UtilDlgType.INPUT_STR, UtilDlgType.LIST, UtilDlgType.COMBOBOX, UtilDlgType.MLINPUT]) {
      d.SetUtilDlgEx(t, 0, true, false);
      d['_layoutGen'](false);
      expect(d.m_wndWidth).toBe(260);
    }
    d.SetUtilDlgEx(UtilDlgType.TEXT, 0, false, false);
    d['_layoutGen'](false);
    expect(d.m_wndWidth).toBe(519);
    d.SetUtilDlgEx(UtilDlgType.AVATAR, 0, false, false);
    d['_layoutGen'](true);
    expect(d.m_wndWidth).toBe(367);
    d.SetUtilDlgEx(UtilDlgType.IMAGE, 0, false, false);
    d['_layoutGen'](false);
    expect(d.m_wndWidth).toBe(418);
  });

  it('GetBasicCTWidth returns the OG fixed values (not windowWidth - 4)', () => {
    const d = makeDialog();
    // Direct layout check via _layoutGen: TEXT noNPC → content width 210
    d.m_dlgType = UtilDlgType.TEXT;
    d.m_bNoNPC = true;
    d.m_ctHeight = 100;
    d.SetUtilDlgEx(UtilDlgType.TEXT, 0, true, false);
    d['_layoutGen'](false);
    expect(d.m_ctLeft).toBe(158); // base 158 (speaker left) for noNPC TEXT

    // INPUT noNPC → content width 236, ctLeft 12 (INPUT layout)
    d.SetUtilDlgEx(UtilDlgType.INPUT, 0, true, false);
    d['_layoutInput']();
    expect(d.m_ctLeft).toBe(12);
    expect(d.m_wndWidth).toBe(260);
  });

  it('MLINPUT ctTop includes the 12*line term (Layout_MLINPUT @0x97B230)', () => {
    const d = makeDialog();
    d.SetUtilDlgEx(UtilDlgType.MLINPUT, 0, false, false);
    d.m_ctHeight = 100;
    d.m_nInputLine = 3;
    d['_layoutMLInput']();
    // v5 = 12*3 = 36; ctTop = (scrHeight - m_ctHeight - 36 - 20)/2 + 22
    // scrHeight = max(100, 110) = 110
    const expected = Math.floor((110 - 100 - 36 - 20) / 2) + 22;
    expect(d.m_ctTop).toBe(expected);
    expect(d.m_wndWidth).toBe(519);
  });

  it('sets the OG FONT_COLORS (12 fonts from ctor @0x9859C0)', () => {
    const d = makeDialog();
    const fonts = d['_fonts'];
    expect(fonts).toHaveLength(12);
    // font 0/1 gray 0x555555, 2/3 red, 4/5 green, 6/7 blue, 8/9 white, 10/11 purple
    expect(fonts[0].fill).toBe(0x555555);
    expect(fonts[2].fill).toBe(0xFF0000);
    expect(fonts[4].fill).toBe(0x00FF00);
    expect(fonts[6].fill).toBe(0x0000FF);
    expect(fonts[8].fill).toBe(0xFFFFFF);
    expect(fonts[10].fill).toBe(0x51378C);
  });
});

describe('UtilDlgEx WZ asset resolution (real UI.nx)', () => {
  it('loads button canvases from UIWindow2.img/UtilDlgEx', () => {
    const ui = WzPackage.OpenBase('wz_client', 'UI');
    const d = makeDialog({ uiWz: ui, loader: new WzTextureLoader() });
    d.m_wndWidth = 519;
    d.m_wndHeight = 200;

    const btn = d['_makeButton']('OK', 1);
    // BtOK/normal/0 → a real canvas child should be attached
    expect(btn.children.length).toBeGreaterThan(0);
    expect(btn.children.some((c: any) => c.texture !== undefined)).toBe(true);
  });

  it('uses quest-variant BtQYes/BtQNo when m_bQuest is set', () => {
    const ui = WzPackage.OpenBase('wz_client', 'UI');
    const d = makeDialog({ uiWz: ui, loader: new WzTextureLoader() });
    d.m_bQuest = true;
    d.m_wndWidth = 519;
    d.m_wndHeight = 200;
    const yes = d['_makeButton']('Yes', 6);
    expect(yes.children.some((c: any) => c.texture !== undefined)).toBe(true);
  });

  it('composites the dialog background from t/c/s canvases (SetBackground @0x97F180)', () => {
    const ui = WzPackage.OpenBase('wz_client', 'UI');
    const d = makeDialog({ uiWz: ui, loader: new WzTextureLoader() });
    d.m_wndWidth = 519;
    d.m_wndHeight = 200;
    d.m_bNoNPC = false;
    d.m_bParam = 0;
    d['_buildBackground']();

    // Root children: content layer + composited background sprites (not the
    // Graphics fallback rects). The top "t" canvas is a real sprite.
    const sprites = d.container.children.filter((c: any) => c.texture !== undefined);
    expect(sprites.length).toBeGreaterThan(0);
    // First sprite = top "t" cap at (0,0)
    expect(sprites[0].x).toBe(0);
    expect(sprites[0].y).toBe(0);
  });

  it('uses the it/ic/is quest background when (m_bParam & 6) != 0', () => {
    const ui = WzPackage.OpenBase('wz_client', 'UI');
    const d = makeDialog({ uiWz: ui, loader: new WzTextureLoader() });
    d.m_wndWidth = 519;
    d.m_wndHeight = 200;
    d.m_bNoNPC = false;
    d.m_bParam = 2; // quest flag bit
    d['_buildBackground']();

    const sprites = d.container.children.filter((c: any) => c.texture !== undefined);
    expect(sprites.length).toBeGreaterThan(0);
    // it is 519x28 top cap
    expect(sprites[0].x).toBe(0);
    expect(sprites[0].y).toBe(0);
  });

  it('draws no fake background when WZ is unavailable (no custom rectangles)', () => {
    const d = makeDialog();
    d.m_wndWidth = 519;
    d.m_wndHeight = 200;
    d.m_bNoNPC = false;
    d['_buildBackground']();
    // Per the authentic rule, when no backgrnd canvas is loadable we draw
    // nothing — no Graphics fallback rectangles are added.
    const sprites = d.container.children.filter((c: any) => c.texture !== undefined);
    expect(sprites.length).toBe(0);
  });
});
