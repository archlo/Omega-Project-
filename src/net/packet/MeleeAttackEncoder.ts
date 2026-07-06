import { OutPacket } from './OutPacket.js';
import { InHeader } from './OpCodes.js';
import { MeleeAttackFlag } from '../protocol/Enums.js';

export class MeleeTarget {
  constructor(
    public mobId: number,
    public damage: number[],
    public hitX = 0,
    public hitY = 0,
    public delay = 0,
    /** nHitAction (OG AttackInfo.hitAction). */
    public hitAction = 0,
    /** nForeAction & 0x7F | (bLeft << 7) (OG AttackInfo.actionAndDir). */
    public foreActionAndDir = 0,
  ) {}
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
  mesoExplosion?: { drops: number[]; dropExplodeDelay: number };
  /** NightWalker.POISON_BOMB: appends grenade x/y after userX/userY. */
  grenade?: { x: number; y: number };
}

export class MeleeAttackEncoder {
  /**
   * Encode a UserMeleeAttack (InHeader=47) packet.
   *
   * Field-for-field verified against kinoko-main's
   * AttackHandler.handlerUserMeleeAttack (the decode side of this exact
   * wire format), kinoko-main/src/main/java/kinoko/handler/user/AttackHandler.java.
   */
  static Encode(
    fieldKey: number,
    actionAndDir: number,
    attackSpeed: number,
    userX: number,
    userY: number,
    targets: readonly MeleeTarget[],
    damagePerMob = 1,
    flag: number = 0,
    options: MeleeAttackOptions = {},
  ): Uint8Array {
    if (damagePerMob < 1 || damagePerMob > 0xF) {
      throw new RangeError('damagePerMob must be 1..15');
    }
    if (targets.length > 0xF) {
      throw new Error('a single melee attack can target at most 15 mobs');
    }

    const p = OutPacket.Of(InHeader.UserMeleeAttack);
    p.writeByte(fieldKey);
    if (options.reactorHit) p.writeByte(1);
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
    if (options.keyDown !== undefined) p.writeInt(options.keyDown);
    p.writeByte(flag);
    p.writeShort(actionAndDir);
    p.writeInt(0); // GETCRC32Svr
    p.writeByte(0); // nAttackActionType
    p.writeByte(attackSpeed);
    p.writeInt(0); // tAttackTime
    p.writeInt(0); // dwID

    for (const t of targets) {
      p.writeInt(t.mobId);
      p.writeByte(t.hitAction);
      p.writeByte(t.foreActionAndDir);
      p.writeByte(0); // nFrameIdx
      p.writeByte(0); // CalcDamageStatIndex & 0x7F | (bCurTemplate << 7)
      p.writeShort(t.hitX);
      p.writeShort(t.hitY);
      p.writeShort(0);
      p.writeShort(0);
      if (options.mesoExplosion) {
        p.writeByte(t.damage.length);
        for (const dmg of t.damage) p.writeInt(dmg);
      } else {
        if (t.damage.length !== damagePerMob) {
          throw new Error(
            `MeleeTarget ${t.mobId} has ${t.damage.length} damage values but damagePerMob is ${damagePerMob}`);
        }
        p.writeShort(t.delay);
        for (const dmg of t.damage) p.writeInt(dmg);
      }
      p.writeInt(0); // CMob::GetCrc
    }

    p.writeShort(userX);
    p.writeShort(userY);

    if (options.grenade) {
      p.writeShort(options.grenade.x);
      p.writeShort(options.grenade.y);
    }

    if (options.mesoExplosion) {
      const { drops, dropExplodeDelay } = options.mesoExplosion;
      p.writeByte(drops.length);
      for (const drop of drops) {
        p.writeInt(drop);
        p.writeByte(0);
      }
      p.writeShort(dropExplodeDelay);
    }

    return p.toArray();
  }
}
