import { describe, it, expect, beforeEach } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';

function dispatchPayload(router: PacketRouter, opcode: number, payload: Uint8Array, session?: any): void {
  const buf = new Uint8Array(2 + payload.length);
  buf[0] = opcode & 0xFF;
  buf[1] = (opcode >> 8) & 0xFF;
  buf.set(payload, 2);
  router.dispatch(new InPacket(buf), session);
}

function makeSession(): any {
  const sent: OutPacket[] = [];
  return { send: (p: OutPacket) => sent.push(p), machineId: new Uint8Array(16), isConnected: true, sent };
}

type Args = { [key: string]: any };

function writeCharacterStat(
  p: OutPacket,
  opts: { id?: number; name?: string; gender?: number; skin?: number; face?: number; hair?: number; pet1?: bigint; pet2?: bigint; pet3?: bigint; level?: number; job?: number } = {},
): void {
  const job = opts.job ?? 100;
  p.writeInt(opts.id ?? 1001);
  p.writeBytes(new TextEncoder().encode((opts.name ?? 'Hero').padEnd(13, '\0')));
  p.writeByte(opts.gender ?? 0); p.writeByte(opts.skin ?? 0);
  p.writeInt(opts.face ?? 0); p.writeInt(opts.hair ?? 0);
  p.writeLong(opts.pet1 ?? 0n); p.writeLong(opts.pet2 ?? 0n); p.writeLong(opts.pet3 ?? 0n);
  p.writeByte(opts.level ?? 50); p.writeShort(job);
  p.writeShort(4); p.writeShort(5); p.writeShort(6); p.writeShort(7);
  p.writeInt(500); p.writeInt(1000); p.writeInt(200); p.writeInt(500); p.writeShort(10);
  p.writeByte(0); p.writeByte(0);
  p.writeInt(0); p.writeShort(0); p.writeInt(0); p.writeInt(100000000); p.writeByte(0); p.writeInt(0); p.writeShort(0);
}

function writeEquipItem(p: OutPacket, itemId: number): void {
  p.writeByte(1); p.writeInt(itemId); p.writeByte(0); p.writeLong(0n);
  p.writeByte(0); p.writeByte(0);
  for (let i = 0; i < 15; i++) p.writeShort(0);
  p.writeString(''); p.writeShort(0);
  p.writeByte(0); p.writeByte(0);
  p.writeInt(0); p.writeInt(0); p.writeInt(0);
  p.writeByte(0); p.writeByte(0);
  for (let i = 0; i < 5; i++) p.writeShort(0);
  p.writeLong(0n); p.writeLong(0n); p.writeInt(0);
}

function writeCharacterDataPrefix(p: OutPacket, flag: bigint): void {
  p.writeLong(flag);
  p.writeByte(0); // combatOrders
  p.writeByte(0); // no remove-SN block
}

describe('FieldHandlers', () => {
  let router: PacketRouter;
  let handlers: FieldHandlers;
  let session: any;

  beforeEach(() => {
    router = new PacketRouter();
    handlers = new FieldHandlers();
    handlers.register(router);
    session = makeSession();
  });

  it('OpenSkillGuide fires its callback without reading payload fields', () => {
    let count = 0;
    handlers.onOpenSkillGuide = () => count++;
    dispatchPayload(router, OutHeader.OpenSkillGuide, new Uint8Array(0));
    expect(count).toBe(1);
  });

  it('SetField non-migrate fires callback', () => {
    const args: Args[] = [];
    handlers.onSetField = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeShort(0); p.writeInt(1); p.writeInt(0); p.writeByte(100); p.writeByte(0); p.writeShort(0);
    p.writeByte(0); p.writeInt(100000000); p.writeByte(0); p.writeInt(0); p.writeByte(0);
    dispatchPayload(router, OutHeader.SetField, p.toArray());
    expect(args).toHaveLength(1);
    expect(args[0].channelId).toBe(1);
    expect(args[0].characterId).toBe(0);
    expect(args[0].fieldKey).toBe(100);
    expect(args[0].isMigrate).toBe(false);
    expect(args[0].nNotifierCheck).toBe(0);
    expect(args[0].nFieldType).toBe(0);
    expect(args[0].posMap).toBe(100000000);
    expect(args[0].portal).toBe(0);
    expect(args[0].mobCapacity).toBe(0);
  });

  it('SetField migrate decodes char stat', () => {
    const args: Args[] = [];
    handlers.onSetField = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeShort(0); p.writeInt(2); p.writeInt(0); p.writeByte(200); p.writeByte(1); p.writeShort(0);
    p.writeInt(1); p.writeInt(2); p.writeInt(3);
    writeCharacterDataPrefix(p, 0x1n);
    writeCharacterStat(p);
    p.writeByte(20); p.writeByte(0); // friendMax, no linkedCharacter
    dispatchPayload(router, OutHeader.SetField, p.toArray());
    expect(args).toHaveLength(1);
    expect(args[0].channelId).toBe(2);
    expect(args[0].characterId).toBe(0);
    expect(args[0].fieldKey).toBe(200);
    expect(args[0].isMigrate).toBe(true);
    expect(args[0].nNotifierCheck).toBe(0);
    expect(args[0].calcDamageSeed1).toBe(1);
    expect(args[0].calcDamageSeed2).toBe(2);
    expect(args[0].calcDamageSeed3).toBe(3);
    expect(args[0].dwFlag).toBe(0x1n);
    expect(args[0].gender).toBe(0);
    expect(args[0].skin).toBe(0);
    expect(args[0].stat).toBeDefined();
    expect(args[0].stat.characterId).toBe(1001);
    expect(args[0].stat.level).toBe(50);
    expect(args[0].look).toBeDefined();
    expect(args[0].look!.gender).toBe(0);
    expect(args[0].look!.skin).toBe(0);
  });

  it('SetField migrate decodes full AvatarLook with equips, weapon sticker, and pets', () => {
    const args: Args[] = [];
    handlers.onSetField = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    // SetField header starts with CClientOptMan::DecodeOpt payload.
    p.writeShort(1); p.writeInt(0x1234); p.writeInt(0x5678);
    p.writeInt(3); p.writeInt(42); p.writeByte(1); p.writeByte(1); p.writeShort(0);
    // migrate-specific
    p.writeInt(111); p.writeInt(222); p.writeInt(333);
    writeCharacterDataPrefix(p, 0x1n | 0x4n);
    writeCharacterStat(p, { id: 42, name: 'TestHero', gender: 1, skin: 7, face: 20001, hair: 30001, pet1: 500001n, level: 120, job: 412 });
    p.writeByte(20); p.writeByte(0); // friendMax, no linkedCharacter
    p.writeShort(1); writeEquipItem(p, 10020001);
    p.writeShort(5); writeEquipItem(p, 10420001);
    p.writeShort(6); writeEquipItem(p, 10620001);
    p.writeShort(7); writeEquipItem(p, 10720001);
    p.writeShort(9); writeEquipItem(p, 11020001);
    p.writeShort(11); writeEquipItem(p, 13020001);
    p.writeShort(0);
    p.writeShort(5); writeEquipItem(p, 10490001); // cash top overrides regular top
    p.writeShort(11); writeEquipItem(p, 17020001); // cash weapon becomes weaponStickerId
    p.writeShort(0);
    p.writeShort(0); // equip inventory
    p.writeShort(0); // dragon equip
    p.writeShort(0); // mechanic equip
    dispatchPayload(router, OutHeader.SetField, p.toArray());
    expect(args).toHaveLength(1);
    // Header fields
    expect(args[0].channelId).toBe(3);
    expect(args[0].characterId).toBe(42);
    expect(args[0].fieldKey).toBe(1);
    expect(args[0].isMigrate).toBe(true);
    expect(args[0].nNotifierCheck).toBe(0);
    expect(args[0].calcDamageSeed1).toBe(111);
    expect(args[0].calcDamageSeed2).toBe(222);
    expect(args[0].calcDamageSeed3).toBe(333);
    expect(args[0].dwFlag).toBe(0x1n | 0x4n);
    expect(args[0].gender).toBe(1);
    expect(args[0].skin).toBe(7);
    // CharacterStat
    expect(args[0].stat.characterId).toBe(42);
    expect(args[0].stat.name).toBe('TestHero');
    expect(args[0].stat.gender).toBe(1);
    expect(args[0].stat.skin).toBe(7);
    expect(args[0].stat.face).toBe(20001);
    expect(args[0].stat.hair).toBe(30001);
    expect(args[0].stat.level).toBe(120);
    expect(args[0].stat.job).toBe(412);
    expect(args[0].stat.str).toBe(4);
    expect(args[0].stat.dex).toBe(5);
    expect(args[0].stat.int).toBe(6);
    expect(args[0].stat.luk).toBe(7);
    expect(args[0].stat.hp).toBe(500);
    expect(args[0].stat.maxHp).toBe(1000);
    expect(args[0].stat.mp).toBe(200);
    expect(args[0].stat.maxMp).toBe(500);
    expect(args[0].stat.ap).toBe(10);
    // AvatarLook
    expect(args[0].look).toBeDefined();
    expect(args[0].look!.gender).toBe(1);
    expect(args[0].look!.skin).toBe(7);
    expect(args[0].look!.face).toBe(20001);
    expect(args[0].look!.hair).toBe(30001);
    expect(args[0].look!.hairEquip.get(1)).toBe(10020001);
    expect(args[0].look!.hairEquip.get(5)).toBe(10490001);
    expect(args[0].look!.hairEquip.get(6)).toBe(10620001);
    expect(args[0].look!.hairEquip.get(7)).toBe(10720001);
    expect(args[0].look!.hairEquip.get(9)).toBe(11020001);
    expect(args[0].look!.hairEquip.get(11)).toBe(13020001);
    expect(args[0].look!.hairEquip.size).toBe(6);
    expect(args[0].look!.unseenEquip.get(5)).toBe(10420001);
    expect(args[0].look!.unseenEquip.size).toBe(1);
    expect(args[0].look!.weaponStickerId).toBe(17020001);
    expect(args[0].look!.petIds).toEqual([500001, 0, 0]);
  });

  it('AliveReq sends AliveAck back', () => {
    dispatchPayload(router, OutHeader.AliveReq, new Uint8Array(0), session);
    expect(session.sent).toHaveLength(1);
    expect(session.sent[0].toArray()[0]).toBe(25);
  });

  it('StatChanged fires with mask fields', () => {
    const args: Args[] = [];
    handlers.onStatChanged = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(0);
    p.writeLong(0x10005n);
    p.writeByte(3); p.writeInt(20000); p.writeInt(9999);
    p.writeByte(0);
    dispatchPayload(router, OutHeader.StatChanged, p.toArray());
    expect(args).toHaveLength(1);
    expect(args[0].skin).toBe(3);
    expect(args[0].hair).toBe(20000);
    expect(args[0].exp).toBe(9999);
  });

  it('MobEnterField fires callback', () => {
    const args: Args[] = [];
    handlers.onMobEnter = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeInt(5001);       // mobId
    p.writeByte(0);         // bSummoned
    p.writeInt(2100103);    // templateId
    p.writeByte(0);         // moveAction
    p.writeByte(0);         // controllerFlag
    p.writeShort(0);        // usCtrlSN
    p.writeInt(0);          // dwMobStatFlag
    p.writeShort(100);      // x
    p.writeShort(200);      // y
    p.writeShort(12);       // fhId
    p.writeShort(80);       // rx0
    p.writeShort(120);      // rx1
    p.writeByte(-1);        // summonType, no summon id
    p.writeInt(1000);       // maxHp
    p.writeInt(900);        // curHp
    p.writeByte(0);         // team
    p.writeByte(0);         // bEffect
    p.writeByte(0);         // isBoss
    dispatchPayload(router, OutHeader.MobEnterField, p.toArray());
    expect(args).toHaveLength(1);
    expect(args[0].mobId).toBe(5001);
    expect(args[0].templateId).toBe(2100103);
    expect(args[0].x).toBe(100);
    expect(args[0].y).toBe(200);
  });

  it('MobLeaveField fires callback', () => {
    const ids: number[] = [];
    handlers.onMobLeave = (id) => ids.push(id);
    const p = OutPacket.Raw();
    p.writeInt(42); p.writeByte(0);
    dispatchPayload(router, OutHeader.MobLeaveField, p.toArray());
    expect(ids).toEqual([42]);
  });

  it('MobChangeController sends ack for controller', () => {
    const calls: any[] = [];
    handlers.onMobChangeController = (mobId, isCtrl) => calls.push({ mobId, isCtrl });
    const p = OutPacket.Raw();
    p.writeByte(1); p.writeInt(999);
    dispatchPayload(router, OutHeader.MobChangeController, p.toArray(), session);
    expect(calls).toHaveLength(1);
    expect(calls[0].mobId).toBe(999);
    expect(calls[0].isCtrl).toBe(true);
  });

  it('MobChangeController no ack for non-controller', () => {
    const calls: any[] = [];
    handlers.onMobChangeController = (mobId, isCtrl) => calls.push({ mobId, isCtrl });
    const p = OutPacket.Raw();
    p.writeByte(0); p.writeInt(998);
    dispatchPayload(router, OutHeader.MobChangeController, p.toArray(), session);
    expect(calls).toHaveLength(1);
    expect(calls[0].isCtrl).toBe(false);
    expect(session.sent).toHaveLength(0);
  });

  it('MobMove fires callback', () => {
    const args: Args[] = [];
    handlers.onMobMove = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeInt(777);
    p.writeByte(0); p.writeByte(0); p.writeByte(0); p.writeByte(0); p.writeInt(0);
    p.writeInt(0); p.writeInt(0);
    p.writeShort(50); p.writeShort(60);
    dispatchPayload(router, OutHeader.MobMove, p.toArray());
    expect(args).toHaveLength(1);
    expect(args[0].mobId).toBe(777);
    expect(args[0].x).toBe(50);
    expect(args[0].y).toBe(60);
  });

  it('MobDamaged fires callback', () => {
    const args: Args[] = [];
    handlers.onMobDamaged = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeInt(888); p.writeByte(0); p.writeInt(150); p.writeInt(500); p.writeInt(5000);
    dispatchPayload(router, OutHeader.MobDamaged, p.toArray());
    expect(args).toHaveLength(1);
    expect(args[0].mobId).toBe(888);
    expect(args[0].damage).toBe(150);
    expect(args[0].hp).toBe(500);
    expect(args[0].maxHp).toBe(5000);
  });

  it('NpcEnterField fires callback', () => {
    const args: Args[] = [];
    handlers.onNpcEnter = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeInt(10); p.writeInt(1012100);
    p.writeShort(300); p.writeShort(400); p.writeByte(1); p.writeShort(0); p.writeShort(0); p.writeShort(0);
    dispatchPayload(router, OutHeader.NpcEnterField, p.toArray());
    expect(args).toHaveLength(1);
    expect(args[0].objId).toBe(10);
    expect(args[0].templateId).toBe(1012100);
    expect(args[0].x).toBe(300);
    expect(args[0].y).toBe(400);
    expect(args[0].facingLeft).toBe(true);
  });

  it('NpcLeaveField fires callback', () => {
    const ids: number[] = [];
    handlers.onNpcLeave = (id) => ids.push(id);
    const p = OutPacket.Raw();
    p.writeInt(55);
    dispatchPayload(router, OutHeader.NpcLeaveField, p.toArray());
    expect(ids).toEqual([55]);
  });

  it('UserEnterField fires callback', () => {
    // Build a raw payload buffer for UserEnterField
    // format: charId(4) + level(1) + name(13) + guild(12) + short + byte + short + byte + AvatarLook + 6*int + short(x) + short(y)
    const raw = new Uint8Array([
      0xD1, 0x07, 0x00, 0x00, // charId=2001
      0x1E, // level=30
      // name 'TestUser' (13 bytes)
      0x54, 0x65, 0x73, 0x74, 0x55, 0x73, 0x65, 0x72, 0x00, 0x00, 0x00, 0x00, 0x00,
      // guild '' (12 bytes)
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, // short 0
      0x00, // byte 0
      0x00, 0x00, // short 0
      0x00, // byte 0
      // AvatarLook (empty)
      0x00, // gender
      0x00, // skin
      0x00, 0x00, 0x00, 0x00, // face
      0x00, // ?
      0x00, 0x00, 0x00, 0x00, // hair
      0xFF, // equip terminator
      0xFF, // unseen terminator
      0x00, 0x00, 0x00, 0x00, // weaponStickerId
      0x00, 0x00, 0x00, 0x00, // petId[0]
      0x00, 0x00, 0x00, 0x00, // petId[1]
      0x00, 0x00, 0x00, 0x00, // petId[2]
      // 6 padding ints
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      // x=500, y=600
      0xF4, 0x01,
      0x58, 0x02,
    ]);
    expect(raw.length).toBe(93);
    const args: Args[] = [];
    handlers.onUserEnter = (a) => args.push(a as any);
    dispatchPayload(router, OutHeader.UserEnterField, raw);
    expect(args).toHaveLength(1, 'callback should fire');
    expect(args[0].charId).toBe(2001);
    expect(args[0].level).toBe(30);
    expect(args[0].name).toBe('TestUser');
    expect(args[0].x).toBe(500);
    expect(args[0].y).toBe(600);
    expect(args[0].look).toBeDefined();
  });

  it('UserLeaveField fires callback', () => {
    const ids: number[] = [];
    handlers.onUserLeave = (id) => ids.push(id);
    dispatchPayload(router, OutHeader.UserLeaveField, new Uint8Array([0xE8, 0x03, 0x00, 0x00]));
    expect(ids).toEqual([1000]);
  });

  it('UserMove fires callback', () => {
    const args: Args[] = [];
    handlers.onUserMove = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeInt(3001);
    // Real MovePath shape (CMovePath::Decode): origin x/y/vx/vy, elem count,
    // then per-element attr=0 (Normal) -> x,y,vx,vy,fh,xOffset,yOffset,
    // moveAction, elapse.
    p.writeShort(150); p.writeShort(250); p.writeShort(0); p.writeShort(0);
    p.writeByte(1);
    p.writeByte(0);
    p.writeShort(150); p.writeShort(250); p.writeShort(0); p.writeShort(0); p.writeShort(0);
    p.writeShort(0); p.writeShort(0);
    p.writeByte(0); p.writeShort(0);
    dispatchPayload(router, OutHeader.UserMove, p.toArray());
    expect(args).toHaveLength(1);
    expect(args[0].charId).toBe(3001);
    expect(args[0].x).toBe(150);
    expect(args[0].y).toBe(250);
  });

  it('DropEnterField fires callback', () => {
    const args: Args[] = [];
    handlers.onDropEnter = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    // enterType=0 ("Show") is one of OG's animated cases (decompile/516670.c:
    // `(unsigned)nEnterType < 2 || ==3 || ==4`), so a real packet for it
    // includes dwSourceID followed by the pt1.x/pt1.y/tDelay source-position
    // block — both omitted here previously, which only "worked" because the
    // old (buggy) decode never read dwSourceID at all.
    p.writeByte(0); p.writeInt(9001); p.writeByte(1); p.writeInt(1000); p.writeInt(42);
    p.writeByte(0); p.writeShort(50); p.writeShort(75);
    p.writeInt(777); p.writeShort(10); p.writeShort(20); p.writeShort(0);
    dispatchPayload(router, OutHeader.DropEnterField, p.toArray());
    expect(args).toHaveLength(1);
    expect(args[0].dropId).toBe(9001);
    expect(args[0].isMoney).toBe(true);
    expect(args[0].itemIdOrAmount).toBe(1000);
    expect(args[0].ownerId).toBe(42);
    expect(args[0].sourceId).toBe(777);
    expect(args[0].x).toBe(50);
    expect(args[0].y).toBe(75);
    expect(args[0].sourceX).toBe(10);
    expect(args[0].sourceY).toBe(20);
  });

  it('PartyResult CreateDone(8) consumes the real town-portal shape, not a full party decode (decompile/A10AB0.c)', () => {
    let fired = false;
    handlers.onPartyLoad = () => { fired = true; }; // should NOT fire — CreateDone has no member list
    const p = OutPacket.Raw();
    p.writeByte(8); // PartyResultType.CreateDone
    p.writeInt(9001); p.writeInt(1); p.writeInt(2); p.writeInt(3); p.writeShort(100); p.writeShort(200);
    expect(() => dispatchPayload(router, OutHeader.PartyResult, p.toArray())).not.toThrow();
    expect(fired).toBe(false);
  });

  it('PartyResult Invite(4) decodes inviterId/inviterName', () => {
    const args: any[] = [];
    handlers.onPartyInvite = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeByte(4); p.writeInt(12345); p.writeString('Bob'); p.writeInt(0); p.writeInt(0); p.writeByte(0);
    dispatchPayload(router, OutHeader.PartyResult, p.toArray());
    expect(args).toHaveLength(1);
    expect(args[0].inviterId).toBe(12345);
    expect(args[0].inviterName).toBe('Bob');
  });

  it('PartyResult ChangeBoss(31) decodes newBossCharId (decompile/A10AB0.c)', () => {
    const args: number[] = [];
    handlers.onPartyBossChanged = (id) => args.push(id);
    const p = OutPacket.Raw();
    p.writeByte(31); p.writeInt(54321); p.writeByte(1);
    dispatchPayload(router, OutHeader.PartyResult, p.toArray());
    expect(args).toEqual([54321]);
  });

  it('PartyResult LevelJobChanged(39) decodes charId/level/job (decompile/A10AB0.c)', () => {
    const args: any[] = [];
    handlers.onPartyMemberStatChanged = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeByte(39); p.writeInt(54321); p.writeInt(50); p.writeInt(112);
    dispatchPayload(router, OutHeader.PartyResult, p.toArray());
    expect(args).toEqual([{ charId: 54321, level: 50, job: 112 }]);
  });

  it('DropLeaveField fires callback', () => {
    const args: Args[] = [];
    handlers.onDropLeave = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(2); p.writeInt(9002);
    dispatchPayload(router, OutHeader.DropLeaveField, p.toArray());
    expect(args).toHaveLength(1);
    expect(args[0].dropId).toBe(9002);
    expect(args[0].leaveType).toBe(2);
  });

  it('InventoryOperation fires with ops array', () => {
    const ops: any[][] = [];
    handlers.onInventoryOperation = (o) => ops.push(o);
    const p = OutPacket.Raw();
    p.writeByte(0); p.writeByte(2);
    p.writeByte(0); p.writeByte(1); p.writeShort(1);
    p.writeByte(2); p.writeInt(2000000); p.writeByte(0); p.writeLong(0n);
    p.writeShort(3); p.writeString(''); p.writeShort(0);
    p.writeByte(1); p.writeByte(2); p.writeShort(5); p.writeShort(10);
    p.writeByte(0);
    dispatchPayload(router, OutHeader.InventoryOperation, p.toArray());
    expect(ops).toHaveLength(1);
    expect(ops[0]).toHaveLength(2);
    expect(ops[0][0].opType).toBe(0);
    expect(ops[0][0].itemId).toBe(2000000);
    expect(ops[0][0].item.quantity).toBe(3);
    expect(ops[0][1].opType).toBe(1);
    expect(ops[0][1].quantity).toBe(10);
  });

  it('UserChat fires callback', () => {
    const args: Args[] = [];
    handlers.onUserChat = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeInt(4001); p.writeByte(0); p.writeString('hello'); p.writeByte(0);
    dispatchPayload(router, OutHeader.UserChat, p.toArray());
    expect(args).toHaveLength(1);
    expect(args[0].charId).toBe(4001);
    expect(args[0].text).toBe('hello');
  });

  it('ScriptMessage fires callback with text', () => {
    const args: Args[] = [];
    handlers.onScriptMessage = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(0); p.writeInt(9010000); p.writeByte(0); p.writeByte(1);
    p.writeString('Welcome adventurer!'); p.writeByte(1); p.writeByte(1);
    dispatchPayload(router, OutHeader.ScriptMessage, p.toArray());
    expect(args).toHaveLength(1);
    expect(args[0].speakerId).toBe(9010000);
    expect(args[0].msgType).toBe(0);
    expect(args[0].text).toBe('Welcome adventurer!');
    expect(args[0].hasPrev).toBe(true);
    expect(args[0].hasNext).toBe(true);
  });

  it('ScriptMessage type 3 parses extra fields', () => {
    const args: Args[] = [];
    handlers.onScriptMessage = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(0); p.writeInt(9010000); p.writeByte(3); p.writeByte(0);
    p.writeString('Enter name:'); p.writeString(''); p.writeShort(4); p.writeShort(12);
    dispatchPayload(router, OutHeader.ScriptMessage, p.toArray());
    expect(args).toHaveLength(1);
    expect(args[0].msgType).toBe(3);
    expect(args[0].defaultText).toBe('');
    expect(args[0].minLength).toBe(4);
    expect(args[0].maxLength).toBe(12);
  });

  it('TemporaryStatSet fires with entries', () => {
    // Mask is a 16-byte UINT128 (CWvsContext::OnTemporaryStatSet,
    // decompile/A02FC0.c via the sibling OnTemporaryStatReset's explicit
    // 0x10-byte DecodeBuffer), not a 4-byte int.
    const args: Args[] = [];
    handlers.onTemporaryStatSet = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeLong(0x03n); p.writeLong(0n);
    p.writeShort(100); p.writeInt(2000000); p.writeInt(30);
    p.writeShort(50); p.writeInt(2000001); p.writeInt(60);
    dispatchPayload(router, OutHeader.TemporaryStatSet, p.toArray());
    expect(args).toHaveLength(1);
    expect(args[0]).toHaveLength(2);
    expect(args[0][0].skillId).toBe(2000000);
    expect(args[0][0].value).toBe(100);
    expect(args[0][0].seconds).toBe(30);
    expect(args[0][1].skillId).toBe(2000001);
    expect(args[0][1].value).toBe(50);
    expect(args[0][1].seconds).toBe(60);
  });

  it('TemporaryStatReset fires with mask', () => {
    const masks: number[] = [];
    handlers.onTemporaryStatReset = (m) => masks.push(m);
    const p = OutPacket.Raw();
    p.writeLong(0xFFn); p.writeLong(0n);
    dispatchPayload(router, OutHeader.TemporaryStatReset, p.toArray());
    expect(masks).toEqual([0xFF]);
  });

  it('FuncKeyMappedInit fires with 89 entries', () => {
    const entries: any[][] = [];
    handlers.onFuncKeyMappedInit = (e) => entries.push(e);
    const p = OutPacket.Raw();
    p.writeByte(0); // isDefault = false
    for (let i = 0; i < 89; i++) {
      p.writeByte(i % 2);
      p.writeInt(100 + i);
    }
    dispatchPayload(router, OutHeader.FuncKeyMappedInit, p.toArray());
    expect(entries).toHaveLength(1);
    expect(entries[0]).toHaveLength(89);
    expect(entries[0][0].keyIndex).toBe(0);
    expect(entries[0][0].type).toBe(0);
    expect(entries[0][0].actionId).toBe(100);
    expect(entries[0][88].keyIndex).toBe(88);
    expect(entries[0][88].actionId).toBe(188);
  });

  // TODO_AUDIT.md Twenty-eighth pass: real wire is a dynamic-foothold
  // state-change list (objName/curState/footholdSns[, moving-state if
  // curState===2]) — the previous decode read this as a static-geometry
  // {id,x1,y1,x2,y2,prev,next} list with no string at all, which would
  // desync on the very first real packet.
  it('FootHoldInfo decodes the real dynamic-foothold state-change shape', () => {
    const args: any[] = [];
    handlers.onFootHoldInfo = (f) => args.push(f);
    const p = OutPacket.Raw();
    p.writeInt(2);
    // entry 0: stationary (curState !== 2), 2 foothold SNs
    p.writeString('platform1');
    p.writeInt(0);
    p.writeInt(2);
    p.writeInt(101); p.writeInt(102);
    // entry 1: moving (curState === 2), 1 foothold SN, plus moving-state fields
    p.writeString('platform2');
    p.writeInt(2);
    p.writeInt(1);
    p.writeInt(201);
    p.writeInt(50); p.writeInt(0); p.writeInt(1000); p.writeInt(800); p.writeInt(800); p.writeInt(500); p.writeInt(800);
    p.writeByte(1); p.writeByte(0);
    dispatchPayload(router, OutHeader.FootHoldInfo, p.toArray());
    expect(args).toHaveLength(1);
    const { entries } = args[0];
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({ objName: 'platform1', curState: 0, footholdSns: [101, 102] });
    expect(entries[1].objName).toBe('platform2');
    expect(entries[1].footholdSns).toEqual([201]);
    expect(entries[1].moving).toEqual({
      speed: 50, x1: 0, x2: 1000, y1: 800, y2: 800, curX: 500, curY: 800,
      reverseVertical: true, reverseHorizontal: false,
    });
  });

  it('TownPortalEnter decodes OG state, owner character, and position', () => {
    const args: any[] = [];
    handlers.onTownPortalEnter = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeByte(1);
    p.writeInt(123456);
    p.writeShort(320);
    p.writeShort(-45);
    dispatchPayload(router, OutHeader.TownPortalEnter, p.toArray());
    expect(args).toEqual([{ objId: 123456, state: 1, characterId: 123456, x: 320, y: -45 }]);
  });

  it('TownPortalLeave decodes OG remove state and owner character', () => {
    const args: any[] = [];
    handlers.onTownPortalLeave = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeByte(0);
    p.writeInt(123456);
    dispatchPayload(router, OutHeader.TownPortalLeave, p.toArray());
    expect(args).toEqual([{ objId: 123456, state: 0 }]);
  });

  it('AffectedAreaCreate decodes OG id/type/owner/skill/rect/phase', () => {
    const args: any[] = [];
    handlers.onAffectedAreaCreate = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeInt(77);
    p.writeInt(3);
    p.writeInt(9001);
    p.writeInt(32121006);
    p.writeByte(12);
    p.writeShort(4);
    p.writeInt(10);
    p.writeInt(20);
    p.writeInt(110);
    p.writeInt(220);
    p.writeInt(2);
    dispatchPayload(router, OutHeader.AffectedAreaCreate, p.toArray());
    expect(args).toEqual([{
      objId: 77,
      type: 3,
      ownerId: 9001,
      x: 60,
      y: 120,
      left: 10,
      top: 20,
      right: 110,
      bottom: 220,
      skillId: 32121006,
      skillLevel: 12,
      elemAttr: 4,
      phase: 2,
    }]);
  });

  it('AffectedAreaRemove decodes OG area id', () => {
    const ids: number[] = [];
    handlers.onAffectedAreaRemove = (id) => ids.push(id);
    const p = OutPacket.Raw();
    p.writeInt(77);
    dispatchPayload(router, OutHeader.AffectedAreaRemove, p.toArray());
    expect(ids).toEqual([77]);
  });

  it('OpenGateCreate decodes OG state, owner, position, gate side, and party', () => {
    const args: any[] = [];
    handlers.onOpenGateCreate = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeByte(2);
    p.writeInt(123456);
    p.writeShort(111);
    p.writeShort(222);
    p.writeByte(1);
    p.writeInt(9000);
    dispatchPayload(router, OutHeader.OpenGateCreate, p.toArray());
    expect(args).toEqual([{
      objId: 123456,
      state: 2,
      characterId: 123456,
      x: 111,
      y: 222,
      first: true,
      partyId: 9000,
    }]);
  });

  it('OpenGateRemove decodes OG remove state, owner, and gate side', () => {
    const args: any[] = [];
    handlers.onOpenGateRemove = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeByte(0);
    p.writeInt(123456);
    p.writeByte(0);
    dispatchPayload(router, OutHeader.OpenGateRemove, p.toArray());
    expect(args).toEqual([{ objId: 123456, state: 0, characterId: 123456, first: false }]);
  });

  it('clearAllExceptSetField preserves onSetField only', () => {
    const setField = () => {};
    const mobEnter = () => {};
    handlers.onSetField = setField;
    handlers.onMobEnter = mobEnter;
    handlers.clearAllExceptSetField();
    expect(handlers.onSetField).toBe(setField);
    expect(handlers.onMobEnter).toBeNull();
    expect(handlers.onStatChanged).toBeNull();
  });

  // CField::OnPacket handlers (decompile/546D50.c) — previously unregistered.

  it('TransferFieldReqIgnored decodes reason byte', () => {
    const args: number[] = [];
    handlers.onTransferFieldReqIgnored = (reason) => args.push(reason);
    const p = OutPacket.Raw();
    p.writeByte(3);
    dispatchPayload(router, OutHeader.TransferFieldReqIgnored, p.toArray());
    expect(args).toEqual([3]);
  });

  it('TransferChannelReqIgnored decodes reason byte', () => {
    const args: number[] = [];
    handlers.onTransferChannelReqIgnored = (reason) => args.push(reason);
    const p = OutPacket.Raw();
    p.writeByte(5);
    dispatchPayload(router, OutHeader.TransferChannelReqIgnored, p.toArray());
    expect(args).toEqual([5]);
  });

  it('FieldSpecificData fires with no payload consumed', () => {
    let fired = 0;
    handlers.onFieldSpecificData = () => { fired++; };
    dispatchPayload(router, OutHeader.FieldSpecificData, new Uint8Array(0));
    expect(fired).toBe(1);
  });

  it('CoupleMessage variant=pair decodes sender and message', () => {
    const args: Args[] = [];
    handlers.onCoupleMessage = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(5);
    p.writeString('Sender');
    p.writeByte(0);
    p.writeString('Hello');
    dispatchPayload(router, OutHeader.CoupleMessage, p.toArray());
    expect(args).toEqual([{ variant: 'pair', sender: 'Sender', message: 'Hello' }]);
  });

  it('CoupleMessage variant=solo decodes message only', () => {
    const args: Args[] = [];
    handlers.onCoupleMessage = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(4);
    p.writeByte(1);
    p.writeString('Solo text');
    dispatchPayload(router, OutHeader.CoupleMessage, p.toArray());
    expect(args).toEqual([{ variant: 'solo', message: 'Solo text' }]);
  });

  it('CoupleMessage variant=stranger has no extra fields', () => {
    const args: Args[] = [];
    handlers.onCoupleMessage = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(4);
    p.writeByte(0);
    dispatchPayload(router, OutHeader.CoupleMessage, p.toArray());
    expect(args).toEqual([{ variant: 'stranger' }]);
  });

  it('CoupleMessage unknown byte1 is a silent no-op', () => {
    const args: Args[] = [];
    handlers.onCoupleMessage = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(99);
    dispatchPayload(router, OutHeader.CoupleMessage, p.toArray());
    expect(args).toEqual([]);
  });

  it('SummonItemInavailable fires only on byte===0', () => {
    let fired = 0;
    handlers.onSummonItemInavailable = () => { fired++; };
    let p = OutPacket.Raw(); p.writeByte(0);
    dispatchPayload(router, OutHeader.SummonItemInavailable, p.toArray());
    p = OutPacket.Raw(); p.writeByte(1);
    dispatchPayload(router, OutHeader.SummonItemInavailable, p.toArray());
    expect(fired).toBe(1);
  });

  it('FieldObstacleOnOff decodes name and state', () => {
    const args: Args[] = [];
    handlers.onFieldObstacleOnOff = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeString('gate1');
    p.writeInt(1);
    dispatchPayload(router, OutHeader.FieldObstacleOnOff, p.toArray());
    expect(args).toEqual([[{ name: 'gate1', state: 1 }]]);
  });

  it('FieldObstacleOnOffStatus decodes a batch of entries', () => {
    const args: Args[] = [];
    handlers.onFieldObstacleOnOff = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeInt(2);
    p.writeString('gate1'); p.writeInt(1);
    p.writeString('gate2'); p.writeInt(0);
    dispatchPayload(router, OutHeader.FieldObstacleOnOffStatus, p.toArray());
    expect(args).toEqual([[{ name: 'gate1', state: 1 }, { name: 'gate2', state: 0 }]]);
  });

  it('FieldObstacleAllReset fires with no payload', () => {
    let fired = 0;
    handlers.onFieldObstacleAllReset = () => { fired++; };
    dispatchPayload(router, OutHeader.FieldObstacleAllReset, new Uint8Array(0));
    expect(fired).toBe(1);
  });

  it('AdminResult subType 0x06 decodes flag', () => {
    const args: Args[] = [];
    handlers.onAdminResult = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(0x06);
    p.writeByte(1);
    dispatchPayload(router, OutHeader.AdminResult, p.toArray());
    expect(args).toEqual([{ subType: 0x06, flag: true }]);
  });

  it('AdminResult subType 0x0B with non-default channel decodes world and message', () => {
    const args: Args[] = [];
    handlers.onAdminResult = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(0x0B);
    p.writeString('ch1');
    p.writeString('world1');
    p.writeString('msg1');
    dispatchPayload(router, OutHeader.AdminResult, p.toArray());
    expect(args).toEqual([{ subType: 0x0B, channel: 'ch1', world: 'world1', message: 'msg1' }]);
  });

  it('AdminResult subType 0x0B with default (empty) channel reads nothing else', () => {
    const args: Args[] = [];
    handlers.onAdminResult = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(0x0B);
    p.writeString('');
    dispatchPayload(router, OutHeader.AdminResult, p.toArray());
    expect(args).toEqual([{ subType: 0x0B, channel: '' }]);
  });

  it('AdminResult subType 0x15 flag=true reads byte then shared tail byte', () => {
    const args: Args[] = [];
    handlers.onAdminResult = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(0x15);
    p.writeByte(1);   // flag
    p.writeByte(42);  // chValue
    p.writeByte(7);   // shared tail (overridden by chValue per value-precedence)
    dispatchPayload(router, OutHeader.AdminResult, p.toArray());
    expect(args).toEqual([{ subType: 0x15, flag: true, mapId: undefined, value: 42 }]);
  });

  it('AdminResult subType 0x15 flag=false reads mapId then shared tail byte', () => {
    const args: Args[] = [];
    handlers.onAdminResult = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(0x15);
    p.writeByte(0);       // flag
    p.writeInt(50000);    // mapId
    p.writeByte(9);       // shared tail
    dispatchPayload(router, OutHeader.AdminResult, p.toArray());
    expect(args).toEqual([{ subType: 0x15, flag: false, mapId: 50000, value: 9 }]);
  });

  it('AdminResult subType 0x2A reads exactly one byte', () => {
    const args: Args[] = [];
    handlers.onAdminResult = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(0x2A);
    p.writeByte(1);
    dispatchPayload(router, OutHeader.AdminResult, p.toArray());
    expect(args).toEqual([{ subType: 0x2A, value: 1 }]);
  });

  it('AdminResult subType 0x33 decodes a plain message', () => {
    const args: Args[] = [];
    handlers.onAdminResult = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(0x33);
    p.writeString('hello');
    dispatchPayload(router, OutHeader.AdminResult, p.toArray());
    expect(args).toEqual([{ subType: 0x33, message: 'hello' }]);
  });

  it('AdminResult unknown subType is a silent no-op', () => {
    const args: Args[] = [];
    handlers.onAdminResult = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(0xFF);
    dispatchPayload(router, OutHeader.AdminResult, p.toArray());
    expect(args).toEqual([]);
  });

  it('Quiz decodes isQuestion, category, problemId', () => {
    const args: Args[] = [];
    handlers.onQuiz = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(1);
    p.writeByte(2);
    p.writeUShort(1234);
    dispatchPayload(router, OutHeader.Quiz, p.toArray());
    expect(args).toEqual([{ isQuestion: true, category: 2, problemId: 1234 }]);
  });

  it('Quiz with problemId===0 is a silent no-op', () => {
    const args: Args[] = [];
    handlers.onQuiz = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(0);
    p.writeByte(0);
    p.writeUShort(0);
    dispatchPayload(router, OutHeader.Quiz, p.toArray());
    expect(args).toEqual([]);
  });

  it('Desc decodes help-message index', () => {
    const args: number[] = [];
    handlers.onFieldDesc = (idx) => args.push(idx);
    const p = OutPacket.Raw();
    p.writeByte(7);
    dispatchPayload(router, OutHeader.Desc, p.toArray());
    expect(args).toEqual([7]);
  });

  it('SetQuestClear fires with no payload', () => {
    let fired = 0;
    handlers.onSetQuestClear = () => { fired++; };
    dispatchPayload(router, OutHeader.SetQuestClear, new Uint8Array(0));
    expect(fired).toBe(1);
  });

  it('SetQuestTime decodes questId and FILETIME pairs', () => {
    const args: Args[] = [];
    handlers.onSetQuestTime = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(1);
    p.writeInt(100);
    p.writeLong(111n);
    p.writeLong(222n);
    dispatchPayload(router, OutHeader.SetQuestTime, p.toArray());
    expect(args).toEqual([[{ questId: 100, start: 111n, end: 222n }]]);
  });

  it('WarnMessage decodes the notice text', () => {
    const args: string[] = [];
    handlers.onWarnMessage = (text) => args.push(text);
    const p = OutPacket.Raw();
    p.writeString('You have been warned.');
    dispatchPayload(router, OutHeader.WarnMessage, p.toArray());
    expect(args).toEqual(['You have been warned.']);
  });

  it('SetObjectState decodes name and state (same shape as FieldObstacleOnOff)', () => {
    const args: Args[] = [];
    handlers.onSetObjectState = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeString('door1');
    p.writeInt(2);
    dispatchPayload(router, OutHeader.SetObjectState, p.toArray());
    expect(args).toEqual([[{ name: 'door1', state: 2 }]]);
  });

  it('StalkResult decodes a remove entry and an insert entry', () => {
    const args: Args[] = [];
    handlers.onStalkResult = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeInt(2);
    p.writeInt(11); p.writeByte(1); // remove
    p.writeInt(22); p.writeByte(0); p.writeString('Bob'); p.writeInt(300); p.writeInt(400); // insert
    dispatchPayload(router, OutHeader.StalkResult, p.toArray());
    expect(args).toEqual([[
      { objId: 11, remove: true },
      { objId: 22, remove: false, name: 'Bob', x: 300, y: 400 },
    ]]);
  });

  it('RequestFootHoldInfo fires with no payload', () => {
    let fired = 0;
    handlers.onRequestFootHoldInfo = () => { fired++; };
    dispatchPayload(router, OutHeader.RequestFootHoldInfo, new Uint8Array(0));
    expect(fired).toBe(1);
  });

  it('AntiMacroResult subType 6 decodes hadCanvas and JPEG blob', () => {
    const args: Args[] = [];
    handlers.onAntiMacroResult = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(6);
    p.writeByte(0);    // reasonCode
    p.writeByte(1);    // hadCanvas
    p.writeInt(3);     // jpeg length
    p.writeBytes(new Uint8Array([0xFF, 0xD8, 0xFF]));
    dispatchPayload(router, OutHeader.AntiMacroResult, p.toArray());
    expect(args).toHaveLength(1);
    expect(args[0]).toMatchObject({ subType: 6, reasonCode: 0, hadCanvas: true });
    expect(Array.from((args[0] as any).jpeg)).toEqual([0xFF, 0xD8, 0xFF]);
  });

  it('AntiMacroResult subType 6 with zero-length JPEG reads no buffer', () => {
    const args: Args[] = [];
    handlers.onAntiMacroResult = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(6);
    p.writeByte(0);
    p.writeByte(0);
    p.writeInt(0);
    dispatchPayload(router, OutHeader.AntiMacroResult, p.toArray());
    expect(args).toEqual([{ subType: 6, reasonCode: 0, hadCanvas: false, jpeg: undefined }]);
  });

  it('AntiMacroResult subType 5 decodes a message', () => {
    const args: Args[] = [];
    handlers.onAntiMacroResult = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(5);
    p.writeByte(2);
    p.writeString('player1');
    dispatchPayload(router, OutHeader.AntiMacroResult, p.toArray());
    expect(args).toEqual([{ subType: 5, reasonCode: 2, message: 'player1' }]);
  });

  it('AntiMacroResult subType 7 reads only the two header bytes', () => {
    const args: Args[] = [];
    handlers.onAntiMacroResult = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(7);
    p.writeByte(0);
    dispatchPayload(router, OutHeader.AntiMacroResult, p.toArray());
    expect(args).toEqual([{ subType: 7, reasonCode: 0 }]);
  });

  it('DestroyShopResult reasonCode 17 reads exactly one byte', () => {
    const args: Args[] = [];
    handlers.onDestroyShopResult = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(17);
    dispatchPayload(router, OutHeader.DestroyShopResult, p.toArray());
    expect(args).toEqual([{ reasonCode: 17 }]);
  });

  it('DestroyShopResult reasonCode!=17 with hasMessage=0 reads two bytes total', () => {
    const args: Args[] = [];
    handlers.onDestroyShopResult = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(5);
    p.writeByte(0);
    dispatchPayload(router, OutHeader.DestroyShopResult, p.toArray());
    expect(args).toEqual([{ reasonCode: 0 }]);
  });

  it('DestroyShopResult reasonCode!=17 with hasMessage=1 decodes message', () => {
    const args: Args[] = [];
    handlers.onDestroyShopResult = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(5);
    p.writeByte(1);
    p.writeString('Shop destroyed');
    dispatchPayload(router, OutHeader.DestroyShopResult, p.toArray());
    expect(args).toEqual([{ reasonCode: 5, message: 'Shop destroyed' }]);
  });

  it('MacroSysDataInit decodes slots and clamps count to 5', () => {
    const args: Args[] = [];
    handlers.onMacroSysDataInit = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeByte(1);
    p.writeString('Macro1');
    p.writeByte(0);
    p.writeInt(11); p.writeInt(22); p.writeInt(33);
    dispatchPayload(router, OutHeader.MacroSysDataInit, p.toArray());
    expect(args).toEqual([[{ name: 'Macro1', mute: false, skills: [11, 22, 33] }]]);
  });

  it('SetITC decodes CharacterData and CITC::LoadData fields', () => {
    const args: Args[] = [];
    handlers.onSetITC = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeLong(0n); p.writeByte(0); p.writeByte(0); // empty CharacterData
    p.writeString('club1');
    p.writeInt(5000); p.writeInt(3); p.writeInt(1000); p.writeInt(60); p.writeInt(1440);
    p.writeLong(42n);
    dispatchPayload(router, OutHeader.SetITC, p.toArray());
    expect(args).toHaveLength(1);
    expect(args[0]).toMatchObject({ nexonClubId: 'club1', registerFeeMeso: 5000, serverTime: 42n });
  });

  it('SetCashShop decodes CharacterData and CCashShop fields', () => {
    const args: Args[] = [];
    handlers.onSetCashShop = (a) => args.push(a as any);
    const p = OutPacket.Raw();
    p.writeLong(0n); p.writeByte(0); p.writeByte(0); // empty CharacterData
    p.writeByte(1); p.writeString('club2'); // cashShopAuthorized, nexonClubId
    p.writeInt(0); p.writeShort(0); p.writeByte(0); // empty SetSaleInfo
    p.writeBytes(new Uint8Array(0x438)); // aBest
    p.writeShort(0); p.writeShort(0); p.writeShort(0); // stock/limitGoods/zeroGoods
    p.writeByte(1); p.writeInt(150); // eventOn, highestCharacterLevelInAccount
    dispatchPayload(router, OutHeader.SetCashShop, p.toArray());
    expect(args).toHaveLength(1);
    expect(args[0]).toMatchObject({ cashShopAuthorized: true, nexonClubId: 'club2', eventOn: true, highestCharacterLevelInAccount: 150 });
  });

  // TODO_AUDIT.md Seventy-seventh/Hundred-and-ninth passes — CField::OnClock
  // (decompile/531510.c) subType dispatch.
  describe('Clock', () => {
    it('subType 0 decodes event-timer seconds (abs) and fireNow', () => {
      const args: Args[] = [];
      handlers.onClock = (a) => args.push(a as any);
      const p = OutPacket.Raw();
      p.writeByte(0); p.writeInt(-5);
      dispatchPayload(router, OutHeader.Clock, p.toArray());
      expect(args[0]).toMatchObject({ subType: 0, seconds: 5, fireNow: true });
    });

    it('subType 1 decodes hour/min/sec', () => {
      const args: Args[] = [];
      handlers.onClock = (a) => args.push(a as any);
      const p = OutPacket.Raw();
      p.writeByte(1); p.writeByte(13); p.writeByte(45); p.writeByte(30);
      dispatchPayload(router, OutHeader.Clock, p.toArray());
      expect(args[0]).toMatchObject({ subType: 1, hour: 13, minute: 45, second: 30 });
    });

    it('subType 2 decodes a duration', () => {
      const args: Args[] = [];
      handlers.onClock = (a) => args.push(a as any);
      const p = OutPacket.Raw();
      p.writeByte(2); p.writeInt(120);
      dispatchPayload(router, OutHeader.Clock, p.toArray());
      expect(args[0]).toMatchObject({ subType: 2, durationSec: 120 });
    });

    it('subType 3 decodes active flag + conditional duration', () => {
      const args: Args[] = [];
      handlers.onClock = (a) => args.push(a as any);
      const p = OutPacket.Raw();
      p.writeByte(3); p.writeByte(1); p.writeInt(60);
      dispatchPayload(router, OutHeader.Clock, p.toArray());
      expect(args[0]).toMatchObject({ subType: 3, active: true, durationSec: 60 });
    });

    it('subType 3 with inactive flag reads no further bytes', () => {
      const args: Args[] = [];
      handlers.onClock = (a) => args.push(a as any);
      const p = OutPacket.Raw();
      p.writeByte(3); p.writeByte(0);
      dispatchPayload(router, OutHeader.Clock, p.toArray());
      expect(args[0]).toMatchObject({ subType: 3, active: false });
      expect(args[0].durationSec).toBeUndefined();
    });

    it('subType 0x64 decodes sizeVariant + duration when active', () => {
      const args: Args[] = [];
      handlers.onClock = (a) => args.push(a as any);
      const p = OutPacket.Raw();
      p.writeByte(0x64); p.writeByte(1); p.writeByte(0); p.writeInt(45);
      dispatchPayload(router, OutHeader.Clock, p.toArray());
      expect(args[0]).toMatchObject({ subType: 0x64, active: true, sizeVariant: 0, durationSec: 45 });
    });

    it('DestroyClock fires onDestroyClock with no payload', () => {
      let called = false;
      handlers.onDestroyClock = () => { called = true; };
      dispatchPayload(router, OutHeader.DestroyClock, new Uint8Array(0));
      expect(called).toBe(true);
    });
  });

  // TODO_AUDIT.md Eighty-third pass: CField_KillCount — opcode 178,
  // decompile-confirmed at 0x554030, WZ-confirmed present (10 maps with
  // info/fieldType===34).
  describe('KillCountInfo', () => {
    it('decodes the running kill count', () => {
      const args: Args[] = [];
      handlers.onKillCountInfo = (a) => args.push(a as any);
      const p = OutPacket.Raw();
      p.writeInt(7);
      dispatchPayload(router, OutHeader.KillCountInfo, p.toArray());
      expect(args[0]).toEqual({ count: 7 });
    });
  });

  // TODO_AUDIT.md Eighty-first pass: CMessageBoxPool — the floating
  // shop/trade-room marker, decompile-confirmed shapes at 0x6369c0/0x635d60.
  describe('MessageBoxPool', () => {
    it('MessageBoxCreateFailed fires with no payload', () => {
      let called = false;
      handlers.onMessageBoxCreateFailed = () => { called = true; };
      dispatchPayload(router, OutHeader.MessageBoxCreateFailed, new Uint8Array(0));
      expect(called).toBe(true);
    });

    it('MessageBoxEnterField decodes id/itemId/hope/characterName/x/y', () => {
      const args: Args[] = [];
      handlers.onMessageBoxEnterField = (a) => args.push(a as any);
      const p = OutPacket.Raw();
      p.writeInt(42); p.writeInt(1234567); p.writeString('Looking for mesos'); p.writeString('Bob');
      p.writeShort(100); p.writeShort(-50);
      dispatchPayload(router, OutHeader.MessageBoxEnterField, p.toArray());
      expect(args[0]).toEqual({ id: 42, itemId: 1234567, hope: 'Looking for mesos', characterName: 'Bob', x: 100, y: -50 });
    });

    it('MessageBoxLeaveField decodes immediate flag and id', () => {
      const args: Args[] = [];
      handlers.onMessageBoxLeaveField = (a) => args.push(a as any);
      const p = OutPacket.Raw();
      p.writeByte(1); p.writeInt(42);
      dispatchPayload(router, OutHeader.MessageBoxLeaveField, p.toArray());
      expect(args[0]).toEqual({ id: 42, immediate: true });
    });
  });

  // TODO_AUDIT.md Seventy-eighth pass: CField_Massacre — decompile-confirmed
  // shapes at 0x556200 (gauge) / 0x5596c0 (result), WZ-confirmed present
  // (351 maps with info/fieldType===23).
  describe('Massacre', () => {
    it('MassacreIncGauge decodes the gauge value', () => {
      const args: Args[] = [];
      handlers.onMassacreIncGauge = (a) => args.push(a as any);
      const p = OutPacket.Raw();
      p.writeInt(55);
      dispatchPayload(router, OutHeader.MassacreIncGauge, p.toArray());
      expect(args[0]).toEqual({ incGauge: 55 });
    });

    it('MassacreResult decodes won flag and final gauge', () => {
      const args: Args[] = [];
      handlers.onMassacreResult = (a) => args.push(a as any);
      const p = OutPacket.Raw();
      p.writeByte(1); p.writeInt(100);
      dispatchPayload(router, OutHeader.MassacreResult, p.toArray());
      expect(args[0]).toEqual({ won: true, finalGauge: 100 });
    });
  });
});
