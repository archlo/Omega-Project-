export declare class MeleeTarget {
    mobId: number;
    damage: number[];
    hitX: number;
    hitY: number;
    delay: number;
    /** nHitAction (OG AttackInfo.hitAction). */
    hitAction: number;
    /** nForeAction & 0x7F | (bLeft << 7) (OG AttackInfo.actionAndDir). */
    foreActionAndDir: number;
    constructor(mobId: number, damage: number[], hitX?: number, hitY?: number, delay?: number, 
    /** nHitAction (OG AttackInfo.hitAction). */
    hitAction?: number, 
    /** nForeAction & 0x7F | (bLeft << 7) (OG AttackInfo.actionAndDir). */
    foreActionAndDir?: number);
}
export interface MeleeAttackOptions {
    skillId?: number;
    combatOrders?: number;
    /** SKILLLEVELDATA::GetCrC. */
    crc?: number;
    /** Only present for keydown skills (OG SkillConstants.isKeydownSkill). */
    keyDown?: number;
    /** Set when an extra byte is sent because a reactor was hit (OG: only way
     *  to detect this server-side is that the packet is exactly 60 bytes). */
    reactorHit?: boolean;
    /** Thief.MESO_EXPLOSION: switches per-target damage encoding to
     *  attackCount:byte + N*damage:int (instead of delay:short + fixed
     *  damagePerMob*int), and appends a trailing global drops block. */
    mesoExplosion?: {
        drops: number[];
        dropExplodeDelay: number;
    };
    /** NightWalker.POISON_BOMB: appends grenade x/y after userX/userY. */
    grenade?: {
        x: number;
        y: number;
    };
}
export declare class MeleeAttackEncoder {
    /**
     * Encode a UserMeleeAttack (InHeader=47) packet.
     *
     * Field-for-field verified against kinoko-main's
     * AttackHandler.handlerUserMeleeAttack (the decode side of this exact
     * wire format), kinoko-main/src/main/java/kinoko/handler/user/AttackHandler.java.
     */
    static Encode(fieldKey: number, actionAndDir: number, attackSpeed: number, userX: number, userY: number, targets: readonly MeleeTarget[], damagePerMob?: number, flag?: number, options?: MeleeAttackOptions): Uint8Array;
}
//# sourceMappingURL=MeleeAttackEncoder.d.ts.map