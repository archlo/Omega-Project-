# TS Port Status

## Known Gaps — Full OG-vs-TS Feature Audit

This is the complete cross-reference of IDA_INDEX.md (1048 entries, 100% `[x]`) against the 179 TS source files in `src/`. Every OG class with zero TS implementation is listed. See TODO_AUDIT.md Pass 151 for the raw data.

### ✅ Recently Shipped (Pass 149-183)
- **Physics parity — wall/landing gate + landing velocity + bound timing** (verified vs IDB `physics_audit2`):
  - `CollisionDetectFloat` (0x994740) gate: walkable/landed branch uses `m_uvx > 0.0` (right-facing). Left-facing or vertical footholds (`uvx <= 0`) are walls — velocity projected onto tangent, never grounded. Replaced the wrong `IsWall` (`X1 == X2`) discriminator so left-facing sloped ledges now block instead of landing.
  - Landing velocity OG parity: on landing, project the approach velocity onto the foothold tangent (`m_rp.v = uvy*vy + uvx*vxa`), then HALVE it when moving with input, else zero (OG `CollisionDetectFloat` uvx>0 branch). Landed velocity = `uv * m_rp.v`. Previously kept full momentum and ignored the `vy` component.
  - Bound timing — `BoundPosMapRange` (0x990EA0) ported: the fall path now clamps the post-integration endpoint into the map MBR BEFORE the foothold sweep, zeroes the clamped velocity component, and computes the consumed fraction; the wall branch integrates the remaining sub-frame along the wall tangent (trapezoidal). Prevents landing on footholds beyond the map edge; remaining-time wall slide matches OG.
  - `CollisionDetectFloat` now returns the collision fraction `t` (0..1).
  - Tests: +3 in `tests/character/PlayerController.spec.ts` (left-facing ledge = wall, `t` fraction, bound-before-sweep). tsc clean, 159 files / 1,374 tests green.
- **Drag-to-drop item onto field + GameSender.DropItem** — `GameSender.DropItem` (v95 `CDraggableItem::OnDropped` = `UserChangeSlotPositionRequest` with nToSlotPos=0) added; GameStage's unclaimed-drag release now drops a real inventory item (positive slotPos) when released over the field (not over any visible panel via `_pointOverVisiblePanel`), keeping the worn-slot unequip fallback. Test in GameSender.spec.ts.
- **ItemEffectOverlay emitter double-fire fix** — `_updateEmitter` spawned two particles for a single interval-length tick because `emitTimerMs` is primed to `intervalMs` (emit-on-first-update) and `>=` counted the primed boundary twice. Changed to emit on strictly exceeding the interval; `tests/character/ItemEffectOverlay.spec.ts` now green (1073/1073 pass).
- **Ponytail social/effect restore slices** — TownPortalNotify status now survives SetField HUD rebuilds; expedition invite/apply requests use native confirm plus existing verified response senders; MobCatchEffect attempts the existing `Effect/Catch.img` one-shot at the mob position. ContiMove was intentionally not guessed because current opcode evidence maps 359-362 to boss timers (Pass 183).
- **CashItemResult mapped statuses + medal item IDs + NPC speak-key subset** — CashShopStage now renders decoded CashItemResult sub-actions as readable messages; `/medals` shows `viewMedalItem` IDs; the two real NPC `speak` entries now resolve `n0/n1` through `String.nx/Npc.img` per IDA `CNpcTemplate::GetChatMessageList` (Pass 182).
- **CUIMedalQuestInfo subset** — `/medals` opens a medal-only quest list built from `Quest.nx/QuestInfo.img` entries marked with `medalCategory` / `viewMedalItem`, reusing the existing QuestLog/QuestDetail path. Full OG medal-window polish remains deferred (Pass 180).
- **login.md audit + ID/PW length gate** — full sweep of the v95 login subsystem against login.md: all 22 opcodes, socket opcodes 16–23, crypto pipeline, migration, and login UI confirmed present. One gap fixed: `LoginStage.beginLogin` now enforces OG's ID≥4 / password≥5 minimums (CUITitle::SetRet) before connecting. Nexon Passport/Security (NXPM) intentionally N/A on the private server (see TODO_AUDIT.md "login.md full audit").
- **CLoginUtilDlg message codes** — CharSelectStage PIC (SPW) success/failure now render the real `Login.img/Notice/text/<code>` WZ notice images via SystemNoticeOverlay (39/40 registered/removed, 18/91/92/93 errors) matching OG `CLogin::OnEnableSPWResult`/`OnCheckSPWResult`, instead of ad-hoc English strings. CLoginGradeWnd confirmed an empty stub (see TODO_AUDIT.md "CLoginUtilDlg message codes").
- **Channel-migration entry fix** — SetField migrate branch read `dwFlag` long twice (once in `handleSetField`, again in `CharacterDataDecoder.Decode`), desyncing the whole CharacterStat/AvatarLook so `onSetField` never fired and the client hung at black screen after char select. Removed the redundant read (see TODO_AUDIT.md "Channel-migration entry fix").
- **CUISysOpt/OptionMenu** — full 17-control WZ-backed layout, combo dropdown, OK/Cancel buttons (Pass 149)
- **Mastery tracking from skill WZ** — `_computeMasteryFromSkills()` feeds `StatDerivedInputs.mastery` (Pass 150)
- **Mob skill telegraph** — `CMob::OnSpecialEffectBySkill` decompiled, plays skill `special` WZ animation at mob pos via `_fieldFx` (Pass 150)
- **Party leader `[L]` badge** in UserList party tab (Pass 153)
- **ClipboardHelper** — Copy button on selected friend/party entries (Pass 153)
- **onMobSkillDelay** — chat notice for mob skill charging (Pass 153)
- **Damage formula stale-claim corrected** — weapon stats already piped since 114th pass (✅ SHIPPED)
- **NPC idle-chat re-verified** — ✅ **TINY SUBSET SHIPPED (Pass 182).** Only 2/1838 NPCs have `speak`, but their `n0/n1` labels now resolve through `String.nx/Npc.img`; broad ambient speech remains data-absent.
- **Character/skill rendering fidelity** — attack pose send/visual alignment, decoded remote attack action playback, accessory/shield/cash-weapon rendering, skill hit splashes, facing-aware skill effects, projectile start/rotation (Pass 154)
- **Comprehensive OG-vs-TS audit** — all 1048 IDA_INDEX.md entries cross-referenced against 179 TS files; every unimplemented OG class catalogued (Pass 151)
- **Field subgame HUD foundation** — compact CField_* status HUD for confirmed fieldType names plus Monster Carnival/SnowBall/Wedding packet-driven state (Pass 156)
- **WorldMap map-transfer rows** — transfer-result map IDs are now clickable through the real panel input path and send `MapTransferRequest` (Pass 157)
- **Multi-hit damage-number stagger** — decoded multi-hit arrays now render with vertical separation instead of stacking every number at one Y (Pass 157)
- **Critical damage-number spread** — `DamageCrit` render path now uses OG-like +/-15px horizontal fan-out (Pass 157)
- **Maker recipe data** — `/maker` opens the existing Maker panel with a bounded list from `Etc.nx/ItemMake.img` (Pass 157)
- **CAdminShopDlg decoded-state panel** — AdminShopResult/AdminShopDlg packets now drive a real panel with verified reopen request wiring (Pass 158)
- **CUIMonsterCarnival decoded score panel** — Monster Carnival packets now drive a dedicated CP/status panel beside the compact field HUD (Pass 158)
- **CStoreBankDlg decoded action panel** — StoreBankResult/Action packets now drive a visible panel with verified get-all confirmation wiring (Pass 158)
- **CUICharacterSaleDlg decoded result panel** — CharacterSale check/create result packets now drive a visible panel with verified name-check wiring (Pass 158)
- **CWeddingWishListDlg decoded wishlist panel** — WeddingGiftResult packets now drive a visible panel with verified get-item wiring (Pass 158)
- **CUIFindFriend decoded result panel** — FindFriend packets now drive a visible panel with verified My Info/Search request wiring (Pass 158)
- **CUIShopScanner decoded result panel** — ShopScannerResult packets now drive a visible item/price result panel (Pass 158)
- **CUIIncubator decoded result panel** — IncubatorResult packets now drive a visible item/stat result panel (Pass 158)
- **CRPSGameDlg decoded state panel** — RPSGameDlg packets now drive a visible sub-action state panel (Pass 158)
- **CUILogoutGift trigger panel** — LogoutGift trigger packets now open a visible display-only panel (Pass 158)
- **CUIQuestDelivery decoded disallowed-quest state** — DisallowedDeliveryQuestList packets now update the existing Delivery panel (Pass 158)
- **CParcelDlg decoded state panel** — ParcelDlg packets now drive a visible sub-action state panel (Pass 158)
- **CUIClaim decoded status panel wiring** — Claim result/service packets now update the existing Claim panel (Pass 158)
- **TradingRoom decoded money-limit state** — TradeMoneyLimit packets now update the existing TradingRoom panel (Pass 158)
- **PersonalShop decoded status line** — DestroyShopResult/ShopLinkResult packets now update the existing PersonalShop panel (Pass 158)
- **WildHunterInfo decoded display panel** — WildHunterInfo packets now show packed/captured-mob state in a visible panel (Pass 158)
- **IDA_NEW_GAPS opcode coverage** — all concrete listed opcode gaps are confirmed ported and now pinned by opcode + handler regression tests (Pass 159)
- **Chat item links clickable** — `ChatBar` now preserves `#i/#v/#e` item hit ranges and opens an item notice from group/whisper chat clicks (Pass 160)
- **Mob damage-number head anchor** — mob damage numbers now use current WZ frame top/center instead of universal `y - 60` (Pass 161)
- **PartySearch/GuildBBS stale gaps corrected** — PartySearch UI coverage added; GuildBBS/PartySearch confirmed already wired (Pass 162)
- **SkillPrepare/CDamageMeter stale gaps corrected** — remote charge-skill hold visuals and BattleRecord damage aggregation confirmed covered (Pass 163)
- **SetField CharacterData avatar derivation** — migrate `SetField` now consumes `CClientOptMan::DecodeOpt`, decodes full `CharacterData`, and derives `AvatarLook` from stat/equipped/cash-equipped slots so local hair/face/clothes/weapons render from real entry data (Pass 164)
- **Live AvatarLook stat/equip sync** — local face/hair/skin stat changes and regular/cash equip operations now mutate the rendered player `AvatarLook`, including cash weapon `weaponStickerId` (Pass 164 follow-up)
- **Remote late-avatar update fix** — `OtherCharLook.UpdateAvatar` now creates/loads its inner `CharLook` when a no-look placeholder later receives `UserAvatarModified` look data (Pass 164 follow-up)
- **OG audit full opcode parity** — all 37 previously-MISSING opcodes now have `OutHeader` entries + stub registrations; 0 MISSING remain. Fixes span `OpCodes.ts`, `FieldHandlers.ts`, `TournamentHandlers.ts`, `LoginHandlers.ts`. 5 log-only `GameStage` callbacks replaced with confirmed-blocked no-op stubs. 2 `CashShopHandlers` skip() sites annotated with OG decompile citations (Pass 156)
- **Handler gap sweep** — Whisper cases 9/72 decode fixed (missing byte+int after name was corrupting packet stream); ItemProtectExpire/ItemExpireReplace wired to statusMessenger; FriendResult UpdateFriend and GuildResult OnlineStatus drive incremental UserList updates; GuildResult NoticeChange (case 71) added; stale console.log noise removed (Pass 166)
- **CUIEventAlarm implemented + SetField nNotifierCheck decode fix** — SetField `mapType` misread corrected to `nNotifierCheck`; event-alarm notifier strings now decoded (fixes stream-alignment bug for event fields); `EventAlarm.ts` new panel shows timed popup on field entry when server sends alarm data (Pass 168)
- **Mob stat decode fixes** — `CMob::OnStatSet/Reset` UINT128 flag now reads two longs (`statMask` + `statMaskHigh`); `OnSuspendReset` now reads `isSuspended` byte; `OnAffected` now reads `duration` short; all four packet-alignment bugs confirmed against OG decompile (Pass 169)
- **Guild incremental update callbacks** — GuildResult MemberJoin (case 41) and Leave/Expel (case 46/49) wired to `UserList.addGuildMember`/`removeGuildMember`; guild panel now updates live without full reload on join/leave events (Pass 167)
- **HP/MP warning flash** — IDA-confirmed CConfig default `10` (50% threshold) now drives the existing HP/MP flash option sliders; StatusBar flashes on HP/MP decreases below threshold (Pass 170)
- **Dynamic skill-effect facing** — world-anchored skill effects now mirror from live caster facing during draw, not only spawn-time facing (Pass 171)
- **Ariant Arena raw HUD + ChainLightning visual subset** — opcode 354 now surfaces raw Ariant result payloads in the subgame HUD; remote Chain Lightning skill 2221006 draws straight segmented links through hit mobs (Pass 172)
- **OpenSkillGuide display panel** — opcode 262 now opens a compact Skill Guide panel instead of being silently ignored; detailed payload/UI remains deferred until decoded (Pass 173)
- **Projectile fade-out subset** — remote shoot/magic projectile visuals can fade over their travel lifetime, covering the portable `CFadeoutBullet` rendering behavior without CVecProcess paths (Pass 174)
- **CField_LimitedView overlay** — fieldType 9 maps now draw a persistent black overlay with circular view cutouts around local/remote users (Pass 175)
- **CSequencedKeyMan Double/Triple Stab subset** — the verified combo-key implementation is now wired into local attack-key gameplay and skill dispatch; full per-job finisher table remains deferred (Pass 176)
- **CItemEffectManager active effect item subset** — decoded remote active effect items now loop `ItemEff.img/<itemId>/0` until cleared by itemId 0 (Pass 177)
- **CUserRemote wire-shape correction** — all 10 CUserPool remote-packet handlers (216–230) decompiled against OG; 5 field-shape bugs fixed (`OnMovingShootAttackPrepare` had wrong fields, `OnHit` byte/int misalignment, `OnShowUpgradeTombEffect` byte→three ints, `OnReceiveHP` one→two ints, `OnThrowGrenade` one→five ints, `OnGuildMarkChanged` extra guildId) — all would cause packet-stream desync (Pass 179)

### Small (<200 lines, independently wirable)
- **Chat item links** — ✅ **SHIPPED (Pass 160).** `#i/#v/#e` item tags are clickable in `ChatBar`; richer OG spans/icons/skill links remain out of scope.
- **Mob head-anchor for damage numbers** — ✅ **SHIPPED (Pass 161).** `MobLook.HeadPosition` derives current WZ frame top/center; unloaded mobs keep the old fallback.
- **HP/MP warning flash** — ✅ **SHIPPED (Pass 170).** `StatusBar` uses persisted OG HP/MP flash settings and pulses the gauge for 500ms when HP/MP decreases below `5 * setting` percent.
- **Skill flip on caster facing change** — ✅ **SHIPPED (Pass 171).** Skill effects mirror from live caster facing during draw, so turning mid-effect updates orientation.
- **EmotionBubble.ts** — ✅ **REMOVED (Pass 181).** Dead, zero-import broken renderer; face emotions are already handled by CharLook/CharacterRenderer.
- **DeleteConfirmOverlay** — PIC confirm overlay, unused (`window.confirm()` workaround in place)

### Medium (200-800 lines, needs a new file or moderate wiring)
- **CashItemResult 58-way sub-action** — ✅ **PARTIALLY SHIPPED (Pass 182).** Typed decoder already existed; CashShopStage now maps known sub-actions to readable status messages. Full CashShop stage still limited by no `CashShop.nx` package.
- **Skill guide window** (`CWndSkillGuide`) — ✅ **PARTIALLY SHIPPED (Pass 173).** Opcode 262 now opens a compact display panel; detailed guide payload/content is still unconfirmed.
- **Party search UI** (`CUIPartySearch`) — ✅ **SHIPPED/STABLE (Pass 162).** `PartySearchDialog` opens via `/partysearch`/`/lfg`, sends verified PartyAdver requests, and has UI tests.
- **GuildBBS panel** — ✅ **SHIPPED/STABLE (Pass 162).** `GuildBBS` panel and BBS protocol send/decode tests already exist; stale gap corrected.
- **CAnimationDisplayer 9 backlog categories** — ✅ **PARTIALLY REDUCED (Pass 172/174).** ChainLightning has a narrow remote-skill visual subset and projectile fade-out covers the portable fade bullet behavior; HookingChain, MotionBlur, FireCracker, NewYear, Teslacoil, UserState, AbsorbItem remain missing.
- **Restore* family** — 12+ functions for field re-entry state (RestoreSeat, RestoreTownPortal, RestoreClock, etc.)
- **SkillPrepare/SkillCancel visual** — ✅ **SHIPPED/STABLE (Pass 163).** Remote charge-skill `keyDown` hold animation is wired through `SkillEffectOverlay.PlayHoldAtCaster()`/`CancelHold()`.
- **CField_Dojang, CField_Wedding, CField_Battlefield, CField_MonsterCarnival, CField_SnowBall, CField_AriantArena, CField_Coconut, CField_ContiMove/LimitedView** — ✅ **PARTIALLY SHIPPED (Pass 156/175).** `FieldSubgameHud` now displays confirmed fieldType names and live Monster Carnival/SnowBall/Wedding packet state; fieldType 9 LimitedView maps draw the persistent viewrange overlay. Full per-field logic/panels remain missing.
- **CFinishAttack/CSequencedKeyMan** — ✅ **PARTIALLY SHIPPED (Pass 176).** Double/Triple Stab tap-window detection is wired into local attack-key gameplay; the large `CSequencedKeyMan::Restore` per-job finisher table and specialized finishers remain missing.
- **CDamageMeter** — ✅ **PARTIALLY COVERED (Pass 163).** `BattleRecord.ts` implements the battle-record DPS/damage aggregation path; distinct OG damage-board/meter polish remains out of scope.
- **CParticleEffect / CItemEffectManager** — ✅ **PARTIALLY SHIPPED (Pass 177).** Remote active effect item state now loops the decoded `ItemEff.img/<itemId>/0` caster effect until cleared; full particle emitter/category behavior remains missing.
- **Omok / MemoryGame** — board game logic deliberately skipped (room create/join/leave wired; 15x15 Omok grid + memory-match = standalone large features)
- **CUtilDlgEx** (64) — generic utility dialog shell; many confirm/prompt dialogs route through this in OG
- **CWebWnd** (60) — embedded web browser window (used for events, promotions)
- **ADAD** (56) — unknown system, large method count
- **CCtrlComboBox** (35) — combo box widget
- **CCtrlWnd** (34) — control window base class
- **CCtrlScrollBar** (28) — scroll bar widget
- **CCtrlSlider** (19) — slider widget
- **CCtrlEditEx** (13) — edit control extended

### Large (new subsystem, >800 lines)
- **CCSWnd_Char** (48) + **CCSWnd_Inventory** (21) + **CCSWnd_Locker** (17) + **CCSWnd_Tab** (13) + **CCSWnd_Best** (9) + **CCSWnd_Status** (9) — Cash shop UI panels (~117 methods combined, zero TS). Also blocked: no `CashShop.nx` in wz_client/
- **CITCWnd_* family** — InterTempest trading system (~80 methods combined). Entire ITC subsystem has zero TS
- **ConsumeCashItemUseRequest dispatcher** — ~150KB switch dispatch; only megaphone path wired
- **CashShop avatar preview** — no preview for try-on cash items; blocked (no `CashShop.nx` in wz_client/)
- **CUIMonsterCarnival** (37) — Monster Carnival full dialog
- **CRPSGameDlg** (22) — Rock Paper Scissors
- **CMemoryGameDlg** (47) — Memory game
- **COmokDlg** (44) — Omok game
- **CCashTradingRoomDlg** (33) — Cash trading room
- **CUIFadeYesNo** (33) — Fade confirmation dialog
- **CTabGuildAlliance** (42) — Guild alliance tab
- **TabExpedition** (37) — Expedition tab
- **CTabFriend** (32) — Friend tab
- **CDraggableItem** drag-to-drop system — ~150KB generic dispatcher in OG; `GameSender.DropItem` doesn't exist in TS
- **Drag-to-drop items on field** — `GameSender.DropItem` doesn't exist. OG uses `CDraggableItem`'s ~150KB generic dispatcher
- **CField_Dojang** (Mu Lung Dojo) — 486 maps with `fieldType=14`. Floor progression, special-arts restriction, monster waves
- **CField_Wedding** — ceremony-specific opcodes (OnWeddingCeremonyEnd, OnWeddingProgress, SetBlessEffect) — zero src/ presence
- **CField_Battlefield** (PvP) — scoreboard/clock widget; GameSender has PvP senders but no display panel
- **BasicStat** (24) — basic stat computation from level/job
- **Additional** (35) — additional stat data
- **CUIMedalQuestInfo** — ✅ **PARTIALLY SHIPPED (Pass 180/182).** Medal-marked quests now open via `/medals` and show `viewMedalItem` IDs; full medal-specific layout/state polish remains missing.

### Blocked (with blocking reason)
- **NPC idle-chat** — ✅ **TINY SUBSET SHIPPED (Pass 182).** Only 2/1838 NPCs have `speak`; those two now resolve String/Npc labels. Broad ambient speech is still absent from data.
- **CAnimationDisplayer backlog / CParticleEffect** — ✅ **IDA-INVESTIGATED/PARTIAL (Pass 181).** Tremble is covered by `GameCamera.Shake`, projectile fade covers the small fade slice, full user-state/particle follow emitter behavior remains open.

### Orphaned / Dead Files (zero importers)
| File | Status |
|------|--------|
| `debug/DebugLauncher.ts` | Dev tooling — keep |
| `debug/DebugWindow.ts` | Dev tooling — keep |
| `map/FieldCrc.ts` | CRC computed correctly, zero callers. Anti-cheat handshake — won't build sender |
| `ui/login/DeleteConfirmOverlay.ts` | PIC confirm overlay, unused |


## Build

```
tsc --noEmit   → PASS (0 errors)
vitest run     → 141 files, 1066 tests, 0 failures
```

## Recent passes

- **Pass 178** — Pet opcode (198-205) wire-shape correction: re-decompiled `CUser::OnPetPacket` against the real v95 IDB and found the existing `PetAction`/`PetAttack`/etc. decode shapes were fabricated, not decompiled (wrong field names/order vs. any real `CPet::On*` body). Replaced with verified shapes (`PetActivated`/`PetEvol`/`PetActivatedSilent`/`PetMove`/`PetAction`/`PetNameChange`/`PetLoadExceptionList`/`PetActionCommand`) across `OpCodes.ts`/`PacketArgs.ts`/`FieldHandlers.ts`; `GameStage.ts` pets now keyed by real `petIdx` slot (0..2) instead of a single-pet-per-owner guess. `CPetTemplate` WZ interaction/food-reaction flavor text remains unported (documented). (TODO_AUDIT.md Hundred-and-seventy-eighth pass)

- **Pass 163** — SkillPrepare/CDamageMeter stale medium-gap correction: confirmed remote skill prepare/cancel visuals are already wired through `SkillEffectOverlay` and confirmed BattleRecord damage aggregation/tests cover the damage-meter path. Corrected `STATUS.md` and `IDA_NEW_GAPS.md`; no code changes. (TODO_AUDIT.md Hundred-and-fifty-eighth pass)

- **Pass 162** — PartySearch/GuildBBS stale medium-gap correction: confirmed `GuildBBS` panel + protocol tests already exist, confirmed `PartySearchDialog` is wired through `/partysearch`/`/lfg` and PartyAdver callbacks, added `PartySearchDialog` UI tests, and marked both `STATUS.md` entries shipped/stable. (TODO_AUDIT.md Hundred-and-fifty-seventh pass)

- **Pass 161** — Mob damage-number head anchor: added `MobLook.HeadPosition` from current WZ frame bounds/origin with fallback for unloaded mobs, and routed local/remote mob damage numbers through it instead of fixed `y - 60`. Added `MobLook` anchor tests and updated `IDA_NEW_GAPS.md` follow-up status. (TODO_AUDIT.md Hundred-and-fifty-sixth pass)

- **Pass 160** — Chat item links clickable: added minimal `ChatBar.addMapleLine()` item-tag parsing for `#i/#v/#e`, stored hit ranges, wired `onItemLink` to a simple item notice, and routed group/whisper lines through it while preserving existing status text substitution. Added duplicate-link regression tests. (TODO_AUDIT.md Hundred-and-fifty-fifth pass)

- **Pass 159** — IDA_NEW_GAPS.md coverage pass: confirmed the listed wire gaps were already implemented in `OpCodes.ts`, `FieldHandlers.ts`, and `PacketArgs.ts`; added opcode assertions for the full list and representative handler decode tests for CWvsContext, CUserPool, pet/dragon, mob, and NPC gap groups. Marked `IDA_NEW_GAPS.md` as resolved wire coverage with only deeper UI/effect work remaining. (TODO_AUDIT.md Hundred-and-fifty-fourth pass)

- **Pass 158** — CAdminShopDlg decoded-state panel, CUIMonsterCarnival score/status panel, CStoreBankDlg decoded action panel, CUICharacterSaleDlg decoded result panel, CWeddingWishListDlg decoded wishlist panel, CUIFindFriend decoded result panel, CUIShopScanner decoded result panel, CUIIncubator decoded result panel, CRPSGameDlg decoded state panel, CUILogoutGift trigger panel, CUIQuestDelivery decoded disallowed-quest state, CParcelDlg decoded state panel, CUIClaim decoded status panel wiring, TradingRoom decoded money-limit state, PersonalShop decoded status line, and WildHunterInfo decoded display panel: added `AdminShop`, wired `AdminShopResult`/`AdminShopDlg` into visible NPC/item/action/reopen state, and connected the panel Reopen button to verified `GameSender.AdminShopReopen`; added `MonsterCarnival` panel fed by decoded CP/result/death/member packets; added `StoreBank` panel fed by decoded result/action packets with verified get-all confirm; added `CharacterSale` panel fed by decoded check/create results with verified name-check sender; added `WeddingWishList` panel fed by decoded wedding gift packets with verified get-item sender; added `FindFriend` panel fed by decoded result bytes with verified My Info/Search senders; added `ShopScanner` panel fed by decoded item/price results; added `Incubator` panel fed by decoded item/stat result fields; added `RPSGame` panel fed by decoded sub-action; added `LogoutGift` display-only panel for the zero-payload trigger; added Delivery panel state for decoded disallowed-quest fields; added `Parcel` panel fed by decoded sub-action; wired decoded Claim result/service packets into the existing Claim panel; wired decoded TradeMoneyLimit state into TradingRoom; wired decoded DestroyShop/ShopLink status into PersonalShop; added `WildHunterInfo` display panel for packed/captured-mob state. Full admin item grid, Monster Carnival request buttons, StoreBank item grid, Character Sale create form, wishlist put-item UI, typed Find Friend search, Shop Scanner controls, Incubator controls, RPS play controls, Logout Gift actions, Delivery quest-name resolution, Parcel item/mail controls, the full Claim submit form, trade-limit text mapping, extra shop controls, and WildHunter packed-bit naming remain deferred because their wire shapes/senders or UI state are not verified. (TODO_AUDIT.md Hundred-and-fifty-third pass)
- **Pass 157** — WorldMap map-transfer row click-through plus damage-number and Maker polish: `OpenMapTransfer(mapIds)` rows now hit-test through `handleMouseButton`, closing the panel and invoking the existing `GameStage` `MapTransferRequest(0, true, mapId)` sender; decoded multi-hit arrays now pass a hit index to `DamageNumber.Add()` so numbers do not stack at the same Y; `DamageCrit` now uses the OG-like +/-15px horizontal spread; `/maker` opens the existing Maker panel with a bounded list from `Etc.nx/ItemMake.img`. Added `WorldMap`, `DamageNumber`, and `Maker` regression tests. (TODO_AUDIT.md Hundred-and-fifty-second pass)
- **Pass 156** — CField_* subgame HUD foundation: added `FieldSubgameHud`, wired field load `fieldType` display, Monster Carnival CP/result packets, SnowBall state/hit/msg/touch packets, and Wedding notifications into a persistent compact HUD. Added `FieldSubgameHud` tests. (TODO_AUDIT.md Hundred-and-fiftieth pass)
- **Pass 155** — Comprehensive OG-vs-TS audit: all 1048 IDA_INDEX.md entries cross-referenced against 179 TS source files. Every OG class with zero TS implementation catalogued. Known Gaps rewritten with complete coverage. No new code shipped. (TODO_AUDIT.md Hundred-and-fifty-first pass)
- **Pass 154** — Character/skill rendering audit implementation: aligned local attack send+visual action, remote attack decoded action playback, knuckle attack type 8 fix, accessory/shield/cash-weapon/weapon-sticker rendering, skill hit splashes, facing-aware skill effects, projectile decoded `ballStart` + travel rotation, and `AttackAction` regression tests. `tsc --noEmit` clean, vitest 114 files / 1010 tests pass. (TODO_AUDIT.md Hundred-and-forty-ninth pass)
- **Pass 153** — Mastery tracking, mob skill telegraph, stale-claim cleanup, party crown, ClipboardHelper wiring, onMobSkillDelay notice. Mastery: `_masteryFromSkills` + `_computeMasteryFromSkills()` reads `level/{n}/mastery` from skill WZ. Mob skill telegraph: IDA decompiled `CMob::OnSpecialEffectBySkill` (0x6540B0) → plays skill's `special` WZ animation at mob world pos via `_fieldFx`. Party leader `[L]` badge in UserList party tab. Copy button on selected friend/party entries via ClipboardHelper. onMobSkillDelay shows `[Mob {id}] Skill {skillId} charging` in chat. Stale-claim cleanup: damage formula confirmed piped since 114th pass (✅ SHIPPED); NPC idle-chat re-verified (only 2/1838 NPCs, quest dialogue refs). `MeleeDamage` class removed. `tsc --noEmit` clean, vitest 113 files / 1008 tests pass. (TODO_AUDIT.md Hundred-and-fiftieth pass)
- **Pass 152** — CUISysOpt/OptionMenu. IDA decompiled `CUISysOpt::OnCreate` (0x978010) — full 17-control layout via `loadWz()` + WzProperty. WZ buttons `IWindow2.img/SysOpt/BtOK`/`BtCancle` with Graphics fallback. Combo dropdown click-open/outside-close. Stale `_initLabels()` removed. `WzProperty` import added to GameStage.ts. `tsc --noEmit` clean. (TODO_AUDIT.md Hundred-and-forty-ninth pass)
- **Pass 151** — Additional decoded-placeholder UI polish: pet speak/interact/charged/exclusive packets render pet speech bubbles; pet attack triggers pet action; map-transfer result lists decoded map IDs in the existing WorldMap shell; remote HP/hit-by-user produce floating numbers; follow/Tesla/phase/PQ reward use badges/notices; incubator and shop-scanner results show decoded details in notices. `tsc --noEmit` clean. (TODO_AUDIT.md Hundred-and-forty-eighth pass)
- **Pass 148** — Decoded packet placeholder cleanup: remote user temp-stat/active-item/upgrade/tomb/hit packets now drive badges, hit action/flash, floating damage, and ItemEff playback; mob stat/affected/item packets drive mob badges; UserADBoard renders above characters; pet packets drive visible pet action/name/near-owner movement; dragon packets create a visible placeholder entity; memo/map-transfer/New-Year/stage callbacks now surface decoded sub-actions more accurately. (TODO_AUDIT.md Hundred-and-forty-sixth pass)
- **Pass 148** — Remaining decoded-placeholder follow-up: pet/dragon move handlers now carry `DecodedMovePath` and replay endpoint movement; dragon attempts WZ-backed `TamingMobLook(1932000)` before placeholder fallback; remote user/mob stat masks show named semantic summaries; MemoResult list opens the existing `Memo` panel. `tsc --noEmit` clean, 113 files / 1008 tests passing. (TODO_AUDIT.md Hundred-and-forty-seventh pass)
- **Pass 146** — OnFieldEffect subTypes 0-7 (IDA 0x53B790), Effect_RewardRullet (IDA 0x458820), couple-chair heart overlay, field FX system, StringPool encryption reverse-engineered (10 IDs decoded). IDA confirmed FieldCrc.ts is dead in OG too (`CWvsPhysicalSpace2D::m_dwCRC` never read; `CField::GetCrc` zero xrefs). Confirmed 3 stale STATUS.md polish items already done. `tsc --noEmit` clean, 113 files / 1008 tests passing. (TODO_AUDIT.md Hundred-and-forty-fifth pass)
- **Pass 145** — Ponytail-ultra gap triage: all 8 STATUS.md Known Gaps investigated via IDA + WZ data. CItemSpeakerDlg fully decompiled (16 methods, wire shape opcode 85). SetItem WZ data confirmed (`Etc.nx/SetItemInfo.img` → `Effect/SetItemInfoEff.img`). Couple-chair overlay absent from v95 WZ. Result: 0 new code changes — 2 gaps YAGNI (CItemSpeakerDlg panel, SetItem tier text), 6 gaps remain blocked/deferred as documented. (TODO_AUDIT.md Hundred-and-forty-fourth pass)
- **Pass 144** — Bullet sprite fallback from bullet item WZ data. Reading code (+ OG references from 142nd pass) showed `_onUserAttack` already loads skill's `ball` node frames via `GetCastInfo(skillId).Ball` + `loadFrameSequence` — but never tried the bullet item's own canvases (OG `NormalBullet::PrepareBulletLayer` tier 1: `Item.wz/Consume/<itemID>/info` children). Added `bulletItemId > 0` fallback that loads `Item.wz/Consume/<group>.img/<itemId>/info` and passes it through the same `loadFrameSequence` with 60ms default delay. Dot placeholder becomes third-tier fallback. `tsc --noEmit` clean, 1008 tests pass. (TODO_AUDIT.md Hundred-and-forty-fourth pass)
- **Pass 143** — Portable chair opcode 222 + couple-chair proximity pairing + combo counter tracking. IDA: `CUserPool::OnUserRemotePacket` full dispatch table (210-233, 0x94B390). Opcode 222 = `OnSetActivePortableChair`: Decode4 → `m_nPortableChairID` → `CAvatar::SetChairHeight` (item-to-Y-offset map: 3010125→1, 3010117/3010118/3010075→5, 3010177→6). TS: handler wired in FieldHandlers, `PortableChairItemId`/`ChairHeight` on OtherCharLook/CharLook. Per-frame couple-chair proximity pairing in GameStage — groups unpaired chars by 3012xxx itemId, pairs within ~100px. Combo counter tracked from TemporaryStatSet (1111003/4/5) → indexed variant fallback in `_onUserEffect`. `PlayIndexedVariant` added. Overlay rendering deferred (cosmetic). (TODO_AUDIT.md Hundred-and-forty-third pass)
- **Pass 142** — TryDoingShootAttack bullet path decompile (3642 insns), dialog type mapping, couple-chair correction. IDA: Bullet path = skill's `ball` UOL (`SKILLENTRY::GetBallUOL`), NOT Effect.nx/Bullet.img. `get_consume_cash_item_type` (0x49C700) = whitelist passthrough of `get_cashslot_item_type`. Dialog types = `get_cashslot_item_type` return values directly (28 types mapped in `SendConsumeCashItemUseRequest` switch). Couple-chair pairing IS client-side in `CUserPool::Update` — position-based proximity, NOT server-driven (corrects 141st pass). (TODO_AUDIT.md Hundred-and-forty-second pass)
- **Pass 141** — STATUS.md gap sweep cont'd (CItemSpeakerDlg open-trigger, couple-chair sync, Crusader Combo Attack). IDA: CItemSpeakerDlg opens via cash items 5076xxx → type 14 in get_cashslot_item_type. Couple-chair system fully mapped: item 3012xxx → OnCoupleChairRecordAdd/Remove + SetCoupleChairEffect; CORRECTED in 142nd pass — pairing is client-side position-based, not server-driven. Combo Attack: SecondaryStat::nComboCounter (0x6EE620) gates DoActiveSkill_MeleeAttack (combo > 1) and drives Effect_SkillUse's indexed-variant loop (format 986). (TODO_AUDIT.md Hundred-and-forty-first pass)
- **Pass 140** — STATUS.md gap sweep (MapleTV opcode 113, EmotionEffect.img, Bullet sprites, KeyConfig drop target). IDA: MapleTV 113 handled by CWvsContext::OnMapleTVUseRes (not stale, correct decode). EmotionBubble.loads from wrong WZ path (Effect vs Etc) with wrong name mapping — face emotions already work via CharLook. Bullet sprites: confirmed Effect.nx has no Bullet.img; CORRECTED in 142nd pass — real path is skill `ball` UOL via SKILLENTRY::GetBallUOL. KeyConfig drop target already fixed in 115th pass — stale entry removed from Known Gaps. (TODO_AUDIT.md Hundred-and-fortieth pass)
- **Pass 139** — Claim opcodes 44/45/46: IDA decompiled all three CWvsContext handlers, confirmed decodes correct. Wired all three callbacks in GameStage.ts (were completely unwired — zero callbacks assigned). Resolved STATUS.md "still-open TODO" for Claim opcodes. (TODO_AUDIT.md Hundred-and-thirty-ninth pass)
- **Pass 138** — Group chat wiring: `/b`/`/g`/`/a` chat commands now send proper `GroupChat` (150) with client-resolved online-member-id lists instead of plain `UserChat`. Added `UserList.guildMemberIds`/`allianceMemberIds`/`onlineFriendIds` getters. Known Gaps section added to STATUS.md consolidating all deferred/blocked/missing features. (TODO_AUDIT.md Hundred-and-thirty-eighth pass)
- **Pass 137** — Codebase survey (10 features checked: mob death speech, alliance handlers, chat tags, pet consume, macro mute, NPC idle-chat, PetWear slots, Vega remaining): 4 already implemented, 1 blocked (NPC idle-chat — WZ data absent), 3 shipped this pass (macro mute, PetWear display slots, Vega in 136th). Macro mute flag consumption (muted macros skip dispatch), PetWear 3 bodyPart 52-54 slots in EquipInventory with Cash-tab inventory op wiring and drag-end fallback. (TODO_AUDIT.md Hundred-and-thirty-seventh pass)
- **Pass 136** — Vega spell enhancement remaining features: scroll list validation, cash-item right-click trigger (item ID range 5451000-5451999), sound effects from Sound.nx (VegaSuccess/Fail/Twinkling), effect animations (Spelling 5-frame loop during gauge, Twinkling 15-frame for 2500ms on success), arrow/gauge path bugfix in WZ lookups. (TODO_AUDIT.md Hundred-and-thirty-sixth pass)
- **Pass 135** — ViciousHammer effect animations + WZ-backed gauge + returnResult bugfix: ItemScrollDialog fully re-implemented with WZ-backed gauge bar tiling, EffectE (14-frame failure animation) and EffectP (3-frame success animation) frame cycling, fixed `_returnResult` success check (was always false because `resultByte` was never stored). (TODO_AUDIT.md Hundred-and-thirty-fifth pass)
- **Pass 134** — Equipment Scroll/Upgrade UI (CUIItemUpgrade): full ItemScrollDialog with DragTarget, gauge bar animation, result display. Scrolls (categories 204/205) double-clicked in Use tab open the dialog instead of sending UseItem. (TODO_AUDIT.md Hundred-and-thirty-fourth pass)
- **Pass 133** — Pet tooltip: items with pet stats (level, tameness, hunger, remaining life) now show them in the hover tooltip. Pet fields plumbed through InventoryOpArg → InvItem → ItemTooltip.Draw. (TODO_AUDIT.md Hundred-and-thirty-third pass)
- **Pass 132** — Pet system Pass 127 deferred items: pet equip via Cash tab double-click (onActivateCashItem → ChangeSlotPosition), pet stats stored in InventoryItem (level, tameness, repleteness, remainLife no longer discarded), CharLook.AvatarLook accessor. (TODO_AUDIT.md Hundred-and-thirty-second pass)
- **Pass 131** — Pet system Pass 126 deferred items: auto-consume/loot handler wiring (`onCashPetFoodResult`, `onPetConsumeItemInit`, `onPetConsumeMPItemInit`) + pet name tag rendering. (TODO_AUDIT.md Hundred-and-thirty-first pass)
- **Pass 130** — Pet system first sub-pass: `PetLook.ts` (pet sprite loader/renderer from `Character.wz/Pet/<id>.img`), `Pet.ts` (follow AI), GameStage pet spawn/update/render wiring. (TODO_AUDIT.md Hundred-and-thirtieth pass)
- **Pass 129** — SetFamilyPrecept UI trigger: `[Precept]` button in FamilyWindow wired to `GameSender.SetFamilyPrecept`. (TODO_AUDIT.md Hundred-and-twenty-ninth pass)
- **Pass 128** — CUIPartyHP party HP bar overlay; `PartyMember` extended with hp/maxHp; `_emitPartyData` extracts hp[]/maxHp[] from PARTYDATA bytes 322–369; new `PartyHPBar.ts`. (TODO_AUDIT.md Hundred-and-twenty-eighth pass)
- **Pass 127** — Alliance sub-types 15/18/23/26/27 implemented; `_decodeAllianceHeader` helper extracted; FullLoad refactored to use it; CUIScreenMsg confirmed covered by StatusMessenger; CUIEventAlarm marked cosmetic/WZ-blocked. (TODO_AUDIT.md Hundred-and-twenty-seventh pass)

## Phase Coverage (from root docs/roadmap.md)

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Pre-game flow (title → login → char select → migrate) | **SHIPPED** |
| 2 | Field load & avatar render (SetField, Map.wz, CharLook) | **SHIPPED** |
| 3 | Movement & camera (UserMove, PlayerController, GameCamera) | **SHIPPED** |
| 3.5 | In-game cosmetic UI (all 36 panels) | **SHIPPED** |
| 4 | Mobs & combat (MobLook, damage, melee) | **SHIPPED** |
| 5 | NPCs & dialog (NpcLook, NpcTalk, ScriptMessage) | **SHIPPED** |
| 6 | Inventory & items (ItemDecoder, Inv ops, Equip/Item panels) | **SHIPPED** |
| 7 | Skills, jobs, buffs (SkillBook, BuffList, SP-up) | **SHIPPED** |
| 8 | Social (party, buddy, guild, whisper, chat commands) | **SHIPPED** |
| 9 | Loot (drop pickup, EXP/meso popups, StatChanged) | **SHIPPED** |
| 10 | Polish (settings, audio, portals, channel/cash transfer) | **SHIPPED** |
| 11 | StringPool language pack | **SHIPPED** |
| 12 | Display names from String.wz | **SHIPPED** |
| 13 | Map rendering completeness (tile layers, animation, parallax) | Ported (needs browser test) |
| 14 | Character/avatar fidelity (zmap, stance machine, cash) | Ported (needs browser test) |
| 15 | Skills & buffs depth (Skill.wz icons, cooldowns, TempStatSet) | Ported (needs browser test) |
| 16 | Keybinds & quickslots (drag-to-bind, KeyAction types) | Ported (needs browser test) |
| 17 | In-game presentation (resolution, HUD anchors) | Ported (needs browser test) |
| 18 | Login polish (delete flow, buttons) | Ported (needs browser test) |
| 19 | NPC shops & storage (Shop, Trunk panels) | Ported (needs browser test) |
| 20 | Quests (QuestLog, protocol) | Ported (needs browser test) |
| 21 | Guild, messenger & combat depth | Ported (needs browser test) |
| 22 | UI-origin tooling + login screens | Ported (needs browser test) |
| 23 | In-game HUD authenticity (StatusBar, MiniMap, KeyConfig) | Ported (needs browser test) |
| 24 | Authentic in-game windows (UIWindowFrame + all dialogs) | Ported (needs browser test) |
| 25 | Family system | Ported (needs browser test) |
| 26 | Notes, rankings & collections | Ported (needs browser test) |
| 27 | Player trading & shops | Ported (needs browser test) |
| 28 | Maker, macros & item-utility dialogs | Ported (needs browser test) |
| 29 | Map info metadata (full parse: swim/fly/cloud/fieldLimit) | Ported (needs browser test) |
| 30 | Portal rendering (animated sprites from MapHelper.img) | Ported (needs browser test) |

## Key Wiring Completed

- `NameService` instantiated in `MapleClaudeGame` — loads String.wz on demand
- Name resolution callbacks wired into `NpcTalk` (`_stripFormats` resolves `#p`, `#h`, `#t`, `#o`, `#m`, `#q` tokens)
- `ScriptText` class supports all name substitution types via `ScriptSubst` hooks
- `GameStage._wireNames()` bridges NameService → NpcTalk name resolvers

## Key Fixes (this session)

- **`CTabGuildAlliance` action buttons + incoming sub-types** (Hundred-and-twenty-sixth pass):
  `InHeader.AllianceRequest = 167` confirmed via IDA decompile of all 6 action senders.
  Added `GameSender.AllianceWithdraw/Invite/Kick/ChangeMaster/GradeChange/SetNotice`.
  `AllianceMember.guildId` added for Kick target resolution. New `AllianceResultType` values:
  `SetNotice=3` (consumes 3 fields), `MemberGradeChange=14` (allianceId+guildId+charId+byte),
  `MemberStatUpdate=24` (5 ints), `ChangeMasterResult=25` (3 ints + grade swap). Alliance tab
  now shows Withdraw/Invite/Notice buttons always, and Kick/Master/G+/G- when member selected.
  All callbacks wired in `GameStage.ts`. 1008 tests pass.

- **`CTabGuildAlliance` alliance member list tab** (Hundred-and-twenty-fifth pass):
  `OutHeader.AllianceResult = 68` confirmed via `CWvsContext::OnPacket` jump table
  (0xa0fb78, entry 5 → 0xa0f172). Sub-types 12/13/16 confirmed via `byte_A0FBB8` + `jpt_A0EFD2`.
  Full GUILDDATA decode (including SKILLENTRY tail) implemented in `_decodeGuildDataMembers`.
  Added `AllianceResultType`, `AllianceMember`, `AllianceLoadArgs`; Alliance tab (tab 4) in
  `UserList.ts`; `fh.onAllianceLoad` wired in `GameStage.ts`. 1008 tests pass.

- **`CSlideNotice` scrolling ticker banner** (Hundred-and-twenty-fourth pass): OG `CSlideNotice` (IDA 0x780530) — the scrolling marquee notice driven by `CWvsContext::OnBroadcastMsg` case 4. Created `src/ui/game/SlideNotice.ts` with dark top bar and yellow scrolling text at 80px/s. Fixed `handleBroadcastMsg` decode to read the extra subFlag byte for type 4 (per OG decompile). Wired in `GameStage.ts` — type 4 routes to `_slideNotice.show/hide`, other types keep the existing `showLoot` path. 113 test files, 1008 tests pass.

- **Fear/Darkness screen dim effect** (Hundred-and-twenty-third pass): OG `CField::OnFearEffect` triggered from `CUser::ShowAffectedSkillAni` when mob skill 136 (`MobSkillType.Fear`) is active. IDA decompiled `InitFearEffect`/`DrawFearEffect`/`OffFearEffect` (0x5399F0/0x53A470/0x52B810). Created `src/character/FearEffect.ts` — full-screen black PIXI.Graphics overlay with circular cutout at player position using PixiJS 8's `cut()` API. Wired in `GameStage.ts` via `_onTemporaryStatSet` (checks for `MobSkillType.Fear`) and `_onTemporaryStatReset`. 1008 tests pass.

- **Skill charging visual wired** (Hundred-and-twenty-second pass): `onSkillPrepare`/`onSkillCancel` were no-ops since the Hundred-and-twentieth pass. IDA decompile of `CUserRemote::OnSkillPrepare` (0x953A30) confirmed the OG plays a skill-keyDown animation anchored to the remote character until `RemovePrepareAnimation` is called on cancel. Added `SkillCastInfo.KeyDown` (reads `keyDown` from skill's WZ node), `SkillEffectOverlay.PlayHoldAtCaster`/`CancelHold` (play-once-then-hold mode), and wired both callbacks in `GameStage.ts`. 1008 tests pass.

- **MiniMap live-tracking wired** (Hundred-and-twenty-first pass): `setOtherPlayers` and `setNpcs` now called every frame in the live-tracking block (alongside `playerWorldPos`/`setPartyMembers`). `setPortals` called once per field load after `setMapData` using `_field.Portals`. IDA-confirmed: OG `CUIMiniMap::Update` reads `CUserPool` live every ~4 frames for other-player dots; portals are static per map, loaded in `SetLayer`. All three setters were dead since the Sixty-ninth pass fix.

- **18 decoded-but-dropped callbacks wired** (Hundred-and-twentieth pass): `onSkillLearnItemResult`, `onSkillResetItemResult`, `onSkillUseResult`, `onSkillPrepare`, `onSkillCancel`, `onQuestClear`, `onGatherItemResult`, `onSortItemResult`, `onInventoryGrow`, `onTownPortalNotify`, `onMonsterBookSetCard`, `onMonsterBookSetCover`, `onHourChanged`, `onMiniMapOnOff`, `onShowSlotMessage`, `onHontaleTimer`, `onLogoutGift`, `onWarnMessage`, `onDestroyShopResult` — all routed to `_notice`/`_statusMessenger`/`_chatBar`/`_clock` as appropriate.

- **MACROSYSDATA wiring completed** (Hundred-and-nineteenth pass): `onMacroSysDataInit` now wired in `_wireHandlers` (was registered in `FieldHandlers.ts` but never assigned in `GameStage`). `FuncKeyType.Skill` key dispatch added to `onKeyPress` (OG `UseFuncKeyMapped case 1u`) — pressing a skill-bound key now fires `onSkillUse`. `FuncKeyType.MacroSkill` (case 8u) also added — fires each non-zero skill in `_macroSlots[fk.id]`. `SkillBook` gains `onMacroOpen` callback + bottom Macro button (OG: button id `0x7E7`); GameStage wires it to `_skillMacro.Open()`. `_skillMacro.OnSave` also updates `_macroSlots` in-memory.

- **Chat tag table completed** (Hundred-and-eighteenth pass): `_resolveChatItemLinks` now handles all 14 `CTextAnalyzer` tag types confirmed from IDA decompile of `GetPhraseType` (0x97d650), `GetPhrase_Sharp` (0x9836b0), and `AnalyzeText` (0x987cc0). New: `#e<id>#` (item+outline, same name lookup), `#s<id>#` (skill name), `#B<n>#` (→ `n%`), `#j<text>#` (inline text passthrough), `#L<text>#` (→ `•`). Formatting markers `#E #I #S #K #w` and WZ-canvas tags `#F #f #Q #D #W` stripped. Was only handling type-7 item links.

- **Megaphone compose wired** (Hundred-and-seventeenth pass): `MegaphoneCompose.ts` (new file), `GameSender.MegaphoneCompose()` sender (opcode 85, wire shape confirmed from IDA 0x5c9e70), and `GameStage.onUseItem` category-234 trigger all shipped. First time a player with a megaphone item can actually send one.

- **`FieldCrc.ts` double-encoding bug fixed** (Hundred-and-sixteenth pass): `constantCrc()` was truncating physics constants to integer values (`data | 0`) instead of using the low 4 bytes of the IEEE-754 bit pattern as the OG does. Fixed via `doubleToLow32()` helper using `Float64Array`/`DataView`. Still dead code (no callers), but correct when wired.

- **`KeyConfig` DragTarget** (Hundred-and-fifteenth pass): `KeyConfig` now implements `DragTarget` — skill-drag-drop from `SkillBook` now binds to `KeyConfig` key slots as well as `QuickSlotBar`. Fixed missing `onBindingsChanged` call in `tryBindSkillAt`. No `GameStage` changes needed — `endDrag` already iterates all visible panels.

- **`StatDetailInfo.Inputs` wired** (Hundred-and-fourteenth pass): the detailed-stat panel (min~max damage, accuracy, avoidability, PDD/MDD, speed/jump) now receives live character stats (str/dex/int/luk/maxHp/maxMp/jobId) from `GameStage._syncStatDetailInputs()`, called from both `_onEnterField()` and `_onStatChanged()`. Was permanently showing zeros. Fixed `ValueColor = 0x332A21FF` (RRGGBBAA crash) in `StatDetailInfo.ts` as well. Weapon/bonus stats still at defaults pending equip-stat pipeline.

- **Mob hit variant randomization** (Hundred-and-thirteenth pass): `MobLook.OnHit()` now picks a random loaded hit-state variant (Hit/Hit2/Hit3/HitF) matching OG `CMob::GetRandomHitAction`'s `rand()%nHitCount+7` logic instead of always forcing Hit1. `Update()` transition check extended to cover all four hit variants.

- **Mob speech bubbles fully wired** (Hundred-and-eleventh pass): `CMob::OnDie` death-speech path (ambient speak for die actions {10-12}) and server-driven `OnMobSpeaking` (opcode 301) both wired. WZ `speak/<n>/{action,speech}` loading was already done; this pass adds the death-kill trigger in `GameStage._killMob()` and the new `OutHeader.MobSpeaking=301` packet handler in `FieldHandlers.ts`.

- `WzCanvas.DecodeBgra()` no longer crashes with `Cannot read properties of
  undefined (reading 'length')` on canvases whose zlib stream lacks the
  trailing Adler-32 checksum (a common MapleStory WZ quirk — confirmed on
  `Login.img/Title/{MSTitle,signboard,ID,PW}`). `pako.inflate()` silently
  returns `undefined` in this case even though it consumed all input and
  decoded the full pixel data; `WzCanvas._inflate()` now drives `pako.Inflate`
  manually and recovers the decoded bytes from its internal buffers when
  `ended` is false but `err` is 0. This was the actual root cause of the
  "blue boxes" — not a file-fetch/truncation issue (XHR byte-fetch was
  already verified byte-identical via SHA-256).
- `GameStage._onSetField` now actually constructs `FieldScene` (was previously a
  no-op stub guarded by `!this._field`, so the field never rendered at all) and
  attaches `_field.container` to `uiRoot`.
- `GameStage` opens `Map.wz` and `Character.wz` via `WzPackage.OpenBase(game.wzDir, ...)`
  and calls `_player.Load(characterWz, loader)` so the avatar renders real sprites
  instead of the placeholder box.
- `GameCamera` (`_camera`) and `FieldScene.Camera` (`Camera2D`) now share the same
  `{x,y}` position object, so `GameCamera.Update`'s lerp drives `FieldScene`'s
  world→screen transform.
- `FieldStage.onSetField` no longer overwrites `GameStage._onSetField` — it chains
  to the base handler first, then logs.
- `WzCanvas._convertToBgra()` format 1 (A4R4G4B4) had R and A swapped — R was
  read from `high >> 4` (the alpha nibble) and A from `high & 0x0F` (the red
  nibble), per the C# reference (`R = high & 0x0F`, `A = high >> 4`). This
  caused the washed-out pink tint visible on the login signboard/ID/PW/button
  art after the inflate fix landed. Fixed and confirmed visually via CDP
  screenshot — signboard now renders in its correct tan/beige tones.
- Removed leftover `DEBUG GetItem(...)` console logging and `window.__debugUI`/
  `window.__debugWzCanvas` globals from `LoginStage._loadWzAssets()` (artifacts
  of the inflate-bug investigation).
- **Fixed: login screen background never appeared.** `SplashStage` constructs
  `LoginStage` with `map=null` (Map.wz loads async in the background so the
  player isn't blocked on a multi-hundred-MB download), and `onEnter()` calls
  `_buildMapScene()` immediately — building an empty `MapScene` since
  `this._map` is still null at that point. `attachMapSound()` (called once
  Map.wz finishes loading) only rebuilt the scene `if (!this._scene)`, but
  `_scene` was already a truthy (empty) object from the first call, so the
  real map data was never used. `attachMapSound()` now always calls
  `_buildMapScene()` to rebuild with the real `WzPackage`, and `_buildMapScene()`
  clears `_mapContainer` first so the stale empty scene's container isn't left
  behind. Verified via Playwright screenshot — login screen now shows the full
  field scene (mushrooms, trees, MapleStory logo) behind the sign board.

## CAnimationDisplayer pass (this session)

OG's `CAnimationDisplayer` (confirmed live via IDA, ~470 methods) is the
client's central visual-effects orchestrator — full plan at
`/home/jorge/.claude/plans/sparkling-greeting-rabin.md`. Phases 1-3 done:

- **Phase 1**: Verified `SkillEffectOverlay` against the real
  `CUser::ShowSkillEffect` -> `Effect_SkillUse` -> `LoadLayer` ->
  `CreateLayer` chain — confirmed "numbered subkeys = sequential frames" is
  the correct default model. Found one real, narrow, documented exception
  (Crusader Combo Attack family uses the index as a live combo-stack
  selector, not a sequence) — deferred, needs game-state plumbing this
  client doesn't have yet.
- **Phase 2**: Wired `FieldEffect` subType 3 (`screenEffectUol`) to
  `SkillEffectOverlay.PlayFullScreen` — confirmed via `CField::
  ShowScreenEffect` decompile to be exactly a screen-centered one-time WZ
  animation. Also **found and fixed a wrong field-naming bug**: subType 7
  was named/documented as a `rouletteX/Y/Value` position, but
  `CField::OnFieldEffect` case 7 actually calls `Effect_RewardRullet
  (nRewardJobIdx, nRewardPartIdx, nRewardLevIdx, screenOrigin)` — three
  selection indices for an equipment-tier preview, anchored to the window
  origin, not a roulette wheel position. Renamed the fields
  (`PacketArgs.ts`/`FieldHandlers.ts`/tests) to match; left unimplemented
  since it's a different, more involved feature than assumed.
- **Phase 3**: `EmotionBubble`, `SkillEffectOverlay`, and `TombstoneEffect`
  each independently reimplemented the same "numbered WZ canvas children +
  single-canvas fallback" frame loader. Extracted the shared
  `src/character/WzFrameAnimation.ts` (`loadFrameSequence`/
  `totalDurationMs`) — public APIs of all three unchanged. Verified against
  real WZ data: `Tomb.img` (TombstoneEffect's asset) still resolves and
  renders correctly post-refactor. Along the way, **found a pre-existing,
  unrelated bug**: `EmotionBubble` reads from `EmotionEffect.img`, which
  doesn't exist in this Effect.wz build at all (real top-level entries are
  `BasicEff/CharacterEff/OnUserEff/Tomb/...`) — confirmed NOT caused by this
  refactor (identical zero-result behavior before and after), not fixed
  here (out of scope for Phase 3; the correct path needs its own
  investigation).

**Phase 4**: Both original assumptions were wrong, found via real IDA xref
tracing (not guessed):
- `RegisterFallingAnimation`'s only callers are `TryDoingShootAttack`/
  `OnShootAttack` — it's a ranged-attack (Bowman-style arrow-rain) visual,
  not a standalone item-rain event effect. `RegisterExplosionAnimation`'s
  only callers are `TryDoingMagicAttack`/`OnMagicAttack` — same story for
  magic attacks. Both reclassified into Phase 5 (Bullets), where they
  actually belong.
- `CMob::ShowHitEffect` (the mob-hit reaction) uses the mob's own random hit
  *animation* (a stagger/flinch pose from its WZ template), not Skill.wz's
  per-skill `hit` node at all — that node's real consumer is still
  unconfirmed.
- Traced `Effect_Squib`'s real call chain instead:
  `CAnimationDisplayer::RESERVEDINFO::Update` -> only populated by
  `Effect_Reserved`, whose only gameplay callers are `CUser::OnEffect`
  (opcode 233, `OutHeader.UserEffectLocal`/`UserEffectRemote`) cases 0xE
  and 0x14 — both just `DecodeStr` a WZ UOL and play it at the player's own
  position. Wired `GameStage._onUserEffect` for exactly these two
  effectTypes, using the existing `SkillEffectOverlay.PlayAtCaster`. The
  other ~28 `CUser::OnEffect` cases, and `Effect_Reserved`'s own deeper
  RESERVEDINFO scatter/repeat/item-linkage behavior, are NOT decoded/
  replicated — this plays the resolved WZ node once, not the real
  randomized squib behavior.

**Phase 5** (Tremble + Bullets) done:
- `GameCamera.Shake(intensity, durationMs)` — a simple linear-decaying
  random screen-space jitter (not OG's literal native-engine `RelMove`
  tween, see plan's non-goals), applied only in `WorldToScreen` so
  `Position` itself stays clean for other camera logic. Wired from
  `FieldEffect` subType 1.
- **Found a much bigger gap than expected while investigating bullets**:
  confirmed via decompile of `CUserPool::OnUserRemotePacket` (0x94b390)
  that opcodes 211-214 (`MeleeAttack`/`ShootAttack`/`MagicAttack`/
  `BodyAttack` broadcasts) had **no `OutHeader` entry in this client at
  all** — other players' attacks were entirely invisible, not just
  missing a projectile sprite. Added the opcodes and a common-case-only
  decode (`FieldHandlers.handleUserAttack`) of the shared dispatcher
  `CUserRemote::OnAttack` (0x95a670, ~250 lines, decompiled in full) —
  explicitly skips the same density of per-skillId special-casing already
  deemed out-of-scope for `DoActiveSkill` (grenade throws, swallow-mob,
  meso-explosion damage shape, serial-attack flag, per-skill tremble/fade).
  Wired into `GameStage._onUserAttack`: applies damage/hit-flash/knockback
  to targeted mobs via the same path `_tryMeleeAttack` already uses, and
  plays the attacking `OtherCharLook`'s attack pose.
- **Found and fixed a latent bug while wiring the attack pose**:
  `CharLook.Attack()` called bare `StartAction()` instead of
  `PlayOneTimeAction()` — without the one-time-action timer, the very next
  per-frame `UpdateFromPhysics()` call would have immediately overwritten
  the attack pose with the current movement stance before a single frame
  rendered. (Previously unnoticed because `Attack()` had no real caller
  anywhere in `src/` until this pass.)
- Added `ProjectileOverlay` (`src/character/ProjectileOverlay.ts`) for
  ShootAttack/MagicAttack: a deliberately simple linear-interpolated dot
  from caster to first target, NOT OG's real per-weapon WZ bullet sprite
  (`NormalBullet`/`MagicBullet` resolve `sBulletEffectUOL` from the
  caller's `nWeaponItemID`/`nBulletItemID` — confirmed via `NormalBullet`'s
  constructor, but `TryDoingShootAttack`'s exact path-building convention
  needs its own decompile pass, not done this session).
- `CUserRemote::OnHit` (opcode 218 — a player *taking* damage, separate
  from the Attack family) also has no `OutHeader` entry; noted, not in
  scope here.

All 6 plan phases now done (Phase 4's Falling/Explosion folded into Phase
5, where they were confirmed to actually belong). Remaining backlog:
`ChainLightning`/`HookingChain`/`MotionBlur`/`Fade`/`FireCracker`/
`NewYear`/`Teslacoil`/`UserState`/`AbsorbItem`, full per-skillId fidelity
for `DoActiveSkill`/`ShowSkillEffect`/`OnAttack`, and `OnHit` — all
explicitly named, non-silent backlog per the plan file.

## CActionFrame investigation (this session)

Checked `CActionFrame` (confirmed live via IDA) — turned out to be mostly
irrelevant, but with one genuinely useful finding:
- `CActionFrame::Draw` is a pure native-engine rendering optimization: it
  pre-composites one avatar frame's body-part canvases into a single
  bitmap (`m_rcMBR`) so the DirectX rasterizer issues one draw call instead
  of N. No PixiJS equivalent needed — Pixi already batches sprite draws on
  its own (same non-goal category as the `CAnimationDisplayer` plan's
  COM/`RelMove` internals).
- `LoadMappers()` reads `Base.wz/zmap.img` for z-ordering — the exact same
  source `AvatarZMap.ts` already correctly consumes. No bug found.
- **The useful part**: `Draw()` exposes 4 named per-frame anchor points —
  Navel, Head, Brow, and Muzzle (weapon tip). We were approximating these
  everywhere with independent hardcoded Y-offset guesses that don't scale
  with character height/equips: `ChatBalloon` (`y-50`), `EmotionBubble`
  (`y-50`), `ProjectileOverlay`'s spawn point (`y-40`).
- Added `AvatarAnchors` to `CharacterRenderer.Draw()`'s return value
  (`{ groups, anchors }` — was a bare array before; updated all 3 call
  sites: `CharLook`, `CharCreationStage`, `CharSelectStage`), computed once
  per draw from data already being computed for body-part stitching
  (`navel`/`neck`/`brow` anchor chaining already existed; `muzzle` is new —
  reads the equipped weapon's own `muzzle` map key, falling back to the
  weapon's/hand's own pen position when absent, true for most melee
  weapons). Exposed via `CharLook.HeadPosition`/`NavelPosition`/
  `BrowPosition`/`MuzzlePosition` getters, and equivalent passthroughs on
  `OtherCharLook`.
- Verified directly against real `Character.wz`/`Item.wz` data: `head`
  (y=-47) sits correctly above `brow` (y=-40) above `navel` (y=-21) for a
  standing avatar — matches real anatomy (top-of-head above eye-level
  above waist), confirming the anchor-chaining math is right before wiring
  any consumers.
- Replaced the hardcoded offsets: `ChatBalloon` (self and other players) →
  `HeadPosition`; `EmotionBubble` (other players) → `HeadPosition`;
  `ProjectileOverlay`'s spawn point (Shoot/Magic attacks) →
  `MuzzlePosition`. Mob-side offsets (`DamageNumber`'s `y-60`,
  `ProjectileOverlay`'s target-side `y-40`) intentionally left as-is — mobs
  don't have this anchor system, different concern.

## Skill effects pass (earlier this session, via live IDA on Maplestory95.exe.i64)

- Built `tools/dump_skill_list.mjs` → `tools/_skill_master_list.json`: every
  skill in Skill.wz (892 across 101 job roots, 879 with resolved names from
  String.wz), flagged with which have `effect`/`effect0`/`screen`/`hit` WZ
  data and their `action` (pose) lists — the master checklist for skill work.
- `GameSender.UseSkill` was sending a hardcoded `0` for the client-tick field
  (OG `CUserLocal::SendSkillUseRequest`'s `update_time`) — now takes a real
  `updateTime` param like the rest of the senders.
- Added `InHeader.UserSkillEffectRequest = 71` (`CUserLocal::
  SendSkillEffectRequest`, confirmed live in IDA) — a real opcode missing
  from this port entirely, used by charge/repeat skills to re-sync their
  visual effect; not wired to a sender yet since this client doesn't model
  hold-to-charge input.
- **Found and fixed a foundational rendering bug, unrelated to skills but
  blocking all of them**: `CharLook.Update()`/`UpdateFromPhysics()` were
  never called anywhere for the local player — `Draw()` ran every frame off
  `_currentAction`/`_frame`/`_facingLeft`, but nothing ever advanced them,
  so the avatar silently rendered as a frozen `stand1` pose regardless of
  movement. Wired `_player.UpdateFromPhysics(dt, stance, facingLeft)` into
  `GameStage.update()`.
- Added `CharLook.PlayOneTimeAction`/`IsPlayingOneTimeAction` — a one-shot
  action that blocks stance-driven overrides for its real WZ frame duration
  (OG's `CAvatar::GetOneTimeAction() > -1` gate), then resumes normal
  movement-driven animation. Wired skill use to play the skill's first
  WZ-listed `action` (exact OG appointed-action selection — ladder/rope
  state + random roll — isn't in the IDA dump; first-action is correct for
  the common single-action case).
- New `SkillEffectOverlay` (`src/character/SkillEffectOverlay.ts`, same
  shape as `EmotionBubble` but generic over an already-resolved WZ node):
  plays a skill's `effect`/`effect0` anchored to the caster's moving world
  position, and `screen` anchored to the viewport center ignoring camera.
  Verified end-to-end against real Skill.wz data (Power Strike, Slash Blast,
  Bamboo Thrust all produce real animated frames). `hit` (target-side
  hit-splash, nested one level deeper) intentionally NOT handled here — it
  belongs to the mob-hit pipeline, a separate system.
- Re-verified `TemporaryStatSet`'s known-uncertain bit-decode against live
  IDA (`SecondaryStat::DecodeForLocal`): confirmed it's a 100+-block
  hand-unrolled function with at least one special case per bit position
  (e.g. skill 5221006 reads extra inline vehicle-durability data) — not a
  uniform loop, and not extractable bit-by-bit in reasonable time. Existing
  disclaimer strengthened with this concrete evidence rather than guessed.
- **Fixed**: `FieldHandlers.handleUserMove` only read the final x/y,
  discarding the full MoveElement list OG actually sends. Added
  `src/net/packet/MovePathDecoder.ts` (`DecodeMovePath`), mirroring
  `CMovePath::Decode`/`CUserRemote::OnMove` (live IDA decompile,
  Maplestory95.exe.i64 0x667920/0x948a80) for the `bPassive=0` (remote
  broadcast) case — every per-attr field grouping cross-checked byte-for-byte
  against the existing (already-correct) `MovePathEncoder.ts` and confirmed
  to match exactly, including which attrs (StatChange, and the "Action"
  attrs 20-30 for non-moving actions like attack/skill) carry x/y/vx/vy
  forward from the previous element instead of reading new values. One
  conditional NOT implemented: OG also reads 2 extra shorts per element when
  `CClientOptMan::GetOpt(2)` is set — that option defaults unset (confirmed
  via `CClientOptMan::GetOpt`'s map-miss-returns-0 body) and looks like a
  RandCnt-style anti-cheat field that doesn't exist in v95-era GMS, so
  assumed off.
- Added `Stance.MoveActionToStance` (inverse of the existing
  `StanceMoveAction`) and wired `handleUserMove` → `GameStage.onUserMove` →
  `OtherCharLook.SetFacing`/`SetStance` → `CharLook.UpdateFromPhysics`, so
  other players now actually animate (walk/jump/etc.) and face the right
  direction instead of being frozen.
- **Found and fixed along the way**: `OtherCharLook` never called
  `CharLook`'s internal display rebuild at all (it only ever did
  `container.addChild(this._charLook.container)`) — so every other player
  rendered completely empty, not even the placeholder rectangle. Added
  `CharLook.RebuildDisplay()` (position-independent variant of `Draw()`,
  since `OtherCharLook` positions the wrapper container itself) and wired it
  into `OtherCharLook`'s own rebuild.
- New tests: `tests/packet/MovePathDecoder.spec.ts` (roundtrips every attr
  category through the existing encoder, plus `MoveActionToStance` inverts
  `StanceMoveAction` for every producible stance/facing pair).
- `CUserLocal::DoActiveSkill` (the real per-skill mechanical dispatcher) is
  ~3600 lines of hardcoded per-job/per-skill exceptions (cooldowns, MP
  costs, special conditions) — confirmed via IDA but explicitly out of
  scope to port skill-by-skill; the generic WZ-driven action/effect/screen
  pipeline above covers the visual presentation for the common case instead.

## What Remains

- **Browser runtime test** — confirmed end-to-end via CDP: clicking through
  SplashStage → LoginStage now logs `signboard=true idField=true pwField=true`
  and the screenshot shows correct art (no blue boxes, correct colors). Full
  Kinoko connection still needs a live-server visual pass.
- **Fixed: Map.wz load failure (`FileIO.ts` chunked Range reads)** —
  `LoginStage._loadWzAssets()` was logging `failed to open Map.wz/Map.nx
  RangeError: Offset is outside the bounds of the DataView`. Root cause:
  `FileIO._syncRequest()` read the whole body via a single synchronous XHR
  into `xhr.responseText` (a JS string, `x-user-defined` charset), then
  converted char-by-char to bytes. For files past ~64MB (`Map.wz` is 745MB,
  `Map.nx` is 1.7GB), `responseText` silently comes back empty (status 200,
  but past an internal sync-XHR string-size limit), so `readFileBytes` returned
  a 0-byte `ArrayBuffer` and `WzBuffer.ReadInt()` threw a DataView bounds error.
  Fixed by HEAD-ing `Content-Length` first and, for files over `CHUNK_SIZE`
  (64MB), issuing multiple sync XHR `GET`s with `Range: bytes=a-b` headers
  (vite dev server returns `206 Partial Content`), assembling the chunks into
  one `ArrayBuffer` via `Uint8Array.set`. Verified in-browser: `Map.wz` now
  reads to the exact expected 744,833,827 bytes with a valid PKG1 magic
  (`0x31474b50`) — took ~203s for 12×64MB chunks via sync XHR (vs. ~47s for
  the same ranges via async `fetch` in Node, so most of the cost is sync-XHR +
  char-by-char string decode overhead, not the network). Acceptable for a
  one-time login-screen asset load; if this becomes a UX issue, the next step
  would be replacing the char-by-char decode loop with something faster (e.g.
  `TextDecoder`/binary string tricks) or making `WzPackage.Open` async so a
  real `fetch` + `ArrayBuffer` path can be used.
- **Panel name display** — `ItemInventory`, `SkillBook`, `QuestLog`, `StatusBar` show name data from server (not yet resolved via NameService in all panels)
- **Map rendering test** — tile/obj/back/portal layers exist in FieldScene and are
  now reachable via `GameStage`/`FieldStage`, but need visual verification against
  a live server
- `CharacterRenderer` ported from C# (345 lines) — avatar composition engine with
  anchor-based stitching, blink clock, emotion system, weapon attack-type detection,
  z-ordering via AvatarZMap; `CharLook` now delegates to it instead of pre-loading frames
- `DamageDigits` now renders via PixiJS sprites (was no-op stubs); `DrawNumber`/`DrawMiss`
  position sprite children in a `Container` with alpha
- `BuiltInFont` gained `wrapToWidth()`/`truncateToWidth()` using Canvas 2D `measureText`
- `QuestDetail` fully ported from C# — text wrapping, speaker NPC (via `NpcLook.drawFrameOnly`),
  button positions, scrollbar with click/drag, header/body compositing
- `SoftKeyOverlay` fully ported — backspace repeat (keydown/keyup + timer), title-bar dragging,
  WZ art via `Button.fromWz`, tab/background/text compositing
- `FamilyWindow` — dragging follows mouse via global `__mouseX/Y`; text layer renders
  reputation/junior stats each frame
- `Messenger` buttons now use `Button.fromWz()` for proper WZ art (was bare `new Button()`)
- `MapleClaudeGame` now tracks `mousemove` (→ `__mouseX/Y`) and `wheel` (→ `__wheelDelta`)
- `GameStage._otherChars` converted from array to `Map<number, CharLook>`; `_onUserLeave`
  properly removes by charId (was empty stub)
- `PinStage` — full PIN entry UI with 4-digit input, `CheckPinCode` send, server response
  handling (was placeholder text)
- `LoginHandlers` — added `CheckPinCodeResult` handler (opcode 6) with `onCheckPinCodeResult`
  callback; `WorldSelectStage` wires PIN flow → `CharSelectStage`
- `MapleCursor` — full procedural cursor implementation (was empty stub)
- `UserList` — added `setUsers(entries)` to populate list with name/level/job (was shell)
- **Fixed (TODO_AUDIT.md 88th pass)**: `ChatBar` had no chat-history recall —
  added `ArrowUp`/`ArrowDown` cycling through previously sent messages
  (`CChatHelper::HistoryUp`/`HistoryDown`, IDA 0x4aa230/0x4aa2c0).
- **Found, not yet fixed (TODO_AUDIT.md 89th pass)**: real protocol-desync
  risk — opcode 346 decodes differently for `CField_MonsterCarnival` (10
  bytes) vs. `CField_MonsterCarnivalRevive` (1 byte), and this client has no
  field-type-aware dispatch, so entering the Carnival revive room would
  corrupt the packet stream. Needs a per-map WZ `fieldType` lookup this
  client doesn't have yet.
- **Fixed (TODO_AUDIT.md 89th/97th/108th passes)**: drag-skill-to-quickslot
  was dead-code-adjacent (`QuickSlotBar.TryBindSkillAt` had zero callers).
  Root cause was bigger: this client had no generic drag-and-drop system
  at all (`IDraggable`/`CWndMan::BeginDragDrop` has no client equivalent).
  Added `src/ui/DragController.ts` (generic `DragTarget` mousedown/move/up
  dispatch) and wired `SkillBook` → `QuickSlotBar` through it.
  KeyConfig drop target still not wired.
- **Fixed (TODO_AUDIT.md 92nd/108th passes)**: `GameSender.GuildCreate`
  had zero callers. Investigating the dialog this was supposed to need
  (`CCreateGuildAgreeDlg`) showed it's actually the *other* party
  members' consent popup, not the initiator's name-entry UI — the real
  fix is a "Create" button on `UserList.ts`'s Guild tab using the same
  `window.prompt()` convention as party invites.
- **Fixed (TODO_AUDIT.md 102nd/105th/109th passes)**: equip tooltips
  never showed set-item info. Ported the portable half of
  `CWvsContext::CheckEquippedSetItem` (client-side equipped-set
  counting, no server round trip) into `EquipInventory`/`ItemTooltip`.
  The full per-tier stat-bonus breakdown needs unverified WZ schema +
  unported StringPool text, deliberately not guessed at.
- **Found, not yet fixed**: `ItemTooltip.ts`'s color constants are
  `0xRRGGBBAA` but get passed straight into Pixi calls expecting
  `0xRRGGBB` — throws when exercised outside a full WebGL context.
  Unclear if this also affects the live in-browser render; not checked.
- **Fixed (TODO_AUDIT.md 102nd pass, waterfall implementation)**: the
  Family privilege list (`FamilyPrivilegeList`, opcode 104) was decoded
  but its handler was a no-op stub — `FamilyWindow.ts` never showed any
  privilege info. Added a one-at-a-time privilege carousel
  (`SetPrivileges`/`SetPrivilegeUse`, `[<]`/`[>]`/`[Use]` buttons)
  matching `CUIFamily::Draw`'s own paging UI, and added the two
  previously-missing `GameSender` entries it needed
  (`UseFamilyPrivilege` opcode 175, `SetFamilyPrecept` opcode 176 —
  the latter sender exists but has no UI trigger yet). The summon/jump
  target-name sub-case of `SendUseFamilyPrivilege` is deliberately not
  ported (`SP_` enum values unrecoverable from disassembly).
- **Fixed (TODO_AUDIT.md 84th pass, waterfall implementation)**: `CTips`
  ambient gameplay tip toast — previously assumed StringPool-blocked,
  corrected after opening `Etc/Tips.img` directly and finding it's a
  fully literal table. New `src/character/TipOfTheDay.ts` + a
  `StatusMessenger.showTip()` toast, wired into `GameStage.update()`
  (matches `CTips::GetTip`'s level-gating and per-entry interval
  rate-limit; job-bitmask gating and message-template selection
  dropped, documented as StringPool-blocked specifically for those two
  sub-pieces).
- **Fixed (TODO_AUDIT.md 89th pass, waterfall implementation)**: real
  protocol-desync bug. Opcode 346 (`MonsterCarnivalEnter`) decodes a
  different wire shape in `CField_MonsterCarnivalRevive` (1 byte) than
  in normal `CField_MonsterCarnival` rooms (10 bytes), selected by each
  map's WZ `info/fieldType` (10 vs. 11 — confirmed against the real
  `Map.nx` data, not guessed). This client always decoded the 10-byte
  shape regardless of room type, which would corrupt the packet stream
  on every revive-room entry. Added `MapInfo.FieldType` +
  `FieldHandlers.setCurrentFieldType()` (set from `GameStage._onSetField`)
  and branched the decode on it.
- **Fixed (TODO_AUDIT.md 85th pass, waterfall implementation)**: marriage
  proposals had no sender at all (only the accept/decline reply side
  existed). Added `GameSender.MarriageRequest` (opcode 161, action byte
  0) and wired it to double-clicking an engagement-ring-box item
  (`itemId / 10000 === 224`, decompile-confirmed) in `ItemInventory.ts`'s
  existing use-item dispatch.
- **Fixed (TODO_AUDIT.md 83rd pass, waterfall implementation)**:
  `CField_KillCount` (fieldType 34, WZ-confirmed: 10 maps) had no
  decode or display at all. Added opcode 178 (`KillCountInfo`) decode
  and a new `KillCountHud.ts` text overlay, same plain-text-fallback
  convention as `Clock.ts`. Also WZ-confirmed `CField_Dojang`/Mu Lung
  Dojo is present (486 maps, fieldType 14) — its timer mechanic turned
  out to already be covered by the generic `Clock` system; the
  floor-progression/monster-wave minigame itself remains unimplemented
  (sized up, same scope class as Auction House).
- **Fixed (TODO_AUDIT.md 82nd pass, waterfall implementation)**:
  `CTabBlackList` — decompile-confirmed purely local config (no server
  round trip), unlike Friend/Party/Guild. Added a 4th "Block" tab to
  `UserList.ts`, a local `blackList` field in `UserSettings.ts`
  (persisted via `localStorage`), and wired the ignore-filter into
  `onWhisper`. `CConfig::IsInBlackList`'s other call sites (group chat,
  invites, join requests) need the same filter added individually —
  not done yet.
- **Fixed (TODO_AUDIT.md 81st pass, waterfall implementation)**:
  `CMessageBoxPool` (the floating shop/trade-room marker above nearby
  players) — opcodes 325-327 had been marked "unconfirmed" by a prior
  pass; re-decompiling found the shapes were actually readable, just
  not via automatic switch-table detection. Added the full decode plus
  a new `ShopMarker.ts` overlay (item icon + "hope" text, tracked live
  by character name against `_otherChars`).
- **Fixed (TODO_AUDIT.md 79th pass, waterfall implementation)**:
  `CSetGuildMarkDlg` — decompiled the full round trip
  (`OnGuildResult` case 17 trigger + `SendSetGuildMarkMsg`'s real wire
  shape) and added `GuildResultType.SetMarkPrompt`/`GuildRequestAction.SetMark`/
  `GameSender.GuildSetMark`. UI is four `window.prompt()` numeric inputs
  rather than OG's full preset-picker dialog (not built).
- **Fixed (TODO_AUDIT.md 78th pass, waterfall implementation)**:
  `CField_Massacre` looked like a whole-minigame gap at a glance but its
  actual network surface is tiny (one `int4` gauge opcode + one
  `byte+int4` result opcode) once decompiled directly instead of
  assumed too big. WZ-confirmed present (351 maps, fieldType 23). Added
  the decode + a new `MassacreGaugeHud.ts` text overlay.
- **Fixed, partial (TODO_AUDIT.md 77th pass, waterfall implementation)**:
  chat `#i<id>#`/`#v<id>#` item-link tags now resolve to `[ItemName]`
  instead of showing raw tag text (`GameStage._resolveChatItemLinks`).
  Not a real clickable link (would need a `ChatBar` rich-text rework).
  13 other decompile-confirmed tag types (`#L`/`#F`/`#e`/`#W`/etc.,
  full type table in `TODO_AUDIT.md`) remain unhandled — left as an
  explicit TODO, not guessed at.
- **Fixed (TODO_AUDIT.md 76th pass, waterfall implementation)**:
  chair/sitting had zero implementation despite `KeyAction.Sit` and two
  senders (`UserSitRequest`/`PortableChairSitRequest`) already existing
  unused. Decompiled the real trigger (`CUserLocal::HandleXKeyDown`) and
  wired the full toggle: NPC-bench seat detection (new WZ `seat` node
  parsing in `FieldScene.ts`), portable-chair inventory scan, and
  `PlayerController.Sit`/`StandUp`. Couple-chair sync and chair stat
  bonuses are separate, real, named-but-unported systems — explicit
  follow-up TODO, not implemented.
- **Fixed (TODO_AUDIT.md 74th pass, waterfall implementation)**:
  `CUIQuestTimer` — `FieldHandlers.onSetQuestTime` was already fully
  decoded but had zero `GameStage.ts` wiring. Added a new
  `QuestTimerHud.ts` text overlay plus this codebase's first real
  Windows-FILETIME-to-epoch-ms conversion (every other FILETIME field
  elsewhere is decoded and discarded, never used).
- **Implemented item drag-and-drop** (`TODO_AUDIT.md`'s previously-deferred
  infrastructure TODO): `ItemInventory.ts`/`EquipInventory.ts` now fire
  `onDragStart` on mousedown over a slot; `GoldHammer`/`KarmaScissors`/
  `ItemProtector` implement `DragTarget` and accept the dropped equip via
  `setTarget`, unblocking all three previously-unreachable dialogs.
  `EquipInventory`'s old click-to-unequip behavior is preserved as the
  drag-end fallback when nothing claims the drop. Not done: the
  megaphone-compose dialog (`CItemSpeakerDlg`) doesn't exist as a panel
  yet, and the open-trigger (which item opens which dialog) is still
  unsolved — traced into a ~150KB generic dispatcher that switches on a
  derived type code, not a simple itemId category; not guessed at.
- **Fixed (TODO_AUDIT.md 70th pass, waterfall implementation)**: real
  correctness bug, not a missing feature. `StatDerived.ts`'s ACC formula
  had wrong DEX/LUK coefficients, and PDD/MDD had no base-stat
  contribution at all (equipment-only) — every character's displayed
  ACC/PDD/MDD was wrong. Fixed using `BasicStat::CalcBasePACC/PDD/MDD`'s
  exact decompiled formulas.
- **Fixed (TODO_AUDIT.md 69th pass, waterfall implementation)**:
  `CUIMiniMap` party-member tracking — found while fixing it that the
  minimap's player dot (`playerWorldPos`) and the
  `setOtherPlayers`/`setNpcs`/`setPortals` setters were **all** dead
  (never called from `GameStage.ts`), not just party tracking as
  originally flagged. Fixed `playerWorldPos` (now live every frame) and
  added party-member dots (`Party`/`PartyMaster` markers, already
  loaded and unused). Other-player/NPC/portal live-tracking remains
  dead — explicit follow-up TODO, bigger scope than this fix.
- **Fixed (TODO_AUDIT.md 67th pass, waterfall implementation)**:
  `CBattleRecordMan::DamageInfo` — the real combat-stats calculation
  engine (min/max/crit/miss tracking, average damage/hit, average
  attribute rate, and a time-decaying smoothed DPS estimator) was
  entirely missing; this client only tracked a raw DoT-damage sum.
  Re-decompiled the exact formulas and added the engine to
  `BattleRecord.ts`, wired from both of `GameStage.ts`'s damage-number
  call sites.
- **Fixed (TODO_AUDIT.md 65th pass, waterfall implementation)**:
  `CUISkill::CanSkillUp` — the real per-job-tier, level-capped SP gate
  for the skill-up button, fully decompiled and implemented in
  `SkillBook.ts` (Cygnus/Evan correctly produce a 0 SP cap per the
  literal formula, consistent with those classes' progression living
  outside `CUISkill`; Aran uses the regular formula). Also found and
  fixed a bigger bug while wiring it: `args.sp` was never forwarded to
  `SkillBook.sp` anywhere, so the level-up button never appeared at
  all regardless of any gate.
- **Fixed (TODO_AUDIT.md 63rd pass, waterfall implementation)**:
  `CUIGuildBBS` (guild message board) — the protocol was already fully
  decoded both directions with zero UI panel to consume it. Added a
  new `GuildBBS.ts` panel (list/detail/comment/new-post, plain-text
  fallback rendering) and a "Board" button to `UserList.ts`'s Guild
  tab.
- **Fixed (TODO_AUDIT.md 41st/46th passes, "start from phase 1")**: the
  real per-level EXP table (decompile-extracted, `NextLevelExpTable.ts`)
  was verified correct long ago but never wired — `StatusBar.nextExp`
  was hardcoded to 100 for every level. Wired into both level-set sites
  in `GameStage.ts`. Deleted the now-redundant, guessed `domain/ExpTable.ts`.
- **Fixed ("Resolved against the v95 decompile" section, "start from
  phase 1")**: incoming friend request (`FriendResultType.Request = 9`)
  was fully decoded (`FieldHandlers.onFriendRequest`) but had zero
  consumer, and `GameSender.FriendAccept`/`FriendRefuse` had zero
  callers. Wired in `GameStage.ts` using the existing `_notice` confirm
  panel, same pattern as Family/Party invites — no new UI needed.
- **Fixed (Eighty-sixth pass + "Resolved against the v95 decompile"
  section, "start from phase 1")**: `CUIAntiMacro` anti-bot captcha — a
  real, security-relevant missing feature flagged since the Eighty-sixth
  pass. Re-decompiled `CUIAntiMacro::SetRet` to find the real
  answer-submit packet (previously-undocumented opcode 117, added as
  `InHeader.AntiMacroAnswerRequest`); built new `AntiMacroDialog.ts`
  (image-or-text captcha popup, OK/Cancel) and wired it into
  `FieldHandlers.onAntiMacroResult` / `GameStage.ts`'s `_panels`. `Claim`
  opcodes (44/45/46) remain a separate, still-open TODO.
- **Fixed ("Resolved against the v95 decompile" section, "start from
  phase 1")**: `MapleTVHandlers.ts`'s 3 already-correctly-decoded opcodes
  (405/406/407) were registered on the router but `GameStage.ts` never
  assigned any of their 3 callbacks. Wired `onSetMessage`/
  `onSendMessageResult` to `_chatBar.addLine`, same fallback convention as
  the other broadcast-message types. Also flagged (not yet resolved): a
  separate, likely-stale `FieldHandlers.onMapleTVUseRes` using opcode 113,
  which doesn't match any case in the real `CMapleTVMan::OnPacket` switch.
- **Fixed (Fifty-fourth pass, "start from phase 1")**: `WorldInformation`
  never read its own per-world balloon-notice records (`{x, y, message}`
  after the channel list), leaving them in the packet to desync every
  subsequent world entry whenever a world had an active event notice.
  Added `WorldInfo.balloons`/`WorldBalloon` and ported the read loop.
- **Fixed (Fifty-fourth pass, "start from phase 1")**: `PSP_AddSoldItem`
  (personal-shop seller's sold-item notice) had no `case` in `GameStage`'s
  MiniRoom-result switch at all. Added `PersonalShop.NotifySoldItem`,
  which resolves the decoded quantity's real semantics (a multiplier
  against the listing's own bundle size, per `CPersonalShopDlg::
  OnSoldItemResult`) against the shop's own item list, and wired a
  loot-style notice.
- **Fixed (Fifty-seventh pass, "start from phase 1")**: `Memo.ts`'s
  compose flow reset target/text to empty strings with no way to type
  anything, so "Send" was permanently a no-op. Added `window.prompt()`
  entry for target/text, matching Trunk/Trade/GuildBBS's existing
  free-text convention.
- **Fixed ("Missing features" #5, "start from phase 1")**: Zakum/Chaos
  Zakum/Hontail boss-phase timer opcodes were fully decoded with zero
  consumer (dead letters). Wired all 3 to `_chatBar.addLine` (the real OG
  behavior is a chat-log line via `CUIStatusBar::ChatLogAdd`, not a
  dedicated countdown widget). Also corrected a stale note: party
  leader/"boss" crown (`onPartyBossChanged`) is actually already wired to
  the minimap leader marker, just not the `UserList` panel highlight.
- **Fixed (Thirty-eighth pass, "start from phase 1")**: `StatDerived
  .computeDerived`'s damage formula conflated the real weapon-attack
  multiplier `k` with the stat-side constant (always 4 in OG), selected
  primary/secondary stats by job instead of weapon type, and used
  `Math.floor` instead of round-to-nearest. Replaced with a
  `resolveDamageBranch` keyed on weapon type (nWT) per the real
  `CalcDamage::CalcDamageByWT` switch, including the nWT-33 tertiary STR
  term, the nWT-39 attack-forced-to-1 vestigial case, and the
  Beginner-tier/mage-branch job overrides. **Still blocked (documented,
  not guessed):** neither this formula nor `MeleeDamage.Estimate` ever
  receives real equipped-weapon watk/matk/weaponType — wiring watk/matk
  is mechanical (`ItemIconLoader.LoadAttr` + `EquipInventory._equipped`
  already expose what's needed) but mapping an item ID to the right nWT
  bucket isn't recoverable from this decompile (opaque IDs, no string
  labels).
- **Fixed (Thirty-fourth pass, "start from phase 1")**: every mob's
  attack range was a single universal hardcoded box
  (`AttackRangeX=50`/`AttackRangeY=60`), confirmed wrong by re-checking
  the real WZ data directly (`wz_client/Mob.nx`'s per-attack `lt`/`rb`
  frame-0 hit rects vary widely per mob, e.g. a small ±20px box vs a
  large -175..180px box) rather than trusting the old "data isn't even
  loaded" conclusion. Added `MobAttack.HitRect` +
  `MobInfoService._readHitRect` and a new `MobController._inAttackRange`
  using the union of each mob's real attack rects (mirrored for facing),
  falling back to the old universal box only for mobs with zero rect
  data. The real per-attack weighted-random selection logic itself is
  still not ported (too large), documented as a deliberate simplification.
- **Fixed (Twenty-eighth pass, "start from phase 1") — severe, confirmed
  packet desync bug.** `FootHoldInfo` (176) decoded a static
  `{id,x1,y1,x2,y2,prev,next}` shape with no string at all; the real wire
  is a dynamic-foothold state-change list (`objName, curState,
  footholdSns[]`, plus moving-state fields when moving) — would desync on
  the very first real packet. Also found a second, compounding bug while
  fixing it: the consumer called `FieldScene.LoadFootholds`, which
  **overwrote** the correctly-WZ-loaded static foothold/collision graph
  with garbage on every receipt — even after fixing the decode shape,
  this packet should never replace static geometry at all (it comes from
  the map's own WZ `foothold` node, a separate already-correct path).
  Deleted the now-dead `LoadFootholds` method; the decoded state is now
  log-only since this client has no dynamic-foothold movement/physics
  system yet to apply it to (separate, real, not-yet-built feature).
- **Fixed (Twenty-sixth pass, "start from phase 1")**: per-map screen
  effect (`CField::GetMapSpecificEffectUOL`, e.g. "Bubbling" on
  Aquarium-area maps) was never parsed from `Map.wz`'s info node. Verified
  the real key/value live (`effect: "Bubbling"`, resolves to
  `Effect.wz/MapEff.img/Bubbling`), added `MapInfo.Effect`, and triggered
  it once per field load via the already-wired
  `SkillEffectOverlay.PlayFullScreen` — no new rendering code needed.
- **Fixed (Tenth pass, "start from phase 1") — partial.** `/p`/`/party`
  chat fell through to plain `UserChat` instead of the real `GroupChat`
  (150) sender with a client-resolved online-member-id list. Re-checked
  live: `_partyCharIds` (already tracked for the minimap leader marker)
  is exactly that list for Party — wired it, falling back to `UserChat`
  when not in a party. `/b`/`/g`/`/a` remain genuinely blocked (guild
  entries have no charId, friend online-status isn't tracked, alliance
  membership isn't tracked at all) — re-verified, not stale.
- **Corrected a stale note (Tenth pass, "start from phase 1")**:
  `StatChanged`'s Cygnus/Aran/Evan extended-SP decode was flagged
  "architecturally blocked" (stateless decoder, no job context) — already
  fixed in a later pass (`FieldHandlers._currentJob` + `IsExtendSpJob`,
  code-commented "FIXED 2026-06-20"). Re-verified live, not stale.
- **Fixed (Twenty-fourth pass, "start from phase 1")**: `DropSprite
  .StartAbsorb`/`.Finished` had zero callers — every item pickup vanished
  instantly instead of animating toward the picker. Decompiled
  `CDropPool::OnDropLeaveField` to confirm which `leaveType` values are
  real pickups (2/3/5, already correctly enumerated). Wired
  `GameStage._onDropLeave` to play the absorb animation toward the local
  player when the pickup is theirs, falling back to instant removal
  otherwise. New `DropSprite.spec.ts` (previously untested).
- **Fixed (Second/Third passes, "start from phase 1")**: `GuildJoin`
  (invite)/`Kick`/`Admin`/`Expel`/`Level` all existed in `GameSender.ts`
  with zero callers — `GuildEntry` never carried the `charId` those
  senders need (already-decoded `GuildMember.characterId` was dropped at
  the `onGuildLoad` mapping site). Added `GuildEntry.charId`, made guild
  rows selectable, and added Invite/Kick/Admin/Expel/Level buttons to
  `UserList`'s Guild tab. `Withdraw` left unwired (real UI trigger
  unclear). Also did a deep re-investigation of the Memo (offline mail)
  protocol — found a real, previously-undocumented opcode (154, with
  confirmed claim/delete and list-request subtypes) for the inbox half,
  but the compose/send half's actual packet-send site still isn't found
  (its dialog's only caller traces to a cash-item-use path) — documented
  in `TODO_AUDIT.md`, not guessed at.
