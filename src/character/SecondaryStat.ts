import { InPacket } from '../net/packet/InPacket.js';

function popcount64(x: bigint): number {
  let c = 0;
  let v = x;
  while (v) { c += Number(v & 1n); v >>= 1n; }
  return c;
}

// CharacterTemporaryStat bit positions — must match TempStatMask enum in Enums.ts.
const CTS_STR              = 0n;
const CTS_DEX              = 1n;
const CTS_INT              = 2n;
const CTS_LUK              = 3n;
const CTS_PAD              = 4n;   // Physical ATK
const CTS_MAD              = 5n;   // Magical ATK
const CTS_PDD              = 6n;   // Physical DEF
const CTS_MDD              = 7n;   // Magical DEF
const CTS_ACC              = 8n;
const CTS_EVA              = 9n;
const CTS_SPEED            = 10n;
const CTS_JUMP             = 11n;
const CTS_MAGIC_ATK        = 12n;
const CTS_MAGIC_DEF        = 13n;

// Special-case bits that carry inline trailing data after the common loop.
const CTS_BASIC_STAT_UP    = 41n;  // Maple Warrior %
const CTS_MAGIC_GUARD      = 15n;
const CTS_DARK_SIGHT       = 16n;
const CTS_BOOSTER          = 17n;
const CTS_POWER_GUARD      = 18n;
const CTS_MAX_HP           = 19n;
const CTS_MAX_MP           = 20n;
const CTS_HOLY_SYMBOL      = 30n;
const CTS_SHADOW_PARTNER   = 32n;
const CTS_MESO_GUARD       = 34n;
const CTS_STANCE           = 42n;
const CTS_SHARP_EYES       = 43n;
const CTS_INFINITY         = 47n;
const CTS_ARAN_COMBO       = 55n;
const CTS_COMBO_DRAIN      = 56n;
const CTS_COMBO_BARRIER    = 57n;
const CTS_FEAR             = 64n;
const CTS_BLESSING_ARMOR   = 78n;  // inline: 1 extra int
const CTS_DICE             = 85n;  // inline: 22 extra ints
const CTS_SWALLOW_BUFF     = 98n;  // inline: 1 extra int
const CTS_UNDEAD           = 120n;

// Bits that require extra inline data reads after the common loop.
// [bitPosition, extraReadCount]
const INLINE_DATA_BITS: [bigint, number][] = [
  [CTS_DICE,           22],  // aDiceInfo[22] — 22 ints
  [CTS_SWALLOW_BUFF,    1],  // tSwallowBuffTime — 1 int
  [CTS_BLESSING_ARMOR,  1],  // nBlessingArmorIncPAD — 1 int
];

/**
 * Per-stat buff values. Each field stores the raw buff value for that stat type.
 * Only populated when the corresponding bit is set in the TemporaryStatSet mask.
 */
export interface BuffStatValues {
  // Common stats (bits 0-13)
  str: number;
  dex: number;
  int: number;
  luk: number;
  pad: number;   // Physical ATK
  mad: number;   // Magical ATK
  pdd: number;   // Physical DEF
  mdd: number;   // Magical DEF
  acc: number;
  eva: number;
  speed: number;
  jump: number;
  magicAtk: number;
  magicDef: number;

  // Skill-specific
  magicGuard: number;
  darkSight: number;
  booster: number;
  powerGuard: number;
  maxHp: number;
  maxMp: number;
  invincible: number;
  soulArrow: number;
  stun: number;
  poison: number;
  seal: number;
  darkness: number;
  combo: number;
  charge: number;
  dragonBlood: number;
  holySymbol: number;
  mesoUp: number;
  shadowPartner: number;
  pickPocket: number;
  mesoGuard: number;
  thaw: number;
  weakness: number;
  curse: number;
  slow: number;
  morph: number;
  regen: number;
  basicStatUp: number;
  stance: number;
  sharpEyes: number;
  manaReflection: number;
  attract: number;
  noBulletConsume: number;
  infinity: number;
  advancedBless: number;
  illusion: number;
  berserkFury: number;
  divineBody: number;
  spark: number;
  finalAttack: number;
  windWalk: number;
  aranCombo: number;
  comboDrain: number;
  comboBarrier: number;
  bodyPressure: number;
  smartKnockback: number;
  repeatEffect: number;
  expBuffRate: number;
  stopPortion: number;
  stopMotion: number;
  fear: number;
  evanSlow: number;
  magicShield: number;
  magicResistance: number;
  soulStone: number;
  flying: number;
  frozen: number;
  elementLight: number;
  elementDark: number;
  elementFire: number;
  elementIce: number;
  addAttackCount: number;
  addAttackX: number;
  crushItemEnchant: number;
  blessingArmor: number;
  damR: number;
  teleportMastery: number;
  combatOrders: number;
  beholder: number;
  addBuffItemId: number;
  hyperBody: number;
  rush: number;
  web: number;
  elementalCharge: number;
  venom: number;
  darkAtomic: number;
  bombArrow: number;
  suddenDeath: number;
  boarding: number;
  additionalPmp: number;
  aranWhirlwind: number;
  magnet: number;
  flashBang: number;
  swallowBuff: number;
  hitTeleport: number;
  moreWildBuff: number;
  hide: number;
  cygnusFlame: number;
  strBuff: number;
  dexBuff: number;
  intBuff: number;
  lukBuff: number;
  attackCount: number;
  buffImmune: number;
  skillFixed: number;
  aranBind: number;
  notDamaged: number;
  finalCut: number;
  damageUp: number;
  hyperBodyDef: number;
  hyperBodyHp: number;
  hyperBodyMp: number;
  elementCharge2: number;
  barrier: number;
  guidedBullet: number;
  undead: number;
  rideVehicle: number;
  dice: number;
}

function defaultBuffValues(): BuffStatValues {
  return {
    str: 0, dex: 0, int: 0, luk: 0,
    pad: 0, mad: 0, pdd: 0, mdd: 0,
    acc: 0, eva: 0, speed: 0, jump: 0,
    magicAtk: 0, magicDef: 0,
    magicGuard: 0, darkSight: 0, booster: 0, powerGuard: 0,
    maxHp: 0, maxMp: 0, invincible: 0, soulArrow: 0,
    stun: 0, poison: 0, seal: 0, darkness: 0,
    combo: 0, charge: 0, dragonBlood: 0, holySymbol: 0,
    mesoUp: 0, shadowPartner: 0, pickPocket: 0, mesoGuard: 0,
    thaw: 0, weakness: 0, curse: 0, slow: 0,
    morph: 0, regen: 0, basicStatUp: 0, stance: 0,
    sharpEyes: 0, manaReflection: 0, attract: 0, noBulletConsume: 0,
    infinity: 0, advancedBless: 0, illusion: 0, berserkFury: 0,
    divineBody: 0, spark: 0, finalAttack: 0, windWalk: 0,
    aranCombo: 0, comboDrain: 0, comboBarrier: 0, bodyPressure: 0,
    smartKnockback: 0, repeatEffect: 0, expBuffRate: 0,
    stopPortion: 0, stopMotion: 0, fear: 0, evanSlow: 0,
    magicShield: 0, magicResistance: 0, soulStone: 0, flying: 0,
    frozen: 0, elementLight: 0, elementDark: 0, elementFire: 0,
    elementIce: 0, addAttackCount: 0, addAttackX: 0, crushItemEnchant: 0,
    blessingArmor: 0, damR: 0, teleportMastery: 0, combatOrders: 0,
    beholder: 0, addBuffItemId: 0, hyperBody: 0, rush: 0,
    web: 0, elementalCharge: 0, venom: 0, darkAtomic: 0,
    bombArrow: 0, suddenDeath: 0, boarding: 0, additionalPmp: 0,
    aranWhirlwind: 0, magnet: 0, flashBang: 0, swallowBuff: 0,
    hitTeleport: 0, moreWildBuff: 0, hide: 0, cygnusFlame: 0,
    strBuff: 0, dexBuff: 0, intBuff: 0, lukBuff: 0,
    attackCount: 0, buffImmune: 0, skillFixed: 0, aranBind: 0,
    notDamaged: 0, finalCut: 0, damageUp: 0, hyperBodyDef: 0,
    hyperBodyHp: 0, hyperBodyMp: 0, elementCharge2: 0,
    barrier: 0, guidedBullet: 0, undead: 0, rideVehicle: 0,
    dice: 0,
  };
}

/** Map bit position to BuffStatValues field name. */
const BIT_TO_FIELD: Record<number, keyof BuffStatValues> = {
  [Number(CTS_STR)]:            'str',
  [Number(CTS_DEX)]:            'dex',
  [Number(CTS_INT)]:            'int',
  [Number(CTS_LUK)]:            'luk',
  [Number(CTS_PAD)]:            'pad',
  [Number(CTS_MAD)]:            'mad',
  [Number(CTS_PDD)]:            'pdd',
  [Number(CTS_MDD)]:            'mdd',
  [Number(CTS_ACC)]:            'acc',
  [Number(CTS_EVA)]:            'eva',
  [Number(CTS_SPEED)]:          'speed',
  [Number(CTS_JUMP)]:           'jump',
  [Number(CTS_MAGIC_ATK)]:      'magicAtk',
  [Number(CTS_MAGIC_DEF)]:      'magicDef',
  [Number(CTS_MAGIC_GUARD)]:    'magicGuard',
  [Number(CTS_DARK_SIGHT)]:     'darkSight',
  [Number(CTS_BOOSTER)]:        'booster',
  [Number(CTS_POWER_GUARD)]:    'powerGuard',
  [Number(CTS_MAX_HP)]:         'maxHp',
  [Number(CTS_MAX_MP)]:         'maxMp',
  [Number(CTS_HOLY_SYMBOL)]:    'holySymbol',
  [Number(CTS_SHADOW_PARTNER)]: 'shadowPartner',
  [Number(CTS_MESO_GUARD)]:     'mesoGuard',
  [Number(CTS_STANCE)]:         'stance',
  [Number(CTS_SHARP_EYES)]:     'sharpEyes',
  [Number(CTS_INFINITY)]:       'infinity',
  [Number(CTS_ARAN_COMBO)]:     'aranCombo',
  [Number(CTS_COMBO_DRAIN)]:    'comboDrain',
  [Number(CTS_COMBO_BARRIER)]:  'comboBarrier',
  [Number(CTS_FEAR)]:           'fear',
  [Number(CTS_BLESSING_ARMOR)]: 'blessingArmor',
  [Number(CTS_DICE)]:           'dice',
  [Number(CTS_SWALLOW_BUFF)]:   'swallowBuff',
  [Number(CTS_UNDEAD)]:         'undead',
};

/** Per-entry decoded from the packet: value + skillId + seconds. */
interface RawEntry {
  bit: number;
  value: number;
  skillId: number;
  seconds: number;
}

export class SecondaryStat {
  /** Flat buff values indexed by stat type. */
  private _buff = defaultBuffValues();

  /** Map skillId → { value, seconds } for backward compat (combo counter, etc.) */
  private _stats = new Map<number, { value: number; seconds: number }>();

  /** Per-bit raw entries for inline-data post-processing. */
  private _rawEntries: RawEntry[] = [];

  /** DefenseAtt/DefenseState trailing bytes. */
  private _defenseAtt = 0;
  private _defenseState = 0;

  /** Dice info array (22 ints) when CTS_Dice is set. */
  private _diceInfo: number[] = [];

  /** SwallowBuff timer when CTS_SwallowBuff is set. */
  private _swallowBuffTime = 0;

  /** BlessingArmor extra PAD when CTS_BlessingArmor is set. */
  private _blessingArmorIncPAD = 0;

  clear(): void {
    this._buff = defaultBuffValues();
    this._stats.clear();
    this._rawEntries = [];
    this._defenseAtt = 0;
    this._defenseState = 0;
    this._diceInfo = [];
    this._swallowBuffTime = 0;
    this._blessingArmorIncPAD = 0;
  }

  // ── Per-stat getters ──

  get buff(): Readonly<BuffStatValues> { return this._buff; }

  // Convenience getters for commonly accessed stats
  getTempSpeed(): number { return this._buff.speed; }
  getTempJump(): number { return this._buff.jump; }
  getBasicStatUp(): number { return this._buff.basicStatUp; }
  get defenseAtt(): number { return this._defenseAtt; }
  get defenseState(): number { return this._defenseState; }
  get diceInfo(): readonly number[] { return this._diceInfo; }
  get swallowBuffTime(): number { return this._swallowBuffTime; }
  get blessingArmorIncPAD(): number { return this._blessingArmorIncPAD; }

  /** Combo counter from skills 1111003/1111004/1111005. */
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

  /** All decoded entries (skillId → { value, seconds }) — backward compat. */
  allEntries(): Iterable<[number, { value: number; seconds: number }]> {
    return this._stats.entries();
  }

  // ── Combat stat contribution getters ──

  /** Total physical ATK buff (equipment PAD + buff PAD). */
  getBuffPAD(): number { return this._buff.pad + this._buff.magicAtk; }

  /** Total magical ATK buff. */
  getBuffMAD(): number { return this._buff.mad; }

  /** Total physical DEF buff. */
  getBuffPDD(): number { return this._buff.pdd; }

  /** Total magical DEF buff. */
  getBuffMDD(): number { return this._buff.mdd; }

  /** Flat accuracy buff value. */
  getBuffACC(): number { return this._buff.acc; }

  /** Flat avoidability buff value. */
  getBuffEVA(): number { return this._buff.eva; }

  /** Magic Guard damage-to-MP conversion percentage (0-100). */
  getMagicGuardReduction(): number { return this._buff.magicGuard; }

  /** Power Guard damage-to-HP reflection percentage (0-100). */
  getPowerGuardReduction(): number { return this._buff.powerGuard; }

  /** Meso Guard damage-to-meso absorption percentage (0-100). */
  getMesoGuardReduction(): number { return this._buff.mesoGuard; }

  /** Holy Symbol EXP rate bonus (0-100%). */
  getHolySymbolExpRate(): number { return this._buff.holySymbol; }

  /** Sharp Eyes critical rate bonus (0-100%). */
  getSharpEyesCritRate(): number { return this._buff.sharpEyes; }

  /** Stance dodge probability (0-100%). */
  getStanceRate(): number { return this._buff.stance; }

  /**
   * Decode a TemporaryStatSet packet body (128-bit mask + per-stat data).
   *
   * Based on SecondaryStat::DecodeForLocal (0x7350e0).
   *
   * The packet format:
   *   1. 128-bit mask (2x readLong) — which stats are set
   *   2. For each set bit (lowest to highest): (value: short, skillId: int, seconds: int)
   *   3. Special-case trailing data for certain bits (Dice, SwallowBuff, BlessingArmor)
   *   4. Unconditional trailing: DefenseAtt (byte), DefenseState (byte)
   */
  decode(p: InPacket): void {
    this.clear();

    const maskLo = p.readLong();
    const maskHi = p.readLong();
    const mask = [maskLo, maskHi]; // mask[0]=lo, mask[1]=hi

    const totalBits = popcount64(maskLo) + popcount64(maskHi);

    // Phase 1: Read all common entries (short, int, int) in bit order.
    this._rawEntries = [];
    for (let i = 0; i < totalBits; i++) {
      const value = p.readShort();
      const skillId = p.readInt();
      const seconds = p.readInt();
      this._rawEntries.push({ bit: i, value, skillId, seconds });
    }

    // Phase 2: Compute bit positions to map entry index → bit position.
    // Entries are ordered from lowest set bit to highest.
    let entryIdx = 0;
    for (let word = 0; word < 2; word++) {
      let bits = mask[word];
      let bitPos = BigInt(word * 64);
      while (bits) {
        const lowest = bits & -bits;
        const bit = bitPos + BigInt(Math.clz32(Number(lowest)) ^ 31);
        if (entryIdx < this._rawEntries.length) {
          this._rawEntries[entryIdx].bit = Number(bit);
        }
        entryIdx++;
        bits &= bits - 1n;
      }
    }

    // Phase 3: Populate per-stat fields from decoded entries.
    for (const entry of this._rawEntries) {
      const fieldName = BIT_TO_FIELD[entry.bit];
      if (fieldName && fieldName in this._buff) {
        (this._buff as any)[fieldName] = entry.value;
      }
      // Also store in skillId map for backward compat
      this._stats.set(entry.skillId, { value: entry.value, seconds: entry.seconds });
    }

    // Phase 4: Read special-case inline data AFTER the common loop.
    // These bits carry extra data that the common loop skipped over.
    for (const [bitPos, extraCount] of INLINE_DATA_BITS) {
      if (!this._isBitSet(mask, bitPos)) continue;
      if (bitPos === CTS_DICE) {
        this._diceInfo = [];
        for (let j = 0; j < extraCount; j++) {
          this._diceInfo.push(p.readInt());
        }
      } else if (bitPos === CTS_SWALLOW_BUFF) {
        this._swallowBuffTime = p.readInt();
      } else if (bitPos === CTS_BLESSING_ARMOR) {
        this._blessingArmorIncPAD = p.readInt();
      }
    }

    // Phase 5: Unconditional trailing bytes — DefenseAtt, DefenseState.
    if (p.remaining >= 2) {
      this._defenseAtt = p.readByte();
      this._defenseState = p.readByte();
    }

    // Phase 6: aTemporaryStat[0..6] virtual dispatch (bits 122-128).
    // Each set virtual bit triggers TemporaryStatBase::DecodeForClient.
    // Not yet implemented — these are rare in v95.
  }

  private _isBitSet(mask: bigint[], bit: bigint): boolean {
    if (bit < 64n) {
      return (mask[0] & (1n << bit)) !== 0n;
    }
    return (mask[1] & (1n << (bit - 64n))) !== 0n;
  }
}
