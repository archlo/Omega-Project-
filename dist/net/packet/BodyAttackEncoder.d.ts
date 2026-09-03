export declare class BodyAttackTarget {
    mobId: number;
    damage: number[];
    hitX: number;
    hitY: number;
    delay: number;
    hitAction: number;
    foreActionAndDir: number;
    constructor(mobId: number, damage: number[], hitX?: number, hitY?: number, delay?: number, hitAction?: number, foreActionAndDir?: number);
}
export interface BodyAttackOptions {
    skillId?: number;
    combatOrders?: number;
    crc?: number;
}
export declare class BodyAttackEncoder {
    /**
     * Encode a UserBodyAttack (InHeader=50) packet.
     *
     * Field-for-field verified against kinoko-main's
     * AttackHandler.handlerUserBodyAttack, kinoko-main/src/main/java/kinoko/handler/user/AttackHandler.java.
     * Identical to UserMeleeAttack except: no reactor-hit/keyDown conditionals.
     */
    static Encode(fieldKey: number, actionAndDir: number, attackSpeed: number, userX: number, userY: number, targets: readonly BodyAttackTarget[], damagePerMob?: number, flag?: number, options?: BodyAttackOptions): Uint8Array;
}
//# sourceMappingURL=BodyAttackEncoder.d.ts.map