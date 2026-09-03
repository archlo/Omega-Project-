import type { WzPackage } from '../wz/WzPackage.js';
export interface ItemOptionLevelData {
    prob: number;
    time: number;
    niSTR: number;
    niDEX: number;
    niINT: number;
    niLUK: number;
    niHP: number;
    niMP: number;
    niMaxHP: number;
    niMaxMP: number;
    niACC: number;
    niEVA: number;
    niSpeed: number;
    niJump: number;
    niPAD: number;
    niMAD: number;
    niPDD: number;
    niMDD: number;
    niSTRr: number;
    niDEXr: number;
    niINTr: number;
    niLUKr: number;
    niMaxHPr: number;
    niMaxMPr: number;
    niACCr: number;
    niEVAr: number;
    niPADr: number;
    niMADr: number;
    niPDDr: number;
    niMDDr: number;
    niCr: number;
    niCDr: number;
    niMAMr: number;
    niSkill: number;
    niAllSkill: number;
    nRecoveryHP: number;
    nRecoveryMP: number;
    nRecoveryUP: number;
    nMPConReduce: number;
    nMPConRestore: number;
    nIgnoreTargetDEF: number;
    nIgnoreDAM: number;
    nIgnoreDAMr: number;
    niDAMr: number;
    nDAMReflect: number;
    nAttackType: number;
    niMesoProb: number;
    niRewardProb: number;
    nLevel: number;
    nBoss: number;
}
export interface ItemOptionEntry {
    nItemOptionID: number;
    nReqLevel: number;
    nOptionType: number;
    aLevelData: ItemOptionLevelData[];
}
export interface SocketOptionLevelData {
    niSTR: number;
    niDEX: number;
    niINT: number;
    niLUK: number;
    niMaxHP: number;
    niMaxMP: number;
    niACC: number;
    niEVA: number;
    niSpeed: number;
    niJump: number;
    niPAD: number;
    niMAD: number;
    niPDD: number;
    niMDD: number;
}
export interface SocketOptionEntry {
    nSocketOptionID: number;
    aLevelData: SocketOptionLevelData[];
}
export declare class ItemOptionLoader {
    private _itemWz;
    private _optionCache;
    private _socketCache;
    constructor(_itemWz: WzPackage | null);
    loadItemOption(nItemOptionID: number): ItemOptionEntry | null;
    loadSocketOption(nSocketOptionID: number): SocketOptionEntry | null;
    private _loadItemOption;
    private _loadSocketOption;
}
//# sourceMappingURL=ItemOptionInfo.d.ts.map