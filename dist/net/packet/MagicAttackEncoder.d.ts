export declare class MagicAttackTarget {
    mobId: number;
    damage: number[];
    hitX: number;
    hitY: number;
    delay: number;
    hitAction: number;
    foreActionAndDir: number;
    constructor(mobId: number, damage: number[], hitX?: number, hitY?: number, delay?: number, hitAction?: number, foreActionAndDir?: number);
}
export interface MagicAttackOptions {
    skillId?: number;
    combatOrders?: number;
    crc?: number;
    /** Only present for magic keydown skills (OG SkillConstants.isMagicKeydownSkill). */
    keyDown?: number;
    /** Present for dragon-summoning magic skills (e.g. Evan). */
    dragon?: {
        x: number;
        y: number;
    };
}
export declare class MagicAttackEncoder {
    /**
     * Encode a UserMagicAttack (InHeader=49) packet.
     *
     * Field-for-field verified against kinoko-main's
     * AttackHandler.handlerUserMagicAttack, kinoko-main/src/main/java/kinoko/handler/user/AttackHandler.java.
     * Differs from UserMeleeAttack: an extra 16-byte DR-check block + dwInit +
     * Crc32 between the first and second crc pairs, a `flag` that's always 0,
     * and a leading boolean before the optional dragon x/y tail (unlike
     * Melee/Shoot/Body's skillId-gated tails, which have no leading flag).
     */
    static Encode(fieldKey: number, actionAndDir: number, attackSpeed: number, userX: number, userY: number, targets: readonly MagicAttackTarget[], damagePerMob?: number, options?: MagicAttackOptions): Uint8Array;
}
//# sourceMappingURL=MagicAttackEncoder.d.ts.map