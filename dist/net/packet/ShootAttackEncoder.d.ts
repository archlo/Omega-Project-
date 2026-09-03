export declare class ShootAttackTarget {
    mobId: number;
    damage: number[];
    hitX: number;
    hitY: number;
    delay: number;
    hitAction: number;
    foreActionAndDir: number;
    constructor(mobId: number, damage: number[], hitX?: number, hitY?: number, delay?: number, hitAction?: number, foreActionAndDir?: number);
}
export interface ShootAttackOptions {
    skillId?: number;
    combatOrders?: number;
    crc?: number;
    /** Only present for shoot keydown skills (OG SkillConstants.isKeydownSkill). */
    keyDown?: number;
    /** bNextShootExJablin && CUserLocal::CheckApplyExJablin. */
    exJablin?: number;
    /** nReduceCount packed into the high nibble of attackSpeed. */
    reduceCount?: number;
    /** Only present when attack.isSpiritJavelin() (flag & 0x40) and the skill
     *  consumes a bullet (OG: !SkillConstants.isShootSkillNotConsumingBullet). */
    bulletItemId?: number;
    /** Only written for Wild Hunter jobs (ptBodyRelMove.y). */
    wildHunterBodyRelMoveY?: number;
    /** ThunderBreaker.SPARK. */
    reserveSpark?: number;
}
export declare class ShootAttackEncoder {
    /**
     * Encode a UserShootAttack (InHeader=48) packet.
     *
     * Field-for-field verified against kinoko-main's
     * AttackHandler.handlerUserShootAttack, kinoko-main/src/main/java/kinoko/handler/user/AttackHandler.java.
     */
    static Encode(fieldKey: number, actionAndDir: number, attackSpeed: number, bulletPosition: number, userX: number, userY: number, ballStartX: number, ballStartY: number, targets: readonly ShootAttackTarget[], damagePerMob?: number, flag?: number, options?: ShootAttackOptions): Uint8Array;
}
//# sourceMappingURL=ShootAttackEncoder.d.ts.map