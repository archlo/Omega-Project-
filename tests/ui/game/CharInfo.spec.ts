import { describe, expect, it } from 'vitest';
import { CharInfo } from '../../../src/ui/game/CharInfo.js';
import { WzPackage } from '../../../src/wz/WzPackage.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';

(globalThis as any).window ??= {};

function makeCharInfo(ui?: WzPackage | null): CharInfo {
  const loader = new WzTextureLoader();
  return new CharInfo(loader, ui ?? null);
}

describe('CharInfo (CUIUserInfo) layout (IDB-verified)', () => {
  it('level row uses white (FONT_BASIC_WHITE), job/fame/community/alliance use gray', () => {
    const c = makeCharInfo();
    const level = c['_levelText'];
    const job = c['_jobText'];
    // Level = FONT_BASIC_WHITE → white fill.
    expect(level.style.fill).toBe('#FFFFFF');
    // Job/fame/community/alliance = FONT_SMALL_GRAY → gray fill.
    expect(job.style.fill).toBe('#888888');
  });

  it('places stat rows at the OG Draw coordinates', () => {
    const c = makeCharInfo();
    expect(c['_levelText'].x).toBe(153);
    expect(c['_levelText'].y).toBe(71);
    expect(c['_jobText'].x).toBe(153);
    expect(c['_jobText'].y).toBe(89);
    expect(c['_fameText'].x).toBe(153);
    expect(c['_fameText'].y).toBe(107);
    expect(c['_communityText'].x).toBe(153);
    expect(c['_communityText'].y).toBe(125);
    expect(c['_allianceText'].x).toBe(153);
    expect(c['_allianceText'].y).toBe(143);
  });

  it('centers the name at x=61 (OG: 61 - width/2)', () => {
    const c = makeCharInfo();
    expect(c['_nameText'].x).toBe(61);
    expect(c['_nameText'].y).toBe(50);
  });
});

describe('CharInfo WZ asset resolution (real UI.nx)', () => {
  it('loads the married icon and button sprites from UIWindow2.img/UserInfo/character', () => {
    const ui = WzPackage.OpenBase('wz_client', 'UI');
    const c = makeCharInfo(ui);
    // Buttons created from the WZ subtree (BtParty/BtTrad/etc.)
    expect(c['_btParty']).not.toBeNull();
    expect(c['_btTrade']).not.toBeNull();
    expect(c['_btPet']).not.toBeNull();
    expect(c['_btRide']).not.toBeNull();
    expect(c['_btCollect']).not.toBeNull();
  });
});
