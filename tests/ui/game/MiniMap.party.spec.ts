import { describe, it, expect } from 'vitest';
import { MiniMap } from '../../../src/ui/game/MiniMap.js';
import { MiniMapData } from '../../../src/map/MiniMapData.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';

// TODO_AUDIT.md Sixty-ninth pass: CUIMiniMap party-member tracking
// ("stalkee") — playerWorldPos/party tracking were both dead (never set
// from anywhere), so the minimap always showed the player dot frozen at
// the canvas origin and never showed party members at all.
describe('MiniMap party tracking', () => {
  it('setPartyMembers stores the given entries', () => {
    const mm = new MiniMap(new WzTextureLoader(), null, null);
    mm.setPartyMembers([{ x: 10, y: 20, isLeader: true }, { x: 30, y: 40, isLeader: false }]);
    expect((mm as any)._partyMembers).toEqual([
      { x: 10, y: 20, isLeader: true },
      { x: 30, y: 40, isLeader: false },
    ]);
  });

  it('setPartyMembers replaces the previous list rather than appending', () => {
    const mm = new MiniMap(new WzTextureLoader(), null, null);
    mm.setPartyMembers([{ x: 1, y: 1, isLeader: false }]);
    mm.setPartyMembers([{ x: 2, y: 2, isLeader: true }]);
    expect((mm as any)._partyMembers).toEqual([{ x: 2, y: 2, isLeader: true }]);
  });

  it('playerWorldPos is a plain settable field, defaulting to the origin', () => {
    const mm = new MiniMap(new WzTextureLoader(), null, null);
    expect(mm.playerWorldPos).toEqual({ x: 0, y: 0 });
    mm.playerWorldPos = { x: 123, y: 456 };
    expect(mm.playerWorldPos).toEqual({ x: 123, y: 456 });
  });
});

describe('MiniMap top-left position + render robustness', () => {
  it('always anchors at the top-left corner (4,4), ignoring any saved position', () => {
    (globalThis as any).localStorage = { getItem: () => JSON.stringify({ x: 4000, y: -500 }), setItem: () => {} };
    const mm = new MiniMap(new WzTextureLoader(), null, null);
    expect(mm.container.x).toBe(4);
    expect(mm.container.y).toBe(4);
  });

  it('draws without crashing when map data lacks Footholds/LadderRopes arrays', () => {
    const mm = new MiniMap(new WzTextureLoader(), null, null);
    // A plain object (missing the optional Footholds field) must not throw.
    mm.setMapData({ CanvasWidth: 180, CanvasHeight: 120 } as any, 'Test', 'Test');
    mm.setFootholds({});
    mm.playerWorldPos = { x: 10, y: 10 };
    expect(() => mm.update(0)).not.toThrow();
  });
});

describe('MiniMap title clipping + collapsed strip cap', () => {
  it('long map names are truncated to fit the available strip width', () => {
    const mm = new MiniMap(new WzTextureLoader(), null, null) as any;
    mm._mapName = 'The Side Door That Leads To The Deep Cave of Ellinia';
    mm._mode = 2;
    const win = { x: 4, y: 4, width: 160, height: 18 };
    mm._content.removeChildren();
    mm._drawTitle(win, 64, 18);
    const texts = mm._content.children.filter((c: any) => c.text !== undefined);
    expect(texts.length).toBeGreaterThan(0);
    const drawn = texts[0].text as string;
    expect(drawn.length).toBeLessThan(mm._mapName.length);
    expect((mm as any)._measureText(drawn)).toBeLessThanOrEqual(
      win.width - (64 - 8) - (mm as any)._buttonsWidth() - 6,
    );
  });

  it('collapsed strip width is capped regardless of name length', () => {
    const mm = new MiniMap(new WzTextureLoader(), null, null) as any;
    mm._mapName = 'An Extremely Long Map Name That Would Stretch The Strip Forever';
    mm._mode = 2;
    const r = mm._winRect();
    expect(r.width).toBeLessThanOrEqual(180);
  });

  it('short names render untruncated in collapsed mode', () => {
    const mm = new MiniMap(new WzTextureLoader(), null, null) as any;
    mm._mapName = 'Henesys';
    mm._mode = 2;
    mm._content.removeChildren();
    mm._drawTitle({ x: 4, y: 4, width: 160, height: 18 }, 64, 18);
    const texts = mm._content.children.filter((c: any) => c.text !== undefined);
    expect(texts[0].text).toBe('Henesys');
  });
});

describe('MiniMap player-dot alignment (map-fits but simple huge mode)', () => {
  // map 10000-style: canvas authored at the field's native mag (4). Simple
  // type (MiniMapType 0) starts in huge mode where _mag2X = Mag-1 = 3 — the
  // OG world→canvas shift must stay at the canvas's native Mag, otherwise
  // scrOrig becomes non-zero for a map that fits the pane and the player dot
  // "follows" the character toward the pane middle instead of sitting on the
  // true canvas pixel.
  function makeMapData(): MiniMapData {
    return new MiniMapData(
      { width: 112, height: 57, ToPixi: () => ({}) } as any,
      null,
      1806,
      913,
      363,
      149,
      4,
    );
  }

  it('keeps scrOrig at 0 for a map that fits the pane, even in huge mode', () => {
    const mm = new MiniMap(new WzTextureLoader(), null, null);
    mm.setMapData(makeMapData(), 'Mushroom Town', 'Maple Road');
    mm.setMiniMapType(0);
    mm.playerWorldPos = { x: 500, y: 300 };
    // _mode 0 = huge. Before the fix _mag=3 (Mag-1) made scrOrig ~51.
    const mmAny = mm as any;
    const scrOrig = mmAny._calculateScr(mm.playerWorldPos, 112, 57, 4);
    expect(scrOrig.x).toBe(0);
    expect(scrOrig.y).toBe(0);
  });

  it('maps the player to the true canvas pixel ((world+realCX)>>Mag)', () => {
    const mm = new MiniMap(new WzTextureLoader(), null, null);
    mm.setMapData(makeMapData(), 'Mushroom Town', 'Maple Road');
    mm.setMiniMapType(0);
    mm.playerWorldPos = { x: 500, y: 300 };
    const c = (mm as any)._transformPoint(mm.playerWorldPos, { x: 0, y: 0 }, 4);
    // (500+363)>>4 = 863>>4 = 53; (300+149)>>4 = 449>>4 = 28
    expect(c.x).toBe(53);
    expect(c.y).toBe(28);
  });
});

describe('MiniMap portal filtering (OG Update @0x8053A0: only nType 2|7)', () => {
  it('keeps only type 2 and type 7 portals; drops spawn/script/hidden portals', () => {
    const mm = new MiniMap(new WzTextureLoader(), null, null);
    mm.setPortals([
      { x: 10, y: 10, type: 0 },   // spawn
      { x: 20, y: 20, type: 2 },   // field portal — kept
      { x: 30, y: 30, type: 7 },   // script portal — kept
      { x: 40, y: 40, type: 8 },   // hidden/script
      { x: 50, y: 50, type: 10 },  // hidden
      { x: 60, y: 60, type: 11 },  // hidden
    ]);
    expect((mm as any)._portals).toEqual([
      { x: 20, y: 20, type: 2 },
      { x: 30, y: 30, type: 7 },
    ]);
  });

  it('replaces the previous list rather than appending', () => {
    const mm = new MiniMap(new WzTextureLoader(), null, null);
    mm.setPortals([{ x: 1, y: 1, type: 2 }]);
    mm.setPortals([{ x: 2, y: 2, type: 2 }, { x: 3, y: 3, type: 0 }]);
    expect((mm as any)._portals).toEqual([{ x: 2, y: 2, type: 2 }]);
  });
});
