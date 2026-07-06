import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';

function dispatch(router: PacketRouter, payload: Uint8Array): void {
  router.dispatch(new InPacket(payload), null as any);
}

function setup() {
  const router = new PacketRouter();
  const fh = new FieldHandlers();
  fh.register(router);
  return { router, fh };
}

describe('Opcodes found via the v95 IDA dump switch-table audit', () => {
  it('InventoryGrow decodes invType and slotCount', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onInventoryGrow = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.InventoryGrow);
    p.writeByte(2); p.writeByte(48);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ invType: 2, slotCount: 48 });
  });

  it('SetTamingMobInfo decodes charId/level/exp/fatigue/flag', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onSetTamingMobInfo = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.SetTamingMobInfo);
    p.writeInt(1001); p.writeInt(5000); p.writeInt(100); p.writeInt(200); p.writeByte(1);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ charId: 1001, tamingMobLevel: 5000, tamingMobExp: 100, tamingMobFatigue: 200, flag: 1 });
  });

  it('QuestClear decodes questId', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onQuestClear = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.QuestClear);
    p.writeShort(1234);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ questId: 1234 });
  });

  it('GatherItemResult / SortItemResult decode invType + resultCode', () => {
    for (const [header, cb] of [
      [OutHeader.GatherItemResult, 'onGatherItemResult'],
      [OutHeader.SortItemResult, 'onSortItemResult'],
    ] as const) {
      const { router, fh } = setup();
      let captured: any = null;
      (fh as any)[cb] = (a: any) => (captured = a);
      const p = OutPacket.Of(header);
      p.writeByte(1); p.writeByte(0);
      dispatch(router, p.toArray());
      expect(captured).toEqual({ invType: 1, resultCode: 0 });
    }
  });

  it('SueCharacterResult / TradeMoneyLimit / SetGender decode a single byte', () => {
    const cases = [
      [OutHeader.SueCharacterResult, 'onSueCharacterResult', 'resultCode'],
      [OutHeader.TradeMoneyLimit, 'onTradeMoneyLimit', 'limitType'],
      [OutHeader.SetGender, 'onSetGender', 'gender'],
    ] as const;
    for (const [header, cb, field] of cases) {
      const { router, fh } = setup();
      let captured: any = null;
      (fh as any)[cb] = (a: any) => (captured = a);
      const p = OutPacket.Of(header);
      p.writeByte(7);
      dispatch(router, p.toArray());
      expect(captured).toEqual({ [field]: 7 });
    }
  });

  it('TownPortalNotify decodes townId/fieldId + skillId/x/y when a portal is active', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onTownPortalNotify = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.TownPortalNotify);
    p.writeInt(1); p.writeInt(2); p.writeInt(3); p.writeShort(100); p.writeShort(200);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ townId: 1, fieldId: 2, skillId: 3, x: 100, y: 200 });
  });

  it('TownPortalNotify reads only townId/fieldId when the "no portal" sentinel is set', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onTownPortalNotify = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.TownPortalNotify);
    p.writeInt(999999999); p.writeInt(999999999);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ townId: 999999999, fieldId: 999999999 });
  });

  it('OpenGateNotify decodes x/y', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onOpenGateNotify = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.OpenGateNotify);
    p.writeShort(50); p.writeShort(60);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ x: 50, y: 60 });
  });

  // OG: CWvsContext::OnMarriageRequest (decompile/a00bb0.c) — only
  // requestType===0 (an actual proposal) has further bytes; every other
  // value (including the wishlist-dialog case, 9) is requestType only.
  it('MarriageRequest requestType===0 decodes string + int', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onMarriageRequest = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.MarriageRequest);
    p.writeByte(0); p.writeString('Alice'); p.writeInt(2002);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ requestType: 0, partnerName: 'Alice', partnerId: 2002 });
  });

  it('MarriageRequest non-zero requestType has no further bytes', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onMarriageRequest = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.MarriageRequest);
    p.writeByte(9);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ requestType: 9 });
  });

  // OG: CWvsContext::OnMarriageResult (decompile/a00da0.c) — resultCode 15
  // is the only case with name/name/short; most codes have no further bytes.
  it('MarriageResult resultCode 15 decodes groomName/brideName/ringItemId', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onMarriageResult = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.MarriageResult);
    p.writeByte(15); p.writeString('Alice'); p.writeString('Bob'); p.writeShort(1234);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ resultCode: 15, groomName: 'Alice', brideName: 'Bob', ringItemId: 1234 });
  });

  it('MarriageResult other result codes have no further bytes', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onMarriageResult = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.MarriageResult);
    p.writeByte(18);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ resultCode: 18 });
  });

  // OG: CWvsContext::OnNotifyMarriedPartnerMapTransfer (decompile/9cfb00.c)
  // — second field is m_nMarriedPartnerID (a character id), not a portalId.
  it('NotifyMarriedPartnerMapTransfer decodes mapId + partnerId', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onNotifyMarriedPartnerMapTransfer = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.NotifyMarriedPartnerMapTransfer);
    p.writeInt(100000000); p.writeInt(3);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ mapId: 100000000, partnerId: 3 });
  });

  it('CashPetFoodResult reads no further bytes when result===1', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onCashPetFoodResult = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.CashPetFoodResult);
    p.writeByte(1);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ result: 1 });
  });

  it('CashPetFoodResult reads a foodIndex byte when result===0', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onCashPetFoodResult = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.CashPetFoodResult);
    p.writeByte(0); p.writeByte(3);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ result: 0, foodIndex: 3 });
  });

  it('SetWeekEventMessage decodes flag + message', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onSetWeekEventMessage = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.SetWeekEventMessage);
    p.writeByte(1); p.writeString('Double EXP weekend!');
    dispatch(router, p.toArray());
    expect(captured).toEqual({ flag: 1, message: 'Double EXP weekend!' });
  });

  it('SetPotionDiscountRate decodes a byte', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onSetPotionDiscountRate = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.SetPotionDiscountRate);
    p.writeByte(50);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ rate: 50 });
  });

  it('MonsterBookSetCard decodes flag + cardId + count', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onMonsterBookSetCard = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.MonsterBookSetCard);
    p.writeByte(1); p.writeInt(2370000); p.writeInt(3);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ flag: 1, cardId: 2370000, count: 3 });
  });

  it('MonsterBookSetCover decodes coverId', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onMonsterBookSetCover = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.MonsterBookSetCover);
    p.writeInt(5);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ coverId: 5 });
  });

  it('HourChanged decodes hour + minute', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onHourChanged = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.HourChanged);
    p.writeShort(13); p.writeShort(30);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ hour: 13, minute: 30 });
  });

  it('MiniMapOnOff decodes a boolean', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onMiniMapOnOff = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.MiniMapOnOff);
    p.writeByte(1);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ onOff: true });
  });

  it('ConsultAuthkeyUpdate / ClassCompetitionAuthkeyUpdate decode a string', () => {
    for (const [header, cb] of [
      [OutHeader.ConsultAuthkeyUpdate, 'onConsultAuthkeyUpdate'],
      [OutHeader.ClassCompetitionAuthkeyUpdate, 'onClassCompetitionAuthkeyUpdate'],
    ] as const) {
      const { router, fh } = setup();
      let captured: any = null;
      (fh as any)[cb] = (a: any) => (captured = a);
      const p = OutPacket.Of(header);
      p.writeString('abc123');
      dispatch(router, p.toArray());
      expect(captured).toEqual({ authkey: 'abc123' });
    }
  });

  it('WebBoardAuthkeyUpdate decodes flag + authkey', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onWebBoardAuthkeyUpdate = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.WebBoardAuthkeyUpdate);
    p.writeByte(1); p.writeString('xyz789');
    dispatch(router, p.toArray());
    expect(captured).toEqual({ flag: 1, authkey: 'xyz789' });
  });

  it('SessionValue / PartyValue / FieldSetVariable decode key+value strings', () => {
    for (const [header, cb] of [
      [OutHeader.SessionValue, 'onSessionValue'],
      [OutHeader.PartyValue, 'onPartyValue'],
      [OutHeader.FieldSetVariable, 'onFieldSetVariable'],
    ] as const) {
      const { router, fh } = setup();
      let captured: any = null;
      (fh as any)[cb] = (a: any) => (captured = a);
      const p = OutPacket.Of(header);
      p.writeString('key1'); p.writeString('value1');
      dispatch(router, p.toArray());
      expect(captured).toEqual({ key: 'key1', value: 'value1' });
    }
  });

  it('BonusExpRateChanged decodes 3 ints', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onBonusExpRateChanged = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.BonusExpRateChanged);
    p.writeInt(150); p.writeInt(1000); p.writeInt(2000);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ rate: 150, startTime: 1000, endTime: 2000 });
  });

  it('PotionDiscountRateChanged decodes 2 ints', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onPotionDiscountRateChanged = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.PotionDiscountRateChanged);
    p.writeInt(20); p.writeInt(3600);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ rate: 20, duration: 3600 });
  });

  it('NotifyLevelUp decodes flag + level + name', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onNotifyLevelUp = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.NotifyLevelUp);
    p.writeByte(1); p.writeInt(50); p.writeString('Bob');
    dispatch(router, p.toArray());
    expect(captured).toEqual({ flag: 1, level: 50, name: 'Bob' });
  });

  it('NotifyWedding decodes flag + name', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onNotifyWedding = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.NotifyWedding);
    p.writeByte(1); p.writeString('Alice & Bob');
    dispatch(router, p.toArray());
    expect(captured).toEqual({ flag: 1, name: 'Alice & Bob' });
  });

  it('NotifyJobChange decodes flag + job + name', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onNotifyJobChange = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.NotifyJobChange);
    p.writeByte(1); p.writeInt(200); p.writeString('Bob');
    dispatch(router, p.toArray());
    expect(captured).toEqual({ flag: 1, job: 200, name: 'Bob' });
  });

  it('MapleTVUseRes decodes a string', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onMapleTVUseRes = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.MapleTVUseRes);
    p.writeString('Now playing');
    dispatch(router, p.toArray());
    expect(captured).toEqual({ message: 'Now playing' });
  });

  it('AvatarMegaphoneRes decodes result + message', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onAvatarMegaphoneRes = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.AvatarMegaphoneRes);
    p.writeByte(1); p.writeString('Hello world');
    dispatch(router, p.toArray());
    expect(captured).toEqual({ result: 1, message: 'Hello world' });
  });

  it('SuccessInUsegachaponBox decodes itemId', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onSuccessInUsegachaponBox = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.SuccessInUsegachaponBox);
    p.writeInt(1302000);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ itemId: 1302000 });
  });

  it('SetBuyEquipExt decodes a boolean', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onSetBuyEquipExt = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.SetBuyEquipExt);
    p.writeByte(1);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ flag: true });
  });

  it('SetPassengerRequest decodes npcId', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onSetPassengerRequest = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.SetPassengerRequest);
    p.writeInt(9001000);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ npcId: 9001000 });
  });

  it('ScriptProgressMessage / DataCRCCheckFailed / MapleTVUseRes decode a string', () => {
    for (const [header, cb] of [
      [OutHeader.ScriptProgressMessage, 'onScriptProgressMessageNotify'],
      [OutHeader.DataCRCCheckFailed, 'onDataCRCCheckFailed'],
    ] as const) {
      const { router, fh } = setup();
      let captured: any = null;
      (fh as any)[cb] = (a: any) => (captured = a);
      const p = OutPacket.Of(header);
      p.writeString('hello');
      dispatch(router, p.toArray());
      expect(captured).toEqual({ message: 'hello' });
    }
  });

  it('UpdateGMBoard decodes boardId + message', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onUpdateGMBoard = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.UpdateGMBoard);
    p.writeInt(1); p.writeString('Server restart in 10 minutes');
    dispatch(router, p.toArray());
    expect(captured).toEqual({ boardId: 1, message: 'Server restart in 10 minutes' });
  });

  it('ShowSlotMessage decodes a byte', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onShowSlotMessage = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.ShowSlotMessage);
    p.writeByte(3);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ slot: 3 });
  });

  it('AccountMoreInfo decodes a byte', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onAccountMoreInfo = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.AccountMoreInfo);
    p.writeByte(1);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ flag: 1 });
  });

  it('FindFriend decodes two bytes', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onFindFriend = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.FindFriend);
    p.writeByte(1); p.writeByte(0);
    dispatch(router, p.toArray());
    expect(captured).toEqual({ flag1: 1, flag2: 0 });
  });

  it('TransferChannelNotify decodes channel + message', () => {
    const { router, fh } = setup();
    let captured: any = null;
    fh.onTransferChannelNotify = (a: any) => (captured = a);
    const p = OutPacket.Of(OutHeader.TransferChannelNotify);
    p.writeInt(3); p.writeString('Transferring...');
    dispatch(router, p.toArray());
    expect(captured).toEqual({ channel: 3, message: 'Transferring...' });
  });
});
