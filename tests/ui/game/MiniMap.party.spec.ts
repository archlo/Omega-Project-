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
