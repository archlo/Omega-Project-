import { describe, it, expect, beforeEach } from 'vitest';
import { Text } from 'pixi.js';
import {
  PartyHPBar,
  partyHpRowLayout,
  partyHpWindowSize,
  partyHpGaugeColumns,
} from '../../../src/ui/game/PartyHPBar.js';
import type { PartyMember } from '../../../src/net/handlers/PacketArgs.js';

// ponytail: shims Text.width to 0 so name-width measurement doesn't need a
// DOM canvas (same trick as StatsInfo.draw.spec.ts)
Object.defineProperty(Text.prototype, 'width', { get: () => 0 });

// OG CUIPartyHP — ctor @0x8D5920 / Create @0x8D1CE0 / Draw @0x8D1F70 /
// ToggleShowHP @0x8D8560 (CTabParty BtHP id 2207).
// Layout constants verified from the Draw disassembly:
//   W = max(150, maxNameW+100), H = fontH*(n+5)+5, rowY = i*(fontH+5)
//   name (5, rowY+5), bar (W-72, rowY+8), graduation frame (W-75, rowY+5),
//   gauge fill = min(64, hp*64/max) 1px columns from W-72.
describe('PartyHPBar (OG CUIPartyHP)', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = { getItem: () => null, setItem: () => {} };
  });

  function member(over: Partial<PartyMember> = {}): PartyMember {
    return { charId: 1, name: 'Bob', job: 100, level: 30, channel: 2, hp: 500, maxHp: 1000, ...over };
  }

  function makeBar(): PartyHPBar {
    const b = new PartyHPBar();
    b.isOnline = () => true;
    return b;
  }

  it('window size: min width 150, grows by maxNameWidth+100; H = 12*(n+5)+5', () => {
    expect(partyHpWindowSize([40], 1)).toEqual({ w: 150, h: 12 * 6 + 5 });
    expect(partyHpWindowSize([80, 60], 2)).toEqual({ w: 180, h: 12 * 7 + 5 });
  });

  it('row layout anchors: name x=5 y=rowY+5, bar x=W-72 y=rowY+8, frame x=W-75 y=rowY+5', () => {
    const L0 = partyHpRowLayout(150, 0);
    expect(L0.rowY).toBe(0);
    expect(L0.nameX).toBe(5);
    expect(L0.nameY).toBe(5);
    expect(L0.barX).toBe(78);
    expect(L0.barY).toBe(8);
    expect(L0.frameX).toBe(75);
    expect(L0.frameY).toBe(5);

    const L1 = partyHpRowLayout(150, 1);
    expect(L1.rowY).toBe(17); // 12+5 pitch
    expect(L1.nameY).toBe(22);
    expect(L1.barY).toBe(25);
    expect(L1.frameY).toBe(22);
  });

  it('gauge columns: hp*64/max floored, capped at 64, zero when hp<=0 or max<=0', () => {
    expect(partyHpGaugeColumns(1000, 1000)).toBe(64);
    expect(partyHpGaugeColumns(2000, 1000)).toBe(64);
    expect(partyHpGaugeColumns(500, 1000)).toBe(32);
    expect(partyHpGaugeColumns(250, 1000)).toBe(16);
    expect(partyHpGaugeColumns(0, 1000)).toBe(0);
    expect(partyHpGaugeColumns(100, 0)).toBe(0);
  });

  it('setMembers builds one row per member and shows; empty list hides', () => {
    const b = makeBar();
    b.setMembers([]);
    expect(b.isVisible).toBe(false);

    b.setMembers([member(), member({ charId: 2, name: 'Al' })]);
    expect(b.isVisible).toBe(true);
    const rows = (b as any)._rowsLayer.children.filter((c: any) => c instanceof Text);
    expect(rows.length).toBe(2);
  });

  it('onUserReceiveHP path: updateMemberHp refreshes the member HP live', () => {
    const b = makeBar();
    b.setMembers([member()]);
    b.updateMemberHp(1, 250, 1000);
    expect((b as any)._members[0].hp).toBe(250);
    expect(partyHpGaugeColumns((b as any)._members[0].hp, (b as any)._members[0].maxHp)).toBe(16);
    // unknown charId is a no-op
    b.updateMemberHp(999, 1, 1);
    expect((b as any)._members.length).toBe(1);
  });

  it('toggle() flips visibility and persists CConfig::SetShowPartyHP', () => {
    const store = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
    const b = makeBar();
    b.setMembers([member()]);
    expect(b.isVisible).toBe(true);

    b.toggle();
    expect(b.isVisible).toBe(false);
    expect(store.get('ShowPartyHP')).toBe('0');

    // new member loads stay hidden while toggled off
    b.setMembers([member(), member({ charId: 3 })]);
    expect(b.isVisible).toBe(false);

    b.toggle();
    expect(b.isVisible).toBe(true);
    expect(store.get('ShowPartyHP')).toBe('1');
  });

  it('offline member (isOnline false) renders gray name, online renders black', () => {
    const b = makeBar();
    b.isOnline = (id) => id === 1;
    b.setMembers([member(), member({ charId: 2 })]);
    const rows = (b as any)._rowsLayer.children.filter((c: any) => c instanceof Text) as Text[];
    expect((rows[0].style as any).fill).toBe(0x000000);
    expect((rows[1].style as any).fill).toBe(0x808080);
  });
});
