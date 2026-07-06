import { describe, it, expect, beforeEach } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { LoginHandlers } from '../../../src/net/handlers/LoginHandlers.js';
import { OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import type { ClientSession } from '../../../src/net/session/ClientSession.js';
import type { Account } from '../../../src/domain/Account.js';

function makeSession(): any {
  const sentPackets: Uint8Array[] = [];
  const acc: Account = {
    accountId: 0, gender: 0, gradeCode: 0, subGradeCode: 0,
    countryId: 0, nexonClubId: '', purchaseExp: 0, chatBlockReason: 0,
    chatUnblockDate: 0, registerDate: 0, characterSlotCount: 3,
    skipPinCode: false, loginOpt: 0, clientKey: new Uint8Array(8),
  } as any as Account;
  return {
    account: acc,
    worlds: [],
    characters: [],
    handshake: null,
    sentPackets,
    send: (packet: { toArray(): Uint8Array }) => { sentPackets.push(packet.toArray()); },
    machineId: new Uint8Array(16),
    onHandshakeReceived: null,
    onDisconnected: null,
    isConnected: true,
  };
}

function dispatchPayload(router: PacketRouter, opcode: number, payload: Uint8Array): void {
  const buf = new Uint8Array(2 + payload.length);
  buf[0] = opcode & 0xFF;
  buf[1] = (opcode >> 8) & 0xFF;
  buf.set(payload, 2);
  router.dispatch(new InPacket(buf), null!);
}

describe('LoginHandlers (integration)', () => {
  let router: PacketRouter;
  let handlers: LoginHandlers;
  let session: any;

  beforeEach(() => {
    router = new PacketRouter();
    session = makeSession();
    handlers = new LoginHandlers(session as ClientSession);
    handlers.register(router);
  });

  it('CheckPasswordResult success sets account fields', () => {
    const resultArgs: any[] = [];
    handlers.onCheckPasswordResult = (args) => resultArgs.push(args);

    const p = OutPacket.Raw();
    p.writeByte(0);        // result = 0 (success)
    p.writeByte(0);        // male
    p.writeInt(0);         // ?
    p.writeInt(1001);      // accountId
    p.writeByte(1);        // gender
    p.writeByte(2);        // gradeCode
    p.writeShort(3);       // subGradeCode
    p.writeByte(4);        // countryId
    p.writeString('testuser'); // nexonClubId
    p.writeByte(0);        // purchaseExp
    p.writeByte(0);        // chatBlockReason
    p.writeLong(0n);       // chatUnblockDate
    p.writeLong(0n);       // registerDate
    p.writeInt(5);         // characterSlotCount
    p.writeByte(1);        // skipPinCode
    p.writeByte(0);        // loginOpt
    p.writeBytes(new Uint8Array(8)); // clientKey

    dispatchPayload(router, OutHeader.CheckPasswordResult, p.toArray());

    expect(resultArgs).toHaveLength(1);
    expect(resultArgs[0].success).toBe(true);
    expect(session.account.accountId).toBe(1001);
    expect(session.account.gender).toBe(1);
    expect(session.account.gradeCode).toBe(2);
    expect(session.account.subGradeCode).toBe(3);
    expect(session.account.countryId).toBe(4);
    expect(session.account.nexonClubId).toBe('testuser');
    expect(session.account.characterSlotCount).toBe(5);
    expect(session.account.skipPinCode).toBe(true);
  });

  it('CheckPasswordResult failure fires callback with code', () => {
    const resultArgs: any[] = [];
    handlers.onCheckPasswordResult = (args) => resultArgs.push(args);

    const p = OutPacket.Raw();
    p.writeByte(7); // result = 7 (failure)

    dispatchPayload(router, OutHeader.CheckPasswordResult, p.toArray());

    expect(resultArgs).toHaveLength(1);
    expect(resultArgs[0].success).toBe(false);
    expect(resultArgs[0].resultCode).toBe(7);
  });

  it('WorldInformation parses world + channel info and terminator fires callback', () => {
    const worldsComplete: any[] = [];
    handlers.onWorldListComplete = (worlds) => worldsComplete.push(worlds);

    const w1 = OutPacket.Raw();
    w1.writeByte(0);         // worldId
    w1.writeString('Sol');   // name
    w1.writeByte(0);         // state
    w1.writeString('');      // eventDescription
    w1.writeShort(100);      // eventExpRate
    w1.writeShort(100);      // eventDropRate
    w1.writeByte(0);         // blockCharCreation
    w1.writeByte(2);         // channelCount
    for (let i = 0; i < 2; i++) {
      w1.writeString(`Ch ${i + 1}`); // channel name
      w1.writeInt(200 + i);          // userCount
      w1.writeByte(0);               // worldId
      w1.writeByte(i);               // channelId
      w1.writeByte(0);               // adult
    }
    w1.writeShort(0);        // balloonCount

    dispatchPayload(router, OutHeader.WorldInformation, w1.toArray());
    expect(session.worlds).toHaveLength(1);
    expect(session.worlds[0].name).toBe('Sol');
    expect(session.worlds[0].channels).toHaveLength(2);
    expect(session.worlds[0].channels[0].name).toBe('Ch 1');
    expect(session.worlds[0].channels[1].name).toBe('Ch 2');
    expect(worldsComplete).toHaveLength(0);

    // terminator
    const term = OutPacket.Raw();
    term.writeByte(-1); // signed byte -1 = terminator
    dispatchPayload(router, OutHeader.WorldInformation, term.toArray());
    expect(worldsComplete).toHaveLength(1);
    expect(worldsComplete[0]).toBe(session.worlds);
  });

  // TODO_AUDIT.md Fifty-fourth pass: balloonCount's {x, y, message} records
  // were never read, desyncing every subsequent world entry.
  it('WorldInformation reads balloon entries, not just their count', () => {
    const w1 = OutPacket.Raw();
    w1.writeByte(0); w1.writeString('Sol'); w1.writeByte(0); w1.writeString('');
    w1.writeShort(100); w1.writeShort(100); w1.writeByte(0);
    w1.writeByte(0); // channelCount
    w1.writeShort(2); // balloonCount
    w1.writeShort(10); w1.writeShort(20); w1.writeString('Event A');
    w1.writeShort(30); w1.writeShort(40); w1.writeString('Event B');

    const w2 = OutPacket.Raw();
    w2.writeByte(1); w2.writeString('Mar'); w2.writeByte(0); w2.writeString('');
    w2.writeShort(100); w2.writeShort(100); w2.writeByte(0);
    w2.writeByte(0); w2.writeShort(0);

    dispatchPayload(router, OutHeader.WorldInformation, w1.toArray());
    dispatchPayload(router, OutHeader.WorldInformation, w2.toArray());

    expect(session.worlds).toHaveLength(2);
    expect(session.worlds[0].balloons).toEqual([
      { x: 10, y: 20, message: 'Event A' },
      { x: 30, y: 40, message: 'Event B' },
    ]);
    expect(session.worlds[1].name).toBe('Mar');
  });

  it('SelectWorldResult parses character list', () => {
    const results: any[] = [];
    handlers.onSelectWorldResult = (args) => results.push(args);

    const p = OutPacket.Raw();
    p.writeByte(0);     // result = 0 (success)
    p.writeInt(1);      // character count
    // ── CharacterStat ──
    p.writeInt(42);            // characterId
    p.writeBytes(new TextEncoder().encode('TestChar'.padEnd(13, '\0'))); // name (fixed 13 bytes)
    p.writeByte(0);            // gender
    p.writeByte(0);            // skin
    p.writeInt(20000);         // face
    p.writeInt(0);             // hair
    p.writeLong(0n);           // petSn1
    p.writeLong(0n);           // petSn2
    p.writeLong(0n);           // petSn3
    p.writeByte(1);            // level
    p.writeShort(0);           // job
    p.writeShort(4);           // str
    p.writeShort(5);           // dex
    p.writeShort(6);           // int
    p.writeShort(7);           // luk
    p.writeInt(100);           // hp
    p.writeInt(200);           // maxHp
    p.writeInt(50);            // mp
    p.writeInt(150);           // maxMp
    p.writeShort(10);          // ap
    p.writeByte(0); p.writeByte(0); // sp (non-extend: 2 bytes)
    p.writeInt(0);             // exp
    p.writeShort(0);           // pop
    p.writeInt(0);             // tempExp
    p.writeInt(100000000);     // posMap
    p.writeByte(0);            // portal
    p.writeInt(0);             // playTime
    p.writeShort(0);           // subJob
    // ── AvatarLook ──
    p.writeByte(0);            // gender
    p.writeByte(0);            // skin
    p.writeInt(20000);         // face
    p.writeByte(0);            // 0 (between face and hair)
    p.writeInt(30000);         // hair
    p.writeByte(0xFF);         // hairEquip terminator (empty list)
    p.writeByte(0xFF);         // unseenEquip terminator (empty list)
    p.writeInt(0);             // weaponStickerId
    p.writeInt(0);             // petId[0]
    p.writeInt(0);             // petId[1]
    p.writeInt(0);             // petId[2]
    // ── post-character fields ──
    p.writeByte(0);            // onFamily
    p.writeByte(0);            // hasRank (0 = no rank data)
    // ── SelectWorldResult trailer ──
    p.writeByte(0);            // loginOpt
    p.writeInt(3);             // slotCount
    p.writeInt(0);             // buyCharCount

    dispatchPayload(router, OutHeader.SelectWorldResult, p.toArray());
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(session.characters).toHaveLength(1);
    expect(session.characters[0].stat.name.trim()).toBe('TestChar');
    expect(session.characters[0].stat.characterId).toBe(42);
    expect(session.characters[0].stat.level).toBe(1);
    expect(session.characters[0].stat.str).toBe(4);
    expect(session.characters[0].look.face).toBe(20000);
    expect(session.characters[0].look.hair).toBe(30000);
    expect(session.account.characterSlotCount).toBe(3);
  });

  it('SelectCharacterResult success provides migration info', () => {
    const results: any[] = [];
    handlers.onSelectCharacterResult = (args) => results.push(args);

    const p = OutPacket.Raw();
    p.writeByte(0);          // result = 0 (success)
    p.writeByte(0);          // ?
    p.writeBytes(new Uint8Array([10, 0, 0, 127])); // host (bytes: 10.0.0.127)
    p.writeShort(8585);      // port
    p.writeInt(42);          // characterId
    p.writeByte(1);          // authenCode
    p.writeInt(0);           // premiumArg

    dispatchPayload(router, OutHeader.SelectCharacterResult, p.toArray());
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(Array.from(results[0].channelHost)).toEqual([10, 0, 0, 127]);
    expect(results[0].channelPort).toBe(8585);
    expect(results[0].characterId).toBe(42);
    expect(results[0].authenCode).toBe(1);
  });

  it('SelectCharacterResult failure fires callback with code', () => {
    const results: any[] = [];
    handlers.onSelectCharacterResult = (args) => results.push(args);

    const p = OutPacket.Raw();
    p.writeByte(3);   // result = 3 (failure)
    p.writeByte(0);   // ?

    dispatchPayload(router, OutHeader.SelectCharacterResult, p.toArray());
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].resultCode).toBe(3);
  });

  // OG: CLogin::OnSelectCharacterResult (decompile/5dea80.c) — resultCode
  // 23, and resultCode 12 with subCode 0xB/0xD, also fall through to the
  // success path (not just resultCode===0).
  it('SelectCharacterResult code=23 is treated as success', () => {
    const results: any[] = [];
    handlers.onSelectCharacterResult = (args) => results.push(args);
    const p = OutPacket.Raw();
    p.writeByte(23); p.writeByte(0);
    p.writeBytes(new Uint8Array([10, 0, 0, 127]));
    p.writeShort(8585); p.writeInt(42); p.writeByte(1); p.writeInt(0);
    dispatchPayload(router, OutHeader.SelectCharacterResult, p.toArray());
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].characterId).toBe(42);
  });

  it('SelectCharacterResult code=12 subCode=0xB is treated as success', () => {
    const results: any[] = [];
    handlers.onSelectCharacterResult = (args) => results.push(args);
    const p = OutPacket.Raw();
    p.writeByte(12); p.writeByte(0xB);
    p.writeBytes(new Uint8Array([10, 0, 0, 127]));
    p.writeShort(8585); p.writeInt(42); p.writeByte(1); p.writeInt(0);
    dispatchPayload(router, OutHeader.SelectCharacterResult, p.toArray());
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].characterId).toBe(42);
  });

  it('SelectCharacterResult code=12 subCode=2 is a real failure', () => {
    const results: any[] = [];
    handlers.onSelectCharacterResult = (args) => results.push(args);
    const p = OutPacket.Raw();
    p.writeByte(12); p.writeByte(2);
    dispatchPayload(router, OutHeader.SelectCharacterResult, p.toArray());
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].resultCode).toBe(12);
  });

  it('AuthenMessage decodes unsigned premium argument and message type', () => {
    const args: any[] = [];
    handlers.onAuthenMessage = (a) => args.push(a);

    const p = OutPacket.Raw();
    p.writeInt(-2); // 0xFFFF_FFFE as OG Decode4 unsigned
    p.writeByte(7);

    dispatchPayload(router, OutHeader.AuthenMessage, p.toArray());
    expect(args).toEqual([{ premiumArgument: 0xFFFF_FFFE, messageType: 7 }]);
  });

  it('CheckCrcResult decodes the OG terminate decision byte', () => {
    const args: any[] = [];
    handlers.onCheckCrcResult = (a) => args.push(a);

    const p = OutPacket.Raw();
    p.writeByte(0);

    dispatchPayload(router, OutHeader.CheckCrcResult, p.toArray());
    expect(args).toEqual([{ ok: false }]);
  });

  it('CheckPinCodeResult mode 0 is accepted and reads no further bytes', () => {
    const args: any[] = [];
    handlers.onCheckPinCodeResult = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeByte(0);
    dispatchPayload(router, OutHeader.CheckPinCodeResult, p.toArray());
    expect(args).toEqual([{
      mode: 0,
      accepted: true,
      requiresNewPin: false,
      requiresPinEntry: false,
      returnToLogin: false,
    }]);
  });

  it('CheckPinCodeResult mode 1 requests new PIN creation', () => {
    const args: any[] = [];
    handlers.onCheckPinCodeResult = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeByte(1);
    dispatchPayload(router, OutHeader.CheckPinCodeResult, p.toArray());
    expect(args).toEqual([{
      mode: 1,
      accepted: false,
      requiresNewPin: true,
      requiresPinEntry: false,
      returnToLogin: false,
    }]);
  });

  it('CheckPinCodeResult mode 7 requests return to login', () => {
    const args: any[] = [];
    handlers.onCheckPinCodeResult = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeByte(7);
    dispatchPayload(router, OutHeader.CheckPinCodeResult, p.toArray());
    expect(args).toEqual([{
      mode: 7,
      accepted: false,
      requiresNewPin: false,
      requiresPinEntry: false,
      returnToLogin: true,
    }]);
  });

  it('EnableSPWResult decodes flag and code (always exactly 2 bytes)', () => {
    const args: any[] = [];
    handlers.onEnableSpwResult = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeByte(1);
    p.writeByte(0x14);
    dispatchPayload(router, OutHeader.EnableSPWResult, p.toArray());
    expect(args).toEqual([{ flag: true, code: 0x14 }]);
  });

  it('RecommendWorldMessage decodes worldId/message entries', () => {
    const args: any[] = [];
    handlers.onRecommendWorldMessage = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeByte(2);
    p.writeInt(0); p.writeString('Try Scania!');
    p.writeInt(1); p.writeString('Try Bera!');
    dispatchPayload(router, OutHeader.RecommendWorldMessage, p.toArray());
    expect(args).toEqual([[
      { worldId: 0, message: 'Try Scania!' },
      { worldId: 1, message: 'Try Bera!' },
    ]]);
  });

  it('CheckExtraCharInfoResult decodes characterId and flag', () => {
    const args: any[] = [];
    handlers.onExtraCharInfoResult = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeInt(12345);
    p.writeByte(0);
    dispatchPayload(router, OutHeader.CheckExtraCharInfoResult, p.toArray());
    expect(args).toEqual([{ characterId: 12345, flag: 0 }]);
  });

  it('GuestIDLoginResult decodes account info when resultType=0 and regStatId=0', () => {
    const args: any[] = [];
    handlers.onGuestIdLoginResult = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeByte(0); p.writeByte(0); // resultType, regStatId
    p.writeInt(99); p.writeByte(0); p.writeByte(1); p.writeByte(2); p.writeByte(0); // accountId,gender,gradeCode,countryId,discard
    p.writeString('club3');
    p.writeByte(0); p.writeByte(0); // purchaseExp, chatBlockReason
    p.writeLong(10n); p.writeLong(20n); // chatUnblockDate, registerDate
    p.writeInt(3); p.writeString('http://register'); // numOfCharacters, url
    dispatchPayload(router, OutHeader.GuestIDLoginResult, p.toArray());
    expect(args).toEqual([{
      resultType: 0, regStatId: 0,
      accountInfo: {
        accountId: 99, gender: 0, gradeCode: 1, countryId: 2, nexonClubId: 'club3',
        purchaseExp: 0, chatBlockReason: 0, chatUnblockDate: 10n, registerDate: 20n,
        numOfCharacters: 3, guestIdRegistrationUrl: 'http://register',
      },
    }]);
  });

  it('GuestIDLoginResult reads no further bytes when regStatId is not 0/1', () => {
    const args: any[] = [];
    handlers.onGuestIdLoginResult = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeByte(0); p.writeByte(2); // resultType=0, regStatId=2 (no account info block)
    dispatchPayload(router, OutHeader.GuestIDLoginResult, p.toArray());
    expect(args).toEqual([{ resultType: 0, regStatId: 2, accountInfo: undefined }]);
  });

  it('AccountInfoResult populates session.account when resultType=0', () => {
    const args: any[] = [];
    handlers.onAccountInfoResult = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeByte(0); // resultType
    p.writeInt(77); p.writeByte(1); p.writeByte(2); p.writeShort(3); p.writeByte(4);
    p.writeString('clubX');
    p.writeByte(5); p.writeByte(6);
    p.writeLong(100n); p.writeLong(200n);
    p.writeInt(4);
    p.writeBytes(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
    dispatchPayload(router, OutHeader.AccountInfoResult, p.toArray());
    expect(args).toEqual([{ resultType: 0, hasAccountInfo: true }]);
    expect(session.account.accountId).toBe(77);
    expect(session.account.subGradeCode).toBe(3);
    expect(session.account.characterSlotCount).toBe(4);
    expect(Array.from(session.account.clientKey)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('AccountInfoResult reads only the result byte for other codes', () => {
    const args: any[] = [];
    handlers.onAccountInfoResult = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeByte(7); // resultType not in {0,12,23}
    dispatchPayload(router, OutHeader.AccountInfoResult, p.toArray());
    expect(args).toEqual([{ resultType: 7, hasAccountInfo: false }]);
  });

  it('SetAccountResult decodes value and success flag', () => {
    const args: any[] = [];
    handlers.onSetAccountResult = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeByte(5); p.writeByte(1);
    dispatchPayload(router, OutHeader.SetAccountResult, p.toArray());
    expect(args).toEqual([{ value: 5, success: true }]);
  });

  it('SetAccountResult success sends the OG PIN bootstrap packet', () => {
    const p = OutPacket.Raw();
    p.writeByte(5);
    p.writeByte(1);
    dispatchPayload(router, OutHeader.SetAccountResult, p.toArray());

    expect(session.sentPackets).toHaveLength(1);
    const sent = new InPacket(session.sentPackets[0]);
    expect(sent.readShort()).toBe(9);
    expect(sent.readByte()).toBe(1);
    expect(sent.readByte()).toBe(1);
    expect(sent.readString()).toBe('');
    expect(sent.remaining).toBe(0);
  });

  it('SetAccountResult failure does not send the PIN bootstrap packet', () => {
    const p = OutPacket.Raw();
    p.writeByte(5);
    p.writeByte(0);
    dispatchPayload(router, OutHeader.SetAccountResult, p.toArray());
    expect(session.sentPackets).toHaveLength(0);
  });

  it('ConfirmEULAResult decodes accepted flag', () => {
    const args: any[] = [];
    handlers.onConfirmEulaResult = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeByte(1);
    dispatchPayload(router, OutHeader.ConfirmEULAResult, p.toArray());
    expect(args).toEqual([{ accepted: true }]);
  });

  it('ViewAllCharResult subType=0 decodes a character batch with rank', () => {
    const args: any[] = [];
    handlers.onViewAllCharResult = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeByte(0); // subType
    p.writeByte(3); // worldId
    p.writeByte(1); // character count
    // CharacterStat
    p.writeInt(1); p.writeBytes(new TextEncoder().encode('VacChar'.padEnd(13, '\0')));
    p.writeByte(0); p.writeByte(0);
    p.writeInt(20000); p.writeInt(30000);
    p.writeLong(0n); p.writeLong(0n); p.writeLong(0n);
    p.writeByte(50); p.writeShort(0);
    p.writeShort(4); p.writeShort(5); p.writeShort(6); p.writeShort(7);
    p.writeInt(100); p.writeInt(200); p.writeInt(50); p.writeInt(150);
    p.writeShort(10); p.writeByte(0); p.writeByte(0);
    p.writeInt(0); p.writeShort(0); p.writeInt(0);
    p.writeInt(100000000); p.writeByte(0); p.writeInt(0); p.writeShort(0);
    // AvatarLook
    p.writeByte(0); p.writeByte(0); p.writeInt(20000); p.writeByte(0); p.writeInt(30000);
    p.writeByte(0xFF); p.writeByte(0xFF);
    p.writeInt(0); p.writeInt(0); p.writeInt(0); p.writeInt(0);
    // rank
    p.writeByte(1); p.writeInt(10); p.writeInt(1); p.writeInt(20); p.writeInt(2);
    p.writeByte(7); // loginOpt
    dispatchPayload(router, OutHeader.ViewAllCharResult, p.toArray());
    expect(args).toHaveLength(1);
    expect(args[0].subType).toBe(0);
    expect(args[0].worldId).toBe(3);
    expect(args[0].loginOpt).toBe(7);
    expect(args[0].characters).toHaveLength(1);
    expect(args[0].characters[0].stat.characterId).toBe(1);
    expect(args[0].characters[0].rank).toEqual({ worldRank: 10, worldRankMove: 1, jobRank: 20, jobRankMove: 2 });
  });

  it('ViewAllCharResult subType=1 decodes server/character counts', () => {
    const args: any[] = [];
    handlers.onViewAllCharResult = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeByte(1);
    p.writeInt(2); p.writeInt(5);
    dispatchPayload(router, OutHeader.ViewAllCharResult, p.toArray());
    expect(args).toEqual([{ subType: 1, countRelatedSvrs: 2, countCharacters: 5 }]);
  });

  it('ViewAllCharResult subType=3 decodes an optional message', () => {
    const args: any[] = [];
    handlers.onViewAllCharResult = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeByte(3); p.writeByte(1); p.writeString('Connection failed');
    dispatchPayload(router, OutHeader.ViewAllCharResult, p.toArray());
    expect(args).toEqual([{ subType: 3, message: 'Connection failed' }]);
  });

  it('ViewAllCharResult subType=2 reads no further bytes', () => {
    const args: any[] = [];
    handlers.onViewAllCharResult = (a) => args.push(a);
    const p = OutPacket.Raw();
    p.writeByte(2);
    dispatchPayload(router, OutHeader.ViewAllCharResult, p.toArray());
    expect(args).toEqual([{ subType: 2 }]);
  });
});
