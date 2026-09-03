import { OutPacket } from '../packet/OutPacket.js';
import { InHeader } from '../packet/OpCodes.js';
import { MiniRoomType, MiniRoomProtocol as MiniRoomProtocolFull } from '../packet/MiniRoomProtocol.js';
import { EncodeMovePath } from '../packet/MovePathEncoder.js';
export var ChatGroupType;
(function (ChatGroupType) {
    ChatGroupType[ChatGroupType["Friend"] = 3] = "Friend";
    ChatGroupType[ChatGroupType["Party"] = 2] = "Party";
    ChatGroupType[ChatGroupType["Guild"] = 4] = "Guild";
    ChatGroupType[ChatGroupType["Alliance"] = 5] = "Alliance";
    ChatGroupType[ChatGroupType["Expedition"] = 6] = "Expedition";
})(ChatGroupType || (ChatGroupType = {}));
export class GameSender {
    static AliveAck() {
        return OutPacket.Of(InHeader.AliveAck);
    }
    static UserCharacterInfoRequest(characterId) {
        const p = OutPacket.Of(InHeader.UserCharacterInfoRequest);
        p.writeInt(0);
        p.writeInt(characterId);
        p.writeByte(0);
        return p;
    }
    static ChangeSlotPosition(invType, oldPos, newPos, count) {
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
    static DropItem(invType, slotPos, count) {
        return GameSender.ChangeSlotPosition(invType, slotPos, 0, count);
    }
    // OG: CUIItem shift+click split — move `count` items from `fromSlot` to
    // `toSlot` within the same inventory type. `toSlot` must be empty.
    static ItemSplit(invType, fromSlot, toSlot, count) {
        return GameSender.ChangeSlotPosition(invType, fromSlot, toSlot, count);
    }
    static UseItem(pos, itemId) {
        const p = OutPacket.Of(InHeader.UserStatChangeItemUseRequest);
        p.writeInt(0);
        p.writeShort(pos);
        p.writeInt(itemId);
        return p;
    }
    // OG: CWvsContext::SendMobSummonItemUseRequest (IDA 0x9DE580) —
    // opcode 81, int(updateTime), short(nPOS), int(nItemID).
    static MobSummonItemUseRequest(pos, itemId) {
        const p = OutPacket.Of(InHeader.UserMobSummonItemUseRequest);
        p.writeInt(Date.now());
        p.writeShort(pos);
        p.writeInt(itemId);
        return p;
    }
    // OG: CWvsContext::SendPetFoodItemUseRequest (IDA 0x9D9F20) —
    // opcode 82, int(updateTime), short(nPOS), int(nItemID).
    static PetFoodItemUseRequest(pos, itemId) {
        const p = OutPacket.Of(InHeader.UserPetFoodItemUseRequest);
        p.writeInt(Date.now());
        p.writeShort(pos);
        p.writeInt(itemId);
        return p;
    }
    // OG: CWvsContext::SendTamingMobFoodItemUseRequest (IDA 0x9D63A0) —
    // opcode 83, int(updateTime), short(nPOS), int(nItemID).
    static TamingMobFoodItemUseRequest(pos, itemId) {
        const p = OutPacket.Of(InHeader.UserTamingMobFoodItemUseRequest);
        p.writeInt(Date.now());
        p.writeShort(pos);
        p.writeInt(itemId);
        return p;
    }
    // OG: CWvsContext::SendScriptRunItemRequest (IDA 0x9DE7A0) —
    // opcode 84, int(updateTime), short(nPOS), int(nItemID).
    static ScriptRunItemUseRequest(pos, itemId) {
        const p = OutPacket.Of(InHeader.UserScriptRunItemUseRequest);
        p.writeInt(Date.now());
        p.writeShort(pos);
        p.writeInt(itemId);
        return p;
    }
    // OG: CWvsContext::SendBridleItemUseRequest (IDA 0x9E08C0) —
    // opcode 87, int4(updateTime), short2(nPOS), int4(nItemID), int4(mobTemplateId).
    // mobTemplateId = apMob->field_170 (mob CRC/template from _ZtlSecureFuse).
    static BridleItemUseRequest(pos, itemId, mobTemplateId) {
        const p = OutPacket.Of(InHeader.UserBridleItemUseRequest);
        p.writeInt(Date.now());
        p.writeShort(pos);
        p.writeInt(itemId);
        p.writeInt(mobTemplateId);
        return p;
    }
    // OG: CWvsContext::SendShopScannerItemUseRequest (IDA 0x9E10E0) —
    // opcode 90, short(nPOS), int(nItemID).
    static ShopScannerItemUseRequest(pos, itemId) {
        const p = OutPacket.Of(InHeader.UserShopScannerItemUseRequest);
        p.writeShort(pos);
        p.writeInt(itemId);
        return p;
    }
    // OG: CWvsContext::SendMapTransferItemUseRequest (IDA 0x9E6020) —
    // opcode 91, short(nPOS), int(nItemID), RunMapTransferItem(packet, 0):
    //   byte(0) + string(mapName) + int4(mapId), then int4(updateTime).
    static MapTransferItemUseRequest(pos, itemId, mapName, mapId) {
        const p = OutPacket.Of(InHeader.UserMapTransferItemUseRequest);
        p.writeShort(pos);
        p.writeInt(itemId);
        p.writeByte(0);
        p.writeString(mapName);
        p.writeInt(mapId);
        p.writeInt(Date.now());
        return p;
    }
    // OG: CWvsContext::SendSelectNpcItemUseRequest (IDA 0x9DA430) —
    // opcode 123, short(nPOS), int(nItemID).
    static SelectNpcItemUseRequest(pos, itemId) {
        const p = OutPacket.Of(InHeader.UserSelectNpcItemUseRequest);
        p.writeShort(pos);
        p.writeInt(itemId);
        return p;
    }
    // OG: CWvsContext::SendLotteryItemUseRequest (IDA 0x9D6C50) —
    // opcode 124, short(nPos), int(nItemID).
    static LotteryItemUseRequest(pos, itemId) {
        const p = OutPacket.Of(InHeader.UserLotteryItemUseRequest);
        p.writeShort(pos);
        p.writeInt(itemId);
        return p;
    }
    // OG: CWvsContext::SendExpUpItemUseRequest (IDA 0x9DB1C0) —
    // opcode 181, int(updateTime), short(nPOS), int(nItemID).
    static ExpUpItemUseRequest(pos, itemId) {
        const p = OutPacket.Of(InHeader.UserExpUpItemUseRequest);
        p.writeInt(Date.now());
        p.writeShort(pos);
        p.writeInt(itemId);
        return p;
    }
    // OG: CWvsContext::SendConsumeCashItemUseRequest (opcode 85) —
    // simple consume form: int4(updateTime), short2(nPOS), int4(nItemID).
    // Used for cash pet food (category 524) and other simple cash consumes.
    static ConsumeCashItemUseRequest(pos, itemId) {
        const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
        p.writeInt(0);
        p.writeShort(pos);
        p.writeInt(itemId);
        return p;
    }
    // OG: CWvsContext::SendActiveEffectItemChange (IDA 0x9F9420) —
    // opcode 57, int(nItemID). Toggles a cosmetic effect item.
    static ActiveEffectItemChange(itemId) {
        const p = OutPacket.Of(InHeader.UserActiveEffectItemChange);
        p.writeInt(itemId);
        return p;
    }
    // OG: CWvsContext::SendDragonBallBoxRequest (IDA 0x9D73D0) —
    // opcode 196, no payload.
    static DragonBallBoxRequest() {
        return OutPacket.Of(InHeader.UserDragonBallBoxRequest);
    }
    // OG: CWvsContext::SendSkillLearnItemUseRequest (decompile/9d65e0.c) —
    // dedicated opcode for skill books/mastery books, NOT the generic
    // UseItem/UserStatChangeItemUseRequest path. OG also gates this behind
    // `itemId/10000==228 || is_masterybook_item(itemId)`; the mastery-book
    // id list isn't exposed by this dump, so only the 228xxxx category check
    // is applied at the call site (GameStage.ts) — mastery books would still
    // incorrectly fall through to UseItem.
    static SkillLearnItemUseRequest(pos, itemId) {
        const p = OutPacket.Of(InHeader.SkillLearnItemUseRequest);
        p.writeInt(0);
        p.writeShort(pos);
        p.writeInt(itemId);
        return p;
    }
    // OG: CWvsContext::SendSkillResetItemUseRequest (decompile/9de8c0.c) —
    // dedicated opcode for skill-reset scrolls (itemId/10000==250). Same wire
    // shape as SkillLearnItemUseRequest.
    static SkillResetItemUseRequest(pos, itemId) {
        const p = OutPacket.Of(InHeader.SkillResetItemUseRequest);
        p.writeInt(0);
        p.writeShort(pos);
        p.writeInt(itemId);
        return p;
    }
    // OG: CWvsContext::SendStatChangeItemCancelRequest (v95 IDA dump).
    static StatChangeItemCancel(itemId) {
        const p = OutPacket.Of(InHeader.UserStatChangeItemCancelRequest);
        p.writeInt(itemId);
        return p;
    }
    // OG: CWvsContext::SendStatChangeRequest (v95 IDA dump, encode_layout
    // int(4) int(4) short(2) short(2) byte(1)).
    static StatChangeRequest(a, b, c, d, e) {
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
    static StatChangeRequestByItemOption(a, b, c, d) {
        const p = OutPacket.Of(InHeader.UserStatChangeRequestByItemOption);
        p.writeInt(a);
        p.writeInt(b);
        p.writeShort(c);
        p.writeShort(d);
        return p;
    }
    // OG: CWvsContext::SendUseBoxGachaponItemRequest (v95 IDA dump, encode_layout
    // short(2) int(4)).
    static UseBoxGachaponItem(pos, itemId) {
        const p = OutPacket.Of(InHeader.UserUseBoxGachaponItemRequest);
        p.writeShort(pos);
        p.writeInt(itemId);
        return p;
    }
    // OG: CWvsContext::SendUseGachaponRemoteRequest (v95 IDA dump, encode_layout
    // int(4) int(4)).
    static UseGachaponRemote(npcId, value) {
        const p = OutPacket.Of(InHeader.UserUseGachaponRemoteRequest);
        p.writeInt(npcId);
        p.writeInt(value);
        return p;
    }
    // OG: CUIRaiseWnd::SendPutItem / CUIRaisePieceWnd::SendPutItem (v95 IDA
    // dump, encode_layout byte(1) short(2) int(4)) — pet-evolution minigame.
    static RaiseWndPutItem(itemTI, pos, itemId) {
        const p = OutPacket.Of(InHeader.UserRaiseWndPutItem);
        p.writeByte(itemTI);
        p.writeShort(pos);
        p.writeInt(itemId);
        return p;
    }
    static RaisePieceWndPutItem(itemTI, pos, itemId) {
        const p = OutPacket.Of(InHeader.UserRaisePieceWndPutItem);
        p.writeByte(itemTI);
        p.writeShort(pos);
        p.writeInt(itemId);
        return p;
    }
    // OG: CUIFindFriend::SendMyInfoRequest/SendSearchRequest (v95 IDA dump) —
    // confirmed via disassembly to be Encode1(0)/Encode1(1) on the same opcode.
    static FindFriendMyInfoRequest() {
        const p = OutPacket.Of(InHeader.UserFindFriendRequest);
        p.writeByte(0);
        return p;
    }
    static FindFriendSearchRequest() {
        const p = OutPacket.Of(InHeader.UserFindFriendRequest);
        p.writeByte(1);
        return p;
    }
    static DropMoney(amount) {
        const p = OutPacket.Of(InHeader.UserDropMoneyRequest);
        p.writeInt(0);
        p.writeInt(amount);
        return p;
    }
    // OG: CWvsContext::SendItemReleaseRequest(nUPOS, nEPOS) — sends the
    // release-scroll use-slot and equip-slot to the server.
    // IDA 0x9D5F73: int4(updateTime) + short2(nUPOS) + short2(nEPOS)
    static ItemReleaseRequest(useSlot, equipSlot) {
        const p = OutPacket.Of(InHeader.UserItemReleaseRequest);
        p.writeInt(0);
        p.writeShort(useSlot);
        p.writeShort(equipSlot);
        return p;
    }
    static PickUpDrop(fieldKey, x, y, dropId) {
        const p = OutPacket.Of(InHeader.DropPickUpRequest);
        p.writeByte(fieldKey);
        p.writeInt(0);
        p.writeShort(x);
        p.writeShort(y);
        p.writeInt(dropId);
        p.writeInt(0);
        return p;
    }
    static SkillUp(skillId) {
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
    static UseSkill(skillId, slv, updateTime) {
        const p = OutPacket.Of(InHeader.UserSkillUseRequest);
        p.writeInt(updateTime);
        p.writeInt(skillId);
        p.writeByte(slv);
        p.writeShort(0);
        return p;
    }
    static SkillMacroFlushToSvr(macros) {
        const p = OutPacket.Of(InHeader.SkillMacroFlushToSvr);
        const rows = new Array(5).fill(null);
        for (const macro of macros) {
            if (macro.slot < 0 || macro.slot >= rows.length)
                continue;
            rows[macro.slot] = macro;
        }
        let count = rows.length;
        while (count > 0 && rows[count - 1] === null)
            count--;
        p.writeByte(count);
        for (let i = 0; i < count; i++) {
            const macro = rows[i];
            p.writeString((macro?.name ?? '').slice(0, 12));
            p.writeByte(macro?.mute ? 1 : 0);
            for (let j = 0; j < 3; j++)
                p.writeInt(macro?.skills[j] ?? 0);
        }
        return p;
    }
    static ClaimRequest(args) {
        const p = OutPacket.Of(InHeader.ClaimRequest);
        p.writeByte(args.chatClaim ? 1 : 0);
        p.writeString(args.targetCharacterName);
        p.writeByte(args.claimType);
        p.writeString(args.context);
        if (args.chatClaim)
            p.writeString(args.chatLog ?? '');
        return p;
    }
    static UserChat(message, shout = false) {
        const p = OutPacket.Of(InHeader.UserChat);
        p.writeInt(0);
        p.writeString(message);
        p.writeByte(shout ? 1 : 0);
        return p;
    }
    static UserEmotion(emotion, duration = -1, byItemOption = false) {
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
    static UserAbilityUp(stat) {
        const p = OutPacket.Of(InHeader.UserAbilityUpRequest);
        p.writeInt(0);
        p.writeInt(stat);
        return p;
    }
    /**
     * Allocate multiple APs at once. Each entry is `[mapleStat, count]`.
     * Per the C++ UserAbilityMassUpRequest decoder, the wire is just a flat
     * list of int pairs with no per-entry opcode byte.
     */
    static UserAbilityMassUp(entries) {
        const p = OutPacket.Of(InHeader.UserAbilityMassUpRequest);
        p.writeInt(0);
        p.writeInt(entries.length);
        for (const [flag, value] of entries) {
            p.writeInt(flag);
            p.writeInt(value);
        }
        return p;
    }
    static TransferChannel(channelId) {
        const p = OutPacket.Of(InHeader.UserTransferChannelRequest);
        p.writeByte(channelId);
        p.writeInt(0);
        return p;
    }
    static TransferField(fieldKey, targetMap, portal, x, y) {
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
    static Revive(fieldKey, premium) {
        const p = OutPacket.Of(InHeader.UserTransferFieldRequest);
        p.writeByte(fieldKey);
        p.writeInt(0);
        p.writeString('');
        p.writeByte(0);
        p.writeByte(premium ? 1 : 0);
        p.writeByte(0);
        return p;
    }
    static MigrateToCashShop() {
        const p = OutPacket.Of(InHeader.UserMigrateToCashShopRequest);
        p.writeInt(0);
        return p;
    }
    static ReturnFromCashShop() {
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
    static UserMove(fieldKey, movePathBlob) {
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
    static MobMove(mobId, mobCtrlSn, action, left, movePathBlob, chasing = false, targetInfo = 0, multiTargetForBall = [], randTimeForAreaAttack = []) {
        const p = OutPacket.Of(InHeader.MobMove);
        p.writeInt(mobId);
        p.writeShort(mobCtrlSn);
        p.writeByte(0); // actionMask
        p.writeByte((action << 1) | (left ? 1 : 0)); // actionAndDir
        // Server expects these fields BEFORE MovePath
        p.writeInt(targetInfo);
        p.writeInt(multiTargetForBall.length);
        for (const [x, y] of multiTargetForBall) {
            p.writeInt(x);
            p.writeInt(y);
        }
        p.writeInt(randTimeForAreaAttack.length);
        for (const t of randTimeForAreaAttack) {
            p.writeInt(t);
        }
        p.writeByte(0); // bActive
        p.writeInt(0); // HackedCode
        p.writeInt(0); // ptTarget.x
        p.writeInt(0); // ptTarget.y
        p.writeInt(0); // dwHackedCodeCRC
        // Now the MovePath blob
        p.writeBytes(movePathBlob);
        // Chasing fields
        p.writeByte(chasing ? 1 : 0); // bChasing
        p.writeByte(0); // pTarget != 0
        p.writeByte(0); // pvcActive->bChasing
        p.writeByte(0); // pvcActive->bChasingHack
        p.writeInt(0); // pvcActive->tChaseDuration
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
    static UserHit(attackIndex, magicElemAttr, damage, templateId, mobId, dir, knockback = 1, userX = 0, userY = 0, hitX = 0, hitY = 0) {
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
    static ShopBuy(shopSlot, itemId, count, price) {
        const p = OutPacket.Of(InHeader.UserShopRequest);
        p.writeByte(0 /* ShopRequestAction.Buy */);
        p.writeShort(shopSlot);
        p.writeInt(itemId);
        p.writeShort(count);
        p.writeInt(price);
        return p;
    }
    static ShopSell(pos, itemId, count) {
        const p = OutPacket.Of(InHeader.UserShopRequest);
        p.writeByte(1 /* ShopRequestAction.Sell */);
        p.writeShort(pos);
        p.writeInt(itemId);
        p.writeShort(count);
        return p;
    }
    static ShopRecharge(pos) {
        const p = OutPacket.Of(InHeader.UserShopRequest);
        p.writeByte(2 /* ShopRequestAction.Recharge */);
        p.writeShort(pos);
        return p;
    }
    static ShopClose() {
        const p = OutPacket.Of(InHeader.UserShopRequest);
        p.writeByte(3 /* ShopRequestAction.Close */);
        return p;
    }
    // OG: CAdminShopDlg::OnPacket (decompile/4310f0.c) — both sub-actions of the
    // client's reply share opcode 74 (UserAdminShopRequest), distinguished by
    // the first byte: 2 = open with no existing dialog instance.
    static AdminShopRequest() {
        const p = OutPacket.Of(InHeader.UserAdminShopRequest);
        p.writeByte(2);
        return p;
    }
    // OG: same dispatcher, bReOpenDlg branch — 0 = reopen after a result action,
    // re-sending the npc template id the dialog was opened with.
    static AdminShopReopen(npcTemplateId) {
        const p = OutPacket.Of(InHeader.UserAdminShopRequest);
        p.writeByte(0);
        p.writeInt(npcTemplateId);
        return p;
    }
    // OG: CWvsContext::SendFamilyChartRequest (decompile/a09d20.c)
    static FamilyChartRequest(characterName) {
        const p = OutPacket.Of(InHeader.UserFamilyChartRequest);
        p.writeString(characterName);
        return p;
    }
    // OG: CWvsContext::SendFamilyInfoRequest (decompile/a09860.c) — empty body.
    static FamilyInfoRequest() {
        return OutPacket.Of(InHeader.UserFamilyInfoRequest);
    }
    // OG: CWvsContext::SendFamilyInviteResult (decompile/a09c50.c)
    static FamilyInviteResult(inviterId, inviterName, accepted) {
        const p = OutPacket.Of(InHeader.UserFamilyInviteResult);
        p.writeInt(inviterId);
        p.writeString(inviterName);
        p.writeByte(accepted ? 1 : 0);
        return p;
    }
    // OG: CWvsContext::OnMarriageRequest (decompile/a00bb0.c) — built inline
    // right after the local YesNo dialog, not a separate Send* method: byte
    // (2), byte(accepted), string(requesterName), int(partnerId).
    static MarriageRequestResponse(requesterName, partnerId, accepted) {
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
    static MarriageRequest(targetCharacterName, ringItemId) {
        const p = OutPacket.Of(InHeader.MarriageRequestResponse);
        p.writeByte(0);
        p.writeString(targetCharacterName);
        p.writeInt(ringItemId);
        return p;
    }
    // OG: CWvsContext::OnFamilySummonRequest (decompile/a0b0a0.c) — the YesNo
    // response is sent inline from the same function, not a separate sender.
    static FamilySummonResponse(accepted) {
        const p = OutPacket.Of(InHeader.UserFamilySummonResponse);
        p.writeByte(accepted ? 1 : 0);
        return p;
    }
    // OG: CWvsContext::SendUseFamilyPrivilege — index-only body. See
    // UserUseFamilyPrivilege's OpCodes.ts comment for the SP_Summon/SP_Jump
    // target-name sub-case this deliberately doesn't port.
    static UseFamilyPrivilege(privilegeIndex) {
        const p = OutPacket.Of(InHeader.UserUseFamilyPrivilege);
        p.writeInt(privilegeIndex);
        return p;
    }
    // OG: CWvsContext::SendSetFamilyPrecept.
    static SetFamilyPrecept(precept) {
        const p = OutPacket.Of(InHeader.UserSetFamilyPrecept);
        p.writeString(precept);
        return p;
    }
    // OG: CUIGuildBBS::OnRegister (decompile/7c4250.c) — sub-action 0. Posts a
    // new entry, or edits one when `modifyEntryId` is given.
    static GuildBBSRegister(title, text, emoticonId, isNotice, modifyEntryId) {
        const p = OutPacket.Of(InHeader.UserGuildBBSRequest);
        p.writeByte(0);
        p.writeByte(modifyEntryId !== undefined ? 1 : 0);
        if (modifyEntryId !== undefined)
            p.writeInt(modifyEntryId);
        p.writeByte(isNotice ? 1 : 0);
        p.writeString(title);
        p.writeString(text);
        p.writeInt(emoticonId);
        return p;
    }
    // OG: CUIGuildBBS::OnDelete (decompile/7c6520.c) — sub-action 1.
    static GuildBBSDeleteEntry(entryId) {
        const p = OutPacket.Of(InHeader.UserGuildBBSRequest);
        p.writeByte(1);
        p.writeInt(entryId);
        return p;
    }
    // OG: CUIGuildBBS::SendLoadListRequest (decompile/7c3680.c) — sub-action 2.
    static GuildBBSLoadList(startIndex) {
        const p = OutPacket.Of(InHeader.UserGuildBBSRequest);
        p.writeByte(2);
        p.writeInt(startIndex);
        return p;
    }
    // OG: CUIGuildBBS::SendViewEntryRequest (decompile/7c3710.c) — sub-action 3.
    static GuildBBSViewEntry(entryId) {
        const p = OutPacket.Of(InHeader.UserGuildBBSRequest);
        p.writeByte(3);
        p.writeInt(entryId);
        return p;
    }
    // OG: CUIGuildBBS::OnComment (decompile/7c4530.c) — sub-action 4.
    static GuildBBSComment(entryId, comment) {
        const p = OutPacket.Of(InHeader.UserGuildBBSRequest);
        p.writeByte(4);
        p.writeInt(entryId);
        p.writeString(comment);
        return p;
    }
    // OG: CUIGuildBBS::OnCommentDelete (decompile/7c3b70.c) — sub-action 5.
    static GuildBBSCommentDelete(entryId, commentSn) {
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
    static CashShopSendGift(spw, commoditySN, requestBuyOneADay, recipientName, giftMessage) {
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
    static WeddingWishListPutItem(pos, itemId, count) {
        const p = OutPacket.Of(InHeader.UserWeddingWishListRequest);
        p.writeByte(6);
        p.writeShort(pos);
        p.writeInt(itemId);
        p.writeShort(count);
        return p;
    }
    // OG: CWishListRecvDlg::SendGetItemRequest (decompile/9aba50.c) — sub
    // action 7. Requests one of the partner's offered wishlist items.
    static WeddingWishListGetItem(tab, idx) {
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
    static ItemUpgradeApply(scrollPos, scrollItemId, targetItemTI, targetSlotPos, ts1, ts2) {
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
    static ItemProtectorApply(scrollPos, scrollItemId, targetItemTI, targetSlotPos, ts1, ts2) {
        return GameSender.ItemUpgradeApply(scrollPos, scrollItemId, targetItemTI, targetSlotPos, ts1, ts2);
    }
    // OG: CUIKarmaDlg::_SendConsumeCashItemUseRequest (v95 IDA dump,
    // func_encode_seq for 0x7d7ef0: int(4) short(2) int(4) int(4) int(4)).
    // Unlike ItemUpgrade/ItemProtector, Karma builds the whole packet in one
    // shot at confirm time (its ctor only takes plain ints, not a COutPacket)
    // — one timestamp, not two.
    static KarmaApply(scrollPos, scrollItemId, targetItemTI, targetSlotPos, ts) {
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
    static MegaphoneCompose(invPos, itemId, message, isWhisper, targetTI = 0, targetPOS = 0) {
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
    static VegaApply(cashPos, cashItemId, equipItemTI, equipSlotPos, scrollItemTI, scrollSlotPos, whiteScrollUse) {
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
    // OG: CUIStatChangeItemDlg / CUISkillResetDlg — AP/SP reset via cash item.
    // Wire shape: int(itemId) int(timestamp). The server decodes the cash-item
    // type from the item ID prefix to determine AP vs SP reset.
    static SkillResetRequest(itemId) {
        const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
        p.writeInt(itemId);
        p.writeInt(Date.now());
        return p;
    }
    // OG: CUIPetRenameDlg — rename a pet via cash item.
    // Wire shape: int(itemId) int(petId) string(newName).
    static PetRename(itemId, petId, newName) {
        const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
        p.writeInt(itemId);
        p.writeInt(petId);
        p.writeString(newName);
        return p;
    }
    // OG: CUINameChangeDlg — character name change via cash item.
    // Wire shape: int(itemId) string(newName).
    static NameChange(itemId, newName) {
        const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
        p.writeInt(itemId);
        p.writeString(newName);
        return p;
    }
    // OG: CUIMapTransferDlg — teleport to a map via cash item.
    // Wire shape: int(itemId) int(mapId).
    static MapTransfer(itemId, mapId) {
        const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
        p.writeInt(itemId);
        p.writeInt(mapId);
        return p;
    }
    // OG: CUIMegaphoneDlg (avatar variant) — send an avatar megaphone.
    // Wire shape: int(itemId) string(message).
    static AvatarMegaphone(itemId, message) {
        const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
        p.writeInt(itemId);
        p.writeString(message);
        return p;
    }
    // OG: CUIWorldSpeakerDlg — world-wide speaker message.
    // Wire shape: int(itemId) string(message).
    static WorldSpeaker(itemId, message) {
        const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
        p.writeInt(itemId);
        p.writeString(message);
        return p;
    }
    // OG: CUIMapleTVDlg — send a Maple TV message.
    // Wire shape: int(itemId) string(recipientName) string(message).
    static MapleTV(itemId, recipientName, message) {
        const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
        p.writeInt(itemId);
        p.writeString(recipientName);
        p.writeString(message);
        return p;
    }
    // OG: CUIShopScannerDlg — use a shop scanner to find items.
    // Wire shape: int(itemId).
    static ShopScanner(itemId) {
        const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
        p.writeInt(itemId);
        return p;
    }
    // OG: CPersonalShopDlg — set the shop name via cash item.
    // Wire shape: int(itemId) string(shopName).
    static PersonalShopName(itemId, shopName) {
        const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
        p.writeInt(itemId);
        p.writeString(shopName);
        return p;
    }
    // OG: CUIIncubatorDlg — use an incubator on equipment.
    // Wire shape: int(itemId).
    static Incubator(itemId) {
        const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
        p.writeInt(itemId);
        return p;
    }
    // OG: Chat donation via cash item (e.g. donation effect).
    // Wire shape: int(itemId).
    static ChatDonation(itemId) {
        const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
        p.writeInt(itemId);
        return p;
    }
    // OG: Weather effect via cash item.
    // Wire shape: int(itemId).
    static WeatherEffect(itemId) {
        const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
        p.writeInt(itemId);
        return p;
    }
    // OG: Couple ring — propose/accept a couple ring via cash item.
    // Wire shape: int(itemId) string(partnerName).
    static CoupleRing(itemId, partnerName) {
        const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
        p.writeInt(itemId);
        p.writeString(partnerName);
        return p;
    }
    // OG: Friendship ring — propose/accept a friendship ring via cash item.
    // Wire shape: int(itemId) string(friendName).
    static FriendshipRing(itemId, friendName) {
        const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
        p.writeInt(itemId);
        p.writeString(friendName);
        return p;
    }
    // OG: Guild emblem — set/change guild emblem via cash item.
    // Wire shape: int(itemId).
    static GuildEmblem(itemId) {
        const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
        p.writeInt(itemId);
        return p;
    }
    // OG: Merchant name tag — set the merchant name tag via cash item.
    // Wire shape: int(itemId) string(nameTag).
    static MerchantNameTag(itemId, nameTag) {
        const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
        p.writeInt(itemId);
        p.writeString(nameTag);
        return p;
    }
    // OG: Package delivery — send a package via cash item.
    // Wire shape: int(itemId).
    static PackageDeliver(itemId) {
        const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
        p.writeInt(itemId);
        return p;
    }
    // OG: Quest helper — use a quest helper cash item.
    // Wire shape: int(itemId).
    static QuestHelper(itemId) {
        const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
        p.writeInt(itemId);
        return p;
    }
    // OG: SP reset — reset skill points via cash item.
    // Wire shape: int(itemId).
    static SpReset(itemId) {
        const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
        p.writeInt(itemId);
        return p;
    }
    // OG: AP reset — reset ability points via cash item.
    // Wire shape: int(itemId).
    static APReset(itemId) {
        const p = OutPacket.Of(InHeader.UserConsumeCashItemUseRequest);
        p.writeInt(itemId);
        return p;
    }
    // OG: CStoreBankDlg::SendGetAllRequest (decompile/7449f0.c) — fired only
    // when the player accepts the get-all-fee confirm dialog (CUtilDlg::YesNo
    // returning the Yes button id); declining sends nothing.
    static StoreBankGetAllConfirm() {
        const p = OutPacket.Of(InHeader.UserStoreBankRequest);
        p.writeByte(0x1B);
        return p;
    }
    // OG: CRepairDurabilityDlg::SendRepairDurabilityAll (decompile/6d37b0.c) —
    // no payload, fired from OnButtonClicked's 0x3E8 case.
    static RepairDurabilityAll() {
        return OutPacket.Of(InHeader.RepairDurabilityAll);
    }
    // OG: CRepairDurabilityDlg::SendRepairDurability (decompile/6d3980.c) —
    // sends the selected item's nPOS, fired from OnButtonClicked's 0x3E9 case.
    static RepairDurability(pos) {
        const p = OutPacket.Of(InHeader.RepairDurability);
        p.writeInt(pos);
        return p;
    }
    // OG: CUICharacterSaleDlg::SendCheckDuplicateIDPacket (decompile/777d20.c)
    static CharacterSaleCheckId(name) {
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
    static CharacterSaleCreate(pos, itemId, name, abilityLevels, gender, currentClass, sp, timestamp) {
        const p = OutPacket.Of(InHeader.UserCharacterSaleCreate);
        p.writeInt(timestamp);
        p.writeShort(pos);
        p.writeInt(itemId);
        p.writeString(name);
        for (const al of abilityLevels)
            p.writeInt(al);
        p.writeInt(gender);
        p.writeInt(currentClass);
        p.writeInt(sp);
        p.writeInt(timestamp);
        return p;
    }
    static TrunkWithdraw(invType, position) {
        const p = OutPacket.Of(InHeader.UserTrunkRequest);
        p.writeByte(4 /* TrunkRequestAction.Withdraw */);
        p.writeByte(invType);
        p.writeByte(position);
        return p;
    }
    static TrunkDeposit(inventoryPos, itemId, quantity) {
        const p = OutPacket.Of(InHeader.UserTrunkRequest);
        p.writeByte(5 /* TrunkRequestAction.Deposit */);
        p.writeShort(inventoryPos);
        p.writeInt(itemId);
        p.writeShort(quantity);
        return p;
    }
    static TrunkSort() {
        const p = OutPacket.Of(InHeader.UserTrunkRequest);
        p.writeByte(6 /* TrunkRequestAction.Sort */);
        return p;
    }
    static TrunkWithdrawMoney(amount) {
        const p = OutPacket.Of(InHeader.UserTrunkRequest);
        p.writeByte(7 /* TrunkRequestAction.WithdrawMoney */);
        p.writeInt(amount);
        return p;
    }
    static TrunkDepositMoney(amount) {
        const p = OutPacket.Of(InHeader.UserTrunkRequest);
        p.writeByte(7 /* TrunkRequestAction.DepositMoney */);
        p.writeInt(-amount);
        return p;
    }
    static TrunkClose() {
        const p = OutPacket.Of(InHeader.UserTrunkRequest);
        p.writeByte(8 /* TrunkRequestAction.Close */);
        return p;
    }
    static MessengerEnter(messengerId) {
        const p = OutPacket.Of(InHeader.Messenger);
        p.writeByte(0 /* MessengerRequestAction.Enter */);
        p.writeInt(messengerId);
        return p;
    }
    static MessengerLeave() {
        const p = OutPacket.Of(InHeader.Messenger);
        p.writeByte(2 /* MessengerRequestAction.Leave */);
        return p;
    }
    static MessengerInvite(targetName) {
        const p = OutPacket.Of(InHeader.Messenger);
        p.writeByte(3 /* MessengerRequestAction.Invite */);
        p.writeString(targetName);
        return p;
    }
    static MessengerChat(text) {
        const p = OutPacket.Of(InHeader.Messenger);
        p.writeByte(6 /* MessengerRequestAction.Chat */);
        p.writeString(text);
        return p;
    }
    static QuestAccept(questId, npcId, x, y) {
        const p = OutPacket.Of(InHeader.UserQuestRequest);
        p.writeByte(1 /* QuestRequestAction.Accept */);
        p.writeShort(questId);
        p.writeInt(npcId);
        p.writeInt(0);
        p.writeShort(x);
        p.writeShort(y);
        return p;
    }
    static QuestComplete(questId, npcId, x, y, rewardIndex = 0) {
        const p = OutPacket.Of(InHeader.UserQuestRequest);
        p.writeByte(2 /* QuestRequestAction.Complete */);
        p.writeShort(questId);
        p.writeInt(npcId);
        p.writeInt(0);
        p.writeShort(x);
        p.writeShort(y);
        p.writeInt(rewardIndex);
        return p;
    }
    static QuestResign(questId) {
        const p = OutPacket.Of(InHeader.UserQuestRequest);
        p.writeByte(3 /* QuestRequestAction.Resign */);
        p.writeShort(questId);
        return p;
    }
    static QuestStartScript(questId, npcTemplateId, x, y) {
        const p = OutPacket.Of(InHeader.UserQuestRequest);
        p.writeByte(4 /* QuestRequestAction.StartScript */);
        p.writeShort(questId);
        p.writeInt(npcTemplateId);
        p.writeShort(x);
        p.writeShort(y);
        return p;
    }
    static QuestCompleteScript(questId, npcTemplateId, x, y) {
        const p = OutPacket.Of(InHeader.UserQuestRequest);
        p.writeByte(5 /* QuestRequestAction.CompleteScript */);
        p.writeShort(questId);
        p.writeInt(npcTemplateId);
        p.writeShort(x);
        p.writeShort(y);
        return p;
    }
    /** QuestRequestAction.OpenQuest = 6. Opens the quest UI to view progress. */
    static QuestOpen(questId) {
        const p = OutPacket.Of(InHeader.UserQuestRequest);
        p.writeByte(6 /* QuestRequestAction.OpenQuest */);
        p.writeShort(questId);
        return p;
    }
    /** QuestRequestAction.LostItem = 7. Returns a lost quest item to its owner. */
    static QuestLostItem(questId, itemId) {
        const p = OutPacket.Of(InHeader.UserQuestRequest);
        p.writeByte(7 /* QuestRequestAction.LostItem */);
        p.writeShort(questId);
        p.writeInt(itemId);
        return p;
    }
    /** QuestRequestAction.CompleteNpcScript = 8. Completes a quest started via NPC script. */
    static QuestCompleteNpcScript(questId, npcTemplateId) {
        const p = OutPacket.Of(InHeader.UserQuestRequest);
        p.writeByte(8 /* QuestRequestAction.CompleteNpcScript */);
        p.writeShort(questId);
        p.writeInt(npcTemplateId);
        return p;
    }
    static GuildLoad() {
        const p = OutPacket.Of(InHeader.GuildRequest);
        p.writeByte(0 /* GuildRequestAction.Load */);
        return p;
    }
    static GuildLeave(characterId, characterName) {
        const p = OutPacket.Of(InHeader.GuildRequest);
        p.writeByte(7 /* GuildRequestAction.Leave */);
        p.writeInt(characterId);
        p.writeString(characterName);
        return p;
    }
    /** GuildRequestAction.Create = 1. Creates a new guild. */
    static GuildCreate(name) {
        const p = OutPacket.Of(InHeader.GuildRequest);
        p.writeByte(1 /* GuildRequestAction.Create */);
        p.writeString(name);
        return p;
    }
    /** GuildRequestAction.Join = 2. Joins an existing guild. */
    static GuildJoin(characterId, characterName) {
        const p = OutPacket.Of(InHeader.GuildRequest);
        p.writeByte(2 /* GuildRequestAction.Join */);
        p.writeInt(characterId);
        p.writeString(characterName);
        return p;
    }
    /** GuildRequestAction.Withdraw = 3. Withdraws a pending application. */
    static GuildWithdraw(characterId) {
        const p = OutPacket.Of(InHeader.GuildRequest);
        p.writeByte(3 /* GuildRequestAction.Withdraw */);
        p.writeInt(characterId);
        return p;
    }
    /** GuildRequestAction.Kick = 4. Expels a guild member. */
    static GuildKick(characterId, characterName) {
        const p = OutPacket.Of(InHeader.GuildRequest);
        p.writeByte(4 /* GuildRequestAction.Kick */);
        p.writeInt(characterId);
        p.writeString(characterName);
        return p;
    }
    /** GuildRequestAction.Admin = 5. Sets a member's guild rank to admin. */
    static GuildAdmin(characterId, characterName) {
        const p = OutPacket.Of(InHeader.GuildRequest);
        p.writeByte(5 /* GuildRequestAction.Admin */);
        p.writeInt(characterId);
        p.writeString(characterName);
        return p;
    }
    /** GuildRequestAction.Level = 6. Promotes/demotes a guild member. */
    static GuildLevel(characterId, level) {
        const p = OutPacket.Of(InHeader.GuildRequest);
        p.writeByte(6 /* GuildRequestAction.Level */);
        p.writeInt(characterId);
        p.writeByte(level);
        return p;
    }
    /** GuildRequestAction.Expel = 8. Hard-expels a member (vs. soft "kick"). */
    static GuildExpel(characterId, characterName) {
        const p = OutPacket.Of(InHeader.GuildRequest);
        p.writeByte(8 /* GuildRequestAction.Expel */);
        p.writeInt(characterId);
        p.writeString(characterName);
        return p;
    }
    // OG: CField::SendSetGuildMarkMsg (decompile) — TODO_AUDIT.md
    // Seventy-ninth pass's `CSetGuildMarkDlg` finding: short markBg,
    // byte markBgColor, short mark, byte markColor. Guild-master-only,
    // gated client-side in the OG by CWvsContext::AmIGuildMaster.
    static GuildSetMark(markBg, markBgColor, mark, markColor) {
        const p = OutPacket.Of(InHeader.GuildRequest);
        p.writeByte(15 /* GuildRequestAction.SetMark */);
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
    static AllianceWithdraw() {
        const p = OutPacket.Of(InHeader.AllianceRequest);
        p.writeByte(2);
        return p;
    }
    /** Sub-type 3: invite a character by name to the alliance. */
    static AllianceInvite(targetName) {
        const p = OutPacket.Of(InHeader.AllianceRequest);
        p.writeByte(3);
        p.writeString(targetName);
        return p;
    }
    /** Sub-type 6: kick a member from the alliance.
     *  Requires guildId (the member's guild) and charId. */
    static AllianceKick(guildId, charId) {
        const p = OutPacket.Of(InHeader.AllianceRequest);
        p.writeByte(6);
        p.writeInt(guildId);
        p.writeInt(charId);
        return p;
    }
    /** Sub-type 7: transfer alliance master to another character. */
    static AllianceChangeMaster(charId) {
        const p = OutPacket.Of(InHeader.AllianceRequest);
        p.writeByte(7);
        p.writeInt(charId);
        return p;
    }
    /** Sub-type 9: change an alliance member's grade up (bUp=1) or down (bUp=0). */
    static AllianceGradeChange(charId, up) {
        const p = OutPacket.Of(InHeader.AllianceRequest);
        p.writeByte(9);
        p.writeInt(charId);
        p.writeByte(up ? 1 : 0);
        return p;
    }
    /** Sub-type 10: set the alliance notice text. */
    static AllianceSetNotice(text) {
        const p = OutPacket.Of(InHeader.AllianceRequest);
        p.writeByte(10);
        p.writeString(text);
        return p;
    }
    static UserSelectNpc(npcObjId, userX, userY) {
        const p = OutPacket.Of(InHeader.UserSelectNpc);
        p.writeInt(npcObjId);
        p.writeShort(userX);
        p.writeShort(userY);
        return p;
    }
    static ScriptAnswerSay(type, action) {
        const p = OutPacket.Of(InHeader.UserScriptMessageAnswer);
        p.writeByte(type);
        p.writeByte(action);
        return p;
    }
    static ScriptAnswerNumber(type, answer) {
        const p = OutPacket.Of(InHeader.UserScriptMessageAnswer);
        p.writeByte(type);
        p.writeByte(1 /* ScriptAnswerAction.Select */);
        p.writeInt(answer);
        return p;
    }
    static ScriptAnswerText(type, answer) {
        const p = OutPacket.Of(InHeader.UserScriptMessageAnswer);
        p.writeByte(type);
        p.writeByte(1 /* ScriptAnswerAction.Select */);
        p.writeString(answer);
        return p;
    }
    static ScriptAnswerCancel(type) {
        const p = OutPacket.Of(InHeader.UserScriptMessageAnswer);
        p.writeByte(type);
        p.writeByte(0 /* ScriptAnswerAction.Cancel */);
        return p;
    }
    static ScriptAnswerNext(msgType) {
        return GameSender.ScriptAnswerSay(msgType, 1 /* ScriptAnswerAction.Select */);
    }
    static ScriptAnswerYesNo(yes) {
        return GameSender.ScriptAnswerSay(2 /* ScriptMessageType.AskYesNo */, yes ? 1 /* ScriptAnswerAction.Select */ : 0 /* ScriptAnswerAction.Cancel */);
    }
    static ScriptAnswerTextOnly(answer) {
        const p = OutPacket.Of(InHeader.UserScriptMessageAnswer);
        p.writeByte(3 /* ScriptMessageType.AskText */);
        p.writeByte(1 /* ScriptAnswerAction.Select */);
        p.writeString(answer);
        return p;
    }
    static ScriptAnswerNumberOnly(answer) {
        const p = OutPacket.Of(InHeader.UserScriptMessageAnswer);
        p.writeByte(4 /* ScriptMessageType.AskNumber */);
        p.writeByte(1 /* ScriptAnswerAction.Select */);
        p.writeInt(answer);
        return p;
    }
    static GroupChat(type, memberIds, text) {
        const p = OutPacket.Of(InHeader.GroupMessage);
        // OG SendGroupMessage: encode str(update_time), byte(nChatTarget), byte(nMemberCnt), int[](memberIDs), str(text)
        p.writeString(String(Date.now()));
        p.writeByte(type);
        p.writeByte(memberIds.length);
        for (const id of memberIds) {
            p.writeInt(id);
        }
        p.writeString(text);
        return p;
    }
    static Whisper(targetName, text) {
        const p = OutPacket.Of(InHeader.Whisper);
        // OG SendChatMsgWhisper: encode str(targetName), str(text)
        p.writeString(targetName);
        p.writeString(text);
        return p;
    }
    static PartyCreate() {
        const p = OutPacket.Of(InHeader.PartyRequest);
        p.writeByte(1 /* PartyRequestAction.Create */);
        return p;
    }
    static PartyLeave() {
        const p = OutPacket.Of(InHeader.PartyRequest);
        p.writeByte(2 /* PartyRequestAction.Leave */);
        p.writeByte(0);
        return p;
    }
    static PartyJoin(inviterId) {
        const p = OutPacket.Of(InHeader.PartyRequest);
        p.writeByte(3 /* PartyRequestAction.Join */);
        p.writeInt(inviterId);
        p.writeByte(0);
        return p;
    }
    static PartyInvite(targetName) {
        const p = OutPacket.Of(InHeader.PartyRequest);
        p.writeByte(4 /* PartyRequestAction.Invite */);
        p.writeString(targetName);
        return p;
    }
    static PartyKick(characterId) {
        const p = OutPacket.Of(InHeader.PartyRequest);
        p.writeByte(5 /* PartyRequestAction.Kick */);
        p.writeInt(characterId);
        return p;
    }
    /** PartyRequestAction.ChangeLevel = 6. Adjusts the party's level range. */
    static PartyChangeLevel(level) {
        const p = OutPacket.Of(InHeader.PartyRequest);
        p.writeByte(6 /* PartyRequestAction.ChangeLevel */);
        p.writeInt(level);
        return p;
    }
    /** PartyRequestAction.ChangeJob = 7. Restricts the party to a job id. */
    static PartyChangeJob(jobId) {
        const p = OutPacket.Of(InHeader.PartyRequest);
        p.writeByte(7 /* PartyRequestAction.ChangeJob */);
        p.writeInt(jobId);
        return p;
    }
    /** PartyRequestAction.ChangePartyName = 8. Updates the party name. */
    static PartyChangeName(name) {
        const p = OutPacket.Of(InHeader.PartyRequest);
        p.writeByte(8 /* PartyRequestAction.ChangePartyName */);
        p.writeString(name);
        return p;
    }
    /** PartyRequestAction.Apply = 9. Applies to join an open party. */
    static PartyApply(partyId) {
        const p = OutPacket.Of(InHeader.PartyRequest);
        p.writeByte(9 /* PartyRequestAction.Apply */);
        p.writeInt(partyId);
        return p;
    }
    /** PartyRequestAction.WithdrawApply = 10. Withdraws a pending application. */
    static PartyWithdrawApply(partyId) {
        const p = OutPacket.Of(InHeader.PartyRequest);
        p.writeByte(10 /* PartyRequestAction.WithdrawApply */);
        p.writeInt(partyId);
        return p;
    }
    /** PartyRequestAction.SetMemberGrade = 11. Promotes/demotes a party member. */
    static PartySetMemberGrade(characterId, grade) {
        const p = OutPacket.Of(InHeader.PartyRequest);
        p.writeByte(11 /* PartyRequestAction.SetMemberGrade */);
        p.writeInt(characterId);
        p.writeByte(grade);
        return p;
    }
    static FriendLoad() {
        const p = OutPacket.Of(InHeader.FriendRequest);
        p.writeByte(0 /* FriendRequestAction.Load */);
        return p;
    }
    static FriendAdd(targetName, group = 'Default Group') {
        const p = OutPacket.Of(InHeader.FriendRequest);
        p.writeByte(1 /* FriendRequestAction.Add */);
        p.writeString(targetName);
        p.writeString(group);
        return p;
    }
    static FriendAccept(friendId) {
        const p = OutPacket.Of(InHeader.FriendRequest);
        p.writeByte(2 /* FriendRequestAction.Accept */);
        p.writeInt(friendId);
        return p;
    }
    static FriendDelete(friendId) {
        const p = OutPacket.Of(InHeader.FriendRequest);
        p.writeByte(3 /* FriendRequestAction.Delete */);
        p.writeInt(friendId);
        return p;
    }
    /** FriendRequestAction.Refuse = 4. Refuses a pending friend invite. */
    static FriendRefuse(friendId) {
        const p = OutPacket.Of(InHeader.FriendRequest);
        p.writeByte(4 /* FriendRequestAction.Refuse */);
        p.writeInt(friendId);
        return p;
    }
    /** OG: `CField::SendSetFriendMsg` (decompile/535240.c) — there is no
     *  separate "set group" action; re-grouping an existing friend reuses the
     *  same Add (action 1) packet, keyed by name rather than friend id. */
    static FriendSetGroup(targetName, group) {
        return GameSender.FriendAdd(targetName, group);
    }
    /** FriendRequestAction.SetMemo = 6. Sets a friend note. */
    static FriendSetMemo(friendId, memo) {
        const p = OutPacket.Of(InHeader.FriendRequest);
        p.writeByte(6 /* FriendRequestAction.SetMemo */);
        p.writeInt(friendId);
        p.writeString(memo);
        return p;
    }
    // OG: CTabFriend::ChangeBlockOption (0x8B7280) — block/unblock friend
    static FriendBlock(friendId, block) {
        const p = OutPacket.Of(InHeader.FriendRequest);
        p.writeByte(block ? 8 : 9); // 8=block, 9=unblock
        p.writeInt(friendId);
        return p;
    }
    /** FriendRequestAction.CapacityChange = 7. Adjusts the friend-list capacity. */
    static FriendCapacityChange(delta) {
        const p = OutPacket.Of(InHeader.FriendRequest);
        p.writeByte(7 /* FriendRequestAction.CapacityChange */);
        p.writeInt(delta);
        return p;
    }
    // ── MiniRoom (InHeader.MiniRoom 144) ──────────────────────────────────────
    static MiniRoomCreate(roomType, title, password, gameSpec) {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(0 /* MiniRoomProtocol.MRP_Create */);
        p.writeByte(roomType);
        p.writeString(title);
        p.writeByte(password ? 1 : 0);
        if (password)
            p.writeString(password);
        p.writeByte(gameSpec);
        return p;
    }
    static MiniRoomCreateTrade() {
        return GameSender.MiniRoomCreate(MiniRoomType.TradingRoom, '', '', 0);
    }
    static MiniRoomEnter(miniRoomId, password) {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(4 /* MiniRoomProtocol.MRP_Enter */);
        p.writeInt(miniRoomId);
        p.writeByte(password ? 1 : 0);
        if (password)
            p.writeString(password);
        p.writeByte(0);
        return p;
    }
    static MiniRoomLeave() {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(10 /* MiniRoomProtocol.MRP_Leave */);
        return p;
    }
    static MiniRoomChat(text) {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(6 /* MiniRoomProtocol.MRP_Chat */);
        p.writeInt(0);
        p.writeString(text);
        return p;
    }
    static MiniRoomInvite(targetId) {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(2 /* MiniRoomProtocol.MRP_Invite */);
        p.writeInt(targetId);
        return p;
    }
    static TradePutItem(index, invType, position, quantity) {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(15 /* MiniRoomProtocol.TRP_PutItem */);
        p.writeByte(invType);
        p.writeShort(position);
        p.writeShort(quantity);
        p.writeByte(index);
        return p;
    }
    static TradePutMoney(amount) {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(16 /* MiniRoomProtocol.TRP_PutMoney */);
        p.writeInt(amount);
        return p;
    }
    static TradeConfirm() {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(17 /* MiniRoomProtocol.TRP_Trade */);
        return p;
    }
    static TradeCancel() {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(18 /* MiniRoomProtocol.TRP_UnTrade */);
        return p;
    }
    static ShopPutItem(invType, position, setCount, setSize, price) {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(22 /* MiniRoomProtocol.PSP_PutItem */);
        p.writeByte(invType);
        p.writeShort(position);
        p.writeShort(setCount);
        p.writeShort(setSize);
        p.writeInt(price);
        return p;
    }
    static ShopBuyItem(itemIndex, count) {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(23 /* MiniRoomProtocol.PSP_BuyItem */);
        p.writeByte(itemIndex);
        p.writeShort(count);
        p.writeInt(0); // ItemCRC
        return p;
    }
    static ShopBalloonOpen(open) {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(11 /* MiniRoomProtocol.MRP_Balloon */);
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
    static EntrustedShopGoOut() {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(MiniRoomProtocolFull.ESP_GoOut);
        return p;
    }
    static EntrustedShopWithdrawMoney() {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(MiniRoomProtocolFull.ESP_WithdrawMoney);
        return p;
    }
    // OG: CEntrustedShopDlg::OnArrange (0x51E400 case 0x3F7) — sort items
    static EntrustedShopArrange() {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(MiniRoomProtocolFull.ESP_ArrangeItem);
        return p;
    }
    // OG: CEntrustedShopDlg visitor buy — ESP_BuyItem (0x22)
    static EntrustedShopBuyItem(index, count) {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(MiniRoomProtocolFull.ESP_BuyItem);
        p.writeByte(index);
        p.writeShort(count);
        return p;
    }
    // ── MemoryGame (InHeader.MiniRoom 144, sub-protocol MGP_*) ──────────────
    /** Client sends when flipping a card. Opcode byte + MGP_TurnUpCard(68) + cardIdx + bSelected. */
    static MemoryGameTurnUpCard(cardIdx, bSelected) {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(MiniRoomProtocolFull.MGP_TurnUpCard);
        p.writeByte(cardIdx);
        p.writeByte(bSelected ? 1 : 0);
        return p;
    }
    static MemoryGameReady(bReady) {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(MiniRoomProtocolFull.MGRP_Ready);
        p.writeByte(bReady ? 1 : 0);
        return p;
    }
    static MemoryGameStart() {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(MiniRoomProtocolFull.MGRP_Start);
        return p;
    }
    static MemoryGameTieRequest() {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(MiniRoomProtocolFull.MGRP_TieRequest);
        return p;
    }
    static MemoryGameGiveUp() {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(MiniRoomProtocolFull.MGRP_GiveUpRequest);
        return p;
    }
    static MemoryGameBan() {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(MiniRoomProtocolFull.MGRP_Ban);
        return p;
    }
    // ── RPS Game (CP_RPSGame = 0xa0 = 160) ──────────────────────────────────
    // OG: CRPSGameDlg uses COutPacket(160) with sub-opcodes 0-5.
    // All methods encode: opcode 160 + sub-opcode byte + optional extra byte.
    static RPSGameStart() {
        const p = OutPacket.Of(160);
        p.writeByte(0); // sub-opcode: start
        return p;
    }
    static RPSGameSelection(rpsChoice) {
        const p = OutPacket.Of(160);
        p.writeByte(1); // sub-opcode: selection
        p.writeByte(rpsChoice); // 0=rock, 1=paper, 2=scissor
        return p;
    }
    static RPSGameTimeout() {
        const p = OutPacket.Of(160);
        p.writeByte(2); // sub-opcode: timeout
        return p;
    }
    static RPSGameContinue() {
        const p = OutPacket.Of(160);
        p.writeByte(3); // sub-opcode: continue
        return p;
    }
    static RPSGameExit() {
        const p = OutPacket.Of(160);
        p.writeByte(4); // sub-opcode: exit
        return p;
    }
    static RPSGameRetry() {
        const p = OutPacket.Of(160);
        p.writeByte(5); // sub-opcode: retry
        return p;
    }
    // CCashShop::SendCheckNameChangePossiblePacket (decompile/488190.c).
    static CheckNameChangePossible(characterId, secondaryPassword) {
        const p = OutPacket.Of(InHeader.CheckNameChangePossible);
        p.writeInt(characterId);
        p.writeString(secondaryPassword);
        return p;
    }
    // CCashShop::SendCheckTransferWorldPossiblePacket (decompile/4884C0.c).
    static CheckTransferWorldPossible(characterId, secondaryPassword) {
        const p = OutPacket.Of(InHeader.CheckTransferWorldPossible);
        p.writeInt(characterId);
        p.writeString(secondaryPassword);
        return p;
    }
    // CWvsContext::SendGatherItemRequest (decompile/9D5B70.c). OG gates this
    // locally (HP>0, 500ms throttle, nType in 1..5) before sending; callers
    // are expected to apply the same throttle. `updateTime` is the client's
    // running tick counter (OG `get_update_time()`).
    static GatherItemRequest(updateTime, inventoryType) {
        const p = OutPacket.Of(InHeader.UserGatherItemRequest);
        p.writeInt(updateTime);
        p.writeByte(inventoryType);
        return p;
    }
    // CWvsContext::SendSortItemRequest (decompile/9D5C60.c) — same shape as
    // GatherItemRequest.
    static SortItemRequest(updateTime, inventoryType) {
        const p = OutPacket.Of(InHeader.UserSortItemRequest);
        p.writeInt(updateTime);
        p.writeByte(inventoryType);
        return p;
    }
    // CUserLocal::SendSkillCancelRequest (decompile/93D730.c). OG remaps 3
    // legacy skill ids to their current equivalents before sending.
    static SkillCancelRequest(skillId) {
        let id = skillId;
        if (id === 32120000)
            id = 32001003;
        else if (id === 32110000)
            id = 32101002;
        else if (id === 32120001)
            id = 32101003;
        const p = OutPacket.Of(InHeader.UserSkillCancelRequest);
        p.writeInt(id);
        return p;
    }
    // CWvsContext::SendMapTransferRequest (decompile/9F3B90.c). `targetField`
    // is only written when nType===0 (OG: `if (!nType) Encode4(dwTargetField)`).
    static MapTransferRequest(transferType, canTransferContinent, targetField) {
        const p = OutPacket.Of(InHeader.UserMapTransferRequest);
        p.writeByte(transferType);
        p.writeByte(canTransferContinent ? 1 : 0);
        if (transferType === 0)
            p.writeInt(targetField ?? 0);
        return p;
    }
    // CWvsContext::SendAntiMacroItemUseRequest (decompile/9FF270.c) — only the
    // wire-relevant tail (target found, item-use branch) is encoded; the rest
    // of the OG function is local UI/dialog flow with no further packet bytes.
    static AntiMacroItemUseRequest(targetCharacterName, pos, itemId) {
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
    static AntiMacroAnswerRequest(answer) {
        const p = OutPacket.Of(InHeader.AntiMacroAnswerRequest);
        p.writeString(answer);
        return p;
    }
    // CWvsContext::SendSitOnPortableChairRequest (decompile/9DA100.c). The OG
    // signature also takes `nPOS`, but it's dead — never read anywhere in the
    // function body, including the packet encode (only nItemID is sent).
    static PortableChairSitRequest(itemId) {
        const p = OutPacket.Of(InHeader.UserPortableChairSitRequest);
        p.writeInt(itemId);
        return p;
    }
    // CWvsContext::SendPortalScrollUseRequest (decompile/9FCA70.c).
    // `updateTime` is the client's running tick counter (OG `get_update_time()`).
    static PortalScrollUseRequest(updateTime, pos, itemId) {
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
    static EntrustedShopCheckRequest(cashItemSn) {
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
    static FuncKeyMappedModified(changes) {
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
    static QuickslotKeyMappedModified(keys) {
        if (keys.length !== 8)
            throw new Error('QuickslotKeyMappedModified requires exactly 8 keys');
        const p = OutPacket.Of(InHeader.QuickslotKeyMappedModified);
        for (const k of keys)
            p.writeInt(k);
        return p;
    }
    // CUserLocal::TryRegisterTeleport (decompile/913690.c), sPortalName branch
    // (InHeader=113). Wire: fieldKey:byte, sPortalName:str (the scroll/skill's
    // origin-portal name), current pos x/y:short, then two more shorts read
    // from the target PORTAL struct at byte offsets +12/+16 — those two
    // fields' exact semantic names aren't confirmed from this call site (only
    // that they're 2-byte fields at those offsets), so they're passed through
    // as opaque shorts rather than guessed at.
    static PortalTeleportRequest(fieldKey, portalName, posX, posY, portalField12, portalField16) {
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
    static NpcMoveRequest(objectId, oneTimeAction, chatIndex, movePath) {
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
    static MobApplyCtrl(objectId, crc = 0) {
        const p = OutPacket.Of(InHeader.MobApplyCtrl);
        p.writeInt(objectId);
        p.writeInt(crc);
        return p;
    }
    // UserHandler.handleUserSitRequest (kinoko-main/src/main/java/kinoko/handler/user/UserHandler.java).
    // fieldSeatId === -1 means "stand up"; any other value is the chair/seat
    // object id to sit in.
    static UserSitRequest(fieldSeatId) {
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
    static UserSkillPrepareRequest(skillId, slv, actionAndDir, attackSpeed, swallowMobId) {
        const p = OutPacket.Of(InHeader.UserSkillPrepareRequest);
        p.writeInt(skillId);
        p.writeByte(slv);
        p.writeShort(actionAndDir);
        p.writeByte(attackSpeed);
        if (swallowMobId !== undefined)
            p.writeInt(swallowMobId);
        return p;
    }
    // UserHandler.handleUserPortalScriptRequest (kinoko-main/src/main/java/kinoko/handler/user/UserHandler.java).
    static UserPortalScriptRequest(fieldKey, portalName, posX, posY) {
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
    static ExpeditionCreate(questId) {
        const p = OutPacket.Of(InHeader.ExpeditionRequest);
        p.writeByte(0x31);
        p.writeInt(questId);
        return p;
    }
    /** 0x32: Invite a character by name to the expedition. */
    static ExpeditionInvite(targetName) {
        const p = OutPacket.Of(InHeader.ExpeditionRequest);
        p.writeByte(0x32);
        p.writeString(targetName);
        return p;
    }
    /** 0x33: Response to an expedition invite. accept=9, reject=8. */
    static ExpeditionResponseInvite(masterName, accepted) {
        const p = OutPacket.Of(InHeader.ExpeditionRequest);
        p.writeByte(0x33);
        p.writeString(masterName);
        p.writeInt(accepted ? 9 : 8);
        return p;
    }
    /** 0x34: Withdraw from the current expedition. */
    static ExpeditionWithdraw() {
        const p = OutPacket.Of(InHeader.ExpeditionRequest);
        p.writeByte(0x34);
        return p;
    }
    /** 0x35: Kick a member from the expedition. */
    static ExpeditionKick(charId) {
        const p = OutPacket.Of(InHeader.ExpeditionRequest);
        p.writeByte(0x35);
        p.writeInt(charId);
        return p;
    }
    /** 0x36: Change expedition master. */
    static ExpeditionChangeMaster(charId) {
        const p = OutPacket.Of(InHeader.ExpeditionRequest);
        p.writeByte(0x36);
        p.writeInt(charId);
        return p;
    }
    /** 0x37: Change sub-party boss. */
    static ExpeditionChangeBoss(charId) {
        const p = OutPacket.Of(InHeader.ExpeditionRequest);
        p.writeByte(0x37);
        p.writeInt(charId);
        return p;
    }
    /** 0x38: Relocate a party member to another sub-party. */
    static ExpeditionRelocateParty(charId, toIndex) {
        const p = OutPacket.Of(InHeader.ExpeditionRequest);
        p.writeByte(0x38);
        p.writeInt(toIndex);
        p.writeInt(charId);
        return p;
    }
    // ── PartyAdver Senders (InHeader.PartyAdverRequest=148) ─────────────────
    // OG: TabPartyAdver — party search / advertisement system.
    /** 0x51: Register a party advertisement with the given quest group ID and title. */
    static PartyAdverRegisterCommit(questId, title) {
        const p = OutPacket.Of(InHeader.PartyAdverRequest);
        p.writeByte(0x51);
        p.writeInt(questId);
        p.writeString(title);
        return p;
    }
    /** 0x53: Request party advertisement listings for the given quest ID. */
    static PartyAdverRequest(questId) {
        const p = OutPacket.Of(InHeader.PartyAdverRequest);
        p.writeByte(0x53);
        p.writeInt(questId);
        return p;
    }
    /** 0x56: Response to a party/expedition apply request. result: 10=accept, 11=reject, 12=blocked. */
    static PartyAdverApplyResponse(result, partyId) {
        const p = OutPacket.Of(InHeader.PartyAdverRequest);
        p.writeByte(0x56);
        p.writeInt(result);
        p.writeInt(partyId);
        return p;
    }
    // OG: CUIMiniMap::OnMouseButton — client→server 0xA6 with no payload,
    // sent when player clicks their own dot on the minimap.
    static UserMiniMapClick() {
        return OutPacket.Of(InHeader.UserMiniMapClick);
    }
    // ── CashShop Senders (InHeader.UserCashShopRequest=275) ────────────────
    // All CCashShop::Send* methods (decompile/487b60.c and siblings).
    // Sub-action byte first, then action-specific fields.
    /** Sub-action 0: CCashShop::SendLoadLockerRequest — request locker contents. */
    static CashShopLoadLocker() {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(0);
        return p;
    }
    /** Sub-action 1: CCashShop::SendLoadGiftRequest — request gift box contents. */
    static CashShopLoadGift() {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(1);
        return p;
    }
    /** Sub-action 2: CCashShop::SendLoadWishRequest — request wishlist. */
    static CashShopLoadWish() {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(2);
        return p;
    }
    /** Sub-action 3: CCashShop::SendBuyRequest — buy a single item by SN. */
    static CashShopBuy(sn) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(3);
        p.writeInt(sn);
        return p;
    }
    /** Sub-action 5: CCashShop::SendSetWishRequest — set the 10-slot wishlist. */
    static CashShopSetWish(sns) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(5);
        for (let i = 0; i < 10; i++)
            p.writeInt(sns[i] ?? 0);
        return p;
    }
    /** Sub-action 6: CCashShop::SendMoveLtoSRequest — move item from locker to inventory. */
    static CashShopMoveLtoS(sn) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(6);
        p.writeInt(sn);
        return p;
    }
    /** Sub-action 7: CCashShop::SendMoveStoLRequest — move item from inventory to locker. */
    static CashShopMoveStoL(sn) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(7);
        p.writeInt(sn);
        return p;
    }
    /** Sub-action 8: CCashShop::SendUseCouponRequest — redeem a coupon code. */
    static CashShopUseCoupon(couponCode) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(8);
        p.writeString(couponCode);
        return p;
    }
    /** Sub-action 9: CCashShop::SendGiftCouponRequest — gift a coupon to a player. */
    static CashShopGiftCoupon(receiverName, couponCode) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(9);
        p.writeString(receiverName);
        p.writeString(couponCode);
        return p;
    }
    /** Sub-action 10: CCashShop::SendIncSlotCountRequest — purchase extra inventory slots. */
    static CashShopIncSlotCount(invType) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(10);
        p.writeByte(invType);
        return p;
    }
    /** Sub-action 11: CCashShop::SendIncTrunkCountRequest — purchase extra trunk slots. */
    static CashShopIncTrunkCount() {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(11);
        return p;
    }
    /** Sub-action 12: CCashShop::SendIncCharSlotCountRequest — purchase extra character slot. */
    static CashShopIncCharSlotCount() {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(12);
        return p;
    }
    /** Sub-action 13: CCashShop::SendIncBuyCharCountRequest — purchase extra buy-character count. */
    static CashShopIncBuyCharCount() {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(13);
        return p;
    }
    /** Sub-action 14: CCashShop::SendEnableEquipSlotExtRequest — extend an equip slot by days. */
    static CashShopEnableEquipSlotExt(bodyPartIndex, days) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(14);
        p.writeShort(bodyPartIndex);
        p.writeShort(days);
        return p;
    }
    /** Sub-action 15: CCashShop::SendDestroyRequest — destroy a locker item by SN. */
    static CashShopDestroy(sn) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(15);
        p.writeInt(sn);
        return p;
    }
    /** Sub-action 16: CCashShop::SendExpireRequest — expire a locker item by SN. */
    static CashShopExpire(sn) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(16);
        p.writeInt(sn);
        return p;
    }
    /** Sub-action 17: CCashShop::SendRebateRequest — request rebate for a locker item. */
    static CashShopRebate(sn) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(17);
        p.writeInt(sn);
        return p;
    }
    /** Sub-action 18: CCashShop::SendCoupleRequest — buy a couple/linked item for a partner. */
    static CashShopCouple(sn, receiverName) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(18);
        p.writeInt(sn);
        p.writeString(receiverName);
        return p;
    }
    /** Sub-action 19: CCashShop::SendBuyPackageRequest — buy a package deal by SNs. */
    static CashShopBuyPackage(sns) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(19);
        p.writeByte(sns.length);
        for (const sn of sns)
            p.writeInt(sn);
        return p;
    }
    /** Sub-action 20: CCashShop::SendGiftPackageRequest — gift a package to a player. */
    static CashShopGiftPackage(receiverName, sn) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(20);
        p.writeString(receiverName);
        p.writeInt(sn);
        return p;
    }
    /** Sub-action 21: CCashShop::SendBuyNormalRequest — buy multiple normal items at once. */
    static CashShopBuyNormal(count, sns) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(21);
        p.writeByte(count);
        for (const sn of sns)
            p.writeInt(sn);
        return p;
    }
    /** Sub-action 22: CCashShop::SendFriendShipRequest — buy a friendship item for another player. */
    static CashShopFriendShip(sn, receiverName) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(22);
        p.writeInt(sn);
        p.writeString(receiverName);
        return p;
    }
    /** Sub-action 23: CCashShop::SendFreeCashItemRequest — claim a free cash item. */
    static CashShopFreeCashItem(sn) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(23);
        p.writeInt(sn);
        return p;
    }
    /** Sub-action 24: CCashShop::SendPurchaseRecordRequest — check purchase record for an item. */
    static CashShopPurchaseRecord(sn) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(24);
        p.writeInt(sn);
        return p;
    }
    /** Sub-action 25: CCashShop::SendChangeMaplePointRequest — convert Maple Points for an item. */
    static CashShopChangeMaplePoint(sn, amount) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(25);
        p.writeInt(sn);
        p.writeInt(amount);
        return p;
    }
    /** Sub-action 27: CCashShop::SendQueryCashRequest — query current NX/MaplePoint/Prepaid balances. */
    static CashShopQueryCash() {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(27);
        return p;
    }
    /** Sub-action 26: CCashShop::SendCashGachaponOpenRequest — open a cash gachapon ticket. */
    static CashShopCashGachaponOpen(sn) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(26);
        p.writeInt(sn);
        return p;
    }
    // ── Additional cash shop senders (from IDA decompilation) ──
    /** CCashShop::SendCheckNameChangePossiblePacket (decompile/488190.c). */
    static CashShopCheckNameChange(itemId, newName) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(28); // sub-action 28
        p.writeInt(itemId);
        p.writeString(newName);
        return p;
    }
    /** CCashShop::SendNameChangeRequest — confirm name change after checking. */
    static CashShopNameChange(sn, newName) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(29); // sub-action 29
        p.writeInt(sn);
        p.writeString(newName);
        return p;
    }
    /** CCashShop::SendCheckTransferWorldPossiblePacket (decompile/4884C0.c). */
    static CashShopCheckTransferWorld() {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(30); // sub-action 30
        return p;
    }
    /** CCashShop::SendTransferWorldRequest — transfer character to another world. */
    static CashShopTransferWorld(sn, worldName) {
        const p = OutPacket.Of(InHeader.UserCashShopRequest);
        p.writeByte(31); // sub-action 31
        p.writeInt(sn);
        p.writeString(worldName);
        return p;
    }
    // ── Additional CWvsContext senders (from v95 IDA decompilation) ──
    // OG: CWvsContext::SendGetUpFromChairRequest (0x9d6740).
    // Encodes: short(2). Opcode 0x2D (45) = UserSitRequest.
    // `tTimeInterval` is the minimum ms since last sit; OG passes 0 or 500.
    static SitRequest(tTimeInterval) {
        const p = OutPacket.Of(InHeader.UserSitRequest);
        p.writeShort(tTimeInterval);
        return p;
    }
    // OG: CWvsContext::SendGivePopularityRequest (0x9f67e0).
    // Encodes: int(4) byte(1). Opcode TBD.
    // sName is the target character name; bInc is 1=inc fame, 0=dec fame.
    static GivePopularityRequest(targetName, incFame) {
        const p = OutPacket.Of(InHeader.UserGivePopularityRequest);
        p.writeString(targetName);
        p.writeByte(incFame ? 1 : 0);
        return p;
    }
    // OG: CWvsContext::SendActivatePetRequest (0x9f6980).
    // Encodes: int(4) buffer int(4) short(2) byte(1). Opcode 0x2D (45) = UserSitRequest.
    // `nPos` is the inventory slot of the pet item.
    static ActivatePetRequest(pos) {
        const p = OutPacket.Of(InHeader.UserSitRequest);
        p.writeInt(pos);
        return p;
    }
    // OG: CWvsContext::SendWaterOfLife (0x9f28e0).
    // No payload. Opcode 0x81 (129).
    static WaterOfLife() {
        return OutPacket.Of(InHeader.UserWaterOfLife);
    }
    // OG: CWvsContext::SendMigrateToShopRequest (0x9dc280).
    // int(4) payload. Opcode 0x2B (43) = UserMigrateToCashShopRequest.
    // bFromWishItem: 0=normal, 1=from wish item.
    static MigrateToShopRequest(bFromWishItem) {
        const p = OutPacket.Of(InHeader.UserMigrateToCashShopRequest);
        p.writeInt(bFromWishItem ? 1 : 0);
        return p;
    }
    // OG: CWvsContext::SendMigrateToITCRequest (0x9def50).
    // No payload. Migrates to the Item Trading Room (ITC).
    // Opcode: sends UserMigrateToCashShopRequest with sub-payload.
    static MigrateToITCRequest() {
        return OutPacket.Of(InHeader.UserMigrateToCashShopRequest);
    }
    // OG: CWvsContext::SendTempExpUseRequest (0x9db430).
    // Encodes: int(4). Uses accumulated temp EXP.
    static TempExpUseRequest() {
        const p = OutPacket.Of(InHeader.UserTempExpUseRequest);
        p.writeInt(0);
        return p;
    }
    // OG: CWvsContext::SendUIOpenItemRequest (0x9d64d0).
    // Encodes: int(4) short(2) int(4).
    static UIOpenItemRequest(pos, itemId) {
        const p = OutPacket.Of(InHeader.UserUIOpenItemRequest);
        p.writeInt(0); // updateTime placeholder
        p.writeShort(pos);
        p.writeInt(itemId);
        return p;
    }
    // OG: CWvsContext::SendRemoteShopOpenRequest (0x9f30d0).
    // Encodes: short(2). Opens a hired merchant remotely.
    static RemoteShopOpenRequest(pos) {
        const p = OutPacket.Of(InHeader.UserRemoteShopOpenRequest);
        p.writeShort(pos);
        return p;
    }
    // OG: CWvsContext::SendBoobyTrapAlert (0xa09680).
    // Encodes: int(4). Notifies server about booby trap pickup.
    static BoobyTrapAlert(trapType) {
        const p = OutPacket.Of(InHeader.UserBoobyTrapAlert);
        p.writeInt(trapType);
        return p;
    }
    // OG: CWvsContext::SendPartyWanted (0xa10100).
    // Encodes: int(4) int(4) int(4) int(4). Registers party recruitment.
    static PartyWanted(minLv, maxLv, count, jobFlag) {
        const p = OutPacket.Of(InHeader.UserPartyWanted);
        p.writeInt(minLv);
        p.writeInt(maxLv);
        p.writeInt(count);
        p.writeInt(jobFlag);
        return p;
    }
    // OG: CWvsContext::SendCancelPartyWanted (0xa0ffd0).
    // No payload. Cancels party recruitment.
    static CancelPartyWanted() {
        return OutPacket.Of(InHeader.UserCancelPartyWanted);
    }
    // OG: CWvsContext::SendRegisterJunior (0xa09dd0).
    // Encodes: string. Registers a junior in the Family system.
    static RegisterJunior(charName) {
        const p = OutPacket.Of(InHeader.UserFamilyRegisterJunior);
        p.writeString(charName);
        return p;
    }
    // OG: CWvsContext::SendUnregisterJunior (0xa099e0).
    // Encodes: int(4). Unregisters a junior by character ID.
    static UnregisterJunior(charId) {
        const p = OutPacket.Of(InHeader.UserFamilyUnregisterJunior);
        p.writeInt(charId);
        return p;
    }
    // OG: CWvsContext::SendUnregisterParent (0xa098d0).
    // No payload. Unregisters the current parent.
    static UnregisterParent() {
        return OutPacket.Of(InHeader.UserFamilyUnregisterParent);
    }
    // OG: CWvsContext::SendRingDropRequest (0x9d6810).
    // Encodes: byte(1) int(4). Drops a ring item.
    static RingDropRequest(itemId) {
        const p = OutPacket.Of(InHeader.UserRingDropRequest);
        p.writeByte(1); // type
        p.writeInt(itemId);
        return p;
    }
    // OG: CWvsContext::SendInvitationQuery (0x9da630).
    // Encodes: byte(1) int(4) int(4). Queries an invitation.
    static InvitationQuery(pos, itemId) {
        const p = OutPacket.Of(InHeader.UserInvitationQuery);
        p.writeByte(1); // type
        p.writeInt(pos);
        p.writeInt(itemId);
        return p;
    }
    // OG: CWvsContext::SendNewYearCardUseRequest (0x9da380).
    // Encodes: short(2) int(4). Uses a New Year card item.
    static NewYearCardUseRequest(pos, itemId) {
        const p = OutPacket.Of(InHeader.UserNewYearCardUseRequest);
        p.writeShort(pos);
        p.writeInt(itemId);
        return p;
    }
    // OG: CWvsContext::SendRandomMorphOtherRequest (0x9cced0).
    // Encodes: short(2) int(4). Uses a random morph item on another player.
    static RandomMorphOtherRequest(pos, itemId) {
        const p = OutPacket.Of(InHeader.UserRandomMorphOtherRequest);
        p.writeShort(pos);
        p.writeInt(itemId);
        return p;
    }
    // OG: CWvsContext::SendWishListInput (0x9e19d0).
    // Encodes: byte(1) byte(1) string. Inputs wish list items.
    static WishListInput(wishList, count) {
        const p = OutPacket.Of(InHeader.UserWeddingWishListRequest);
        p.writeByte(6); // sub-action: PutItem
        p.writeByte(count);
        for (const name of wishList)
            p.writeString(name);
        return p;
    }
    // OG: CWvsContext::SendRequestSessionValue (0x9e1a90).
    // Encodes: string byte(1). Requests a session value.
    static RequestSessionValue(key, reset) {
        const p = OutPacket.Of(InHeader.UserSessionValueRequest);
        p.writeString(key);
        p.writeByte(reset ? 1 : 0);
        return p;
    }
    // OG: CWvsContext::SendOpenShopRequest (0x9fc570).
    // Encodes: byte(1) byte(1) string byte(1) short(2) int(4).
    // Opens a personal/entrusted shop.
    static OpenShopRequest(pos, itemId, name, desc, minLevel, flags) {
        const p = OutPacket.Of(InHeader.MiniRoom);
        p.writeByte(15); // sub-action: OpenShopRequest
        p.writeByte(0);
        p.writeString(name);
        p.writeByte(0);
        p.writeShort(minLevel);
        p.writeInt(flags);
        return p;
    }
    // OG: CWvsContext::SendFollowCharacterRequest (0x9f9530).
    // Encodes: int(4) byte(1) byte(1). Follows another character.
    static FollowCharacterRequest(charId, action) {
        const p = OutPacket.Of(InHeader.UserFollowCharacterRequest);
        p.writeInt(charId);
        p.writeByte(action);
        p.writeByte(0);
        return p;
    }
    // OG: CWvsContext::SendStatChangeItemUseRequest (0x9ddfe0).
    // Encodes: int(4) short(2) int(4). Uses a stat change item (potion/buff).
    static StatChangeItemUseRequest(pos, itemId) {
        const p = OutPacket.Of(InHeader.UserStatChangeItemUseRequest);
        p.writeInt(0); // updateTime placeholder
        p.writeShort(pos);
        p.writeInt(itemId);
        return p;
    }
    // OG: CWvsContext::SendStatChangeItemUseRequestByPetQ (0x9de400).
    // Encodes: buffer byte(1) int(4) short(2) int(4). Pet auto-consume.
    static StatChangeItemUseRequestByPetQ(petName, pos, itemId) {
        const p = OutPacket.Of(InHeader.UserStatChangeItemUseRequest);
        p.writeString(petName);
        p.writeByte(0);
        p.writeInt(0); // updateTime
        p.writeShort(pos);
        p.writeInt(itemId);
        return p;
    }
    // OG: CWvsContext::SendDropMoneyRequest (0x9f6650).
    // Encodes: int(4) int(4). Drops mesos on the ground.
    static DropMoneyRequest(amount) {
        const p = OutPacket.Of(InHeader.UserDropMoneyRequest);
        p.writeInt(amount);
        p.writeInt(0);
        return p;
    }
    // OG: CWvsContext::SendSendInvitaionRequest (0x9e16e0) — note OG typo.
    // Encodes: byte(1) string int(4) int(4). Sends an invitation query.
    static SendInvitationRequest(pos, itemId) {
        const p = OutPacket.Of(InHeader.UserInvitationQuery);
        p.writeByte(1); // type
        p.writeString('');
        p.writeInt(pos);
        p.writeInt(itemId);
        return p;
    }
    // ── Pet C→S packets ────────────────────────────────────────────────────
    // OG: CPet::DoAction (0x6a2340) — opcode 200.
    // Encodes: buffer(8:petLockerSN) int(updateTime) byte(type) byte(action) string(chat)
    static PetAction(petLockerSN, type, action, chat) {
        const p = OutPacket.Of(InHeader.UserPetAction);
        p.writeLong(petLockerSN);
        p.writeInt(Date.now());
        p.writeByte(type);
        p.writeByte(action);
        p.writeString(chat);
        return p;
    }
    // OG: CPet::ParseCommand (0x6a3cc0) — opcode 201.
    // Encodes: buffer(8:petLockerSN) byte(hasName) byte(interactionIdx)
    static PetInteractionRequest(petLockerSN, hasName, interactionIdx) {
        const p = OutPacket.Of(InHeader.UserPetInteractionRequest);
        p.writeLong(petLockerSN);
        p.writeByte(hasName ? 1 : 0);
        p.writeByte(interactionIdx);
        return p;
    }
    // OG: CPet::SendDropPickUpRequest (0x6a0820) — opcode 202.
    // Encodes: buffer(8:petLockerSN) byte(fieldCrc) int(updateTime) short(x) short(y)
    //          int(dropId) int(cliCrc) byte(pickupOthers) byte(sweepForDrop) byte(longRange)
    //          [if dropId%13==0: short(x) short(y) int(posCRC) int(rectCrc)]
    static PetDropPickUpRequest(petLockerSN, x, y, dropId, cliCrc, pickupOthers, sweepForDrop, longRange, posCRC, rectCrc) {
        const p = OutPacket.Of(InHeader.UserPetDropPickUpRequest);
        p.writeLong(petLockerSN);
        p.writeByte(0); // fieldCrc placeholder
        p.writeInt(Date.now());
        p.writeShort(x);
        p.writeShort(y);
        p.writeInt(dropId);
        p.writeInt(cliCrc);
        p.writeByte(pickupOthers ? 1 : 0);
        p.writeByte(sweepForDrop ? 1 : 0);
        p.writeByte(longRange ? 1 : 0);
        if (dropId % 13 === 0) {
            p.writeShort(x);
            p.writeShort(y);
            p.writeInt(posCRC ?? 0);
            p.writeInt(rectCrc ?? 0);
        }
        return p;
    }
    // OG: CPet::SendUpdateExceptionListRequest (0x6a0dd0) — opcode 204.
    // Encodes: buffer(8:petLockerSN) byte(count) int(itemIds)[count]
    static PetUpdateExceptionList(petLockerSN, itemIds) {
        const p = OutPacket.Of(InHeader.UserPetUpdateExceptionList);
        p.writeLong(petLockerSN);
        p.writeByte(itemIds.length);
        for (const id of itemIds)
            p.writeInt(id);
        return p;
    }
}
//# sourceMappingURL=GameSender.js.map