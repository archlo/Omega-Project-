import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { InHeader, OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { GameSender } from '../../../src/net/senders/GameSender.js';
import { EncodeMovePath } from '../../../src/net/packet/MovePathEncoder.js';

function dispatchPayload(router: PacketRouter, _opcode: number, payload: Uint8Array): void {
  router.dispatch(new InPacket(payload), null as any);
}

describe('MobMove', () => {
  it('opcodes have canonical values', () => {
    expect(InHeader.MobMove).toBe(227);
    expect(InHeader.MobApplyCtrl).toBe(228);
    expect(OutHeader.MobCtrlAck).toBe(288);
    expect(InHeader.UserHit).toBe(52);
    expect(OutHeader.MobHPIndicator).toBe(298);
  });

  it('MobMove encodes Kinoko handleMobMove field order', () => {
    const elements = [{ attr: 0, x: 100, y: 50, vx: 60, vy: 0, fh: 7, moveAction: 0, elapse: 100 }];
    const blob = EncodeMovePath(90, 50, 60, 0, elements);
    const packet = GameSender.MobMove(0x1234, 5, 0, false, blob, false);
    const p = new InPacket(packet.toArray());

    // Header + core fields
    expect(p.readShort()).toBe(InHeader.MobMove);
    expect(p.readInt()).toBe(0x1234);   // mobId
    expect(p.readShort()).toBe(5);       // mobCtrlSn
    expect(p.readByte()).toBe(0);        // actionMask
    expect(p.readByte()).toBe(0);        // actionAndDir (action=0, left=false)
    // Server-required fields before MovePath
    expect(p.readInt()).toBe(0);         // targetInfo
    expect(p.readInt()).toBe(0);         // multiTargetForBallCount
    expect(p.readInt()).toBe(0);         // randTimeForAreaAttackCount
    expect(p.readByte()).toBe(0);        // bActive
    expect(p.readInt()).toBe(0);         // HackedCode
    expect(p.readInt()).toBe(0);         // ptTarget.x
    expect(p.readInt()).toBe(0);         // ptTarget.y
    expect(p.readInt()).toBe(0);         // dwHackedCodeCRC
    // MovePath blob starts here — just verify remaining bytes exist
    expect(p.remaining).toBeGreaterThan(0);
  });

  it('MobMove action and dir packs left bit and chasing flag', () => {
    const blob = EncodeMovePath(0, 0, 0, 0, []);
    const p = new InPacket(GameSender.MobMove(1, 1, 39, true, blob, true).toArray());
    p.readShort(); p.readInt(); p.readShort(); p.readByte();
    expect(p.readByte()).toBe((39 << 1) | 1); // actionAndDir: action=39, left=true
    // Skip server-required fields (4+4+4+1+4+4+4+4 = 29 bytes)
    for (let i = 0; i < 29; i++) p.readByte();
    // MovePath blob (empty = 8 bytes origin + 1 byte count = 9 bytes)
    for (let i = 0; i < 9; i++) p.readByte();
    // Chasing fields
    expect(p.readByte()).toBe(1);        // bChasing (chasing=true)
    expect(p.readByte()).toBe(0);        // pTarget != 0
    expect(p.readByte()).toBe(0);        // pvcActive->bChasing
    expect(p.readByte()).toBe(0);        // pvcActive->bChasingHack
    expect(p.readInt()).toBe(0);         // pvcActive->tChaseDuration
    expect(p.remaining).toBe(0);
  });

  it('MobCtrlAck decode round trips', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onMobCtrlAck = (a: any) => captured = a;

    const pkt = OutPacket.Of(OutHeader.MobCtrlAck);
    pkt.writeInt(0xABCD); pkt.writeShort(42); pkt.writeByte(1);
    pkt.writeShort(500); pkt.writeByte(7); pkt.writeByte(3);
    dispatchPayload(router, OutHeader.MobCtrlAck, pkt.toArray());

    expect(captured).not.toBeNull();
    expect(captured.mobId).toBe(0xABCD);
    expect(captured.mobCtrlSn).toBe(42);
    expect(captured.nextAttackPossible).toBe(true);
    expect(captured.mp).toBe(500);
    expect(captured.nextSkillId).toBe(7);
    expect(captured.nextSkillLevel).toBe(3);
  });

  // Real wire per CUserLocal::SetDamaged (decompile/9343C0.c, pMob-present
  // branch): update_time, attackIdx, magicElemAttr, damage, templateId,
  // mobId (written TWICE — a real duplicate Encode4, not a typo), dir,
  // nX-flag, bGuard, blockedFlag, powerGuardFlag, pGuard.gap0, hitX, hitY,
  // userX, userY, then an unconditional trailing stance byte. The hit/user
  // position block is unconditional whenever a mob is present — there is no
  // real "knockback>1" gate on it.
  it('UserHit body attack encodes hit handler field order, including the duplicate mobId field', () => {
    const p = new InPacket(GameSender.UserHit(0, 0, 15, 100000, 0x12345678, 1).toArray());
    expect(p.readShort()).toBe(InHeader.UserHit);
    expect(p.readInt()).toBe(0); // update_time
    expect(p.readByte()).toBe(0); // attackIdx
    expect(p.readByte()).toBe(0); // magicElemAttr
    expect(p.readInt()).toBe(15); // damage
    expect(p.readInt()).toBe(100000); // templateId
    expect(p.readInt()).toBe(0x12345678); // mobId (1st)
    expect(p.readByte()).toBe(1); // dir
    expect(p.readByte()).toBe(0); // nX-flag
    expect(p.readByte()).toBe(0); // bGuard
    expect(p.readByte()).toBe(1); // blockedFlag (knockback defaults to 1 -> 1)
    expect(p.readByte()).toBe(0); // powerGuardFlag
    expect(p.readInt()).toBe(0x12345678); // mobId (2nd, duplicate)
    expect(p.readByte()).toBe(0); // pGuard.gap0
    expect(p.readShort()).toBe(0); expect(p.readShort()).toBe(0); // hitX, hitY
    expect(p.readShort()).toBe(0); expect(p.readShort()).toBe(0); // userX, userY
    expect(p.readByte()).toBe(0); // stance
    expect(p.remaining).toBe(0);
  });

  it('UserHit knockback>1 sets the blocked flag to 2 and still writes the unconditional position block', () => {
    const p = new InPacket(GameSender.UserHit(0, 0, 10, 100000, 99, 0, 2, 250, -120).toArray());
    p.readShort(); p.readInt(); p.readByte(); p.readByte();
    p.readInt(); p.readInt(); p.readInt(); p.readByte();
    p.readByte(); p.readByte();
    expect(p.readByte()).toBe(2); // blockedFlag (knockback>1 -> 2)
    expect(p.readByte()).toBe(0); // powerGuardFlag
    expect(p.readInt()).toBe(99); // mobId (2nd, duplicate)
    expect(p.readByte()).toBe(0); // pGuard.gap0
    expect(p.readShort()).toBe(0); expect(p.readShort()).toBe(0); // hitX, hitY
    expect(p.readShort()).toBe(250); expect(p.readShort()).toBe(-120); // userX, userY
    expect(p.readByte()).toBe(0); // stance
    expect(p.remaining).toBe(0);
  });

  it('MobHPIndicator decode round trips', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: [number, number] | null = null;
    fh.onMobHpIndicator = (mobId: number, pct: number) => captured = [mobId, pct];

    const pkt = OutPacket.Of(OutHeader.MobHPIndicator);
    pkt.writeInt(0xCAFE); pkt.writeByte(73);
    dispatchPayload(router, OutHeader.MobHPIndicator, pkt.toArray());

    expect(captured).not.toBeNull();
    expect(captured![0]).toBe(0xCAFE);
    expect(captured![1]).toBe(73);
  });

  it('SpecialEffectBySkill decodes mobId/skillId/casterCharId/delay (decompile/6540b0.c)', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onMobSpecialEffectBySkill = (a) => captured = a;

    const pkt = OutPacket.Of(OutHeader.SpecialEffectBySkill);
    pkt.writeInt(0xCAFE); pkt.writeInt(1110001); pkt.writeInt(0xABCD); pkt.writeShort(500);
    dispatchPayload(router, OutHeader.SpecialEffectBySkill, pkt.toArray());

    expect(captured).toEqual({ mobId: 0xCAFE, skillId: 1110001, casterCharId: 0xABCD, delay: 500 });
  });

  it('MobSkillDelay decodes mobId/delayTime/skillId/slv/option (decompile/63d560.c)', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onMobSkillDelay = (a) => captured = a;

    const pkt = OutPacket.Of(OutHeader.MobSkillDelay);
    pkt.writeInt(0xCAFE); pkt.writeInt(2000); pkt.writeInt(120001000); pkt.writeInt(3); pkt.writeInt(0);
    dispatchPayload(router, OutHeader.MobSkillDelay, pkt.toArray());

    expect(captured).toEqual({ mobId: 0xCAFE, delayTime: 2000, skillId: 120001000, slv: 3, option: 0 });
  });
});
