import { InPacket } from '../net/packet/InPacket.js';

function popcount64(x: bigint): number {
  let c = 0;
  let v = x;
  while (v) { c += Number(v & 1n); v >>= 1n; }
  return c;
}

/**
 * CTS_BasicStatUp bit position in the 128-bit TemporaryStat mask.
 * The OG constant is UINT128{0, 0, 0x00000008, 0} → bit 67 (hi word, bit 3).
 */
const CTS_BASIC_STAT_UP_HI_BIT = 3n;
const CTS_BASIC_STAT_UP_HI_MASK = 1n << CTS_BASIC_STAT_UP_HI_BIT;

// CharacterTemporaryStat bit positions (v95 OG enum match).
const CTS_SPEED = 7n;
const CTS_JUMP = 8n;

export class SecondaryStat {
  /** Map skillId → { value, seconds } */
  private _stats = new Map<number, { value: number; seconds: number }>();
  private _defenseAtt = 0;
  private _defenseState = 0;
  private _diceInfo: number[] = [];
  private _basicStatUp = 0;
  private _tempSpeed = 0;
  private _tempJump = 0;

  clear(): void {
    this._stats.clear();
    this._defenseAtt = 0;
    this._defenseState = 0;
    this._diceInfo = [];
    this._basicStatUp = 0;
    this._tempSpeed = 0;
    this._tempJump = 0;
  }

  getTempSpeed(): number { return this._tempSpeed; }
  getTempJump(): number { return this._tempJump; }

  getComboCounter(): number {
    for (const skillId of [1111003, 1111004, 1111005]) {
      const s = this._stats.get(skillId);
      if (s) return s.value;
    }
    return 0;
  }

  getBySkillId(skillId: number): { value: number; seconds: number } | undefined {
    return this._stats.get(skillId);
  }

  /** The temp-stat BasicStatUp percentage (nBasicStatInc in BasicStat::SetFrom). */
  getBasicStatUp(): number { return this._basicStatUp; }

  get defenseAtt(): number { return this._defenseAtt; }
  get defenseState(): number { return this._defenseState; }
  get diceInfo(): readonly number[] { return this._diceInfo; }

  /** All decoded entries (skillId → { value, seconds }) */
  allEntries(): Iterable<[number, { value: number; seconds: number }]> {
    return this._stats.entries();
  }

  /**
   * Decode a TemporaryStatSet packet body (128-bit mask + per-stat data).
   *
   * Based on SecondaryStat::DecodeForLocal (0x7350e0).
   *
   * Most bits encode (value: short, skillId: int, seconds: int).
   * Special cases (DefenseAtt byte, Dice 22×int array, BlessingArmor extra PAD,
   * aTemporaryStat[0..6] virtual dispatch) are stubbed — the generic loop covers
   * 90%+ of real-world buffs (combo counter, Speed, Jump, etc.).
   *
   * Extracts BasicStatUp (bit 67) from the mask position — the value is the
   * percentage boost applied to base stats (Maple Warrior family, Echo of Hero).
   */
  decode(p: InPacket): void {
    this.clear();

    const maskLo = p.readLong();
    const maskHi = p.readLong();

    // Compute which entry index corresponds to CTS_BasicStatUp (bit 67).
    // Entries are ordered from lowest set bit to highest. Bit 67 sits at
    // maskHi bit 3, preceded by all lo-word bits + any hi-word bits below it.
    const isBasicStatUpSet = (maskHi & CTS_BASIC_STAT_UP_HI_MASK) !== 0n;
    const hiBitsBelowBasicStatUp = popcount64(maskHi & (CTS_BASIC_STAT_UP_HI_MASK - 1n));
    const basicStatUpIndex = popcount64(maskLo) + hiBitsBelowBasicStatUp;

    // Speed (bit 7) and Jump (bit 8) index precomputation.
    const isSpeedSet = (maskLo & (1n << CTS_SPEED)) !== 0n;
    const isJumpSet = (maskLo & (1n << CTS_JUMP)) !== 0n;
    const speedEntryIndex = popcount64(maskLo & ((1n << CTS_SPEED) - 1n));
    const jumpEntryIndex = popcount64(maskLo & ((1n << CTS_JUMP) - 1n));

    const entries: { skillId: number; value: number; seconds: number }[] = [];

    const bits = popcount64(maskLo) + popcount64(maskHi);
    for (let i = 0; i < bits; i++) {
      const value = p.readShort();
      const skillId = p.readInt();
      const seconds = p.readInt();
      entries.push({ skillId, value, seconds });
      if (isBasicStatUpSet && i === basicStatUpIndex) {
        this._basicStatUp = value;
      }
      if (isSpeedSet && i === speedEntryIndex) {
        this._tempSpeed = value;
      }
      if (isJumpSet && i === jumpEntryIndex) {
        this._tempJump = value;
      }
    }

    for (const e of entries) {
      this._stats.set(e.skillId, { value: e.value, seconds: e.seconds });
    }

    // ponytail: DefenseAtt/DefenseState — unconditional bytes after all common bits
    // (SecondaryStat::DecodeForLocal bits ~120-121). Present in real packets;
    // guard with remaining check for robustness.
    if (p.remaining >= 2) {
      this._defenseAtt = p.readByte();
      this._defenseState = p.readByte();
    }

    // ponytail: SwallowBuff (conditional byte), Dice (22×int), BlessingArmor (extra int),
    // and aTemporaryStat[0..6] virtual dispatch are not decoded.
    // Add when a specific skill's extra inline data is needed.
    //
    // SwallowBuff:  if (mask & CTS_SwallowBuff) { p.readByte(); }   // tSwallowBuffTime
    // Dice re-check: if (mask & CTS_Dice) { for (22) p.readInt(); } // aDiceInfo[]
    // BlessingArmor: if (mask & CTS_BlessingArmor) { p.readInt(); } // nBlessingArmorIncPAD
    // DarkSight:     if (mask & CTS_DarkSight) { (tick-only, no inline data) }
    // aTemporaryStat[0..6] (bits 122-128): virtual TemporaryStatBase::DecodeForClient
  }
}
