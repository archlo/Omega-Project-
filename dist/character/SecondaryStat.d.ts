import { InPacket } from '../net/packet/InPacket.js';
/**
 * Per-stat buff values. Each field stores the raw buff value for that stat type.
 * Only populated when the corresponding bit is set in the TemporaryStatSet mask.
 */
export interface BuffStatValues {
    str: number;
    dex: number;
    int: number;
    luk: number;
    pad: number;
    mad: number;
    pdd: number;
    mdd: number;
    acc: number;
    eva: number;
    speed: number;
    jump: number;
    magicAtk: number;
    magicDef: number;
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
export declare class SecondaryStat {
    /** Flat buff values indexed by stat type. */
    private _buff;
    /** Map skillId → { value, seconds } for backward compat (combo counter, etc.) */
    private _stats;
    /** Per-bit raw entries for inline-data post-processing. */
    private _rawEntries;
    /** DefenseAtt/DefenseState trailing bytes. */
    private _defenseAtt;
    private _defenseState;
    /** Dice info array (22 ints) when CTS_Dice is set. */
    private _diceInfo;
    /** SwallowBuff timer when CTS_SwallowBuff is set. */
    private _swallowBuffTime;
    /** BlessingArmor extra PAD when CTS_BlessingArmor is set. */
    private _blessingArmorIncPAD;
    clear(): void;
    get buff(): Readonly<BuffStatValues>;
    getTempSpeed(): number;
    getTempJump(): number;
    getBasicStatUp(): number;
    get defenseAtt(): number;
    get defenseState(): number;
    get diceInfo(): readonly number[];
    get swallowBuffTime(): number;
    get blessingArmorIncPAD(): number;
    /** Combo counter from skills 1111003/1111004/1111005. */
    getComboCounter(): number;
    getBySkillId(skillId: number): {
        value: number;
        seconds: number;
    } | undefined;
    /** All decoded entries (skillId → { value, seconds }) — backward compat. */
    allEntries(): Iterable<[number, {
        value: number;
        seconds: number;
    }]>;
    /** Total physical ATK buff (equipment PAD + buff PAD). */
    getBuffPAD(): number;
    /** Total magical ATK buff. */
    getBuffMAD(): number;
    /** Total physical DEF buff. */
    getBuffPDD(): number;
    /** Total magical DEF buff. */
    getBuffMDD(): number;
    /** Flat accuracy buff value. */
    getBuffACC(): number;
    /** Flat avoidability buff value. */
    getBuffEVA(): number;
    /** Magic Guard damage-to-MP conversion percentage (0-100). */
    getMagicGuardReduction(): number;
    /** Power Guard damage-to-HP reflection percentage (0-100). */
    getPowerGuardReduction(): number;
    /** Meso Guard damage-to-meso absorption percentage (0-100). */
    getMesoGuardReduction(): number;
    /** Holy Symbol EXP rate bonus (0-100%). */
    getHolySymbolExpRate(): number;
    /** Sharp Eyes critical rate bonus (0-100%). */
    getSharpEyesCritRate(): number;
    /** Stance dodge probability (0-100%). */
    getStanceRate(): number;
    /** DarkSight active (non-zero = active). */
    isDarkSightActive(): boolean;
    /** Booster active (non-zero = active). */
    isBoosterActive(): boolean;
    /** ShadowPartner active (non-zero = active). */
    isShadowPartnerActive(): boolean;
    /** HyperBody active (non-zero = active). */
    isHyperBodyActive(): boolean;
    /** Stun active (non-zero = active). */
    isStunActive(): boolean;
    /** Poison active (non-zero = active). */
    isPoisonActive(): boolean;
    /** Seal active (non-zero = active). */
    isSealActive(): boolean;
    /** Combo counter from aran combo skill (non-zero = active). */
    getAranCombo(): number;
    /** Combo drain percentage. */
    getComboDrainRate(): number;
    /** ShadowPartner damage percentage bonus (0-100%). */
    getShadowPartnerDamageRate(): number;
    /** Booster attack speed bonus (negative = faster). */
    getBoosterSpeedBonus(): number;
    /** HyperBody HP/MP multiplier percentage. */
    getHyperBodyHpMultiplier(): number;
    getHyperBodyMpMultiplier(): number;
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
    decode(p: InPacket): void;
    private _isBitSet;
}
//# sourceMappingURL=SecondaryStat.d.ts.map