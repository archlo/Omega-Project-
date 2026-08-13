import { describe, it, expect } from 'vitest';
import { Texture, Sprite } from 'pixi.js';
import { Revive } from '../../../src/ui/game/Revive.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';
import { WzPackage } from '../../../src/wz/WzPackage.js';
import { WzProperty } from '../../../src/wz/WzProperty.js';
import { WzCanvas } from '../../../src/wz/WzCanvas.js';

(globalThis as any).window ??= {};
(globalThis as any).localStorage = { getItem: () => null, setItem: () => {} };

// OG: CUIRevive::OnCreate @0x83CEA0 — revive dialog from UIWindow2.img/Notice/<0..4>
// (0 = plain town-revive) + btOK(6)/btCancle(7). Revive @0x83CDE0 sends
// SendTransferFieldRequest(bPremium) — the TS GameSender.Revive.
describe('Revive (CUIRevive)', () => {
  function make(): Revive {
    return new Revive(new WzTextureLoader(), null, null);
  }

  it('starts hidden and opens/closes', () => {
    const r = make();
    expect(r.isVisible).toBe(false);
    r.Open();
    expect(r.isVisible).toBe(true);
    r.Close();
    expect(r.isVisible).toBe(false);
  });

  it('clicking OK fires OnRevive(false) after the input-ignore window', () => {
    const r = make();
    let revived: boolean | null = null;
    r.OnRevive = (premium) => { revived = premium; };
    r.Open();
    // simulate past the 250ms ignore window
    r['_ignoreInputMs'] = 0;
    r.update(0.3);
    // center of the (fallback) OK button
    const tl = r['_topLeft']();
    const bw = r['_btOk'].width;
    const bx = tl.x + (r['_panelWidth'] - bw) / 2 + bw / 2;
    const by = tl.y + r['_panelHeight'] - 30 + 8;
    r.handleMouseButton(bx, by, true);
    r.handleMouseButton(bx, by, false);
    expect(revived).toBe(false);
    expect(r.isVisible).toBe(false);
  });

  it('Enter key revives after the ignore window', () => {
    const r = make();
    let revived: boolean | null = null;
    r.OnRevive = (premium) => { revived = premium; };
    r.Open();
    r['_ignoreInputMs'] = 0;
    r.onKeyPress('Enter');
    expect(revived).toBe(false);
  });

  it('loads the authentic Notice/0 background + btOK from UI.nx', () => {
    const nx = process.env.MAPLECLAUDE_NX_DIR;
    if (!nx) return;
    const ui = WzPackage.Open(`${nx}/UI.nx`);
    const notice = ui.GetItem('UIWindow2.img/Notice');
    expect(notice).toBeInstanceOf(WzProperty);
    const bg = (notice as WzProperty).Get('0');
    expect(bg).toBeInstanceOf(WzCanvas);
    expect((bg as WzCanvas).Width).toBe(300);
    expect((bg as WzCanvas).Height).toBe(131);
    const bt = (notice as WzProperty).Get('btOK');
    expect(bt).toBeInstanceOf(WzProperty);

    const r = new Revive(new WzTextureLoader(), ui as any, null);
    expect(r['_backgrnd']).not.toBeNull();
    expect(r['_btOk']).not.toBeNull();
  });

  it('positions the panel + OK button per CUIRevive ctor/OnCreate', () => {
    // OG ctor @0x83D230: CreateWnd(-150, -195, 300, 131, z=10, bScreenCoord=1,
    // Origin_CC) — panel CENTER is (-150,-195) from screen center, so the
    // top-left is raised 195px above the centered spot. OnCreate places btOK
    // at AddButton offset (42,0) whose origin (-196,-100) lands it at (238,100)
    // inside the panel.
    const r = make();
    r.Relayout(800, 600);
    const tl = r['_topLeft']();
    // Fallback panel is 320x140 (make() has no WZ bg): x=(800-320)/2=240,
    // y=(600-140)/2 - 195 = 35.
    expect(tl.x).toBe((800 - r['_panelWidth']) / 2);
    expect(tl.y).toBe((600 - r['_panelHeight']) / 2 - 195);

    // Fake a loaded WZ background so update() takes the WZ placement branch.
    (r as any)._bgPixi = { position: { set: () => {} } };
    r.Open();
    r.update(0.01);
    // OG AddButton offset (42,0): with the btOK canvas origin (-196,-100) the
    // sprite lands at panel-relative (238,100) — offset - origin.
    expect(r['_btOk'].container.position.x).toBe(tl.x + 42);
    expect(r['_btOk'].container.position.y).toBe(tl.y);
    expect(r['_btOk'].container.position.x - tl.x - (-196)).toBe(238);
    expect(r['_btOk'].container.position.y - tl.y - (-100)).toBe(100);
  });
});
