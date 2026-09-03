# Session Summary - Remote-character movement fix: C->S UserMove header desync

## User report: "other characters show but are not in position also dont see movement for other characters"
- **Root cause**: `GameSender.UserMove` (C→S, opcode 44) wrote only `2 ints + byte fieldKey + 3 ints` (21 bytes) before the CMovePath body, but the server's `handleUserMove` (ported from the initial maple-io-server v95 emulator) reads `2 ints + byte fieldKey + 5 ints` (29 bytes) — the last two being the anti-cheat `dwCrc`/`Crc32` slots. Every local move was desynced by 8 bytes: the server decoded the path from byte 8 of the blob → garbage origin/elements → `movePath.applyTo(user)` stored a garbage x/y → `UserRemote.move` broadcast carried garbage → remote clients dropped it (DecodeMovePath throw → catch) → **remote chars never moved**, and their **enter position** (from the server's garbage-stored x/y) was wrong.
- **Fix**: `GameSender.UserMove` now writes the full `2 ints + byte fieldKey + 5 ints` (29-byte) header so the path body starts where `MovePath.decode` expects. Verified by a round-trip test that reproduces the server's exact read order and confirms the origin shorts/count/elements parse cleanly.
- The S→C remote move side (`UserRemote.move` = `[short 210][int charId][path]` → client `handleUserMove` = `[int charId][DecodeMovePath]`) was already symmetric; no change needed there.
- The v95 IDB was unavailable this session (ida-mcp worker spawn failures on both the original .i64 and a temp copy) — the fix was derived from the server handler's authoritative 5-int read + the client path encoder/decoder symmetry.

## Tests
- NEW tests/net/packet/UserMove.spec.ts (3): 29-byte header before path body, remainder==blob.length, and a server-read-order round-trip (2 ints + byte + 5 ints then path origin/count/element fields).
- tsc clean (client + server); full suite **2009 pass / 6 skip** (only pre-existing e2e playwright env failure). NOTE: git status shows many unrelated deletions (.claude/.agents, wz/*.wz, chatbar-test/) from the concurrent session's OneDrive/env churn — not from this work; the real changes are GameSender.ts + UserMove.spec.ts.

# Session Summary - CUIUserList runtime fixes: WZ buttons, backgrnd2 offset, tab canvas widths

## Three runtime bugs (user-reported "fallback buttons / tabs misaligned / background off coords")
- **Buttons always fell back to Graphics**: `_mkBtn` resolves WZ subtrees through `this._uiWz`, but `initWzAssets` only stored `this._loader` — `_uiWz` stayed null for the `new UserList()`-then-init flow. Fix: `initWzAssets` now assigns `this._uiWz = uiWz` first (UserList.ts:275).
- **backgrnd2 drawn double-offset**: code did `position.set(6 - OriginX, 22 - OriginY)` but `ToPixi()` already anchors at the origin, so the top-left landed at (18,66) instead of (6,22). Fix: `position.set(0,0)` (the anchor places the origin point at the panel corner; top-left = (-OriginX,-OriginY) = (6,22)) — matches the working OptionMenu/Messenger pattern.
- **Tabs kept text-measured widths**: `_redraw` only called `_relocateCanvasWidths()` when canvas count ≠ item count; UserList has 6 of each, so the WZ widths (30/30/40/30/50/59) were never applied. Fix: new `_canvasWidthsApplied` flag so canvas tabs always relocate once (CCtrlTab.ts).
- Verified via runtime probe that every UserList asset path + loader.Load resolves (WzTextureLoader, real UI.nx); the panel's buttons use real `Main/Party/...` + `UIWindow.img/UserList/...` paths with per-button canvas origins encoding positions.

## Tests
- NEW tests/ui/game/CCtrlTab.canvas.spec.ts (2): canvas tabs lay out edge-to-edge at bitmap widths with tabSpace, relocate once when canvases set after items. Note: `new Sprite()` shares Texture.EMPTY — fake textures need `new Texture({source})` per sprite.
- Full suite **2006 pass / 6 skip** (only pre-existing e2e playwright env failure). NOTE: concurrent session committed the earlier party/alliance/gaps work as `cf3921d` mid-session, which swept up these source fixes; only the test-file tweak remains uncommitted.

# Session Summary - CUIUserList gap sweep (party sections/fill/count + alliance guild grouping + friend dialog wiring)

## IDB ground truth (live decompiles this session)
- **CTabParty::Draw @0x8C4A30** (full): online count = StringPool 2121 `"%d/%d"` (sameMap / total) right-aligned ending x=220, y=68; rcOnlineCount rect (220-20-textW,63)-(240,84) font 10. THREE member sections in order **sameMap → elseWhere → offline**; each section's LAST row uses Sheet2/2 (`_429`) as the cap, others Sheet2/1 (`_244`); the sameMap section caps ONLY when no elseWhere/offline follow (v23==count-1 && elseWhere empty). First member row at v24=105 (= SB_CONFIG.PARTY.y). Selection fill = 0xFF244768 rect at (10, v24, 230, 20). Crown: `Main/Party/icon0/1` (17x16, sameMap+offline leaders) / `icon0/0` (13x13, elseWhere leaders); text columns DrawTextA(27/117/187, v24+5), format `"%-13s   %-11s%6d"`.
- **CTabFriend::OnButtonClicked @0x8D9410**: 2015 (0x7DF) → `OnAccontMoreInfoView @0x8B7260` = `CWvsContext::UI_Open(40, -1)` (AccountMoreInfo dialog). 2017 (0x7E1) → `OnModify @0x8D90E0`: friend selected → re-adds it (regroup via Add wire keyed by name); else renames m_sCurGroup (default group blocked with SP 0x1876 notice).

## TS changes
- **`src/net/handlers/PacketArgs.ts`**: `PartyMember` + `fieldId: number`; `AllianceMember` + `guildName?: string`.
- **`src/net/handlers/FieldHandlers.ts`**: `_emitPartyData` now CAPTURES fieldIds (was decoded-then-discarded at PARTYDATA+202) and pushes `fieldId` onto each PartyMember (order: fieldIds right after bossId, BEFORE town portals — the misplaced re-read after portals was removed). `_decodeGuildDataMembers` now propagates `guildName` to each AllianceMember.
- **`src/stages/GameStage.ts`**: `onPartyLoad` classifies each member `{online, sameMap}` (offline = channel -2 || fieldId 999999999; sameMap = online && fieldId == current `_field.LoadedMapId`), passes through to setParty. Wired `onFriendAddGroup` → `GameSender.FriendSetGroup(friendNameOfSelected, group)` (regroup wire); `onAccountMoreInfo` → status-messenger line (server sends only a flag byte today — no dialog data source, documented not invented).
- **`src/ui/game/UserList.ts`**: `PartyEntry` + `online?/sameMap?`. SB_CONFIG.PARTY.y 60→105 (= v24). `_rowsParty` rewritten: sameMap/elseWhere/offline sections, per-section last-row `_429` cap (sameMap caps only when last section), SEL_FILL rect when selected, leader crown at row-local (1,1). `_rebuildHeader` PARTY branch: count `%d/%d` right-aligned ending x=220 y=68. `_rowsGuildLike` split: alliance renders ONE collapsible section per member guild (unionName plate header + Sheet3 rows), guild keeps Online/Offline sections; `setAlliance` grows `_sectionFolded` per guild. BtInfo (2015) → `onAccountMoreInfo`; BtMod (2017) → `onFriendAddGroup` (regroup selected friend); new `friendNameOfSelected` getter.

## Tests
- UserList.spec now **29**: + sameMap/elseWhere/offline section ORDER, per-section cap only when last (sameMap _244 when elseWhere follows), `%d/%d` count text, SEL_FILL on selected row, alliance per-guild header+member order + grade names, BtInfo→onAccountMoreInfo, BtMod→regroup, friendNameOfSelected. FieldHandlers.spec party fixture updated to include `fieldId`.
- tsc clean; related suites 143 pass; full suite **2003 pass / 6 skip** (only pre-existing e2e playwright env failure). 6 files modified, no WIP-file touches.

# Session Summary - CUIUserList party-tab OG sheet rework + explicit-position fix (IDB-verified)

## IDB ground truth (live CTabParty::Draw @0x8C4A30 decompile via idalib; crown string literals resolved from the exe at 0xBA8390/0xBA8330)
- **Party row plates**: `Sheet2/1` (string `_244`) for normal rows; the **section-last row** uses `Sheet2/2` (string `_429`) — OG tests `last row && no elseWhere section` to pick `_429` (sameMap loop v23==count-1 + empty elseWhere; elseWhere loop v41==count-1). Header title uses `Sheet2/0` (`_141`).
- **Party leader crown**: drawn when PARTYITEM offset +24 (leader flag) is set. SameMap/offline leaders draw `Main/Party/icon0/1` (17x16, origin 0,0) = IDA label `aUiUiwindow2Img_554`; elseWhere leaders draw `Main/Party/icon0/0` (13x13) = `aUiUiwindow2Img_570`. Crown copy at absolute x=11, y=rowY+1.
- **Party row text columns**: name `DrawTextA(27, v24+5)`, job `DrawTextA(117, v24+5)`, level `DrawTextA(187, v24+5)`; label format string `"%-13s   %-11s%6d"`. Online count rect (220-20-textW, 63)-(240,84) font 10.

## TS changes (`src/ui/game/UserList.ts`)
- `_setExplicitPos` @750 now unconditional — the `b.btn.hasWzSprite` guard was dropped so explicit-coord buttons (BtInfo 2015 @(208,285), BtFind 2016 @(10,350), Btnotice 2037 @(194,79), BtGuildBBS 2042 @(225,340)) position at their OG coords even when the WZ asset is missing (fallback path).
- New `_partyCrown` sprite loaded from `Main/Party/icon0/1` (sameMap leader crown).
- `_rowsParty` reworked to the OG sheet-variant rule: `variant = (i === last) ? 2 : 1` (Sheet2/2 for the last member, Sheet2/1 otherwise) — replaced the old invented `selected ? 1 : 0`. Leader crown sprite drawn at row-local (1,1) (= absolute 11, matching OG x=11); name text moved to row-local x=17 (= absolute 27); the `*` prefix remains only as the no-WZ fallback.

## Tests (`tests/ui/game/UserList.spec.ts`, now 21)
- + BtInfo/BtFind explicit fallback positions assert (no WZ required).
- + friend buttons 2017-2024 (excl. BtMate) disabled by default without a selection.
- + Sheet2/1-vs-Sheet2/2 last-row variant via injected sentinel plates (distinct origins).
- + leader crown sprite drawn for the boss row (and only it), positioned (1,1).

## Verification
- tsc --noEmit clean; `npx vitest run tests/ui/game/UserList.spec.ts tests/ui/game/MiniMap.party.spec.ts tests/ui/game/PartySearchDialog.spec.ts` → 36 pass; full suite **1995 pass / 6 skip**, only the pre-existing e2e playwright env failure (`@playwright/test` missing). Only UserList.ts + UserList.spec.ts modified; no WIP-file touches.

# Session Summary - WorldMap panel authentic-chrome pass (OnCreate/Draw/MakeBorder audit)

## IDB re-audit (live decompiles): OnCreate @0x9B9E10, Draw @0x9BA060, MakeBorder @0x9B6490
- **Close button UOL corrected**: OG CreateCtrl_2(2, w-22, 4) uses StringPool "UI/Basic.img/BtClose3" (was BtClose in TS).
- **Quest toggle is a REAL WZ button**: CCtrlButtonQuestToggle subclass, UOL "UI/UIWindow2.img/QuestGuide/Button/WorldMapQuestToggle" (45x12, normal/mouseOver/pressed/disabled) at (w-65, 4) - TS had an invented text Button('?'). Initial state = CConfig::GetQuestGuideOption() != 0; Button gained loadCheckedSpriteFrom() so the guide-on state latches the `pressed` art via setChecked.
- **Quest-guide option persistence**: WorldMap.Get/SetQuestGuideOption statics (localStorage 'WorldMapQuestGuide' + in-memory fallback for node tests) = CConfig::Get/SetQuestGuideOption.
- **Open sound**: OnCreate tail play_ui_sound(SP 0x500) = Sound.nx UI.img/WorldmapOpen (WorldmapClose also exists). Wired as playUiSound callback fired once per closed->open transition (_open() helper on openForField/OpenMapTransfer).
- Draw order verified already correct from prior session: base canvas raw-blit @(13,24); markers origin-anchored at (13,24); head pathImg and tail linkImg anchored at mainOrigin+(13,24). MakeBorder loop bounds confirmed (edges tile to w-64 / h-27; white fill first; title canvas at (304,0)).
- Remaining documented gap: CreateQuestGuideTip @0x9BAE80 balloon (SP 0x5AF font + 0x1A25 contents, strings known: SP6648/6649 "Shows you where you need to go...") needs the shared UIHelper::MakeBalloonTip port before it can be drawn without invention.

## Tests
- WorldMap.spec +2: quest-guide option round-trip, WorldmapOpen once-per-open-transition. Suite **1934 pass**; failures remain the concurrent session's GameStageReactor clamp refactor + pre-existing e2e playwright env issue. Client tsc clean.
# Session Summary � Outstanding-gap sweep (CUIEnchantDlg + world-map quest guide + ring tooltips)

## CUIEnchantDlg rebuilt 1:1 and wired end-to-end (was a notice-only stub)
- **IDB ground truth** (live decompiles): ctor @0x7A1B30 CreateDlg("UI/UIWindow2.img/EnchantSkill/backgrnd", wndKey 1); OnCreate @0x7A1E60 = BtCancel id2 at WZ origin(-69,-157)+AddButton offset(55,0), BtClose id2 (SP0x1962="UI/Basic.img/BtClose3") @(152,6), white-scroll checkbox id5000 @(10,158) 100x15 enabled+checked iff GetItemCount(2, 2340000)>0; Draw @0x7A0980 = say0/say1 hint strip via CopyToCanvas(0,0) per parked-item state + say2 guide @(30,158) + parked icon @(72,134); HitTest drag region ry<15.
- **The send site is FOUND** (old TODO said blocked): CDraggableItem::ModifyEquipItem @0x506360 switch(nModifyEquipType) case 0 = drop target is CUIEnchantDlg -> nEPOS=dlg.m_nSlotPosition(+0xA8), bWhiteScroll=GetWhiteScrollCheck() (=checked?2:1), bEnchantSkill = the `setz cl` result of (type==0) pushed as ecx � i.e. ONLY the enchant-dialog drop path sets it. SendUpgradeItemUseRequest has exactly ONE caller. NOTE: OG sends bWhiteScroll as 1|2, our server decodes truthily, so the TS dialog sends boolean 0/1 (documented deviation).
- SetResult @0x7A1340: success==-1 -> Notice(SP0x18E7)+re-enable; else load UIWindow2.img/EnchantSkill/Effect (26 frames 159x86 origin(-7,-68)), play_ui_sound("Enchant") (Sound.nx UI.img/Enchant confirmed), park flags until IsOKToShowResult (effect finished). ShowResult @0x7A1610: chat lType12 matrix SP{402,403,404,4006,4007,6132..6134} (white-scroll variants keyed on GetWhiteScrollCheck()==2), play_game_sound EnchantSuccess/Failure + Effect_ItemUpgrade, then re-enable / destroy-on-cursed; recoverable-fail PamsSong prompt = no system, documented.
- TS: EnchantSkill.ts full rewrite (was an invented "skill list picker" � deleted). tryAcceptDrag: equip(TI1) -> PutItem (cash reject unless /10000==180, notice SP0x108B fallback), scroll(TI Consume) while parked+!requestSent -> OnEnchantRequest(scrollSlot, equipSlot, checked) -> GameSender.UpgradeItemUseRequest(..., enchantSkill=true); SetResult->update()->ShowResult state machine; OnShowWorldEffect wired to _playUpgradeAnimAndSound (OG: bEnchantSkill branch SKIPS the generic effect presentation � jmp past it after SetResult).
- Server: UpgradeItemHandler now decodes byte(bEnchantSkill) (was dropped!) and echoes it through userItemUpgradeEffect so the client's SetResult branch fires.

## WorldMap quest guide implemented (_scoreLinkMap was a stub)
- ScoreLinkMap @0x9B83B0 + MakeCurrentMobList @0x9B7D00 + GetDeepestWorldMap_For_MobMark @0x9B8A80 decoded: score per MapLink = (+50 per mapNo == current field from MakeCurrentMobList) + (+100 per active-quest demand mob found in Etc/MapObjectInfo.img/<mapNo>/mob lists) [the OG +20/+10 npc-location terms need CNpcTemplate.m_lLocation which has no client data source � documented]. Highest link = m_pQuestGuideHighScoreWorldMap.
- WorldMap._scoreLinkMap real port: walks _links -> linked prop MapList mapNos -> etcWz mob sets; new questGuideOf callback (GameStage feeds in-progress quests' Complete.Mobs + current fieldId) + etcWz provider; on toggle ON drills into highScoreLink via navigateTo() (OG CreateWorldMapDlg(bMobMark=1) opens on that map).
- Border chrome VERIFIED already implemented (UIWindow2.img/WorldMap/Border 8 slices + title exist in NX; _makeBorder loads them); npcPos0-3 animated markers were already wired via questStateOfSpot.

## Ring tooltip partner matching wired (SetToolTip_Equip ring branch)
- IDB: the ring branch lives INSIDE SetToolTip_Equip @0x8A5670 (there is NO SetToolTip_Ring function � prior session note had a bad address): condition itemId/10000==11120 && !=1112000, then iterates CharacterData GW_CoupleRecord matching the equip's liSN (record+0x11/+0x15 vs slot+0x18/+0x1C), renders Format(SP0x2B1, pairName).
- TS: FieldHandlers SetField now forwards characterData.coupleRecords/friendRecords into args (was decoded then discarded); PacketArgs gained the fields; GameStage stores them + _ringPartnerName(itemId,itemSn) resolver wired into both EquipInventory and ItemInventory tooltip opts (ringPartnerOf); ItemTooltip.Draw takes itemSn, _buildInfoLines pushes the partner row for 1112xxx rings (SN-unknown falls back to sole record).

## Tooltip gap corrections (audit only, no invention)
- Bundle karma rows are TEXT in OG too (SetToolTip_Bundle uses GetKarmaScissorsItem/GetKarmaScissorsName + StringPool formats) � our existing text row matches; NOT canvas rows.
- Pet "dead icon": SetToolTip_Pet actually renders a dead-DATE string via GetPetDeadDate @0x889540 (pet info 'life' node SP0x781, strings 693/695, +16px layout offset) � no separate icon canvas. Our 'Dead' row covers the visible state; the formatted dead-date needs dateDead which the pet wire doesn't carry client-side � documented, not invented.
- NewYearCard tooltip rows iterate GW_NewYearCardRecord lists we don't track client-side � still wire-blocked.

## MiniMap mag � already resolved
- setMapData copies Mag_Normal/Mag_2X from MiniMapData; this WZ set carries only `mag` (verified map 10000) and MiniMapData defaults Mag_Normal=Mag, Mag_2X=Mag-1, which matches OG behavior for maps without explicit mags. No change needed.

## Tests
- NEW tests/ui/game/EnchantSkill.spec.ts (9): PutItem cash/pet-equip/worn-slot rules, checkbox enable/check semantics (GetWhiteScrollCheck 1|2), scroll-drop send with bEnchantSkill=true + requestSent guard, SetResult(-1) notice, effect->ShowResult success/white-scroll line, cursed closes dialog, category&2 override matrix.
- Full suite **1929 pass**; the 3 failures are GameStageReactor (the concurrent session's in-flight clamp refactor) + pre-existing e2e playwright env issue. Client tsc clean; server tsc clean.
# Session Summary — Messenger wire realigned to OG (server rewritten) + messenger invite accept/decline UI + guild notice/grade-title wired

## IDB ground truth (live decompiles, report in %TEMP%\opencode\messenger_wire_report.md)
- Opcodes: S→C MESSENGER = **372** (CField::OnPacket case → CUIMessenger::OnPacket @0x7F5E40); C→S = **143**.
- S→C sub-actions: 0 enter `byte slot, AvatarLook, str name, byte channel, byte isNew`; 1 self-join result `byte slot` (signed, <0 = failed → solo fallback); 2 leave `byte slot`; 3 invite `str inviterName, byte channel, int sn, byte flag` (static handler, works w/o window; flag=0 auto-declines); 4 invite result `str charName, byte accepted` (SP0x318/0x319); 5 blocked `str userName, byte reason`; **6 chat = ONE preformatted "name : text" string** (sender side formats via the literal @0xB4B88C); 7 avatar update; 8 migrated-in resync. No level/job case in v95.
- C→S senders: sub 0 Enter `Encode4(sn)` (0 = fresh open), 2 Leave, 3 Invite `str target`, 5 Decline `str inviter + str myName + byte 1`, 6 Chat `str line`.

## Server rewritten (`MessengerPacket.ts` + `MessengerHandler.ts`) — was misaligned on every count
- Old wire used request types {Open 0, Invite **1**, Leave 2, Decline **3**, Chat **5**} and packet layouts that matched neither OG nor our client decode (open carried `[int id][byte pos][count][members]`, chat carried TWO strings, invite had reversed field order).
- Now OG-exact: Enter(0)+sn → self-join reply `[1][slot]` (+ roster of `[0]` member-enter entries with AvatarLook blob to the joiner) + `[0][slot][avatar][name][ch][isNew=1]` broadcast to existing members; Leave → `[2][slot]`; Invite(3) → OG field order; Decline(5) → inviter gets `[4][name][accepted=0]`; **Chat(6) relays the preformatted string verbatim EXCLUDING the sender** (sender echoes locally per OG ProcessChat — was double-rendering before). memberEnter encodes the user's AvatarLook when available, minimal gender/skin/face blob otherwise. Server tsc clean; test/world/messenger/messengerHandler.test.ts rewritten to the new wire (6 cases incl. decline-reply + sender-exclusion).

## Client
- `MessengerRequestAction.Decline = 5` added; new `GameSender.MessengerDecline(inviter, myName)` [143][5][str][str][byte 1].
- GameStage `_onMessengerResult`: Invite case now opens the FadeYesNo dialog ("X has invited you...") storing `_pendingMessengerInvite` — Yes sends `MessengerEnter(sn)` (the server join flow fills the window), No sends MessengerDecline; Hide(4) now reads as invite accepted/declined per OG SP0x318/0x319; Join(slot<0) no longer seats a bogus self slot.
- Guild panel wired end-to-end: `GameSender.GuildSetNotice(notice)` = InHeader.GuildRequestResult(**150**) sub 0x14 + str(≤100) → server changeNotice (grade≤2 gate, broadcasts guildNoticeChanged); `_guildGradeWin.onGradeNameChange` → `GuildRankTitle(idx,title)` = 150/0x15 + byte(1..5) + str(≤10) → server changeRankTitle (leader-only, replies loadGuildDone refresh). Both were dead-ended placeholders ("needs server support"). New InHeader.GuildRequestResult=150 entry.

## Tests
- tests/net/handlers/Messenger.spec.ts +2 (MessengerDecline OG framing, GuildSetNotice/GuildRankTitle byte asserts). Suite **1949 pass**; tsc clean both repos. Remaining failures are the concurrent session's in-flight TradingRoom rewrite (325-line uncommitted diff) + GameStageReactor + pre-existing e2e playwright env issue.
- WARNING: concurrent session mid-flight again — PacketArgs MiniRoomArgs duplicate title/maxUsers fields appeared during this session (deduped); their balloon-decode improvement invalidated the old MRP_Balloon spec fixture (updated to type0-destroy + roomId/title/pwd/gameSpec/curUsers/maxUsers/gameOn tail).

# Session Summary — NPC shop (CShopDlg) rebuilt 1:1 from the IDB (UI + buy/sell/recharge flows)

## IDB audit basis (live decompiles, report in %TEMP%\opencode\npcshop_ui_report.md; member table OnCreate 0x6E7540 / Draw 0x6E9610 / DrawBuyItem 0x6E8600 / DrawSellItem 0x6E56F0 / DrawMoney 0x6E6FE0 / SetShopDlg 0x6EAB00 / SetSellItems 0x6E9790 / SendBuyRequest 0x6E9BB0 / SendSellRequest 0x6E7260 / SendRechargeRequest 0x6E4E90 / GetItemIndexFromPoint 0x6E3C00 / AskItemCount 0x6E5220 / SetRet 0x6E4B80)
- Window = single UI/UIWindow2.img/Shop/backgrnd canvas 465x328 (+backgrnd2/3 origin-offset layers); HitTest drag region ry<64. Controls: BtExit id2 / BtBuy id1000 / BtSell id1001 (origin-placed, origins (-158,-25)/(-158,-45)/(-390,-45)); TabBuy id1002 @(10,91) w222 h19 (1 tab + "Recommended" added by SetShopDlg only when non-empty, then auto-selected); TabSell id1003 @(241,91) 214x19 five tabs c→TI {0:1,1:2,2:4,3:3,4:5}; SBBuy(214,115,len203) SBSell(445,115,len203); BtRecharge ids 2000+i created lazily per visible sell row that is a star/bullet with unitPrice>0.
- Grid: 5 rows pitch42 first top y=115 (hit band <325); buy col x=10, sell col x=241; select canvas blit at (47|278,rowTop); icon origin-blit at (12|243,rowTop+34) + grade frame for equips; name maxW152 at (53|284,+2); meso bag (50,+21) price text (68,+21) format_integer+SP6849 suffix; sell value text (284,+22) = ceil(stock*unitPrice)+basePrice (NO client-side /2 — server applies the cut); recharge sell text right-aligned end x=440 (discount pair ending 438 w/ strike-through + FONT_SMALL_RED); stack digits via image font; money right-aligned ending x=450 y=67.
- SetShopDlg decode: int npcTemplateID, short count, per item int itemID/int price/byte discountRate/int tokenID/int tokenPrice/int itemPeriod/int levelLimited/[double unitPrice if id/10000∈{207,233} else short qty]/short maxPerSlot. Stars/bullets→m_aRechargeItem always; priced→m_aBuyItem; equips (GetType==1) w/o token ALSO →Recommended iff |lv−reqLv|≤5 ∧ jobBit=1<<((job%1000)/100−1) match ∧ gender match (original index kept in m_anOriginalIndex).
- Sends ALL opcode 66: BUY [0][short pos][int itemId][short count][int price] (pos=recommended?m_anOriginalIndex[sel]:sel; OG sends discounted price but our server validates raw → send raw); SELL [1][short pos][int itemId][short count]; RECHARGE [2][short pos]; CLOSE [3] sent unconditionally from SetRet. Buy flow: level gates (SP0x154F/0x154E) → treat_singly||maxPerSlot>1 : YesNo else AskItemCount(default 1,max nMaxPerSlot, INPUT_NO 10 digits) → meso check SP0x1A8B; token path YesNo(SP0x1551)+cost check SP5438. Sell flow: IsProtectedItem(SP0xD78) → treat_singly YesNo(SP0x363,count=1) else AskItemCount(default=max=nStock). Recharge: NO count modal — always FULL stack; client precomputes deficit×entry.unitPrice just for the YesNo display. m_bShopRequestSent gate cleared by result.
- Result opcode 365 sub-codes: 0=silent success (re-select sold slot via snapshot diff-scroll); 1/5/9, 2/10, 3, 13, 14(int −amt Format), 15(int amt), 16, 17, 18, 19(byte+optional str) notices.

## Client rebuild (`src/ui/game/Shop.ts` full rewrite)
- Was an invented placeholder (Graphics tabs 290x260, wrong geometry, no recharge). Now: WZ backdrops/buttons per OG table, CCtrlTab for TabBuy/TabSell, ScrollBar pair, exact grid/draw/money geometry, select-canvas blits, meso-bag+price rows, discount strike-through rendering (server still sends rate 0), token-price icon swap, lazy per-row BtRecharge buttons (position inferred ~(398,rowTop+11) — DrawSellItem's CreateCtrl args were register-garbled), down-select/up-fire mouse model, ESC/Enter swallowed while open.
- Flows routed through injected `modals` facade implemented by GameStage._utilDlg (yesNo / askCount mirroring AskItemCount INPUT_NO(def,1,max,0,10,0)). setResolvers grew opts {equipInfoOf(ItemAttr ReqLevel/ReqJob via ItemIconLoader.LoadAttr), itemPriceOf(ItemInfoService.GetItemPrice), countItemOf}; new setUserData(level,job,gender), getRechargeEntry, NotifyResult(resultType) with OG sub-code text map, onRequestSellList(ti) callback.
- GameStage wiring: _onShopOpen passes userData+resolvers+meso+recenters; new _refreshShopSellList(ti) builds SellItems from ItemInventory.itemAt(tab,slot) slots 1..128 with GetItemPrice base/unit math and recharge-entry deficit pricing (OG SetSellItems port); _onShopResult routes case 0 to silent refresh (sell list + meso re-sync) and everything else through NotifyResult.

## Wire/server (verified already matched, no changes needed)
- Client senders ShopBuy/ShopSell/ShopRecharge/ShopClose (opcode 66 family) byte-match server ShopDialog.handleBuy/handleSell/handleRecharge incl. strict price echo validation; SetShopDlg encode matches the OG field order incl. unitPrice-double branch + mastery slotMax bonus. Server ShopResult codes align with OG 365 sub-codes.

## Tests
- NEW tests/ui/game/Shop.panel.spec.ts (12): discountByRate rounding, SetShopDlg list classification + original-index map, recommended auto-tab, grid hit rects, stacked-buy YesNo send (raw price), recommended-tab pos remap, sell ask-count default=nStock, recharge confirm→slot, request-sent gate reset on NotifyResult, level gates, result notice matrix, Escape close. Fixed stale MiniRoom.spec MRP_Balloon test to the concurrent session's improved balloon wire (type0 destroy early-out + roomId/title/pwd/gameSpec/curUsers/maxUsers/gameOn tail). Deduped MiniRoomArgs title/maxUsers duplicates from that same session's edit.
- tsc clean (remaining EnchantSkill/GameStageReactor errors belong to the concurrent session's mid-flight refactor). Suite: **1928 pass**; failures are GameStageReactor (theirs) + pre-existing e2e playwright env issue.

# Session Summary — Personal shop (CPersonalShopDlg) rebuilt 1:1 from the IDB + wire/server completion

## IDB audit basis (live v95 decompiles, reports in %TEMP%\opencode\pshop_ui_report.md / pshop_packets_report.md)
- CPersonalShopDlg: ctor 0x69E6C0 (CreateDlg "UI/UIWindow2.img/PersonalShop/main/backgrnd", wndKey 1), OnCreate 0x69EBA0, Draw 0x698D50, GetItemIndexFromPoint 0x697B90 (rows x[10,208] y[161+42i,200+42i], 5 rows, absIdx=scrollPos+i), GetRectIndexFromPoint 0x698240, SetScrollBar 0x697C20 (m_bOpen vs visitor range formulas), Update 0x69B340 (OWNER auto-kicks visitors idle >0x36EE80=1h via [144][29][slot][name]), OnButtonClicked 0x69C080 (1001 Start→DeliverBlackList+OnStart, 1002 Close, 1003 Buy, 1004 Info, 1005 SoldDlg, 1006 chat submit, 1007-1009 Ban[1-3] @(302/394/486,117) start hidden, 1010 Exit → SetRet(2)=leave [144][10]), CPutItemDlg 0x69CE70 ("saleAdd": count@(101,32)/price@(111,51)/set@(111,70) 59x14 edits + "sell in sets" checkbox @(9,91); validation order set→count→count%set==0(SP434)→price ≤0x7FFFFFFF; wire bundles=count/set), CSoldItemDlg 0x69BD00 ("saleList" scrollbar(197,27,len226), 4 rows pitch58: name x50 y+29/buyer y+46/price y+63). BuyItem @0x69A7F0 gates: visitor-only, stock, 500ms throttle, divisible-by-set input modal (default nSet*nNumber, 10 digits) → YesNo total confirm → [144][23][byte idx][short bundles][int ItemCRC]. ItemCRC = memoized per-template WZ content hash (server discards it). Tax display tiers @0x697920: 0/.4/.9/1.5/2/2.5/3% at ≥100k/1M/5M/10M/25M/100M. Chat: edit id1013 @(225,325) 211x15 white bg #555555 text; log area (225,163,270,150) 9 lines at (227,165+k*16), wrap 256px w/ 4-space continuation, 1000-line cap, NO black backdrop for personal shop. Draw: title @(23,10) BASIC_BLACK_B maxW496; owner name centered (57−w/2,134) cap83; money right-aligned end x=204 y=133; selection canvas blit @(47,rowTop) only when in stock; icon @(12,rowTop+2); sold-out veil = rect(...,0x80FFFFFF) (m_pSoldOut canvas exists but is UNUSED by OG Draw!); qty digits SP0x50E at (11,184+42i) showing nNumber*nSet; price line fonts PERSONALSHOP_1_s..6_s tiered by magnitude.

## Client rebuild (`src/ui/game/PersonalShop.ts` full rewrite)
- Was a Graphics placeholder with window.prompt x3 for listing. Now WZ-driven from UIWindow2.img/PersonalShop/{main,saleAdd,saleList}: backdrops, Button.fromWz per the OG AddButton table (origin-placed buttons get container pos (0,0) — WZ origin self-places), ScrollBar(197,160,204)/(488,161,155), TextField chat edit, exact grid/chat/draw geometry above. Owner/visitor visibility model per OnEnterResult (owner: Start-when-closed/Close-when-open/Item/Ban-per-seated-visitor; visitor: Buy/Info/Exit). PutItemDialog port (saleAdd layout + validation order + bundles/set math). SoldItemDialog port (4-row history fed by NotifySoldItem records + totSold/totReceived with OG tax tiers). Buy flow routed through GameStage._utilDlg exactly like meso-drop: INPUT_NO(default setSize*setCount, min=set) → divisible-by-set check → YESNO total confirm → ShopBuyItem(idx,bundles). Owner clicking a listed row withdraws it (MoveItemToInventory). Escape closes put/sold dialogs first. setResolvers(nameOf, iconOf(WzSprite), moneyOf) wired both in _initPanels and on OpenAsVisitor.
- New API kept compatible: OpenAsOwner/OpenAsVisitor/Refresh/AcceptBuyResult/SetShopStatus/NotifySoldItem/pendingItem (+stackSize now); added myPosition getter, OnUserEnter(slot,name), OnUserLeave(slot), OnMoveItemResult(index), ClosedByServer(reason) with OG leave-reason text table, AddChatText (wrap+cap+autosnap), getItem, setSelfName, setMoney.

## Wire completion
- New senders: ShopMoveItemToInventory [144][27][short idx] (OG 0x6987A0), ShopBan [144][28][byte slot][str name] (OG 0x69B1C0), ShopKickTimeOver [144][29][...] (OG Update idle sweep), ShopDeliverBlackList [144][30][short count][names] (OG 0x69B0D0). ShopBuyItem already matched OG framing.
- FieldHandlers.handleMiniRoom: MRP_Enter (enterBase) now decoded (byte slot + AvatarCodec avatar + name + job — was skipped); PSP_MoveItemToInventory decoded (server builder writes byte newSize + short removedIndex; OG decodes only count and shifts slot 0). MiniRoomArgs gained userName/job/newSize.
- GameStage._onMiniRoom: roomType-4 open no longer double-calls OpenAsOwner then OpenAsVisitor (owner got _isOwner clobbered); owner path sets selfName+money; case 8 MRP_UserChat → shop.AddChatText; case 10 leave branches self (ClosedByServer w/ reason) vs other visitors (OnUserLeave); case 27 → OnMoveItemResult; _toShopItemSlots resolves real item names via nameService (was "[itemId]" placeholders).

## Server (`PersonalShop.ts` miniroom handler)
- Added PSP_Ban + PSP_KickedTimeOver cases (were unhandled → console.error drop): owner-only, validates slot occupancy AND that the claimed name matches the seated visitor (stale client view can't kick whoever took the seat), broadcasts MRP_Leave(idx, Kicked|KickedTimeOver), clears dialog, removes user, updateBalloon. Server tsc clean; server mocha still hangs env-wide so new test/world/miniroom/personalShop.test.ts (4 cases incl. non-owner reject + name-mismatch reject) is verified by tsc only.

## Tests
- tests/ui/game/PersonalShop.spec.ts rewritten (16): grid hit-test geometry + scroll anchor, mode visibility matrix, ban/kick sends, 1h idle-kick timer, chat wrap/submit, withdraw send, move-result splice, tax tiers, NotifySoldItem multiplier (m_aItem is POSITIONAL — old test's out-of-range index only worked via the removed .find()).
- tests/net/handlers/MiniRoom.spec.ts +2 (MRP_Enter enterBase decode w/ AvatarCodec.EncodeAvatarLook blob, PSP_MoveItemToInventory decode). **1885 pass**; remaining failures are the concurrent session's ScreenMsg/GameStageReactor specs + pre-existing e2e playwright env issue. Client tsc clean.

# Session Summary - Upgrade dialogs wired end-to-end (open triggers + real opcode-93/94/95 wire + OG effect)

## WARNING: concurrent session overwrote GameStage mid-flight again
- While this session worked, the other session's save reverted GameStage.ts (and briefly FieldHandlers/PacketArgs/OpCodes/GameSender) to pre-edit buffers; everything below was re-applied on top of the CURRENT tree. The stash@{0} mix still exists - do not blind-pop. Remaining tsc errors in GameStage (_centerFadeYesNo, InitialQuiz GamePanel) belong to that session's in-flight FadeYesNoDialog refactor, NOT this work. Server mocha hangs environment-wide right now (even single files, "describe is not defined" under vitest) - server verified via tsc only.

## Open triggers implemented (OG SendConsumeCashItemUseRequest @0x9EB3E0 case table)
- IDB ground truth: get_consume_cash_item_type = get_cashslot_item_type(@0x488C70, itemId/10000 switch) with validity filter; case 0x40(=64, prefix 552 Scissors of Karma) -> CUIKarmaDlg(nPOS, nItemID); case 0x43(=67, prefix 557 Vicious' Hammer) -> CUIItemUpgrade(packet copy, nPOS, nItemID) stored on field->m_pItemUpgrade; cases 0x1A/0x41 -> CUIItemProtector(packet copy, int info.<SP 0x1ACA>); case 0x47 -> CUIVega(packet, nItemID%10). Guard everywhere: no CUniqueModeless open (else StringPool 0x98 chat notice lType 12), HP>0, 500ms excl-request throttle.
- _dispatchCashItem: case 64 -> KarmaScissors.Open(slot,itemId), case 67 -> GoldHammer.Open(slot,itemId) (was _scrollDialog), 26/65 -> ItemProtector.Open(slot,itemId).
- Dialog API aligned to UpgradeDialogs.drag.spec contract: Open(scrollPos?, scrollItemId?) seeds + clears target; hasValidTarget getter; tryAcceptDrag stores payload invType as TargetItemTI (server inventoryTypeByValue wants 0..5, was storing p.itemId = garbage) and KarmaScissors additionally requires invType===Equip && slotPos>=0.

## Regular scrolls moved OFF opcode 85 onto the real OG wire
- CRITICAL FIX: regular upgrade scrolls (204xxxx) were sent via ItemUpgradeApply on opcode 85, but our server dispatches 85 to CashItemHandler which DISPOSES non-cash items - scrolls never worked end-to-end.
- New InHeader: UserUpgradeItemUseRequest=93 / Hyper=94 / Option=95 (CP_UserUpgradeItemUseRequest 0x5D-0x5F). OG wires (decompiled 0x9D6260/0x9D6130/0x9D6000): 93 = int(ts) short(usePos) short(equipPos) short(bWhiteScroll) byte(bEnchantSkill); 94/95 = int(ts) short(usePos) short(equipPos) byte(bEnchantSkill). NO itemIds on the wire - both sides resolve by slot.
- ItemScrollDialog.OnUpgrade signature now (scrollPos, scrollItemId, targetSlotPos, targetItemId); GameStage routes /100==20493 -> Hyper, ==20494 -> Option, else Upgrade sender. Dialog stores _targetItemId (was _targetItemTI=itemId bug) + CompleteUpgrade(resultByte,result,iuc) hook.
- Server UpgradeItemHandler decodes rewritten to those exact layouts (validates scroll/equip from slots), white-scroll semantic on regular-scroll failure (consume 2340000, keep slot), cursed equips removed via InventoryOperation.delItem, and every outcome now ALSO writes ITEM_UPGRADE_RESULT(425) echo byte61/int(result 0|1|2)/int(iuc).

## Effect completion loop
- Server signals scroll outcomes through USER_ITEM_UPGRADE_EFFECT(186) (+ InventoryOperation); client _showItemUpgradeEffect now drives _scrollDialog.CompleteUpgrade for the local user (61/-1) so the gauge/result state machine finishes, plus the previously-implemented chat matrix + Enchant anim/sound.

## Tests
- Targeted: IdaNewGaps (corrected 7-field 186 packet), ItemUpgrade (7), UpgradeDialogs.drag (9), GameStageUpgradeEffect (4) all pass; client tsc clean except the parallel session's FadeYesNo/InitialQuiz errors; server tsc clean.

# Session Summary - Cash shop main-tab click fix (s_nCSW_Tab_Left) + missing sub-actions implemented

## Main tabs: clicks were off because the layout was guessed
- Old code assumed an even 508/9=56px split with hits along the bottom 22px. Real client: CCSWnd_Tab::GetTabIndex @0x4C62C0 uses static s_nCSW_Tab_Left (read from the binary @0xC56798): per-category lefts {1:(57,69) 2:(107,119) 3:(157,169) 4:(209,220) 5:(260,272) 6:(311,323) 7:(362,374) 8:(3,3) 9:(451,451)} - column [0] when the category is LEFT of the selection, [1] when right (selected tab pops wider, pushing later tabs +12px); cat 8 = Event tab at far-left x=3. Hit band window-local ry in [22,53), width 51px, selected category never returned.
- Ported exactly as CashShopStage._tabIndexFromPoint + CSW_TAB_LEFTS/TAB_HIT_* constants; onMouseButton routes through it.

## WARNING: commit f312bba (other session) landed a STALE CashShopStage.ts that reverted ALL inventory work
- The CharacterData-backed _getInvItems, OG mouse model (down=SetSelectedNo/up=MoveStoL), scroll semantics, tooltips and expansion gating were re-applied on top of the committed file. Coordinate before touching CashShopStage.ts again.

## Server handleCashItemRequest: every client sender now answered
- sub 27 QueryCash was falling through UNHANDLED (client sends it inside opcode 275, not recv 274) -> status bar stayed 0 until a purchase. Now mirrors handleQueryCash.
- sub 1 LoadGift -> 0x5A empty (no gift-claim system; giftCommodity delivers directly).
- subs 2/5 wishlist load/set persisted via new accounts.cash_wish column (ensureColumn ALTER guard) -> 0x5C/0x62 ten-int echo.
- sub 10 IncSlotCount -> loads CharacterData, getInventoryByType(invType).setSize(min(size+4,96)), saveCharacter -> 0x6D byte invType + short newSize; 0x6E failure at cap.
- sub 11 IncTrunkCount -> new AccountDB.getTrunkCount/setTrunkCount (accounts.trunk_count default 4, cap 120) -> 0x6F short.
- sub 8/9 coupons -> clean 0x69 reason 0 while no coupon system exists.
- LoadLockerDone trunk count now reads the persisted value instead of account?.trunkCount ?? 4.
- Client case 0x6D also updates _characterData.inventorySize[invType] so the snapshot stays in sync.

## Tests
- cashShopInventory.test.ts grown to 11: + balance sub 27, wishlist load/save echo, slot expansion persist + 96 cap, trunk expansion cap, coupon fail.
- Client: CashShopStage.spec 57/57 (incl s_nCSW_Tab_Left click table), inventory spec 10/10, Paging pass; tsc clean. Server test/server 37 passing except pre-existing shopDialog module-load error.

# Session Summary - Free Market wired end-to-end (portal scripts resolve, shop create fixed, balloon click-to-enter)

## Audit: the FM chain existed in pieces; two breaks kept it dead
- **Portal scripts never resolved**: `ScriptManager.startPortalScript` only looked at `ScriptRegistry.portal` (empty) while every generator — including `FreeMarket.ts`'s market00..market24 warpers — is registered into `NpcScriptRegistry` by `world/script/npc/index.ts`. Fixed: portal dispatch falls back to NpcScriptRegistry. Town `market00` portals (pt=7 script portals) now warp to 910000000 and set QR 7600 (the kinoko FreeMarket table); FM's out00 warps back to the stored town.
- **Shop-create packet shape was wrong**: `/shop <title>` sent the omok-style create (title+password+gameSpec) where OG carries `str title, byte 0, short nPOS, int nItemID`. New `GameSender.MiniRoomCreatePersonalShop(title, itemId)` sends the exact shape; `/shop` and double-clicking item **5140000** (Regular Store Permit, Setup tab) both use it. Server-side gates already correct: room maps 910000001+ carry WZ `personalShop=1` (entrance 910000000 does NOT — shops open in rooms reached via hidden in01..in31 portals), permit ownership, spot-overlap via MiniRoomPool.

## Balloon → click-to-enter
- Client `handleUserMiniRoomBalloon` decode was wrong: read type then skipped a byte before title. Real layout (kinoko UserPacket.userMiniRoomBalloon): int charId, byte type — **type 0 = destroy, no further fields** — else int dwMiniRoomSN, str title, bPrivate, nGameKind, nCurUsers, nMaxUsers, bGameOn. Fixed for both user + employee balloons.
- GameStage balloon branch now stores `MiniRoomId`/`MiniRoomType` on OtherCharLook (new public fields), clears them on destroy, and the player context menu gains an "Enter Shop"/"Enter Trade" entry that sends `MRP_Enter(dwMiniRoomSN)`.
- Room-entry flow verified present: MRP_EnterResult roomType 4 opens OpenAsOwner/OpenAsVisitor with item remap.

## Tests
- NEW tests/stages/FreeMarket.spec.ts (5): shop-create wire shape (144/MRP_Create/type-4/title/0/nPOS/permit), balloon attach decode w/ dwMiniRoomSN, destroy variant stops early, OtherCharLook room-id accessors, MRP_Enter framing.
- Server: scriptDispatch.test.ts +2 (marketNN resolves through the NPC registry fallback; unknown scripts return false). NOTE: standalone mocha runs hang env-wide again (npc/index import chain blocks without full boot) — server verified via tsc.

**1951 tests pass**, tsc clean (client + server); remaining failures are the concurrent session's reactor work + the pre-existing e2e playwright env issue.

# Session Summary - CUIScreenMsg full audit + pickup text rebuilt (right-bottom stack)

## Full CUIScreenMsg decompile sweep (ctor @0x83D8B0 / LayoutScrMsg @0x83D440 / MoveScrMsg @0x83D630 / ScrMsg_Add @0x83DC40)
- SIX 290x14 strips anchored to Origin_RB: entry k at (viewW - 296, viewH - 172 + 14k); base y = -235 when CUIStatusBar::CQuickSlot::IsSlideUp. Text RIGHT-ALIGNED inside the strip (x = 290 - CalcTextWidth), black outline pass at (+1,+1) under FONT_BASIC_WHITE / FONT_BASIC_YELLOW main pass; alpha pops to 255 instantly, fades from currentTime + 1500ms. At >=6 messages the OLDEST layer is recycled head->tail.
- OnDropPickUpMessage @0x9FE190 renders EVERY branch through ScrMsg_Add with exact StringPool strings (decoded via stringpool-dump.mjs): money SP303 "You have gained mesos (+%d)" (+ SP304 "Internet Cafe Meso Bonus (+%d)" yellow when short>0; bExtra logs SP5265 chat lType 8); item qty<=1 SP5443 "You have gained an item in the %s tab (%s)" else SP5442 "...(%s %d)" using GetItemTypeName tab names; -2 SP3026 "This item is unavailable for pick-up."; -3 SP5337 scr msg + SP5331 chat lType12; default SP308 "You can't get anymore items."

## TS changes
- StatusMessenger.ts rewritten as the faithful port: 290px right-aligned strips at bottom-right (-296/-172), 14px pitch, 6-slot recycle, 1500ms hold + fade; new `ScrMsgAdd(text, yellow)`; relayout(viewW,viewH) wired in GameStage.onResize.
- GameStage.onLootMessage rewired to the OG strings/branches above (was invented "+N meso"/"NamexN" toasts); LootMessageArgs gained extra/cafeBonus (FieldHandlers money decode no longer discards those bytes).
- Known gap: CheckQuestCompleteByMeso has no data source (QuestReq parses no meso demand) — documented, not invented.

## Tests
- NEW tests/ui/game/ScreenMsg.spec.ts (5): RB anchor math, 14px stacking order, 6-slot recycle keeps newest, hold/fade timing, right-align + outline offsets.

**1902 tests pass**, tsc clean; remaining failures are the concurrent session's reactor work + the pre-existing e2e playwright env issue.

# Session Summary - CWvsContext gap sweep (chat-log messages, quest notices, follow, shortcut menu, quiz, memo)

## Audit: all ~300 CWvsContext members diffed against the TS client (IDA + name scan)
- Most were already ported across GameStage/FieldHandlers/GameSender/services. Real gaps found and now implemented:

## Message(38) sub-opcodes rerouted to the OG chat log (were loot toasts)
- OnIncMoneyMessage @0x9FE910: SP303 "You have gained mesos (+%d)" / SP305 "You have lost mesos. (%d)" via ChatLogAdd(lType=7). OnCashItemExpire @0x9F8060 / OnGeneralItemExpire / OnItemProtectExpire: SP309 "[%s] has passed its expiration date..." lType 12. OnSkillExpire @0x9F8440: SP5266 "%s has disappeared as the time limit has passed." lType 12. All strings decoded from the client's embedded StringPool (stringpool-dump.mjs).
- OnMessage sub-table confirmed from OnPacket decompile (A06C90): cases 0-14.

## Quest progress notices (CNoticeQuestProgress) - NEW NoticeQuestProgress.ts
- OG flow: CheckQuestCompleteByItem/ByMob diff counts and call OnQuestProgressUpdated_Item @0x66DCE0 / _Mob @0x66F6B0, which fill m_aNoticeChange[5] entries with a 3000ms per-entry dedup window; entries render "<name> <cur>/<demand>".
- TS: top-center overlay, 5 slots, same dedup/expiry; hooks = InventoryOperation Add ops (item demands via QuestInfoService.GetQuestByItemDemand + ItemInventory.countItem) and onQuestRecord value-string diffs (3-chars-per-mob format, old vs new).

## Follow system wired end-to-end
- C->S SendFollowCharacterRequest @0x9F9530 is opcode **134** (was 139 in OpCodes.ts); SendFollowRequestApply @0x9F4690 = opcode **138** (int id, byte apply, deny tail); OnMemoNotify_Receive @0x9F3830 = C->S **154** Encode1(2). Server recv enums already matched (134/138/154); RANDOM_MORPH moved to its real 184.
- S->C SetPassengerRequest(126) is the "X wants to follow you" request (int requesterId, was decoded as npcId) -> FadeYesNo dialog (SP5849 text "%s has requested to follow you...") -> FollowRequestApply. UserFollowCharacter(193) decode fixed to OG CUser::OnFollowCharacter @0x8E3220: int charId + int driverId; driverId==0 detaches with byte bTransferField (+int x,y teleport). Local attach snaps to driver and re-snaps when >400/300px away; remote followers snap once. FindFriend(134) S->C decode fixed to OG sub-opcode dispatch (6/8/9+errbyte/11).

## NEW UI panels (authentic WZ assets + IDB coords)
- ShortCutMenu.ts = CUIShortCutMenu::OnCreate @0x7EF480: 7 buttons (ids 1000-1006) from UI/StatusBar2.img/mainBar/Menu/Bt{Item,Equip,Stat,Skill,Community,Quest,MSN} at y=20+25i over the 3-piece backgrnd strip (34px top + stretched 1px middle + 41px bottom); SetResult @0x7EE460 mapping idx->[0,1,2,3,7,6,8]; key 8 opens Messenger, rest route to _executeMenuAction. Opened via menu case 48 (OG UseFuncKeyMapped/UI_ShortCut).
- InitialQuiz.ts = CUIInitialQuiz: backgrnd UI/UIWindow.img/InitialQuiz (288x229), CCtrlEdit at (109,157) 150x13 white/black Arial (SP6693), BtOK 'UI/Basic.img/BtOK2' (SP1298) at (241,199); OnInitialQuiz @0x9FFAD0 decode (flag/title/problem/hint/int/int/timeSec); SendResult @0x7900D0 = opcode 65 sub 6 + string with m_bResultSent guard; countdown auto-submits empty. Capture-modal key/mouse routing in GameStage.
- Reused the existing FadeYesNo panel for the follow request (no new dialog); Memo panel already existed - sub 7 now auto-fetches the list (C->S 154), sub 5 shows SP2752/2690/2691 send-result notices.

## Tests
- NEW tests/stages/CWvsContextFeatures.spec.ts (11): follow attach/detach/teleport decodes, opcode-138 accept/deny framing, memo request, shortcut-menu mapping + click-to-toggle, notice dedup/expiry/cap-5, quiz single-submit + timeout auto-submit.
- IdaDumpAudit.spec updated to the corrected SetPassengerRequest/FindFriend decodes.

**1882 tests pass**, tsc clean in all touched files (remaining failures are the concurrent session's reactor work + the pre-existing e2e playwright env issue). WARNING: the other session's commit f312bba swept up this session's mid-flight edits - reconcile deliberately before reverting anything.

# Session Summary - Karma scissors (Scissors of Karma) wired end-to-end + opcode-85 server decode fixes

## The feature existed in pieces; the wire was broken at every hop
- **Entry point** (OG `CWvsContext::SendConsumeCashItemUseRequest` case 0x40): cash type 64 = item prefix **552** (5520000 "Scissors of Karma", 5520001 "Platinum Scissors of Karma" — verified in String.nx/Cash.img). `GameStage._dispatchCashItem` now has case 64 -> `_karmaScissors.Open(slot, itemId)` (OG ctor takes nPOS/nItemID); previously it fell through to a direct UseItem send.
- **Client drag target**: `KarmaScissors.tryAcceptDrag` now requires `invType === InventoryType.Equip && slotPos > 0` and stores `TargetItemTI = p.invType` (=1 on the wire). The old code stored **p.itemId as TargetItemTI** — the packet sent the item's id where the server expects an inventory type. Same fix applied to GoldHammer/ItemProtector (kinoko ITEMUPGRADE/KARMASCISSORS both decode int targetType via `InventoryType.getByValue`). GameStage's OnConfirm now guards on `ks.hasValidTarget` before sending.
- **Server id table was wrong**: `cashItemTypeByItemId` mapped invented ids (5100000 hammer, 5110000-5112000 scissors) that don't exist in this WZ set. Now prefix 557 -> VICIOUS_HAMMER, prefix 552 -> KARMA_SCISSORS (matches kinoko CashItemType + client get_cashslot_item_type).
- **Server opcode-85 decode was broken for ALL cash items**: the handler never decoded the leading `int(update_time)` every OG sender writes — position/itemId read garbage. Fixed at the top of `handleUserConsumeCashItemUseRequest`.
- **handleKarmaScissors layout fixed**: reads `int targetType, int targetPosition` (was short equipPosition), resolves inventory via `inventoryTypeByValue`+`inventoryTypeByPosition` (supports worn EQUIPPED targets like kinoko), keeps the already-KARMA'd guard, consumes scissors with show=false then updates the equip op show=true. handleViciousHammer got the same treatment + skips kinoko's second update_time int.

## Tests
- Server: `test/world/item/cashItemHandler.test.ts` rebuilt around the real wire format (ts-prefix helpers, 5520000/5570000, target TI/POS ints) — 16 passing, incl. invalid-target-type dispose, double-scissors dispose, no-equipData dispose. NOTE: PacketWriter.writeInt is int32 — use fixed constants, not Date.now(), in test helpers.
- Client: `tests/ui/game/UpgradeDialogs.drag.spec.ts` rewritten to pin TI=invType semantics (was pinning the itemId-as-TI bug) + new KarmaScissors Open/clears-target/non-equip/worn-slot cases. UpgradeDialogs.drag + ItemUpgrade suites pass.

## WARNING for future sessions - concurrent-session stash hazard
While this session worked, ANOTHER agent session was editing the same repo. A `git stash` cycle captured ~965 lines across 21 files into **stash@{0} (still present, NOT dropped)** — it mixes this karma work (already re-applied manually) with other sessions' FieldHandlers/PacketArgs/CashShopStage/GameStageReactor changes that are NOT currently in the working tree. Reconcile deliberately (`git stash show -p stash@{0}`) only when no other session is live; do not blind-pop. Full-suite failures in CashShopStage.inventory / GameStageReactor / GameStageUpgradeEffect / IdaDumpAudit / IdaNewGaps / e2e belong to those stashed/untracked change sets, not to karma work.



## The inventory was hollow end-to-end; now it works
- **SetCashShop (143) carried NO data**: server handleMigrateIn wrote only the opcode, so the client decoded an empty CharacterData and every inventory tab was blank. ShopServer now loads the full CharacterData via CharacterDB.loadCharacter(charId) and sends the real packet: CharacterData.encode + cashShopAuthorized=1 + empty nexonClubId/saleInfo + 0x438 zero best array + stock/limit/zeroGoods=0 + eventOn=0 + highest char level.
- **characterId threaded through the migrate chain**: channelServer CASH_SHOP_MIGRATE_REQUEST now appends charData.getCharacterId(); center CashShopMigrateHandler forwards it in the CASH_SHOP_HANDOFF; shop pendingMigrations is Map<sessionId,{accountId,characterId}> and entry.characterId feeds all handlers.

## Server handleCashItemRequest fixes
- **sub 0 was HIJACKED by a dead gift branch** (client sub 0 = LoadLocker; gifts are subs 4/33) - removed. Sub 0 now answers 0x58 LoadLockerDone: short count + count x GW_CashItemInfo(55: itemId@0/sn@4/qty@8) from cash_items rows with character_id=0 + trunk/slot counters.
- **subs 6/7 (MoveLtoS/MoveStoL) implemented** via new AccountDB.moveCashItem/getCashItems/getHighestCharacterLevel: moves cash_items rows between locker (0) and character_id; success = 0x77 (short slot + struct) / 0x79 (struct), failure = 0x78/0x7A reason 1; no bound character rejects outright.
- Self-purchase (sub 3) now inserts with characterId so bought items land in the inventory tab (client BuyDone already appended them to _cashInventoryItems).

## Client CCSWnd_Inventory 1:1 (CashShopStage.ts)
- **_getInvItems rewritten** to read the DECODED CharacterData arrays (equipInventory/consumeInventory/installInventory/etcInventory/cashInventory as {slot,item} sorted by slot); liCashItemSN.lowPart = Number(itemSn & 0xffffffff); cash tab merges session purchases not yet in the snapshot.
- **OG mouse model replaces the double-click heuristic**: OnMouseButton msg 513 - GetSlotPositionFromPoint over visible [FirstPosition..FirstPosition+12), SetSelectedNo ONLY for items with a cash SN (absolute slot index now, draw compares startIdx+cellIdx); msg 515 - release over a cash item fires OnMoveCashItemStoL immediately, one request in flight (_stoLRequestSent cleared on 0x77/0x79/0x78/0x7A). SetSelectedNo auto-scroll keeps the selected row visible ([row-2..row] window).
- **Scroll semantics per OnTabChanged @0x4BD8F0/OnChildNotify @0x4C4160**: range = floor(tableSize/4)+1, FirstPosition = 4*pos+1 (TS 0-based pos*4), per-tab ms_anItemScrollPos[5] remembered and restored on tab switch.
- **Hover tooltips**: OG OnMouseMove @0x4BEEC0 ShowItemToolTip for IsCashInvItem at cursor+(0,20) via ToolTip.setToolTipString2 (item name), ClearToolTip otherwise; tooltip container added to uiRoot on enter, removed on exit.
- **Expansion gating** per EnableExButton @0x4BD9D0: slot-expansion buttons blocked past 96 used slots with a status message instead of sending.

## Tests
- NEW tests/stages/CashShopStage.inventory.spec.ts (10): tab mapping/sort/quantity/cashSN-lowPart/purchase merge, SetSelectedNo absolute slots + row clamp scroll, cash-only select gate, mouse-up single StoL send + guard, non-cash no-send, 96-slot expansion block/send.
- NEW server test/server/shop/cashShopInventory.test.ts (5): 0x58 locker layout, 0x79/0x77 move framing + DB args, failure reasons, unbound-character rejection. cashShop.test.ts updated for the characterId field in MIGRATE_REQUEST.
- Client suite: only pre-existing failures remain (e2e playwright env, IdaDumpAudit npcId/FindFriend + UpgradeDialogs.drag from another in-flight change set - verified failing with my changes stashed). Server: 31/31 in test/server except the pre-existing shopDialog module-load error.

# Session Summary - Scroll audit (item upgrade effect wired 1:1, scrollbar/camera/chat verified)

## Scope: all four "scroll" areas audited; only the item-upgrade effect had real gaps
- **Item upgrade scrolls**: packet flow already existed end-to-end (GameSender.ItemUpgradeApply/KarmaApply/ItemProtectorApply opcode 85 family, ItemUpgradeResult(425) handler + ItemScrollDialog gauge/effect frames, UpgradeItemHandler on the server). THE GAP was CUser::ShowItemUpgradeEffect presentation.
- **UI scrollbar**: ScrollBar.ts is already a solid CCtrlScrollBar port (ScrHitTest thumb grid formula, DoPrevNextBar page step max(range/16,16), VScr1-10 WZ variants, repeat timers) - no changes.
- **Camera**: GameCamera already 1:1 (native-engine style 1:1 follow + map-bounds clamp + Effect_Tremble shake) - no changes.
- **Chat/list scroll**: ChatBar already has OG _RefreshChatLog auto-scroll (5s m_dwLastScrolled snap-to-bottom), per-tab ms_anItemScrollPos persistence in ItemInventory - no changes.

## ShowItemUpgradeEffect fixed to the IDB decompile (@0x8E7B00)
- **Client decode was WRONG**: read charId+byte result+conditional itemId. Real OG decode (after the charId dispatcher int): byte bSuccess, byte bCursed, byte bEnchantSkill, int nEnchantCategory, byte bWhiteScroll, byte bRecoverable - exactly what server UserPacket.userItemUpgradeEffect writes. Hyper/option variants decode success/cursed/enchantSkill/category only (matches their server builders). PacketArgs interfaces updated accordingly.
- **Presentation implemented in GameStage** (_showItemUpgradeEffect/_playUpgradeAnimAndSound): local user gets StringPool chat lines (lType 12; ids resolved via nx-tools/stringpool-dump.mjs: 402=0x192 success, 403=0x193 fail, 404=0x194 destroyed, 4006/4007=white-scroll variants, 6132-6134=enchant-category&2 lines); EVERY viewer gets play_game_sound("EnchantSuccess"/"EnchantFailure") (SP0x507/0x508) + the BasicEff.img/En/{Success 21f|Failure 16f} animation via SkillEffectOverlay.PlayAtCaster (= OG Effect_ItemUpgrade on m_pLayerUnderFace at user pos). bEnchantSkill routes to CUIEnchantDlg in OG (not built) - we show only the -1 "cannot use a Scroll" notice. Replaced the old status-badge placeholders for all three opcodes.
- NX verified: Effect.nx BasicEff.img has NO ItemUpgrade node - the real asset is Enchant/{Success,Failure}; Sound.nx Game.img has EnchantSuccess/EnchantFailure (+_Delay variants).

## Tests
- NEW tests/stages/GameStageUpgradeEffect.spec.ts (4): local success message matrix + Success anim + sound, cursed/white-scroll/enchant-category lines, remote = no chat but anim+sound, enchantSkill/-1 skip.
- Updated IdaNewGaps.spec upgrade packet to the corrected 7-field wire. **1843 tests pass**, tsc clean; only pre-existing e2e playwright env failure remains.

# Session Summary - Community panel + Messenger + Guild grade window rebuilt 1:1 (IDA)

## CUIMessenger full authentic rewrite (Messenger.ts, this session)
- IDB: SetLayer @0x7F1920 / SetCtrl @0x7F34C0 / DrawTextA @0x7F2A90 / AddChatText @0x7F4250 / DrawStatusBar @0x7F4BA0 / OnKey @0x7F6400 / ProcessChat+HandleSlashCommand @0x7F6140/@0x7F5EE0. THREE states (m_nState): 0=Max 295x355, 1=Min chat-only 295x243, 2=Min2 title strip 209x20; BtMin cycles (s+1)%3, BtMax (s-1)%3.
- Chrome per state: backgrnd/backgrnd2/backgrnd3 from UIWindow2.img/Messenger/{Max|Min|Min2}; close = Basic.img/BtClose3 (SP0x1962) at (276,6) states 0/1, (191,3) state 2. LayoutMan buttons take positions from canvas ORIGIN nodes: Max|Min/BtMin(1001) BtMax(1002, disabled while max) BtClame(1004->SendClaim) BtEnter(1003, disabled until text).
- Chat edit id1005 at (11,307) s0 / (11,195) s1, 212x13 white bg black Arial(SP6693); scrollbar id1006 x=275 y=150 len148 s0 / y=57 len129 s1; visible lines 9/8/0. Chat lines x=12, y=(state!=0?60:155)+i*16.
- AddChatText color map: BASIC_WHITE->SMALL_DIMBLUE(#2000FF case28), BLACK->SMALL_RED(#FF2020 case34), GRAY->DIMGREEN(#336600 case42), else SMALL_BLACK(case20); wrap budget 240px w/ 4-space continuation indent. Welcome block on open ("[ Maple Messenger Help ]" etc). Status strip = member names ","-joined + " is typing." truncated 252px at (29, iconY=332|220). History max8 dedup; Up/Down recall. /q /Q quit, /invite X -> MessengerInvite; Enter submits via onSubmit -> GameSender.MessengerChat; selfName wired from stat packet.
- Avatars/chatBalloon NOT ported (server packet carries no AvatarLook - documented gap).

## CUIUserList community panel rebuild (UserList.ts)
- IDB: OnCreate @0x8DB080 (tab ctrl id2001 type8 at **(9,25) 250x19** - was (8,9)), SetButton @0x8B76E0 (hide-all/show-active model, Friend BtMate idx13 permanently hidden), SetScrollBar @0x8B7920 (id2000 x=243 wheelRange235; Friend{115,160,base0} Party{60,225,117} Exped{60,225,28} Guild/Alliance{100,185,105} Block{60,228,27}; range=(base+20*count-h)<=0?0:floor(/20)+2), per-tab OnButtonClicked switches (@0x8D9410/@0x8D85B0/@0x8D5310/@0x8CCFC0/@0x8D0B50) gave every button id: Friend 2010-2024 (BtInfo/BtFind from UIWindow.img/UserList/Friend at explicit (208,285)/(10,350)), Party 2200-2208, Guild 2030-2042 (+Btnotice 2037@(194,79), BtGuildBBS 2042@(225,340) via SP0xEC5), Alliance 2050-2060, Block 2150/2151, Expedition ids 12-22.
- Fonts verified: FONT_DODOOMCHE_11_WHITE/BLACK/GRAY90 (=get_basic_font cases 94/95/96 #FFFFFF/#000000/#909090) + Arial-11 customs computed from OnCreate immediates: blocked #D10000, online #555555, offline #CBCBCB, location #666666, grays #B5B5B5/#777777. Full get_basic_font case->color table extracted (98 cases, AARRGGBB).
- Rendering: friend two-column groups (cellW=113, colX 1|115, Sheet1 plates, fold icons BtSheetIOpen/IClose, "(n)" header right-aligned ending x242 y68, location line "My Location - %s" @(10,285)); party rows "%-13s %-11s%6d" on Sheet2; guild/alliance Online/Offline sections on guildOn/guildOff|guildName 230x25 plates with expand/collapse + Sheet3 rows with Name[2]/Job[64]/Level[127 lvNumber digits pitch12 offline alpha 0xB4]/Grade[155] columns + notice text @(14,84); selection fill #244768 white text; blacklist rows; expedition sub-party groups.
- CCtrlTab gained setCanvasItems(selected[], normal[]) = OG AddItem_Canvas (Tab/enabled=selected, Tab/disabled=normal canvases render instead of Graphics boxes).
- New callbacks wired in GameStage: onPartySearch(BtSearch->UI_Toggle21)->_partySearchDialog.Open(), onGuildGradeChange(2033/2034 rank +/-1 via _guildRankOf->GuildLevel), onGuildSetNotice/onGuildFindUser/onFriendMemo/onFriendChat/onFriendAddGroup/onPartyHpToggle/onPartyChangeBoss/onPartyChat hooks. v95 has NO inline guild-create button (13 buttons exactly) - creation is the separate Guild_Make dialog.

## NEW GuildGradeWindow.ts (CWndGuildGrade/CWndAllianceGrade)
- CUIUserList::ToggleGuildInfo @0x8D1B30 spawns CWndGuildGrade at (community right edge, top); ctor @0x8CD140 CreateWnd 264x382; alliance OnCreate @0x8CE650: backgrnd from UserList/GuildInfo, BtEdit id2140/BtSave id2141 by origin, grades SP3296 Master/SP3297 Jr.Master/SP6297 Member x3. TS: grade row click edits, Save fires onGradeNameChange(1-based idx, name).

## Tests
- Rewrote tests/ui/game/UserList.spec.ts for the new structure (17): tab geometry (9,25,250,19), OG button ids per tab, SetButton visibility model incl hidden BtMate, selection-gated enables, kick/board/grade-change/invite actions, online/offline sections w/ grades, party leader marker, friend group fold + count header position, block add/delete.
- NEW tests/ui/game/Messenger.authentic.spec.ts (7): welcome block, 3-state cycle, 240px wrap + 4-space continuation, ProcessChat echo+/q+/invite, Escape TryDelete, history recall, status strip (29,332).
- NEW tests/ui/game/GuildGradeWindow.spec.ts (3). Pixi note: TextStyle.fill rejects ARGB numbers > 0xFFFFFF - convert to '#RRGGBB'.

**1836 tests pass**, tsc clean; only pre-existing e2e playwright env failure remains.

# Session Summary - Weapon hold + single-fire melee + climb freeze + idle regen (IDA)

## Weapon hold root cause (polearm invisible while standing) - FIXED
- IDB: CAvatar::NotifyAvatarModified @0x46BB20 sets m_nStandType/m_nWalkType/m_nAttackActionType from the weapon's Character/<weapon>.img entry (`stand`/`walk`/`attack` fields, barehand fallback = 1392000); CAvatar::MoveAction2RawAction @0x45FA30 maps move idx 1 -> `walkType != 1 ? walk2 : walk1` and idx 2 -> `(standType != 1) + 2` -> stand2/stand1. Polearm 1442000 has stand=2/walk=2 and ONLY stand2/walk2 nodes (verified NX) - playing stand1 leaves the weapon with nothing to draw and the stand1/walk1 fallbacks all miss.
- ROOT CAUSE: GameStage creates a NEW PlayerController per field load (@5206) AFTER `_applyPendingEquipped` already ran and cleared itself -> WeaponStand/Walk reset to 1 on every map change. Fix: new `_syncWeaponStance()` (reads _equip.equippedWeaponItemId or AvatarLook slot 11 via ActionMan.GetCharacterImgEntry) called right after `new PlayerController`.
- REMOTE chars never showed variants at all: MoveActionToStance collapsed wire idx 2->Stand1 / 1->Walk1 always and mis-decoded idx 3 as Walk2. Fixed: MoveActionToStance(moveAction, weaponStand=1, weaponWalk=1) re-expands variants; idx 3 -> Stance.Fall (new enum member + StanceToWzKey 'fall'); FieldHandlers gained `weaponTypesOf(charId)` callback wired from GameStage._remoteWeaponTypes (remote char's own weapon entry); _onUserEnter now decodes the initial moveAction through the same path + SetFacing.

## Melee attack: once per press + planted swing - FIXED
- IDB: CUserLocal::HandleCtrlKeyDown @0x9326B0 fires the attack on Ctrl KEY-DOWN only, gated by `get_update_time() - m_tLastCtrlDown >= 200` plus TryDoingNormalAttack's IsOnPlayingOneTimeAction gate (holding does not machine-gun swings).
- TS: attack trigger changed from held-key poll (`attackDown` every frame) to key-down EDGE (`_attackWasDown`) keeping the cooldown + one-time-action gates.
- Movement during swing: GameStage now sets `_meleeSwingActive` + `physics.InputLocked = true` in _tryMeleeAttack; released when CharLook's one-time action finishes. PlayerController.InputLocked forces dir=0, blocks jump edge AND ladder grab while locked (gravity/decel still run). NOTE: OG actually allows walking during the swing animation (prior-session finding) - this is a deliberate user-requested deviation.

## Ladder/rope anim only advances while moving - FIXED
- IDB: CAvatar::Update @0x46C050 - for raw actions 45(ladder)/46(rope)/129/130(ghost) frames advance ONLY when `m_ptPos.y != m_ptPosPrev.y`; otherwise `tCurFrameRemain = 0` every frame (frozen). Same rule for morph actions 9/10.
- TS: CharLook.UpdateFromPhysics(dt, stance, facingLeft, climbMoving=true) stores `_climbMoving`; _advanceFrame pins frame+timer when action is ladder/rope and !climbMoving. GameStage passes `this._physics.ClimbMoving`. New public getters CharLook.Frame/CurrentAction for tests.

## Idle HP/MP recovery - IMPLEMENTED (was missing entirely)
- IDB: CWvsContext::TryRecovery @0x9D4020 runs every frame from Update @0x9EA7F0: requires HP<MaxHP, position unchanged since previous frame, stand-family action (is_stand_action @0x45F170 = raw 2/3/48-54/125); timers += 30/call until >= 10000 then heals rate*10 HP (rate*3 MP, chair x1.5, nOption=2) via SendStatChangeRequest @0x9F2A00 (opcode 100: int time, int mask=0x1400, short hp, short mp, byte option).
- TS: GameStage._updateIdleRecovery(dtMs) mirrors it exactly (10s stationary threshold, rate 1.0 default -> 10 HP / 3 MP per tick, sit x1.5 + option 2); server already handles opcode 100 (UserHandler.handleUserChangeStatRequest -> addHp/addMp). No map info/recovery parsed client-side yet (documented gap).

## Tests
- NEW tests/character/WeaponStance.spec.ts (8): variant re-expansion incl. facing bit, idx3=Fall regression, other OG indices, InputLocked plants position + blocks jump, env-gated real-NX polearm/sword nStand/nWalk + ladder freeze/advance through WZ delays.
- NEW tests/stages/GameStageIdleRecovery.spec.ts (4): recovery packet after 10s stationary (opcode 100 header), moving resets timers, non-stand stance no recovery, _tryMeleeAttack sets lock+swing flag+cooldown.
- Updated stale Stance.dead.spec assertion (idx3 Walk2 -> Fall).

**1830 tests pass** (MAPLECLAUDE_NX_DIR=wz_client), tsc clean; only pre-existing e2e playwright suite-load failure remains.

# Session Summary - Star force row + karma/scroll tooltip audit (IDA)

## Star force rendering implemented (SetToolTip_Equip pNumberStar, this session)
- IDB: SetToolTip_Equip @0x8A5670 has a PDB-named `pNumberStar` local - the enhancement byte (secure GW_ItemSlotEquip+0x10B = iuc) gates loading a 13x13 star canvas via StringPool 0x806 = "UI/UIWindow.img/ToolTip/Equip/Star" + 0x807 = child "Star"; count*13 width math in disasm; name row shifts down one band.
- TS: replaced the invented text row with real WZ star blits - one `TooltipAssets.Get('Star/Star')` sprite per StarForce level at x=10+i*13, y=6; yName (and every derived Y + total height) shifts +16 when stars present. Data source already existed (ItemIconLoader maps StarForce = equip.iuc from the server packet).
- Tests: +2 (3 stars at 13px pitch + name at y=26; zero stars keeps y=10).

## Karma / scissors / trade-block / scroll audit (full SetToolTip_Equip decompile saved)
- Saved ida_output/settooltip_equip_full.txt (96KB). Findings:
  - Trade-option desc block: merged segments from IsOnlyItem(SP709)/IsQuestItem(710)/IsPartyQuestItem(711)/IsTradeBlockItem(712|713)/IsBindedWhenEquiped(716)/IsOnlyEquipItem(5300)/AccountSharable(5223)/NotExtend(5299) drawn word-wrapped font10 x=10 w=221. Marriage rings overwrite it (SP 0x108C).
  - Karma: GetAppliableKarmaType!=0 appends SP4682 "<scissors name>" segment.
  - Upgrade rows: enchant-category(&2) CHUC row "%d"/"%d (+%d)"/"%d (MAX)"; non-enchant maxed SP5075; non-enchant remaining SP5074 (= our "Upgrades: N"). No hammer/SOK/scroll-history rendering beyond these.
  - Epic items get a RED translucent tooltip bg: MakeLayer color 0xA0400000 vs navy 0xCC0E395A.
- NOT implementable yet (data-source gaps, verified by NX scans): this v95 NX set has NO tradeBlock/quest/only/accountSharable/karma/enchantCategory/epic fields on any equip info node scanned (Shoes/Coat/Weapon/Cap/Glove), and the server packet does not carry them per-instance. Rows can never trigger without a data source - documented, not invented. Revisit if server adds these flags to the item wire or a later WZ set is used.

**1794 tests pass**, tsc clean (only pre-existing e2e playwright env failure).

# Session Summary - ToolTip OG 1:1 chrome + SetToolTip_SetItem side panel

## Tooltip visual chrome fixed (this session, IDB-verified)
- **Background was missing its border entirely**: InitCanvas @0x880960 exact port now draws (1) ARGB 0xCC0E395A fill (all MakeLayer callers pass this - dark navy @ alpha 0xCC), (2) opaque white 1x1 pixels at all 4 corners, (3) when bDoubleOutline (equip/bundle/skill/pet/ring) a white 1px inner frame: left(1,2,1,h-4), right(w-2,2,1,h-4), top(2,1,w-4,1), bottom(2,h-2,w-4,1). Simple string tooltips get corners only.
- **Font face was monospace**: now Arial (StringPool 6693 face from ctor @0x8839C0; SP8 for STAN/SKILL). All 25 font colors/sizes re-verified against ctor: heights 12 (HL/Gen/H), 9 (Stan_*), 11 (Skill_*); HL_Green exists as member but GetFontByType never returns it.
- **_measureText was text.length*7**: now real canvas measureText with 7px/char fallback - fixes every centered/right-aligned row and word-wrap width.

## SetToolTip_SetItem / AddToolTip_SetItem ported (@0x8A4090 / @0x8A4D10)
- Set-item info is NO LONGER invented inline rows in the equip tooltip body. OG renders a SECOND window beside the equip tooltip; ItemTooltip._drawSetItemPanel does exactly that:
  - Width 236 (SetBasicInfo(1,236,0,0)); placed right of main window, flips left when overflowing viewW (AddToolTip_SetItem screen clamp).
  - Set name centered y=10 GEN_GREEN; member rows from y=35 step 16px: name left truncated to width-catW-20, "(Category)" right-aligned, worn members GEN_WHITE + unworn GEN_GRAY2 (OG reads CharacterData.m_mEquippedSetItem; TS GameStage._setPanelItems computes from EquipInventory.equippedItemIds()).
  - Separator dots then effect tiers: "<N> Set Effect" header (GEN_GREEN active / GRAY2 inactive) + one row per positive stat in OG _Basic order (STR DEX INT LUK MaxHP MaxMP W/M.Attack W/M.Defense ACC EVA Craft Speed Jump Knockback).
- Data pipeline already existed (ItemInfoService.RegisterSetItemInfo parses Etc.nx/SetItemInfo.img: setItemName/completeCount/ItemID/Effect tiers); only presentation was wrong.
- Text pool 128 -> 224 to fit panel rows. Tests updated (set-item rows removed from _buildInfoLines expectations) + new side-panel tests (member rows/worn color/category right-align/effect headers/left-flip).

## Verified already-done (no change)
- drawDiscountRate already renders WZ discount digit sprites with text fallback.
- Craft (EVA..Speed slot) and Knockback percent row (after Jump, "N%") were already wired from ItemAttr IncCraft/Knockback.

## Remaining tooltip gaps (smaller, documented)
- Growth EXP bar fill + IncLevel display in DrawToolTip_Equip; ring image blit + couple/friend/marriage record matching (SetToolTip_Ring); bundle karma/NewYearCard/cash-title canvas rows; skill swallow/linked-char/expiry/DamageMeter sections; pet dead-icon canvas. Slip/warm rows have no v95 WZ data source in this NX set (no preventSlip/warm info fields on any shoe/glove scanned) so they can never trigger - not implemented.

**1792 tests pass**, tsc clean (only pre-existing e2e playwright env failure).

# Session Summary - WorldMap rich tooltip + spot data pipeline (SetToolTip_WorldMap)

## World map tooltip rebuilt to OG SetToolTip_WorldMap @0x896980 layout
- Was: basic setToolTipString2(title, desc) - just two text lines.
- Now: custom Pixi Container tooltip with the full OG row layout:
  1. Title (street+map composite, centered, bold)
  2. Description (word-wrapped at 230px)
  3. Divider line
  4. Quest-in-progress row (yellow, when quest toggle on + quest active)
  5. Mob list (name+level per row, from current field life data)
  6. NPC list (names, from current field life data)
  7. User list (char names, from other players on map)

## Spot data pipeline
- WorldMapSpot extended with streetName/mapName/mapDesc/mobs/npcs/users/questName/questExtra fields.
- New WorldMap.setSpotFieldData(fieldId, mobs, npcs, users, street, name) populates spots matching the loaded field.
- GameStage._toggleWorldMap now calls this after openForField with live data from _mobs/_npcs/_otherChars + nameService.

## Tooltip rendering
- Self-contained Container built per hover target change (cached by cursor pos).
- Width = max(250 with desc / 180 without, title width + 20, widest row + 35), clamped [140,320].
- Background: dark fill (0x080A14 alpha 0.92) + border stroke.
- All rows are Text nodes added to a single Container; destroyed and rebuilt on hover change.
# Session Summary - Premium revive variants wired (IDA CUIRevive::OnCreate)

## Kind selection + premium assets implemented per CUIRevive::OnCreate @0x83CEA0
- GameStage._updateReviveDialog now picks the kind: SoulStone buff active (ss.buff.soulStone > 0) -> Open('soulStone') [Notice/4]; Wheel of Destiny (item 5510000) in inventory -> Open('wheelOfDestiny') [Notice/2]; else Open() town [Notice/0].
- Revive._loadAssetsForKind(kind) actually loads the WZ assets now: swaps the background canvas to Notice/4 or Notice/2 and wires btCancle for premium variants (town has none per OG).
- btOK / Enter key pass premium = (kind !== 'town') to OnRevive -> GameSender.Revive(fieldKey, premium). Auto-revive stays non-premium town.
- Defensive optional chaining so test harnesses without game.fieldHandlers don't throw.

**1790 tests pass** (MAPLECLAUDE_NX_DIR=wz_client), tsc clean; only e2e playwright env load-error remains.
# Session Summary - Server test suite fully green (282 passing / 0 failing)

## Root causes fixed (all stale tests vs corrected handlers, no handler regressions)
- **Guild tests**: createGuildRequest wrote byte 0 (LoadGuild) but OG GuildRequestType.CreateGuild = 1 - every guild test was dispatching to loadGuild on an empty manager. Byte fixed; all 13 pass.
- **ViewAllChar test**: wrote a 6-field char prefix but readCharData parses the FULL stat block (pet SNs, stats, SP, exp/pop/tempExp/posMap/portal/playTime/subJob/family/rank/equips). Test now writes the complete blob; count byte 1 verified.
- **CashShop migrate test mock**: CenterServer fake lacked workerSessions Map (handler gained a handoff forward). Added.
- **Social group-message test**: helper wrote the OLD layout (names as strings, no update_time) vs OG SendGroupMessage str(time)+byte type+byte count+int[] ids+str(text); also the channel fake lacked getUserByCharacterId. Both fixed.
- **.mocharc.json** added with 10s per-test timeout (mocha default is 2s).

## Earlier this session: THE BIG ONE
- WzPackage._existsAsync used fetch(path) for existence in Node 18+ where fetch exists but relative paths are not URLs -> silent fallback to ENCRYPTED .wz files (garbage names). Fixed: fs fileExists first when process.versions.node. This made CashCommodityTable parse all 12,318 entries and likely fixes any other OpenBaseAsync consumer that had both .nx and .wz on disk.
- AES.transform now returns data; MigrateResult expects SELECT_CHARACTER_RESULT(12); login mock gained spwPendingStore.

## Verification
- Server: **282 passing / 2 pending / 0 failing**
- Client: **1790 passing**, tsc clean both repos
# Session Summary - Outstanding IDB items swept (MCP verified up first)

## IDA MCP: v95 database attached and responsive - all lookups live-decompiled this session.

## Item 1: 10-min auto-revive timeout - ALREADY PORTED
- Fresh decompile of CUIRevive::Update @0x83CE70 confirms: if (timeGetTime() - m_tWaitRevive > 0x927C0) Revive(0). 0x927C0 = 600000ms exactly matches the existing Revive.ts AutoReviveTimeoutMs + auto-_acceptRevive(false) in update(). No change needed.

## Item 2: corpse 'spin' Rotate(0, 2000) - RESOLVED, no spin exists
- IWzVector2D::Rotate @0x4385E0 signature is (dAngleAmount: double, nTime: variant) - a TWEEN, not an instant rotation. OnSetDead's Rotate(0.0, 2000) = animate the corpse vector's angle TO 0.0 degrees over 2000ms. From a starting angle of 0 this produces no visible rotation - it is a placeholder/hold tween alongside the tomb drop. The TS port needs no spin; the prior 'unverifiable visual' note is closed with an IDA answer.

## Item 3: quiz answers server dispatch - FIXED
- Server handleNpcTalkMore (channelServer.ts) had no ASKQUIZ/ASKSPEEDQUIZ case - client ScriptAnswerText(AskQuiz, text) hit the default warn and was dropped. Added both cases: action===1 -> ScriptAnswer.withTextAnswer(action, mapleAsciiString), else withAction(-1), mirroring the ASKTEXT path. Server tsc clean.
# Session Summary - Emotion flow verified end-to-end + regression tests (the _actionToFk fix was the missing piece)

## Wire format verified clean client<->server (no encoding changes needed)
- Client GameSender.UserEmotion writes short(56) int(emotion) int(duration) byte(byItem); server handleUserEmotion reads readInt/readInt/readBoolean - match. Server broadcasts UserRemote.emotion: short(219) int(charId) int(int) int duration bool - client handleUserEmotion decodes charId/emotion/duration/byItem in the same order. Opcodes 56/219/232 all line up. Packet tests already existed (tests/net/handlers/Emotion.spec.ts).
- The actual break was CLIENT-ONLY: _actionToFk never mapped ids 55..61, so F1-F7 keypresses died at isActionDown before any packet was sent.

## Regression tests added (tests/ui/game/KeyConfig.emotion.spec.ts, 5)
- _actionToFk resolves Emotion1..7 to Menu records; isActionDown fires on F1/F7.
- GameStage.onKeyPress(F1) -> UserEmotion(1) packet bytes + local SetEmotion called.
- Morph gate blocks send+face; 2000ms cooldown enforced.

**1789 tests pass** (MAPLECLAUDE_NX_DIR=wz_client), tsc clean; only pre-existing e2e playwright env failure + CashCommodityTable data-set gap remain.
# Session Summary - Name-tag flip fix + emotion keys fixed (F1-F7 now work)

## Name tag was flipping with the avatar
- CharLook._updateNameTag adds _nameTagGroup as a child of container, and container itself flips with facing (scale �1) - so the whole tag mirrored. Fix: counter-flip _nameTagGroup.scale.x = this.container.scale.x so plate + text never mirror. Remote OtherCharLook tags live on the unflipped wrapper - unaffected.

## Emotions were dead: _actionToFk never mapped Emotion1..7
- KeyConfig default map binds F1-F7 scancodes 59..65 to Menu-type ids 55..61 (= KeyAction.Emotion1..7), but KeyConfig._actionToFk only handled Menu 0-29 and BasicAction 50-54 - Emotion lookups returned null, so isActionDown(EmotionN) was always false and F1-F7 did nothing.
- Fix: _actionToFk now returns { type: Menu, id } for ids 55..61. Verified F1-F7 scancode mapping ('F1'=59..'F7'=65) and default-map overwrite order (BasicMotion 100-106 first, then Menu 55-61 wins).
- Full chain verified: keypress -> _sendEmotionChange (morph gate + 2s cooldown + <=0x17) -> UserEmotion packet (int/int/byte, matches server read) -> optimistic CharLook.SetEmotion -> WZ face frames (Face/<face>/<emotion>/<n>/face confirmed in Character.nx); server broadcasts UserRemote.emotion to others -> other.SetEmotion.

**1784 tests pass** (MAPLECLAUDE_NX_DIR=wz_client), tsc clean; only pre-existing e2e playwright env failure + CashCommodityTable data-set gap remain.
# Session Summary - Character name tag restyled (translucent black bubble)

## User spec: 'translucent black bubble with a thin dark border and white lettering' for characters - NOT the white IDA-fallback rect, NOT a WZ asset
- CharLook._updateNameTag + OtherCharLook._drawTagRect now draw: black fill at alpha 0.55, thin 0x1A1A1A border stroke at alpha 0.85 (1px), white Arial 12 text centered. Plate = textW + 14 wide, fontH(12)+6 tall. Guild mark still composites left on guild plates. No flips.
- AvatarAnchors.spec updated: local tag asserts _nameTagGroup children + no mirror; remote name y=18 pinned.

**1784 tests pass** (MAPLECLAUDE_NX_DIR=wz_client), tsc clean.
# Session Summary - Name tags corrected to the IDA hand-drawn plate (cash-shop mixup fixed)

## User report: tag looked like a cash-shop item. IDA confirmed why
- Full MakeNameTag @0x5CF5E0 decompile (saved ida_output/clife_makenametag_full.txt) + StringPool decode show type 1000 loads UI/NameTag/%d where %d = m_nNameTagType = the CASH-SHOP name-tag style index - NameTag.img children 10..28 are cash styles, NOT per-type plates. My earlier 'keyed by tagType/100' mapping was wrong.
- The DEFAULT (non-cash) tag for ALL types is HAND-DRAWN: width = textW + pad + 5, height = fontH(12) + 4, white fill + DrawRectangle 0xB2FFFFFF translucent ring, text Arial 12 FONT_BASIC_WHITE centered at y-2. Types 1004/1005/1007 NEVER load WZ at all; 1006 loads UI/NameTag.img/medal/<medalTag-from-item-info>.
- Zero flip logic anywhere in MakeNameTag - removing counter-flips was correct.

## Rebuilt to the hand-drawn plate
- OtherCharLook._drawWcePlate replaced by _drawTagRect(text, y, mark?, slot, prevHeight): white rect + translucent ring, Arial 12 white centered, guild mark composited left when present; tags stack off previous tag height (name 10, guild/medal follow). No flips anywhere.
- CharLook local player: same hand-drawn plate via _updateNameTag; SetNameTagPieces/_nameTagWce removed along with GameStage's NameTag.img wiring.
- Pixi note: 0xB2FFFFFF exceeds 32-bit -> stroke({ color: 0xFFFFFF, alpha: 0xB2/255 }).
- Tests: AvatarAnchors.spec rewritten for the group/text shape (+canvas shim), remote name y=16 pinned.

**1784 tests pass** (MAPLECLAUDE_NX_DIR=wz_client), tsc clean.
# Session Summary - Name tag plate fixes (cash-shop look + flip anchors)

## Why the tag looked like a cash-shop item + never appeared
- CharLook.charName was a plain FIELD - setting it (from the stat packet) never triggered _updateNameTag, so the authentic NameTag.img/10 plate only appeared after some other avatar rebuild. charName is now a get/set property; the setter calls _updateNameTag() immediately.
- With WZ pieces wired the plate now renders every time the name is set - no more yellow fallback text (the cash-shop-looking one).

## Flip anchor fix (both local and remote)
- Previous code counter-flipped the whole plate group with container.scale.x, mirroring the text. OG CLife::MakeNameTag renders tags as separate UI layers anchored to the character position - they NEVER mirror with avatar facing. Removed every tag scale.x flip in CharLook._updateNameTag and OtherCharLook._drawWcePlate; plates are built symmetric around x=0 so they stay centered under the feet either direction, text always reads left-to-right.
- AvatarAnchors.spec local-tag test updated to pin scale.x === 1 regardless of facing.

**1784 tests pass** (MAPLECLAUDE_NX_DIR=wz_client), tsc clean.
# Session Summary - Name/guild/medal tags rebuilt from NameTag.img + EULA gate disabled

## EULA disabled (per user request, before tag work)
- Server loginService ToS gate now if (false && !tos) - logins proceed regardless of ToS state; CONFIRM_EULA/SET_GENDER handlers stay registered for future re-enable. Client CheckPassword already sent tos=true.

## Name tags rebuilt to authentic CLife::MakeNameTag plates
- **UI.nx NameTag.img discovered**: 28 3-piece plate sets keyed by tagType/100 - 10 = character name (1000), 14 = guild (1004), 16 = medal (1006); each child has w/c/e canvases with origins plus a clr int = text color (white for all three). GuildMark.img also mapped: BackGround/<bgId D8>/<colorIdx> = 17x17 bg canvases, Mark/<category>/<markId>/<color> = 15x15.
- **OtherCharLook**: LoadSprites now loads the 10/14/16 w/c/e sets from UI.nx into _nameTagWce. New _drawWcePlate(typeKey, text, y, mark?) builds each plate per draw: left cap + stretched middle + right cap, text in clr color centered, guild plate optionally carrying the mark bg sprite (_loadGuildMarkSprites probes GuildMark.img/BackGround/<pad8>/<color>, cached). Legacy yellow-text fields (_nameText/_guildText/_medalText) kept alive as fallback when WZ pieces are missing and for test consumers.
- **CharLook (local player)**: new SetNameTagPieces(w,c,e,clr); _updateNameTag builds the same NameTag.img/10 plate when pieces are wired (GameStage._loadWzAsync wires them from this._uiWz after loading), falling back to plain text otherwise.

**1784 tests pass** (MAPLECLAUDE_NX_DIR=wz_client), tsc clean both repos; only pre-existing e2e playwright env failure + CashCommodityTable data-set gap remain.
# Session Summary - Login-flow missing-asset sweep + ToS/gender dialogs wired end-to-end

## Missing WZ assets now consumed (sweep results)
- Login.img/Common: frame(used)/step 1-5(used in select stages)/SoftKey(SoftKeyOverlay)/BtStart+BtStart2+BtWselect(char-select start buttons) all consumed; BtDisableSPW/BtEnableSPW/loginlocation/shadow remain server-feature-gated or decorative - documented, not missing UI.
- GameGrade/GameGrade canvas: game-grading overlay for regions with grading laws; not applicable to private-server flow - documented.
- Gender/* subtree: v95 gender-confirm modal (backgrnd/text/DropBox/BtYes/BtNo). NOT yet consumed - CharCreationStage picks gender inline via MakeCharInfo rows. Documented as the one remaining optional dialog; SET_GENDER wire path is now live end-to-end (below).
- TOS/0 canvas: now consumed by the new ToS dialog (below).

## ToS dialog implemented end-to-end (was a dead-end notice before)
- Server: loginService now sends getLoginFailed(2) (OG nGradeCode=2) when account tos=false; new ConfirmEulaHandler (opcode 7) acks CONFIRM_EULA_RESULT(5) byte1/byte0 and marks tos accepted on the session record; SetGenderHandler (opcode 8) records gender; both registered in LoginServerPacketDelegator. Server tsc clean.
- Client: LoginStage._showTosDialog renders Login.img/TOS/0 centered with Basic.img/BtYes2/BtNo2 at the panel bottom; accept sends ConfirmEULA(true), deny false; onConfirmEulaResult closes the dialog and re-sends CheckPassword (stored id/pw fields) so the accepted account proceeds through PIN/world select. Cleanup wired into onExit.
# Session Summary - Login flow audit (login/world/char select/creation/PIN)

## Audit scope: all login-flow stages vs IDB + Login.img WZ
- **LoginStage**: already authentic - signboard/ID/PW/check canvases + BtLogin/BtLoginIDSave/BtLoginIDLost/BtPasswdLost/BtNew/BtHomePage/BtQuit all fromWz at Login.img/Title, MapLogin1.img scene, Basic.img/Cursor, UI.img button sounds, OG CUITitle::SetRet length gates. The one Graphics fill is the letterbox behind the map scene (not a UI element).
- **WorldSelectStage**: authentic; the two Graphics uses are the full-screen dim behind the channel panel and the dynamic population-gauge fill over the WZ gauge frame - both match OG behavior, no canvas replaced.
- **CharSelectStage**: name plate was a custom black Graphics rect + Arial text. Replaced with the WZ CharSelect/nameTag 3-piece plate (left/mid-stretched/right), variant 1 on the selected slot / 0 otherwise, per CUICharSelect::Draw. All other assets (charInfo boards incl no-rank variant, rank arrows, effect, pageL/R, scroll frames, per-class platforms, BtSelect/BtNew/BtDelete) were already WZ-loaded.
- **PinStage rebuilt to CPinCodeDlg::OnCreate @0x5FEB70**: StringPool-decoded buttons - type-0 check dialog uses Pincode/BtYes at (196,150) and BtNo at (107,150) panel-local (was custom BtLogin(246,179)/BtNo(40,179)); text canvas blits at (119,21) per Draw @0x5FDBD0 (was 70,30); typed digits render as masked text at the OG edit position (130,103) with NO custom boxes (OG type-0 has no visible edit; CCtrlEdit bPasswd=1 in assign modes). Custom digit-cell rects removed.
- **SplashStage/RaceSelectStage/CharCreationStage**: Splash is our own bootstrap loader (not an OG screen); RaceSelect/CharCreation already fully WZ-driven (RaceSelect/NewChar* subtrees), no changes needed.

## Verification
tsc clean; **1784 tests pass** (MAPLECLAUDE_NX_DIR=wz_client); only pre-existing e2e playwright env failure + CashCommodityTable data-set gap.
# Session Summary - Skill attacks implemented + full client<->server verification

## Skill attack execution (the missing piece) - client-side DoAttack
- Casting an ATTACK skill now actually hits: GameStage._trySkillAttack(skillId, slv) wired into onSkillUse. New SkillInfoService.AttackDataAt (common node first, per-level level/<n> fallback; null for buff/movement skills) + AttackRectAt (OG level/<lv>/lt+rb hit rect).
- Up to mobCount closest living mobs in the rect; attackCount damage lines per mob = calcDamageRange roll x damage%, crit per line via GetCriticalProp + PDamage crit roll (param+20+niCDr .. param'+50).
- Packet routing: magic jobs (job/100%10==2) -> MagicAttackEncoder, else MeleeAttackEncoder with {skillId}; both verified field-for-field against the server's handleUserMeleeAttack/handleUserMagicAttack decodes.
- NX assets on connect: skill ball node flies caster-muzzle -> first target via ProjectileOverlay (same as remote attacks), per-mob hit splash via _playSkillHit/fieldFx, play_skill_sound attack1, mob hit flash/knockback. Damage numbers still server-authoritative via the MobDamaged echo.

## Server-side verification of all recent client changes
- Server tsc clean; moveAction byte relayed RAW end-to-end (BaseMovement.setMoveAction -> Char.getMoveAction -> UserPacket byte), so the v95 stance layout flows through untouched.
- Emotion read/broadcast int/int/bool matches client; remote temp-stat REMOTE_ENCODE_ORDER sizes == client decodeRemote; local TemporaryStatSet tail order matches encodeForLocal.
- Server test suite: fixed 5 stale tests to the corrected OG layouts (userPacket CoupleRecord/NewYearCards/MiniRoom tails incl friendship+marriage booleans; AES.transform now returns data; login mock gained spwPendingStore; MigrateResult expects SELECT_CHARACTER_RESULT=12 not MIGRATE_COMMAND). 266 passing; remaining failures are pre-existing stale guild/BBS/cashShop mocks unrelated to client work.

**1784 client tests pass** (MAPLECLAUDE_NX_DIR=wz_client), tsc clean; only pre-existing e2e playwright env failure + CashCommodityTable data-set gap remain.
# Session Summary - Stances + emotions + weapon-holding audit (local & remote)

## Stance wire format was WRONG - fixed to v95 layout
- IDB ground truth: CUser::OnResolveMoveAction @0x8E5800 returns (2 * idx) | dir; CAvatar::MoveAction2RawAction @0x45FA30 decodes dir = nMA & 1, idx = nMA >> 1. The old TS used low-nibble-stance/bit4-facing (newer-version layout) - every remote stance decoded wrong and local packets encoded wrong.
- Stance.ts rewritten: bit0 = facing-left, bits1+ = move index (1 walk, 2/4 stand variants, 3 fall, 5 jump, 6 swim, 7 ladder, 8 rope, 9 fly, 10 chair/sit, 12 prone, 19 dash, 20 booster). Walk1/Walk2 and Stand1/Stand2 collapse on the wire by design (OG distinguishes walkType/standType client-side only).
- Consumers: PlayerController move encoding + FieldHandlers UserMove decode now both use the v95 byte. Tests rewritten to pin OG wire values (Stance.dead.spec 4, MovePathDecoder.spec 8).

## Emotion flow realigned to SendEmotionChange @0x9F9320
- New GameStage._sendEmotionChange(emotion, byItemOption): morphed characters blocked entirely (OG AddChatMorphedMsg path), emotion <= 0x17 enforced, 2000ms cooldown, then optimistic CAvatar::SetEmotion + packet. All three send sites (chat bar, F1-F7 keys, random-emotion) routed through it.
- OnRandomEmotion @0x8E34B0 verified: itemId -> weighted pick from AreaBuffItem table -> SendEmotionChange(emotion, 0, -1); our handler now uses the gated sender with a uniform 1..23 fallback (per-item AreaBuffItem table not wired client-side).
- Wire format int/int/byte verified consistent client<->server; server broadcasts UserRemote.emotion excluding sender (UserEmotionLocal 232 exists but unused by our server - local optimism covers it).

## Weapon holding verified wired
- CharacterRenderer._visibleWeaponId resolves weaponStickerId > CashWeapon slot > Weapon slot from AvatarLook; used for both local CharLook and remote OtherCharLook inner avatar. ActionMan carries per-weapon afterimage/walk/stand/attack data + HIDDEN_WEAPON_STICKERS/SKIP_WEAPON_SLOT_ACTIONS.

**1784 tests pass** (MAPLECLAUDE_NX_DIR=wz_client), tsc clean; remaining failures are the pre-existing e2e playwright env issue + CashCommodityTable data-set gap.
# Session Summary - Death flow: missing OG pieces added (alpha fade + clamp tests)

## Added (this session, completing the OnSetDead 1:1 port)
- **Corpse alpha fade**: OG sets OverFace/UnderFace layer alpha to 0 instantly and animates back to 255 over currentTime+1250ms (two IWzVector2D::RelMove calls on the layers' Getalpha vectors). _applyLocalDeath now hides the player container instantly (alpha=0) and a _deathFadeMs tween in the per-frame update fades it back over exactly 1250ms; _applyLocalRevive restores alpha=1. Chat-balloon additional layer cleared on death (RemoveAdditionalLayer equivalent) via ChatBalloon.Clear(localCharId).
- Tests: GameStageRevive.spec +4 (foothold clamp mid-air -> x-15/ground-y spawn, instant-hide + fade scheduled + balloon clear, revive restores alpha/tween, death idempotence). **1781 tests pass** (MAPLECLAUDE_NX_DIR=wz_client), tsc clean; only pre-existing e2e playwright env failure + CashCommodityTable data-set failure remain.
# Session Summary - Death animation audit (local + remote) vs IDB

## Remote death: OG shows NOTHING (prior session's invention removed)
- Live-IDB ground truth: CUserRemote::OnReceiveHP (0x953F50) decodes cur/max HP and updates ONLY the party HP gauge + DrawGauge - no dead action, no stance, no tombstone. CUser::OnSetDead (0x8E4250, the full tomb/spin/sound flow) is called ONLY from CUserLocal::OnSetDead (0x903FC0); there is no CUserRemote::OnSetDead. GameStage's onUserReceiveHP no longer plays 'dead'/Stance.Dead on remote chars (the earlier session mis-read this); OtherCharLook.IsDead kept as legacy flag (never set now), onUserMove dead-skip demoted to legacy comment.

## Local death: tomb spawn point clamped to footholds like OG
- OnSetDead computes m_ptRevive via GetFootholdUnderneath(x, y-20); when that ground is >80px below (airborne), probes (x+15,y-20) then (x-15,y-20) and takes whichever succeeds. _applyLocalDeath now replicates exactly via FieldScene.GetFootholdBelow(...).YAt before spawning the tombstone (was raw physics pos - could float mid-air).

## Verified already 1:1 (no change)
- Tomb visuals: Effect/Tomb.img/fall (20 frames, spawned at y-600, linear drop over 440ms) -> land frame; SP-decoded paths: SP0x8AD='Effect/Tomb.img/fall', SP0x9A1='Effect/Tomb.img/land' (already-dead variant places land directly at (x,y)).
- Death sound: play_game_sound(SP2464='Tombstone') with SP0x8C3='Sound/Game.img/' prefix -> Sound/Game.img/Tombstone at land; TombstoneEffect already plays exactly this via WzAudioPlayer.
- Revive dialog gate 2200ms; revive-point reuse; wings-sound stop / additional-layer removals are client-internal cleanup with no TS equivalent needed.

## Not replicated (documented, unverifiable visual)
- pOrg.Rotate(0, 2000): the corpse body-offset vector spin. The WZ angle unit for IWzVector2D::Rotate is not determinable from the decompile alone; the lying 'dead' body action plus falling tomb cover the visible result.

**1777 tests pass** (MAPLECLAUDE_NX_DIR=wz_client), tsc clean.
# Session Summary - CUI ability panel round 5: authentic-UI audit + StringPool decrypted

## THE BREAKTHROUGH: client StringPool table decrypted (nx-tools/stringpool-dump.mjs)
- Prior sessions marked StringPool ids 'unresolvable (no NoSound.img)'. Actually resolvable from the exe itself: ms_aString (VA 0xC5A878) holds per-id pointers to seed+cipher bytes; ms_aKey (VA 0xB98830, 16 bytes) is bit-rotated left by the signed seed (byte-rot (seed>>3)%16 then bit-rot seed&7 - rotatel@0x746270); out[j] = cipher[j] ^ rotatedKey[j%16], keep-byte when equal (Decode@0x746520). stringpool-dump.mjs dumps any id from the exe.
- Validated: SP1993 = 'String/ToolTipHelp.img/Game/UIWnd/Stat' (matches prior IDB-derived tooltip path).

## Ability-panel authentic-UI fixes (all this session)
- **Balloon tips rebuilt from WZ** (was a custom Graphics rounded-rect): SP0xC9D = 'UI/Login.img/WorldNotice/Balloon' with nw/n/ne/e/w/c/sw/s/se 9-slice pieces; arrow pieces per direction are SP1450-1453 = selArrow/swlArrow/nelArrow/nwlArrow. MakeBalloonTip @0x7C9780 spec implemented exactly: tipW=maxTextWidth+20, tipH=15*lines+20, dir table {0:(nX-w-23,nY) off(0,23) arrow@(w-8,0); 1:(nX-w-23,nY-h-23) off(0,0) arrow@(w-8,15*lines+4); 2:(nX,nY-h-23) off(23,0) arrow@(0,15*lines+4); 3:(nX,nY) off(23,23) arrow@(0,0)}; text black (clr=0xFF000000) centered rows +15.
- **CreateTip job lines corrected**: decoded 0x14BA-0x14C7 + 0x1A45-47 reveal 1100-1500 are the CYGNUS KNIGHTS (Dawn Warrior STR / Blaze Wizard INT / Wind Archer DEX / Night Walker LUK / Thunder Breaker STR) - old comments said Aran/Mercedes/Phantom (wrong); explorer third lines: thief+DEX(0x1A45), bowman+STR(0x1A47), mage+LUK(0x1A46). Invented fallback texts replaced with decrypted truth.
- **No-custom-fallback pass**: removed StatsInfo's hand-drawn Graphics panel background (_rebuildBg) - without WZ canvases the window renders nothing; removed #888 stroke from value text styles.
- **StatDetailInfo detail/BtHpUp is now a real Button.fromWz** (was placeholder new Button('HP Up'), never added): origin (-150,-218) -> (150,218), id 0x3E8, wired onHpUp -> GameSender.UserAbilityUp(MaxHp); fixed mouse routing to window-local coords.
- **Auto-assign per-job logic verified 1:1** against EnableApUpButton @0x86187B + RestoreButtons @0x861AB9: beginner (job%1000==0||job==2001 && lvl<=10) hides all 9 buttons; AP!=0 enables; level<20 disables HP/MP pair; **job==500 (Pirate!) gets TWO auto buttons** (BtAuto1=infighter/STR, BtAuto2=gunner/DEX via bWantToBeInfighter into GetIdealStatUp's Pirate branch), other jobs one BtAuto; jobs %1000/100 in {8,9} get none. AutoApUp caps each entry to remaining AP and dumps leftover into the LAST entry before CUtilDlg::YesNo -> SendAbilityUpRequest. TS matches everywhere ('isAran' var renamed conceptually: it means Pirate).
- Real-NX parity suite NEW tests/ui/game/StatsInfo.wz.spec.ts (4: all 10 buttons load WZ sprites at exact origins incl BtHpUp(147,103)/BtMpUp(147,121)/BtAuto(94,180)/BtDetailOpen(92,307); BtAuto animated normal/0 frame renders non-fallback; level-30 warrior shows BtAuto visible+enabled; detail subtree shape + detail BtHpUp at (150,218)).
- **Bonus fix**: Revive._probeAssets never matched - Notice/<n> IS the background canvas (not a property containing '0'); buttons btOK/btCancle are siblings under Notice/. Fixed; gated Revive NX test now passes.
- Known pre-existing unrelated failure: CashCommodityTable NX-gated test (expects >12000 Commodity entries; wz_client Etc.nx parses 0 - separate parser/data issue, untouched here).

**1777 tests pass** (MAPLECLAUDE_NX_DIR=wz_client), tsc clean.
# Session Summary - CUI ability panel round 4: remote temp-stat decode realigned

## Leftover closed (this session): handleUserSetTemporaryStat now decodes OG DecodeForRemote
- The REMOTE variant handler (FieldHandlers ~5252) still read LOCAL-format entries (short/int/int by ascending bit) + the local Dice/Swallow/BlessingArmor tail - all wrong for the remote wire. Rewritten around a new SecondaryStat.decodeRemote(p) static: 16-byte flag -> REMOTE_DECODE_ORDER per-stat variable data (same sequence as the server's encodeForRemoteWithFlag AND our previously-ported REMOTE_STAT_SKIP from OG DecodeForRemote @0x72B7B0; kinds n1/n2/n4/r4/si/flag - r4 stats carry the skillId in rOption, Poison is short+int) -> 2 defense bytes -> bits 122-128 two-state entries skipped at 15 bytes each. Remote packets have NO swallow-group byte / Dice block / BlessingArmor int (those are local-only tails); args shape kept (diceInfo=[] etc.) so GameStage consumers are unchanged.
- Cross-verified server-vs-OG compatibility: every REMOTE_ENCODE_ORDER member's byte size matches the OG skip table; the OG flag-only entries (DarkSight/SoulArrow/WindWalk/etc.) write zero bytes so their absence from the server list is wire-compatible.
- **SecondaryStatNames** in GameStage rewritten to the v95 bit order (was old-version numbering: NoBulletConsume@39 instead of SpiritJavelin, etc.) so the [TempStat] chat labels name the right buffs.
- Removed orphaned countBits64/isBitSet helpers from FieldHandlers.
- Tests: FieldHandlers.spec +1 (UserSetTemporaryStat round-trip: Speed n1=140, DarkSight flag-only, Stun skillId=1211003 via rOption, Morph n2=5, defense tail). **1766 tests pass**, tsc clean.
# Session Summary - CUI ability panel round 3: CTS wire realignment + crit-damage roll decoded

## THE BIG FIND (this session): client CTS bit table was from a NEWER version - every wired buff mis-decoded
- Cross-checked the server enum (CharacterTemporaryStat.ts, henesys v95 port: PAD=0..SharpEyes=37..RideVehicle=125) against the client SecondaryStat constants (old table had SharpEyes=43 etc.) - they DISAGREED on nearly every stat. Proof the server numbering is the v95 truth: our own REMOTE_STAT_SKIP (ported from OG DecodeForRemote) uses it, and the live-IDB OnTemporaryStatSet @0xA02FC0 confirms DecodeForLocal drives the layout.
- **SecondaryStat.ts rewritten to the v95 wire**: new CTS_* constants (PAD=0...GUIDED_BULLET=127), LOCAL_ENTRY_ORDER mirror of the server's LOCAL_ENCODE_ORDER (NOT ascending bit order - EMHP/EMMP/EPAD/EPDD/EMDD sit between Jump and MagicGuard; entries written only for set bits), decode() now mirrors encodeForLocal exactly: mask -> ordered entries -> UNCONDITIONAL DefenseAtt+DefenseState bytes -> swallow-group byte (any of bits 90/102-105) -> Dice 22 ints (bit 116) / BlessingArmor int (117) -> two-state tail [RideVehicle(125)/PartyBooster/GuidedBullet] byte+int+int+int+short.
- Field mapping by semantic name preserved (consumers unchanged); ComboAbilityBuff(68) -> existing ranCombo field so getAranCombo()/_computeComboAbilityCritical are now LIVE over the wire; removed phantom magicAtk from getBuffPAD; added fields craft/thornsEffect/swallowCritical. Old-version-only fields kept in the interface but unmapped (server never sends them).
- Tests: NEW tests/character/SecondaryStat.decode.spec.ts (4 round-trips incl. order-sensitivity Stun(17)<SharpEyes(37), PAD no longer landing on the old str slot, ComboAbility->aranCombo, unconditional defense tail); FieldHandlers.spec TemporaryStatSet packet gained the 2 defense-tail bytes.
- **Known remaining gap**: handleUserSetTemporaryStat (REMOTE variant, FieldHandlers ~5252) still decodes with old bit-order logic - remote players' buff icons may mis-decode; needs the same treatment vs REMOTE_ENCODE_ORDER + per-stat sizes.

## Crit-damage roll decoded (CalcDamage::PDamage @0x730130, saved ida_output/calcdamage_pdamage_full.txt)
- NOT a flat x1.5: per damage line, chance roll = rand[0..100] < accumulated prop; on crit, rollPct in [min,max] where min = param + 20 (+ item-option niCDr accumulator), max = param' + 50, and damage += preCrit * rollPct/100 (i.e. x(1+rollPct/100)), clamp [1,999999].
- Disassembly resolved the Hex-Rays anomaly: nTempCriticalAttackParam is OVERWRITTEN with packedSharpEyes & 0xFF (the criticaldamageMax byte) while Sharp Eyes is active, else stays get_critical_skill_level's pnParam (= crit skill LevelData.damage).
- _tryMeleeAttack implements this exactly via _statDetailInfo._criticalDamageParam (wired: sharpEyes&0xFF when active else _skillLevelValue(baseCritId,'damage')); CUserLocal.weaponCritDamage feeds the min.

## Panel wiring completed (Craft/Thorns/SwallowCritical now real)
- Row Y=159 Craft renders sec.buff.craft (was structural 0); ThornsEffect feeds GetCriticalProp max(); SwallowCritical added raw into GetCriticalProp (OG adds it unclamped after the sharpEyes/thorns max). PassiveSkillData.nCr remains 0 (no client-side aggregate).

**1765 tests pass**, tsc clean (only pre-existing e2e playwright env failure). IDB decompiles saved: cuistatdetail_Draw_full.txt (2081 lines, complete), calcdamage_pdamage_full.txt.
# Session Summary - CUI ability panel round 2: full CUIStatDetail::Draw decompile applied

## Live-IDB round (this session): Draw @0x8625F0 + get_critical_skill_level @0x70A240 fully decoded
- **IDB bound** via idb-bind (path recovered from disk; alignment verified against CUIChannelSelect::GetRect 66*(nIdx%5)+23). Full 2081-line Draw decompile saved to ida_output/cuistatdetail_Draw_full.txt (the old cached copy was truncated before the Speed/Jump tail).
- **Row map corrected**: Y=159 is an **nCraft decomposition row** (NOT Speed); Speed is Y=177 (min(cap=140, GetSpeed)), Jump Y=195 (clamp <=123 only). ACC (Y=105) and EVA (Y=141) rows draw the IDENTICAL recomputed value twice. Value column x=74 every row, y step 18.
- **Buff decomposition rule**: delta==0 -> plain itoa(total); delta!=0 -> SP1979 3-arg with buff as delta, red when >0 / blue when <0. StatDetailInfo now splits total = base+buff using newly wired buffPad/Mad/Pdd/Mdd/Acc/Eva fields (Inputs keep the totals; attacks unaffected). Removed dead secPdd/secAcc/secSpeed fields and wrong jump [80,123] / speed [70,190] clamps.
- **Colors**: damage row RED when buffPAD/MAD active; crit row RED when SharpEyes/Thorns/Combo/passive-crit active else gray; yellow font never used in this window.
- **get_critical_skill_level decoded** (immediates from disasm): job/1000==3 -> 30000022; WT45|46 -> cygnus(job/1000==1, per is_cygnus_job@0x47CA80) ? **13000000** : 3000001 Critical Shot; WT47 -> cygnus ? **14100001** : 4100001 Critical Throw; WT48 -> **15110000** Critical Punch; other/unarmed -> prop 0. prop = LevelData.prop (param = LevelData.damage = crit DAMAGE bonus, not used by the % row). _computeBaseCriticalProp rewritten to this exact table (was [3000001]-only sum).
- **Still untracked client-side**: nCraft row renders structural 0; PassiveSkillData.nCr / ThornsEffect / jaguar unchanged from round 1; crit x1.5 multiplier still unverified (no CCrit calc function found by name in v95).
- Tests: GameStageAbilityPanel.spec.ts +1 (weapon-type critical table: archer/cygnus-mismatch/cygnus-match/claw/unarmed). **1761 tests pass**, tsc clean.
# Session Summary - CUI ability panel (CUIStat + CUIStatDetail) critical/damage audit

## Ability-panel audit round (this session): GetCriticalProp wired 1:1 + panel-attack consistency
- **Audit basis**: cached IDB decompile ida_output/cuistatdetail_GetCriticalProp_code.txt (full, @0x861BF0); live IDB was not bound this session (no CLAUDE.local.md IDA_IDB), and the cached CUIStatDetail::Draw decompile is truncated at the StringPool-ref stage.
- **Critical % row was dead/wrong**: draw() rendered computeDerived().criticalPercent (= 5 + sharpEyesCritRate) and never called OG-faithful getCriticalProp(); its input fields were never wired. Now row 1 renders getCriticalProp() per OG: base critical-skill prop + 5 + weapon-option niCr (ApplyWeaponOption slot 11) + katana second pass (slot 10 when itemId/10000==134, accumulated) + max(SharpEyes>>8, ThornsEffect>>8) each clamped [0,100] + combo-ability + passive nCr (+ Evan 22140000 prop). Components clamped individually; sum returned raw like OG.
- **Sharp Eyes decode bug fixed**: server sends (x<<8)+criticaldamageMax but SecondaryStat.getSharpEyesCritRate() returned the packed value -> crit showed 100 whenever Sharp Eyes was up. Now >>8 clamped [0,100] (OG reads fuse(nSharpEyes)>>8).
- **Panel damage range now matches live attacks**: StatDerived.computeDerived min used an invented 4*primary*0.9*mastery; replaced with verified OG adjust_ramdom_damage (0x726690): min = floor(max * min(0.95, mastery/100 + masteryConst(wt)) + 0.5) - identical to MeleeDamage.calcDamageRange (cross-checked by a new 6-branch equality test).
- **_tryMeleeAttack consumes the panel's inputs**: watk/matk now come from _statDetailInfo.Inputs (all equips + buff PAD/MAD + item options), mastery from Inputs.mastery, so rolled damage is inside the displayed range. Critical rolls added client-side (getCriticalProp()% chance, x1.5 clamped to DamageMax, BattleRecord.AddDamage(dmg, isCrit)).
- **Katana pass**: CUserLocal.applyWeaponOption gained accumulateIntoExisting; _syncStatDetailInputs runs a second pass on slot-10 katana (itemId/10000==134) exactly like GetCriticalProp 0x861E2C..0x861F8E, then wires _weaponOptionCritical/_sharpEyesCrit/_skillCriticalProp/_comboAbilityCritical/_evanCritical onto StatDetailInfo.
- **Skill-record helpers**: _skillLevelNode/_skillLevelValue (Skill.wz level data), _computeBaseCriticalProp (v95 base-critical table = [3000001 Critical Shot], extensible), _computeComboAbilityCritical (X=min(LevelData.X, combo/10), xY clamp [0,100], skill 21110000 / 20000018 for job 2000).
- **Not tracked client-side (documented)**: PassiveSkillData.nCr -> 0; ThornsEffect CTS not decoded; WildHunter jaguar is post-v95 (omitted).
- Tests: NEW tests/stages/GameStageAbilityPanel.spec.ts (3: packed SharpEyes shift+clamp incl >100, weapon+katana niCr accumulation=12 & crit=29 end-to-end through _syncStatDetailInputs, combo X/Y math); StatDerived.spec.ts +2 describe blocks (effective-mastery min formula, 1:1 equality with calcDamageRange across job/WT branches). **1760 tests pass**, tsc clean (only pre-existing e2e playwright env failure).
# Session Summary � Cash Shop deep IDA audit + client-side Commodity/Category table

## Audit round 16d (this session): MiniMap.ts full rewrite (IDB SetLayer-verified)
- **File was mangled** by a broken shell pipeline (all newlines eaten ? unparseable); rewrote from scratch (982 lines) using the damaged copy as logic reference + live IDB decompile of `SetLayer @0x8011A0` (agent-extracted 78KB pseudocode report).
- **OG title rules now exact**: mode 0 = two lines white @ (9,21)/(9,35) with shadow pass offset (-1,-1) in 0xFF52759C, shifted +40 when the map-mark icon exists; **mode 1 draws NO title**; mode 2 = one "street - map" line at (6,5). No clipping anywhere � the collapsed strip width GROWS to fit names (streetW+mapW+padding), reverting the earlier invented 180px cap/truncation.
- **Buttons clickable**: buttons added last each frame (OG overlay-layer z-order above text); fixed a real bug where handleMouseButton compared SCREEN coords against window-LOCAL rect (off by the 4,4 anchor).
- Frame composition per mode: type1 MinMap|MaxMap 9-slice; type0 Window/Normal|Max (Up/Middle/Down naming); collapsed strips Min(w/c/e)|Window/Min(Left/Center/Right); nw2 unused by OG.
- Tests updated to OG behavior (untruncated long titles, growing strip, zero texts in mode 1, shadow-pass coords). **1755 tests pass**, tsc clean.

## Audit round 16c (this session): minimap title clipping + collapsed strip cap (NX-audited)
- **Long-name fix**: the collapsed strip width grew with the FULL map name (`tabW + nameW + ...`) � a long name stretched it across the screen. Width now capped at [120..180] with the name contribution capped at 70px; `_drawTitle` clips via new `_fitText`/`_measureText` helpers in ALL modes (collapsed, expanded street+map lines incl. map-id clearance, and the no-street fallback).
- **Full NX audit of MiniMap subtrees** (`UIWindow2.img`): `MiniMap/{BtMap,BtMax,BtMin}` + `Min(w64x20/c1x20/e64x20)` + 9-slice `MinMap`/`MaxMap` frames + `MiniMapSimpleMode/{Button{BtMax,BtMin,NormalMode,SimpleMode,ZoomIn,ZoomOut}, Window{Min:Left|Center|Right, Normal|Max: Up/Middle/Down 9-slice}}` � all match TS load paths. Missing-in-NX probes confirmed graceful: `MiniMap/WzFont`, `MiniMapSimpleMode/canvas|canvasHuge`, `MiniMap/DefaultHelper` are absent ? Text font / data.Canvas / simple-mode markers fallbacks engage as designed; markers live only under `MiniMapSimpleMode/DefaultHelper` (+ LowLVQuestMark/forMiniMap). `MaxMap/nw2` variant ignored by TS loader (unused state).
- Tests +3 (long-name truncation fits width, collapsed cap =180, short name untruncated). **1753 tests pass**, tsc clean.

## Audit round 16b (this session): pet panel behind-slide hardened + WZ fallback probes
- **Behind-slide made rebuild-proof**: `_rebuildBackground()` re-inserts the WZ bg sprites at indices 0-2, which pushed `_underLayer` (pet/dragon/mechanic panels) ABOVE them � panels overlapped the equip art instead of hiding behind it. `_rebuildBackground` now re-seats `_underLayer` at index 0 after every rebuild, so the equip window's own art always draws over the sliding panels.
- **Pet/dragon/mechanic bg fallback probes**: verified against real NX that `UIWindow2.img/Equip/{pet,dragon,mechanic}` exist with 3-layer backgrnds AND `UIWindow.img/Equip/{pet=151x186, DragonEquip=143x173, MechanicEquip=143x173}` hold whole-panel canvases; added `loadSingle()` fallback probes so a panel background loads even when the layered probe fails (Graphics fallback remains last resort).
- **1750 tests pass**, tsc clean.

## Audit round 16 (this session): pet/dragon/mechanic slide fix + meso revert
- **Slide speed fixed**: `_dt` is SECONDS (`deltaMS/1000`), but the pet panel step used `12*(_dt/16.67)` ? ~0.01px/frame (glacial). Now `600 * _dt` px/s � 0.3s for the 183px gap; same fix applied to dragon/mechanic panels.
- **Emerge-from-behind**: new `_underLayer` Container at the bottom of EquipInventory's root; the three slide-in panels are children of it, so the equip window's own art (bg layers re-added at indices 0-2 on every rebuild) always draws OVER them while they overlap � panels now visibly emerge from behind the equip window instead of sliding over it. Pet slides right to x=183, dragon/mechanic left to -151.
- Meso count reverted to plain right-aligned Text per user preference (NOT WZ digits).
- Tests +1 (slide covers =100px in one 0.25s step, reaches 183, panel parent is `_underLayer`). **1750 tests pass**, tsc clean.

## Audit round 15b (this session): item panel fallbacks + meso-drop dialog 1:1
- **Item panel fallback cleanup**: `_titleText` ("Items - Equip" custom Text) now hidden whenever the WZ backgrnd layers load (OG title is baked into the canvas; Text only shows in the no-WZ fallback); meso count renders via the WZ digit-glyph font (`_imgFontDigits`, FONT_NO_BLACK_SMALL equivalent, right-aligned ending x=126) instead of monospace white Text � Text remains the no-WZ fallback. Quantity digits and tab labels already had proper WZ-first fallbacks.
- **Meso-drop dialog fixed** (OnDropMoney @0x7CBFD0): GameStage was sending the STRING-input variant; now uses the OG numeric `SetUtilDlgEx_INPUT_NO(10, 10, min(money,50000), 0, 10, 0)`. `UtilDlgEx._buildInputContent`: removed the invented "Amount:" label (the real message text lines render above the field), the WZ edit probe now descends the nested property (`edit` ? state ? '0' canvas), input is BLACK text on a WHITE box with black border/caret (was light-on-dark), cursor follows the typed width.
- Tests: UtilDlgEx.spec gained the standard canvas shim (Text measurement needs document/CanvasRenderingContext2D). **1749 tests pass**, tsc clean.

## Audit round 15 (this session): CUIItem item panel re-verified 1:1 (no changes needed)
- **IDB re-check** (`CUIItem`): `GetItemSlotRect @0x7CBE90` � collapsed window = slots [FirstPosition, min(FirstPosition+24, slotCount)), rect x=36c+10..42 / y=35r+51..83 (matches TS GRID 10,51 pitch 36�35 exactly); extended transform (`row>=6 ? col+=4*(row/6), row%=6`) algebraically equivalent to TS `_slotPositionForCell` block math, and `GetSlotPositionFromPoint @0x7CC220` hit-mapping verified equivalent. `OnButtonClicked @0x7CC4F0`: 2002=DropMoney, Gather/Sort, Toggle �2, BtCashshop SNs {TI1:50200093, TI2:50200094, TI4:50200095} � all already wired in GameStage. `SetLastestGetItemEffect` parity exists in TS (`New/Tab0|Tab1|inventory` AnimatedSprites + `_latestItem`). All 4 ItemInventory suites pass; no gaps found.

## Audit round 14 (this session): CUIEquip + linked panels audit
- **IDB re-verified** (`CUIEquip`): slot geometry confirmed 1:1 with TS (`EqSlotInfo::GetX/Y`: X=10+33n, Y=27+33n, 32�32 cells, 58 slots +1 expanded; table decoded from the dynamic initializer � hat(43,27), face(43,60), eye(43,93), ear(109,93), top(43,126), pants(43,159), shoes(76,192), glove(10,159), cape(10,126), shield(142,126)=bp10, weapon(109,126)=bp11, rings(109/142,159)+(109/142,60), pendant(76,126), mount row y225). `OnButtonClicked @0x7A7E50`: id3000=BtSlot ? SN 50200052 shop migrate (TS wires BtSlot?cash shop ?); 3001/3002/3003 = Dragon/Pet/Mechanic toggles (all present in TS).
- **Fixed `_isSlotDynamicallyDisabled` against the real Draw @0x7AA560 rules**: (1) two-handed weapon (/100000==14 = ids 1400000-1499999 incl. bows/polearms/guns) disables the SHIELD slot � was nonsense job math before; (2) wearing an OVERALL (/10000==105 on bp5) without pants disables slot 6 � was checking job instead of the equipped top; (3) novice riding skill gate for 18/19/20 and (4) citizen subJob rule were already correct.
- **Linked panels verified**: CUIPetEquip (slide-in 167�201 window, slots bp14/21-48), CUIDragonEquip (151�172, bp1000-1003), CUIMechanicEquip (bp1100-1104), ItemRelease effects, drag-drop GetOff/Wear flows � all already implemented from earlier passes.
- Tests +4 in EquipInventory.setItem.spec.ts (2H-weapon?shield-disable incl. bow case, overall?pants, mount-skill gate, citizen rule). **1749 tests pass**, tsc clean.

## Audit round 13 (this session): gift dialog Buddy/Guild/Hide implemented (IDB-audited)
- **IDB findings**: the CSGift BtBuddy/BtGuild/BtHide assets belong to **CUISendGifts** (the NORMAL multi-recipient gift dialog), not CUISendGift (package gift, which has none of them). `CUISendGifts::SetCtrl @0x7881A0`: BtOK id1 SP0x512 at (168,139), BtCancel id2 SP0x513 at (210,139), **BtGuild id1004 SP0x1323 at (56,139)**, **BtBuddy id1003 SP0x1322 at (110,139)**, **BtHide id1005 SP0x1324 at (439,139)** created only when m_nState?0. `OnButtonClicked @0x79F700`: 1003?SetState(1), 1004?SetState(2), 1005?SetState(0). `SetState @0x79F030` swaps recipient-list mode (1=buddy, 2=guild, 0=manual entry), preserving edit text. Receiver edit id1000 at (84,52) 122�13; message edits at (26,76)/(26,92) 210�13; list layer at (336,54) with "None" placeholder. `CUISendGift::SetRet @0x79A4C0` validation: receiver trimmed 4..12 chars, not self, curse-filtered message =72.
- **TS implemented**: gift dialog re-laid out to OG coords (receiver (84,52) 122�13, message (26,76) 210�13, button row y139 Guild56/Buddy110/OK168/Cancel210/Hide439); `_giftState` machine (Guild?2, Buddy?1, Hide?0) with selectable recipient list panel (`buddyNames`/`guildNames` provider fields for GameStage wiring, "None" placeholder per OG); receiver validated 4-12 chars before send; state resets on open.
- Tests +2 (state-button click routing + list select + Hide; receiver length validation). **1745 tests pass**, tsc clean.

## Audit round 12 (this session): future-pass items closed
- **Search price bands**: `_searchPriceBands` parsed from `UI/CashShop.img/CSItemSearch/Price` ({i}: {0}=low {1}=high); `<`/`>` selector row under the search field cycles -1(all)..n-1; `_executeSearch()` (shared by Enter + Find click) filters name substring AND price band via `_getSalePrice`; results land in virtual category 10.
- **Coupon dialog visuals**: `CCouponUseSelectDlg`-style modal (UIWindow2.img/Coupon/backgrnd + BtOK/BtCancle sprites, Graphics fallback), input field at dialog-relative (12,53) 200�15, OK sends `CashShopUseCoupon`, Cancel clears, modal swallows outside clicks; typing/Enter/Escape key path unchanged.
- **One-a-day WZ assets**: countdown now draws SP 0x16A7 digit glyph pairs at OG positions (hh 145/182, mm 232/269, ss 319/356, y264 list-relative) with Text fallback; today plate prefers `PlateBig` (SP 0x16A5); prev-grid plates draw the CSList/Base canvas instead of Graphics rects (+ gold selection ring).
- **Plate focus skin**: `_plateStateFocus` loaded ('CSList/KeyFocus' candidates) for the keyboard-focused plate overlay.
- **Buy-gate fix**: one-a-day direct `_processBuy` releases `_buyPending` when a dialog opens instead of sending.
- Deliberately NOT done: gift-dialog Buddy/Guild button semantics unknown in IDB terms (drawing them with invented behavior violates the no-invention rule).
- Tests +3 (band filter + cycle, coupon modal OK/Cancel/swallow, buy-gate release). **1743 tests pass**, tsc clean.

## Audit round 11 (this session): button/hover/keyboard parity
- **Hover**: plate Buy/Gift/Wish hover rects now MATCH the click rects (wish y0..20, gift y24..48, buy y50+, x=PLATE_W-40..40); wish hover was never registered before; hover block guarded by `_oneADayActive` instead of the stale `_activeTab!==8`; avatar buttons (btBuy/btDefault/btTakeoff) and search Find/Cancel got mouseOver highlight strokes.
- **Keyboard nav ported** (`CCSWnd_List::OnKeyRet @0x4C9460`): arrows move `_focusedPlate` on the 2-col grid with OG wrap rules (Left `f%2?f-1:f+1` clamp; Right last-plate wraps to row start; Up `-2/+2*(count/2)`; Down `count-f>2?f+2:f%2`), Enter wears focused item via WearCommodity and enters button-focus mode (`_buttonFocus`, cycles Buy?Gift?Wish with Left/Right, activates respecting `_plateButtons` gating), Escape backs out of button mode instead of exiting the shop.
- **Locker logic fixed**: cell click now only SELECTS (`_selectedLockerCell`); the duplicate rebate-on-cell-click block removed; BtRebate rebates the selected item (fallback first visible).
- Tests +5 (arrow grid movement incl wrap, Enter-wear/button-mode/Esc, plus updated suites). **1740 tests pass**, tsc clean.
- **Still open for a future pass**: coupon input has no visuals (invisible typing mode); search lacks price-band filtering from `CSItemSearch/Price`; one-a-day countdown uses Text not SP 0x16A7 digit glyphs and prev-grid plates are Graphics not CSList/Base; `_plateState*` sprites declared but never loaded (no selected-plate skin); gift dialog chrome invented (BtBuddy/BtGuild/BtHide loaded but unused).

## Audit round 10 (this session): OG category model completed (cat 9/10 + OneADay trigger)
- **One-a-day moved to the OG trigger**: new `_oneADayActive` flag set by `_setSubCategory()` � opens on **category 1 sub-category 2**, torn down by any other category/sub (`OnChangedCategorySub @0x47DBF0` model). All render/wheel/click conditions switched from `_activeTab===8` to the flag.
- **Category 9 = wishlist-as-plates** implemented: `_getCurrentPageItems` case 9 maps `_wishlist` SNs ? commodities; the wish-toggle button removes entries there; key '9' + last tab-strip slot reach it. Tab-strip slices now map to categories **1..9** (slot i ? cat i+1); tab-canvas index follows `CCSWnd_Tab::Draw` (cat8/cat10?canvas1, cat9?canvas9, else cat+1).
- **Search = virtual category 10** per `SetSearchResult @0x493C00`: Find sets activeTab 10 keeping results (SetCategory preserves them for cat 10); Cancel/Escape/outside-dismiss return to category 1. Removed the invented "tab 0 shows all" rule � every tab now filters its own SN-digit category.
- Tests +3 (one-a-day trigger, wishlist page + remove, search?cat10?cancel). **1737 tests pass**, tsc clean.

## Audit round 9 (this session): tab function + character preview try-on
- **IDB findings**: `OnChangedCategory @0x47E560` resets sub?0, page?0, rebuilds selector+Best; initial m_nCurCategory=**1** (category 0 never used; valid 1..8 + 9 event + 10 search); number keys '1'..'9'=categories directly (`CCSWnd_Tab::OnKeyRet`); List PgUp/PgDn cycles pages modulo. Preview chain: plate click/Enter ? `WearCommodity @0x4C85E0` ? `WearItem @0x4C7D80` ? `CCashShop::OnWear @0x4C5A60`: get_bodypart_from_item table (100?hat�115?shoulder), gender gate, /100000==16 rejected, cash weapon (/100000==17) rides sticker slot, overall/pants exclusivity, toggle-off on re-click, **no layer stack** � full look rebuilt from m_avatarLookInitial + m_aWearInfo[60]. OnTakeOff/OnDefaultAvatar = local look restore (no packet); OnBuyAvatar buys every changed slot via SendBuyAvatarPacket (sub 3 per item). UserPreviewControl layers UserCtrlOn(130,120)/Off(119,17); clicking the char window toggles preview.
- **TS fixes implemented**: shared `SetCategory()` used by all four tab-switch sites (tab click, number keys now map '1'..'8'?categories 1-8 directly, best-jump, GoToCommoditySN) fixing the stale-`_subCategory` bug that could empty a new tab's grid; initial `_activeTab=1`; PageUp/PageDown modulo paging added; GoTo clears search view first. **Preview try-on implemented**: `_initialLook` snapshot + `_wearInfo` overlay + `_applyWearInfo()` full-look rebuild (OG model), `WearCommodity` wired to plate selection with body-part table/gender gate/sticker slot/exclusivity/toggle-off; avatar buttons are real now (TakeOff/Default restore look, BuyAvatar sends CashShopBuy per worn slot); preview toggle moved to OG coords; char-window click toggles preview. TS still diverges: one-a-day lives on tab 8 (OG cat1/sub2 opens it), no cat-9 wishlist-as-plates page, search results overlay current tab instead of virtual category 10.
- Tests +10 in `CashShopStage.spec.ts` (SetCategory reset, key mapping incl initial tab 1, PgUp/PgDn wrap, body-part table, wear/toggle, overall-pants exclusivity, sticker slot, gender reject, buy-per-slot, plate-click wears). **1735 tests pass**, tsc clean.

## Audit round 8 (this session): full cash-shop UI parity sweep (agent-deployed)
- **IDB layout extraction (agents)**: full coordinate tables for CCashShop::Init child placement (Char 0,0,256�316 � **Locker -1,318** (was centered!) � Inventory 0,426 � Tab 272,17 � List 275,95 � Best 690,157 � Status 254,530 � ItemSearch 690,97), List plate math (GetPlateRect: left=206*(n%2), top=81*(n/2)+2, plate **200�81**), per-plate offsets (icon +7/+73, name +82/+6 maxW112, price +78/+32 with **NO coin sprite in v95** � text suffix SP6671/6849 instead; discount badge at +44/+64 digits step 5px; class-badge x table {0:17,1:2,2:17,3:9}; limit badge +3/+3), **v95 has NO prev/next pagination buttons � wheel paging wraps MODULO (OnMouseWheel @0x4C6550) + PgUp/PgDn**, Status buttons (248/289/330 @13, exit @15), Best entries (pitch69, icon+52/+34 black name white price, CS3thEvent banner), Inventory vertical tab ctrl (4,17,28,156) + 32�32 cells at (22,55)+35 pitch + scroll x=160 h=102, OneADay today plate (4,93)-(398,158) + prev grid = main-list 2-col geometry + countdown digits y264.
- **Fixer agent applied all of the above** to CashShopStage.ts (plate H 81, LOCKER_X=-1, INV_CELL 32 + vertical inv tabs, coin-sprite?text-suffix prices incl red-violet random-window color, discount/effect badge positions, OneADay OG geometry, wheel modulo paging via new onMouseWheel, sub-category strip into tab canvas args (8,59,485), tab canvas blit at (+2,0), locker selection fill+edge-bars, Exit button y15).
- **Remaining-parity agent findings implemented**: (1) **package-gift routing** � `_executeGift` now branches itemId/10000==910 ? `GameSender.CashShopGiftPackage` rewritten to **sub-action 33** (OG OnGiftPackage @0x4907B0 framing: str SPW, int sn, str name, str msg; old dead sub-20 sender removed); server shopServer gained **case 4 (bulk gift, OG SendGiftsPacket layout)** + **case 33** sharing a new `giftCommodity()` helper (client sub-4 gift was previously unhandled server-side!). (2) **Shortcut-help modal** (button id 4000 at list-relative (150,380) on cat-8/sub-0 ? modal with close btn (130,328), Escape closes). (3) Wheel paging now wraps modulo per OG. (4) One-a-day click path consolidated (`_handleOneADayClick`).
- **IDB specs recorded for later**: item search is CLIENT-SIDE only (no packet) � filters local cache by name substring + price bands from `UI/CashShop.img/CSItemSearch/Price` node then shows virtual category 10; shortcut-help dialog content = WZ UOL StringPool 3557; keyboard nav (arrows move 2-col plate focus, Enter wears, Esc exits button mode); gender icon SP2907 / stock canvases SP2549 `%d` format paths; coupon dialog = UIWindow2.img/Coupon/* + opcode 276 (TS already sends).
- Tests +3 (package-gift sub-33 byte assert, normal-gift keeps sub-4, shortcut-help open/close/inactive-tab; wheel test updated to modulo wrap). **1725 tests pass**, client+server tsc clean (only pre-existing e2e playwright env failure).

## Audit round 6 (this session): SetPlateNo @0x4C9B40 + ChangePage @0x4CFC70 ported
- **Per-plate Buy/Gift button gating** (`CCSWnd_List::SetPlateNo @0x4C9B40`, full decompile): OG builds 3 buttons per plate � Buy (id 3i+2000, SP 1263), Gift (3i+2001, SP 1264), third (3i+2002, SP 1265 / 1266 when category 9) at plate rect.left+80/+119/+158, y+53 � then disables each by a rule table. Ported as `_plateButtons(item)` ? `{buy, gift}`; disabled buttons draw dimmed (alpha 0.35), no hover, clicks blocked with status messages. Rule groups decoded from the decompile: **Buy([0])** disabled by gender mismatch, level gates (507 megaphones =10; 514/503 =15-or-new-account; 504 <7; 539 =10; 520 =15; ids 5200009/10), premium gate, stock/limitGoods state 1|2, !onSale. **Gift([1])** disabled by couple/friendship rings (/100==11120 && !=1112000; /100==11128 && %10<=2), name change 5400000 / world transfer 5401000, non-giftable coupons **5220012/5222000/5220016/5220017/5220018** (immediates recovered via `find_immediate` from IDA code-address artifacts loc_4FAE70/loc_4FA6B0..B2), slot-inc (911/5430/5431000/5432000), equip-ext 555, price==0, [80M..90M] random window, one-a-day (sn/100000==210 || sn==5640000), limit 2|3, plus the Buy group's stock/premium/!onSale rules.
- **`_getCurrentPageItems` now matches ChangePage**: sold-out stock/limit entries stay VISIBLE (buttons disabled) instead of being hidden; the row scan BREAKS at the first off-sale entry of each Category.img row group; category 1 sub 2 renders a forced-empty page. Zero-goods time windows still hide items (new `_zeroWindowOpen`). `_isSaleAvailable` unchanged for the buy-time gate.
- Tests +8 in `tests/stages/CashShopStage.spec.ts` (gender/ring/coupon gating, level gates, free/random-window gift-drop, visible-but-disabled stock entries, row-break scan, cat1sub2 empty, disabled-click block). **1715 tests pass**, tsc clean (only pre-existing e2e playwright env failure).
- Still open in this area: OG tracks per-SN cash purchase records (`GetCashPurchaseRecord`) to hide already-bought limit(2|3) goods � client has no purchase-record map yet (PurchaseRecordResult handler exists); OG's third plate button (SP 1266 variant on category 9 = wishlist delete?) not rendered.

## Audit round 5 (this session, continued)
- **Sub-category strip** (`ChangeSubCategory @0x4C6530` / `ChangeCategorySub @0x4C98F0`): Category.img names drawn under the tab strip, click-to-select filters `_getCurrentPageItems` by categorySub (active only when the WZ commodity table is loaded). **1707 tests pass**, tsc clean.

## Audit round 4 (this session, continued)
- **Job-variant backgrounds** (Init @0x484920): Base/backgrnd..backgrnd5 loaded; `_selectBackground()` picks Cygnus?backgrnd1 / Aran?4 / Evan?5 / Legendary(1000s)?3 / explorer?0 on SetCashShop.
- **Empty page**: `PicturePlate/NoItem` drawn when the current tab has no items.
- **1707 tests pass**, tsc clean.

## Audit round 3 (this session, continued)
- **LoadData row model ported**: `_applyCategoryRows()` � Category.img-order row grouping + OG random distribution of the [80M..89,999,999] on-sale window into non-empty rows (runs only when the WZ commodity table is loaded and every SN maps to a row; OG THROWS on unmapped).
- **Wired**: CapsLock preview toggle (`OnKey @0x47F7C0`), cash-shop BGM (`Sound.wz/BgmUI.img/ShopBgm` = StringPool 1290) via PlayLoop on enter, wishlist Add/Remove (OnSetWish/OnRemoveWish ? W / Shift+W on selected plate, sends full 10-slot list sub-action 5), locker rebate click (sub-action 17), best-panel click ? `GoToCommoditySN` (@0x4C6DC0 tab/page/plate jump).
- Tests +2 (wishlist add/remove/dup/full, CapsLock toggle, GoTo jump). **1707 tests pass**, tsc clean.

## Audit round 2 (this session, continued)
- **CATEGORY MODEL CRACKED** (`LoadData @0x492EA0` full decompile): commodity category = **SN digits** � `category = sn/10000000 % 10`, `categorySub = sn/100000 % 100`; rows grouped in Category.img order with nStart/nCount/nNotAvailableCount; unmapped (cat,sub) THROWS; [80000000..89999999] on-sale items randomly distributed into rows; per-row sort. TS `_rebuildCommodities` now derives category/categorySub from SN digits; `_getCurrentPageItems` filters tabs by it.
- **`OnChangedSortType @0x481810`**: per-row selection sort of on-sale entries only � 0=priority asc, 1=price DESC, 2=SN asc ? TS `SetSortType()`/`_applySortType()`.
- **`IsUsableItemCheckFirst @0x486820`**: Evan-only dragon boxes 5620006/7/8 blocked for non-Evan (SP 0x162A) ported to `_isCommodityUsable`; the /10000==562 job-gate needs `nSubJob` (not tracked client-side) and mastery-book checks (`IsUsableMasteryBookItem @0x485B90`, SP 0x16CA/0x16CD) remain unported.
- Tests +3 (SN-derived categories incl. 30200018?cat3/sub2 regression, sort modes, Evan gate). **1704 tests pass**, tsc clean.

## Full audit doc (this session): `docs/cashshop-audit.md`
- **Root architectural gap found**: OG `CCashShop::CCashShop @0x4938B0` calls `CWvsContext::LoadCommodity @0x9FA230` ? `load_commodity @0x49BCD0`, which parses **Etc.wz/Commodity.img (12,318 entries, fields via StringPool 0xB0D..0xB19 + 0xC60..0xC64)** client-side; the SetCashShop packet only MODIFIES entries. TS built commodities solely from server data with an invented itemId-prefix category ? tabs/sub-tabs could never be 1:1.
- **Category model**: `load_category @0x49C1C0` parses **Etc.wz/Category.img** (33 rows: Category/CategorySub/Name); `GetCategoryIndex @0x47E590` = sub-row range per tab; pages = ceil(count/10) (`ChangeCategorySub @0x4C98F0`).
- **Status bar exact spec** (`CCSWnd_Status::Draw @0x4CBCD0`): `format_integer` thousands-commas; value-well rects (120,{11,25,40}) 107�11; right-align x=220; NexonCash y9 / Prepaid y23 FONT_NO_BLACK, **MaplePoint y38 FONT_NO_RED**.
- Tab strips = ONE 508�78 canvas per selected tab (`CSTab/Tab/1..9`, `Draw @0x4C68A0`) � TS already loads these.

## Implemented this session
- NEW `src/domain/CashCommodityTable.ts`: parses Commodity.img (SN?CSCommodity incl. MaplePoint/Meso/PBcash/Limit/Class/Premium) + Category.img rows. `CashShopStage._rebuildCommodities()` now starts from WZ base data, overlays server modified entries, then appends unmodified on-sale WZ commodities (legacy server-only path kept as fallback).
- Status bar 1:1: `_formatInteger` commas + MaplePoint red + wells already present.
- NX coin icons `CashItem/0..3` + `PrepaidCashItem/0` loaded; grid price row draws the coin sprite left of digits (text "N NX" fallback).
- Dialog chrome assets confirmed already wired (`CSGift/backgrnd(1)`, `CSChangeName/Base/*`, `CSTransferWorld/Base/*`, UtilDlgEx notice/BtOK/BtNo).
- Tests: status-bar comma/red assertions updated; `tests/domain/CashCommodityTable.spec.ts` (real-NX gated: >12k SNs, 33 category rows, SN 10000100?1702026/3900/90). **1701 tests pass**, tsc clean (only pre-existing e2e playwright env failure).

## Remaining cash-shop work (tracked in docs/cashshop-audit.md)
- Per-commodity?category assignment (OG fills CS_CATEGORY.nStart/nCount in LoadData path � needs `SetPlateNo @0x4C9B40`/`ChangePage @0x4CFC70` study), sub-category dropdown labels from Category.img names.
- CapsLock avatar-preview toggle (`OnKey @0x47F7C0`), BGM PlayBGM(StringPool 1290), job-variant backgrnd1..5 selection.
- Wishlist click-to-add/remove UI (OnSetWish/OnRemoveWish/GiftWishItem), sort modes (`OnChangedSortType @0x481810`), GoToCommoditySN, locker rebate, purchase-record map, IsUsableItem full strings.

# Session Summary � Map-transition fade fix (loading reveal) + FieldFadeInOut + CashShop ProcessBuy 1:1

## Map transition "fade-in too fast / still loading" fix (this session, IDB-verified)
- **User report**: fade-in too fast and the map is still loading when it reveals.
- **IDB**: `CUser::OnSetPhase` ? `RegisterFadeInOutAnimation(500, 400, 800, z, 220)` � the OG fade back to clear is **800 ms**, not the 300 ms the TS used. Between maps OG shows a plain black stage: `CInterStage::Init/Close` decompile to EMPTY bodies (no loading UI in v95 map change).
- **Fixes (`GameStage._advanceFieldTransition`)**:
  - Fade-in rate 0.30s ? **0.80s** (OG tFadeOut).
  - Phase-2 (hold at black) now additionally waits until the swapped-in field has rendered =2 frames (`_framesSinceSwap`, counted in `_drawFadeOverlays`) � reveal never precedes a real render.
  - `_fadeAlpha` starts at **1** (GameStage opens behind black like OG CInterStage; first SetField fades in from black � fixes the login?game pop).
  - The per-frame overlay draw was found pasted inside `_updateCoupleChairs()` (paste accident); moved into a proper `_drawFadeOverlays()` called from `_advanceFieldTransition`.

## FieldFadeInOut now actually fades (this session)
- **IDB**: `CUserLocal::OnFieldFadeInOut @0x905790` decodes **tFadeIn/tDelay/tFadeOut/nAlpha** (4 ints � NOT color/duration/fadeOut/fadeTime as the TS decode claimed); `OnFieldFadeOutForce @0x9057F0` decodes **tFadeOut** and forces every not-yet-fading entry to fade out now. `CAnimationDisplayer::RegisterFadeInOutAnimation @0x444770`: black canvas (DrawRectangle 0xFF000000), alpha 0?nAlpha over tFadeIn, hold tDelay, ?0 over tFadeOut.
- `FieldHandlers.ts` decode renamed accordingly; GameStage implements a `_fieldFades[]` list with `_updateFieldFades`/`_forceFieldFadesOut`, drawn via the same overlay (max of transition alpha & scripted envelopes).

## CashShop ProcessBuy 1:1 (this session, IDB-verified vs CCashShop::ProcessBuy @0x4936B0)
- **TS routing had wrong item-ID constants everywhere.** Correct v95 values (decoded from magic-number division immediates � e.g. `cmp ebx, offset loc_5265C0` artifacts are literal IDs):
  - Couple ring: `itemId/100 == 11120 && itemId != 1112000` (was `/10000==910` � that's PACKAGE!)
  - Package: `itemId/10000 == 910`; BuyNormal SN window: `[80000000..89999999]`
  - Friendship: `/100 == 11128 && %10 <= 2` (was `/10000==193`)
  - Char slot inc: `/1000 == 5430` (was `5000047`); Character sale: `5431000|5432000` (was `5000051/52`)
  - Equip slot ext: `/10000 == 555` (was `506`); Slot inc: `/10000==911 || /1000==5430 || 5431000 || 5432000`
  - Name change: **5400000** (was 5390000); World transfer: **5401000** (was 5390088)
  - Routing order = OG: couple?package?SN80M normal?friendship?charslot?charsale?equipExt?slotInc?nameChange?transferWorld?OnBuy.
- Added the OG one-a-day/mesobag YesNo gate (`sn/100000==210 || sn==5640000`, StringPool 0x15C4) as a modal `_showYesNo/_drawYesNoDialog/_handleYesNoClick` (Enter=yes, Escape=no) before the payment dialog.
- Tests: `tests/stages/CashShopStage.spec.ts` +6 (routing constants incl. couple-vs-package regression, YesNo gate confirm/cancel, non-gated direct path). **1700 tests pass**, tsc clean (only pre-existing `tests/e2e/map-rendering.spec.ts` failure: `@playwright/test` not installed � env issue).

## Remaining
- Cash shop deeper gaps for a future pass: CCSWnd_Tab category/categorySub model (`GetCategoryIndex/GetCategorySubIndex`), `OnChangedSortType` sorting modes, `IsUsableItem*` full validation strings (StringPool 0x16C5/0x16C6 formats), BGM PlayBGM(StringPool 1290), job-variant background canvases (StringPool 0x53E/0x53F/0x540/0x1970/0x1A72/0x1A73), wishlist click-to-add/remove UI (OnSetWish/OnRemoveWish/GiftWishItem).
- The e2e playwright suite needs `npm i -D @playwright/test` or exclusion from vitest.

# Session Summary � Character skills audit + mob debuffs actually affect the player

## Audit (4 areas � most already wired)
- **In-game casting**: keybind?`UseSkill` (opcode 103)?server `SkillHandler.handleSkill` is complete (HP/MP consume, cooltime, `skillUseResultPacket`, `UserRemote.effect` broadcast, affected-member `UserLocal.effect`). Client `_onUserEffect` plays the caster's own effect (types 10/14/20, combo indexing), `_onStatChanged` updates MP, `SkillCooltimeSet` drives cooldowns. **No gap.**
- **Skill window (CUISkill)**: tabs, SP-up with validation, skill guide, tooltips, cooldown overlay, position persistence � all present. **No gap.**
- **Mob skills on the player**: server `applyMobSkill` (MobHandler) applies seal/stun/poison/curse/etc via `TemporaryStatOption.ofMobSkill` ? `targetUser.setTemporaryStat` ? `TemporaryStatSet` to the player ? client `_onTemporaryStatSet` ? `_updateBuffVisuals`. The VISUALS were drawn but the **physics/behavior was never driven** � a stunned player still moved/attacked, a sealed player still cast.
- **Buff/passive stat effects**: `_syncStatDetailInputs` already folds HyperBody/SharpEyes/BasicStatUp/stance/magic-guard etc into the stat window and melee watk (from the earlier attack-range fix).

## Fixed (this session)
- **Stun ? immovable**: `_updateBuffVisuals` now calls `_physics.SetStunned(sec.isStunActive())`. Since the attack gate (GameStage:2559) and the other action gate (:5698) already check `IsImmovable`, a stunned player now actually freezes (can't move or attack), matching OG `CUserLocal::IsImmovable` (stun/freeze/web).
- **Seal ? cast-block**: `onSkillUse` now early-returns when `secondaryStat.isSealActive()` (sealed players can't cast active skills; dispel is the server-side exception).
- Tests: `tests/stages/GameStageDebuff.spec.ts` (4: updateBuffVisuals sets physics stun, real PlayerController IsImmovable toggles, seal blocks UseSkill, no-seal sends). **196 files / 1671 tests, 1666 pass / 3 skipped; only the 2 pre-existing `GameStageRevive` failures remain (`AttackAction is not defined`).**

## Remaining (pre-existing, NOT from this session)
- GameStage still won't `tsc --noEmit` clean: removed imports (`ActionMan`, `AttackAction`, `TombstoneEffect`, `BuffVisualOverlay`) + implicit-any `wx`/`wy` at :577. `AttackAction is not defined` at :5883/:5904 breaks `GameStageRevive.spec.ts` (2 tests).
- Freeze/web CTS bits aren't mapped in client `SecondaryStat` (newer-version bits); only stun drives immovability. Poison DoT ticks server-side but no client poison-damage counter visual.

# Session Summary � Melee attack range uses equipped weapon instance stats (stat-window parity)

## Bug (this session): "changing stats or equipping doesn't change the attack range / stats"
- **User report**: "ability stats even when change the stats or gets an equipment it doesn't change the attack range or the stats doesn't change at all".
- **Investigated the full stat pipeline** (server ? packet ? `_onStatChanged`/`onInventoryOperation` ? `_syncStatDetailInputs` ? `_stats.str` ? `StatsInfo.update`): the stat *computation* is correct and covered by `tests/stages/GameStageStatSync.spec.ts` (base+equip total written to `_stats.str`, `baseStr` kept separate). AP-up packet (server `statChangedMapPacket` ? client `handleStatChanged` short-read) verified 1:1. `_applyEquipOps` Move reads `_item.itemAt(tab, newPos)` where `newPos` is the negative equipped slot � `applyOps` keeps the InvItem's `equipStats` through the Move, so the equip bonus reaches `_equipStats`.
- **Root cause found**: the in-game melee damage range (`GameStage._tryMeleeAttack`) passed `attr?.IncPad`/`attr?.IncMad` � the bare **WZ template** weapon attack � into `calcDamageRange`. So a scrolled/enhanced weapon (or any per-instance equip bonus) never changed the damage the player dealt, even though the stat window showed the equip bonus. The stat window and the live attack used different sources.
- **Fix**: `_tryMeleeAttack` now reads the weapon's per-instance stats from `_equipStats.get(11)` (`incPad`/`incMad`) with a fallback to the template attr � same equip-inclusive source the stat window uses.
- Tests: `tests/net/packet/MeleeDamage.spec.ts` +3 (weapon-instance attack widens range, STR raises range, getWeaponType categories). **195 files / 1667 tests, 1662 pass / 3 skipped; only the 2 pre-existing `GameStageRevive` failures remain (`AttackAction is not defined`).**

## Remaining (pre-existing, NOT from this session)
- GameStage still won't `tsc --noEmit` clean: removed imports (`ActionMan`, `AttackAction`, `TombstoneEffect`, `BuffVisualOverlay`) + implicit-any `wx`/`wy` at :577. `AttackAction is not defined` at :5883/:5904 breaks `GameStageRevive.spec.ts` (2 tests).
- The `AttackAction` name at the melee call site (:5883/:5904) is part of that same pre-existing break; the melee edit itself compiles.

# Session Summary � Knockback fix (OG SetImpact diagonal launch) + character physics gap audit

## Knockback bug (this session, IDA-verified)
- **User report**: "when hit the character gets a little glitch and doesn't get knockback, almost goes under foothold".
- **Root cause 1 (weak launch)**: GameStage `ApplyKnockback` calls passed `vx=�200, vy=-100` / `�150, -80` � a HALVED upward vy. OG `CUserLocal::SetImpact @0x905E10` ? `CVecCtrl::SetImpactNext @0x749070` sets **vx = �nImpact, vy = -nImpact (equal magnitudes)** � a proper diagonal up-and-away launch. A weak vy barely lifts the character, reads as a glitch.
- **Root cause 2 (sink under foothold)**: the stagger branch in `PlayerController.Update` (0x385+) called `CollisionDetectFloat` but had no vertical landing fallback. `CollisionDetectFloat` skips the landing candidate when the player starts exactly ON the foothold line (`crossOld==0 && crossNew==0 ? continue`), so a grounded character knocked back along the surface sinks a few px below the foothold. `_fallFreely` already has the `GetFootholdBelow` vertical fallback; the stagger branch was missing it.
- **Fix**: GameStage knockback calls now pass equal magnitudes (`�200,-200`, `�150,-150`). `ApplyKnockback` now detaches from the foothold (OG `CVecCtrl::Impact @0x992050` does `DetachFromFoothold` first) so the launch is a clean arc, not a surface-gripped slide. The stagger branch gained the same vertical `GetFootholdBelow` landing fallback as `_fallFreely`, preventing the sink.

## Character physics audit (docs/character-full-audit.md is STALE)
- **Already implemented (audit claims missing)**: C2 jump boost (JustJump), C3 CollisionDetectFloat (full segment-crossing), C4 edge-walk, C5 foothold force (ice/conveyors), M1 slope speed modulation, M2 ladder �1.3, M8 tombstone at player pos, m1 trapezoidal integration.
- **Fixed this session**: m2 fly-capable shoe ground jump �0.7 (OG JustJump `if (v3) vy *= 0.7` � was only applied on the ladder branch), plus the two knockback issues above.
- **Still open (deferred, not this session)**: M3 knockback Impact-system parity (TS uses a stagger timer rather than the deferred-impact model � functionally close now that the launch is diagonal), M10 damage-number `-40` hardcoded offset vs `CAvatar::GetHeight()`, M6/M7 walk2/morph variants, M11/M12 remote-hit visual parity.

## Tests
- `tests/character/PlayerController.spec.ts` +4 (ApplyKnockback: detach from foothold, landing-fallback no-sink, equal-magnitude launch; 62 total). **195 files / 1664 tests, 1659 pass / 3 skipped; only the 2 pre-existing `GameStageRevive` failures remain (`AttackAction is not defined`).**

## Remaining (pre-existing, NOT from this session)
- GameStage still won't `tsc --noEmit` clean: removed imports (`ActionMan`, `AttackAction`, `TombstoneEffect`, `BuffVisualOverlay`) + implicit-any `wx`/`wy` at :577. `AttackAction is not defined` at :5883/:5904 breaks `GameStageRevive.spec.ts` (2 tests).

# Session Summary � Meso drop icon from Item.nx Special/0900.img + DropSprite absorb (OG ABSORBITEM)

## Meso drop icons (this session, NX-verified)
- **Money drops now render the real meso-bag sprites** from `Item.nx/Special/0900.img/0900000X/iconRaw/0` instead of DropSprite's colored-rectangle placeholder. Verified live: `Special/0900.img` has 4 bags `09000000`-`09000003`, each with `iconRaw/0..3` canvases (23�24 small ? 32�31 big, origins �(0,32) ground-anchored).
- **`ItemIconLoader.MoneyIconType(nMoney)`** � port of OG `CDropPool::GetMoneyIconType @0x50F440`: `<50 ? 0, 50-99 ? 1, 100-999 ? 2, =1000 ? 3`.
- **`ItemIconLoader.GetMoneyIcon(nMoney, nCanvasNo=0)`** � port of OG `CDropPool::GetMoneyIcon @0x512B30`: loads `Special/0900.img/<09000000+bucket>/iconRaw/<nCanvasNo>` (field uses canvas 0), resolves WzUol, caches per (bucket, canvas).
- **`ItemIconLoader.GetMoneyAnimation(nMoney)`** � port of OG `CDropPool::MakeMoneyAnimation @0x512DF0`: returns the 4 `iconRaw/0..3` spin frames + per-bucket delays (`<100 ? 80ms`, `100-999 ? 200ms`, `=1000 ? [4000,120,120,120]`), looping GA_REPEAT.
- `GameStage._onDropEnter` now loads the money icon + spin frames for `args.isMoney` drops (was `null` for money � only item drops got icons). `DropSprite` renders the money sprite via `NewSprite()` (origin-anchored at the drop point) when present, else the fallback coin-color rect; **the bag spins** through its `iconRaw` frames while resting on the ground (frame swap in `Update`, per-bucket delays).
- Drop sound (`Sound.wz/Game.img/DropItem`) fires on animated enter; pickup sound (`PickUpItem`) on local pickup � both already wired via `FieldSoundService`.

## Drop pickup absorb (from the prior pass, verified again this session)
- `DropSprite.StartAbsorb` = OG `ABSORBITEM::Update @0x441650`: 700ms, linear X/Y lerp + 40px mid-flight arc (`(11488774560*d�)>>45`), alpha 255?63 after 420ms. Target = player `NavelPosition` (body center).
- Removed orphaned `_onDropPickUp` (was `TS2304 DropPickUpRequestArgs`).

## Tests
- `tests/character/ItemIconLoader.money.spec.ts` (5: MoneyIconType buckets, real-NX `Special/0900.img` lookup gated on `MAPLECLAUDE_NX_DIR`, GetMoneyAnimation delays, DropSprite renders money sprite child, spin advances frames). **195 files / 1662 tests, 1657 pass / 3 skipped; only the 2 pre-existing `GameStageRevive` failures remain (`AttackAction is not defined`).**

## Remaining (pre-existing, NOT from this session)
- GameStage still won't `tsc --noEmit` clean: removed imports (`ActionMan`, `AttackAction`, `TombstoneEffect`, `BuffVisualOverlay`) + implicit-any `wx`/`wy` at :577. `AttackAction is not defined` at :5883/:5904 breaks `GameStageRevive.spec.ts` (2 tests).
- Non-local pickup absorb remains instant removal (no remote drop positions tracked); the OG `InsertCanvas` fade/zoom "pop" on money enter is not separately modeled (the spin is a frame swap only).

# Session Summary � Drop pickup animation (OG ABSORBITEM::Update) + orphan cleanup

## Drop pickup flow (already wired, verified this session)
- Client pickup path is complete end-to-end: keybind (`KeyAction.PickUp`) ? `_tryPickUpDrop()` (GameStage:2853), click-to-pickup (GameStage:969) ? `GameSender.PickUpDrop` (opcode 246) ? server `FieldHandler.handleDropPickUpRequest` ? `DropPool.pickUpDrop` ? broadcasts `DropLeaveField` (leaveType 2/3/5 + pickUpId) ? client `handleDropLeave` ? `_onDropLeave` (GameStage:6682) drives the absorb animation + `PlayPickUp()` sound. Server also has `PetHandler.handlePetDropPickUpRequest` (opcode 202) and `MobHandler.handleMobDropPickUpRequest`.
- `_onDropLeave` cases: local pickup (2/3/5 with pickUpId==localCharId) ? `PlayPickUp` + `StartAbsorb`; `Explode` (4) ? `StartExplode` scatter; everything else ? instant removal.

## Changes (this session)
- **Removed orphaned `_onDropPickUp`** (GameStage) � dead code left over from the earlier `DropPickUpRequestArgs` removal; it referenced the deleted type and caused `TS2304: Cannot find name 'DropPickUpRequestArgs'`. `_onDropLeave` already owns the pickup animation. **This clears one of the pre-existing tsc errors** (the remaining GameStage errors are the removed `ActionMan`/`AttackAction`/`TombstoneEffect`/`BuffVisualOverlay` imports + implicit-any wx/wy � all from earlier sessions, still unfixed).
- **`DropSprite.StartAbsorb` upgraded to authentic OG `ABSORBITEM::Update @0x441650`** (was a 0.4s quadratic ease `at*at` with alpha `1-at`):
  - **700ms** duration; `v16 >= 700` ? Finished (no position update on the final tick, matching OG early-return).
  - **X**: `(x2*v16 + x1.x*(700-v16))/700` � linear lerp drop?target.
  - **Y**: `(v10*v16 + x1.y*(700-v16))/700 + arc - 40` where `arc = (11488774560*d*d)>>45` (OG fixed-point, d = v16-350) ? arc is 40 at both ends and 0 mid-flight, so the effective -40 lifts the drop **40px up at the halfway point** (the classic fly-up-then-into-body parabola).
  - **Alpha**: 255 for the first 420ms, then `(192*(420-v16)/280 + 255)` ? **fades 255?63** over the last 280ms.
- **Absorb target ? player body center**: `_onDropLeave` now passes `() => this._player!.NavelPosition` (OG targets `character pos - CAvatar::GetHeight()/2`; `NavelPosition` is the real frame anchor on CharLook) instead of the feet `Position`.
- Tests: `tests/character/DropSprite.spec.ts` rebuilt (4: 700ms finish + last-animated-tick landing, 40px mid-flight arc, alpha hold-then-fade incl. `Math.floor` division, moving-target tracking). NEW `tests/stages/GameStageDropPickup.spec.ts` (3: local pickup ? StartAbsorb with NavelPosition target + sound, remote pickup ? instant removal + no sound, Explode ? StartExplode). **194 files / 1657 tests, 1652 pass / 3 skipped; only the 2 pre-existing `GameStageRevive` failures remain (`AttackAction is not defined`).**

## Remaining (pre-existing, NOT from this session)
- GameStage still won't `tsc --noEmit` clean: removed imports (`ActionMan`, `AttackAction`, `TombstoneEffect`, `BuffVisualOverlay` from the earlier drop-session cleanup) + implicit-any `wx`/`wy` at :577, + orphaned `_onDropPickUp` was the TS2304 now fixed. `AttackAction is not defined` at :5883/:5904 breaks `GameStageRevive.spec.ts` (2 tests).
- The OG absorb targets remote characters/pets/mobs too (ABSORBITEM supports `dwCharacterID`/`dwMobID`/pet index), but the client doesn't track remote drop positions, so non-local pickups keep instant removal (documented limitation).

# Session Summary � UserEnterField 1:1 fix (remote char visibility)

## Verified & fixed (this session)
- **Root cause of invisible remote characters**: `handleUserEnter` in `FieldHandlers.ts` used the wrong packet field order for `UserEnterField`, causing the client to read garbage after the first few fields and bail before creating the remote character.
- **OG `CUserRemote::Init` field order** (0x955460): charId(int), level(byte), name(str), guildName(str), guildMarks(2+1+2+1), **`SecondaryStat::DecodeForRemote`** (16-byte UINT128 flag + per-stat variable data + 2 trailing bytes + up to 7 two-state decodes), job(short, AFTER stat), AvatarLook(iPacket, AFTER job), 6 ints (driver/passenger/choco/effect/set/chair), x(short)/y(short)/moveAction(byte)/foothold(short)/adminEffect(byte), pet loop, tamingMob(3 ints), miniRoom(7 fields), adBoard, coupleRecord, friendshipRecord, marriageRecord, effectFlags(byte), newYearCards, phase(int).
- **Three bugs fixed in `handleUserEnter`**:
  1. Names were `readString()` (fixed-length bytes) instead of `readString()` without args (maple length-prefixed string). Fixed.
  2. AvatarLook was decoded BEFORE job, but OG decodes job(short) THEN AvatarLook. Fixed.
  3. SecondaryStat for remote was never decoded � just skipped 20 bytes which is wrong. Added full `SecondaryStat.skipForRemote`.
- **`SecondaryStat.skipForRemote`** added: reads the 16-byte UINT128 flag (two `readLong`), skips per-stat data in OG `REMOTE_STAT_SKIP` table (44 entries: Speed?1byte, ComboCounter?1byte, WeaponCharge/Stun/Darkness/Seal/Weakness/Curse?4bytes each, Poison?6bytes, ShadowPartner?4bytes, DarkSight/SoulArrow?0bytes flag-only, Morph/Ghost?2bytes, Attract/SpiritJavelin/BanMap/Barrier/DojangShield/ReverseInput/RespectPImmune/RespectMImmune/DefenseAtt/DefenseState?4bytes each, DojangBerserk/DojangInvincible/WindWalk?0bytes, RepeatEffect/StopPortion/StopMotion/Fear/MagicShield?4bytes each, Flying?0bytes, Frozen/SuddenDeath/FinalCut?4bytes each, Cyclone?1byte, Sneak/MorewildDamageUp?0bytes, Mechanic/DarkAura/BlueAura/YellowAura?4bytes each, BlessingArmor?0bytes), reads 2 trailing bytes (DefenseAtt_Elem + DefenseState_Stat), then up to 7 two-state entries (bits 122-128, each if set ? skip 15 bytes).
- **Server `FLAG_SIZE` fixed**: Changed from `17` to `128` in `CharacterTemporaryStat.ts:142`. `BitFlag(128)` ? `Math.ceil(128/8)=16` bytes, matching OG `UINT128`.
- **Server `UserPacket.ts` fixed**: Added `w.writeBoolean(false)` for FriendshipRecord and MarriageRecord between coupleRecord and effectFlags byte. Also fixed NewYearCard encoding: now writes `count + count�cardId` (int) instead of full card objects � OG only reads cardIds in the remote enter packet.
- **Server CoupleRecord encoding fixed**: `encodeForLocal(w, false)` was writing `int+int+int+string+string+short`, but OG reads `long(8)+long(8)+int(4)` = 20 bytes. Now writes `writeLong(coupleId)+writeLong(0n)+writeInt(0)`.
- **`OtherCharEnterArgs` interface updated**: Removed stale fields (allianceTag, grade, chHair, chHairColor, chFace, sex), added moveAction, foothold, adminEffect.
- **`FieldHandlers.spec.ts` UserEnterField test rebuilt**: Test packet now uses maple string encoding, 16-byte secondary stat flag + 2 trailing bytes, short job, AvatarLook after job, 6 ints, full tail with pets/tamingMob/miniRoom etc. Test passes (92/92 in that file).

## Code changes
- `src/net/handlers/FieldHandlers.ts:1852` � `handleUserEnter` rewritten to match OG `CUserRemote::Init` field order
- `src/character/SecondaryStat.ts` � new `skipForRemote(p)` static method with `REMOTE_STAT_SKIP` table (44 entries), `_isBitSet` helper preserved
- `src/net/handlers/PacketArgs.ts:103` � `OtherCharEnterArgs` interface updated
- `server/src/world/user/stat/CharacterTemporaryStat.ts:142` � `FLAG_SIZE = 128` (was 17)
- `server/src/world/user/UserPacket.ts` � friendship/marriage booleans, NewYearCard count+id format, CoupleRecord long+long+int format
- Tests: `tests/net/handlers/FieldHandlers.spec.ts` (92 tests, 1 rebuilt). **191 files / 1642 tests pass (3 skipped NX-gated), tsc clean.**

## Remaining
- Pet loop body has `break` with TODO � CPet::Init decode not yet implemented for remote chars. Server encodes no pets so non-blocking, but needed for full OG compatibility.
- Client-side `SecondaryStat` CTS bit constants (CTS_STR=0, CTS_PAD=4) are from a newer version, not v95 (server uses PAD=0, PDD=1, MAD=2, MDD=3). Pre-existing mismatch, not yet fixed.

# Session Summary - CWorldMapDlg authentic rewrite (base canvas + markers + spots + links)

## WorldMap.ts rewritten 1:1 from CWorldMapDlg decompiles (this session)
- **NX structure verified** (`Map.nx`, `MapHelper.img` marker canvases found � earlier "missing" was a probe-path error): root `WorldMap/` dir holds `WorldMap.img` (whole world: BaseImg + 12 MapLink + 23 MapList) and `WorldMap###.img` regional maps (000 parentMap=WorldMap; 010 Victoria w/ 3 MapLink + 97 MapList; 011-013 + 020-021 etc.; **011 is a leaf � no MapLink**). Base canvases: WorldMap/010/011/012 640�470 origin=(320,235), WorldMap000 640�452 origin=(320,226), WorldMap013 640�470 origin=(320,236). Markers: `MapHelper.img/worldMap/mapImage/{0..3}` (20�20@(9,9)/14�14@(6,6)/20�20@(9,9)/13�13@(6,6)) + `npcPos{nType}/0..6` (per-item NPC layers). MapLink schema: `MapLink/<i>/link/linkImg` (canvas) + `link/linkMap` (str) + **`toolTip` is a direct child of `MapLink/<i>`** (sibling of `link`). MapList items: `mapNo` (int array), `spot` (vector), `type`; `title`/`desc`/`path`/`bNoToolTip` optional.
- **`src/ui/game/WorldMap.ts` fully rewritten** (was a placeholder transfer-list overlay). Ports: `GetDeepestWorldMap` (exact loop: outer v3=0..20 probes `10*v3` ? WorldMap000,010,020�; on hit inner i=1..10 probes `i+10*v3`; **fallback j=140..142 runs even after an outer hit with no inner hit and overrides pReturn**); `SetWorldMap` (BaseImg/0 ? m_pCanvasWM + mainOrigin; then markers, MapList, MapLink); `LoadMapList` (nX=spot.x+origin.x, nY=spot.y+origin.y, type, bNoToolTip, title, desc, path, mapNo); `LoadMapLink`; `Draw` order (border bg ? base `Copy(13,24)` ? head pathImg ? markers origin-anchored at (nX+13,nY+24) ? tail linkImg origin-anchored at (mainOrigin+13,mainOrigin+24)=(333,259)); `CheckSpotInfo` (`|nX-(rx-13)|<=w/3 && |nY-(ry-24)|<=w/3`, w=marker width, nSelectedWMI_TT any hit / nSelectedWMI only with pathImg); `CheckLinkInfo` (bounding-box fallback on linkImg rect); close (id 2 @ w-22,4) + quest-toggle (id 2000 @ w-65,4) buttons; transfer-list mode preserved exactly.
- **Public API preserved** (spec regression-safe): `constructor(loader?, mapWz?)`, `OpenMapTransfer(mapIds)` (rows at (30,48,150,18), x=30+floor(i/10)*180, y=48+(i%10)*22), `onTeleportToMap`, `onNavigateToMap`, `handleMouseButton`, `isVisible`. **New**: `openForField(fieldId)` (resolves deepest map, skips reload for same field), `navigateTo(linkMap)` (drill down; fires `onNavigateToMap` too).
- **GameStage wiring**: `_toggleWorldMap()` helper � hides if open, else `_worldMap.openForField(this._field?.LoadedMapId ?? 0)`. All 3 toggle sites routed through it: minimap `onBtWorldMap` (�2, @1145 + @5018) and key case 5 (@796). Note: minimap onBtWorldMap assignments at both sites + key case.
- Tests: `tests/ui/game/WorldMap.spec.ts` (6: transfer row, deepest-map spot hit, fallback 140-142 probe, no-field fallback, same-field no-reload, link drill-down + onNavigateToMap). `tests/ui/game/WorldMap.wz.spec.ts` (3, real Map.nx gated on `MAPLECLAUDE_NX_DIR`, uses sync `WzPackage.Open` � async `OpenBaseAsync` returned garbage NX strings in this env): Henesys?WorldMap010 with 97 spots + mapNo hit, draw-no-throw + base canvas + markers, Sleepywood link drill-down. **191 files / 1642 tests pass (3 skipped = NX-gated without env), tsc clean.**

## Remaining
- `ScoreLinkMap @0x9B83B0` (quest-mob scoring for the quest-toggle display) not ported � the toggle button flips `_questToggle` only, no quest-mob marker overlay yet.
- Quest markers (`npcPos{nType}` layers, `MapHelper.img/worldMap/npcPos*`) loaded only as data if at all � not yet wired to per-item NPC/quest-state icons.
- Window chrome (MakeBorder 9-slice `UI/UIWindow2.img` + white plate + title canvas @(304,0)) is a Graphics fallback, not the WZ border; markers/base are the authentic WZ sprites.
- Tooltips (SetToolTip_WorldMap on hover) not wired � hover sets `_selectedSpotTT` for future use.

# Session Summary - ChatBar combo box WZ label fix (chatTarget canvases) + input font color

## Chat-target combo box never showed the WZ sprite (this session, NX-verified)
- The combo box in the ChatBar was a `#111` Graphics fallback: `loadWzAsset(loader, ctBase, 'base')` descended to the `base` PROPERTY node, which has NO `0`/`bmp` child � only `disabled/mouseOver/normal/pressed` state subtrees (each with a 68�21 canvas at origin (510,58)). `loadWzAsset` unwraps `0`/`bmp`, so it must descend to `base/normal`.
- **Fix** (ChatBar.ts ~2090): `this._combo.loadWzAsset(loader, ctBase, 'base/normal')` � the 68�21 WZ sprite now loads as the box background.
- The combo-item LABELS are also WZ canvases: `StatusBar2.img/mainBar/chatTarget` has DIRECT children `all` (37�9), `friend` (53�9), `party` (53�9), `guild` (48�9), `association` (62�9), `expedition` (51�9), origins (498,54)/(502,54), z=5. There is NO `label` folder and no `0`/`bmp` under `base`. Old code read `chatTarget/label/*` (which never existed) ? no labels ever rendered.
- **Fix** (ChatBar.ts ~2278): label loading reads direct children via `labelForTarget = {0:'all',1:'friend',2:'party',3:'expedition',4:'guild',5:'association'}` keyed by target index; target 8 "Find" has no canvas.
- **New `_applyComboLabel(target)`** (ChatBar.ts ~977): if `_chatTargetLabels[target]` is a WzSprite ? `ws.NewSprite()`, anchor (0,0), position `(510 - ws.OriginX, 58 - ws.OriginY)` (= (12,4) for the 498,54 origins), `_combo.setLabelSprite(s)`; else fallback `setLabelSprite(null)` + `setLabel('Whisper'|CHAT_TARGETS[target])`. `setChatTarget` (line ~969), `setChatTargetByName` (~1000), and the Tab-cycle whisper path (~1264) all route through it. ComboBox got `_labelSprite` + `setLabelSprite(sprite)` (hides the Text when a sprite is shown).
- OG combo config verified (`CreateCtrl_2(parent, 1012, nType=1, 3, 519, 68, 21, param)` � position (3,519) 68�21; the TS COMBO_X/Y/CHAT_DY constants are correct).
- **Input text color fixed** (ChatBar.ts ~149): `m_paramEdit.nFontColor = -16777216` = **0xFF000000 black** (`nFontHeight=11`, `sFont=StringPool 6693`); `_inputStyle` was `#FFD` cream (placeholder) ? now `#000000`. FONT_COLORS table for the chat log was re-verified against OnCreate (all 27 entries match).
- Tests `tests/ui/game/ChatBar.spec.ts` +4: label sprite shown at (12,4) + text hidden; whisper/find fallback text; combo click routes through `_applyComboLabel` + fires `onChatTargetChange`; input text black. **191 files / 1635 tests pass, tsc clean.**

## Remaining
- `CHAT_TARGETS`/`CHAT_TARGET_INTERNAL` still use legacy names (`whisper`/`buddy`/`alliance`/`find`) vs the real label canvases (`friend`/`association`/`expedition`) � dropdown TEXT labels may need reconciling with OG item order (0x324 All, 0x327 Whisper, 0x323 Party, 0x189C Buddy, 0x326 Guild, 0x1896 Alliance, 0x322 Find) if still wrong.
- CCtrlComboBox::Draw (0x4DD250) live decompile still pending � the IDA MCP worker crashed during it and the prior session's AGENTS.md notes that a restart may be needed if a live decompile is required.

# Session Summary - Invisible drops root-caused (link-mob reward keys) + mob HP/stats verified

## "Drops are not visible" = reward data keyed wrong for link mobs (this session)
- The server spawns map `life` mobs by their **link template id** (client log `[MobCtrl] CREATED tmpl=100000`; `LifeInfo.from` does `parseInt(n.nGet('id'))` on the zero-padded life string `"0100000"` ? 100000). But our 39 reward YAMLs are keyed by the **real** mob id (`100100.yaml` Snail). `Mob.dropRewards` ? `RewardProvider.getMobRewards(100000)` ? `[]` ? **no DropEnterField ever broadcast** ? nothing to render.
- **Fix** (`server/src/provider/MobProvider.ts`): new `resolvedMobIds` map + `getResolvedTemplateId(mobId)` � non-link mobs map to themselves; linked mobs map to the **final resolved img id** (the one whose img owns the data). `Mob.dropRewards` and `Mob.steal` now call `RewardProvider.getMobRewards(MobProvider.getResolvedTemplateId(getTemplateId()))`.
- **kinoko parity**: kinoko ships BOTH `100000.yaml` and `100100.yaml` (reward lookup keyed by spawn id). Our convention is real-mob-id only, so resolving links for the lookup is the equivalent. Verified kinoko's `MobProvider` uses the **same** link resolution we do (linked mob's own `info` + linked img's property).
- New `server/test/provider/mobProviderRewardLink.test.ts` (4, real NX gated on `Mob.nx` + `100100.yaml` existing): 100000?100100, non-link identity, Snail stats (maxHp 15 / exp 3 / level 1), `dropRewards` produces meso drops. Existing `rewardProvider` + `mobRewards` tests still pass; server `tsc --noEmit` clean.
- **NX scan fix**: `node()` in my ad-hoc NX scripts omitted the node offset (`n.o`), so all string/int value reads were garbage (`undefined`, bogus `link=1783906953546576`). Store `o = nodeOff + id*20`. (Also: life `id`/`type` are **strings**, `id` is zero-padded.)

## Mob HP / "killed by 1 hit" check (this session) � NOT a mob-info bug
- **Mob stats load correctly**: kinoko uses the identical link-mob approach (link mob's own `info` node). Snail maxHP=15 (real v95 value). Verified via NX scan: **346/469 link mobs carry full stats in their own info**; the 123 "missing" are only missing `eva`/`exp` (defaults 0) on special/buff mobs � same as kinoko.
- **Server is client-authoritative on damage** (`AttackHandler.calcAttackDamage`: `assertDamage` only logs mismatches; the client-sent `ai.damage[]` is trusted). So "1 hit" reflects the **client's** `calcDamageRange` roll (`src/net/packet/MeleeDamage.ts`, decompile-verified formula, clamps min 1). A beginner with a starter weapon (watk ~15-20, str/dex ~15) rolls 4-18 vs 15 HP ? 1-2 shots. Normal balance, not missing mob info.
- Spawn packet carries `mob.getMaxHp()` (MobPacket.mobEnterField) ? client `handleMobEnter` reads `maxHp` ? `_onMobEnter` sets `mob.MaxHp` (GameStage.ts:5183). HP bar is correct end-to-end.

## Remaining
- The client `MobInfoService._parse` still loads `${templateId}.img` (the link mob) directly � the fields it reads happen to exist in link info, but a link-mob audit of every `MobInfo` field it uses is a latent gap (animations already handled in MobLook.Load).
- Reward data only covers 39 Victoria Island mobs � any other map's mobs still drop nothing (by design, until more reward YAMLs are authored).

# Session Summary - CUIToolTip font audit (FONT_TYPES shift fix) + equip stats now apply to the stat window

## Tooltip font types were WRONG (this session, IDB-verified)
- **`GetFontByType @0x881D40` switch has 25 cases, NOT 27** � there is no HL_Green / Gen_Gold. Case 5 = HL_Blue, 10 = Gen_White, 21 = STAN_PRP, 23 = STAN_NUM. The TS `FONT_TYPES` enum had been shifted by one (HL_White=1..SKILL_DSC=27), so EVERY symbolically-referenced font colored the tooltip with the wrong value.
- **`DrawItemTitle @0x88CCB0`** (re-verified live): equip branch draws the name in **font 3 (HL_ORANGE)** then the desc (StringPool 0xC35) in **font 1 (HL_WHITE)**, pair-centered at `(w - descW - nameW)/2`; non-equip branch draws desc (0xC36) in **font 10 (GEN_WHITE)** first, then the name in **font 14 (GEN_ORANGE)**. TS was using HL_WHITE/GEN_RED for the title and GEN_WHITE/H_WHITE for descs.
- `getItemName` quality mapping corrected: quality 1?HL_Blue, 2?HL_Violet, 3?HL_Gold, 4?HL_Green2, 5?HL_Excellent (-1?HL_Gray).

## Equip stats never reached the stat window (this session)
- `GameStage._syncStatDetailInputs` computed the totals (base + equip + options) into `_statDetailInfo.Inputs` but **never wrote them back into the main StatsInfo panel** � `_stats.str` stayed the raw server base forever, so equipping an item with incStr changed nothing in the stat window (it rendered `base (+0)`).
- **Fix** (`src/stages/GameStage.ts`): `_syncStatDetailInputs` now reads the base inputs from `_stats.baseStr/baseDex/baseInt/baseLuk` (persistent) and writes the computed totals back into `_stats.str/dex/intStat/luk/maxHp/maxMp`. `_applyStatToStatusBar` and `_onStatChanged` set both the total field AND the base field to the server value. `/resetap` (AP dialog) and the equip/item `SetPlayerStats` (tooltip req-met checks) now pass `baseStr` etc. � equipment bonuses must NOT count toward equipping other items.

## Code changes
- `src/ui/game/ToolTip.ts`: FONT_TYPES trimmed to the 25-IDB IDs (HL_White=1 .. SKILL_DSC=25), FONT_COLORS/FONT_SIZES aligned (HL_Blue=0x5CA1FF, Gen_White=0xFFFFFF, Stan_Prp=0xFAE8CB), removed the phantom HL_Green/Gen_Gold keys; `drawItemTitle` fonts corrected per DrawItemTitle (equip name font 3 / desc font 1; non-equip desc font 10 / name font 14).
- `src/ui/game/ItemTooltip.ts`: replaced every hardcoded numeric `getFontColor(N)` with `FONT_TYPES.*` enum references (they were written against the pre-shift enum); titleDesc now uses HL_WHITE per DrawItemTitle.
- `src/stages/GameStage.ts`: stat write-back (see above) + base-stat plumbing.
- Tests: `ToolTip.spec.ts` (FONT_TYPES constants, font colors/sizes, quality?lType, unknown-fallback reference, fixed a pre-existing `tip is not defined` ReferenceError in the quality test); NEW `tests/stages/GameStageStatSync.spec.ts` (2: equip incStr flows into `_stats.str` total while `baseStr` stays separate; no-equip keeps total===base). **188 files / 1615 tests pass, tsc clean.**

## Remaining
- The `Cash`/star-force labels after the equip name in `ItemTooltip._drawEquip` are invented extras (not in v95 SetToolTip_Equip); only their colors were corrected, not removed.
- The WZ `Dot/1` (3x3) canvas still isn't used for the info-row dots (`_dot` uses a Graphics 2x2 rect); drawTooltipEquip's `m_pCanvasDot[1]` blit is the OG source.

# Session Summary - Damage UI WZ digits (miss glyph + mob damage routing)

## Verified (live IDB decompiles + real Effect.nx, this session)
- The miss glyph is NOT a separate `NoMiss`/`Miss` node � `CAnimationDisplayer::Effect_Miss` @0x449A50 reads a StringPool-named child of `m_pEffNo_Red0` (`Effect_Miss` case 2 = `NoViolet0`). NX scan confirms `BasicEff.img/NoRed0` has 12 children: digits 0-9 + **`Miss`** + `guard`; `NoViolet0` also has `Miss`; `NoCri1` has 11 (digits + `effect`). No `NoMiss`, `Miss`, `Basic`, or `Cri` nodes exist.
- `Effect_HP` @0x444EB0: first digit uses the `_1` set (NoRed1/NoCri1), subsequent digits use the `_0` set (NoRed0/NoCri0) � TS `DamageDigits` still uses one set for all digits (minor parity gap, visually fine).
- The mob's own `ShowDamage` ? `_damageNumbers` ? `_drawDamageNumbers` rendered damage as **plain `Text`** � that was the "placeholder text" the user saw on mob hits. The server broadcasts `mobDamaged` to ALL (AttackHandler:423, no except), so the local attacker got a WZ-digit number (optimistic `_dmgNumbers.Add` at melee 5828) AND a plain-Text echo (`_onMobDamaged`?`ShowDamage`) � double render.

## Code changes
- `src/ui/DamageDigits.ts`: miss path `BasicEff/NoMiss/0` + `Miss/0` ? **`BasicEff/NoRed0/Miss`** + `BasicEff/NoViolet0/Miss` (real NX locations). `LoadedMiss` now true against real Effect.nx.
- `src/character/MobLook.ts`: new `RevealLabel()` (idempotent HP-bar/name-tag reveal); `ShowDamage` delegates to it. The floating number is now drawn by the shared WZ-digit renderer.
- `src/stages/GameStage.ts`: `_onMobDamaged` routes the number through `this._dmgNumbers.Add(damage, mob.HeadPosition.x, mob.HeadPosition.y, DamageKind.DamageNormal)` (white WZ digits) instead of `mob.ShowDamage`; removed the optimistic `_dmgNumbers.Add` in `_tryMeleeAttack` (server echo now renders it once � server-authoritative, matching OG where `mobDamaged` triggers the number). MobLook's own Text `_drawDamageNumbers` path is now unused in the main flow (only `OnMobAttackedByMob`/`ShowDamageAdvanced` leftovers, both unwired).
- Tests: `tests/ui/DamageDigits.wz.spec.ts` now asserts `LoadedMiss`; `tests/character/MobLook.spec.ts` +1 (RevealLabel idempotent). **186 files / 1608 tests pass (with real NX), tsc clean.**

## Remaining
- Dual-set digits (`_1` first digit + `_0` rest per `Effect_HP`) not ported to `DamageDigits` � cosmetic parity only.
- `AnimationDisplayer.EffectHP`/`EffectMiss` placeholders (Graphics rects) are a separate legacy path; mob damage now bypasses them via `_dmgNumbers`.

# Session Summary - Attack while walking (IDA-confirmed) + invisible mob link fix

## Attack while walking (this session, IDA-verified)
- **`CUserLocal::TryDoingNormalAttack` @0x9123C0** pre-conditions are ONLY: `!IsImmovable`, `!CAvatar::IsOnPlayingOneTimeAction`, `!IsAttract`, `!IsPreparingSkill`, and `!CVecCtrl::GetLadderOrRope` � **walking is NOT a blocker**. No velocity manipulation anywhere in the attack path.
- **`CUser::SetAttackAction` @0x8E70B0** (524 bytes) only sets `m_nOneTimeAction` + `PrepareActionLayer`; never touches `m_pvc` velocity. So holding attack while holding Left/Right keeps the walk going; the attack one-time action renders over the walk stance.
- **Fix**: removed `this._physics.StopWalking();` from `GameStage._tryMeleeAttack` (was the only artificial blocker; the animation layer already plays the one-time action over the stance via `CharLook.UpdateFromPhysics`'s `IsPlayingOneTimeAction` gate). `PlayerController.StopWalking` kept (still has its own unit test; now unused in src).
- Tests `tests/stages/GameStageRevive.spec.ts` +2 (mocked `_tryMeleeAttack`): attack does NOT call `StopWalking`, and still sends the melee packet. **185 files / 1596 tests pass, tsc clean.**

## Invisible mobs (this session) � `info/link` redirect in `MobLook.Load`
- Mobs attacked the player (hit anim at GameStage.ts:6267 from client-side `MobController`) but never rendered. Console: `[MobCtrl] CREATED mobId=17 tmpl=100000`. **Template 100000 is a link mob**: `Mob.nx/0100000.img` carries ONLY `info` (incl. `link="0100100"`) and NO animation states; its `stand/move/hit1/die1` live in the linked `0100100.img` (real Snail). `MobLook.Load` loaded `0100000.img` directly ? zero frames ? `_anims` empty ? `_loaded=false` ? `Update` early-return @1463-1464 before `_updateDisplay()` ? container never populated ? invisible but fully functional mob.
- **Fix**: `src/character/MobLook.ts` `Load()` � after resolving the template img, reads `info/link`; when it's a **string** (`"0100100"` � mob links are string paths, unlike the numeric link index in `ActionMan.ts:774-820` for NPC/pets), re-resolves `root` to `${link}.img` before iterating states.
- Tests `tests/character/MobLook.spec.ts` +2: link redirect loads stand+move from the linked img (`_loaded=true`); missing link target leaves `_loaded=false`. Uses stub `WzPackage` + inline-`items` `WzProperty`/`WzCanvas` (no real NX needed).
- Map 10000 `life` nodes are all NPCs (`type="n"`); the 100000s spawned via server `Field.initSpawnPoints` reading `lifeInfos`.

## Remaining
- `MobInfoService` / other template-100000 consumers may need the same link resolution if they read per-mob img fields (MobController works today because it consumes packet-carried HP).
- The camera `_clamp()` centering change (prior commit) is unrelated to the mob bug (ruled out by packet flow + console evidence).

## Verified (live IDB decompiles, this session)
- The v95 NPC-talk dialog **IS `CUtilDlgEx`** (there is no separate `CUtilNpcChat`). `CScriptMan::OnScriptMessage` (0x6DE0F0) ? `CUtilDlgEx::SetUtilDlgEx` (0x98E9F0). The packet's `messageParam` byte = `m_bParam` (NotCancellable=0x1, PlayerAsSpeaker=0x2, SpeakerOnRight=0x4, FlipSpeaker=0x8).
- **SetNPC @0x98C9B0** (8.2KB): speaker renders in the left panel via `Npc.wz/%07d.img`, standing action index `(actCount>2)?2:1`, GA_REPEAT idle. Name tag = 121�23 canvas (`Create(0x79,0x17)`), `UI/UIWindow2.img/UtilDlgEx/bar` (109�19) pasted at `((121-109)/2, 3)=(6,3)`, name centered `((121-textW)/2, 5)` FONT_SMALL_WHITE (StringPool 976 tag path, 1649 name label). Flip via `put_flip(m_bParam & 8)`.
- **Coordinate space**: `InsertCanvas` anchors the canvas TOP-LEFT at the layer origin, so the OG `npcY`/`tagY` are canvas-top coords (NOT feet). Struct offsets verified: `m_scrHeight @0xA8` (`pOverlay[42]`), `m_height(CWnd) @0x28` (`pOverlay[10]`), `m_bSpeakerOnRight @0xC38` (`pOverlay[782]` � NOT m_bQuest), `m_bParam @0xC34`. Anchor math with `v127 = H + 23`:
  - x = 52 (avatar/pet) | 442 (m_bSpeakerOnRight) | 76 (normal)
  - fits (`v127 <= m_scrHeight`): `npcY = (m_scrHeight-v127)/2 + 22`, `tagY = H + 20 + (m_scrHeight-v127)/2 + 2`
  - overflow: `npcY = m_wndHeight - v127 - 55`, `tagY = m_wndHeight - 75` (collapses to `H-52+m_height-v127`)
  - NPC layer y += 7 (normal) / 14 (avatar); NpcLook container y needs **+OriginY** (feet anchor vs canvas-top).

## Code changes (this session)
- `src/ui/game/UtilDlgEx.ts`:
  - **`_setNpc()`** � full SetNPC port: NpcLook speaker at the authentic x-anchor/formulas (+OriginY), flip via `container.scale.x = (m_bParam&8)?-1:1`, name tag (WZ `bar` + centered name, 121�23) below the feet.
  - New `_npcLayer` + `_bgLayer` (background composite now kept BELOW content/speaker � the old `_buildBackground` appended sprites to `_root` on top of the speaker, hiding it). `_buildBackground` clears/fills `_bgLayer` only.
  - Removed the naive speaker block from `_buildTextContent` (was scale 0.8 at (6, ctTop+10)).
  - Added `scriptMsgType`, `pendingQuestId/NpcId/X/Y`, `npcNameOf`, `startQuizTimer()` (countdown auto-cancels ? SetRet(2)), NPC idle animation via `_npcLook.Update(dt)`.
  - Fixed LIST selection: `_selectListItem` now syncs `m_nListFocus` so "Select" (id 8193) confirms the CLICKED item (was resetting to focus 0).
- `src/stages/GameStage.ts`:
  - `_onScriptMessage` now routes through `_utilDlg` (authentic CUtilDlgEx) instead of the custom `NpcTalk`: forwards `messageParam`?`m_bParam`, `scriptMsgType`, `npcNameOf`, wires `onResult`?`_onScriptDialogResult`. Mapping: Say/SayImage?TEXT+SetUtilDlgEx_TEXT(prev,next); AskYesNo?YESNO; AskText?INPUT_STR; AskBoxText?MLINPUT; AskNumber?INPUT+INPUT_NO; AskMenu?LIST+AddDotLine; AskQuiz/SpeedQuiz?INPUT_STR+hint+startQuizTimer; AskAccept?YESNO with m_bQuest=true + pendingQuestId.
  - `_onScriptDialogResult`: ok/next?ScriptAnswerSay(msgType, Select) (menu?ScriptAnswerNumber(AskMenu, GetSelect())); prev/cancel?ScriptAnswerCancel(msgType); yes?QuestAccept (quest) else ScriptAnswerYesNo(true); no?ScriptAnswerYesNo(false); text/number/quiz answers via GetInputStr_Result/GetInputNo_Result.
  - Added `_utilDlg` to `_panels` (keyboard/update routing); added imports ScriptMessageParam/ScriptAnswerAction/UtilDlgResult.
- Tests `tests/ui/game/UtilDlgEx.spec.ts` +6: SetNPC positions (76/442/52 anchors), name-tag, no-NPC skip, FlipSpeaker bit-8, quiz auto-cancel, LIST clicked-choice confirm; `_bgLayer` test updates. **183 files / 1582 tests pass, tsc clean.**

## Remaining
- AskAccept position (pendingX/Y) always 0 � the v95 packet doesn't carry an NPC position for AskAccept; server-side QuestAccept ignores it (matches kinoko).
- `NpcTalk.ts` (custom-drawn) is now dead for script messages but still constructed/listed in `_panels` � harmless; safe to delete in a later cleanup.
- Quiz answer wire format sent as `ScriptAnswerText(AskQuiz, text)`; the server's `handleNpcTalkMore` doesn't case ASKQUIZ (default warn, unconsumed bytes) � a server-side gap, no desync (packet framing is by header length).
- The quest `it/ic/is` background variant is gated on `(m_bParam & 6)` � the game's script decoder only forwards `messageParam` verbatim; some private servers may send 0 for quest dialogs, falling back to the standard t/c/s frame.

# Session Summary - Character name tag fixes (DrawNameTags audit)

## Verified (live IDB decompiles, this session)
- **CUser::DrawNameTags @0x8EA990** calls `CLife::MakeNameTag` 3� on `m_pLayerUnderFace`: name (type **1000**, `m_sCharacterName` � NO level prefix), guild (type **1004**, `m_sGuildName`), medal (type **1006**, `CItemInfo::GetItemName(anHairEquip[49])`).
- **CLife::MakeNameTag @0x5CF5E0** (9598 bytes): plate = WZ canvas via StringPool 0x3D0 (976); font face StringPool 0x5AF (1455); tag WZ path format strings 0x541 (1000), 0x542 (1003), 0x543 (1006) with nIdx; layer slot 0 (1000/1001/1003), 1 (1002/1004/1005/1007), 2 (1006). Text FONT_BASIC_WHITE (white ring: black + StringPool 0x1457 style; yellow 0xFFFFFF00 for 1001/1002; white plate w/ 0xB2FFFFFF overlay + guild mark). Per-node text color from property child StringPool 1454.

## Code changes (this session)
- `src/character/OtherCharLook.ts`: name tag now renders **just `this.Name`** (was `[Level] Name` � the OG draws only `m_sCharacterName`); added `itemNameOf` resolver so the type-1006 medal tag shows the real item name (was `Medal[<id>]`).
- `src/stages/GameStage.ts`: `_onUserEnter` wires `ch.itemNameOf = (id) => this.game.nameService?.ItemName(id) ?? \`Medal[${id}]\``.
- Tests: `AvatarAnchors.spec.ts` � remote name tag asserts `'Test'` (not `'[50] Test'`) + new medal-name test. **183 files / 1575 tests pass, tsc clean.**

## Remaining
- The tag is still a custom yellow `Text` (`0xffe664`) � the authentic white plate canvas (StringPool 976) isn't a resolvable path in this NX set (no NameTag subtree in UI.nx/Map.nx); white-text-on-plate would need the actual plate asset.

# Session Summary - Player death + remote character death

## Verified (live IDB decompiles + server, this session)
- **Local death**: `CUserLocal::OnSetDead @0x903FC0` calls `CWvsContext::UI_OpenRevive` (records `m_tReviveDialog` timestamp) then the base `CUser::OnSetDead @0x8E4250` � computes a revive point clamped to the foothold underneath, spins the body 2000 deg, loads the tomb layer (StringPool 0x8AD dying / 0x9A1 already-dead) via `CAnimationDisplayer::LoadLayer`, plays the death sound (`play_game_sound`), removes additional layers. `CUIRevive::Update @0x83CE70` auto-revives after 600000ms (10 min); `Revive @0x83CDE0` sends `SendTransferFieldRequest` (the TS `GameSender.Revive`) + `CWvsContext::OnRevive` + `UI_CloseRevive`.
- **Revive dialog**: `CUIRevive::OnCreate @0x83CEA0` � background `UI/UIWindow2.img/Notice/<0..4>` (0=plain town-revive 300x131, 1/2/4 = special variants) + `btOK`(id 6)/`btCancle`(id 7); btOK origin (-196,-100) ? placed at (196,100) inside the panel. The TS Revive.ts was probing the wrong path (`UIWindow.img/Revive`).
- **Remote death**: the server's `User.setHp` only relayed HP to party members (`UserRemote.receiveHp` = `USER_HP`: charId, hp, maxHp). No field-wide death broadcast ? non-party players never saw a remote corpse. The move-path stance nibble does NOT carry dead (moveAction 18 is CUser::m_nMoveAction, not a move-element stance � decoding 0x13 as dead collides with Walk2+facingLeft, verified via the round-trip test).

## Code changes (this session)
- `src/character/PlayerController.ts`: `IsDead`/`SetDead(bool)` � dead chars are immovable, zeroed velocity, `Stance.Dead`, pending move flushed; `Update` early-returns while dead. Revive restores Stand1/2.
- `src/stages/GameStage.ts`: `_applyLocalDeath()` (idempotent: sets `_isPlayerDead`, `_physics.SetDead(true)`, `PlayOneTimeAction('dead')`, tombstone spawn at player pos) � all 5 HP=0 triggers (statChanged, mob hit, body attack, fall damage, field HP drain) funnel through it. `_applyLocalRevive()` resets dead + tombstone. `_onSetField` also clears death state (robust revive warp). Revive button calls `_applyLocalRevive` before sending `Revive()`. Remote: `onUserReceiveHP` now sets `SetHpRatio` + `PlayOneTimeAction('dead')`/`SetStance(Stance.Dead)` when HP hits 0; `onUserMove` skips dead chars (corpse stays dead until leave/re-enter).
- `src/character/OtherCharLook.ts`: `IsDead` getter + `PlayOneTimeAction` (sets `_isDead` on 'dead').
- `src/ui/game/Revive.ts`: authentic asset probe ? `UIWindow2.img/Notice` + `btOK`; button positioned by origin (196,100) when WZ present, fallback centers it.
- `server/src/world/user/User.ts`: `setHp` now also field-broadcasts `UserRemote.receiveHp` when HP transitions to 0 (corpse visible to all players).
- Tests: `tests/character/Stance.dead.spec.ts` (round-trip + Dead action key), `PlayerController.spec.ts` +3 (death freeze/restore/idempotent), `tests/ui/game/Revive.spec.ts` (4: open/close, click revive, Enter revive, WZ Notice/0 parity). **183 files / 1574 tests pass, tsc clean** (client); server tsc clean + userPacket test passes.

## Remaining
- Remote chars don't show the local tombstone visual (only the dead body action) � OG shows only the corpse for remote players, which is what we do.
- Premium revive (SoulStone/Wheel of Destiny, Notice/2/4) not wired � server already falls through to normal revive; the dialog variants are a separate feature.
- The 10-min auto-revive timeout (CUIRevive::Update 0x927C0) not ported to the TS Revive panel.

# Session Summary - CUIStat drag + duplicate-text + detail slide fixes

## Verified (live IDB decompiles + WZ, this session)
- **Drag**: `CUIWnd::HitTest @0x8DD2C0` returns region 2 (drag) when `ry <= 0x18` (24), else region 1. Base `GamePanel.beginDrag` used `getLocalBounds()`, which walks Text children and can throw before fonts are measured / is fragile � that was why the stat window could not be dragged. `CUIStat::OnMoveWnd @0x861590` moves CUIStatDetail to `(GetAbsLeft+172, GetAbsTop+90)`.
- **Duplicate text**: `CUIStat::Draw @0x864BD0` draws ONLY the stat VALUES at x=54 (STR 227 / DEX 245 / INT 263 / LUK 281 via DrawTextA(54, y)); the STR/DEX/INT/LUK labels are baked into `UIWindow2.img/Stat/main/backgrnd2`. The TS was drawing a `STR`-etc label Text at x=54 (duplicating the baked label) AND the value at x=84 (misaligned).
- **Detail position**: GameStage previously snapped `_statDetailInfo.position = (stats.x+172, stats.y+90)` every frame.

## Code changes (this session)
- `src/ui/game/GamePanel.ts`: `_wndDragging`/`_wndDragOff` now `protected` (so subclasses can override beginDrag/updateDrag); default `_wndTitleH` 22 ? 24 (matches CUIWnd::HitTest 0x18).
- `src/ui/game/StatsInfo.ts`: override `beginDrag` using the fixed window rect (172x337, title = top 24px) instead of `getLocalBounds()` � fixes drag; override `updateDrag` to move with the cursor. Stat VALUES moved to x=54; STR/DEX/INT/LUK label Texts now hidden when WZ backgrnd is loaded (`visible = !this._wzBg`).
- `src/stages/GameStage.ts`: detail panel now slides toward (sx+172, sy+90) with an exponential ease (k=0.25/frame, snaps when < 0.5px) instead of snapping.
- Tests: `tests/ui/game/StatsInfo.drag.spec.ts` (4: title drag engage/release, body no-drag + out-of-rect, cursor-follow, detail slide approaches target without snapping). **181 files / 1565 tests pass, tsc clean.**

## Remaining
- The `_wzBg`-hidden labels only apply when the real `UIWindow2.img/Stat/main` backgrnd loads; the Graphics fallback still shows the label Texts (acceptable � no baked labels in the fallback).
- The detail slide is client-side cosmetic; the OG follows instantly on drag (MoveWnd), the ease is a visual choice per user request.

# Session Summary - CToolTipHelper port (real stat/statDetail hover tooltips from String.wz)

## Verified (live IDB decompiles + real String.nx, this session)
- **Panel hover-help text lives in String.wz under `ToolTipHelp.img/Game/UIWnd/<PanelName>`** (child named after the panel: `Stat`, `StatDetail`, ...). Each child `<0..N>` has four nodes: `Title` (short label), `Desc` (body, may contain \n), `lt`/`rb` (Vector2D hit-test rect).
- **CUIStat::OnCreate @0x867B90** calls `CToolTipHelper::LoadToolTip(StringPool 1993)` -> `ToolTipHelp.img/Game/UIWnd/Stat` (13 entries: 0=Name,1=Job,2=Level,3=Guild,4=HP,5=MP,6=EXP,7=Fame,8=STR,9=DEX,10=INT,11=LUK,12=AP). **CUIStatDetail::OnCreate @0x8623B0** calls `LoadToolTip(StringPool 1978)` -> `.../UIWnd/StatDetail` (11 entries: Attack/Critical/PDD/MDD/ACCx2/EVAx2/Speed/Jump). Button tooltips use the sibling `ToolTipHelp.img/Game/Button/<Btn>` subtree via `CCtrlButton::LoadToolTip(StringPool 1988/1989/1990)` (StatAuto/1/2).
- **CToolTipHelper::LoadToolTip(PBG) @0x894C00**: iterates children 0..N, reads `lt`(SP 6846)/`rb`(SP 6859)/`Title`(SP 0x1A70)/`Desc`(SP 0x5D3) into `TTH_INFO[]`.
- **CheckAndShow @0x8A0980**: iterates TTH_INFO, `PtInRect(cursor, lt..rb)`; first hit -> `CUIToolTip::SetToolTip_String2(tooltip, cursorX, cursorY+20, Title, Desc, ...)`; no hit -> ClearToolTip. CUIStat::OnMouseMove @0x8649D0 passes **maxCount=8 when beginner** (level<=10 && (job%1000==0 || job==2001)) else null; CUIStatDetail::OnMouseMove @0x861450 passes null. EXP tooltip is separate: StringPool 0x1A37 Format(exp, next) when cursor in (55,138,110,14).
- **SetToolTip_String2 @0x8953B0**: Title centered in font type 1 (HL_WHITE), Desc word-wrapped (DrawTextSepartedLine) in font type 10 (HL_SPECIAL), width default 270 (135 for object tooltips), margins 10.

## Code changes (this session)
- **NEW `src/ui/game/ToolTipHelper.ts`**: `TTHInfo` (lt/rb/title/desc), `LoadToolTip(stringWz, panel)` parses `ToolTipHelp.img/Game/UIWnd/<panel>`, `checkAndShow(toolTip, rx, ry, maxCount?)` does the PtInRect + SetToolTip_String2 and returns the index / -1.
- `src/ui/game/ToolTip.ts`: added `setToolTipString2(x, y, title, desc, bObjectToolTip, maxW)` (title centered font 1, desc wrapped font 10, width 270 default) + `_wrapHeight`.
- `src/ui/game/StatsInfo.ts`: loads the Stat subtree via helper; `handleMouseMove` now does real EXP (0x1A37) + `CheckAndShow` (beginner -> maxCount 8) instead of the invented `_buildTooltipText` (removed). Constructor takes optional `stringWz` provider.
- `src/ui/game/StatDetailInfo.ts`: loads StatDetail subtree (StringPool 1978), adds `handleMouseMove` -> `checkAndShow(toolTip, null)`.
- `src/stages/GameStage.ts`: passes `() => this.game.wz.string ?? null` to both StatsInfo and StatDetailInfo.
- Tests: `tests/ui/game/ToolTipHelper.wz.spec.ts` (real String.nx: Stat 13 entries + titles + lt/rb, StatDetail 11 entries, hit-test in order, beginner maxCount 8). **180 files / 1561 tests pass, tsc clean.**

## Remaining
- `CUserLocal::OnMouseMove @0x91B240` also calls CheckAndShow (field character-hover tooltip, bObjectToolTip=1 via CTemporaryStatView::ShowToolTip) � not ported (different feature; needs the field's tooltip data source).
- Button tooltips (StatAuto/1/2, StringPool 1988-1990) not wired to the BtAuto buttons yet.
- Skill window / other panels that use CToolTipHelper can reuse `ToolTipHelper` the same way (child name = panel name).

# Session Summary - CUIStat CreateTip audit (per-job balloon tips) + stringPool wiring

## Verified (live IDB decompiles, this session)
- **`CUIStat::CreateTip` @0x866530** � creates the stat-window job recommendation balloons via `UIHelper::MakeBalloonTip` @0x7C9780 (font, nDir, nX, nY, ZArray<lines>, layer). Balloon bg = StringPool **0xC9D** property; arrow canvases by nDir = StringPool **1450-1453**; `make_balloon` @0x95DE30 draws the shape from child canvases (StringPool 0x5A1-0x5A7, 0x1AD4). Tip height = `15*lineCount+20`, width = `maxTextWidth+20`; text drawn centered at `nTipX + nTipWidth/2 - textWidth/2`, rows +15 from `nTipY+10`.
- **Job switch (all 12 cases)** � base tip (all jobs) m_pLayerTip[0]: [0x14C6, 0x14C7], nDir=2, nX=170, nY=187. Then per job:
  - 100 Warrior: 0x14BA+0x14BB+0x1A45, nDir=3, 160, 241
  - 200 Magician: 0x14BA+0x14BC+0x1A46, nDir=2, 160, 266
  - 300 Archer: 0x14BA+0x14BD+0x1A47, nDir=2, 160, 248
  - 400 Thief: 0x14BA+0x14BE+0x1A45, nDir=2, 160, 248
  - 500 Pirate: tip1 0x14BA+0x14BF+0x1A45 nDir=1 149,230; tip2 0x14C0+0x1A47 nDir=2 160,248
  - 1100 Cygnus: 0x14BA+0x14C1+0x1A45, nDir=3, 160, 241
  - 1200 Aran: 0x14BA+0x14C2+0x1A46, nDir=2, 160, 266
  - 1300 Evan: 0x14BA+0x14C3+0x1A47, nDir=2, 160, 248
  - 1400 Mercedes: 0x14BA+0x14C4+0x1A45, nDir=2, 160, 284
  - 1500 Phantom: 0x14BA+0x14C5+0x1A45, nDir=3, 160, 241
- **Bugs found**: (1) TS lumped ALL jobs 1100-1500 into one case using Pirate's tip2 line 0x14C0 + 0x1A47 at (160,248,2) - wrong strings, wrong nDir (Cygnus/Phantom are 3), wrong Y (Aran 266, Mercedes 284). (2) `StatsInfo` never received the `stringPool` from GameStage (`new StatsInfo(loader, uiWz)`), so `_getStringPoolText` could never resolve anything real. (3) fallback map had no 0x14C1-0x14C5 entries and 0x14C1 wrongly duplicated 'your STR for melee attacks.'

## Code changes (this session)
- `src/ui/game/StatsInfo.ts`: per-job cases 1100-1500 now use their own StringPool lines (0x14C1-0x14C5) + exact IDB coords/nDir; fallback map gained 0x14C1-0x14C5 with job-specific text, 0x14BF distinct from 0x14C1. `createTip11` is a faithful port of `CUIStat::CreateTip`.
- `src/stages/GameStage.ts:1154`: `new StatsInfo(this._loader, uiWz, this._stringPool)` � tips now get the real StringPool (falls back gracefully since this String.wz lacks NoSound.img).
- Tests: `tests/ui/game/StatsInfo.createTip.spec.ts` (8: base tip, Warrior/Magician/Aran/Mercedes/Phantom positions + text, Pirate 2 tips, destroyTip). **179 files / 1557 tests pass, tsc clean.**

## Remaining
- The balloon itself is still a custom Graphics rounded-rect (`_createBalloonTip`), not the WZ `make_balloon` asset path (StringPool 0xC9D property + 1450-1453 arrows). Text falls back to the hardcoded job lines because String.wz lacks NoSound.img (StringPool 0x14BA-0x14C7, 0x1A45-0x1A47 unresolvable from this String.nx).
- `CUIStat::Draw`-side tooltip (handleMouseMove / `_buildTooltipText`) still uses invented stat text; the real CToolTipHelper (StringPool 1993) is a different feature from CreateTip and not ported.

# Session Summary - CUISysOpt (System Options) authentic rebuild + audit

## Verified (live IDB decompiles, this session)
- **`CUISysOpt` is a modal `CDialog`** (not a hand-drawn overlay): ctor @0x7A7ED0 -> `CDialog::CreateDlg` @0x4FEC40 with resource StringPool 0x19B1 ("SysOpt"). Window = `UI/UIWindow2.img/SysOpt/backgrnd` **283x419** (origin 0,0, z=-5) + `backgrnd2` **271x365** (origin -6,-18 => drawn at 6,18, z=-4). **Centered on screen**: CreateDlg(-w/2, -h/2, w, h, z=10, bScreenCoord=1, Origin_CC).
- **OnCreate @0x978010 control table** (all window-relative): sliders video(1000, 95,32,len140,range4), bgm(1001, 95,91,len96,20), se(1003, 95,121,96,20), mouse(1006, 95,181,140,20), hp(1007, 95,211,140,20), mp(1008, 95,241,140,20); checkboxes screen800(1010,65,60) screen1024(1011,165,60) bgmMute(1002,223,90) seMute(1004,223,120) tremble(1009,65,271) windowed(1014,65,324) fullscreen(1013,65,336) minimapNormal(1015,65,361) minimapSimple(1016,147,361); **mobInfo combo(1012, 66,298,w174,h18)**. Screenshot combo(1005) exists in OG but is **disabled in this client** (user: "disable that screenshot function").
- **Buttons**: `BtOK`(id 1)/`BtCancle`(id 2) 40x16, canvas origin **(-99,-392)/(-144,-392)** -> AddButton offset (0,0) => rendered at **(99,392)/(144,392)** (bottom row, centered).
- **Slider**: CCtrlSlider CreateCtrl @0x4ED5E0 (parent,id,x,y,len,param); thumb = `SysOpt/scroll/0..3` (28x11), states [0]=normal [1]=captured [2]=range<=1 [3]=mouseover; knob x = `x + GetCoordByPos(pos)` where **GetCoordByPos @0x4ECC00 = pos*(len-27)/(range-1)+13**; range set via SetSliderRange @0x4ECC70 = number of positions (valid 0..range-1). Track is **baked into backgrnd2** (labels too), sliders draw only the knob.
- **Checkbox**: CCtrlCheckBox Draw @0x4D6360 draws glyph `Basic.img/CheckBox/0..3` (11x11) at **(x+2, y+1)**; state = checked?1:0 (ChangeCheckBoxState @0x4D4510, disabled +2). Control rect 150x15, **text baked into backgrnd2** (empty sText) - no label text drawn.
- **Combo**: CCtrlComboBox CreateCtrl @0x4DA330 sig is (parent,id,**nType,l,t,w,h**,param); box colors CREATEPARAM @0x4894F0: back #EEEEEE, focused #A5A198, border #999999, text offset x=7, fonts BASIC_BLACK/WHITE.
- **Behavior**: OnChildNotify @0x969820 - param1=200 toggles mutual-exclusive checkbox pairs (screen800/1024, fullscreen/windowed, minimap normal/simple); any change -> GetSysOptFromCtrl @0x9692A0 + ApplySysOpt(cur,0) live. **SetRet @0x969980**: OK(1)=ApplySysOpt(cur,1)+SaveGlobal+close; Cancel(2)=ApplySysOpt(old,0) revert+close. CDialog::OnButtonClicked @0x4292C0: id1->SetRet(1), id2->SetRet(2), id8->SetRet(8). **HitTest @0x968760: ry<50 => region 2 (drag title)** - 50px title bar, not 22. ctor snapshots config to m_sysOptOld on open; m_sysOptCur at CONFIG_SYSOPT offset 0x150.

## Code changes (`src/ui/game/OptionMenu.ts`, all this session)
- **Full rewrite from custom Graphics overlay -> authentic WZ-backed CUISysOpt**: 283x419 window centered; loads backgrnd/backgrnd2 sprites, BtOK/BtCancle (origin-placed at 99,392/144,392), `scroll/0..3` slider knobs (28x11), `Basic.img/CheckBox/0..3` glyphs at (x+2,y+1). Slider knob x = `x + pos*(len-27)/(range-1)+13`; click snaps to nearest position (GetPosByCoord @0x4ECCB0). MobInfo combo drawn with OG colors (#EEEEEE/#999999), dropdown rows 18px. Mutual-exclusive checkbox pairs per OnChildNotify. **Screenshot combo disabled/removed** (user request). OK apply+save, Cancel reverts to open-snapshot (m_sysOptOld), Esc/Enter close. Volume maps OG 0..19 slider range to 0..100.
- `src/ui/game/GamePanel.ts`: `_wndTitleH` (default 22) now drives beginDrag title region; OptionMenu sets 50 (OG HitTest ry<50).
- Note: OptionMenu overrides both `get`+`set isVisible` (overriding only the setter silently breaks the base getter -> `isVisible === undefined`).
- Tests: `tests/ui/game/OptionMenu.spec.ts` (9: centered pos, mutual-exclusive pairs x3, Cancel-revert/OK-keep snapshot, volume pct, screenshot-removed+mobInfo combo present, 50px drag region); `tests/ui/game/OptionMenu.wz.spec.ts` (real UI.nx parity: 283x419/271x365 dims, scroll+CheckBox glyphs, button bounds 99/144,392). **178 files / 1549 tests pass, tsc clean.**

## Remaining
- Video-quality slider (range 4) and tremble/minimap/windowed settings are stored client-side only; GameStage only reads BgmVolume/SfxVolume/HpFlash/MpFlash.
- The mobInfo combo labels ['Show All','Hide All','Show Boss','Show NPC'] are unverified (StringPool 0x1084-0x1087 not resolvable - String.wz lacks NoSound.img); likely correct from client memory.
- CDialog::OnKey @0x4FEAD0 (tab/focus cycling) not ported; Enter/Esc handled directly.

# Session Summary — MiniMap simple-window buttons + OG icon draw order (Update @0x8053A0)

## Verified (live IDB decompiles, this session)
- `SetCtrl_Simple` @0x7F9030, `OnButtonClicked` @0x803E40, `ToggleMiniMapState` @0x803E00, `DrawIcon` @0x7F7980/@0x7F7D00, `Update` @0x8053A0 (full, 65030 chars → `C:\Users\jorge\AppData\Local\Temp\opencode\update_pretty.txt`).
- WZ strings confirmed: `IWindow2.img/MiniMap/BtMin`(0xB9F46C), `BtMax`(0xB9F6A8), `BtMap`(0xB9F5D8); `IWindow2.img/MiniMapSimpleMode/Button/{ZoomOut}`(0xB9F408), `{ZoomIn}`(0xB9F4B0), `{BtMin}`(0xB9F518), `{BtMax}`(0xB9F578), `{Window}`(0xB9F7C8). **Simple mode has NO `Bt2X` node** — the 2X toggle swaps ZoomOut/ZoomIn sprites by `m_nOption`.
- **Mode arithmetic**: type-1 (normal) minimize `(option+1)%3`, maximize `(option-1)%3` (= `(mode+2)%3` in JS); type-0 (simple) minimize `prev=option; option ? (option+1)%3 : 2`; type-0 maximize restores `m_nPrevOption` VERBATIM (clamp only when `<0`); 2X toggles 0↔1; Tab cycles `(option+2)%3`.
- **Button anchors**: worldmap `(w-46,4)`; type-1 min/max `(w-72,4)`/`(w-59,4)`; simple min/max `(w-59,4)`; 2X `(w-30,h-16)`.
- **`DrawIcon` @0x7F7980 anchoring**: normal layout (`m_nMiniMapType!=0 || option!=0`) → **1x Copy bottom-center** at `(pt.x+pane_x - w/2, pt.y+pane_y - h)`; simple+huge (type 0, option 0) → **2x CopyEx**, destX = `pt.x - iconW`, destW = 2·iconW ⇒ icon center = pt.x, bottom = pt.y. TS `_drawIconAt` replicates both.
- **`DrawIcon` @0x7F7D00**: ZList-overload — iterates a `ZList<tagPOINT>` calling the single-point overload for each.

## OG `Update` @0x8053A0 full icon-draw order (bottom → top)
1. Background: clip rect (9, paneY, width-18, paneH), white `byte_FFFFFF` rect + `0xA0000000` overlay.
2. Map canvas: type-1 `m_pMini_Canvas` CopyEx at (paneX,paneY) w/ scrOrig; type-0 `m_pSimple_Canvas_Huge` (option 0) else `m_pSimple_Canvas`.
3. **CEmployeePool**: self-entrusted shop → `lEntrustedShop` (later ShopSelf); else inline `DrawIcon(ShopRemote|Simple)`.
4. **CUserPool** (battlefield type 19 first: team1→lWolves, team2→lNakedSheep, 0→lSheep; then partner→lPartner, party→lPartyMaster(boss)/lParty, guild by name→lGuildMaster/lGuild, friend→lFriend, else **inline `DrawIcon(RemoteUser|Simple)`**).
5. m_mStalkee loop → accumulates `m_strRemoteW/NW/NE/E/SE/S/SW/N` + builds `m_mStalkeeName` map.
6. Deferred list draws in OG order: **ShopSelf(lEntrustedShop) → Portals(nType 2|7) → Friend(lFriend) → Guild → GuildMaster → Party → PartyMaster → Match(lPartner) → Sheep/Wolves/NakedSheep** (Simple variants for type 0).
7. **NPCs** (m_aPtNpc): questState 0→`fr`(drawn NpcStart), 2→`gm`(NpcEnd), 4→lNpcPreStartLowLevel(NpcLowLevel), 1/3→plain Npc inline.
8. Remote-name edge arrows (only when the matching `m_strRemote*` is non-empty) — 8 positions (see below).
9. **Self icon last** on top.

## Code changes (`src/ui/game/MiniMap.ts`, all this session)
- Simple-window fields + buttons (`_simpleNormal/_simpleMax/_simpleStripL/C/R`, `_bt2XOut/_bt2XIn/_btMinSimple/_btMaxSimple`), `_loadSimpleFrame`, `_frameFor(isHuge)`, OG `_layoutButtons`/`_buttonsWidth`, `_drawCollapsed` simple strip, `draw`/`_winRect`/`_drawTitle`/hit-test via `_frameFor`, `_onBtMinimize/_onBtMaximize/_onBt2X` per OnButtonClicked 0x803E40. Removed all stale `_bt2X` refs + a ~114-line duplicated-comment corruption (1191 → 1060 lines); fixed `TS2540` `isRenderable`.
- **NEW — `_drawMapAndIcons` icon order rewritten to OG Update order** (ShopRemote inline → RemoteUser inline → Portals → Stalkees(Friend+name, clamped) → Party/PartyMaster → NPCs(NpcStart if quest else Npc) → Self.User on top).
- **NEW — `_drawIconAt`** replaces `_drawIconBottomCentre`: 1x bottom-center in normal, 2x in simple+huge (both `(px-w/2, py-h)`), per DrawIcon @0x7F7980. Dropped unused `MarkerScale` const.
- Note: no friend/guild/marriage/sheep data sources wired, so those deferred lists degrade to the groups we do have; `m_strRemote*` edge arrows remain the existing `calcAngleEdgeArrow` clamp path on stalkees.
- Tests: `tests/ui/game/MiniMap.party.spec.ts` 5 pass; full suite **173 files / 1510 tests pass, tsc clean**.

## Remaining
- `_mag` still from field defaults (`_magNormal=0`, `_mag2X=1`) — not yet fed from `_data.Mag_*` (`m_nMag_Normal`/`m_nMag_2X` copied from the MiniMapData node).
- Real remote-name edge arrows draw `m_pCanvasIconNW/N/NE/W/SW/S/SE/E|Simple` at 8 fixed pane positions (`(paneX+1, h+1)`, `(paneW/2, h+1)`, `(paneW+paneX-w-1, h+1)`, `(paneX+1, (h+paneH)>>1)`, `(paneX+1, paneH-1)`, `(paneW/2, paneH-1)`, `(paneW+paneX-w-1, paneH-1)`, `(paneW+paneX-w-2, (h+paneH)>>1)`) when non-empty — only stalkee names are accumulated today, so wiring `setRemoteNames` to stalkees is the natural next step.
- Battlefield sheep/wolves/nakedSheep + partner Match icons: no data flow yet (field type 19, marriage) — add when those systems ship.

# Session Summary — Equip Tooltip OG 1:1 Chrome (req rows, growth, durability)

## Verified: DrawToolTip_Equip @0x893F60 full layout (readable at `C:\Users\jorge\AppData\Local\Temp\opencode\drawtooltip_equip_readable.txt`)
- **Base point**: `y` = raw tooltip arg; **`iconTop = y + 32`** (OG: `p_m_RefCount = &y[2].m_RefCount`, y is `_bstr_t::Data_t*` so +2*12+8).
- **Draw order** (exact): DrawItemIcon at (10, y+32) → DrawTextEquip_Req_Level (nNo=0) → STR(1) → DEX(2) → INT(3) → LUK(4) → POP(5) → DrawItemReqJob → [cat 134: m_nLineSeparated += 18 + DrawTextCenter StringPool 0x1709 at y+159] → growth rows → durability.
- **Req rows**: `DrawTextEquip_Req` @0x88D710 — label `m_pCanvasEquip_ReqItem[nNo][met]` at **(94, iconTop + 12*nNo)**, met = `nReq && cur < nReq`; value digits via `draw_number_by_image` at **x = 94 + 12*4 + 2 = 144, spacing 1**. All 6 rows (Level/STR/DEX/INT/LUK/POP) ALWAYS draw: zero-req non-POP rows draw a Can-style `0` digit; only the POP row uses `bNone = (POP == 0)` → "none" glyph (StringPool 0x1AC4, `Can/none`) bottom-right anchored at (144-cx, iconTop+12*5-cy). `DrawTextEquip_Req_Level` @0x88DAB0 identical but nNo=0, met = `(cur + IncLevel) < req`; when IncLevel set it draws `abs(req - IncLevel)` using `m_pNumberCannot`(unmet) | `m_pNumberGrowthEnable`(met).
- **Job strip**: `DrawItemReqJob` @0x880FC0 blits at **(10, iconTop + 109)** (y+141 → iconTop+109).
- **Growth rows** (base iconTop+72 / +84): labels `m_pCanvasEquip_GrowthItem[0][isGrowth]` at (94, iconTop+72), `[1][isGrowth]` at (94, iconTop+84) — drawn for EVERY equip.
  - **growth**: level == max → `m_pCanvasEquip_GrowthItem[2][0]` ("max") at (148, iconTop+72) AND (148, iconTop+84). Else level digits at (148, iconTop+72) + pct digits at (148, iconTop+84) via `m_pNumberGrowthEnable`, spacing 1; pct = `clamp((int)(100*EXP/nextEXP), 0, 99)`; `%` glyph `m_pCanvasEquip_GrowthItem[3][0]` at (161, iconTop+84).
  - **not growth**: `m_pNumberGrowthDisable` Getitem(0x1AC4) "none" glyph, **bottom-right anchored, drawn TWICE**: (148-cx, iconTop+72-cy) [=`&y[8].m_RefCount`] and (148-cx, iconTop+84-cy) [=`&y[9].m_RefCount`].
- **Durability** (base iconTop+96): `v67 = 100 * cur / max`; `bLow = v67 <= 10`; bar `m_pCanvasEquip_Durability[0][bLow]` at (94, iconTop+96); **number drawn is v67 (the PERCENT, not raw durability)** via `m_pNumberCannot|Can` at x=161 spacing 1; `%` glyph `m_pCanvasEquip_Durability[1][bLow]` at `2*(3*digits+81)`.

## Verified: DrawItemIconForSlot @0x5c0a40 (icon compositor — NO star-count→Y loop; plan name was stale)
- Lazy-loads members: m_pItemShadow, m_pCashIcon (StringPool 0x95F), m_pCashIconForPrepaidCashItems (0x960), m_pProtectedIcon (`UI/UIWindow2.img`), m_pQualityIcon_good (`UI/`), veryGood, premium, excellent, special.
- Quality switch: 1→good, 2→veryGood, 3→premium, 4→excellent, 5→special (offsets 879/3183/4032/1008/3848).
- Non-mag blits: shadow at (x-cx, y-cy) for equips; pet-dead → 32×32 canvas + `make_SingleColor_alpha_blur` at (x, y-32); icon at (x-cx, y-cy); cash tag at (x-cx+32, y-cy); protected at (x-cx+32, y-cy); quality at (x-cx+1, y-cy-31). Mag (`bMag2`/nMagSize) path uses `CopyEx` scaled by nMagSize.

## Code changes (this session, all `C:\Users\jorge\OneDrive\Desktop\ts`)
- `src/ui/game/TooltipAssets.ts`: root → `UIWindow.img/ToolTip/Equip` (fallback `UIWindow2.img/ToolTip/Equip`); accessors `GrowthDigit(d, enabled)`, `GrowthLabel(index, enabled)` (0→itemLEV else itemEXP), `GrowthMax/GrowthPercent/GrowthNone(enabled)`, `DurabilityBar(met)`, `Percent(met)`, `DrawNumberWith(value, digitOf, x, y, parent, spacing)`; `DrawNumber` refactored to delegate (spacing=0 default, fallback width 8).
- `src/character/ItemIconLoader.ts`: `ItemAttr.MaxLevel?: number`; `_maxLevel(info)` = count of `info/level/<n>` children (growth max level). `ItemAttr.DurabilityMax?: number` from WZ `info/durability` (max) so `100*cur/max` can be computed.
- `src/ui/game/ItemTooltip.ts`: req rows `yBlock + reqIndex*ReqRowStep` (= iconTop+12n, label x=94, digits x=144 spacing 1, all 6 rows always draw incl. Can-style `0` for zero reqs + POP `Can/none` glyph when ReqFame==0); job strip `yBlock + JobStripDY - 32` (= iconTop+109, blit x=10); `_drawGrowthItem`/`_drawDurabilityBar` fully rewritten to OG assets/coords above; dropped wrong names `Can/growth`, `Cannot/growth`, `Growth/expBarBg`, `Growth/expBarFill`, `Can/max`; **durability now draws pct `floor(100*cur/max)`** (clamped 0..100, `isLow = pct <= 10`), `cur` defaults to `max` when the item instance carries no current durability; row guard is `DurabilityMax > 0` (OG `v7->nDurability`).
- **NEW (this session) — `SetToolTip_Equip_Basic` stat-row parity in `ItemTooltip.ts _buildInfoLines`**: rewrote the stat block to OG row order + `PrintValue` @0x891230 formatting (type 0 = `+N` skip non-positive; type 1 = plain `N`; type 2 = `N%`). Instance stats (`equipStats`) win over WZ base via `??`; **percent rows (MHP%/MMP%) always read from WZ base `IncMHPr`/`IncMMPr`** (OG reads MaxHPr/MaxMPr from `pe2`), new optional `equipStats.incMhpPr/incMmpPr`. Added `Durability:` label row when `attr.DurabilityMax > 0` (OG AddInfo, StringPool 0x1A0D). **PAD/MAD/PDD/MDD now plain (no `+`) per OG type-1 `" %d"`** (was `+N`). Row order: category → attack speed → durability → STR DEX INT LUK MHP MMP MHP% MMP% PAD MAD PDD MDD ACC EVA Speed Jump → set-item (SetToolTip_SetItem appended after Equip_Basic) → `Upgrades` (RUC, last) → `Hammers` (client extra). Deferred (no WZ data source): Craft row, Knockback% row, IsPreventSlipItem/IsSupportWarmItem rows, and the OG set-item tier display (name + "N Set" tiers) still stubbed as `Set Item: N pieces equipped`.
- Tests `tests/ui/game/ItemTooltip.spec.ts`: mock gains `DrawNumberWith/GrowthDigit/GrowthLabel/GrowthMax/GrowthPercent/GrowthNone/DurabilityBar/Percent`; req-stack pin 49/73→33/57; job strip y 158→142; durability x 180→161; added growth-digit/max-glyph/durability-% tests; PAD assertion `PAD: +15`→`PAD: 15`; added OG row-order + formatting test. **91 pass**, tsc clean.

## Verified this session: SetToolTip_Equip @0x8A5670 call order + helper machinery
- Full `SetToolTip_Equip` pseudocode extracted from `tool_fc44d178a001ENRLC766s2Cip6` → `C:\Users\jorge\AppData\Local\Temp\opencode\settooltip_equip_basic.txt` (2650 numbered lines). Key calls: line 1038 `SetToolTip_Equip_Basic` @0x8A0BD0, 1041 `CItemInfo::GetItemDesc`, **only** 3 `AddInfoEx` calls (1351/1392/1423 — all `(21, 23, …)` cash/donator title rows), 2064 `DrawItemTitle`, 2071 `DrawTextItemName`, 2298 `DrawToolTip_Equip`, 2306 `DrawInfo`.
- `PrintValue` @0x891230 (full): guard `bShowAlways || nValue > 0`; **case 0** → nValue>0 StringPool 0x178C (6028) else 0x178D (6029), `Format("%d")`; **case 1** → `" %d"` (plain); **case 2** → `" %d%%"`. Emits via `AddInfoEx(21, 23, sProperty, value, 1, 1001)` (label font 21, value font 23).
- `AddInfoEx` @0x88BAC0: fills `CLineInfo` at `m_aLineInfo[m_nLineNo]` with `m_nType`/`m_nSubType`, fonts via `GetFontByType`. `AddInfo` @0x89E620 = single-context variant.
- `DrawInfo` @0x89E8B0 renderer (decompile truncated, 25997 chars omitted — but layout reconstructed): separator rect at `(6, y + m_nLineSeparated)` width `m_nWidth-12`; **align 1001** (stat rows): dot at `(10, y+2)` if flagged, label at x = `(flag?16:10)`, value at `x = labelWidth + (flag?6:0) + 10` (both font-by-type); **align 1000**: label centered, value after it.
- TS helper API already in `ToolTip.ts`: `addInfo` (348), `addInfoEx(mainType, subType, mainText, subText, align, fontOverride)` (366), `addOptionInfo` (384), `printValue(x,y,value,label,type,fontType)` (594, right-aligns value at `width - valueW - 20`), `drawInfo` (401).

## This session: two-part `DrawItemTitle` @0x88CCB0 ported + wired into `_drawEquip`
- **`ToolTip.ts drawItemTitle(y, sText, bEquip=true, desc='', titleColor?, descColor?)`** (now at ~526) is the full two-part OG port (decompile re-verified live from the IDB): **equip branch** → name (font 3) drawn first at `(w - titleW - descW)/2`, desc (StringPool 0xC35, font 1) at `titleW + offset`; **non-equip branch** → desc (StringPool 0xC36, font 10) first at `offset`, name (font 14) at `descW + offset`. Both center the pair as a whole; returns 14.
- **`ItemTooltip._drawEquip` name rendering fixed** (~227): the item name is now drawn **centered** at `(w - nameW)/2` per OG `DrawItemTitle`, instead of left-aligned at (18, yName). Verified from `SetToolTip_Equip` call site that the name goes to `DrawItemTitle` while `DrawTextItemName` (dot at (10, yName+5), text at (18, y)) receives the **trade-option desc** — so the left-aligned (18,10) slot was a placeholder. Dot + inner outline + dot-line rows unchanged; Cash label now follows the centered name end (`nameX + nameW + 6`).
- **StringPool 3125/3126 text still unverified** — this `String.wz` (wz_client) has **no `NoSound.img`** (top-level imgs are only Cash/Consume/EULA/Eqp/Etc/GLcloneC/GuestEULA/Ins/Map/Mob/MonsterBook/NameChange/Npc/Pet/PetDialog/Skill/TestEULA/ToolTipHelp/TransferWorld/TrialEULA), so `StringPoolService` cannot resolve numeric IDs here. Equip title desc defaults to empty (centered name only — the common v95 appearance).
- Tests: `ItemTooltip.spec.ts` name test now asserts centered x = `(236 - 8*7)/2` = 90; `ToolTip.spec.ts` adds equip (name-then-desc) + non-equip (desc-then-name) pair-centering tests. **156 files / 1333 tests pass**, tsc clean.

## Next (this session)
- Optionally add `Craft`/`Knockback` to `ItemAttr` (loader reads `info/incCraft`/`info/knockback`) + the IsPreventSlipItem/IsSupportWarmItem rows + OG set-item tier display.
- If a real String.wz with `NoSound.img` (or the client's embedded StringPool table) is ever available: resolve 3125/3126 to backfill the `DrawItemTitle` descs.

# Session Summary — Mob Drops + Mob Movement + v95 Starting Maps

## Mob drop tables (this session, server repo)
- Created 39 hand-authored reward YAMLs in `C:\Users\jorge\OneDrive\Desktop\server\data\reward\` for Victoria Island mobs (100100 Snail → 3000007 Royal Fairy): mesos `[ 0, min, max, 0.7 ]`, Etc rows 0.1–0.35, potions 0.03–0.05. Format `- [itemId, min, max, prob, questId=0, fieldId=0]`, prob is 0..1 fraction (matches `Util.succeedDouble`).
- Item IDs verified against v95 String.wz (potions 2000000–2000006, 2010000/2010001, Etc 4000000–4000019, equips 1040000/1040002/1040008/1302000/1302007/1312000/1402000/1442000).
- `RewardProvider` no-throw warn init + eager `RewardProvider.initialize()` at `channelServer.ts:134`; `Mob.dropRewards`/`createDrop` flow → `DropPool.addDrops` broadcasts DropEnterField.
- Fixed stale `QuestInfo` ctor calls (missing `npc` arg) in `test/provider/questProvider.test.ts` + `test/world/quest/questHandler.test.ts` — unblocked the whole server suite (260 pass / 14 pre-existing unrelated failures).

## Mob movement (this session, client repo)
- Fixed `MobController.OnServerMove` (MobController.ts:~264): removed snap-to-last-element teleport; now only adopts `lastEl.fh`. Interpolation owned by `MobLook._movePathElements` (set by `GameStage._onMobMove`, stepped in MobLook.Update:1399-1427).
- GameSender.MobMove field order verified 1:1 vs server `MobHandler.handleMobMove` / `MobPacket.mobMove`.
- Added `OnServerMove` regression test in `tests/character/MobController.spec.ts`; full client suite 1262/1262 pass, tsc clean.

## v95 starting maps (this session)
- **v95 explorer start = map 10000 (Maple Road : Mushroom Town)**, NOT Henesys. Confirmed from v95 Map.nx (`Map/Map0/000010000.img`: `mapMark="MushroomVillage"`, `onUserEnter="go10000"`, tutorial portals/NPCs) + web (MapleSEA Starting Out, RaGEZONE GM IDs, MapleStoryDB, StrategyWiki, namu wiki).
- v95 Map.nx has ZERO `4xxxxxx` maps — Swordie v232's explorer start `4000011` is a modern-era map that did not exist in v95. The 4000000-series Maple Island was already removed (revamped to maps 10000–60000 "Maple Road" + Amherst 1000000–1010000 "Rainbow Street", ship at Southperry 2000000).
- Kinoko upstream `GameConstants.getStartingMap` returns 0 for explorers → resolved to Henesys 100000000 via `MigrationHandler.enterWorld` fallback (Kinoko simplification).
- Race start maps are consistent across Kinoko/Swordie/v95-client-server: NOBLESSE 130030000, ARAN 914000000, EVAN 900010000, CITIZEN 931000000. Explorer only differs.
- **CHANGE MADE** (`server/src/world/GameConstants.ts:79`): `case 0: return 10000;` for BEGINNER/explorer. `createCharacterHandler.ts:71` `|| 100000000` remains as safety net for unknown jobs. Server tsc clean.
- **DEFERRED (user): implement the Maple Island tutorial scripts** (`go10000`, `go20000`, `go30000`, `go40000`, `go50000` onUserEnter + tutoChatNPC/infoMinimap/glTutoMsg0 portals). Server currently never executes field scripts, so spawning at 10000 is safe (no crash), just no tutorial.

## Relevant files
- `C:\Users\jorge\OneDrive\Desktop\server\src\world\GameConstants.ts` (getStartingMap), `src\server\center\handlers\createCharacterHandler.ts:71`, `data\reward\*.yaml` (39 files), `src\provider\RewardProvider.ts`, `src\server\channel\channelServer.ts:134`, `src\world\field\mob\Mob.ts`, `src\provider\map\MapInfo.ts` (onUserEnter/onFirstUserEnter read but never executed).
- `C:\Users\jorge\OneDrive\Desktop\ts\src\character\MobController.ts`, `src\character\MobLook.ts`, `src\stages\GameStage.ts` (`_onMobMove` 4848), `src\net\senders\GameSender.ts`, `tests\character\MobController.spec.ts`.
- `C:\Users\jorge\OneDrive\Desktop\kinoko-main` (upstream Java): `GameConstants.java:126`, `LoginHandler.java:252`, `MigrationHandler.java:167-173`.
- `C:\Users\jorge\OneDrive\Desktop\swordie-232-main` (v232 reference): `Job.java:2781`, per-job `setCharCreationStats` overrides.
- NX tooling: `C:\Users\jorge\OneDrive\Desktop\ts\nx-tools\nxdump.mjs`; v95 NX data in `C:\Users\jorge\OneDrive\Desktop\ts\wz_client\`.

# Session Summary — CUIUserInfo OG 1:1 + CUIItem + MiniMap + CUIToolTip

## Latest: CUIToolTip SetToolTip_* Dispatchers (this session)

### Added 8 new SetToolTip_* dispatchers to ItemTooltip.ts
All implemented from IDA decompilations, matching OG CUIToolTip behavior:

| Method | OG Function | Width | Notes |
|--------|-------------|-------|-------|
| `DrawSkillTooltip` | SetToolTip_Skill @ 0x8a2500 | 320px | Level info, help text, required skills |
| `DrawPetTooltip` | SetToolTip_Pet @ 0x898700 | 290px | Death/donator/expiry, pet stats, skills |
| `DrawRingTooltip` | SetToolTip_Ring @ 0x8a3460 | 236px | Partner/friend/spouse, ring image |
| `DrawMacroSysSkillTooltip` | SetToolTip_MacroSysSkill @ 0x89e1f0 | 290px | 3 skill slots + icons |
| `DrawSlotIncTooltip` | SetToolTip_SlotInc @ 0x89d5f0 | 290px | Slot increase info |
| `DrawEquipExtTooltip` | SetToolTip_EquipExt @ 0x89dcf0 | 290px | Equipment extension expiry |
| `DrawString2Tooltip` | SetToolTip_String2 | 200px | Multi-param string |
| `DrawStringMultiLineTooltip` | SetToolTip_String_MultiLine | 290px | Multi-line string |

### CUIToolTip Full 1:1 OG Implementation

**IDA Decompilation Phase — COMPLETE**
- 14 parallel IDA decompilations completed (13 success, 1 partial)
- All major functions decompiled: ctor, SetToolTip_Equip, SetToolTip_Bundle, DrawInfo, SetToolTip_Skill, SetToolTip_Pet, SetToolTip_Ring, DrawToolTip_Equip, SetToolTip_Equip_Basic, SetToolTip_SetItem, SetToolTip_ItemOption, SetToolTip_MacroSysSkill, SetToolTip_SlotInc, SetToolTip_EquipExt
- 37 decompilation files saved in `ida_output/cuitooltip_*.txt`

**TS Implementation Phase — COMPLETE**
- `ToolTip.ts` (~824 lines): OG-correct 28 font colors, full CLineInfo struct, core helpers (drawTextSepartedLine, drawTextEquipReq, printValue, drawItemReqJob, drawCanvasIcon, addInfo, addInfoEx, addOptionInfo, drawInfo, drawOptionInfo, drawDiscountInfo, drawLimitInfo, getItemExpireDate, etc.)
- `ItemTooltip.ts` (~1032 lines): Full equip/consumable rendering flows + 8 new SetToolTip_* dispatchers
- `ItemIconLoader.ts`: Extended ItemAttr with ProtectionType/Durability/Level/StarForce
- tsc clean, 1087/1089 tests pass (2 pre-existing failures unrelated to tooltip work)

**Remaining (from deep audit):**
- SetToolTip_Bundle: Missing 11 of 20 OG params (trade options, karma, new year cards, cash title, expiry, discount, ITC, limit goods, marriage)
- DrawDiscount_Rate: OG uses WZ digit sprites; TS uses plain text
- SetToolTip_Ring: Missing ring image, couple/friend/marriage record matching
- SetToolTip_Skill: Missing swallow buff, Wild Hunter, linked character, skill expiry, DamageMeter
- SetToolTip_Pet: Missing dead icon canvas, MakingLimitInfo, discount, limit info
- SetToolTip_Equip_Basic: Missing weapon category, attack speed display
- DrawToolTip_Equip: Missing IncLevel, proper growth EXP bar, durability percentage
- MakePreviewPetNameTag: Missing correct WZ paths, font loading, canvas compositing
- GetPetDeadDate: Missing WZ property reading, StringPool 1919, secure fuse
- SetToolTip_ItemOption: Missing many option IDs
- DrawITCSaleInfo: Uses text instead of canvas rendering
- ShowItemToolTip: Very basic compared to OG
- Unit tests for new rendering paths
- Visual verification pass

## Latest: CUIUserInfo Full OG 1:1 Implementation

### CUIUserInfo Full IDA Audit — 60+ Functions Decompiled
IDA decompilation of `CUIUserInfo` from `v95 IDB leak` confirmed:

**Struct layout** (5804 bytes, inherits CUIWnd):
- +0B08: ZRef<CCtrlOriginButton>[8] — BtParty/BtTrade/BtUP/BtDown/BtPet/BtTamingMob/BtCollection/BtException
- +0B48: ZRef<CCtrlScrollBar> m_pScrollBar
- +0B50: ZRef<CCtrlButton>[3] m_pBtPets — pet selection buttons (2012/2013/2014)
- +0B68: ZRef<CUIUserInfoDetail> — detail panel sub-window
- +0B90: ZRef<CAvatar> m_pAvatar — character avatar
- +0BA0: int m_nState — 0=collapsed, 1=pet, 2=taming, 3=medal
- +0BA4: unsigned int m_dwCharacterID
- +0BA8: ZXString m_sName / +0BAC: unsigned char m_nLevel / +0BAE: short m_nJob / +0BB0: short m_nPOP

**States & heights**: 0=190px, 1=386px (pet), 2=368px (taming), 3=386px (medal)

**Draw coordinates (all states)**:
- Name: centered at x=61, y=50 (FONT_BASIC_WHITE)
- Level: x=153, y=71 (StringPool 6677 "Lv.%d")
- Job: x=153, y=89 (get_job_name)
- Fame: x=153, y=107 (StringPool 6677 "Fame: %d")
- Community: x=153, y=125 (format_string maxW=100)
- Alliance: x=153, y=143 (format_string maxW=100)
- Married image: (15, 32)

**State 1 (Pet) coordinates**:
- Pet buttons: y=168, 202, 236 (+34 spacing), IDs 2012/2013/2014
- Pet name: centered x=61, y=318
- Template name: x=53, y=343
- Level: x=53, y=361
- Fullness: x=180, y=342
- Intimacy: x=180, y=361
- Item icon: x=111, y=220+42*i
- Item name: x=147, y=220+42*i
- Item info: x=183, y=237+42*i
- Scrollbar: (8, 250, 220, 117)

**State 2 (Taming Mob) coordinates**:
- Name: centered x=61, y=301
- Level: x=53, y=326
- Exp: x=53, y=345
- Fatigue: x=180, y=326
- Item icon: x=111, y=205+42*i
- Item name: x=152, y=205+42*i
- Item info: x=187, y=222+42*i
- Scrollbar: (8, 250, 203, 117)

**State 3 (Medal) coordinates**:
- Medal icon: (19, 243)
- Medal name: x=122, y=204
- Medal count: x=122, y=222
- Quest names: x=70, y=260+20*i
- Scrollbar: (8, 251, 254, 120)

**OnButtonClicked IDs**:
| ID | Action |
|----|--------|
| 0x7D0 | ToggleAddOn(1) — item info |
| 0x7D1 | ToggleAddOn(2) — wish list |
| 0x7D2 | SendJoinPartyMsg |
| 0x7D3 | SendInviteTradingRoomMsg |
| 0x7D4 | SendGivePopularityRequest(fame up) |
| 0x7D5 | SendGivePopularityRequest(fame down) |
| 0x7D6 | Toggle pet (state 1/0) |
| 0x7D7 | Toggle taming (state 2/0) |
| 0x7D8 | Toggle medal (state 3/0) |
| 0x7D9 | ToggleExceptionList |
| 0x7DA | Family chart |

**WZ paths**: All under `UI/UIWindow2.img/UserInfo/character/`

### Implemented (this session)
- Full state machine: collapsed (0), pet (1), taming (2), medal (3)
- Dynamic height per state: 190/386/368/386
- Cover backgrounds per state from WZ
- Canvas overlay (StringPool 976) — semi-transparent mask resized per state
- All text at OG coordinates
- Character avatar at (100, 127) via CharLook
- Pet stats display (name, template, level, fullness, intimacy)
- Pet item list with scrollbar (equipped items from AvatarLook body parts)
- Pet avatar at (53, 299) via PetLook
- Pet selection buttons (y=168/202/236, IDs 2012/2013/2014)
- Taming mob stats display (name, level, exp, fatigue)
- Taming mob item list with scrollbar (saddle/mob equip from AvatarLook)
- Medal display (name, count, icon via ItemIconLoader, quest list)
- Boss pet crown at (44, 267/209) — repositioned per pet slot
- ScrollBar integration for all item lists
- Married image at (15, 32)
- All 11 buttons from WZ with correct IDs and click handlers
- BtItem (0x7D0) → toggleDetail, BtWish (0x7D1) → toggleWishList
- State toggle buttons (pet/ride/collect)
- Button enable/disable per OG: BtPet(local+activated), BtException(local+activated+state==1), BtRide(hasTamingMob), BtCollect(hasMedal), BtFame(level>=15), BtParty/BtTrade(disabled for local)
- GameStage wires pet/alliance/married/medal data from CharacterInfoArgs + AvatarLook
- GameStage wires isLocalChar, characterId, charName, level, job, fame, guild
- GameStage extracts taming mob equip from AvatarLook slots 18/19/20
- GameStage extracts pet equip from AvatarLook body parts (hat/cloth/acc)
- Name resolver callbacks (itemNameOf, mobNameOf) for item/mob name lookups
- Sub-windows: CUIUserInfoDetail (dual-column chair/wish), CUIUserInfoWishList (with BtPresent for cash items), CUIUserInfoExceptionList (selectable, 3 buttons)
- OnMouseMove tooltips for pet/taming mob items
- OnClosePet handler (close exception list, switch state)
- NotifyGivePopResult (fame display update)
- ResetInfo / ResetInfo_Pet / ResetInfo_TamingMob (live refresh methods)
- SetChairItemInfo / SetWishItemInfo / SetPetItemList / SetTamingMobItemList (data population methods)

## CUIStat Button Fixes (this session)

## Latest: CUIItem OG 1:1 Audit + Implementation

### CUIItem Deep Audit — 14 Functions Decompiled
IDA decompilation of `CUIItem` from `v95 IDB leak` confirmed:

**Struct layout** (2952 bytes, inherits CUIWnd):
- `+0B08 ZRef<CCtrlTab> m_pTab` — tab control
- `+0B10 ZRef<CCtrlScrollBar> m_pSBItem` — scrollbar (collapsed mode)
- `+0B18/+0B20/+0B28 ZRef<CCtrlOriginButton>` — Arrange, Extend, CashShop buttons
- `+0B30 int m_nFirstPosition` — scroll offset (1-based slot)
- `+0B34 int m_nItemTI` — active tab (server invType, not visual index)
- `+0B38 int[6] m_anSortBtState` — per-tab arrange state
- `+0B54 int m_bExtended` — extended/collapsed
- `+0B64/+0B68 int m_nLastestGetItemID/Pos` — new item effect tracking
- `+0B6C/+0B70 int m_bTryToReleaseItem/m_nReleaseUItemPos` — release scroll flow

**Critical: Tab swap** — OG `SetItemTI` swaps tabs 2↔3:
- Visual tab 2 (Setup) → m_nItemTI = 4
- Visual tab 3 (Etc) → m_nItemTI = 3
- `TAB_TO_INVTYPE = [1,2,4,3,5]`

**Extended grid = 8 cols, not 16**: `GetItemSlotRect` wraps: `col += 4 * (row / 6)` → 2 blocks of 4 cols.

**OnButtonClicked IDs**: 0x7D2=DropMoney, 0x7D3=Gather, 0x7D4=Sort, 0x7D5/0x7D6=Toggle, 0x7D7=CashShop.

**ItemRelease flow**: Use tab release item → `ChangeTab(0)` → `SetTryToReleaseItem(1, slot)` → click equip → `SendItemReleaseRequest(usePos, equipPos)` (opcode 0x61).

**CashShop subIds**: Equip→50200093, Use→50200094, Setup→50200095.

**Arrange button**: Single toggle — `SetArrangeButton` swaps `m_pBtArrange` between BtGather (state 0) and BtSort (state 1).

**OnChildNotify routing**: nId=2000/param1=500→tab change; nId=2001/param1=300..320→scroll; param1=101→tooltip; param1=100→click.

### Implemented (this session)
- Fixed `FULL_COLS` 16→8 (OG extended = 2 blocks of 4)
- Added `TAB_TO_INVTYPE` / `INVTYPE_TO_TAB` tab swap mapping
- Added `_tryToReleaseItem` / `_releaseUseSlot` fields + `setTryToReleaseItem()` method
- Added `onItemRelease` callback wired to `GameSender.ItemReleaseRequest`
- Fixed `applyOps` to use `INVTYPE_TO_TAB` for correct tab routing
- Fixed `_handleSlotClick` release flow (click equip in release mode → fire callback)
- Changed `onCashShop` signature to `(itemTI: number) => void`
- Updated `GameStage.ts` with `onItemRelease` handler

### ~~Remaining~~ (all completed)
- ~~Add `ItemReleaseRequest` packet to `OpCodes.ts` (0x61) and `GameSender.ts~~ — Done
- ~~Arrange button dynamic swap (BtGather ↔ BtSort)~~ — Done
- ~~Verify collapsed scrollbar behavior~~ — Done

## CDraggableItem Full Audit — OnDoubleClicked + OnDropped + GetOffEquipItem

### OnDoubleClicked (0x506E10) — Master double-click dispatcher
Three source panel paths:

**From CUIItem (inventory):**
- **TI=1 (Equip):** `get_bodypart_from_item` → if pet equip → show pet selection dialog (multiple pets) → `WearEquipItem`. Sound: StringPool 0x4FA.
- **TI=2 (Use):** Giant chain of `is_*_item` checks (order matches OG exactly):
  1. `IsProtectedItem` → notice dialog (return 0)
  2. `IsDarkSight/IsWindWalk/IsSneak` → blocked (return 0)
  3. `is_lottery_item` → `SendLotteryItemUseRequest` (opcode 124)
  4. `is_random_morph_item_other` → `CUIRandomMorphDlg::ShowDlg` (client-side)
  5. `is_state_change_item` → `SendStatChangeItemUseRequest` (opcode 78)
  6. `is_antimacro_item` → `SendAntiMacroItemUseRequest` (opcode 115)
  7. `is_portal_scroll_item` → `SendPortalScrollUseRequest` (opcode 92)
  8. `is_mobsummon_item` → `SendMobSummonItemUseRequest` (opcode 81)
  9. Cash pet food → `SendConsumeCashItemUseRequest` (opcode 85)
  10. `is_pet_food_item` → `SendPetFoodItemUseRequest` (opcode 82)
  11. `is_engagement_ring_box_item` → `SendEngagementRequest` (marriage)
  12. `is_tamingmob_food_item` → `SendTamingMobFoodItemUseRequest` (opcode 83)
  13. `is_bridle_item` → `SendBridleItemUseRequest` (opcode 87)
  14. `is_skill_learn_item` → `SendSkillLearnItemUseRequest` (opcode 88)
  15. `is_skill_reset_item` → `SendSkillResetItemUseRequest` (opcode 89)
  16. `is_shopscanner_item` → `SendShopScannerItemUseRequest` (opcode 90)
  17. `is_maptransfer_item` → `SendMapTransferItemUseRequest` (opcode 91)
  18. `is_select_npc_item` → `SendSelectNpcItemUseRequest` (opcode 123)
  19. `is_exp_up_item` → `SendExpUpItemUseRequest` (opcode 181)
  20. `is_script_run_item` → `SendScriptRunItemRequest` (opcode 84)
  21. `is_release_item` → `ChangeTab(0)` + `SetTryToReleaseItem(1, slot)` (client-side)
  22. `is_new_year_card_item_con` → `CUINewYearCardSenderDlg::ShowDlg` (client-side)
- **TI=3 (Etc):** `is_portable_chair_item` → `SendSitOnPortableChairRequest` (opcode 46); dragon ball box (3994200-3994208) → `SendDragonBallBoxRequest` (opcode 196); `is_script_run_item` → `SendScriptRunItemRequest` (opcode 84)
- **TI=4 (Setup):** `is_minigame_item` → `SendCreateMiniGameRequest` (opcode 144); `is_book_item` → `OpenBook` (client-side); invitation items → marriage dialog (opcode 161 sub 5/6); `is_raise_item` → `OpenRaise` (client-side); `is_gachapon_box_item` → `UseBoxGachaponItem` (opcode 127); `is_pigmy_egg` → `CUIIncubator` (client-side); `is_non_cash_effect_item` → `SendActiveEffectItemChange` (opcode 57); `is_ui_open_item` → `SendUIOpenItemRequest` (client-side)
- **TI=5 (Cash):** `get_bundle_cash_item_type` → `SendCashSlotItemUseRequest`; `get_consume_cash_item_type` → `SendConsumeCashItemUseRequest` (opcode 85); `get_etc_cash_item_type` → `SendEtcCashItemUseRequest`

**From CUIEquip/CUIPetEquip/CUIDragonEquip/CUIMechanicEquip:**
- Play sound (StringPool 0x4FA) → `GetOffEquipItem` (unequip)

### OnDropped (0x508700) — Master drag-drop dispatcher
Routes by `pFrom` and `pTo` panel types via RTTI `IsKindOf`:
- TradingRoom/CashTrading/PersonalShop/Parcel/ItemSpeaker/ItemMaker → `PutItem`
- CUIEquip↔CUIItem → `GetOffEquipItem`/`WearEquipItem`
- CUIEquip→CWndMan → `ThrowItem` (drop to ground)
- Same pattern for CUIPetEquip, CUIDragonEquip, CUIMechanicEquip
- CUIItem→CWndMan → `ThrowItem`
- CUIItem→CUIEquip → `HyperModifyEquipItem`/`ItemOptionModifyEquipItem`/`ItemRelease`/`ModifyEquipItem`
- CUIItem→CUIDragonEquip/CUIPetEquip/CUIMechanicEquip → `ModifyEquipItem`
- CUIItem→CUIKeyConfig/CUIStatusBar → `MapFuncKey`
- CUIKeyConfig/CUIStatusBar→CWndMan → `UnmapFuncKey`
- CUIItem→CUIItem (same panel) → `MoveItemSlot` (reorder)

### GetOffEquipItem (0x502B90) — Unequip flow
Checks: no modeless dialog, `CanPerformAction`, HP>0, 500ms cooldown, TI=1, empty slot exists.
- Riding tamed mob → cancel ride skill
- Forced stat → notice dialog
- Pet item slot changes → `CPet::BeginItemSoltChange` (body parts 26-28, 35-37, 43-45)
- Sends `ChangeSlotPositionRequest(1, slotPos, emptySlot, -1)`

### Item ID patterns (all `itemId/10000` unless noted)
| Function | Category | Tab | Opcode | GameSender |
|---|---|---|---|---|
| `is_portable_chair_item` | 301 | Etc(3) | 46 | `PortableChairSitRequest` ✅ |
| `is_portal_scroll_item` | 203 | Use(1) | 92 | `PortalScrollUseRequest` ✅ |
| `is_shopscanner_item` | 231 | Use(1) | 90 | `ShopScannerItemUseRequest` ✅ |
| `is_maptransfer_item` | 232 | Use(1) | 91 | `MapTransferItemUseRequest` ✅ |
| `is_release_item` | 246 | Use(1) | 97 | `ItemReleaseRequest` ✅ |
| `is_pet_food_item` | 212 | Use(1) | 82 | `PetFoodItemUseRequest` ✅ |
| `is_antimacro_item` | 219 | Use(1) | 115 | `AntiMacroItemUseRequest` ✅ |
| `is_mobsummon_item` | 210 | Use(1) | 81 | `MobSummonItemUseRequest` ✅ |
| `is_state_change_item` | 200,201,202,205,221,236,238,245 | Use(1) | 78 | `UseItem` ✅ |
| `is_tamingmob_food_item` | 226 | Use(1) | 83 | `TamingMobFoodItemUseRequest` ✅ |
| `is_bridle_item` | 227 | Use(1) | 87 | `BridleItemUseRequest` ✅ |
| `is_skill_learn_item` | 228 | Use(1) | 88 | `SkillLearnItemUseRequest` ✅ |
| `is_skill_reset_item` | 250 | Use(1) | 89 | `SkillResetItemUseRequest` ✅ |
| `is_select_npc_item` | 545,239 | Use(1) | 123 | `SelectNpcItemUseRequest` ✅ |
| `is_exp_up_item` | 430 | Use(1) | 181 | `ExpUpItemUseRequest` ✅ |
| `is_script_run_item` | 243/3994225 | Use/Etc | 84 | `ScriptRunItemUseRequest` ✅ |
| `is_engagement_ring_box_item` | 224 | Use(1) | 161 | `MarriageRequest` ✅ |
| `is_lottery_item` | 207,233 | Use(1) | 124 | `LotteryItemUseRequest` ✅ |
| `is_new_year_card_item_con` | 216 | Use(1) | — | Client-side dialog |
| `is_random_morph_item_other` | 2212xxx | Use(1) | — | Client-side dialog |
| `is_gachapon_box_item` | 428 | Setup(2) | 127 | `UseBoxGachaponItem` ✅ |
| `is_non_cash_effect_item` | 429 | Setup(2) | 57 | `ActiveEffectItemChange` ✅ |
| `is_book_item` | 416 | Setup(2) | — | Client-side (CBookDlg) |
| `is_minigame_item` | 408 | Setup(2) | 144 | Client-side (MiniRoom) |
| `is_raise_item` | 4220xxx | Setup(2) | — | Client-side (CUIRaiseManager) |
| `is_pigmy_egg` | 417 | Setup(2) | — | Client-side (CUIIncubator) |
| `is_ui_open_item` | 432 | Setup(2) | — | Client-side |
| Dragon ball box | 3994200-3994208 | Etc(3) | 196 | `DragonBallBoxRequest` ✅ |

## Latest (MiniMap deep audit + full OG implementation)

### MiniMap Deep Audit — All OG Functions Decompiled
IDA decompilation of `CUIMiniMap` from `v95 IDB leak` confirmed:
- **3 modes** (m_nOption): 0=expanded normal, 1=expanded huge, 2=collapsed
- **2 minimap types** (m_nMiniMapType): 0=simple (has 2X button), 1=normal (has min/max/worldmap buttons)
- **Pane sizing**: Normal caps W=210/H=112, Huge caps W=420/H=225
- **Scroll**: `m_nScrOrig_X = (m_nReal_CX + m_nLocal_X - (paneW << mag) / 2) >> mag`, clamped
- **Button positions**: OG places at `(winWidth - 46, 4)`, `(winWidth - 59, 4)`, `(winWidth - 72, 4)`
- **Edge arrows**: CalcAngle uses law of cosines on 3 points, returns acute angle for 8-directional selection
- **Position saving**: OG uses `CreateUIWndPosSaved` with key 10 → localStorage
- **m_nMiniMapType=0**: SetCtrl_Simple — has 1002(worldmap), 1000(minimize), 1003(2X) buttons
- **m_nMiniMapType=1**: SetCtrl — has 1001(maximize), 1000(minimize), 1002(worldmap) buttons
- **MakeConvexLayer**: Renders foothold lines on minimap canvas
- **LoadLadderRope**: Renders ladders (red) and ropes (blue) as vertical lines

### Implemented Features (this session)
- **Foothold rendering**: `_drawFootholds()` draws foothold segments as white lines on minimap, using `MiniMapData.Footholds` array
- **Ladder/rope rendering**: `_drawLadderRopes()` draws ladders (red) and ropes (blue) as vertical lines
- **Foothold/ladder data flow**: `FieldScene._finalizeMiniMapData()` converts `_footholds` + `_ladderRopes` into `MiniMapData.Footholds`/`MiniMapData.LadderRopes` after both are loaded
- **MiniMapData.ts**: Added `MiniMapFoothold` (x1,y1,x2,y2,layer) and `MiniMapLadderRope` (x,y1,y2,isLadder) interfaces; constructor accepts `Footholds[]` and `LadderRopes[]` parameters
- **CUIWnd position saving**: localStorage key `'MiniMapWndPos'`, saves on draw(), restores on constructor
- **m_nMiniMapType support**: `setMiniMapType()` method, button visibility changes per type (simple=2X, normal=max/min/worldmap)
- **m_nMiniMapType-dependent button cycling**: OnButtonClicked 1000/1001 now cycle differently based on m_nMiniMapType
- **UserMiniMapClick packet**: Opcode 166 in InHeader, `GameSender.UserMiniMapClick()` static method, wired to `_miniMap.onPlayerDotClick` in GameStage
- Clean TypeScript compile confirmed

### MiniMap Features (Previous Pass)
- Mode mapping fixed: 0=normal, 1=huge, 2=collapsed
- Title shows street name + map name on two lines
- Mark icon shows in all modes
- Player click detection via `onPlayerDotClick` callback + hit rect test
- 2X zoom toggle button (1003) wired
- Tab key cycles modes
- CalcAngle-based edge arrows
- Merchant icon support
- NPC quest icon support
- GameStage integration: Tab key, merchants, street name

### Server portal packet audit
All server→client portal packets verified 1:1 against client handlers:
| Packet | Server method | Client handler | Status |
|--------|--------------|----------------|--------|
| `TOWN_PORTAL` (69) | `TownPortalPacket.townPortal` | `OutHeader.TownPortalNotify` | ✅ |
| `TOWN_PORTAL_CREATED` (330) | `TownPortalPacket.townPortalCreated` | `OutHeader.TownPortalEnter` | ✅ |
| `TOWN_PORTAL_REMOVED` (331) | `TownPortalPacket.townPortalRemoved` | `OutHeader.TownPortalLeave` | ✅ |
| `SET_PORTAL_USABLE` (196) | `send.ts:204` opcode 196 | `FieldNop196` → no-op | ✅ dead case |
| Regular map portals | not sent by server | rendered from `Map.wz` client-side | N/A |
- Regular map portals are rendered entirely from WZ data in `src/map/FieldScene.ts` (`_loadPortals` lines 274-293, `_loadPortalAnimations` lines 339-350, `_updatePortalContainer` lines 494-501).
- Portal types 2/4/7 use `MapHelper.img/portal/game/pv` animation; types 10/11 are hidden.

### ChatBar combo box + tab bar (this session)
- **Chat-target combo box** (`m_pCBChatTarget`):
  - Positioned at StatusBar (3,519,68,21) → screen (25,541) → relative to ChatBar root (-72, 74), size 68×21.
  - Options: `all`, `whisper`, `party`, `buddy`, `guild`, `alliance`, `find`.
  - WZ background from `StatusBar2.img/mainBar/chatTarget` via `initWzAssets`.
  - Graphics fallback (rect + text + triangle indicator) when WZ unavailable.
  - Click toggles dropdown; selecting fires `onChatTargetChange`.
  - Dropdown: 7 rows × 16px, selected option with checkmark, closes on outside click.
- **Chat filter tab bar** (from `StatusBar2.img/chat/tapBar` and `Tap/*`):
  - Overlays top of display area at (DISPLAY_X, DISPLAY_Y), height TAB_H=18.
  - 6 tabs: All, Party, Buddy, Guild, Alliance, System.
  - WZ backgrounds from `chat/tapBar` and `chat/Tap/0`–`5`.
  - Graphics fallback: selected tab gets brighter bg (`#3C4164`) and text style.
  - Display lines shifted down by TAB_H.
  - Click sets `_activeTab`, fires `onTabChange`.
  - 3 ChatBar tests pass with updated y coordinates (469→490).

### ChatBar callbacks wired in GameStage
- `onChatTargetChange` stores `_chatTarget` (string, default `'all'`).
- `onTabChange` stores `_chatTab` (number, default 0).
- `onSendChat` auto-prepends `/p`, `/b`, `/g`, `/a` when combo box set to party/buddy/guild/alliance and no slash command typed.

## Relevant Files
- `src/ui/game/CharInfo.ts` (~900 lines) — Full CUIUserInfo 1:1 OG implementation. State machine, all 4 states, all buttons, avatars, sub-windows, tooltips, scrollbars.
- `src/ui/game/UserInfoDetail.ts` (~100 lines) — CUIUserInfoDetail sub-panel. Dual-column chair/wish items, scrollable.
- `src/ui/game/UserInfoWishList.ts` (~102 lines) — CUIUserInfoWishList sub-panel. Cash item BtPresent buttons, scrollable.
- `src/ui/game/UserInfoExceptionList.ts` (~146 lines) — CUIUserInfoExceptionList sub-panel. Selectable items, 3 buttons, scrollable.
- `src/ui/game/ItemInventory.ts` (~770 lines) — TS CUIItem implementation. Modified: FULL_COLS, TAB_TO_INVTYPE, item release fields, applyOps mapping, onCashShop signature.
- `src/stages/GameStage.ts` (~5600 lines) — Modified: CharInfo wiring (pet/alliance/medal/avatar/taming data), onCashShop(itemTI), onItemRelease handler.
- `src/ui/game/ChatBar.ts`: combo box + tab bar (533 lines).
- `src/stages/GameStage.ts`: chat callbacks, `_onMobEnter`, `draw()` mob rendering.
- `src/map/FieldScene.ts`: portal loading/rendering from `Map.wz`, `_finalizeMiniMapData()`.
- `src/map/MiniMapData.ts`: `MiniMapFoothold`, `MiniMapLadderRope` interfaces, `Footholds[]`/`LadderRopes[]` constructor params.
- `src/map/Foothold.ts`: Foothold data (Id, Layer, Group, X1/Y1/X2/Y2, Prev, Next).
- `src/map/LadderRope.ts`: LadderRope data (Sn, IsLadder, X, Y1, Y2, Page).
- `src/ui/game/MiniMap.ts`: Complete rewrite (~700 lines), 3 modes, all markers, CalcAngle edge arrows, merchant support, player click callback, foothold/ladder rendering, CUIWnd position saving.
- `src/ui/game/MiniMapMarkers.ts`: Merchant icon, `calcAngleEdgeArrow()` method.
- `src/net/packet/OpCodes.ts`: Added `UserMiniMapClick = 166` in InHeader.
- `src/net/senders/GameSender.ts`: Added `UserMiniMapClick()` static method.
- `src/localization/NameService.ts`: `MapStreetName()`, `MapShortName()`.
- `v95 IDB leak/v95_symbols.txt`: PORTAL struct, CUIMiniMap class layout, CUIItem struct (line 21555, 2952 bytes) + vtable (line 21776, 15 entries) + 25 member function addresses (lines 237251-237275).
- `v95 IDB leak/v95_packets.txt`: CUIMiniMap assembly. `CP_UserItemReleaseRequest = 0x61`.

## StatusBar + EquipInventory fixes (this session)

### StatusBar crash on button click
- **Root cause**: `SubMenu._container` was never added to the display tree. When `_toggle()` set `_openPopup`, the popup was invisible but intercepted all clicks via `handleMouseButton`, preventing StatusBar's own buttons from firing.
- **Fix 1** (`StatusBar.ts:331-338`): In `update()`, when `_openPopup` is set, add its container to `_root` via `addChild`. When popup clears, remove both `_menuPopup` and `_systemPopup` containers via `removeFromParent()`.
- **Fix 2** (`GameStage.ts:606`): Added missing `this._statusBar?.relayout(windowW, windowH)` in `onResize()` — StatusBar positioning was hardcoded to 1024×768 defaults forever.

### EquipInventory WZ background invisible
- **Root cause**: PixiJS v8 removed `Container.name`, replaced with `Container.label`. `_rebuildBackground()` used `c.name === 'equipInventoryWzBg'` to find/remove old background — always returned false in v8, so old backgrounds accumulated and new ones couldn't be tagged.
- **Fix** (`EquipInventory.ts:242,251`): Changed both the find and set to use `.label` (via `(c as any).label` cast).
- Also cleaned up `ItemInventory.ts:245,251` which had a dual `.name || .label` fallback — simplified to `.label` only.

### PixiJS v8 gotcha
- `Container.name` is **removed** in PixiJS v8 — use `Container.label`. Any code using `c.name === 'xxx'` to identify display objects silently fails. This pattern exists in `EquipInventory`, `ItemInventory`, and may affect other panels.

## Relevant Files
- `src/ui/game/StatusBar.ts`: SubMenu popup parenting fix (723 lines).
- `src/stages/GameStage.ts`: Added `_statusBar.relayout()` in `onResize()` (5166 lines).
- `src/ui/game/EquipInventory.ts`: `.name` → `.label` fix (508 lines).
- `src/ui/game/ItemInventory.ts`: Simplified `.name || .label` → `.label` (666 lines).
- `src/ui/game/ChatBar.ts`: combo box + tab bar (533 lines).
- `src/map/FieldScene.ts`: portal loading/rendering from `Map.wz`.
- `src/ui/game/MiniMap.ts`: Complete rewrite (~700 lines), 3 modes, all markers, CalcAngle edge arrows, merchant support, player click callback, foothold/ladder rendering, CUIWnd position saving.
- `src/ui/game/MiniMapMarkers.ts`: Merchant icon, `calcAngleEdgeArrow()` method.
- `src/net/packet/OpCodes.ts`: Added `UserMiniMapClick = 166` in InHeader.
- `src/net/senders/GameSender.ts`: Added `UserMiniMapClick()` static method.
- `src/localization/NameService.ts`: `MapStreetName()`, `MapShortName()`.
- `v95 IDB leak/v95_symbols.txt`: PORTAL struct, CUIMiniMap class layout, CUIItem struct (line 21555, 2952 bytes) + vtable (line 21776, 15 entries) + 25 member function addresses (lines 237251-237275).
- `v95 IDB leak/v95_packets.txt`: CUIMiniMap assembly. `CP_UserItemReleaseRequest = 0x61`.

## ChatBar 1:1 Deep IDA Audit + Phased Implementation

### OG Functions Decompiled (34 total, all saved to ida_output/)

**Chat Core (13)**: OnCreate (113K chars, all WZ paths verified), MakeCtrlEdit, SetChatType, ChatLogAdd, ChatLogDraw (65K chars, 27 WZ fonts), ChangeChatWndSize, SetChatTarget, StartChat, EndChat, _ResetChatBarPos, _RefreshChatLog, _GetFilteredChatLogCount, ResetButtonToolTip.

**Input/Key (2)**: OnKey (Tab cycles 9 targets, Enter routes to handlers, Arrow for history), OnMouseButton (drag resize, whisper, memo list).

**Buttons (1)**: OnButtonClicked (20+ button IDs, filter XOR toggles).

**Message Sending (2)**: SendCoupleMessage (opcode 142, marriage records), SendGroupMessage (opcode 140, friend/group/party/expedition/guild/alliance routing).

**Whisper (4)**: SetWhisperTarget, GetWhisperTarget, AddWhisperCandidate (max 10, dedup), SetWhisperTargetFromCandidate.

**CChatHelper History (3)**: HistoryAdd (max 8, dedup last), HistoryUp, HistoryDown.

**Other (3)**: GetEmotionKey (9 StringPool patterns), ProcessToolTip, TryUseTempExp.

### Key OG Findings
- **WZ paths (verified from OnCreate 113K decompilation)**: Chat layers under `StatusBar2.img/mainBar/` (chatSpace, chatSpace2, chatEnter, chatCover). Filter buttons under `StatusBar2.img/chat/Tap/{all,friend,party,guild,association,expedition}`. Combo box: `StatusBar.img/base/chatTarget`.
- **Chat width**: 577px (expanded) or 502px (minimal) minus m_nScrWidth.
- **Filter flags**: All=0, Friend=8, Guild=4, Alliance=0x10, System=0x20, Expedition=0x4000000.
- **Tab cycling**: 9 targets: [0→6(alliance), 1→2(party), 2→3(buddy), 3→4(guild), 4→5(expedition), 5→whisper, 6→1(whisper direct), 7→8(find), 8→0(all)].
- **Message routing**: target 0-5 → SendGroupMessage, target 6 → SendCoupleMessage, target 8 → SendChatMsg.

### 7 Phases Implemented (ChatBar.ts)
1. WZ path fix: `loadLayer()` using `ui.GetItem(uol)` with correct OG paths.
2. Tab key cycling + CChatHelper-style history navigation.
3. Combo box WZ loading: `StatusBar.img/base/chatTarget` (OG path).
4. Chat width updated to 577px.
5. Added `resetChatBarPos()` and `refreshChatLog()`.
6. Filter flags fixed to OG values with XOR toggle.
7. Dropdown visual improvements.

### BLOCKER (RESOLVED): Chat layers load correctly
NX tree inspection via `tools/dump_ui_tree.ts` confirmed: `StatusBar2.img/mainBar/chatSpace` → `NxCanvas` (505×18). The paths in ChatBar's `_loadWzAssets` are correct. The earlier failures were test coordinate bugs (wrong EDIT_X/EDIT_Y and DISPLAY_Y), not WZ path issues.

### ChatBar item link + history fixes (this session)
- **History recall**: Fixed test coordinates (EDIT_X=75, EDIT_Y=524); added `_applyLayout()` in constructor so `_lines`/`_lineTexts` arrays exist on construction.
- **`addMapleLine`**: Implemented proper `#i[id]#` tag → `[ItemName]` parsing with char-position tracking via `itemLinks` on `ChatLogEntry`.
- **`_syncLines`**: Added `_lineTexts[i] = t` tracking so Text references stay in sync.
- **Display click item-link detection**: `handleMouseButton` now computes line index from y, resolves filtered entry, checks char position against stored `itemLinks` ranges, fires `onItemLink`.
- **Test fixes**: Correct EDIT_X/Y for history clicks, correct TEXT_X+char*CHAR_W for link clicks, DISPLAY_Y_SMALL+2+6 for line-center y.
- **All 3 ChatBar tests pass.**

### Remaining
1. ~~IDA audit: verify `FieldScene` portal rendering~~ — Portal property names verified against NX data (14,890 portals scanned). Fixed 5 wrong names (`vImpact`→`verticalImpact`, `hImpact`→`horizontalImpact`, `reactor`→`reactorName`, `svKey`→`sessionValueKey`, `sv`→`sessionValue`). Added `Script`/`Teleport` fields. Default `HRange`/`VRange`=100 matching OG.
2. ~~Wire chat tab filtering~~ — "All" tab now clears filter; XOR toggle works for other tabs.
3. ~~Audit UIWindow2.img panels for PixiJS v8 `.name` → `.label`~~ — Confirmed clean, no violations remain.
4. ~~Verify StatusBar popups (Menu/System) render correctly with the display tree fix~~ — Verified: `_toggle` sets `_openPopup`, `update()` parents container into display tree, outside-click clears it, `update()` removes stale containers. `relayout(800,600)` handles resize.

## CUIItem Scrollbar Implementation (this session)

### Visual scrollbar for collapsed mode
- **`src/ui/game/ScrollBar.ts`**: New PixiJS component matching CCtrlScrollBar — up/down arrow buttons (triangle graphics), track with page-up/down click regions, draggable thumb, hover states for all parts. OG position (152,51,207) with 16px width.
- **Wired into `ItemInventory.ts`**: Created in constructor with `onChange` callback updating `_scrollOffset[tab]` + `_rebuildGrid()`. Hidden in extended mode (visible only when `!this._extended`). Mouse events routed in `handleMouseButton` and `onMouseMove` with scrollbar-local coordinate transform. Range set in `_rebuildGrid()` based on `maxSlot/COLS - ROWS`.
- **Thumb sizing**: Dynamic — `thumbTrackHeight / (range + 1)` clamped to minimum 16px, so a full grid (≤6 rows) shows a full-height thumb (unclickable), and scrolling down shrinks it proportionally.
- **All tests pass**: 1082/1085 (same 3 pre-existing ChatBar failures), TS compiles clean.

## CUISkill Full 1:1 OG Implementation (this session)

### CUISkill Deep Audit — Key Functions Decompiled
IDA decompilation + function_list.txt confirmed:

**Struct layout** (3040 bytes, inherits CUIWnd):
- `+0B08 ZRef<CCtrlTab> m_pTab` — tab control
- `+0B10 ZRef<CCtrlScrollBar> m_pSB` — scrollbar
- `+0B18/+0B20/+0B28 ZRef<CCtrlOriginButton>` — BtMacro, BtSkillGuide, BtSkillGuide2
- `+0B34 int m_nTabOption` — initial tab (0=default, 1=skill guide)
- `+0B38 ZArray<SkillRoot> m_aSkillRoots` — skill root list
- `+0B44 ZMap<int,CCtrlWnd*,int> m_mMacroSys` — macro system tabs
- `+0B50 ZRef<CUISkillTip> m_pTipWnd` — skill tooltip window

**OG functions used**:
| Function | Address | Description |
|----------|---------|-------------|
| OnCreate | 0x851520 | Load all WZ textures (34K chars) |
| Draw | 0x84ED90 | Render all elements (34K chars) |
| OnButtonClicked | 0x851480 | Button dispatch (20+ IDs) |
| OnChildNotify | 0x852160 | Tab/scrollbar routing |
| SetTabItems | 0x850990 | Build tab contents |
| SetSkillRootList | 0x84BFE0 | Build skill root list |
| SetScrollBar | 0x84B1C0 | Update scrollbar range |
| SetButtons | 0x84B220 | Enable/disable SP Up buttons |
| OnTabChanged | 0x84BFA0 | Tab selection handler |
| OnMouseMove | 0x84B660 | Hover + tooltip |
| OnMouseButton | 0x84B710 | Click dispatch |
| GetSkillIndexFromPoint | 0x84B390 | Hit testing |
| ShiftMacroUIState | 0x84A040 | Macro toggle |
| OpenSkillGuide | 0x8513D0 | Skill guide open |
| ResetInfo | 0x8514F0 | Live refresh |

**OG button IDs**:
- 2010-2013: SP Up (4 rows, per-row allocation)
- 2023/0x7E7: Macro toggle (CUIMacroSys)
- 3001-3004: Skill Guide (grade 1-4)

**OG OnChildNotify routing**:
- nId=2000, param1=500 → TCN_SELCHANGING (tab change)
- nId=2001, param1=300..320 → scrollbar events
- nId=2001, param1=2010, param2=4 → SP Up drag

**Sub-panels** (separate windows):
- CUISkillInc (0x855EA0) — skill increment panel
- CUISkillDec — skill decrement panel
- CUISkillDecEX (0x855470) — extended decrement
- CUISkillChangeConfirm — job change dialog

### Implemented Features (this session)
- **Tab rendering**: WZ texture-based tabs with `nTabSpace=1`, centered labels, dynamic width per tab count
- **Dual-job tab support**: DualBlade textures from `Tab/DualTab/disabled` and `Tab/DualTab/enabled`
- **OnChildNotify routing**: `nId=2000, param1=500` for tab changes, `nId=2001` for scrollbar events
- **Book name split logic**: centered when narrow, split at space when width >= 110px
- **SkillIncDec sub-panels** (`src/ui/game/SkillIncDec.ts`):
  - `SkillIncPanel` — SP up window with WZ background, scrollable rows, +/- buttons
  - `SkillDecPanel` — SP down window with WZ background, scrollable rows, +/- buttons
  - `SkillChangeConfirm` — job change confirmation dialog with OK/Cancel
- **Event forwarding**: mouse/key events routed to sub-panels before main panel, sub-panels updated each frame
- **Font and icons**: SkillBook constructor now receives `BuiltInFont` and `ItemIconLoader` for tooltip support
- **onSkillGuide callback**: Wired to `_skillGuide.Open()` for button IDs 3001-3004
- **onSendSkillUp callback**: Separate from `onSkillUp` — sends `GameSender.SkillUp(skillId)` packet
- **nameOf callback**: Wired to `game.nameService.SkillName(id)` for tooltip skill name resolution
- **Aran tab buttons**: Loaded from `Tab/AranButton/Bt1-Bt4` WZ textures
- **Book name/icon from skill root**: `SkillInfoService.GetBookName(root)` and `GetBookIcon(root)` — loaded from `Skill.wz/<root>.img/info/name` and `Skill.wz/<root>.img/info/icon`
- **GetRecommendSkill WZ-driven**: `SkillInfoService.GetRecommendSkill(root, totalSp)` — loads from `Skill.wz/<root>.img/recommend`, sorts by SP threshold, picks best match
- **OnSkillLevelUpButton validation**: HP check, 500ms cooldown, UpButtonDisabled check, per-tab SP, admin bypass hooks
- **Skill name truncation**: `format_string` with 95px max width, ellipsis when truncated
- **Per-tab SP tracking**: `getTabSp()` — beginner tab uses novice SP, extendsp jobs use extend SP, others use global SP
- **Click order**: Icon first (bIcon=1) on left click, matching OG OnButtonDown
- **Tooltip Y offset**: +20px shift matching OG `ry + IsMyAddon() + 20`
- **Window position persistence**: localStorage key `'SkillBookWndPos'`, saves on every update, restores on constructor
- **Admin bypass**: `isAdmin` flag skips all SP validation in `onSkillLevelUp`
- **Drag sound**: `onDragSound` callback fires `play_ui_sound(0x75E)` on skill drag start
- **Tab WZ sprites**: Tabs use actual WZ canvas sprites (`Sprite`) instead of `Graphics` fallback

### Relevant Files
- `src/ui/game/SkillBook.ts` (~1360 lines) — Main skill panel, OG CUISkill 1:1. Tabs, SP, book name, tooltips, cooldown animation, sub-panel integration, position persistence.
- `src/ui/game/SkillIncDec.ts` (~390 lines) — CUISkillInc/Dec/DecEX sub-panels with WZ backgrounds, scrollable rows, button callbacks.
- `src/ui/game/SkillGuide.ts` (~90 lines) — OG CWndSkillGuide 1:1. Static image popup from `UI/UIWindow.img/AranSkillGuide/{grade}`, closes on double-click/Escape.
- `src/character/SkillInfoService.ts` — Added `GetBookName(root)`, `GetRecommendSkill(root, totalSp)`.
- `src/stages/GameStage.ts` — Wired SkillBook with font/icons, onSkillGuide, onSendSkillUp, nameOf, characterHp, characterJob, isAdmin callbacks. SkillGuide deferred-created in `_initMenu`.
- **Tab rendering**: WZ texture-based tabs with `nTabSpace=1`, centered labels, dynamic width per tab count
- **Dual-job tab support**: DualBlade textures from `Tab/DualTab/disabled` and `Tab/DualTab/enabled`
- **OnChildNotify routing**: `nId=2000, param1=500` for tab changes, `nId=2001` for scrollbar events
- **Book name split logic**: centered when narrow, split at space when width >= 110px
- **SkillIncDec sub-panels** (`src/ui/game/SkillIncDec.ts`):
  - `SkillIncPanel` — SP up window with WZ background, scrollable rows, +/- buttons
  - `SkillDecPanel` — SP down window with WZ background, scrollable rows, +/- buttons
  - `SkillChangeConfirm` — job change confirmation dialog with OK/Cancel
- **Event forwarding**: mouse/key events routed to sub-panels before main panel, sub-panels updated each frame
- **Font and icons**: SkillBook constructor now receives `BuiltInFont` and `ItemIconLoader` for tooltip support
- **onSkillGuide callback**: Wired to `_skillGuide.Open()` for button IDs 3001-3004
- **onSendSkillUp callback**: Separate from `onSkillUp` — sends `GameSender.SkillUp(skillId)` packet
- **nameOf callback**: Wired to `game.nameService.SkillName(id)` for tooltip skill name resolution
- **Aran tab buttons**: Loaded from `Tab/AranButton/Bt1-Bt4` WZ textures

# Session Summary � Chat Balloon 1:1 (WZ CChatBalloon audit + NpcLook reconciliation)

## Audit (`docs/chat-balloon-audit.md`)
- `CChatBalloon::MakeBalloon` @0x4A84F0: nType ? WZ node. Base `ChatBalloon.img` (StringPool 0x59A); 1000=`<nIdx>` (player), 1001=`npc`, 1002=`pet/<nIdx>`, 1003=`adboard/<nIdx>` (**routes to `m_pLayerAD`**, not `dead`), 1004=`mob/<nIdx>`, 1005=special-font; `bDead` (0x1AA8) ? bare `dead` node skipping the switch.
- `CreateCanvas` @0x4A59D0: font color = `uFontColor` param flowing from node `clr`; font path via `StringPool::GetStringW`; **OG default `nWidth` = 120** (StringPool 0x1AA9), TS `MaxTextWidth=160` was invented. 0x1AB4 = "head".
- `AdjustCoordY` @0x4A1300 ? `RelMove(m_nPosY - m_nHeight - 5)` � balloon sits **5px above anchor Y**.
- Timeout: player chat 5000ms (`CUser::OnChat` @0x8E86C0); `CheckTimeOut` @0x4A2060 fades alpha over `m_tFadeDalay`; guard `if (!m_pLayerChat.m_pInterface) return;`.
- `MakeMiniRoomBalloon` @0x4A2D90 separate material (0x1A / MiniRoom / StringPool) � keep MiniRoom title balloons on their own handling.
- StringPool hex ids 0x59A..0x5B0, 0x1AA8/0x1AA9/0x1AC6 un-resolvable to literals (this String.wz has no NoSound.img ? `StringPoolService` can't resolve); path shapes semantically confirmed.

## Code changes (this session)
- `src/ui/game/ChatBalloon.ts` rewritten: `BalloonType` const (1000-1005), `chatBalloonNodePath(type, nIdx, bDead)`, `computeChatBalloonLayout` with 5px-above math, per-balloon own sprite sets (one shared singleton was the bug where 0 players/1 sprite gave only the last drawn), default `Ttl = 5`, alpha fade, width-wrap at 120, node-driven fontColor/fontFamily/lineHeight. Constructor `(loader, uiWz, font)` � dropped `stringPool` param (1 site: GameStage ctor).
- `src/stages/GameStage.ts`: call sites 2211/2226 (whisper/local echo), 3132 (remote), 3173 (group), 3187 (whisper) ? `BalloonType.Player (1000)`; 7197 NPC idle ? `BalloonType.Npc (1001)`; MiniRoom 7342 unchanged (Set takes untyped type). NPC balloon anchor in `Draw` callback now applies `npc.BalloonOffset` (OG `m_ptBalloonOffset`, NPC 1300000 y=-20).
- **NpcLook duplicate-bubble reconciliation**: `NpcLook.ts` � new `onChatBalloon: ((text) => void) | null` callback fired from `OnChat` after `{NAME}` replacement (OG CNpc::OnChat ? CChatBalloon type 1001); `_drawSpeechBubble` early-returns when callback wired (internal box kept only as standalone fallback for QuestDetail/UtilDlgEx which never call OnChat); new `BalloonOffset` getter. GameStage `_onNpcEnter` wires `npc.onChatBalloon = (text) => _chatBalloon.Set(npc.ObjId, text, 5, BalloonType.Npc)`.
- Tests: `ChatBalloon.spec.ts` anchor expectation corrected to OG 5px math (y 157?152, arrowY 192?187); `NpcLook.spec.ts` new "delegates OnChat to the WZ balloon layer via onChatBalloon" ({NAME} ? template name). **1375/1375 pass, tsc clean.**

## Still blocked / deferred
- StringPool 0x59A..0x5B0 literals unverified (no NoSound.img in this String.wz).
- `MobLook._drawSpeechBubble` / `PetLook` similar internal-box patterns noted in audit �6 � out of scope this pass.

# Session Summary ? CUISkill gap-close (GetSkillLevelUpState + button sprite states)

## IDA re-audit (live IDB, this session)
Re-decompiled the full CUISkill surface to close remaining 1:1 gaps vs the previous
pass. Key functions: Draw @0x84ED90, OnMouseButton @0x84B710, SetButtons @0x84B220,
GetSkillIndexFromPoint @0x84B390, OnCreate @0x851520, SetTabItems @0x850990,
OnSkillLevelUpButton @0x84D660, GetSkillLevelUpState @0x9D5A40, CanSkillUp @0x84A930,
CanSkillUpDualJob @0x84AE10, GetRecommendSKill @0x84E710, SetScrollBar @0x84B1C0,
is_skill_need_master_level @0x47CCB0, is_ignore_master_level_for_common @0x47CC20,
is_nonslot_skill @0x849B90.

## Bugs found + fixed
- **SP-Up / BtMacro / AranButton / step2 BtOK/BtCancle sprites never loaded**: the
  WZ canvas is nested at BtX/{normal,mouseOver,pressed,disabled}/0, but the code
  checked 
ormal instanceof WzCanvas on the *property* node ? always false, so all
  four buttons rendered as empty containers. New helper loadButtonStateSprite (SkillBook)
  and inline state -> state.Get('0') descent (SkillIncDec step2) load all 4 states.
- **SetButtons semantics (0x84B220)**: OG calls SetButton(i, 1, enabled) ? the SP-Up
  button is VISIBLE whenever a skill occupies the row, shown with the disabled texture
  when it can't be leveled; hidden only when the row is empty. TS was hiding it entirely.
- **Slot bg + icon state** now driven by the OG GetSkillLevelUpState state machine
  (state != 0 ? skill1 canvas + Icon1/Icon2; state == 0 ? skill0 + Icon0) instead of the
  invented canAllocate (which required SP>0/level<max/passive). Maxed skill rows now
  keep the enabled slot look, matching OG.

## New ports (module-level in SkillBook.ts, exported for tests)
- getSkillLevelUpState (public method) / skillLevelUpState: returns 0 (required
  skill unmet), -1 (master-level-locked OR maxed), 1 (can level).
- isSkillNeedMasterLevel @0x47CCB0 (4th-job job%10==2, Evan 22111001/22141002/22140000,
  dual-blade job-4 + 4311003/4314920/4326906/4326909, exempt-list via is_ignore_master_level_for_common).
- isIgnoreMasterLevelForCommon @0x47CC20 (skill ids decoded from disassembly immediates:
  3220009/3220010, 2120009, 2220009, 2320010, 3120010-3120011, 1120012, 1220013, 1320011,
  4120010, 4220009, 5120011, 5220012, 32120009, 33120010).
- isNonslotSkill @0x849B90 (4321000, 1066-1067, 10011066-67, 20001066-67, 20011066-67,
  30001066-67, 33001002).
- Drag gate (OnMouseButton msg 513) now matches OG: jobType = (skillId/1000)%10 must be
  non-zero and != 9, plus !isNonslotSkill && level > 0 (was !passive && level>0).
- SP-Up click handler routes through onSkillLevelUp (which re-validates state==1/SP/disabled),
  mirroring CCtrlButton enabled-only dispatch.

## Tests
- New 	ests/ui/game/SkillBook.levelUpState.spec.ts (10 tests): state 1/-1/0 paths,
  required-skill unmet, master-level lock, is_skill_need_master_level explorer/Evan/exempt
  cases, is_nonslot_skill accept/reject. **160 files / 1388 tests pass, tsc clean.**
- **Follow-up (guide buttons + tab cycling)**: SetTabItems @0x850990 re-verified. The
  Aran/Cygnus skill-guide launchers (ids 3001-3004) are REAL CCtrlOriginButton controls
  created via CLayoutMan::AddButton (0x5CF210) with path UI/UIWindow2.img/Skill/main/Tab/AranButton/Bt%d
  (string @0xBA35A8), one per tab-strip slot the character hasn't unlocked (root count < 5;
  s_nTabCount = 7 @0xC61738). Each canvas origin encodes the slot (Bt1=-41, Bt2=-72, Bt3=-103,
  Bt4=-134 = the tab-strip 30px-slot positions). Implemented _guideBtns (4 containers built
  in ctor, textures only when loader/ui present) shown when _isAranJob && slot >= numTabs && slot < 5,
  positioned at TAB_X + slot*(30+1), clicking fires onSkillGuide(grade=slot); replaced the
  old fixed bottom-left hit-rect. Tab images now cycle via i % nTabImageCount (per-regular and
  per-dual image sets) matching SetTabItems; guide-button hover wired in onMouseMove.
  New 	ests/ui/game/SkillBook.guideButtons.spec.ts (6 tests). **161 files / 1394 tests pass, tsc clean.**
- **Skill strings from String.nx + skill-window bonus (this session)**: the v95 client reads
  skill names/descriptions/level-help from String.wz Skill.img, NOT Skill.wz — Skill.wz nodes
  only carry icons/effects/numeric data, and per-level nodes carry hs = a String.wz key ref
  (e.g. "h1"). SkillInfoService now takes an optional String.nx provider (GameStage passes
  () => game.wz.string): Get() resolves Name/Description from Skill.img/<id>/name|desc
  (Skill.wz fallback), GetBookName() prefers Skill.img/<root>/bookName ("Beginner's Basics"
  for root 0), and per-level help text resolves hs → Skill.img/<id>/<hs>. The (+%d) skill
  bonus (OG Draw: SkillLevel - PureSkillLevel in m_pFontBonus, level green at 50,nTop and
  "+N" at 65,nTop) is now wired: ItemAttr.IncSkill parses item info/incSkill (skillId→bonus),
  GameStage._refreshSkillBonuses() rebuilds the per-skill map from equipped items
  (EquipInventory.equippedItemIds generator) on every equip change, and SkillBook.skillBonusOf
  feeds the row rendering (effective level + green "+N"). Tests:
  	ests/character/SkillInfoStringNx.spec.ts (real-file, gated on MAPLECLAUDE_NX_DIR) verifies
  name/desc/level-help/book-name resolution; bonus callback contract tests. **162 files / 1401
  tests pass, tsc clean.**
- **In-game channel panel rebuilt 1:1 (this session)**: ChannelSelect.ts was a custom
  overlay (Graphics rectangles, wrong WZ path UIWindow2.img/Channel, 280x280). Rebuilt as
  the authentic v95 CUIChannelShift from a live IDB decompile. Window 370x168, centered
  (scrW-370)/2,(scrH-168)/2, wndKey=10. WZ: UI/UIWindow2.img/Channel backgrnd + BtChange
  (id 1, AddButton offset (-20,0), origin (-243,-141) -> 223,141, 74x16) + BtCancel (id 2,
  offset (0,0), origin (-320,-141) -> 320,141, 40x16) + channel0/channel1 (68x19 cell bgs,
  m_pCanvasItem[0]/[1]); world-name image world/<worldId> at (16, 40-h/2); channel-number
  glyphs from UI/UIWindow.img/Channel/ch/<idx> (0-based, ch/0 shows "1") at (left+8, top+5).
  Grid GetRectFromIdx (0x9689C0): left=70*(idx%5)+11, top=20*(idx/5)+55, 68x20. Draw
  (0x96CCB0) draws ALL cells every frame; current channel uses channel0 bg, hovered/selected
  (m_nSel, starts at current) uses channel1, plain cells glyph-only. Mouse: 513 down selects
  + redraw, 515 up over same cell -> SetRet(1) -> TransferChannel; OnKey arrows/Enter(0x0D)/
  Escape(0x1B). GameStage passes session.worldId + channel adult flags. Tests:
  	ests/ui/game/ChannelSelect.spec.ts (6 tests). **163 files / 1407 tests pass, tsc clean.**

## ChatBar filter tabs + ChatType fonts (IDB OnButtonClicked 0x880540) (this session)
- **Filter flags verified from IDA** (0x3F6-0x3FB): All=0, Buddy=0x08, Party=0x04, Guild=0x10,
  Alliance=0x20, Expedition=0x4000000. No system filter; `_isFiltered` always passes lType 12-24.
  Order: [All, Buddy, Party, Guild, Alliance, Expedition]. Old code had Party=0/Buddy=0x08/Guild=0x04
  swapped and a fake 0x20 System flag.
- **Font colors from OnCreate (0x87B5F0)** ChatType-indexed `m_pFontChatLog[0..26]`: 0 white, 1 #00FF00,
  2 #FF99CC (party), 3 #FF9900 (buddy), 4 #E1ACFE (guild), 5 #A6FF7F (alliance), 14 #770042 (whisper),
  26 #7DFFEE (expedition); height 11 (12 for idx 6,15,18-22). Replaced old 7-color tab-order table.
- **Membership gating** from `_ResetChatBarPos (0x86DC30)`: tabs for groups you are not in are hidden,
  their filter bit is cleared, remaining tabs compact left to x=1+i*46 (TAB_SPACING=46), y=_chatWndY-19.
  ChatBar exposes `setMembership({party,guild,alliance,expedition})`; GameStage wires onPartyLoad /
  onGuildLoad / onAllianceLoad / onExpeditionResult (Removed clears). WZ `checked/0` sprites toggle with
  each tab's active state.
- **GameStage onGroupMessage** lType mapping corrected: cases 2/3/4/5/26 now map to lType 2/3/4/5/26
  (was 1/2/3/4) so `_isFiltered` + font color line up with the client packets.
- Tests: `tests/ui/game/ChatBar.spec.ts` — new describe "ChatBar filter tabs (IDB OnButtonClicked
  0x880540)" (constants, party bit, All reset, XOR toggle, combined bits, membership hide + compact,
  font colors). Pixi v8 note: TextStyle exposes `.fill` (not `._style.fill`); tab labels sit at btnX+4.
  **163 files / 1411 tests pass, tsc clean.**

# Session Summary — Chat input 1:1 wiring (Enter + combo click) + StatusBar name/job plate

## ChatBar was fully built but GameStage never routed input to it (the 1:1 gap)
- `ChatBar.ts` already had the complete OG surface: `onKeyPress` (Enter=send+EndChat, Escape=clear+EndChat,
  Tab=cycle 9 targets, ArrowUp/Down=history, Ctrl+C/V/X/A, single-char typing), `handleMouseButton`
  (combo→ComboBox toggle, input/display click→focus, tab XOR filter, whisper/item-link routing),
  `onMouseMove`, `focus()/startChat()/endChat()`, combo box + chat-target dropdown, membership-gated tabs.
- **GameStage never called any of it** — only `_statusBar.onChat = () => _chatBar.focus()` (the BtChat button).
  Enter in the map did nothing; the combo box never received clicks.
- **Fixes in `src/stages/GameStage.ts`**:
  - `onKeyPress`: while `_chatBar.isFocused` route every key to `_chatBar.onKeyPress(key)` (consumes before
    func-key/portal dispatch, so ArrowUp types history instead of warping); while inactive `key === 'Enter'`
    → `_chatBar.startChat()`. Matches OG `CUIStatusBar::OnKey` @0x87FDE0 guard `m_pFocus == m_pEditChatInput`
    + `StartChat` @0x87A4B0 (SetChatType(2) when type 1). `ChatBar.isFocused` getter added.
  - `onMouseMove`: routes to `_chatBar.onMouseMove(x, y)`.
  - `onMouseButton`: routes `_chatBar.handleMouseButton(x, y, down)` **BEFORE the panel loop** — critical
    because `StatusBar.handleMouseButton` swallows every click in its bar rect (y ≥ viewH-85) and the chat
    combo (3,519 68x21) / edit (75,~492) sit inside that region, so the panel loop stole all chat clicks.
    Verified StatusBar button origins (StatusBar2.img/mainBar `normal/0` canvas origins vs `_barRef` 512,599)
    place all buttons at x≥396 — no overlap with the chat bar's left-side hit rects. Outside clicks return
    false → panels + world/NPC handling proceed (and the ChatBar blurs, OG EndChat-on-outside).
- **Tests `tests/stages/GameStageChat.spec.ts`** (5, canvas-shimmed): inactive Enter→startChat, focused
  Enter→send+endChat, focused keys owned by chat (ArrowUp NOT `_handleUpKeyDown`), combo click→toggle,
  outside click falls through. **New file.**

## StatusBar name plate (OG `CUIStatusBar::SetStatusValue` @0x873590)
- Verified from the decompile: **job line is `get_job_name(job)` alone** at (75, 549) — NOT "Lv.X JobX";
  the level is drawn separately as `draw_number_by_image` digits right-aligned ending at x=45, y=552;
  the character name is `FONT_SMALL_WHITE` at (75, 561) with a black 4-way outline (shadow draws at
  74/76 x, 560/562 y).
- `StatusBar._drawNamePlate` fixed: `_levelText.text = this.jobName` (dropped the `Lv.${level}` prefix);
  name outline upgraded from a single (+1,+1) shadow to the OG 4 diagonal-corner black draws (new
  `_nameTextOutline[4]` Texts; removed the now-dead `_nameText`). Level digits untouched (already OG).
- `update()` now also sets `_textDirty` when `charName|jobName|level` changes (was only HP/MP/EXP) so the
  name plate re-renders when stats load. New `_lastNameText`.
- Test `tests/ui/game/StatusBar.spec.ts`: new "name plate" describe asserts job-only text, no "Lv.X",
  1 white + 4 black name texts at NAME_POS y±1. **171 files / 1482 tests pass, tsc clean.**

## Follow-up (this session): ChatBar dropped +15 then +5 (user: "chatbar should be down", "put 5 more")
- `const CHAT_DY = 15` then **`CHAT_DY = 20`** in `ChatBar.ts`, applied to every chat-bar Y anchor:
  `_chatWndY` base + all `setChatType`/drag-resize values (518→538, 492→512, 515-h→535-h),
  `EDIT_Y` (524→544), `COMBO_Y` (519→539), scrollbar `scrollbarTop`/`trackTop`
  (516-h→536-h). Display/tab/filter-button/layer/whisper-picker positions derive from `_chatWndY` so they shift with it.
- **The chatOpen/chatClose "+"-toggle buttons stay at their status-bar anchor `(512, 599)`** (NOT shifted
  by CHAT_DY) — user: "the bottum of + should be like before" (the "+" was well positioned originally).
- Test updates: `ChatBar.spec.ts` `EDIT_Y`/`DISPLAY_Y_SMALL` → 544/512; `GameStageChat.spec.ts` combo
  click y → 550. **171 files / 1482 tests pass, tsc clean.**

## Character name tag below the feet (user: "character name still not showing under the character")
- **Local player** (`CharLook`, new): `charName` field + `_nameTag` Text rendered in `_updateNameTag()`
  (called from `_rebuildDisplay`). Yellow plate (fill 0xffe664, black stroke) at **y = +10 below the
  feet**, anchor (0.5, 1), and **counter-flip** `_nameTag.scale.x = container.scale.x` so the text reads
  normally despite the avatar's `container.scale.x = ±1` flip. `_rebuildDisplay` only clears the 5 body
  layers, so the tag survives. Empty `charName` (e.g. the inner avatar of OtherCharLook) → no tag.
- `GameStage._applyStatToStatusBar` now also sets `this._player.charName = stat.name`.
- **Remote chars** (`OtherCharLook`): name/guild/medal tags moved from `nameTagY = -78` (ABOVE the head)
  to `+10` (BELOW the feet), matching `CLife::MakeNameTag` type 1000 — the HP gauge stays above (-105).
- Verified from IDB: `CUser::DrawNameTags` @0x8EA990 → name=type 1000, guild=1004, medal=1006 on
  `m_pLayerUnderFace`. `CLife::MakeNameTag` @0x5CF5E0 (73KB decompile) confirmed the below-feet plate.
- Tests `tests/character/AvatarAnchors.spec.ts` +3: local tag at y=10 + counter-flip; remote name at
  y=10 (not -78). **171 files / 1485 tests pass, tsc clean.**

## MiniMap not showing in-game (user: "minimap is not showing", "it should be always on the top left corner")
- Verified the minimap renders fine in isolation with real v95 data (map 10000 miniMap node: canvas 112x57,
  width 1806/height 913/center 363,149/mag 4 read as bigints; `_readInt` handles bigint). It's constructed in
  `_initMenu` (line 1146), added to `uiRoot` (line 1782), and `update()`→`draw()` runs every frame (line 2666).
- **Root cause #1 (position)**: the constructor restored a saved `localStorage` position (`PosSaveKey`) that
  could park the minimap OFF-SCREEN, making it appear missing. Per user, the minimap is now **ALWAYS at the
  top-left corner (4,4)** — the localStorage restore, `_savePosition()`, and the `_savedX/_savedY`/`PosSaveKey`
  fields were removed.
- **Root cause #2 (render crash)**: `_drawMapAndIcons` read `_data.Footholds.length` / `_data.LadderRopes.length`
  WITHOUT optional chaining — a plain-object or partially-filled data set threw every frame, swallowed by
  `update()`'s try/catch (so the minimap silently drew nothing). Now `this._data?.Footholds?.length`.
- Tests `tests/ui/game/MiniMap.party.spec.ts` +2: always-top-left (4,4) ignoring a bogus saved position;
  `update()` no-throw with data lacking Footholds/LadderRopes. **171 files / 1487 tests pass, tsc clean.**

# Session Summary � CUIStat Draw 1:1 corrections (EXP/Fame formats + beginner covers)

## Verified (live IDB decompiles, this session)
- **Draw @0x864BD0 full** (C:\Users\jorge\AppData\Local\Temp\opencode\cuistat_0__Draw@CUIStat@@UAEXPBUtagRECT@@@Z.txt, 1242 lines) + OnMouseMove @0x864BD0 (cuistat_1__OnMouseMove...).
- **Text-row formats**: Level=Fame=StringPool **6677** single %d (labels "Lv."/"Fame:" baked into the WZ backgrnd, NOT drawn as text); HP/MP=**6678** 2-arg "%%d / %%d"; **EXP row = 1994 Format(exp, pct) � exactly 2 args** (next-level EXP is NOT shown on the panel); EXP tooltip (OnMouseMove, hit rect at (55,138) 109x13) = **0x1A37 Format(exp, next)** 2 args; stat rows (STR 227 / DEX 245 / INT 263 / LUK 281) plain itoa(base) when base==total else **1979 Format(base, total, base-total)** 3 args; AP itoa right-aligned (85 - CalcTextWidth, 200).
- **Beginner branch** ((job == 1000*(job/1000) || job == 2001) && level <= 10): copies **cover0** (160x308, origin -6,-22) and **cover1** (150x121, origin -11,-181) overlays onto the canvas BEFORE the text, then still draws Name/Job/Level/Guild/HP/MP/EXP/Fame, then returns early � NO stat icons, NO stat rows, NO AP.
- **Disabled icon switch** on asicStat.nJob % 1000 / 100: case 0(job==0)|1|3|5 ? indices [2,3] (INT,LUK); case 2 ? [0,1] (STR,DEX); case 4 ? [0,2] (STR,INT); default none. Only 2 blits, guarded 64 <= 3; canvases from UI/UIWindow2.img/Stat/main/Disabled/{STR,DEX,INT,LUK}, each 150x16 origin STR(-11,-224) DEX(-11,-242) INT(-11,-260) LUK(-11,-278).
- **ms_aStatName = exactly 4 entries** (static init @0xB0E900 reads aStr/aDex/aInt/aLuk; WZ Disabled subtree has exactly 4 nodes) � TS 7-entry STAT_NAMES (incl. AP/HP/MP) was wrong; those icons never draw in OG.
- OnButtonClicked ability bits confirmed: HP 0x7D0?0x800, MP 0x7D1?0x2000, STR 0x7D2?0x40, DEX 0x7D3?0x80, INT 0x7D4?0x100, LUK 0x7D5?0x200; DetailOpen 0x7D6, BtAuto 0x7D7/0x7D8?AutoApUp(1), BtAuto0x7D9?AutoApUp(0).

## Code changes (src/ui/game/StatsInfo.ts)
- STAT_NAMES trimmed to ['STR','DEX','INT','LUK']; statYPositions loop now can't reference phantom AP/HP/MP icons.
- **EXP row text now ${exp} (%)** (was ${exp} /  (%)) � matches 1994 2-arg format; pct = floor(100*exp/next), clamped 0 when next<=0.
- **Fame text now ${fame}** (was Fame: ), re-styled to _valueStyle � label is baked into the WZ image.
- **Beginner covers**: loads cover0/cover1 WzSprites, adds hidden sprites to _root (under content/text), toggles isible in update() with _bBeginner (on when beginner, off otherwise) � OG draws them first so text overrides on top.
- New test 	ests/ui/game/StatsInfo.draw.spec.ts (11 tests): EXP 2-arg format + pct floor/clamp, bare Fame/Level, HP/MP 6678, AP right-align ending at 85, beginner cover/visibility + job 2001 + level>10 exit. ChatBar.spec's Text.prototype.width shim copy included.
- **175 files / 1529 tests pass, tsc clean.**

## Remaining
- StringPool 6677/6678/1979/1994/0x1A37 literal text still unresolvable (String.wz lacks NoSound.img) � formats inferred from Format() arg counts only.
- handleMouseMove EXP hit-test (+tooltip) still uses a 3-value string; the OG 0x1A37 is 2 args (exp, next) � cosmetic mismatch to tighten next pass.

# Session Summary � Sound system complete audit (weapon, item, skill, field, game)

## Sound.nx structure (fully mapped this session)
- Root has 46 children: `Game.img` (28), `Mob.img` (1547), `Skill.img` (573), `Weapon.img` (12), `Item.img` (231), `Field.img` (238), `UI.img` (448), `Cash.img`, `Consume.img`, `Etc.img`, `Eqp.img`, etc.
- **`Game.img`** children: `Jump`, `LevelUp`, `JobChanged`, `DropItem`, `PickUpItem`, `Portal`, `Bird`, `Buff`, `EnchantSuccess/Failure`, `IncEXP`, `Transform`, etc.
- **`Weapon.img`** children (12 weapon types): `barehands`, `bow`, `cBow`, `gun`, `knuckle`, `mace`, `poleArm`, `spear`, `swordB`, `swordL`, `swordS`, `tGlove`. Each has `Attack` audio; some have `Attack2`.
- **`Skill.img`** children: 573 skill IDs (e.g. `0001000`, `1101008`, `32001008`), each with audio children (`attack1`, `attack2`, `attack3`, `use`, `hit`, `summoned`, `delayedHit`, `getoff`).
- **`Item.img`** children: 231 item IDs (8-digit zero-padded, e.g. `02000000`), each with `Use` audio child.
- **`Mob.img`** children: 1547 mob IDs, each with `die1/die2/hit1/hit2/attack1/attack2/attack3/attack4/attack5/special1/special2/special3/special4/special5` audio.

## OG sound functions (IDA-decompiled, all confirmed)

### `play_game_sound` @0x967420
- Signature: `(wchar_t* sSndName, uint uVol)`
- Prepends `StringPool 0x8C3` = `"Sound.wz/"` + sSndName ? `CSoundMan::PlaySE`
- Used for: jump, level-up, job-change, portal, buff, drop, pickup, UI clicks
- **TS equivalent**: `_mobSoundWz.GetItem(path)` + `game.audioPlayer.PlayEffect(node.AudioBytes)`

### `play_item_sound` @0x966840
- Signature: `(int nItemId, const wchar_t* seType)`
- When `seType == 41`: reads `StringPool 0x1A87` = `"Use"` and `StringPool 0x8BB` (format string)
- Path: `Item.img/{String(nItemId).padStart(8,'0')}/Use`
- Fallback: `Item.img/{String(10000*Math.floor(nItemId/10000)).padStart(8,'0')}/Use`
- **TS equivalent**: `_mobSoundWz.GetItem(\`Item.img/${paddedId}/Use\`)` + `game.audioPlayer.PlayEffect()`

### `play_skill_sound` @0x966b60
- Signature: `(int nSkillID, wchar_t* seType)`
- Reads skill from Skill.nx; seType values: `"attack1"`, `"attack2"`, `"attack3"`, `"use"`, `"hit"`, `"summoned"`, `"delayedHit"`, `"getoff"`
- Path: `Skill.img/{skillId}/{seType}`
- **NOT YET IMPLEMENTED** in TS

### `play_field_sound` @0x967180
- Signature: `(wchar_t* sSndName, uint uVol)`
- Same as play_game_sound but for ambient field sounds (portal arrivals, map-specific ambience)
- **TS equivalent**: same pattern as play_game_sound

### `play_minigame_sound` @0x967320
- Signature: `(wchar_t* sSndName, uint uVol)`
- Same pattern, for minigame results

## Weapon attack sound mechanism (CRITICAL � per-weapon-instance, not per-numeric-type)
- Each weapon's Character.wz `info` node has an `sfx` field (e.g. `"swordL"`, `"knuckle"`, `"tGlove"`, `"poleArm"`)
- `ActionMan._readCharEntry` reads this at line 544: `sSfx: this._readStr(infoNode, 'sfx')`
- `ActionMan.GetCharacterImgEntry(weaponId, null)` returns the entry with `.sSfx`
- **Verified via NX dumps**: weapon 1302000 (1H sword) ? `sfx="swordL"`, 1402000 (2H sword) ? `sfx="swordL"`, 1332000 (dagger) ? `sfx="swordL"`, 1472000 (claw) ? `sfx="tGlove"`, 1482000 (knuckle) ? `sfx="knuckle"`, 1442000 (bow) ? `sfx="poleArm"`, 1312000 (2H axe) ? `sfx="swordL"`
- The `sfx` field is per-weapon-instance, NOT per-numeric-weapon-type � different weapons of the same category can have different `sfx` values
- Sound path: `Sound.wz/Weapon.img/{sSfx}/Attack`
- **OG `RegisterAfterimage`** stores `sSfxUOL` and the afterimage renderer plays `Weapon.img/{sSfx}/Attack` during the swing
- **ALREADY IMPLEMENTED** in `GameStage._playWeaponAttackSound()` � reads `sSfx` from ActionMan, plays via `_mobSoundWz`

## Implemented sound effects (this session)
- **Weapon attack**: `GameStage._playWeaponAttackSound(weaponId)` ? `Weapon.img/{sSfx}/Attack`. Called from `_tryMeleeAttack` after hit connects.
- **Item consumption**: `GameStage._playItemUseSound(itemId)` ? `Item.img/{paddedId}/Use`. Called from `onUseItem` at handler entry.
- **Jump**: `Game.img/Jump` � already wired (GameStage:5048-5052)
- **Level-up**: `Game.img/LevelUp` + `BasicEff.img/LevelUp` animation � already wired (GameStage:7191-7209)
- **Job-change**: `Game.img/JobChanged` + `BasicEff.img/JobChanged` animation � already wired (GameStage:7873-7883)
- **Mob hit**: `Mob.img/{templateId}/hit1` � via MobSoundService
- **Mob die**: `Mob.img/{templateId}/die1` � via MobSoundService
- **Mob damage**: `Mob.img/{templateId}/attack1` � via MobSoundService
- **Drop/pickup**: `Sound.wz/Game.img/DropItem` / `PickUpItem` � via FieldSoundService

## NOT YET IMPLEMENTED (skill sounds)
- **Skill attack sounds**: `Skill.img/{skillId}/attack1` (and `attack2`, `attack3`) � played when a skill attack connects
- **Skill cast/use sounds**: `Skill.img/{skillId}/use` � played when the skill is cast
- **Skill hit sounds**: `Skill.img/{skillId}/hit` � played when the skill hits a mob
- **Summoned sounds**: `Skill.img/{skillId}/summoned` � played for summon-type skills
- **Delayed hit sounds**: `Skill.img/{skillId}/delayedHit` � played for delayed-impact skills
- **Getoff sounds**: `Skill.img/{skillId}/getoff` � played for dismount/uncast
- **Remote player attack sounds**: `Weapon.img/{sSfx}/Attack` for remote characters in `OnMeleeAttack`/`OnShootAttack` handlers
- **Buff activation sounds**: `Game.img/Buff` � played when a buff is applied
- **Portal sounds**: `Game.img/Portal` � played when entering a portal
- **UI click sounds**: Various `UI.img` paths � played on button clicks

## Key files for sound implementation
- `src/stages/GameStage.ts`: `_playWeaponAttackSound()` (line ~6035), `_playItemUseSound()` (line ~6050), `_mobSoundWz` (line 199, loaded at 1099), `onUseItem` handler (line 1869), `_tryMeleeAttack` (line 5919)
- `src/character/FieldSoundService.ts`: Model for caching + playing Sound.wz audio
- `src/character/MobSoundService.ts`: Similar caching pattern for Mob.img sounds
- `src/character/ActionMan.ts`: `sSfx` field (line 544), `GetCharacterImgEntry()` (line 513), `GetWeaponAfterImage()` (line 1291)
- `src/render/WzAudioPlayer.ts`: `PlayEffect(buffer)` at line 79
- `src/wz/WzSound.ts`: WzSound type with `.AudioBytes`
- `src/wz/WzUol.ts`: UOL resolution for indirect sound paths
- `src/net/handlers/FieldHandlers.ts`: `onPlayEventSound` / `onPlayMinigameSound` callbacks (line 424-430)
- `src/net/packet/MeleeDamage.ts`: `getWeaponType(itemId)` at line 51
- `src/character/SkillEffectOverlay.ts`: `PlayAtCaster()` for skill effect animations (line 76)











# Session Summary - Quest log shows quests by level/category + quest helper (OG CUIQuestInfo)

## IDB ground truth (live decompiles this session)
- **LoadData @0x832D40**: quests are grouped by CATEGORY, not level bands. Category = the quest's **"area"** field in QuestInfo.img (StringPool 1776 = "area", NOT "category" as previously assumed); names from **Etc.wz/QuestCategory.img** (index->name string table, e.g. 20="Maple Island", 30="Victoria Island", 51=medal group). Header rows inserted per existing category; completed-old quests go under category 100.
- **QICompareFunc @0x822110 (ZSort)**: category asc -> nSortKey asc -> start-demand LvMin asc. SortKey = **"sortkey"** field on the QUEST INFO node (StringPool 4546), stored as a NUMERIC STRING ("1","10") in this WZ set - not on Check.img.
- **GetQuestSubInfo @0x82A590** level strings: no demand -> SP3270 "No limit"; LvMin>0 -> SP3271 Format("Over Level %d"); LvMax>0 -> SP3272 Format("%s Under Level %d") appended.
- **IsWorthlessQuest @0x8223B0**: tab0-only; worthless when charLevel >= LvMin+10 AND end-date == DB_DATE_20790101 (permanent). The BtMyLevel(5000)/BtAllLevel(5001) pair toggles m_nOption bit 0x10000000; when set, worthless quests are hidden (persisted at CWvsContext+4245).
- **Category toggle buttons**: BtMin id 3000+4*cat+tab sets the minimized bit, BtMax 4000+4*cat+tab clears it (m_abOption).
- **OnTabChanged @0x8351D0 + TryShowSuitableLevelQuest @0x832090 = the v95 "quest helper"**: switching to the Available tab walks its rows in order and auto-opens the detail of the first non-worthless, not-yet-read quest (second pass ignoring read state), else TryShowTopQuest selects the top row, else ToggleDetail(0) closes the detail. Guide tip strings SP6648/6649 "Shows you where you need / to go to do this quest."
- **IsMedalQuest @0x522C20 confirmed** = GetQuestCategory(id)==51 i.e. area==51 (96 quests in this WZ set).

## TS changes
- `src/character/QuestInfoService.ts`: GetQuestCategory now returns q.Area (removed the invented ID-range table); new optional etcWz ctor provider loads QuestCategory.img into GetQuestCategoryName; SortKey parsed from info-node "sortkey" incl. numeric-string form (+GetQuestSortKey); removed stale Check.img nSortKey read and _questCategories map.
- `src/ui/game/QuestLog.ts`: `_rebuildRows` rewritten to OG LoadData - bucket by categoryOf, header row per category with categoryNameOf fallback to the server group label, QICompareFunc sort (sortKeyOf -> minLevelOf -> id), worthless filter active by default (MyLevel mode; BtAllLevel/_showAll disables); BtMin/BtMax now minimize/expand a category via per-tab minimized sets; new resolvers sortKeyOf/categoryOf/categoryNameOf/minLevelOf/worthlessOf/readOf + activeTab getter + initialTab opt; **quest helper ported**: tryShowSuitableLevelQuest(notRead), tryShowTopQuest(), runTabHelper() wired into tab clicks (OnTabChanged) and both open paths in GameStage (key 8 + status-bar quest button); onNoQuestSelected closes the detail when nothing qualifies.
- `src/stages/GameStage.ts`: QuestLog constructed with initialTab 0 (Available first, like OG default flow); onSelectQuest records into _viewedQuests (read-state for the helper); levelOf switched to the OG "Over Level N [Under Level M]" strings; all six new resolvers wired from QuestInfoService.
- `src/MapleClaudeGame.ts`: passes an Etc provider so category names load.

## Data verified against wz_client
3412 quests; 2719 have Check lvmin; areas: 50:1155, 30:430, 10:369 ... 51:96 (medals); sortkey present on 34 quests (party 120x + event 33xx/38xx series) - numeric strings.

## Tests
- NEW tests/ui/game/QuestLog.helper.spec.ts (8): category grouping/order, QICompareFunc sort tiebreak, MyLevel filter hides out-leveled quests, category minimize collapse, helper picks first unread suitable quest, -1 + onNoQuestSelected fallback, tab-switch helper chain, OG level-string contract.
- NEW tests/character/QuestInfoService.category.spec.ts (3, real NX gated): area==category, medal area-51 group, Etc category names, sortkey parse count.
- QuestLog.spec (5) + all prior quest suites pass unchanged. Suite: **1900 pass**; remaining failures are the concurrent sessions GameStageReactor/MiniRoom specs + pre-existing e2e playwright env issue; current tsc errors are that sessions in-flight EnchantSkill/_itemInfoService work, none in files touched here.

# Session Summary - Player-to-player trade wired end-to-end on the OG MRP/TRP wire (invented legacy protocol deleted)

## IDB ground truth (live decompiles this session)
- **Entry point CField::SendInviteTradingRoomMsg @0x52E9E0** = TWO packets on opcode 144: [MRP_Create=0][type=3 TradingRoom] then [MRP_Invite=2][int targetId] (target resolved via CUserPool::FindRemoteUserByName client-side). Morphed/community-blocked/modeless-open guards + SP0x96/0x98/0x17B chat notices.
- **CTradingRoomDlg::OnPacket @0x7649A0 dispatch**: 15 OnPutItem / 16 OnPutMoney / 17 OnTrade / 21 OnExceedLimit. SetRet(2) sends [MRP_Leave=10]. OnLeave decodes byte leaveType; TradeDone(7) computes gained = clamp(money - initMoney, partnerOfferDelta) with SP0x1A7 Format; notices 2->SP421, 8->SP424, 9->SP425, 12->SP426, 13->SP6759.
- **OnCreate @0x765AB0**: chat edit id1006 @(281,278) 172x15 white bg #555555 font SP0x1A25; buttons BtEnter(1004)/BtClame(1005)/BtTrade(1002)/BtCoin(1003)/BtReset(id 2) origin-placed from UIWindow2.img/TradingRoom; EnableChat(295,12,201,240); scrollbar id1000 right of chat (wheelRange 226); fonts FONT_SMALL_WHITE/FONT_NO_BLACK; money digit image font StringPool 0x50E.
- **GetItemIndexFromPoint @0x7637D0**: two 3x3 grids of 32x32 cells pitch 39x37 - MY grid origin (152,152) returns i+1, THEIR grid origin (17,152) returns -(i+1).
- **PutMoney @0x764450**: gated !myLock && curUsers>1 + 500ms throttle; CUtilDlgEx INPUT_NO(def 1, min 1, max = my mesos); level>15 || amount<=1e6 else notice.

## Server rewritten (`TradingRoom.ts` NEW kinoko port + `MiniRoomHandler.ts` restructured) - the old wire was invented
- Old code had a fabricated "legacy trade protocol" (TradeAction 2..0xF + TradeManager/TradeRoom) that matched NEITHER the OG client nor our own TS senders. Deleted from the handler; TradeManager/TradeRoom files left orphaned for later cleanup.
- New kinoko-faithful flow: MRP_Create type 3 -> TradingRoom dialog (enterResultRoom); MRP_Invite[int targetId] -> inviteStatic to target (NoCharacter/CannotInvite cancel the owner's room); MRP_InviteResult[int roomId][byte err] -> owner gets inviteResult + cancelTrade(UserRequest); MRP_Enter -> enterBase(1,user) broadcast + seat 1; TRP_PutItem[byte TI][short pos][short qty][byte slot1..9] (partial-stack split w/ itemNumber op, full-stack delItem, tradeBlock/accountSharable reject); TRP_PutMoney[int] (gainMoney + MONEY stat echo); TRP_Trade double-confirm -> completeTrade w/ getTradeTax both sides + canAdd checks + leave(0,TradeDone); TRP_ItemCRC ignored; leave() = cancelTrade(Closed).
- MiniRoomPacket gained static TradingRoom{putItem,putMoney,trade}; inviteStatic/inviteResult/enterBase/enterResultRoom/leave builders already existed.
- Server tsc clean; test/world/miniroom/miniRoomHandler.test.ts rewritten to the OG wire (5 cases: create->invite->enter, no-target cancel, Rejected decline, full offer exchange incl. tax math + partial stack, mid-trade leave returns items).

## Client
- GameSender.MiniRoomCreateTrade now sends ONLY [0][3] (was omok-style create with title/password tail the server would misread); new MiniRoomInviteResult(roomId,errCode); MiniRoomInvite/MiniRoomEnter/TradePutItem/TRP_PutMoney/TradeConfirm already byte-matched OG.
- FieldHandlers MRP_Invite decode fixed to OG OnInviteStatic layout (was reading just a string): byte roomType + str inviter + int roomId.
- GameStage._onMiniRoom: case 2 opens the utilDlg YESNO "<inviter> wishes to trade with you." -> accept sends MiniRoomEnter(roomId), decline sends InviteResult(roomId,3 Rejected); case 3 requester-side outcome notices; EnterResult picks the partner by seat != myPosition; TRP cases route by userIndex vs myPosition; TRP_UnTrade clears partner confirm; MRP_Leave closes the trade window with per-leaveType text (TradeDone/fail/cancelled). Context-menu Trade entry + /trade command send the OG create+invite packet pair.
- TradingRoom.ts rebuilt from the Graphics placeholder to the WZ-driven dialog: backgrnd/backgrnd2/backgrnd3, all five WZ buttons (BtReset id2 = close->[MRP_Leave]), OG grid geometry + GetItemIndexFromPoint hit rects (slot indices 1..9), chat log (295,12,201,240) + edit (281,278,172,15) + BtEnter submit -> MiniRoomChat, PutMoney through the shared _utilDlg INPUT_NO facade with the lv16/1M gate and 500ms throttle, confirm locks BtTrade/BtCoin.

## Tests
- NEW tests/ui/game/TradingRoom.spec.ts (9): create-packet shape regression (no title tail), invite-result framing, put-item field order, open/reset, seat routing, Escape->[MRP_Leave], OG slot geometry put at index 5, chat submit.
- Client suite **1951 pass**; remaining failures are the concurrent session's GameStageReactor clamp work + pre-existing e2e playwright env issue. Client + server tsc clean. Server mocha still env-broken (module resolution) - verified by tsc per repo convention.

# Session Summary - WorldMap panel fixes: whole-world fallback + UI.nx close button + drag + centering

## User report: "worldmap panel not showing / no background on images"
## Diagnosis (headless repro of the exact GameStage path with real NX BEFORE any change)
- Border chrome + base canvas + spots all load fine for mapped fields (10000->WorldMap000/9 spots, Henesys->WorldMap010/97 spots+3 links).
- **Root cause of empty panels**: fields not listed by ANY regional WorldMap###.img resolve to null -> _baseCanvas=null -> dark fallback rect + "World Map" text only. Probes: 910000000/910000001 (Free Market rooms) -> []; field 0 -> []. The WZ carries a root `WorldMap.img` (whole world: BaseImg+12 MapLink+23 MapList) that we never loaded as a fallback.
- **Close button never had art**: _createButtons looked up `Basic.img/BtClose3` in this._mapWz (Map.nx) - Basic.img lives in UI.nx. Always fell back to text Button('Close').
- Default open key = scancode 8 = '7' (Menu id 5) + minimap BtWorldMap.

## Changes (src/ui/game/WorldMap.ts)
1. **Whole-world fallback**: openForField falls back to `_loadMapProp('')` (= WorldMap/WorldMap.img) when GetDeepestWorldMap returns null; _currentMapName='World Map'. Every map now opens WITH its base image.
2. **BtClose3 from UI.nx** (with UIWindow2.img/BtClose3 then mapWz probes as backups); quest-toggle lookup now checks uiWz first.
3. **Window drag enabled**: draggable=true, _wndTitleH=27 (top border strip); beginDrag overridden with the fixed 800x600 rect because GamePanel.beginDrag's getLocalBounds() walks Text children and throws before fonts measure (same fix as StatsInfo.beginDrag); updateDrag() wired into update().
4. **Centered**: onResize(w,h) centers at ((w-800)/2,(h-600)/2) unless dragging; wired into GameStage.onResize; _open() also re-centers via window.innerWidth/Height so every open starts centered.

## Tests
- tests/ui/game/WorldMap.spec.ts 12 (was 8): + whole-world fallback present in stub package, drag-by-title-band moves container & release pins it, no-drag below band, onResize centering.
- tests/ui/game/WorldMap.wz.spec.ts 4 (real NX): + Free Market 910000000 falls back to whole-world WorldMap.img with base canvas + spots.
- Suite 1962 pass; remaining failures are the concurrent session's GameStageReactor work + pre-existing e2e playwright env issue; the one tsc error (_showAutoStartQuestList @GameStage 1114) is that session's mid-flight edit, not this work.

# Session Summary - ESC/input stuck-button fix (TryCloseUI parity + global mouse-up reset)

## User report: "need to use ESC a lot of time so most panels can be opened again; buttons stay at clicked; have to use ESC to use it again"
## Root causes found
1. **The Escape close list was a fixed 12-panel array** (keyConfig/skill/equip/item/stats/charInfo/quest/optionMenu/quickSlotConfig/channelSelect/claim/ranking). World map, user list, shops, trading room, etc. were NEVER closable by ESC - pressing ESC with only those open fell through to `_gameMenu?.Open()`, silently OPENING the game menu behind the open window.
2. **The invisible game menu then ate one click per open**: onMouseButton's gameMenu branch (`if (down) { isVisible=false; return; }`) swallows the first outside click to dismiss it - so every status-bar button appeared dead / "stuck clicked" until another press dismissed the hidden menu.
3. **`_resetAllButtonStates()` existed but was never called** - its own doc comment describes exactly this bug ("prevent buttons from staying stuck when a panel opens during mouse-down and the mouse-up goes to the panel").

## Changes (src/stages/GameStage.ts)
- **Escape = OG TryCloseUI**: walks `_panels` topmost-first, closes ONE visible window per press (+ `resetButtonStates()`), with a keepOpen exclusion set {statusBar, miniMap, quickSlots, revivePanel, questReward, notice, questAlarm, utilDlg (script dialogs own their state), contextMenu}. GameMenu itself toggles closed; the auto-Open fires only when NOTHING was closed (OG UI_Menu nothing-left branch).
- **Global mouse-up reset**: `onMouseButton` is now a thin wrapper around the renamed `_onMouseButtonDispatch`; on `!down` it calls `_resetAllButtonStates()` so no button anywhere stays visually pressed when its mouse-up was consumed elsewhere.

## Tests
- NEW tests/stages/GameStageEscape.spec.ts (5): topmost-first close + button-state reset, world-map closable, global mouse-up resets all visible panels + status bar, HUD/revive excluded from ESC closing, game-menu toggle-close + auto-open only when nothing was closed.
- Suite **1985 pass**; remaining failures are the concurrent session's GameStageReactor clamp work + pre-existing e2e playwright env issue. tsc clean. NOTE: one run showed transient UtilDlgEx/BalloonTip failures that vanish in isolation - the concurrent session edits shared files mid-suite-run; not related to this work.
