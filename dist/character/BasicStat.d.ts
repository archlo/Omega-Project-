export interface BasicStatInput {
    baseStr: number;
    baseDex: number;
    baseInt: number;
    baseLuk: number;
    baseMaxHp: number;
    baseMaxMp: number;
    equipStr: number;
    equipDex: number;
    equipInt: number;
    equipLuk: number;
    equipMaxHp: number;
    equipMaxMp: number;
    equipMaxHPr: number;
    equipMaxMPr: number;
    basicStatIncPct: number;
    forcedStr: number;
    forcedDex: number;
    forcedInt: number;
    forcedLuk: number;
    nMaxHPInc: number;
    nMaxMPInc: number;
    rateStrPct: number;
    rateDexPct: number;
    rateIntPct: number;
    rateLukPct: number;
    rateMaxHPr: number;
    rateMaxMPr: number;
    nMaxHPIncRate: number;
    nConversionMaxHPIncRate: number;
    nMorewildMaxHPIncRate: number;
    nJaguarRidingHPIncRate: number;
    nPdsMHPr: number;
    nPdsMMPr: number;
    nSwallowMaxMPIncRate: number;
}
export interface BasicStatOutput {
    str: number;
    dex: number;
    int: number;
    luk: number;
    maxHp: number;
    maxMp: number;
}
export declare function defaultBasicStatInput(): BasicStatInput;
export declare function computeBasicStat(inp: BasicStatInput): BasicStatOutput;
//# sourceMappingURL=BasicStat.d.ts.map