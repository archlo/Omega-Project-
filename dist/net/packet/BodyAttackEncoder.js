import { OutPacket } from './OutPacket.js';
import { InHeader } from './OpCodes.js';
export class BodyAttackTarget {
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
export class BodyAttackEncoder {
    /**
     * Encode a UserBodyAttack (InHeader=50) packet.
     *
     * Field-for-field verified against kinoko-main's
     * AttackHandler.handlerUserBodyAttack, kinoko-main/src/main/java/kinoko/handler/user/AttackHandler.java.
     * Identical to UserMeleeAttack except: no reactor-hit/keyDown conditionals.
     */
    static Encode(fieldKey, actionAndDir, attackSpeed, userX, userY, targets, damagePerMob = 1, flag = 0, options = {}) {
        if (damagePerMob < 1 || damagePerMob > 0xF) {
            throw new RangeError('damagePerMob must be 1..15');
        }
        if (targets.length > 0xF) {
            throw new Error('a single body attack can target at most 15 mobs');
        }
        const p = OutPacket.Of(InHeader.UserBodyAttack);
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
        p.writeInt(options.crc ?? 0); // SKILLLEVELDATA::GetCrC
        p.writeInt(0); // SKILLLEVELDATA::GetCrC
        p.writeByte(flag);
        p.writeShort(actionAndDir);
        p.writeInt(0); // GETCRC32Svr
        p.writeByte(0); // nAttackActionType
        p.writeByte(attackSpeed);
        p.writeInt(0); // tAttackTime
        p.writeInt(0); // dwID
        for (const t of targets) {
            if (t.damage.length !== damagePerMob) {
                throw new Error(`BodyAttackTarget ${t.mobId} has ${t.damage.length} damage values but damagePerMob is ${damagePerMob}`);
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
        return p.toArray();
    }
}
//# sourceMappingURL=BodyAttackEncoder.js.map