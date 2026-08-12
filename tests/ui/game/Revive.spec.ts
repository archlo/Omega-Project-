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
});
