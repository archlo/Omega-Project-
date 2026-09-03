/** Bitfield flags for stat set/reset (UINT128) */
export declare const enum MobStatFlag {
    PAD = 0,
    PDR = 1,
    MAD = 2,
    MDR = 3,
    ACC = 4,
    EVA = 5,
    Speed = 6,
    Stun = 7,
    Freeze = 8,
    Poison = 9,
    Seal = 10,
    Darkness = 11,
    PowerUp = 12,
    MagicUp = 13,
    PGuardUp = 14,
    MGuardUp = 15,
    Doom = 16,
    Web = 17,
    PImmune = 18,
    MImmune = 19,
    Showdown = 20,
    HardSkin = 21,
    Ambush = 22,
    Venom = 23,
    Blind = 24,
    SealSkill = 25,
    Dazzle = 26,
    PCounter = 27,
    MCounter = 28,
    PMCounter = 29,
    DamagedElemAttr = 30,
    HealByDamage = 31,
    Bind = 32,
    RiseByToss = 33
}
export declare class MobStat {
    nLevel: number;
    aDamagedElemAttr: number[];
    nPAD: number;
    nPDR: number;
    nMAD: number;
    nMDR: number;
    nACC: number;
    nEVA: number;
    nSpeed: number;
    nPAD_: number;
    rPAD_: number;
    tPAD_: number;
    nPDR_: number;
    rPDR_: number;
    tPDR_: number;
    nMAD_: number;
    rMAD_: number;
    tMAD_: number;
    nMDR_: number;
    rMDR_: number;
    tMDR_: number;
    nACC_: number;
    rACC_: number;
    tACC_: number;
    nEVA_: number;
    rEVA_: number;
    tEVA_: number;
    nSpeed_: number;
    rSpeed_: number;
    tSpeed_: number;
    nStun_: number;
    rStun_: number;
    tStun_: number;
    nFreeze_: number;
    rFreeze_: number;
    tFreeze_: number;
    nPoison_: number;
    rPoison_: number;
    tPoison_: number;
    wPoison_: number;
    nSeal_: number;
    rSeal_: number;
    tSeal_: number;
    nDarkness_: number;
    rDarkness_: number;
    tDarkness_: number;
    nWeb_: number;
    rWeb_: number;
    tWeb_: number;
    wWeb_: number;
    nBind_: number;
    rBind_: number;
    tBind_: number;
    nPowerUp_: number;
    rPowerUp_: number;
    tPowerUp_: number;
    nMagicUp_: number;
    rMagicUp_: number;
    tMagicUp_: number;
    nPGuardUp_: number;
    rPGuardUp_: number;
    tPGuardUp_: number;
    nMGuardUp_: number;
    rMGuardUp_: number;
    tMGuardUp_: number;
    nShowdown_: number;
    rShowdown_: number;
    tShowdown_: number;
    nHardSkin_: number;
    rHardSkin_: number;
    tHardSkin_: number;
    nPImmune_: number;
    rPImmune_: number;
    tPImmune_: number;
    nMImmune_: number;
    rMImmune_: number;
    tMImmune_: number;
    nDoom_: number;
    rDoom_: number;
    tDoom_: number;
    nAmbush_: number;
    rAmbush_: number;
    tAmbush_: number;
    nVenom_: number;
    rVenom_: number;
    tVenom_: number;
    nBlind_: number;
    rBlind_: number;
    tBlind_: number;
    nSealSkill_: number;
    rSealSkill_: number;
    tSealSkill_: number;
    nDazzle_: number;
    rDazzle_: number;
    tDazzle_: number;
    nPCounter_: number;
    rPCounter_: number;
    tPCounter_: number;
    nMCounter_: number;
    rMCounter_: number;
    tMCounter_: number;
    nPMCounter_: number;
    rPMCounter_: number;
    tPMCounter_: number;
    nHealByDamage_: number;
    rHealByDamage_: number;
    tHealByDamage_: number;
    nRiseByToss_: number;
    rRiseByToss_: number;
    tRiseByToss_: number;
    rDamagedElemAttr_: number;
    /** Get effective PAD (base + buff) */
    get EffectivePAD(): number;
    /** Get effective PDR */
    get EffectivePDR(): number;
    /** Get effective MAD */
    get EffectiveMAD(): number;
    /** Get effective MDR */
    get EffectiveMDR(): number;
    /** Get effective ACC */
    get EffectiveACC(): number;
    /** Get effective EVA */
    get EffectiveEVA(): number;
    /** Get effective Speed */
    get EffectiveSpeed(): number;
    /** Check if mob is stunned */
    get IsStunned(): boolean;
    /** Check if mob is frozen */
    get IsFrozen(): boolean;
    /** Check if mob is poisoned */
    get IsPoisoned(): boolean;
    /** Check if mob is sealed */
    get IsSealed(): boolean;
    /** Check if mob is blinded */
    get IsBlinded(): boolean;
    /** Check if mob is webbed */
    get IsWebbed(): boolean;
    /** Check if mob is doomed */
    get IsDoomed(): boolean;
    /** Check if mob is bound */
    get IsBound(): boolean;
    /** Check if mob is disabled (invisible) */
    get IsDisabled(): boolean;
    /** Check if mob is physically immune */
    get IsPImmune(): boolean;
    /** Check if mob is magically immune */
    get IsMImmune(): boolean;
    /** Check if mob has magic guard up buff */
    get HasMGuardUp(): boolean;
    /** Check if mob has physical guard up buff */
    get HasPGuardUp(): boolean;
    /** Initialize from base MobInfo stats */
    InitFromInfo(pad: number, pdr: number, mad: number, mdr: number, acc: number, eva: number): void;
    /** Reset all temporary stats (on death/leave) */
    ResetAll(): void;
    /** Tick all temporary stats (call each frame with dt in seconds) */
    Update(dt: number): void;
}
//# sourceMappingURL=MobStat.d.ts.map