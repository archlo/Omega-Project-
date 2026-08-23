import { describe, expect, it } from 'vitest';
import { SecondaryStat } from '../../src/character/SecondaryStat.js';
import { InPacket } from '../../src/net/packet/InPacket.js';

// Round-trip against the server's SecondaryStat.encodeForLocal: 16-byte mask,
// LOCAL_ENCODE_ORDER-sequenced entries (short, int, int), DefenseAtt/State
// bytes, swallow-group byte, Dice/BlessingArmor inline, two-state tail.
//
// LOCAL_ENTRY_ORDER sequence (relevant subset): Stun(17) comes BEFORE
// SharpEyes(37) in encode order even though 17 < 37; ThornsEffect(89) after
// both; entries are written ONLY for set bits.
function buildPacket(
  setBits: number[],
  entries: Array<{ bit: number; value: number; skillId: number; seconds: number }>,
  opts: { swallow?: number; blessing?: boolean } = {},
): InPacket {
  const bytes: number[] = [];
  // 16-byte little-endian mask
  const mask = new Uint8Array(16);
  for (const b of setBits) mask[Math.floor(b / 8)] |= (1 << (b % 8));
  for (const m of mask) bytes.push(m);
  // entries in LOCAL_ENTRY_ORDER order — caller must supply pre-sorted
  for (const e of entries) {
    bytes.push(e.value & 0xFF, (e.value >> 8) & 0xFF);
    for (let i = 0; i < 4; i++) bytes.push((e.skillId >>> (i * 8)) & 0xFF);
    for (let i = 0; i < 4; i++) bytes.push((e.seconds >>> (i * 8)) & 0xFF);
  }
  bytes.push(0, 0);                       // DefenseAtt + DefenseState
  if (opts.swallow !== undefined) {
    bytes.push(opts.swallow);
  }
  if (opts.blessing) {
    for (let i = 0; i < 4; i++) bytes.push(0); // BlessingArmorIncPAD int
  }
  return new InPacket(new Uint8Array(bytes));
}

describe('SecondaryStat.decode (v95 wire alignment)', () => {
  it('decodes stun + packed sharp eyes written in LOCAL_ENCODE_ORDER sequence', () => {
    const p = buildPacket(
      [17, 37],
      [
        { bit: 17, value: 4, skillId: 1211003, seconds: 30 },     // Stun first
        { bit: 37, value: (10 << 8) + 20, skillId: 3121002, seconds: 120 }, // SharpEyes
      ],
    );
    const ss = new SecondaryStat();
    ss.decode(p);
    expect(ss.isStunActive()).toBe(true);
    expect(ss.getSharpEyesCritRate()).toBe(10); // >> 8 of the packed value
  });

  it('does NOT confuse adjacent v95 stats (PAD=0 no longer lands on the old bit-4 slot)', () => {
    // Server PAD buff at bit 0 with value 25 — old table read bit 0 as 'str'.
    const p = buildPacket([0], [{ bit: 0, value: 25, skillId: 1001003, seconds: 60 }]);
    const ss = new SecondaryStat();
    ss.decode(p);
    expect(ss.getBuffPAD()).toBe(25);
    expect(ss.getBuffPDD()).toBe(0);
    expect(ss.getBuffMAD()).toBe(0);
  });

  it('decodes ComboAbilityBuff into aranCombo and ThornsEffect/Craft/SwallowCritical', () => {
    const p = buildPacket(
      [68, 89, 102],
      [
        { bit: 68, value: 55, skillId: 21110000, seconds: 200 },  // ComboAbilityBuff → aranCombo
        { bit: 89, value: 1, skillId: 33121004, seconds: 200 },   // ThornsEffect
        { bit: 102, value: 7, skillId: 33001001, seconds: 200 },  // SwallowCritical
      ],
      { swallow: 20 }, // SwallowCritical is in the swallow group → shared trailing byte
    );
    const ss = new SecondaryStat();
    ss.decode(p);
    expect(ss.getAranCombo()).toBe(55);
    expect((ss as any)._buff.thornsEffect).toBe(1);
    expect((ss as any)._buff.swallowCritical).toBe(7);
  });

  it('consumes the trailing defense bytes unconditionally (server always writes them)', () => {
    const p = buildPacket([], []); // empty mask still has the 2-byte tail
    const ss = new SecondaryStat();
    expect(() => ss.decode(p)).not.toThrow();
    expect(p.remaining).toBe(0);
  });
});
