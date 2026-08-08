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

// OG CUIKeyConfig + CNoticeDlg @0x7dc380: BtDefault (nId 0x7d0) / BtDelete
// (nId 0x7d1) open a 264x115 modal window whose background is the baked
// UIWindow2.img/KeyConfig/notice/<0|1> (260x84) image — NOT a full-panel dim.
// The keyboard keys stay fully visible while the dialog is up. The dialog's
// own BtOK is at (157,53) and BtCancel at (201,53) from the window origin
// (CNoticeDlg::OnCreate @0x7dc280).
describe('KeyConfig notice confirm dialog (real UI.nx)', () => {
  const ui = WzPackage.OpenBase('wz_client', 'UI');
  const loader = new WzTextureLoader();

  const makePanel = () => {
    const kc = new KeyConfig(loader, ui, null);
    kc.isVisible = true;
    return kc as unknown as {
      _btDelete: { handleMouseButton(x: number, y: number, down: boolean): boolean };
      _btNoticeOk: { container: { x: number; y: number }; bounds: { x: number; y: number; width: number; height: number }; handleMouseButton(x: number, y: number, down: boolean): boolean };
      _btNoticeCancel: { container: { x: number; y: number }; bounds: { x: number; y: number; width: number; height: number }; handleMouseButton(x: number, y: number, down: boolean): boolean };
      _noticeBgs: (object | null)[];
      _content: { children: unknown[] };
      _map: { type: number; id: number }[];
      _confirm: number;
      _noticeRect(): { x: number; y: number; w: number; h: number };
      handleMouseButton(x: number, y: number, down: boolean): boolean;
      update(dt: number): void;
      onKeyPress(key: string): boolean;
      onBindingsChanged: (() => void) | null;
    };
  };

  it('shows the baked notice/1 dialog for BtDelete and keeps the keyboard visible (no dim)', () => {
    const kc = makePanel();
    // BtDelete cell is (73,239) — click it to raise the confirm.
    kc.handleMouseButton(78, 244, true);
    kc.update(0);

    const bg = kc._noticeBgs[1] as { position: { x: number }; width: number; height: number } | null;
    expect(bg).not.toBeNull();
    // the notice background sprite is now a child of the content tree
    expect(kc._content.children.some(c => c === bg)).toBe(true);
    const r = kc._noticeRect();
    expect(bg!.position.x).toBe(r.x);
    expect(bg!.width).toBe(260);
  });

  it('places dialog OK/Cancel at (157,53) / (201,53) relative to the notice origin', () => {
    const kc = makePanel();
    kc._noticeRect = () => ({ x: 100, y: 60, w: 260, h: 84 });
    kc.handleMouseButton(78, 244, true);
    kc.update(0);

    const r = kc._noticeRect();
    expect(kc._btNoticeOk.bounds.x).toBe(r.x + 157);
    expect(kc._btNoticeOk.bounds.y).toBe(r.y + 53);
    expect(kc._btNoticeCancel.bounds.x).toBe(r.x + 201);
    expect(kc._btNoticeCancel.bounds.y).toBe(r.y + 53);
  });

  it('notice Cancel aborts the clear and leaves bindings untouched', () => {
    const kc = makePanel();
    kc.handleMouseButton(78, 244, true); // open the Delete confirm

    // click the dialog Cancel (down + up over its button rect)
    const r = kc._noticeRect();
    kc.handleMouseButton(r.x + 201 + 15, r.y + 53 + 8, true);
    kc.handleMouseButton(r.x + 201 + 15, r.y + 53 + 8, false);

    expect(kc._confirm).toBe(0); // None
    expect(kc._map.every(fk => fk.type !== 0)).toBe(true); // still bound
  });

  it('notice OK performs the clear-all for BtDelete', () => {
    const kc = makePanel();
    let fired = false;
    kc.onBindingsChanged = () => { fired = true; };

    kc.handleMouseButton(78, 244, true); // open the clear-all confirm
    const r = kc._noticeRect();
    kc.handleMouseButton(r.x + 157 + 15, r.y + 53 + 8, true);
    kc.handleMouseButton(r.x + 157 + 15, r.y + 53 + 8, false);

    expect(kc._confirm).toBe(0); // None
    expect(kc._map.every(fk => fk.type === 0 && fk.id === 0)).toBe(true);
    expect(fired).toBe(true);
  });

  it('Escape still dismisses the dialog without applying the clear', () => {
    const kc = makePanel();
    kc.handleMouseButton(78, 244, true);
    expect(kc._confirm).not.toBe(0);
    kc.onKeyPress('Escape');
    expect(kc._confirm).toBe(0);
    expect(kc._map.every(fk => fk.type !== 0)).toBe(true);
  });
});