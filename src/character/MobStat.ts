// CMob::MobStat — full OG v95 stat system (568 bytes in C++)
// Each stat has: n (value), r (rate %), t (expire time), w (option word)
// Processed via UINT128 bitfield flags from ProcessStatSet/ProcessStatReset

/** Bitfield flags for stat set/reset (UINT128) */
export const enum MobStatFlag {
  PAD           = 0,
  PDR           = 1,
  MAD           = 2,
  MDR           = 3,
  ACC           = 4,
  EVA           = 5,
  Speed         = 6,
  Stun          = 7,
  Freeze        = 8,
  Poison        = 9,
  Seal          = 10,
  Darkness      = 11,
  PowerUp       = 12,
  MagicUp       = 13,
  PGuardUp      = 14,
  MGuardUp      = 15,
  Doom          = 16,
  Web           = 17,
  PImmune       = 18,
  MImmune       = 19,
  Showdown      = 20,
  HardSkin      = 21,
  Ambush       = 22,
  Venom         = 23,
  Blind         = 24,
  SealSkill     = 25,
  Dazzle        = 26,
  PCounter      = 27,
  MCounter      = 28,
  PMCounter     = 29,
  DamagedElemAttr = 30,
  HealByDamage  = 31,
  // Bits 32-127: additional stats in UINT128
  Bind          = 32,
  RiseByToss    = 33,
  // ... more as needed
}

export class MobStat {
  // Base stats (from Mob.wz info)
  nLevel = 0;
  aDamagedElemAttr = new Array<number>(8).fill(0); // [fire, ice, lightning, poison, holy, darkness, none, all]

  // Base combat stats
  nPAD = 0;
  nPDR = 0;
  nMAD = 0;
  nMDR = 0;
  nACC = 0;
  nEVA = 0;
  nSpeed = 0;

  // Buff/debuff stats: n=value, r=rate%, t=expire_ms, w=option
  nPAD_ = 0; rPAD_ = 0; tPAD_ = 0;
  nPDR_ = 0; rPDR_ = 0; tPDR_ = 0;
  nMAD_ = 0; rMAD_ = 0; tMAD_ = 0;
  nMDR_ = 0; rMDR_ = 0; tMDR_ = 0;
  nACC_ = 0; rACC_ = 0; tACC_ = 0;
  nEVA_ = 0; rEVA_ = 0; tEVA_ = 0;
  nSpeed_ = 0; rSpeed_ = 0; tSpeed_ = 0;

  // Debuffs
  nStun_ = 0; rStun_ = 0; tStun_ = 0;
  nFreeze_ = 0; rFreeze_ = 0; tFreeze_ = 0;
  nPoison_ = 0; rPoison_ = 0; tPoison_ = 0; wPoison_ = 0;
  nSeal_ = 0; rSeal_ = 0; tSeal_ = 0;
  nDarkness_ = 0; rDarkness_ = 0; tDarkness_ = 0;
  nWeb_ = 0; rWeb_ = 0; tWeb_ = 0; wWeb_ = 0;
  nBind_ = 0; rBind_ = 0; tBind_ = 0;

  // Buffs
  nPowerUp_ = 0; rPowerUp_ = 0; tPowerUp_ = 0;
  nMagicUp_ = 0; rMagicUp_ = 0; tMagicUp_ = 0;
  nPGuardUp_ = 0; rPGuardUp_ = 0; tPGuardUp_ = 0;
  nMGuardUp_ = 0; rMGuardUp_ = 0; tMGuardUp_ = 0;
  nShowdown_ = 0; rShowdown_ = 0; tShowdown_ = 0;
  nHardSkin_ = 0; rHardSkin_ = 0; tHardSkin_ = 0;

  // Immunities
  nPImmune_ = 0; rPImmune_ = 0; tPImmune_ = 0;
  nMImmune_ = 0; rMImmune_ = 0; tMImmune_ = 0;

  // Special
  nDoom_ = 0; rDoom_ = 0; tDoom_ = 0;
  nAmbush_ = 0; rAmbush_ = 0; tAmbush_ = 0;
  nVenom_ = 0; rVenom_ = 0; tVenom_ = 0;
  nBlind_ = 0; rBlind_ = 0; tBlind_ = 0;
  nSealSkill_ = 0; rSealSkill_ = 0; tSealSkill_ = 0;
  nDazzle_ = 0; rDazzle_ = 0; tDazzle_ = 0;
  nPCounter_ = 0; rPCounter_ = 0; tPCounter_ = 0;
  nMCounter_ = 0; rMCounter_ = 0; tMCounter_ = 0;
  nPMCounter_ = 0; rPMCounter_ = 0; tPMCounter_ = 0;
  nHealByDamage_ = 0; rHealByDamage_ = 0; tHealByDamage_ = 0;
  nRiseByToss_ = 0; rRiseByToss_ = 0; tRiseByToss_ = 0;

  // DamagedElemAttr (element damage adjustment)
  rDamagedElemAttr_ = 0;

  /** Get effective PAD (base + buff) */
  get EffectivePAD(): number { return this.nPAD + this.nPAD_ + Math.floor(this.nPAD * this.rPAD_ / 100); }
  /** Get effective PDR */
  get EffectivePDR(): number { return this.nPDR + this.nPDR_ + Math.floor(this.nPDR * this.rPDR_ / 100); }
  /** Get effective MAD */
  get EffectiveMAD(): number { return this.nMAD + this.nMAD_ + Math.floor(this.nMAD * this.rMAD_ / 100); }
  /** Get effective MDR */
  get EffectiveMDR(): number { return this.nMDR + this.nMDR_ + Math.floor(this.nMDR * this.rMDR_ / 100); }
  /** Get effective ACC */
  get EffectiveACC(): number { return this.nACC + this.nACC_ + Math.floor(this.nACC * this.rACC_ / 100); }
  /** Get effective EVA */
  get EffectiveEVA(): number { return this.nEVA + this.nEVA_ + Math.floor(this.nEVA * this.rEVA_ / 100); }
  /** Get effective Speed */
  get EffectiveSpeed(): number { return this.nSpeed + this.nSpeed_ + Math.floor(this.nSpeed * this.rSpeed_ / 100); }

  /** Check if mob is stunned */
  get IsStunned(): boolean { return this.tStun_ > 0; }
  /** Check if mob is frozen */
  get IsFrozen(): boolean { return this.tFreeze_ > 0; }
  /** Check if mob is poisoned */
  get IsPoisoned(): boolean { return this.tPoison_ > 0; }
  /** Check if mob is sealed */
  get IsSealed(): boolean { return this.tSeal_ > 0; }
  /** Check if mob is blinded */
  get IsBlinded(): boolean { return this.tDarkness_ > 0; }
  /** Check if mob is webbed */
  get IsWebbed(): boolean { return this.tWeb_ > 0; }
  /** Check if mob is doomed */
  get IsDoomed(): boolean { return this.tDoom_ > 0; }
  /** Check if mob is bound */
  get IsBound(): boolean { return this.tBind_ > 0; }
  /** Check if mob is disabled (invisible) */
  get IsDisabled(): boolean { return false; } // bDisable flag
  /** Check if mob is physically immune */
  get IsPImmune(): boolean { return this.tPImmune_ > 0; }
  /** Check if mob is magically immune */
  get IsMImmune(): boolean { return this.tMImmune_ > 0; }
  /** Check if mob has magic guard up buff */
  get HasMGuardUp(): boolean { return this.tMGuardUp_ > 0; }
  /** Check if mob has physical guard up buff */
  get HasPGuardUp(): boolean { return this.tPGuardUp_ > 0; }

  /** Initialize from base MobInfo stats */
  InitFromInfo(pad: number, pdr: number, mad: number, mdr: number, acc: number, eva: number): void {
    this.nPAD = pad;
    this.nPDR = pdr;
    this.nMAD = mad;
    this.nMDR = mdr;
    this.nACC = acc;
    this.nEVA = eva;
  }

  /** Reset all temporary stats (on death/leave) */
  ResetAll(): void {
    this.nPAD_ = 0; this.rPAD_ = 0; this.tPAD_ = 0;
    this.nPDR_ = 0; this.rPDR_ = 0; this.tPDR_ = 0;
    this.nMAD_ = 0; this.rMAD_ = 0; this.tMAD_ = 0;
    this.nMDR_ = 0; this.rMDR_ = 0; this.tMDR_ = 0;
    this.nACC_ = 0; this.rACC_ = 0; this.tACC_ = 0;
    this.nEVA_ = 0; this.rEVA_ = 0; this.tEVA_ = 0;
    this.nSpeed_ = 0; this.rSpeed_ = 0; this.tSpeed_ = 0;
    this.nStun_ = 0; this.rStun_ = 0; this.tStun_ = 0;
    this.nFreeze_ = 0; this.rFreeze_ = 0; this.tFreeze_ = 0;
    this.nPoison_ = 0; this.rPoison_ = 0; this.tPoison_ = 0; this.wPoison_ = 0;
    this.nSeal_ = 0; this.rSeal_ = 0; this.tSeal_ = 0;
    this.nDarkness_ = 0; this.rDarkness_ = 0; this.tDarkness_ = 0;
    this.nPowerUp_ = 0; this.rPowerUp_ = 0; this.tPowerUp_ = 0;
    this.nMagicUp_ = 0; this.rMagicUp_ = 0; this.tMagicUp_ = 0;
    this.nPGuardUp_ = 0; this.rPGuardUp_ = 0; this.tPGuardUp_ = 0;
    this.nMGuardUp_ = 0; this.rMGuardUp_ = 0; this.tMGuardUp_ = 0;
    this.nDoom_ = 0; this.rDoom_ = 0; this.tDoom_ = 0;
    this.nWeb_ = 0; this.rWeb_ = 0; this.tWeb_ = 0; this.wWeb_ = 0;
    this.nPImmune_ = 0; this.rPImmune_ = 0; this.tPImmune_ = 0;
    this.nMImmune_ = 0; this.rMImmune_ = 0; this.tMImmune_ = 0;
    this.nShowdown_ = 0; this.rShowdown_ = 0; this.tShowdown_ = 0;
    this.nHardSkin_ = 0; this.rHardSkin_ = 0; this.tHardSkin_ = 0;
    this.nAmbush_ = 0; this.rAmbush_ = 0; this.tAmbush_ = 0;
    this.nVenom_ = 0; this.rVenom_ = 0; this.tVenom_ = 0;
    this.nBlind_ = 0; this.rBlind_ = 0; this.tBlind_ = 0;
    this.nSealSkill_ = 0; this.rSealSkill_ = 0; this.tSealSkill_ = 0;
    this.nDazzle_ = 0; this.rDazzle_ = 0; this.tDazzle_ = 0;
    this.nPCounter_ = 0; this.rPCounter_ = 0; this.tPCounter_ = 0;
    this.nMCounter_ = 0; this.rMCounter_ = 0; this.tMCounter_ = 0;
    this.nPMCounter_ = 0; this.rPMCounter_ = 0; this.tPMCounter_ = 0;
    this.nHealByDamage_ = 0; this.rHealByDamage_ = 0; this.tHealByDamage_ = 0;
    this.nRiseByToss_ = 0; this.rRiseByToss_ = 0; this.tRiseByToss_ = 0;
    this.nBind_ = 0; this.rBind_ = 0; this.tBind_ = 0;
  }

  /** Tick all temporary stats (call each frame with dt in seconds) */
  Update(dt: number): void {
    const tick = (field: { value: number }, decay: number) => {
      if (field.value > 0) {
        field.value = Math.max(0, field.value - dt * 1000);
      }
    };
    // Tick all t* fields
    const fields = [
      'tPAD_', 'tPDR_', 'tMAD_', 'tMDR_', 'tACC_', 'tEVA_', 'tSpeed_',
      'tStun_', 'tFreeze_', 'tPoison_', 'tSeal_', 'tDarkness_',
      'tPowerUp_', 'tMagicUp_', 'tPGuardUp_', 'tMGuardUp_',
      'tDoom_', 'tWeb_', 'tPImmune_', 'tMImmune_',
      'tShowdown_', 'tHardSkin_', 'tAmbush_', 'tVenom_',
      'tBlind_', 'tSealSkill_', 'tDazzle_',
      'tPCounter_', 'tMCounter_', 'tPMCounter_',
      'tHealByDamage_', 'tRiseByToss_', 'tBind_',
    ] as const;
    for (const f of fields) {
      const val = (this as any)[f] as number;
      if (val > 0) {
        (this as any)[f] = Math.max(0, val - dt * 1000);
      }
    }
  }
}
