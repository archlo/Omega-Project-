import { describe, it, expect } from 'vitest';
import { MiniMap } from '../../../src/ui/game/MiniMap.js';
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
