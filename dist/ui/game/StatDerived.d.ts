export declare const DamageMax = 999999;
export interface StatInputs {
    jobId: number;
    str: number;
    dex: number;
    int: number;
    luk: number;
    maxHp: number;
    maxMp: number;
    weaponType: number;
    watk: number;
    matk: number;
    mastery: number;
    speed: number;
    jump: number;
    accBonus: number;
    evaBonus: number;
    pddBonus: number;
    mddBonus: number;
    magicGuardReduction: number;
    powerGuardReduction: number;
    mesoGuardReduction: number;
    holySymbolExpRate: number;
    sharpEyesCritRate: number;
    stanceRate: number;
    shadowPartnerDamageRate: number;
    hyperBodyHpMul: number;
    hyperBodyMpMul: number;
}
export declare function defaultStatInputs(): StatInputs;
export interface DerivedStats {
    minDamage: number;
    maxDamage: number;
    accuracy: number;
    avoidability: number;
    pdd: number;
    mdd: number;
    criticalPercent: number;
    speed: number;
    jump: number;
}
export declare function computeDerived(s: StatInputs): DerivedStats;
export declare function resolvePrimarySecondary(s: StatInputs): [number, number, boolean];
export declare function primaryStatFlag(jobId: number): number;
export interface DefenseOptionData {
    nIgnoreDAM: number;
    nIgnoreDAMProb: number;
    nIgnoreDAMr: number;
    nIgnoreDAMrProb: number;
}
export declare function applyDefenseOption(getEquipOption: (bodyPart: number) => DefenseOptionData | null, nDamage: number): number;
export interface WeaponOptionResult {
    criticalProb: number;
    criticalDamage: number;
    totalDAMr: number;
    bossDAMr: number;
    ignoreTargetDEF: number;
}
export declare function applyWeaponOption(optionData: {
    niCr: number;
    niCDr: number;
    niDAMr: number;
    nBoss: number;
    nIgnoreTargetDEF: number;
} | null): WeaponOptionResult;
export declare function getWeaponType(itemId: number): number;
//# sourceMappingURL=StatDerived.d.ts.map