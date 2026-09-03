import { OutPacket } from './OutPacket.js';
import { InHeader } from './OpCodes.js';
export class MagicAttackTarget {
    mobId;
    damage;
    hitX;
    hitY;
    delay;
    hitAction;
    foreActionAndDir;
    constructor(mobId, damage, hitX = 0, hitY = 0, delay = 0, hitAction = 0, foreActionAndDir = 0) {
        this.mobId = mobId;
        this.damage = damage;
        this.hitX = hitX;
        this.hitY = hitY;
        this.delay = delay;
        this.hitAction = hitAction;
        this.foreActionAndDir = foreActionAndDir;
    }
}
export class MagicAttackEncoder {
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
    static Encode(fieldKey, actionAndDir, attackSpeed, userX, userY, targets, damagePerMob = 1, options = {}) {
        if (damagePerMob < 1 || damagePerMob > 0xF) {
            throw new RangeError('damagePerMob must be 1..15');
        }
        if (targets.length > 0xF) {
            throw new Error('a single magic attack can target at most 15 mobs');
        }
        const p = OutPacket.Of(InHeader.UserMagicAttack);
        p.writeByte(fieldKey);
        p.writeInt(0); // ~pDrInfo.dr0
        p.writeInt(0); // ~pDrInfo.dr1
        p.writeByte((damagePerMob & 0xF) | ((targets.length & 0xF) << 4));
        p.writeInt(0); // ~pDrInfo.dr2
        p.writeInt(0); // ~pDrInfo.dr3
        p.writeInt(options.skillId ?? 0);
        p.writeByte(options.combatOrders ?? 0);
        p.writeInt(0); // dwKey
        p.writeInt(0); // Crc32
        p.writeBytes(new Uint8Array(16)); // another DR check
        p.writeInt(0); // dwInit
        p.writeInt(0); // Crc32
        p.writeInt(options.crc ?? 0); // SKILLLEVELDATA::GetCrC
        p.writeInt(0); // SKILLLEVELDATA::GetCrC
        if (options.keyDown !== undefined)
            p.writeInt(options.keyDown);
        p.writeByte(0); // flag (OG: always 0 for magic attacks)
        p.writeShort(actionAndDir);
        p.writeInt(0); // GETCRC32Svr
        p.writeByte(0); // nAttackActionType
        p.writeByte(attackSpeed);
        p.writeInt(0); // tAttackTime
        p.writeInt(0); // dwID
        for (const t of targets) {
            if (t.damage.length !== damagePerMob) {
                throw new Error(`MagicAttackTarget ${t.mobId} has ${t.damage.length} damage values but damagePerMob is ${damagePerMob}`);
            }
            p.writeInt(t.mobId);
            p.writeByte(t.hitAction);
            p.writeByte(t.foreActionAndDir);
            p.writeByte(0); // nFrameIdx
            p.writeByte(0); // CalcDamageStatIndex & 0x7F | (bCurTemplate << 7)
            p.writeShort(t.hitX);
            p.writeShort(t.hitY);
            p.writeShort(0);
            p.writeShort(0);
            p.writeShort(t.delay);
            for (const dmg of t.damage)
                p.writeInt(dmg);
            p.writeInt(0); // CMob::GetCrc
        }
        p.writeShort(userX);
        p.writeShort(userY);
        p.writeByte(options.dragon ? 1 : 0);
        if (options.dragon) {
            p.writeShort(options.dragon.x);
            p.writeShort(options.dragon.y);
        }
        return p.toArray();
    }
}
//# sourceMappingURL=MagicAttackEncoder.js.map