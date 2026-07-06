import { describe, it, expect } from 'vitest';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';

function setup() {
  const router = new PacketRouter();
  const handlers = new FieldHandlers();
  handlers.register(router);
  return { router, handlers };
}

function dispatch(router: PacketRouter, packet: OutPacket): void {
  router.dispatch(new InPacket(packet.toArray()), null as any);
}

describe('IDA_NEW_GAPS.md opcode handlers', () => {
  // TODO_AUDIT.md follow-up to IDA_NEW_GAPS.md: representative coverage for the
  // already-ported opcode gaps so the gap list cannot silently regress.
  it('decodes CWvsContext pure-gap packets', () => {
    const { router, handlers } = setup();
    const seen: any[] = [];
    handlers.onGivePopularityResult = (a) => seen.push(a);
    handlers.onStageChange = (a) => seen.push(a);
    handlers.onDragonBallBox = (a) => seen.push(a);

    const fame = OutPacket.Of(OutHeader.GivePopularityResult);
    fame.writeByte(0); fame.writeString('Hero'); fame.writeByte(1); fame.writeInt(7);
    dispatch(router, fame);

    const stage = OutPacket.Of(OutHeader.StageChange);
    stage.writeString('cake'); stage.writeByte(2);
    dispatch(router, stage);

    const dragon = OutPacket.Of(OutHeader.DragonBallBox);
    dragon.writeInt(30); dragon.writeByte(1); dragon.writeByte(0); dragon.writeByte(1); dragon.writeInt(4);
    dispatch(router, dragon);

    expect(seen).toEqual([
      { subResult: 0, name: 'Hero', accepted: true, fame: 7 },
      { stageName: 'cake', stagePeriod: 2 },
      { remainTime: 30, showUI: true, close: false, ableToSummon: true, orbCount: 4 },
    ]);
  });

  it('decodes CUserPool common and remote gap packets', () => {
    const { router, handlers } = setup();
    const seen: any[] = [];
    handlers.onUserADBoard = (a) => seen.push(a);
    handlers.onShowItemUpgradeEffect = (a) => seen.push(a);
    handlers.onUserGuildMarkChanged = (a) => seen.push(a);
    handlers.onUserMovingShootAttackPrepare = (a) => seen.push(a);
    handlers.onUserShowUpgradeTombEffect = (a) => seen.push(a);
    handlers.onUserReceiveHP = (a) => seen.push(a);
    handlers.onUserThrowGrenade = (a) => seen.push(a);
    handlers.onUserHit = (a) => seen.push(a);

    const board = OutPacket.Of(OutHeader.UserADBoard);
    board.writeInt(1001); board.writeString('S> apples');
    dispatch(router, board);

    const upgrade = OutPacket.Of(OutHeader.ShowItemUpgradeEffect);
    upgrade.writeInt(1001); upgrade.writeByte(1); upgrade.writeInt(2040000);
    dispatch(router, upgrade);

    // OG: OnGuildMarkChanged (0x953FE0) — after charId: markBg(u16) + markBgColor(u8) + mark(u16) + markColor(u8). No guildId.
    const guildMark = OutPacket.Of(OutHeader.UserGuildMarkChanged);
    guildMark.writeInt(1001); guildMark.writeShort(1); guildMark.writeByte(2); guildMark.writeShort(3); guildMark.writeByte(4);
    dispatch(router, guildMark);

    // OG: OnMovingShootAttackPrepare (0x953BC0) — after charId: level(u8) + isCharging(u8) + [if charging: skillId(u32)] + actionPacked(u16: bit15=facingLeft, bits0-14=nAction) + trailing(u8).
    const movingShoot = OutPacket.Of(OutHeader.UserMovingShootAttackPrepare);
    movingShoot.writeInt(1001); movingShoot.writeByte(10); movingShoot.writeByte(1); movingShoot.writeInt(30001000); movingShoot.writeShort(0x8005); movingShoot.writeByte(0);
    dispatch(router, movingShoot);

    // OG: OnShowUpgradeTombEffect (0x954090) — after charId: value(u32) + posX(u32) + posY(u32).
    const tomb = OutPacket.Of(OutHeader.UserShowUpgradeTombEffect);
    tomb.writeInt(1001); tomb.writeInt(1); tomb.writeInt(500); tomb.writeInt(300);
    dispatch(router, tomb);

    // OG: OnReceiveHP (0x953F50) — after charId: curHP(u32) + maxHP(u32).
    const hp = OutPacket.Of(OutHeader.UserReceiveHP);
    hp.writeInt(1001); hp.writeInt(3500); hp.writeInt(5000);
    dispatch(router, hp);

    // OG: OnThrowGrenade (0x954030) — after charId: posX(u32) + posY(u32) + tKeyDown(u32) + skillId(u32) + unk(u32).
    const grenade = OutPacket.Of(OutHeader.UserThrowGrenade);
    grenade.writeInt(1001); grenade.writeInt(200); grenade.writeInt(400); grenade.writeInt(1500); grenade.writeInt(33101002); grenade.writeInt(0);
    dispatch(router, grenade);

    // OG: OnHit (0x954C50) — after charId: attackIdx(u8) + nDamage(u32).
    const hit = OutPacket.Of(OutHeader.UserHit);
    hit.writeInt(1001); hit.writeByte(0); hit.writeInt(1234);
    dispatch(router, hit);

    expect(seen).toEqual([
      { charId: 1001, message: 'S> apples' },
      { charId: 1001, result: 1, itemId: 2040000 },
      { charId: 1001, markBg: 1, markBgColor: 2, mark: 3, markColor: 4 },
      { charId: 1001, level: 10, isCharging: true, skillId: 30001000, facingLeft: true, nAction: 5 },
      { charId: 1001, value: 1, posX: 500, posY: 300 },
      { charId: 1001, curHP: 3500, maxHP: 5000 },
      { charId: 1001, posX: 200, posY: 400, tKeyDown: 1500, skillId: 33101002, unk: 0 },
      { charId: 1001, attackIdx: 0, damage: 1234 },
    ]);
  });

  it('decodes pet, dragon, mob, and npc gap packets', () => {
    const { router, handlers } = setup();
    const seen: any[] = [];
    handlers.onPetAction = (a) => seen.push(a);
    handlers.onDragonAction = (a) => seen.push(a);
    handlers.onMobStatSet = (a) => seen.push({ ...a, stats: Array.from(a.stats) });
    handlers.onNpcTemplatePacket = (a) => seen.push(a);

    // OG: CPet::OnAction (0x6a3860) — petIdx:u8, type:u8, actionNo:u8, chat:string, flag:u8.
    const pet = OutPacket.Of(OutHeader.PetAction);
    pet.writeInt(1001); pet.writeByte(0); pet.writeByte(1); pet.writeByte(3); pet.writeString('hi'); pet.writeByte(1);
    dispatch(router, pet);

    const dragon = OutPacket.Of(OutHeader.DragonAction);
    dragon.writeInt(1001); dragon.writeByte(5); dragon.writeInt(9);
    dispatch(router, dragon);

    const mob = OutPacket.Of(OutHeader.MobStatSet);
    // TODO_AUDIT.md One-hundred-sixty-ninth pass: UINT128 flag — two longs (maskLow + maskHigh)
    mob.writeInt(2001); mob.writeLong(0x10n); mob.writeLong(0n); mob.writeByte(0xaa); mob.writeByte(0xbb);
    dispatch(router, mob);

    const npc = OutPacket.Of(OutHeader.NpcTemplatePacket);
    npc.writeInt(9001000); npc.writeByte(1);
    dispatch(router, npc);

    expect(seen).toEqual([
      { charId: 1001, petIdx: 0, type: 1, actionNo: 3, chat: 'hi', flag: 1 },
      { charId: 1001, action: 5, option: 9 },
      { mobId: 2001, statMask: 0x10n, statMaskHigh: 0n, stats: [0xaa, 0xbb] },
      { npcId: 9001000, bMove: true },
    ]);
  });

  it('decodes PetActivated summon/remove and PetEvol (OG CUser::OnPetActivated/OnPetEvol)', () => {
    const { router, handlers } = setup();
    const seen: any[] = [];
    handlers.onPetActivated = (a) => seen.push(a);
    handlers.onPetEvol = (a) => seen.push(a);
    handlers.onPetAction = (a) => seen.push(a);

    // opcode 198 (PetActivated, triggers PetInterActWithUserAction(0, petIdx)).
    const summon = OutPacket.Of(OutHeader.PetActivated);
    summon.writeInt(1001); summon.writeByte(0); summon.writeByte(1); summon.writeByte(0);
    summon.writeInt(5000000); summon.writeString('Pinky'); summon.writeLong(0xABCDn);
    summon.writeShort(100); summon.writeShort(-200); summon.writeByte(2); summon.writeShort(7);
    dispatch(router, summon);

    // opcode 200 (PetActivatedSilent, removal — hasPet=false).
    const remove = OutPacket.Of(OutHeader.PetActivatedSilent);
    remove.writeInt(1001); remove.writeByte(0); remove.writeByte(0); remove.writeByte(2);
    dispatch(router, remove);

    // opcode 199 (PetEvol).
    const evol = OutPacket.Of(OutHeader.PetEvol);
    evol.writeInt(1001); evol.writeByte(0); evol.writeByte(0);
    evol.writeInt(5000001); evol.writeString('Pinky II'); evol.writeLong(0xABCEn);
    evol.writeShort(10); evol.writeShort(-20); evol.writeByte(1); evol.writeShort(3);
    dispatch(router, evol);

    expect(seen).toEqual([
      { charId: 1001, petIdx: 0, hasPet: true, forceReplace: false, templateId: 5000000, name: 'Pinky', lockerSN: 0xABCDn, x: 100, y: -200, moveAction: 2, footholdId: 7 },
      { charId: 1001, petIdx: 0, type: 0, actionNo: 0, chat: '', flag: 0 },
      { charId: 1001, petIdx: 0, hasPet: false, removeReason: 2 },
      { charId: 1001, clearFirst: true, petIdx: 0, templateId: 5000001, name: 'Pinky II', lockerSN: 0xABCEn, x: 10, y: -20, moveAction: 1, footholdId: 3 },
    ]);
  });
});
