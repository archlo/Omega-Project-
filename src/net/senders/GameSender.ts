import { OutPacket } from '../packet/OutPacket.js';
import { InHeader } from '../packet/OpCodes.js';
import { InventoryType } from '../../domain/InventoryItem.js';
import { ScriptMessageType } from '../packet/ScriptMessageType.js';
import { MiniRoomType, MiniRoomProtocol as MiniRoomProtocolFull } from '../packet/MiniRoomProtocol.js';
import { EncodeMovePath, MoveElement } from '../packet/MovePathEncoder.js';
import {
  MapleStat,
  ShopRequestAction,
  TrunkRequestAction,
  MessengerRequestAction,
  QuestRequestAction,
  GuildRequestAction,
  PartyRequestAction,
  FriendRequestAction,
  WhisperSendBit,
  MiniRoomProtocol,
  ScriptAnswerAction,
} from '../protocol/Enums.js';

export { MapleStat } from '../protocol/Enums.js';

export enum ChatGroupType {
  Friend = 0,
  Party = 1,
  Guild = 2,
  Alliance = 3,
  Expedition = 6,
}

export interface SkillMacroSaveEntry {
  slot: number;
  name?: string;
  mute?: boolean;
  skills: number[];
}

export interface ClaimRequestArgs {
  chatClaim: boolean;
  targetCharacterName: string;
  claimType: number;
  context: string;
  chatLog?: string;
}

export class GameSender {
  static AliveAck(): OutPacket {
    return OutPacket.Of(InHeader.AliveAck);
  }

  static UserCharacterInfoRequest(characterId: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserCharacterInfoRequest);
    p.writeInt(0);
    p.writeInt(characterId);
    p.writeByte(0);
    return p;
  }

  static ChangeSlotPosition(invType: InventoryType, oldPos: number, newPos: number, count: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserChangeSlotPositionRequest);
    p.writeInt(0);
    p.writeByte(invType);
    p.writeShort(oldPos);
    p.writeShort(newPos);
    p.writeShort(count);
    return p;
  }

  // TODO_AUDIT.md item-drag-and-drop TODO: dropping an item onto the field is
  // CDraggableItem::OnDropped → CWvsContext::SendChangeSlotPositionRequest with
  // nToSlotPos = 0 (v95 UserChangeSlotPositionRequest). No separate opcode
  // exists — a drop is a slot move whose destination is the sentinel slot 0.
  static DropItem(invType: InventoryType, slotPos: number, count: number): OutPacket {
    return GameSender.ChangeSlotPosition(invType, slotPos, 0, count);
  }

  static UseItem(pos: number, itemId: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserStatChangeItemUseRequest);
    p.writeInt(0);
    p.writeShort(pos);
    p.writeInt(itemId);
    return p;
  }

  // OG: CWvsContext::SendSkillLearnItemUseRequest (decompile/9d65e0.c) —
  // dedicated opcode for skill books/mastery books, NOT the generic
  // UseItem/UserStatChangeItemUseRequest path. OG also gates this behind
  // `itemId/10000==228 || is_masterybook_item(itemId)`; the mastery-book
  // id list isn't exposed by this dump, so only the 228xxxx category check
  // is applied at the call site (GameStage.ts) — mastery books would still
  // incorrectly fall through to UseItem.
  static SkillLearnItemUseRequest(pos: number, itemId: number): OutPacket {
    const p = OutPacket.Of(InHeader.SkillLearnItemUseRequest);
    p.writeInt(0);
    p.writeShort(pos);
    p.writeInt(itemId);
    return p;
  }

  // OG: CWvsContext::SendSkillResetItemUseRequest (decompile/9de8c0.c) —
  // dedicated opcode for skill-reset scrolls (itemId/10000==250). Same wire
  // shape as SkillLearnItemUseRequest.
  static SkillResetItemUseRequest(pos: number, itemId: number): OutPacket {
    const p = OutPacket.Of(InHeader.SkillResetItemUseRequest);
    p.writeInt(0);
    p.writeShort(pos);
    p.writeInt(itemId);
    return p;
  }

  // OG: CWvsContext::SendStatChangeItemCancelRequest (v95 IDA dump).
  static StatChangeItemCancel(itemId: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserStatChangeItemCancelRequest);
    p.writeInt(itemId);
    return p;
  }

  // OG: CWvsContext::SendStatChangeRequest (v95 IDA dump, encode_layout
  // int(4) int(4) short(2) short(2) byte(1)).
  static StatChangeRequest(a: number, b: number, c: number, d: number, e: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserStatChangeRequest);
    p.writeInt(a);
    p.writeInt(b);
    p.writeShort(c);
    p.writeShort(d);
    p.writeByte(e);
    return p;
  }

  // OG: CWvsContext::SendStatChangeRequestByItemOption (v95 IDA dump,
  // encode_layout int(4) int(4) short(2) short(2)).
  static StatChangeRequestByItemOption(a: number, b: number, c: number, d: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserStatChangeRequestByItemOption);
    p.writeInt(a);
    p.writeInt(b);
    p.writeShort(c);
    p.writeShort(d);
    return p;
  }

  // OG: CWvsContext::SendUseBoxGachaponItemRequest (v95 IDA dump, encode_layout
  // short(2) int(4)).
  static UseBoxGachaponItem(pos: number, itemId: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserUseBoxGachaponItemRequest);
    p.writeShort(pos);
    p.writeInt(itemId);
    return p;
  }

  // OG: CWvsContext::SendUseGachaponRemoteRequest (v95 IDA dump, encode_layout
  // int(4) int(4)).
  static UseGachaponRemote(npcId: number, value: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserUseGachaponRemoteRequest);
    p.writeInt(npcId);
    p.writeInt(value);
    return p;
  }

  // OG: CUIRaiseWnd::SendPutItem / CUIRaisePieceWnd::SendPutItem (v95 IDA
  // dump, encode_layout byte(1) short(2) int(4)) — pet-evolution minigame.
  static RaiseWndPutItem(itemTI: number, pos: number, itemId: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserRaiseWndPutItem);
    p.writeByte(itemTI);
    p.writeShort(pos);
    p.writeInt(itemId);
    return p;
  }

  static RaisePieceWndPutItem(itemTI: number, pos: number, itemId: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserRaisePieceWndPutItem);
    p.writeByte(itemTI);
    p.writeShort(pos);
    p.writeInt(itemId);
    return p;
  }

  // OG: CUIFindFriend::SendMyInfoRequest/SendSearchRequest (v95 IDA dump) —
  // confirmed via disassembly to be Encode1(0)/Encode1(1) on the same opcode.
  static FindFriendMyInfoRequest(): OutPacket {
    const p = OutPacket.Of(InHeader.UserFindFriendRequest);
    p.writeByte(0);
    return p;
  }

  static FindFriendSearchRequest(): OutPacket {
    const p = OutPacket.Of(InHeader.UserFindFriendRequest);
    p.writeByte(1);
    return p;
  }

  static DropMoney(amount: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserDropMoneyRequest);
    p.writeInt(0);
    p.writeInt(amount);
    return p;
  }

  static PickUpDrop(fieldKey: number, x: number, y: number, dropId: number): OutPacket {
    const p = OutPacket.Of(InHeader.DropPickUpRequest);
    p.writeByte(fieldKey);
    p.writeInt(0);
    p.writeShort(x);
    p.writeShort(y);
    p.writeInt(dropId);
    p.writeInt(0);
    return p;
  }

  static SkillUp(skillId: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserSkillUpRequest);
    p.writeInt(0);
    p.writeInt(skillId);
    return p;
  }

  // OG: CUserLocal::SendSkillUseRequest (decompile/93e930.c; re-confirmed via
  // live IDA decompile of Maplestory95.exe.i64, 0x93e930) — this covers
  // only the unconditional base shape (update_time, skillId, slv, tDelay).
  // The OG function also conditionally encodes, in order: a short x/y
  // position if `is_antirepeat_buff_skill(skillId)` (an internal skill-ID
  // table this dump doesn't expose); an int spirit-javelin item ID if
  // skillId==4121006; a byte party/guild "affected member" bitmap (+short
  // tDelay-again if skillId==2311001) if the caller supplies one; and a
  // byte mob count + int[] mob IDs if the caller targets specific mobs.
  // The only call site (SkillBook double-click, self-cast from a flat skill
  // list) can't supply any of those — no mob-target/party-member picker
  // exists — so this is the right shape *for that call site*, not a
  // complete reimplementation of the OG function. A real per-mob attack
  // skill or party-targeted buff sent through this path would be missing
  // required fields.
  static UseSkill(skillId: number, slv: number, updateTime: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserSkillUseRequest);
    p.writeInt(updateTime);
    p.writeInt(skillId);
    p.writeByte(slv);
    p.writeShort(0);
    return p;
  }

  static SkillMacroFlushToSvr(macros: SkillMacroSaveEntry[]): OutPacket {
    const p = OutPacket.Of(InHeader.SkillMacroFlushToSvr);
    const rows = new Array<SkillMacroSaveEntry | null>(5).fill(null);
    for (const macro of macros) {
      if (macro.slot < 0 || macro.slot >= rows.length) continue;
      rows[macro.slot] = macro;
    }
    let count = rows.length;
    while (count > 0 && rows[count - 1] === null) count--;
    p.writeByte(count);
    for (let i = 0; i < count; i++) {
      const macro = rows[i];
      p.writeString((macro?.name ?? '').slice(0, 12));
      p.writeByte(macro?.mute ? 1 : 0);
      for (let j = 0; j < 3; j++) p.writeInt(macro?.skills[j] ?? 0);
    }
    return p;
  }

  static ClaimRequest(args: ClaimRequestArgs): OutPacket {
    const p = OutPacket.Of(InHeader.ClaimRequest);
    p.writeByte(args.chatClaim ? 1 : 0);
    p.writeString(args.targetCharacterName);
    p.writeByte(args.claimType);
    p.writeString(args.context);
    if (args.chatClaim) p.writeString(args.chatLog ?? '');
    return p;
  }

  static UserChat(message: string, shout = false): OutPacket {
    const p = OutPacket.Of(InHeader.UserChat);
    p.writeInt(0);
    p.writeString(message);
    p.writeByte(shout ? 1 : 0);
    return p;
  }

  static UserEmotion(emotion: number, duration = -1, byItemOption = false): OutPacket {
    const p = OutPacket.Of(InHeader.UserEmotion);
    p.writeInt(emotion);
    p.writeInt(duration);
    p.writeByte(byItemOption ? 1 : 0);
    return p;
  }

  /**
   * Allocate a single AP into an ability stat. `stat` is the 22-bit MapleStat
   * bitfield (Str=0x40, Dex=0x80, Int=0x100, Luk=0x200, MaxHp=0x800,
   * MaxMp=0x2000). OG CUIStat sends this for HP/MP and STR/DEX/INT/LUK.
   */
  static UserAbilityUp(stat: MapleStat): OutPacket {
    const p = OutPacket.Of(InHeader.UserAbilityUpRequest);
    p.writeInt(0);
    p.writeInt(stat as unknown as number);
    return p;
  }

  /**
   * Allocate multiple APs at once. Each entry is `[mapleStat, count]`.
   * Per the C++ UserAbilityMassUpRequest decoder, the wire is just a flat
   * list of int pairs with no per-entry opcode byte.
   */
  static UserAbilityMassUp(entries: Array<[stat: MapleStat, value: number]>): OutPacket {
    const p = OutPacket.Of(InHeader.UserAbilityMassUpRequest);
    p.writeInt(0);
    p.writeInt(entries.length);
    for (const [flag, value] of entries) {
      p.writeInt(flag as unknown as number);
      p.writeInt(value);
    }
    return p;
  }

  static TransferChannel(channelId: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserTransferChannelRequest);
    p.writeByte(channelId);
    p.writeInt(0);
    return p;
  }

  static TransferField(fieldKey: number, targetMap: number, portal: string, x: number, y: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserTransferFieldRequest);
    p.writeByte(fieldKey);
    p.writeInt(targetMap);
    p.writeString(portal);
    if (portal.length > 0) {
      p.writeShort(x);
      p.writeShort(y);
    }
    p.writeByte(0);
    p.writeByte(0);
    p.writeByte(0);
    return p;
  }

  static Revive(fieldKey: number, premium: boolean): OutPacket {
    const p = OutPacket.Of(InHeader.UserTransferFieldRequest);
    p.writeByte(fieldKey);
    p.writeInt(0);
    p.writeString('');
    p.writeByte(0);
    p.writeByte(premium ? 1 : 0);
    p.writeByte(0);
    return p;
  }

  static MigrateToCashShop(): OutPacket {
    const p = OutPacket.Of(InHeader.UserMigrateToCashShopRequest);
    p.writeInt(0);
    return p;
  }

  static ReturnFromCashShop(): OutPacket {
    // CField::SendTransferFieldRequest (decompile/5345C0.c) is the real opcode-41
    // encoder shared with TransferField/Revive above — it ALWAYS writes at minimum
    // fieldKey(1)+targetField(4)+portal-string, even for an empty/no-op transfer.
    // The previous header-only packet (zero payload bytes) didn't match that shape
    // at all and would desync the real server's opcode-41 parser.
    const p = OutPacket.Of(InHeader.UserTransferFieldRequest);
    p.writeByte(0);
    p.writeInt(0);
    p.writeString('');
    p.writeByte(0);
    p.writeByte(0);
    p.writeByte(0);
    return p;
  }

  static UserMove(fieldKey: number, movePathBlob: Uint8Array): OutPacket {
    const p = OutPacket.Of(InHeader.UserMove);
    p.writeInt(0);
    p.writeInt(0);
    p.writeByte(fieldKey);
    p.writeInt(0);
    p.writeInt(0);
    p.writeInt(0);
    p.writeBytes(movePathBlob);
    return p;
  }

  static MobMove(
    mobId: number,
    mobCtrlSn: number,
    action: number,
    left: boolean,
    movePathBlob: Uint8Array,
    chasing = false,
  ): OutPacket {
    const p = OutPacket.Of(InHeader.MobMove);
    p.writeInt(mobId);
    p.writeShort(mobCtrlSn);
    p.writeByte(0);
    p.writeByte((action << 1) | (left ? 1 : 0));
    p.writeBytes(movePathBlob);
    p.writeByte(chasing ? 1 : 0);
    return p;
  }

  /**
   * Mirrors `CUserLocal::SetDamaged` (decompile/9343C0.c)'s `pMob`-present
   * branch — the "I took damage from a real mob" ack. Real wire (after the
   * update_time): attackIdx(1), magicElemAttr(1), damage(4), templateId(4),
   * mobId(4) — written TWICE (a duplicate Encode4 of the same mob object id,
   * once early and again mid-packet, confirmed by reading the decompiled
   * function directly, not a typo in this port), dir(1), nX-flag(1),
   * bGuard(1), blockedFlag(1), powerGuardFlag(1), pGuard.gap0(1), hitX(2),
   * hitY(2), userX(2), userY(2), then an unconditional trailing stance byte.
   * The hit/user position block is unconditional on this branch — there is
   * no real "knockback>1" gate; the previous code's conditional 7-field
   * block (guarded by knockback>1) didn't correspond to any real branch and
   * was also missing the duplicate mobId field entirely. Confirmed dead code
   * (zero call sites anywhere in src/ — no PvP/self-damage system exists
   * client-side yet to call this from, per the existing "Needs new gameplay
   * systems" log entry), so this fix has no live behavior at risk; it makes
   * the encode correct for whenever a combat system does get built.
   * NOTE: the real wire's blockedFlag is `bBlocked ? (bKnockback?2:1) : 0` —
   * a genuine `bBlocked` boolean distinct from knockback that this method
   * has no parameter for. Rather than fabricate that distinction, `knockback`
   * here gates both: 0 = unblocked (flag 0), 1 = blocked no-knockback
   * (flag 1), >1 = blocked with knockback (flag 2) — an honest approximation
   * pending a real combat system threading a separate blocked flag through.
   */
  static UserHit(
    attackIndex: number,
    magicElemAttr: number,
    damage: number,
    templateId: number,
    mobId: number,
    dir: number,
    knockback = 1,
    userX = 0,
    userY = 0,
    hitX = 0,
    hitY = 0,
  ): OutPacket {
    const p = OutPacket.Of(InHeader.UserHit);
    p.writeInt(0);
    p.writeByte(attackIndex);
    p.writeByte(magicElemAttr);
    p.writeInt(damage);
    p.writeInt(templateId);
    p.writeInt(mobId);
    p.writeByte(dir);
    p.writeByte(0);
    p.writeByte(0);
    p.writeByte(knockback > 1 ? 2 : knockback > 0 ? 1 : 0);
    p.writeByte(0);
    p.writeInt(mobId);
    p.writeByte(0);
    p.writeShort(hitX);
    p.writeShort(hitY);
    p.writeShort(userX);
    p.writeShort(userY);
    p.writeByte(0);
    return p;
  }

  static ShopBuy(shopSlot: number, itemId: number, count: number, price: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserShopRequest);
    p.writeByte(ShopRequestAction.Buy);
    p.writeShort(shopSlot);
    p.writeInt(itemId);
    p.writeShort(count);
    p.writeInt(price);
    return p;
  }

  static ShopSell(pos: number, itemId: number, count: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserShopRequest);
    p.writeByte(ShopRequestAction.Sell);
    p.writeShort(pos);
    p.writeInt(itemId);
    p.writeShort(count);
    return p;
  }

  static ShopRecharge(pos: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserShopRequest);
    p.writeByte(ShopRequestAction.Recharge);
    p.writeShort(pos);
    return p;
  }

  static ShopClose(): OutPacket {
    const p = OutPacket.Of(InHeader.UserShopRequest);
    p.writeByte(ShopRequestAction.Close);
    return p;
  }

  // OG: CAdminShopDlg::OnPacket (decompile/4310f0.c) — both sub-actions of the
  // client's reply share opcode 74 (UserAdminShopRequest), distinguished by
  // the first byte: 2 = open with no existing dialog instance.
  static AdminShopRequest(): OutPacket {
    const p = OutPacket.Of(InHeader.UserAdminShopRequest);
    p.writeByte(2);
    return p;
  }

  // OG: same dispatcher, bReOpenDlg branch — 0 = reopen after a result action,
  // re-sending the npc template id the dialog was opened with.
  static AdminShopReopen(npcTemplateId: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserAdminShopRequest);
    p.writeByte(0);
    p.writeInt(npcTemplateId);
    return p;
  }

  // OG: CWvsContext::SendFamilyChartRequest (decompile/a09d20.c)
  static FamilyChartRequest(characterName: string): OutPacket {
    const p = OutPacket.Of(InHeader.UserFamilyChartRequest);
    p.writeString(characterName);
    return p;
  }

  // OG: CWvsContext::SendFamilyInfoRequest (decompile/a09860.c) — empty body.
  static FamilyInfoRequest(): OutPacket {
    return OutPacket.Of(InHeader.UserFamilyInfoRequest);
  }

  // OG: CWvsContext::SendFamilyInviteResult (decompile/a09c50.c)
  static FamilyInviteResult(inviterId: number, inviterName: string, accepted: boolean): OutPacket {
    const p = OutPacket.Of(InHeader.UserFamilyInviteResult);
    p.writeInt(inviterId);
    p.writeString(inviterName);
    p.writeByte(accepted ? 1 : 0);
    return p;
  }

  // OG: CWvsContext::OnMarriageRequest (decompile/a00bb0.c) — built inline
  // right after the local YesNo dialog, not a separate Send* method: byte
  // (2), byte(accepted), string(requesterName), int(partnerId).
  static MarriageRequestResponse(requesterName: string, partnerId: number, accepted: boolean): OutPacket {
    const p = OutPacket.Of(InHeader.MarriageRequestResponse);
    p.writeByte(2);
    p.writeByte(accepted ? 1 : 0);
    p.writeString(requesterName);
    p.writeInt(partnerId);
    return p;
  }

  // OG: CWvsContext::SendEngagementRequest (decompile, 0x9e1410) — the
  // *initiating* proposal side, sharing opcode 161 with
  // MarriageRequestResponse via a different action byte (0, not 2).
  // TODO_AUDIT.md Eighty-fifth pass's `CEngageDlg` finding: this sender
  // didn't exist at all before this fix. Triggered by double-clicking an
  // engagement-ring-box item (`is_engagement_ring_box_item`,
  // `itemId / 10000 === 224`, decompile-confirmed) — `CEngageDlg` itself
  // is just a tiny "request sent" placeholder (`PreCreateWnd`/`SetRet`/
  // `Draw` only, no buttons), not ported here since it has no real
  // interactive content beyond what `ChatBar`/`Notice` already convey.
  static MarriageRequest(targetCharacterName: string, ringItemId: number): OutPacket {
    const p = OutPacket.Of(InHeader.MarriageRequestResponse);
    p.writeByte(0);
    p.writeString(targetCharacterName);
    p.writeInt(ringItemId);
    return p;
  }

  // OG: CWvsContext::OnFamilySummonRequest (decompile/a0b0a0.c) — the YesNo
  // response is sent inline from the same function, not a separate sender.
  static FamilySummonResponse(accepted: boolean): OutPacket {
    const p = OutPacket.Of(InHeader.UserFamilySummonResponse);
    p.writeByte(accepted ? 1 : 0);
    return p;
  }

  // OG: CWvsContext::SendUseFamilyPrivilege — index-only body. See
  // UserUseFamilyPrivilege's OpCodes.ts comment for the SP_Summon/SP_Jump
  // target-name sub-case this deliberately doesn't port.
  static UseFamilyPrivilege(privilegeIndex: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserUseFamilyPrivilege);
    p.writeInt(privilegeIndex);
    return p;
  }

  // OG: CWvsContext::SendSetFamilyPrecept.
  static SetFamilyPrecept(precept: string): OutPacket {
    const p = OutPacket.Of(InHeader.UserSetFamilyPrecept);
    p.writeString(precept);
    return p;
  }

  // OG: CUIGuildBBS::OnRegister (decompile/7c4250.c) — sub-action 0. Posts a
  // new entry, or edits one when `modifyEntryId` is given.
  static GuildBBSRegister(title: string, text: string, emoticonId: number, isNotice: boolean, modifyEntryId?: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserGuildBBSRequest);
    p.writeByte(0);
    p.writeByte(modifyEntryId !== undefined ? 1 : 0);
    if (modifyEntryId !== undefined) p.writeInt(modifyEntryId);
    p.writeByte(isNotice ? 1 : 0);
    p.writeString(title);
    p.writeString(text);
    p.writeInt(emoticonId);
    return p;
  }

  // OG: CUIGuildBBS::OnDelete (decompile/7c6520.c) — sub-action 1.
  static GuildBBSDeleteEntry(entryId: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserGuildBBSRequest);
    p.writeByte(1);
    p.writeInt(entryId);
    return p;
  }

  // OG: CUIGuildBBS::SendLoadListRequest (decompile/7c3680.c) — sub-action 2.
  static GuildBBSLoadList(startIndex: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserGuildBBSRequest);
    p.writeByte(2);
    p.writeInt(startIndex);
    return p;
  }

  // OG: CUIGuildBBS::SendViewEntryRequest (decompile/7c3710.c) — sub-action 3.
  static GuildBBSViewEntry(entryId: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserGuildBBSRequest);
    p.writeByte(3);
    p.writeInt(entryId);
    return p;
  }

  // OG: CUIGuildBBS::OnComment (decompile/7c4530.c) — sub-action 4.
  static GuildBBSComment(entryId: number, comment: string): OutPacket {
    const p = OutPacket.Of(InHeader.UserGuildBBSRequest);
    p.writeByte(4);
    p.writeInt(entryId);
    p.writeString(comment);
    return p;
  }

  // OG: CUIGuildBBS::OnCommentDelete (decompile/7c3b70.c) — sub-action 5.
  static GuildBBSCommentDelete(entryId: number, commentSn: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserGuildBBSRequest);
    p.writeByte(5);
    p.writeInt(entryId);
    p.writeInt(commentSn);
    return p;
  }

  // OG: CCashShop::SendGiftsPacket (decompile/487b60.c) — sub-action 4. Sent
  // once per recipient (OG loops `m_aSendGifts` one entry at a time, driven
  // by the CashItemResult response advancing `m_nGiftsIdx`); the caller is
  // responsible for re-invoking this per recipient.
  static CashShopSendGift(spw: string, commoditySN: number, requestBuyOneADay: boolean, recipientName: string, giftMessage: string): OutPacket {
    const p = OutPacket.Of(InHeader.UserCashShopRequest);
    p.writeByte(4);
    p.writeString(spw);
    p.writeInt(commoditySN);
    p.writeByte(requestBuyOneADay ? 1 : 0);
    p.writeString(recipientName);
    p.writeString(giftMessage);
    return p;
  }

  // OG: CWishListGiveDlg::SendPutItemRequest (decompile/9a7140.c) — sub
  // action 6. Offers an item from the player's own inventory into the
  // wedding wishlist exchange.
  static WeddingWishListPutItem(pos: number, itemId: number, count: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserWeddingWishListRequest);
    p.writeByte(6);
    p.writeShort(pos);
    p.writeInt(itemId);
    p.writeShort(count);
    return p;
  }

  // OG: CWishListRecvDlg::SendGetItemRequest (decompile/9aba50.c) — sub
  // action 7. Requests one of the partner's offered wishlist items.
  static WeddingWishListGetItem(tab: number, idx: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserWeddingWishListRequest);
    p.writeByte(7);
    p.writeByte(tab);
    p.writeByte(idx);
    return p;
  }

  // OG: CUIItemUpgrade::OnButtonClicked (decompile/7c0ca0.c) — the dialog's
  // constructor pre-builds a COutPacket(85) header (ts1, scrollPos,
  // scrollItemId) when opened; this appends the target equip's itemTI/
  // slotPosition + a second timestamp when "Upgrade" is clicked. Confirmed
  // against the v95 IDA dump's func_encode_seq for both the ctor (empty —
  // it just stores the passed-in packet) and OnButtonClicked (3 ints).
  static ItemUpgradeApply(scrollPos: number, scrollItemId: number, targetItemTI: number, targetSlotPos: number, ts1: number, ts2: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
    p.writeInt(ts1);
    p.writeShort(scrollPos);
    p.writeInt(scrollItemId);
    p.writeInt(targetItemTI);
    p.writeInt(targetSlotPos);
    p.writeInt(ts2);
    return p;
  }

  // OG: CUIItemProtector::OnButtonClicked (decompile/7d7520.c) — identical
  // wire shape to ItemUpgradeApply (same shared opcode 85 mechanism).
  static ItemProtectorApply(scrollPos: number, scrollItemId: number, targetItemTI: number, targetSlotPos: number, ts1: number, ts2: number): OutPacket {
    return GameSender.ItemUpgradeApply(scrollPos, scrollItemId, targetItemTI, targetSlotPos, ts1, ts2);
  }

  // OG: CUIKarmaDlg::_SendConsumeCashItemUseRequest (v95 IDA dump,
  // func_encode_seq for 0x7d7ef0: int(4) short(2) int(4) int(4) int(4)).
  // Unlike ItemUpgrade/ItemProtector, Karma builds the whole packet in one
  // shot at confirm time (its ctor only takes plain ints, not a COutPacket)
  // — one timestamp, not two.
  static KarmaApply(scrollPos: number, scrollItemId: number, targetItemTI: number, targetSlotPos: number, ts: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
    p.writeInt(ts);
    p.writeShort(scrollPos);
    p.writeInt(scrollItemId);
    p.writeInt(targetItemTI);
    p.writeInt(targetSlotPos);
    return p;
  }

  // OG: CItemSpeakerDlg::_SendConsumeCashItemUseRequest (0x5c9e70) — same
  // opcode 85 family as ItemUpgradeApply/KarmaApply/ItemProtectorApply.
  // Wire shape confirmed: int4(updateTime) int2(invPos) int4(itemId)
  // str(message) byte(isWhisper) byte(hasTargetItem)
  // [if hasTargetItem: int4(targetTI) int4(targetPOS)].
  // TODO_AUDIT.md Hundred-and-seventeenth pass.
  static MegaphoneCompose(invPos: number, itemId: number, message: string, isWhisper: boolean, targetTI = 0, targetPOS = 0): OutPacket {
    const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
    p.writeInt(Date.now());
    p.writeShort(invPos);
    p.writeInt(itemId);
    p.writeString(message);
    p.writeByte(isWhisper ? 1 : 0);
    const hasTarget = targetTI !== 0 || targetPOS !== 0;
    p.writeByte(hasTarget ? 1 : 0);
    if (hasTarget) {
      p.writeInt(targetTI);
      p.writeInt(targetPOS);
    }
    return p;
  }

  // OG: CUIVega::OnButtonClicked (decompile/7bf4a0.c) — opcode 85 family
  // (UserConsumeCashItemUseRequest). The OG pre-encodes the cash-item
  // slotPos(short)+itemId(int) before the dialog opens, then appends 6 ints
  // at click time: equipItemTI(4) equipSlotPos(4) scrollItemTI(4)
  // scrollSlotPos(4) whiteScrollUse(4) timestamp(4). Non-cash opens
  // (chat command) pass 0 for cashPos/cashItemId.
  static VegaApply(cashPos: number, cashItemId: number, equipItemTI: number, equipSlotPos: number, scrollItemTI: number, scrollSlotPos: number, whiteScrollUse: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
    p.writeShort(cashPos);
    p.writeInt(cashItemId);
    p.writeInt(equipItemTI);
    p.writeInt(equipSlotPos);
    p.writeInt(scrollItemTI);
    p.writeInt(scrollSlotPos);
    p.writeInt(whiteScrollUse);
    p.writeInt(Date.now());
    return p;
  }

  // OG: CStoreBankDlg::SendGetAllRequest (decompile/7449f0.c) — fired only
  // when the player accepts the get-all-fee confirm dialog (CUtilDlg::YesNo
  // returning the Yes button id); declining sends nothing.
  static StoreBankGetAllConfirm(): OutPacket {
    const p = OutPacket.Of(InHeader.UserStoreBankRequest);
    p.writeByte(0x1B);
    return p;
  }

  // OG: CRepairDurabilityDlg::SendRepairDurabilityAll (decompile/6d37b0.c) —
  // no payload, fired from OnButtonClicked's 0x3E8 case.
  static RepairDurabilityAll(): OutPacket {
    return OutPacket.Of(InHeader.RepairDurabilityAll);
  }

  // OG: CRepairDurabilityDlg::SendRepairDurability (decompile/6d3980.c) —
  // sends the selected item's nPOS, fired from OnButtonClicked's 0x3E9 case.
  static RepairDurability(pos: number): OutPacket {
    const p = OutPacket.Of(InHeader.RepairDurability);
    p.writeInt(pos);
    return p;
  }

  // OG: CUICharacterSaleDlg::SendCheckDuplicateIDPacket (decompile/777d20.c)
  static CharacterSaleCheckId(name: string): OutPacket {
    const p = OutPacket.Of(InHeader.UserCharacterSaleCheckId);
    p.writeString(name);
    return p;
  }

  // OG: CUICharacterSaleDlg::SendCreateNewCharacter (decompile/77a240.c) —
  // sells the current character slot and creates a new character in its
  // place. `abilityLevels` is the 4-entry AL array (CUICharacterSaleDlg::
  // GetSelectedAL loop, indices 0-3); OG sends `get_update_time()` both
  // before and after the AL/gender/class/SP fields, which this mirrors with
  // a single caller-supplied timestamp used for both slots.
  static CharacterSaleCreate(
    pos: number, itemId: number, name: string, abilityLevels: [number, number, number, number],
    gender: number, currentClass: number, sp: number, timestamp: number,
  ): OutPacket {
    const p = OutPacket.Of(InHeader.UserCharacterSaleCreate);
    p.writeInt(timestamp);
    p.writeShort(pos);
    p.writeInt(itemId);
    p.writeString(name);
    for (const al of abilityLevels) p.writeInt(al);
    p.writeInt(gender);
    p.writeInt(currentClass);
    p.writeInt(sp);
    p.writeInt(timestamp);
    return p;
  }

  static TrunkWithdraw(invType: number, position: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserTrunkRequest);
    p.writeByte(TrunkRequestAction.Withdraw);
    p.writeByte(invType);
    p.writeByte(position);
    return p;
  }

  static TrunkDeposit(inventoryPos: number, itemId: number, quantity: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserTrunkRequest);
    p.writeByte(TrunkRequestAction.Deposit);
    p.writeShort(inventoryPos);
    p.writeInt(itemId);
    p.writeShort(quantity);
    return p;
  }

  static TrunkSort(): OutPacket {
    const p = OutPacket.Of(InHeader.UserTrunkRequest);
    p.writeByte(TrunkRequestAction.Sort);
    return p;
  }

  static TrunkWithdrawMoney(amount: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserTrunkRequest);
    p.writeByte(TrunkRequestAction.WithdrawMoney);
    p.writeInt(amount);
    return p;
  }

  static TrunkDepositMoney(amount: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserTrunkRequest);
    p.writeByte(TrunkRequestAction.DepositMoney);
    p.writeInt(-amount);
    return p;
  }

  static TrunkClose(): OutPacket {
    const p = OutPacket.Of(InHeader.UserTrunkRequest);
    p.writeByte(TrunkRequestAction.Close);
    return p;
  }

  static MessengerEnter(messengerId: number): OutPacket {
    const p = OutPacket.Of(InHeader.Messenger);
    p.writeByte(MessengerRequestAction.Enter);
    p.writeInt(messengerId);
    return p;
  }

  static MessengerLeave(): OutPacket {
    const p = OutPacket.Of(InHeader.Messenger);
    p.writeByte(MessengerRequestAction.Leave);
    return p;
  }

  static MessengerInvite(targetName: string): OutPacket {
    const p = OutPacket.Of(InHeader.Messenger);
    p.writeByte(MessengerRequestAction.Invite);
    p.writeString(targetName);
    return p;
  }

  static MessengerChat(text: string): OutPacket {
    const p = OutPacket.Of(InHeader.Messenger);
    p.writeByte(MessengerRequestAction.Chat);
    p.writeString(text);
    return p;
  }

  static QuestAccept(questId: number, npcId: number, x: number, y: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserQuestRequest);
    p.writeByte(QuestRequestAction.Accept);
    p.writeShort(questId);
    p.writeInt(npcId);
    p.writeInt(0);
    p.writeShort(x);
    p.writeShort(y);
    return p;
  }

  static QuestComplete(questId: number, npcId: number, x: number, y: number, rewardIndex = 0): OutPacket {
    const p = OutPacket.Of(InHeader.UserQuestRequest);
    p.writeByte(QuestRequestAction.Complete);
    p.writeShort(questId);
    p.writeInt(npcId);
    p.writeInt(0);
    p.writeShort(x);
    p.writeShort(y);
    p.writeInt(rewardIndex);
    return p;
  }

  static QuestResign(questId: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserQuestRequest);
    p.writeByte(QuestRequestAction.Resign);
    p.writeShort(questId);
    return p;
  }

  static QuestStartScript(questId: number, npcTemplateId: number, x: number, y: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserQuestRequest);
    p.writeByte(QuestRequestAction.StartScript);
    p.writeShort(questId);
    p.writeInt(npcTemplateId);
    p.writeShort(x);
    p.writeShort(y);
    return p;
  }

  static QuestCompleteScript(questId: number, npcTemplateId: number, x: number, y: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserQuestRequest);
    p.writeByte(QuestRequestAction.CompleteScript);
    p.writeShort(questId);
    p.writeInt(npcTemplateId);
    p.writeShort(x);
    p.writeShort(y);
    return p;
  }

  /** QuestRequestAction.OpenQuest = 6. Opens the quest UI to view progress. */
  static QuestOpen(questId: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserQuestRequest);
    p.writeByte(QuestRequestAction.OpenQuest);
    p.writeShort(questId);
    return p;
  }

  /** QuestRequestAction.LostItem = 7. Returns a lost quest item to its owner. */
  static QuestLostItem(questId: number, itemId: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserQuestRequest);
    p.writeByte(QuestRequestAction.LostItem);
    p.writeShort(questId);
    p.writeInt(itemId);
    return p;
  }

  /** QuestRequestAction.CompleteNpcScript = 8. Completes a quest started via NPC script. */
  static QuestCompleteNpcScript(questId: number, npcTemplateId: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserQuestRequest);
    p.writeByte(QuestRequestAction.CompleteNpcScript);
    p.writeShort(questId);
    p.writeInt(npcTemplateId);
    return p;
  }

  static GuildLoad(): OutPacket {
    const p = OutPacket.Of(InHeader.GuildRequest);
    p.writeByte(GuildRequestAction.Load);
    return p;
  }

  static GuildLeave(characterId: number, characterName: string): OutPacket {
    const p = OutPacket.Of(InHeader.GuildRequest);
    p.writeByte(GuildRequestAction.Leave);
    p.writeInt(characterId);
    p.writeString(characterName);
    return p;
  }

  /** GuildRequestAction.Create = 1. Creates a new guild. */
  static GuildCreate(name: string): OutPacket {
    const p = OutPacket.Of(InHeader.GuildRequest);
    p.writeByte(GuildRequestAction.Create);
    p.writeString(name);
    return p;
  }

  /** GuildRequestAction.Join = 2. Joins an existing guild. */
  static GuildJoin(characterId: number, characterName: string): OutPacket {
    const p = OutPacket.Of(InHeader.GuildRequest);
    p.writeByte(GuildRequestAction.Join);
    p.writeInt(characterId);
    p.writeString(characterName);
    return p;
  }

  /** GuildRequestAction.Withdraw = 3. Withdraws a pending application. */
  static GuildWithdraw(characterId: number): OutPacket {
    const p = OutPacket.Of(InHeader.GuildRequest);
    p.writeByte(GuildRequestAction.Withdraw);
    p.writeInt(characterId);
    return p;
  }

  /** GuildRequestAction.Kick = 4. Expels a guild member. */
  static GuildKick(characterId: number, characterName: string): OutPacket {
    const p = OutPacket.Of(InHeader.GuildRequest);
    p.writeByte(GuildRequestAction.Kick);
    p.writeInt(characterId);
    p.writeString(characterName);
    return p;
  }

  /** GuildRequestAction.Admin = 5. Sets a member's guild rank to admin. */
  static GuildAdmin(characterId: number, characterName: string): OutPacket {
    const p = OutPacket.Of(InHeader.GuildRequest);
    p.writeByte(GuildRequestAction.Admin);
    p.writeInt(characterId);
    p.writeString(characterName);
    return p;
  }

  /** GuildRequestAction.Level = 6. Promotes/demotes a guild member. */
  static GuildLevel(characterId: number, level: number): OutPacket {
    const p = OutPacket.Of(InHeader.GuildRequest);
    p.writeByte(GuildRequestAction.Level);
    p.writeInt(characterId);
    p.writeByte(level);
    return p;
  }

  /** GuildRequestAction.Expel = 8. Hard-expels a member (vs. soft "kick"). */
  static GuildExpel(characterId: number, characterName: string): OutPacket {
    const p = OutPacket.Of(InHeader.GuildRequest);
    p.writeByte(GuildRequestAction.Expel);
    p.writeInt(characterId);
    p.writeString(characterName);
    return p;
  }

  // OG: CField::SendSetGuildMarkMsg (decompile) — TODO_AUDIT.md
  // Seventy-ninth pass's `CSetGuildMarkDlg` finding: short markBg,
  // byte markBgColor, short mark, byte markColor. Guild-master-only,
  // gated client-side in the OG by CWvsContext::AmIGuildMaster.
  static GuildSetMark(markBg: number, markBgColor: number, mark: number, markColor: number): OutPacket {
    const p = OutPacket.Of(InHeader.GuildRequest);
    p.writeByte(GuildRequestAction.SetMark);
    p.writeShort(markBg);
    p.writeByte(markBgColor);
    p.writeShort(mark);
    p.writeByte(markColor);
    return p;
  }

  // TODO_AUDIT.md Hundred-and-twenty-sixth pass: alliance outgoing senders.
  // All use InHeader.AllianceRequest=167 (COutPacket(0xA7)), sub-types confirmed
  // via IDA decompile of CTabGuildAlliance::OnWithdraw/Invite/Kick/ChangeMaster/
  // OnGradeChange/OnSetNotice.

  /** Sub-type 2: leave the current alliance. No extra data. */
  static AllianceWithdraw(): OutPacket {
    const p = OutPacket.Of(InHeader.AllianceRequest);
    p.writeByte(2);
    return p;
  }

  /** Sub-type 3: invite a character by name to the alliance. */
  static AllianceInvite(targetName: string): OutPacket {
    const p = OutPacket.Of(InHeader.AllianceRequest);
    p.writeByte(3);
    p.writeString(targetName);
    return p;
  }

  /** Sub-type 6: kick a member from the alliance.
   *  Requires guildId (the member's guild) and charId. */
  static AllianceKick(guildId: number, charId: number): OutPacket {
    const p = OutPacket.Of(InHeader.AllianceRequest);
    p.writeByte(6);
    p.writeInt(guildId);
    p.writeInt(charId);
    return p;
  }

  /** Sub-type 7: transfer alliance master to another character. */
  static AllianceChangeMaster(charId: number): OutPacket {
    const p = OutPacket.Of(InHeader.AllianceRequest);
    p.writeByte(7);
    p.writeInt(charId);
    return p;
  }

  /** Sub-type 9: change an alliance member's grade up (bUp=1) or down (bUp=0). */
  static AllianceGradeChange(charId: number, up: boolean): OutPacket {
    const p = OutPacket.Of(InHeader.AllianceRequest);
    p.writeByte(9);
    p.writeInt(charId);
    p.writeByte(up ? 1 : 0);
    return p;
  }

  /** Sub-type 10: set the alliance notice text. */
  static AllianceSetNotice(text: string): OutPacket {
    const p = OutPacket.Of(InHeader.AllianceRequest);
    p.writeByte(10);
    p.writeString(text);
    return p;
  }

  static UserSelectNpc(npcObjId: number, userX: number, userY: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserSelectNpc);
    p.writeInt(npcObjId);
    p.writeShort(userX);
    p.writeShort(userY);
    return p;
  }

  static ScriptAnswerSay(type: ScriptMessageType, action: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserScriptMessageAnswer);
    p.writeByte(type);
    p.writeByte(action);
    return p;
  }

  static ScriptAnswerNumber(type: ScriptMessageType, answer: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserScriptMessageAnswer);
    p.writeByte(type);
    p.writeByte(ScriptAnswerAction.Select);
    p.writeInt(answer);
    return p;
  }

  static ScriptAnswerText(type: ScriptMessageType, answer: string): OutPacket {
    const p = OutPacket.Of(InHeader.UserScriptMessageAnswer);
    p.writeByte(type);
    p.writeByte(ScriptAnswerAction.Select);
    p.writeString(answer);
    return p;
  }

  static ScriptAnswerCancel(type: ScriptMessageType): OutPacket {
    const p = OutPacket.Of(InHeader.UserScriptMessageAnswer);
    p.writeByte(type);
    p.writeByte(ScriptAnswerAction.Cancel);
    return p;
  }

  static ScriptAnswerNext(msgType: number): OutPacket {
    return GameSender.ScriptAnswerSay(msgType, ScriptAnswerAction.Select);
  }

  static ScriptAnswerYesNo(yes: boolean): OutPacket {
    return GameSender.ScriptAnswerSay(ScriptMessageType.AskYesNo, yes ? ScriptAnswerAction.Select : ScriptAnswerAction.Cancel);
  }

  static ScriptAnswerTextOnly(answer: string): OutPacket {
    const p = OutPacket.Of(InHeader.UserScriptMessageAnswer);
    p.writeByte(ScriptMessageType.AskText);
    p.writeByte(ScriptAnswerAction.Select);
    p.writeString(answer);
    return p;
  }

  static ScriptAnswerNumberOnly(answer: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserScriptMessageAnswer);
    p.writeByte(ScriptMessageType.AskNumber);
    p.writeByte(ScriptAnswerAction.Select);
    p.writeInt(answer);
    return p;
  }

  static GroupChat(type: ChatGroupType, memberIds: number[], text: string): OutPacket {
    const p = OutPacket.Of(InHeader.GroupMessage);
    p.writeInt(0);
    p.writeByte(type);
    p.writeByte(memberIds.length);
    for (const id of memberIds) {
      p.writeInt(id);
    }
    p.writeString(text);
    return p;
  }

  static Whisper(targetName: string, text: string): OutPacket {
    const p = OutPacket.Of(InHeader.Whisper);
    p.writeByte(WhisperSendBit.SendOnly);
    p.writeInt(0);
    p.writeString(targetName);
    p.writeString(text);
    return p;
  }

  static PartyCreate(): OutPacket {
    const p = OutPacket.Of(InHeader.PartyRequest);
    p.writeByte(PartyRequestAction.Create);
    return p;
  }

  static PartyLeave(): OutPacket {
    const p = OutPacket.Of(InHeader.PartyRequest);
    p.writeByte(PartyRequestAction.Leave);
    p.writeByte(0);
    return p;
  }

  static PartyJoin(inviterId: number): OutPacket {
    const p = OutPacket.Of(InHeader.PartyRequest);
    p.writeByte(PartyRequestAction.Join);
    p.writeInt(inviterId);
    p.writeByte(0);
    return p;
  }

  static PartyInvite(targetName: string): OutPacket {
    const p = OutPacket.Of(InHeader.PartyRequest);
    p.writeByte(PartyRequestAction.Invite);
    p.writeString(targetName);
    return p;
  }

  static PartyKick(characterId: number): OutPacket {
    const p = OutPacket.Of(InHeader.PartyRequest);
    p.writeByte(PartyRequestAction.Kick);
    p.writeInt(characterId);
    return p;
  }

  /** PartyRequestAction.ChangeLevel = 6. Adjusts the party's level range. */
  static PartyChangeLevel(level: number): OutPacket {
    const p = OutPacket.Of(InHeader.PartyRequest);
    p.writeByte(PartyRequestAction.ChangeLevel);
    p.writeInt(level);
    return p;
  }

  /** PartyRequestAction.ChangeJob = 7. Restricts the party to a job id. */
  static PartyChangeJob(jobId: number): OutPacket {
    const p = OutPacket.Of(InHeader.PartyRequest);
    p.writeByte(PartyRequestAction.ChangeJob);
    p.writeInt(jobId);
    return p;
  }

  /** PartyRequestAction.ChangePartyName = 8. Updates the party name. */
  static PartyChangeName(name: string): OutPacket {
    const p = OutPacket.Of(InHeader.PartyRequest);
    p.writeByte(PartyRequestAction.ChangePartyName);
    p.writeString(name);
    return p;
  }

  /** PartyRequestAction.Apply = 9. Applies to join an open party. */
  static PartyApply(partyId: number): OutPacket {
    const p = OutPacket.Of(InHeader.PartyRequest);
    p.writeByte(PartyRequestAction.Apply);
    p.writeInt(partyId);
    return p;
  }

  /** PartyRequestAction.WithdrawApply = 10. Withdraws a pending application. */
  static PartyWithdrawApply(partyId: number): OutPacket {
    const p = OutPacket.Of(InHeader.PartyRequest);
    p.writeByte(PartyRequestAction.WithdrawApply);
    p.writeInt(partyId);
    return p;
  }

  /** PartyRequestAction.SetMemberGrade = 11. Promotes/demotes a party member. */
  static PartySetMemberGrade(characterId: number, grade: number): OutPacket {
    const p = OutPacket.Of(InHeader.PartyRequest);
    p.writeByte(PartyRequestAction.SetMemberGrade);
    p.writeInt(characterId);
    p.writeByte(grade);
    return p;
  }

  static FriendLoad(): OutPacket {
    const p = OutPacket.Of(InHeader.FriendRequest);
    p.writeByte(FriendRequestAction.Load);
    return p;
  }

  static FriendAdd(targetName: string, group = 'Default Group'): OutPacket {
    const p = OutPacket.Of(InHeader.FriendRequest);
    p.writeByte(FriendRequestAction.Add);
    p.writeString(targetName);
    p.writeString(group);
    return p;
  }

  static FriendAccept(friendId: number): OutPacket {
    const p = OutPacket.Of(InHeader.FriendRequest);
    p.writeByte(FriendRequestAction.Accept);
    p.writeInt(friendId);
    return p;
  }

  static FriendDelete(friendId: number): OutPacket {
    const p = OutPacket.Of(InHeader.FriendRequest);
    p.writeByte(FriendRequestAction.Delete);
    p.writeInt(friendId);
    return p;
  }

  /** FriendRequestAction.Refuse = 4. Refuses a pending friend invite. */
  static FriendRefuse(friendId: number): OutPacket {
    const p = OutPacket.Of(InHeader.FriendRequest);
    p.writeByte(FriendRequestAction.Refuse);
    p.writeInt(friendId);
    return p;
  }

  /** OG: `CField::SendSetFriendMsg` (decompile/535240.c) — there is no
   *  separate "set group" action; re-grouping an existing friend reuses the
   *  same Add (action 1) packet, keyed by name rather than friend id. */
  static FriendSetGroup(targetName: string, group: string): OutPacket {
    return GameSender.FriendAdd(targetName, group);
  }

  /** FriendRequestAction.SetMemo = 6. Sets a friend note. */
  static FriendSetMemo(friendId: number, memo: string): OutPacket {
    const p = OutPacket.Of(InHeader.FriendRequest);
    p.writeByte(FriendRequestAction.SetMemo);
    p.writeInt(friendId);
    p.writeString(memo);
    return p;
  }

  /** FriendRequestAction.CapacityChange = 7. Adjusts the friend-list capacity. */
  static FriendCapacityChange(delta: number): OutPacket {
    const p = OutPacket.Of(InHeader.FriendRequest);
    p.writeByte(FriendRequestAction.CapacityChange);
    p.writeInt(delta);
    return p;
  }

  // ── MiniRoom (InHeader.MiniRoom 144) ──────────────────────────────────────

  static MiniRoomCreate(roomType: number, title: string, password: string, gameSpec: number): OutPacket {
    const p = OutPacket.Of(InHeader.MiniRoom);
    p.writeByte(MiniRoomProtocol.MRP_Create);
    p.writeByte(roomType);
    p.writeString(title);
    p.writeByte(password ? 1 : 0);
    if (password) p.writeString(password);
    p.writeByte(gameSpec);
    return p;
  }

  static MiniRoomCreateTrade(): OutPacket {
    return GameSender.MiniRoomCreate(MiniRoomType.TradingRoom, '', '', 0);
  }

  static MiniRoomEnter(miniRoomId: number, password: string): OutPacket {
    const p = OutPacket.Of(InHeader.MiniRoom);
    p.writeByte(MiniRoomProtocol.MRP_Enter);
    p.writeInt(miniRoomId);
    p.writeByte(password ? 1 : 0);
    if (password) p.writeString(password);
    p.writeByte(0);
    return p;
  }

  static MiniRoomLeave(): OutPacket {
    const p = OutPacket.Of(InHeader.MiniRoom);
    p.writeByte(MiniRoomProtocol.MRP_Leave);
    return p;
  }

  static MiniRoomChat(text: string): OutPacket {
    const p = OutPacket.Of(InHeader.MiniRoom);
    p.writeByte(MiniRoomProtocol.MRP_Chat);
    p.writeInt(0);
    p.writeString(text);
    return p;
  }

  static MiniRoomInvite(targetId: number): OutPacket {
    const p = OutPacket.Of(InHeader.MiniRoom);
    p.writeByte(MiniRoomProtocol.MRP_Invite);
    p.writeInt(targetId);
    return p;
  }

  static TradePutItem(index: number, invType: number, position: number, quantity: number): OutPacket {
    const p = OutPacket.Of(InHeader.MiniRoom);
    p.writeByte(MiniRoomProtocol.TRP_PutItem);
    p.writeByte(invType);
    p.writeShort(position);
    p.writeShort(quantity);
    p.writeByte(index);
    return p;
  }

  static TradePutMoney(amount: number): OutPacket {
    const p = OutPacket.Of(InHeader.MiniRoom);
    p.writeByte(MiniRoomProtocol.TRP_PutMoney);
    p.writeInt(amount);
    return p;
  }

  static TradeConfirm(): OutPacket {
    const p = OutPacket.Of(InHeader.MiniRoom);
    p.writeByte(MiniRoomProtocol.TRP_Trade);
    return p;
  }

  static TradeCancel(): OutPacket {
    const p = OutPacket.Of(InHeader.MiniRoom);
    p.writeByte(MiniRoomProtocol.TRP_UnTrade);
    return p;
  }

  static ShopPutItem(invType: number, position: number, setCount: number, setSize: number, price: number): OutPacket {
    const p = OutPacket.Of(InHeader.MiniRoom);
    p.writeByte(MiniRoomProtocol.PSP_PutItem);
    p.writeByte(invType);
    p.writeShort(position);
    p.writeShort(setCount);
    p.writeShort(setSize);
    p.writeInt(price);
    return p;
  }

  static ShopBuyItem(itemIndex: number, count: number): OutPacket {
    const p = OutPacket.Of(InHeader.MiniRoom);
    p.writeByte(MiniRoomProtocol.PSP_BuyItem);
    p.writeByte(itemIndex);
    p.writeShort(count);
    p.writeInt(0); // ItemCRC
    return p;
  }

  static ShopBalloonOpen(open: boolean): OutPacket {
    const p = OutPacket.Of(InHeader.MiniRoom);
    p.writeByte(MiniRoomProtocol.MRP_Balloon);
    p.writeByte(open ? 1 : 0);
    return p;
  }

  // CEntrustedShopDlg::OnButtonClicked (IDA: 0x51e400, owner path) only
  // dispatches 5 button IDs — OnGoOut(0x27), OnArrange(0x28),
  // OnWithdrawMoney(0x2B), OnBlackList, OnVisitList — confirmed via live
  // decompile (Maplestory95.exe.i64). There is no OG button that sends
  // ESP_WithdrawAll(41) at all; it's presumably server-driven. The local
  // protocol/Enums.ts MiniRoomProtocol is a partial duplicate that stops at
  // PSP_AddSoldItem, so these reference the full enum in packet/MiniRoomProtocol.ts.
  static EntrustedShopGoOut(): OutPacket {
    const p = OutPacket.Of(InHeader.MiniRoom);
    p.writeByte(MiniRoomProtocolFull.ESP_GoOut);
    return p;
  }

  static EntrustedShopWithdrawMoney(): OutPacket {
    const p = OutPacket.Of(InHeader.MiniRoom);
    p.writeByte(MiniRoomProtocolFull.ESP_WithdrawMoney);
    return p;
  }

  // CCashShop::SendCheckNameChangePossiblePacket (decompile/488190.c).
  static CheckNameChangePossible(characterId: number, secondaryPassword: string): OutPacket {
    const p = OutPacket.Of(InHeader.CheckNameChangePossible);
    p.writeInt(characterId);
    p.writeString(secondaryPassword);
    return p;
  }

  // CCashShop::SendCheckTransferWorldPossiblePacket (decompile/4884C0.c).
  static CheckTransferWorldPossible(characterId: number, secondaryPassword: string): OutPacket {
    const p = OutPacket.Of(InHeader.CheckTransferWorldPossible);
    p.writeInt(characterId);
    p.writeString(secondaryPassword);
    return p;
  }

  // CWvsContext::SendGatherItemRequest (decompile/9D5B70.c). OG gates this
  // locally (HP>0, 500ms throttle, nType in 1..5) before sending; callers
  // are expected to apply the same throttle. `updateTime` is the client's
  // running tick counter (OG `get_update_time()`).
  static GatherItemRequest(updateTime: number, inventoryType: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserGatherItemRequest);
    p.writeInt(updateTime);
    p.writeByte(inventoryType);
    return p;
  }

  // CWvsContext::SendSortItemRequest (decompile/9D5C60.c) — same shape as
  // GatherItemRequest.
  static SortItemRequest(updateTime: number, inventoryType: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserSortItemRequest);
    p.writeInt(updateTime);
    p.writeByte(inventoryType);
    return p;
  }

  // CUserLocal::SendSkillCancelRequest (decompile/93D730.c). OG remaps 3
  // legacy skill ids to their current equivalents before sending.
  static SkillCancelRequest(skillId: number): OutPacket {
    let id = skillId;
    if (id === 32120000) id = 32001003;
    else if (id === 32110000) id = 32101002;
    else if (id === 32120001) id = 32101003;
    const p = OutPacket.Of(InHeader.UserSkillCancelRequest);
    p.writeInt(id);
    return p;
  }

  // CWvsContext::SendMapTransferRequest (decompile/9F3B90.c). `targetField`
  // is only written when nType===0 (OG: `if (!nType) Encode4(dwTargetField)`).
  static MapTransferRequest(transferType: number, canTransferContinent: boolean, targetField?: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserMapTransferRequest);
    p.writeByte(transferType);
    p.writeByte(canTransferContinent ? 1 : 0);
    if (transferType === 0) p.writeInt(targetField ?? 0);
    return p;
  }

  // CWvsContext::SendAntiMacroItemUseRequest (decompile/9FF270.c) — only the
  // wire-relevant tail (target found, item-use branch) is encoded; the rest
  // of the OG function is local UI/dialog flow with no further packet bytes.
  static AntiMacroItemUseRequest(targetCharacterName: string, pos: number, itemId: number): OutPacket {
    const p = OutPacket.Of(InHeader.SendAntiMacroItemUseRequest);
    p.writeString(targetCharacterName);
    p.writeShort(pos);
    p.writeInt(itemId);
    return p;
  }

  // CUIAntiMacro::SetRet (decompile/78c940.c) — the real captcha-answer
  // submit. Found by re-decompiling SetRet while waterfalling through the
  // "Resolved against the v95 decompile" section's "not yet wired to UI"
  // note: only sent when the player clicked OK (nRet==1); cancel/timeout
  // close the dialog locally with no packet at all.
  static AntiMacroAnswerRequest(answer: string): OutPacket {
    const p = OutPacket.Of(InHeader.AntiMacroAnswerRequest);
    p.writeString(answer);
    return p;
  }

  // CWvsContext::SendSitOnPortableChairRequest (decompile/9DA100.c). The OG
  // signature also takes `nPOS`, but it's dead — never read anywhere in the
  // function body, including the packet encode (only nItemID is sent).
  static PortableChairSitRequest(itemId: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserPortableChairSitRequest);
    p.writeInt(itemId);
    return p;
  }

  // CWvsContext::SendPortalScrollUseRequest (decompile/9FCA70.c).
  // `updateTime` is the client's running tick counter (OG `get_update_time()`).
  static PortalScrollUseRequest(updateTime: number, pos: number, itemId: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserPortalScrollUseRequest);
    p.writeInt(updateTime);
    p.writeShort(pos);
    p.writeInt(itemId);
    return p;
  }

  // CWvsContext::SendEntrustedShopCheckRequest (decompile/9FAB90.c). OG also
  // takes nPOS/nItemID, but those are stashed in local fields
  // (m_nEmployeeItemPos/m_nEmployeeItemID) for a later packet — only the
  // leading constant byte and the cash item serial number go on this wire.
  static EntrustedShopCheckRequest(cashItemSn: bigint): OutPacket {
    const p = OutPacket.Of(InHeader.UserEntrustedShopRequest);
    p.writeByte(0);
    p.writeLong(cashItemSn);
    return p;
  }

  // CFuncKeyMappedMan::SaveFuncKeyMap (decompile/568A60.c). The leading
  // Encode4(0) is sent unconditionally; the count + per-entry
  // (keyIndex:int, FUNCKEY_MAPPED{type:byte, actionId:int}) block is only
  // appended when there are changed slots (matches FuncKeyEntry's shape in
  // FieldHandlers.handleFuncKeyMappedInit).
  static FuncKeyMappedModified(changes: ReadonlyArray<{ keyIndex: number; type: number; actionId: number }>): OutPacket {
    const p = OutPacket.Of(InHeader.FuncKeyMappedModified);
    p.writeInt(0);
    if (changes.length > 0) {
      p.writeInt(changes.length);
      for (const c of changes) {
        p.writeInt(c.keyIndex);
        p.writeByte(c.type);
        p.writeInt(c.actionId);
      }
    }
    return p;
  }

  // CQuickslotKeyMappedMan::SaveQuickslotKeyMap (decompile/6C60A0.c) — fixed
  // 8-slot raw buffer (matches QuickslotKey's shape in
  // FieldHandlers.handleQuickslotMappedInit).
  static QuickslotKeyMappedModified(keys: ReadonlyArray<number>): OutPacket {
    if (keys.length !== 8) throw new Error('QuickslotKeyMappedModified requires exactly 8 keys');
    const p = OutPacket.Of(InHeader.QuickslotKeyMappedModified);
    for (const k of keys) p.writeInt(k);
    return p;
  }

  // CUserLocal::TryRegisterTeleport (decompile/913690.c), sPortalName branch
  // (InHeader=113). Wire: fieldKey:byte, sPortalName:str (the scroll/skill's
  // origin-portal name), current pos x/y:short, then two more shorts read
  // from the target PORTAL struct at byte offsets +12/+16 — those two
  // fields' exact semantic names aren't confirmed from this call site (only
  // that they're 2-byte fields at those offsets), so they're passed through
  // as opaque shorts rather than guessed at.
  static PortalTeleportRequest(fieldKey: number, portalName: string, posX: number, posY: number, portalField12: number, portalField16: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserPortalTeleportRequest);
    p.writeByte(fieldKey);
    p.writeString(portalName);
    p.writeShort(posX);
    p.writeShort(posY);
    p.writeShort(portalField12);
    p.writeShort(portalField16);
    return p;
  }

  // NpcHandler.handleNpcMove (kinoko-main/src/main/java/kinoko/handler/field/NpcHandler.java).
  // `movePath` is only present when the NPC is move-capable (a server-side
  // NPC property the client already knows from its own NPC template data,
  // not something carried on this packet); reuses the existing
  // MovePathEncoder used for UserMove.
  static NpcMoveRequest(
    objectId: number, oneTimeAction: number, chatIndex: number,
    movePath?: { originX: number; originY: number; originVx: number; originVy: number; elements: MoveElement[] },
  ): OutPacket {
    const p = OutPacket.Of(InHeader.NpcMove);
    p.writeInt(objectId);
    p.writeByte(oneTimeAction);
    p.writeByte(chatIndex);
    if (movePath) {
      p.writeBytes(EncodeMovePath(movePath.originX, movePath.originY, movePath.originVx, movePath.originVy, movePath.elements));
    }
    return p;
  }

  // MobHandler.handleMobApplyCtrl (kinoko-main/src/main/java/kinoko/handler/field/MobHandler.java).
  // The second int is read by the server but discarded ("crc?") — exposed
  // here so callers can supply whatever the OG client actually sends, but
  // it's not required to be a meaningful checksum.
  static MobApplyCtrl(objectId: number, crc = 0): OutPacket {
    const p = OutPacket.Of(InHeader.MobApplyCtrl);
    p.writeInt(objectId);
    p.writeInt(crc);
    return p;
  }

  // UserHandler.handleUserSitRequest (kinoko-main/src/main/java/kinoko/handler/user/UserHandler.java).
  // fieldSeatId === -1 means "stand up"; any other value is the chair/seat
  // object id to sit in.
  static UserSitRequest(fieldSeatId: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserSitRequest);
    p.writeShort(fieldSeatId);
    return p;
  }

  // Confirmed against OG ground truth: CUserLocal::DoActiveSkill_Prepare
  // (decompile/941710.c) sends opcode 105 with exactly this shape — int
  // skillId, byte slv, short (oneTimeAction & 0x7FFF | moveAction<<15),
  // byte attack_speed_degree, and (only if skillId==33101005, WildHunter's
  // Jaguar swallow skill) a trailing int swallowMobID. Originally cited
  // only from kinoko-main's SkillHandler.handleUserSkillPrepareRequest;
  // matches byte-for-byte.
  static UserSkillPrepareRequest(skillId: number, slv: number, actionAndDir: number, attackSpeed: number, swallowMobId?: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserSkillPrepareRequest);
    p.writeInt(skillId);
    p.writeByte(slv);
    p.writeShort(actionAndDir);
    p.writeByte(attackSpeed);
    if (swallowMobId !== undefined) p.writeInt(swallowMobId);
    return p;
  }

  // UserHandler.handleUserPortalScriptRequest (kinoko-main/src/main/java/kinoko/handler/user/UserHandler.java).
  static UserPortalScriptRequest(fieldKey: number, portalName: string, posX: number, posY: number): OutPacket {
    const p = OutPacket.Of(InHeader.UserPortalScriptRequest);
    p.writeByte(fieldKey);
    p.writeString(portalName);
    p.writeShort(posX);
    p.writeShort(posY);
    return p;
  }

  // ── Expedition Senders (InHeader.ExpeditionRequest=147) ─────────────────
  // OG: ExpeditionIntermediary — all use opcode 147 with a sub-action byte.

  /** 0x31: Create an expedition for the given quest ID. */
  static ExpeditionCreate(questId: number): OutPacket {
    const p = OutPacket.Of(InHeader.ExpeditionRequest);
    p.writeByte(0x31);
    p.writeInt(questId);
    return p;
  }

  /** 0x32: Invite a character by name to the expedition. */
  static ExpeditionInvite(targetName: string): OutPacket {
    const p = OutPacket.Of(InHeader.ExpeditionRequest);
    p.writeByte(0x32);
    p.writeString(targetName);
    return p;
  }

  /** 0x33: Response to an expedition invite. accept=9, reject=8. */
  static ExpeditionResponseInvite(masterName: string, accepted: boolean): OutPacket {
    const p = OutPacket.Of(InHeader.ExpeditionRequest);
    p.writeByte(0x33);
    p.writeString(masterName);
    p.writeInt(accepted ? 9 : 8);
    return p;
  }

  /** 0x34: Withdraw from the current expedition. */
  static ExpeditionWithdraw(): OutPacket {
    const p = OutPacket.Of(InHeader.ExpeditionRequest);
    p.writeByte(0x34);
    return p;
  }

  /** 0x35: Kick a member from the expedition. */
  static ExpeditionKick(charId: number): OutPacket {
    const p = OutPacket.Of(InHeader.ExpeditionRequest);
    p.writeByte(0x35);
    p.writeInt(charId);
    return p;
  }

  /** 0x36: Change expedition master. */
  static ExpeditionChangeMaster(charId: number): OutPacket {
    const p = OutPacket.Of(InHeader.ExpeditionRequest);
    p.writeByte(0x36);
    p.writeInt(charId);
    return p;
  }

  /** 0x37: Change sub-party boss. */
  static ExpeditionChangeBoss(charId: number): OutPacket {
    const p = OutPacket.Of(InHeader.ExpeditionRequest);
    p.writeByte(0x37);
    p.writeInt(charId);
    return p;
  }

  /** 0x38: Relocate a party member to another sub-party. */
  static ExpeditionRelocateParty(charId: number, toIndex: number): OutPacket {
    const p = OutPacket.Of(InHeader.ExpeditionRequest);
    p.writeByte(0x38);
    p.writeInt(toIndex);
    p.writeInt(charId);
    return p;
  }

  // ── PartyAdver Senders (InHeader.PartyAdverRequest=148) ─────────────────
  // OG: TabPartyAdver — party search / advertisement system.

  /** 0x51: Register a party advertisement with the given quest group ID and title. */
  static PartyAdverRegisterCommit(questId: number, title: string): OutPacket {
    const p = OutPacket.Of(InHeader.PartyAdverRequest);
    p.writeByte(0x51);
    p.writeInt(questId);
    p.writeString(title);
    return p;
  }

  /** 0x53: Request party advertisement listings for the given quest ID. */
  static PartyAdverRequest(questId: number): OutPacket {
    const p = OutPacket.Of(InHeader.PartyAdverRequest);
    p.writeByte(0x53);
    p.writeInt(questId);
    return p;
  }

  /** 0x56: Response to a party/expedition apply request. result: 10=accept, 11=reject, 12=blocked. */
  static PartyAdverApplyResponse(result: number, partyId: number): OutPacket {
    const p = OutPacket.Of(InHeader.PartyAdverRequest);
    p.writeByte(0x56);
    p.writeInt(result);
    p.writeInt(partyId);
    return p;
  }

  // OG: CUIMiniMap::OnMouseButton — client→server 0xA6 with no payload,
  // sent when player clicks their own dot on the minimap.
  static UserMiniMapClick(): OutPacket {
    return OutPacket.Of(InHeader.UserMiniMapClick);
  }
}
