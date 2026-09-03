export declare function calcHitRate(acc: number, mobEva: number, atkLevel: number, targetLevel: number, ar?: number): number;
export declare function getWeaponType(itemId: number): number;
export declare function calcBaseDamage(primary: number, secondary: number, tertiary: number, attack: number, k: number): number;
export declare function calcDamageRange(jobId: number, weaponType: number, watk: number, matk: number, str: number, dex: number, int: number, luk: number, mastery: number): {
    min: number;
    max: number;
};
export declare const MeleeDamage: {
    Estimate: (jobId: number, level: number, str: number, dex: number, int: number, luk: number) => {
        min: number;
        max: number;
    };
};
//# sourceMappingURL=MeleeDamage.d.ts.map