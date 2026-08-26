import { describe, expect, it } from 'vitest';
import { UtilDlgEx, UtilDlgType } from '../../../src/ui/game/UtilDlgEx.js';
import { WzPackage } from '../../../src/wz/WzPackage.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';
(globalThis as any).window ??= {};

function makeDialog(opts: any = {}): UtilDlgEx {
  return new UtilDlgEx(opts);
}

// Text.width measurement needs a canvas 2D context; provide the minimal shim.
function installCanvasShim(): void {
  if ((globalThis as any).__mapleclaudeCanvasShim) return;
  (globalThis as any).__mapleclaudeCanvasShim = true;
  class Fake2DContext {
    measureText(text: string) {
      const width = String(text).length * 8;
      return { width, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3 };
    }
  }
  const makeCanvas = (): any => ({ getContext: () => new Fake2DContext(), width: 300, height: 100 });
  (globalThis as any).CanvasRenderingContext2D ??= class {};
  (globalThis as any).document ??= {
    createElement: (tag: string) => (tag === 'canvas' ? makeCanvas() : {}),
    createElementNS: (_ns: unknown, tag: string) => (tag === 'canvas' ? makeCanvas() : {}),
  };
}
installCanvasShim();

// OG CTextAnalyzer tag subset used by ShowAutoStartQuestList's message:
// "#d#L%d# %s#l#k\r\n" rows (StringPool 3236) and "#fUI/.../listN#" banners
// (SP6589/6590/6591 — bracket-less paths).
describe('UtilDlgEx text analyzer tags (CTextAnalyzer subset)', () => {
  it('parses #L<n># ... #l# into selectable list rows collected by SetUtilDlgEx_LIST', () => {
    const d = makeDialog();
    d.SetUtilDlgEx(UtilDlgType.LIST, 9010023, false, false,
      'base\r\n\r\n#fUI/UIWindow2.img/UtilDlgEx/list1#\r\n' +
      '#d#L0# First Quest (Low Level Quest)#l#k\r\n#d#L1# Second Quest#l#k\r\n');
    d.SetUtilDlgEx_LIST(true);
    void d.show();
    const rows = (d as unknown as { _apListCT: { nSelect: number; sText: string }[] })._apListCT;
    // SP3236 "#d#L%d# %s#l#k" — the space before %s lands in the row text.
    expect(rows.map((r) => [r.nSelect, r.sText.trim()])).toEqual([
      [0, 'First Quest (Low Level Quest)'],
      [1, 'Second Quest'],
    ]);
  });

  it('parses the bracket-less #f<path># banners into icon lines', () => {
    const d = makeDialog();
    d.SetUtilDlgEx(UtilDlgType.LIST, 0, false, false,
      '#fUI/UIWindow2.img/UtilDlgEx/list3#\r\nplain\r\n');
    const lines = (d as unknown as {
      _lines: { nType: number; _iconPath?: string; sText: string }[];
    })._lines;
    expect(lines[0].nType).toBe(2);
    expect(lines[0]._iconPath).toBe('UI/UIWindow2.img/UtilDlgEx/list3');
    expect(lines.some((l) => l.nType === 0 && l.sText === 'plain')).toBe(true);
  });
});

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

    // Background layer holds the composited sprites (t cap + c tiles + s cap).
    const sprites = d['_bgLayer'].children.filter((c: any) => c.texture !== undefined);
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

    const sprites = d['_bgLayer'].children.filter((c: any) => c.texture !== undefined);
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
    const sprites = d['_bgLayer'].children.filter((c: any) => c.texture !== undefined);
    expect(sprites.length).toBe(0);
  });

  it('no-NPC dialogs (meso drop INPUT) composite the t/c/s background', () => {
    const ui = WzPackage.OpenBase('wz_client', 'UI');
    const d = makeDialog({ uiWz: ui, loader: new WzTextureLoader() });
    d.m_wndWidth = 260;
    d.m_wndHeight = 93;
    d.m_bNoNPC = true;
    d.m_bParam = 0;
    d['_buildBackground']();
    // The no-NPC branch of SetBackground @0x97F180 also composites t/c/s —
    // a meso-drop dialog must not be a transparent floating box.
    const sprites = d['_bgLayer'].children.filter((c: any) => c.texture !== undefined);
    expect(sprites.length).toBeGreaterThan(0);
    expect(sprites[0].x).toBe(0);
    expect(sprites[0].y).toBe(0);
  });
});

describe('UtilDlgEx SetNPC (authentic speaker + name tag)', () => {
  it('positions the NPC in the left panel and adds a name-tag plate', () => {
    const ui = WzPackage.OpenBase('wz_client', 'UI');
    const npc = WzPackage.OpenBase('wz_client', 'Npc');
    const d = new UtilDlgEx({ uiWz: ui, npcWz: npc, loader: new WzTextureLoader() });
    d.npcNameOf = () => 'Test Npc';

    // with-NPC TEXT dialog — window 519 wide, scrHeight = max(ctHeight, 110)
    d.SetUtilDlgEx(UtilDlgType.TEXT, 2000, false, false, 'Hello adventurer!');
    d.m_ctHeight = 36;
    d['_layoutGen'](false);
    d.show();

    // speaker layer populated: NPC container + name tag
    const npcLayer = d['_npcLayer'];
    expect(npcLayer.children.length).toBeGreaterThan(0);
    expect(d['_npcLook']).not.toBeNull();

    // NPC 2000 stand frame is 56x70 → x = 76 - 28 = 48 (normal anchor)
    const npcContainer = npcLayer.children.find((c: any) => c === d['_npcLook']?.container);
    expect(npcContainer).toBeDefined();
    expect((npcContainer as any).x).toBeCloseTo(48);

    // name tag present at (xAnchor - 60, ...)
    const tag = npcLayer.children.find((c: any) => c !== d['_npcLook']?.container);
    expect(tag).toBeDefined();
    expect((tag as any).x).toBeCloseTo(76 - 60);
  });

  it('uses x-anchor 442 when m_bSpeakerOnRight and 52 for avatar/pet', () => {
    const ui = WzPackage.OpenBase('wz_client', 'UI');
    const npc = WzPackage.OpenBase('wz_client', 'Npc');
    const d = new UtilDlgEx({ uiWz: ui, npcWz: npc, loader: new WzTextureLoader() });
    d.npcNameOf = () => 'N';
    d.SetUtilDlgEx(UtilDlgType.TEXT, 2000, false, false, 'Hi');
    d.m_ctHeight = 36;
    d.m_bSpeakerOnRight = true;
    d['_layoutGen'](false);
    d.show();
    const npcContainer = d['_npcLayer'].children.find((c: any) => c === d['_npcLook']?.container);
    expect((npcContainer as any).x).toBeCloseTo(442 - 28);

    const d2 = new UtilDlgEx({ uiWz: ui, npcWz: npc, loader: new WzTextureLoader() });
    d2.SetUtilDlgEx(UtilDlgType.AVATAR, 2000, false, false, '');
    d2.m_ctHeight = 36;
    d2['_layoutGen'](true);
    d2.show();
    const av = d2['_npcLayer'].children.find((c: any) => c === d2['_npcLook']?.container);
    expect((av as any).x).toBeCloseTo(52 - 28);
  });

  it('skips the speaker when m_bNoNPC (no speaker layer)', () => {
    const d = makeDialog();
    d.SetUtilDlgEx(UtilDlgType.TEXT, 0, true, false, 'plain');
    d.show();
    expect(d['_npcLayer'].children.length).toBe(0);
  });

  it('flips the speaker per m_bParam bit 8 (FlipSpeaker)', () => {
    const ui = WzPackage.OpenBase('wz_client', 'UI');
    const npc = WzPackage.OpenBase('wz_client', 'Npc');
    const d = new UtilDlgEx({ uiWz: ui, npcWz: npc, loader: new WzTextureLoader() });
    d.SetUtilDlgEx(UtilDlgType.TEXT, 2000, false, false, 'Hi');
    d.m_ctHeight = 36;
    d.m_bParam = 8;
    d['_layoutGen'](false);
    d.show();
    expect(d['_npcLook']!.container.scale.x).toBeLessThan(0);
  });
});

describe('UtilDlgEx quiz timer + list selection', () => {
  it('auto-cancels a quiz when the countdown expires', () => {
    const d = makeDialog();
    const results: string[] = [];
    d.onResult = (r) => results.push(r.type);
    d.SetUtilDlgEx(UtilDlgType.INPUT_STR, 2000, false, false, 'Quiz?');
    d.SetUtilDlgEx_INPUT_STR('hint', 1, 10, false, 0);
    d.startQuizTimer(5);
    d.show();
    d.update(2); // 3s left
    expect(results).toEqual([]);
    d.update(4); // expired
    expect(results).toContain('cancel');
    expect(d.isVisible).toBe(false);
  });

  it('clicking a menu item then Select confirms the clicked choice', () => {
    const d = makeDialog();
    d.SetUtilDlgEx(UtilDlgType.LIST, 2000, false, false, 'Pick one');
    d.AddDotLine('First', 0, 5);
    d.AddDotLine('Second', 1, 5);
    d.AddDotLine('Third', 2, 5);
    d.SetUtilDlgEx_LIST(true);
    d.show();

    // click item "Second" (line index 2; _lines[0] is the parsed prompt)
    d['_selectListItem'](2);
    expect(d.m_nSelect).toBe(1);
    // click Select (id 8193) → should confirm 1, not reset to the initial focus
    d.OnButtonClicked(8193);
    expect(d.GetSelect()).toBe(1);
    expect(d.isVisible).toBe(false);
  });
});
