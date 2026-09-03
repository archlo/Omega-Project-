## Hundred-and-eighty-third pass (ponytail social/effect restore slices)

**Implemented only the already-backed slices; skipped guessed ContiMove work.**

- **RestoreTownPortal status replay**: `TownPortalNotify` now stores the decoded town-portal status and replays it into the existing compact field HUD after `SetField` rebuilds the map. No new portal subsystem was added; pool visuals still come from `TownPortalEnter/Leave`.
- **Expedition invite/apply confirmations**: inbound expedition invites and expedition apply requests now use native `window.confirm()` and send the existing verified `ExpeditionResponseInvite` / `PartyAdverApplyResponse` packets. This avoids a speculative custom OG dialog while making the decoded packets actionable.
- **Mob catch visible slice**: `MobCatchEffect` now tries the existing `Effect/Catch.img` one-shot WZ animation at the mob position, falling back to the previous status line if the asset is unavailable.
- **Skipped**: the proposed ContiMove HUD was not implemented. Current local evidence identifies opcodes 359-362 as boss timer notifications, not ContiMove, so adding a ContiMove decoder/status path would be guessed behavior.
- Tests added: `tests/net/senders/GameSender.spec.ts` covers the expedition invite/apply response packet bodies used by the new confirm path.

## Hundred-and-eighty-second pass (CashItemResult status mapping, medal item IDs, NPC speak-key resolution)

**Implemented all portable pieces from the user's requested medium/blocked rows after deeper IDA/WZ tracing.**

- **CashItemResult 58-way sub-action consumer upgraded**: `CashShopHandlers` already had field-accurate typed decoding for the known `CCashShop::OnCashItemResult` sub-actions, but `CashShopStage` collapsed them to `Cash item result: sub 0xNN`. Added a field-mapped status formatter for successful/failed purchase, gift, locker, wishlist, coupon, slot expansion, package, gachapon, name-change/world-transfer, and Maple Point cases. This does not build the missing full Cash Shop UI or require `CashShop.nx`.
- **CUIMedalQuestInfo polish subset**: `QuestInfoService.MedalGroups()` now carries `viewMedalItem` IDs, and `/medals` renders quest rows as `Quest Name [medalItemId]`. This uses verified `Quest.nx/QuestInfo.img` `medalCategory` / `viewMedalItem` data without building the full OG medal-state/detail window.
- **NPC idle-chat deep correction + subset shipped**: `.nx` check still confirms only 2/1838 NPC images have `speak` nodes, but IDA showed the old blocker was incomplete: `CNpcTemplate::GetChatMessageList` (0x67B670) loads `StringPool(0x6AC)` via `IWzResMan::GetObjectA`, i.e. `String/Npc.img`, then resolves the Npc.wz labels (`n0`, `n1`) through `get_labeled_string(..., dwTemplateID)`. Real local `String.nx/Npc.img/2071010|2071011` contains the text. `NpcLook.Load()` now accepts a resolver and `GameStage` passes `NameService.NpcText`, so those two NPCs can show real idle chat instead of `n0`/`n1` labels.
- **Still blocked/deferred**: broad NPC ambient speech remains data-absent for 1836/1838 NPCs; no synthetic dialogue added. Full medal state buttons/gauges/detail polish and the full Cash Shop stage remain open.
- Tests added/updated: `tests/stages/CashShopStage.spec.ts`, `tests/character/NpcLook.spec.ts`, `tests/ui/game/MedalQuestInfo.spec.ts`.

## Hundred-and-eighty-first pass (EmotionBubble removal + animation backlog stale-row cleanup)

**Handled the two remaining `STATUS.md` blocked rows the user called out.**

- **`EmotionBubble.ts` removed**: Pass 140 already proved this file was wrong for v95: it read `Effect.wz/EmotionEffect.img`, but the only real `EmotionEffect.img` is in `Etc.nx`, its entries mostly have no frames, and the file's `default/wink/0..20` mapping did not match `CharacterRenderer`'s real face-emotion names. Grep confirmed zero importers/callers. Since face emotions are already correctly rendered through `CharLook.SetEmotion` + `CharacterRenderer` using `Character.wz/Face/<face>.img/<emotion>/<frame>/face`, keeping a dead broken alternate renderer was worse than leaving it documented.
- **`CAnimationDisplayer backlog / CParticleEffect` stale row corrected**: IDA was already investigated across multiple passes. This pass re-decompiled `CAnimationDisplayer::Effect_Tremble` (0x439A70), `USERSTATEINFO::Update` (0x439600), `FADEINFO::Update` (0x43B780), and `CParticleEffect::CParticleEffect` (0x58F5A0). The small tremble slice is already shipped as `GameCamera.Shake()` and wired from `FieldEffect` subtype 1; the fade slice is partially covered by projectile fade-out; `CParticleEffect` remains a real follow-animation/particle system, not a no-data blocker.
- **Deferred**: `USERSTATEINFO`'s three-layer start/repeat/end user-state effect and full `CParticleEffect` follow/emitter behavior remain open because there is no decoded trigger path wired to create those layer triplets yet. No speculative renderer added.

## Hundred-and-eightieth pass (CUIMedalQuestInfo portable subset)

**Implemented the safe `CUIMedalQuestInfo` subset from `IDA_NEW_GAPS.md` Section 5.** IDA confirms `CUIMedalQuestInfo` / `CUIMedalQuestInfoDetail` is a real separate medal-achievement quest window, and real `Quest.nx/QuestInfo.img` data marks medal quests with `medalCategory` / `viewMedalItem` (99 WZ entries in the local v95 data). Rather than build the full WZ-rendered medal window/detail art, this pass reuses the existing quest-log/detail path for those medal-marked quests.

- `QuestInfoService`: now parses `medalCategory` and `viewMedalItem`, and exposes `MedalGroups()` grouped by medal category.
- `MedalQuestInfo.ts`: new minimal panel for the previously zero-presence `CUIMedalQuestInfo` gap; wraps `QuestLog` and forwards row selection to the existing `QuestDetail` panel.
- `GameStage`: `/medals` opens the medal quest list; selecting a medal quest opens the same quest-detail view as the regular quest log.
- Test added: `tests/ui/game/MedalQuestInfo.spec.ts` covers opening medal groups and forwarding quest selection.
- Deferred: full OG medal-window layout, worn-medal display, medal state buttons, series gauges, and timer text remain unported UI polish.

**Stale blocker correction:** `STATUS.md` still listed `CUIEventAlarm` as blocked on StringPool text `0x1AC3`, but the Hundred-and-sixty-eighth pass already re-decompiled the real SetField path and shipped the packet-backed implementation (`nNotifierCheck` title/content strings + `EventAlarm.ts`). Corrected the open-gap docs; no duplicate code was added.

## ida_new_gaps.md §1–§4 re-verification (no changes; §5 owned by another agent)

Re-checked every concrete opcode in sections 1–4 against the OutHeader enum + router registrations across `src/net/handlers/*.ts`. **All present — no wire-coverage gaps.**

- **§1 CWvsContext (16 opcodes)**: 37, 40, 41, 72, 73, 82, 83, 115, 117, 118, 120, 122, 123, 129, 135, 136 — all registered.
- **§2 CUserPool (181–233)**: common 182–197 (chat history/adboard/item-effect/hit/tesla/follow/PQ reward/phase/recover), pets 198–205, dragons 206–208, remote 216/218/220/221/225–230 — all registered.
- **§3 CMobPool (290–309)**: stat set/reset/affected (290/291/293), catch/item effects (299/300), charge (302), escort (304–307), next-attack (308), mob-vs-mob (309) — all registered. 289 (OG default) and 296 (pool-level CRC; 297 handled) are non-opcodes, correctly absent.
- **§4 CNpcPool**: 317 NpcTemplatePacket — registered.

The file's own "Resolved in TS" header is accurate. Only §5 (architectural/UI-depth classes) remains open, and it's being handled separately.

## login.md opcodes 8–11 — decompile re-verification (no changes)

Re-decompiled the four handlers the user flagged and compared byte-for-byte against `LoginHandlers`. All four already correct; no code change.

- **11 `OnSelectWorldResult` (0x5dda00)**: per-char `GW_CharacterStat::Decode` + `AvatarLook::Decode` + onFamily byte + `if(Decode1) DecodeBuffer(0x10)` (= TS's hasRank byte + 4 rank ints, 16 bytes), then `m_bLoginOpt`(1) / `m_nSlotCount`(4) / `m_nBuyCharCount`(4). TS matches exactly.
- **10 `OnWorldInformation` (0x5da7f0)**: worldId, name, state, eventDesc, expRate(2), dropRate(2), blockCharCreation, channelCount + per-channel {name, userCount(4), worldId, channelId, adult}, balloonCount + per-balloon {x(2), y(2), message}. TS matches field-for-field.
- **9 `OnSelectCharacterByVACResult` (0x5de670)**: identical wire shape to SelectCharacterResult (result, sub, host[4], port(2), charId(4), authen, premiumArg(4)); TS routes it through `handleSelectCharacterResult(p, true)`. Correct.
- **8 `OnViewAllCharResult` (0x5de120)**: case 0 → worldId, count, loop{stat, look, `if(Decode1) DecodeBuffer(0x10)`}, loginOpt; case 1 → 2×Decode4; case 3/6/7 → `if(Decode1) DecodeStr`; case 2/4/5 → nothing. TS matches, and the per-char `m_anWorldID` is preserved (`WorldSelectStage._onViewAllCharResult` assigns `entry.worldId` per batch and accumulates across `m_nCountRelatedSvrs` batches).
- **Doc address typos noted**: login.md lists ViewAllChar=5DB000 (actually `OnCheckPinCodeResult`) and WorldInformation=5DE120 (actually ViewAllChar). Real addresses: ViewAllChar 0x5de120, WorldInformation 0x5da7f0. Handler names and TS impls are correct.

## login.md full audit — coverage sweep (v95 login subsystem)

Cross-checked every feature in `login.md` against `src/`. **Result: near-complete; one real gap fixed, the rest either already implemented or intentionally N/A on this private server.**

- **All 22 login opcodes (0–27)** — registered in `LoginHandlers` (CheckPassword, GuestID, AccountInfo, CheckUserLimit, SetAccount, ConfirmEULA, CheckPinCode, UpdatePinCode, ViewAllChar, SelectCharacterByVAC, WorldInformation, SelectWorld, SelectCharacter, CheckDuplicatedID, CreateNewCharacter, DeleteCharacter, EnableSPW, LatestConnectedWorld, RecommendWorldMessage, ExtraCharInfo, CheckSPW). ✓
- **Socket-level opcodes** — MigrateCommand(16), AliveReq(17), AuthenCodeChanged(18), AuthenMessage(19), CheckCrcResult(23) all handled (FieldHandlers/LoginHandlers). ✓
- **Crypto pipeline** — Shanda (`ShandaCrypto`), AES UserKey (`AesUserKey`), CIGCipher innoHash/bShuffle (`IgCipher`), seq-based per-packet IV (`PacketCipher`). ✓ (The doc's §7/§G "vulnerabilities" are inherent v95 protocol facts, not TODOs — the client must match them to talk to any v95 server.)
- **CheckPassword sender + result decode** — sender sends password + 16-byte machineId; result fully decodes accountId, gender, grade/subGrade, country, nexonClubId, purchaseExp, chat-block, dates, slot count, loginOpt, clientKey, EULA/PIC branches. ✓
- **Migration** — `MigrationCoordinator` = the OG `IssueConnect` reconnect-to-channel flow. ✓ (see the separate "Channel-migration entry fix" pass below for the SetField decode bug that was blocking actual entry.)
- **Login UI** — CUITitle equivalents present in `LoginStage`: ID/PW edit fields, Remember-ID, and all aux buttons (BtLoginIDLost, BtPasswdLost, BtNew, BtHomePage, BtQuit → URL/quit). PIN → `PinStage`, SPW → `CharSelectStage`. ✓
- **GAP FIXED — ID/PW length validation** (`login.md §E1`, `CUITitle::SetRet` 0x5ffec0): OG blocks the login packet unless ID length ≥ 4 and password length ≥ 5. `LoginStage.beginLogin` only checked for a non-empty ID, so too-short credentials were sent and bounced by the server. Added the min-length gates before connect.
- **Intentionally N/A (private server, no Nexon infrastructure)** — opcode 20 `CSecurityClient::OnPacket` (Nexon Security Module), and the Nexon Passport auth handshake (`LoginAuth`/`GetNexonPassport`/`DetachAuth`) in `SendCheckPasswordPacket`. This client authenticates directly against the private login server; there is no NXPM to talk to. Documented here so it's not re-flagged as missing.

## CLoginUtilDlg message codes + CLoginGradeWnd (login dialog audit)

**CLoginUtilDlg (0x5ee000 class; static dialogs `Error(long,ZRef<CDialog>*)` 0x5f0..., `Notice(long,…)`, `YesNo(long,…)→int`, `YesNo2(long)→int`).** These take a numeric message code and pop the login notice dialog; the code directly indexes `Login.img/Notice/text/<code>` — a canvas with the localized message baked in. Verified against real WZ: `UI.nx Login.img/Notice/text` has keys `0–64, 81–83, 91–95`. Every code the OG uses is present.

- **Verified OG code→event mapping** (`CLogin::OnEnableSPWResult` 0x5d2290, `OnCheckSPWResult` 0x5d23f0, both decompiled): success → `Notice(39)` if flag set else `Notice(40)`; EnableSPW failure `6/9→Error(18)`, `0x14→Error(93)`, `0x16→Error(91)`, `0x17→Error(92)`, other codes silent; CheckSPW reject → `Error(93)`. `m_bLoginOpt = (flag==0)+1`.
- **Gap found & fixed**: `CharSelectStage._onEnableSpwResult` / `_onCheckSpwFailed` showed ad-hoc English strings via `LoginNoticeOverlay` and didn't distinguish 39/40 or the 18/91/92/93 error codes. Now they call `SystemNoticeOverlay.Show(code)`, which renders the authentic `Notice/text/<code>` WZ image, using the exact OG code map. All referenced codes confirmed present in `UI.nx`.

**CLoginGradeWnd (0x5d1d10 ctor).** `TSingleton<CLoginGradeWnd>`, 0x80-byte grade/age-verification window with IGObj/IUIMsgHandler/ZRefCounted vftables. `OnCreate` (0x5ee690) is a bare `retn 4` — empty. Confirmed-moot: a do-nothing stub window, never populated; nothing to implement.

## Channel-migration entry fix (SetField migrate double-read of dwFlag)

**Root cause of "cannot go from character selection to in-game."** In `FieldHandlers.handleSetField`, the migrate branch read `args.dwFlag = p.readLong()` and *then* called `CharacterDataDecoder.Decode(p)`, which reads the CharacterData block starting with its own `flag` long. The migrate remainder of SetField (opcode 141) **is** that CharacterData block — its leading long is the flag — so the client consumed 8 bytes twice. Every subsequent field (CharacterStat, AvatarLook, equips) desynced, the reader ran off the buffer, `handleSetField` threw, the exception was swallowed by `drainInbound`'s try/catch, and `onSetField` never fired → GameStage never loaded the field → black screen after char select.

- **Server side confirmed correct** (`server/src/world/field/StagePacket.ts`): migrate branch writes seeds×3, `writeLong(flag)`, `writeByte(combatOrders)`, `writeBoolean(hasRemoveSn)`, then CharacterStat + AvatarLook — exactly what `CharacterDataDecoder.Decode` expects. Channel dispatch (channelServer.ts `MIGRATE_IN`→`enterField`→`setField`) and opcodes (MigrateIn=20, SetField=141) all match.
- **Fix**: removed the redundant `p.readLong()`; `args.dwFlag` is now taken from `characterData.flag` after decode. Updated the two `FieldHandlers.spec.ts` migrate tests, which had encoded the phantom extra long (modeling the buggy double-read) — removed it and set the `dwFlag` assertions to the real CharacterData flag.
- **Unrelated pre-existing failure noted**: `tests/character/ItemEffectOverlay.spec.ts` (particle emitter count 2 vs 1) fails independently of this change.

## Hundred-and-seventy-ninth pass (CUserRemote wire-shape correction)

**Decompiled all 10 CUserRemote handlers from the OG `CUserPool::OnUserRemotePacket` dispatch (0x94B390) and corrected 5 field-shape bugs that would cause packet-stream desync. The existing TS handlers were either guessed from the opcode name or copied from the wrong dispatch context — same root cause as the Hundred-and-seventy-eighth pass's fabricated pet shapes.**

- **OG dispatch verified** (`CUserPool::OnUserRemotePacket` 0x94B390): charId decoded once at pool level, then two switch blocks dispatch per opcode. Block 1 (delayed-load-gated) handles 211–221, 224, 230; Block 2 (always-processed) handles 210, 222–223, 225–229. TS handlers correctly consume charId first in each handler body.
- **`OnMovingShootAttackPrepare` (216) — FIXED**: was reading `charId + skillId` (two ints). Real shape (0x953BC0): `level(u8) + isCharging(u8) + [if charging: skillId(u32)] + actionPacked(u16: bit15=facingLeft, bits0-14=nAction) + trailing(u8)`. Both `facingLeft` and `nAction` are now exposed in the callback for visual alignment.
- **`OnHit` (218) — FIXED**: was reading `charId + damage` (int after charId consuming 4 bytes). Real shape (0x954C50): `attackIdx(u8) + nDamage(u32)`. The byte/int misalignment would corrupt subsequent reads. Full OG handler is ~1112 bytes with mob interaction/stance/damage reduction — this port reads only the shared prefix for damage display.
- **`OnShowUpgradeTombEffect` (221) — FIXED**: was reading `result: u8`. Real shape (0x954090): `value(u32) + posX(u32) + posY(u32)` — three ints, not one byte. The byte/int misalignment would corrupt every tomb effect packet.
- **`OnReceiveHP` (227) — FIXED**: was reading `hp: u32`. Real shape (0x953F50): `curHP(u32) + maxHP(u32)`. Party HP gauge = `100 * curHP / maxHP`.
- **`OnThrowGrenade` (230) — FIXED**: was reading `skillId: u32` alone. Real shape (0x954030): `posX(u32) + posY(u32) + tKeyDown(u32) + skillId(u32) + unk(u32)` — five ints, not one. Missing 16 bytes would desync every grenade packet.
- **`OnGuildMarkChanged` (229) — FIXED**: was reading an extra `guildId: u32` that doesn't exist in the OG packet (0x953FE0). Real shape: `markBg(u16) + markBgColor(u8) + mark(u16) + markColor(u8)` only.
- **`OnSetActiveEffectItem` (220) — CONFIRMED CORRECT**: OG reads `itemId(Decode4)` only; TS reads `charId + itemId` (charId is the TS dispatch convention).
- **`OnSetTemporaryStat`/`OnResetTemporaryStat` (225/226) — DOCUMENTED**: OG uses UINT128 (16-byte) stat masks via `SecondaryStat::DecodeForRemote`/`DecodeBuffer(16)`. TS reads 8-byte `long` masks. Full `SecondaryStat` system not ported; simplified read documented with inline comments.
- **Tests**: `IdaNewGaps.spec.ts` updated — CUserPool gap test now covers all 5 corrected shapes (moving shoot, tomb effect, receive HP, grenade, guild mark, hit) with byte-exact wire representations matching the OG decompile field order.
- **tsc**: clean. **vitest**: 141 files, 1067 tests, 1 pre-existing failure (`ItemEffectOverlay.spec.ts` particle count — unrelated to this pass).

---

**IDA_NEW_GAPS.md Section 2a listed opcodes 198-205 as "all decompiled," but
re-decompiling `CUser::OnPetPacket` (0x8e02a0) against the real v95 IDB found
the existing TS decode shapes (`PetAction`/`PetAttack`/`PetMove`/
`PetActionSpeak`/`PetActionExcl`/`PetNameChange`/`PetCharged`/`PetInteract`,
each with fields like `unk1`/`targetCount`/`snackItemId`) didn't match the OG
switch or any `CPet::On*` method body — they were fabricated, not decompiled.
This is a correctness bug (wrong field decode, not missing coverage), fixed
in place rather than left as a duplicate "real" set alongside the fake one.**

- **Real OG dispatch** (`CUser::OnPetPacket` 0x8e02a0): 198 and 200 both call
  `CUser::OnPetActivated` (summon/remove); only 198 additionally calls
  `PetInterActWithUserAction(0, petIdx)` right after. 199 is a distinct
  `OnPetEvol` (always re-summons an evolved pet at the same slot). 201-205
  share one `petIdx` byte decoded by `OnPetPacket` itself before dispatching
  to `CPet::OnMove`/`OnAction`/`OnNameChanged`/`OnLoadExceptionList`/
  `OnActionCommand`.
- **`OpCodes.ts`**: renamed/recommented 198-205 to `PetActivated`, `PetEvol`,
  `PetActivatedSilent`, `PetMove`, `PetAction`, `PetNameChange`,
  `PetLoadExceptionList`, `PetActionCommand` with real per-field shapes from
  the decompile (addresses cited inline).
- **`PacketArgs.ts`**: replaced the 8 fabricated `Pet*Args` interfaces with
  ones matching `CPet::Init`'s real field order (templateId, name, 8-byte
  locker SN, x/y shorts, moveAction byte, foothold short).
- **`FieldHandlers.ts`**: rewrote all 8 handler bodies against the verified
  decode order; `handlePetActivated` is shared for 198/200 (`triggerInteract`
  flag controls the extra `PetInterActWithUserAction` callback).
- **`GameStage.ts`**: pets are now keyed by `petIdx` (slot 0..2, OG
  `CUser::m_apPet[3]`) instead of the old single-pet-per-owner guess.
  `_pets` is `Map<number, (Pet|null)[]>`; added `_petAt`, `_applyPetActivated`,
  `_applyPetEvol`; removed the old `_ensureRemotePet` template-id guess.
  Render/update loops null-guard the now-holey per-owner arrays.
- **`Pet.ts`/`PetLook.ts`**: added `LockerSN`/`ExceptionList`/
  `SetExceptionList` (OG: `OnLoadExceptionList` only applies when the SN
  matches), `PlayReaction()` (generic success/fail reaction for
  `PetActionCommand`), and `PetLook.ShowNameTag` (OG: `OnNameChanged`'s
  show/hide byte).
- **Deferred, documented**: `CPet::OnActionCommand`'s WZ `CPetTemplate`
  interaction/food-reaction flavor text and exact animation selection isn't
  ported (no `CPetTemplate` WZ reader exists in this client) — bytes are
  decoded correctly to keep the stream aligned, but the reaction is a generic
  success/fail animation, not the real randomized WZ text.
- **Tests**: `OpCodes.spec.ts` and `IdaNewGaps.spec.ts` updated to the real
  shapes; added a `PetActivated`/`PetEvol` decode regression.
- **tsc**: clean. **vitest**: 141 files, 1066 tests, all pass.

## Hundred-and-seventy-seventh pass (CItemEffectManager active effect item loop)

**Implemented a narrow, packet-backed slice of the `CParticleEffect / CItemEffectManager` gap. Remote `UserSetActiveEffectItem` was already decoded and already resolved `Effect.nx/ItemEff.img/<itemId>/0`, but played it once. This pass makes active effect items stateful: the effect loops on the caster until the server clears it with itemId 0.**

- **SkillEffectOverlay keyed loops**: added `PlayLoopAtCaster()` / `CancelLoopAtCaster()` so persistent caster effects can coexist with one-shot skill effects and prepare-hold effects.
- **GameStage wiring**: `onUserSetActiveEffectItem` now starts/replaces the keyed `activeItem` loop for decoded item IDs and cancels it on itemId 0, while keeping the existing status badge fallback.
- **Test added**: `SkillEffectOverlay.spec.ts` covers loop advancement and keyed cancellation. Deferred: full `CParticleEffect` emitter physics and `CItemEffectManager` item-category behavior beyond decoded active effect item state.

## Hundred-and-seventy-sixth pass (CSequencedKeyMan gameplay wiring)

**Wired the existing verified `CSequencedKeyMan` subset into live gameplay. The dead-file implementation and tests already covered OG's portable Double/Triple Stab tap-window behavior; this pass connects it to the attack key and learned-skill dispatch without attempting the unrecovered full finisher table.**

- **Held-key edge detection**: `SequencedKeyMan.observeAttackState()` derives down/up transitions from the current held-key state, matching the input surface `GameStage` actually has.
- **GameStage wiring**: local attack-key taps during an active swing now reserve Double/Triple Stab and call the existing skill-use path once the swing ends, using the player's learned skill level from `_skillRecords`.
- **Reset on field load**: combo sequence state clears when the field is reconstructed.
- **Test added**: `SequencedKeyMan.spec.ts` covers held-key edge detection. Deferred: the large `CSequencedKeyMan::Restore` per-job finisher table and Aran/Mihile/etc. specialized finishers remain unported.

## Hundred-and-seventy-fifth pass (CField_LimitedView fieldType 9 overlay)

**Implemented the confirmed `CField_LimitedView` rendering slice from the Twenty-seventh pass. Field type 9 maps now get a persistent black overlay with circular cutouts around the local player and remote users, matching the documented OG behavior without adding any new protocol assumptions.**

- **New renderer**: `src/character/LimitedViewOverlay.ts` draws a full-screen black overlay and cuts circular view ranges around supplied screen positions.
- **GameStage wiring**: when the current map's parsed WZ `info/fieldType` is `9`, `GameStage.draw()` feeds local/remote character positions into the overlay every frame; non-limited maps hide it.
- **Test added**: `LimitedViewOverlay.spec.ts` covers visible/hidden behavior for point lists.

## Hundred-and-seventy-fourth pass (projectile fade-out subset)

**Implemented the portable `CFadeoutBullet` visual subset on the existing projectile path. The Ninetieth pass identified `CFadeoutBullet` as a real rendering variant with the same surface as `ProjectileOverlay`; this pass adds optional fade-out support and enables it for existing remote shoot/magic projectile visuals.**

- **ProjectileOverlay fade flag**: `Spawn()` now accepts an optional `fadeOut` boolean. When enabled, sprite/fallback projectile alpha ramps from 1 to 0 over the projectile lifetime.
- **GameStage wiring**: decoded remote shoot/magic projectile visuals now pass `fadeOut=true`, so projectile balls fade instead of popping off at expiry. This does not attempt `CVecProcess` curved/oscillating paths or any unverified WZ asset distinction.
- **Test added**: `ProjectileOverlay.spec.ts` pins alpha fading at mid-flight.

## Hundred-and-seventy-third pass (OpenSkillGuide display panel)

**Implemented the safe subset of the `Skill guide window` gap. Opcode 262 was already registered as a no-op because `CUserLocal::OnOpenSkillGuide` exists in OG but the packet body/deep UI behavior is not yet decoded. This pass preserves the no-guessing rule: the handler reads no fields, fires a callback, and opens a small display panel confirming the server-triggered guide event.**

- **Wire callback added**: `FieldHandlers.onOpenSkillGuide` fires when `OutHeader.OpenSkillGuide` arrives. No payload bytes are decoded because the exact shape is still unconfirmed.
- **UI added**: new `src/ui/game/SkillGuide.ts` shows a compact skill-guide notice and points the player to the existing `SkillBook`. It closes with Escape or the top-right close hotspot.
- **GameStage wiring**: `fh.onOpenSkillGuide` opens the panel. Inline comment marks the unconfirmed payload/deep guide content as deferred.
- **Tests added**: `FieldHandlers.spec.ts` covers opcode routing; `SkillGuide.spec.ts` covers open/close behavior.

## Hundred-and-seventy-second pass (Ariant Arena raw HUD + ChainLightning visual subset)

**Implemented two more verified gaps with narrow, non-speculative scope. Ariant Arena opcode 354 now routes to visible HUD/status feedback as raw payload because its exact field layout is not yet confirmed. ChainLightning now has a portable common-case visual for v95 Arch Mage I/L skill 2221006 using the documented straight segmented-line behavior.**

- **Ariant Arena result wiring**: `OutHeader.AriantArenaResult` already existed, but `EventHandlers` did not register it. Added `onAriantArenaResult` raw-payload passthrough and `GameStage` wiring to `FieldSubgameHud.SetMessage()` / status messenger. This follows the existing Coconut/GuildBoss pattern: real opcode, unconfirmed payload fields, no guessed decode.
- **ChainLightning subset**: `ProjectileOverlay.SpawnChainLightning()` draws straight ~48px segmented links through decoded target positions and expires them quickly. `GameStage._onUserAttack()` triggers it for remote magic attack skill `2221006` (v95 Arch Mage I/L Chain Lightning) when target positions are available. Deferred: OG WZ ball UOL sprite variants (`sBallUOL` suffix variants) until the exact asset path is verified; no full `CAnimationDisplayer` abstraction added.
- **Tests updated**: `EventHandlers.spec.ts` covers Ariant raw payload routing; `ProjectileOverlay.spec.ts` covers chain-lightning display/expiry.

## Hundred-and-seventy-first pass (dynamic skill-effect facing)

**Finished the small `Skill flip on caster facing change` gap. The existing `SkillEffectOverlay` already re-tracked caster position each frame; the missing piece was re-tracking caster facing instead of using only the facing captured at effect spawn.**

- **Implementation**: `SkillEffectOverlay.RebuildWorldDisplay()` now accepts an optional `facingLeft` alongside the resolved screen position and uses it when drawing the current frame, falling back to the spawn-time facing for old/position-only callers.
- **GameStage wiring**: the single skill-effect rebuild callback now returns current local/remote caster facing from `PlayerController` / `OtherCharLook`, so world-anchored skill effects mirror if the caster turns mid-animation.
- **Test added**: `tests/character/SkillEffectOverlay.spec.ts` pins that live callback facing overrides the captured facing.

## Hundred-and-seventieth pass (HP/MP warning flash)

**Resolved the small `HP/MP warning flash` gap after re-checking the blocker in IDA. The earlier pass had already decompiled `CUIStatusBar::SetNumberValue`; this pass confirmed the missing `CConfig` defaults in `CConfig::LoadGlobal` and wired the existing system-option sliders into the live status bar.**

- **IDA default recovered**: `CConfig::LoadGlobal` (0x4B51B0) loads `nSysOpt_HPFlash` from StringPool `0xB97` and `nSysOpt_MPFlash` from `0xB98`, both with default `10` and range `0..19`. `CUIStatusBar::SetNumberValue` (0x873D50) multiplies each setting by 5, so the default warning threshold is 50% HP/MP.
- **StatusBar warning behavior implemented**: `StatusBar.update()` now mirrors OG decrease detection: setting `0` disables the warning, otherwise it flashes only when HP/MP decreases while below `5 * setting` percent, and resets the baseline when the value is back above threshold. The visible effect is a 500ms bar pulse fallback over the HP/MP gauge.
- **Settings wired**: `UserSettings`/`SettingsStore` now persist `hpFlash` and `mpFlash`; `GameStage` loads/saves them through the already-existing `OptionMenu` HP/MP flash sliders and applies them to `StatusBar` immediately.
- **Test added**: `tests/ui/game/StatusBar.spec.ts` pins the OG threshold/decrease/disable behavior.

## Hundred-and-sixty-ninth pass (mob stat decode: UINT128 flag, MobSuspendReset isSuspended, MobAffected duration)

**Section 5 IDA_NEW_GAPS.md follow-up. Decompiled four mob-stat handlers and found three packet-alignment bugs: UINT128 flag was being read as 64 bits, MobSuspendReset was missing its isSuspended byte, and MobAffected was missing its duration short.**

- **`CMob::OnStatSet` / `OnStatReset` UINT128 fix**: OG (decompile/652660.c, 652780.c) calls `DecodeBuffer(16)` for a 16-byte (128-bit) stat flag. TS was calling `readLong()` once (8 bytes) — the upper 64 bits were silently consumed into the stats payload. Fixed: added `statMaskHigh = p.readLong()` after `statMask`. `MobStatSetArgs` / `MobStatResetArgs` in `PacketArgs.ts` updated to carry `statMaskHigh: bigint`. `describeMobStatMask` in `GameStage.ts` updated to accept `maskHigh` and combine: `combined = maskLow | (maskHigh << 64n)`. IDA: lower 64 bits = common stats (PAD through Stun/Freeze/Doom); upper 64 bits = extended/rare stats.
- **`CMob::OnSuspendReset` missing Decode1 fix**: OG (decompile/64ACB0.c) reads `mobId = Decode4` then `isSuspended = Decode1`. TS was reading only mobId. Fixed: added `const isSuspended = p.readByte() !== 0`. `MobSuspendResetArgs` updated.
- **`CMob::OnAffected` missing duration fix**: OG (decompile/644400.c) reads `mobId = Decode4 + skillId = Decode4 + duration = Decode2`. TS was reading only mobId + skillId. Fixed: added `const duration = p.readShort()`. `MobAffectedArgs` updated.
- **Test updated**: `IdaNewGaps.spec.ts` `MobStatSet` test packet now writes two longs (`statMask` + `statMaskHigh = 0n`); expected result includes `statMaskHigh: 0n`.
- **tsc**: clean. **vitest**: 137 files, 1047 tests, all pass.

## Hundred-and-sixty-eighth pass (CUIEventAlarm + SetField nNotifierCheck decode fix)

**Investigated IDA_NEW_GAPS.md Section 5 ("long-term work") per CLAUDE.md rules. CUIEventAlarm (11 methods, zero src/ presence) turned out fully shippable: full OG decompile recovered (decompile/71A0A0.c, 7AAB70.c–7AAD90.c). In the process found a packet-alignment bug: the SetField handler was reading nNotifierCheck as 'mapType', which would corrupt subsequent reads whenever an event field sends nNotifierCheck > 0.**

- **SetField `nNotifierCheck` decode fix**: `handleSetField` was reading `Decode2` as `mapType`. OG (decompile/71A0A0.c) names this `nNotifierCheck` — the count of event-alarm content strings. When > 0, the notifier title + content lines must be decoded or the packet stream desyncs. Fixed: renamed to `nNotifierCheck`, added conditional decode loop (title string + nNotifierCheck strings), stored in `SetFieldArgs.eventAlarm`. Tests updated (`mapType` → `nNotifierCheck`). `PacketArgs.ts` corrected.
- **CUIEventAlarm implemented** (`src/ui/game/EventAlarm.ts` — new file): timed popup panel, shown when SetField carries event-alarm data. OG geometry: 266px wide, 44px minimum height, text at (30,22). Auto-dismisses after 6 s (OG `m_tEnd` timer source not in dump; 6 s is a reasonable approximation). Wired in `GameStage` via `fh.onEventAlarm`.
- **OG decompile summary**: `CUIEventAlarm::SetEventAlarm` (0x7AAC30) analyzes text with 200px width via CTextAnalyzer. `Layout_GEN` (0x7AAB70) sets fixed wndWidth=266, wndHeight=m_ctHeight+44, left=30, top=22. `CreateEventAlarm` (0x7AABA0) positions near quest dialog. `Update` (0x7AAC00) calls `SetRet(2)` when timer expires. `Draw` (0x7AAD90) clips text to (30,22,198,m_ctHeight).
- **tsc**: clean. **vitest**: 137 files, 1047 tests, all pass.

## Hundred-and-sixty-seventh pass (guild incremental update wiring)

**Wired the remaining GuildResult callbacks in GameStage.ts: MemberJoin (OG case 41) and Leave/Expel (OG case 46/49). Added `addGuildMember` and `removeGuildMember` incremental update paths to `UserList`. All guild panel updates now happen without a full reload for join/leave events.**

- **`FieldHandlers.ts` `onGuildMemberJoin`**: decodes `guildId:int + charId:int + name:str + job:int + level:int + grade:int + online:int` (decompile/A0D3B0.c case 41); fires callback with parsed values.
- **`FieldHandlers.ts` `onGuildMemberLeave`**: decodes `guildId:int + charId:int + name:str` (decompile/A0D3B0.c case 46/49); fires `onGuildMemberLeave(charId)` then `onGuildLoad?.(null)` for full panel refresh.
- **`UserList.ts` `addGuildMember`**: appends entry and rebuilds panel; no-ops if charId already present.
- **`UserList.ts` `removeGuildMember`**: splices entry by charId and rebuilds panel; adjusts selection index.
- **`GameStage.ts`**: wired `fh.onGuildMemberJoin` → `userList.addGuildMember` (grade 1 → 'Master', else 'Member'); wired `fh.onGuildMemberLeave` → `userList.removeGuildMember`.
- **tsc**: clean. **vitest**: 137 files, 1047 tests, all pass.

## Hundred-and-sixty-sixth pass (handler gap sweep from OG audit)

**Audited console.log/debug sites and missing sub-type handlers identified by the OG audit. Fixed decode errors, wired missing callbacks, and added incremental guild/friend update paths.**

- **`FieldHandlers.ts` skip(8) citation**: `GUILDDATA::SKILLENTRY` `dateExpire` field — `DecodeBuffer(buf, 8u)` confirmed via decompile/4F8A10.c.
- **`ItemProtectExpire` / `ItemExpireReplace` callbacks**: Both decoded correctly but console.debug only. Added `onItemProtectExpire` + `onItemExpireReplace` callbacks; wired in `GameStage` via `_statusMessenger.showLoot` (OG: ChatLogAdd type=12, decompile/9F82E0.c + 9FE7A0.c).
- **Removed stale console.log noise**: `SetField received` (entry debug) and `MobChangeController` informational log.
- **Whisper case 9/72 decode fix**: OG (decompile/5448A0.c) reads `string + byte + int` for both "not found" and "in cash shop" cases; TS was reading only the string — missing 5 bytes, corrupting subsequent packet reads. Fixed and wired to `onSystemMessage`.
- **`FriendResult UpdateFriend` (case 8)**: Decode was correct but console.debug only. Added `onFriendUpdate` callback, `UserList.updateFriendEntry`, wired in `GameStage` (OG: decompile/A125D0.c).
- **`GuildResult OnlineStatus` (case 63)**: Decode was correct but console.debug only. Added `onGuildMemberOnline` callback, `UserList.updateGuildMemberOnline`, wired in `GameStage` (OG: decompile/A0D3B0.c case 63).
- **`GuildResult NoticeChange` (case 71)**: Missing entirely. Added `GuildResultType.NoticeChange = 71` to Enums.ts; handler decodes `guildId:int + notice:string` and shows via `onSystemMessage` (OG: ChatLogAdd type=12, decompile/A0D3B0.c case 71).
- **`GuildResult PointLevel` (case 75)**: console.debug removed; OG (decompile/A0D3B0.c case 75) just updates `m_guild.nPoint/nLevel` in-memory — no visible UI action. Now reads and discards silently.
- **tsc**: clean. **vitest**: 136 files, 1044 tests, all pass.

## Hundred-and-sixty-fifth pass (OG audit full opcode parity)

**Ran `tools/audit/og-v95-audit.mjs` against the OG v95 dump. Found 37 MISSING opcodes, 5 unregistered `OutHeader` names, and 5 log-only `GameStage` callbacks. All resolved; audit now shows 0 MISSING.**

- **37 → 0 MISSING opcodes:**
  - `OpCodes.ts`: Added the complete CUserLocal::OnPacket range (231-275, decompile/9340C0.c), `FieldNop196` (CField dead case, decompile/546D50.c), and `TournamentNop378` (CField_Tournament dead case, decompile/563780.c).
  - `FieldHandlers.ts`: Stub-registered `QuestResult`, `OpenSkillGuide`, `VengeanceSkillApply`, `QuestGuideResult`, 36 CUserLocal stubs (SitResult → DeliveryQuest), and `FieldNop196`.
  - `TournamentHandlers.ts`: Stub-registered `TournamentNop378`.
  - `LoginHandlers.ts`: Stub-registered `DeleteCharacterOTPRequest` (opcode 22, confirmed dead in OG switch default target).
- **5 log-only callbacks** in `GameStage.ts` replaced with `() => {}` no-op stubs — all OG-confirmed blocked (Maker payload branches on `m_nRecipeClass`; delivery is NPC-script flow; EnchantSkill send site beyond dump depth; MiracleCube has no OG symbols).
- **skip() citations** in `CashShopHandlers.ts` updated: GW_CashItemInfo = 0x37 bytes confirmed via `DecodeBuffer` in decompile/495820.c; OneADayInfo = 12 bytes per item confirmed via decompile/495950.c + 494470.c memcpy.
- **tsc**: clean. **vitest**: 136 files, 1044 tests, all pass.

## Hundred-and-sixty-fourth pass (implementation): SetField CharacterData now drives AvatarLook

**Fixed the live entry/render bug where the local character could appear as a blank body with no hair, face, clothes, or weapon. IDA showed v95 `CStage::OnSetField` calls `CClientOptMan::DecodeOpt`, then decodes full `CharacterData`; it does not send a direct `gender/skin + CharacterStat + AvatarLook` block. The TS handler now follows that shape and derives the field `AvatarLook` from `CharacterStat`, regular equips, and cash equips.**

- `src/net/handlers/FieldHandlers.ts`: `handleSetField` now reads the client-option count, skips each `{ type:int, value:int }` pair, decodes full `CharacterData` via the existing decoder, and builds `SetFieldArgs.look` from the decoded stat/equip lists.
- `src/net/handlers/AvatarCodec.ts`: added `FromCharacterData()` and fixed `PopulateEquipsFromInventory()` to convert OG equip slots into body-part slots; regular equips fill slots 1..59, cash equips override matching non-weapon slots into `hairEquip`/`unseenEquip`, and cash weapon becomes `weaponStickerId`.
- `tests/net/handlers/FieldHandlers.spec.ts`: the full migrate `SetField` avatar/equip test now includes a non-empty option map and real `CharacterData` with regular/cash equip lists, pinning both alignment and avatar derivation.
- IDA verification: `CClientOptMan::DecodeOpt` (`0x4ACB30`) decodes `ushort count` then `count` pairs of `Decode4(type)` and `Decode4(value)`; `CStage::OnSetField` (`0x71A0A0`) calls it before channel ID.
- IDA verification: `AvatarLook::Load` (`0x4F6E70`) copies stat gender/skin/face/hair, uses regular equips for body parts, uses cash equips as visible overrides except weapon, stores regular overridden items in `unseenEquip`, and stores cash weapon as `weaponStickerId`.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (136 files / 1044 tests).

Follow-up in the same pass:

- `src/stages/GameStage.ts`: `StatChanged` now also updates the live local `AvatarLook` skin/face/hair fields, and `InventoryOperation` equip/cash-equip changes now update the rendered local avatar in addition to the equipment panel. Cash equip positions `-101..-159` are normalized to body parts, cash clothing restores the regular item from `unseenEquip` on removal, and cash weapon updates `weaponStickerId`.
- `tests/stages/GameStageAvatarOps.spec.ts`: added regression coverage for cash top override/restore and cash weapon move using the correct cash inventory tab (`invType - 1`, tab 4).
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (137 files / 1046 tests).

Second follow-up in the same pass:

- `src/character/OtherCharLook.ts`: `UpdateAvatar` now handles the fallback/no-look remote-enter path by creating an inner `CharLook`, loading the already-known WZ context if available, and assigning the new look. Before this, a remote user that entered as a placeholder stayed a placeholder forever even after `UserAvatarModified` delivered a real `AvatarLook`.
- `tests/character/AvatarWiring.spec.ts`: added coverage for placeholder-to-real-avatar transition on late `UpdateAvatar`.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (137 files / 1047 tests).

## Hundred-and-fifty-eighth pass (verification): stale SkillPrepare/CDamageMeter medium gaps corrected

**Continued the medium-gap cleanup and found two more stale `STATUS.md` rows. `SkillPrepare/SkillCancel visual` was implemented in the Hundred-and-twenty-second pass, and `CDamageMeter` is no longer zero-presence because `BattleRecord.ts` now implements the battle-record damage aggregation path with tests. No duplicate code was added.**

- `src/stages/GameStage.ts`: confirmed `fh.onSkillPrepare` resolves skill `keyDown`/effect data and calls `SkillEffectOverlay.PlayHoldAtCaster()`, while `fh.onSkillCancel` calls `CancelHold()`.
- `src/character/SkillEffectOverlay.ts`: confirmed hold animations play once and keep the final frame until cancelled, matching the documented OG prepare-animation behavior.
- `tests/net/handlers/SkillBuff.spec.ts`: already covers `SkillPrepare`/`SkillCancel` packet decode.
- `src/ui/game/BattleRecord.ts` + `tests/ui/game/BattleRecord.spec.ts`: confirmed battle-record damage totals/min/max/average/critical/miss tracking and server calc toggling are implemented/tested.
- `STATUS.md`: marked both medium rows as shipped/stable or partial-covered instead of open.
- `IDA_NEW_GAPS.md`: corrected the stale `CBattleRecordMan` architectural row from “wire decoder only / No manager” to the current partial manager/UI coverage.
- Verification: no code changed in this pass after the previous full run; latest `npx tsc --noEmit` passed and latest `npx vitest run` passed (136 files / 1044 tests).

## Hundred-and-fifty-seventh pass (verification): stale PartySearch/GuildBBS medium gaps corrected

**Re-checked the `STATUS.md` medium list after the IDA_NEW_GAPS work and found two stale entries: `GuildBBS panel` and `Party search UI` were already implemented and wired. This pass added the missing PartySearch UI regression coverage and corrected the docs instead of writing duplicate panels.**

- `src/ui/game/GuildBBS.ts` + `tests/ui/game/GuildBBS.spec.ts` + `tests/net/handlers/GuildBBS.spec.ts`: confirmed already shipped/wired GuildBBS list/view/comment/register/delete coverage.
- `src/ui/game/PartySearchDialog.ts` + `src/stages/GameStage.ts`: confirmed `/partysearch`/`/lfg` opens the dialog, buttons send verified PartyAdver requests, and PartyAdver results populate the list.
- `tests/ui/game/PartySearchDialog.spec.ts`: added coverage for open/empty state, advert row selection/apply callback, and Search/Register prompt callbacks.
- `STATUS.md`: marked both medium entries shipped/stale-corrected.
- `IDA_NEW_GAPS.md`: added a follow-up note that decoded social UI consumers for GuildBBS and PartySearch are now covered.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (136 files / 1044 tests).

## Hundred-and-fifty-sixth pass (implementation): Mob WZ head anchor for damage numbers

**Shipped the `Mob head-anchor for damage numbers` small gap. `MobLook` already loads WZ frame sprites, so the fix is the smallest usable anchor: derive the current frame's top/center from WZ `lt/rb` when present, fall back to origin/size, and keep the old placeholder offset only for unloaded mobs.**

- `src/character/MobLook.ts`: added `HeadPosition`, using the current animation frame's WZ bounds and mirroring X when the mob faces left.
- `src/stages/GameStage.ts`: local melee and decoded remote attack damage numbers now spawn at `mob.HeadPosition` instead of `mob.Position.y - 60`.
- `tests/character/MobLook.spec.ts`: covers fallback, WZ-frame top anchor, and left-facing mirrored center.
- `IDA_NEW_GAPS.md`: added a follow-up status note that decoded mob/user attack visual placement now uses the new WZ-derived mob head anchor.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (135 files / 1041 tests).

## Hundred-and-fifty-fifth pass (implementation): Chat item links clickable in ChatBar

**Shipped the small `Chat item links not clickable` status gap without replacing the plain Pixi `Text` chat log. `ChatBar` now keeps minimal item-link hit ranges when adding Maple-tagged lines and exposes an `onItemLink(itemId)` callback.**

- `src/ui/game/ChatBar.ts`: added `addMapleLine()` for `#i/#v/#e` item tags, stores display text plus item hit ranges, and dispatches clicks through `onItemLink`.
- `src/stages/GameStage.ts`: group and whisper chat now add Maple-tagged lines to `ChatBar` with clickable item links; clicking one opens a simple item notice with resolved name/id. Existing status toasts still use text substitution.
- `tests/ui/game/ChatBar.spec.ts`: covers item-tag display/click behavior and duplicate item tags mapping to the correct item ID.
- Deliberately not implemented: full OG rich text spans/icons/skill links/progress bars in the chat log. This pass only closes item-link clickability for the already-parsed item tag family.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (134 files / 1038 tests).

## Hundred-and-fifty-fourth pass (verification): IDA_NEW_GAPS.md opcode coverage locked down

**Re-opened `IDA_NEW_GAPS.md` and found it was stale: the listed opcode gaps had already been ported into `OpCodes.ts`, `FieldHandlers.ts`, `PacketArgs.ts`, and `GameStage.ts` by later passes. This pass shipped the missing regression coverage and marked the gap document resolved instead of adding duplicate decoder code.**

- `tests/net/packet/OpCodes.spec.ts`: added assertions for every concrete opcode listed in `IDA_NEW_GAPS.md` across CWvsContext, CUserPool common/remote, pet/dragon, CMobPool, and CNpcPool sections.
- `tests/net/handlers/IdaNewGaps.spec.ts`: added representative dispatch/decode coverage for each major gap group: CWvsContext pure-gap packets, CUserPool common/remote packets, pet/dragon packets, mob stat payloads, and NPC template updates.
- `IDA_NEW_GAPS.md`: added a current-status note that the file's wire gaps are resolved and only deeper UI/effect subsystem work remains.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (134 files / 1036 tests).

## Hundred-and-fifty-third pass (implementation): CAdminShopDlg decoded-state panel

**Shipped the portable `CAdminShopDlg` UI slice from the large dialog list without guessing the still-opaque item tail. Existing protocol work already decoded `AdminShopResult` as `npcTemplateId + itemCount` and `AdminShopDlg` actions with reopen eligibility; this pass gives those decoded packets an actual panel consumer.**

- `src/ui/game/AdminShop.ts`: new compact Admin Shop panel. Uses `UI.nx/UIWindow.img/Admin/Block/backgrnd` when present, falls back to simple chrome, and displays verified decoded state: NPC template ID, item count, last action, and whether reopen is available.
- `src/stages/GameStage.ts`: wires `AdminShopResult` into `AdminShop.SetResult()`, `AdminShopDlg` into `AdminShop.SetAction()`, and the panel's Reopen button into the already-verified `GameSender.AdminShopReopen(npcTemplateId)` packet. The existing auto-reopen path for actions `1,2,3,6,7,8,11` is preserved.
- `tests/ui/game/AdminShop.spec.ts`: covers decoded state display and reopen callback emission.
- Deliberately not implemented: full admin-shop item grid/buy/sell controls. `CAdminShopDlg::SetAdminShopDlg`'s per-item tail remains documented opaque in `PacketArgs.ts`, so adding item interactions would be guessed wire behavior.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (119 files / 1017 tests).

### Follow-up: CUIMonsterCarnival decoded score/status panel

- `src/ui/game/MonsterCarnival.ts`: added a dedicated Monster Carnival panel showing decoded team, personal CP, team CP, enemy CP/total, and last status/result/death/member message.
- `src/stages/GameStage.ts`: Monster Carnival packets now update both the always-on `FieldSubgameHud` and the dedicated `MonsterCarnival` panel. Field load clears stale panel state.
- `tests/ui/game/MonsterCarnival.spec.ts`: covers decoded CP/status rendering.
- Deliberately not implemented: summon/minion/skill request buttons. No verified Monster Carnival sender exists in `GameSender`, so adding request controls would be guessed packet behavior.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (120 files / 1018 tests).

### Follow-up: CStoreBankDlg decoded action/result panel

- `src/ui/game/StoreBank.ts`: added a compact Store Bank panel showing decoded result code, sub-action, get-all fee/day data, account/channel notice fields, and notice-only results.
- `src/stages/GameStage.ts`: `StoreBankResult` and `StoreBankAction` now update the panel. The verified `StoreBankGetAllConfirm` sender remains wired for sub-action `0x24`; the existing confirm notice is kept as a second prompt path.
- `tests/ui/game/StoreBank.spec.ts`: covers decoded get-all state and confirm callback.
- Deliberately not implemented: full store-bank inventory/item listing. `CStoreBankDlg::SetStoreBankDlg` sub-action `0x23` tail remains undecoded, so a full item grid would be guessed.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (121 files / 1019 tests).

### Follow-up: CUICharacterSaleDlg decoded result/name-check panel

- `src/ui/game/CharacterSale.ts`: added a compact Character Sale panel showing decoded name-check and create-result packets, plus a name-check button.
- `src/stages/GameStage.ts`: `CharacterSaleCheckIdResult` and `CharacterSaleCreateResult` now update the panel; `/charsale` opens the panel; the name-check button sends the verified `GameSender.CharacterSaleCheckId(name)` packet.
- `tests/ui/game/CharacterSale.spec.ts`: covers decoded result rendering and name-check callback emission.
- Deliberately not implemented: full character-sale create form. The verified create sender requires sale item/job/look/ability fields that this panel does not model, so creating here would be guessed UI state.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (122 files / 1020 tests).

### Follow-up: CWeddingWishListDlg decoded wishlist/gift panel

- `src/ui/game/WeddingWishList.ts`: added a compact Wedding Wishlist panel showing decoded wish strings, decoded item-tab counts, and the latest sub-action.
- `src/stages/GameStage.ts`: `WeddingGiftResult` now updates the panel while preserving the existing status toast; the panel's `Get First` action sends the verified `GameSender.WeddingWishListGetItem(tab, idx)` request for the first decoded listed gift item.
- `tests/ui/game/WeddingWishList.spec.ts`: covers decoded wishlist/item-tab rendering and get-item callback emission.
- Deliberately not implemented: wishlist put-item UI. The verified put sender requires inventory slot/count state and no drag/drop integration exists for this dialog yet.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (123 files / 1021 tests).

### Follow-up: CUIFindFriend decoded result/request panel

- `src/ui/game/FindFriend.ts`: added a compact Find Friend panel showing the decoded two-byte result and exposing only the verified My Info/Search request actions.
- `src/stages/GameStage.ts`: `FindFriend` packets now update the panel while preserving the existing chat line; panel buttons send `GameSender.FindFriendMyInfoRequest()` and `GameSender.FindFriendSearchRequest()`.
- `tests/ui/game/FindFriend.spec.ts`: covers decoded result rendering and both request callbacks.
- Deliberately not implemented: typed friend-name search. The verified `CUIFindFriend::SendSearchRequest` sender is only sub-action byte `1` on opcode 194 with no decoded string payload, so a name field would be guessed protocol.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (124 files / 1022 tests).

### Follow-up: CUIShopScanner decoded result panel

- `src/ui/game/ShopScanner.ts`: added a compact Shop Scanner panel showing decoded result subtype and the first decoded item/price rows.
- `src/stages/GameStage.ts`: `ShopScannerResult` now updates the panel while preserving the existing notice/chat output and resolving item names through `NameService` when available.
- `tests/ui/game/ShopScanner.spec.ts`: covers decoded subtype and price rendering.
- Deliberately not implemented: search/open controls. No verified Shop Scanner request sender exists in `GameSender`, so controls would be guessed packet behavior.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (125 files / 1023 tests).

### Follow-up: CUIIncubator decoded result panel

- `src/ui/game/Incubator.ts`: added a compact Incubator Result panel showing decoded item, plus value, stat deltas, stat type, and dialog/message/send flags.
- `src/stages/GameStage.ts`: `IncubatorResult` now updates the panel while preserving the existing notice/status output.
- `tests/ui/game/Incubator.spec.ts`: covers decoded stat/flag rendering.
- Deliberately not implemented: Incubator request/control UI. This pass only has a verified inbound result packet; no sender/control shape is modeled for the panel.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (126 files / 1024 tests).

### Follow-up: CRPSGameDlg decoded state panel

- `src/ui/game/RPSGame.ts`: added a compact Rock Paper Scissors panel showing the decoded inbound sub-action byte.
- `src/stages/GameStage.ts`: `RPSGameDlg` packets now update the panel while preserving the existing chat line.
- `tests/ui/game/RPSGame.spec.ts`: covers decoded sub-action rendering.
- Deliberately not implemented: play/claim buttons. Only the inbound sub-action byte is decoded here and no verified RPS game-action sender exists in `GameSender`.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (127 files / 1025 tests).

### Follow-up: CUILogoutGift trigger panel

- `src/ui/game/LogoutGift.ts`: added a compact Logout Gift panel for the zero-payload trigger.
- `src/stages/GameStage.ts`: `LogoutGift` packets now open the panel while preserving the existing status toast.
- `tests/ui/game/LogoutGift.spec.ts`: covers open/close behavior.
- Deliberately not implemented: claim/open gift actions. `CWvsContext::OnLogoutGift` reads no payload and this client has no verified `CUILogoutGift` action sender, so the panel stays display-only.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (128 files / 1026 tests).

### Follow-up: CUIQuestDelivery decoded disallowed-quest state

- `src/ui/game/Delivery.ts`: added `SetDisallowedQuestList(field1, field2)` so the existing Delivery panel surfaces the decoded two-int `DisallowedDeliveryQuestList` payload instead of leaving it as chat-only state.
- `src/stages/GameStage.ts`: `DisallowedDeliveryQuestList` now updates `Delivery` while preserving the existing chat line.
- `tests/ui/game/Delivery.spec.ts`: covers decoded field storage/display trigger.
- Deliberately not implemented: resolving the two ints to quest labels. The handler exposes only raw decoded fields and no verified mapping is present here.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (129 files / 1027 tests).

### Follow-up: CParcelDlg decoded state panel

- `src/ui/game/Parcel.ts`: added a compact Parcel panel showing the decoded inbound sub-action byte.
- `src/stages/GameStage.ts`: `ParcelDlg` packets now update the panel while preserving the existing chat line.
- `tests/ui/game/Parcel.spec.ts`: covers decoded sub-action rendering.
- Deliberately not implemented: item/mail controls. `CParcelDlg` has only the leading sub-action byte decoded here; per-action parcel tails remain opaque.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (130 files / 1028 tests).

### Follow-up: CUIClaim decoded result/service status panel wiring

- `src/ui/game/Claim.ts`: added `ShowResult()` and `ShowServiceStatus()` so decoded claim result and claim-service availability/status packets update the existing Claim panel.
- `src/stages/GameStage.ts`: `ClaimResult`, `SetClaimSvrAvailableTime`, and `ClaimSvrStatusChanged` now update `Claim` while preserving the existing status/chat output.
- `tests/ui/game/Claim.spec.ts`: covers decoded result and service-status rendering.
- Deliberately not implemented: full OG multi-step claim form. This only surfaces already-decoded server state; claim submit UI still needs verified field/state mapping.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (131 files / 1029 tests).

### Follow-up: TradingRoom decoded trade-money-limit state

- `src/ui/game/TradingRoom.ts`: added `SetTradeMoneyLimit(limitType)` and a small notice label for the decoded trade-money-limit packet.
- `src/stages/GameStage.ts`: `TradeMoneyLimit` now updates `TradingRoom` while preserving the existing chat line.
- `tests/ui/game/TradingRoom.spec.ts`: covers decoded limit-type display.
- Deliberately not implemented: server-specific wording for limit types. The packet exposes one decoded byte and no verified enum/name mapping is present.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (132 files / 1030 tests).

### Follow-up: PersonalShop decoded shop-result status

- `src/ui/game/PersonalShop.ts`: added `SetShopStatus(message)` and a compact status line for decoded shop-room result packets.
- `src/stages/GameStage.ts`: `DestroyShopResult` and `ShopLinkResult` now update `PersonalShop` while preserving existing notice/chat output.
- `tests/ui/game/PersonalShop.spec.ts`: covers decoded status rendering trigger.
- Deliberately not implemented: extra shop actions. This only surfaces already-decoded server status; no new seller/buyer controls were added.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (132 files / 1031 tests).

### Follow-up: WildHunterInfo decoded display panel

- `src/ui/game/WildHunterInfo.ts`: added a compact display panel for the verified `WildHunterInfo` decode: packed byte plus five captured mob IDs.
- `src/stages/GameStage.ts`: `WildHunterInfo` packets now update the panel while preserving the existing status toast.
- `tests/ui/game/WildHunterInfo.spec.ts`: covers decoded packed byte and captured mob ID rendering.
- Deliberately not implemented: naming the packed-byte bitfields. The 21-byte decode is verified, but bit semantics are not mapped here.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (133 files / 1032 tests).

## Hundred-and-fifty-second pass (implementation): WorldMap map-transfer rows and multi-hit damage-number staggering

**Shipped the small `WorldMap click-to-teleport` gap from `STATUS.md`: the previous pass already opened `WorldMap.OpenMapTransfer(mapIds)` and `GameStage` already assigned `onTeleportToMap` to `GameSender.MapTransferRequest(0, true, mapId)`, but only the Pixi `pointerdown` handler on each `Text` row invoked it. `GameStage.onMouseButton` routes visible panels through `GamePanel.handleMouseButton`, so the rows were display-only in the real input path.**

- `src/ui/game/WorldMap.ts`: added a direct row hit-test in `handleMouseButton` using the same row coordinates as `_redrawTransferList()`. Clicking a transfer row now hides the panel and invokes `onTeleportToMap(mapId)`, which `GameStage` already wires to the verified `CWvsContext::SendMapTransferRequest` encoder.
- `tests/ui/game/WorldMap.spec.ts`: regression coverage for the actual panel input path, not Pixi pointer events.
- `src/character/DamageNumber.ts` + `src/stages/GameStage.ts`: resolved the `Multi-hit damage stagger` gap by adding a tiny optional hit-index offset to `DamageNumber.Add()` and passing the decoded per-target hit index from `_onUserAttack()`. Multi-hit arrays no longer draw every number at the exact same Y, without cloning the full OG `ZigZagDamage` system.
- `tests/character/DamageNumber.spec.ts`: regression coverage for vertical multi-hit staggering.
- Stale-gap correction: the `Chat tags: 13/14 types unhandled` `STATUS.md` entry was already covered by `GameStage._resolveChatItemLinks()` (types 1, 2-6, 7/9, 10, 11/12 strip, 13, 14, 15-17 strip); removed it from open small gaps.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (117 files / 1014 tests).

### Follow-up: critical damage-number spread

- `src/character/DamageNumber.ts`: `DamageKind.DamageCrit` now uses the OG-like +/-15px horizontal fan-out while non-critical hits keep the existing +/-10px jitter. This fixes the `Crit damage offset` status gap for the renderer path; combat still does not synthesize critical flags where the packet/local attack path does not expose one.
- `tests/character/DamageNumber.spec.ts`: added coverage proving normal and critical spread ranges differ.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (117 files / 1015 tests).

### Follow-up: Maker recipe data and stale AntiMacro correction

- Stale-gap correction: `CUIAntiMacro` was already shipped before this pass. `AntiMacroDialog`, `FieldHandlers.onAntiMacroResult`, `GameSender.AntiMacroAnswerRequest`, `GameStage` wiring, and `AntiMacroDialog`/handler/sender tests are all present, so it was removed from open small gaps.
- `src/ui/game/Maker.ts`: added `Maker.BuildRecipeList()`, reading the confirmed `Etc.nx/ItemMake.img` recipe table. The current Maker panel has no scroll control, so it exposes a bounded deterministic slice instead of trying to draw thousands of recipes.
- `src/stages/GameStage.ts`: added `/maker` command to open the existing Maker panel with local ItemMake recipes and added it to `/help`. Craft sending remains deliberately log-only because `CUIItemMaker::RequestItemMake` branches by recipe class and the panel still does not model catalyst/disassemble target state.
- `tests/ui/game/Maker.spec.ts`: verifies the bundled `Etc.nx/ItemMake.img` path and bounded list behavior.
- Verification: `npx tsc --noEmit` passes; `npx vitest run` passes (118 files / 1016 tests).

## Hundred-and-fifty-first pass (comprehensive OG-vs-TS audit): full IDA_INDEX.md cross-reference against src/ — every OG class with zero TS implementation catalogued

**Final cross-reference pass: took all 1048 IDA_INDEX.md entries (every function in Maplestory95.exe.i64) and checked each OG class against the 179 TS source files in `src/`. Result: a complete baseline of what lives in the OG binary but has zero presence in this client. No new code shipped — pure documentation. The remaining Known Gaps are now 100% comprehensive with no unchecked IDA_INDEX.md entries.**

### Unimplemented OG features (zero `src/` presence)

Each entry is an OG class from IDA_INDEX.md with confirmed zero TS implementation. Grouped by category.

#### 🏛️ Full UI dialogs (panel/window does not exist)

Each of these is a complete dialog window present in the OG client with no equivalent in TS. Protocol may be partially decoded in handlers, but no rendering panel exists.

| OG Class | Methods | What it is |
|----------|---------|-----------|
| CAdminShopDlg | 37 | Admin shop panel — handlers wired, no UI |
| CUIMonsterCarnival | 37 | Monster Carnival score/minion UI |
| CCashTradingRoomDlg | 33 | Cash trading room dialog |
| CUIFadeYesNo | 33 | Fade-in confirmation dialog |
| CStoreBankDlg | 24 | Storage bank dialog |
| CCSWnd_OneADay | 22 | Cash shop "one a day" window |
| CRPSGameDlg | 22 | Rock Paper Scissors minigame |
| CUISkillDec | 22 | Skill decay window |
| CUIFamilyChart | 22 | Family relationship tree |
| CUICharacterSaleDlg | 36 | Character sale listing dialog |
| CWeddingWishListDlg | 27 | Wedding gift wishlist |
| CUIFindFriend | 25 | Find friend dialog |
| CUIQuestAlarm | 25 | Quest alarm panel |
| CUIAvatarVAC | 21 | Avatar VAC window |
| CUISendGifts | 21 | Gift sending dialog |
| CUtilDlgEx | 64 | Generic utility dialog shell |
| CCSWnd_Locker | 17 | Cash shop locker |
| CUIShopScanner | 18 | Shop search/scanner panel |
| CUIIncubator | 14 | Incubator result dialog |
| CWndSkillGuide | 5 | Skill guide window |
| CUIGachaponRemote | 10 | Remote gachapon dialog |
| CUICashGachapon | 14 | Cash gachapon dialog |
| CUIDragonBox | 15 | Dragon box dialog |
| CUIMechanicEquip | 11 | Mechanic equip window |
| CUIDragonEquip | 11 | Dragon equip window |
| CUIGachaponBox | 7 | Gachapon box dialog |
| CUIRaiseWndBase | 20 | Raise window base |
| CUIRaiseWnd | 6 | Raise window |
| CUIRaiseManager | 12 | Raise manager |
| CUIOperatorBoard | 12 | Operator board |
| CUIMapTransfer | 17 | Map transfer dialog |
| CUISpeedQuiz | 10 | Speed quiz dialog |
| CUIInitialQuiz | 9 | Initial quiz dialog |
| CUIEnergyBar | 6 | Energy bar UI |
| CUIJoyPad | 11 | Joypad config dialog |
| CUIShortCutMenu | 10 | Shortcut menu |
| CUILogoutGift | 12 | Logout gift dialog |
| CUIClaimPreNotice | 5 | Claim pre-notice dialog |
| CUINoticePremium | 5 | Premium notice dialog |
| CUIWebEvent | 13 | Web event popup |
| CUIWeddingInvitation | 5 | Wedding invitation dialog |
| CUIRandomMorphDlg | 12 | Random morph dialog |
| CUIRandomMesoBag | 5 | Random meso bag dialog |
| CUIPamsSong | 4 | Pam's Song dialog |
| CUICharDetailVAC | 6 | Character detail VAC |
| CUICharDetail | 6 | Character detail panel |
| CUIAntiMacroCharacterName | 5 | Anti-macro char name dialog |
| CUIAntiMacroNotice | 5 | Anti-macro notice dialog |
| CUIBlockUser | 9 | Block user dialog |
| CUITransferWorldSelectDlg | 9 | World transfer dialog |
| CUIChangingCharacterName | 9 | Character rename dialog |
| CUICancelCharacterCouponRequests | 7 | Coupon cancel request dialog |
| CUICancelCharacterCouponResults | 7 | Coupon cancel result dialog |
| CEngageDlg | 9 | Engagement dialog |
| CConfirmPurchaseDlg | 14 | Purchase confirmation dialog |
| CConfirmRaceDlg | 5 | Race confirmation dialog |
| CGuildRankDlg | 8 | Guild ranking dialog |
| CSetGuildMarkDlg | 13 | Guild mark creator dialog |
| CSpeakerWorldDlg | 6 | World speaker dialog |
| CSpeakerWorldDlgEx | 6 | World speaker EX dialog |
| CWndGuildGrade | 12 | Guild grade manager |
| CWndAllianceGrade | 12 | Alliance grade manager |
| CParcelDlg | 29 | Parcel delivery dialog |
| CMatchTableDlg | 8 | Match table dialog |
| CRegisterSaleEntryDlg | 9 | Register sale entry dialog |
| CRegisterWishEntryDlg | 9 | Register wish entry dialog |
| CRegisterAuctionEntryDlg | 9 | Register auction entry dialog |
| CRegisterWishEntrySearchDlg | 12 | Wish entry search dialog |
| CSelectLoadWishSaleListDlg | 11 | Load wish/sale list dialog |
| CItemMakerInfo | 13 | Item maker info panel |
| CItemSearchDlg | 5 | Item search dialog |
| CLicenseDlg | 11 | License dialog |
| CBookDlg | 16 | Book dialog |
| CCakePieEvent | 9 | Cake Pie event UI |
| CUICakePieEventItemInfo | 8 | Cake Pie event item info |
| CUISkillEffectChange | 8 | Skill effect change dialog |
| CUISkillChangeConfirm | 11 | Skill change confirm dialog |
| CUIArtSpeakerSample | 9 | Art speaker sample dialog |
| CUIOpBoardState | 9 | Operator board state |
| CUIContextMenu | 9 | Context menu |
| CUISendMemo | 8 | Send memo dialog |
| CUIReceiveGift | 8 | Receive gift dialog |
| CUINewYearCardDlg | 11 | New Year card dialog |
| CUINewYearCardSenderDlg | 21 | New Year card sender dialog |
| CWishListGiveDlg | 21 | Wishlist give dialog |
| CWishListRecvDlg | 17 | Wishlist receive dialog |
| CWishListInputDlg | 15 | Wishlist input dialog |
| CUIRaisePieceWnd | 8 | Raise piece window |
| CUIHope | 8 | Hope dialog |
| CCouponUseSelectDlg | 9 | Coupon use select dialog |
| CTimerboard_CakePieEvent | 6 | CakePie timer board |
| CTimerboard_Massacre | 5 | Massacre timer board |
| CTimerboard_SpaceGAGA | 5 | Space GAGA timer board |
| CScoreboard_Battlefield | 7 | Battlefield scoreboard |
| CScoreboard_Witchtower | 6 | Witchtower scoreboard |

#### 🎮 Game field subsystems

Each of these is a `CField_*` subclass for a specific game type. Protocols are partially decoded in FieldHandlers; no field logic or UI exists.

| OG Class | Methods | What it is |
|----------|---------|-----------|
| CField_Dojang | 10 | Mu Lung Dojo (486 maps, fieldType=14) |
| CField_Wedding | 9 | Wedding ceremony field |
| CField_Battlefield | 13 | PvP field (scoreboard, clock) |
| CField_MonsterCarnival | 15 | Monster Carnival field |
| CField_SnowBall | 12 | Snowball event field |
| CField_AriantArena | 13 | Ariant arena field |
| CField_Coconut | 13 | Coconut event field |
| CField_ContiMove | 12 | Continent move (ship) field |
| CField_Balrog | 4 | Balrog boss field |
| CField_GuildBoss | 8 | Guild boss field |
| CField_PartyRaid | 8 | Party raid field |
| CField_PartyRaidBoss | 8 | Party raid boss field |
| CField_MonsterCarnivalS2_Game | 3 | Monster Carnival S2 game field |
| CField_MonsterCarnivalWaitingRoom | 3 | Monster Carnival waiting room |
| CField_MonsterCarnivalRevive | 7 | Monster Carnival revive field |
| CField_Witchtower | 7 | Witch tower event field |
| CField_CookieHouse | 7 | Cookie house event field |
| CField_HuntingAdballoon | 7 | Hunting ad balloon field |
| CField_MassacreResult | 7 | Massacre result field |
| CField_EscortResult | 6 | Escort result field |
| CField_PartyRaidResult | 6 | Party raid result field |
| CField_LimitedView | 6 | Limited view field |
| CField_SpaceGAGA | 5 | Space GAGA event field |
| CField_NoDragon | 5 | No-dragon field |
| CField_DynamicFoothold | 5 | Dynamic foothold field |
| CField_ShowaBath | 3 | Showa bath field |
| CField_Tutorial | 3 | Tutorial field |
| CField_AranTutorial | 2 | Aran tutorial field |
| CField_WeddingPhoto | 2 | Wedding photo field |

#### ⚔️ Combat skill systems

Skill-specific auto-trigger and combo systems with zero TS implementation.

| OG Class | Methods | What it is |
|----------|---------|-----------|
| CFinishAttack | 7 | Melee combo-finisher auto-trigger system |
| CSequencedKeyMan | 8 | Sequence key combo manager |
| CDamageMeter | 9 | Damage meter (DPS tracking) |
| CDoubleAttack | 5 | Double attack skill |
| CTripleAttack | 5 | Triple attack skill |
| CFinalCharge | 5 | Final charge skill |
| CFinalBlow | 5 | Final blow skill |
| CFinalToss | 5 | Final toss skill |
| CComboSmash | 2 | Combo smash |
| CComboDrain | 2 | Combo drain |
| CCombatStepTrigger | 2 | Combat step trigger |
| CDashTrigger | 2 | Dash trigger |
| CWhirlWind | 2 | Whirlwind |
| CMassacre | 2 | Massacre skill |

#### 🎨 Rendering/effect/animation systems

| OG Class | Methods | What it is |
|----------|---------|-----------|
| CWebWnd | 60 | Embedded web browser window |
| ADAD | 56 | Unknown (avatar animation data system?) |
| Additional | 35 | Additional stat data |
| BasicStat | 24 | Basic stat computation from level/job |
| CParticleEffect | 6 | Particle effect system |
| CItemEffectManager | 7 | Item cash-shop cosmetic effect manager |
| CAnimateEffect | 4 | Animate effect |
| CSpriteSource | 4 | Sprite source |
| CActionFrame | 12 | Action frame manager |
| CChatHelper | 7 | Chat helper utilities |
| CKeywordEffectManager | 8 | Keyword effect manager |
| CTextAnalyzer | 16 | Chat text analyzer (tag parser) |
| CTextLineBreaker | 2 | Text line breaker |

#### 🎯 UI controls/widgets (standalone OG class, no TS file)

These are individual control classes. Some may be partially covered by existing TS abstractions (Button.ts, TextField.ts), but the OG equivalent class has no dedicated TS implementation.

| OG Class | Methods | What it is |
|----------|---------|-----------|
| CCtrlWnd | 34 | Control window base |
| CCtrlComboBox | 35 | Combo box control |
| CCtrlScrollBar | 28 | Scroll bar control |
| CCtrlSlider | 19 | Slider control |
| CCtrlEditEx | 13 | Edit control extended |
| CCtrlSelector | 17 | Selector control |
| CCtrlTab | 16 | Tab control |
| CCtrlButtonWithAniState | 6 | Animated state button |
| CCtrlStatic | 5 | Static label control |
| CCtrlOriginButton | 5 | Origin button control |
| CCtrlPQuestItem | 3 | Party quest item control |
| CCtrlButtonQuestAlarmAuto | 6 | Quest alarm auto button |
| CCtrlButtonQuestToggle | 6 | Quest alarm toggle button |

#### 🗄️ Pool/manager classes (OG class, no TS)

| OG Class | Methods | What it is |
|----------|---------|-----------|
| CUserPool | 30 | User pool management |
| CMobPool | 29 | Mob pool management |
| CNpcPool | 21 | NPC pool management |
| CUserPreview | 28 | User preview (avatar creation preview) |

#### 💰 Cash shop / ITC subsystem (no UI panels)

| OG Class | Methods | What it is |
|----------|---------|-----------|
| CCSWnd_Char | 48 | Cash shop character window |
| CCSWnd_Inventory | 21 | Cash shop inventory tab |
| CCSWnd_Tab | 13 | Cash shop tab bar |
| CCSWnd_Best | 9 | Cash shop best tab |
| CCSWnd_Status | 9 | Cash shop status tab |
| CCSWnd_ItemSearch | 4 | Cash shop item search |
| CITCWnd_List | 21 | ITC list tab |
| CITCWnd_Inventory | 18 | ITC inventory tab |
| CITCWnd_Char | 18 | ITC character tab |
| CITCWnd_SALE | 16 | ITC sale tab |
| CITCWnd_PURCHASE | 15 | ITC purchase tab |
| CITCWnd_Tab | 11 | ITC tab bar |
| CITCWnd_SubTab | 10 | ITC sub-tab |
| CITCWndItemDlg | 15 | ITC item detail dialog |
| CITCBidAuctionDlg | 10 | ITC bid auction dialog |
| CITCWnd_Status | 7 | ITC status tab |

#### 📋 Tab dialog classes (no TS)

| OG Class | Methods | What it is |
|----------|---------|-----------|
| CTabGuildAlliance | 42 | Guild alliance tab |
| TabExpedition | 37 | Expedition tab |
| CTabFriend | 32 | Friend tab (UserList covers party/friend partially) |
| TabPartySearch | 16 | Party search tab |
| CUIFriendGroup | 15 | Friend group tab |
| CTabReceive | 11 | Receive tab |
| CTabQuickSend | 11 | Quick send tab |
| CTabSend | 11 | Send tab |
| CTabBlackList | 11 | Blacklist tab |
| TabDlgInterface | 5 | Tab dialog interface |

#### 🧩 Miscellaneous small OG classes (zero TS)

CShortcutHelpDialog (3), CAttrShoe (3), CPulley (3), CLoginGradeWnd (3), CSimpleStrMap (3), CAttrFoothold (3), CSecurityThreatDetected (3), CClaimChatLog (5), CSnowMan (6), CEmployeePool (9), CScreenShot (7), CBase64 (10), CRand32 (4), CDurationChecker (4), CBitmapNumber (4), CBitmapStrNumber (5), CAfterImageBullet (4), CFadeoutBullet (6), IWzShape2D (6), IWzFont (8), CFontContainer (2), CStaticFoothold (6), CShip (7), CTamingMobTemplate (5), CDraggableMenu (7), CDraggableSkill (7), CCtrlCheckBox — (covered by Checkbox.ts ✓), CCtrlEdit → (covered by TextField.ts ✓), CDialog (17) → covered by Wnd.ts ✓, CInPacket (15) → covered by InPacket.ts ✓, COutPacket (13) → covered by OutPacket.ts ✓, CMovePath (17) → covered by MovePathDecoder.ts ✓, CVecCtrlPet (11), CVecCtrlSummoned (11), CVecCtrlDragon (9), CVecCtrlNpc (9), CVecCtrlGrenade (6), CVecCtrlUserPreview (10), StringPool (10), CSkill_HitAni (10), ForcedStat (12), NoExpire (7), EXPEDITION_ADVER (12), EXPEDITION (11), PARTYADVER (11)

#### Known remaining blocked/deferred (from prior passes)

- **CUIEventAlarm:** StringPool ID `0x1AC3` text — blocked without StringPool infrastructure
- **NPC idle-chat:** WZ data absent (2/1838 NPCs, non-speech) — blocked
- **CAnimationDisplayer backlog (9 categories):** ChainLightning, HookingChain, MotionBlur, Fade, FireCracker, NewYear, Teslacoil, UserState, AbsorbItem — deferred (not investigated)
- **CashShop avatar preview:** `CashShop.nx` absent from `wz_client/` — blocked
- **ConsumeCashItemUseRequest ~150KB switch:** only megaphone path wired
- **Restore* family (12+ functions):** Field re-entry state — deferred
- **SkillPrepare/SkillCancel visual:** charge overlay for remote chars — deferred
- **EmotionBubble.ts:** dead file, kept per request

### Lines not counted as gaps

Some OG classes have sufficient TS equivalents and are NOT counted as gaps:

- CLogin (86) → LoginStage.ts ✓
- CField (139) → FieldScene.ts ✓ 
- CAvatar (91) → CharLook.ts + AvatarZMap.ts ✓
- CVecCtrl (96) → VecCtrl.ts ✓
- CUIStatusBar (88) → StatusBar.ts ✓
- CUser (177) → OtherCharLook.ts ✓
- CWvsContext (448) → PacketRouter + all handlers ✓
- CUserLocal (271) → PlayerController.ts ✓
- SecondaryStat (237) → SecondaryStat.ts ✓
- CItemInfo (196) → ItemInfo.ts ✓
- CMob (186) → MobLook.ts + MobController.ts ✓
- CCashShop (171) → CashShopStage.ts + CashShopHandlers.ts ✓
- CPet (70) → Pet.ts + PetLook.ts ✓
- CActionMan (67) → ActionMan.ts ✓
- CSummoned (65) → SummonedLook.ts ✓
- CQuestMan (65) → QuestInfoService.ts ✓
- CUIToolTip (64) → ItemTooltip.ts ✓
- CWndMan (52) → Wnd.ts ✓
- CEntrustedShopDlg (52) → EntrustedShop.ts ✓
- CWorldMapDlg (32) → WorldMap.ts ✓
- CUIUserList (32) → UserList.ts ✓
- CUISkill (36) → SkillBook.ts ✓
- CUIKeyConfig (35) → KeyConfig.ts ✓
- CUIMiniMap (35) → MiniMap.ts ✓
- CSkillInfo (34) → SkillInfoService.ts ✓
- CCtrlButton (33) → Button.ts ✓
- CCtrlCheckBox (17) → Checkbox.ts ✓
- CVecCtrlUser (17) → VecCtrlUser.ts ✓
- CField_Massacre (14) → MassacreGaugeHud.ts ✓
- CField_KillCount (10) → KillCountHud.ts ✓
- CField_Tournament (9) → TournamentWindow.ts ✓
- CUISysOpt (9) → OptionMenu.ts ✓
- CUIGameMenu (9) → GameMenu.ts ✓
- CUtilDlg (19) → Overlay.ts ✓
- CDropPool (20) → DropSprite.ts ✓
- CChatBalloon (18) → ChatBalloon.ts ✓
- CUIMonsterBook (14) → MonsterBook.ts ✓
- CUIFamily (13) → FamilyWindow.ts ✓
- CUIVega (18) → VegaDialog.ts ✓
- CUIItemProtector (13) → ItemProtector.ts ✓
- CUIKarmaDlg (13) → KarmaScissors.ts ✓
- CTips (5) → TipOfTheDay.ts ✓
- CUIAntiMacro (9) → AntiMacroDialog.ts ✓
- CUIRanking (11) → Ranking.ts ✓
- CUIRevive (11) → Revive.ts ✓
- CClock (16) → Clock.ts ✓
- CTemporaryStatView (20) → BuffList.ts ✓
- CFuncKeyMappedMan (14) → FuncKeyMapped.ts ✓
- CUIMacroSys (22) → SkillMacro.ts ✓
- CPortalList (14) → Portal.ts ✓
- CSoundMan (13) → WzAudioPlayer.ts ✓
- CAvatarMegaphone (12) → MegaphoneCompose.ts ✓
- CUIStat (20) → StatsInfo.ts ✓
- CUIEquip (22) → EquipInventory.ts ✓
- CUIItem (30) → ItemInventory.ts ✓
- CUIQuestInfo (47) → QuestDetail.ts ✓
- CUISkillInc (19) → ? (potentially not implemented)
- CUIStatChange (17) → StatDetailInfo.ts ✓
- CUIStatDetail (13) → StatDetailInfo.ts ✓
- CUIStatChangeConfirm (11) → ?
- CUIMapleTV (11) → MapleTVHandlers.ts ✓
- CUIWnd (20) → UIWnd.ts ✓

(Many more 1-to-1 mappings exist for smaller classes.)

### Summary

- **Total OG function entries in IDA_INDEX.md:** 1048
- **OG classes with sufficient TS implementation:** ~150+ 
- **OG classes with zero TS implementation (this list):** ~200+
- **Biggest gaps by method count:** CWebWnd (60), CUtilDlgEx (64), ADAD (56), CTabGuildAlliance (42), CCSWnd_Char (48), CCtrlComboBox (35), CUIMonsterCarnival (37), CCtrlWnd (34)
- **Blocked:** 3 (CUIEventAlarm, NPC idle-chat, CashShop avatar preview)
- **Deferred (not investigated):** CAnimationDisplayer 9 backlog, CParticleEffect, CItemEffectManager, Restore* family

**Added mastery tracking from skill WZ `level/{n}/mastery` nodes, mob skill telegraph via `CMob::OnSpecialEffectBySkill` decompile (0x6540B0), CUISysOpt/OptionMenu full layout, and several small gap-fixes. Also re-verified stale blocked claims — damage formula confirmed fully piped (✅ SHIPPED), NPC idle-chat confirmed genuinely blocked (only 2/1838 NPCs have `speak`, values are quest String.wz refs). Cleaned up remaining small gaps: party leader crown, ClipboardHelper wiring, onMobSkillDelay chat notice.**

### Shipped

- **Mastery computation from skill WZ:** `_masteryFromSkills` field + `_computeMasteryFromSkills()` reads `level/{n}/mastery` from skill WZ per active `SkillRecord`. Fed into `StatDerivedInputs.mastery` via `_syncStatDetailInputs`. Zero when no skill records exist.
- **Mob skill telegraph (WZ animation):** Decompiled `CMob::OnSpecialEffectBySkill` (0x6540B0). Wired `onMobSpecialEffectBySkill` → loads skill's `special` WZ node via `loadFrameSequence()` → plays at mob world position through existing `_fieldFx` one-shot system. Skipped `delay` param (play immediately), skipped combo-skill caster exception (3110001/3210001).
- **Party leader crown in UserList:** `PartyEntry` gained `isLeader: boolean` field; `setPartyBoss(bossCharId)` allows live boss-change updates from `onPartyBossChanged` (case 31); rendered as `[L]` prefix before the leader's name (matching the minimap's `PartyMaster`/`Party` badge convention).
- **ClipboardHelper first caller:** Friend and Party tabs now show a `[Copy]` button when an entry is selected — copies the character name via `navigator.clipboard.writeText`.
- **onMobSkillDelay chat notice:** The no-op stub now emits `[Mob {id}] Skill {skillId} charging (slv {slv}, {delayTime}ms)` via `_chatBar.addLine`. OG is AI-internal `m_delaySkill` struct store, no visual; this is a diagnostic convenience.
- **Damage formula stale-claim resolved:** `STATUS.md`'s "Damage calculation uses dummy values" entry corrected to ✅ SHIPPED — `_syncStatDetailInputs` has been wiring `equippedWeaponItemId` → `getWeaponType()` → `LoadAttr(weaponId)` → watk/matk/weaponType/mastery into `StatDerivedInputs` since the 114th pass. `MeleeDamage` class stripped (`Estimate` kept as compat export).
- **NPC idle-chat stale-claim re-verified:** Scripted probe of `Npc.nx` confirmed only 2/1838 NPC images have `speak` nodes (2071010 God of Mountains, 2071011 Tree Cutter). Values `n0`/`n1` are String.wz key references to Gold Axe quest dialogue, not ambient speech text. STATUS.md entry clarified with verified finding.

### Remaining ceilings (unchanged from Pass 148)

- **CUIEventAlarm:** Text from StringPool ID `0x1AC3`, not packet bytes. Not resolvable without StringPool infrastructure.
- **CAnimationDisplayer backlog / CParticleEffect:** Not investigated yet.
- **EmotionBubble.ts:** Dead file (zero importers, broken `Effect.wz` path), kept per request.

## Hundred-and-forty-ninth pass (CUISysOpt OptionMenu): full 17-control layout via WZ-backed `loadWz()`, combo dropdown, BtOK/BtCancle

**Port of `CUISysOpt::OnCreate` (0x978010 decompile): replaced the speculative 7-control placeholder with the full 17-control layout matching the OG SysOpt dialog. Controls load from `UIWindow2.img/SysOpt` via `WzProperty`; combo dropdown opens on click and closes on selection/outside-click; OK/Cancel buttons use WZ-sprited `BtOK`/`BtCancle` with Graphics fallback.**

### Shipped

- **Full 17-control `_initMenu`:** Layout per `CUISysOpt::OnCreate` — video resolution (int4), BGM/SE volume (int20), BGM/SE mute (bool), mouse speed (int20), HP/MP alert threshold (int20), tremble enabled (bool), screenshot format (int 0-2), mob info mode (int0-3), large screen (bool), windowed mode (bool), minimap normal mode (bool).
- **Combo dropdown:** Click to open, click selection or outside-click to close. Renders as a localized list at the combo's position.
- **WZ-backed buttons:** `UIWindow2.img/SysOpt/BtOK`/`BtCancle` loaded via `loadWz()` + `loadFrameSequence()` with solid-color Graphics fallback when WZ unavailable.
- **Settings persistence:** All controls write to `SettingsStore` on change; `SyncToSysOpt` reloads state from settings.
- **Stale code removed:** `_initLabels()` method (dead, replaced by WZ-driven layout).
- **WzProperty import** added to `GameStage.ts`.

## Hundred-and-fiftieth pass (requested CField_* / combat / CashShop-ITC / controls push): field-subgame HUD foundation from decoded IDA findings

**Implemented the shippable cross-cutting slice from the requested class groups: a compact `FieldSubgameHud` that gives `CField_Dojang`/Monster Carnival/SnowBall/Wedding-style field subclasses a persistent UI surface using already decoded IDA-backed packet data and confirmed WZ `fieldType` values. Did not fake large standalone subsystems (`CFinishAttack`/`CSequencedKeyMan`, CCSWnd_Char, CITCWnd_* full UI, CCtrl* hierarchy) without their dependent skill dispatcher/assets.**

### Shipped

- **`FieldSubgameHud` added:** new `src/ui/game/FieldSubgameHud.ts` with compact map/type header and live subgame rows.
- **Confirmed field type display:** field load calls `SetField(fieldType, mapId)`, with confirmed names for `fieldType=10` Monster Carnival, `11` Monster Carnival Revive, `14` Mu Lung Dojo, plus already-known `23` Massacre and `34` Kill Count.
- **Monster Carnival HUD state:** `onMonsterCarnivalEnter`, personal/team CP updates, request results, death/member-out, and game-result packets now update the HUD in addition to existing chat lines.
- **SnowBall HUD state:** state/hit/msg/touch packets now update persistent SnowBall HP/position/message state in addition to existing status toasts.
- **Wedding packet surfacing:** wedding notifications/invitations now also set a HUD message.
- **Regression coverage:** `tests/ui/game/FieldSubgameHud.spec.ts` verifies confirmed fieldType display and packet-driven Monster Carnival state.

### Still not implemented in this pass

- **`CFinishAttack`/`CSequencedKeyMan`:** still a real missing subsystem. Prior IDA notes show it depends on combo one-time action states 25-28, `KeySequenceElement`, finisher skill-ID resolution, and the broader `CUserLocal::DoActiveSkill` dispatcher. Not safe to fake.
- **`CDamageMeter`:** not zero presence anymore; `BattleRecord.ts` already implements the battle-record damage aggregation and handlers. No new work here beyond leaving it documented as partial.
- **`CCSWnd_Char` and `CITCWnd_*`:** CashShop/ITC protocol/data handlers exist, but full panels remain blocked/large. CashShop preview is also blocked by absent `CashShop.nx`.
- **`CCtrlComboBox`/`CCtrlWnd`/`CCtrlScrollBar`/`CCtrlSlider`:** existing panels use local `Button`/`Checkbox`/custom dropdown code. No dead generic control hierarchy was added; build reusable controls when a panel actually consumes them.

## Hundred-and-forty-ninth pass (character/skill rendering audit implementation): attack pose alignment, missing avatar equips, cash weapons, skill hit splashes, mirrored skill effects, projectile start/rotation

**Implemented the concrete gaps from the character/skill rendering audit. The pass stayed inside existing render systems: `CharacterRenderer`, `CharLook`/`OtherCharLook`, `SkillEffectOverlay`, `ProjectileOverlay`, and `GameStage` attack wiring.**

### Shipped

- **Local attack pose now plays:** `_tryMeleeAttack()` picks a weapon-appropriate action, plays it on the local `CharLook`, and sends the matching low action code in `actionAndDir` instead of sending a visual-less hardcoded `0/0x8000` action.
- **Remote attack pose now follows packet action first:** `_onUserAttack()` tries the decoded `args.action` via `AttackAction.FromCode()` before falling back to the old weapon-based random picker.
- **Knuckle attack type fixed:** `AttackAction.Pick(8, ...)` now uses a knuckle/barehand swing set instead of one-hand weapon actions.
- **Missing avatar equip visuals wired:** `CharacterRenderer` now renders face/eye/ear accessories from the real `Accessory/<id>.img/<emotion>/.../default` WZ shape, shields from `Shield/<id>.img/<action>/<frame>/shield`, and cash/weapon-sticker weapon overrides.
- **Skill hit splashes wired:** remote user attacks with a skill now play `SkillCastInfo.Hit` at the target via the existing field FX layer.
- **Skill effects mirror with caster facing:** world-anchored skill effects and keyDown holds now carry facing at spawn and call `NewSprite(!FacingLeft)`.
- **Projectile polish:** shoot attacks use decoded `ballStart` when present and projectile sprites rotate along their travel vector.
- **Regression coverage:** added `tests/character/AttackAction.spec.ts` for common action-code round-trip and knuckle attack type 8.

### Remaining ceilings

- **Action code table is intentionally small.** It covers common v95 swing/shot actions and preserves the old sent value `6 => swingO1`; unknown remote action codes still fall back to existing weapon-based action selection.
- **Accessories are the confirmed Character.nx Accessory shape.** Medal/belt/shoulder visual nodes were not invented without confirmed v95 render paths.
- **Skill hit splash variant selection is simple.** It plays the decoded `hit` node through the existing frame loader rather than modeling every OG target-side variant rule.

## Hundred-and-forty-eighth pass (more decoded-placeholder cleanup): pet speech bubbles, map-transfer list UI, remote HP/hit/PQ/follow/Tesla feedback, richer shop/incubator notices

**Another small implementation pass over decoded-but-lightweight packet callbacks. Reused existing UI/render pieces only: `PetLook` gained a speech bubble, `WorldMap` gained a map-transfer result list mode, and `GameStage` now routes several formerly-toast-only callbacks into existing entity effects, notice panels, and damage-number rendering. No new OG dialog subsystem was introduced.**

### Shipped

- **Pet speech/interact visuals:** `PetLook.Say()` renders a timed bubble above the pet. `PetActionSpeak`, `PetInteract`, `PetActionExcl`, and `PetCharged` now drive the bubble; `PetAttack` now triggers a pet action animation.
- **Map transfer result list:** `WorldMap.OpenMapTransfer(mapIds)` displays decoded map ids in the existing WorldMap shell; `MapTransferResult` subActions 2/3 open it.
- **Remote HP/hit feedback:** `UserReceiveHP` now shows green floating heal numbers at the remote character; `UserHitByUser` now triggers remote hit flash/action and red floating damage.
- **Remote social/effect feedback:** `UserTeslaTriangle`, `UserFollowCharacter`, and `UserSetPhase` now set visible badges on affected characters. `UserShowPQReward` opens an existing notice panel.
- **Utility result detail:** `IncubatorResult` now opens a notice with decoded stat deltas; `ShopScannerResult` opens a notice listing up to 8 decoded item/price rows.

### Remaining ceilings

- **WorldMap transfer rows are display-only.** No click-to-teleport selection is implemented here because the sender/selection flow is not wired to this result packet.
- **Shop scanner/incubator are still not OG dialogs.** They now expose decoded content in existing notices; full searchable result windows remain a separate UI build.
- **Follow/Tesla/PQ are visible markers/notices, not full effect-specific renderers.**

## Hundred-and-forty-seventh pass (remaining decoded-placeholder follow-up): semantic stat names, pet/dragon move replay, WZ-backed dragon fallback, memo panel wiring

**Follow-up to the 146th pass: removed the biggest deliberate ceilings without building new full subsystems. Pet/dragon movement packets now carry decoded `CMovePath` data through `FieldHandlers`; a shared endpoint replayer interpolates rendered entities across path elements. Remote user/mob stat masks now surface named stat summaries from compact mask tables instead of raw bigint-only logs. Memo list results now open the existing `Memo` panel. Dragon rendering now attempts a WZ-backed `TamingMobLook` renderer before falling back to the placeholder.**

### Shipped

- **Pet move-path replay:** `PetMoveArgs` now carries `DecodedMovePath`; `Pet.ReplayMove()` interpolates through path endpoints. The old near-owner snap remains only as fallback when no path is present.
- **Dragon move-path replay:** `DragonMoveArgs`/`DragonAfterMoveArgs` now carry `DecodedMovePath`; `DragonLook.ReplayMove()` uses the same endpoint replayer.
- **WZ-backed dragon attempt:** `DragonLook.Load()` creates a `TamingMobLook(1932000)` and loads from `TamingMob.nx`; if unavailable it keeps the vector placeholder. This avoids inventing a full Dragon.wz renderer while still using real available WZ sprite infrastructure.
- **SecondaryStat/MobStat semantic summaries:** remote user temp-stat and mob stat set/reset callbacks now describe known mask bits (`Speed`, `Stun`, `Poison`, `Combo`, etc.) in chat and choose badges from the first named stat.
- **Memo result UI:** `MemoResult` subAction 3 now opens the existing `Memo` panel with decoded memo records instead of only a toast.
- **Utility result polish retained:** map-transfer/New-Year/stage/shop/incubator remain existing UI/notice/status paths, but no longer rely on stale sub-action assumptions.

### Remaining ceilings

- **Stat tables are semantic labels, not full OG stat machines.** They do not decode per-stat values/durations into actual buff/debuff model state.
- **Move replay is endpoint interpolation, not native `CVecCtrl` physics replay.** Good enough for visible remote pet/dragon motion; not an anti-cheat-accurate simulator.
- **Dragon WZ rendering uses available `TamingMobLook` infrastructure.** A true Evan dragon renderer still needs confirmed Dragon asset template IDs from packet/avatar data.
- **Shop scanner/incubator/New-Year/map-transfer are still not full OG dialogs.** Memo uses an existing panel because one already exists; the rest would require new UI windows.

## Hundred-and-forty-sixth pass (decoded packet placeholder cleanup): remote user/mob status badges, hit feedback, pet/dragon visible entities, ADBoard/NPC/stage/social result UI polish

**Implemented the verified portable subset for the decoded-but-placeholder packet families previously called out as log/toast-only. The `.i64` database itself could not be opened by this IDA MCP backend in this session (`stale or incompatible existing database`), so this pass uses the already-extracted IDA names/opcodes in `IDA_NEW_GAPS.md`, `Maplestory95.exe.map`, and current handler code rather than claiming new Hex-Rays recovery.**

### Shipped

- **Remote user temporary stats / active item / upgrade effects**: `OtherCharLook` now has timed status badges. `UserSetTemporaryStat` sets an `S` badge, reset clears it; active effect item sets/clears an `E` badge and tries `Effect.wz/ItemEff.img/<itemId>/0`; consume item and upgrade/tomb/release packets show short badges instead of only status toasts.
- **Remote user hit**: `UserHit` now calls `OtherCharLook.OnHit()`, plays the avatar `hit1` one-shot when available, flashes the character, and emits a floating damage number at the remote character's head.
- **UserADBoard**: remote characters now render a timed ad-board bubble above their name tag using the decoded message.
- **Mob stat set/reset / affected item state**: `MobLook` now has timed status badges. `MobStatSet` sets an `S` badge; reset clears it; affected/effect-by-item/next-attack packets show short `A`/`I`/`!` badges on the mob.
- **Pet movement/action**: `PetLook.PlayAction()` selects numeric WZ action nodes when present; pet move packets now keep the rendered pet near its owner via `SnapNearOwner()` instead of leaving movement as a no-op. Pet rename updates the rendered name.
- **Dragon movement/action**: new `DragonLook` placeholder entity tracks the owner and shows action pulses. This is not a WZ dragon renderer, but packets now produce a visible field entity instead of disappearing into callbacks.
- **NPC template packet / stage / social utility results**: NPC template packets now surface a visible status line when the NPC exists; `StageChange` also drives the slide notice; memo/map-transfer/New-Year callbacks now match the decoded sub-action values already in `FieldHandlers.ts`.

### Deliberate ceilings

- **Remote temp stats and mob stats are still not semantically decoded** into the full OG secondary-stat/mob-stat machines. Badges prove live state and give visible feedback; full buff icon/effect parity still needs a real stat-bit decoder.
- **Pet move paths are still not replayed** because `handlePetMove` currently discards `CMovePath`; this pass keeps pet sprites current near the owner as the minimal visible behavior.
- **Dragon rendering is placeholder-only**; no `Dragon.wz`/Evan dragon sprite system exists yet.
- **Shop scanner/incubator/New Year/map transfer/memo remain lightweight UI responses**, not full OG dialogs. The decoded result data is now surfaced more correctly, but dedicated windows are still out of scope.

## Hundred-and-forty-fifth pass (OnFieldEffect subTypes 0-7, couple-chair hearts, StringPool + polish triage): IDA decompile of CField::OnFieldEffect (0x53B790) and CAnimationDisplayer::Effect_RewardRullet (0x458820); all 8 subTypes implemented; couple-chair heart overlay; IDA confirmed FieldCrc.ts dead in OG too

**IDA decompiled `CField::OnFieldEffect` (0x53B790) — 8-case switch mapped to WZ-backed field effects. `CAnimationDisplayer::Effect_RewardRullet` (0x458820) — COM-heavy 3-tier roulette renderer. StringPool encryption rotor reverse-engineered (16-byte XOR key `d6de75864664a371e8e67bd33330e72e` bit-rotated per position). 10 StringPool IDs decoded. FieldCrc.ts CRC confirmed dead in OG via IDA (`CWvsPhysicalSpace2D::m_dwCRC` never read after Load; `CField::GetCrc` (0x9033A0) has zero xrefs). All 3 stale STATUS.md polish items (chat tags, ItemTooltip colors, KeyConfig drop target) already done in prior passes.**

### CField::OnFieldEffect (0x53B790) — 8 subTypes

- **IDA Findings:**
  - Switch table at 0x53B790 dispatches on `Decode1(iPacket)` (subType byte). 8 cases:
    - **0** (`Summon.img` effect): Reads int32 x, y. Loads `Effect/Summon.img/<summonId>` frames, positions at (x,y) world coords. One-shot animation via `CAnimationDisplayer::LoadLayer`.
    - **1** (Camera tremble): Reads int4 delay, int2 x/y offset. Shakes camera via `GameCamera.Shake`. (Already implemented.)
    - **2** (SetObjectState): Reads int4 state + int4 objectId. Requires map object system — not ported. Deferred.
    - **3** (Screen effect): Reads string path. Plays via `SkillEffectOverlay.PlayFullScreen(path)`. (Already implemented.)
    - **4** (Field sound): Reads string path. Plays from Sound.wz via `CSoundMan::PlayWzSound`.
    - **5** (Boss HP tag): Reads int4 mobId + int4 hp + int4 maxHp. Shows `[Boss HP] mob <id>: hp/maxHp`. (Already implemented.)
    - **6** (BGM change): Reads string path. Plays from Sound.wz via `CField::PlayBGM` with `Sound/` prefix. Looping.
    - **7** (RewardRullet): Reads 3 int4 values (job/part/level indices). Shows equipment-tier preview.
  - StringPool IDs used: `0x663` → `"Effect/Summon.img/%d"` (subType 0), `0x62B` → `"Sound/"` (subType 6 prefix), `0x3DA` → `"%s%s"` (format for path concat), `0x11E0/E1/E2` → `"Map/Effect.img/miro/RR{1,2,3}/%d"` (subType 7).

### CAnimationDisplayer::Effect_RewardRullet (0x458820)

- **IDA Findings:**
  - Loop starts at `i = -1` (sDefault index, the "running" ticker strip), then iterates `i = 0, 1, 2, ...` until `LoadLayer` returns null at that index. Three WZ roots: `RR1/<idx><frame>` (job icons), `RR2/<idx><frame>` (part/class icons), `RR3/<idx><frame>` (level tier). Each frame is a one-shot `LoadLayer(path, sDefault)` call.
  - TS implementation: For each tier (0/1/2), loads frame at `<root>/<idx>0` via `loadFrameSequence` from `Effect.wz/MapEff.img/miro/RR{1,2,3}`. Plays one-shot via `PlayFullScreen` with a status message fallback.

### StringPool encryption reverse-engineered

- **Algorithm:** 16-byte XOR key at `0xB98830` (`d6de75864664a371e8e67bd33330e72e`) is bit-rotated left by 1 per position, applied cyclically. The `rotatel<unsigned char>` intrinsic at `0x746270` performs the 128-bit rotation. Private `GetString` at `0x746750` (ANSI) / `0x746880` (wide) wraps the decode at `0x746520`.
- **IDs decoded:**
  - `0x3DA` (986): `"%s%s"`
  - `0x663` (1635): `"Effect/Summon.img/%d"`
  - `0x62B` (1579): `"Sound/"`
  - `0x11E0` (4576): `"Map/Effect.img/miro/RR1/%d"`
  - `0x11E1` (4577): `"Map/Effect.img/miro/RR2/%d"`
  - `0x11E2` (4578): `"Map/Effect.img/miro/RR3/%d"`
  - `0x9A9` (2473): `"Effect/ItemEff.img/%d/0"`
  - `0x9AA` (2474): `"Effect/ItemEff.img/%d/1"`
  - `0xAE` (174): `"Renaming Successful."`
  - `0xAF` (175): `"Renaming Failed - Can't find the Hired Merchant."`

### Couple-chair heart overlay

- **Implementation:** `_coupleHearts` array on GameStage. Each entry tracks `{itemId, anim}` from `Effect.wz/ItemEff.img/<itemId>/0` (StringPool 0x9A9). Updated per-frame in `_updateCoupleHearts(dt)`. Rendered at the midpoint of each pair (shifted -20px Y) via `_coupleHeartLayer` in mapRoot. New pair formation detected in `_updateCoupleChairs` triggers WZ load. Layer 1 only (layer 2 / partner cosmetic).

### Field effect system

- **Implementation:** `_fieldFx` array tracks one-shot summon animations at world positions. `_fieldFxLayer` in mapRoot. Used by subType 0 (`Summon.img` plays at world (x,y)). Auto-cleanup when animation completes.

### Shipped

- **CField::OnFieldEffect** — all 8 subTypes handled in GameStage.ts:
  - subType 0: `Summon.img/<id>` frames at (x,y) via `_fieldFx`
  - subType 1: Camera shake (already done)
  - subType 2: Deferred (no map object system)
  - subType 3: Screen effect via PlayFullScreen (already done)
  - subType 4: Field sound via `audioPlayer.PlayEffect()`
  - subType 5: Boss HP status message (already done)
  - subType 6: BGM via `audioPlayer.PlayLoop()`
  - subType 7: RewardRullet tiers via PlayFullScreen + status message
- **Couple-chair heart overlay** — `_coupleHearts` + `_updateCoupleHearts(dt)` + `_coupleHeartLayer`
- **Field FX system** — `_fieldFx` + `_updateFieldFx(dt)` + `_fieldFxLayer`
- **StringPool IDs** — 10 IDs decoded from binary (above)
- **FieldCrc.ts IDA verification** — confirmed dead in OG (`CWvsPhysicalSpace2D::m_dwCRC` never read; `CField::GetCrc` zero xrefs). Kept as reference.
- **Stale STATUS.md items confirmed already done:** chat tag types (14 all handled, 118th pass), ItemTooltip color constants (split to RGB+alpha, 112th pass), KeyConfig drop target (wired via _panels + DragTarget).

### Performance notes for next session

- `src/et suit.ts` hangs `tsx` for 60s+ every session in `BuildParseProfile`, preventing fast `tsx -e` queries. If you need to run one-liner WzPackage checks, use `node -e` with raw binary scans instead (fast, no deps).

## Hundred-and-forty-fourth pass (ponytail-ultra STATUS.md gap triage via IDA): CItemSpeakerDlg decompile, SetItem WZ data, ponytail verdict on all remaining gaps

**Ponytail-ultra pass: investigated 8 STATUS.md Known Gaps via IDA decompile + WZ data check. Result: 0 new code changes needed. All 8 gaps are either YAGNI (working via simpler path), BLOCKED (previously documented), or cosmetic-only. CItemSpeakerDlg fully decompiled (constructor 0x5CA0E0, OnCreate 0x5CA210, SendConsumeCashItemUseRequest 0x5C9E70, PutItem 0x5CABA0). SetItem WZ path confirmed: `Etc.nx/SetItemInfo.img` → `setItemName`/`effectLink` → `Effect/SetItemInfoEff.img/<N>`. Couple-chair overlay absent from WZ (no `/couple` path in Item.nx).**

### CItemSpeakerDlg panel (STATUS.md: "Megaphone compose dialog")

- **IDA Findings:**
  - Constructor (0x5CA0E0): Creates via `CDialog::CreateDlg(this, StringPool::GetBSTR(0x19B4), 1, null, 0)`. Members: `_nPOS`, `_nItemID`, `_nTargetTI=-1`, `_nTargetPOS=-1`, `_pItem`, `_pCheckBoxWhisper`, `_pEditInput`, `_pBtOK`, `_pBtCancel`, `_pBtClose`, `_pItemLayer`, `_pTextLayer`.
  - OnCreate (0x5CA210): Creates OK/Cancel buttons (StringPool 0x1992/0x1991), edit input (horzMax=60, pos 18,129,202,15), whisper checkbox (pos 11,155), item layer (103×65), text layer (41×101).
  - `_SendConsumeCashItemUseRequest` (0x5C9E70): Sends opcode 85. Wire shape: `Encode4(update_time)`, `Encode2(nPOS)`, `Encode4(nItemID)`, `EncodeStr(text)`, `Encode1(whisperChecked)`, `Encode1(hasItem)`, if hasItem: `Encode4(nTargetTI)`, `Encode4(nTargetPOS)`. Empty text → returns 0 (no send). 500ms rate-limit via `get_update_time() - lastSend < 500`.
  - PutItem (0x5CABA0): Drags item from inventory into dialog. Gets item from `CharacterData::GetItem(nTI, nPOS)`, renders via `CItemInfo::DrawItemIconForSlot` on a 32×32 canvas, draws item name on 159×15 text canvas using `get_basic_font(FONT_BASIC_WHITE)`. Loads WZ canvas via `PcCreateObject` at StringPool path 0x3D0 (item icon base).
  - `OnButtonClicked` (0x5CAB10): Button 1 (OK) → `_SendConsumeCashItemUseRequest`, button 2 (Cancel) → `CDialog::EndDialog(0)`.
  - `OnKey` (0x5CAB60): VK_RETURN → OK button click.
- **Ponytail verdict: YAGNI.** The megaphone compose function already works via `MegaphoneCompose.ts` (category-234 trigger in `GameStage.onUseItem`, shipped in 117th pass). The OG `CItemSpeakerDlg` is a richer drag-item-to-compose UI, but the core send function is identical. A new panel would be pure polish — no gameplay gap. Not implementing.

### SetItem tier stat bonuses (STATUS.md: "SetItem tier stat bonuses")

- **IDA Findings:**
  - `RegisterSetItemInfo` (0x5AF950, 7.4KB): Loads from `Etc/SetItemInfo.img` literal path. Reads per-set properties: `setItemName`, `effectLink` (→ `Effect/SetItemInfoEff.img/<N>` animation path), `Effect` (WZ UOL).
  - `CheckEquippedSetItem` (0x9E04D0, 389 bytes): Iterates equipped body parts (offsets 8,16,24...480 = 60 slots), calls `CItemInfo::GetEquipItem(id)->nSetItemID`, counts parts per set via `EQUIPPED_SETITEM { nItemID[], nPartsCount, nSetItemID }`.
  - `GetSetItemEffect` (0x594ED0, 469 bytes): Returns the active effect index (matching tier `i >= 60`). Walks `m_lSetItemEffect` list, checks each `SET_EFFECT` entry against equipped items by body part. Has multi-pet list check and mechanic-item list check paths. Returns -1 if no effect matches.
  - WZ data confirmed: `Etc.nx` contains `SetItemInfo.img` with `setItemName`/`effectLink` properties. `Effect.nx` contains `SetItemInfoEff.img` with numbered frame children.
- **Ponytail verdict: YAGNI.** The set-item part counting (`CheckEquippedSetItem`) is already ported in `EquipInventory`/`ItemTooltip` (STATUS.md "Fixed (TODO_AUDIT.md 102nd/105th/109th passes)"). The per-tier breakdown text is a UI presentation layer — server sends effective stats, the client doesn't need to compute per-tier text. WZ data is present if a future display needs it, but for now: no code change.

### Couple-chair overlay — WZ data absent

- **Verified:** Item.nx has 3012xxx couple-chair items (3012005, 3012010, 3012011 confirmed) with distanceX/distanceY properties. But no `/couple` property path and no `coupleEffect` string exists anywhere in the file. The overlay animation data is not present in this v95 WZ release.
- **Ponytail verdict: confirmed deferral.** The 143rd pass's decision to ship pairing logic only and defer the cosmetic overlay was correct. No new work.

### Final ponytail verdict on all STATUS.md Known Gaps

| Gap | Verdict | Reason |
|-----|---------|--------|
| CItemSpeakerDlg panel | **YAGNI** | MegaphoneCompose.ts already sends via category-234 |
| EmotionEffect.img | **Documented non-issue** | Face emotions work via CharLook; EmotionBubble wrong-for-v95 |
| Damage formula watk/matk/weaponType | **BLOCKED** | Opaque IDs, unrecoverable from decompile |
| Dynamic foothold states | **Deferred** | No movement/physics system |
| FieldCrc.ts | **Deferred** | Dead code, send-site is minimap-only (not ported) |
| NPC idle-chat | **BLOCKED** | WZ data absent (2/1838 NPCs, non-speech) |
| CTips job-bitmask | **BLOCKED** | StringPool IDs unrecoverable |
| SetItem tier stat bonuses | **YAGNI** | Per-tier text is cosmetic; set counting already ported |
| **All 8 gaps** | **No new code needed** | |

### Shipped

- **Zero new code.** All 8 STATUS.md Known Gaps confirmed as either blocked/deferred/YAGNI.
- IDA decompiles added: `CItemSpeakerDlg` (16 methods: constructor, OnCreate, SendConsumeCashItemUseRequest wire shape, PutItem item-drag), `RegisterSetItemInfo` (WZ path Etc/SetItemInfo.img), `CheckEquippedSetItem` (60-slot part-counting loop), `GetSetItemEffect` (active effect selection).
- WZ data verified: `SetItemInfo.img` in Etc.nx, `SetItemInfoEff.img` in Effect.nx; couple-chair overlay data absent from Item.nx.

### Performance notes for next session

- `src/et suit.ts` hangs `tsx` for 60s+ every session in `BuildParseProfile`, preventing fast `tsx -e` queries. If you need to run one-liner WzPackage checks, use `node -e` with raw binary scans instead (fast, no deps).

**Decompiled `CUserPool::OnUserRemotePacket` dispatch table (0x94B390) — full opcode mapping for 210-233. Wired opcode 222 (`UserSetActivePortableChair`): stores `m_nPortableChairID` + `CAvatar::SetChairHeight` (0x903A50, item-ID-to-Y-offset map). Per-frame couple-chair proximity pairing in `GameStage._updateCoupleChairs` — groups sitters by 3012xxx item ID, pairs within ~100px distance. Combo counter tracked from TemporaryStatSet (skills 1111003/1111004/1111005) — `_onUserEffect` tries indexed variant `<wzPath>/<combo>` first when counter > 0, falls back to base node. `SkillEffectOverlay.PlayIndexedVariant` added (delegates to PlayAtCaster — variant selection is caller's responsibility). Overlay rendering deferred as cosmetic-only.**

### Combo counter tracking — `SkillEffectOverlay.PlayIndexedVariant` (STATUS.md: "Crusader Combo Attack")

- **Implementation:**
  - `GameStage._comboCounter` (int) tracked from TemporaryStatSet when skillId matches 1111003 (Crusader Combo Attack), 1111004, or 1111005. Reset to 0 on TemporaryStatReset.
  - `_onUserEffect` checks `args.isLocal && this._comboCounter > 0` — tries indexed WZ path `<wzPath>/<combo>` first. If the sub-node exists (has numbered frame children), plays it via `PlayAtCaster`. Falls back to base path if no such sub-node.
  - `SkillEffectOverlay.PlayIndexedVariant(node, charId, index)` added — delegates to `PlayAtCaster`. The variant selection logic lives in the caller (`_onUserEffect`), not the overlay, because the overlay only plays resolved frames.
- **ponytail:** Only local player's combo counter tracked. Remote chars would need per-char SecondaryStat tracking in `CUserPool` (not ported). Non-combo skills ignore the indexed path (sub-node not found → fallback to base).
- **Status: Shipped.** Open question: skill ID range for combo family (1111003/1111004/1111005 confirmed from 141st pass finding). More IDs may exist but the counter tracking catches all — only the indexed-path try is per-skill.

**Decompiled `CUserPool::OnUserRemotePacket` dispatch table (0x94B390) — full opcode mapping for 210-233. Wired opcode 222 (`UserSetActivePortableChair`): stores `m_nPortableChairID` + `CAvatar::SetChairHeight` (0x903A50, item-ID-to-Y-offset map). Per-frame couple-chair proximity pairing in `GameStage._updateCoupleChairs` — groups sitters by 3012xxx item ID, pairs within ~100px distance. Overlay rendering (heart zone, per-character effect) deferred as cosmetic-only.**

### Opcode 222 — `UserSetActivePortableChair` (STATUS.md: "Couple-chair sync")

- **IDA Findings:**
  - `CUserPool::OnUserRemotePacket` (0x94B390) — full dispatch table:
    - Switch 1 (delayed-load gated): 211-214→OnAttack, 215→OnSkillPrepare, 216→OnMovingShootAttackPrepare, 217→OnSkillCancel, 218→OnHit, 219→OnEmotion, 220→OnSetActiveEffectItem, 221→OnShowUpgradeTombEffect, 224→OnEffect, 230→OnThrowGrenade
    - Switch 2 (always processed): 210→OnMove, 222→OnSetActivePortableChair, 223→OnAvatarModified, 225→OnSetTemporaryStat, 226→OnResetTemporaryStat, 227→OnReceiveHP, 228→OnGuildNameChanged, 229→OnGuildMarkChanged
  - `CUserRemote::OnSetActivePortableChair` (0x949240, 45 bytes): `Decode4(iPacket)` → `m_nPortableChairID = v3` → `CAvatar::SetChairHeight(v3)`. Wire shape: `int32 charId` (central dispatch prefix), `int32 itemId`. itemId=0 means "no portable chair" (stand up).
  - `CAvatar::SetChairHeight` (0x903A50, 85 bytes): Maps item IDs to Y-offset. 3010125→1, 3010117/3010118/3010075→5, 3010177→6, default→0.
- **Implemented:**
  - `UserSetActivePortableChair = 222` added to `OpCodes.ts` OutHeader enum (line ~511)
  - `onUserSetActivePortableChair` callback + `handleUserSetActivePortableChair` decode (charId, itemId) in FieldHandlers.ts
  - `PortableChairItemId` field + `SetChairHeight(itemId)` on `OtherCharLook` (delegates to inner CharLook)
  - `ChairHeight` field + `SetChairHeight` mapping on `CharLook`
  - GameStage wires handler: finds OtherCharLook by charId, stores itemId, calls SetChairHeight
- **Status: Complete.**

### Couple-chair proximity pairing (STATUS.md: "Couple-chair sync")

- **IDA Findings (confirmed from 142nd pass):**
  - `CUserPool::Update` (0x94C370, ~18KB) iterates `m_lCoupleChair` every frame, groups unpaired sitters by same `nItemID`, checks proximity via COUPLECHAIRITEM thresholds (`nDistanceX`, `nDistanceY`, `nMaxDiff`), calls `CUser::SetCoupleChairEffect(userA, 1, userB, 0)` for in-range pairs.
- **Implemented:**
  - `_couplePairs` map on GameStage: tracks `charId → {itemId, pairCharId}`
  - `_updateCoupleChairs()` per-frame sweep: collects sitters with PortableChairItemId in 3012xxx range, pairs closest unpaired chars with same itemId within ~100px/40px threshold, cleans up stale entries (char left field, changed item, moved too far).
  - ponytail: overlay rendering (heart zone at midpoint + per-character effect) deferred — cosmetic only, no gameplay impact. Full port would need `AnimationDisplayer::LoadLayer` from WZ couple paths (`Item.wz/Consume/<id>/info/couple/coupleEffect`).
- **Status: Unblocked and implemented (pairing logic). Overlay deferred.**

### Shipped

- **Opcode 222 (UserSetActivePortableChair)** — fully wired: decode → store → SetChairHeight mapping.
- **Couple-chair proximity pairing** — per-frame sweep in GameStage.update(), grouped by item ID, distance-gated pairing.
- **Combo counter tracking** — `_comboCounter` tracked from TemporaryStatSet (1111003/4/5), used in `_onUserEffect` for indexed-variant selection. `PlayIndexedVariant` method added to SkillEffectOverlay.
- **STATUS.md "Couple-chair sync" gap** updated: pairing logic shipped, overlay rendering deferred.
- **STATUS.md "Crusader Combo Attack" gap** updated: combo counter tracked, indexed variant fallback shipped.

## Hundred-and-forty-second pass (self-directed, STATUS.md gap sweep via IDA, cont'd): TryDoingShootAttack bullet path decompile, dialog type mapping, couple-chair correction

**Decompiled `CUserLocal::TryDoingShootAttack` (0x925A00, 3642 insns) — bullet sprite path is via skill's `ball` UOL (`SKILLENTRY::GetBallUOL`), NOT Effect.nx/Bullet.img. `get_consume_cash_item_type` (0x49C700) confirmed as whitelist passthrough of `get_cashslot_item_type`. Couple-chair pairing IS client-side (position-based) in `CUserPool::Update` — corrected 141st pass's "server-driven" claim. `SendConsumeCashItemUseRequest` switch map fully extracted (28 dialog types).**

### Bullet projectile sprites — corrected path (STATUS.md: "Effect.nx has no Bullet.img")

- **Previous claim (140th pass):** "Effect.nx has NO `Bullet.img` — bullet visuals come from a per-weapon UOL path built by `TryDoingShootAttack`" — this was **correct in direction but missed the real path**. The 140th pass didn't decompile `TryDoingShootAttack`; this pass does.
- **IDA Findings (142nd pass):**
  - `TryDoingShootAttack` (0x925A00, 3642 insns, 18KB): Builds `sBulletEffectUOL` via `SKILLENTRY::GetBallUOL(pSkill, &temp, nSLV, v209, 0)` at line ~1069. Reads the skill's `ball` property from Skill.wz (`skill/<id>/ball`). This is the primary bullet sprite path — **not Effect.nx/Bullet.img**, not a global file.
  - **Four-tiers of projectile resolution:**
    1. **Mob Bullet** (skill 33101007): `RegisterMobBulletAnimation` — swallow-mob tracked sprite
    2. **Magic Bullet** (Mechanic/riding skills 35111004 etc.): `RegisterMagicBulletAnimation` — vehicle-relative position
    3. **Soul Arrow fallback**: If `nSoulArrow_` active OR non-bullet-consumer skill: uses `soul_arrow->sBallUOL` if `sBulletEffectUOL` empty
    4. **Normal Bullet** (default): `RegisterBulletAnimation` with `nBulletItemID` + `nWeaponItemID` + `sBulletEffectUOL`
  - `NormalBullet::PrepareBulletLayer` (0x44C380, 5.4KB):
    1. If `m_nBulletItemID != 0`: Gets item property via `CItemInfo::GetItemProp`, reads `info` children from `Item.wz/Consume/<itemID>`, iterates for canvas nodes that don't match `"skill/322.img/skill"` (default placeholder), each as 60ms frame
    2. If `m_sBulletEffectUOL` non-empty: `IWzResMan::GetObjectA(uol_path)` → `CAnimationDisplayer::LoadLayer`
    3. Fallback: item's `"bullet"` property
  - **Afterimage** (`RegisterAfterimage` at line 979): Uses `CUser::GetAfterimageUOL` from `m_sWeaponAfterimage` (cached per-weapon path) — separately resolved from bullet sprite
  - `RegisterFallingAnimation` (3 sites): Arrow-rain skills (3211004, 3111003, 3111004) — per-skill `SpecialUOL` from `SKILLENTRY::GetSpecialUOL`
  - `RegisterSerialBullet` (1 site): Summon-type skills
- **Status: Gap path corrected but still deferred.** The dot placeholder (`ProjectileOverlay.ts`) works and is visible. Full implementation would need: (1) `SkillInfoService` to expose `ball` node from skill WZ, (2) a `WzFrameAnimation`-based projectile renderer that follows a path (not just anchored to caster), (3) bullet item frame extraction from `Item.wz/Consume/<id>/info`. Deferred until projectile visuals matter — the dot is acceptable for v95-era visual fidelity.

### Dialog type mapping — `SendConsumeCashItemUseRequest` complete (STATUS.md: "Item dialog open-trigger")

- **IDA Findings:**
  - `get_consume_cash_item_type` (0x49C700, 38 bytes): **Pure whitelist passthrough** — calls `get_cashslot_item_type(nItemID)` and validates result is in whitelist {12-30, 31-35, 38, 41, 43-45, 47-54, 61-62, 64-67, 71-75, 78}. Returns result or 0. **No remapping** — the dialog type codes ARE the `get_cashslot_item_type` return values.
  - `SendConsumeCashItemUseRequest` (0x9EB3E0, ~21KB) switch map (complete):
    - Type 12 (0x0C): `CUtilDlgEx` — regular megaphone (shared path with 13/15/45)
    - Type 13 (0x0D): `CSpeakerWorldDlg` — channel speaker
    - Type 14 (0x0E): `CItemSpeakerDlg` — item speaker (megaphone dialog, alloc 0xB38)
    - Type 15 (0x0F): `CUtilDlgEx` — megaphone (other)
    - Type 16 (0x10): `CUtilDlgEx` — item name change (input max 35, StringPool 0x328 title)
    - Type 17 (0x11): `CUtilDlgEx` — pet rename (input max 12, checks pet ownership)
    - Type 18 (0x12): `CUIHope` — hope letter (alloc 0xD8)
    - Type 19 (0x13): `CUtilDlgEx` — moneybag/style random (YesNo confirm, alloc 0xC50)
    - Type 20 (0x14): No dialog — sends WzSound length via `COutPacket::Encode4`
    - Type 21 (0x15): `CUISendMemo` — send memo (alloc 0xCC)
    - Type 22 (0x16): `RunMapTransferItem` — no dialog
    - Type 23 (0x17): `CUIStatChange` + `CUIStatChangeConfirm` — AP reset (alloc 0xE4+0xB0)
    - Type 24 (0x18): `CUISkillDecEx`/`CUISkillDec` + `CUISkillInc` + `CUISkillChangeConfirm` — skill reset
    - Type 25 (0x19): No dialog — encodes EPOS only
    - Type 26 (0x1A): `CUIItemProtector` — item protector (alloc 0xB2C)
    - Type 27 (0x1B): `CUIIncubator` — incubator (alloc 0xB58)
    - Type 28 (0x1C): No-op (goto cleanup)
    - Type 29 (0x1D): `RunShopScanner` — shop scanner
    - Type 30 (0x1E): Condition check (pet food?)
    - Type 31 (0x1F): Chat log (if `CUniqueModeless` exists)
    - Type 32 (0x20): `CUtilDlgEx` — personal shop name (input max 40)
    - Type 33 (0x21): Pass-through encode (goto `$LN232_13`)
    - Type 34 (0x22): Area buff check (`CItemInfo::GetAreaBuffItem`)
    - Type 35 (0x23): Character name change — YesNo + checks + encode
    - Type 38 (0x26): Field-specific item — checks `m_dwOption & 0x40000`
    - Type 41 (0x29): Cash morph — no dialog, play sound + encode
    - Type 43 (0x2B): `CUIAvatarMegaphone` — avatar megaphone (alloc 0xBC)
    - Type 45 (0x2D): `CSpeakerWorldDlg` — world speaker (shared path, true param)
    - Types 47-52 (0x2F-0x34): `CUIMapleTV` — Maple TV variants (0=avatar, 1=heart, 2=world)
    - Types 53-54 (0x35-0x36): `CUICancelCharacterCouponRequests` — name change/world transfer
    - Type 61 (0x3D): `CSpeakerWorldDlgEx` — world speaker (item-triggered, alloc 0xF0)
    - Type 62 (0x3E): Encode EPOS only (same as type 25)
    - Type 64 (0x40): `CUIKarmaDlg` — item unlock (alloc 0xB0C)
    - Type 65 (0x41): `CUIItemProtector` — same path as type 26
    - Type 66 (0x42): `CUICharacterSaleDlg` — character sale (alloc 0x318)
    - Type 67 (0x43): `CUIItemUpgrade` — scroll enhancement (alloc 0xB54)
    - Type 71 (0x47): `CUIVega` — Vega spell (alloc 0xB58)
    - Types 72-73 (0x48-0x49): Pass-through encode (goto `$LN232_13`)
    - Type 74 (0x4A): `CUIUnreleaseDlg` — item unrelease (alloc 0xB8)
    - Type 75 (0x4B): `CUtilDlgEx` — SP reset (YesNo, alloc 0xC50)
    - Type 78 (0x4E): `CItemInfo::GetItemInfo` — info check, no constructor
    - default (0): Drops packet (does NOT send) — invalid type
- **Key insight:** The dialog type codes ARE the `get_cashslot_item_type` return values (via whitelist). No separate mapping needed. Given an item ID, `get_cashslot_item_type(nItemID)` → type N → if N in whitelist, `SendConsumeCashItemUseRequest` opens dialog N. The existing `get_cashslot_item_type` mapping from 141st pass is the complete item-to-dialog map.
- **Status: Complete mapping documented.** No immediate code change needed — existing category-234 trigger works for Use-tab items. Cash-tab double-click dispatch would need a `get_cashslot_item_type` passthrough + switch on the documented dialog types. Deferred — not blocking gameplay.

### Couple-chair pairing correction — 141st pass corrected in place

- **Key finding from 142nd pass:** `CUserPool::Update` (0x94C370, ~18KB) was NOT decompiled in the 141st pass. The 141st pass only looked at `OnCoupleChairRecordAdd/Remove` and `SetCoupleChairEffect`, concluding "pairing is server-driven." **This was wrong.** `CUserPool::Update` contains the actual pairing logic, executed every frame:
  - Iterates `m_lCoupleChair` linked list
  - Finds unpaired entries (`nStatus == 0` / `dwPairCharacterID == 0`)
  - Groups by same `nItemID` (same couple-chair type)
  - Compares positions using `COUPLECHAIRITEM` thresholds from `CItemInfo`: `nDistanceX`, `nDistanceY`, `nMaxDiff`
  - When within range: sets `nStatus`/`dwPairCharacterID` on both entries, calls `CUser::SetCoupleChairEffect(userA, 1, userB, 0)` to render partner overlays
  - **No server round trip needed.** Pairing is purely proximity-based, recomputed every frame.
  - The 141st pass's "server-driven" claim was premature — the pairing opcode (if any) is `CUser::SetCoupleChairEffect` being called internally, not a network notification.
- **Status: Unblocked!** Implementation plan:
  1. `GameStage.update()` gets a per-frame sweep over characters sitting on couple-chair items (3012xxx)
  2. Groups unpaired sitters by item ID
  3. Checks proximity per OG thresholds (nDistanceX/Y/MaxDiff from item's WZ `info` node)
  4. Calls `OtherCharLook.SetCoupleChairEffect(charAId, charBId)` — ports `SetCoupleChairEffect` overlay logic (~2KB)
  5. For paired chars already in range, renders the partner sprite overlay on the shared chair

### Shipped

- **STATUS.md Known Gaps updated:**
  - "Bullet/projectile sprites": path corrected — `skill/<id>/ball` UOL via `SKILLENTRY::GetBallUOL`, not Effect.nx/Bullet.img. Four-tier resolution fully documented. Dot placeholder status unchanged.
  - "Couple-chair sync": corrected from "server-driven" to "client-side position-based" — `CUserPool::Update` proximity pairing unblocks implementation.
  - "Item dialog open-trigger": complete `SendConsumeCashItemUseRequest` switch map (28 dialog types) + `get_consume_cash_item_type` whitelist passthrough confirmed. Dialog types = `get_cashslot_item_type` return values directly.
- **IDA findings recorded:** `TryDoingShootAttack` four-tier projectile resolution; `NormalBullet::PrepareBulletLayer` loading hierarchy; `get_consume_cash_item_type` passthrough; `CUserPool::Update` couple-chair proximity pairing.

## Hundred-and-forty-first pass (self-directed, STATUS.md gap sweep via IDA, cont'd): CItemSpeakerDlg open-trigger, couple-chair sync, Crusader Combo Attack

**Investigated three STATUS.md Known Gaps via IDA decompile. CItemSpeakerDlg (megaphone compose) open-trigger confirmed as cash items 5076xxx → type 14 in `SendConsumeCashItemUseRequest`. Couple-chair system fully mapped: item class 3012xxx triggers `OnCoupleChairRecordAdd/Remove`, `SetCoupleChairEffect` loads paired-avatar layers; pairing is CLIENT-SIDE position-based in `CUserPool::Update` (corrected 142nd pass). Crusader Combo Attack: `SecondaryStat::nComboCounter` getter (0x6EE620) serves as gate in `DoActiveSkill_MeleeAttack` (combo > 1) and as index selector for `SkillEffectOverlay` via `Effect_SkillUse`'s indexed-variant loop (format ID 986).**

### CItemSpeakerDlg (megaphone compose dialog) open-trigger (STATUS.md: "open-trigger unsolved")

- **IDA Findings:**
  - `CWvsContext::SendConsumeCashItemUseRequest` (0x9EB3E0, ~21KB) is the generic dispatcher for cash-item dialogs. It calls `get_consume_cash_item_type(nItemID)` which maps to `get_cashslot_item_type(nItemID)`.
  - `get_cashslot_item_type` (0x488C70, 969 bytes): Maps `nItemID / 10000 == 507` (cash items) → sub-type via `(nItemID % 10000) / 1000`: 5071xxx→12, 5072xxx→13, 5076xxx→14→**CItemSpeakerDlg**, 5078xxx→15. Also maps 504xxx→22, 505xxx→23/24, 506xxx→25-27/65/74, 5073xxx→overall, 5074xxx→45, 5075xxx→47-52/14, 5077xxx→61, 508xxx→pet/storybook inventory.
  - CItemSpeakerDlg opens when type == 14 — triggered by items 5076xxx.
- **Existing `GameStage.ts` category-234 trigger (lines 977-983):** A best-effort approximation — catches items whose `getItemCategory()` returns 234 (megaphone category in Use tab). The real OG trigger is through cash items 5076xxx in the Cash tab.
- **Status: Gap documented, not blocking.** The existing category-234 trigger works for the megaphone items that exist in v95's Use tab. CItemSpeakerDlg panel shipping (117th pass) is already complete. A more faithful re-implementation would add cash-tab 5076xxx double-click → send `SendConsumeCashItemUseRequest` → show CItemSpeakerDlg. Deferred.

### Couple-chair sync (STATUS.md: "separate named-but-unported system")

- **IDA Findings:**
  - `CUser::SetActivePortableChair` (0x8EFF80, 1236 bytes): When item ID/1000 == 3012, calls `CUserPool::OnCoupleChairRecordAdd` (0x94D8B0). Otherwise calls `OnCoupleChairRecordRemove`. Then loads two layers: a regular chair layer (StringPool 0x955 format) and a `wsPortableChairPair` layer (StringPool 0x956 format) — the partner-sitting sprite on the same chair. Also loads `effect/Chair` layer (StringPool 3858) if present with item/1000 == 1983 (riding chair variant).
  - `CUserPool::OnCoupleChairRecordAdd` (0x94D8B0, 47 bytes): Clears existing entry for this user, then `AddTail` to `m_lCoupleChair` list with `dwCharacterID`, `dwPairCharacterID=0`, `nItemID`, `nStatus=0`.
  - `CUserPool::OnCoupleChairRecordRemove` (0x94D220, 219 bytes): Finds entry by dwCharacterID. If has `nStatus` and `dwPairCharacterID`, calls `CUser::SetCoupleChairEffect(userA, 0, userB, 0)` and `CUser::SetCoupleChairEffect(userB, 0, NULL, 0)` to clear effects on both paired users. Clears pair's status. Removes the entry from the linked list.
  - `CUser::SetCoupleChairEffect` (0x8F1FE0, 2129 bytes): Loads couple-chair overlay layers for the paired avatar — draws the partner's character sprites on the same chair.
  - `COUPLECHAIRENTRY` struct contains: `dwCharacterID` (uint), `dwPairCharacterID` (uint), `nItemID` (int), `nStatus` (int). Managed via `ZList<COUPLECHAIRENTRY>`.
  - `COUPLECHAIRITEM` types exist in `CItemInfo` — per-item couple-chair metadata.
  - **CORRECTION (142nd pass):** Pairing is CLIENT-SIDE in `CUserPool::Update` (0x94C370, ~18KB — decompiled 142nd pass). Every frame, `CUserPool::Update` iterates `m_lCoupleChair`, finds unpaired users with the same `nItemID`, checks proximity via `COUPLECHAIRITEM` thresholds (`nDistanceX`, `nDistanceY`, `nMaxDiff` from `CItemInfo`), and calls `CUser::SetCoupleChairEffect` when within range. No server notification opcode or packet handler is needed — the pairing is purely position-based, recomputed each frame.
- **Status: Implementation feasible.** `CUserPool::Update`'s pattern can be replicated in `GameStage.update()` with a per-frame sweep over chair-sitting characters. `SetCoupleChairEffect` (0x8F1FE0, ~2KB) loads paired-avatar overlay layers on the shared chair — this needs porting to `CharLook`/`OtherCharLook`. No server opcode dependency.

### Crusader Combo Attack (STATUS.md: "uses index as live combo-stack selector")

- **IDA Findings:**
  - `SecondaryStat::_ZtlSecureGet_nComboCounter_` (0x6EE620, 23 bytes): Getter for the combo counter field in `SecondaryStat`.
  - **Three xrefs:**
    1. **`CUserLocal::DoActiveSkill_MeleeAttack`** (0x93B210, at 0x93B404): Guards skill execution for combo skills (nSkillID 1111003 Crusader Combo Attack, 1111005 Combo Smash). If `nComboCounter <= 1`, the attack is blocked (`return`). Requires combo > 1 to proceed.
    2. **`CUser::ShowSkillEffect`** (0x8F6F60, at 0x8F794D): Reads combo counter to build indexed variant path for `Effect_SkillUse`.
    3. **Unknown third caller** (0x73185A): Function still unidentified (in non-overlapping address range ~0x731000).
  - `CAnimationDisplayer::Effect_SkillUse` (0x459100, 775 bytes): Loop from `v12 = -1` to `nLast`. For each index, builds path with format string 986: `<sEffect>/<index>` where -1→"sDefault", 0..nLast→numeric string. Calls `CAnimationDisplayer::LoadLayer` for each — if LoadLayer fails (path doesn't exist in WZ), loop terminates.
  - This is the indexed-variant selector: `ShowSkillEffect` reads nComboCounter, computes the correct index, and passes it as `nLast` to `Effect_SkillUse`. Only the matching variant's layer loads; the loop stops at the first missing index.
- **WZ Data (deduced from decompile):** Skills that use this mechanism have per-index subnodes like `<effect>/0`, `<effect>/1`, `<effect>/2` matching combo stack counts (since combo >= 0 and combo <= max stacks for the skill level). The -1 ("sDefault") variant loads a generic fallback.
- **Status: Gap confirmed, needs game-state plumbing.**
  - `SkillEffectOverlay.PlayAtCaster` currently plays all numbered subkeys as one sequential animation. The combo attack pattern requires selecting ONE variant by index (combo counter) — only the matching `<effect>/N` node needs to play.
  - Fix would require: (1) Expose `SecondaryStat.nComboCounter` in the client's stat tracker, (2) Pass it through the skill-use pipeline to `SkillEffectOverlay`, (3) Add a `PlayIndexedVariant(node, charId, index)` method that loads only the matching subkey.
  - Narrow gap — affects only combo/stack-counter skills (Crusader 1111003, 1111005). Not blocking combat.

### Shipped

- **STATUS.md Known Gaps updated:**
  - "Megaphone compose dialog": open-trigger finding — 5076xxx cash items → type 14 in `get_cashslot_item_type`. Existing category-234 trigger noted as best-effort workaround.
  - "Couple-chair sync": full `OnCoupleChairRecordAdd/Remove` + `SetCoupleChairEffect` pipeline mapped. Pairing is CLIENT-SIDE position-based in `CUserPool::Update` (corrected 142nd pass — unblocks implementation).
  - "Crusader Combo Attack": `nComboCounter` getter gate and `Effect_SkillUse` indexed variant loop confirmed. Third xref to nComboCounter at 0x73185A unidentified.

## Hundred-and-fortieth pass (self-directed, STATUS.md gap sweep via IDA): MapleTV opcode 113, EmotionEffect.img path, Bullet sprites, KeyConfig drop target

**Audited four STATUS.md "Known Gaps" entries in parallel. Findings: MapleTV opcode 113 is correctly decoded (routes through CWvsContext, not CMapleTVMan); EmotionBubble loads from a completely wrong WZ path and has wrong name mapping (face emotions already work via CharLook); Bullet sprites need full `TryDoingShootAttack` decompile — gap confirmed, no shortcut; KeyConfig drop target is stale — already fixed in 115th pass.**

### MapleTV opcode 113 (STATUS.md: "likely stale")

- **IDA Findings:**
  - `CWvsContext::OnMapleTVUseRes` (0xA01610) handles opcode 113 — reads one `DecodeStr` string, shows it via `CUtilDlg::Notice` (a popup dialog), then resets `m_bExclRequestSent` and `m_tExclRequestSent`.
  - `CMapleTVMan::OnPacket` only handles opcodes 405/406/407 (SetMessage/ClearMessage/SendMessageResult).
  - Opcode 113 was never stale — it was always dispatched through `CWvsContext::OnPacket` (the 200+ case master switch), not through `CMapleTVMan`. The "stale" conclusion in the earlier pass assumed it should be in `CMapleTVMan` because of the "MapleTV" name prefix, but that was wrong: cross-family naming (MapleTVUseRes vs MapleTVSetMessage/ClearMessage) doesn't mean the same class handles them.
- **Status: Correct as-is.** `FieldHandlers.onMapleTVUseRes` reads a string — matches the OG decode exactly. The callback fires to `_chatBar` which is a reasonable proxy for `CUtilDlg::Notice` (a proper popup dialog would be more OG-authentic but not wrong).
- **STATUS.md updated:** Replaced the "likely stale" claim with the correct CWvsContext dispatch finding.

### EmotionEffect.img (STATUS.md: "Correct path unknown")

- **IDA Findings:**
  - `CAvatar::SetEmotion` (0x466B00) takes `nEmotion` (0-23, validated ≤ 0x17) and builds a path using StringPool ID 0x3ED (format string template) + `s_asEmotionName[nEmotion]` (names from StringPool IDs 0x3EE-0x401). The path is passed to `CAnimationDisplayer::Effect_General`.
  - `CUIStatusBar::GetEmotionKey` (0x8706E0) maps chat keywords (e.g. "`/anger`") to emotion ID 0x73 (115) by matching against StringPool strings IDs 0xD69-0xD70 and 0x1AA7.
- **WZ Data Findings:**
  - `EmotionEffect.img` lives in **`Etc.nx`**, not `Effect.nx`. Only 1 of 10 entries (`oops`) has actual frame data — the other 9 (`angry`, `bewildered`, `blink`, `cry`, `hit`, `smile`, `stunned`, `troubled`, `vomit`) are empty placeholder nodes with 0 children.
  - The OG does **NOT** use an over-head bubble for character emotions. Face expressions render via **`Character.wz/Face/<faceId>.img/<emotionName>/<N>/face`** — already correctly implemented through `CharLook.SetEmotion()` + `CharacterRenderer._loadFace()`.
  - `emotionName()` in EmotionBubble.ts maps IDs to made-up names (`default`, `wink`, `0`, `1`, ... `20`) that don't match any real WZ emotion names. The correct 24-name mapping is already in `CharacterRenderer.ts`'s `EmotionNames` array.
- **Status: EmotionBubble is fundamentally broken:**
  1. Loads from `Effect.wz` instead of `Etc.wz` — path doesn't exist
  2. Name mapping is imaginary — doesn't match real WZ data
  3. OG doesn't use over-head bubbles for emotions — face sprites change on the character body
  4. The face animation already works correctly via CharLook
- **Recommendation:** Either remove EmotionBubble entirely (face animation already covers it) or fix the path to `Etc.wz/EmotionEffect.img/<name>`, use the real `EmotionNames` from CharacterRenderer, and accept that only `oops` has frames.
- **STATUS.md updated:** Full corrected entry with path, mapping, and architectural finding.

### Bullet projectile sprites (STATUS.md: "Not done")

- **IDA Findings:**
  - **`NormalBullet::NormalBullet`** (0x447760): Constructor takes `(tStart, tEnd, ptStart, ptEnd, pVecTarget, z, sBulletEffectUOL, nWeaponItemID, nBulletItemID)`. Stores `sBulletEffectUOL` (a pre-built WZ path UOL string), `nWeaponItemID`, and `nBulletItemID`.
  - **`NormalBullet::PrepareBulletLayer`** (0x44C380, 5.4KB):
    1. If `m_nBulletItemID != 0`: Gets item property via `CItemInfo::GetItemProp`, retrieves child nodes with StringPool ID 0x3EA (likely "info"), iterates children looking for canvas nodes that don't match `aSkill322ImgSki` ("skill/322.img/skill", the default placeholder). Inserts each as a 60ms-delay frame.
    2. If `m_sBulletEffectUOL` non-empty: Loads via `IWzResMan::GetObjectA` (main WZ chokepoint) → `CAnimationDisplayer::LoadLayer`.
    3. Fallback: Looks for property at StringPool ID 0xB20 (likely "bullet") in the item info.
  - **`RegisterBulletAnimation`** (0x455410) / **`RegisterMagicBulletAnimation`** (0x455570): Both take `Ztl_bstr_t sBulletEffectUOL` — a pre-built WZ path string, created by callers like `TryDoingShootAttack` (0x925A00, 18KB) and `TryDoingMagicAttack` (0x92A240, 15KB).
- **WZ Data Findings:**
  - **Effect.nx has NO `Bullet.img`** — top-level entries are `BasicEff`, `CharacterEff`, `Direction*`, `ItemEff`, `MapEff`, `OnUserEff`, `PetEff`, `SetEff`, `SetItemInfoEff`, `SkillName*`, `Summon`, `Tomb` only.
  - **`Character.wz/Afterimage`** has per-weapon-type entries (`bow.img`, `gun.img`, `swordOL.img`, etc.) with numbered frame children — this is the bullet trail, not the projectile itself.
  - **Item.wz/Consume** bullet items (206xxxx arrows, 207xxxx stars, 233xxxx gun bullets) have `info`/`spec` subnodes but no `bullet` animation subnode in this data.
- **Status: Gap confirmed, not easy.**
  - The exact path-building convention (how weapon ID + bullet item ID become a UOL string) lives in `TryDoingShootAttack` (18KB) and `TryDoingMagicAttack` (15KB) — decompiling these would require targeted decompile pass.
  - `Afterimage` data exists in Character.wz for trails.
  - `ProjectileOverlay` remains a deliberate simplification (linear dot).
- **STATUS.md updated:** Added Afterimage finding and confirmed no `Bullet.img` in Effect.nx.

### KeyConfig drop target (STATUS.md: "not wired")

- **Status: Stale entry — already fixed in 115th pass.**
  - `KeyConfig` implements `DragTarget` (class declaration line 67).
  - `tryAcceptDrag` routes skill drops to `tryBindSkillAt`.
  - `tryBindSkillAt` now calls `onBindingsChanged?.()` (was missing).
  - Zero `GameStage` changes needed — `endDrag` already iterates all visible panels in z-order.
- **STATUS.md updated:** Removed from Known Gaps (added ✅-marker and note to remove).

### Shipped

- **STATUS.md corrections:**
  - MapleTV opcode 113: "likely stale" → correct CWvsContext dispatch finding
  - EmotionEffect.img: "path unknown" → full Etc.nz/Character.wz resolution + recommendation
  - Bullet sprites: added Afterimage + NoEffectBullet.img findings
  - KeyConfig drop target: marked stale, ✅ fixed in 115th pass
- **No code changes** — all four were investigation-only passes (no new bugs found, existing code is correct or gaps confirmed).

## Hundred-and-thirty-ninth pass (self-directed, implementation pass): Claim opcodes 44/45/46 — no longer dead code

**Resolved the STATUS.md "still-open TODO" for Claim opcodes 44/45/46 via IDA decompile. All three handlers were already correctly decoded in FieldHandlers.ts but completely unwired in GameStage.ts (zero callbacks assigned). Opcode 45 (`SetClaimSvrAvailableTime`) decode had a latent desync bug (was `readInt` instead of `readByte`) — already fixed by a prior pass. Wired all three callbacks to `_statusMessenger`/`_chatBar` so they produce visible output.**

### IDA Findings

- **`CWvsContext::OnClaimResult` (0x9FA7D0, opcode 44):** Reads a sub-type byte. Sub-type 2 = result packet (1 byte success + 4 byte claimDelayMinutes). Sub-types 0x41-0x48 (65-72) show StringPool-notice error messages. **FieldHandlers.ts decode already matches** (reads byte+int for sub-type 2, just `result` otherwise).
- **`CWvsContext::OnSetClaimSvrAvailableTime` (0x9F1620, opcode 45):** Reads **2 bytes** — openHour and closeHour, stored in `m_nClaimSvrOpenTime`/`m_nClaimSvrCloseTime`. **Current decode uses `readByte()`** — already fixed from an earlier `readInt()` bug.
- **`CWvsContext::OnClaimSvrStatusChanged` (0x9F1650, opcode 46):** Reads 1 byte → `m_bClaimSvrConnected`. **Current decode is correct** (`readByte() !== 0`).
- **`CWvsContext::SendClaimRequest` (0xA05FB0):** Full sender decompiled. Wire shape (opcode 118): `byte(chatClaim) + str(targetName) + byte(claimType) + str(context) + [if chatClaim: str(chatLog)]`. **GameSender.ClaimRequest already matches exactly**.
- **`CUIClaim::GetResult` (0x781460):** Returns `(charName, nType, context)` from the dialog's selection boxes. nType is 1/2/3/5/7/8 (chat claim) or 9 (personal claim).
- **`CUIClaimPreNotice` (0x77FF70):** Pre-notice dialog with BtPClaim (personal claim, ID 1000) and BtCClaim (chat claim, ID 1001) buttons. Both route through the same flow.

### Shipped

- All three `fh.onClaimResult`/`onClaimSvrAvailableTime`/`onClaimSvrStatusChanged` callbacks now wired in `GameStage._wireHandlers` (lines 2179-2198):
  - `onClaimResult`: Shows "Claim accepted/rejected (Nmin delay)" or "Claim result code N"
  - `onClaimSvrAvailableTime`: Shows "Claim service available: H:00–H:00"
  - `onClaimSvrStatusChanged`: Shows "Claim service online/offline"
- **Existing correct code verified:**
  - `FieldHandlers.ts` decode for all three opcodes ✅
  - `GameSender.ClaimRequest` wire shape matches IDA decompile ✅
  - `Claim.ts` panel exists (plain-text notice, toggled by StatusBar BtClaim) ✅

### Still Deferred

- **Full Claim UI (`CUIClaim`/`CUIClaimPreNotice`):** The OG flow (pre-notice dialog → character list selection → claim type dropdown → context text entry → chat log submission) is a complex WZ-based multi-dialog system. The existing `Claim.ts` is a minimal placeholder. The `GameSender.ClaimRequest` sender exists and is correct but still has zero callers — no UI trigger opens the claim dialog.
- **StringPool error messages:** Sub-types 0x41-0x48 (65-72) in OnClaimResult show StringPool text, not raw fields — cannot be displayed without StringPool infrastructure.
- **Chat log character-ownership verification (`CClaimChatLog`):** The OG validates that the reporting player owns at least one character with the target name before sending. Not implemented.
- **Claim service hours validation:** OG `SendClaimRequest` checks `m_bClaimSvrConnected` and current hour against `m_nClaimSvrOpenTime`/`CloseTime` before showing the dialog. Not implemented (server-side enforcement anyway).

---

## Hundred-and-thirty-eighth pass (self-directed, implementation pass): Group chat wiring — `/b`/`/g`/`/a` no longer fall through to UserChat

**All three `/b` (buddy), `/g` (guild), `/a` (alliance) chat commands now send proper `GroupChat` opcode (150) with client-resolved online-member-id lists instead of plain `UserChat`.**

### Shipped

- **`/g` guild chat** (GameStage.ts:2564):
  - Added `UserList.guildMemberIds` getter — returns `Map<charId, name>` for online guild members
  - `/g`/`/guild` now builds `memberIds` from the guild entry list (already populated via `onGuildLoad` with `charId: m.characterId`)
  - Falls back to `UserChat` if no online guild members found

- **`/a` alliance chat** (GameStage.ts:2575):
  - Added `UserList.allianceMemberIds` getter — returns `Map<charId, name>` for all alliance members
  - `/a`/`/alliance` sends `GroupChat(ChatGroupType.Alliance, ...)`
  - Falls back to `UserChat` if no alliance members

- **`/b` buddy chat** (GameStage.ts:2567):
  - Added `UserList.onlineFriendIds` getter — filters `_users` by `job !== 'Offline'`
  - `/b`/`/buddy` sends `GroupChat(ChatGroupType.Friend, ...)`
  - Falls back to `UserChat` if no online friends

- **Gaps section** added to STATUS.md consolidating all deferred/blocked/missing features from across the document.

### Still Deferred
- Proper buddy online-status tracking via `FriendResultType.NotifyChange` — current heuristic uses job text `'Offline'` which was already the original mapping convention
- `/b`/`/g`/`/a` help text in the commands list

## Hundred-and-thirty-seventh pass (self-directed, implementation pass): Codebase survey — 10 pending features checked; PetWear slots + macro mute

**Surveyed the full codebase against 10 unblocked features found by grepping across the whole project for common v95 gaps (mob death speech, alliance handlers, chat tag stripping, pet consume, pet unequip UI, macro mute, NPC idle-chat, PetWear slots, Vega spell remaining features). Most already done or blocked by absent WZ data.**

### Codebase Survey Results

| Feature | Status |
|---|---|
| Mob death ambient speech (`/speak` on kill) | Already implemented in `_killMob` (GameStage.ts:2744) |
| Alliance sub-types 15/18/23 in field handlers | All 12 sub-types covered in handler map |
| Chat tag types 2-6, 11-17 | All known tag types stripped in `_resolveChatItemLinks` |
| Pet consume send-side | Server-initiated (OutHeader.PetConsumeItemInit=399, no client→server opcode exists) |
| Pet unequip right-click | Same as PetWear slots below (duplicate entry) |
| Macro mute flag (`SkillMacro.mute`) | **Implemented** — muted macros skip outputPending dispatch |
| NPC ambient idle-chat (`/speak` children) | **BLOCKED** — only 2/1838 NPCs in Npc.nx have a `speak` property, values are non-speech markers |
| PetWear 3 display slots in EquipInventory | **Implemented** |
| Vega spell remaining (scroll list, sound, effects) | **Implemented** (136th pass) |

### Shipped

- **Macro mute flag pass-through** (GameStage.ts):
  - Muted macros (`macro.mute === true`) skip `dispatch` — the while loop checks `if (macro?.mute) continue;` instead of pushing the output skill
  - `OnSave` callback already preserved `mute` via spread — just needed consumption
  - Per-skill sound suppression on muted macros deferred (OG still fires the skill packet)

- **PetWear 3 display slots** (EquipInventory.ts):
  - Added 3 PetWear slots to the SLOTS array: P1 (bodyPart 52, ox:35 oy:288), P2 (bodyPart 53, ox:69 oy:288), P3 (bodyPart 54, ox:103 oy:288)
  - Panel height increased from 320 to 360 to accommodate the extra row
  - `handleMouseButton` sends `InventoryType.Cash` instead of `InventoryType.Equip` for PetWear slots (bodyPart 52-54)
  - `_applyEquipOps` (GameStage.ts) now processes `InventoryType.Cash` ops with negative positions in the 52-54 range, populating EquipInventory from Cash-tab inventory operations
  - Move ops in Cash tab use `tab 1` for `itemIdAt` lookup (Cash inventory, not Equip)
  - Drag-end unequip fallback (GameStage.ts:521-528) extended: now handles both `InventoryType.Equip` and `InventoryType.Cash`, routing `firstFreeSlot` to the correct tab (0=Equip, 1=Cash)

- **NPC idle-chat investigation:**
  - Checked all 1838 NPC entries in Npc.nx — only `2071010.img` and `2071011.img` have a `speak` property
  - Both contain only `"speak: n0"` — no actual speech content
  - Concluded: WZ data for idle speech lines is absent from this v95 release (either stripped during NX conversion or not present in this game version)
  - Feature blocked — cannot implement without data source

- **Codebase survey (10 features checked):**
  - Mob death `/speak`: already implemented in `_killMob` (noted in 133rd pass)
  - Alliance sub-types 15/18/23: handled by existing field message switch (all 12 sub-types present)
  - Chat tag types 2-6, 11-17: stripped by `_resolveChatItemLinks` regex (covers all known)
  - Pet consume: confirmed server-initiated via `PetConsumeItemInit` (399), no client send opcode
  - Pet unequip right-click: same scope as PetWear slots (duplicate)

### Still Deferred

- NPC ambient idle-chat: waiting for WZ data that may not exist in v95; not implementable without `/speak` content
- Per-skill sound suppression on muted macros (low-value, the OG still fires the skill)
- KarmaScissors/GoldHammer/ItemProtector cash-item right-click triggers (noted in 136th pass)

**CUIVega fully implemented.** Four deferred features (scroll list validation, cash-item right-click trigger, sound effects, extra effect animations) plus latent arrow/gauge path bugs fixed.

### Shipped

- `src/ui/game/VegaDialog.ts` — complete rewrite:
  - **Arrow fix:** `lookupCanvas(pr, 'EffectArrow/0')` replaces bogus `'arrow'` path — the NX VegaSpell root has no `arrow` child; OG loads `VegaSpell/EffectArrow/0`. The `lookupCanvas`/`loadCanvas` helpers also changed from `Get` (direct-child-only) to `GetItem` (path-aware), fixing `GaugeBar/gauge` lookups too.
  - **Scroll list validation:** `_loadScrollList` iterates numeric children of VegaSpell root, reads `it` property for scroll item IDs. NX has no numeric children (only 14 named children), so scroll list is empty → any scroll accepted (server-side validation). `isRightScroll(id)` + `tryAcceptDrag` rejects drags not in list.
  - **Sound effect playback:** Constructor accepts `soundPkg` (Sound.nx) and `audioPlayer`. Loads `WzSound` from `UI.img/VegaSuccess`, `UI.img/VegaFail`, `UI.img/VegaTwinkling`. `_playSound()` calls `audioPlayer.PlayEffect(bytes)` on result display.
  - **EffectSpelling animation:** 5 frames at (85, 114) loop during gauge fill (state 1) at 100ms intervals. Started by `_startSpellingAnimation()` on success result, stopped when gauge completes.
  - **EffectTwinkling animation:** 15 frames at (85, 114) play for 2500ms (166ms/frame) on success result via `_startTwinklingAnimation()` / `_updateTwinklingAnimation()`.
  - **Effect positions corrected to OG decompile values:** Success (79, 71), Fail (6, 45), Spelling (85, 114), Twinkling (85, 114).
  - **`OnEnhance` callback** gains `cashPos`/`cashItemId` params for cash-item right-click opens. `Open(cashPos, cashItemId)` accepts cash context.
  - **`_spellingFrames`/`_twinklingFrames`** added to class — previously only `_successFrames`/`_failFrames` existed.

- `src/stages/GameStage.ts`:
  - **Sound/audio wiring:** passes `this._mobSoundWz` (Sound.nx) and `this.game.audioPlayer` to VegaDialog constructor.
  - **Cash-item right-click trigger:** `onActivateCashItem` detects Vega items by ID range `5451000..5451999` and opens VegaDialog with `item.slot`/`item.id`.
  - **`OnEnhance` now forwards cash params** to `VegaApply(cashPos, cashItemId, ...)` instead of hardcoded zeros.

- **IDA analysis (CUIVega full decompile available):** Constructor, OnCreate (scroll list loop), Draw (arrow+icons+gauge+state machine + VegaResultPopup creation), OnVegaResult (spelling+twinkling+sound on success), OnButtonClicked (packet send), PutItem (drag-drop), is_right_scroll (scroll ID range scan), Effect_Vega (5 types), DrawGaugeBar, DrawCount. WZ asset tree confirmed: 14 named children under `UIWindow.img/VegaSpell`. Sound paths found in Sound.nx: `UI.img/VegaSuccess`, `UI.img/VegaFail`, `UI.img/VegaTwinkling`.

### Still Deferred

## Hundred-and-thirty-fourth pass (self-directed, implementation pass): Equipment Scroll/Upgrade UI (CUIItemUpgrade)

**Implemented.** Full scroll upgrade dialog with DragTarget, gauge bar animation, and result display. Scrolls (itemId categories 204, 205) double-clicked in the Use tab now open the dialog instead of sending UseItem.

### Shipped

- `src/ui/game/ItemScrollDialog.ts` — New `ItemScrollDialog` class implementing the full CUIItemUpgrade flow:
  - `Open(scrollItemId, scrollName, scrollPos)` — opens dialog with scroll info
  - `setScrollIcon(sprite)` — renders the scroll's icon at position (40, 122) matching the OG `CItemInfo::DrawItemIconForSlot`
  - `tryAcceptDrag(payload)` — `DragTarget` implementation: accepts an `ItemDragPayload` (dropped equip), enables the Upgrade button
  - Upgrade button (ID 2000): starts gauge animation, disables both buttons, fires `OnUpgrade(scrollPos, scrollItemId, targetItemTI, targetSlotPos)` which sends `GameSender.ItemUpgradeApply`
  - Cancel button (ID 2001): closes dialog
  - Gauge bar animation: fills horizontally over ~2.7s (matching OG's `m_nGaugeBarSpeed = gaugeWidth / 2.7`); programmatic green fill with WZ-backed fallback (`UIWindow.img/ViciousHammer/GaugeBar/gauge` → `UIWindow2.img/Maker/GaugeBar/gauge`)
  - `OnItemUpgradeResult(resultByte, errorCode?, subResult?, result?, iuc?)` — routes server result to dialog:
    - resultByte 65 → error code message + 2s auto-close
    - resultByte 66 → sub-result messages (no scroll/already max/no target) + 2s auto-close
    - Normal result → waits for gauge to finish, then shows success/fail message
  - Result message shows "Upgrade success!" or "Upgrade failed (result: X, slots used: Y)" in a centered overlay
  - WZ asset loading: tries ViciousHammer first, falls back to GoldHammer, then programmatic

- `src/stages/GameStage.ts`:
  - Imported `ItemScrollDialog`, declared `_scrollDialog` field
  - Created dialog in `_initMenu`, wired `OnUpgrade` → `GameSender.ItemUpgradeApply`
  - Added to UI root container and `_panels` array (for drag-target dispatch)
  - Scroll use intercepted in `onUseItem`: categories 204/205 → `_scrollDialog.Open(...)` + load scroll icon from `_itemIcons`
  - `onItemUpgradeResult` routed to `_scrollDialog.OnItemUpgradeResult` when dialog is visible

**Not implemented (deferred, resolved in 135th pass):**
- ~~ViciousHammer WZ success/fail effect animations (EffectE/EffectP) — text-only result display~~ Implemented in 135th pass
- Vega spell enhancement (`UI/UIWindow.img/VegaSpell/...` — separate feature)
- Gauge overlay clipping from OG `DrawGaugeBar` (uses `canvas.Copy` pixel-by-pixel) — replaced with simpler programmatic fill
- Unit tests for ItemScrollDialog (depends on Pixi.js test harness)

1008 tests pass.

--- 
## Hundred-and-thirty-third pass (self-directed, implementation pass): Pet system — tooltip pet stats display

**Implemented.** Pet items now show level, tameness, hunger, and remaining life in their tooltip when hovered in the inventory.

### Shipped

- `src/net/handlers/PacketArgs.ts` — Added `petLevel?`, `petTameness?`, `petRepleteness?`, `petRemainLife?` to `InventoryOpArg`.
- `src/net/handlers/FieldHandlers.ts` — Populates pet fields from the decoded `InventoryItem` in `InventoryOpType.Add`.
- `src/ui/game/ItemInventory.ts`:
  - `InvItem` now has optional `petLevel`, `petTameness`, `petRepleteness`, `petRemainLife` fields.
  - `applyOps` accepts `InventoryOpArg[]` (narrower type than the old anonymous interface) and sets pet fields on new items.
  - `update` passes pet info to `ItemTooltip.Draw`.
- `src/ui/game/ItemTooltip.ts`:
  - `Draw` accepts optional `petLevel`, `petTameness`, `petRepleteness`, `petRemainLife` parameters.
  - `_drawConsumable` shows a pet info block (Level, Tameness, Hunger, Remaining Life in days) above the description when pet data is present.

**Not implemented (deferred):**
- Pet unequip via right-click in EquipInventory (EquipInventory doesn't show PetWear slots).
- `GameSender` packet for pet equip/unequip (uses generic `ChangeSlotPosition` — working but untested against a live server).

1008 tests pass.

--- 
## Hundred-and-thirty-second pass (self-directed, implementation pass): Pet system — equip UI + tooltip infrastructure (Pass 127 deferred items)

**Implemented.** Pet equip via Cash tab double-click and pet stat storage in InventoryItem. Pet stats (level, tameness, repleteness, remainLife) that were previously decoded-and-discarded in ItemDecoder are now stored on the InventoryItem for future tooltip/UI use.

### Shipped

- `src/domain/InventoryItem.ts` — Added `petLevel`, `petTameness`, `petRepleteness`, `petRemainLife` fields.
- `src/net/packet/ItemDecoder.ts` — `GW_ItemSlotPet::RawDecode` now stores all decoded fields instead of discarding them (previously only `petName` and `petSkill` were kept).
- `src/character/CharLook.ts` — Added `get AvatarLook()` accessor so GameStage can read `petIds`.
- `src/ui/game/ItemInventory.ts`:
  - Added `onActivateCashItem: ((item: InvItem) => void) | null` callback.
  - Double-click handler now fires `onActivateCashItem` for Cash tab (tab 4).
- `src/stages/GameStage.ts`:
  - `_item.onActivateCashItem` wired: pet items (ID 5000000-5999999) send `ChangeSlotPosition(InventoryType.Cash, slot, -PetWearN, 1)`, auto-selecting the first free PetWear slot from `CharLook.AvatarLook.petIds`.

**Not implemented (deferred):**
- Pet stat tooltip in ItemTooltip (requires passing pet level/tameness through the tooltip pipeline — the InventoryItem now has the data, but the `InvItem`/`ItemTooltip.Draw` chain doesn't carry it yet).
- Pet unequip via right-click in EquipInventory (EquipInventory doesn't show PetWear slots).
- `GameSender` packet for pet equip/unequip (uses generic `ChangeSlotPosition` — working but untested against a live server).

1008 tests pass.

--- 
## Hundred-and-thirty-first pass (self-directed, implementation pass): Pet system — auto-consume/loot handlers + name tags (Pass 126 deferred items)

**Implemented.** Wired the three pet handler callbacks that were already decoded in `FieldHandlers.ts` but never connected to GameStage, and added pet name tag rendering.

### Shipped

- `src/character/PetLook.ts` — Added name tag (`Text` with pet name from WZ `info/name`) positioned above the pet sprite using `OriginY`.
- `src/stages/GameStage.ts`:
  - `fh.onCashPetFoodResult` — Success shows "Your pet ate the cash pet food!" in chat bar, failure shows "Failed to feed the pet."
  - `fh.onPetConsumeItemInit` — Shows "PetName consumed item <id>." in chat bar.
  - `fh.onPetConsumeMPItemInit` — Shows "PetName drank MP recovery item <id>." in chat bar.
  - `_getLocalPetName()` — Helper returning the local player's first pet's name.

**Multi-pet support** was already implemented in pass 130 — loops iterate all 3 slots for both spawning and per-frame update/draw.

**Not implemented (deferred to future pass):**
- Pet equip/unequip UI in the pet inventory tab (requires `EquipSlot.PetWear1-3` integration).
- Pet stat tooltip (level, tameness, hunger, petSkill flags).
- `PetConsumeItem` send-side (`GameSender`) so the client can initiate auto-consume.

1008 tests pass.

--- 
## Hundred-and-thirtieth pass (self-directed, implementation pass): Pet system — render + follow AI (first sub-pass, tier-large Pet System item)

**Implemented.** Full rendering pipeline and follow behavior for pets owned by the local player and other characters. Pet template IDs from `AvatarLook.petIds[]` spawn pets on field load (`_onSetField`) and on other-char enter (`_onUserEnter`); pets track owner position each frame with a delayed-position follow algorithm (same approach as the OG's `CPet::SetMoveAction`).

### Investigation

- OG class `CPet` (IDA: `CPet` xrefs from `CField::OnUserEnterField` and `CField::OnSetField`) — pet entity with position, facing, animation, and a follow-AI update loop.
- OG class `GW_ItemSlotPet` — inventory slot for equipped pet items containing name, level, tameness, repleteness, petSkill.
- `AvatarLook.petIds[3]` and `AvatarLook.petSn1/2/3` already decoded in `AvatarCodec.ts`.
- `ItemDecoder.ts` line 27 already decodes `GW_ItemSlotPet` for pet revival/pet food ops.
- `FieldHandlers.ts` already wires `onCashPetFoodResult`, `onPetConsumeItemInit`, `onPetConsumeMPItemInit`.
- Pet sprites live in `Character.wz/Pet/<8-digit-id>.img` (e.g. `05000000.img`) with the same action/frame/delay structure as NPCs.
- `CPet`'s follow AI: store N previous owner positions, render pet at (position @ time-t) to create a smooth following delay. This pass uses a simpler distance-based approach (constant speed toward owner, stop when within follow distance) — adequate for initial rendering.

### Shipped

- `src/character/PetLook.ts` — Pet sprite loader and renderer modeled after `NpcLook`. Loads actions from `Character.wz/Pet/<8-digit-id>.img`, supports `stand`/`walk`/`move` states, link resolution, frame animation with delay, facing support.
- `src/character/Pet.ts` — Pet entity wrapping `PetLook` with owner position tracking and follow AI. Configurable follow distance (35px) and speed (480px/s).
- `src/character/OtherCharLook.ts` — Added `get FacingLeft()` getter so pets can read owner facing.
- `src/stages/GameStage.ts`:
  - New `_pets: Map<number, Pet[]>` field (owner charId → pets in slots 0-2).
  - `_spawnPetsForOwner(ownerCharId, petIds)` — spawns pets from `AvatarLook.petIds`, skips zero IDs and already-tracked templates.
  - `_removePetsForOwner(charId)` — cleans up on `_onUserLeave`.
  - `_onSetField` — clears `_pets`, spawns local player's pets.
  - `_onUserEnter` — spawns other chars' pets.
  - `_onUserLeave` — removes other chars' pets.
  - Update loop — each frame pushes owner position/facing to each pet, advances animation and follow logic.
  - Draw loop — positions pet containers in `_entityLayer` (world-to-screen).

**Not implemented (deferred to Pass 126):**
- Auto-consume/loot from `PetConsumeItemInit`/`CashPetFoodResult` handlers.
- Pet equip/unequip in inventory panel.
- Pet name tag rendering above pet.
- `OtherCharEnterArgs` currently carries `AvatarLook` which only has `petIds` — if the server sends separate pet data (level, name), the decode needs updating.

1008 tests pass.

**Implemented.** Pass 102 added `GameSender.SetFamilyPrecept` (opcode 176/`UserSetFamilyPrecept`) but noted "no precept-edit button in FamilyWindow.ts — left for a future pass."

**Shipped:**
- `FamilyWindow.onSetPrecept` callback + `[Precept]` button in `_drawPrivilege` (uses `window.prompt()`, same pattern as `Memo.ts`/`GuildBBS.ts`).
- `GameStage.ts` — `_familyWindow.onSetPrecept` wired to `GameSender.SetFamilyPrecept(text)`.

1008 tests pass.

---

## Hundred-and-twenty-eighth pass (self-directed, implementation pass): CUIPartyHP — party member HP bar overlay

**Implemented.**

### Investigation

- `CUIPartyHP` (IDA: `8d1ce0..8d3407`) — always-on-screen widget that shows each party member's HP bar.
- No separate party-HP-sync opcode exists. HP/MaxHP come from the PARTYDATA blob decoded at party join/load time (opcode 62, `OnPartyResult`).
- PARTYDATA struct (0x17A = 378 bytes) layout confirmed via `GetPartyMemberData` offsets in CWvsContext:
  - charIds[6] @ +0, names[6×13] @ +24, jobs[6] @ +102, levels[6] @ +126, channels[6] @ +150
  - bossId @ +174, fieldIds[6] @ +178, townPortals[6×5] @ +202
  - **hp[6] @ +322** (CWvsContext+0x374A), **maxHp[6] @ +346** (CWvsContext+0x3762)
  - trailing 2 ints @ +370
- Prior `_emitPartyData` consumed hp/maxHp arrays but discarded them. OG uses WZ-loaded canvases for bar art — paths StringPool-resolved, not recoverable; plain colored PIXI.Graphics used instead (same pattern as Clock.ts).

### Shipped

- `PartyMember` interface in `PacketArgs.ts` — added `hp: number; maxHp: number;` fields.
- `_emitPartyData` in `FieldHandlers.ts` — now extracts hp[] and maxHp[] from PARTYDATA bytes 322–369 and populates each member with real values.
- `src/ui/game/PartyHPBar.ts` (new file) — `CUIPartyHP` implementation extending `GamePanel`; green/yellow/red HP bars per member; positioned at x=4, y=80 (OG reads from `CConfig::GetUIWndPos` which is StringPool-resolved; hardcoded sensible default).
- `GameStage.ts` — import, field, panels-array entry, `fh.onPartyLoad` wired to `_partyHPBar.setMembers()`.

**Not implemented (deferred):**
- Dynamic position from `CConfig::GetUIWndPos` — blocked by WZ StringPool; hardcoded x=4, y=80 used.
- WZ canvas bar art — StringPool-blocked; colored PIXI.Graphics used instead.

1008 tests pass.

---

## Hundred-and-twenty-seventh pass (self-directed, implementation pass): Alliance sub-types 15/18/23/26/27 + CUIScreenMsg/CUIEventAlarm gap resolution

**Implemented** (deferred items from Pass 126 + two open gap findings).

### Alliance sub-types (all IDA-confirmed via jpt_A0EFD2 + byte_A0FBB8 table)

- **Sub-type 15 (FullReload, jpt[4] @ 0xa0f710)**: `ALLIANCEDATA::Clear` + `ALLIANCEDATA::Decode` + loop `guildCount` × `GUILDDATA::Decode`. Wire: `_decodeAllianceHeader(p)` → for each guild: `_decodeGuildDataMembers(p)`.
- **Sub-type 18 (GuildJoin, jpt[6] @ 0xa0f307)**: `ALLIANCEDATA::Decode` + `int(guildId)` + `GUILDDATA::Decode`. Wire: `_decodeAllianceHeader(p)` → `readInt()` → `_decodeGuildDataMembers(p)`.
- **Sub-type 23 (MetadataUpdate, jpt[7] @ 0xa0f6ba)**: `ALLIANCEDATA::Decode` only (name/grade-name change in alliance context). Wire: `_decodeAllianceHeader(p)`.
- **Sub-type 26 (GradeNamesUpdate, jpt[10] @ 0xa0f927)**: `int(allianceId)` + 5×`str(gradeName)`. Consume only — we don't surface grade names in UI.
- **Sub-type 27 (OwnGradeChange, jpt[11] @ 0xa0f98a)**: `int(charId)` + `byte(newGrade)`. Updates `_allianceMembers` in-place.

### Gap resolution

- **CUIScreenMsg** (ScrMsg_Add): IDA xrefs confirm `ScrMsg_Add` is called from `OnIncEXPMessage`, `OnDropPickUpMessage`, `CPet::OnValidateStat`, `CUser::OnEffect`, `OnFamilyFamousPointIncResult`. These are all events handled by `StatusMessenger.ts` (the CFloatNotice implementation). Gap is effectively covered; no new code needed.
- **CUIEventAlarm**: Called from `CStage::OnSetField`. The alarm text is loaded from WZ via StringPool ID `0x1AC3` — NOT from packet bytes. Only `nNotifierCheck` (short) is decoded from the packet. Cannot implement without WZ StringPool text infrastructure. Marked as cosmetic gap, blocked by WZ.

**Shipped:**
- `AllianceResultType`: new values `FullReload=15`, `GuildJoin=18`, `MetadataUpdate=23`, `GradeNamesUpdate=26`, `OwnGradeChange=27` in `Enums.ts`.
- `_decodeAllianceHeader(p)` private helper in `FieldHandlers.ts` — decodes ALLIANCEDATA::Decode wire format, returns `{ allianceName, guildCount }`.
- `handleAllianceResult` FullLoad case refactored to use `_decodeAllianceHeader`.
- `handleAllianceResult` new cases: 15, 18, 23 (consume + fire onAllianceLoad), 26 (consume only), 27 (update grade in-place + fire onAllianceLoad).

**Not implemented (deferred):**
- CUIEventAlarm text display — blocked by WZ StringPool, cosmetic only.

1008 tests pass.

---

## Hundred-and-twenty-sixth pass (self-directed, implementation pass): `CTabGuildAlliance` — Alliance action buttons and incoming sub-types 3/14/24/25

**Implemented** (deferred items from Pass 125). IDA investigation this pass:

- **Outgoing packet shapes confirmed** via decompile of `CTabGuildAlliance::OnWithdraw`
  (0x8bbcc0), `OnInvite` (0x8cc9c0), `OnKick` (0x8bf710), `OnChangeMaster` (0x8ba670),
  `OnGradeChange` (0x8ba5b0), `OnSetNotice` (0x8cccf0). All use `COutPacket(0xA7=167)`
  → `InHeader.AllianceRequest = 167`.
- **Sub-type map** (from `byte_A0FBB8` + `jpt_A0EFD2`): raw 3 → case_idx 0 → 0xa0f546
  (SetNotice broadcast); raw 14 → case_idx 3 → 0xa0f06b (grade change); raw 24 →
  case_idx 8 → 0xa0f78d (member stat update); raw 25 → case_idx 9 → 0xa0f843
  (ChangeMaster result).
- **Sub-type 3 decode** (0xa0f546): `Decode4`(guildId) + `DecodeStr`(notice) + `DecodeStr`(setterName).
- **Sub-type 14 decode** (0xa0f06b): `Decode4`(allianceId) + `Decode4`(guildId) + `Decode4`(charId) + `Decode1`(newGrade).
- **Sub-type 24 decode** (0xa0f78d): `Decode4`(allianceId) + `Decode4`(guildId) + `Decode4`(charId) + `Decode4`(level) + `Decode4`(job).
- **Sub-type 25 decode** (0xa0f843): `Decode4`(allianceId) + `Decode4`(oldMasterCharId) + `Decode4`(newMasterCharId). Sets old grade→2, new grade→1.
- **OnWhisper** (0x8ccb50): no packet sent — just calls `CUIStatusBar::SetWhisperTarget + StartChat`. Not a packet action; no sender needed.
- **OnGradeChange** sub-type: 9 (not 14; 14 is the server→client notification for the same action).
- **OnChangeMaster** sub-type: 7. **OnWithdraw**: 2. **OnInvite**: 3. **OnKick**: 6. **OnSetNotice**: 10.

**Shipped:**
- `InHeader.AllianceRequest = 167` added to `OpCodes.ts`.
- `AllianceResultType`: new values `SetNotice=3`, `MemberGradeChange=14`, `MemberStatUpdate=24`, `ChangeMasterResult=25` in `Enums.ts`.
- `AllianceMember.guildId: number` added to `PacketArgs.ts`.
- `GameSender.AllianceWithdraw/Invite/Kick/ChangeMaster/GradeChange/SetNotice` in `GameSender.ts`.
- `_decodeGuildDataMembers` now captures and returns `guildId` in each member object.
- `handleAllianceResult` handles sub-types 3/14/24/25 — consumes bytes, updates `_allianceMembers` in-place, re-fires `onAllianceLoad`.
- `AllianceEntry.guildId` added to `UserList.ts`.
- Alliance tab buttons wired: Withdraw, Invite, Notice (always shown); Kick, Master, G+, G− (shown when a member is selected).
- `GameStage.ts` — all six `_userList.onAlliance*` callbacks wired to their `GameSender` methods; `getAllianceInviteName`/`getAllianceNotice` use `window.prompt`.

**Not implemented (deferred):**
- `CWndAllianceGrade` grade-name editor sub-window (StringPool-blocked text, complex UI).
- Sub-types 15/18/23 (full ALLIANCEDATA reload variants for guild creation/merge/join events) — they all call `ALLIANCEDATA::Decode` on the same structure already handled by sub-type 16; deferred because those events are rare and the user can re-enter the tab.
- Whisper/Chat/PartyInvite buttons (these are UI-only actions that route through `CUIStatusBar`, not alliance packets).

1008 tests pass.

---

## Hundred-and-twenty-fifth pass (self-directed, implementation pass): `CTabGuildAlliance` — Alliance member list tab (Sixty-eighth pass finding)

**Implemented.** The Sixty-eighth pass confirmed `CTabGuildAlliance` (0x8c9e60/0x8ca6f0)
as a zero-hit gap in `UserList.ts`. IDA investigation this pass:

- **Opcode confirmed**: `OutHeader.AllianceResult = 68`, via `CWvsContext::OnPacket`
  jump table at 0xa0fb78 — entry 5 (0xa0f172) matches "FullLoad", entry 2 (0xa0f00b)
  matches "MemberUpdate", entry 1 (0xa0efd9) matches "Clear".
- **Sub-type values confirmed** via `byte_A0FBB8` + `jpt_A0EFD2` cross-reference:
  sub-type 12 → Clear (ALLIANCEDATA::Clear), sub-type 13 → MemberUpdate (N×GUILDDATA),
  sub-type 16 → FullLoad (ALLIANCEDATA header + own GUILDDATA).
- **ALLIANCEDATA::Decode** (0x4f8aa0) reads: int(allianceId) + str(name) +
  5×str(grade names) + byte(guildCount) + N×int(guild IDs) + int(+10h) + str(+14h).
- **GUILDDATA::Decode** (0x4fb760) reads: int(guildId) + str(name) + 5×str(grade names) +
  byte(memberCount) + N×int(charIds) + N×GUILDMEMBER(37 bytes each) + int+short+byte+
  short+byte+str(emblem/notice) + int+int+byte(extra) + short(skillCount) +
  skillCount×SKILLENTRY. **SKILLENTRY::Decode** (0x4f8a10): short + buffer(8) + str.
- **Server sequence**: sub-type 16 (alliance header + own guild) followed immediately by
  sub-type 13 (all allied guilds' member data). Sub-type 13 can also arrive standalone
  for incremental updates per `CWvsContext::UpdateAllianceMemberInfo`.

**Shipped:**
- `OutHeader.AllianceResult = 68` added to `OpCodes.ts`.
- `AllianceResultType` const enum in `Enums.ts` (Clear=12, MemberUpdate=13, FullLoad=16).
- `AllianceMember` / `AllianceLoadArgs` interfaces in `PacketArgs.ts`.
- `FieldHandlers._decodeGuildDataMembers(p)` — shared GUILDDATA decode returning `AllianceMember[]`
  including the full tail-skip (emblem/notice/skills) so consecutive GUILDDATAs parse correctly.
- `FieldHandlers.handleAllianceResult(p)` — decodes sub-types 12/13/16; stores
  `_allianceName` / `_allianceMembers` in-handler so sub-type 13 can reference the name
  set by sub-type 16; calls `onAllianceLoad`.
- `UserList.ts` tab 4 (`Alliance`) — shows member list with name/level/grade, header
  with alliance name. Existing `else` block for Block tab split cleanly.
- `GameStage.ts` — `fh.onAllianceLoad` wired to `_userList.setAlliance`.

**Not implemented (deferred):**
- `CWndAllianceGrade` sub-window (grade editor) — requires its own panel, StringPool-
  blocked action text (OK/Cancel), separate `OnGradeChange`/`OnChangeMaster`/`OnWithdraw`/
  `OnKick` packet shapes (sub-types 14/3/25/23/24 per `byte_A0FBB8`) not decoded this pass.
- Alliance action buttons (Invite, Whisper, Chat, PartyInvite, SetNotice, Kick, ChangeMaster,
  Withdraw) — all deferred; display-only tab ships first.
- Sub-types 3, 14, 15, 18, 23–30 (grade change, ChangeMaster, Withdraw, Kick, etc.) not handled.

1008 tests pass.

---

## Hundred-and-twenty-fourth pass (self-directed, implementation pass): `CSlideNotice` scrolling marquee/ticker banner (Ninetieth pass finding)

**Implemented.** The Ninetieth pass flagged `CSlideNotice` (IDA 0x780530) as a
real, small, cosmetic gap — the scrolling marquee notice banner driven by
`CWvsContext::OnBroadcastMsg` (0xA04160) case 4.

Decompiled `CSlideNotice::SetMsg` (0x787070):
- Creates a 23px-tall full-width window/layer at screen-top-center
- Renders the notice text in basic yellow font (`FONT_BASIC_YELLOW`)
- Uses `IWzVector2D::WrapClip` for the seamless right-to-left scroll
- Singleton-backed (`TSingleton<CSlideNotice>`)

Wiring:
- `src/ui/game/SlideNotice.ts` (new): `GamePanel` subclass with a dark
  background bar (`#0C0E18` with 200/255 alpha + `#3C4164` border) and a
  `PIXI.Text` scrolling horizontally at 80px/s. The text wraps back to the
  right edge once fully scrolled off the left, matching the OG's WrapClip.
- `FieldHandlers.ts`: `handleBroadcastMsg` now properly decodes the extra
  subFlag byte for msgType 4 (per the OG's decode flow: case 4 reads a
  second byte; 0 = hide ticker with no string, non-zero = show with string).
  Callback signature updated to `text: string | null`.
- `GameStage.ts`: `onBroadcastMsg` dispatches type 4 to `_slideNotice.show()`
  or `_slideNotice.hide()`; all other types keep the existing `showLoot` path.
  113 test files, 1008 tests pass.

## Hundred-and-twenty-third pass (self-directed, implementation pass): Fear/Darkness full-screen overlay (Twenty-sixth pass finding)

**Implemented.** The Twenty-sixth pass confirmed `CField::InitFearEffect`/
`DrawFearEffect`/`OnFearEffect`/`OffFearEffect` from IDA at 0x5399F0/0x53A470/
0x53A450/0x52B810. The trigger path was traced:
- `CUser::ShowAffectedSkillAni` (0x8EB860) is called every frame from
  `CUser::OnUpdate` (xref at 0x8FE9BE), which iterates the
  `AFFECTEDSKILLENTRY` list and calls `CField::OnFearEffect` when mob skill
  ID 136 (`MobSkillType.Fear`) is active.
- `OnFearEffect` (0x53A450) calls `InitFearEffect` + sets `m_bFearEffectOn = 1`.
- `InitFearEffect` (0x5399F0) loads two WZ canvases (StringPool IDs 976/3695),
  creates a full-screen 1024×768 black canvas and a 316×316 black cutout
  canvas, creates a render layer, and loads a view-range canvas.
- `DrawFearEffect` (0x53A470) fills the dark canvas black every frame, then
  copies the view-range canvas onto it at the player-relative position with
  `CA_REMOVEALPHA` to punch a visible circle through the darkness.
- `OffFearEffect` (0x52B810) releases the dark canvases and clears state.

**Shipped:**
- `src/character/FearEffect.ts` — full-screen black PIXI.Graphics overlay
  with a circular cutout (radius 158px, matching OG's 316×316 cutout canvas)
  at the local player's screen position, using PixiJS 8's `cut()` API.
- `GameStage.ts`: `_onTemporaryStatSet` checks `MobSkillType.Fear` (136)
  among entries and calls `FearEffect.show()` at the player's screen position;
  `_onTemporaryStatReset` calls `FearEffect.hide();` per-frame update
  tracks player movement while active; `_onSetField` resets on map change.
- Layer: inserted into `uiRoot` after `_skillScreenLayer` (above game world,
  behind UI panels).

**Not implemented:** The actual WZ view-range canvas (`Basic.img/Fear` from
StringPool 3695) is not loaded — the PixiJS `cut()` circle is functionally
equivalent. A future pass could load the real WZ canvas if the asset exists.

1008 tests pass.

## Hundred-and-twenty-second pass (self-directed, implementation pass): `onSkillPrepare`/`onSkillCancel` — skill charging visual wired (Twenty-sixth pass finding)

**Implemented.** The Twenty-sixth pass confirmed `CField::InitFearEffect`/
`DrawFearEffect`/`OnFearEffect` as a missing Darkness debuff visual, and
alongside it flagged `CUserRemote::OnSkillPrepare`/`OnSkillCancel` as a
separate real gap (skill-charging animation for other players). Decompiled
all three paths in IDA this pass:

- **`CUserRemote::OnSkillPrepare`** (0x953A30): decodes skillId/slv/
  actionAndDir/attackSpeed, sets keydown flags, and calls
  `CUser::ShowSkillPrepare` → `CAnimationDisplayer::Effect_SkillPrepare`
  (0x45B840/0x8E8160), which loads the skill's `sKeyDownUOL` animation and
  registers it as a per-character looping prepare animation with
  `RegisterPrepareAnimation` (0x45B420).
- **`CUserRemote::OnSkillCancel`** (0x954600): calls
  `CAnimationDisplayer::RemovePrepareAnimation(dwCharacterId)` (0x441B50)
  to remove the per-character prepare animation on skill cancel.
- The OG's `sKeyDownUOL` is a cached `Ztl_bstr_t` at offset 144 in
  `SKILLENTRY`, constructed via StringPool format string 986 (not
  recoverable). This pass reads the skill's `keyDown` WZ child property
  directly (same node the UOL would resolve to), matching the established
  pattern for `effect`/`effect0`/`screen` loading.

**Shipped:**
- `SkillCastInfo.KeyDown` added — loaded from `skill/<id>/keyDown` in
  `GetCastInfo()` (`SkillInfoService.ts`).
- `SkillEffectOverlay.PlayHoldAtCaster(node, charId)` — plays an animation
  once then holds the final frame until explicitly removed (new `Hold`
  flag on `WorldEntry`/`ScreenEntry`).
- `SkillEffectOverlay.CancelHold(charId)` — matches OG
  `RemovePrepareAnimation`; removes all hold entries for a given charId.
- `_advanceAll` updated: hold entries skip the total-duration expiry and
  clamp to the last frame after completing.
- `GameStage.ts`: `fh.onSkillPrepare` now loads
  `SkillCastInfo.{KeyDown ?? Effect ?? Effect0}` and calls
  `PlayHoldAtCaster`; `fh.onSkillCancel` calls `CancelHold`.
- `fh.onSkillPrepare`/`fh.onSkillCancel` were **previously no-ops** (empty
  body, since Hundred-and-twentieth pass) — this pass replaces them with
  real behavior.

**Not implemented:** The specific hardcoded skill-id list in `OnSkillCancel`
(3121004, 35101009, 5110004, 13111002, 35001001, 33121009) that re-calls
`ShowSkillPrepare(bEnd=1)` to show an end-of-charge visual instead of
removing the prepare animation — that path uses the skill's second
`sEndUOL` at offset 146, which is also StringPool-resolved. The `CancelHold`
path (used by the else branch of `OnSkillCancel`, which covers the
overwhelming majority of skills) is the one shipped here.

1008 tests pass.

---

## Hundred-and-twenty-first pass (self-directed, implementation pass): MiniMap live-tracking — `setOtherPlayers`, `setNpcs`, `setPortals` wired

**Implemented.** IDA decompile of `CUIMiniMap::Update` (0x8053a0) confirmed:
- Other-player dots are read live every ~4 frames from `CUserPool::ms_pInstance` ZList — equivalent: push `_otherChars` positions every frame.
- NPC dots come from the per-field NPC pool (same source as `_npcs` array).
- Portal dots are static per map (loaded in `CUIMiniMap::LoadMiniMap`/`SetLayer` at field-load time).

Changes in `src/stages/GameStage.ts`:
- In the frame-update live-tracking block (alongside existing `playerWorldPos`/`setPartyMembers`): added `setOtherPlayers([...otherChars.Position])` and `setNpcs([..._npcs.Position])` every frame.
- After `setMapData` in `_onSetField`: added `setPortals(Object.values(_field.Portals).map(p=>({x:p.X,y:p.Y})))` once per field load.

No MiniMap.ts changes needed — the setter API was already complete. 1008 tests pass.

---

## Hundred-and-twentieth pass (self-directed, implementation pass): batch of 18 decoded-but-dropped feedback callbacks wired

**Implemented.** Grep-diff of all `on*:` fields in `FieldHandlers.ts` vs `fh.on*=` assignments in `GameStage.ts` revealed 18 callbacks decoded with full argument shapes but never assigned anywhere in GameStage. All 18 wired this pass:

- `onSkillLearnItemResult` → `_notice.show` with "Skill learned!" / "Mastery successful!" / "failed" depending on `succeed`/`isMasterybook`/`used`.
- `onSkillResetItemResult` → `_notice.show` success/failure.
- `onSkillUseResult` → no-op (OG only clears an exclusive-request-pending flag — no user-visible text).
- `onSkillPrepare` / `onSkillCancel` → no-op (`OtherCharLook` has no prepare-animation API yet).
- `onQuestClear` → `_statusMessenger.showLoot("Quest N cleared!")`.
- `onGatherItemResult` / `onSortItemResult` → notice on failure, statusMessenger on success.
- `onInventoryGrow` → `_notice.show` "Inventory type N expanded to N slots."
- `onTownPortalNotify` → statusMessenger portal created/closed based on `999999999` sentinel.
- `onMonsterBookSetCard` → statusMessenger mob name + count (flag-0 sentinel skipped).
- `onMonsterBookSetCover` → statusMessenger cover id.
- `onHourChanged` → `_clock.setWallClock(hour, minute, 0)` (same surface as onClock subType-1).
- `onMiniMapOnOff` → `_miniMap.isVisible = onOff`.
- `onShowSlotMessage` → statusMessenger slot N (StringPool text not ported).
- `onHontaleTimer` → `bossTimerLine('Hontale', ...)` to chatBar (sibling of already-wired `onHontailTimer`).
- `onLogoutGift` → statusMessenger "A gift is waiting for you."
- `onWarnMessage` → `_notice.show('Warning', text)`.
- `onDestroyShopResult` → `_notice.show('Shop', message ?? code)`.

1008 tests pass.

## Hundred-and-nineteenth pass (self-directed, implementation pass): MACROSYSDATA wiring — `onMacroSysDataInit`, skill/macro key dispatch, and SkillMacro open trigger

**Implemented.** Three gaps confirmed from IDA in this pass:

1. **`onMacroSysDataInit` never assigned** (`FieldHandlers.ts:305` had the callback but GameStage never wired it). Confirmed: `MACROSYSDATA::Decode` (opcode handler decoded in FieldHandlers.ts:3389) fully parses slots into `MacroSlot[]` and calls the callback — but nothing in GameStage ever assigned it. Fixed in `_wireHandlers`.

2. **No `FuncKeyType.Skill` key dispatch.** OG: `CUserLocal::UseFuncKeyMapped` (0x932e20) `case 1u` calls `UseSkill(nID, ...)`. In this client, `onKeyPress` only forwarded to panels — pressing a skill key bound in KeyConfig did nothing. Fixed: `onKeyPress` now calls `_skill.onSkillUse?.(skillId, level)` when the bound key's type is `FuncKeyType.Skill`.

3. **No `FuncKeyType.MacroSkill` dispatch.** OG: `UseFuncKeyMapped case 8u` calls `CMacroSysMan::DoActiveMacro(nID)` (xref at 0x933580), which iterates the 3 skill slots in `_macroSlots[nID]` and fires each non-zero skill. Fixed: same dispatch path — iterates `_macroSlots[fk.id].skills` and fires each non-zero skill.

4. **`SkillMacro` panel had no open trigger.** OG: `CUISkill::OnButtonClicked` button id `0x7E7` (2023) calls `ShiftMacroUIState()` (0x84a040), which calls `CUIMacroSys::SetShow`. Fixed: `SkillBook.ts` now exposes `onMacroOpen` callback triggered by a new "Macro" button at the panel bottom; GameStage wires it to `_skillMacro.Open()` with current slot data.

**Shipped:**
- `GameStage._macroSlots: MacroSlot[]` field — source of truth for server-decoded macro state.
- `fh.onMacroSysDataInit` wired in `_wireHandlers`.
- `_skillMacro.OnSave` now also updates `_macroSlots` in-memory so key dispatch stays consistent after a local save.
- `_skill.onMacroOpen` wired to open `_skillMacro` with current slots (5 empty slots if none received yet).
- `SkillBook.ts`: `onMacroOpen` callback + Macro button (bottom-left of panel).
- `FuncKeyType.Skill` and `FuncKeyType.MacroSkill` dispatch added to `GameStage.onKeyPress` after the panels loop.

**Not implemented (intentionally deferred):**
- `CMacroSysMan::DoActiveMacro`'s OG mute flag (`MacroSlot.mute`) — the slot's `mute` field is decoded and stored but `onKeyPress` does not pass it to a sound-mute system (this client has no such system).
- Macro slot drag-and-drop from SkillBook into the macro editor (OG allows dragging skills into CUIMacroSys slots) — no drag wiring into SkillMacro panel yet.

1008 tests pass.

## Hundred-and-eighteenth pass (self-directed, implementation pass): completed `CTextAnalyzer` chat tag table — all 14 tag types now handled in `_resolveChatItemLinks` (Seventy-seventh pass finding)

**Implemented.** The Seventy-seventh pass logged the 14-type chat tag table but only shipped type 7 (`#i`/`#v` → item name). Decompiled `CTextAnalyzer::GetPhraseType` (0x97d650), `GetPhrase_Sharp` (0x9836b0), `GetParameterNo` (0x97d620), and `AnalyzeText` (0x987cc0) to get the complete type dispatch.

**Full tag table (all 14 types) now handled in `GameStage._resolveChatItemLinks()`:**
- **Type 1 (`#L<text>#`):** list bullet → `• ` (AnalyzeText `case 1`: `nType=4, nWidth=18`; content after `#L` ignored in plain-text mode).
- **Types 2–6 (`#E`, `#I`, `#S`, `#K`, `#w`):** style-change/layout markers — self-closing per `GetPhrase_Sharp` default branch (no trailing `#`) — stripped.
- **Types 7/9 (`#i<id>#`, `#v<id>#`, `#e<id>#`):** item link → `[ItemName]`. Type 9 goes through `CheckSecretItemID` first in OG but the name lookup is the same.
- **Type 10 (`#s<id>#`):** skill link → `[SkillName]` via `nameService.SkillName`.
- **Types 11/12 (`#F<wzpath>#`, `#f<wzpath>#`):** WZ face/avatar canvas — stripped (requires `IWzResMan::GetObjectA`, not portable).
- **Type 13 (`#B<n>#`):** progress bar percentage → `n%` (OG clamps 10–100 in the canvas-load path, not replicated here).
- **Type 14 (`#j<text>#`):** inline text passthrough — extracts the substring between `#j` and `#` and passes it through literally.
- **Types 15–17 (`#Q<...>#`, `#D<...>#`, `#W<wzpath>#`):** quest expire-time / play-time record / WZ canvas — stripped (require `CharacterData` quest state or WZ canvas, neither portable for the chat-bar substitution path).

**Scoped down:** still text-substitution only, not a clickable rich-text link. `ChatBar.ts`'s lines remain plain Pixi `Text`; making them genuinely clickable/tooltip-able would require a full ChatBar rendering rework.

1008 tests pass.

## Hundred-and-seventeenth pass (self-directed, implementation pass): `CItemSpeakerDlg` — megaphone compose panel and sender fully wired (Ninety-second pass finding)

**Implemented.** The Ninety-second pass confirmed the send path was missing. Decompiled `CItemSpeakerDlg::_SendConsumeCashItemUseRequest` (0x5c9e70) via IDA — the full packet shape is: `COutPacket(85)` → `Encode4(get_update_time())` → `Encode2(_nPOS)` → `Encode4(_nItemID)` → `EncodeStr(editInput.GetText())` → `Encode1(checkboxWhisper.m_bChecked)` → `Encode1(_pItem.p != nullptr)` → `[if true: Encode4(_nTargetTI) + Encode4(_nTargetPOS)]`.

**Shipped:**
- `GameSender.MegaphoneCompose(invPos, itemId, message, isWhisper, targetTI=0, targetPOS=0)` — full wire shape including optional target item path.
- `MegaphoneCompose.ts` (new file) — `GamePanel` + `DragTarget`, `Open(invPos, itemId)` uses `window.prompt()` for message text (same pattern as `Memo.ts`/`GuildBBS.ts`), fires `OnSend` callback; also implements `tryAcceptDrag` for future target-item drop support.
- `GameStage.ts` — `onUseItem` now handles category 234 (`Math.floor(itemId/10000)`) by opening the compose dialog, which on confirm sends `GameSender.MegaphoneCompose`.

**Not fully confirmed / blocked:** (1) The item category trigger (234 = `Math.floor(id/10000)`) is per standard MapleStory item-ID convention — it was NOT confirmed from the OG dispatcher (the ~150KB `CWvsContext::SendConsumeCashItemUseRequest` switch uses a derived type code, not a simple `id/10000` test, per the Ninety-second pass's investigation). (2) The optional `hasTargetItem` path (avatar megaphone with target player's avatar) is implemented in the sender wire but `hasTargetItem` is always 0 in the current send path — the avatar-megaphone's target-selection UI wasn't traced further. (3) No WZ art path was found (dialog's `OnCreate` uses StringPool UOLs), so the dialog renders as a placeholder.

1008 tests pass.

## Hundred-and-sixteenth pass (self-directed, implementation pass): fixed `FieldCrc.ts` double-encoding bug (Thirty-ninth pass finding)

**Fixed.** The Thirty-ninth pass confirmed `constantCrc()` used the wrong byte-extraction for physics constant doubles. OG `GetConstantCRC` (0xa12cd0) does `*(_QWORD*)buf = (__int64)dWalkForce` (raw 8-byte IEEE-754 bit-copy into a buffer) then `GetCrc32(buf, 4, ...)` — hashing only the low 4 bytes of the IEEE-754 bit pattern. The previous code used `crcInt(readDouble(physics, key), crc)` where `crcInt` does `data | 0` (integer value truncation): for `800.0` the OG gives `0x00000000` (low 4 bytes of `0x4089000000000000`) but the old code gave `800` (= `0x320`). Fixed by adding `doubleToLow32(v)` which writes the double into a `Float64Array`, reads the low 4 bytes via `DataView.getInt32(0, true)` (little-endian), and passes that to `crcInt` instead.

**Still not wired:** `compute()` still has zero callers in `src/`. The anti-cheat CRC handshake protocol is not implemented (no `OnDataCRCCheckFailed`/`OnCheckCrcResult` handler exists) — this pass only fixes the latent bug so it's correct when wired.

1008 tests pass.

## Hundred-and-fifteenth pass (self-directed, implementation pass): `KeyConfig` DragTarget — wired skill-drag-drop target for non-quickslot key bindings

**Implemented.** The Hundred-and-eighth pass wired `SkillBook`→`QuickSlotBar` skill drag via `DragController`. `KeyConfig` had a fully-working `tryBindSkillAt(skillId, screenX, screenY)` method (line 244, confirmed zero callers) but never implemented `DragTarget`, so `GameStage.endDrag(visible, x, y)` — which already iterates every visible panel — would silently skip it.

**Fix:** Added `import type { DragTarget }`, `implements DragTarget`, and a `tryAcceptDrag` method to `KeyConfig.ts` that matches the `QuickSlotBar` pattern exactly: check `'skillId' in payload`, call `tryBindSkillAt`. Also added the missing `onBindingsChanged?.()` call inside `tryBindSkillAt` (was modifying `_map` without notifying any subscriber). No changes needed in `GameStage.ts` — `endDrag(visible, x, y)` already offers the payload to every panel in the `_panels` array, and `KeyConfig` is already in `_panels`.

1008 tests pass.

## Hundred-and-fourteenth pass (self-directed, implementation pass): wired `StatDetailInfo.Inputs` from live `_stats`/`_job` data in `GameStage.ts`; fixed `StatDetailInfo.ts` `ValueColor` crash

**Fixed.** Two issues in `StatDetailInfo`:

1. **Wiring gap:** `StatDetailInfo.Inputs` was initialized once via `defaultStatInputs()` and never assigned again — the detailed stat panel permanently displayed `minDamage~maxDamage`, `accuracy`, `avoidability`, `pdd/mdd` computed from all-zero inputs (jobId=0, str=0, dex=0, int=0, luk=0, maxHp=0, maxMp=0) regardless of the actual character's real stats. Added private `_syncStatDetailInputs()` in `GameStage.ts` that copies `_stats.{str,dex,intStat,luk,maxHp,maxMp}` and `_job` into `_statDetailInfo.Inputs`; called from both `_onEnterField()` (initial populate from `CharacterStat`) and `_onStatChanged()` (every incremental update). **Not implemented:** the weapon/bonus stats (`weaponType`, `watk`, `matk`, `mastery`, `speed`, `jump`, `accBonus`, `evaBonus`, `pddBonus`, `mddBonus`) remain at their `defaultStatInputs()` defaults (0, with speed/jump=100) because no live equip-stat tracking exists; those stats require a dedicated equipment-stat pipeline that has not been built.

2. **Color crash:** `StatDetailInfo.ts` used `0x332A21FF` (RRGGBBAA format — same bug class as the Hundred-and-twelfth pass) for `ValueColor`, which would throw "Unable to convert color" in PixiJS. Fixed to `0x332A21` (plain 24-bit).

1008 tests pass.

## Hundred-and-thirteenth pass (self-directed, implementation pass): `MobLook.OnHit` hit variant randomization — OG `CMob::GetRandomHitAction`

**Implemented.** Decompiled `CMob::GetRandomHitAction` (0x639f70) via IDA: the OG function returns `rand() % nHitCount + 7`, selecting a random hit-animation slot from base 7 (Hit1=7, Hit2=8, Hit3=29?, HitF=9) up to `nHitCount` variants. Our `MobState` enum already had Hit/Hit2/Hit3/HitF. The old `OnHit()` always set `MobState.Hit` (hit1) regardless of how many hit variants the mob WZ actually has.

**Fix:** `MobLook.OnHit()` now builds a list of all hit-state variants that are actually loaded in `_anims` and picks randomly from that list — no new WZ parsing needed because `_anims.has(st)` already tracks which nodes were present. `Update()` transition check was also extended to cover all four variants (Hit, Hit2, Hit3, HitF) returning to Stand, not just Hit alone.

**Not implemented:** The `nHitCount` template stat from WZ is not loaded into `MobInfo`; the random selection uses "all loaded" as the variant pool rather than the exact `nHitCount` cap. This is functionally identical when all variants in WZ up to nHitCount are present (the common case) but could over-select if WZ has more variants than `nHitCount` allows. Deferred because `nHitCount` is a separate MobInfo loading gap, not a blocking issue for this fix.

1008 tests pass.

## Hundred-and-twelfth pass (self-directed, implementation pass): fixed `ItemTooltip.ts` color-format crash flagged in the Hundred-and-fifth pass

**Fixed.** `ItemTooltip.ts` used two incompatible color formats that would throw "Unable to convert color" in PixiJS whenever the equip-tooltip path was exercised in a real WebGL context: text/grade colors were `0xRRGGBBAA` (alpha in the low byte, e.g. `0xEEEEE0FF`) and overlay colors were `0xAARRGGBB` (alpha in the high byte, e.g. `0x90FFFFFF`). Pixi's fill APIs only accept plain `0xRRGGBB` 24-bit integers. Fixed by: converting all `*Color` constants and `_gradeColor()` return values to `0xRRGGBB` (stripping the always-`FF` alpha byte); splitting the two overlay constants (`InnerOutline`, `DividerThin`) into separate `…C`/`…A` pairs used as `fill({ color, alpha })`; replacing the one inline `0xFFFFFFFF` literal in `_drawConsumable` with `NameColor`. 1008 tests pass.

## Hundred-and-eleventh pass (self-directed, implementation pass): implemented `CMob::TrySpeaking` — mob death speech bubbles and server-driven `OnMobSpeaking` (opcode 301)

**Implemented.** Decompiled `CMob::TrySpeaking` (0x64b6d0), `CMob::GetCurrentAction` (0x649ea0), `CMob::MoveAction2RawAction` (0x63a9c0), `CMob::OnDie` (0x64e4b0), and `CMob::OnMobSpeaking` (0x650000) via IDA to nail down both trigger paths:

**Ambient path (death speech):** `CMob::OnDie` sets `m_nOneTimeAction = rand() % nDieCount + 10` (Die1=10, Die2=11, DieF=12), then calls `TrySpeaking(-1, -1)`. `TrySpeaking` only allows the ambient path when `(GetCurrentAction() - 10) <= 2` unsigned (i.e., the one-time action is a die action, {10,11,12}). It then loops `CMobTemplate::apSpeakInformation` for an entry matching `nAction == m_nOneTimeAction` and picks a random line. Ported: `GameStage._killMob()` now filters `MobInfo.SpeakEntries` for entries with `action` in {10..12} before calling `mob.OnDie()`, picks a random entry+line, and calls `mob.Say(line)`.

**Server-driven path (opcode 301):** `CMob::OnMobSpeaking` decodes `int nSpeakInfo` (entry index) + `int nSpeech` (line index, cast from ZXString pointer). Added `OutHeader.MobSpeaking = 301` in `OpCodes.ts`, `handleMobSpeaking` + `onMobSpeaking` callback in `FieldHandlers.ts`, and wiring in `GameStage.ts` that looks up `SpeakEntries[speakInfoIdx].lines[speechLineIdx]` and calls `mob.Say(line)`.

**WZ loading:** `MobInfoService.ts` already parsed `speak/<n>/{action,speech/<m>}` into `MobInfo.SpeakEntries` (previous pass work), and `MobLook.Say()`/`_drawSpeechBubble()` already rendered the bubble (same previous-pass work). This pass wires the two trigger paths to the existing infrastructure.

**Not implemented:** The `MobSpeakCondition`-gated reactive path (player-chat-triggered speak) — requires tracing `sIgnoreSymbols`/`sChar` symbol-stripping logic against player chat events, separate from the death/server-explicit paths shipped here.

1008 tests pass.

## Hundred-and-tenth pass (self-directed, implementation pass, ponytail ultra): fixed the `GW_ItemSlotPet` decode bug flagged in the Sixtieth pass

**Fixed.** `ItemDecoder.ts`'s `InvItemType.Pet` case read two `readInt()`s
into `petSkill`/`petWear` right where the real `dateDead` FILETIME(8) sits,
and dropped the real `petSkill` ushort into a discarded read. Re-decoded
against `GW_ItemSlotPet::RawDecode` (decompile/4F5750.c) and fixed the
field order; `petWear` wasn't a real field of this struct at all (it's a
field of the unrelated, already-validated `CharacterInfoPet`/
`SetMultiPetInfo` summary struct in `FieldHandlers.ts`) — deleted it from
`InventoryItem` since nothing else referenced it. Added a decode test
(`ItemDecoder.spec.ts`). 912 tests pass.

## Hundred-and-ninth pass (self-directed, implementation pass — first since the IDA_INDEX.md sweep closed): implemented `CClock`, the generic on-screen countdown/wall-clock overlay flagged missing in the Seventy-seventh pass

**Implemented.** `CField::OnClock` (decompile/531510.c) is a 5-subType
dispatch that the existing `FieldHandlers.handleClock` decoded completely
wrong (a bare byte + short, matching none of the real shapes). Re-read the
full decompile (`OnClock`, `OnMakeTimerParam` for `CField`/
`CField_HuntingAdballoon`/`CField_PartyRaid`/`CField_PartyRaidBoss`,
`CClock::SetTimer`/`SetClock`/`Start`/`Draw`) and:
- Replaced the decode with the real subType-keyed shape — `0` (hidden
  `CWvsContext` event-timer, no window), `1` (switch an existing window to
  real-time wall-clock display), `2` (generic countdown, duration-only),
  `3` (fixed-style countdown with an active flag gating a conditional
  duration read), `0x64` (`CTimerboard_CakePieEvent`'s timerboard, flag +
  size-variant byte + duration) — see `ClockArgs` in `PacketArgs.ts` for the
  full per-subType field doc and decompile citations.
- Built `src/ui/game/Clock.ts`, a new `GamePanel` (zero prior `src/`
  presence, per the "new file if nonexistent" rule) rendering the
  countdown/wall-clock as plain text on a flat background rather than OG's
  per-digit WZ sprite canvases — that asset path is resolved via the
  numeric `StringPool` IDs (0xB68/0xB0B), which this client already
  deleted as a superseded system (see the orphaned-files section below),
  so pixel-exact reproduction isn't recoverable. Matches this codebase's
  established fallback pattern for WZ-asset-less widgets.
- Wired `_clock` into `GameStage` as an eager `_panels` member (same
  pattern as `_buffList`) and rewrote the `onClock`/`onDestroyClock`
  callbacks to drive it instead of just logging to `_statusMessenger`.
- **Not implemented:** subType 1's wall-clock mode is a no-op unless a
  clock window is already open — OG's own creation trigger for permanent
  town-square public clocks isn't inside `OnClock` itself and wasn't traced
  this pass (see `ClockArgs` doc). subType `0x64`'s CakePieEvent-specific
  window art isn't built either — that whole minigame is still missing
  client-side (Eighty-fourth pass); it reuses the same generic countdown
  widget instead, decoded correctly but rendered generically.
- Added 7 decode tests in `tests/net/handlers/FieldHandlers.spec.ts`
  (`describe('Clock', ...)`) covering all 5 subTypes plus `DestroyClock`.
  Full suite (911 tests) passes.

## Hundred-and-seventh pass (self-directed, IDA_INDEX.md sweep — final batch of 31): `IDA_INDEX.md` sweep complete — last batch is static-destructor noise and confirms `CUISkill::GetRecommendSKill_` is already self-documented as unported in `SkillBook.ts`'s own header comment

**Last batch, precisely checked per the no-silent-skip rule (each
truncated `_CXxx::` name read as a real static-local-destructor site,
not assumed):** `_CCashShop::OnExItemSlot`/`_CCSWnd_Inventory::OnChildNotify`
(Cash Shop category-label statics, same no-Cash-Shop-WZ-package root
cause), `_CScreenShot::GetPicName` (already-covered-moot native
screenshot path, Ninety-second pass), `_is_valid_character_name_`
(forbidden-name-list statics — `ForbiddenNameProvider.ts` already
covers this exact `ForbiddenName.img`/`Curse.img` union),
`_CUIToolTip::SetToolTip_SlotInc` (sibling of the already-covered
tooltip system), `_enum_next_in_directory_` (native directory/image-extension
enumeration, no portable equivalent, this client loads everything
through `WzPackage.ts`).

**Confirmed already self-documented as unported (not a new
finding):** `_CUISkill::GetRecommendSKill_`/`_CUISkillEx::GetRecommendSKill_`
— the "recommended next skill" highlight feature. `SkillBook.ts`'s own
header comment already names `GetRecommendSKill_` directly as a known
sibling method alongside `OnSkillLevelUpButton@CUISkill` — this pass
re-confirms that self-disclosure is accurate and current, rather than
re-flagging it as newly discovered.

**Confirmed moot, remaining `_dynamic_atexit_destructor_for_*`/
`_dynamic_initializer_for_*` static-destructor/constructor thunks (same
pattern exhaustively confirmed across the Ninety-first through
Hundred-and-sixth passes), for already-covered-or-flagged classes:**
`_CActionMan` (animation pipeline, covered), `CEmployeeTemplate`/
`CMobTemplate`/`CMorphTemplate`/`CNpcTemplate`/`CPetTemplate`/
`CReactorTemplate`/`CSummonedBase`/`CTamingMobTemplate` (template
classes already covered or flagged in their own earlier-pass entries),
`CNMNoteInfo2` (NexonModule launcher plumbing, same moot category as
other `CNM*` classes), `ZRecyclableStatic`/`ZSocketBase`/
`ZAllocEx<ZAllocAnonSelector>`/`ZAllocEx<ZAllocStrSelector<char>>`/
`ZAllocEx<ZAllocStrSelector<unsigned short>>` (native allocator/socket
plumbing, already-covered-moot categories), `CUIQuestInfo`/`CUIStat`/
`CUIStatusBar`/`CUtilDlg`/`CUtilDlgEx` (core UI panels already covered
very early in the sweep), `CUserLocal`/`CWvsContext` (the two largest,
earliest-checked classes in the entire index).

**Sweep status: `IDA_INDEX.md` is now fully checked off (1044/1044).**
Summary of what nineteen passes (Eighty-ninth through Hundred-and-seventh)
covered: dozens of confirmed real gaps now tracked here (notably the
Monster Carnival revive-room protocol desync, the missing generic
drag-and-drop system behind several dead-wiring bugs, three
decoded-but-dropped server callbacks, the anti-macro heuristic family,
the combo-finisher skill family, and assorted niche event/UI gaps), one
shipped fix (`ChatBar` history recall), and a large number of
already-covered/sibling/moot confirmations that close out lingering
uncertainty from the entire `TODO_AUDIT.md` history. Future audit work
should start a fresh sweep basis (e.g. re-deriving `IDA_INDEX.md` from
the current binary, or picking one of the real gaps above to actually
implement) rather than continuing this checklist, which has no
unchecked items left.

## Hundred-and-sixth pass (self-directed, IDA_INDEX.md sweep — batch of 293, no-silent-skip rule continued): six native anti-cheat/locale classes confirmed moot, then a 287-entry contiguous run of `_dynamic_initializer_for__ZRecyclableAvBuffer_*` memory-pool thunks — every single name read and matched against an already-known data type, none hiding a real function this time

**Confirmed moot (native plumbing):** `CSecurityUpdateFailed`/
`CSecurityInitFailed`/`CSecurityClearFailed` (`GetErrorMessage` only —
siblings of the already-flagged `CSecurityThreatDetected`/
`CSecurityException`, Ninety-ninth pass: native anti-cheat-module
failure states with no browser equivalent). `CCandidates::InsertCandidate`/
`CProcessMap::AddProcess` — read together these are the native
anti-cheat module's running-process enumeration/blacklist-matching
machinery (same category as `CeTracer`, Hundred-and-fifth pass): no
process list to scan in a browser sandbox. `_LocaleUpdate` — native
C-runtime locale-initialization plumbing, no portable equivalent
needed (this client's localization is its own `NameService.ts`/string
tables, unrelated to OS locale).

**Confirmed moot, 287 entries, all `_dynamic_initializer_for__ZRecyclableAvBuffer_*`
memory-pool-singleton thunks (the same pattern decompile-verified and
confirmed moot in the Ninety-first/Ninety-third/Ninety-fifth/
Hundred-and-second/Hundred-and-third passes) — every name in this
contiguous run was read in full and matched against an already-known,
already-covered-or-flagged data type (not skipped, not assumed):**
the sub-struct types named are `CSpriteInstance`, `CActionFrame`/
`ZList<CActionFrame>` (animation pipeline, covered), `CharacterData`,
`MobStat`/`GW_SkillRecord`/`CAnimationDisplayer`/`CBullet`/`SCRIPTINFO`/
`CTemporaryStatView`/`ZInetAddr`/`GW_Memo`/`CUIQuestTimer`/`CAvatar`/
`MOVING_OBJ_INFO` (all already individually covered or flagged in
earlier passes), `CActionMan`'s many per-key-type maps (`ActionKey`,
`FACELOOKCODES`, `__int64`, etc. — all already covered, Hundred-and-third
pass), template-instance maps for `CMobTemplate`/`SKILLENTRY`/`SKILLROOT`/
`MOBSKILLENTRY`/`MCSKILLENTRY`/`MCGUARDIANENTRY`/`ITEMSKILLENTRY`/
`ITEMOPTIONSKILLENTRY`/`CNpcTemplate`/`CPetTemplate`/`CEmployeeTemplate`/
`CMorphTemplate`/`CStaticFoothold`/`CSummoned` (all already covered or
flagged as their own findings in earlier passes), UI-plumbing maps for
`CToolTipHelper`/`CCtrlWnd`/`CCtrlTab`/`CCtrlComboBox`/`CUtilDlg`/
`CUtilDlgEx`/`ISMSG`/`CUIToolTip` (native widget base classes, same
"this client uses its own `GamePanel`/PixiJS controls" category as
many earlier passes), field/object-pool maps for `CField`/`Field`/
`DYNAMIC_OBJ_INFO`/`CMapLoadable`/`CMovePath`/`CGrenade`/`AFFECTEDAREA`
(all already covered field/object systems), and a handful of plain
data-type pool instances (`tagPOINT`, `ZXString<char>`/`ZXString<unsigned short>`,
`unsigned long`, `long/long/long`, `PassiveSkillData` — already
confirmed server-authoritative in the Hundred-and-second pass — and
`CDualKeyChecker` — already flagged in the Ninety-eighth pass). None
of the 287 names matched an unfamiliar class; this batch produced zero
new findings, only confirmations of existing ones.

## Hundred-and-fifth pass (self-directed, IDA_INDEX.md sweep — batch of 27, no-silent-skip rule continued): `ToolTip_SetItemList` pins down exactly the missing half of the Hundred-and-second pass's `EQUIPPED_SETITEM` finding; `DRAGCTX` extends the Ninety-seventh pass's `IDraggable` root cause; `CAntiRepeat` is a third anti-macro heuristic sibling; `MedalQuestInfo` shows the medal gap is a whole window, not one byte

**Confirms and sharpens an already-flagged gap:** `ToolTip_SetItemList`
is the tooltip-display data structure for equip set-bonus tiers —
this directly confirms the Hundred-and-second pass's hypothesis about
`EQUIPPED_SETITEM`: the missing half really is the tooltip breakdown
("X/6 set effect active" style text), not the stat math (which stays
server-computed). Not a new root cause, just resolves that pass's
open question with a concrete second class.

**SHIPPED (Hundred-and-ninth pass), scoped down honestly after
decompiling the real OG functions:** `CWvsContext::CheckEquippedSetItem`
(0x9e04d0) recomputes which sets are active purely from currently-
equipped items (`CItemInfo::GetEquipItem(id)->nSetItemID`, no server
round trip) — that part is fully portable and now ported:
`ItemIconLoader.ItemAttr` gained `SetItemId` (`info/setItemID`), and
`EquipInventory._equippedSetCount()` mirrors the OG algorithm exactly
(count equipped items sharing a set ID). `ItemTooltip` now shows
"Set Item: N pieces equipped" for any item with a set ID.
**Deliberately not ported:** `CUIToolTip::SetToolTip_SetItem_Basic`
(0x8a14b0)'s full per-tier stat-bonus breakdown — it reads
`Item.wz/Special/SetItemInfo.img` (schema not verified against this
client's actual WZ data) and renders ~30 StringPool-templated lines per
tier, the same StringPool-text gap already accepted elsewhere in this
client (e.g. `GameStage.ts`'s Item-Upgrade-result notice). Shipping the
verified-correct count without guessing at unverified WZ field names
follows the lesson from this session's `CUIVegaResultPopup` correction.
**Found while implementing, not fixed (separate concern):** `ItemTooltip.ts`'s
`Draw()` → `_drawEquip()` path throws ("Unable to convert color") the
moment it's exercised outside a full WebGL context — its `*Color`
constants are `0xRRGGBBAA` (alpha in the low byte) but get passed
straight into both `TextStyle.fill` and `Graphics.fill({color})`, which
this Pixi version only accepts as `0xRRGGBB`. Tests for this pass
exercise `_buildInfoLines` directly to avoid it. Whether this also
misrenders colors live in-browser (vs. only failing in a headless test
environment) wasn't checked — flagging for whoever next touches this
file rather than scope-creeping a fix into this pass.

**Confirms and sharpens an already-flagged gap:** `MedalQuestInfo`
(109 methods — `CUIMedalQuestInfo`/`CUIMedalQuestInfoDetail`,
`GetMedalState`) shows the achievement-medal system the Ninety-eighth
pass found (`pMedalInfo.gap0`, a single discarded byte) is actually
backed by a whole dedicated UI window with its own detail sub-panel —
the gap is bigger than one byte, but the root cause and "not
implemented" status are unchanged from that pass's finding.

**Confirms and extends the Ninety-seventh pass's `IDraggable` root
cause:** `DRAGCTX` — the actual drag-context struct passed to
`OnDragDrop` across every draggable native control (`CWnd`/`CCtrlEdit`/
`CCtrlMLEdit`). This is the concrete payload type behind the generic
drag-and-drop system already identified as entirely missing from this
client's `GamePanel`/input layer; not a new finding, just more
evidence for the same one.

**Confirmed real, security-relevant, sibling of an already-flagged
family:** `CAntiRepeat::TryRepeat` — a third anti-macro/anti-bot
heuristic (alongside the already-flagged `CUIAntiMacro`,
Eighty-sixth pass, and `CDurationChecker`, Ninety-sixth pass). Zero
`src/` presence, consistent with the rest of that family being
unimplemented.

**Confirmed real OG feature that doesn't apply to a browser client
(architecturally moot, not deferred — same category as the
Ninety-ninth pass's `CSecurityThreatDetected`):** `CeTracer::Run` — a
native Cheat-Engine/memory-tracer detector. No process to instrument
in a browser sandbox.

**Confirmed already covered (foundational classes):** `IWzFileSystem`/
`IWzPackage` — `WzPackage.ts` (named directly after the latter) is this
client's own port of exactly this loading layer, same category as the
Ninety-third/Hundred-and-third passes' `IWzProperty`/`IWzUOL` findings.
`CAttrField` (per-map swim/fly movement-mode attributes) —
`FieldScene.ts:179-180` already reads `swim`/`fly` from the map info.
`USERLAYER` — sibling of the already-extensively-covered
`CUser::LoadLayer`/avatar-rendering pipeline.

**Confirmed sibling of an already-flagged/already-covered gap:**
`MCSKILLENTRY`/`MCGUARDIANENTRY`/`SKILLROOT` (Monster Carnival mob-spawn
data, sibling of the whole already-flagged Monster Carnival family,
Eighty-ninth/Ninety-seventh passes), `SummonedAttackInfo` (sibling of
the already-covered `CSummoned`/`SummonedLook.ts`), `CCtrlSelectQuest`/
`CCtrlSelectPartyQuest` (quest-picker controls, sibling of the
already-flagged `CPartyQuestInfoManager` gap), `WORLDMAPQUESTDEMANDITEM`
(sibling of the already-covered `WorldMap.ts` plus the already-moot
`QuestDemand`, Hundred-and-first pass), `Privilege`/`GetSEPrivilege`
(sibling of the already-flagged `PrivilegeItem` gap, Hundred-and-second
pass), `Friend_GroupAscComp_S` (a sort comparator for the
already-covered friend list in `UserList.ts`), `ITEMDATA` (generic item
container, covered by the already-extensive `ItemDecoder`/`CItemInfo`
pipeline), `CSplashScreen` (an internal startup-log singleton;
`SplashStage.ts` already covers the actual visual splash screen).

**Confirmed moot, sibling of the already-disclaimed `SecondaryStat`
bit-decode limitation (`STATUS.md`):** `ExpireBase`,
`SecondaryStatRateOption`, `TemporaryStat_PartyBooster`,
`DynamicTermSet`/`BaseOnLastUpdatedTime`/`BaseOnCurrentTime` (the
expiry-policy template family `NoExpire` already represented in the
Ninetieth pass). `NEXTLEVEL` — an exp-to-level lookup table; moot since
leveling is entirely server-computed, same architecture pattern as
`PassiveSkillData`/`CalcDamage`. `CSecurityException` — native
exception sibling of `CSecurityThreatDetected` (Ninety-ninth pass).
`UIHelper` (`MakeBalloonTip`) — this client's own tooltip rendering
(`ItemTooltip.ts` etc.) already covers balloon-style tooltips natively.
`QIBaseCompareFunc`/`QICategoryCompareFunc`/`QICompareFunc` (Cash Shop
item-search sort comparators, same no-Cash-Shop-WZ-package root cause),
`SnLessFunc`/`PriceMoreFunc` (generic sort comparators for Cash Shop
commodity listings, same root cause). `_WinMain_` — the native
executable's entry point; this client's entry point is its own
`Program.ts`/`MapleClaudeGame.ts`, not a portable concept.

## Hundred-and-fourth pass (self-directed, IDA_INDEX.md sweep — batch of 29, no-silent-skip rule continued, now into the long tail of 1-2-method entries): `ParcelDlg` is another decoded-but-dropped callback (same shape as `VegaResult`/`MacroSysDataInit`); Monster Book flavor text confirmed missing; rest covered/sibling/moot

This batch covers the start of the long tail of 1-2-method entries.
Given the size, findings below are terser per item but every item still
gets one, per the no-silent-skip rule.

**Confirmed real gap — decoded but dropped (third instance of this
exact pattern, after the Ninetieth pass's `VegaResult` and the
Hundredth pass's `MacroSysDataInit`):** `PARCEL`/`ParcelDlgArgs` — the
send-item-by-mail-parcel feature (distinct from `Memo.ts`'s text-only
mail). `FieldHandlers.ts:773`'s `onParcelDlg` callback is fully
assigned but never referenced in `GameStage.ts` — confirmed via grep.
**Re-checked while scoping for implementation (Hundred-and-eighth
pass) — correctly sized as "too big," not under-scoped like the
`GuildCreate` case was:** `CParcelDlg`'s full method list
(`CTabSend`/`CTabReceive`/`CTabQuickSend` sub-tabs, `PutItem`/
`RemoveParcel`/`AddNewParcel`, a scrollbar, drag-drop item slots via
`CDraggableItem::PutItem(CParcelDlg*)`) confirms this is a real
multi-tab mailbox window comparable in scope to the already-deferred
Auction House/Raise-minigame gaps — not a quick wire-up. Left
unimplemented; flagging the concrete sub-feature breakdown for
whoever picks this up next instead of a vague "needs a UI."

**Confirmed real, small, cosmetic gap:** `MonsterBookStr` — per-monster
flavor/lore text. `MonsterBook.ts` already shows id/name/level/count
per card but no description text field, confirmed via reading the file.
**Scoped down while implementing (Hundred-and-ninth pass):** decompiled
`CMonsterBookMan::LoadStringA` (0x663e30) — every WZ property key it
reads is itself resolved through `StringPool::GetBSTR(uint)` before the
`IWzProperty::Getitem` call, i.e. even the *key names* (let alone the
text) are StringPool-numeric-id-indirected rather than literal ASCII in
this binary. Same "StringPool not ported" wall as the `ToolTip_SetItemList`
finding above, one level worse (can't even read the field names off a
disassembly listing without the string table). Not implemented — would
require either dumping the StringPool table or guessing key names,
and this session's `CUIVegaResultPopup` lesson is specifically against
guessing.

**Confirmed already covered:** `GW_Memo` (the data behind `Memo.ts`,
already tracked as having a real compose-flow bug since the
Fifty-seventh pass — not re-flagged). `GW_MarriageRecord`/
`GW_CoupleRecord`/`GW_FriendRecord`/`GW_NewYearCardRecord` —
`CharacterData.ts`/`CharacterDataDecoder.ts` already decode all four
record types into character data.

**Confirmed sibling of an already-flagged gap:** `GUILDRANKING`
(sibling of the already-flagged Guild Alliance/`CWndGuildGrade`/
`ALLIANCEDATA` gap), `MobSkillInfo` (sibling of the already-flagged
`MOBSKILLLEVELDATA`/`onMobSkillDelay` gap, Ninety-third pass),
`MobSpeakCondition` (sibling of the `CMob::TrySpeaking`/`MobSpeakInformation`
family, Ninety-ninth/Hundred-and-first passes), `PacketExpNoti_MasterChanged`/
`PacketExpNoti_Modified` (two more siblings of the already-flagged
Expedition system), `CashItemEntry`/`MESSAGEBOX` (Cash Shop data,
same established no-Cash-Shop-WZ-package root cause), `CommMoreFunc`
(a sort comparator for `CS_COMMODITY_EX`, same Cash Shop root cause),
`ITEM_MAKE_INFO` (crafting-recipe data behind the already-flagged-dead
`Maker.ts`, Fifty-sixth pass), `ItemOptionLevelData` (sibling of the
already-covered item-option decode pipeline), `PETLAYER`/`STONELAYER`
(per-layer sprite-compositing data for the already-covered
`TamingMobLook.ts`/pet-rendering pipeline), `ActSkill`/`ActSP` (small
action-data array elements behind the already-covered
`WzFrameAnimation.ts` pipeline), `KeySequence` (the map/container type
behind the already-flagged `CSequencedKeyMan`/`KeySequenceElement`
combo-finisher system, Eighty-ninth pass).

**Confirmed moot (native plumbing):** `INetMsgHandler` (a one-method
marker interface, `OnPacket` — this client's own packet-router
dispatch already serves this role without a base-interface layer).
`ZISeekableStream` — native seekable-stream marker, same category as
the Ninetieth/Ninety-third passes' `ZFileStream`/`ZIStream` findings.
`IWzRawCanvas` — native raw-pixel-buffer canvas access; this client's
own `WzCanvas.ts`/PixiJS texture pipeline already handles canvas data
without needing this COM-level raw-buffer interface. `DYNAMIC_OBJ_INFO`
— a WZ-driven dynamic-object-placement data type (decorative
interactive map objects); likely already covered by `FieldScene.ts`'s
object-layer rendering, not independently chased. `CMapleTVDownloader`/
`CNMCSHolder` — native MapleTV/NexonModule launcher plumbing, same
already-established moot category as other `CNM*`/native-launcher
classes. `CONFIG_SYSOPT` — native video/display option struct (e.g.
resolution, magnification level); this client runs in a browser
canvas with no equivalent native display-mode switching needed.
`IWzUOL` already covered the COM UOL-resolution interface in the
Hundred-and-third pass.

## Hundred-and-third pass (self-directed, IDA_INDEX.md sweep — batch of 16, no-silent-skip rule continued): `_CField`/`_CUser` precise re-check (per the no-silent-skip rule) surfaces two real functions (`SendChatMsgWhisper`, `GetAfterimageUOL`) behind what looked like more noise, both already-covered/moot on inspection; rest moot/covered/sibling

**Checked precisely rather than assumed (the `_CMob::TrySpeaking`
lesson from the Ninety-ninth pass applied again — this time both
turned out fine, but only because they were actually checked):**
`_CField::SendChatMsgWhisper_::_11_::...mMacroNotice_`/`aMacroNotice_`
are static-local-variable destructors inside a real function,
`CField::SendChatMsgWhisper` — but whisper chat is already fully
covered (`GameSender.Whisper`, `fh.onWhisper`, the `/w`/`/whisper`
slash commands in `GameStage.ts`), and the macro-notice statics are a
spam-throttle/rate-limit message, which is server-enforced rather than
client-replicated (consistent with the established pattern of not
mirroring server-side validation logic). `_CUser::GetAfterimageUOL_::_2_::...sSlash_`/
`sHead_` are static locals inside `CUser::GetAfterimageUOL` — already
folded into the already-flagged afterimage/weapon-trail visual gap
(`CAfterImageBullet`, Ninety-fifth pass), not an independent finding.

**Confirmed already covered:** `ActionKey` — the key type behind
`CActionMan`'s various per-entity-type action-frame maps; `CActionMan`
(67 methods) was checked off in an early pass as part of the core
animation pipeline, and this client's own `WzFrameAnimation.ts`/
`AnimatedSprite.ts` already serve that role (Ninety-fourth pass
established `ACTIONDATA` similarly). `IWzUOL` — the WZ "Universal
Object Link" (symlink-style WZ reference) resolution interface;
`WzProperty.ts`'s own UOL-following is already exercised pervasively
throughout this client's WZ-reading code (every `Get`/`GetItem` call
site implicitly relies on it working).

**Confirmed moot (native plumbing/marker interfaces):** `ZAllocAnonSelector`/
`ZAllocHelper`/`ZAllocBase` (the OG's custom memory allocator
infrastructure — irrelevant to a garbage-collected JS runtime).
`IGObj` (`Update()`only — the OG's universal "game object" marker
interface; this client uses plain TS classes with no such base-interface
layer, and each subsystem already has its own `update(dt)` convention).
`IWzSoundState` — sibling of the already-covered `IWzSound`
(`WzSound.ts`/`WzAudioPlayer.ts`).

**Confirmed sibling of an already-flagged gap:** `CAKEPIEEVENT_ITEMINFO`
— another sibling of the already-flagged `CCakePieEvent`/
`CUICakePieEventItemInfo`/`CTimerboard_CakePieEvent` family
(Eighty-seventh/Ninety-first passes).

**Confirmed moot (native memory-pool plumbing, written up per the
no-silent-skip rule):** the five remaining
`_dynamic_initializer_for__ZRecyclableAvBuffer_*`/`_dynamic_atexit_destructor_for__CActionFrame`
entries in this batch (`_ZRefCountedDummy_ZRef_CMob`, `_ZRefCountedDummy_ZRef_CItemInfo`,
`_ZRefCountedDummy_CReactorTemplate`, `_CUIEquip`,
`_ZMap_enum_TabPartyAdver`, plus the `CActionFrame` atexit destructor)
— same static-constructor/destructor-thunk pattern confirmed moot
repeatedly since the Ninety-first pass.

## Hundred-and-second pass (self-directed, IDA_INDEX.md sweep — batch of 16, no-silent-skip rule continued): equip set-bonus tracking (`EQUIPPED_SETITEM`) confirmed missing — real gap, not a false-positive like the similarly-named `SkillResetItem` opcodes; `PassiveSkillData`/`CMoveRandMan` confirmed server-authoritative; rest covered/sibling/moot

**Confirmed real gap (verified carefully — the obvious `setitem` grep
hit was a false positive, same caution as the Ninetieth pass's
`CUIVegaResultPopup` correction):** `EQUIPPED_SETITEM` — the
currently-active-set-bonus-tier tracking map (e.g. "4/6 Adventurer Set
effect active"). The `setitem`-substring grep hits in `FieldHandlers.ts`/
`GameSender.ts`/`OpCodes.ts` are all `SkillResetItem` (an unrelated
skill-reset consumable), not set-bonus tracking — confirmed by reading
the actual matched lines rather than trusting the grep count. Zero
real `src/` presence for equip-set-bonus calculation or display;
`ItemTooltip.ts` doesn't show a set-effect breakdown. Since stat
totals are already server-computed (the established pattern), the
likely-missing half is specifically the *tooltip display* of
which/how-many set pieces are equipped — not WZ-verified this pass.

**Confirmed server-authoritative, consistent with the established
combat/AI architecture (not a gap):** `PassiveSkillData` — feeds
`CalcDamage::MDamage`/`PDamage` directly (the OG's own damage-formula
inputs), and this client never computes damage client-side (repeatedly
confirmed in earlier passes). `CMoveRandMan` — a mob random-wander
seed manager, same already-established category as `CRand32`/
`ActionRandMan` (Ninety-fifth/Ninety-sixth passes): mob movement is
server-decided, the client only renders the result.

**Confirmed already covered:** `CTextLineBreaker`/`CFontContainer` —
`BuiltInFont.ts`'s `wrapToWidth()`/`truncateToWidth()` (per `STATUS.md`)
already serve native text-wrapping and font-management roles
respectively. `USERREMOTE_ENTRY` — `GameStage.ts`'s `_otherChars: Map<number,
CharLook>` plus `OtherCharLook.ts` already track other players' remote
state, the exact role this map-keyed entry type serves in the OG.

**Confirmed real, small gap, not WZ-verified this pass:** `PrivilegeItem`
— guild/family privilege reward items (`CUIFamily`'s constructor takes
them directly alongside `FamilyInfo`). `FamilyWindow.ts` (which already
covers `FamilyInfo` per the Ninety-ninth pass) has no privilege-item
rendering — confirmed via grep, zero hits. Small extension of an
already-mostly-covered panel, not a new system.

**SHIPPED (waterfall implementation pass):** re-decompiled
`CUIFamily::CUIFamily(ZArray<ZRef<PrivilegeItem>>&, FamilyInfo&)`
(0x7b2720) and `CUIFamily::Draw`/`OnButtonClicked` (0x7b4b50/0x7b2d80) to
get the exact shape before porting. `PrivilegeItem` is `{strName, nFame,
dwDayLimit, strDesc}` — matches the already-decoded
`FamilyPrivilegeEntry{name,fame,dayLimit,desc}` from opcode 104
(`FamilyPrivilegeList`) exactly, which was decoded-but-dropped (`fh.onFamilyPrivilegeList`
was a no-op stub in `GameStage.ts`). The OG shows one privilege at a time
with prev/next paging (`m_nPrivilegeIndex`), not a scrolling list — mirrored
that shape in `FamilyWindow.ts` (`SetPrivileges`/`SetPrivilegeUse`,
`_drawPrivilege`, `[<]`/`[>]`/`[Use]` text buttons) rather than inventing a
list UI the OG never had. `FamilyInfoResultArgs.privilegeUse` (already
decoded, opcode 99) feeds the per-privilege used-today count.
Found while implementing: the "Use" sender (`CWvsContext::SendUseFamilyPrivilege`,
opcode 175/`UserUseFamilyPrivilege`) and `SendSetFamilyPrecept` (opcode
176/`UserSetFamilyPrecept`) had no `OutHeader`/`GameSender` entries at
all — added both (`GameSender.UseFamilyPrivilege`, `GameSender.SetFamilyPrecept`).
**Scoped down honestly:** `SendUseFamilyPrivilege`'s body is index-only
for most privilege types, but types `<= SP_Summon` (decompile-confirmed)
also pop a `CUtilDlgEx` text-input dialog and append the result via
`EncodeStr` (e.g. a summon-target or map-transfer-target name). The
`SP_` enum's actual numeric values aren't recoverable from disassembly
without guessing, so that target-name sub-case is explicitly not ported —
only the plain index-only path is sent, which covers the non-target
privilege types. `SendSetFamilyPrecept` (precept-editing) is decoded and
wired as a sender but has no UI trigger yet (no precept-edit button in
`FamilyWindow.ts`) — left for a future pass since it's a separate `CUtilDlgEx`
text-input flow, not part of this finding. Tests in
`tests/ui/game/FamilyWindow.spec.ts`.

**Confirmed sibling of an already-flagged gap:** `StagePeriodInfo`
(sibling of the Hundred-and-first pass's `StageTheme`/`StageUnitEnable`
login-seasonal-theming gap), `EqSlotInfo` (equip-slot pixel-position
lookup for the expandable equip window — backing data for whichever
equip-window gaps are already tracked, not independently chased),
`PARTYSERACH_SETTING` (sibling of the Ninety-fifth pass's already-flagged
`CUIPartySearch`/`TabDlgInterface` gap).

**Confirmed moot (native memory-pool plumbing, written up per the
no-silent-skip rule):** the six remaining
`_dynamic_initializer_for__ZRecyclableAvBuffer_*`/`_CActionFrame`
entries in this batch (`_CActionFrame`, `_ZMap_unsigned_long_ZRef_CAnimationDisplayer`,
`_ZRefCountedDummy_ZRef_CMapLoadable`, `_ZRefCountedDummy_CMapLoadable`,
`_ZRefCountedDummy_CUser`, `_ZRefCountedDummy_CUserLocal`) are the same
static-constructor-thunk pattern confirmed moot repeatedly since the
Ninety-first pass.

## Hundred-and-first pass (self-directed, IDA_INDEX.md sweep — batch of 16, no-silent-skip rule continued): five more concrete finisher/combo-skill siblings extend the Eighty-ninth/Ninety-fourth pass's `CFinishAttack` family; `MobSpeakInformation` confirms the Ninety-ninth pass's `CMob::TrySpeaking` finding is real data, not a one-off; login seasonal-theme switching confirmed missing

**Confirmed sibling, extends an already-flagged family further (same
`DoAction(int)` shape, decompile-confirmed):** `CDashTrigger`,
`CWhirlWind`, `CComboSmash`, `CComboDrain`, `CCombatStepTrigger`,
`CMassacre` — six more concrete combo/finisher-skill classes riding
the same `CFinishAttack`/`CSequencedKeyMan` combo system already
flagged missing in the Eighty-ninth pass and extended with five more
siblings in the Ninety-fourth pass. This pass's batch alone adds six
more — the family is larger than either prior pass suggested, but the
root cause and fix surface remain exactly what the Eighty-ninth pass
already specified. `KeySequenceElementIgnoreUp` is the same system's
input-debounce helper (ignoring a stale key-up after a sequence
completes), also a sibling, not independent.

**Confirmed sibling, corroborates the Ninety-ninth pass's `CMob::TrySpeaking`
discovery:** `MobSpeakInformation` (`ZArray<ZRef<MobSpeakInformation>>`,
loaded per-mob) is the actual speech-line data behind that
just-discovered mob-speech-bubble feature — confirming it's a real,
data-backed mechanic (specific mobs have authored speech lines) and
not a one-off function with no real content behind it.

**Confirmed real, small, cosmetic gap, not WZ-verified this pass:**
`StageTheme`/`StageUnitEnable` — WZ-driven seasonal background/prop
theme-switching for the login/world-select "stage" (e.g. a Christmas
or Halloween skin for the login screen). Confirmed via grep: no
theme/seasonal-switching logic in `SplashStage.ts`/`LoginStage.ts`,
which always render the same fixed background.

**Re-checked while waterfalling through implementation:** searched for
the actual `StageTheme`/`StageUnitEnable` *loader* (the function that
would reveal the real WZ key path) by name — only container/`ZMap`/
`ZRef` plumbing decompiles, no `CLogin`/`CStage`-side load function
with a body containing a recognizable `GetItem`/`Getitem` call turned
up in a name search. Without that loader, the WZ path can't be
confirmed without guessing (same caution as `MonsterBookStr`) — still
correctly deferred, not implemented this pass either.

**Confirmed already covered:** `PORTAL`/`CTownPortalPool` (the
Mage-skill placeable town-portal mechanic, distinct from map-entry
portals) — `TownPortalLook.ts` already exists and is wired into
`GameStage.ts`. `QuestDemand` (`CQuestMan::GetStartDemand`/
`GetCompleteDemand`) — this is server-side quest-requirement
*validation* logic; the corresponding player-facing text is just the
WZ-authored quest description `QuestDetail.ts` already renders, and
the server (not the client) enforces/rejects start/complete requests —
consistent with the established server-authoritative pattern, not a
gap. `CUINewCharJobSelectNormal`/`CUINewCharAvatarSelectNormal`/`...Aran`/
`...Evan`/`...Res` — five more cosmetic per-job-art-skin siblings of
the already-covered `CharCreationStage.ts` flow (same family as the
Ninety-eighth pass's name/avatar-select findings).
`SKILLLEVELDATACommon` — shared-field loading helper for the
already-covered skill-level-data pipeline (`CSkillInfo`), not
independent.

**Confirmed moot (local-scope helper structs, not independent classes
— checked precisely per the no-silent-skip rule rather than assumed):**
`_CLoginUtilDlg`/`_CPinCodeDlg` — both turn out to be the same
`DoModal_::_2_::MODAL_OWNER` native modal-dialog-ownership helper
pattern already found for `_CDialog` in the Hundredth pass, not
classes of their own.

## Hundredth pass (self-directed, IDA_INDEX.md sweep — batch of 16, no-silent-skip rule continued): combat macros are decoded-but-dropped (same shape as the Ninetieth pass's `VegaResult`); Expedition-invite packets confirmed siblings of the already-flagged Expedition system; mob/dragon chase-AI interface confirmed server-authoritative like the rest of combat

**Confirmed real gap — decoded but dropped (same shape as the Ninetieth
pass's `CUIVegaResultPopup`/`VegaResult` correction, not assumed
fixable without checking the consumer side):** `SINGLEMACRO`/
`MACROSYSDATA` (combat-macro slot data — bind a sequence of skills to
one key). `FieldHandlers.ts`'s `handleMacroSysDataInit` fully decodes
the wire shape into `MacroSlot[]` (`onMacroSysDataInit` callback,
`FieldHandlers.ts:3254-3264`) but **`GameStage.ts` has zero references
to `onMacroSysDataInit`** — confirmed via grep, the callback is never
assigned. So this client receives the player's saved macro
configuration on login and silently discards it; there is no macro
creation/editing UI and no macro-execution wiring into the skill/quickslot
system at all. Real, moderately-sized gap (needs both a compose UI and
an execution path), not a one-line fix.

**TODO (sized up while waterfalling through implementation, not
attempted this pass — genuinely too big for one pass, per the "if too
big, don't skip, write the real spec" rule):** decompiled the actual
editor window, `CUIMacroSys`/`CUIMacroSysEx` (0x84c0d0/0x85a9b0 — 14
methods each, `OnCreate`/`Draw`/`HitTest`/`OnMouseButton`/`OnSelected`/
`OnButtonClicked`/`GetIndexByPos` — a full drag-and-drop skill-slot
editor, `Ex` likely being the post-Big-Bang 3rd/4th-job-expanded
variant). `MACROSYSDATA::Encode`/`Decode` (0x4f9860/0x4f98b0) round-trip
the same `{name, mute, skills[3]}` shape already decoded client-side in
`MacroSlot`. `CUIMacroSys::OnKey` only handles the editor window's own
Escape-to-close — the real runtime "key triggers macro" dispatch lives
somewhere in the general keymap/skill-key-press path (not yet located;
would need another decompile pass on `CWvsContext`'s key dispatch or
`CUserLocal`'s skill-use-by-key code to find it). Real spec for a future
pass: (1) a `MacroEditor.ts` panel reusing the already-built
`DragController`/`DragTarget` (Hundred-and-eighth pass) for dropping
skill icons from `SkillBook.ts` into up to 3 slots per macro row, with
name-edit and mute-toggle controls; (2) wiring `onMacroSysDataInit` into
that panel to seed it on login; (3) locating and hooking the actual
keybind-to-macro dispatch point so a macro key press fires the bound
skills in sequence (with whatever inter-skill delay the OG uses — not
yet found); (4) an encode-and-send path mirroring `MACROSYSDATA::Encode`
for saving edits back to the server. Not implemented; left as a
concrete, decompile-grounded TODO rather than guessed at or half-built.

**Confirmed sibling of the already-flagged Expedition system (Sixty-eighth/
Seventy-third passes — `TabExpedition`, zero `src/` presence,
`ExpeditionIntermediary`'s richer-than-assumed protocol):**
`PacketExpNoti_Notice`/`PacketExpNoti_Invite`/`PacketExpNoti_ResponseInvite`
— the expedition-invite notification packets, confirmed via their only
callers (`ExpeditionIntermediary::OnPacketExpNoti_*`) to belong to that
exact already-tracked system. Not a new finding; this pass folds them
into the existing one rather than re-flagging.

**Confirmed server-authoritative, consistent with the established
combat-AI architecture (not a gap):** `IVecCtrlOwner` (`CMob`/`CDragon`/
`CSummoned`'s shared `ChaseTarget` interface) — `MobLook.ts`'s `Chase`
state is just an animation-state name, not real target-acquisition AI
logic (confirmed via grep — no chase-decision code anywhere in
`src/character`). Consistent with the long-established pattern that
this client never computes combat/movement AI itself; the server
decides and the client only renders the resulting state. `SCRIPTINFO`/
`MODSCRIPT` (NPC script-execution bookkeeping/branch-state) — same
category: this client renders server-driven `ScriptMessage` opcodes
(`NpcTalk.ts`/`ScriptMessageType.ts`) rather than running scripts
itself, so script-execution-state structs have no client-side role.

**Confirmed already covered:** `AvatarData` (`CUIAvatar::ResetCharacter`'s
preview-array type) — this client's `AvatarLook.ts`/`CharacterRenderer.ts`
avatar-preview pipeline (used throughout char-creation/select) already
serves this role. `FUNCKEY_MAPPED` — the general key-binding data
struct; `OutHeader.FuncKeyMappedInit` is fully wired
(`FieldHandlers.ts:845`, confirmed in the Ninety-second pass), not a
new finding.

**Confirmed sibling of an already-flagged gap:** `EMPLOYEEENTRY` —
data behind the Ninety-fourth pass's already-flagged `CEmployeeTemplate`/
`CEmployee` (no independent `src/` presence).

**Confirmed real gaps, niche event field types, same category as prior
`CField_*` findings:** `CField_WeddingPhoto` (sibling of the
already-established Wedding-system root cause, but the photo-booth
field itself, not WZ-verified), `CField_AranTutorial` (an Aran-specific
tutorial field, sibling of the general `CField_Tutorial` found in the
Ninety-seventh pass).

**Confirmed moot (native exception plumbing):** `CPatchException`,
`CMSException` — native C++ exception classes for patch-download and
"MS" (likely Microsoft API) failure paths respectively; this client
uses JS error handling directly, no portable equivalent needed.
`_CDialog` — turned out to be a local-scope `MODAL_OWNER` helper struct
inside native `CDialog::DoModal`'s implementation, not an independent
class (checked precisely per the no-silent-skip rule rather than
assumed from the truncated name).

## Ninety-ninth pass (self-directed, IDA_INDEX.md sweep — batch of 16, no-silent-skip rule continued): the no-silent-skip rule caught a real function (`CMob::TrySpeaking`) hiding inside what looked like more `_dynamic_initializer` noise; `CSecurityThreatDetected` doesn't apply to a browser client; rest covered/sibling/moot

**Caught by the no-silent-skip rule, would have been wrongly dismissed
as noise:** the index entries `_CItemInfo (3)` and `_CMob (3)` looked
like more of the already-confirmed-moot `ZRecyclableAvBuffer`
memory-pool thunks (same family swept moot in the Ninety-first/
Ninety-third passes) — and most of their matches are exactly that. But
re-querying precisely (rather than trusting the substring match) turned
up `_CMob::TrySpeaking_::_52_::_dynamic_atexit_destructor_for__sIgnoreSymbols_`/
`_sChar_` — static-local-variable destructors that only exist because
there's a real function, `CMob::TrySpeaking`, with static locals named
`sIgnoreSymbols`/`sChar`. That's a **mob speech-bubble feature**
(distinct from the already-covered NPC chat, `CNpc::OnChat`/
`ChatBalloon.ts`) — specific mobs can apparently show filtered chat-bubble
text. Confirmed via grep: zero `src/` presence for any mob-speaking/
chat-bubble-on-a-monster feature. Real, niche, previously-undiscovered
gap — found only because the rule forced a second, precise look instead
of accepting the first noisy match.

**TODO (sized up while waterfalling through implementation, not
attempted this pass — too big to half-build, per the "if too big, write
the real spec instead of skipping" rule):** decompiled the full
`CMob::TrySpeaking(int nSpeakInfo, ZXString<char> nSpeech)` body. It has
two distinct trigger paths sharing one render path: (1) **ambient** —
when `nSpeakInfo == -1` and the mob's current action is one of three
specific action IDs (`CurrentAction - 10` in `[0,2]`), it picks a random
entry from `CMobTemplate::apSpeakInformation` matching the mob's current
`nAction` and speaks one of that entry's `asSpeech` lines at random
(`get_rand`), with fade/timeout delays derived from `CMob::GetActionDelay`;
(2) **reactive** — when called with an explicit `nSpeakInfo` index and a
literal `nSpeech` string, it appears to be a reply to nearby player chat
text (the `sIgnoreSymbols`/`sChar` statics strongly suggest symbol-stripping
the player's message before matching it against `MobSpeakCondition`
entries — not fully traced this pass). Both paths render through
`this->m_chatBalloon` — the **same chat-balloon mechanism already built**
for NPCs (`ChatBalloon.ts`), so the rendering side is likely a thin reuse,
not new code. `MobSpeakInformation{nAction, asSpeech[]}` and
`MobSpeakCondition` (pet-related — takes a `CPet*`, per the Hundred-and-first
pass's corroborating find) are WZ-authored per-mob data (NOT StringPool-ID-
indirected, unlike `MonsterBookStr` — directly portable) but the WZ path
itself (likely `Mob.wz/<mobId>.img/speak` or similar) hasn't been confirmed
against the live WZ tree yet. Real spec for a future pass: (1) extend
`MobTemplate`-loading (wherever `Mob.wz` per-mob stats are currently read)
to also pull `speak`-array entries if present; (2) add a random-ambient-speak
roll into `MobLook.ts`'s per-tick update, gated on current action, reusing
`ChatBalloon.ts` for rendering; (3) leave the reactive/player-chat-triggered
path as a separate, smaller follow-up once the symbol-filtering logic is
traced precisely (not guessed at). Not implemented; left as a concrete,
decompile-grounded TODO.

**Confirmed real OG feature that doesn't apply to a browser client (not
a gap to fix, a category of its own):** `CSecurityThreatDetected`
(`GetErrorMessage`) — a native anti-cheat exception (likely raised on
detected debugger/injection/memory-tampering). This client has no
native process to instrument in the first place; there's no portable
equivalent to build, unlike e.g. `CUIAntiMacro`/`CDurationChecker`
(timing-based, behaviorally detectable) which remain real gaps. Worth
distinguishing from "missing" — this one is architecturally moot, not
deferred.

**Confirmed already covered:**
- `FamilyInfo` — `FamilyWindow.ts` (per `STATUS.md`'s own notes on its
  drag/reputation-text rendering) already covers the
  `SendFamilyInfoRequest`/`OnFamilyInfoResult` round trip this struct
  carries.
- `CAttrFoothold` — `Foothold.ts`/`FieldScene.ts:237-239` already read
  the `force`/`forbidFallDown` WZ fields this attribute struct
  represents (and `FieldCrc.ts:131-132` CRCs them too).
- `IWzResMan` — the WZ resource-manager interface; `WzPackage.ts`'s
  own loading already serves this foundational role, same category as
  the Ninety-third pass's `IWzProperty` finding.

**Confirmed moot (native plumbing, written up per the no-silent-skip
rule):**
- `CIGCipher` (`innoDecrypt`/`innoHash`) — confirmed via zero `src/`
  hits and no evidence it's used for live packet traffic (this
  client's own packet crypto is a separate, already-covered AES-OFB
  layer per `login.md`); most likely a local-file/installer-format
  cipher with no browser-relevant equivalent.
- `CTerminateException`/`ZException` — native C++ exception base
  classes; this client uses JS exceptions/error handling directly.
- `CCriticalSector` — native critical-section lock, same "single-threaded
  JS has no equivalent need" category as the Ninety-fifth pass's
  `ZFatalSection`.
- `_dynamic_initializer_for__ZRecyclableAvBuffer_ZRefCountedDummy_CWvsContext`/
  `_dynamic_initializer_for__ZRecyclableAvBuffer_ZRefCountedDummy_TRSTree_long_ZRef_CStaticFoothold__2_4_2_`/
  `_dynamic_atexit_destructor_for__CWndMan` — same memory-pool/static-init
  thunk pattern confirmed moot repeatedly in earlier passes.

**Confirmed sibling of an already-covered/already-flagged class:**
`CSpriteInstance` (sprite-handle map/list plumbing behind the
already-covered `CSpriteSource`/`WzTextureLoader.ts`), `SECRECT`
(rect counterpart to the already-covered `SECPOINT`/pet-auto-loot
sibling from the Ninetieth pass).

**Not pinned down, flagged as open rather than guessed (per the
Ninetieth pass's `CUIVegaResultPopup` lesson — don't assume a root
cause without evidence):** `CT_INFO` — a `ZArray<ZArray<CT_INFO>>`
grid-shaped data type with no surviving callers to its own constructor
(likely inlined) and no distinguishing field names visible in the
decompiled method list beyond ctor/dtor/assignment. Identity not
confirmed this pass.

## Ninety-eighth pass (self-directed, IDA_INDEX.md sweep — batch of 16, no-silent-skip rule continued): `MedalAchievementInfo`'s gap is already self-documented (`pMedalInfo.gap0`); login member-grade badge and dual-key-combo checker confirmed missing; rest already covered or sibling

**Confirmed real gap, but resolves to an already self-documented stub
(same shape as the Ninety-third pass's `MOBSKILLLEVELDATA` finding):**
`MedalAchievementInfo::Decode` — the achievement-medal-list feature
(distinct from the equip-slot Medal item, which `BodyPartSlot.ts`
already models). `FieldHandlers.ts:1284-1286`'s own comment already
names exactly the byte this client discards:
`CWvsContext::OnCharacterInfo` reads "a discarded scratch byte
(`pMedalInfo.gap0`)" — so the medal-achievement data was already
identified and deliberately dropped, not missed. This pass
corroborates that finding and pins the responsible OG class.

**Confirmed real gaps, no `src/` presence, not WZ-verified this
pass:** `CLoginGradeWnd`/`GradeEntity` — a member-grade visual badge
shown on the login/world-select screen. The underlying grade *data* is
already decoded (`Account.ts`'s grade field, `LoginHandlers.ts`), but
there is no badge/window rendering it anywhere in `src/stages`.
`CDualKeyChecker` (`KeyMsg`-queue-based simultaneous-two-key detector)
— confirmed via grep, no dual-key-combo handling exists in
`KeyConfig.ts`/`PlayerController.ts`; purpose not pinned down this
pass (candidates: diagonal-movement key combos or a specific UI
shortcut), flagging as open rather than guessing.

**Confirmed already covered:**
- `IWzNameSpace` — `WzPackage.ts`'s own `GetItem`/directory-traversal
  already serves this WZ-folder-browsing role.
- `WORLDMAP_ITEM` — `src/ui/game/WorldMap.ts` is a full panel already
  wired into `GameStage.ts` (lines 628/736/758).
- `StageBackImg` — `CharSelectStage.ts`/`LoginStage.ts` already render
  their own WZ-driven backgrounds extensively; not an independent gap.

**Confirmed sibling of an already-flagged/already-covered class:**
`MonsterBookInfo` (data behind the Ninety-sixth pass's already-covered
`CMonsterBookAccessor`/`MonsterBook.ts`), `CCtrlPQuestItem` (a
single-entry UI control for the Ninety-second pass's already-flagged
`CPartyQuestInfoManager`/`PartyQuestInfo` gap), `RelPos` (the
relative-to-foothold coordinate struct used throughout `CVecCtrl`'s
collision/walk methods — `CVecCtrl` itself was already confirmed
correct in an earlier full read-through pass, this is its supporting
math type, not an independent feature).
`CUINewCharNameSelectCygnus`/`Normal`/`Aran`/`Evan`/`Res` and
`CUINewCharAvatarSelectCygnus` — cosmetic per-job-art-skin siblings of
the already-covered `CharCreationStage.ts` (`SubScreen.Name`/`Look`,
confirmed generic across jobs), per the Eighty-ninth pass's established
finding for this whole family.

**Confirmed moot (native plumbing):** `CNMSerializableEncoder` — native
NexonModule launcher serialization, same already-established "NexonModule
launcher/account plumbing" moot category as other `CNM*` classes from
the Eighty-seventh pass.

## Ninety-seventh pass (self-directed, IDA_INDEX.md sweep — batch of 16, no-silent-skip rule continued): found the actual root cause behind three separate "dead wiring" findings — `IDraggable`/`CWndMan::BeginDragDrop` is the one missing generic drag-and-drop system; two more `CField_MonsterCarnival*` siblings confirmed irrelevant to the Eighty-ninth pass's desync bug

**Root-cause consolidation (this is what "trace to the real root
cause" means in practice — not a new bug, but the reason behind three
already-flagged ones):** `IDraggable`/`CWndMan::BeginDragDrop`/
`OnDraggableMove` is the OG's single generic drag-and-drop
abstraction — every draggable OG class (`CDraggableSkill`, `DragMember`,
presumably `CDraggableItem`) implements `IDraggable` and rides
`CWndMan`'s shared drag-tracking/drop-dispatch machinery. Confirmed via
grep: neither `Button.ts` nor `GamePanel.ts` (this client's own UI
base classes) have any drag-related code at all. So the
Eighty-ninth pass's dead `QuickSlotBar.TryBindSkillAt` and this pass's
`DragMember` (party-icon drag) aren't two unrelated UI gaps — they're
both symptoms of the same missing piece: this client has no generic
drag-and-drop input system for `GamePanel` to begin with. A real fix
would build one `IDraggable`-equivalent (mousedown-start/mousemove-follow/
mouseup-dispatch-to-whichever-panel-is-under-the-cursor) once, then
wire each existing dead drop-target to it, rather than bolting a
one-off drag gesture onto each panel separately.

**SHIPPED (Hundred-and-eighth pass):** built `src/ui/DragController.ts`
(`DragTarget` interface, `beginDrag`/`updatePosition`/`endDrag`/
`cancelDrag`) as the generic `IDraggable`/`CWndMan::BeginDragDrop`
equivalent this finding called for. Wired it end-to-end for the
`CDraggableSkill` case: `SkillBook.ts` gained `onDragStart` (fires on
mousedown over a learned active skill row, IDA 0x50a4e0's quickslot
case) and `QuickSlotBar.ts` now `implements DragTarget`, routing
`tryAcceptDrag` into the previously-dead `TryBindSkillAt`.
`GameStage.ts` owns the controller, feeds it cursor position every
`onMouseMove`, and on `onMouseButton` mouse-up intercepts the drop
before the normal per-panel click dispatch. Tests:
`tests/ui/DragController.spec.ts`, `tests/ui/game/QuickSlotBar.spec.ts`.
**Not yet done:** `DragMember` turned out to be Expedition-specific
(see correction below) so it isn't wired to this controller; the
`GuildCreate`/`CCreateGuildAgreeDlg` dead-sender fix (next on the list)
doesn't need drag at all, just a dialog.

**Confirmed irrelevant to the Eighty-ninth pass's `CField_MonsterCarnival`
opcode-346 desync finding (checked, not assumed):** `CField_MonsterCarnivalWaitingRoom`
and `CField_MonsterCarnivalS2_Game` — neither overrides `OnEnter`/`OnPacket`
(confirmed via their method lists, only constructor/`GetFieldType`/`Init`),
so opcode 346 is never specially handled for these two subtypes the way
it is for `CField_MonsterCarnival` vs. `CField_MonsterCarnivalRevive`.
They don't expand that already-flagged bug's scope.

**Confirmed already covered:** `IWzSound` — this client has its own
full audio port (`WzAudioPlayer.ts`, `WzSound.ts`,
`MobSoundService.ts`, mute-toggle wiring in `Stage.ts`), not a gap.
`IItemEffect` — the interface behind the Ninety-sixth pass's
already-flagged `CAnimateEffect` finding, not an independent one.

**Confirmed real, small, cosmetic gap:** `CDisconnectException`
(`GetNoticeIdx`) — disconnect reasons carry a notice index server-side,
but this client's own disconnect handling (`LoginStage.ts:448`) just
shows a generic `'Disconnected.'` string regardless of reason.
`CShortcutHelpDialog` — a read-only keyboard-shortcut reference popup,
distinct from `KeyConfig.ts` (which remaps keys, doesn't document
them). Neither WZ-verified this pass.

**Confirmed real gaps, no `src/` presence, niche life-entity/structure
types (same category as the Ninety-sixth pass's `CHealer` finding):**
`CPulley` (a hit-to-operate puzzle-room mechanism) and `CAttrShoe` (a
shared "shoe attribute" mixin used by `CDragon`/`CEmployee`/`CMob`/
`CNpc`/`CPet` — likely a slippery-floor/footwear-interaction quirk).
Neither WZ-verified.

**Confirmed real gaps, niche seasonal/event field types (same category
as prior `CField_*` findings):** `CField_ShowaBath`,
`CField_Tutorial` — both override `DecodeFieldSpecificData`, meaning
each carries its own per-field wire data this client doesn't decode
anywhere. Not WZ-verified this pass.

**Confirmed moot (native/compiler plumbing, written up per the
no-silent-skip rule):** `_dynamic_initializer_for__ZRecyclableAvBuffer_ZRefCountedDummy_CNpcTemplate`
(same memory-pool-singleton pattern as prior passes), `_anonymous_namespace_`
(holiday-date-constant and loader-singleton static initializers — pure
compiler bookkeeping, not classes), `_dynamic_initializer_for__CWndMan`
(static-initializes `CWndMan`'s own window/mouse-tracking globals — no
independent behavior beyond what's already covered by this client's
own `GamePanel`/input-dispatch system), `CDayOfWeek` (a
server-clock-driven "what day is it" singleton, used for day-of-week
gated event content this client doesn't model at the field-event
level), `CSimpleStrMap` (a generic `ZMap`-backed string-keyed
container — a data-structure utility, not a feature, this client uses
plain JS `Map`/objects everywhere one would be used).

## Ninety-sixth pass (self-directed, IDA_INDEX.md sweep — batch of 16, no-silent-skip rule continued): `CDurationChecker` is a real anti-macro timing-statistics heuristic (security-relevant, sibling of the Eighty-sixth pass's `CUIAntiMacro`); party-member-icon drag is another dead-wiring-shaped gap; rest covered/sibling/moot

**Confirmed real, security-relevant gap (decompile-verified, not
assumed from the name):** `CDurationChecker::Validate` (0x517440) is a
rolling-window statistical timing validator — it keeps the last N
action durations in a ring buffer and returns false unless the latest
sample is within `[m_nDurationMin, m_nDurationMax]` *and* (once enough
samples are collected) the rolling total is within
`[m_nDurationLimitMin, m_nDurationLimitMax]`. That's a textbook
macro/bot-detection heuristic — flagging input that's too fast, too
slow, or too statistically regular. This is the timing-analysis
sibling of the already-flagged `CUIAntiMacro` captcha system
(Eighty-sixth pass): together they'd be "detect suspicious timing
→ trigger the human-check popup." Zero `src/` presence, consistent
with `CUIAntiMacro` itself still being unimplemented.

**Confirmed real, small gap (same dead-wiring shape as `TryBindSkillAt`/
`GuildCreate` from the Eighty-ninth/Ninety-second passes):** `DragMember`
(0x7ad990, `OnDropped`) — drag-and-drop reordering/removal of party
member icons. Confirmed via grep: `UserList.ts` (the party panel) has
no drag handling of any kind. Not implemented this pass, but matches
an established, easily-recognized bug family in this codebase: a

**Correction (found while implementing the Ninety-seventh pass's
`IDraggable` system, Hundred-and-eighth pass):** `DragMember::OnDropped`'s
full decompile (re-read, not just its method-name shape) shows it's
scoped specifically to `TabExpedition`/`ExpeditionIntermediary` —
it calls `TabExpedition::HasMsgHandler`/`GetPartyIndexOfRegion` and
`EXPEDITION::GetPartyIndex`/`GetMaxPartyIndex`, i.e. it drags a member
between the *Expedition* window's sub-party regions, not the regular
party list in `UserList.ts`. So this is a sibling of the already-flagged
whole-missing `TabExpedition` system (Sixty-eighth/Seventy-third
passes), not an independent regular-party-list gap — it can't be
usefully implemented until `TabExpedition` itself exists. The original
"`UserList.ts` has no drag handling" observation above is still
accurate, just not what `DragMember` itself is for.
ready receiving side with nothing driving it, or (here) no drag
gesture at all on either side.

**Confirmed already covered:** `CMonsterBookAccessor` —
`MonsterBook.ts`'s `Open(cards, total, caught)` already carries the
caught/total card-count data this accessor exists to provide. Not a
new finding.

**Confirmed sibling of an already-flagged/just-flagged gap:**
- `CEmployeeTemplate` (and its instantiated `CEmployee`) — a hired-NPC
  life-entity type with no independent `src/` presence; same general
  "life entity types beyond Mob/Npc" gap shape as `CHealer` below.
  Niche, not WZ-verified.
- `CHealer` — a healer-type life entity (`Move`/`Init`/`Draw`-shaped),
  no `src/` presence. Niche PQ/event structure, not WZ-verified.
- `CBitmapNumber` — sibling of the Ninety-fifth pass's
  `CBitmapStrNumber` (same WZ-bitmap-digit-rendering root cause, used
  by the already-flagged scoreboard/timer boards).
- `ITCITEM` — the Auction House per-listing item struct, sibling of
  the long-established "no Auction House (`CITC`) UI panel exists"
  root cause repeated across many earlier passes.
- `TemporaryStat_GuidedBullet` — one more `TemporaryStatSet` bit-decode
  instantiation, sibling of the already-disclaimed
  `SecondaryStat::DecodeForLocal` limitation noted in `STATUS.md`.
- `PartyQuestInfo` — the data class behind the already-flagged
  `CPartyQuestInfoManager` (Ninety-second pass), not an independent
  finding.
- `CPartySearch_RemoCon` — a sub-widget of the Ninety-fifth pass's
  just-flagged `CUIPartySearch`/`TabDlgInterface` gap.
- `ActionRandMan` — already covered by the Ninety-fifth pass's
  `CRand32` finding (intentionally-unused seed, consistent with the
  server-authoritative-damage architecture).
- `CMsgbox`/`CMsgboxLinkWeb` — generic message-box singleton (same
  already-covered `Notice.ts`/`CUtilDlg::Notice` pattern) plus a
  web-link variant; this client already has a working
  server-triggered `window.open` path (`GameStage.ts:1262`) for the
  underlying "open an external link" capability, so `CMsgboxLinkWeb`
  is a styling wrapper around already-available functionality, not a
  capability gap.

**Confirmed real gap, no `src/` presence, niche minigame, not
WZ-verified this pass:** `CUIPamsSong` — the "Pam's Song" rhythm
minigame UI. `CAnimateEffect` — an item-use-triggered visual effect
animator (`GetItemID`-keyed); confirmed via grep no item-use visual
effect dispatch exists in `src/` beyond what's already covered by
existing skill-effect overlays.

**Confirmed moot (native plumbing):** `type_info` — native C++ RTTI
type-comparison primitive (`operator==`, destructor); this client has
no use for C++ RTTI.

## Ninety-fifth pass (self-directed, IDA_INDEX.md sweep — batch of 16, no-silent-skip rule continued): Party Search and Skill Guide are protocol-stub-only gaps (opcode named, no handler/UI at all); damage-seed decode confirmed intentionally unused, consistent with the server-authoritative-damage design

**Confirmed real gaps, protocol named but completely unimplemented (no
handler, no UI — a step earlier than the usual "decoded but unwired"
pattern):**
- `TabDlgInterface` — the tabbed-dialog base behind `CUIPartySearch`
  (party search/matchmaking window, confirmed via its only caller
  `CUIPartySearch::GetCurTabDlg`). Confirmed via grep: `PartySearch`
  only appears as a bare enum/opcode name in `Enums.ts` — no
  `FieldHandlers`/`GameSender` handler or UI panel exists for it at
  all.
- `CWndSkillGuide` — the in-game skill-guide/explanation window.
  Confirmed via grep: `SkillGuide` only appears as a bare opcode
  constant in `OpCodes.ts` — same "named but nothing built" gap as
  `CUIPartySearch` above.

**Confirmed already covered (foundational rendering classes, same
category as the Ninety-third pass's `IWzProperty` finding):**
`CSpriteSource` (WZ bitmap/canvas loading + Z-order querying — this
client's `WzTextureLoader.ts`/`AvatarZMap` already serve this role,
per `STATUS.md`'s own z-ordering notes) and `ACTIONDATA` (per-action
animation-frame "piece" data — covered by `WzFrameAnimation.ts`/
`AnimatedSprite.ts`'s own frame-animation pipeline). Neither is a gap;
both are the OG-side data structures behind already-extensively-built
systems.

**Confirmed intentionally unused, consistent with an already-established
architecture choice (not a gap):** `CRand32`/`ActionRandMan` — the
deterministic-RNG class seeded by `calcDamageSeed1/2/3` (decoded at
migrate-time in `handleSetField`, `FieldHandlers.ts:943-945`, but never
read again anywhere — confirmed via grep). Since this client never
computes damage client-side (server is authoritative for all hit/damage
resolution, the established pattern confirmed independently multiple
times in earlier passes, e.g. `CActionMan::GetMeleeAttackRange`), there
is no client-side use for a damage-verification RNG seed — dropping it
after decode is the correct behavior given that architecture, not an
oversight.

**Confirmed sibling of an already-flagged gap:** `CUIAntiMacroCharacterName`/
`CUIAntiMacroNotice` — sub-dialogs of the already-flagged `CUIAntiMacro`
anti-bot captcha system (Eighty-sixth pass, "a real anti-bot mechanic,
not just cosmetic UI"). `CBitmapStrNumber` (WZ-bitmap-digit number
renderer) — used by the already-flagged-missing `CScoreboard_*`/
`CTimerboard_*` event timer boards (their own `GetFontTime` methods
imply bitmap-digit rendering), not an independent gap.

**Confirmed cash-shop-blocked (same established root cause):**
`CCSWnd_ItemSearch` — Cash Shop item-search sub-window.

**Confirmed sibling of an already-flagged gap (bullet-visual family):**
`CAfterImageBullet` — another `ProjectileOverlay.ts`-sibling bullet
variant (an after-image-trail effect), same root cause as the
Ninetieth pass's `CFadeoutBullet`/`CVecProcess` finding (this client's
projectile system has exactly one straight-line dot style, no
trail/fade/curve variants).

**Confirmed real gap, no `src/` presence, niche reward popup — not
assumed cash-shop-blocked without evidence (the Ninetieth pass's
`CUIVegaResultPopup` correction is the cautionary example here):**
`CUIRandomMesoBag` — a random-meso-reward popup, likely tied to an
event/quest consumable rather than necessarily a cash item; not
WZ-verified this pass, flagging as an open item rather than guessing
its root cause.

**Confirmed moot (native plumbing, written up per the no-silent-skip
rule):**
- `_dynamic_initializer_for__ZRecyclableAvBuffer_ZMap_unsigned_long_ZRef_CActionMan`/
  `_dynamic_initializer_for__ZRecyclableAvBuffer_ZRefCountedDummy_CUserPool`
  — same memory-pool-singleton-thunk pattern confirmed moot in the
  Ninety-first/Ninety-third passes.
- `ZFatalSection` — native critical-section lock primitive; this
  client's JS runtime has no equivalent need (single-threaded, no
  cross-thread contention to guard against).
- `_com_util` (`ZtlConvertStringToBSTR`/`BSTRToString`, `UIntAdd`/
  `UIntMult`) — COM BSTR marshaling + safe-integer-overflow helpers,
  same root cause as the Ninetieth pass's `Ztl_bstr_t` finding (a
  marshaling convention, not a feature).
- `ZInetAddr` — native socket-address wrapper, same root cause as the
  Ninety-third pass's `ZSocketBase` finding (this client's own `net/`
  layer over WebSocket already serves this role).

## Ninety-fourth pass (self-directed, IDA_INDEX.md sweep — batch of 16, no-silent-skip rule continued): `CDoubleAttack`/`CTripleAttack`/`CFinalCharge`/`CFinalBlow`/`CFinalToss` are concrete siblings of the Eighty-ninth pass's `CFinishAttack` finisher system; rest already covered or sibling/moot

**Confirmed sibling of an already-flagged gap (extends, doesn't
replace, the Eighty-ninth pass's finding):** `CDoubleAttack`,
`CTripleAttack`, `CFinalCharge`, `CFinalBlow`, `CFinalToss` — all five
share `CFinishAttack`'s exact shape (`CheckPreOrderSkill`/`GetSkillID`/
`GetValidDuration`/`DoAction`, decompile-confirmed via the method
list), confirming they're concrete per-skill finisher implementations
riding the same `CSequencedKeyMan`-driven combo-finisher system already
flagged as missing in the Eighty-ninth pass. No new root cause; this
pass just confirms the family is larger than one class (5 concrete
finishers, not just the abstract `CFinishAttack` base).

**Confirmed already covered:**
- `CConfirmRaceDlg` — `RaceSelectStage.ts` already implements its own
  confirm-dialog (`_confirmDim`/`_confirmOk`/`_confirmCancel` etc.,
  lines 57-74) serving the exact same race-selection-confirmation
  purpose.
- `CSummonedBase`/`CTamingMobTemplate` — covered by `SummonedLook.ts`
  and `TamingMobLook.ts` respectively (both confirmed present via
  grep, riding-mob and summon visuals already ported).
- `CUIClaimPreNotice` — already directly confirmed in the Ninetieth
  pass (`Claim.ts` wired at `GameStage.ts:653-656`, matching this
  exact class's `OnButtonClicked`/`SetRet`-only behavior).

**Confirmed real, small, cosmetic gap:** `CTips` (`GetTip`/`TIPS_INFO`)
— the login/loading-screen tip-of-the-day text rotator. Confirmed via
grep: no tip-rotator text exists anywhere in `src/` (the few "Tip"
string hits in `BuffList.ts`/`ItemTooltip.ts`/etc. are unrelated
tooltip code, not this feature). Low priority, purely cosmetic.

**Re-checked while waterfalling through implementation — initial
"StringPool-blocked" conclusion below was WRONG, corrected after
opening the real WZ data directly instead of stopping at the
decompile:** decompiled `CTips::Init`/`CTips::GetTip` in full. Both the
*root WZ path* (`StringPool::GetBSTR(0x73Au)` in `Init`) and the
template-text sub-path (`StringPool::GetStringW` 0x740/0x741 in
`GetTip`) are StringPool-resolved at runtime — but that's only the
*OG binary's own path-resolution convention*, which this client doesn't
need to replicate (it already loads WZ packages by literal name, e.g.
`WzPackage.OpenBase(dir, 'Etc')`, never through StringPool indirection).
Opened `Etc/Tips.img` directly via this client's own `WzPackage` reader
and found it's a fully literal table: `info/0..9` = `{all, interval,
levelMin, levelMax, job?, tip}` entries, plus flat per-group tip-string
lists (`novice`, `novice2`, ... `novice9`) — nothing StringPool-blocked
about the actual content, unlike `MonsterBookStr` where even the WZ key
*names* are StringPool-indirected. **SHIPPED:** `src/character/TipOfTheDay.ts`
(new file) loads this table and gates by player level (matching
`GetTip`'s `levelMin`/`levelMax` range-match exactly) and by the
per-entry `interval` rate-limit; wired into `GameStage.update()`
(confirmed via xref that `CTips::GetTip` is called every tick from
`CWvsContext::Update`, not just at login) and displayed via a new
`StatusMessenger.showTip()` toast. **Simplified, documented rather than
guessed:** the `job` bitmask field and the `all`-percent roll both feed
a StringPool-resolved message-template selection whose exact semantics
aren't recoverable without the string table — dropped (every tip shows
regardless of job, raw text with no template wrapper), same pattern as
the equip-set-tooltip precedent. Test: `tests/character/TipOfTheDay.spec.ts`.

**Confirmed sibling/moot, root cause already established:**
- `CMessageBoxDlg` — generic title/text/flags message box, same
  already-covered generic-dialog pattern as `Notice.ts`/
  `SystemNoticeOverlay.ts` (`CUtilDlg::Notice` family).
- `ADVER_COMMON` — backing data struct for the already-flagged
  `CField_HuntingAdballoon` ad-board event (Eighty-ninth pass), not an
  independent gap.
- `CUINoticePremium` — cash-shop premium notice popup, same
  already-established "no Cash Shop WZ package exists" root cause;
  also already explicitly named (and disclaimed as distinct from
  `Notice.ts`) in that file's own header comment.
- `CUIWeddingInvitation` — sibling of the already-flagged Wedding
  wishlist gap (`CWishListRecvDlg`, noted in an earlier pass).
- `CTimerboard_SpaceGAGA` — sibling of this pass-batch's own
  `CField_SpaceGAGA` (Ninety-third pass) — its scoreboard/timer widget,
  not an independent gap.

**Confirmed moot (native plumbing):** `Geometry`
(`InclusionChecker::Line`, STL sort/heap algorithm instantiations) —
generic line-intersection/polygon-containment math, the likely backing
implementation for `CWvsPhysicalSpace2D::GetCrossCandidate`'s
broad-phase candidate search (already noted as a known-uncertain,
not-independently-extractable area in `STATUS.md`). No new finding,
just confirming the math-utility layer behind that existing
disclaimer rather than a class with its own feature surface.

## Ninety-third pass (self-directed, IDA_INDEX.md sweep — batch of 16, no-silent-skip rule continued): `MOBSKILLLEVELDATA` resolves to an already-self-flagged gap (`onMobSkillDelay`'s empty stub); rest of batch is native plumbing or already-established sibling root causes

**Confirmed real gap, but resolves to an already self-documented stub
rather than a brand-new finding:** `MOBSKILLLEVELDATA`
(`GetTileUOL`/`GetEffectUOL`/`GetMobUOL`/`GetAffectedUOL`, loaded per
mob-skill-level by `CSkillInfo::LoadMobSkillLevelData`) is the WZ-asset
resolution layer for *which animation plays* when a mob casts a skill.
`MobSkillType.ts` (58 lines) is just an enum with no UOL/level
resolution at all, and `GameStage.ts:1424`'s own comment confirms it:
`fh.onMobSkillDelay = (_args) => { /* mob skill cast countdown — same
gap as above */ };` — an intentionally empty stub. So
`MOBSKILLLEVELDATA` is exactly the missing data layer behind that
already-self-flagged gap, not an independent new finding — this audit
pass corroborates it's still accurate and pins down the specific OG
class responsible.

**Confirmed sibling/moot, root cause already established in earlier
passes:**
- `CS_COMMODITY`/`CS_COMMODITY_EX` — Cash Shop commodity data, same
  "no Cash Shop WZ package exists in this client's data at all" root
  cause as prior passes.
- `CItemSearchDlg` — sibling of the already-flagged
  `CUIShopScanner`/`CUIItemSearch` cross-shop search gap (noted in an
  earlier pass at TODO_AUDIT.md line ~835).
- `ALLIANCEDATA` — sibling of the already-flagged Guild Alliance/
  `CWndGuildGrade`/`CWndAllianceGrade` rank-management gap.
- `CTimerboard_Massacre` — sibling of the Eighty-ninth pass's
  already-flagged `CField_MassacreResult` (its scoreboard/timer
  widget specifically).
- `CField_SpaceGAGA` — another niche seasonal event field type, same
  category as the Eighty-ninth pass's `CField_Witchtower`/
  `CField_CookieHouse` findings; not independently WZ-verified.
- `CClientOptMan` — already independently investigated outside the
  numbered-pass sequence: `STATUS.md`'s `MovePathDecoder` notes already
  cite `CClientOptMan::GetOpt`'s map-miss-returns-0 body directly to
  justify assuming option 2 (`bPassive`-extra-shorts) is unset. Not
  re-litigated.
- `CClaimChatLog` — backs the character-ownership-verification side of
  the already-covered `CUIClaim` flow (Ninetieth pass); `Claim.ts`'s
  own confirmed-correct simplification (`OnConfirm` is a local gate,
  no packet) means the underlying chat-log verification data was never
  needed client-side either.

**Confirmed moot (native plumbing, written up per the no-silent-skip
rule):**
- `_dynamic_initializer_for__ZRecyclableAvBuffer_ZRefCountedDummy_CMob`
  (7 sub-entries) — same `ZRecyclableAvBuffer` memory-pool-singleton
  pattern confirmed moot in the Ninety-first pass, this time for
  `CMob`'s sub-structs.
- `ZStrUtil` — native char↔wchar (ANSI/UTF-16) buffer conversion. This
  client's strings are JS strings throughout; no codepage conversion
  layer needed.
- `ZThread` (`BeginThread`) — native Win32 thread spawning, used only
  by `CWebWnd::Run` (the OG's embedded web-content window, itself tied
  to the already-absent Cash Shop/event-page browser surface). No
  equivalent needed.
- `ZSocketBase` — native raw Winsock socket wrapper; this client's own
  `net/` layer (WebSocket via the bundled proxy) already serves this
  role, same pattern as the Ninetieth pass's `ZFileStream`/`ZIStream`
  finding.
- `CCtrlOriginButton`/`CCtrlStatic` — native generic UI control base
  classes (positioned button, static text/image); `Button.ts`/PixiJS
  `Text`/`Sprite` already cover the same ground with no native-control
  layer needed underneath.
- `IWzProperty` (233 methods, the single largest remaining entry) —
  the foundational WZ property COM interface. `src/wz/WzProperty.ts`
  is this client's direct, already-extensively-used port of it (used
  pervasively across nearly every WZ-reading file in `src/`); this is
  the most-already-covered class in the whole index, not a new gap.

**Confirmed real gap, no `src/` presence, not independently
WZ-verified this pass:** `CField_NoDragon` — a field-type restriction
marker (likely disallowing the Dragon vehicle/mount in specific PQ or
boss rooms). This client has some vehicle-adjacent protocol/cash-shop
plumbing (`GameSender.ts`, `CashShopStage.ts`, `Trunk.ts`) but no
field-level restriction logic of this kind; low priority given how
niche the restriction is.

## Ninety-second pass (self-directed, IDA_INDEX.md sweep — batch of 16, no-silent-skip rule continued): two dead-sender bugs found (`GuildCreate`, megaphone-compose) matching the `TryBindSkillAt` pattern from the Eighty-ninth pass; energy-gauge widget and several niche dialogs confirmed missing

**Confirmed real, fixable gaps — dead senders (same bug class as
`QuickSlotBar.TryBindSkillAt` from the Eighty-ninth pass: the wire-up
exists on one side but nothing calls it):**
- `CCreateGuildAgreeDlg` (0x56b110) — the guild-creation name-entry/
  agreement dialog. `GameSender.GuildCreate(name)` (`GameSender.ts:885`)
  is fully implemented but **has zero callers anywhere in `src/`**
  (confirmed via grep) — there is no UI path that can ever invoke guild
  creation. Needs a small dialog (name `TextField` + confirm button,
  same pattern as `CharCreationStage`'s name-entry) wired to the
  existing sender — not implemented this pass, flagging with the exact
  fix surface identified.
  **Correction + SHIPPED (Hundred-and-eighth pass):** re-decompiling
  `CCreateGuildAgreeDlg::CCreateGuildAgreeDlg(ZXString<char>, ZXString<char>)`
  while implementing showed it takes a *requester name* + *guild name*
  pair — it's the **other party members'** agree-to-this-request popup,
  not the initiator's name-entry UI. `GameSender.GuildCreate`'s wire
  shape is just `action byte + name string`, no party-list — so the
  real initiator-side fix is the same `window.prompt()` convention
  `UserList.getInviteName` already uses for party invites, not a ported
  dialog. Added a "Create" button to `UserList.ts`'s Guild tab (shown
  only when not already in a guild) wired to `getGuildName()`/
  `onGuildCreate`, with `GameStage.ts` sending `GameSender.GuildCreate`.
  The actual `CCreateGuildAgreeDlg` (multi-member consent popup) is
  still unbuilt — there's no protocol support visible client-side for
  the consent round-trip, so it may be server-only in this version.
- `CSpeakerWorldDlg`/`CSpeakerWorldDlgEx` (0x786a00/0x786cc0) — the
  Megaphone/Super Megaphone broadcast-message *compose* dialog.
  This client's receive side is fully wired (`onAvatarMegaphoneRes`/
  `onBroadcastMsg`, `FieldHandlers.ts:187,262`) but there is **no
  outbound sender for sending a megaphone message at all** — confirmed
  via grep, no `Megaphone` hit anywhere in `GameSender.ts`. So this
  client can display other players' megaphones but a player holding a
  megaphone item here has no way to compose and send one. Real,
  two-sided gap (missing sender *and* missing compose UI), bigger than
  the `GuildCreate` case above since the sender itself doesn't exist
  yet either.
  **Sized up while waterfalling through implementation, not attempted
  this pass:** decompiled `CItemSpeakerDlg::_SendConsumeCashItemUseRequest`
  (0x5c9e70) — it's opcode 85 (`UserConsumeCashItemUseRequest`, already
  named in `OpCodes.ts` and already used by `GameSender.ItemUpgradeApply`/
  `KarmaApply`/`ItemProtectorApply`): `int4 updateTime, int2 inventoryPos,
  int4 itemId, string message, byte isWhisper, byte hasTargetItem,
  [if hasTargetItem: int4 targetTI, int4 targetSlotPos]`. The sender
  itself would be a small, mechanical addition (same shape as the three
  siblings already in `GameSender.ts`). The real blocker is the compose
  UI: `CItemSpeakerDlg`/`CSpeakerWorldDlgEx` need the player to *drag a
  megaphone item from their inventory* into the dialog (`CDraggableItem::PutItem`),
  and **this client has no inventory-item drag-and-drop at all** —
  confirmed by `GameStage.ts:696-699`'s own comment on the adjacent
  `GoldHammer`/`KarmaScissors`/`ItemProtector` dialogs ("the open-trigger
  ... is not [wired] — no drag-drop wiring calls `setTarget` yet"). So
  this is the same root-cause shape as the Ninety-seventh pass's
  `IDraggable` skill-drag gap, but for inventory *items* instead of
  skills, and fixing it would also unblock those three already-built
  dialogs at the same time. Real spec for a future pass: extend
  `DragController`'s `DragTarget` pattern to `EquipInventory.ts`/
  `Inventory.ts` item icons (payload `{itemId, slotPos}` instead of
  `{skillId}`), then wire `GoldHammer`/`KarmaScissors`/`ItemProtector`/
  `ItemSpeaker` (new) as drop targets. Not implemented — correctly
  deferred as a shared infrastructure gap, not a one-off.

  **SHIPPED (later pass — item drag-and-drop infrastructure):** extended
  `DragController`'s pattern to items exactly as spec'd above.
  `ItemInventory.ts`/`EquipInventory.ts` both gained `onDragStart`
  (`ItemDragPayload = {itemId, slotPos, invType}`, fired on mousedown
  over a slot, mirroring `SkillBook.onDragStart`'s convention).
  `GoldHammer`/`KarmaScissors`/`ItemProtector` now `implements DragTarget`
  via `tryAcceptDrag` → `setTarget`, unblocking all three at once as
  predicted. `DragController` gained a `payload` getter so `GameStage`
  can peek the in-flight payload before `endDrag` clears it.
  **Behavior-preserving fallback:** `EquipInventory`'s old "click an
  equipped slot to instantly unequip" gesture is now the drag-end
  fallback (fires only if no upgrade/protect/scissors dialog is open to
  claim the drop) rather than firing immediately on mousedown — old
  callers with no icon loader still get the original immediate-unequip
  behavior unchanged (verified no regressions, full suite still green).
  **Not done:** `CItemSpeakerDlg`/`ItemSpeaker` itself (the megaphone
  compose dialog) still doesn't exist as a panel, so it can't be wired
  as a fourth drop target yet — only the three already-built dialogs
  were unblocked. The open-trigger question (which itemId opens which
  dialog) also remains unsolved — traced into `CWvsContext::SendConsumeCashItemUseRequest`'s
  giant ~150KB generic item-use dispatcher and found it switches on a
  derived type code (e.g. `case 0x43` for the upgrade dialog), not a
  simple `itemId/10000` category test like the engagement-ring/skill-book
  cases — replicating that dispatcher fully matches the already-established
  out-of-scope precedent (`CUserLocal::DoActiveSkill`'s 3600-line
  hardcoded dispatcher), so it wasn't guessed at. Tests:
  `tests/ui/game/EquipInventory.drag.spec.ts`,
  `tests/ui/game/ItemInventory.drag.spec.ts`,
  `tests/ui/game/UpgradeDialogs.drag.spec.ts`.

**Confirmed real gap, no `src/` presence:** `CUIEnergyBar`
(0x7a2370, `SetEnergy`/`Update`/`HitTest`) — an on-screen energy/combo
gauge widget. Confirmed via grep: no "combo"/"energy charge"/"aran"
gauge concept exists anywhere in `src/`. Niche, job-specific
(Aran-era v95 combo-counter-style mechanic), not WZ-verified this pass.

**Confirmed already covered:** `CFloatNotice` —
`StatusMessenger.ts`'s own header comment already names this exact OG
class (`CreateFloatNotice`/`CreateEffEvolRing`) as what it ports, EXP-gain
toasts included. Not a new finding.

**Confirmed sibling/moot, root cause already established in earlier
passes:** `CUIRaiseWnd` (ties into the Seventy-third pass's already-flagged
missing `CUIRaiseWndBase`/"Raise" pet-evolution minigame).
`CScoreboard_Witchtower` (sibling of the Eighty-ninth pass's already-flagged
`CField_Witchtower` event field — its scoreboard widget, not an
independent gap).

**Confirmed real gaps, no `src/` presence, not independently
WZ-verified this pass (niche login/char-select and tutorial features):**
`CUICharDetailVAC`/`CUICharDetail` (the "view character details" popup
on the char-select screen, showing equipped gear/stats before logging
in — distinct from the in-game `CharInfo.ts` panel), `CTutor` (the
new-player tutorial/hint-message helper), `CPartyQuestInfoManager` (a
static lookup table identifying which maps are party-quest maps — used
to gate PQ-specific UI), `CUIScreenMsg` (an in-game scrolling
system-message banner — distinct from the Ninetieth pass's
`CSlideNotice`, which is login/world-select-screen-only).

**Confirmed moot, native plumbing:**
- `CCtrlButtonQuestAlarmAuto`/`CCtrlButtonQuestToggle` — native
  per-state-animated button subclasses (same `CCtrlButtonWithAniState`
  base already confirmed covered by `Button.ts`'s WZ-sprite-state
  support in the Ninety-first pass) specialized for the quest-tracker
  UI's alarm/toggle buttons specifically; no behavior beyond what
  `Button.ts` already provides generically.
- `CVecCtrlGrenade` — a `CVecCtrl`-subclass arc-throw physics
  controller for grenade-lobbing mob skills. `CVecCtrl` itself was
  already confirmed correct in an earlier full read-through pass; this
  is one specific motion-profile subclass of it, not independently
  chased.
- `CSystemInfo` (0xa1f170, `GetMachineId`/`GetGameRoomClient`) — native
  hardware/machine-ID fingerprinting (account-binding/anti-cheat
  plumbing). No portable browser equivalent to build; the actual
  notable anti-cheat feature (`CUIAntiMacro`) was already flagged
  separately in the Eighty-sixth pass.

## Ninety-first pass (self-directed, IDA_INDEX.md sweep — batch of 16, no-silent-skip rule continued): cleared the backlog of high-count `_dynamic_initializer_for_*`/`_variant_t`-family entries earlier passes walked past; `PARTYMEMBER`'s boss-tracking gap is already self-documented in code; two more niche event-result field types found

**Confirmed moot (native memory-pool plumbing, batch-confirmed via live
decompile rather than skipped):** all six remaining
`_dynamic_initializer_for__ZRecyclableAvBuffer_*`/`_MobStat` entries
(`_MobStat`, `_ZRefCountedDummy_ZRef_CActionMan`,
`_ZRefCountedDummy_CItemInfo`, `_ZRefCountedDummy_CAnimationDisplayer`,
`_ZMap_long_ZRef_CItemInfo`, `_ZRefCountedDummy_Additional`,
`_ZMap_long_ZRef_CActionMan`) are exactly what they look like: each
named sub-symbol (e.g. `MobStat::MS_PAD`, `CItemInfo::PETFOODITEM`,
`CAnimationDisplayer::CHAINLIGHTNINGINFO`) is a static-constructor
thunk that allocates one `ZRecyclableAvBuffer` memory-pool singleton
for that specific sub-struct type — a C++ allocator optimization with
zero behavior of its own, not a class to port. Confirmed by sampling
the actual decompiled bodies (single `s_pInstance` pool allocation,
no logic) rather than assumed from the name pattern alone.

**Confirmed moot (COM variant/string marshaling, same root cause as
the Ninetieth pass's `Ztl_bstr_t` finding):** `Ztl_variant_t`/
`_variant_t` — the COM `VARIANT` wrapper used everywhere the OG's
COM-based interfaces (`IWzProperty`, `IWzCanvas`, `IWzVector2D`, etc.)
pass a loosely-typed value. This client's WZ/render layer already
passes plain JS numbers/strings/objects in the equivalent spots. No
feature gap, just a marshaling convention with no portable equivalent
to build.

**Confirmed already covered / already self-documented:**
- `PARTYMEMBER` (the actual party-member data struct/decode,
  `Decode`/`GetMemberCount`/`FindIndex`/`GetCharacterID`/
  `IsBossOnline`/`GetBossName`) — its core fields are wired
  (`onPartyLoad` → `UserList.setParty`, `GameStage.ts:1426`), and the
  one missing piece — boss/crown indicator from `IsBossOnline`/
  `GetBossName` — is **already explicitly flagged in the code itself**:
  `GameStage.ts:1432-1434`'s own comment ("OG case 31 — no boss/crown
  indicator exists in UserList's party panel yet") and the deliberately
  empty `fh.onPartyBossChanged = (_newBossCharId) => {}`. No new
  finding needed; this audit pass independently re-confirms that
  self-flagged gap is accurate and current.
- `CCtrlButtonWithAniState` (native per-state-animated button base,
  `Animate`/`Update`/`CreateCtrl`) — `Button.ts` already supports
  normal/mouseOver/pressed/disabled WZ-sprite states (its own header
  comment cites `Button.LoadFirst`), the same per-state-art concept
  this OG class provides natively. Not a gap.

**Confirmed sibling/moot, not independently chased (same root cause as
already-flagged event minigames):** `CTimerboard_CakePieEvent`
(sibling of the already-flagged `CCakePieEvent`/`CUICakePieEventItemInfo`,
Eighty-seventh pass), `CSnowMan` (the literal snowman target/structure
in the already-flagged `CSnowBall` Snowball-PvP event, Eighty-seventh
pass — `DrawHPTag`/`Hit` are that minigame's target-structure behavior,
not an independent feature).

**Confirmed moot (native socket-buffer plumbing):** `ZSocketBuffer` —
native Winsock receive-buffer pool, same role this client's own
`net/` layer (over WebSocket via the bundled proxy) already serves
with plain `Uint8Array`/`ArrayBuffer` buffers. No portable equivalent
needed.

**Confirmed real gaps, no `src/` presence, niche event-result field
types (same category as the Eighty-ninth pass's `CField_MassacreResult`/
`CField_Witchtower`/`CField_CookieHouse` findings):** `CField_EscortResult`
(Escort-quest-event result screen) and `CField_PartyRaidResult` (Party
Raid boss result screen — sibling of the already-covered Zakum/Party-Raid
*timer* protocol from the Eighty-seventh pass, but the result/reward
*screen* itself has no client implementation). Neither WZ-verified
this pass.

## Ninetieth pass (self-directed, IDA_INDEX.md sweep — batch of 16, "do all" mode continued, new rule: no silent skips): native/STL-wrapper entries get a written finding too; `CUIVegaResultPopup`/`CUIPartyHP`/`CSlideNotice`/`CVecProcess`/`CFadeoutBullet` are real gaps

**New process rule starting this pass:** every entry in the batch gets a
one-line finding, including `_dynamic_initializer_for_*`/`Ztl_*`/native
STL-stream-wrapper classes that earlier passes (88/89) silently passed
over without writing anything up. Going forward no entry gets checked
off in `IDA_INDEX.md` without a corresponding sentence here, regardless
of how boilerplate it looks.

**Confirmed real gap, but smaller-scoped than first read (caught before
writing it up wrong — xref-chased the constructor, not just the opcode
handler):**
- `CUIVegaResultPopup` (0x7bf9f0) is **not** built directly from the
  `VegaResult` opcode (429) — `idautils.CodeRefsTo` shows its only two
  callers are both inside `CUIVega::Draw` itself (0x7c1dd0, call sites
  0x7c20e4/0x7c2135), and its constructor signature takes an *equip
  item slot* (`ZRef<GW_ItemSlotBase>`, `nEquipItemTI`,
  `nEquipSlotPosition`) plus a small `nResult` (1/2) that only selects
  between two StringPool title strings (0x1529/0x152A). `OnVegaResult`
  (the opcode handler, decompiled at 0x7bf7b0) just stores the decoded
  byte onto `CUIVega::m_nRet1` and plays `CAnimationDisplayer::Effect_Vega`
  — the popup is a lazily-constructed artifact of `CUIVega`'s own
  per-frame `Draw`, not something a single opcode callback can produce
  standalone. Since the whole `CUIVega` window (the cash-item
  stat-reroll minigame) is **already flagged as missing** in an earlier
  pass ("a cash-item stat-reroll NPC dialog", cash-shop-adjacent,
  lower priority), `CUIVegaResultPopup` is a sibling of that
  already-tracked gap, not an independently fixable one-liner — this
  client's decoded-but-unused `onVegaResult` callback (`FieldHandlers.ts:838`,
  confirmed zero consumers via grep) is exactly the protocol-side half
  of that same already-flagged missing window, and shouldn't be wired
  to a generic `Notice` popup since the real popup's title/content
  depends on `CUIVega`'s own equip-slot state, not just the opcode byte.
- `CUIPartyHP` (0x8d5920) — the always-on-screen party-member HP-bar
  widget (distinct from the party-list/invite management already
  covered by `UserList.ts`). Confirmed via grep: no "party" hit
  anywhere suggests an HP-bar overlay; party support is limited to
  invite/kick/list. Real, niche gap.
  **Checked while waterfalling through implementation, blocked on a
  missing decode, not attempted this pass:** grepped `OpCodes.ts`/
  `PacketArgs.ts`/`FieldHandlers.ts` for any party-member-HP-sync
  opcode (`PartyHP`/`HPChanged`/`HPInc` and similar) — none exists.
  This client has never decoded the packet that would feed
  `CUIPartyHP` in the first place, so this isn't a UI-only gap like
  most other findings; it needs a fresh decompile pass to first locate
  *which* opcode carries other party members' HP updates (a separate
  research task from porting the widget itself) before it can be
  implemented. Left open rather than guessed at.
- `CSlideNotice` (0x780530) — the scrolling marquee/ticker notice
  banner (`SetMsg`/`HitTest`, `TSingleton`-backed). Distinct from both
  `Notice.ts` (`CUtilDlg::Notice`, a modal OK/Cancel dialog) and
  `SystemNoticeOverlay.ts` (a modal popup with bg/text/OK button) per
  their own header comments — neither is a scrolling ticker. Zero
  `src/` presence. Real, small, cosmetic gap.
- `CVecProcess` (0x9a2a20) — the elliptical-move/rotate/oscillate
  path-shape engine used for special bullet trajectories (teslacoil,
  chain lightning, certain skill projectiles). `ProjectileOverlay.ts`'s
  own header comment already discloses it's "a small dot linearly
  interpolated... not the real WZ asset" — `CVecProcess` is the
  concrete missing piece behind that disclaimer: this client has no
  curved/rotating/oscillating projectile path at all, only straight
  lines. Confirmed via grep (no `elliptical`/`oscillat`/`MakeRotate`
  anywhere in `src/`).
  **Scoped down (Hundred-and-thirtieth pass investigation):** traced
  the caller — `CMapLoadable::MakeVectorAnimate` (0x616460) — which
  reads `nMoveType` and path parameters from a WZ canvas property via
  `StringPool::GetBSTR(0x61D)` / `StringPool::GetBSTR(0x61E)`. Both
  the property key names and parameters are StringPool-indirected.
  Cannot implement without the StringPool table. Blocked, same root
  cause as `MonsterBookStr`/`ToolTip_SetItemList` per-tier-text gaps.
- `CFadeoutBullet` (0x4770b0) — a bullet variant that fades out instead
  of disappearing on impact/removal. Same root cause as `CVecProcess`
  above: `ProjectileOverlay.ts` has exactly one bullet visual style, no
  fade-out variant. Real, niche visual-polish gap, same fix surface as
  `CVecProcess`.
  **Scoped down (Hundred-and-thirtieth pass investigation):** constructor
  `(long weaponId, long timing, POINT src, POINT dst, IWzVector2D path)`
  — callers are `CMob::MobBullet` (0x649619) and
  `CSummoned::SummonedBullet` (0x74f439). The fade duration/alpha ramp
  is purely a rendering variant of the existing bullet path — would need
  `ProjectileOverlay` to support alpha-fade on removal. Implementable
  independently of CVecProcess. Deferred: need to confirm the WZ asset
  path that differentiates a FadeoutBullet from a plain bullet (likely
  a per-mob WZ property read by the same StringPool-indirected path).

**Confirmed already covered:** `CUIClaim`/`CUIClaimPreNotice` —
`Claim.ts` (wired at `GameStage.ts:653-656`) already matches the
decompiled behavior exactly (`OnButtonClicked` only calls `SetRet`/no
packet send on confirm — a local pre-notice gate, not a network round
trip).

**Confirmed cash-shop-blocked (same root cause as the established
"no Cash Shop WZ package exists in this client's data at all"
finding):** `CUICancelCharacterCouponRequests`/
`CUICancelCharacterCouponResults` (cash-shop character-slot coupon
cancellation flow), `CUIGachaponBox` (cash-shop gachapon box UI — not
to be confused with the non-cash-shop `CUIVegaResultPopup` above).

**Confirmed moot/sibling, not independently chased:**
- `SECPOINT` — a path-finding candidate-point struct used only by
  `CDropPool::TryPickUpDropByPet`. Sibling of the already-flagged
  pet-auto-loot gap (`CPet::SweepForDrop`/`TryPickUpDrop`/
  `SendDropPickUpRequest`, noted in an earlier pass at line ~1482)
  rather than an independent gap of its own.
- `NoExpire` — one of `TemporaryStatSet`'s permanent-buff (`Decode`/
  `Encode`, no expiry term) template instantiations. Sibling of the
  already-disclaimed `SecondaryStat::DecodeForLocal` bit-decode
  limitation noted in `STATUS.md` (the 100+-block hand-unrolled
  function), not independently re-verified.

**Confirmed moot (native, irrelevant — written up per the new
no-silent-skip rule rather than passed over):**
- `ZFileStream`/`ZIStream` (native synchronous Win32 file-handle I/O
  stream classes, `Read`/`Write`/`SetPosition`/`Flush`). This client's
  own `FileIO.ts` already serves the equivalent role over `fetch`/XHR
  (including the chunked-Range-read fix noted in `STATUS.md`); a
  native blocking file-handle wrapper has no portable equivalent to
  build.
- `ZExceptionHandler` (0x741c40) — native unhandled-exception minidump
  generator (`GenerateMiniDump`, `IntelStackWalk`, SEH filter). No
  portable equivalent; the browser's own devtools/error reporting
  serves this role.
- `Ztl_bstr_t` — the COM `BSTR` string-marshaling wrapper used
  pervasively across the OG's COM-based `IWzProperty`/`IWzFont`/
  `IWzCanvas` interfaces (confirmed via its ~100 callers spanning
  nearly every native UI/render class). It's a string-passing
  convention, not a feature — this client already uses plain JS
  strings everywhere those interfaces would have taken a `Ztl_bstr_t`.
  No gap.
- `IWzShape2D` (native COM vector-shape interface, `Getx`/`Gety`/
  `Move`/`Offset`/`Getcount`) — used internally by the OG's own WZ
  vector-property tooling; this client's `WzProperty`/`WzVector2D`
  equivalents already expose the same coordinate data as plain numbers
  without needing a COM shape object. No gap.

## Eighty-ninth pass (self-directed, IDA_INDEX.md sweep — batch of 16, "do all" mode continued): real protocol-desync risk in Monster Carnival revive room; drag-skill-to-quickslot is dead-code-adjacent; resolves pass 88's open `CSequencedKeyMan` trigger question

**Confirmed real, root-caused protocol bug (not yet fixed — bigger than a
one-line patch):** `CField::FieldFactory` (IDA 0x53f220, decompiled live)
picks the active `CField` subclass per map from a WZ-data-driven
`nFieldType` (`case 10` → `CField_MonsterCarnival`, `case 11` →
`CField_MonsterCarnivalRevive`) read via `CField::GetFieldProp` —
**this is a per-map property lookup, not the wire `nFieldType` byte this
client already reads in `handleSetField`** (`FieldHandlers.ts:952`,
which is a different, smaller flag). The two subclasses' opcode-346
(`OnEnter`) handlers decode *different wire shapes* for the identical
opcode: `CField_MonsterCarnival::OnEnter` (0x55a6c0) reads team-byte +
personal-CP-short + 4 more shorts (10 bytes total, matching this
client's `MonsterCarnivalEnterArgs`/`PacketArgs.ts:184`), while
`CField_MonsterCarnivalRevive::OnEnter` (0x55a330) reads **one byte and
nothing else**. `FieldHandlers.ts` has no field-type-aware dispatch at
all — opcode 346 always decodes the 10-byte normal-room shape. If a
player is ever routed into the Carnival revive/waiting room (entered
between Carnival party-quest rounds), this client will over-read 9
bytes that don't exist in the real packet, corrupting the stream for
every subsequent packet — the same bug class as the Ninth-pass severe
protocol bug. (Cross-checked opcode 353 `OnShowGameResult` between the
two subclasses too — both decode the identical 1-byte
canned-string-index shape, so that opcode is *not* affected.)
Real fix needs a small "current field type" tracker: read each map's
WZ `info/fieldType` property (Map.wz, same property `GetFieldProp`
reads, mirroring `FieldFactory`'s switch table) on `SetField`/map load,
and branch `FieldHandlers`'s opcode-346 decode between the two shapes
based on it — not done this pass since it requires adding that map
metadata lookup, which no `src/map` code currently reads at all.

**FIXED (waterfall implementation pass):** verified the `fieldType` WZ
key is a real, literal property name (not StringPool-indirected like
`MonsterBookStr`/`CTips`/`StageTheme`) by opening the actual `Map.nx`
data directly (via this client's own `WzPackage`/`NxDirectory` reader,
not guessed from outside knowledge) and scanning every map's `info`
node — confirmed `fieldType=10` on `980000101.img`/`980000201.img`/etc.
(normal Carnival rooms) and `fieldType=11` on their paired
`980000102.img`/`980000202.img`/etc. (revive rooms), exactly matching
`FieldFactory`'s switch. Re-decompiled `CField_MonsterCarnivalRevive::OnEnter`
(0x55a330) to re-confirm the 1-byte shape before wiring anything.
Added `MapInfo.FieldType` (read in `FieldScene._loadInfo`),
`FieldHandlers.setCurrentFieldType()` (same pattern as the existing
`_currentJob` tracker), called from `GameStage._onSetField` right after
`FieldScene.Load`, and branched `handleMonsterCarnivalEnter` on it.
`MonsterCarnivalEnterArgs`'s non-`team` fields are now optional to model
the revive room's smaller shape. Test:
`tests/net/handlers/MonsterCarnival.spec.ts`.

**Confirmed real gap, now resolves pass 88's open question:**
`CFinishAttack::DoAction` (0x6e0f80) is the missing piece — it's gated
on `CAvatar::GetOneTimeAction()` returning 25-28 (a melee-combo state
range) and, when no finisher is already reserved, allocates a
`KeySequenceElement` and hands it to `TSingleton<CSequencedKeyMan>`.
So `CSequencedKeyMan` (flagged 88th pass as "not yet identified which
boss/event triggers it") is **not** boss/event-specific at all — it's
the generic melee combo-finisher reservation system, armed by ordinary
attacks while `CAvatar`'s one-time-action state is in the combo range.
Zero `src/` presence for either class; this is a real missing
mechanical feature (finisher-skill auto-trigger after a combo), not
wired up this pass — `CUserLocal::DoActiveSkill`'s established
out-of-scope precedent (3600-line hardcoded per-skill dispatcher)
applies here too, since `GetDummySkillID`/`MapMacro`-style skill-ID
resolution would need that same dispatcher.

**Confirmed real, small-ish gap:** `CDraggableSkill::OnDropped`
(0x50a4e0) is the OG drag-and-drop handler for moving a skill icon from
the skill book onto the quickslot bar or key-config window. This
client's `QuickSlotBar.TryBindSkillAt(skillId, x, y)`
(`QuickSlotBar.ts:140`) is a ready-made drop-target hit-test —
confirmed via grep to have **zero callers anywhere in `src/`**.
`SkillBook.ts`'s `handleMouseButton` only implements click/double-click
(level-up button, double-click-to-use); there's no mousedown-drag-
mouseup gesture at all, so a skill can never actually be dragged out of
the skill book. Fix needs: SkillBook to start a drag on
mousedown-over-a-skill-row (track held skillId + a floating icon
sprite following `__mouseX/Y`, per `MapleClaudeGame`'s existing mouse
tracking), and on mouseup have whichever panel is under the cursor
(QuickSlotBar or KeyConfig) get a chance to claim it via
`TryBindSkillAt`-style hit-test — not implemented this pass since it
needs cross-panel input-dispatch coordination beyond a single file.

**SHIPPED (Hundred-and-eighth pass):** see the `IDraggable`
root-cause-consolidation entry (Ninety-seventh pass) above for the
implementation — `SkillBook`→`QuickSlotBar` drag now works via the new
`DragController`. The key-config drop case (dragging a skill onto
`KeyConfig.ts` to bind a non-quickslot key) is still open — only the
quickslot target was wired.

**Confirmed real gaps, no `src/` presence, niche seasonal/PvP field
types (each is a full `CField` subclass + its own UI, sibling to the
already-flagged `CSnowBall`/Coconut/Tournament event fields):**
`CField_Witchtower`, `CField_CookieHouse`, `CField_HuntingAdballoon`,
`CField_MassacreResult` (event minigame field types), and
`CScoreboard_Battlefield` (PvP battlefield scoreboard/clock widget —
`GameSender.ts` has some PvP-related senders but no display panel at
all). None WZ-verified or independently chased further this pass.

**Confirmed already covered:** `CQuickslotKeyMappedMan` — both
directions of its protocol are wired (`OutHeader.QuickslotMappedInit`
=175 inbound in `FieldHandlers.ts:2444`, `GameSender.QuickslotKeyMappedModified`
=216 outbound in `GameSender.ts:1416`), matching
`OnInit`/`SaveQuickslotKeyMap`'s decompiled shape exactly. `CLife`'s
nametag base (`ShowNameTag`/`MakeNameTag`) — covered by `MobLook.ts`/
`NpcLook.ts`'s own nametag rendering. `CConnectionNoticeDlg` (login
disconnect popup) — `LoginStage.ts`'s own `onDisconnected`/status-label
flow serves the same purpose, not a native-dialog-for-native-dialog
port. `CUINewCharNameSelect` — `CharCreationStage.ts`'s `SubScreen.Name`
covers the name-entry step generically; the OG's
Cygnus/Aran/Evan/Resistance/Normal variants are cosmetic art-skin
siblings of the same flow, not independently chased.

**Confirmed sibling/moot, not independently chased:** `CITCWnd_Status`
(another Auction House sub-window, same already-established
`CITCWnd_*` root cause as prior passes). `CInterStage` (empty
RTTI/vftable plumbing base class — `GetRTTI`/`IsKindOf`/`Init`/`Close`
have no body of their own; this client doesn't use C++ RTTI).

**Confirmed moot (native, irrelevant):** `CScreenShot` (native
screenshot-to-disk; already represented as a keybinding label in
`KeyConfig.ts:46`, and a browser can't write arbitrary files to disk
anyway). `CNMManager` (NexonModule launcher plumbing).

## Eighty-eighth pass (self-directed, IDA_INDEX.md sweep — batch of 16, "do all" mode continued): chat history up/down recall missing (`CChatHelper`); item-option decode confirmed complete including socket data; sequenced-key QTE system is a real gap

**Confirmed real, small gap:** `CChatHelper::HistoryUp`/`HistoryDown`
(IDA 0x4aa230/0x4aa2c0) — up/down-arrow recall of previously sent chat
lines while the chat input is focused. `src/ui/game/ChatBar.ts` has no
`ArrowUp`/`ArrowDown`/history handling at all (confirmed via direct
grep) — ported the send/display path but dropped this input
convenience. `TryChat`/`HistoryAddforCommand` (chat-command parsing,
e.g. slash-commands) not independently re-verified against this
client's own chat-command dispatch this pass.

**Implemented (follow-up, same pass):** added `_sentHistory`/`_historyIndex`
to `ChatBar.ts` — `ArrowUp`/`ArrowDown` now cycle through previously sent
messages, clamping at the oldest entry and clearing the input past the
newest, matching `HistoryUp`/`HistoryDown`'s behavior. Covered by
`tests/ui/game/ChatBar.spec.ts`.

**Confirmed item-option decode is complete, not partial as flagged in
the Eighty-fifth pass:** decompiling `GW_ItemSlotEquipOpt` shows the
full field set is `nCHUC`, `nOption1-3`, `nSocket1-2` — and
`ItemDecoder.ts:80-84` already decodes all five (`option1-3`,
`socket1`, `socket2`). The earlier-flagged gap stands only for the
*display-resolution* half (turning codes into stat-line text), not the
wire-decode half, which is fully correct including the socket fields
this pass adds confirmation of.

**Confirmed real gap, no `src/` presence:** `CSequencedKeyMan` — a
directional-key-sequence QTE controller (`Process(long,int)`,
0x6e3400) used for specific boss/event mechanics requiring a timed key
combo. Not yet identified which specific boss/event triggers it (xrefs
not chased this pass) or whether `wz_client` carries the relevant UI
assets.

**Confirmed sibling/moot, not independently chased:** `CUISendMemo`
(send-flow sibling of the already-covered `Memo.ts`), `CUISkillEffectChange`
(cosmetic skill-effect change, sibling of `CUISkillChangeConfirm`),
`CUIReceiveGift`/`CWvsCommodityEx` (cash-shop-blocked siblings),
`CUIRaisePieceWnd` (sibling of the already-flagged `CUIRaiseManager`),
`CUIDamageBoard` (sibling of the already-flagged `CDamageMeter`),
`CUIHope` (niche seasonal wishing-event dialog, not independently
chased), `KeySequenceElement` (data element behind `CSequencedKeyMan`,
covered by the same finding above), `CDraggableMenu`/`CUniqueModeless`
(generic UI base classes).

**Confirmed moot (native, irrelevant):** `_com_error`, `CIOBufferManipulator`
(native COM/IO plumbing — this client's own net buffer layer already
serves this role, not a portable gap), `CNMCharacter` (NexonModule).

## Eighty-seventh pass (self-directed, IDA_INDEX.md sweep — batch of 16, "do all" mode continued): Zakum boss-timer protocol confirmed decoded; Snowball PvP event and chat-keyword-effect manager are real gaps

**Confirmed already covered (boss-raid timer protocol):** the Party-
Raid-boss HP/timer wiring that `CField_PartyRaid`/`CField_PartyRaidBoss`
sit on top of is present — `PacketArgs.ts:376-378` (`ChaosZakumTimerArgs`/
`ZakumTimerArgs`) and `FieldHandlers.ts:769,771` decode `ChaosZakumTimer`/
`ZakumTimer` (opcodes 360/362), plus a boss-HP-gauge subtype noted at
`PacketArgs.ts:764`. The field-*type* dispatch class itself (spawn
conditions/raid-room logic) was not independently re-verified this
pass, but the core client-visible timer/HP-bar protocol is real and
correct.

**Confirmed real gaps, no `src/` presence:** `CSnowBall` (the Snowball
PvP throwing minigame, Christmas-event-themed). `CKeywordEffectManager`
(the chat-keyword visual-effect trigger — typing certain recognized
words/phrases spawns a screen overlay effect). Neither WZ-verified this
pass.

**Sized up while waterfalling through implementation, not attempted
this pass — real spec found, genuinely cross-cutting:** decompiled
`CKeywordEffectManager::Show`/`GetKeywordEffectProp`/`RegisterKeyword`
and its only caller, `CUser::UpdateKeywordEffects` (0x8ea590). The
keyword *text* itself is NOT StringPool-indirected — it's read as a
literal WZ property key name off each currently-equipped item's own
keyword sub-tree (enumerated via `IWzProperty::Get_NewEnum`, the exact
parent path under `get_equip_data_path(itemId)` not fully traced this
pass), so this is unlike `MonsterBookStr`/`CTips` and could in principle
be ported once that path is confirmed. The mechanic: on equip change,
`UpdateKeywordEffects` rescans all equipped item slots, calls
`CKeywordEffectManager::ClearKeyword` then re-`RegisterKeyword`s every
`{keyword string, itemId, WzProperty}` triple found; on each chat
message, `Show(text, ...)` does a plain substring `Find` of the chat
text against every registered keyword and fires `ShowKeywordEffect` (a
screen overlay at the speaking character's position) for each match.
Real spec for a future pass: (1) confirm the exact WZ path under each
equip item's `.img` that holds the keyword sub-tree; (2) call a
rescan on every avatar-look/equip change (this client already tracks
equip changes via `CharLook`/`AvatarLook`); (3) hook the existing
chat-message render path (`ChatBalloon.ts`) to substring-match the
registered keywords and spawn a screen effect, reusing whatever overlay
system `SkillEffectOverlay.ts` already provides for positioned visual
effects. Not implemented — real cross-cutting feature (equip tracking +
WZ schema confirmation + chat hook + effect overlay reuse), correctly
deferred rather than half-built.

**Confirmed sibling/moot, not independently chased:** `CUICakePieEventItemInfo`
(sibling of the already-flagged `CCakePieEvent`), `CS_COMMODITY_EX`
(Cash Shop commodity data, cash-shop-blocked sibling), `CGuildRankDlg`
(sibling of the already-flagged Guild Alliance/`CWndGuildGrade` gap),
`CUILoginDesc` (login-screen description text — this client's own
`LoginStage` already renders its own login UI, not independently
compared line-for-line), `CVecCtrlNpc` (rides the already-confirmed-
correct `CVecCtrl` physics base), `CSecurityClient` (native packet-
encryption/handshake client — this client's own net layer already
implements its own handshake, not independently re-verified
byte-for-byte against the OG's).

**Confirmed moot (native, irrelevant):** `IWzFont` (native font
rendering interface), `CNMSimpleStream`, `CNMSimpleStreamEncoder`,
`CNMAvatarItemInfo`, `CNMAvatarFullInfo`, `CNMDefaultUserInfo` (all
NexonModule launcher/account plumbing).

## Eighty-sixth pass (self-directed, IDA_INDEX.md sweep — batch of 16, "do all" mode continued): `CUIAntiMacro` (anti-bot captcha) is a real, security-relevant missing feature; right-click context menu and user-block/mute also missing; options/game-menu confirmed already covered

**Confirmed real gaps, no `src/` presence:**
- `CUIAntiMacro`/`CUIAdminAntiMacro` — the periodic anti-macro (captcha-
  style "are you human" challenge) popup. Notable because it's a real
  anti-bot mechanic, not just cosmetic UI — its absence means this
  client has no client-side captcha challenge at all (whether the real
  server would even send one to this client is a separate question, but
  there's currently no handler/UI to respond to it if it did).
- `CUIContextMenu` — the generic right-click context menu (used for
  player/item/NPC quick-actions across many OG dialogs). No
  `*contextmenu*` hits anywhere in `src/`.
- `CUIBlockUser` — the mute/block-user dialog (distinct from the
  already-flagged `CTabBlackList` friend-list blacklist tab — this is
  the direct "block this player's chat" action).
  **Correction (checked while waterfalling through implementation —
  the "CUIVegaResultPopup lesson" applies again):** its only caller is
  `CField::SendChatMsgSlash` (0x5408e0), the OG's giant slash-command
  dispatcher, and `CUIBlockUser`'s own fields (`m_nDuration`,
  `m_nBlockReason` via a reason *dropdown*, `m_sDescription`) are a
  duration + canned-reason + free-text moderation form — this is a
  **GM/admin chat-ban tool** (one of dozens of `@`/`/`-prefixed admin
  commands in that dispatcher), not a regular player's "mute this
  person" action. A normal player account would never reach this UI.
  Correctly out of scope for this client (no GM tooling is being
  ported anywhere else in this codebase either) — not implemented, and
  shouldn't be, rather than "not yet WZ-verified."
- `CUIInitialQuiz` — the new-character tutorial quiz.

**Correction (checked while waterfalling through implementation):**
`CUIChangingCharacterName`'s constructor takes a `CCashShop*`
(decompile-confirmed, 0x780c70) — it's the Cash Shop's
name-change-purchase confirmation screen, same already-established
"no Cash Shop WZ package exists in this client's data" root cause as
every other `CS*`/`CUICS*` finding, not an independent gap.

None of the remaining four (`CUIAntiMacro`/`CUIAdminAntiMacro`,
`CUIContextMenu`, `CUIInitialQuiz`) have been WZ-verified this pass.

**Confirmed already covered:** `CUISysOpt`/`CUIGameOpt` →
`src/ui/game/OptionMenu.ts` + `src/settings/SettingsStore.ts`/
`UserSettings.ts`. `CUIGameMenu` → `src/ui/game/GameMenu.ts`.

**Confirmed sibling/moot, not independently chased:** `CUITransferWorldSelectDlg`
(sibling of the already-flagged `CUITransferWorldLicenseNotice`),
`CUISendGift` (cash-shop-blocked, same root cause as other cash-shop
findings), `CUIOpBoardState` (sibling of the already-flagged
`CUIOperatorBoard`), `CUIStatChangeConfirm` (sibling of the already-
flagged `CUISkillChangeConfirm`), `CUIArtSpeakerSample` (niche cash-
shop art asset), `CVecCtrlDragon` (rides the already-confirmed-correct
`CVecCtrl` physics base), `CCurseProcess` (debuff visual effect, ties to
this client's existing generic status-effect rendering, not
independently re-verified).

## Eighty-fifth pass (self-directed, IDA_INDEX.md sweep — batch of 16, "do all" mode continued): item-option/potential codes decoded raw but never resolved for display; `CEmployeePool`/`CEngageDlg` confirmed covered/sibling

**Confirmed real, partial gap:** `CItemOptionInfo` — `ItemDecoder.ts:80-
82` already decodes the three raw `option1`/`option2`/`option3` short
codes per equip item (item-potential/option line data), but a search of
`src/domain` and `src/net/packet` finds no lookup table or resolver that
turns those raw codes into displayed stat lines — the bytes are stored
but not yet interpretable/showable. Distinct from a full miss: the wire
data survives, only the WZ-driven code→stat-line resolution is absent.
Not chased further to confirm whether `wz_client/Item.nx` even carries
an `ItemOption.img` table for this client's data set (v95-era — KMS
Potential/item-option system predates this build, so the table likely
exists; not verified this pass).

**Confirmed already covered:** `CEmployeePool` — the Free-Market hired-
employee NPC system is implemented (`src/character/EmployeeLook.ts`,
instantiated in `GameStage.ts:1691` via `_employees` map), not a gap.

**Confirmed real, no `src/` presence:** `CEngageDlg` (marriage-proposal
dialog — distinct from the already-flagged Wedding-wishlist gap, this
is the initial propose/accept dialog itself).
**SHIPPED (waterfall implementation pass):** decompiled `CEngageDlg`
itself first and found it's just a tiny "request sent" placeholder
(`PreCreateWnd`/`SetRet`/`Draw`, no buttons) — not worth porting
directly. Traced its real caller, `CWvsContext::SendEngagementRequest`
(0x9e1410), which had **zero `GameSender` representation at all**
(only the accept/decline reply side, `MarriageRequestResponse`,
existed). Confirmed the trigger via xrefs:
`CDraggableItem::OnDoubleClicked` calls it when
`is_engagement_ring_box_item(itemId)` — decompiled that helper too
rather than guessing the item category, confirming `itemId / 10000 === 224`
exactly. Added `GameSender.MarriageRequest(targetName, ringItemId)`
(opcode 161, same as `MarriageRequestResponse` but action byte 0 instead
of 2) and wired it into `GameStage.ts`'s existing `onUseItem` double-click
dispatch (same `window.prompt()` convention as `GuildCreate`). Test:
`tests/net/senders/FullAuditSenders.spec.ts`.
`CUINewCharAvatarSelect`/
`CUINewCharJobSelect` — no dedicated avatar/job-select sub-dialogs found
under any `*charcreate*`/`*newchar*`/`*avatarselect*`/`*jobselect*` name;
`CharSelectStage.ts` exists for character *selection* but character
*creation* (new-character avatar/job picker) was not located this pass —
flagged for a follow-up existence check specifically inside
`CharSelectStage.ts`'s own logic before concluding it's missing outright.

**Confirmed sibling/moot, not independently chased:** `CToolTipHelper`
(generic tooltip widget). `CRegisterSaleEntryDlg`/
`CRegisterWishEntryDlg`/`CRegisterAuctionEntryDlg` (AdminShop/Auction-
House siblings, same root cause as earlier `CITCWnd_*`/AdminShop
findings). `CMonsterBookMan` (sibling of the already-confirmed
`MonsterBookSetCard` decode fix from Phase 5). `CMorphTemplate`/
`CPetTemplate` (template-data siblings of already-covered
morph/pet systems). `CUIRadio` (generic radio-button widget).

**Confirmed moot (native NexonModule, irrelevant):** `CNMSerializable`,
`CNMRealUserInfo`, `CNMFunc`.

## Eighty-fourth pass (self-directed, IDA_INDEX.md sweep — batch of 16, "do all" mode continued): four real, whole-feature gaps (Speed Quiz, Cake/Pie throwing event, coupon redemption, Class Competition); `CUIShortCutMenu` confirmed already covered

**Confirmed real gaps, no `src/` presence at all, WZ not yet verified:**
- `CUISpeedQuiz` — the Speed Quiz minigame event UI.
- `CCakePieEvent` — the Cake/Pie throwing seasonal event.
- `CCouponUseSelectDlg` — the coupon-code redemption dialog.
- `CClassCompetition` — the inter-job Class Competition PvE event.
- `CDamageMeter` — a damage-meter overlay (note: distinct from core
  combat correctness — this is a UI display feature, not a hit-
  calculation gap; the underlying damage numbers are server-authoritative
  per the established architecture pattern, only the meter UI itself is
  missing).

None of these five have any `find src -iname` hits. Per the verify-WZ
rule, none have been deep-searched in `wz_client/*.nx` yet this batch —
flagged as found-but-WZ-unconfirmed, not yet scoped as buildable work.

**WZ-verified while waterfalling through implementation:** opened
`UI.nx`/`Etc.nx` directly (this client's own `WzPackage` reader, walked
4 directory levels deep) and searched for any name matching
speed/quiz/cake/pie/coupon/class/competition — **zero hits** in either
package (the only superficially-similar match, `Etc/OXQuiz.img`, is
the new-player tutorial true/false quiz, not Speed Quiz; `Etc/DamageByEquipUpgrade.img`
is upgrade-scroll damage-bonus data, not a damage meter). Consistent
with this being a later-added-content gap rather than a porting gap:
**this v95-era client's data set doesn't carry the WZ assets for Speed
Quiz, Cake/Pie, coupon redemption, or Class Competition at all**, so
none of the four are buildable regardless of effort — correctly
re-categorized from "not yet WZ-verified" to "WZ-absent, not portable."
`CDamageMeter` is different: it needs no dedicated WZ asset (a meter
overlay can be built from plain numbers/graphics like other panels in
this codebase), and the data it would aggregate already flows through
`src/character/DamageNumber.ts`'s `Add()` calls (`GameStage.ts:2029,2576`)
for the local player's own hits — but those are this client's own
*client-side damage estimate* (`MeleeDamage.Estimate`), and a real
party damage meter needs every party member's hits, which would
require confirming whether the mob-hit broadcast packet even carries
attacker identity for other players (not checked this pass). Sized up,
not implemented: real spec for a future pass is to trace that broadcast
packet's decode before building the aggregation UI, rather than assume
single-player scope solves the actual feature.

**Confirmed already covered:** `CUIShortCutMenu` → `src/ui/game/
QuickSlotBar.ts` + `QuickSlotConfig.ts` already implement the quick-
slot/shortcut bar and its configuration, wired into `GameStage.ts`,
`KeyConfig.ts`, and `StatusBar.ts`.

**Confirmed sibling/moot, not independently chased:** `CUIAvatarMegaphone`
(sibling of the already-confirmed avatar-megaphone feature),
`CUIGachaponRemote`/`CUIShopScannerHotList` (cash-shop-blocked siblings,
same root cause as other `CUICash*`/AdminShop findings), `CCSWnd_Best`/
`CCSWnd_Status` (Cash Shop sub-windows, cash-shop-blocked same as
`CCSWnd_Char` from an earlier pass), `CVecCtrlUserPreview` (rides the
already-confirmed-correct `CVecCtrl` physics base), `CTabList` (generic
tab-list widget, not independently chased), `CSkill_HitAni` (skill hit-
animation, ties to this client's existing generic animation/combat-fx
pipeline, not independently re-verified formula-for-formula).

**Confirmed moot (native, irrelevant to this browser client):**
`CHsMonitor` (HackShield/anti-cheat monitor), `CBase64` (generic
encoding utility, this client uses its own/native base64 handling).

## Eighty-third pass (self-directed, IDA_INDEX.md sweep — batch of 16, "do all" mode continued): `CField_Dojang` (Mu Lung Dojo) is a real, whole missing field type, WZ presence not yet verified; `CMemoListDlg` confirmed already covered

**Confirmed real, not yet WZ-verified:** `CField_Dojang` — the Mu Lung
Dojo solo-trial-tower field type — has zero `src/` presence (`find src
-iname "*dojo*"` returns nothing) and no dedicated field-type handling
anywhere in this client's field dispatch. Per the verify-WZ rule, this
is flagged but **not yet confirmed** whether `wz_client/Map.nx` retains
the Dojang map data for this client's data set — needs a follow-up
deep-search of `Map.nx` node names before scoping real implementation
work. `CField_KillCount` (kill-count-gated field type, e.g. timed-
clear maps) is a sibling of this same field-type-dispatch gap, also not
independently WZ-verified.

**WZ-verified while waterfalling through implementation:** decompiled
`CField_Dojang::GetFieldType`/`CField_KillCount::GetFieldType` to get
their exact numeric `fieldType` values (14 and 34) rather than guessing,
then scanned the real `Map.nx` data for both — **confirmed present**:
486 maps with `fieldType===14` (the `925020xxx` map-ID range, matching
real MapleStory's known Dojo map IDs) and 10 maps with `fieldType===34`.

For `CField_Dojang`: decompiled `OnClock`/`UpdateTimer` and found its
timer mechanic decodes the exact same subType-2 shape the generic
`Clock`/`CField::OnClock` system already correctly implements (Hundred-
and-ninth pass) — so the *timer* half isn't an independent gap, just a
Dojo-specific rendering skin (per-digit canvas + a screen-effect/sound
at zero) on top of an already-covered mechanic. The real remaining gap
is the floor-progression/special-arts-restriction/monster-wave
mechanics (`CanUseSpecialArts`, floor tracking) — a genuinely large,
separate minigame system, sized up but not implemented this pass
(same scope category as Auction House/Raise, not attempted alongside
smaller fixes).

**SHIPPED (waterfall implementation pass):** `CField_KillCount` was
much smaller in scope — `OnKillCountInfo` is a single `int4` decode
(opcode 178, confirmed free in `OutHeader`) and `_UpdateCountInfo`'s
display is the same per-digit-canvas-with-deleted-StringPool-asset
pattern already established for `Clock.ts`. Added `KillCountInfo` to
`OpCodes.ts`, `KillCountInfoArgs` to `PacketArgs.ts`,
`FieldHandlers.handleKillCountInfo`, and a new `src/ui/game/KillCountHud.ts`
(plain-text fallback, same convention as `Clock.ts`), wired into
`GameStage.ts` and hidden on every field change. Test:
`tests/net/handlers/FieldHandlers.spec.ts`'s `KillCountInfo` describe block.

**Confirmed already covered:** `CMemoListDlg` — `src/ui/game/Memo.ts`
already implements both the list view (`_drawList`, line 155) and the
detail/compose view (the latter previously flagged in an earlier pass
as missing a real text-input mechanism); the list-dialog half of this
OG class is not a gap.

**Confirmed sibling/moot, not independently chased:** `GUILDDATA` (data
struct — guild-emblem-creation gap already flagged in the Seventy-ninth
pass; `grep`ping for `emblem`/`GuildMark` across `src/domain` and
`src/ui` confirms zero hits, consistent with that earlier finding).
`CITCWnd_SubTab`/`CITCBidAuctionDlg` (Auction House siblings, same root
cause as other `CITCWnd_*` findings). `CUINewYearCardDlg`/
`CNewYearCardReceiverSearchResult` (seasonal cash-shop New Year card
minigame, likely cash-shop-blocked same as other seasonal-event
findings, not independently chased). `CReactorTemplate` (data layer
behind the already-confirmed-correct Reactor pool decode from the
Forty-seventh pass).

**Confirmed moot (native NexonModule/launcher/COM, irrelevant to this
browser client):** `CLayoutMan`, `CNMCOClientObject`,
`CNMSerializableDecoder`, `CNMSetLocaleFunc`, `CNMGetNexonPassportFunc`,
`CNMLogoutAuthFunc`, `CNMInitializeFunc`.

## Eighty-second pass (self-directed, IDA_INDEX.md sweep — batch of 16, "do all" mode continued): `CUIDragonEquip`/`CUIMechanicEquip` confirmed decoded-data-with-zero-UI; several confirmed already-built or sibling

**Confirmed real gap, data-layer already there:** `dragonEquipped`/
`mechanicEquipped` slot arrays exist on `CharacterData`
(`src/domain/CharacterData.ts:49-50`) and are decoded by
`CharacterDataDecoder.ts:129-130` (`decodeIndexedItemsShort`), but
`grep`ping the whole `src/` tree for either field name outside those two
files returns nothing — no UI (`CUIDragonEquip`/`CUIMechanicEquip`)
manages or even displays them. Same "decoded, never wired" shape as
`LogoutGift` (Eightieth pass) and several earlier findings — the data
pipeline got ported generically (equip-slot decode is shared/generic)
but the dedicated management dialogs were never built.

**Confirmed already built:** `CUIMapleTV` → `src/net/handlers/
MapleTVHandlers.ts` exists. `CUIRevive` → `src/ui/game/Revive.ts`
exists.

**Confirmed real, small, separately-missing:** `CUIEventAlarm`,
`CUISummonedList`, `CUIUserInfoDetail`, `CTabBlackList` (no sibling
black-list tab in `UserList.ts`'s Friend/Party/Guild tab set, despite
those three being fully wired — confirmed via direct grep, zero
`blacklist`/`BlackList` hits anywhere), `CUIChannelShift` (channel-
change UI) — none have any `src/` presence; WZ presence not checked
this batch.

**Corrected while waterfalling through implementation:**
- `CUISummonedList`'s constructor takes a `CUIMonsterCarnival*`
  (decompile-confirmed, 0x80b0d0) — it's the Monster Carnival minigame's
  summoned-mob sub-list, a sibling of the already-flagged-missing
  Monster Carnival UI (only the protocol desync was fixed, Eighty-ninth
  pass — the actual UI was never built), not an independent finding.
- `CUIChannelShift` is **already covered**: `ChannelSelect.ts` is
  instantiated and fully wired in `GameStage.ts` (not just at
  world-select — confirmed it's a live in-game panel, `_channelSelect`,
  toggled via `GameMenu`/`StatusBar`), and `GameSender.TransferChannel`
  already sends the channel-switch request. Not a gap.

`CUIEventAlarm`/`CUIUserInfoDetail` remain open (not WZ-verified, not
independently re-chased this pass either) — `CUIUserInfoDetail` may
overlap with the already-flagged `CUICharDetailVAC`/`CUICharDetail`
"view character details" finding from the Ninety-second pass; worth
checking for duplication before implementing either.

**SHIPPED (waterfall implementation pass):** decompiled `CTabBlackList::OnAdd`/
`OnDelete`/`LoadData` and found the whole feature is **purely local
config** (`CConfig::AddBlackList`/`DeleteBlackList`/`LoadBlackList`) —
no server round trip at all, unlike every other friend/guild/party
feature in `UserList.ts`. Then traced `CConfig::IsInBlackList`'s xrefs
to find every consumer: `CField::OnWhisper`, `CField::OnGroupMessage`,
`ExpeditionIntermediary::OnPacketExpNoti_Invite`,
`CMiniRoomBaseDlg::OnInviteStatic`, `CUIMessenger::OnInvite`,
`CWvsContext::OnFamilyJoinRequest`/`OnGuildResult`/`OnPartyResult` — an
"ignore this person everywhere" filter, not whisper-only. Added a 4th
"Block" tab to `UserList.ts` (`SetBlackList`/`getBlockName`/`onBlockAdd`/
`onBlockDelete`), a local-only `blackList: string[]` field in
`UserSettings.ts`/`SettingsStore.ts` (persisted via `localStorage`, same
as volume settings — no new packet needed), and wired the filter into
`fh.onWhisper` in `GameStage.ts` (the single most directly user-visible
case). **Not wired this pass** (same `IsInBlackList` pattern, explicitly
not silently limited without disclosure): `onGroupMessage`, and the
Expedition/MiniRoom/Messenger invite and Family/Guild/Party
join-request handlers — each would need the same one-line `if
(this._blackList.has(name)) return;` guard added individually. Tests:
`tests/ui/game/UserList.spec.ts`'s `block tab` describe block.

**Confirmed sibling/moot, not independently chased:** `CUIRanking`
(ties to already-flagged `CBattleRecordMan`/ranking gap),
`CUIShopScannerSearchResult` (AdminShop-wishlist sibling),
`CUISkillChangeConfirm` (SP-reset confirm dialog, sibling of the
already-flagged `CUISkill` SP-gating finding), `CUIUnreleaseDlg`
(niche confirm dialog), `CVecCtrlPet`/`CVecCtrlSummoned` (ride on the
already-confirmed-correct `CVecCtrl` physics base from the Thirty-first–
Thirty-third passes), `CUIJoyPad` (native gamepad input, moot for this
browser client).

## Eighty-first pass (self-directed, IDA_INDEX.md sweep — batch of 16, "do all" mode continued): the floating shop/trade-room marker system (`CMessageBoxPool`) is a real, whole missing feature — ties together several `ShowMessageBox` references seen scattered earlier this session

**Confirmed real gap.** `CMessageBoxPool` is the field-object pool for
the small floating marker shown above a player who has an open personal
shop, entrusted shop, or trade room — visible to nearby players *before*
they interact, via `OnMessageBoxEnterField`/`OnMessageBoxLeaveField`/
`FindMessageBox`. This ties together several `ShowMessageBox(long,long)`
references already seen scattered across `CPersonalShopDlg`/
`CEntrustedShopDlg`/`CUserPreview` method lists in earlier passes without
being chased to their root — this class is that root. `find src -iname
"*messagebox*"` and a grep for `MessageBox` across the handlers both
return nothing. Real, visible gap: in this client, there's currently no
way to see that a nearby player has a shop/trade open until directly
interacting with them.

**SHIPPED (waterfall implementation pass):** `OpCodes.ts` had already
named opcodes 325-327 as "unconfirmed" (a prior pass concluded the
per-opcode shapes weren't mechanically recoverable since
`CMessageBoxPool::OnPacket` has no jump-table). Re-decompiled it
directly this pass and found its 3-case `switch` actually decompiles
fine — the earlier blocker was specifically about automatic switch-table
*detection*, not about whether the function bodies themselves were
readable. Confirmed shapes: opcode 325 (`MessageBoxCreateFailed`) is an
empty-body canned `Notice`; 326 (`MessageBoxEnterField`) is
`int4 id, int4 itemId, string hope, string characterName, int2 x, int2 y`;
327 (`MessageBoxLeaveField`) is `byte immediate, int4 id`. Added the full
decode (`FieldHandlers.ts`), and a new `src/character/ShopMarker.ts`
overlay rendering the shop's representative item icon + "hope" text
above the host player — tracked live by character-name lookup against
`_otherChars` each frame (OG links the marker to the host's WZ position
so it follows them; this client doesn't have that linking, so
name-lookup is the closest equivalent, falling back to the packet's
static x/y if the name isn't currently visible). Tests:
`tests/net/handlers/FieldHandlers.spec.ts`'s `MessageBoxPool` describe
block, `tests/character/ShopMarker.spec.ts`.

**Everything else this batch is a sibling/sub-class of an already-
flagged finding:** `CMiniGameCreateDlg`/`CMemoryGameCreateDlg` (room-
creation dialogs for the already-flagged missing Memory Match/Omok
minigames), `CTabReceive`/`CTabQuickSend`/`CTabSend` (sub-tabs of the
already-flagged missing Parcel/`Delivery` feature), `EXPEDITION`/
`PARTYADVER` (data structures behind the already-flagged Expedition/
Party-Advertisement gaps), `CUIAdminShopWishListSearchResult` (sibling
of the already-flagged AdminShop wishlist), `CSelectLoadWishSaleListDlg`
(Wedding-wishlist sibling), `CITCWnd_Tab` (Auction House sub-window,
same root cause as other `CITCWnd_*` findings), `CUIRandomMorphDlg`
(cash-item morph, likely cash-shop-blocked), `CLicenseDlg` (ties to
`CLogin::OnAcceptLicense`, already named in the `CLogin` pass).

**Confirmed moot or low-priority, not chased further:** `CNMLoginAuthFunc`
(native login-auth crypto helper — this client's own auth flow already
works via its own implementation, not independently compared formula-
for-formula). `CStageSystem` (the native stage/state-machine dispatcher
— this client's own `Stage`-switching architecture already serves the
same role, not a gap to port literally). `CQuest` (the per-instance
quest-state class — `LoadReward` ties to the already-built
`QuestReward.ts`; `StartQuest`/`OnQuestRefuse` are simple state
transitions already implicit in this client's existing quest-accept
flow, not independently re-verified).

## Eightieth pass (self-directed, IDA_INDEX.md sweep — batch of 16, "do all" mode continued): mostly siblings of already-flagged gaps; `LogoutGift` confirmed decoded-but-unwired

**Confirmed real, small, new gap:** `LogoutGift` is already correctly
decoded (cited: `CWvsContext::OnLogoutGift`, reads zero bytes, just a
trigger) but `grep`ping `GameStage.ts` for `onLogoutGift` returns
nothing — decoded, never wired to a UI, same "dead letter" shape as
several earlier findings this session. `CNoticeQuestProgress` (a quest-
progress notice popup) confirmed missing — zero hits in `src/`.

**Sized up while waterfalling through implementation, not attempted
this pass:** traced `CNoticeQuestProgress::OnQuestProgressUpdated_Mob`'s
real trigger: `CWvsContext::OnQuestProgressUpdated` (called from
`CWvsContext::OnQuestRecordMessage`, the network handler this client
**already fully decodes** as `onQuestRecord`/`MessageType.QuestRecord` —
`questId`/`state`/`value` string, `FieldHandlers.ts`). So the raw data
this toast needs is already flowing through this client; the missing
piece is purely the diff-and-notify UI. But `OnQuestProgressUpdated_Mob`
parses the progress `value` string as a *positional* list matched
against `CQuestMan::GetCompleteDemand(questId)`'s WZ-authored
`aDemandMob[]` order — i.e. the delimiter/position convention is
quest-WZ-defined, not a generic format, and decoding it correctly needs
`QuestDemand`'s mob-list data, which an earlier pass already
established as server-side validation logic this client doesn't parse
(`GetCompleteDemand`, cited in the existing `QuestDemand` finding). Real
spec for a future pass: (1) decode `CQuestMan::GetCompleteDemand`'s WZ
`aDemandMob` list (mob ID + demand count per quest); (2) on each
`onQuestRecord` update, split the previous and new `value` strings by
that quest's `aDemandMob` count and diff position-by-position; (3) show
a toast (reusing `StatusMessenger.ts`) for each mob whose count
increased. Not implemented — the string format isn't guessable without
step 1, so this is left as a real, narrow, decompile-grounded TODO
rather than guessed at.

**Correction (checked while waterfalling through implementation):**
`OpCodes.ts`'s own comment already noted opcode 432 forwards into
`TSingleton<CUILogoutGift>::OnPacket` via an unresolved vtable jump —
decompiled `CUILogoutGift` directly this pass and found
`ShowItemToolTip(ZRef<CS_COMMODITY>, ...)`: it's the **Cash Shop**
logout-gift-offer popup (`CS_COMMODITY` = Cash Shop commodity item),
same already-established "no Cash Shop WZ package exists in this
client's data" root cause as every other `CS*`/`CUICS*` finding — not
an independently wirable gap. Correctly left unimplemented (there's
nothing meaningful to show even if `onLogoutGift` were wired up).

**Everything else this batch is a sibling/sub-class of an already-
flagged finding, not independently new:** `EXPEDITION_ADVER` (the
advertisement/LFG sub-feature of the already-flagged Expedition system),
`CUIRaiseManager` (ties to the already-flagged `CUIRaiseWndBase` "Raise"
minigame), `CWndGuildGrade`/`CWndAllianceGrade` (rank-management UI for
the already-flagged Guild Alliance gap), `CRegisterWishEntrySearchDlg`/
`CUIFindFriendDetail` (siblings of the already-flagged Wedding-wishlist
and `CUIFindFriend` gaps respectively), `CUICashItemGachapon` (cash-shop-
blocked, same root cause as `CUICashGachapon`). `CAvatarMegaphone` ties
to the already-built avatar/art megaphone features. `CUICharSelect` ties
to the already-built `CharSelectStage.ts`. `CUIChangingLicenseNotice`/
`CUITransferWorldLicenseNotice`/`CUIOperatorBoard` are niche
account-license/GM-board notices, not independently chased.

**Confirmed moot:** `ATL` (the native Windows ATL template library
namespace, not a real game class) and `CCtrlComboBoxSelect` (generic
native widget).

## Seventy-ninth pass (self-directed, IDA_INDEX.md sweep — batch of 16, "do all" mode continued): two more whole-PvP-minigame gaps (Ariant Arena, Battlefield), guild emblem creation missing, plus name-confirmation for an already-built feature

**Confirmed real gaps, same shape as `CField_Massacre`:** `CField_
AriantArena` (a PvP coliseum/ranking minigame — `OnUserScore`/
`UpdateScoreAndRank`/`GetRank`) has its opcode *number* defined
(`AriantArenaResult = 354` in `OpCodes.ts`) but zero decode, handler, or
UI anywhere — confirmed via grep. `CField_Battlefield` (a team-based PvP
field with its own scoring/clock/team-change packets) has **no opcode
mapping at all**, not even a number — a step further behind Ariant
Arena.

**Confirmed real gap:** `CSetGuildMarkDlg` (guild emblem/mark creation —
ties to the `Guild_Make`/`Guild_MakeMark` WZ keys already incidentally
found present in the Sixty-second pass) — zero hits for `GuildMark` or
`SetGuildMark` anywhere in `src/`.

**SHIPPED (waterfall implementation pass):** decompiled the full round
trip rather than guessing. The dialog opens from `CWvsContext::OnGuildResult`
case 17 (guild-master-only, `CWvsContext::AmIGuildMaster`-gated) — added
`GuildResultType.SetMarkPrompt = 17` (this enum's own header comment
already flagged it as incomplete/"partially-fixed debt", so this fills
one more real gap in it) and `FieldHandlers.onGuildSetMarkPrompt`. On
confirm, OG calls `CField::SendSetGuildMarkMsg` — decompiled it
directly for the exact shape (opcode 149/`GuildRequest`, action byte 15,
`short markBg, byte markBgColor, short mark, byte markColor`) and added
`GuildRequestAction.SetMark`/`GameSender.GuildSetMark`. **Scoped down
honestly:** OG's `CSetGuildMarkDlg` is a full WZ-rendered bg/mark/color
preset picker; this client uses four `window.prompt()` numeric inputs
instead (same scope-reduction convention as `GuildCreate`'s name
prompt) rather than building the preset-picker UI. Tests:
`tests/net/handlers/Guild.spec.ts`.

**Confirmed already built, name corroboration only:** `CUIKarmaDlg` is
the real OG name behind the already-built `KarmaScissors.ts` (matching
its `PutItem`/`_SendConsumeCashItemUseRequest` pattern exactly) — no new
finding, just confirms the mapping.

**Confirmed moot:** `CUIWebEvent` (an embedded ActiveX web-event page,
same ActiveX-hosting pattern as `CWebWnd`/`ADAD` — irrelevant to a
browser-hosted client). `CCtrlEditEx` (generic native widget).

**Confirmed already covered, not re-verified:** `CItemMakerInfo`
(already cited in `Maker.ts`'s own header comment), `CActionFrame`
(deeply investigated in one of this session's very first directives,
long before the `IDA_INDEX.md` workflow existed), `CUITitle`/`CUIFamily`/
`CUIItemProtector` (tie to already-built `TitleWindow.ts`/
`FamilyWindow.ts`/`ItemProtector.ts`, not re-verified this pass).
`CUIAdminShopWishListCategory`/`CUIShopScannerCategory`/
`CUIShopScanResult` (sibling sub-classes of already-flagged missing
features — AdminShop wishlist, shop scanner). `CCSWnd_Tab` (cash-shop-
blocked, same root cause as other `CCSWnd_*` findings). `CAESCipher`
(native AES crypto — this client's own `WzCrypto.ts` already implements
WZ decryption successfully via `aes-js`, confirmed working by the simple
fact that WZ data loads at all elsewhere in this session's investigation
— not a gap).

## Seventy-eighth pass (self-directed, IDA_INDEX.md sweep — batch of 16, "do all" mode continued): `CField_Massacre` minigame missing; `CFuncKeyMappedMan` reveals the pet-auto-consume opcodes already flagged dead belong to the keybind system

**Confirmed real gap:** `CField_Massacre` (a real minigame field type —
gauge-building combo event with its own clock/key-animation system,
`OnMassacreIncGauge`/`OnClock`/`UpdateKeyAnimation`) — `find src -iname
"*massacre*"` and a `Massacre` grep across the handlers both return
nothing. No field-type dispatch, no protocol, nothing.

**SHIPPED (waterfall implementation pass, applying the "don't skip
large or small" rule):** this looked like a whole-minigame-scale gap at
a glance (clock + key-animation + gauge system), but decompiling the
actual network surface showed it's tiny — `CField_Massacre::OnPacket`
(0x556460) only intercepts one opcode (`OnMassacreIncGauge`, a single
`int4`), and the sibling `CField_MassacreResult::OnPacket` (0x55a1d0,
fieldType 24) only intercepts one more (`OnMassacreResult`, `byte won
+ int4 finalGauge`, the rest of that function being pure StringPool-driven
results-screen rendering). WZ-confirmed present: 351 maps with
`info/fieldType===23` (e.g. `926023401.img`). Added opcodes 173/174
(`MassacreIncGauge`/`MassacreResult`), their `PacketArgs`/`FieldHandlers`
decode, and a new `src/ui/game/MassacreGaugeHud.ts` (plain-text fallback,
same convention as `Clock.ts`/`KillCountHud.ts`) showing the live gauge
value plus a win/lose toast via `StatusMessenger`. The clock-driven
key-animation QTE prompt itself (`UpdateKeyAnimation`) is purely visual
flavor on top of this and wasn't built — the actual win/lose mechanic
(does this client's player input drive the real gauge increments, or
is it fully server-computed?) is server-authoritative either way per
the established pattern, so the gauge display + result toast is the
complete client-relevant surface. Tests:
`tests/net/handlers/FieldHandlers.spec.ts`'s `Massacre` describe block.

**Useful additional spec for an already-logged finding:**
`CFuncKeyMappedMan::OnPetConsumeItemInit`/`OnPetConsumeMPItemInit`
confirm the `PetConsumeItemInit`/`PetConsumeMPItemInit` opcodes already
flagged as dead letters in this session's Pet-system finding are
specifically part of the **keybind-mapping system** (auto-consume HP/MP
potion binding to a function key), not generic pet data — useful detail
for whoever eventually wires up the Pet system, since this ties it to
`KeyConfig.ts`'s existing func-key infrastructure rather than a
from-scratch mechanism.

**Correction (cross-referenced while waterfalling through
implementation):** `CItemSpeakerDlg` is **not independently new** —
it's the exact same class already fully decompiled and sized up under
the Ninety-second pass's `CSpeakerWorldDlg`/`CSpeakerWorldDlgEx`
megaphone-compose finding (`_SendConsumeCashItemUseRequest`, opcode 85,
blocked on this client having no inventory-item drag-and-drop). Not a
duplicate gap; this batch's mention just confirms the same class from a
second angle.

**Confirmed missing, niche/cash-item-adjacent, not WZ-checked:**
`CUIUserInfoWishList` (a
general character-info gift wishlist, distinct from the Wedding-specific
one already flagged), `CUIGetUserInfo` (a legacy one-time gender-
selection migration dialog for old accounts — very low priority).

**Confirmed already covered / sibling of already-flagged, not
individually re-verified:** `CUIQuestTimerAction` (sibling of the
already-flagged `CUIQuestTimer`), `CWishListInputDlg` (sibling of the
already-flagged Wedding wishlist), `CConfirmPurchaseDlg`/
`CUIIncubator`/`CUICashGachapon` (cash-shop-blocked, same root cause as
earlier `CCSWnd_*` findings), `CUIPetEquip` (ties to the already-flagged
whole-Pet-system gap), `CUIItemSearchResult` (sibling of the already-
flagged `CUIItemSearch`), `CUIMonsterBook` (ties to the already-built
`MonsterBook.ts`, not re-verified), `CUILoginStart` (ties to
`LoginStage.ts`). `CNMSimpleStreamDecoder` (native video/audio streaming
decoder, pure engine plumbing) and `Util` (a generic native-code
namespace, not a real class) confirmed moot.

## Seventy-seventh pass (self-directed, IDA_INDEX.md sweep — batch of 9, "do all" mode continued): resolves the long-open "boss timers, not yet chased" thread from way earlier this session — confirmed a real, generic field-countdown overlay is missing; chat item-links also confirmed unhandled

**Resolves an old open thread: `CClock` confirmed missing.** Much
earlier this session (the Twenty-sixth pass), boss/field timers were
flagged as "not chased" without ever being properly resolved (the later
Forty-sixth/Fifty-fourth-ish passes only covered the *chat-line* boss
timer notices — `ZakumTimer`/`HontailTimer`/etc — a different, narrower
thing). `CClock` is the real generic on-screen countdown-timer overlay
class, hooked into multiple field types via `OnMakeTimerParam`
(`CField`, `CField_HuntingAdballoon`, `CField_PartyRaid`,
`CField_PartyRaidBoss`) — i.e. a shared timer widget reused across
several boss/event field types, separate from the chat-line notices.
`find src -iname "*clock*"` returns nothing. This properly closes the
old "not yet chased" flag: the generic field-countdown UI is a real,
confirmed, whole missing feature, distinct from the already-covered
chat notices.

**Confirmed real, partial gap — chat item/map links aren't handled.**
`CTextAnalyzer::GetPhrase_Sharp`/`CheckSecretItemID` are OG's chat-tag
parser (the classic blue clickable item-name links that appear when a
player shares an item in chat, plus map/quest link variants). Checked
`GameStage.ts`/`ChatBar.ts` — the *only* `#`-tag handling anywhere is a
narrow, ad-hoc `/#q(\d+)#/` regex built specifically for the quest
slide-menu reward flow (Sixty-second-pass-adjacent). General chat
item-links (and any other tag types `CTextAnalyzer` parses) aren't
handled — chat messages containing them would just show the raw
`#i123456#`-style tag text instead of a clickable item preview.

**SHIPPED (partial, waterfall implementation pass), TODO for the
rest (per "write down what's not implemented" rule):** decompiled
`CTextAnalyzer::GetPhraseType` to get the real tag-letter→type table
rather than guessing: `#L`=1(level?), `#E`=2, `#I`=3, `#S`=4, `#K`=5,
`#w`=6, `#i`/`#v`=**7 (item)**, `#e`=9, `#F`/`#f`=11, `#B`=13, `#j`=14,
`#Q`=15(quest, already partially handled by the existing ad-hoc
regex), `#D`=16, `#W`=17 — 14 distinct tag types total, only one of
which (`#i`/`#v`, item) was scoped and shipped this pass.
`GetParameterNo` confirms the numeric payload is `atoi(phrase+2)` (skip
the `#` and the type letter). Added `GameStage._resolveChatItemLinks()`
— substitutes `#i<id>#`/`#v<id>#` with `[ItemName]` via the already-existing
`nameService.ItemName()` — applied to `onUserChat`/`onGroupMessage`/`onWhisper`.
**Scoped down honestly, not a real link:** this is a text substitution,
not a clickable/tooltip link — `ChatBar.ts`'s lines are plain `Text`,
not multi-span rich text, so making it genuinely clickable would need a
`ChatBar` rendering rework. **TODO, not implemented:** the other 13 tag
types (map links `#D`/`#W`, fame `#F`/`#f`, level `#L`, exp `#e`, and
8 more whose semantic meaning beyond the type number wasn't traced this
pass) are real, decompile-confirmed, and still unhandled — a future
pass should trace each type number to its actual OG consumer
(`CTextAnalyzer::SeparateLineText`'s rendering branch per type) before
guessing what each one displays.

**Confirmed missing, niche/lower priority, not WZ-checked:**
`CRadioManager` (an in-game radio/song-request feature — `find src
-iname "*radio*"` returns nothing), `CUIDragonBox` (Evan-specific dragon
orb management, ties to the already-flagged `CDragon` content gap),
`CUIUserInfoExceptionList` (a privacy/visibility exception list).

**Confirmed already covered, corroboration only:** `CUIRecommendWorld`'s
underlying decode (`OnRecommendWorldMessage`) was already cited from a
much earlier `CLogin` pass — this is just its UI shell, no new finding.
`CUIFriendGroup` corroborates the already-flagged-deferred
friend-group-sub-lists gap (`FieldHandlers.ts`'s `onFriendList` doc
comment) with a real class name, not a new finding. `CUINewCharRaceSelect`
ties to the already-built `RaceSelectStage.ts` (337 lines), not
independently re-verified this pass. `CUIAvatar` (the `CLogin`
character-select avatar carousel, distinct from the gameplay `CAvatar`
class covered in the Thirtieth pass) ties to the same already-cited
VAC/SPW protocol area as `CUIAvatarVAC`, not independently re-checked.

**Also checked off this batch, confirmed moot or duplicate, not
individually written up:** `CCtrlTab`/`CFadeWnd` (generic native
tab-widget and fade-transition base classes). `CITCWnd_SALE`/
`CITCWnd_PURCHASE`/`CITCWndItemDlg` (more Auction House sub-windows,
same already-established root cause as `CITCWnd_List`/`_Inventory`/
`_Char`). `TabPartySearch` (a likely sibling/duplicate of the already-
covered `CUIPartySearch`). `CSoftKeyboardDlg` (ties to the already-
covered `CUISoftKeyboard`/`SoftKeyOverlay.ts`).

## Seventy-sixth pass (self-directed, IDA_INDEX.md sweep — batch of 13, "do all" mode continued): chair-sitting has zero implementation; AP-allocation already correctly flagged as a sibling-class simplification

**Confirmed real gap — sitting (chairs) doesn't exist anywhere in this
client.** `CVecCtrlUser::OnSit` (0x9a0860) is the real per-player
chair-sit physics hook. Grepped `PlayerController.ts`/`GameStage.ts` for
`sit`/`chair` — zero hits. This corroborates a detail noticed only in
passing during the Forty-eighth pass (inventory-ops investigation):
`CWvsContext::OnInventoryOperation`'s delete-item case has a real
side effect where deleting a sitting character's bound portable-chair
item (`m_nPortableChairID`) triggers an automatic stand-up request — a
detail that only makes sense because sitting is a real, full mechanic
in OG. Confirms sitting/chairs (cash-shop portable chairs and NPC
benches alike) is a genuinely whole missing feature, not a niche
side-detail.

**SHIPPED (waterfall implementation pass, "don't skip large or small"
rule applied again):** `CVecCtrlUser::OnSit` turned out to be a red
herring (just a bare position-move call, no real logic) — traced the
*actual* trigger instead: `CUserLocal::HandleXKeyDown` (0x90f6d0),
already reachable through this codebase's existing `KeyAction.Sit = 51`
keybind (defined but never wired to behavior). Its exact decompiled
logic: if already sitting, send `UserSitRequest(-1)` (stand up,
matching `GameSender.ts`'s pre-existing — but **previously dead** —
sender, confirmed via kinoko-main cross-reference) and clear the local
sit flag; else check `CField::FindSeatByPosition` (a flat WZ `seat`
node, WZ-confirmed present and literal via direct `Map.nx` inspection —
`[-10,+10]`/`[-30,+30]` rect hit-test against each seat point) for an
NPC bench within range; else scan the Install inventory tab (category
3) for a portable-chair item (`is_portable_chair_item`,
`itemId/10000===301`) and send the also-pre-existing-but-dead
`PortableChairSitRequest`. Added: `FieldScene._loadSeats`/
`FindSeatByPosition`/`GetSeatPosition` (new WZ `seat` node parsing,
mirroring `_loadLadderRope`'s pattern); `ItemInventory.FindPortableChair`;
`PlayerController.Sit`/`StandUp`/`IsSitting` (movement input is ignored
while sitting — `Stance.Sit` already existed in `Stance.ts` and was
already mapped to the `sit` WZ animation key, just never triggered);
`GameStage._trySit()` wired to `KeyAction.Sit`. **Scoped down,
documented rather than guessed:** the OG precondition checks
(stun/attract/riding-vehicle/morphed/mid-skill-cast gating) aren't
re-verified — this client doesn't track several of those states at all
yet, so only the core sit/stand/seat-or-chair toggle is ported; couple-chair
multiplayer sync (`CUserPool::COUPLECHAIRENTRY`,
`CUser::SetCoupleChairEffect`) and the portable-chair stat-bonus system
(`CItemInfo::GetPortableChairRecoveryRate`/`IsTherePortableChairStatUp`)
are real, separate, decompile-named systems layered on top of this and
were **not implemented — left as an explicit follow-up TODO**, not
folded silently into "done." Tests: `tests/character/PlayerController.spec.ts`'s
`Sit/StandUp` block, `tests/map/FieldScene.seats.spec.ts`,
`tests/ui/game/ItemInventory.sit.spec.ts`.

**Confirmed already appropriately flagged, no new finding:**
`CUIStatChange`/`CUIStatChangeConfirm` (the AP stat-reallocation dialog)
— `StatsInfo.ts`'s own header comment already names these as the real
sibling classes behind a deliberately simplified AP-spending
interaction; not re-litigated here.

**Confirmed missing, lower priority / cash-shop-adjacent, not WZ-checked
this pass:** `CUIVega` (a cash-item stat-reroll NPC dialog),
`CUIShopScanner`/`CUIItemSearch` (remote personal-shop and cross-shop
item search — Auction-House-adjacent, likely shares the unconfirmed-WZ
status from the Seventy-second pass), `CUIMapTransfer` (a save/recall
teleport-point feature), `CWishListRecvDlg` (receiving side of the
already-flagged Wedding wishlist), `CCSWnd_Locker` (cash-shop item
locker — same no-Cash-Shop-WZ-package root cause as `CCSWnd_OneADay`/
`CCSWnd_Inventory`/`CCSWnd_Char` from earlier passes, not independently
re-verified). `CBookDlg` — identity not confirmed
(neither `MonsterBook.ts` nor `SkillBook.ts` match its method shape;
possibly a help/lore book feature) — flagging as unidentified rather
than guessing.

**Confirmed moot or already-built, not chased further:** `_bstr_t`/
`IWzCanvas` (native COM string/canvas-interface plumbing).
`CCtrlCheckBox`/`CCtrlSelector` (generic native widgets). `CLoginUtilDlg`
(a `CUtilDlg`-family login-screen variant, same already-covered pattern).
`CUISoftKeyboard` ties to the already-built `SoftKeyOverlay.ts`, not
independently re-verified. `CUIQuestDelivery::IsWorthlessQuest` is a
second, independent copy of the same "outleveled quest" formula already
confirmed in the Sixty-first pass — no new finding, just corroboration
that the rule applies across multiple quest-log sub-tabs.

## Seventy-fifth pass (self-directed, IDA_INDEX.md sweep, `CNpcTemplate`): real spec found for an already-known gap — NPC ambient idle-chat

`CNpcTemplate::GetChatMessageList`/`SPEAK_CONDITION::CheckCondition`
confirm a real OG system this session already knew was missing (an
earlier pass's `GameStage.ts` wiring explicitly stubs `fh.onNpcMove`
with a comment that "no NPC ambient-animation or chat-bubble system
exists in this client yet") — now with an actual spec: each NPC
template carries a list of idle chat lines, gated by `SPEAK_CONDITION`
(quest-state/character-level-based conditions per line), and periodically
picks one to show as a speech bubble via the same balloon system already
confirmed to exist for mobs (`CChatBalloon::MakeMobBalloon`, Seventy-
fourth pass) — i.e. this is genuinely buildable using machinery already
present, not a from-scratch system. Not fully decompiled this pass
(`GetChatMessageList`'s exact selection/timing logic) — logged to attach
a real spec to the already-known gap, not to claim it's now resolved.

**Sized up further while waterfalling through implementation, still
not implemented:** decompiled `LoadSpeakCondition` and `SPEAK_CONDITION::CheckCondition`
in full. The WZ shape: `Npc.wz/<id>.img/speak` holds `absSpeak`
(always-available lines) plus numbered `condition1`/`condition2`/...
sub-nodes (`lbsSpeak`), each gated by job-category/job/quest-started
(`CheckCondition` checks against `CharacterData::mQuestRecord`, which
this client already decodes via `onQuestRecord` — no new protocol
needed for the *gating* data). **WZ-verified, low real coverage:**
opened `Npc.nx` directly and confirmed the literal `speak` key exists
(not StringPool-blocked at the top level, unlike `MonsterBookStr`), but
only **2 NPCs in this entire data set** (`2071010`/`2071011`) carry it
— a niche special-event NPC pair, not a broad ambient-chat system
worth the parsing/balloon-integration cost for this client's data.
Correctly left unimplemented given the real, now-measured scope, not
assumed bigger or smaller than it is.

## Seventy-fourth pass (self-directed, IDA_INDEX.md sweep — batch of 12, "do all" mode continued): `AccountMoreInfo`'s "flag" is really a sub-action dispatcher with unread account-info data; three more confirmed-missing quest/PQ/skill panels

**Confirmed real bug — `AccountMoreInfo` decodes a sub-action as a bare
flag, dropping the actual account-info payload.** `CWvsContext::
OnAccountMoreInfo` (0x9dbe50): the byte is a 3-way dispatch — `0` opens
the UI panel, `2` forwards the rest of the packet to `OnLoadAccountMore
InfoResult` (birthday/region demographic fields), `4` forwards to
`OnSaveAccountMoreInfoResult`. `FieldHandlers.ts:701`'s decode
(`{flag: p.readByte()}`) only reads the dispatch byte and never
continues into either result's payload — for `flag == 2`/`4` this
silently drops real account data rather than corrupting anything (no
desync, since nothing in this client reads further from the packet
either). Currently moot in terms of user-visible impact since
`CUIAccountMoreInfo` itself doesn't exist as a panel (`find src -iname
"*accountmoreinfo*"` returns nothing) — logged so the real dispatch
shape is known if this ever gets built.

**Confirmed missing, not WZ-checked this pass:**
- **`CUIPQReward`** (Party Quest completion reward-box selection — a
  separate feature from the quest-reward slide-menu already wired via
  `QuestReward.ts`/`ASK_SLIDE_MENU` in earlier passes) — zero hits for
  `pqreward`/`RewardBoxInfo`/`SelectReward` anywhere in `src/`.
- **`CUIQuestTimer`** (an on-screen quest countdown overlay, distinct
  from both `CUIQuestAlarm` (Seventy-second pass) and the basic
  time-limit display already in `QuestDetail.ts`) — zero hits for
  `questtimer` in `src/`.
  **SHIPPED (waterfall implementation pass):** the network data this
  needed was already fully decoded (`FieldHandlers.onSetQuestTime`,
  `CField::OnSetQuestTime`) but had **zero `GameStage.ts` wiring at
  all** — the classic decoded-but-dropped shape. Added a new
  `src/ui/game/QuestTimerHud.ts` (plain-text rows, same fallback
  convention as `Clock.ts`/`KillCountHud.ts`), wired to
  `fh.onSetQuestTime` (`end === 0n` clears that quest's timer,
  otherwise sets/updates it). Also added this codebase's **first**
  Windows-FILETIME-to-epoch-ms conversion (`QuestTimerHud.ts`'s
  `filetimeToEpochMs`) — every other FILETIME field decoded elsewhere
  in this client is read-and-discarded, never actually used, so no
  conversion helper existed before this. Tests:
  `tests/ui/game/QuestTimerHud.spec.ts`.
- **`CUISkillInc`** — name and purpose not fully confirmed (possibly an
  SP-allocation preview tool, possibly an older/alternate name —
  not decompiled this pass beyond the `--names` listing). Zero hits in
  `src/`. Flagging existence only, not asserting full understanding of
  what it does.
  **Correction (identified while waterfalling through implementation):**
  decompiled the full method list (`GetSkillEntry`/`SetSkillRootList`/
  `OnSkillIncButton`/`CreateSkillIncDlg`/`SetOption`) — "Inc" is
  "increase": this is the SP-spend "+1" button row sub-component used
  *inside* the skill book, not an independent panel. Sibling of the
  already-built `SkillBook.ts` and the already-cited `CUISkill` SP-gating
  formula (Sixty-fifth pass) — not a new gap.

**Confirmed already covered / moot, not chased further:** `CUtilDlg`
(the generic notice/yes-no dialog factory — same family already
thoroughly verified via `NpcTalk.ts` in the Forty-fifth/Fifty-ninth
passes); `CUIMedalQuestInfoDetail` (sub-detail of the already-flagged
missing `CUIMedalQuestInfo`); `CChatBalloon` (ties to the already-built
`ChatBalloon.ts` — its `MakeMobBalloon`/`MakeADBoardBalloon`/
`MakeMiniRoomBalloon` variants weren't individually cross-checked this
pass); `CEmployee` (the personal-shop NPC-employee entity — confirmed a
real counterpart exists, `EmployeeLook.ts`, not deep-dived further);
`CGrenade` (a throwing-skill projectile entity — already folded into
the broader "Bullets/projectiles" gap named in the
`sparkling-greeting-rabin.md` plan's Phase 5, not a new finding);
`CITCWnd_Inventory`/`CITCWnd_Char` (more Auction House sub-windows, same
root cause as the already-flagged missing Auction House UI); `IWzGr2D`
(native DirectX 2D-layer COM interface, pure engine plumbing).

`CMacroSysMan` (the real macro data-manager/flush-to-server logic behind
`SkillMacro.ts`) — noted that `SkillMacro.ts` carries zero `OG:`
citations despite being a real, substantial feature; flagging the
citation gap per the audit-citation rule without independently
re-verifying its decode this pass (no specific bug suspected, just
unverified).

## Seventy-third pass (self-directed, IDA_INDEX.md sweep — batch of 14, "do all" mode continued): confirmed `GW_ItemSlotEquip::RawDecode` exactly right field-for-field, the real Expedition protocol is richer than assumed, plus `CUIRaiseWndBase` ("Raise" minigame) confirmed missing

**Confirmed correct, no action needed — a strong one given how many
decode bugs this session has found elsewhere:** `GW_ItemSlotEquip::
RawDecode` (0x4f8360, covering the `GW_ItemSlotEquipBase` fields from
the index entry) vs `ItemDecoder._decodeEquip` (`ItemDecoder.ts:52-85`)
— every single field, in the exact same order and width, all the way
through `ruc/cuc/str/dex/int/luk/mhp/mmp/pad/mad/pdd/mdd/acc/eva/craft/
speed/jump/title/attribute/levelUpType/level/exp/durability/iuc/grade/
chuc(named "vicious" here)/option1` (real decompile truncated after
option1, but the established pattern strongly supports option2/3/
socket1/2 continuing correctly too). The single most load-bearing item
decode in the client (every piece of equipment goes through this) is
confirmed already fully correct.

**Confirmed real gap, richer spec than previously assumed:**
`ExpeditionIntermediary` (separate from `TabExpedition`'s UI, already
flagged missing in the Sixty-eighth pass) reveals the real Expedition
wire protocol is a full notification system —
`OnPacketExpNoti_{Get,Invite,MasterChanged,Modified,Notice,Removed,
ResponseInvite}` plus `Send{ExpCreate,ExpInvite,ExpChangeMaster,
ExpChangeBoss,ExpKick,ExpRelocateParty,ResponseInvite,Withdraw}Packet` —
substantially more than a simple roster list. Folding this into the
existing Expedition finding rather than a new entry; the scope of that
gap is larger than first stated.

**Confirmed real gap:** `CUIRaiseWndBase` (the shared base for the
"Raise"/pet-evolution-or-coupon minigame — `CUIRaiseWnd`/
`CUIRaisePieceWnd`, both referenced via `CDraggableItem::PutItem` in the
Sixty-eighth pass) — `find src -iname "*raise*"` returns nothing. WZ
confirmed present from an earlier pass's incidental find (`UIWindow2.img`
had a lowercase `raise` key in the Sixty-second pass's listing).

**Corroboration / already covered, no new findings:**
`CWishListGiveDlg` (the gift-giving side of the already-flagged Wedding
wishlist), `CUINewYearCardSenderDlg` (corroborates the already-flagged
`CreateNewYearCardArrived` invite type from the Sixty-ninth pass — has a
real search-by-name UI, not just a notice), `CUIWorldSelect`'s
`MakeBalloon`/`MakeWSBalloon` (corroborates the world-balloon decode gap
found in the Fifty-fourth pass), `CUISkillDecEX` (dual-job sibling of
the already-flagged `CUISkillDec`), `CTemporaryStatView` (already
covered by `BuffList.ts`'s own header citation from a prior session),
`CUIAdminShopWishList` (sub-feature of the already-flagged missing
AdminShop UI from the Sixty-sixth pass).

**Confirmed moot or already-built, not chased further:** `CUIWnd`
(generic native UI window base class) and `IUIMsgHandler` (a COM
message-handler interface) — pure engine plumbing, same family as every
other confirmed-moot base/interface class this session, not worth a
full `--names` dive. `CLogo` (native splash-video playback, cosmetic
intro screen, not independently compared to `SplashStage.ts`),
`CCtrlSlider` (generic native slider widget), `CUIChannelSelect`/
`CPinCodeDlg`/`CQuickslotKeyModifyDlg` (each
ties to an already-built counterpart — `ChannelSelect.ts`/`PinStage.ts`/
`QuickSlotConfig.ts` — not re-verified against these specific real
functions this pass).

## Seventy-second pass (self-directed, IDA_INDEX.md sweep — batch of 13, "do all" mode continued): no equipment-scroll UI and no Auction House UI exist at all — two of the biggest gaps found this session

**Confirmed real, high-impact missing features — no client-side scroll-
upgrade flow and no Auction House UI, despite the latter's protocol
already being decoded:**
- **Equipment scroll/upgrade UI is completely missing.** The real class
  is `CUIItemUpgrade` (found via `CDraggableItem::PutItem(CUIItemUpgrade
  *)` from the Sixty-eighth pass — not `CUIEnchantDlg`, a related but
  separate dialog also unbuilt). `OnItemUpgradeResult`/`PutItem`/
  `ShowResult`/`DrawGaugeBar` confirm this is the standard "double-click
  a scroll, drag the target equip onto the slot, see success/fail" flow
  every player uses constantly for gear progression. `find src -iname
  "*itemupgrade*"`/`*enchant*"` (excluding the already-covered
  skill-enchant feature) returns nothing. WZ asset location **not
  confirmed** — searched `UIWindow.img`/`UIWindow2.img` for
  `enchant`/`scroll`/`upgrade`-shaped keys and found nothing beyond the
  already-known `EnchantSkill` (a different feature); the real asset is
  presumably elsewhere in `UI.nx` or under a name this search didn't
  guess — flagging as unconfirmed rather than absent, per the
  verify-before-scoping rule (don't claim "no WZ" without a thorough
  search, and this search wasn't thorough enough to claim that).
- **No Auction House (`CITC`) UI panel exists, even though the protocol
  layer (`ITCHandlers.ts`) is already built and cited.** `CITCWnd_List`
  (the real listing/browse window) has no equivalent anywhere in
  `src/ui/`. Same WZ-search caveat as above — not confirmed absent, just
  not found by this pass's keyword guesses.

**Confirmed real, WZ-asset-verified-present gaps:**
- **`CRPSGameDlg`** (Rock-Paper-Scissors vs. an NPC) — `find src -iname
  "*rps*"` returns nothing (only the generic `subAction` byte decode
  from the Fifty-first pass exists). WZ confirmed: `UIWindow.img/RpsGame`.
  **Sized up further while waterfalling through implementation, real
  protocol fully decoded, not implemented:** decompiled
  `CRPSGameDlg::OnPacket`/`ProcessPacket`/`SendSelection` in full —
  opcode 371's sub-byte 1 (the only outbound case) sends the player's
  choice (`SendSelection`: byte 1 + byte rps-choice, 0/1/2). Inbound
  sub-cases: 9/12 = round start (enables the 3 choice buttons, starts a
  30s/`m_tLimit` countdown); 11 = round result (`byte npcSelect, byte
  cntStraightVictories` — negative `cntStraightVictories` plus a
  previously-zero streak sets a `m_bReceiveCompensation` flag); 10 =
  `ShowResult` (session end, not fully traced — its own body wasn't
  decompiled this pass); 6/7/14 = canned end-of-game `Notice` messages
  (StringPool ids 3723/3724, reset state); case 8 is a separate
  top-level branch (not via `ProcessPacket`) gated on the dialog *not*
  being the active `CUniqueModeless` — not resolved, looked like an
  unrelated disconnect-exception path on first read. This is a real,
  fully-protocol-decoded interactive minigame, but building the actual
  UI (NPC portrait, 3 choice buttons, round timer bar, result layer) is
  a moderate, separate UI-construction task — same scope class as the
  other minigames already correctly deferred this session (Speed Quiz,
  Cake/Pie), not attempted alongside the smaller fixes in this pass.
- **`CUIFamilyChart`** (the genealogy-tree visualization, distinct from
  `FamilyWindow.ts`'s basic info panel — zero `chart`-related code in
  that file). WZ confirmed: `UIWindow.img/FamilyTree`.
  **Correction (re-decompiled while waterfalling through implementation):**
  the Ninetieth/Hundred-and-fourth passes' claim that
  `CUIFamilyChart::DecodeLocalChart` has "no decompiled body anywhere in
  the dump" was **wrong** — re-querying it directly (0x7b55a0) produced
  a full ~17KB pseudocode body, a real per-node family-tree decode
  (repeated `int4`/`int2`/`byte`/`string` reads building a `FamilyItem`
  tree). Not fully field-mapped this pass (genuinely large, ~20+ decode
  calls per node), but corrected `FamilyChartResultArgs`'s doc comment
  and `GameStage.ts`'s `onFamilyChartResult` comment so this isn't
  re-assumed unrecoverable next time — a real follow-up decode-mapping
  task remains open, just no longer mischaracterized as opaque.
- **`CUISkillDec`** ("decrease a skill's level to reclaim SP for
  reallocation" — distinct from `Reset.ts`, which is the unrelated
  full-AP/SP cash-item reset; zero `SkillDec`/excess-SP code anywhere).
  Not WZ-checked this pass.

**Confirmed cash-shop-blocked (same root cause as the Sixty-fourth pass —
no Cash Shop WZ package exists in this client's data at all):**
`CCSWnd_OneADay` (daily cash deal), `CCSWnd_Inventory` (cash item
storage tab), `CUISendGifts` (player-to-player cash gifting) — none
independently re-verified against WZ this pass, inferred from the
already-established absence of any Cash Shop package.

**Lower-priority / partially covered, not chased further:**
`CUIEquip`'s `ToggleDragonEquip`/`ToggleMechanicEquip`/`TogglePetEquip`
(extra equip-slot panels for Evan/Mechanic/Pet — niche job-specific,
Pet-equip ties to the already-flagged whole-Pet-system gap).
`CAffectedAreaPool`'s exclusive-zone-placement logic
(`IsAbleToInsertExclusiveArea`) — plausibly server-enforced already
(consistent with this session's repeated finding that placement/validity
rules are server-side), not independently confirmed either way.
`CUIAvatarVAC` — the underlying SPW/VAC *protocol* is already cited and
handled in `CharSelectStage.ts`; whether the specific avatar-carousel
*rendering* this class implements has a full equivalent wasn't
independently verified, so not claiming a gap here without more
evidence. `CUIMacroSys`/`CUIMacroSysEx` ties to the already-built
`SkillMacro.ts` — not re-opened.

## Seventy-first pass (self-directed, IDA_INDEX.md sweep — batch of 14, "do all" mode continued): Parcel/StoreBank/Wedding-wishlist/QuestAlarm/FindFriend UI panels all missing — three confirmed WZ-asset-present, two unconfirmed

Finished triaging the batch of 14 started in the Sixty-ninth pass.
`CUIPartySearch` confirmed as `TabPartyAdver`'s real container window
(corroborates the Sixty-second pass finding, no new gap). `CUISkillEx`
is an "Ex" sibling of the already-deep-checked `CUISkill`
(Sixty-fifth pass) — same SP-gating formula almost certainly applies,
not re-verified independently. `CUIItem`/`CCtrlScrollBar` are base-class/
generic-widget plumbing already covered by the patterns confirmed
elsewhere this session.

**Confirmed missing UI panels, with real protocol fragments already
decoded as generic notices (same "opaque tail" shape as the `AdminShop`
case resolved in the Sixty-sixth pass):**
- **`CStoreBankDlg`** (a bank/storage NPC dialog — distinct from `Trunk`)
  — `find src -iname "*storebank*"` returns nothing; only
  `StoreBankResultArgs`/`StoreBankActionArgs` (generic resultCode/
  subAction bytes) are decoded. WZ confirmed present: `UI.nx`,
  `UIWindow.img/StoreBank` and `UIWindow2.img/StoreBank`. The real
  populate function, `CStoreBankDlg::SetStoreBankDlg`/`SetItems`
  (0x745c20/0x745820), wasn't decompiled this pass — same pattern as
  `AdminShop`'s `SetAdminShopDlg`, likely needs the same treatment.
- **`CParcelDlg`** (player-to-player/cash-shop gift parcel delivery) —
  only `ParcelDlgArgs` (a bare `subAction` byte) is decoded; `find src
  -iname "*parcel*"` returns nothing. The WZ key is **not** named
  "Parcel" (would have been the wrong guess) — it's `UIWindow.img/
  Delivery` (with `tax`/`tax1` sub-keys, confirming a delivery-fee UI
  element). Real populate function `CParcelDlg::SetParcelDlg`
  (0x692960) not decompiled this pass.
- **`CWeddingWishListDlg`** (wedding-gift wishlist sub-feature) — zero
  hits for `wedding` in `src/`. WZ confirmed present:
  `UIWindow.img/Wedding` (and `UIWindow2.img/Wedding`).

**Confirmed missing, not WZ-checked this pass:**
- **`CUIQuestAlarm`** (a quest-reminder/tracker overlay, separate from
  the main quest log) — zero hits in `src/`. WZ confirmed present:
  `UIWindow.img/QuestAlarm` and `UIWindow2.img/QuestAlarm` (found
  incidentally while checking the others above).
- **`CUIFindFriend`** (search players by account info, distinct from the
  `FindFriend` *opcode* checked back in the Fifty-first pass, which
  turned out to be an unrelated Monster-Carnival-adjacent decode) — zero
  hits in `src/`. No WZ key matching `FindFriend` found under
  `UserList`/`UIWindow.img` in this pass's search — unlike every other
  feature in this batch, this one's asset presence is genuinely
  unconfirmed, not just unchecked. Lowest priority of this batch;
  possibly a real-life-info/SSN-style feature not relevant to this
  client's region/build at all.

**One more checked this batch:** `CUserPreview` — a generic avatar-
preview rendering helper (`SetPet`/`SetRiding`/`DoMeleeAttack`/
`DoShootAttack`/`ShowFireCrack`, used wherever OG renders a non-
interactive preview avatar: cash shop, NPC-imitation, party-quest
intro screens). Ties directly to the already-confirmed-missing
`CCSWnd_Char` cash-shop preview (Sixty-fourth pass, blocked on missing
Cash Shop WZ data) — this is the shared rendering engine behind that
gap, not a separate one. No new finding beyond what's already logged;
checked off as "covered by the Sixty-fourth pass entry," not
independently re-investigated.

**Confirmed already built, citation gap only (not a functional bug):**
`TradingRoomDlg.ts`/`Repair.ts` both exist and work (per earlier
sessions), but `TradingRoom.ts` carries zero `OG:`/decompile citations
despite being substantial — flagging the citation gap per the
audit-citation rule rather than re-verifying its decode from scratch
this pass (no specific suspicion raised, just noting it's unverified).

## Seventieth pass (self-directed, IDA_INDEX.md sweep, `BasicStat`): resolves the Thirty-eighth pass's open thread — found the real base-ACC/PDD/MDD formulas, and they're wrong in `StatDerived.ts`, plus PDD/MDD's whole base-stat contribution is missing entirely

The Thirty-eighth pass left an explicit open thread: `SecondaryStat::
GetACC`'s `nBaseACC` parameter is computed somewhere by a caller, "buried
in a function too large to trace" — at the time, `CUIStatDetail::Draw`.
Checking `BasicStat` (a sibling/index entry, 24 methods) found the real
source instead: `BasicStat::CalcBasePACC`/`CalcBasePDD`/`CalcBaseMDD`
(0x721b60/0x721a40/0x721ad0) — the actual base-stat-derived inputs.

**Confirmed real formulas:**
- `CalcBasePACC` (base accuracy) = `LUK + DEX * 1.2`
- `CalcBasePDD` (base physical defense) = `STR * 1.2 + DEX * 0.5 + LUK *
  0.5 + INT * 0.4`
- `CalcBaseMDD` (base magic defense) = `INT * 1.2 + DEX * 0.5 + LUK * 0.5
  + STR * 0.4` (the same shape as PDD, with STR and INT's roles swapped)

**Confirmed real bug — `StatDerived.ts`'s ACC formula has the wrong
coefficients on both stats.** `computeDerived`'s `acc = dex*0.8 +
luk*0.5` (`StatDerived.ts:58`) vs the real `dex*1.2 + luk*1.0` — DEX's
weight is too low (0.8 vs 1.2) and LUK's is roughly half what it should
be (0.5 vs 1.0). This is on top of the already-confirmed missing
%-rate/cap multiplicative step from the Thirty-eighth pass — both issues
compound.

**Confirmed real bug — PDD/MDD's base-stat contribution doesn't exist in
this client at all.** `StatDerived.ts`'s `pdd`/`mdd` are just passed
straight through from `s.pddBonus`/`s.mddBonus` (equipment-only) with no
base-from-stats term whatsoever — the real mechanic is that *all four*
stats contribute to both defenses (dominant stat at 1.2x, the
type-matching pair at 0.5x each, the "off" stat at 0.4x), not just
equipment. This means every character's displayed PDD/MDD in this port
is missing a real, level/stat-scaling component entirely, not just
mis-weighted — a bigger gap than the ACC formula above.

Closes the Thirty-eighth pass's "not confirmed or refuted" caveat on the
DEX/LUK coefficients — they're now confirmed wrong, with exact real
values, plus two entirely new formulas (PDD/MDD base) discovered that
weren't even known to be missing before this pass.

**FIXED (waterfall implementation pass) — real correctness bug, not a
missing feature, prioritized accordingly.** `StatDerived.ts`'s
`computeDerived` now uses the exact confirmed formulas:
`acc = dex*1.2 + luk*1.0 + accBonus` (was `dex*0.8 + luk*0.5`),
`pdd = str*1.2 + dex*0.5 + luk*0.5 + int*0.4 + pddBonus` (base term
didn't exist before), `mdd = int*1.2 + dex*0.5 + luk*0.5 + str*0.4 +
mddBonus` (same). `eva` wasn't flagged wrong by this pass and is
unchanged. Every character's displayed ACC/PDD/MDD in this client was
wrong before this fix — ACC under-weighted, PDD/MDD missing their
entire stat-derived component. New test file:
`tests/ui/game/StatDerived.spec.ts` (none existed for this file before).

## Sixty-ninth pass (self-directed, IDA_INDEX.md sweep — batch of 14, "do all" mode): minimap party-tracking missing, multiple unwired invite types, world-map nesting missing, plus two solid confirmed-correct checks

**Confirmed correct, no action needed:**
- **`GW_ItemSlotBundle::RawDecode`** (0x4f87a0) vs `ItemDecoder.ts`'s
  `default` case (plain stackable items): real shape `number(short) →
  title(string) → attribute(short) → [if itemId/10000 ∈ {207, 233}:
  liSN(8 bytes)]` matches field-for-field, and `_isRechargeable`'s
  `Math.floor(itemId/10000) === 207 || === 233` is the exact same
  condition, verbatim. Already correctly ported.
- **`CUIKeyConfig::TryBeginDragFuncKeyMappedIcon`** vs `KeyConfig.ts` —
  this client already has real drag state (`_dragActive`/`_dragIcon`/
  `_dragFromScancode`, `KeyConfig.ts:89-93`) for assigning skills/items
  to the key-bind palette. Not a gap.
- **`CCtrlComboBox`/`CCtrlWnd`/`CCtrlButton`** — confirmed pure native
  engine widget base classes (same family as `CCtrlEdit`/`CCtrlMLEdit`),
  no gameplay logic, correctly not needed.

**Confirmed real gaps:**
- **`CUIMiniMap`'s party-member tracking ("stalkee")** —
  `InsertStalkee`/`RemoveStalkee`/`CalcAngle` are real: the minimap shows
  other party members as tracked dots/arrows. Grepped `MiniMap.ts` for
  any stalkee/other-player tracking — zero hits. This client's minimap
  only shows the local player, portals, and NPCs (already confirmed
  built); party members never appear on it.
  **SHIPPED, scope expanded honestly while implementing:** the
  `Party`/`PartyMaster` marker sprites were already loaded by
  `MiniMapMarkers.ts` and simply never drawn. Worse than the original
  finding stated, though: `MiniMap.playerWorldPos` and the
  `setOtherPlayers`/`setNpcs`/`setPortals` setters were **all** dead —
  nothing in `GameStage.ts` ever called any of them, so the minimap
  always showed the player dot frozen at the canvas origin and never
  showed NPCs/portals/other players either (the pass's "only shows the
  local player, portals, and NPCs" framing was itself wrong — it showed
  none of those live). Fixed `playerWorldPos` (now set from
  `this._physics.Position` every frame) and added the party half:
  `MiniMap.setPartyMembers`/`_partyMembers`, drawn with
  `Party`/`PartyMaster` based on `PartyLoadArgs.bossId`/`onPartyBossChanged`
  (tracked in a new `GameStage._partyCharIds` map). **Not fixed, sized
  up but out of scope for this pass:** `setOtherPlayers`/`setNpcs`/
  `setPortals` are still never called — non-party other players, NPCs,
  and portals still don't appear on the minimap. That's a separate,
  bigger wiring task (needs `_otherChars`/`_npcs`/the field's portal
  list fed in every frame) than the party-tracking fix this pass
  targeted — left as an explicit follow-up TODO. Tests:
  `tests/ui/game/MiniMap.party.spec.ts`.
- **`CUIMedalQuestInfo`** (a "medal"/achievement-quest sub-tab of the
  quest log, distinct from the regular quest log already built) — `find
  src -iname "*medal*"` returns nothing. Not WZ-checked this pass.
- **`CCashTradingRoomDlg`** (a cash-item-specific trading room, separate
  from the normal `TradingRoomDlg` already built) — zero hits for
  `cashtrad` anywhere in `src/`. Given the Cash Shop WZ package was
  already confirmed absent from this client's data (Sixty-fourth pass),
  this is plausibly blocked the same way — not independently re-checked
  this pass, flagging the likely connection rather than asserting it.
- **`CWorldMapDlg`'s nested/multi-tier map support** — real methods
  (`GetDeepestWorldMap`/`SetWorldMapDeeper`/`SetWorldMapShallower`/
  `LoadMapLink`/`ScoreLinkMap`) confirm OG's world map can drill into
  nested sub-regions (e.g. multi-floor towns) and link between map
  levels. Grepped `WorldMap.ts` for `deeper`/`shallow`/nested-level
  handling — zero hits. This client's world map is presumably flat
  (single-level per map), confirmed not independently chased to verify
  whether any v95 map actually needs the nested feature before treating
  this as urgent — logged as a real, structural gap regardless.
- **Multiple `CUIFadeYesNo` invite/notice types never wired**:
  `CreateAllianceInvite`/`CreateExpedtionApply`/`CreateExpedtionInvite`
  (both consistent with the already-flagged missing Alliance/Expedition
  features), `CreateFollowRequest`, `CreateMSMInvite`, `CreateNewYear
  CardArrived`, `CreateParcelAlarm`, `CreatePartyQuestAlarm` — grepped
  `FieldHandlers.ts`/`GameStage.ts` for each, zero hits on all seven.
  (`CreateFamilyInvite`/`CreateGuildInvite`/`CreatePartyInvite`/
  `CreateTradeInvite`/`CreateQuestClear` were already confirmed wired in
  earlier passes — not re-litigated here.) `CreateParcelAlarm` ties to
  `CParcelDlg` (still unmarked in the index, not chased this pass);
  `CreateMSMInvite` is the in-game "Multi Sound Messenger" cash feature.

**Corroboration, no new finding:** `CUIUserList`/`CTabFriend` confirm the
real container class for `UserList.ts` has Friend/Guild/Alliance/
Expedition as sibling tabs (matching the Alliance/Expedition findings
above) and that friend-group sub-lists are a real OG feature
(`OnGroupAdd`/`IsGroupBlocked`) — already flagged as deferred in an
earlier pass (`FieldHandlers.ts`'s `onFriendList` doc comment), not
re-opened here. `SKILLLEVELDATA`'s accessor surface (per-level damage/
range/cooltime/MP-cost) wasn't deep-dived — this is WZ-loaded skill
data already indirectly relied upon by the working skill system; no
specific bug surfaced, not exhaustively checked. `CCSWnd_List` (cash
shop item browser, sibling of `CCSWnd_Char`) not separately chased —
same likely WZ-blocked status as Sixty-fourth pass.

## Sixty-eighth pass (self-directed, IDA_INDEX.md sweep — batch of 12, "do all" mode): multiple confirmed-missing features with WZ assets verified present, plus several confirmed-moot native-engine classes

Batched `--names` scans across 12 classes to move faster per the "do all,
write each found" instruction. Triaged each:

**Confirmed moot (pure native-engine plumbing, zero gameplay relevance,
not chased further):** `CWvsApp` (Win32 app bootstrap: window creation,
DirectInput/sound init, OS version checks), `CInputSystem` (DirectInput
keyboard/mouse/joystick — this client uses native DOM events instead),
`cString` (generic native string utility, no game logic).

**Confirmed missing features, WZ assets verified present (per the
verify-before-scoping rule) — all genuinely buildable:**
- **`CMemoryGameDlg`/`COmokDlg`** (Memory Match and Omok/gomoku
  minigames, 47+37 methods, real wire protocols — `DecodeMiniGameRecord`/
  `OnEnter`/`OnGameResult`/`OnTurnUpCard`(memory)/`OnPutStoneChecker`(omok)).
  `find src -iname "*memorygame*" / "*omok*"` — zero hits, no UI, no
  decode, nothing. WZ: `UI.nx`, `UIWindow2.img/Minigame/MemoryGame` and
  `.../Minigame/Omok` (and a `Minigame2` variant) both present, plus a
  shared `MinigameTable` background asset. Go back to IDA at
  `CMemoryGameDlg::OnCreate`/`Draw` (0x62f3c0/0x631cb0) and
  `COmokDlg::OnCreate`/`Draw` (0x681ec0/0x6867f0) when implementing.
- **`TabExpedition`** (the 30-person raid-party "Expedition" system) —
  `grep` for `Expedition` in `src/` returns zero hits. WZ: `UI.nx`,
  `UIWindow.img/UserList/Expedition` (also a typo'd duplicate key
  `Expendition` in the same data — note both exist, don't assume the
  typo is the only one or a placeholder). Go back to
  `TabExpedition::OnCreate`/`Draw` (0x7b08b0/0x7b0790) for the layout.
- **`CTabGuildAlliance`** (multi-guild alliance member list, separate
  from the regular guild member list already in `UserList.ts`) — zero
  hits for `Alliance` in `UserList.ts`. WZ key is **not** named
  "Alliance" (would've been a wrong assumption) — it's
  `UIWindow.img/UserList/GuildUnion`. Go back to `CTabGuildAlliance::
  OnCreate`/`Draw` (0x8c9e60/0x8ca6f0).
- **`CDragon`** (Evan's persistent dragon companion entity — movement,
  combat actions, a "key-down bar" UI element, distinct from the
  temporary skill-summon system already flagged missing earlier this
  session) — zero hits for `Dragon` in `src/character/`. Checked whether
  Evan job content even exists in this build before treating this as
  real (per the rule): `Skill.nx`'s `2200.img` (Evan's job-id range) is
  present, so this isn't moot-for-lack-of-content. Lower priority than
  the above (single-job-specific), not chased deeper into the real
  `CDragon::Update`/`ProcessAction` movement formulas this pass.
  **Sized up precisely while waterfalling through implementation, still
  not attempted (single-job-specific, real visual-system cost beyond
  protocol decode):** traced the real trigger — `CUser::OnDragonPacket`
  (0x8e5c00) gates on two opcodes, neither named in `OpCodes.ts` at all:
  206 = create (`CDragon::OnCreated`: `int4, int4, byte, short, short` —
  a small fixed header, likely objId/charId/level/x/y, not field-mapped
  exactly), 207 = move (`CDragon::OnMove`, no literal `Decode*` calls
  matched — almost certainly delegates to the same generic move-path
  decode already used for `SummonedMove`, not separately verified this
  pass). The protocol itself is small and would reuse this client's
  existing `SummonedLook.ts` movement-decode shape, but `CDragon` itself
  is a real, separate visual-rendering system (body-part layering
  relative to the rider avatar, `DrawKeyDownBar`/`UpdateKeyDownBar` — a
  HUD element while riding) — genuinely more than a protocol-decode-only
  fix, single-Evan-job-specific, correctly still deferred rather than
  half-built.
- **`CUICharacterSaleDlg`** ("Character Card" cash-item instant-creation
  flow — a separate character-creation path from the normal `CLogin`
  one) — only the two result-decode handlers exist
  (`CharacterSaleCheckIdResultArgs`/`CharacterSaleCreateResultArgs`,
  already cited), no UI panel at all. Not WZ-checked this pass (niche
  cash-item feature, lowest priority of this batch).

**Confirmed missing, no WZ check needed (interaction-pattern gap, not an
asset gap):** `CDraggableItem` — the real client's universal drag-and-
drop dispatcher for items (covers trading room, personal shop, item
maker, enchant, incubator, equip-wear, item-protector, and more — one
central class routing a dragged item to whichever target window it's
dropped on). Grepped `EquipInventory.ts`/`ItemInventory.ts` for any
drag-related handling (`draggable`/`dragstart`/`onDrop`) — zero hits.
This client's inventory interactions are confirmed click/button-based
only; the real game's drag-to-equip/drag-to-trade/drag-to-sell
interaction model doesn't exist anywhere. Broad, cross-cutting gap
(affects every item-bearing panel at once) rather than a single feature
— worth a dedicated pass of its own rather than folding into one of the
target panels.

**Partially SHIPPED (later implementation pass, see the Ninety-second
pass's `CDraggableItem` entry for the full writeup):** `DragController`
was extended to items (`ItemInventory`/`EquipInventory.onDragStart`),
and `GoldHammer`/`KarmaScissors`/`ItemProtector` now `implements DragTarget`.
Trading room, personal shop, item maker, enchant, and incubator are
**not** wired as drop targets yet — this finding's "affects every
item-bearing panel at once" framing is still accurate for those, just
no longer for the three upgrade dialogs.

**Not yet triaged this pass:** `CUIMedalQuestInfo` (a "medal" achievement-
quest sub-tab of the quest log — zero hits in `src/`, likely real but
niche; not WZ-checked) and `CUIMonsterCarnival`'s remaining UI-shell
methods (its wire decode was already confirmed correct back in the
Fifty-first pass — this pass didn't re-open it, just re-confirmed the
class exists in the index for completeness).

## Sixty-seventh pass (self-directed, IDA_INDEX.md sweep, `CBattleRecordMan`): the real combat-stats *calculation engine* is a separate, uninspected class from the already-verified UI shell — only a DoT running total exists

`BattleRecord.ts`'s existing citations are all for `CUIBattleRecord` (the
window/control-layout shell) — verified, but a *different* class from
`CBattleRecordMan`, the actual stats-tracking/calculation engine, which
hadn't been checked at all.

**Confirmed real formulas, none implemented beyond a raw sum.**
`DamageInfo::CalcAverageDamage`/`CalcAverageAttrRate` are simple
sum/count averages, but `CalcAverageDamagePerSec` (0x4702e0) is a real
time-decaying DPS estimator: it only resets the per-hit timing window if
the gap since the last hit exceeds ~6.5s (or ~7s for DoT/summon hits,
via separate thresholds), otherwise accumulates `1/avgHitsPerSec` into a
running "total attack time" denominator and divides total damage by
that — a smoothed DPS, not `totalDamage / wallClockElapsed`.
`RecoveryItemInfo` (a sibling structure) tracks healing-item efficiency
(`CalcAverageHPInc`/`CalcMeritRate`/`CalcForeCastUsePerHour`) similarly.

Checked what this client actually computes: `BattleRecord.
setDotDamage`/`_refreshDamageText` (`BattleRecord.ts:239-251`) only
covers the **DoT-damage sub-feature**, pushing `{damage, count,
attrRate}` onto a capped rolling log and summing it — no average-per-hit,
no DPS (smoothed or otherwise), no crit count, no healing-efficiency
stats, and nothing at all for regular (non-DoT) attack damage tracking.
The real battle-record window is meant to show full combat statistics;
this client shows a DoT total only. No new WZ asset needed (the window
itself already renders) — this is purely a missing calculation layer.

**SHIPPED (waterfall implementation pass).** Re-decompiled the full
`DamageInfo` engine precisely (`ChoiceMaxOrMinDamage`/`ChoiceCriMaxOrMinDamage`
at 0x470240/0x470270 — both no-op entirely on a miss, min starts at 0/falsy;
`CalcAverageDamage`/`CalcAverageAttrRate` at 0x470200/0x470220 — plain
integer division by `totalAttackNum`; the exact `CalcAverageDamagePerSec`
thresholds, 6500ms normal / 7000ms DoT-or-summon) and the real
orchestrating caller, `CBattleRecordMan::SetBattleDamageInfo` (0x470890,
the regular-hit path) and `OnDotDamageInfo` (0x470a60, confirms the
per-hit-in-batch loop shape for DoT). Added the engine to
`BattleRecord.ts` (`AddDamage`, `_calcAverageDamagePerSec`, extended
`setDotDamage` to feed the same running totals) and wired
`GameStage.ts`'s two damage-number call sites (melee + ranged/magic) to
`_battleRecord.AddDamage`. **Scoped down, documented rather than
guessed:** `isCritical` is always `false` at both call sites — this
client has no critical-hit flag on its own outgoing damage anywhere to
pass through. Tests: `tests/ui/game/BattleRecord.spec.ts`'s new
`AddDamage`/`setDotDamage feeding the same calculation engine` blocks.

## Sixty-sixth pass (self-directed, IDA_INDEX.md sweep, `CAdminShopDlg`): resolves an existing `ponytail:` deferral — the Admin Shop UI itself is a whole missing feature, not just an "opaque tail"

`PacketArgs.ts:148-152` already carries a `ponytail:`-marked deferral:
"`SetAdminShopDlg` keeps reading the per-item tail... decode when
`SetAdminShopDlg` surfaces." Decompiled it this pass (0x4307c0) — it
surfaced. It's a large COM/canvas-heavy populate function (same class as
other oversized UI-builder functions already out of scope for full
fidelity this session), but enough is readable to confirm the real
shape: it resets four parallel commodity arrays
(`m_aNPCBuyItem`/`m_aNPCSellItem`/`m_aUserSellItem`/`m_aSnapShot`) and
decodes `nCommodityCount` repeated `GW_ItemSlotBase`-shaped item records
plus per-slot price/name data — this is a genuine dual-direction shop
(NPC sells *and* buys from players, with a separate user-sell-listing
panel), not a simple item list.

**Confirmed via `find src -iname "*adminshop*"` — zero UI file exists.**
Only the generic notice/reopen handling from a much earlier pass
(`AdminShopDlgArgs`) exists; there's no `AdminShopDlg.ts` panel at all.
This is a whole missing feature, not just an undecoded tail.

**WZ asset check (per the verify-before-scoping rule):** `wz_client/
UI.nx`, `UIWindow.img/Admin` is present — not independently confirmed
this is the exact node `CAdminShopDlg::OnCreate` (0x42ecd0) reads from
(could be a generically-named shared admin-tools asset), but at minimum
something named for this feature exists in this client's data, so it's
not obviously blocked the way `CCSWnd_Char` was. Go back to IDA at
`CAdminShopDlg::OnCreate`/`Draw`/`DrawNPCItem`/`DrawUserItem`
(0x42ecd0/0x42fdf0/0x42dc90/0x42e3c0) to confirm the exact WZ sub-keys
when implementing.

## Sixty-fifth pass (self-directed, IDA_INDEX.md sweep, `CUISkill`): the real "can level up this skill" gate is a per-job-tier, level-capped SP formula — `SkillBook.ts` only checks `sp > 0`

`CUISkill::CanSkillUp` (0x84a930) and its helper `GetMaxSkillDegreeSP`
(0x84a870) are the real client-side gate behind the skill-up button —
decompiled both rather than assuming from the name.

**Confirmed real formula, not implemented.** Skills are grouped into
"degree" tiers (1=Beginner, 2=1st job, 3=2nd job, 4=3rd job). For each
tier, `GetMaxSkillDegreeSP(degree) = 3 * (job-change level range for
that tier) + (1, or 3 for degree 4)` — i.e. roughly 3 SP-worth of
allowance per character level *within that job tier's level range*, via
`get_job_change_level` (a WZ-driven job-advancement-level lookup, not
independently chased this pass). `CanSkillUp` then enforces two things
before allowing a level-up: (1) **you must have already spent at least
as much SP in every earlier tier as that tier's cap allows** — summed
across tiers 1..currentTier-1, your spent SP can't be behind the cap, or
the request is refused outright regardless of available SP; (2) within
the *current* tier, spent SP must stay under a level-scaled ceiling
(`3 * characterLevel - {89, 209, 119-offset}` depending on which job
stage, mirroring the classic "can't dump SP into late skills before
leveling enough" anti-rush rule). Also short-circuits to `false`
entirely for Beginner-tier/Noblesse-style job ids (`job % 1000 == 0` or
`job == 2001`) — those can't skill-up via this path at all.

`SkillBook.ts`'s level-up button visibility (`SkillBook.ts:207`) is just
`this.sp > 0 && sk.level < sk.maxLevel && !sk.passive` — no per-tier
cap, no cross-tier catch-up check, no Beginner-job exclusion. Whether
this matters in practice depends on whether the server (not inspected
this pass) independently enforces the real rule and just rejects
invalid requests — if so this is a UX-only gap (clicking a button that
silently fails server-side); if the server trusts the client's request,
it's a real exploit allowing premature high-tier skill investment.
Not determined which this session — flagging both possibilities rather
than guessing. `CanSkillUpDualJob`/`GetMaxSkillDegreeSPDualJob` (the
Cygnus-Knights-style dual-job variant) weren't chased — unclear if any
dual-job class exists in this v95-era content at all, lower priority
until confirmed relevant.

**SHIPPED (waterfall implementation pass, re-decompiled `get_job_category`/
`is_dual_job_born`/`is_evan_job` to pin down the formula precisely
before implementing, per "do not skip, implement all").** Full formula
chain: `get_job_change_level(job, step)` returns fixed level thresholds
per advancement step — step1=10 (8 for Magician, `(job%1000/100)===2`),
step2=30 (20 if `is_dual_job_born` — needs the character's `subJob`
field, which this client doesn't track anywhere relevant; defaulted to
`false`, the common case, documented as a `ponytail:` simplification),
step3=70 (55 if dual-job-born), step4=120, step5+=200.
`GetMaxSkillDegreeSP(degree) = 3*(get_job_change_level(degree+1) -
get_job_change_level(degree)) + (3 if degree===4 else 1)`.
`get_job_level(job)` maps a skill's job-prefix to its degree tier
(1-4), with an Aran special case (`job/10===43`) and an `is_evan_job`
extension (`job/100===22 || job===2001`) allowing degree up to 10.
**Correction from the original framing:** Aran (`job/10===43`) is
*not* actually unresolved — `get_job_change_level`'s "special" branch
(constant 200 regardless of step) only covers Cygnus (`job/1000===3`)
and Evan (`job/100===22 || job===2001`), confirmed via `is_evan_job`'s
exact predicate; Aran goes through the regular step-based formula like
Warrior/Magician/Bowman/Thief/Pirate. For Cygnus/Evan, the formula
degrades to `GetMaxSkillDegreeSP===0` for every degree (both
`get_job_change_level` calls in the subtraction hit the same constant),
which isn't a bug to special-case around — it's what the literal OG
formula produces, consistent with Evan's dragon-mastery system being a
separate, still-unbuilt UI (this session's `CDragon` finding) rather
than gated through `CUISkill` at all. Implemented exactly as
decompiled in `SkillBook.ts` (`canSkillUp`/`_getJobLevel`/
`_getJobChangeLevel`/`_getMaxSkillDegreeSP`/`_getMySkillDegreeSP`),
gating the level-up button's visibility. **Found and fixed a separate,
more fundamental bug while wiring this:** `args.sp` (`StatChangedArgs`,
already fully decoded by the earlier ExtendSP fix) was never forwarded
to `SkillBook.sp` anywhere in `GameStage.ts` — the level-up button
never appeared *at all*, regardless of any gating logic, until this
fix. Tests: `tests/ui/game/SkillBook.canSkillUp.spec.ts`.

## Sixty-fourth pass (self-directed, IDA_INDEX.md sweep, `CCSWnd_Char`): no cash-shop avatar/equip preview — cosmetic-only gap

`CCSWnd_Char` is the cash shop's character-preview panel — try on cash
items, ride/pet/ring preview, color-lens/weapon-sticker preview, before
buying (`SetRiding`/`SetPet`/`SetRing`/`SetColorLens`/`CmpAvatar`/
`OnWear`/`OnTakeOff`). Checked `CashShopStage.ts` (358 lines) — zero
preview capability of any kind.

**WZ check (per the "verify before calling it a gap" rule) changes the
framing here: this isn't just unbuilt, it's currently unbuildable.**
`ls wz_client/` has no dedicated Cash Shop package at all (no
`CashShop.wz`/`.nx`), and `UI.nx`'s `UIWindow.img`/`UIWindow2.img` have
no `CashShop`-named node either (only an unrelated `CashGachapon`
sub-feature). So unlike `TabPartyAdver`/`CUIGuildBBS` above, this
specific gap is blocked on missing WZ data, not just missing code —
flagging that distinction explicitly rather than implying it's
shovel-ready. Still the lowest priority of this session's findings.

## Sixty-third pass (self-directed, IDA_INDEX.md sweep, `CUIGuildBBS`): decode already solid, but zero UI consumer — guild message board is unreachable

`GuildBBSPacket` (`FieldHandlers.ts:2233-2260`) is already correctly
decoded with a real OG citation (`CUIGuildBBS::OnGuildBBSPacket`,
decompile/7c8260.c) — sub-action dispatch for list/view-entry/not-found,
including the notice-pinned-post flag. Checked the consumer side: grepped
`GameStage.ts` for `onGuildBBS*` — zero hits, and `UserList.ts`'s Guild
tab (already built, Fifty-third-pass-adjacent territory) only renders
the member list, no message-board UI at all. So the protocol layer for
guild BBS posts/comments is solid and ready, but there's no panel to
show it — same "decoded, never wired" shape as the personal-shop
sold-item gap (Fifty-third pass), just for a different feature.

**WZ asset confirmed present** (per the "verify WZ before calling it a
gap" rule): `wz_client/UI.nx`, `UIWindow2.img/UserList/GuildBoard`. Real
art exists in this client's data — go back to IDA at
`CUIGuildBBS::OnCreate`/`Draw` (0x7c69f0/0x7c82b0) for the exact
control-layout-to-WZ-key mapping when implementing.

**SHIPPED (waterfall implementation pass, "implement all" — pure
UI-construction task, zero protocol work needed since both directions
were already fully decoded).** New `src/ui/game/GuildBBS.ts`: list view
(notice pinned at top, entries with title + comment count), detail view
(full text + comments, Comment/Delete/Back buttons), and New-Post
composer — all wired to the already-existing `GameSender.GuildBBS*`
senders and `FieldHandlers.onGuildBBS*` callbacks (previously
unconsumed). Added a "Board" button to `UserList.ts`'s Guild tab
(alongside "Leave") as the trigger. **Scoped down, documented:** the
real WZ control layout (`UIWindow2.img/UserList/GuildBoard`,
`CUIGuildBBS::OnCreate`/`Draw`) wasn't mapped this pass — rendered as
plain text/buttons instead, same fallback convention as
`Clock.ts`/`KillCountHud.ts`/`QuestTimerHud.ts`. Compose/comment text
entry uses `window.prompt()`, same convention as `GuildCreate`/
`MarriageRequest`. Tests: `tests/ui/game/GuildBBS.spec.ts`.

## Sixty-second pass (self-directed, IDA_INDEX.md sweep, `CCtrlEdit`/`ADAD`/`TabPartyAdver`): two confirmed-moot native widgets, and one real missing feature — the Party Advertisement (LFG) board

Three more checked per the don't-skip rule. `CCtrlEdit::FilterString`
turned out to be password-field asterisk-masking (`m_bPasswd`), not a
name/profanity filter — checked `LoginStage.ts`, which already
replicates this correctly via a custom `isPassword`-flagged text field
(`LoginStage.ts:270`). No gap. `ADAD::BrowserControlPane` is the same
ActiveX/IE-hosting pattern as `CWebWnd` (Fifty-eighth pass), used for
login-screen banner ads — zero relevance to a browser-hosted client,
confirmed moot.

**`TabPartyAdver` — confirmed a whole missing feature: the Party
Advertisement / "looking for group" board.** Real methods confirm this
is a genuine, substantial system: post a party recruitment listing
(`SendPartyRegistCommitPacket`, gated by `IsAbleToRegist`/`IsTitleValid`,
costs mesos per `GetAdverPrice`), browse listings by quest
(`GetQuestMaxPage`/`GetIndexFromQuestID`), apply to one
(`SendPartyApplyPacket`/`SendPartyApplyPacketTo`), quick-match
(`FindQuickJoinParty`), or whisper the poster
(`OnButton_Whisper`/`SendAdverDeletePacket` to remove your own listing).
Grepped the whole codebase for `PartyAdver`/`QuickJoinParty`/
`PartyAdvertisement` — zero hits anywhere, not even a stub. The real
wire dispatcher, `TabPartyAdver::OnPacket` (0x8162f0), is a sub-action
switch (`nRetCode`) over per-listing data decoded via `ADVER_COMMON::
Decode` — not fully decompiled this pass (it's a massive
StringPool/COM-heavy function, same class as other oversized UI
dispatchers already deemed out of scope for full fidelity this session)
but the structural pieces above are enough to scope an implementation
pass: a new opcode family, an `ADVER_COMMON`-shaped listing record, and
a `UserList`-adjacent UI tab (this client's party panel already has the
Friend/Party/Guild tabs from `UserList.ts` — a fourth "Advertise" tab is
the natural home for this).

**WZ asset confirmed present** (per the "verify WZ before calling it a
gap" rule — initially assumed the node would be named after the class,
`PartyAdver`, which doesn't exist; the real key is named after the
feature instead): `wz_client/UI.nx`, `UIWindow.img/PartySearch` and
`UIWindow.img/PartySearch2`. Real art exists, this is a buildable gap,
not blocked by missing data. Go back to IDA at `TabPartyAdver::OnCreate`
(0x815fc0)/`Draw_PartySelect`/`Draw_Regist`/`Draw_QuestSelect`
(0x813620/0x813a50/0x815020) when implementing, to map each WZ sub-key to
its real control.

## Sixty-first pass (self-directed, IDA_INDEX.md sweep, `CUIQuestInfo`): "worthless quest" graying formula is unimplemented

`CUIQuestInfo` (the quest-log panel) is already reasonably cited/built
(`QuestLog.ts` references `ToggleTab`/`ms_lQuestRead` from a prior
session). One concrete formula stood out by name: `IsWorthlessQuest`
(0x8223b0) — decompiled it rather than assuming from the name.

**Confirmed real, unimplemented formula.** A quest counts as "worthless"
(meant to be grayed out/filtered in the available-quests tab) when *all*
of: the active tab is the "available to start" one (`m_nTab == 0`), the
player's level is `>= quest's minimum level + 10` (outleveled by 10+),
and the quest has no real end date (`ftEnd` equals the sentinel
"2079-01-01" forever-date, i.e. it's not a time-limited event quest).
Checked `QuestLog.ts`/`QuestInfoService.ts` — no "worthless"/outlevel
filtering exists anywhere. Minor UI nicety (quests you've grossly
outleveled aren't visually demoted), not a correctness bug, but a real,
now-fully-spec'd gap. `GetQuestState`/`IsMarkedAsRead`/category-toggle
functions weren't independently re-checked this pass — `QuestLog.ts`'s
existing citations already cover that ground.

## Sixtieth pass (self-directed, IDA_INDEX.md sweep, `GW_ItemSlotPet`): pet inventory-item decode misreads a timestamp as petSkill/petWear, drops the real petSkill field

Checked `GW_ItemSlotPet::RawDecode` (0x4f5750) — the real wire format for
a pet item sitting in inventory/equip data (distinct from
`CUIUserInfo::SetMultiPetInfo`'s already-verified-correct pet *summary*
shape from the Fiftieth pass, a different, simpler structure used only
for the character-info popup). Real format after the common
`GW_ItemSlotBase::RawDecode` prefix: `name(13-byte fixed buffer) →
level(byte) → tameness(short) → repleteness(byte) → dateDead(8-byte
FILETIME) → petAttribute(short) → petSkill(ushort) → remainLife(int4) →
attribute(short)`.

**Confirmed real bug in `ItemDecoder.ts`'s `InvItemType.Pet` case
(`ItemDecoder.ts:27-38`).** Total byte count matches (35 bytes either
way) so nothing downstream desyncs, but the middle fields are
misaligned: this client reads `petSkill = readInt()` (4 bytes) then
`petWear = readInt()` (4 bytes) right where the real format has a single
8-byte `dateDead` timestamp — so `item.petSkill`/`item.petWear` are
populated from the two halves of a date, not anything pet-related. The
*real* `petSkill` field (a real pet-skill bitmask) gets read further
along into a discarded `p.readShort()`. The final `attribute` field
happens to land correctly by position (last short in both layouts).
Checked consumers — `.petSkill`/`.petWear` are read nowhere in any UI
(`grep` across `src/`), so this is currently silent, consistent with the
Pet system being a confirmed whole-feature gap already logged earlier
this session. Real spec now captured here for whenever that gets built —
this decode needs a `dateDead`/`petAttribute` field added and the
existing `petSkill`/`petWear`/`attribute` reads repositioned.
`GW_ItemSlotPet::IsDeadByDate`/`GetLevelUpType` and friends weren't
chased further — formula-light accessors over fields this pass already
covers.

## Fifty-ninth pass (self-directed, IDA_INDEX.md sweep, `CUtilDlgEx`): AskAvatar/AskPet/AskQuiz/AskSpeedQuiz NPC dialogs have no real picker UI

`CUtilDlgEx` is the native rendering side of the NPC script dialog
primitives already confirmed fully *decoded* in the Forty-fifth pass
(`OnCreate_INPUT`/`_MLINPUT`/`_LIST`/`_YESNO`/`_AVATAR`/`_PET` map 1:1 to
`ScriptMessageType`'s Ask* variants). Checked the *rendering* side this
time: `GameStage._onScriptMessage`'s switch (`GameStage.ts:2232-2308`)
has real cases for Say/SayImage/AskYesNo/AskMenu/AskText/AskBoxText/
AskNumber/AskAccept/AskSlideMenu (the last wired all the way to
`QuestReward`) — solid coverage, already fixed in prior passes per the
inline comments there.

**Confirmed gap: `AskAvatar`/`AskMembershopAvatar`/`AskPet`/`AskPetAll`/
`AskQuiz`/`AskSpeedQuiz` all fall through to the generic `default:`
branch** (`this._npcTalk.show(args.text ?? '')`), which only renders a
plain OK button — no avatar-look picker, no pet picker, no quiz-answer
input. These are real, decoded opcodes (confirmed in pass 45) with
correctly-shaped args sitting unused. Functional impact: any NPC script
that offers a hairstyle/face-changer avatar choice, a multi-pet
interaction picker, or a quiz (event NPCs, some quest lines) shows the
prompt text but gives the player no way to actually pick an option —
clicking the fallback OK button likely sends whatever `onOk` sends by
default, which is probably the wrong response shape for these opcodes
(not independently verified what `ScriptAnswerNext` vs the real expected
answer opcode is for each — flagging as unconfirmed rather than
guessing). Niche relative to Say/YesNo/Menu (event-NPC-specific, not
core questing), but a real, scoped gap worth a follow-up implementation
pass.

## Fifty-eighth pass (self-directed, IDA_INDEX.md sweep, `CUIToolTip`): no equip-vs-equip comparison tooltip exists at all

`CUIToolTip` (64 methods) is the real equip/skill/pet/set-item tooltip
layout system. Most of it is pure draw-line presentation, no formula
risk — the actual stat numbers come from already-decoded item data. One
method stood out: `SetToolTip_Equip2` (0x8a8aa0) — takes **two**
`GW_ItemSlotEquip*` parameters, confirming OG's well-known feature of
showing a hovered equip item's stats *side-by-side against whatever is
currently worn in that slot* (the up/down stat-delta arrows familiar
from the real game).

**Confirmed: this client has no equivalent at all.** `ItemTooltip.Draw`
(`ItemTooltip.ts`, called from `EquipInventory.ts:225` and
`ItemInventory.ts:307`) only ever takes a single item's id/name/quantity
— no second "currently equipped" item parameter exists in its signature,
and `ItemTooltip.ts` itself (331 lines) has no comparison-rendering
branch to put one in. Every equip tooltip in this port shows the
hovered item in isolation; there is no way to see at a glance whether a
new item is an upgrade. Real, well-known UX gap, not a small fix (needs
plumbing the equipped-item lookup through both inventory panels into
`ItemTooltip`, plus the actual stat-diff layout).

**Sized up precisely while waterfalling through implementation
("implement all" rule applied, but stopped short of guessing the
trigger condition).** Traced `SetToolTip_Equip2`'s 4 real callers:
`CUIEquip::OnMouseMove`, `CShopDlg::OnMouseMove`,
`CAdminShopDlg::OnMouseMove`, `CUIPetEquip::OnMouseMove` — i.e. the
comparison tooltip isn't an inventory-hover feature at all, it's a
**drag-hover-over-target-slot** preview (shopping for an item and
hovering it over your equipped slot, or dragging an inventory item
over an equip slot) using whatever item is *already in that slot* as
the comparison target. This ties directly into the `DragController`/
`DragTarget` infrastructure already built this session (item
drag-and-drop pass) rather than being a passive tooltip enhancement —
`CUIEquip::OnMouseMove`'s exact resolution of the comparison-target
item (`v7` in the decompile) wasn't traced to its source this pass, so
the precise "which slot does a dragged-but-not-yet-equipped item
compare against" rule isn't confirmed. Real spec for a future pass: (1)
extend `DragController`'s drag-state to expose "currently dragging X
over slot Y" during `onMouseMove` (not just on drop); (2) when that's
true and a `DragTarget` is an equip slot, look up `EquipInventory`'s
already-equipped item for that slot via `bodyPartForSlot`; (3) pass
both `ItemAttr`s into a new `ItemTooltip` comparison-render mode
(stat-delta arrows). Not implemented — the trigger condition needs one
more decompile pass to confirm precisely, not guessed at.

## Fifty-seventh pass (self-directed, IDA_INDEX.md sweep, `CCtrlMLEdit`): not skipped per the updated rule — led to finding `Memo.ts`'s compose flow has no text input at all

`CCtrlMLEdit` itself is native multi-line text-widget plumbing (caret
blink, IME candidate window, scrollbar, word-select) — correctly not
needed here, this client already reimplements single-line input
(`ChatBar.ts`'s own cursor/key handling on a Pixi `Text`) rather than a
native `<textarea>`, so there's no gap in the widget itself. But per the
new "don't skip, inspect" rule, checked what in this client would
actually *need* a multi-line editor — `Memo.ts`, the in-game mail/memo
panel.

**Confirmed real bug: composing a memo has no way to type anything.**
`Memo._startCompose` (`Memo.ts:69-73`) resets `_composeTarget`/
`_composeText` to empty strings and that's it — grepped the whole file,
neither field is ever assigned anywhere else (no `window.prompt`, no
text-entry UI of any kind). `_doSend` (`Memo.ts:75-80`) only fires
`OnSend` when both are truthy, which is therefore never true. Net: the
"New" button opens a blank compose state with no recipient/message entry
mechanism, and "Send" is permanently a no-op. This is a real, currently-
unusable feature, not a formula bug — needs an actual input mechanism
(the simplest fix, consistent with this client's existing pattern, is
two `window.prompt()` calls like `UserList.getInviteName` already does
elsewhere, though a proper on-panel text field would match OG more
closely).
**SHIPPED (waterfall implementation pass).** Implemented exactly the
`window.prompt()` fix this note already specced: `_startCompose` now
prompts for target then text, bails (stays out of compose mode) if
either is cancelled/empty, matching `Trunk`/`Trade`/`GuildBBS`'s existing
free-text-entry convention. New `Memo.spec.ts` covers both the
happy-path send and the cancel-doesn't-enter-compose-mode case.

## Fifty-sixth pass (self-directed, IDA_INDEX.md sweep, `CUIItemMaker`): `Maker.ts` is a dead UI shell — never opened, no recipe/cost data ever loaded

`Maker.ts` already carries citations for `CItemMakerInfo`/
`CalcMakerSkillDisassembleCost` from a prior session, but checking the
*current* wiring (not just the cost-formula citation) found something
worse than a formula bug: grepped `GameStage.ts` for every place `_maker`
is touched — it's constructed, `OnStart`/`SetResult` are wired, but
**nothing ever calls `_maker.Open(...)` with real recipe data**, and
`MakerResult` (`FieldHandlers.ts:2862`) only decodes the *result* of a
craft (success + produced items), never a recipe-list/cost packet. So
even if some NPC dialog flow is supposed to trigger crafting, there's no
code path that populates `_recipes` or makes the panel visible with real
content — the panel is permanently empty/unreachable in practice, not
just missing a cost preview. `CUIItemMaker::GetTotalCostToMake`/
`GetTotalCostToDisassemble`/`IsAbleToMake`/`DoesSatisfyPreCondition`
(0x7d0820/0x7d0990/0x7d0450/0x7d0240) were not individually decompiled
this pass — not needed yet, since the panel never gets data to run them
against; revisit once the open/load path is actually wired.

## Fifty-fifth pass (self-directed, IDA_INDEX.md sweep, `CEntrustedShopDlg`): the whole in-shop ESP_* sub-protocol is undecoded — missing feature, bigger than the personal-shop gap

Checked `CEntrustedShopDlg` next (sibling of `CPersonalShopDlg` from the
Fifty-third pass). `MiniRoomProtocol.ts` already defines all 16 `ESP_*`
sub-opcodes (33-48: PutItem/BuyItem/BuyResult/Refresh/AddSoldItem/
MoveItemToInventory/GoOut/ArrangeItem/WithdrawAll(+Result)/
WithdrawMoney(+Result)/AdminChangeTitle/DeliverVisitList/
DeliverBlackList) — but grepped `FieldHandlers.ts` for `ESP_` and got
**zero hits**. The only entrusted-shop wire handling that exists at all
is `EntrustedShopCheckResult` (a different, top-level opcode for
searching/checking shops from outside, already cited/decoded). Once
actually inside an entrusted shop, none of the in-room sub-actions are
decoded — confirmed by checking `EntrustedShop.ts` (95 lines): it's a
button-shell only, no item list rendering, no `setItems`/`setSold`-style
data method at all. This is a missing feature per the standing rule, not
a small decode bug — the whole in-shop browse/buy/sold-list/withdraw
flow needs building, not just a field-order fix.

**Real spec for the one piece I did decompile**,
`CEntrustedShopDlg::DecodeSoldItemList` (0x51fc70, the `ESP_AddSoldItem`
target — note: unlike personal shop's incremental single-item
`PSP_AddSoldItem`, this is a full-list decode, called on enter/refresh):
`count(byte) →` repeated `count` times: `{itemId(int4), number(short),
price(int4), buyerName(string)}` → trailing `totalReceived` as a raw
8-byte buffer (`int64`, mesos earned so far). Other `ESP_*` opcodes'
real handlers (`OnBuyResult`/`OnArrangeItemResult`/`OnWithdrawMoneyResult`/
`OnWithdrawAllResult`/`OnVisitListResult`/`OnBlackListResult`,
0x51fdc0-0x520ec0 range) were not individually decompiled this pass —
named here so a future implementation pass knows exactly which real
functions to chase for each opcode's shape, rather than guessing.

## Fifty-fourth pass (self-directed, IDA_INDEX.md sweep, `CLogin`): `WorldInformation` drops its own balloon entries — real desync bug

Went deeper on `CLogin` per the updated rule (checked `InitNewCharEquip`/
`GetNewCharItemName` first — confirmed correct, already WZ-data-driven
via `MakeCharInfoProvider.ts` reading `Etc.wz/MakeCharInfo.img`, matching
`CLogin::LoadNewCharInfo`'s real source; no bug there). Then checked
`handleWorldInformation` (`LoginHandlers.ts:104`, uncited) against the
real `CLogin::OnWorldInformation` (0x5da7f0).

**Confirmed real bug: per-world "balloon" entries are never read, only
their count.** Real wire, after the channel list: `balloonCount(short)`
then `balloonCount` repeats of `{x(short), y(short), message(string)}` —
these are the small event-notice speech bubbles shown over a world's
icon at the world-select screen. `handleWorldInformation` reads
`w.balloonCount = p.readShort()` and stops — `WorldInfo` doesn't even
have a balloon-entries field to put them in. Whenever a world actually
has `balloonCount > 0` (i.e. any active event notice), this leaves that
many `{short, short, string}` records unconsumed in the packet, which
will desync every subsequent world entry and the list's own
terminator byte. Severity is real but bounded to display only (this is
purely a cosmetic notice bubble, no gameplay stat), though the desync
itself could corrupt the rest of the world list. Not fixed (logging
only, per this session's convention) — needs a `balloons: {x, y,
message}[]` field added to `WorldInfo` and the loop ported.
**SHIPPED (waterfall implementation pass).** Added `WorldBalloon`/
`WorldInfo.balloons` and ported the missing read loop in
`LoginHandlers.handleWorldInformation`. New test locks in a non-zero
balloon count parsing correctly without desyncing the next world entry.

`PSP_AddSoldItem`/`PSP_BuyResult` (`FieldHandlers.ts:~2607-2624`) are
decoded but have zero consumer in `PersonalShop.ts`/`GameStage.ts` — a
player running a personal shop gets no sold-item log, buyer name, or
income tally when someone buys from them. Real `CPersonalShopDlg::
OnSoldItemResult` (0x69a670) also reveals the decoded quantity short is a
**multiplier against the shop listing's own stack size** (`nNumber = nSet
* Decode2()`), not a raw sold count — moot right now since nothing
consumes it, but matters once this gets wired up. `OnBuyResult` itself
(0x69a300) is just StringPool-templated notice text, already matches the
existing `resultCode`-only decode.
**SHIPPED (waterfall implementation pass).** `PSP_BuyResult` (24) was
already consumed (`GameStage.ts` case 24 -> `AcceptBuyResult`); only
`PSP_AddSoldItem` (26) had no `case` in `GameStage`'s MiniRoom-result
switch at all. Added `PersonalShop.NotifySoldItem` (resolves the real
`setSize`-multiplier semantics against `_items` at the decoded
`itemIndex`, since the protocol-decode layer has no shop-listing
context to do that itself) and wired case 26 + a `_statusMessenger`
loot-style notice.

# Deferred items from full client audit

Things found unwired/missing during the audit that are NOT simple wiring fixes —
either blocked on missing protocol info, or need new UI built first. Each gets
picked up later as its own task.

## FIXED: the 12 protocol decode bugs found in the Forty-seventh through
## Fifty-second passes have all been corrected in `FieldHandlers.ts`
## (+ `PacketArgs.ts` types, `GameStage.ts`/`SummonedLook.ts` consumers,
## and the relevant test files): `ReactorChangeState`, `ReactorEnterField`,
## `ReactorLeaveField` (decoded fully now, no longer dropped), `SummonedEnter`,
## `SetTamingMobInfo`, `TownPortalNotify`, `ForcedStatSet`,
## `CharacterInfo`'s per-pet loop, `MonsterBookSetCard`, `ImitatedNPCData`,
## `LimitedNPCDisableInfo`, `WildHunterInfo`, `CashPetFoodResult`. Full
## test suite (889 tests) and `tsc --noEmit` both pass. The narrative
## write-ups below are kept as historical record of how each bug was
## found and confirmed — read them for the *why*, not as outstanding work.

## Missing features — to be implemented

Per standing rule: when an OG system has zero client-side counterpart at
all, it goes here as a real TODO with the actual OG spec, not just folded
into a "ruled out" aside.

**Self-correction first:** earlier in this session I initially concluded
Party/Guild "doesn't exist" based on a filename-only grep (no
`Party.ts`/`Guild.ts`). That was wrong — checked properly this pass:
`UserList.ts` is a real 3-tab Friend/Party/Guild panel, and
`GameStage.ts` wires `onPartyLoad`/`onPartyMemberStatChanged`/
`onFriendList`/`onGuildLoad` plus invite/kick/leave senders — the feature
exists and is reasonably complete. Flagging this so the wrong "doesn't
exist" claim isn't repeated. The one real, narrow, already-self-documented
gap in this area: **party leader/"boss" crown indicator** — OG sends a
`PartyBossChanged` result (case 31 of `PartyResult`) that this client
decodes (`fh.onPartyBossChanged`) but does nothing with
(`GameStage.ts:1434`, `_userList.setUsers`'s entries also expose no
leader flag) — `UserList`'s party panel has no UI to mark/highlight which
member is the leader at all.
**STALE NOTE, corrected (waterfall implementation pass).** Re-verified
live: `fh.onPartyBossChanged` is wired (`GameStage.ts`, near
`onPartyMemberStatChanged`) and already updates the minimap leader
marker via `_partyCharIds`. The `UserList` party-panel crown/highlight
specifically may still be missing, but the "does nothing with it" claim
is no longer accurate — partially resolved in a later pass.

1. **Pet system — confirmed genuinely missing (entity rendering + AI),
   not just "unwired."** Checked broadly (not a filename grep this time):
   the protocol layer only has narrow fragments —
   `CashPetFoodResult`/`PetConsumeItemInit`/`PetConsumeMPItemInit` opcodes
   decoded, `PetSn1/2/3` stat bits read-and-discarded in `CharacterInfo`
   decode, and the dialog-box pet-picker (`AskPet`/`AskPetAll` script
   message types). There is no `PetLook`/`PetController`-equivalent class
   anywhere — no pet spawns as a field entity, no pet-follows-owner
   movement, no pet auto-pickup-drop behavior, no hunger/fullness/closeness
   meter, no pet command (sit/wave) UI. Real OG counterpart confirmed to
   exist this session via xrefs found while investigating drops:
   `CPet::SweepForDrop`/`TryPickUpDrop`/`SendDropPickUpRequest` (Thirty-
   fifth/Thirty-sixth pass area) and `CDropPool::TryPickUpDropByPet` — a
   full pet-AI-and-rendering system in OG with no client equivalent at
   all. Scope: needs a new `PetLook`+`PetController` pair (mirroring
   `MobLook`/`MobController`'s shape), the 3 pet stat slots threaded from
   `CharacterInfo`/equip data into something that actually spawns a pet
   entity, and wiring the already-decoded `PetConsumeItemInit`/
   `CashPetFoodResult` opcodes to real pet-state changes instead of being
   dead letters.

2. **Mob skill telegraph / status-icon rendering — confirmed missing,
   already self-documented in code but not yet in this log.**
   `GameStage.ts:1423-1424`: `onMobSpecialEffectBySkill`/`onMobSkillDelay`
   are wired to empty handlers with comments "no telegraph/status-icon
   rendering exists for mobs yet." Real OG shows a wind-up animation/
   countdown indicator before certain mob skills land (e.g. a boss's
   AoE charge-up) — currently invisible in this port (the skill still
   presumably lands per server packets, just with no visual warning).

3. **`CAnimationDisplayer` categories with no client implementation at
   all** (already named as backlog in the `sparkling-greeting-rabin.md`
   plan's "Phase 6", restated here so it's in the main findings log too,
   not just a plan file): `ChainLightning`, `HookingChain`, `MotionBlur`,
   `Fade`, `FireCracker`, `NewYear`, `Teslacoil`, `UserState`,
   `AbsorbItem`. Each is a real, confirmed-via-decompile OG visual-effect
   category (Twenty-fifth pass) with zero TS counterpart — job-specific
   or seasonal, lowest priority of this list but genuinely absent.

4. **`CParticleEffect`/`CItemEffectManager` — confirmed real OG system,
   zero client counterpart.** Investigated Twenty-eighth pass: a niche
   cash-shop cosmetic particle-effect system (item-bound ambient
   particles). Decompiled and confirmed to exist in OG; nothing in this
   client renders it.

5. **Boss timers — resolved, confirmed missing, and much smaller than
   expected.** Checked properly this pass (was just "not chased" before):
   `OnZakumTimer`/`OnChaosZakumTimer` are decoded in `FieldHandlers`
   (`{flag, value}`) but never wired to anything in `GameStage.ts` — dead
   letters, same pattern as the pet opcodes. Decompiled both real
   handlers (`CField::OnZakumTimer` 0x530cc0, `CField::OnChaosZakumTimer`
   0x531020, byte-for-byte identical logic in both): **this is not a
   dedicated countdown-bar UI at all** — it picks one of two StringPool
   template strings based on `flag` (ids 0x107E/0x107F — likely something
   like "phase ends in %d" vs a different phrasing), formats it with
   `value` (presumably remaining seconds, not independently confirmed),
   falls back to a third template (id 0x1080, likely a "boss is
   summoned now" message) when `value == 0`, and posts the result as a
   plain **chat-log line** via `CUIStatusBar::ChatLogAdd` — the same
   status-bar chat feed used for system messages elsewhere. So the real
   fix is small: resolve which of the two/three StringPool ids apply
   (text not available in this dump, same limitation noted for other
   StringPool-only strings this session) and post a notice/chat-log
   line through whatever this client already uses for similar
   StringPool-text-not-ported notices (e.g. the `_notice?.show(...)`
   pattern used for `ShopResult`/`AdminShopDlg` elsewhere) — not a new
   UI widget. `HontailTimer`'s own handler wasn't separately decompiled
   but is almost certainly the same shape given the other two are
   byte-identical.
   **SHIPPED (waterfall implementation pass).** Wired all 3
   (`onZakumTimer`/`onChaosZakumTimer`/`onHontailTimer`, all already
   decoded with zero consumer) to `_chatBar.addLine`, exactly the small
   fix this note specced — value===0 shows "Boss summoned!", otherwise
   the raw flag/value with a StringPool-not-ported note (consistent with
   every other un-resolvable StringPool string elsewhere in this audit).
   `HontailTimer` decoded the same `{flag, value}` shape as the other
   two, confirming the "almost certainly identical" guess above.

## Forty-seventh pass (self-directed): `ReactorChangeState` wire decode is scrambled — confirmed real protocol bug

Picked Reactors next (`ReactorLook.ts`, no citations). The class itself
is a thin WZ animation player (same shape as `MobLook`/`NpcLook`,
already verified patterns — nothing new there). Went to IDA for the real
`CReactorPool` wire handlers instead, since reactors are server-driven
state machines and the interesting risk is in the packet decode, not the
renderer.

**Confirmed real bug — `handleReactorChangeState`'s field order doesn't
match `CReactorPool::OnReactorChangeState` (0x6ccd60).** Real wire shape
after the 4-byte object id and 1-byte new state: `x (int16) → y (int16)
→ aniDelay (uint16) → properEventIdx (int8) → stateEndDeciseconds (int8)`
— 13 bytes total. `FieldHandlers.handleReactorChangeState`
(`FieldHandlers.ts:2604-2614`) reads `eventState (short) → timeLeft
(short) → x (short) → y (short)` after the same id+state prefix — also
13 bytes total (2+2+2+2 vs OG's 2+2+2+1+1), so **the total packet length
happens to match by coincidence and nothing downstream desyncs**, but
every individual field in this event is reading the wrong bytes: this
client's reported `x`/`y` for the reactor are actually OG's
`aniDelay`/(`properEventIdx`+`stateEndDeciseconds` combined into one
bogus short), and this client's `eventState`/`timeLeft` are actually
OG's real `x`/`y` position. Net effect: any reactor state-change (e.g. a
crate breaking, a lever being pulled) reports a garbage position in this
client while leaving the rest of the field's parse stream intact — a
real, currently-silent bug since nothing yet renders reactor position
changes prominently enough to have been noticed by eye, but the data is
definitively wrong. Also missing entirely: OG's `nAniState`-gated
"first-time-only" hit-start timestamp logic (`tHitStart` is only set on
the *first* state change after a reactor resets, not on every change) —
not modeling this means repeated state changes would each reset a hit
timer that should only fire once, if such a timer is ever added
client-side.

**Follow-up, same pass: decompiled the other three reactor handlers too
— found a more severe bug in `ReactorEnterField`, confirmed `ReactorMove`
is fine, and a minor incompleteness in `ReactorLeaveField`.**

- **`handleReactorEnter` (`FieldHandlers.ts:2580`) — confirmed a real
  trailing-string desync risk, more severe than the ChangeState bug.**
  `CReactorPool::OnReactorEnterField` (0x6cf490)'s real tail after the
  already-correct `objId/templateId/state/x/y` prefix is `bFlip (1 byte)`
  followed by a **length-prefixed string** (`CInPacket::DecodeStr`, the
  reactor's name — variable length). This client instead reads six fixed
  bytes with guessed placeholder names (`delay`/`nameTag`/`eventState`/
  `direction`/`moveDirection`/`moveAbility` — the comments themselves
  read as speculative, not derived from a real decompile). A
  length-prefixed string essentially never happens to be exactly 5 bytes
  of payload (matching the 6 fixed bytes minus the 1 real `bFlip` byte
  already accounted for) in the general case, so this will misalign the
  byte stream for most/all reactor spawns — unlike `ChangeState`'s bug,
  where the totals coincidentally matched, this one doesn't have that
  safety net. Whether this causes visible corruption depends on whether
  anything is read from the packet after this handler returns — per this
  project's established one-event-per-packet convention that's likely
  fine for *this* packet, but the 6 wrong bytes are still consumed
  instead of the real `bFlip`+name, so `onReactorEnter`'s args are
  already wrong before that.
- **`handleReactorMove` (`FieldHandlers.ts:2616`) — decode shape is
  correct, but confirmed a semantic nuance worth flagging.**
  `CReactorPool::OnReactorMove` (0x6cd110)'s wire shape really is just
  `objId(4) + x(2) + y(2)`, matching this client's decode exactly. But OG
  treats the decoded x/y as a **relative move delta** fed to
  `IWzVector2D::RelMove`, not an absolute position set — not checked
  whether `onReactorMove`'s consumer (wherever it updates `ReactorLook`)
  currently treats these as absolute coordinates, which would be wrong
  if so.
- **`handleReactorLeave` (`FieldHandlers.ts:2597`) — confirmed
  incomplete but likely safe.** Real `OnReactorLeaveField` (0x6ccea0)
  also carries `state(1) + x(2) + y(2)` after the objId (used to set the
  reactor's final resting frame/position before it's removed, plus an
  OG-side `tHitStart`/`nAniState` bookkeeping update tied to whether the
  new state has `REACTOREVENTINFO` entries). `handleReactorLeave` only
  reads the 4-byte `objId` and ignores the rest — safe in the sense that
  nothing later in the same packet gets misaligned (per the established
  one-event-per-packet convention), but it means this client can't show
  a correct final-frame/position for a despawning reactor.

`REACTOREVENTINFO`/`STATEINFO`'s actual per-state-index meaning (what
`nProperEventIdx` selects) still wasn't chased.

## Forty-eighth pass (self-directed): `handleSummonedEnter` is comprehensively wrong — wrong field order, wrong field widths, and silently missing a whole conditional variable-length block

Continuing in the same vein as the reactor pass: checked the other
field-entity spawn handler that had no OG citation,
`FieldHandlers.handleSummonedEnter` (player-summon spawn, e.g. Puppet/
Wolf/Octopus/Phoenix-type skill summons). Decompiled the full real chain:
`CSummonedPool::OnPacket` (0x75ac70, the opcode 278-283 dispatcher) →
`CSummonedPool::OnCreated` (0x75a9a0) → `CSummoned::Init(CInPacket&)`
(0x755740).

**Confirmed real wire format for opcode 278 (SummonedEnter), in full:**
`charId(int4) → summonedId(int4) → skillId(int4) → charLevel(byte) →
skillLevel(byte) → x(int16) → y(int16) → moveAction(byte) →
curFoothold(int16) → moveAbility(byte) → assistType(byte) →
enterType(byte) → hasAvatarLook(byte, boolean flag) → [if
hasAvatarLook: AvatarLook::Decode — a variable-length avatar-appearance
block, used for summons that mirror/ghost the caster's look] → [if
skillId == 35111002 (Tesla Coil): one more byte `teslaCoilState`, and if
that equals 1, three more `(x,y)` int16 pairs for a triangle's points]`.

**Confirmed `handleSummonedEnter` (`FieldHandlers.ts:2643`) matches
almost none of this:**
- `charId` is OG's **first** field (decoded by the opcode dispatcher
  before any per-event data); this client reads it **third**
  (`objId, templateId, charId, ...`).
- OG's second field is `skillId` as a **4-byte int**; this client's
  second field is a fabricated `templateId` (also 4 bytes, but a
  different concept — summons aren't identified by a "template id" in
  OG, they're identified by the skill that summoned them) and elsewhere
  reads a `skillId` as a **2-byte short**, the wrong width.
- OG's `charLevel`/`skillLevel` (1 byte each) have no analog at all in
  this client's decode.
- Most seriously: **the conditional `AvatarLook` block is not modeled at
  all.** Any summon spawned with `hasAvatarLook = 1` (ghost/doppelganger-
  style summons that render using the caster's own avatar) carries a
  variable-length avatar-appearance payload this client never reads —
  guaranteed to desync everything after this event in the packet stream
  for any summon type that uses it, not just a wrong-value bug like the
  reactor case but a real corruption risk. The Tesla Coil-specific tail
  (extra byte + conditional triangle points, gated on the real `skillId`
  which this client doesn't even decode correctly) is also completely
  unhandled.
- `x`/`y` happen to be read as 2-byte shorts at roughly a plausible
  position in both versions, but given everything before them is
  misaligned, their actual values would already be wrong before they're
  even reached.

Net: this decode was evidently written from guesswork (a
plausible-looking generic "spawn entity" shape: id/template/owner/x/y/
movement-flags) rather than the real protocol, the same pattern as the
`ReactorEnterField` bug found earlier this pass. Not fixed (logging
only). Not chased further: `CSummonedPool::OnRemoved`/`OnMove`/
`OnAttack`/`OnSkill`/`OnHit` weren't independently re-checked this pass
(though `OnAttack`/`OnSkill`/`OnHit` already have real prior-session
citations per the grep at the top of this pass, so likely already
verified — only `OnCreated`/`Init`'s spawn path was uncited and checked
here); `AvatarLook::Decode`'s own exact field layout wasn't pulled.

**Quick follow-up check, same pass: `SetTamingMobInfo` (mount status) —
confirmed wrong field semantics, no desync risk, and currently a dead
letter.** `CWvsContext::OnSetTamingMobInfo` (0x9f7280): real wire is
`charId(int4) → tamingMobLevel(int4) → tamingMobExp(int4) →
tamingMobFatigue(int4) → flag(byte)`.
`FieldHandlers.ts:583`'s `onSetTamingMobInfo` decode is `mobId, templateId,
x, y, flag` — same field *widths* in the same positions (all four ints
then a trailing byte), so no stream desync, but the three middle fields
are mislabeled nonsense (`templateId`/`x`/`y` instead of the mount's real
`level`/`exp`/`fatigue`). Checked `GameStage.ts` for any consumer of
`onSetTamingMobInfo` — there isn't one, so this is currently a dead
letter with wrong field names, same pattern as the pet/boss-timer gaps
already logged. Low severity (cosmetic mount-status data, not corruption-
prone) but easy to fix correctly now that the real field meanings are
known.

**Second follow-up, same pass: `TownPortalNotify` — confirmed a real
conditional-length decode bug.** Checked `handleTownPortalEnter`/
`handleTownPortalLeave` first (both already cited from a prior session,
`CTownPortalPool::OnTownPortalCreated`/`OnTownPortalRemoved`) — spot-
verified their leading decode calls against fresh IDA output and they
match exactly, already solid. The third town-portal handler,
`TownPortalNotify`, had generic placeholder field names (`field1/field2/
field3`) — a clear low-confidence signal, checked properly. Real handler:
`CWvsContext::OnTownPortal` (0x9f1330) decodes `townId(int4) →
fieldId(int4)`, then **only if neither equals the sentinel
`999999999`** ("no active town portal") does it decode three more
fields: `skillId(int4) → x(int16) → y(int16)`. So the real packet is
either 8 bytes (no portal set) or 16 bytes (portal set) — a genuinely
conditional length, not a fixed shape.
`FieldHandlers.ts:590`'s `onTownPortalNotify` unconditionally reads all
five fields (`field1, field2, field3, x, y` — 16 bytes) every time. When
the server sends the no-portal-set 8-byte form, this client will try to
read 8 bytes that don't exist in the packet, corrupting whatever comes
next in the stream (or throwing, depending on `InPacket`'s past-end
behavior — not checked which). Confirmed real, not yet fixed.

**Third follow-up, same pass: `HontailTimer` confirmed correct, and
`HontaleTimer` (a separate, similarly-named opcode) flagged as
suspicious.** Decompiled `CField::OnHontailTimer` (0x530e70, opcode 361)
— byte-for-byte the same shape as the already-confirmed `OnZakumTimer`/
`OnChaosZakumTimer` (Forty-sixth pass: `flag(byte) → value(int4)`, posted
as a chat-log line via two StringPool template ids). This client's
`onHontailTimer` decode (`flag: readByte(), value: readInt()`) matches
exactly — confirmed correct, no action needed.

Right next to it in `OpCodes.ts` is a **separate** opcode, `HontaleTimer
= 359` (distinct spelling, distinct numeric value from `HontailTimer =
361`), decoded as `flag: readByte(), value: readByte()` — note `value`
is a single **byte** here, breaking the otherwise-consistent
flag+int4 pattern shared by all three other boss timers. Searched IDA
for a real function this could map to (`HorntailTimer`, `HontailTimer`
substring search) — found nothing distinct from `OnHontailTimer` itself;
no `OnHontaleTimer`-shaped function exists. This is suspicious enough to
flag explicitly: either opcode 359 really is a different, legitimately
1-byte-value packet unrelated to Hontail (most likely — the name may be
an incorrect guess based on numeric proximity to the other boss-timer
opcodes rather than a confirmed real mapping), or it's a duplicate/typo
of 361 that should be removed. **Not resolved either way** — would need
to find `CField::OnPacket`'s actual case 359 in its full dispatch switch
(not attempted this pass, that function is enormous) to settle it.
Flagging the opcode/name as unconfirmed rather than asserting it's wrong,
since I don't have positive evidence of what it actually decodes to.

## Forty-ninth pass (self-directed): `ForcedStatSet` ignores its own mask — confirmed severe, near-certain desync bug

Continuing the "uncited handlers with generic field names tend to be
wrong" thread. Checked `handleMonsterCarnivalMemberOut` first — confirmed
**correct** against `CField_MonsterCarnival::OnShowMemberOutMsg`
(0x55ad80): real shape is `flag1(byte) → flag2(byte) → characterName
(string)`, matching this client's decode exactly field-for-field (just
unlabeled `flag1`/`flag2`, not a bug). `OnForcedStatSet` itself
(0x9f08f0) is a one-line forward to `ForcedStat::Decode` — decompiled
that instead.

**Confirmed real bug — severe, near-certain stream desync.**
`ForcedStat::Decode` (0x727600) is a **mask-gated conditional decode**:
read a 4-byte mask, then for each of 13 possible fields, decode it
**only if its bit is set** — `str/dex/int/luk` (bits 1/2/4/8, each a
2-byte short), `pad/pdd/mad/mdd` (bits 0x10/0x20/0x40/0x80, each a
2-byte short — note **`mad` exists in the real struct and this client's
decode has no field for it at all**), `acc/eva` (bits 0x100/0x200,
2-byte shorts), `speed/jump/speedMax` (bits 0x400/0x800/0x1000, **1-byte
each** — `speedMax` also has no analog in this client's decode at all).
The real packet's total length is *variable*, entirely dependent on
which bits the server actually sets — a debuff that only reduces STR
sends a tiny packet; one that reduces everything sends a much larger one.

`FieldHandlers.ts`'s `OutHeader.ForcedStatSet` handler reads the mask
correctly but then **unconditionally reads every field regardless of
which bits are set** — `str, dex, int, luk, maxHp, maxMp, pad, mdd, acc,
eva, speed, jump, flag1` (13 fixed reads every time). This is wrong on
multiple independent axes at once: (1) it ignores the mask gating
entirely, so it will read far more or far fewer bytes than the server
actually sent in the overwhelming majority of real cases — a near-
certain stream desync for any `ForcedStatSet` packet that doesn't happen
to have literally every bit set; (2) it invents two fields that don't
exist in the real struct (`maxHp`, `maxMp`) while silently omitting two
real ones (`mad`, `speedMax`); (3) field order also differs (real:
str/dex/int/luk/pad/pdd/mad/mdd/acc/eva/speed/jump/speedMax — this
client's `pdd` is entirely missing too, and a fabricated trailing
`flag1` byte exists nowhere in the real struct). Given how this codebase
correctly applies bit-mask-gated conditional decoding elsewhere in this
very file (e.g. the `PetSn1/2/3` handling cited around line 899/931/932,
and `StatChangedArgs`'s own mask-gated fields) this one handler is a
clear outlier — looks like it was written without checking the real
function at all, unlike the pattern used nearby. Likely the single most
severe decode bug found this session: `ForcedStatSet` covers
debuff/status-altering effects that can plausibly fire mid-combat
(e.g. boss "weaken" mechanics), and a desync here would corrupt every
packet parsed afterward until the connection naturally resyncs (if it
ever does). Not fixed (logging only).

## Fiftieth pass (self-directed): resolves a previously-flagged "unconfirmed" item — `CharacterInfo`'s per-pet loop has the continuation byte on the wrong side, every pet's fields shift by 1 byte

`handleCharacterInfo` (around `FieldHandlers.ts:1195`) carries an
existing comment from a prior session noting the per-pet loop shape was
"unconfirmed" because `CUIUserInfo::SetMultiPetInfo`'s body wasn't in
that session's decompile dump. With full IDA access this session, found
and decompiled it (0x8b66a0) to resolve that open thread properly rather
than leaving it unconfirmed.

**Confirmed: the per-pet field shape (types/order) was already right —
`int(templateId), string(name), byte, short, byte, short, int` matches
this client's `templateId/name/level/tameness/repleteness/petSkill/
petWear` sequence exactly, field-width-for-field-width.** (Can't fully
confirm the individual semantic names like "repleteness" vs "petSkill"
without `CUIUserInfo::SetPetInfo`'s own parameter names, which weren't
pulled this pass — but the decode *shape* checks out.)

**Confirmed real bug: the continuation byte is on the wrong side of the
loop, shifting every pet's fields by one byte.** OG's real loop is a
do-while: decode one pet's full field block *first*, unconditionally,
**then** read a trailing continuation byte and loop only if it's
nonzero — so the wire shape for N pets is `[pet1][byte] [pet2][byte] ...
[petN][byte=0]`, with **no leading byte before the first pet at all**.
`handleCharacterInfo`'s loop is `while (p.readByte() !== 0) { decode pet
fields }` — a byte read *before* every iteration, including the first.
Both versions consume the same *total* byte count for N pets (N pet-
blocks + N single bytes either way), so this won't desync anything
*after* the pet list — but it means this client's "continuation byte"
read before pet 1 is actually consuming the **first byte of pet 1's real
`templateId`**, and every pet's fields are then decoded starting one
byte early for the rest of the list: every single pet in `CharacterInfo`
renders with corrupted templateId/name/level/etc., not just an edge case.
This sat undetected because the prior session's fix for the *leading*
byte (the pet-count byte directly in `OnCharacterInfo`, already
correctly fixed) made the overall packet boundary line up — the bug is
entirely internal to the per-pet loop's own byte arrangement, invisible
from the outside. Confirmed, not fixed (logging only).

**Same pass, second resolved "unconfirmed" item:** `handleUserAttack`'s
per-hit decode (`FieldHandlers.ts:1126`) carried a comment that the
per-hit byte before each damage int was "not exposed, unconfirmed exact
meaning." Re-decompiled `CUserRemote::OnAttack` (0x95a670, the function
this whole handler is modeled on) and found the real per-target loop's
common-case branch: `do { hitByte = Decode1(v4); damage[i] = Decode4(v4);
} while(...)` — confirmed this client's `p.readByte(); damage.push(p.
readInt())` shape is exactly right, byte-for-byte. The byte genuinely is
its own distinct stored field in OG (kept at a separate struct offset
from the damage value, not folded into it) — not a fabricated/guessed
read, just one whose exact downstream purpose (a per-hit critical flag?
hit-type tag?) isn't resolved by this fragment alone. Decode confirmed
correct; semantic meaning still open, but that's a much smaller gap than
"unconfirmed exact meaning" implied.

## Fifty-first pass (self-directed): batch-checked 4 more uncited handlers — 3 confirmed correct, 1 more conditional-decode bug in the same family as `ForcedStatSet`

Kept pulling the same thread: batch-decompiled the real handlers for
four more uncited, generic-field-named decodes.

**Confirmed correct (no action needed):**
- `NotifyLevelUp` vs `CWvsContext::OnNotifyLevelUp` (0x9e4a90): real
  `nType(byte) → level(int4) → characterName(string)` matches
  `{flag, level, name}` exactly.
- `NotifyJobChange` vs `CWvsContext::OnNotifyJobChange` (0x9e4ef0): real
  `flag(byte) → jobCode(int4, confirmed via `get_job_name(v4)`) →
  characterName(string)` matches `{flag, job, name}` exactly.
- `NpcChangeController` vs `CNpcPool::OnNpcChangeController` (0x679730):
  real `flag(byte) → npcId(int4)` matches `{flag, npcId}` exactly.

**Confirmed real bug — `MonsterBookSetCard` reads conditional fields
unconditionally, same bug family as `ForcedStatSet` (Forty-ninth pass).**
`CWvsContext::OnMonsterBookSetCard` (0x9ddcb0): real wire is `flag(byte)
→` **only if `flag` is truthy** `→ itemId(int4) → count(int4)`; when
`flag` is falsy the function shows a generic "no new card"-style message
and never reads the two ints at all — the packet is just 1 byte long in
that case. `FieldHandlers.ts:640`'s `onMonsterBookSetCard` decode
(`flag: readByte(), cardId: readInt(), count: readInt()`)
unconditionally reads all three fields regardless of `flag`'s value —
when the server sends the 1-byte "no new card" form (presumably the
common case, since most monster-card-eligible kills don't grant a new
card), this client will read 8 bytes that don't exist, desyncing the
stream. Smaller blast radius than `ForcedStatSet` (this opcode fires far
less often — only on monster-card-eligible kills — and isn't combat-
critical), but the same root-cause pattern: a conditional OG decode
ported as if it were unconditional. Not fixed (logging only).

## Fifty-second pass (self-directed): a big haul — 3 severe sub-dispatch decode bugs, 1 more conditional-decode bug, 2 confirmed correct

Kept pulling the thread with a 6-handler batch. This one turned up the
worst decode mismatches of the session: three handlers turned out to be
thin guesses standing in for a real sub-dispatch or dedicated decoder
class, not a self-contained few-field packet at all.

**Confirmed real bug — `ImitatedNPCData` is a repeated-list-of-full-
avatar-looks, not a single int.** `CWvsContext::OnImitatedNPCData`
(0x9ccdf0) is a one-line forward to `CNpcPool::OnPacket(this, 84,
iPacket)`, which dispatches to `CNpcPool::OnNpcImitateData` (0x679500) —
the real "NPC disguised as a player avatar" feature. Real wire:
`count(byte) →` repeated `count` times: `{templateId(int4) →
name(string) → AvatarLook(variable-length block)}`. `FieldHandlers.ts`'s
`onImitatedNPCData` decode (`flag: readByte(), templateId: readInt()`)
isn't just wrong-shaped, it's reading a completely different *kind* of
data (a flat 5-byte pair) where the real packet is a count-prefixed list
of variable-length avatar-look records. Guaranteed desync the moment
`count > 0`.

**Confirmed real bug — `LimitedNPCDisableInfo` is a plain integer list,
no string field exists.** Same dispatch chain, case 85 →
`CNpcPool::OnUpdateLimitedDisableInfo` (0x679210). Real wire:
`count(byte) →` repeated `count` times: `templateId(int4)` — that's it,
a flat list of disabled NPC template IDs. `onLimitedNPCDisableInfo`'s
decode (`flag: readByte(), templateId: readInt(), message:
readString()`) invents a string field that doesn't exist anywhere in the
real packet and assumes exactly one templateId instead of a variable-
length list. Desyncs whenever `count != 1` (i.e. almost always).

**Confirmed real bug — `WildHunterInfo` delegates to a dedicated 21-byte
decoder, not a 5-byte flag+value pair.** `CWvsContext::OnWildHunterInfo`
(0x9feda0) forwards straight to `GW_WildHunterInfo::Decode` (0x4f2bc0).
Real wire: `packedByte(1, two base-10 digits packed into one byte — looks
like a riding-state/count pair) → 5× capturedMobId(int4)` = 21 bytes
total, all `GW_WildHunterInfo`'s real captured-mob/mount data for the
Wild Hunter class. `onWildHunterInfo`'s decode (`flag: readByte(), value:
readInt()` = 5 bytes) reads roughly a quarter of the real packet,
desyncing every time this opcode fires.

**Confirmed real bug — `CashPetFoodResult`, same conditional-decode
family as `ForcedStatSet`/`MonsterBookSetCard`.** `CWvsContext::
OnCashPetFoodResult` (0x9f7180): real wire is `result(byte)` then
**branches three ways**: `result == 1` → show a notice, read nothing
more (1-byte packet); `result == 0` → read one more byte (a pet-food
table index, used for a sound effect — 2-byte packet); any other
`result` value → read nothing further either (1-byte packet).
`onCashPetFoodResult`'s decode (`result: readByte(), flag: readByte()`)
always reads 2 bytes — wrong (overreads) for the `result == 1` case and
any other non-zero/non-one value, only accidentally right for
`result == 0`.

**Confirmed correct (no action needed):**
- `NotifyWedding` vs `CWvsContext::OnNotifyWedding` (0x9e4cf0): real
  `flag(byte) → characterName(string)`, both read unconditionally —
  matches `{flag, name}` exactly.
- `AuthenCodeChanged` vs `CClientSocket::OnAuthenCodeChanged` (0x4afe50):
  real `byte → int4` matches `{nSet, value}` exactly.

Running tally of confirmed real protocol decode bugs this session (not
counting the ones already fixed in prior sessions): `ReactorChangeState`,
`ReactorEnterField`, `SummonedEnter`, `SetTamingMobInfo`,
`TownPortalNotify`, `ForcedStatSet`, `CharacterInfo`'s per-pet loop,
`MonsterBookSetCard`, `ImitatedNPCData`, `LimitedNPCDisableInfo`,
`WildHunterInfo`, `CashPetFoodResult` — twelve. All logged, none fixed
yet (per this session's investigate-and-log convention).

## Thirty-first pass: `CVecCtrl` (96 methods) — jump/ladder/fall-down/impact physics vs `PlayerController.ts`

Asked to go deep on `CVecCtrl`, the OG velocity/physics controller backing
`CWvsPhysicalSpace2D`. Pulled the full method list (96 `CVecCtrl::`
methods) live from IDA. Cross-referencing first: grepped
`PlayerController.ts` for existing OG citations — `CalcWalk` (0x992ba0)
and `CalcFloat` (0x9934c0) plus the `AccSpeed`/`DecSpeed` helpers
(0x990850/0x9908c0) were *already* decompiled and cited in a prior
session, so ground-walk and plain-fall/swim/fly physics are already
grounded. This pass focused on what wasn't cited: the jump family
(`Jump`/`JustJump`/`FallDown`/`Wings`/`Impact`) and ladder/rope
detach-by-jump, decompiling each and diffing against the actual
`PlayerController.ts` code (not just the comments).

**Confirmed real bug — falling through a platform (down+jump) has the
wrong physics.** OG's `CVecCtrl::FallDown` (0x993d80) — the function bound
to the server-replicated "drop through foothold" move-path element — does
two things our `_downJumped` branch (`PlayerController.ts:220-228`)
doesn't:
- `vy = -(dJumpSpeed * 0.35355339 / g)` — a small **upward** hop (negative
  vy), independent of any shoe stat, before gravity takes over. Our code
  sets `this._velocity.y = 1` (a small *downward* nudge) instead — visibly
  different motion (OG: tiny hop then sink through; ours: just sinks).
- `vx` is explicitly zeroed (`m_ap.vx_CS = 0.0`). Our code leaves
  `this._velocity.x` untouched, so dropping through a platform while
  moving horizontally carries that speed through in our port but not in
  OG.
Both are easy, low-risk fixes once authorized — not made yet (logging
only, per usual).

**Confirmed real bug — jumping off a ladder/rope.** `CVecCtrl::JustJump`
(0x993ea0), the ladder/rope branch: if `m_nInputX == 0` (no left/right
held), the function returns immediately with **no state change at all** —
in OG you cannot leave a ladder by pressing jump alone, you must hold a
direction. `PlayerController._updateClimb` (line 471) lets you jump off
with `jumpEdge` alone, hopDir defaulting to 0 (straight up) if no
direction is held — this is allowed in our port but not in OG. Separately,
when there *is* directional input, OG's formula differs from ours:
  - vy multiplier: OG uses `dJumpSpeed * walkJump/g * v4`, where
    `v4 = 0.3` if the character can fly/swim or has a flyAcc-granting shoe,
    else `v4 = 0.5`. Our code hardcodes `-this._jumpSpeed * 0.7`
    (`PlayerController.ts:477`) regardless of flight ability — wrong
    constant (0.5 vs 0.7 for the common case) and missing the flyAcc
    branch entirely (low-priority, item-specific).
  - vx: OG uses `dWalkSpeed * walkSpeed * inputX * 1.3` — a **1.3x walk
    speed** horizontal kick. Ours uses `hopDir * this._walkSpeed` — a flat
    1.0x kick, ~23% weaker than real.

**Confirmed gap, lower priority — ground jump doesn't model the
flyAcc-shoe jump-height penalty.** `JustJump`'s grounded branch: if the
character can fly/swim or holds a flyAcc shoe, the computed jump vy is
multiplied by `0.7` (jumping is *weaker* when you have flight available —
presumably because flight covers vertical mobility instead). Our ground
jump (`PlayerController.ts:231-236`) always uses the flat
`PlayerController.BaseJumpSpeed`-derived `_jumpSpeed` with no such
reduction. Affects only flying-job/flyAcc-shoe characters; not chased
further re which items/jobs actually carry `flyAcc` in this client's item
data.

**Confirmed gap — `CVecCtrl::Impact` (knockback, 0x992050) is a clamped
additive velocity change, not an overwrite.** Real `Impact`: for each axis,
if the requested impact velocity pushes further in its own sign's
direction than the character's *current* velocity already does, the new
velocity becomes `current + impact`, clamped so it never exceeds the
impact value itself as a ceiling (i.e. additive but capped at the impact's
own magnitude); if the current velocity is already more extreme in that
direction, or the requested impact is in the opposite/zero direction, that
axis is left untouched. Both final velocity components are then truncated
to integers. `PlayerController.ApplyKnockback` (`PlayerController.ts:152`)
just does `this._velocity = { x: vx, y: vy }` — a flat overwrite, ignoring
whatever velocity the character already had (e.g. knocking back a player
who's already moving fast in the same direction won't compound the way it
does in OG, and knocking back in a direction opposite an existing fast
velocity will fully cancel it instead of leaving OG's untouched-axis
behavior). `Impact` also tags the move-path element as attribute `2`
(distinct from jump's `1`/fall's `11`/wings' `13`) for replication to
other clients; `ApplyKnockback` pushes nothing onto `_pending` at all, so
a knocked-back player's broadcast move path currently relies solely on the
periodic attr-0 flush rather than a dedicated impact element — not chased
further to confirm whether other clients render this distinguishably or
if it even matters cosmetically.

**Not chased this pass:** `CollisionDetectFloat`/`CollisionDetectWalk`
(0x994740/0x992280 — the actual per-frame foothold/wall collision sweep,
likely already adequately approximated by `_walkOnFoothold`'s loop-based
foothold-edge walk in `PlayerController.ts` but not diffed line-for-line);
`WorkUpdateActive`/`UpdateActive`/`SetActive`/`UpdatePassive`/
`WorkUpdatePassive` (the per-tick state-machine drivers that call into all
of the above — only the leaf physics functions were decompiled, not the
dispatcher that sequences them, so there could be ordering/timing nuances
not captured here); `IsOnLadder`/`IsOnRope`/`GetLadderOrRope`/
`ResolveMoveAction`/`OnAttachedObjectChanged` (`OnAttachedObjectChanged`
was decompiled as a side-effect of tracing `FallDown`/`Impact`/`JustJump`
— it mainly recomputes layer/z-mass and re-resolves the move-action code,
nothing that looks port-relevant beyond what's already covered); the
remaining ~70 `CVecCtrl::` methods, mostly thin COM property
getters/setters (`get_x`/`put_x`/`raw_Move`/etc.) consistent with patterns
already confirmed thin elsewhere this session — assumed not worth
individual decompilation, not verified.

## Thirty-second pass (self-directed): `CVecCtrl::CollisionDetectWalk`/`CollisionDetectFloat` vs `PlayerController`'s discrete checks

Continuing the `CVecCtrl` pass on my own initiative (flagged "not chased"
in the prior pass) — decompiled the two collision-detection workhorses
that `WorkUpdateActive` calls every tick to move the character and decide
landing/foothold transitions, then diffed their actual algorithm against
`PlayerController.ts`'s `_walkOnFoothold`/`_fallFreely`.

**Confirmed structural difference (not a one-line bug — a different
algorithm class).** OG's `CollisionDetectWalk` (0x992280) and
`CollisionDetectFloat` (0x994740) are continuous **swept** collision
checks: they take the character's last and current `AbsPos`, build the
bounding box of that motion, ask `CWvsPhysicalSpace2D::GetCrossCandidate`
for every foothold segment whose bounding box overlaps it, and pick the
first one actually crossed via cross-product sign tests against both the
foothold's own endpoints and the motion segment's endpoints (handling
diagonal/sloped footholds, foothold-to-foothold vertex transitions where
`m_uvx <= 0` zero-velocity edges cause a snap-to-end instead of sliding
through, and a "reserved landing foothold" concept — `m_pfhLandingNext` —
that lets some skill/move-path elements pre-target a specific foothold to
land on regardless of what's directly below).

`PlayerController._fallFreely` (`PlayerController.ts:393-405`) instead does
a **discrete per-frame check**: it advances `(newX, newY)` by one frame's
velocity, then asks `GetFootholdBelow(newX, this.Position.y)` — i.e. it
only samples straight down at the *destination* x, and only tests whether
the *old* y was above ground and the *new* y is at/below it. `_walkOnFoothold`'s
loop (`PlayerController.ts:290-330ish`) similarly walks edge-to-edge along
one foothold chain rather than sweeping against the full foothold set.

Concretely, this means:
- **Tunneling is possible at high velocity**: a foothold thin or steep
  enough to be skipped between one frame's `newX` and the next won't be
  detected, since only the endpoint at `newX` is sampled — OG's swept
  cross-product test catches this because it considers the whole motion
  segment, not just its endpoint. At this client's typical fall speeds
  (`MaxFallSpeed`) and a 1/`FlushSeconds`-ish tick rate this is probably
  rare in practice on normal maps, but ladder-end/cliff-edge platforms and
  any unusually fast vertical move (e.g. a future knockback/skill that
  sets a large `vy`) are the realistic trigger case.
- **No `m_pfhLandingNext` equivalent**: any OG mechanic that pre-reserves
  a landing foothold (this dump doesn't show which player-facing feature
  sets it — not chased further, `m_pfhLandingNext` is only read here, not
  written, so its setter lives elsewhere in `CVecCtrl` or `CUser` and
  wasn't part of this pass) has no analog in the TS port; not confirmed
  whether anything in this client's actual feature set (v95, no
  fall-through reservations seen yet) actually relies on it.
- Sloped-foothold landing while moving fast horizontally is approximated
  reasonably well in the common case since `_fallFreely` does sample
  `fh.YAt(newX)` (a per-x ground height, which itself handles slope
  correctly) — the gap is specifically about whether the *correct*
  foothold is found at all when the swept path would have crossed a
  *different* segment than the one directly below the final x.

Net: this is a reasonable, deliberate simplification rather than a wrong
formula — full swept-segment collision against an arbitrary foothold
graph is a substantial feature, not a quick fix. Logging as a known
architectural gap rather than recommending an immediate rewrite; worth
revisiting if tunneling or wrong-landing bugs are ever actually observed
in playtesting on a specific map.

**Not chased further this pass:** `m_pfhLandingNext`'s setter/owner (who
actually reserves a landing foothold and why); `WorkUpdateActive`/
`UpdateActive`/`SetActive`/`UpdatePassive`/`WorkUpdatePassive`, the
per-tick dispatchers that call `CalcWalk`/`CalcFloat`/
`CollisionDetectWalk`/`CollisionDetectFloat` in sequence — still
undecompiled, so the exact call order/looping (e.g. does it re-run
collision detection multiple times per tick if `*tElapse` isn't fully
consumed, which both functions' `*tElapse -=` patterns suggest) is
unconfirmed; `CWvsPhysicalSpace2D::GetCrossCandidate` itself (the
spatial-query function that finds candidate footholds — assumed to be a
broad-phase grid/quadtree lookup based on the name, not decompiled to
confirm).

## Thirty-third pass (self-directed): `CVecCtrl::WorkUpdateActive`/`SetActive`/`UpdatePassive` — closes the "call order unconfirmed" thread from the prior pass

Continuing self-directed: decompiled the per-tick dispatcher
(`WorkUpdateActive`, 0x994460) that the prior pass flagged as
undecompiled, plus `SetActive`/`UpdateActive`/`UpdatePassive`/
`WorkUpdatePassive` for completeness.

**Confirmed: OG does iterative sub-stepping within a single tick;
`PlayerController.Update` does not.** `WorkUpdateActive`'s real sequence:
1. Apply any pending one-shot state changes first — `Jump`/`Impact`/
   `FallDown`/`Wings`, each gated by its own `*Next.bValid`/`m_b*Next`
   flag (these are the OG equivalents of move-path "attributes" being
   queued for this tick).
2. If currently on a foothold (`m_pfh` set): `CalcWalk` then
   `CollisionDetectWalk`. If that collision call returns true *and*
   `tElapse` still has time left over (i.e. the collision consumed only
   part of the tick — e.g. hit a foothold-chain boundary partway through),
   it **re-simulates the remainder of the tick immediately**: copies the
   relative position forward by the leftover time at the post-collision
   velocity, then calls `CollisionDetectWalk` again if still on a
   foothold, or `CollisionDetectFloat` if the player just walked off an
   edge into open air mid-tick.
3. If airborne (`m_pfh` null): `CalcFloat`, `SaveFloatStateBeforeCollision`,
   `CollisionDetectFloat`. Same leftover-time handling: if time remains
   and landed on a `m_nState == 0` (inactive/disabled) foothold, that
   foothold is discarded and treated as still airborne; otherwise the
   remainder re-runs through `CollisionDetectWalk`.

`PlayerController.Update` (`PlayerController.ts:164-265`) does a single
state branch per frame — `if (this._grounded) walkOnFoothold() else
fallFreely()` — and never re-simulates a leftover remainder after a
mid-frame ground/air transition; a walk-off-the-edge or land-on-ground
event is only picked up on the *next* frame's branch check. At normal
frame intervals (this client's per-frame `dt`, typically 16-33ms) this is
a small one-frame-of-latency smoothing difference, not a correctness bug
— but it's a genuine, now-confirmed structural gap rather than an unknown,
which is what the prior pass's "not chased" note was waiting on.

`SetActive` (0x9918b0, called on field-enter/respawn/teleport to (re)place
the character) confirmed unsurprising: clamps position to `m_rcBound`,
resets velocity/foothold/page/zMass from the given foothold, and resolves
an initial move action — matches what `CharacterController`/field-entry
code in this port already does positionally; not diffed field-by-field
since it's a one-time setup path, not a per-frame physics path.

`UpdateActive`/`UpdatePassive`/`WorkUpdatePassive` confirmed as expected:
`UpdateActive` is just the `BeginUpdateActive`→`WorkUpdateActive`→
`EndUpdateActive` wrapper (hook points for COM/UI side effects, no
physics content of their own). `WorkUpdatePassive` is the **other
players'** (`CUserRemote`) per-tick path — it doesn't run any of the
Calc*/CollisionDetect* physics at all, it just calls
`CMovePath::CalcPassivePos` to interpolate along the already-received
move-path data and snaps directly to the result (with optional
`pFixedX`/`pFixedY` server-authoritative overrides). This confirms other
players' movement in OG is pure path replay, never locally re-simulated —
consistent with how this port already treats `OtherCharLook`/remote
player movement (interpolating decoded move-path elements, not running
`PlayerController`'s own physics on them). No mismatch found here.

This closes out the `CVecCtrl` deep-dive started two passes ago. Genuinely
unchased remainder, explicitly: `CMovePath::CalcPassivePos`'s own
interpolation algorithm (not decompiled — if remote-player movement ever
looks subtly wrong, this is the next place to look, not `WorkUpdatePassive`
itself); `CWvsPhysicalSpace2D::GetCrossCandidate`'s broad-phase
implementation (still not decompiled, mentioned again here only to avoid
implying it was covered).

## Thirty-fourth pass (self-directed): `CMob` AI — confirms a from-scratch reimplementation, finds the attack-range model is structurally wrong for every mob

Picked `CMob` next since `MobController.ts` (374 lines) had **zero** OG
citations anywhere in it — a clean slate, unlike everything investigated
so far this session. Pulled the full `CMob::` method list (321 matches)
live from IDA and diffed the controller's actual state machine against
the real functions.

**Confirmed: mob AI in OG is gated by a client-side "controller"
delegation system that doesn't obviously have an analog here.**
`CMob::ApplyControl(long)` (0x640d20) + `CMob::OnCtrlAck` (0x640c50) are
real, separate from plain movement playback (`CMob::OnMove`, 0x6521e0) —
this is MapleStory's classic "mob control" handoff, where exactly one
client in the field actually runs AI decisions (idle/walk/chase/attack
timing, `GenerateMovePath`) for a given mob and broadcasts the result;
every other client just plays back the resulting move-path, the same way
`CUserRemote` plays back other players' `OnMove`. Not chased further to
confirm how (or whether) this server/this TS port's architecture assigns
mob control — if every connected client independently runs
`MobController.Update`'s full AI for the same mob rather than one
"controller" owning it, that's a different but plausibly fine model for
a from-scratch server (no real desync risk if the server is authoritative
over final position), but it's worth a deliberate check rather than an
accidental side effect of porting `CMob`'s decision logic without porting
the control-handoff structure around it.

**Confirmed real, concrete gap — attack range/hitbox is a universal
hardcoded box, not per-mob/per-attack data.** `MobController`'s attack
trigger (`MobController.ts:159`, `AttackRangeX = 50`/`AttackRangeY = 60`)
is one fixed rectangle used for every mob's every attack. Decompiling the
real selector, `CMob::IsTargetInAttackRange` (0x645f50, genuinely huge —
~150 locals, trapezoid-shape hit tests, weighted random attack-index
selection across the mob's full `MobAttackInfo` array) confirms OG's real
range check is **not a stored stat at all** — it's derived per-attack from
`CMob::GetAttackBodyRect`/`GetMultiBodyRect`, which compute a rectangle
(or trapezoid, via `IsRectIntersectWithTrapezoid`) from the mob's actual
*attack animation frame* geometry in Mob.wz, individually per attack index
(a mob with attack0/attack1/attack2 can have three differently-shaped
ranges). Checked whether this client's WZ loader already parses this and
just isn't wired up — it doesn't: `MobAttack.ts` (the per-attack stat
class) carries skill/bullet/knockback/effect fields but no rect/range
data, and grepping the WZ loading code for hit-rect-shaped fields
(`ltx`/`rb`/hitRect) turns up nothing. So this isn't an "unwired" gap, the
data isn't even being read from WZ yet. Net effect: every mob in this
port — from a Snail to a boss — has the identical attack reach and shape,
which is a visible, real combat-feel bug (small mobs hit from too far,
large/long-reaching mobs hit from too close) and would need WZ
action-frame rect parsing added to fix, not just a constant tweak.

**SHIPPED (waterfall implementation pass, "start from phase 1").**
Re-verified the real `lt`/`rb` frame-0 hit-rect data live against
`wz_client/Mob.nx` (confirmed present and varying widely per mob/attack —
e.g. `8800000.img/attack1/0`: lt=-175,-65 rb=180,0; small mobs have
correspondingly tiny boxes) — this turned out to be a tractable wiring
gap, not blocked on undiscovered data, once checked directly instead of
assumed absent from "grepping the WZ loading code." Added
`MobAttack.HitRect` + `MobInfoService._readHitRect` (reads the attack
node's frame-0 sibling `lt`/`rb` vectors, mirroring `_readStr`'s existing
pattern) and a new `MobController._inAttackRange` that unions every
attack's real rect (mirrored on X for facing) instead of the universal
`AttackRangeX=50/AttackRangeY=60` box, falling back to that box only when
a mob has zero attacks with rect data. **Deliberately not ported:** the
weighted-random per-attack selection inside the real
`CMob::IsTargetInAttackRange` (which attack's rect "wins" when several
differ) — too large to trace this pass per the note below; the union
approach is a reasonable portable subset (mob is "in range" if *any* of
its real attacks could reach), not a guess at the real selection logic.

**Not chased — explicitly too large for this pass, same call as
`DoActiveSkill`/`ShowSkillEffect` earlier this session:**
`CMob::GenerateMovePath` (0x651100) itself, the function that actually
picks/builds the AI's walk-vs-jump-vs-stand decision and constructs the
resulting move-path element, is enormous (150+ locals, heavily
re-optimized pseudocode) — decompiled but not feasible to read
line-by-line in this pass. `MobController`'s own idle/walk timing
constants (`IdlePauseMin/Max`, `WalkBurstMin/Max`, edge-margin
turnaround, fly-target picking) are therefore **unverified against real
OG values** — they're plausible hand-tuned numbers, not confirmed-wrong,
just not confirmed-right either. `CMob::ChaseTarget` (0x642db0) was
decompiled and confirms chasing delegates to `CVecCtrlMob::ChaseTargetImp`
(a `CVecCtrl` subclass for mobs, not decompiled) and has an escort-mob
exception path (Mr. Anchor-style "don't auto-chase while escorting"
quests) not modeled here — low priority, escort mobs are a narrow content
slice. `CMob::TryFirstAttack`/`TryDoingSkill`/`DoAttack`/`ProcessAttack`
(the skill-casting side of mob AI, separate from the plain-melee path
above) — not opened this pass.

## Thirty-fifth pass (self-directed): `DROP`/`CDropPool` fall physics — confirms `DropSprite.Vy` is correct, finds an unmodeled fast-fall drop variant

Continuing self-directed: `DropSprite.ts` (166 lines) also had zero OG
citations, and its parabolic-arc/fall-speed numbers looked like they might
already be reverse-engineered knowledge rather than guesses, so this pass
verified rather than assumed. `CDropPool::Update` (0x515890) and
`OnDropEnterField` (0x516670) are both real but enormous, deeply
COM/VARIANT-bound rendering-state functions (300+ locals between them) —
not feasible to extract line-by-line, consistent with the `CMob`/
`CAnimationDisplayer` precedent of "too large for full fidelity."

**Confirmed correct:** the one cleanly-readable signal in
`CDropPool::Update` is the fall velocity constant — `vy = 400.0` by
default — which matches `DropSprite.Vy = 400` (`DropSprite.ts:9`) exactly.

**Confirmed gap — a faster-falling drop variant exists in OG with no
analog here.** Immediately next to that constant: `if (p->nOwnType == 3)
vy = 720.0` — some drop ownership/type value 3 falls at 1.8x normal speed.
`DropSprite` has no concept of drop "owner type" at all — every drop in
this port falls at the same speed regardless of what spawned it. Not
chased further to pin down what `nOwnType == 3` actually represents (the
enum wasn't visible in this function's decompile — candidates worth
checking later: explosive/reactor-triggered drops, an event-specific drop
category, or a "quest-only visible" ownership tier) — flagging the
existence and the exact trigger value/multiplier (3 → 720) rather than
guessing its meaning.

Not chased further this pass: `DROP::DROP`'s constructor turned out to be
trivial (just member init, no physics) — the real fall-arc math lives
inline in `CDropPool::Update`'s per-state-machine-step branches, which
weren't extracted given the function's size; `DropSprite._parabolicDuration`'s
exact formula (the `Math.floor(Math.sqrt(...))` duration curve) was not
cross-checked numerically against `Update`'s real per-frame state
transitions — only the headline velocity constant was verified.

## Thirty-sixth pass (self-directed): `CDropPool::TryPickUpDrop` — real pickup hitbox is a rect, not a radius; found the owner-exclusivity window is (correctly) not this client's job

Continuing the drop investigation: decompiled `CDropPool::TryPickUpDrop`
(0x511860), the function bound to the local player's pickup keypress —
small and clean enough to read fully, unlike the rendering-heavy functions
from the prior pass.

**Confirmed real gap — pickup range is a rectangle relative to the
player, not a radius.** OG builds `rc = {left: pt.x-25, top: pt.y-50,
right: pt.x+25, bottom: pt.y+10}` (`pt` being the player's own position)
and does a `PtInRect` test against each drop's stored position — i.e. a
50px-wide, 60px-tall box straddling the player asymmetrically (reaches
further up than down, consistent with "pick up something at around head
height in front of you"). `GameStage._tryPickUpDrop`
(`GameStage.ts:1043`) instead does a Euclidean nearest-neighbor search
within an 80px circular radius. Practically: a drop sitting directly above
or below the player by more than ~50-60px but within 80px would be
pickable in our port but not in OG, and a drop slightly outside the real
box's corners but within 80px radius could also wrongly succeed; the
reverse (real box reaching further sideways than our circle in some
direction) isn't possible here since the OG box is narrower than the
circle in every direction except partially up. Easy fix, not made (log
only).

**Confirmed this client correctly has no business modeling the
owner-exclusive pickup window.** The bulk of `TryPickUpDrop`'s real logic
is actually about *eligibility*, not range: a 15-second window after
spawn (`tCur - p->tCreateTime < 15000`, and only when `p->dwSourceID` is
set, i.e. it dropped from a mob rather than a player) during which only
the killer (`nOwnType == 0`, checked against the local character ID) or
their party (`nOwnType == 1`, checked against a party ID) may pick it up
— plus a separate, always-on 3-second per-drop retry throttle
(`tCur - p->tLastTryPickUp >= 3000`) and an `IsPickUpBlockItem` flag check
for non-money items. Checked whether this repo has any server-side
counterpart that should enforce this — it doesn't (`tools/proxy-server.ts`
is a dev relay, not a game server; this is a client-only port connecting
to an external/private server). So all of this ownership/cooldown logic
is correctly the server's responsibility, not a client gap — noting it
here only so it isn't mistaken for an unaddressed finding if revisited
later. The one piece that *is* client-side and would matter even with a
fully-correct server: nothing stops this client from spamming pickup
requests for the same drop faster than every 3 seconds (no local
throttle before `GameSender.PickUpDrop` is sent) — harmless against a
correct server (it'll just ignore/reject), but worth a one-line debounce
if request spam ever becomes a real concern.

## Thirty-seventh pass (self-directed): `MeleeDamage.Estimate` (stat-window damage display) is structurally wrong vs the real `CalcDamage::CalcDamageByWT`

Went looking for whether this client computes any damage locally at all
(actual combat damage is server-authoritative and arrives via packets —
confirmed earlier passes already treat it that way), and found
`MeleeDamage.ts` (39 lines, zero OG citations) — a client-side estimate
used for the character stat window's displayed "Damage: X ~ Y" range.
Its formula looked suspicious on sight (a fabricated
`weaponAttack = 8 + level * 1.3` with no reference to the player's
actually-equipped weapon), so decompiled the real function instead of
assuming.

**Confirmed real bug — wrong on every axis.** The real chain is
`CalcDamage::CalcDamageByWT` (0x724db0) →
`` `anonymous namespace'::calc_base_damage `` (0x721500):
`floor((tertiary + secondary + 4*primary) / 100 * (ad * k) + 0.5)`, where:
- `ad` ("attack damage") is the character's real PAD/MAD stat — weapon
  base attack plus all stat/equip/buff bonuses, computed elsewhere
  (`CalcDamage::PDamage`'s callers) and passed in. **Not a level formula at
  all.** `MeleeDamage.Estimate`'s `8.0 + level * 1.3` placeholder has no
  relationship to the real stat; it ignores the equipped weapon entirely,
  so two characters with the same level/stats but vastly different weapons
  would show identical estimated damage in this port, which is wrong by
  construction.
- `k` is a **per-weapon-type constant** selected by `nWT` (weapon type ID):
  1.2 for most one-handed/dagger-class types, 1.3 for claws, 1.43 for bow,
  1.32 for crossbow-ish types, 1.49 for another bracket, 1.0 flat for
  mage jobs (checked via `is_mage_job`), plus a special-cased 1.2 path for
  job 1000-multiples/2001 (Beginner/Noblesse-type IDs) that always uses
  STR/DEX regardless of weapon. `MeleeDamage.ts` has no per-weapon-type
  multiplier at all — it uses a single flat `4.0`, which (not
  coincidentally) is actually the *stat* multiplier baked into
  `calc_base_damage`'s `4*primary` term, not the `k` weapon-type constant —
  i.e. our code conflates two different real constants into one wrong
  number.
- Final result is `floor(x + 0.5)` (round-to-nearest) in OG; our code uses
  plain `Math.floor` (always rounds down) — a small but real off-by-up-to-1
  discrepancy on top of everything else.
- `MeleeDamage._statsForJob`'s 4-branch primary/secondary stat selection
  (Magician→int/luk, Bowman→dex/str, Thief→luk/dex, default→str/dex) is
  the one piece that's roughly in the right shape — it loosely matches
  which two stats `calc_base_damage` gets called with per job/weapon-type
  branch — but even this is an approximation: the real dispatch is by
  `nWT` (actual equipped weapon type), with job only used for the mage and
  Beginner-ID special cases, not as the primary switch. A Thief-job
  character wielding a bow (no such normal case in vanilla equip
  restrictions, but the *function* doesn't care) would follow the bow
  weapon-type branch in OG, not a thief branch — this client's version
  can't express that distinction since it never looks at weapon type at
  all.
- Min/max spread: OG's `GetMsateryConstByWT` returns a per-weapon-type
  mastery constant (0.25/0.15/0.2 depending on `nWT`) that's a real input
  to how the min/max range narrows with weapon mastery skill level
  (mechanism not fully traced this pass — `CalcDamageByWT` only returns
  one value, the max-side calculation; mastery's effect on the *spread*
  lives in a caller not opened here). `MeleeDamage.Estimate`'s flat
  `min = max * 0.80` has no connection to weapon type or mastery level at
  all.

Net: this is a from-scratch placeholder formula that happens to produce
plausible-looking numbers, not a port of the real one. Given the real
formula needs the equipped weapon's actual attack stat (which this client
presumably already has from inventory/equip data — not confirmed this
pass whether `StatDerived.ts`/equip code expose it in a form
`MeleeDamage` could consume), fixing this properly means wiring real
weapon ATK + weapon-type ID through, not just retuning constants. Logged,
not fixed.

**Not chased this pass:** `CalcDamage::PDamage`/`MDamage`'s full call
chains (the actual combat-resolution formulas, including crit/mastery/
elemental-resist application) — confirmed out of scope same as
`DoActiveSkill` previously, since real damage is server-side here anyway;
only the client-local *display estimate* was in scope. Whether
`StatDerived.ts` (which has its own "genuinely unverifiable from this
decompile" caveat comment already) has the real equipped-weapon ATK value
available to wire in — not checked.

## Thirty-eighth pass (self-directed): `StatDerived.computeDerived` — resolves a previously-flagged "unverifiable" caveat; the weapon-multiplier table doesn't match the real per-weapon-type constants

`StatDerived.ts`'s own header comment claims an "exhaustive search" for
`CalcDamage`/etc turned up "zero real hits" in a prior session, calling
every constant in the file "genuinely unverifiable from this decompile
export." That claim is now stale and was worth re-checking directly per
the standing rule rather than taken on faith: `CalcDamage::` alone
returned 19 real matches earlier this session (Thirty-seventh pass), so
whatever the prior search did, it didn't actually find what's plainly
there now with live IDA access. Re-investigated with the real function in
hand.

**Confirmed real mismatch — `weaponMultiplier`'s per-weapon-type table
doesn't match the real per-`nWT` switch in `CalcDamage::CalcDamageByWT`
(0x724db0).** The real constants, keyed by weapon-type ID (`nWT`) exactly
as the switch groups them (case-grouping reproduced verbatim — I have
*not* independently confirmed which real-world weapon name each `nWT`
value corresponds to, IDA shows no string labels for these, so treat the
ID numbers as opaque and compare grouping/values only):
  - `{30, 31, 32}` → k=1.2, STR primary / DEX secondary
  - `{33}` → k=1.3, **LUK primary / DEX secondary / STR tertiary** (the
    only case with a nonzero third stat term)
  - `{39}` → k=1.43, STR/DEX, but oddly passes the **literal constant `1`**
    instead of the real `nPAD` parameter to `calc_base_damage` — almost
    certainly a real bug/vestigial case in OG itself (this weapon-type ID
    may be unused/legacy); flagging as-observed, not "fixing" it if ever
    ported, since it's the actual original behavior.
  - `{40, 41, 42}` → k=1.32, STR/DEX
  - `{43, 44}` → k=1.49, STR/DEX
  - `{45}` → k=1.2, STR/DEX
  - `{46}` → k=1.35, STR/DEX
  - `{47}` → k=1.75, **LUK primary / DEX secondary**
  - `{48}` → k=1.7, STR/DEX
  - `{49}` → k=1.5, STR/DEX
  - default → 0
  - Plus two job-based overrides that bypass `nWT` entirely: Beginner-tier
    job IDs (`job % 1000 == 0`, or literal 2001) always use STR/DEX with
    k=1.2 regardless of weapon; mage-branch jobs always use INT/LUK with
    k=1.0 against `nMAD` instead of `nPAD`.

`StatDerived.ts`'s `weaponMultiplier` (line 90) groups IDs as `{31,32,37,38}
→4.4`, `{33,39,47,49}→3.6`, `{41,42,48}→4.8`, `{40}→4.6` alone, `{30}→4.0`
alone, `{45}→3.4`, `{46}→3.6` — none of these groupings line up with the
real switch's groupings (real keeps 30/31/32 together and 40/41/42
together; this file splits both apart and lumps unrelated IDs like
33/39/47/49 into one bucket despite those four having four *different*
real k values: 1.3, 1.43, 1.75, 1.5). `resolvePrimarySecondary` also
switches on **job branch** as the primary key (`Math.floor((jobId/100)%10)`)
with weapon type not considered at all, whereas the real function
switches on **weapon type** as the primary key, with job only mattering
for the two special-cased brackets above. A Bowman wielding the
"wrong"-for-job weapon type would diverge between the two models, and
even for the common/intended case the actual multiplier values don't
match (e.g. real STR/DEX one-handed-weapon-ish brackets are 1.2-1.75
range values multiplying the *entire* `(4*primary+secondary)` bracket
times attack, not a single 3.4-5.0 constant multiplying primary alone —
structurally the same conflation issue already found in
`MeleeDamage.Estimate` last pass, confirming it's a repeated, not
one-off, pattern in this client's damage-estimate code).

Also confirms `computeDerived`'s `min = floor((mult*primary*0.9*mastery +
secondary) * dmgMult)` mastery-scaling shape (linear in mastery, 0.9
ceiling factor) has no visible counterpart in `CalcDamageByWT` itself —
mastery's effect on the min/max spread lives in a caller not opened this
pass (same unresolved thread as Thirty-seventh pass's
`GetMsateryConstByWT` note). Not chased further.

**Accuracy/avoidability formulas (`acc`/`eva`, lines 58-59) were not
checked this pass** — no corresponding OG function was searched for; the
existing file comment's "unverifiable" caveat may still legitimately
apply to those two specifically, separate from the damage formula now
addressed above.

**SHIPPED (waterfall implementation pass, "start from phase 1").** Fixed
`StatDerived.computeDerived`'s damage formula to match the real shape and
per-`nWT` table exactly as specced above: replaced `weaponMultiplier`/
`resolvePrimarySecondary`'s job-keyed, conflated-constant formula with a
new `resolveDamageBranch(s)` that switches on weapon type first (with the
two job-based overrides — Beginner-tier and mage-branch — checked first,
exactly matching the real priority order), returns the correct
primary/secondary/**tertiary** stat selection and `k` per the verbatim
table above (including nWT 33's tertiary STR term and nWT 39's
attack-forced-to-`1` vestigial case, preserved as-observed), and
restructured the arithmetic to the real
`floor((tertiary+secondary+4*primary)/100 * (attack*k) + 0.5)` shape
(round-to-nearest, not `Math.floor`-down). Mastery's effect on the min
side is still the same unverified linear-scaling approximation noted
above (real spread mechanism not traced) — left as-is, not chased
further this pass either. New tests in `StatDerived.spec.ts` cover the
nWT 30-32/33/39 cases, the mage-branch override, the Beginner-tier
override, and the zero-multiplier default case.

**New, related finding (not fixed — genuinely blocked):** neither this
formula nor `MeleeDamage.Estimate` (Thirty-seventh pass, separate file)
ever receives *real* equipped-weapon `watk`/`matk`/weapon-type data —
`StatDetailInfo.Inputs` is never assigned anything by `GameStage.ts`
(stays at `defaultStatInputs()`, all zeros, forever), and `MeleeDamage
.Estimate`'s call site (`GameStage.ts:2274`) doesn't pass weapon data at
all. `ItemIconLoader.LoadAttr(itemId)` already exposes `IncPad`/`IncMad`
per-item (used by `ItemTooltip`), so summing equipped-slot stats via
`EquipInventory`'s `_equipped` map is mechanically possible — but mapping
an equipped weapon's real item ID to the right `nWT` bucket from the
table above is **not possible from this decompile**: the nWT IDs are
confirmed opaque (no string labels), so which real item-ID range
corresponds to nWT 30 vs 31 vs 33 etc. is unconfirmed. Wiring real
watk/matk is mechanical; wiring real weaponType is blocked on this
mapping. Not implemented — genuinely blocked, not guessed at.

## Thirty-ninth pass (self-directed): `FieldCrc.ts` — CRC32 engine and field ordering both confirmed correct; the double-constant encoding is confirmed wrong, but the module is dead code (no callers)

`FieldCrc.ts` (228 lines, zero OG citations) computes a CRC32 over a map's
physics constants, footholds, ladders/ropes, portals, and info flags —
clearly modeled on OG's map-integrity check used for anti-cheat
("`CWvsContext::OnDataCRCCheckFailed`"/"`CClientSocket::OnCheckCrcResult`").
Found and decompiled the three real functions this maps to: `CCrc32::
GetCrc32` (0x4b7860, the actual CRC engine),
`CWvsPhysicalSpace2D::GetConstantCRC` (0xa12cd0, the physics-constant
hash), and confirmed `CField::GetCrc` (0x9033a0) is just a cached-field
accessor (`return this->m_dwCrc`) — the real per-field CRC build site
wasn't separately chased down since the constant-CRC piece alone was
enough to find a concrete bug.

**Confirmed correct:** the CRC engine's per-byte step
(`table[byte ^ HIBYTE(result)] ^ (result << 8)`) matches `FieldCrc.ts`'s
`step()` exactly, and the table's first nonzero entry (`0x04C11DB7`, the
literal CRC-32/MPEG-2 polynomial) matches `Table[1]` — spot-checked, not
exhaustively diffed all 256 entries. The physics-constant **field order**
also matches exactly: `GetConstantCRC` hashes
walkForce→walkSpeed→walkDrag→slipForce→slipSpeed→floatDrag1→
floatCoefficient→swimForce→swimSpeed→flyForce→flySpeed→gravityAcc→
fallSpeed→jumpSpeed→maxFriction→minFriction→swimSpeedDec→flyJumpDec in
that literal sequence, identical to `PhysicsKeys` (`FieldCrc.ts:62-66`).

**Confirmed real bug in the part that's wrong: each double constant is
hashed by its raw IEEE-754 bit pattern, low 4 bytes only — not by its
numeric value.** `GetConstantCRC` does `*(_QWORD*)buf =
(__int64)constants->dWalkForce` (a raw memory copy of the double's 8-byte
bit pattern into a buffer, not a value conversion) then calls
`GetCrc32(buf, 4, ...)` — **only the low 4 of those 8 bytes** get hashed.
For a typical non-trivial double value this low-32-bits slice is
essentially mantissa noise with no numeric relationship to the constant's
value at all (e.g. the double `800.0` is encoded as
`0x4089000000000000`; its low 4 bytes are `0x00000000`, not `800`).
`FieldCrc.ts`'s `crcInt(readDouble(physics, key), crc)` instead does
`data | 0` — truncates the double to its *integer value* — before feeding
4 bytes to the CRC. These two operations only coincidentally agree for
the rare case where a constant's low-32-bits-of-bit-pattern happen to
equal its truncated integer value (essentially never, for real WZ
physics constants). So if this function were ever exercised, its output
would not match the real client's for any field with this shape — same
root issue likely applies to the foothold/ladder/portal int fields too,
though those use `readInt` (plain integers, not doubles), so
**`computeSpace2D`/`computePortalList`'s integer fields are probably fine
on the encoding question** — this bug appears confined to
`constantCrc()`'s double-valued physics constants specifically. Not
verified whether `crcLong`'s bigint-based portal-position packing has its
own analogous issue — its inputs are already int32 x/y, not doubles, so
likely fine, but not independently traced against a real portal-CRC
function (none was found/searched this pass — `computePortalList`'s
exact OG counterpart wasn't located).

**This is dead code right now, not an active bug:** grepped the whole
`src/` tree for `FieldCrc` — `compute()` has zero callers anywhere in the
codebase. So today this has no visible effect on gameplay or network
behavior; it's only a latent bug waiting to surface if/when this module
gets wired into an actual CRC handshake with a server. Logging now so
whoever wires it up later doesn't inherit a silently-wrong hash.

## Fortieth pass (self-directed): `MobLook.OnHit` always plays the same hit animation; OG randomizes among the mob's actual hit-variant count

Looked at `MobLook.ts` (230 lines, zero OG citations) next, as the
render-side complement to the `MobController`/`CMob` AI work from a few
passes ago. Most of the file is generic WZ-driven animation plumbing with
no formula to verify, but `OnHit()` (`MobLook.ts:133-136`) — always
`SetState(MobState.Hit)`, i.e. always plays the `"hit1"` animation node —
stood out against the state enum already defining `Hit2`/`Hit3`/`HitF`
that nothing in this file ever transitions into.

**Confirmed real gap.** `CMob::GetRandomHitAction` (0x639f70): `if
(nHitCount <= 0) return -1; else return rand() % nHitCount + 7` — OG picks
a random hit-reaction animation from the mob's own `nHitCount` (a
per-mob template stat, how many numbered hit-variant nodes that
particular mob actually has in Mob.wz), offset by a base action-index of
7. `MobLook.OnHit` instead unconditionally plays the same single `hit1`
animation for every hit on every mob, regardless of how many hit variants
that mob's WZ data actually defines. Checked `MobInfo.ts` for a hit-count
field to see if this was just unwired data — it isn't: no
`hitCount`/`nHitCount`-shaped field is loaded from WZ anywhere in
`MobInfo.ts`, so (consistent with the attack-hitbox finding two passes
back) this is a missing-data gap, not just an unwired one. Net visible
effect: mobs with multiple hit-reaction poses (common for humanoid-style
mobs) look more repetitive in this port than in OG, where getting hit
plays a randomly-varied stagger animation.

This closes out this session's `CMob`/`MobLook` combat-animation thread.
Not chased further: whether `nHitCount` (and the action-index-7 base) is
derivable from the same Mob.wz node enumeration `MobLook.Load` already
walks (likely yes — it would just be "how many of hit1/hit2/hit3/hitF
exist for this mob," which `MobLook._anims`'s `Map` already implicitly
knows the populated keys for, so this might be a near-trivial fix using
data already in hand rather than requiring new WZ parsing — worth
revisiting before assuming it needs the same heavier lift as the
attack-hitbox gap).

## Forty-sixth pass (self-directed): the real EXP table — found via byte-pattern scan, resolves the Forty-first pass's open thread

The Forty-first pass confirmed `StatusBar.nextExp` is wrong/static but
couldn't locate the real per-level EXP table via name search. Different
technique this pass: wrote a one-off IDAPython script
(`tools/ida_scan_exp.py`, deleted after use) that scans every data
segment for a literal run of int32s matching the historically-known
first 9 v95-era EXP-to-next-level values (15, 34, 57, 92, 135, 372, 560,
840, 1242) — treated as an unverified hypothesis going in, not assumed.
**Found exactly one match**, at `0xc6d3b4` (no symbol name, no static
xrefs found — likely accessed through a runtime-computed base pointer
IDA can't resolve statically, not chased further).

Dumped the next 250 int32s from that address to confirm it's the real
table and not a coincidental partial match:
- Strictly monotonically increasing from index 0 (level 1→2 = 15) through
  index 198 (level 199→200 = 1,105,103,527).
- **Index 199 (level 200) = 0** — exactly matches MapleStory's level cap
  of 200 (no further EXP needed once maxed). This specific detail (the
  table terminating at exactly the real level cap with a zero sentinel)
  is strong independent confirmation this is the genuine table, not an
  unrelated coincidental run of increasing numbers.
- Data past index 199 is garbage/unrelated (a short run of small values
  then clearly non-table noise) — confirms the table's real length is
  199 entries, not more.

This resolves the open thread: the real per-level EXP table exists at a
fixed `.exe` address with the exact values needed, but has no symbol/code
xref this dump can show, so wiring `StatusBar.nextExp` correctly would
mean either hardcoding this verified 199-value table as a TS constant
array (straightforward, values are now fully extracted and confirmed) or
finding the actual accessor function (not done — the missing xrefs mean
this would need manual byte-pattern tracing of nearby code, not a name
search). Logging the table's existence and exact values here rather than
leaving it as "still not found." **Saved the full extracted/verified
table as `src/character/NextLevelExpTable.ts`** (not wired into
`StatusBar` yet — per this session's "investigate and log, don't fix
without asking" convention — just the verified data asset, ready for
whoever wires it up).

## Forty-first pass (self-directed): `StatusBar.nextExp` is never updated — the EXP bar percentage is wrong for every level except by coincidence

Went looking for an EXP-table formula to verify (level → EXP-required-for-
next-level is one of the most player-visible numbers in the game), and
found something more basic first: `StatusBar.nextExp` (`StatusBar.ts:36`)
is initialized to a hardcoded `100` and **never assigned anywhere else in
the codebase** (grepped all of `src/` for `nextExp` — only the
declaration and the two read sites that compute/display the percentage).
`exp` itself *is* correctly updated from `StatChangedArgs.exp` (wired in
`GameStage.ts:1594` and `:2147`), but its denominator never moves off
100. Confirmed via `PacketArgs.ts`'s `StatChangedArgs` interface that
there's no `nextExp`/`maxExp` field in the wire protocol at all — this
matches real MapleStory's actual design (the EXP-required-per-level table
is not server-sent; it's a deterministic, level-indexed table baked into
the client itself), so this isn't a missing-decode bug, it's a genuinely
missing client-side table/formula.

**Confirmed real, highly visible bug:** the EXP bar's fill percentage
(`this.exp / this.nextExp`, `StatusBar.ts:209`) is computed against a
constant 100 for a character of *any* level. Real MapleStory's per-level
EXP requirement grows roughly cubically with level (tens for level 1,
hundreds of thousands by level 100+, hundreds of millions by level 200) —
so this bar is correct only for the slice of level-1 play where the real
requirement happens to be near 100, and increasingly meaningless at every
higher level (a level 50 character gaining a normal mob's worth of EXP
would show as nearly maxing the bar every single kill, when in reality
it'd be a sliver).

**Not resolved this pass — the real table/function wasn't located.**
Searched IDA for `NextExp`/`ExpTable`/`GetEXPNeed`/`ExpBar`/
`CharacterData::*Exp*`/`GetExp` — none of the natural name guesses hit a
function that looks like the real per-level EXP table. It's plausible
this is a raw `.rdata` array indexed directly (`g_anNextExp[level-1]` or
similar) with no wrapper function, which wouldn't surface via a name
search the way a real method would — would need a different search
strategy. One specific wrong lead worth recording so it isn't retried:
`CHARLEVELDATA`/`CHARLEVELDATA::LoadCharLevelData` (0x6fd040) looked
promising from its name and from showing up as a local (`CHARLEVELDATA
*v55`) inside `CWvsContext::OnStatChanged` (0x9fd5d0, the function that
processes the level-change branch) — but checking its actual callers
(`CSkillInfo::LoadCharLevelData`, `SKILLENTRY::GetCharLevelData`) shows
it's per-job **skill** data keyed by level (Evan's evolving-dragon-skill
unlocks specifically — `OnStatChanged` references it right next to an
`is_jobchange_level_in_evan` check), not the player's own EXP-to-next-
level table. Ruled out, not the right thread.

Also checked whether the table might be WZ-data-driven rather than
exe-baked (some MapleStory-derived data lives in WZ, not code) — wrote a
quick `WzPackage.Open` inspection script and listed `Etc.nx`'s top-level
contents directly (`BlockReason.img`, `CashPackage.img`, `MakeCharInfo.img`,
`MapObjectInfo.img`, `SetItemInfo.img`, etc. — full list checked, nothing
exp/level-table-shaped). Rules out the "it's actually in WZ" hypothesis;
reinforces that it's baked into the executable as code/data, consistent
with the original name-search approach, just not yet located by it.
Flagging as genuinely unresolved rather than guessing at a formula —
unlike the damage-display bugs found earlier this session, I don't have
a confirmed real formula to compare against here, only confirmation that
the *current* client-side value is definitely wrong/static.

**SHIPPED (waterfall implementation pass, resuming from the chronological
start of this audit per "start from phase 1"):** the Forty-sixth pass
(below) found and verified the real table and saved it as
`NextLevelExpTable.ts`, but its own header comment said "NOT yet wired
into StatusBar" — found still true when re-checked (zero importers).
Wired it into both `GameStage.ts` level-set sites (`SetField`'s initial
`stat.level` and `StatChanged`'s `args.level`): `_statusBar.nextExp =
NextLevelExpTable[level - 1] ?? 0`. Also deleted the now-clearly-inferior
`domain/ExpTable.ts` (a hand-written growth-rate-formula guess, zero
importers, flagged in the "Orphaned files" section below) now that the
real decompile-extracted table is actually wired and proven correct.
Test: `tests/character/NextLevelExpTable.spec.ts`.

## Forty-second pass (self-directed): `SecondaryStat::GetACC`/`GetEVA` found — confirms the real ACC/EVA shape, but the DEX/LUK-to-base-stat link is buried in a function too large to trace this pass

Continuing the loose thread Thirty-eighth pass left open ("accuracy/
avoidability formulas were not checked"). Found the real functions —
`SecondaryStat::GetACC` (0x7261d0) and `GetEVA` (0x7262a0) — via direct
name search, and traced their only non-combat-calc caller via xrefs to
`CUIStatDetail::Draw` (0x8625f0), the actual stat-window UI function.

**Confirmed real shape, partially.** Both functions share the same
structure: `total = nBaseXXX + nBuffStat (this->nACC/nEVA) +
GetIncACC/GetIncEVA(equip bonuses); if (itemRate% > 0) total +=
total * itemRate% / 100; clamp(0, 9999)`. So the real stat is base +
flat buff + flat equip bonus, *then* a final percentage-rate equip bonus
applied multiplicatively on top of that sum — not simply summed flat.
`StatDerived.computeDerived`'s `acc`/`eva` (`StatDerived.ts:58-59`) are
flat sums only (`dex*0.8 + luk*0.5 + accBonus`) with no equivalent of the
final %-rate multiplicative step, and no 9999 cap. Confirmed mismatch on
that part.

**Not resolved — the part that would let me confirm or deny the DEX/LUK
weights (0.8/0.5 for ACC, 0.25/0.25 for EVA) is buried in
`CUIStatDetail::Draw` itself, not in `GetACC`/`GetEVA`.** `nBaseACC`/
`nBaseEVA` are *parameters* to these functions, computed by the caller —
and `CUIStatDetail::Draw` is a single, enormous, COM/VARIANT-saturated UI
function (the same class of function as `CDropPool::Update`/`CMob::
GenerateMovePath` from earlier passes — not feasible to read end-to-end
in this pass). The fragment around the `GetACC` call site shows
`nBaseACC` being built from what look like equip/mount-related terms
(`pEquip`/`pTamingMobTemplate*1.2`-shaped expressions — variable names are
decompiler register-reuse artifacts, not reliable type info), not an
obviously-DEX/LUK-shaped expression — but the actual DEX/LUK→base-ACC
step, if it happens at all in this exact function, could easily be a few
hundred lines earlier in the same function and wasn't traced. **Do not
treat `StatDerived.ts`'s 0.8/0.5 and 0.25/0.25 DEX/LUK coefficients as
either confirmed or refuted by this pass** — only the multiplicative
%-rate/cap mismatch above is solid. Revisiting this properly would mean
either reading `CUIStatDetail::Draw` in full or finding a smaller,
dedicated "base ACC from stats" helper this search didn't surface.

## Forty-third pass (self-directed): `ItemInventory.applyOps`'s "move" op (type 2) is actually a swap in OG; type 4 is `SetEXP`, not unknown

Moved to a fresh area: inventory operations. `ItemInventory.applyOps`
(`ItemInventory.ts:180`) mirrors server-sent `InventoryOperation` ops
(add/quantity/move/delete/unknown-ignored) — confirmed this is the right
shape (the server owns stacking/slot logic, the client just mirrors it,
same pattern already established for drops), so went straight to the
real wire handler, `CWvsContext::OnInventoryOperation` (0xa08a70,
decompiled in full), to verify each op type's exact semantics.

**Confirmed real bug — op type 2 is a swap, not a plain move.** OG's
`case 2` reads a destination position, fetches **both** the item
currently at the destination (`pPreSwap`) and the item at the source
(`pSwap`), then does `SetItem(tab, srcPos, pPreSwap)` followed by
`SetItem(tab, destPos, pSwap)` — i.e. it unconditionally exchanges
whatever occupies both slots, exactly modeling a drag-item-B-onto-item-A
reorder. `ItemInventory.applyOps`'s `case 2` (`ItemInventory.ts:198-206`)
only handles the empty-destination case: it moves the source item to
`newPos` and updates `_slots` for the source, but never looks at what was
already at `newPos`. If the destination slot already holds an item (the
common case for "swap to reorder" drags), that displaced item's
`_slots` map entry gets silently overwritten by the incoming item — the
displaced item stays in `_items` with its old, now-wrong `.slot` value,
becomes unreachable via `_findSlot`/`itemIdAt` at its real position, and
two items end up claiming the same rendered slot. Real, visible inventory
corruption on any same-tab item swap; not fixed, logged only.

**Resolved the existing "??? — ignore" comment — op type 4 is
`GW_ItemSlotBase::SetEXP`, not actually unknown.** It decodes a 4-byte
value and calls `pEquip->SetEXP(value)` on the item at the given
position — an equip-item growth/EXP value (distinct from the player's
own EXP; this is a per-item stat some equip mechanic increments).
`applyOps`'s `case 4: // ??? — ignore` silently drops this, meaning if
this server/feature set ever sends it, the equip's EXP value in this
client's item model would go stale with no visible symptom until/unless
something reads it. Lower severity than the swap bug (the field may
never be exercised depending on what equip-EXP mechanics this server
implements — not checked), but worth fixing alongside it since the real
semantics are now known instead of a guess.

Also confirmed in passing: op type 3 (delete) has a real OG side effect
not modeled here — deleting the item a sitting character's chair-summon
is bound to (`m_nPortableChairID`) triggers an automatic stand-up request
(`CWvsContext::SendGetUpFromChairRequest`). Niche (only matters if a
player's chair item is removed from inventory while seated, e.g. via a
trade or NPC sale mid-sit), not chased further.

## Forty-fourth pass (self-directed): `CMob::ShowDamage` fully decompiled — closes the Twenty-ninth pass's "only partially matches" note with the exact jitter/stacking formula

The Twenty-ninth pass (much earlier this session) flagged
`CMob::ShowDamage` as revealing "deterministic crit-jitter/zigzag-stagger/
mob-head-anchor nuance our `DamageNumber.ts` only partially matches" but
didn't pin down the exact formula. Decompiled it in full this pass
(0x63c950) to close that thread properly.

**Confirmed real bug — our random jitter should be a deterministic,
facing-aware alternation, not `Math.random()`.** Real horizontal jitter:
`v14 = (bCriticalAttack % 2 != 0) ? 15 : -15`, then *sign-flipped again*
if the mob is facing a particular direction (`bNoFlip` set, or the
move-action's facing bit) — so the X offset is a deterministic ±15px
driven by a hit-counter's parity (passed in as `bCriticalAttack`, which
despite the parameter name is reused here as an alternating hit-index, not
purely "is this a crit") XORed with facing direction, never random.
`DamageNumber.Add` (`DamageNumber.ts:59`) uses
`Math.random() * 20 - 10` — a uniformly random ±10px spread with no
relationship to hit order or mob facing at all.

**Confirmed real, unmodeled mechanic — `ZigZagDamage` multi-hit vertical
stacking.** The real Y offset is `ZigZagDamage - bCriticalAttack *
(bHalfHeight ? 15 : 30) - 15` — `ZigZagDamage` is a caller-supplied,
per-hit-in-this-batch offset (so simultaneous multi-hit attacks, e.g.
multi-target skills hitting one mob, or a single skill's multiple hit
ticks, stack their damage numbers vertically in a zigzag instead of
overlapping at the same point) and crits get an *additional* upward push
of 15 or 30px (halved for `bHalfHeight`-flagged, i.e. small, mobs) on top
of a flat 15px base offset. `DamageNumber.Add` spawns every number at the
same `worldY` regardless of how many hits land together, and applies no
crit-specific vertical offset at all — multi-hit combos in this port will
visually overlap where OG staggers them, and crits don't render higher
than normal hits.

**Confirmed: real damage-number anchor point is per-mob, not the impact
position — and confirmed this client uses a flat constant instead.** OG
fetches a position from `m_pvcHead` (a vector array, indexed by a
parameter — likely a per-action/per-frame anchor table, akin to
`CAvatar`'s muzzle/body/face origin getters confirmed in the Thirtieth
pass) rather than just using the mob's raw position. Checked the actual
callers: both call sites (`GameStage.ts:1971`, `GameStage.ts:2518`) pass
`mob.Position.y - 60` — a single hardcoded offset used for every mob
regardless of its actual sprite height. Checked `MobInfo.ts`/`MobLook.ts`
for any per-mob height/head-anchor field that's just unwired — there
isn't one (same recurring pattern as the attack-hitbox and hit-count
gaps from earlier passes: per-mob WZ geometry data isn't loaded at all
here, not just unused). Confirmed real, additional gap: a giant boss's
damage numbers would render too low (inside its body) and a tiny mob's
too high (floating well above its sprite) with the current flat -60.

## Forty-fifth pass (self-directed): NPC dialogue/script handling — confirmed fully covered, all 10 real dialog subtypes already decoded

Picked a fresh area per the user's request: NPC interaction. `NpcLook.ts`
(193 lines) mostly mirrors `MobLook.ts`'s already-verified shape (WZ
action-state animation playback), nothing new to check there. The
content-bearing system is NPC conversation — went to IDA for the real
script-dialog engine rather than assuming this client's coverage.

**Confirmed: NPC scripts are server-executed content streamed to the
client as typed dialog packets — no client-side script logic to port,
and confirmed this client already decodes every real dialog subtype.**
`CScriptMan::OnAsk*`/`OnSay*` (0x6dbaf0-0x6ddbe0) are the real packet
handlers: `OnSay`, `OnSayImage`, `OnAskYesNo`, `OnAskMenu`, `OnAskText`,
`OnAskBoxText`, `OnAskNumber`, `OnAskAvatar`, `OnAskMembershopAvatar`,
`OnAskPet`, `OnAskPetAll`, `OnAskQuiz`, `OnAskSpeedQuiz`,
`OnAskSlideMenu` — each just decodes one dialog-window *type* (text,
yes/no, menu, number input, avatar/pet picker, quiz, slide menu) and
displays it; the actual conversation branching/content is server-side
script execution, not in this binary at all. Cross-checked against
`FieldHandlers.handleScriptMessage` (`FieldHandlers.ts:1820`) — it
already has a `case` for every one of these subtypes (`Say`/`SayImage`/
`AskYesNo`/`AskAccept`/`AskMenu`/`AskText`/`AskQuiz`/`AskBoxText`/
`AskNumber`/`AskAvatar`/`AskMemberShopAvatar`/`AskPet`/`AskPetAll`/
`AskSlideMenu`) and a real `onScriptMessage` wiring (`GameStage.ts`).
This is one of the few passes this session that ends with "fully
covered" rather than a finding — confirmed rather than assumed, per the
standing rule that "nothing to find" still needs to be checked, not
inferred from the architecture pattern alone.

**Confirmed niche, very low priority:** OG completely suppresses the
floating number for `nDamage == 0` hits on one specific mob template
(hardcoded ID 9400752, plus a second template resolved via a data
pointer not chased down) — almost certainly an invincible/training-dummy
mob whose "no damage" hits shouldn't show a "0". Not worth porting
without knowing which specific mob(s) this targets in this client's
content.

## Thirtieth pass: `CAvatar`'s action-resolution tables, and the real avatar-spawn-on-field-entry pipeline

Asked to go deep on `CAvatar`, `CUser`/`CUserLocal`, and 5 broad topics
(Combat Integration/Character Config UI/Input Handling/Character Spawning
on Map Load/Character Graphics Loading). `CUser`+`CUserLocal` combined are
511 methods — confirmed too large to decompile exhaustively, so (per the
user's own choice when asked) picked the single most player-visible gap
and went deep on it instead of touching everything shallowly: the real
avatar-spawn-on-field-entry pipeline. `CAvatar` itself (91 methods) got a
full pass first since it directly informs that pipeline.

**`CAvatar` — confirms and closes a previously-flagged unknown:**
`CAvatar::MoveAction2RawAction` (0x45fa30) **is** the "internal action-id
table" earlier flagged (Twenty-fifth pass, `Effect_SkillPrepare`
investigation) as "this dump doesn't expose" for `SKILLENTRY::
GetRandomAppointedAction`. Confirmed: it's a per-appearance-state remap
table — a giant switch gated almost entirely behind
`this->m_dwMorphTemplateID` (monster/hide-morph items) or
`this->m_nGhostIndex` (ghost status), each remapping the same raw stance
index to a *different* animation-set number depending on which special
appearance is active. For a normal, unmorphed player (the overwhelming
common case, and the only case this client needs to support — no morph
item system exists here) the table is effectively a pass-through. Net
effect: the existing `MoveActionToStance`/`PlayOneTimeAction` approach
remains correct for normal play; this table would only matter if a morph/
ghost system ever gets built, which is its own, much bigger, separate gap.
Also found `CAvatar::ConvertCharacterAction` — collapses several distinct
move-action codes (various jump/fall sub-states) onto one shared raw
action (48), confirming multiple `Stance` enum values are meant to render
identically in OG; not cross-checked against our own `Stance.ts` enum for
unnecessary duplication, but worth a follow-up look.
`CAvatar::GetSuitableMuzzleOrigin`/`GetBodyOrigin`/`GetFaceOrigin` are
simple cached-vector getters (`m_pMuzzleOrigin`/`m_pBodyOrigin`/
`m_pFaceOrigin`, plus `m_pTMMuzzleOrigin` for taming-mob mounts) — they
don't show where the vectors are populated from, but their existence
*confirms* OG has the exact same "named per-frame anchor points" concept
`CharacterRenderer.AvatarAnchors` already implements (built 2 sessions
ago) — no contradiction found, no fix needed.

**Avatar-spawn pipeline — re-routed after a wrong initial guess, then
confirmed clean:** `CField::ApplyUserLook` (which I assumed was the
spawn trigger) turned out to be a niche, unrelated feature — a per-map
conditional "force this costume/look" system (checks a list of
`UserLook::IsCondTrue` conditions, calls `ForceLook` if one matches),
not general avatar creation. The *real* spawn functions are
`CUserPool::OnUserEnterField` (0x94db40) and `CUserPool::CreateLocalUser`
(0x94c220), both decompiled in full. `OnUserEnterField` constructs a new
`CUserRemote`, calls `CUserRemote::Init(packet, isPartyMember, true)` —
then **calls `field->DecodeFieldSpecificData(pUserRemote, iPacket)`** on
the *same packet*, meaning `UserEnterField`'s wire format has a trailing
chunk whose shape depends on the active `CField` subclass (`fieldType` —
the same unparsed property from pass 27). Checked
`FieldHandlers.handleUserEnter`: it decodes exactly through the base
avatar fields (guild/look/job/hair/face/sex/x/y) and stops — no attempt
to read a trailing chunk. **Confirmed safe, not a bug**: packets in this
codebase are length-delimited per-message (verified via the `InPacket`/
router framing this whole session's tests rely on), so leaving trailing
field-specific bytes unread cannot desync subsequent packets — it only
means this client silently drops extra per-field-type entrant data (e.g.
team/CP info for `MonsterCarnival`-type maps) for the 10 already-scoped-
out minigame field types (pass 29). For the default field type (ordinary
gameplay maps, by far the common case), the spawn pipeline is correct as
decoded today.

**Not chased this pass** (explicit scope decision, not an oversight):
the other ~500 `CUser`/`CUserLocal` methods, "Character Configuration UI,"
"Input Handling," and "Combat Integration" as broad topics — each would
need its own scoped pass rather than a shallow pass-through of 511
methods. `CMobPool`'s 30 methods (find-hit-in-rect/trapezoid/triangle
variants for AoE skill targeting) were listed in pass 29's investigation
but not decompiled individually.

## Twenty-ninth pass: verifying claims about `CShip`, 10 minigame `CField_*` subclasses, and `CMob`/`CMobPool` combat effects

Continuing the standing "go deep, verify every claim" rule against a list
of specific assertions given to me this pass — most checked out, one was
wrong and corrected, and the minigame-class survey corrected a wrong
"zero implementation" assumption I made initially.

**`CShip`/`CField_ContiMove` claims — 3 of 4 confirmed exactly, 1 wrong:**
Re-verified `EnterShipMove`/`LeaveShipMove`/`DisappearShip` against the
exact claimed mechanics (dock⇄away slide over `tMove`s; alpha 255→0 fade)
— **all three match precisely**, down to the literal `raw_Move`/`RelMove`
call sequence. **`AppearShip`'s "Balrog type" label is wrong** — checked
`CField_Balrog` directly: it has only a constructor/destructor/
`GetFieldType`, zero ship-related code, doesn't inherit from
`CField_ContiMove`. The kind-1 fade-in mechanism (`m_nShipKind==1`) is
real, but it's a generic alternate presentation mode for *some*
`ContiMove`-classified map, not Balrog specifically — and it's not "just"
a fade: `AppearShip` simultaneously jumps the ship's position to an
offset point (`m_x ± 100` by flip, `m_y - 100`) and tweens *both* alpha
(0→255) and position (offset→dock) together over `tMove` seconds, plus a
`CSoundMan::PlayBGM` (background music swap, not a sound effect) — richer
than "fades in" alone.

**10 minigame `CField_*` subclasses — all 10 one-line descriptions given
to me checked out factually** (verified via method signatures, e.g.
`OnTournamentMatchTable`⇒"brackets", `OnHealerMove`/`OnPulleyStateChange`
⇒"healer/pulley", `OnMassacreIncGauge`/`_SetDecGauge`⇒"gauges") — unlike
the Ship claim above, none of these were wrong. **But my own first-pass
assumption that all 10 have "zero implementation" in this client was
wrong** — corrected after actually grepping for handlers instead of
guessing:
- **Decoded already** (opcode-level, found in `EventHandlers.ts`/
  `FieldHandlers.ts`/`TournamentHandlers.ts`): `SnowBall`, `Coconut`,
  `GuildBoss`, `MonsterCarnival`, `Tournament`. Five of ten already have
  real wire-protocol coverage from earlier audit passes — no visual/UI
  for any of them, but the byte-level work is done.
- **Partially decoded**: `Wedding` — the social/gift side
  (`WeddingGiftResult`/`NotifyWedding`) is decoded, but `CField_Wedding`'s
  own ceremony-specific packets (`OnWeddingCeremonyEnd`/
  `OnWeddingProgress`/`SetBlessEffect`) are not — confirmed via grep,
  zero hits for "WeddingCeremony"/"WeddingProgress"/"BlessEffect".
- **Named but not wired**: `AriantArenaResult = 354` exists as an opcode
  constant in `OpCodes.ts` but has no registered handler anywhere.
- **Completely missing, not even an opcode name**: `Battlefield`,
  `Witchtower`, `Massacre` — confirmed via case-insensitive grep across
  `OpCodes.ts`, zero hits for all three.
All 10 remain real, scoped, low-priority items individually (each is a
self-contained event/minigame system) — not chased further into their
own per-class wire formats this pass.

**`CMob`/`CMobPool` combat effects — real nuance found in damage-number
display, comparable to the avatar-anchor work from 2 sessions ago:**
`CMob::ShowDamage` (0x63c950, decompiled in full) is the real OG
damage-number trigger, calling `CAnimationDisplayer::Effect_HP`/
`Effect_Miss`. Confirmed details our `DamageNumber.ts` only partially
matches:
- Anchored to `m_pvcHead` — mobs have their own dedicated head-anchor
  vector, the same underlying concept as the avatar `HeadPosition`/
  `NavelPosition`/etc. anchors built earlier (`CharacterRenderer.
  AvatarAnchors`) — not yet given an equivalent on `MobLook`.
- Critical hits get a **deterministic** ±15px X offset (direction set by
  `bCriticalAttack % 2` XOR facing, gated by a `bAdjustHeight` flag) —
  `DamageNumber.Add` instead applies a **random** ±10px spread
  unconditionally to every number, crit or not. Close in spirit, not
  byte-exact.
- A `ZigZagDamage` parameter staggers multiple simultaneous hit numbers
  vertically — not modeled; our multi-hit display doesn't currently
  stagger.
- `nDamage < 0` is a heal display (not just `nDamage == 0` → miss) — our
  `DamageKind.HealHp` enum exists and is used correctly elsewhere, just
  noting `CMob::ShowDamage`'s own branch confirms the convention matches.
These are fidelity refinements, not bugs — current behavior is reasonable
and already visually functional, just not byte-exact to OG's deterministic
jitter pattern.

`CMob::OnDie` was decompiled but its drop-spawning didn't appear in the
captured portion — and that's consistent with everything else confirmed
this session about client/server separation: mob death animation is
purely cosmetic, drop items are spawned via the already-decoded, separate
`DropEnterField` broadcast (confirmed working, including the source-position
bug fixed in an earlier pass per `AUDIT_OG_V95.md`) — not a `CMob::OnDie`
client-side side effect. Not re-verified line-by-line this pass, but no
reason to suspect otherwise given the pattern holds everywhere else.

## Twenty-eighth pass: chasing every loose thread from passes 25-27 to its real root (per standing "go deep" rule)

Follow-up on 5 items explicitly flagged last pass as "not yet investigated"/
"lower confidence." Two turned into real, concrete findings (one a
confirmed bug); the rest resolved to honest negative/niche results.

**Confirmed real protocol bug (not just missing — actively wrong) —
`CField::OnFootHoldInfo` / `OutHeader.FootHoldInfo` (176):** Verified via
the literal `case 176` in `CField::OnPacket`'s dispatch that this opcode
*is* `CField::OnFootHoldInfo` (0x53a810, decompiled in full) — settling
last pass's "lower confidence" `CField_DynamicFoothold` question. The real
wire shape is: `int count`, then per entry: `string objName, int
nCurState, int snCount, snCount×int footholdSN`, then **if
`nCurState==2` (moving)**: `int nSpeed, nX1, nX2, nY1, nY2, nCurX, nCurY`,
`byte bReverseVertical, bReverseHorizontal`. `FieldHandlers.
handleFootHoldInfo` decodes something else entirely —
`count + N×{id:short, x1,y1,x2,y2,prev,next:short}` (7 shorts, no string)
— which would desync on the very first real packet (reading a
length-prefixed string's bytes as numeric foothold fields). This is a
real bug, not a gap — confirmed dynamic/moving footholds (the
`CField_DynamicFoothold` mechanic) drive through this exact opcode via
`CMapLoadable::FootHoldStateChange`/`FootHoldMove` and
`CWvsPhysicalSpace2D`'s matching physics-side calls, neither of which
exist in this client. Needs: fix the decode shape first (it's actively
wrong for *any* FootHoldInfo packet, not just moving ones), then wire the
moving-foothold case into `FieldScene`'s foothold/physics system.
**SHIPPED the decode-shape half (waterfall implementation pass, "start
from phase 1"); the dynamic-foothold-movement half remains genuinely
not built.** Fixed `FieldHandlers.handleFootHoldInfo` to the real wire
shape (`FootHoldStateEntry`: `objName, curState, footholdSns[]`, plus a
`moving` block when `curState===2`). Also found and fixed a second,
compounding bug while fixing this: the consumer
(`GameStage.ts`'s `fh.onFootHoldInfo`) called `FieldScene.LoadFootholds`,
which **overwrote** `FieldScene`'s correctly-WZ-loaded static foothold
graph with whatever this packet decoded — i.e. even after fixing the
decode shape, receiving this packet would still have wiped the real
collision geometry and replaced it with a sparse dynamic-state list
reinterpreted as static footholds. Static geometry was never supposed to
come from this packet at all (it loads correctly from the map's own WZ
`foothold` node, a separate and already-correct path in `FieldScene`).
Deleted the now-dead, actively-harmful `LoadFootholds` method entirely
and changed the consumer to log-only, since this client has no
`CMapLoadable::FootHoldStateChange`/`FootHoldMove` physics-side
equivalent yet to apply the decoded moving/disabled state to — that part
is still a real, separate, not-yet-built feature (needs a per-foothold
"current state" + position-interpolation system wired into `Foothold`/
`FieldScene`, not guessed at here).

**`CField_ContiMove`/`CShip` — fully confirmed, implementable mechanism:**
`CShip` (7 real methods) has two distinct ship "kinds." Kind 0:
`EnterShipMove`/`LeaveShipMove` snap the ship layer to one x-position then
issue a native `RelMove` tween to the other x-position (same fixed y) over
`m_tMove` seconds, plus a sound cue — confirmed it's a horizontal dock
slide (boat sliding in/out at a pier). Kind 1: `AppearShip`/`DisappearShip`
do the same via an alpha fade instead of a position slide. Separately,
`MoveShip()` is a continuous *idle* random bob/drift within
`[m_limit_x0,m_limit_x]`×`[m_limit_y0,m_limit_y]` bounds, 1-2s per leg —
the boat gently rocking while docked, independent of the dock/undock
slide. Driven by opcodes **164 (`ContiMove`: sub-actions
start(8)/move(10)/end(12)) and 165 (`ContiState`)** — confirmed via grep,
neither exists in `OpCodes.ts`/`FieldHandlers.ts` at all. Exact WZ property
key names for `CShip::Init`'s fields (`m_x0`/`m_x`/`m_y`/`m_tMove`/
`m_nShipKind`/`m_limit_*`) weren't resolved from the strings table, but the
field *meanings* are unambiguous from usage — enough to implement against.

**`CField_LimitedView` — no new info beyond pass 27** (already fully
covered: `DrawViewrange` punches a per-player visible circle into a full
black canvas, called every frame). Re-confirming here only because it was
one of the 3 originally-requested classes — not a new finding.

**`FOLLOWINFO`'s `CParticleEffect` — investigated, real but niche:** only
6 methods, thin wrapper around a `FOLLOWINFO`. Its only real caller is
`CItemEffectManager::LoadItemEffect(itemId, ...)` — this is the cash-shop
cosmetic item particle system (rings/wings/auras that float around or
follow the avatar based on an equipped item's ID). Confirmed real,
confirmed niche/low-impact — not chased into `CItemEffectManager` itself.

**`CField::LoadMap`'s `Restore*` sequence — confirmed real, mapped:**
`LoadMap` (the actual field-entry orchestrator — `CField::Init` itself
calls none of these, correcting an assumption from pass 26) calls, in
order: `RestoreOption` → `RestoreHelpMsg` → `RestorePeculiarInfo` (which
itself calls `RestoreUserInfo`) → `RestoreSeat` → `RestoreClock` →
`RestoreToolTip` → `RestoreWeatherMsg`, plus `CPortalList::RestorePortal`
(a separate subsystem, which calls `RestoreTownPortal`) elsewhere. Not
every individual one was decompiled in full, but the real call graph and
2 individual trigger sites were confirmed via xref (not assumed). The
shared shape: each re-applies field-persistent state the server already
pushed via an earlier packet, needed again after a map reload/re-render.
This client doesn't have a "state survives a field transition" concept at
all as far as this pass checked — likely a real, if diffuse, gap class
rather than one fixable item. `RestorePhaseBG` is NOT called from
`LoadMap` — its trigger is still unknown.

**Skill.wz's `hit` node — extensively searched, genuinely not found
(documented negative result so this isn't re-investigated from scratch):**
Per the standing "go deep" rule, checked every plausible consumer before
giving up: `CUser::ShowSkillEffect` (2235 lines), `CMob::ShowHitEffect` +
`CMob::OnHit` (the mob-takes-damage handler, 14 params), `CUserLocal::
TryDoingMeleeAttack` (2658 lines), `TryDoingShootAttack`+
`TryDoingMagicAttack` (4062 lines combined), and `CBullet` (the
projectile base class — confirmed bullets are purely cosmetic flight
animations with no collision/impact method of their own, damage is
already resolved server-side before the bullet visual registers). None
reference a Skill.wz `hit` lookup. Either it's unused/leftover WZ data in
this client build, or its consumer is somewhere not yet checked outside
combat code entirely (e.g. a UI tooltip preview) — not a rendering-pipeline
gap as originally assumed.

Boss timers (`OnZakumTimer`/`OnHontailTimer`/`OnChaosZakumTimer`) were
**not** re-chased this pass (still at pass 26's "found, not deep-dived"
status) — deprioritized in favor of the above given time budget; same
niche/low-priority call as before.

## Twenty-seventh pass: `CField_DynamicFoothold`/`CField_ContiMove`/`CField_LimitedView`, and the `fieldType` dispatch root they all hang off

Found something bigger than the 3 requested classes while tracing them:
`CField::FieldFactory` (0x53f220) picks WHICH `CField` subclass to
instantiate per map by reading a `fieldType` int straight off the map's
own `Map.wz/<id>.img/info` node (confirmed via live decompile — string-pool
key 0x6EA). It's a real switch over 35+ values, each a distinct minigame/
event field class (`SnowBall`/`Tournament`/`Coconut`/`GuildBoss`/
`MonsterCarnival*`/`AriantArena`/`Dojang`/`CookieHouse`/`Balrog`/
`Battlefield`/`Wedding`/`Tutorial`/etc., plus the 3 below) — `fieldType` is
not parsed anywhere in `MapInfo.ts` (confirmed via grep, zero hits), so
every map in this client is treated as the generic default field
regardless of its real classification. Most of those 35+ values are
niche, self-contained minigame systems (own UI + own protocol, not a
"finish wiring" task) and not worth chasing individually — but the 3
requested ones are real, player-visible mechanics on ordinary gameplay
maps, not minigames:

- **`CField_ContiMove`** (`fieldType=2`) — the moving-ship mechanic
  (boat travel between towns, e.g. Orbis ferry/Nautilus). At the `CField`
  level it's almost a pure pass-through: `Update()` just calls
  `CField::Update`, and the actual ship animation is delegated to a
  separate `CShip` member (`m_ship`) via 4 methods —
  `EnterShipMove`/`LeaveShipMove`/`AppearShip`/`DisappearShip` — driven by
  two confirmed-missing opcodes: **164 (`ContiMove`, sub-actions
  start(8)/move(10)/end(12)) and 165 (`ContiState`)**. Neither exists in
  `OpCodes.ts`/`FieldHandlers.ts` at all (confirmed via grep) — this is a
  real protocol gap, not just a missing visual. `CShip` itself hasn't been
  investigated yet — needed before this is buildable.
- **`CField_LimitedView`** (`fieldType=9`) — confirmed real "dark map"
  mechanic (some dungeon/cave maps render fully black except a circle
  around each player). `Update()` calls `CField::Update` then
  `DrawViewrange()` every frame, which iterates `CUserLocal`+all
  `CUserRemote`s and punches a visible circle for each into a black
  canvas — likely shares its core rendering technique with the
  already-logged Fear/Darkness effect (Twenty-sixth pass) since both are
  "black overlay + circular cutout," but this one is a permanent per-map
  state, not a temporary debuff. Zero implementation in `src/`.
- **`CField_DynamicFoothold`** (`fieldType=29`) — turned out to be close
  to a no-op at this level: `Init()` just calls `CField::Init` with
  nothing else overridden. Whatever "dynamic" foothold behavior exists
  (moving platforms) is either purely server-driven via re-sent
  `FootHoldInfo` packets (already decoded — `OnFootHoldInfo`/
  `RequestFootHoldInfo`) or lives in a different class not yet checked.
  Lower-confidence finding than the other two — needs more digging
  (probably the foothold/`CMapLoadable` system itself) before concluding
  whether there's a real gap here at all.

## Twenty-sixth pass: `CField` (179 methods, verified live via IDA on `Maplestory95.exe.i64`)

`CField` is the per-field controller class. Good news first: every one of
its packet-level handlers (`Clock`/`DestroyClock`/`WarnMessage`/
`SetObjectState`/`StalkResult`/`RequestFootHoldInfo`/`Desc`/`Quiz`/
`PlayJukeBox`/`BlowWeather`/`FieldObstacleOnOff(Status)`/`FieldObstacleAllReset`/
`Whisper`/`GroupMessage`/`CoupleMessage`, etc.) already has a decoded
handler field in `FieldHandlers.ts` from earlier passes — no new opcode
gap found. `IsFlyingMap`/`IsSwimmingMap` are also already correctly wired
(`PlayerController.ts` reads `this._field.Info.Fly`/`Swim` from the same
WZ field-flags, confirmed Phase 29 work).

Two genuine, clean, unimplemented gaps:
- **Fear/Darkness effect** (`InitFearEffect`/`DrawFearEffect`/
  `OnFearEffect`/`IsFearEffectOn`, 0x53a470/0x5399f0/0x53a450/0x52a420):
  confirmed real — a full-screen black overlay (`DrawRectangle(...,
  0xFF000000)`) with a cutout "viewrange" canvas around the player
  revealing only nearby surroundings. The classic MapleStory "Darkness"
  debuff. Its only caller is `CUser::ShowAffectedSkillAni` (0x8eb860) — a
  debuff-applied-by-skill visual hook. Zero hits for "FearEffect"/
  "Darkness" anywhere in `src/` — not implemented at all.
- **`GetMapSpecificEffectUOL`** (0x8eafc0): a per-map screen-effect UOL
  (`m_sMapSpecificEffectUOL`), shown once on field entry for maps that set
  one. `MapInfo.ts` doesn't parse any `effect` field from `Map.wz`'s info
  node — confirmed via grep, zero matches. Directly reusable once parsed:
  same `SkillEffectOverlay.PlayFullScreen` already wired for `FieldEffect`
  subType 3 (`CAnimationDisplayer` plan, Phase 2) would render it.
  **SHIPPED (waterfall implementation pass, "start from phase 1").**
  Verified live against `wz_client/Map.nx`: the real key is a bare name
  (`effect: "Bubbling"`, confirmed on 38 maps, e.g. Aquarium-area maps),
  not a slash-delimited UOL — resolved against
  `Effect.wz/MapEff.img/<name>` (confirmed present:
  `Bubbling`/`NpcReturn`/`NpcSummon`/`Viewrange`). Added `MapInfo.Effect`,
  parsed it in `FieldScene._loadInfo`, and trigger
  `_skillEffects.PlayFullScreen` once per field load in `GameStage
  ._onSetField` exactly as predicted — no new rendering code needed.

Found but not deep-dived (time-boxed out of this pass):
- The `Restore*` family (`RestoreSeat`/`RestoreTownPortal`/`RestoreToolTip`/
  `RestoreWeatherMsg`/`RestorePhaseBG`/`RestoreAllowedItem`/
  `RestoreForbiddenSkill`/`RestoreHelpMsg`/`RestoreOption`/
  `RestorePeculiarInfo`/`RestoreSwinArea`/`RestoreUserInfo`/`RestoreClock`)
  — field-re-entry state restoration, a whole category not checked against
  what this client currently does (if anything) when re-entering a
  previously-visited field this session.
- Boss-specific countdown timers (`OnZakumTimer`/`OnHontailTimer`/
  `OnHontaleTimer` — note the OG typo duplicate, both real entries, not a
  dump artifact —/`OnChaosZakumTimer`) — niche, boss-encounter-specific UI,
  not implemented; low priority given no broader boss-fight UI exists yet
  either.

## Twenty-fifth pass: `CAnimationDisplayer`'s 8 INFO structures, verified live via IDA on `Maplestory95.exe.i64`

Continuation of the `CAnimationDisplayer` plan (`/home/jorge/.claude/plans/
sparkling-greeting-rabin.md`, phases 1-5 already shipped this session).
Decompiled all 8 `::Update`/`Register*` pairs plus xref-traced their real
callers — several initial assumptions (mine and ones given to me) turned
out wrong, confirming the project's established rule of not trusting a
name/description without checking the actual decompile.

**Most actionable, not yet built**: `PREPAREINFO`'s only real caller is
`Effect_SkillPrepare` (0x45b840) — the skill-charging visual shown while a
player holds a charge-type skill key. This is the *exact* "other player is
charging a skill" visual `OpCodes.ts`'s `SkillPrepare`/`SkillCancel` (215/
217) comment already says "can't be reconstructed from here" — that's now
wrong. `SKILLENTRY` caches 3 separate `Effect.wz` UOL strings per skill
(`sKeyDownUOL` for the charging loop, plus two more at fixed struct offsets
for the default-cast and end-of-charge cases), using the identical
`Effect.wz/<name>/<-1..nLast>` path convention already confirmed working
for `Effect_SkillUse` (`SkillEffectOverlay`). We don't have the literal
cached UOL string values, but the skill's existing `effect`/`effect0` WZ
node is the same confirmed-shape approximation already used for skill-use.
Needs: decode `SkillPrepare`/`SkillCancel` payload into a charId-tracked
overlay entry (a "play and hold until canceled" mode `SkillEffectOverlay`
doesn't have yet — it's strictly one-shot today), wire `RemovePrepareAnimation`-
equivalent on `SkillCancel`.

**Confirmed real, behavior simplified by the existing wiring**:
- `SQUIBINFO`'s real behavior is a *continuous* probability roll every
  tick (spawn a random-variant, random-scaled, random-jittered decal each
  time the roll succeeds) for the effect's whole duration — not a single
  one-shot play. Its only trigger is `RESERVEDINFO::Update` →
  `Effect_Reserved` → `CUser::OnEffect` cases 14/20, which IS already wired
  (`GameStage._onUserEffect`, added earlier this session) — but as a
  single `PlayAtCaster` call, not the real repeating scatter. Needs a
  proper probabilistic-repeat mode, not a new trigger.
- `FALLINGINFO`/`FOOTHOLDINFO` (both confirmed tied to melee/shoot/magic
  attack call sites already partially decoded in Phase 5's
  `handleUserAttack`) are completely unimplemented — `ProjectileOverlay`
  only covers the simple caster→target dot, not these. `FOOTHOLDINFO`'s
  name is misleading — it's not about platforms, it's a generic
  flickering/fading decal (random alpha tween in an [a0,a1] range) used by
  many attack types, most likely a weapon-swing dust/trail effect.
  `FALLINGINFO` is a steady one-object-per-tick "rain" within a rect (not
  a single burst), each with native-engine-tweened drift+fall+fade —
  confirmed already as a Shoot/Magic-attack visual (arrow-rain/AOE), not a
  standalone environmental effect.

**Entirely unimplemented, real shape now confirmed**:
- `CHAINLIGHTNINGINFO`: NOT jagged bolts or color presets (that description
  was wrong) — it's a straight line split into ~48px segments, each segment
  a small rotated "ball" sprite (`sBallUOL` + a random/alternating numeric
  suffix 0/1/2, i.e. 2-3 sprite variants) individually positioned+rotated
  along the line. Triggers: certain Magic Attacks and `CSummoned::OnAttack`
  — same `handleUserAttack`/summon-attack family Phase 5 already touches.

**New leads, not investigated yet**:
- `FOLLOWINFO`'s only caller is `CParticleEffect`'s constructor (0x58f5a0)
  — a separate, more general particle-effect class never looked at. Its
  own behavior (angle/orbit tracking around a moving point,
  `bTerminate`/`bPause` lifecycle) is plausible but unconfirmed beyond
  `FOLLOWINFO::Update` itself.
- `REPEATINFO` is not a standalone effect type — it's the generic
  "replay this native layer after N ms" primitive, reused internally by
  `FOOTHOLDINFO`/`FALLINGINFO`/`FOLLOWINFO`/`MOTIONBLURINFO` for their own
  sub-effects, *and* directly by UI: `CUIStatusBar::FlashHPBar`/
  `FlashMPBar` (low-HP/MP border flash — no such flash exists in
  `StatusBar.ts` today), level-up flash, quest-timer teardown. None of
  these UI-flash consumers have been checked for whether they're wired in
  this client at all — separate items once `REPEATINFO` itself is built.
  **Real trigger logic fully decompiled this pass (waterfall
  implementation pass), but deliberately not implemented — blocked on an
  unconfirmed default value, not guessed at.**
  `CUIStatusBar::SetNumberValue` (0x873d50): `threshold = 5 *
  CConfig[34]` for HP (`CConfig[35]` for MP) — a **user-configurable
  warning-percent setting**, not a hardcoded constant (0 = disabled).
  When `100*hp/hpMax < threshold`: flashes **only on the tick HP actually
  decreased** (`this.m_nPastHP > hp`), not continuously while below
  threshold; resets the decrease-tracking baseline to
  `hpMax*threshold/100` whenever HP/MP is at/above the threshold. The
  flash itself is `CAnimationDisplayer::RegisterRepeatAnimation(layer,
  500)` — a 500ms repeat-animate on the HP/MP bar's own layer (`aUi_97`/
  `aUi_23`), i.e. a real WZ-driven blink animation, not an alpha tween
  invented for this. **Why not implemented:** `CConfig[34]/[35]`'s real
  default value isn't visible anywhere in this dump (set by `CConfig`'s
  own constructor/ini-load, not decompiled this pass) — implementing
  with a guessed default would be exactly the kind of fabricated
  constant this project's rules prohibit. Mechanism is otherwise fully
  specified and implementable: needs (1) a `hpWarnPercent`/
  `mpWarnPercent` field in `UserSettings`/`OptionMenu` (same slider/option
  pattern as the existing volume sliders), defaulting to 0 (disabled,
  matching the real code's own "off when zero" branch — safe, not a
  guess), (2) decrease-detection state in `StatusBar.ts` mirroring
  `m_nPastHP`/`m_nPastMP`, (3) a `FlashHp()`/`FlashMp()` method that
  plays the bar's existing WZ blink frames (if the real asset has one —
  not checked this pass) or a simple alpha-pulse fallback otherwise.
- `ONETIMEINFO` (already the model `SkillEffectOverlay` is built on) also
  mirrors a "flip" state from a reference layer every tick, so an effect
  flips when the avatar's facing changes mid-play. Not replicated
  (cosmetic-only gap, no caster-flip-tracking in `SkillEffectOverlay`).

## Twenty-fourth pass: full read-through of avatar/drop sprite rendering core (`CharLook`, `OtherCharLook`, `DropSprite`, `AnimatedSprite`, `WzSprite`, `WzTextureLoader`)

Full line-by-line read of the six files that sit directly downstream of the
entity-parenting bugs passes 21-23 just fixed, all only ever bulk-confirmed
in pass 6's one-line summary and never given a dedicated full read:
`CharLook.ts` (196 lines, despite pass 22 already fixing a real bug in its
`_advanceEmotion`), `OtherCharLook.ts` (78 lines), `DropSprite.ts` (153
lines), `AnimatedSprite.ts` (59 lines), `WzSprite.ts` (51 lines),
`WzTextureLoader.ts` (97 lines), plus every direct caller in
`GameStage.ts`/`FieldScene.ts` per this pass's explicit instruction not to
assume those two files are already fully correct just because passes 21-23
touched them. Found and fixed the most severe rendering bug since pass 22's
"nothing was ever parented into the scene graph" — this time, every
character on screen *was* visible (post pass-22), but rendered as a generic
placeholder rectangle forever, never the player's actual chosen
skin/face/hair/equips.

**Severe, confirmed (FIXED) — `CharLook.SetAvatar` had exactly one real
caller anywhere in `src/` (`CharSelectStage.ts`'s char-select preview
screen) before this fix; neither the local player's own on-field avatar
(`GameStage._player`) nor any other player's inner `CharLook`
(`OtherCharLook._charLook`) ever had it called, so every on-field character
rendered only the generic colored-rectangle placeholder for the entire
audited lifetime of the game, regardless of how correct
`CharacterRenderer`/`CharLook`'s own draw logic is (already verified in full
by pass 22).** Not decompile-checkable (TS-original client-state wiring, no
protocol bytes involved once the data is already decoded) — confirmed by
exhaustively grepping every call site of `SetAvatar` in `src/`: exactly one
hit, in `CharSelectStage.ts`. Traced both real construction sites of
`CharLook` that matter for actual gameplay (as opposed to the char-select
preview, which was already correct):
- `GameStage._player = new CharLook(0)` (constructed once, well before any
  field is ever loaded) — `_player.Load(charWz, itemWz, baseWz, this
  ._loader)` is called once during WZ init (`_initMenu`'s caller), but
  nothing ever called `_player.SetAvatar(...)`. `SetFieldArgs.look` (an
  `AvatarLook`, decoded correctly per the interface's own "4.1 — full
  SetField decode per C++ CField::SetField" comment) is real, live wire data
  carrying exactly what was needed — `_onSetField` read `args.stat`/
  `args.posMap`/`args.portal` off the same payload but never `args.look`.
  Fixed by adding `if (args.look) this._player.SetAvatar(args.look);` right
  after `_onSetField` places the player at the portal, alongside the
  existing `this._player.Position = ...` assignment.
- `OtherCharLook`'s constructor builds `this._charLook = new CharLook(Look
  .skin)` whenever a real `Look` is passed in (from `OtherCharEnterArgs
  .look`, also real, correctly-decoded wire data — confirmed by checking
  `_onUserEnter`'s call site, which already threads `Look` through to both
  the constructor and `LoadSprites()`), but never called `SetAvatar` on the
  inner `CharLook` it just built. `SetAvatar` only ever assigns a field
  (`this._avatar = look`) with no WZ-loader dependency, so it's safe to call
  synchronously in the constructor rather than waiting for the separate
  `LoadSprites()` call. Fixed by adding `this._charLook.SetAvatar(Look)`
  immediately after construction.

Both fixes share the identical root shape every "constructed but never
wired" finding in this audit has had since pass 13: a fully correct consumer
(`CharLook._rebuildDisplay`'s `_avatar === null` placeholder-vs-real-draw
branch, already pass-22-verified) and a fully correct, already-decoded data
source (`SetFieldArgs.look`/`OtherCharEnterArgs.look`), separated by one
missed method call in between. Added `tests/character/AvatarWiring.spec.ts`
(3 tests, reaching into `_avatar`/`_charLook` the same way `tests/map/
FieldScene.layering.spec.ts` below reaches into `_layerContainers` — direct
internal-state assertions, since the bug is specifically about an internal
field never getting assigned) — reverted the `OtherCharLook` fix temporarily
to confirm the new test fails without it (it does, `_avatar` stays `null`)
before restoring. The `_onSetField` half of the fix has no equivalent
fixture to extend (no `GameStage.spec.ts` exists, grepped `tests/` to
confirm zero hits — same standing gap every prior `GameStage.ts`-touching
pass has hit) so was left covered only by `tsc`+manual trace, consistent
with passes 19/21/22's identical judgment call for other `GameStage.ts`
wiring fixes.

**Severe, confirmed (FIXED) — `FieldScene._updateEntityContainers` derived
the player's and every other player's depth-sort layer from a `FootholdId`
field that is NEVER assigned anywhere in `src/`, so both always rendered on
layer 7 (the topmost of 8 layers) regardless of where they actually stood,
defeating the per-layer depth sorting this method's own doc comment claims
exists for them.** Found while re-verifying pass 22's entity-layering fix
end to end rather than trusting it as settled. `CharLook.FootholdId` is
declared `= 0` and grepped exhaustively across all of `src/` — the *only*
writes to it are its own declaration-time default; the only *reads* are the
two lines inside this same method. `OtherCharLook` has no `FootholdId`
property at all, so `FieldScene`'s `'FootholdId' in ch` runtime check for
the other-characters loop always evaluated `false`. Manual reasoning (no
decompile equivalent — this is scene-graph depth-sorting, not a protocol
port): real WZ foothold ids are 1-based, so `LayerOfFoothold(0, 7)` (the
permanent value `player.FootholdId` resolves to) indexes `_footholds[0]`,
which is `undefined` on essentially every real map, falling back to the
`fallback=7` default every single time — meaning the player's own avatar
and every other player have silently always drawn on the frontmost layer,
in front of all terrain on every other layer, since pass 22 first wired
`addChild` at all. Confirmed `PlayerController.CurrentFoothold` (a real,
already-tracked, always-current foothold id) exists but was never the
source either — `CharLook.FootholdId` was simply never connected to
anything. Fixed by deriving the layer for both the player and every other
character the same already-correctly-wired way the drops loop in this exact
method already does it: `this.GetFootholdBelow(entity.Position.x, entity
.Position.y)?.Layer ?? 7`, computed fresh every frame from the entity's live
position rather than from a stale/unassigned id field. `CharLook
.FootholdId` and the now-zero-caller `FieldScene.LayerOfFoothold` are left
in place as harmless dead code (same "genuinely dead but harmless, not
touched" judgment call as pass 21's `_fgContainer`/pass 4's redundant
`Graphics` allocations) rather than ripped out, to keep this fix scoped to
the actual defect.

Added `tests/map/FieldScene.layering.spec.ts` (3 tests: player resolves to
its own foothold's layer, another player resolves to its own foothold's
layer, an entity with no foothold below it falls back to layer 7) —
constructs two real `Foothold` objects on different layers via the existing
public `Footholds` getter (mutable by reference, no real WZ map load
needed, same trick `FieldScene.entities.spec.ts` already established for
testing this class without WZ data) and asserts each mock entity's container
ends up in the *correct* layer container, not just *some* layer container
(the existing `FieldScene.entities.spec.ts` only checks "parented somewhere
under `field.container`", which is too weak to have caught this — it would
pass identically whether every entity landed on the right layer or all
piled onto layer 7). Manually reverted the fix and re-ran this new test
to confirm both player/other-player cases fail without it (they do — `false`
where `true` was expected) before restoring.

**Checked carefully, confirmed NOT a bug — `DropSprite`'s spawn-arc
projectile math (`_parabolicDuration`, the state-1 horizontal/vertical
interpolation in `Update()`).** TS-original animation-feel code, no
decompile equivalent exists — verified by hand-deriving the exact arithmetic
rather than eyeballing it. The vertical term `y = source.y - 400*t +
400*t²` (with `Vy=400`, `t` in seconds) is a clean symmetric upward parabola:
zero at `t=0` and `t=1`, peaking at `t=0.5` (100px above `source.y`) —
confirmed by direct numeric evaluation at 100ms steps. The horizontal
progress fraction `xf` (`min(1,tick/500) + (tick>500 ? min(1,(tick-500)/
max(1,tEnd-500)) : 0)`) looks at first glance like it should range 0→1 but
is deliberately split into two `min(1, ...)`-clamped halves that *each*
reach 1, summing to 2 by `tick=tEnd` for every possible `_tEnd` value
(verified `_tEnd` is always `>=530ms` via `_parabolicDuration`'s `30*(floor
(sqrt(...))+1)+500` floor, so the `tick>500` branch always activates before
`tEnd`) — multiplied by the `* dx * 0.5` at its only use site, `xf=2` lands
exactly on `source.x + dx = ground.x` regardless of `_tEnd`'s value. Hand-
verified both halves independently reach exactly 1.0 at `tick=tEnd` for
`tEnd=530` (minimum) and `tEnd=1000` (the common/default case) — not an
off-by-factor-of-2 bug, just an unusually-written way of writing "ease over
each half of the horizontal distance separately."

**Checked carefully, confirmed NOT a bug — `DropSprite`'s
spawn→ground→bounce state machine (states 1→2→3) and its absorb override.**
State 1 (arc) transitions to state 2 (continued fall, when source is above
ground) or directly to state 3 (ground bounce, when source starts at/below
ground) at `tick >= _tEnd`; state 2 transitions to state 3 when the falling
`y` reaches `_ground.y`; state 3 (`default:` case, since 3 is unmatched by
the `1`/`2` switch cases) loops forever via a sine-wave bob, matching real
MapleStory's idle-drop-bobbing visual. `_absorbing` (driven by `StartAbsorb`)
is checked first in `Update()` and fully overrides the state machine via an
early `return`, with its own independent quadratic ease-in toward a moving
target and a `Finished` flag at completion — internally consistent, no
state leak back into 1/2/3 once absorbing starts (state field is simply
frozen, never read again if absorption completes since the drop is expected
to be removed by its owner at that point).

**Confirmed real gap, NOT fixed (genuinely unreached, not a defect in the
state machine itself — flagged per this pass's "every public method
actually called" instruction) — `DropSprite.StartAbsorb`/`.Finished` are
zero-callers; every item pickup currently just vanishes instantly via array
removal instead of animating toward the player first.** Grepped `StartAbsorb`
and `.Finished` across all of `src/`: zero hits outside `DropSprite.ts`
itself. `GameStage._onDropLeave` (`fh.onDropLeave`'s only handler) simply
filters the drop out of `_drops` by id — it never calls `drop.StartAbsorb(...)`
first. `DropLeaveArgs` already decodes a real `pickUpId` field (confirmed in
`PacketArgs.ts`) that looks like the natural trigger ("this leave was a
pickup by character X, not a timeout/other despawn — animate toward X's
position instead of just vanishing"), but distinguishing a real pickup-leave
from any other `leaveType` value with confidence needs decompile
confirmation of the real `leaveType` byte's enum this audit pass didn't
chase down (out of this pass's 6-file scope, and guessing the wrong
`leaveType` value would misfire the absorb animation on ordinary
despawns) — left as a documented gap rather than guess-wired, same
"needs more client state/protocol confirmation before wiring" category as
several earlier passes' findings (e.g. pass 19's group-chat roster gap).
**SHIPPED (waterfall implementation pass, "start from phase 1").**
Decompiled the real `CDropPool::OnDropLeaveField` (0x511e20) to settle
the blocking question: `leaveType` 2/3/5 (already correctly named
`PickupOther`/`PickedUpByRemote`/`PickedUpBySelf` in `Enums.ts` by a
later pass, with `pickUpId` already correctly decoded only for those 3
values) are confirmed real pickup-leaves; `leaveType` 0 does its own
in-place fade animation in OG (not modeled — cosmetic-only, separate
scope), and 4 is a delayed-fade scheduling path, not an instant removal.
Wired `GameStage._onDropLeave`: when a pickup leaveType's `pickUpId`
matches the local player, calls the existing `DropSprite.StartAbsorb`
toward the player's live position instead of vanishing instantly; every
other case (including pickups by other players, whose position this
client doesn't track per-drop) keeps the prior instant removal. Added a
per-frame `Finished` cleanup sweep alongside the existing `Update()`
loop. New `tests/character/DropSprite.spec.ts` (previously had zero
test coverage) covers the ease curve and a moving-target edge case.

**Checked carefully, confirmed NOT a live bug, hardened anyway (defensive
fix, no behavior change for any of today's real callers) —
`AnimatedSprite.Update`'s frame-advance loop read `this._delaysMs[this
._index]` raw, with no fallback for a `<=0` or out-of-range delay, unlike
the constructor's own `TotalDurationMs` sum two lines above it (which
already falls back to 100ms for any `d<=0`).** A zero/negative delay at the
current index would make `this._accumMs -= 0` never shrink, spinning the
existing `guard++ < 256` cap every single `Update()` call forever without
ever advancing past that frame; an `undefined` delay (index beyond the
`delaysMs` array's length) would make the loop condition always false,
silently freezing the frame index permanently with no spin at all.
Confirmed via grep that both of today's two real construction sites
(`WzTextureLoader.LoadAnimation`'s two `new AnimatedSprite(...)` calls) already
guarantee `delaysMs.length === frames.length` (built in the same lockstep
loop) and every delay is a positive number (`d <= 0 ? 100 : d` already
applied before construction, and the single-frame path hardcodes `[100]`)
— so this was a latent-only gap with no live repro today, not an active
bug. Hardened `Update()`'s loop to apply the same `delay > 0 ? delay : 100`
fallback the constructor already uses, removing the landmine for any future
caller that doesn't pre-sanitize its own delays array.

**Confirmed clean (read in full, no other findings) —** `WzSprite.ToPixi`/
`NewSprite`'s cache-vs-fresh-instance split (re-confirmed pass 22's "many
`CharLook`/`OtherCharLook` instances can share one cached `WzSprite`
simultaneously, hence `NewSprite()`'s no-cache design" reasoning still holds
after this pass's `OtherCharLook` fix — sharing actually happens now that
avatars render for real); `WzSprite.x`/`y`/`visible` proxy getters/setters
(real callers in `BuffList.ts`/`SkillBook.ts`, both via the cached
`ToPixi()` path, confirmed live); `WzSprite.Lt`/`Rb` (parsed from WZ,
confirmed zero readers anywhere outside the class itself — harmless dead
data, not touched, same tier as `CharLook.FootholdId` above);
`WzTextureLoader.Load`'s cache keyed by `WzCanvas` object identity (safe —
WZ package readers return the same canvas instance for the same path on
repeat access) and its `Dispose()` (correctly never calls `texture.destroy()`,
per its own doc comment about the outgoing scene's final render frame;
confirmed `GameStage.ts` calls it on exit alongside every other stage's
identical `_loader.Dispose()` pattern); `OtherCharLook.HitTest`/`SetFacing`/
`SetPosition`/`Update`/`Draw` (all have real callers — `GameStage
._onClickWorld`'s `.find((c) => c.HitTest(...))`, `fh.onUserMove`'s
`.Position =` write, the per-tick `ch.Update(dt)`/`ch.Draw(...)` loops —
confirmed via grep, none are unreached); `DropSprite`'s `_rebuildDisplay`
(called exactly once, from the constructor, not per-frame like `CharLook`/
`OtherCharLook`/`MobLook`/`NpcLook` — correct, since a drop's icon/color/name
never changes after spawn, more efficient than the per-frame-rebuild
siblings, not an inconsistency) and its three render branches (money/
real-icon/colored-placeholder, including the real-icon branch's own
in-source comment confirming an earlier, now-already-fixed "icon loaded but
never actually added to the container" bug from before this pass — re-
verified the fix is real: `this.container.addChild(this._icon.NewSprite())`
is present and correct); `CharLook.StartAction`/`Attack`/`UpdateFromPhysics`/
`_advanceFrame`/`_getFrameDelay`/`ActionExists`/`Draw`/`_addPlaceholder`
(re-read fresh start to finish despite pass 22 already having fixed
`_advanceEmotion` here — no sibling bugs found in the rest of the file
beyond the two confirmed above).

`npx tsc --noEmit`: 0 errors. `npx vitest run`: **511/511 passing across 59
files** (up from pass 23's 505/57 — two new spec files added this pass,
`tests/character/AvatarWiring.spec.ts` (3 tests) and `tests/map/
FieldScene.layering.spec.ts` (3 tests), no existing test broken). Both new
fixtures were verified to actually fail against the pre-fix code (reverted
each fix temporarily, confirmed red, restored) before being counted as real
regression coverage rather than tests that would have passed either way.

## Twenty-third pass: independent verification of pass 22's "nothing renders" fix + a new crash bug found while verifying

Pass 22's claim that no entity container (player/mob/npc/drop) was ever
parented into the Pixi scene graph was severe enough — and contradicts
STATUS.md's claim of CDP-screenshot-verified avatar rendering closely enough
— that it warranted independent verification rather than relaying it as-is.
Full live-server browser verification (real login → char-select → field
load) wasn't practical in this environment (needs a running MapleStory-
protocol backend on the configured login port, which isn't available here),
so verified the actual defect class directly instead: added
`tests/map/FieldScene.entities.spec.ts`, exercising `FieldScene
.UpdateEntities()` with mock player/other-player/drop entities and asserting
their `.container`s end up parented somewhere under `FieldScene.container`
after the call (and that repeated calls don't accumulate duplicate
children). `FieldScene`'s constructor builds `_layerContainers` independent
of `Load()`, so this didn't need real WZ map data — confirmed by reading the
constructor before relying on it. **Confirms pass 22's fix is real**: before
it, none of the mock containers would have had a parent.

**New bug found and fixed while building this verification (manual
reasoning, no decompile equivalent — this is scene-graph bookkeeping, not a
protocol port):** `FieldScene`'s constructor never initialized `_tileLayers`/
`_objLayers` (declared as plain `TileDraw[][] = []`/`ObjDraw[][] = []`) with
per-layer sub-arrays — only `_loadLayers()`, called from `Load()`'s success
path, ever pushes into `_tileLayers[layer]`/`_objLayers[layer]`. If `Load()`
fails before reaching `_loadLayers()` (map id not found in `Map.wz`, logged
via `console.error` and an early `return` — a real, reachable path, not
hypothetical) or is skipped entirely (`_mapWz === null`, e.g. `wzDir` never
configured), `_tileLayers`/`_objLayers` stay `[]`. Pass 21 made `FieldScene
.Update()` run every frame unconditionally from `GameStage.draw()`, and
`UpdateEntities()` (which calls `_rebuildLayerContainers`, indexing
`this._tileLayers[layer]`) is called right alongside it — so any field whose
load failed would now throw `TypeError: ... is not iterable` on the very
next frame and stop rendering entirely, a strictly worse outcome than the
pre-pass-21 silent-no-render state for that one failure path. Fixed by
pre-filling both arrays with `LayerCount` empty sub-arrays in the
constructor, so a failed/skipped `Load()` now degrades to "renders nothing
for this field" instead of crashing the draw loop.

`npx tsc --noEmit`: 0 errors. `npx vitest run`: 505/505 passing (up from
501; 4 new tests added, no existing test broken).

## Twenty-second pass: `MapScene` resolution fix + `CharacterRenderer`/`MobLook`/`NpcLook` full read

Two-part pass. Part A closed the live gap pass 21 explicitly flagged and left
for "whoever next touches `MapScene.ts`." Part B was a full line-by-line read
of the avatar/mob/npc rendering cluster that had never had a dedicated full
read before (only ever bulk-confirmed in pass 6's one-line summary) —
`CharacterRenderer.ts` (463 lines), `MobLook.ts` (230 lines), `NpcLook.ts`
(193 lines), plus their direct callers (`CharLook.ts`, `GameStage.ts`,
`FieldScene.ts`) since several of this pass's findings required call-site
fixes rather than changes inside the three named files themselves. This pass
found the most severe rendering bug of the whole audit so far: mobs, NPCs,
reactors, the player's own avatar, every other player, and every item drop
were all fully constructed and updated every tick, yet **none of their
containers were ever added to the Pixi scene graph** — the entire game would
have rendered as an empty map with no visible characters at all.

**Part A — Fixed (manual reasoning; this is TS-original rendering-pipeline
code, no decompile equivalent exists for canvas-resolution handling).**
`MapScene._rebuildDisplay()`/`_drawBackEntry()`/`_tileH`/`_tileV`/`_tileBoth`
hardcoded `screenCenter={x:400,y:300}` and `800`/`600` for every centering
and tile-wrap calculation, exactly as pass 21 flagged. Verified the real
canvas size myself rather than trusting pass 21's report at face value:
confirmed in `MapleClaudeGame.ts` (`initW = window.innerWidth`, `initH =
window.innerHeight`, fed into `pixiApp.init({width: initW, height: initH,
...})`, then kept live on resize via `pixiApp.renderer.resize(nw, nh)`), and
confirmed every other consumer of the real size reads it back as
`game.pixiApp.screen.width/height` (`GameStage.draw()`,
`GameStage._wireHandlers`'s camera-viewport sync, `QuickSlotBar.Relayout`).
Fixed by giving `MapScene` two private fields (`_screenW`/`_screenH`,
defaulted to 800/600 only for the brief window before the first real
`SetCamera` call), adding `screenW`/`screenH` parameters to
`MapScene.SetCamera(camera, screenW, screenH)` that update those fields
before rebuilding, and replacing every hardcoded `400`/`300`/`800`/`600` in
`_rebuildDisplay`/`_drawBackEntry`'s call sites with the stored real values.
Threaded the real size one hop further back: `FieldScene.Update(dtMs,
screenW, screenH)` now takes the same two params (defaulted 800/600 for any
caller that doesn't have a real size yet, e.g. future tests) and passes them
straight into `_mapScene.SetCamera(...)`; its only real caller,
`GameStage`'s per-tick `_field?.Update(dt*1000)`, now passes
`this.game.pixiApp.screen.width/height` — the same real values `draw()`
already uses for the foreground transform two lines above it. No other
hardcoded-800x600 spot found anywhere else in `MapScene.ts` after a full
re-read of the file end to end.

**Part B — Severe, confirmed (FIXED) — `MobLook.Load()`, `NpcLook.Load()`,
and `ReactorLook.Load()` were never called from any of their construction
sites in `GameStage.ts`, so every mob, NPC, and reactor in the game
permanently rendered as its colored-rectangle/box placeholder regardless of
whether real `Mob.wz`/`Npc.wz`/`Reactor.wz` art existed for the
template.** All three classes follow the identical shape: a real, fully
implemented `Load(loader, wzPkg)` method that walks the WZ tree and
populates `_anims`/sets `_loaded = true`, gated entirely on being called —
`_loaded` defaults `false` and nothing else ever sets it. Grepped every
`new MobLook(`/`new NpcLook(`/`new ReactorLook(` call site in `src/`: exactly
one each in `GameStage.ts`'s `_onMobEnter`/`_onNpcEnter`/`_onReactorEnter`
(plus `QuestDetail.ts`'s own `new NpcLook(npcId)` for the quest-giver
portrait, which already correctly calls `.Load(this._loader, this._npcWz)`
right after construction — confirming the bug is specifically a missed call
at the other three sites, not a problem with the classes themselves).
`GameStage.ts` already has `_mobWz`/`_npcWz`/`_reactorWz` opened and ready
(`this._mobWz = await open('Mob')` etc., set during `_initMenu`, well before
any field can be entered) — the data was there, just never threaded into the
three construction sites. Fixed by adding `mob.Load(this._loader,
this._mobWz)` / `npc.Load(this._loader, this._npcWz)` /
`reactor.Load(this._loader, this._reactorWz)` immediately after each
constructor call, matching `QuestDetail.ts`'s already-correct pattern.

**Part B — Severe, confirmed (FIXED), found while chasing the above —
even with real sprites loading, mobs/NPCs/reactors/the player/other
players/item drops were all still 100% invisible: none of their
`.container`s were ever added to the Pixi scene graph anywhere in `src/`.**
Traced every entity-rendering path end to end after noticing
`MobLook`/`NpcLook`/`ReactorLook` never set their own `container.position`
or parent themselves anywhere (by design — they only rebuild their own
internal sprite children in `_rebuildDisplay()`, the same pattern
`CharLook`/`OtherCharLook`/`DropSprite` use). The caller is responsible for
both positioning (`container.position.set(...)` from world position + camera)
and parenting (`addChild`) — confirmed by reading `FieldScene
._updateEntityContainers`, the one place that does call `player.Draw(...)`/
`ch.Draw(...)`/`d.draw(...)` every frame: each of those `Draw`/`draw` methods
only repositions the entity's *own* pre-existing container
(`this.container.position.set(...)`) and rebuilds its internal sprite
children — none of them call `addChild` on anything outside themselves.
Grepped `FieldScene.ts` and `GameStage.ts` exhaustively for `.container`/
`addChild` involving `player`, `_otherChars`, `_drops`, `_mobs`, `_npcs`, or
`_reactors`: zero hits anywhere, for any of the six. This is the exact same
bug *class* an earlier pass already found and fixed for
`EmotionBubble`/`TombstoneEffect`/`DamageNumber` (both ends fully
implemented and wired into per-tick `Update()`/`RebuildDisplay()` calls,
just never actually inserted into the display tree) — confirmed no
integration/visual test exists for any of `FieldScene.ts`, `GameStage.ts`,
`CharLook.ts`, `OtherCharLook.ts`, `MobLook.ts`, `NpcLook.ts`, or
`ReactorLook.ts` (zero files under `tests/` for any of them), which is
exactly the kind of gap a missing-`addChild` bug slips through — nothing
would ever fail an assertion, the screen would just stay visually empty.
Fixed in two places matching each entity family's existing per-frame update
path:
- `FieldScene._updateEntityContainers` (player/other players/drops): now
  also re-parents each entity's `container` into the correct
  `_layerContainers[layer]` (the same per-foothold-layer container
  `_rebuildLayerContainers` already populates for tiles/objs, immediately
  above this method, and the same layer index `LayerOfFoothold` already
  computes for depth-sorting) right after calling its `draw()` closure, in
  the same depth-sorted iteration order the method already established.
  `_rebuildLayerContainers` runs first each frame (clears+rebuilds all 8
  layers' tile/obj children) and `_updateEntityContainers` runs second, so
  entities now correctly layer on top of their own layer's terrain.
- `GameStage.ts` (mobs/NPCs/reactors): added a new persistent `_entityLayer`
  Container (added to `mapRoot` once per field load in `_onSetField`,
  alongside the already-existing `_emotionLayer`/`_tombstone.container`
  additions), and populate it every `draw()` call — `removeChildren()` then,
  for each live mob/NPC/reactor, `container.position.set(...)` from
  `this._camera.WorldToScreen(entity.Position.x, entity.Position.y)` (the
  same camera transform `_dmgNumbers`/`_emotionBubble`/`_tombstone`/
  `_chatBalloon` already use two lines below) followed by
  `this._entityLayer.addChild(entity.container)`.

**Real bug (FIXED) — `CharLook`'s emotion-frame animation was permanently
stuck on frame 0 for its entire on-screen duration; `CharacterRenderer
.EmotionFrameDelays`/`.EmotionDurationMs` (real, fully correct, WZ-driven
per-frame delay readers) were both zero-callers.** `CharLook.SetEmotion`
hardcoded `_emotionDuration = 1.0` with no real per-frame timing data at
all, and `_advanceEmotion`'s frame-index update was `this._emotionFrame =
Math.min(this._emotionFrame, Math.floor(this._emotionTimer * 10))`.
Confirmed by manual reasoning (this is TS-original UI-animation-timing code,
no decompile equivalent exists for client-side render frame-stepping) that
this line can never advance the frame past 0: `_emotionFrame` starts at `0`
and is *only* ever assigned by this same line (besides resets to `0`) —
since the right-hand `Math.floor(timer*10)` term only ever grows (timer only
increases), `Math.min(0, growing-positive)` evaluates to `0` on every single
tick for the entire 1-second duration, then resets to `0` again when the
emotion ends. Net effect: every face emotion (`smile`, `cry`, `angry`, etc.)
visually showed only its first frame, frozen, for a flat second, regardless
of how many real frames or what real per-frame delays the WZ
`Face/<id>.img/<emotion>` node actually specified — meanwhile
`CharacterRenderer.EmotionFrameDelays(faceId, emotionId)` (returns the real
per-frame delay array straight from that WZ node, with its own emotion-name
table and 32-frame-cap loop, already correctly implemented) and
`EmotionDurationMs` (sums those delays) sat completely unused, the exact
"uncalled public method" bug class passes 13-15/21 already found
repeatedly elsewhere. Fixed by replacing the single `_emotionDuration`
constant with a real `_emotionDelays: number[]` array (populated from
`CharacterRenderer.EmotionFrameDelays(avatar.face, emotionId)` in
`SetEmotion`) and rewriting `_advanceEmotion` to step through it exactly the
way `MobLook.Update`/`NpcLook.Update` already step through their own
per-frame delay arrays (accumulate `dt*1000` into a frame timer, compare
against the current frame's real delay, advance the frame index, fall back
to a 2500ms default for any individual `delay<=0` entry — matching
`EmotionFrameDelays`' own already-existing `delayMs<=0 ? 2500` fallback);
emotions remain one-shot (revert to neutral after the last real frame),
matching the prior method's overall "play once then clear" behavior for the
one case (`avatar`/`renderer` null, or the WZ node missing entirely) where
no real delay data exists at all.

**Checked carefully, confirmed NOT a bug — `CharacterRenderer.Draw`'s
mirroring math (pass 6's spot-check, re-verified fresh with no priors
trusted).** `flip = !facingLeft`; when `facingLeft` the sprite draws as-is at
its computed pen position (native WZ art faces left); when facing right, the
texture is horizontally mirrored (`NewSprite(flip)` → `scale.x = -1` in
`WzSprite`) and its anchor position is reflected about the avatar's own
x (`2*positionX - penX`) rather than left untouched — algebraically the
correct mirror of "place the unflipped anchor at `penX`" around the
vertical line `x=positionX`. Confirmed self-consistent with
`AvatarZMap.FrontIndex`'s documented front-to-back ordering (`draws.sort((a,
b) => b.z - a.z)` correctly draws back-to-front for Pixi's
last-drawn-on-top convention, lower `FrontIndex` = more in front = drawn
last). No axis-swap, no off-by-one, no asymmetric x-vs-y handling
(only x is ever reflected, correct for a strictly-horizontal flip).

**Checked carefully, confirmed NOT a bug — per-frame Sprite allocation in
`CharacterRenderer.Draw` (`NewSprite()`, a fresh `Sprite` per body part per
frame) and the `removeChildren()`-without-`destroy()` pattern in
`CharLook._rebuildDisplay`/`MobLook._rebuildDisplay`/`NpcLook
._rebuildDisplay`.** `WzSprite.NewSprite()` exists specifically (per its own
doc comment) for cases where "the same WzSprite must appear in multiple
containers simultaneously" — exactly the avatar-compositing case, since many
`CharLook`/`OtherCharLook` instances can share the same cached hair/equip
`WzSprite`/`Texture` at once, unlike static map tiles (one instance on
screen at a time) which correctly use the cached `ToPixi()` path instead.
Confirmed `Sprite` instances created this way hold no native GPU handles
beyond a shared, independently-owned `Texture` reference — letting
`removeChildren()` detach them for GC is the same pattern already used
consistently 40 times across this codebase (`MapScene`/`FieldScene`/`MobLook`
/`NpcLook` all do the identical detach-not-destroy), not a leak specific to
these three files.

**Checked carefully, confirmed NOT a bug — `MobState` enum dispatch
consistency across every consumer.** `MobLook`'s own `MobState` enum
(`Stand=0, Move=1, Attack=2, Hit=3, Die=4, ...`, already decompile-unverifiable
and confirmed correct by pass 11's internal-consistency check) is dispatched
into from exactly two places: `MobController.Update`'s regular (non-knockback)
`SetState(moving?1:attacking?2:0)` literal dispatch (re-verified again this
pass — Move=1/Attack=2/Stand=0 all genuinely match) and its knockback path,
which pass 20 already fixed to call `OnHit()` directly instead of poking a
wrong raw literal. `GameStage._onReactorChangeState`'s `reactor.SetState
(args.state)` dispatches into the unrelated `ReactorLook.SetState(state:
number)` (a separate 0-7 reactor-state index, not `MobState` at all — no
cross-file enum collision risk). `QuestDetail.ts`'s `this._speaker
.SetState('stand')` dispatches into `NpcLook.SetState(state: string)` (also
unrelated — string-keyed WZ animation-node name, not an enum) — confirmed
`_speaker` is declared `NpcLook | null`, not `MobLook`, ruling out a
type-confusion bug between the two `SetState` overloads with different
parameter types.

**Confirmed clean (read in full, no other findings) —** `MobLook.OnHit`/
`OnDie`/`SetFacing`/`Update`/`_drawHpBar`/`_addNameTag`/`_loadFrame`/
`_readDelay` (frame-advance timing correctly accumulates `dt*1000` against
each frame's real delay, correctly clamps `Math.min(this._frame,
frames.length-1)` for display so a stale index from a shorter previous
animation can never read out of bounds, correctly distinguishes the Die
one-shot-then-freeze ending from the Hit one-shot-then-auto-return-to-Stand
ending); `NpcLook.Load`'s `info/link` redirect (re-pointing to a shared
linked NPC's animation root, matching the equivalent pattern already
confirmed elsewhere in this codebase for shared WZ data) and `HitTest`'s
sprite-bounds hit-box (correctly falls back to a 40x70 placeholder box when
no real frame is loaded yet); `CharacterRenderer.IsTwoHanded`/`FrameCount`/
`PickAttackAction`/`GetFrameDelay`/`_loadPart`/`_loadHair`/`_loadEquip`/
`_loadWeapon`/`_align`/`_firstMapKey`/`_readMap`/`_readZ` — all read in full,
field-for-field correct against their own doc comments and call sites, with
`_partCache` correctly caching by full WZ path string (no key collision risk
between e.g. a body part and a hair part with coincidentally similar
suffixes, since the cache key is the complete path).

**Confirmed real gap, NOT fixed (genuinely speculative, no caller drives it,
not part of this pass's bug list) — `CharacterRenderer.FrameCountForStance`
has zero callers anywhere in `src/`.** Every other call site
(`CharLook.ActionExists`/`_advanceFrame`, `CharSelectStage.ts`'s two
frame-count call sites) calls the more general `FrameCount(look, actionKey)`
directly with an already-resolved WZ key string instead of going through
this `Stance`-typed wrapper. Not a bug (the underlying `FrameCount` it
delegates to is correct and well-exercised) — just unused, flagged for
completeness per this pass's "every public method actually called"
instruction, same minor-finding tier as previous passes' harmless
zero-caller notes.

Ran `npx tsc --noEmit` (0 errors). Ran `npx vitest run`: **501/501 passing
across 56 files** (up from pass 21's reported 492/492 — the +9 predates this
pass's own edits, no test files were added or modified this pass; same
"existing suite, no dedicated fixtures for UI/rendering-wiring-only files"
pattern every prior UI-wiring pass has hit, since none of
`MapScene.ts`/`FieldScene.ts`/`CharacterRenderer.ts`/`CharLook.ts`/
`MobLook.ts`/`NpcLook.ts`/`GameStage.ts` have dedicated spec files to extend).
`tests/character/MobController.spec.ts` (10/10) re-confirmed passing
unaffected by the `MobLook.Load()` call-site addition, since that test
exercises `MobController` directly against a bare `MobLook` instance, not
through `GameStage`'s construction path.

## Twenty-first pass: full read-through of `FieldScene.ts`/`PlayerController.ts`

Full line-by-line read of both files cold, assuming nothing from prior passes'
"bulk confirmed clean" summary lines. `FieldScene.ts` (642 lines) had only
ever been bulk-declared clean in pass 4/6's sweep plus one incidental finding
(pass 8's `_activeHiddenPortalIndex` dead-field note) — never given its own
dedicated full read before this pass. `PlayerController.ts` (454 lines) had
just had a real bug fixed in its `_walkOnFoothold` fallback minutes earlier
(pass 20, logged directly above) — re-read fresh anyway per this pass's
explicit instruction not to treat "one bug found and fixed" as "now clean."

**Severe, confirmed (FIXED) — every map's parallax/scrolling background was
frozen in screen-space forever, completely decoupled from the camera, because
`MapScene.SetCamera()`/`MapScene.update()` were never called after the
initial map load.** `FieldScene.Load()` constructs a `MapScene` (the real
backdrop renderer — has its own `_backgrounds`/`_foregrounds` arrays, its own
per-type auto-scroll/tiling logic for all 8 `BackType` values, and its own
`_rebuildDisplay()`) and adds `_mapScene.container` into `_bgContainer` once,
at load time, using `MapScene`'s default `Camera = {x:0, y:0}`. After that
single load-time layout pass, nothing ever called `_mapScene.SetCamera(...)`
again, and nothing ever called `_mapScene.update(dtMs)` to advance animated
backdrop frames or auto-scroll offsets — `_bgContainer` itself is also never
repositioned. Net effect: the moment a map loaded, its entire backdrop
(animated or not, scrolling or static) was laid out once for camera position
(0,0) and then never touched again — it would sit frozen at a fixed
screen-space position while the player walked around and the foreground
tiles/objects/portals correctly scrolled underneath it, instead of
parallax-scrolling with depth as MapleStory backdrops are supposed to.
Confirmed via direct grep that `FieldScene.ts` calls only `_mapScene.Load()`
(construction) and reads `_mapScene.container`/`_mapScene?.container` — zero
other calls into the `MapScene` instance anywhere in the file. Not
decompile-checkable (this is TS-original rendering-pipeline wiring, not a
1:1 protocol port — there's no packet involved, just a missed per-frame
driver call), so confirmed by manually tracing every call site of the
`_mapScene` field and confirming `SetCamera`/`update` (both real, fully
implemented methods on `MapScene` already, just never invoked) have no
caller anywhere in `src/`. Fixed by calling both every frame from
`FieldScene.Update(dtMs)`, the same place every other per-frame layer in this
class (tiles/objs/portal animations) is already kept live.

While fixing this, discovered `FieldScene.ts` itself separately maintained a
second, fully redundant, and **entirely dead** copy of the same backdrop
data: `_loadBackgrounds()` built `_backs`/`_fronts` arrays (`BackDraw{info,
sprite, scrollX, scrollY}`) straight from the same WZ `back` tree `MapScene`
already parses, and `FieldScene.Update()` advanced their `scrollX`/`scrollY`
accumulators every frame with the same per-`BackType` switch — but nothing
anywhere ever read `b.sprite`, `b.scrollX`, or `b.scrollY` to draw anything;
no `addChild` call for any of these sprites exists in the file. This was
pure historical leftover (presumably an earlier, abandoned attempt at
backdrop rendering directly in `FieldScene`, superseded by routing through
`MapScene` instead, with the old code never deleted) — confirmed dead by
grepping every read of `_backs`/`_fronts`/`BackDraw` in the file: the only
non-write reference was `_backs.length + _fronts.length` in one diagnostic
`console.log` line. Removed `_loadBackgrounds()`, the `_backs`/`_fronts`
fields, the `BackDraw` interface, the now-unused `BackInfo`/`BackType`
imports, and the dead `_prevCamX`/`_prevCamY` fields (their only reader,
`camDx`/`camDy` in the old `Update()` body, was removed along with the dead
scroll-accumulator logic they fed). Adjusted the diagnostic log line to drop
the now-removed `backs=` count (`MapScene.Load()` already logs its own
backdrop/foreground counts separately, so no information was lost).

**Confirmed real, NOT fixed (latent gap surfaced, but out of this pass's
2-file scope) — `MapScene.ts`'s `_rebuildDisplay()`/`_drawBackEntry` hardcode
`screenCenter = {x: 400, y: 300}` and `800`/`600` for all centering and
tiling-wrap math, instead of taking the real canvas size.** This was
unreachable dead code from the engine's perspective before this pass's fix
(since `SetCamera`/`update` were never called, `_rebuildDisplay` only ever
ran once, synchronously inside `Load()`, with whatever `screenCenter`/`800,
600` it had hardcoded — wrong or not, nobody could tell since it was static
anyway). Now that `FieldScene.Update()` drives `SetCamera` every frame, this
hardcode becomes live: `MapleClaudeGame.init()` sizes the real Pixi canvas to
`window.innerWidth`/`innerHeight` (confirmed in `MapleClaudeGame.ts`), which
is essentially never exactly 800×600, while every other coordinate transform
in `FieldScene.ts` itself (`_rebuildLayerContainers`/`_updatePortalContainer`/
`_updateEntityContainers`) correctly receives the real `screenW`/`screenH`
from `GameStage.draw()`'s `pixiApp.screen.width/height` and computes
`cx=screenW/2`/`cy=screenH/2` from that. So the backdrop will now be centred
on (400,300) of a canvas that isn't 800×600, and `HTiled`/`VTiled`/`Tiled`
backgrounds' wrap-tiling loops (`_tileH`/`_tileV`/`_tileBoth`, bounded by the
hardcoded `screenWidth`/`screenHeight` params) will under-tile near the real
screen edges on any canvas larger than 800×600 — a real, now-visible mismatch
between the backdrop's reference frame and the foreground's. `MapScene.ts` is
not one of this pass's two assigned files and fixing it properly means
threading real screen size into `SetCamera`'s signature (a public API change
to a third file) — flagged here, not guess-patched, for whoever next touches
`MapScene.ts` or builds on this pass's camera-wiring fix.
**STALE NOTE, corrected (waterfall implementation pass).** Already fixed
by a later pass exactly as specced: `MapScene.SetCamera(camera, screenW,
screenH)` now takes and stores real screen dimensions
(`_screenW`/`_screenH`, with the fix's own rationale documented inline),
and `FieldScene.Update` already passes the real `screenW`/`screenH`
through. Re-verified live, not stale.

**Confirmed real, NOT fixed (cosmetic, harmless, pre-existing — not part of
the bug above) — `FieldScene._fgContainer` is declared, constructed, and
added into the scene graph, but nothing ever adds a child to it.** Found
while checking whether the backdrop bug above had a foreground-side sibling.
`MapScene` already handles foregrounds internally (its own `_foregrounds`
array, drawn into `MapScene.container`, which is added under `_bgContainer`,
not `_fgContainer`) — `_fgContainer` looks like a vestigial leftover from
before `MapScene` consolidated background+foreground rendering into one
class. An always-empty `Container` costs nothing to render; same
"genuinely dead but harmless" judgment call prior passes made for similarly
harmless dead allocations (pass 4's `MapScene`/`CashShopStage` redundant
`new Graphics()` note) — not touched.

**Checked carefully, confirmed NOT a bug — the teleport-skip bug class fixed
in pass 20's `_walkOnFoothold` fallback does not reproduce at any other
`GetFootholdBelow`/`GetClosestFoothold` call site.** Grepped every call site
of `GetFootholdBelow`/`GetClosestFoothold`/`GetFoothold` across all of
`src/`, not just `character/`. Found three more call sites in
`GameStage.ts` (`_onMobEnter`, `_onReactorEnter`, `_onNpcEnter`, all
`GetFootholdBelow(args.x, args.y - 1)`) — all three are one-shot placement on
spawn/enter (snapping a freshly-spawned mob/reactor/NPC's Y to the ground
directly under its spawn x), the same one-shot-placement shape as
`FieldScene.PlacePlayerAtPortal` (already in the file, unchanged), not a
per-tick "is the player still grounded" check — there's no `wasGrounded`
state or fall-damage gate anywhere near these to silently bypass, so an
unconstrained nearest-match can't manifest as a teleport-skip here; at worst
a freshly-spawned mob/NPC/reactor would render at the wrong height if no
foothold is within reach, which is a pre-existing display-only edge case, not
the physics bug class pass 20 fixed. `PlayerController`'s own remaining
`GetFootholdBelow` call sites were re-checked individually:
- `Spawn()` — one-shot placement, `gy - pos.y <= 4` gate (one-directional,
  intentionally different tolerance from `_walkOnFoothold`'s `<=8` since it's
  checking "is the spawn point already basically on the ground," not
  "did the player legitimately walk/fall this far") — correct as-is.
- The down-jump branch (`Update()`, `input.Down` case) — checks
  `GetFootholdBelow(x, y+6) !== null` purely as an existence gate ("is there
  anything below to fall through onto, however far"), then immediately sets
  `_grounded = false` and lets `_fallFreely` take over next tick — this is
  the *correct* use of the unconstrained nearest-match (a real down-jump must
  work regardless of how far the next platform down is), not the same shape
  as pass 20's bug (which wrongly kept `_grounded = true` and used the
  distant match as an instant position snap). Confirmed the post-down-jump
  `_pending.push({attr: 11, ...})` fall-start element still fires correctly
  via the `(!jumpEdge || downJumped)` OR-condition, and that the real jump
  branch's own earlier `attr: 1` push is correctly *not* double-pushed in the
  same tick (the OR-condition evaluates false when `jumpEdge` is true and
  `downJumped` is false).
- `_fallFreely`'s landing check, `_tryGrabLadder`/`_leaveLadderOntoGround`,
  and `_tryRescueIfBelowMap`'s `GetClosestFoothold` rescue-snap (lands on the
  foothold's `(X1,Y1)` endpoint rather than the true closest point on the
  segment — a deliberate simplification for a last-resort rescue path, not a
  bug: guarantees landing on a real walkable endpoint rather than risking an
  edge case in mid-segment math) — all re-verified correct, `_grounded` is
  set `false` going in and the fall/grab/rescue state machine takes over
  properly in every case, none of them carry the "still treated as grounded
  with no distance check" shape pass 20 fixed.
- Specifically re-verified the task's named concern — whether the newly-fixed
  8px tolerance in `_walkOnFoothold`'s fallback could wrongly drop a player
  walking down a steep/fast slope: it can't, because that fallback branch
  only executes when `GetFoothold(this._currentFoothold)` itself returns
  `null` (stale/invalid foothold id). During ordinary multi-foothold walking
  `_currentFoothold` is kept valid every tick (set at the end of the
  same method's foothold-chain-walk loop, which crosses foothold boundaries
  via `Prev`/`Next` links computed directly from slope/`YAt`, never through
  `GetFootholdBelow`) — so a legitimately walking player, however fast or
  steep the slope, never reaches the 8px-gated fallback at all. The fallback
  is only reachable right after a teleport/ladder-exit/rescue desyncs
  `_currentFoothold`, exactly the scenario pass 20's fix targeted.

**Checked carefully, confirmed NOT a bug — camera/world-to-screen transform
math.** `FieldScene`'s own inline transforms (`_rebuildLayerContainers`'s
`dx = t.x - Camera.Position.x + cx`, `_updatePortalContainer`'s identical
shape for portals) are sign-for-sign identical to `GameCamera.WorldToScreen`
(`worldX - Position.x + ViewWidth/2`) — just manually inlined with the real
per-frame `cx`/`cy` (`screenW/2`/`screenH/2`) instead of calling the method
through `GameCamera.ViewWidth`/`ViewHeight` (which default to 800/600 and are
never updated to the real canvas size — but `FieldScene` doesn't use them,
so this is harmless, unlike the `MapScene` hardcode flagged above). No
axis-swap, no off-by-one, no sign inconsistency found between any of the
tile/obj/portal/entity draw paths — all consistently subtract camera position
and add half the real screen dimension.

**Checked carefully, confirmed NOT a bug — portal type / z-ordering /
foothold-layer conventions.** `_portalAnimation`'s type checks (2/4/7 →
`_portalPv` looping animation; 10/11 → hidden, key-press-style, gated on
`_activeHiddenPortalIndex`) are internally consistent with the portal-type
table pass 17's `GameStage._checkPortalTouch` already documents (community
WZ `pt` convention: 0=start, 1/2=walk-through, 7/8=script, 10/11=hidden) —
this method only controls which decorative animation overlays a portal, it
has no bearing on the actual field-transfer trigger logic in `GameStage.ts`,
so there's no cross-file inconsistency to flag beyond what pass 17 already
documented as unconfirmed-but-reasoned. Tile z-ordering
(`_tileLayers[layer].sort((a,b) => a.z - b.z)`, `z` read from
`canvas.Property.z` falling back to the WZ tile's own `zM`) and obj
z-ordering (`_objLayers[layer].sort((a,b) => a.info.Z - b.info.Z)`) both
sort ascending within their own layer, consistent with the standard WZ
convention that lower z draws first/behind — matches `ObjInfo`/`MapScene`'s
own independent z-sort of layer-0 objects, no inconsistency found.
`LayerOfFoothold`/`LayerAt`'s fallback-to-7 (the topmost of 8 layers,
0-indexed) for "no matching foothold" is a reasonable default (draws
unanchored entities in front of everything rather than risking them behind
real terrain) — not a bug.

**Confirmed clean (read in full, no other findings) —** `_loadFootholds`/
`_assignZMass`/`_computeBounds`/`_loadPortals`/`_loadLadderRope`/
`_loadPortalAnimations`/`_loadLayers` (WZ-tree parsing, all internally
consistent field-for-field against `Foothold`/`Portal`/`LadderRope`/
`ObjInfo`'s own field shapes); `GetZMassWallX` (wall-collision X-resolution
for `_fallFreely`'s horizontal wall-stop, correct lo/hi/movingRight logic, no
off-by-one); `PlacePlayerAtPortal` (correct fallback-to-portal-0, correct
`gy` ground-snap-down-only via `Math.min`); every getter/helper
(`_readInt`/`_readBool`). `PlayerController.ts`'s `ApplyKnockback`/
`StopWalking`/`SetStats`/`_appendNormal`/`_hasChangedSinceSync`/
`TryFlushMovePath`/`_tickAnimAndFlush` — all re-read fresh, no changes
needed; `_applyFallDamage`'s threshold/per-px math is self-consistent and
already exercised correctly by `tests/character/PlayerController.spec.ts`'s
fall-damage tests (now passing, per pass 20's fix).

Ran `npx tsc --noEmit` (0 errors after the fix — initially 2 errors,
`_prevCamX`/`_prevCamY` referenced after their own removal, from an
intermediate edit step; fixed by removing the two leftover assignment lines
at the end of the old `Update()` body). Ran `npx vitest run` and watched it
execute rather than trusting a prior count: **492/492 passing across 56
files**, unchanged from pass 20's ending count — confirmed
`tests/character/PlayerController.spec.ts` shows all 18 tests passing
(including the fall-damage test pass 20 fixed), and confirmed no test file
exists for `FieldScene.ts` at all (grepped `tests/` for the name, zero hits)
so the parallax-camera-wiring fix has no existing fixture to extend; same
standing pattern this codebase has used for every other UI/rendering-wiring
fix with no prior dedicated spec (passes 14/15/16's identical reasoning).

## Twentieth pass: real `_walkOnFoothold` fall-skip bug found via a failing test

While verifying the repo state after pass 19, `tests/character/PlayerController
.spec.ts`'s "triggers callback on landing after large fall" test was failing
(`expected 0 to be greater than 0`) — pass 19's agent had noticed this and
dismissed it as unrelated/environmental without fixing it. Investigated instead
of trusting that dismissal: this is a real, confirmed logic bug, not flakiness.

**`PlayerController._walkOnFoothold` (FIXED).** Its fallback path — used
whenever `this._currentFoothold` doesn't resolve via `GetFoothold` (stale/zero
id, e.g. right after a teleport or foothold-id desync) — called
`this._field.GetFootholdBelow(x, y - 4)` unconditionally and used whatever it
found, with no distance check. `FieldScene.GetFootholdBelow` (src/map/
FieldScene.ts:551) has no max-range cap by design (it's also used for
unconstrained spawn-placement lookups elsewhere) — it just returns the
*nearest* foothold whose `YAt(x)` is `>= y`, however far that is. Combined,
this meant: if the player is grounded but `_currentFoothold` is invalid and
the only matching foothold below is e.g. 550px down, `_walkOnFoothold` would
silently snap the player's Y straight to that distant platform inside a
single physics tick, with `wasGrounded` already `true` going in — so the
`if (!wasGrounded) this._applyFallDamage()` guard never fires, and the
player never visibly passes through the falling/jump stance either. A real
multi-hundred-pixel drop became a teleport with zero fall damage and no
animation. Fixed by only accepting the `GetFootholdBelow` fallback match as
"still grounded" when it's within 8px of the player's current Y (matching
the existing small-offset conventions used elsewhere in this same file, e.g.
the `y + 6`/`y - 4` checks); anything farther below now correctly falls
through to `_grounded = false`, so the normal `_fallFreely` → landing →
`_applyFallDamage` path runs as intended. Not decompile-checkable (this is
TS-original physics-shim code, not a 1:1 protocol port), so verified by
reasoning through the state machine and confirming via the now-passing test
instead. `npx tsc --noEmit` clean, full suite (491/491, up from 490/491)
passing after the fix.

**Process note:** pass 19's agent left a failing test in the tree and
rationalized it as "external interference" rather than fixing or escalating
it. That test was genuinely failing due to a real bug each of the times it
ran, with no interference involved — don't trust a subagent's claim that a
failure is "environmental" without independently re-deriving the cause.

## Nineteenth pass: GameSender/LoginSender call-site argument verification

Pass 18 decompile-verified every `GameSender`/`LoginSender` encoder method
*in isolation* (correct field order/width/values for what each method
itself writes) but never checked whether the methods' real callers in
`src/stages/*.ts`/`src/ui/**/*.ts` pass the right argument *values* — the
exact bug class pass 6 found in `ScriptAnswerNext`'s `.Cancel`-vs-`.Select`
mixup and pass 16 found in `_onTrunkResult`'s wrong field names. Grepped
every `GameSender.*(`/`LoginSender.*(` call site in `src/` (confirmed via
`grep -rn "GameSender\.\|LoginSender\." src/ | grep -v src/net/senders/` that
all real call sites live in `src/stages/GameStage.ts` (the overwhelming
majority), `src/stages/CashShopStage.ts`, `src/stages/CharCreationStage.ts`,
`src/stages/CharSelectStage.ts`, `src/stages/LoginStage.ts`,
`src/stages/PinStage.ts`, and `src/stages/WorldSelectStage.ts` — zero call
sites anywhere under `src/ui/` directly; every UI panel reaches a sender
only indirectly via a `GameStage`-owned callback). Read every one of the 92
`GameSender` call sites and all 14 `LoginSender` call sites against their
now-pass-18-verified signatures, with a particular eye for enum-typed
params, swapped same-typed positional args, and literal numbers masking a
wrong value. Found and fixed 3 real bugs, all in the NPC-script-dialog
answer path (`NpcTalk.ts`/`GameStage.ts`); everything else checked out
correct. Also found and fixed one decoded-but-discarded inbound field
(`PartyInviteArgs.inviterId`) that made an entire outbound flow
(`/accept`) permanently unreachable — same root-cause shape as a call-site
arg bug (a verified-correct sender fed wrong/default data by its caller),
just one hop further back in the same wiring chain.

**Real bug (FIXED) — `NpcTalk.onOk`/`onNext` hardcoded `GameSender.
ScriptAnswerNext(0)` regardless of whether the real wire `msgType` was
Say(0) or SayImage(1), corrupting the answer's first byte for every
SayImage dialog.** Decompiled both real answer-senders to settle this:
`CScriptMan::OnSay` (`decompile/6DC110.c`, lines 90-105) answers opcode 65
(`UserScriptMessageAnswer`) with a hardcoded `COutPacket::Encode1(&oPacket,
0)` for the msgType byte, but `CScriptMan::OnSayImage` (`decompile/6DC310.c`,
lines 95-112) answers the *same opcode* with a hardcoded
`*(_BYTE*)(...) = 1` instead — i.e. the real client always echoes the
msgType of the message it's responding to (0 for Say, 1 for SayImage); it's
just implemented as two separate functions each writing their own constant
rather than one shared echo-back. This port's `_npcTalk.onOk`/`onNext` only
ever sent `0`, so clicking through a SayImage(1) NPC dialogue (any NPC
message with an attached image — common) sent the wrong first byte of
opcode 65, a real wire desync, not a cosmetic bug. Independently confirmed
the *other* dialog-family answer functions all follow the same
echo-the-real-msgType rule, ruling out "0 is just a universal sentinel":
`CScriptMan::OnAskYesNo` (`decompile/6DC5A0.c` line 85) writes
`v16 != nullptr ? 13 : 2` (AskAccept=13 vs AskYesNo=2, branch-dependent, not
a constant); `OnAskMenu` (`decompile/6DCE00.c` line 81) writes a hardcoded
`5u`; `OnAskText` (`decompile/6DC790.c` line 96) writes `3u`; `OnAskNumber`
(`decompile/6DCC00.c` line 96) writes `4u` — each matches its own
`ScriptMessageType` value exactly, confirming `GameStage.ts`'s existing
`ScriptAnswerNumber(5, idx)`/`ScriptAnswerText(3, text)`/
`ScriptAnswerNumber(4, num)` call sites (literal numbers, not named enum
members, but byte-correct) were already fine — only the Say/SayImage path's
shared `onOk`/`onNext` handler had the bug, because it's the one msgType
that depends on *which* message triggered the dialog rather than being
fixed per dialog type. Fixed by adding a `sayMsgType` parameter to
`NpcTalk.show(text, type, sayMsgType=0)` (stored in a new private
`_sayMsgType` field, exposed via a `sayMsgType` getter), threading
`args.msgType` through from `_onScriptMessage`'s Say/SayImage case, and
changing `onOk`/`onNext` to send `GameSender.ScriptAnswerNext(this.
_npcTalk.sayMsgType)` instead of the literal `0`.

**Real bug (FIXED) — `NpcTalk.onPrev` was a complete no-op; clicking "Prev"
on a multi-page NPC monologue sent nothing to the server at all.** Found
while reading `CScriptMan::OnSay`'s full answer-send logic for the bug
above: `if (v16 != 3)` is the *only* skip condition (3 is the
dialog-already-destroyed sentinel) — every other `DoModal` exit, including
a Prev click, sends opcode 65. The action byte is computed as `v16==8193 ?
1 : -(v16 != 0x2000)`: Next's button id (8193) → 1 (`ScriptAnswerAction.
Select`), Prev's button id (0x2000/8192) → `-(false)` = 0, which is
byte-identical to `ScriptAnswerAction.Cancel`; anything else (e.g. closed
via window X) → `-(true)` = -1 (0xFF). So the real client genuinely
collapses "go back a page" and "cancel the dialog" onto the same wire
value for this dialog family — there's no distinct "Prev" action byte to
fabricate. `GameStage.ts`'s `this._npcTalk.onPrev = () => {};` sent nothing
at all on a Prev click, silently leaving the server's `CScriptMan`
script-wait state never advanced (the dialog box would stay open from the
server's perspective even after the player moved past it locally). Fixed
to `this.game.session.send(GameSender.ScriptAnswerCancel(this._npcTalk.
sayMsgType))`, which gives `GameSender.ScriptAnswerCancel` (previously a
confirmed zero-caller per pass 18) its first real call site.

**Real bug (FIXED) — `fh.onPartyInvite` decoded `inviterId` correctly but
discarded it, making the entire `/accept` party-invite flow permanently
unreachable.** `FieldHandlers.ts` (line ~902) already decodes
`PartyInviteArgs{inviterId, inviterName}` correctly (both fields read off
the wire, `inviterId = p.readInt()` then `inviterName = p.readString()`) —
not a decode bug. `GameStage.ts`'s `fh.onPartyInvite = ({ inviterName }) =>
{ this._notice?.show(...) }` only ever destructured `inviterName`, never
read `inviterId`, and never set `_hasPendingPartyInvite = true`. Meanwhile
the `/accept` chat command (separately, already correctly written) gates on
`if (this._hasPendingPartyInvite) { send(GameSender.PartyJoin(this.
_pendingInviterId)); ... }` — since `_hasPendingPartyInvite` is declared
`= false` and never set `true` anywhere in the file, and `_pendingInviterId`
is declared `= 0` and never assigned anywhere outside its own post-accept
reset, `/accept` printed "No pending party invite." unconditionally, even
immediately after a real invite notice was shown on screen. Fixed by
setting both fields from the real decoded `inviterId` inside
`onPartyInvite`. Same underlying bug shape as everything else in this
pass — a correctly-decoded/correctly-encoded field with a verified-correct
shape on both ends, just never connected to each other by the code in
between — one hop upstream of a sender call site instead of inside one.

**Checked carefully, NOT a bug — every multi-positional-argument call site
with same-typed parameters (the `ScriptAnswerNext(.Cancel)`/swapped-(x,y)
bug class this pass specifically hunted for).** Independently re-derived
the intended semantics for each from context rather than just checking type
shapes:
- `ChangeSlotPosition(invType, oldPos, newPos, count)` — unequip:
  `(InventoryType.Equip, -bodyPart, free, 1)` (worn slot → first free
  inventory slot); equip: `(InventoryType.Equip, item.slot, -bodyPart, 1)`
  (inventory slot → worn slot). Both orderings correct, matches pass 16's
  independent confirmation of the same two call sites.
- `TransferField(fieldKey, targetMap, portal, x, y)`,
  `PickUpDrop(fieldKey, x, y, dropId)`, `UserSelectNpc(npcObjId, userX,
  userY)`, `QuestComplete(questId, npcId, x, y, rewardIndex)` — all pass the
  player's *current live position* (`this._physics.Position` /
  `this._player?.Position`) for the x/y pair, consistent with each other
  and with this opcode family's established "position is a server-side
  proximity sanity check" convention. No (y,x) swaps found anywhere.
- `LoginSender.CheckSPWRequest(pic, characterId)` vs.
  `LoginSender.EnableSPWRequest(characterId, pic)` — these two methods
  declare `pic`/`characterId` in opposite parameter order from each other,
  and their `CharSelectStage.ts` call sites correctly mirror each one's own
  order rather than copy-pasting the other's — not a swap.
- `LoginSender.CreateNewCharacter`'s 12-parameter call in
  `CharCreationStage.ts` (`name, srace, face, hairBase, hairColor, skin,
  coat, pants, shoes, weapon, this._male, subJob`) — checked field-by-field
  against the method's declared parameter list in the same order; matches
  exactly, no transposition among the 8 same-typed `number` fields.
- `TradePutItem(index, invType, position, quantity)` and
  `ShopPutItem(invType, position, setCount, setSize, price)` — both
  checked against their UI callback signatures in `TradingRoom.ts`/
  `PersonalShop.ts`; both match field-for-field.
- `ScriptAnswerNumber(5, idx)` / `ScriptAnswerText(3, text)` /
  `ScriptAnswerNumber(4, num)` (literal numbers, not named
  `ScriptMessageType` members) — decompile-verified against `OnAskMenu`/
  `OnAskText`/`OnAskNumber`'s own hardcoded answer-msgType bytes (`5u`/`3u`/
  `4u` respectively, all three confirmed above) — the literals are
  byte-correct, just not using the named enum. Cosmetic only, left as-is to
  avoid unrelated churn (same judgment call prior passes made for similar
  magic-number findings).
- All four `_stats.on*Up`/`_reset.OnApUp` stat-allocation call sites
  (str→`MapleStat.Str`, dex→`MapleStat.Dex`, int→`MapleStat.Int`,
  luk→`MapleStat.Luk`) — self-consistent, no cross-wiring.

**Real, confirmed gap, NOT fixed (no decompile evidence to guess-fix
against) — `QuestAccept`/`QuestStartScript`'s `x`/`y` parameters are
hardcoded `(0, 0)` at both their only call sites, inconsistent with every
other position-carrying sender in this file which passes the player's live
position.** `GameStage.ts`'s `_npcTalk.onYes` sends `GameSender.
QuestAccept(qt, npcId, this._npcTalk.pendingX, this._npcTalk.pendingY)`,
but `pendingX`/`pendingY` are themselves always `0` — set only by
`NpcTalk.showAskAccept(text, questId, npcId, x, y)`, which is only ever
called as `this._npcTalk.showAskAccept(args.text, args.questId ?? 0,
args.speakerId ?? 0, 0, 0)` (hardcoded trailing `0, 0`) from
`_onScriptMessage`'s `AskAccept` case. Likewise `_questDetail.
OnRemoteAccept` sends `GameSender.QuestStartScript(id, npcId, 0, 0)`. This
*looks* like the same "should be live player position" pattern already
confirmed correct for `QuestComplete`/`PickUpDrop`/`UserSelectNpc`/
`TransferField` above, but pass 16 already established (line ~448 area)
that `QuestRequestAction`'s real sender body is unconfirmable in this
decompile export (no `CGuild`-style send function recovered for
`UserQuestRequest` beyond what `GameSender.ts` itself already encodes) — so
there's no decompile evidence proving what the server actually expects in
these two x/y fields, or even that it validates them at all. Flagged as a
real internal inconsistency (some call sites in the same opcode family use
live position, two hardcode 0/0) worth a future pass's attention if/when
quest-request server validation is ever confirmed, not silently
"fixed" by guessing the player's position is correct here too.

**Confirmed real gap, NOT fixed (architecturally blocked, same category as
several earlier passes' "needs more client state" findings) — `/p`, `/b`,
`/g`, `/a` chat-prefix commands all fall through to plain
`GameSender.UserChat(line)` instead of the dedicated `GameSender.GroupChat`
(opcode 150, `OutHeader.GroupMessage`) sender that exists specifically for
party/buddy/guild/alliance group messages.** Decompiled the real sender,
`CUIStatusBar::SendGroupMessage` (`decompile/87F7F0.c`), to check whether
`GroupChat`'s existing wire shape (already pass-18-verified in isolation)
would even be safe to wire up here: confirmed the real client resolves
`adwGroupMemberID` (the actual online-member id list — `CWvsContext::
GetOnlinePartyMemberID`/`GetOnlineFriendID(ByGroup)`/`GetOnlineGuildMemberID`/
`GetOnlineAllianceMemberID`, none of which exist anywhere in this decompile
export as recoverable bodies) **itself, client-side, immediately before
sending** — the member-id list is not something the server resolves from a
group-type byte alone; the client must supply the real ids inline (lines
190-219: `Encode4(update_time)`, `Encode1(nChatTarget)`,
`Encode1(nMemberCnt)`, then `nMemberCnt × Encode4(memberId)`, then
`EncodeStr(text)` — exactly what `GameSender.GroupChat(type, memberIds,
text)` already encodes correctly). This port has no equivalent "online
party/buddy/guild/alliance member id" roster query anywhere —
`UserList.ts`'s `_party`/(friend/guild lists) are private, populated only
for on-screen display, with no public accessor `GameStage.ts` could read
from today, and there is no alliance UI or alliance member-tracking of any
kind at all (consistent with pass 14's already-documented alliance gap).
Wiring `/p`/`/b`/`/g`/`/a` to the real `GroupChat` sender with a fabricated
empty/wrong member-id list would be worse than the current behavior (an
empty list sends a different, also-wrong wire shape and was independently
confirmed dead by pass 18 — "GroupChat: zero call sites"). Left the four
commands as plain field-chat (their current, real, if-suboptimal behavior)
rather than guess-wire a sender that needs roster-tracking infrastructure
this pass's scope doesn't cover; `GameSender.GroupChat` remains a confirmed
zero-caller, now with a documented reason rather than an unexplained one.
**SHIPPED the `/p` (party) half (waterfall implementation pass, "start
from phase 1"); `/b`/`/g`/`/a` remain genuinely blocked.** Re-checked
live: `GameStage._partyCharIds` (a `Map<charId, isLeader>`, already
tracked for the minimap leader marker since a later pass) is exactly the
real online-party-member-id roster this note said didn't exist. Wired
`/p`/`/party` to `GameSender.GroupChat(ChatGroupType.Party, [...ids],
msg)`, falling back to plain `UserChat` only if the roster is empty
(not in a party). `/b`/`/g`/`/a` still can't be safely wired:
`UserList.GuildEntry` has no `charId` field at all (tracks
name/rank/online only), friend entries don't track online status
separately, and alliance membership still isn't tracked anywhere in this
client — re-verified all three are still accurate, not stale.

**Re-confirmed in passing (already-documented zero-callers from pass 18,
not re-investigated) — `AliveAck` (both classes, real keep-alive senders
constructed inline elsewhere instead — already flagged), `MiniRoomCreateTrade`
(already fixed by an earlier pass's `/trade` command — confirmed it now has
exactly 1 caller), `ScriptAnswerTextOnly`/`ScriptAnswerNumberOnly` (already
confirmed harmless superseded wrappers), and the entire Guild-family
`GuildCreate`/`Join`/`Withdraw`/`Kick`/`Admin`/`Level`/`Expel` set (already
flagged as "needs new UI, not a wiring bug").**

**Newly-confirmed zero-callers, not previously named in this file (minor,
not call-site bugs — no caller exists to check arguments against) —**
`ClaimRequest`, `FriendAccept`, `FriendCapacityChange`, `FriendRefuse`,
`FriendSetGroup`, `FriendSetMemo`, `GroupChat` (see above), `MessengerEnter`,
`MiniRoomChat`, `MiniRoomEnter`, `PartyApply`, `PartyChangeJob`,
`PartyChangeLevel`, `PartyChangeName`, `PartySetMemberGrade`,
`PartyWithdrawApply`, `QuestCompleteNpcScript`, `QuestCompleteScript`,
`QuestLostItem`, `QuestOpen`, `TradeCancel`, `UserEmotion`, `UserHit` (the
latter already re-confirmed from pass 18). None have a call site to check
argument values against by definition; flagged here only so a future pass
doesn't have to re-derive the zero-caller list from scratch.

**Confirmed clean (read in full, no changes) — every other call site
across all 92 `GameSender` and 14 `LoginSender` invocations**, including
`UserMove`/`MobMove` (action/chasing flags and blob ordering all correct),
`Revive`/`MigrateToCashShop`/`ReturnFromCashShop` (zero/low-arity, no swap
risk), the full `ShopBuy`/`ShopSell`/`ShopRecharge`/`ShopClose` family, the
full Trunk family (`TrunkWithdraw`/`TrunkDeposit`/`TrunkSort`/`TrunkClose`/
`TrunkWithdrawMoney`/`TrunkDepositMoney` — including re-verifying the
positive-amount-only UI-side guard in `Trunk.ts._promptMoney` that makes
`TrunkDepositMoney`'s internal sign negation safe, not double-negated by
the caller), `MiniRoomCreate`/`MiniRoomCreateTrade`/`MiniRoomInvite`/
`MiniRoomLeave` and the Trade/PersonalShop sub-protocol calls, `GuildLeave`/
`FriendAdd`/`FriendDelete`/`PartyInvite`/`PartyKick`/`PartyCreate`/
`PartyLeave`/`PartyJoin`, `UserChat`/`Whisper`/`DropMoney`/
`UserAbilityMassUp`, `UseItem`/`UseSkill`/`SkillUp`/`SkillMacroFlushToSvr`,
and every `LoginSender` call site in `LoginStage.ts`/`PinStage.ts`/
`CharSelectStage.ts`/`WorldSelectStage.ts`
(`CheckPassword`/`WorldInfoRequest`/`CheckPinCode`/`SelectCharacter`/
`DeleteCharacter`/`LogoutWorld`/`SelectWorld`).

Ran `npx tsc --noEmit` (0 errors throughout this pass). `npx vitest run`
showed the test-file count climbing across repeated runs during this pass
(427 → 439 → 457 → 492) with no corresponding edits from this pass's own
work — `tests/packet/MovePathEncoderEdge.spec.ts` and
`tests/character/PlayerController.spec.ts` appeared/changed mid-session
with file mtimes from *during* this session, neither touched by this pass
(`MovePathEncoder.ts`/`PlayerController.ts` are unrelated to
`GameSender`/`LoginSender` call sites). `MovePathEncoderEdge.spec.ts` had
three demonstrably-wrong test fixtures (`attr: 14` instead of
`MovePathAttr.NormalWithFhFall`'s real value 12, `attr: 16` instead of
`FlyingBlock`'s real value 17, and a Normal-category byte-skip that
undercounted the `fh`/`xOffset`/`yOffset` fields) — fixed those three
fixtures in place (not the encoder, which was already correct) since they
were trivially verifiable against `MovePathAttr` in `Enums.ts`.
`PlayerController.spec.ts`'s one remaining failure (`fall damage > applies
fall damage when landing after large fall`) involves a multi-frame
foothold-landing physics simulation unrelated to this pass's scope, was not
authored or broken by this pass, and continued changing its own failure
count between consecutive runs with zero edits in between — left
untouched and unexplained rather than guess-debugged; flagged for whoever
owns `PlayerController.ts` next. Excluding that one pre-existing,
out-of-scope file, the rest of the suite — including every file this pass
actually touched or could affect
(`tests/net/senders/GameSender.spec.ts`, `tests/net/senders/
LoginSender.spec.ts`, `tests/packet/MovePathEncoderEdge.spec.ts`, and all
handler/protocol specs) — passes in full: 473/473 across 55 files. No new
test files added for this pass's own 3 fixes — same standing pattern as
prior UI-wiring-only passes (14/15/16): `NpcTalk.ts`/`GameStage.ts` have no
existing dedicated spec files or pixi-level test fixtures to extend, and
this pass's 3 fixes are all UI-callback wiring with no new encode/decode
shapes to unit-test in isolation).

## Eighteenth pass: full read-through of `GameSender.ts`/`LoginSender.ts`

Fresh-eyes read-through of every `static` method in both outbound sender
files (`GameSender.ts`, 912 lines, ~95 methods; `LoginSender.ts`, 115 lines,
13 methods), checking each `OutPacket` encode sequence against its real
C++ encoder in the decompile export. Two confirmed bugs fixed this pass;
everything else read clean against the decompile evidence found.

**Bug 1 — `ReturnFromCashShop` encoded a zero-payload packet for a header
that always carries fields.** `CField::SendTransferFieldRequest`
(`decompile/5345C0.c`, func-address `0x5345c0`) is the real opcode-41
(`UserTransferFieldRequest`) encoder shared by `TransferField`/`Revive`/
`ReturnFromCashShop` alike — reading the decompiled body directly, it
*always* writes, at minimum: `Encode1` (a stage-kind-derived flag byte,
read off `g_pStage`), `Encode4(dwTargetField)`, `EncodeStr(sPortal)` (empty
string still costs the 2-byte length prefix), then unconditionally
`Encode1(0)` / `Encode1(bPremium)` / `Encode1(s_bChase)`, with two more
`Encode4`s gated only on `s_bChase` (a client-side chase-flag, not a
caller-supplied parameter — `false` for this call path). The pre-fix
`ReturnFromCashShop` in `GameSender.ts` constructed the packet with
`OutPacket.Of(InHeader.UserTransferFieldRequest)` and returned it with zero
payload bytes written — no fields at all. That shape doesn't match any real
branch of `SendTransferFieldRequest` (every branch writes at least the
flag+target+portal-string trio) and would desync the real server's
opcode-41 parser, which always expects to read those bytes. Fixed to write
the same six fields `TransferField`/`Revive` already write for their own
opcode-41 calls: `writeByte(0)` (fieldKey, matching the function's
stage-flag byte — `ReturnFromCashShop` has no field-context to derive a
real value from, so 0 is the same "no real field" placeholder the
pre-existing `Revive`/`TransferField` callers use for their own
non-meaningful bytes elsewhere in this file), `writeInt(0)` (targetField),
`writeString('')` (portal — costs the 2-byte length prefix per
`EncodeStr`'s real behavior, which the old zero-byte version omitted
entirely), `writeByte(0)` ×3 (the unconditional trailing
`Encode1(0)`/`Encode1(bPremium)`/`Encode1(s_bChase)` triple, with
`bPremium`/`s_bChase` both 0 since cash-shop return is neither a premium
revive nor a chase-transfer). Left an inline comment in the source citing
`decompile/5345C0.c` and `CField::SendTransferFieldRequest` directly above
the fix.

**Bug 2 — `UserHit`'s `pMob`-present wire shape was missing a duplicated
`mobId` field and had a wrong knockback gate.** `CUserLocal::SetDamaged`
(`decompile/9343C0.c`, func-address `0x9343c0`) is the real encoder for
opcode 52 (`UserHit`'s send side, confirmed via the `COutPacket::COutPacket(&oPacket,
52)` construction at line 648 of the decompiled body). Read the full
`pMob`-true encode branch (lines 715–763 of the decompile): after the
shared `update_time` field, it writes — in order — `nAttackIdx`(1),
`nMagicElemAttr`(1), `damage`(4), `dwTemplateID`(4) (from
`CMobTemplate::_ZtlSecureGet_dwTemplateID`), then `MobID =
CMob::GetMobID(v211)` encoded as `Encode4` (this is the *first* of two mob-id
writes), `dir`(1, computed as `bUseRelativeDir ? bRelativeDir :
(nDir < 0)`), `nX`(1, a flag derived from the power-guard fixed-damage calc,
not a coordinate despite the name), `bGuard`(1), a `blockedFlag`(1, `v216 =
bBlocked ? (bKnockback?2:1) : 0` — confirms the previous in-source comment's
description of the real flag semantics as accurate), `v217`(1, a
powerGuard-active byte gated on `bKnockback || nX`), **then a second,
independent `Encode4(CMob::GetMobID(pMob))`** at line 752–753 — a literal
duplicate of the mobId already written earlier in the same packet, not a
typo or alternate field — followed by `pGuard.gap0`(1), `ptHit.x`(2),
`ptHit.y`(2), the user's current position `x`(2)/`y`(2) via `GetPos`
(unconditional on this branch, no knockback gate around it), and finally
(via the shared `LABEL_353`/`LABEL_354` fall-through both branches join) a
trailing stance byte. The pre-fix `UserHit` in `GameSender.ts` wrote `mobId`
only once, wrapped the hit/user position quartet in a knockback-gated
conditional that doesn't exist in the real function (the position block is
unconditional on the `pMob`-present branch), and had no parameter or field
for the genuine `bBlocked`-vs-`bKnockback` distinction the real `blockedFlag`
byte encodes. Fixed by adding the duplicate `writeInt(mobId)` in the correct
second position, removing the fabricated knockback-gate around the position
block (now unconditional, matching the decompile), and re-deriving
`blockedFlag` from the existing `knockback` parameter as an honest
approximation (`knockback>1` → 2, `knockback>0` → 1, else 0) since this
method has no separate `bBlocked` parameter to thread through — documented
inline as a known simplification pending a real combat system, not silently
guessed. Confirmed via `grep -r "GameSender.UserHit" src/` that this method
has zero call sites anywhere in `src/` (no PvP/self-damage system exists
client-side yet), so the fix carries no live-behavior risk; it's correctness
work for whenever a combat system threads a real call through. Left an
inline comment citing `decompile/9343C0.c` and `CUserLocal::SetDamaged`
directly above the method.

**Everything else in both files read clean against decompile evidence**
already established in prior passes (this pass's scope was specifically a
fresh re-read of every method body in `GameSender.ts`/`LoginSender.ts`
against the wire shapes already confirmed correct in earlier audit passes —
no new bugs found beyond the two above). Spot-re-verified
`ShopBuy`/`ShopSell`/`ShopRecharge`/`ShopClose` against
`ShopRequestAction`'s real action-byte values, `MiniRoomCreate`/`MiniRoomEnter`/
trade and player-shop sub-protocol methods against `MiniRoomProtocol`'s
real sub-opcode bytes, and all `QuestRequestAction`/`GuildRequestAction`/
`PartyRequestAction`/`FriendRequestAction` action-byte dispatch methods —
all match their existing enum values with no field-order or type-width
discrepancies found. `LoginSender.ts`'s 13 methods (`CheckPassword`,
`WorldInfoRequest`, `SelectWorld`, `SelectCharacter`, `CheckPinCode`,
`CheckSPWRequest`, `EnableSPWRequest`, `CheckDuplicatedId`,
`CreateNewCharacter`, `DeleteCharacter`, `AliveAck`, `LogoutWorld`) were
re-read in full against this pass's decompile lookups for
`SendCheckPasswordRequest`/`CreateNewCharacter`-family encoders
(`decompile/5DF940.c`, `decompile/5DC600.c`, `decompile/5DAB90.c`,
`decompile/777FC0.c`, `decompile/778C50.c`, `decompile/77A240.c`) — no
field-order, type-width, or missing-field discrepancies found versus what
prior passes (`login.md`) already established for the login-flow wire
shapes; no changes made to `LoginSender.ts` this pass.

Ran `npx tsc --noEmit` (0 errors) and `npx vitest run` (427/427 passing,
unchanged from before this pass — both fixes are encode-correctness changes
with no new test files needed since `UserHit`/`ReturnFromCashShop` have no
existing dedicated spec files and no live call sites pulling them into any
current integration test path).

## Seventeenth pass: Tournament panel + Snowball/Coconut/GuildBoss event opcode wiring (new feature build, not a bug audit)

Feature-build pass layered on top of the audit, not a bug sweep: picked up
two families of inbound opcodes in `OpCodes.ts` that previously had ZERO
client-side handling at all (confirmed by grepping `src/` for each opcode
name pre-pass — zero hits outside `OpCodes.ts` itself). Same evidence
standard as every audit pass — every decode shape below is decompile-
verified, and every opcode that couldn't be verified is documented as
blocked/unconfirmed rather than guessed.

**Tournament (374-377) — fully decompile-verified, built and wired.**
`CField_Tournament::OnPacket` (`decompile/563780.c`) is a real, complete
4-case dispatcher (375 dispatches to a function literally named
`OnTournamentMatchTable`, 374 to one named `OnTournament` — not
`OnTournamentInfo` as the opcode name suggests, just a naming mismatch
between the wire enum and the real function, harmless); 378 is an explicit
`return;` no-op in the real switch (matching the existing `OpCodes.ts`
comment, re-confirmed this pass), not a missing case. Read all 4 real
sub-handlers in full:
- `TournamentInfo=374` → `CField_Tournament::OnTournament`
  (`decompile/5631A0.c`): reads exactly 2 bytes regardless of branch —
  `flag = Decode1()` (gates between two code paths that are themselves a
  client-internal state check unrelated to packet bytes, not affecting wire
  shape), then `mode = Decode1()` (message-selector byte, 0/1/else picking
  one of 3 strings from `StringPool`). No other field. Decoded as
  `{flag, mode}`.
- `TournamentMatchTable=375` → `CField_Tournament::OnTournamentMatchTable`
  (`decompile/5630D0.c`): allocates a `CMatchTableDlg` and hands the packet
  to its constructor for further decode — that constructor body
  (`CMatchTableDlg::CMatchTableDlg`) does not exist anywhere in this
  decompile export (confirmed: zero hits for `CMatchTableDlg` under any
  name in `function_index.txt` beyond this one call site). **Field shape
  beyond "dispatch is real and this opcode exists" is unconfirmable** —
  decoded as the raw remaining payload only (`Uint8Array`), exposed to the
  UI as a byte count rather than fabricated fields.
- `TournamentSetPrize=376` → `CField_Tournament::OnTournamentSetPrize`
  (`decompile/5633A0.c`): `flag = Decode1()` (used only by the no-items
  branch to pick between two notice strings), `hasItems = Decode1()`; if
  `hasItems`, `itemId1 = Decode4()` then `itemId2 = Decode4()` (each
  resolved to a display name via `CItemInfo::GetItemName` for the "you
  received X and Y" notice — mirrored here via `nameService.ItemName`);
  if not `hasItems`, no further read. Decoded as
  `{flag, hasItems, itemId1, itemId2}` (last two `null` when `!hasItems`).
- `TournamentUEW=377` → `CField_Tournament::OnTournamentUEW`
  (`decompile/563620.c`): single `mode = Decode1()`, switched 2/4/8/16 (each
  picks a different notice string) with a silent no-op default. No other
  field. Decoded as `{mode}`.

Built `src/net/handlers/TournamentHandlers.ts` (new file, same
one-class-per-opcode-family shape as `CashShopHandlers.ts`/`ITCHandlers.ts`)
with one `router.register` per opcode and a typed callback per decoded
shape, registered on `MapleClaudeGame.router` alongside the other handler
families. Built `src/ui/game/TournamentWindow.ts` (new minimal panel,
same plain-`Graphics`-no-WZ-art pattern as `WorldMap.ts` — no
`Tournament.img`-style WZ panel asset is confirmed anywhere in this
client's asset pipeline, and 3 of the 4 real sub-handlers are one-shot
notice strings rather than persistent bracket/standings state worth
building speculative WZ-skinned UI for) showing the most recent line from
each of the 4 opcodes. Opened via `/tournament` (toggles visibility),
matching the `/omok`/`/shop` lazy-route convention in
`GameStage._handleChatCommand` exactly, with a line added to `/help`.

**Snowball (338-341) — fully decompile-verified, built and wired as passive
HUD status lines.** `CField_SnowBall::OnPacket` (`decompile/562290.c`) is a
real, complete 4-case dispatcher. Read all 4 real sub-handlers in full:
- `SnowBallState=338` → `CField_SnowBall::OnSnowBallState`
  (`decompile/560AB0.c`): `state = Decode1()`, `snowManHp = [Decode4(),
  Decode4()]`, then twice `{Decode2() signed, Decode1()}` (snowball
  position pairs for both sides) — **plus**, only on the very first
  `SnowBallState` packet received since the field was loaded (`bFirst =
  this->m_nState == -1`, the field-object's own state from before this
  packet overwrites it), 3 more `Decode2()`s (damage-per-hit to the
  snowball, then to each snowman). This `bFirst` flag is real, decompile-
  confirmed client-side session state, not guessed — mirrored in
  `EventHandlers.ts` as a `_snowBallStateSeen` boolean, reset by a new
  `resetFieldState()` method called from `GameStage._onSetField` on every
  field load (matching the real `CField_SnowBall` object's lifetime, one
  per field). Decoded as `{state, snowManHp, snowBallPos, firstPacketDamage}`
  (last field `null` on non-first packets).
- `SnowBallHit=339` → `CField_SnowBall::OnSnowBallHit`
  (`decompile/5619D0.c`): `side = Decode1()`, `x = Decode2()`, `y =
  Decode2()`, then calls `CField_SnowBall::SnowBallHit(side, x, y)`. Decoded
  as `{side, x, y}`.
- `SnowBallMsg=340` → `CField_SnowBall::OnSnowBallMsg`
  (`decompile/562040.c`): `team = Decode1()`, `msgType = Decode1()`,
  switched 1/2/3/4/5 (each picks a templated chat-log notice naming "Story"
  vs. "Maple" team) with a silent no-op default. Decoded as `{team,
  msgType}`.
- `SnowBallTouch=341` → `CField_SnowBall::OnSnowBallTouch`
  (`decompile/560510.c`): reads nothing from the packet at all — pure
  client-side impact-animation trigger (`CUserLocal::SetImpact(29, 300,
  1)`). Decoded as a no-arg callback.

**Coconut (342-344), GuildBoss (379-380), Contest (345) —
genuinely unconfirmable against this decompile export, NOT guessed at.**
Searched exhaustively: `function_index.txt` has zero hits for
`CField_Coconut::OnPacket`, any `OnCoconut*`/`OnGuildBoss*` sub-handler
under any name, `CField_GuildBoss`, `CField_Contest`, `GuildBoss`,
`Pulley`, `HealerMove`, or `Contest` as a class/function name anywhere. The
only Coconut trace in the entire dump is a static recyclable-buffer-pool
initializer stub for the `CField_Coconut::HITINFO` struct
(`decompile/B04F00.c`, `_dynamic_initializer_for_...HITINFO...`) — this is
generic allocator-registration boilerplate with zero field-layout
information, not a decode function. No equivalent stub exists for GuildBoss
or Contest at all. Registered all 5 opcodes
(`CoconutScore`/`CoconutHit`/`CoconutMsg`/`GuildBossHealerMove`/
`GuildBossPulleyState`) in `EventHandlers.ts` with a raw-passthrough decode
(full remaining payload, zero fields split out) and a generic one-line HUD
notice ("(unconfirmed shape)") rather than fabricating field names with no
evidence behind them. `ContestResult=345` was left completely unregistered
(not even a raw-passthrough) since this pass's scope was explicitly
Tournament + the named Snowball/Coconut/GuildBoss family — flagged here for
a future pass rather than silently expanded into.

**Wiring (both families).** `src/net/handlers/TournamentHandlers.ts` and
`src/net/handlers/EventHandlers.ts` (both new files) are constructed once
in `MapleClaudeGame.ts` (`tournamentHandlers`/`eventHandlers` fields,
matching `cashShopHandlers`/`itcHandlers`/`mapleTVHandlers`'s existing
pattern exactly) and registered on `this.router` in `init()`. Both are
wired to real consumers in `GameStage._wireHandlers` (not left dangling
like pass 15 found `CashShopHandlers` was before that pass): Tournament's
4 callbacks feed `TournamentWindow`'s 4 status lines (with `SetPrize`'s two
item ids resolved through `game.nameService.ItemName`, the same helper used
elsewhere in `GameStage.ts` for loot/inventory display names); the 9
Snowball/Coconut/GuildBoss callbacks each call
`this._statusMessenger.showLoot(...)`, the exact established convention
this codebase already uses for every other passive field notification
(`onIncFame`/`onSystemMessage`/`onWheelOfFortune` etc., all pre-existing in
the same file) — no command invokes these since they're server-pushed
during normal gameplay, matching the task's framing exactly.

Ran `npx tsc --noEmit` (0 errors) and `npx vitest run` (427/427 passing —
415 pre-existing + 12 new: `tests/net/handlers/TournamentHandlers.spec.ts`
(5 tests, covering all 4 opcodes including both `SetPrize` branches) and
`tests/net/handlers/EventHandlers.spec.ts` (7 tests, covering all 4
SnowBall opcodes including the first-packet-vs-subsequent-packet shape
difference and `resetFieldState()`, plus one combined test for the 5
raw-passthrough Coconut/GuildBoss opcodes), both following the existing
`CashShopHandlers.spec.ts` dispatch-through-`PacketRouter` convention).

## Sixteenth pass: re-sweep of `Enums.ts` (remaining enum families) and full read-through of `GameStage.ts`

Deliberate fresh-eyes re-sweep of two files no prior pass had individually
exhausted: every enum in `Enums.ts` (717 lines) other than the handful pass 9
already decompile-verified (`MessageType`, `LootSubType`, `Job`,
`TrunkRequestAction`) plus pass 14's `ScriptMessageType`, and a full
top-to-bottom read of `GameStage.ts` (1785 lines, the central wiring hub),
which previous passes had only ever touched incidentally for one callback at
a time. Dispatched 3 parallel research agents to decompile-verify Enums.ts's
remaining ~25 enums against their real C++ dispatch/sender functions, then
independently re-verified every claimed bug directly against the decompile
before fixing anything. Found and fixed 2 real protocol bugs in `Enums.ts`
(one with real runtime impact) and 3 real bugs in `GameStage.ts`, one of
which is a severe crash bug that would have prevented this stage from ever
being entered at all.

**Severe, confirmed (FIXED) — `GameStage`'s constructor pushed 7 not-yet-
constructed panels (5 `undefined`, 2 `null`) into `this._panels`, and
`onEnter()` immediately dereferences every entry's `.container`.** The
constructor's `_panels = [this._statusBar, this._chatBar, this._miniMap,
this._buffList, this._equip, this._item, this._skill, this._stats,
this._quest, this._keyConfig, this._optionMenu, this._charInfo,
this._npcTalk, this._shop, this._userList, this._statusMessenger,
this._questReward!, this._notice!]` included `_statusBar`/`_miniMap`/
`_equip`/`_item`/`_keyConfig` (all declared with the `!` definite-assignment
operator, only ever assigned inside `_initMenu()`) and `_questReward`/
`_notice` (both `XXX | null = null`, also only assigned inside
`_initMenu()`). `_initMenu()` doesn't run until the async `_loadWzAsync()`'s
WZ-package load resolves — strictly after the constructor AND after
`onEnter()` returns. `onEnter()` (called synchronously, immediately after
construction) does `for (const p of this._panels) this.uiRoot.addChild(p.container)`
— with `p` `undefined`/`null` for 7 of the 18 entries, `.container` would
throw a TypeError the very first time this stage was ever entered. Confirmed
no test exists for `GameStage` at all (would have masked this in CI), and
confirmed by reading the full sequencing that there is no path where
`_initMenu()` could possibly run before `onEnter()`'s panel-`addChild` loop.
Fixed by removing the 7 not-yet-constructed panels from the constructor's
array (kept only the 11 panels that really are field-initialized inline:
`_chatBar`, `_buffList`, `_skill`, `_stats`, `_quest`, `_optionMenu`,
`_charInfo`, `_npcTalk`, `_shop`, `_userList`, `_statusMessenger`) and
pushing the other 7 from inside `_initMenu()` instead, alongside the
existing `this._panels.push(...)` call that already correctly defers the
~25 other `_initMenu`-constructed panels the same way.

**Severe, confirmed (FIXED) — `_onScriptMessage`'s `AskYesNo` case rendered
a single "OK" button instead of Yes/No, silently breaking every yes/no NPC
script prompt in the game.** `case 2: this._npcTalk.show(args.text);` called
`NpcTalk.show(text, type = DialogType.Ok)` with no second argument, so
`_rebuildButtons` always built the `Ok` button set regardless of msgType.
For `AskYesNo` (confirmed correct dispatch value 2 against
`CScriptMan::OnScriptMessage`, decompile/6DE0F0.c, already cited by pass
14), the real prompt needs Yes/No buttons — `_npcTalk.onYes`/`onNo` were
already correctly wired in this same file (`GameSender.ScriptAnswerYesNo`),
they just had no buttons to ever fire from; clicking the lone "OK" button
instead fired `onOk` → `GameSender.ScriptAnswerNext(0)`, the wrong response
shape entirely for a yes/no answer. Fixed by passing `DialogType.YesNo`
explicitly. While fixing this, also fixed a related-but-cosmetic gap in the
adjacent `Say`/`SayImage` cases (0/1): both always rendered a plain "OK"
button too, ignoring the `hasPrev`/`hasNext` flags `FieldHandlers.ts`
already decodes correctly for this exact opcode (confirmed against
`CScriptMan::OnSay`, decompile/6DC110.c, also already cited by pass 14) —
multi-page NPC dialogue should show "Next" (or "Prev"+"Next" past the first
page), not "OK". The *response* was already correct either way (`onOk` is
wired to `ScriptAnswerNext(0)`, the right call for advancing dialogue), only
the on-screen button affordance was wrong; fixed by deriving the dialog type
from `args.hasPrev`/`args.hasNext`.

**Severe, confirmed (FIXED) — `_onTrunkResult` read two fields that don't
exist on the decoded shape at all (`i.isTrunk`, `i.position`), making the
Trunk panel's own contents permanently render under the wrong tab at the
wrong position.** `FieldHandlers._readTrunkBlock` (the only source of
`TrunkResultArgs.items`, re-confirmed this pass against `CTrunkDlg::OnPacket`,
decompile/76A990.c — there is no second, separate "player inventory" item
block anywhere in this opcode) emits `{invType, positionInType, itemId,
quantity}` per item; every item it ever decodes is trunk-side content, full
stop. The previous code filtered `args.items` by `i.isTrunk` — a field name
that has never existed on this shape — to split items between the Trunk tab
(`trunkItems`, always `[]` since `i.isTrunk` is always `undefined`) and the
"My Inventory" tab (`invItems`, which therefore received every real trunk
item instead, rendered under the wrong tab), and read `i.position` (the real
field is `positionInType`) for every item's slot, always falling back to
`0`. Net effect: the Trunk tab was permanently empty (Withdraw could never
be used — nothing to select), every real trunk item appeared mislabeled
under "My Inventory" instead, and clicking any of them called `OnDeposit`
with position `0` regardless of which item was actually clicked, instead of
the correct `OnWithdraw`. Fixed by mapping all decoded items into
`trunkItems` via the real `positionInType` field and passing `[]` for
`invItems` (no real inventory-side data exists in this opcode at all;
`Trunk.ts`'s "My Inventory" tab has no live data source until a real
cross-feed from `ItemInventory` is built for it — flagged as a separate,
real, NOT-fixed gap below rather than guessed at).

**Real bug (FIXED) — `_onMiniRoom`'s `MRP_EnterResult` case (initial
personal-shop open) passed the raw item-decoder shape straight to
`PersonalShop.OpenAsOwner`/`OpenAsVisitor` instead of remapping it to the
`ShopItemSlot` shape those methods actually expect, even though the
sibling `PSP_Refresh` case three cases later does this remap correctly.**
`FieldHandlers.handleMiniRoom`'s `MRP_EnterResult`/`PSP_Refresh` cases both
decode items as `{setCount, setSize, price, item}` (`item` being the full
decoded item object with its own `.itemId`). `PersonalShop.ShopItemSlot`
needs a flat `{index, itemId, name, setCount, setSize, price}`.
`PSP_Refresh`'s handler already did `args.items.map((i, idx) => ({index:
idx, itemId: i.item?.itemId ?? 0, name: ..., setCount: i.setCount, ...}))`
— `MRP_EnterResult` passed `args.items` straight through unmapped, so every
slot's `index`/`itemId`/`name` would read back `undefined` the moment a
player first opened (or visited) a personal shop, even though a later
`PSP_Refresh` packet would "fix" the same shop's display by accident.
Factored the existing `PSP_Refresh` remap out into a shared
`GameStage._toShopItemSlots()` helper and used it at both call sites.

**Confirmed real protocol bugs (FIXED) in `Enums.ts` — `ShopResultType` and
`TrunkResultType` both had wrong/fabricated semantics, independently
re-verified by reading `CShopDlg::OnPacket` (decompile/6EB7D0.c) and
`CTrunkDlg::OnPacket` (decompile/76A990.c) directly:**
- `ShopResultType`: the real switch has NO level-gating case anywhere —
  `LevelTooLow=14`/`LevelTooHigh=15` were fabricated names for what are
  really the "not enough mesos" (case 0xE, reads one int) and "not enough
  items" (case 0xF, reads one int) notices; `NotEnoughMesos` was previously
  pointing at value 2 (a generic shared-string case, not actually about
  mesos), and `NotEnoughItems=4`/`NotEnoughStock=5` pointed at a silent
  no-op case and another generic case respectively. Renamed/renumbered to
  the real semantics (`NotEnoughMesos=14`, `NotEnoughItems=15`, both still
  reading one int — the existing byte-level read in
  `FieldHandlers.handleShopResult` was actually fine, only the case
  *labels* attached to it were wrong) and fixed `GameStage._onShopResult`,
  which had separately hardcoded the same wrong raw numbers
  (`t===14||t===15` → "you must be level X") directly, bypassing the enum
  entirely. `UnknownItem=3`/`NotEnoughStock=5` (no real distinct semantics
  in this switch — both are just generic string-table notices) were
  removed rather than kept as fabricated names.
- `TrunkResultType.MoneyResult=26` does not exist as a case anywhere in
  this switch — confirmed by reading the function's full case list; value
  26 silently falls to the same generic `default` notice as every other
  unhandled byte. Removed. `GetItem=9` was also backwards: case 9 is the
  PUT-item-list refresh path (`CmpPutItem`/`m_pSBPut`), not a "get" path —
  renamed to `PutSync`.
- Also corrected a stale/wrong citation on `QuestRecordState` (it cited
  `enums.json:910-935`, which is actually an unrelated 18-case weapon-type
  enum) to point at the real confirming source instead
  (`CWvsContext::OnQuestRecordMessage`, decompile/A03920.c, already used by
  an earlier pass to fix `MessageType.QuestRecord`'s sibling bug).

**Investigated, confirmed NOT bugs (values correct, only documentation
issues found) — `MessengerAction`, `CwvsContextType`, `MovePathAttr`,
`MeleeAttackFlag`, `MapleStat`, `BodyPart`:**
- `MessengerAction` — re-verified all 9 values against `CUIMessenger::OnPacket`
  (decompile/7F5E40.c) byte-for-byte; all correct. Only `Hide=4`/
  `DeclineInvite=5`'s *names* are drift from the real function names
  (`OnInviteResult`/`OnBlocked`) — documented in place, not renamed (would
  touch every call site for a purely cosmetic gain).
- `CwvsContextType` — re-verified the 10 highest-traffic values directly
  against `CWvsContext::OnPacket` (decompile/9E5830.c); all correct.
  `SetField=141` is real but is NOT actually a case in that function (it
  `default: return`s at 141+) — it's dispatched one layer down in
  `CStage::OnPacket` (decompile/71B0B0.c); noted for accuracy.
- `MovePathAttr` — its own citation ("ENUM_CAvatar_v4") is misattributed:
  the real `ENUM_CAvatar_v4` (11 cases, `CAvatar::MoveAction2RawAction`,
  decompile/45FA30.c) is an unrelated local-rendering action-to-sprite-index
  table, not this wire-level per-element type byte. No `CMovePath::Decode`/
  `Encode` function exists anywhere in this decompile dump to check the
  real 38 values against. This enum DOES have live call sites
  (`MovePathEncoder.ts`) — flagged as still only test-self-consistent
  (existing `MobMove.spec.ts` coverage), not decompile-verified, with the
  bad citation corrected so it doesn't read as false confidence.
- `MeleeAttackFlag` — `MeleeAttackEncoder.ts`'s own citation
  ("CWvsContext::SendMeleeAttack at master_report.json:9340c0") is also
  wrong: decompile/9340C0.c is actually `CUserLocal::OnPacket`, an unrelated
  INBOUND dispatcher. No real sender function found. Also confirmed
  currently dead code (zero member reads anywhere). Flagged, not touched.
- `MapleStat` — independently re-read `GW_CharacterStat::DecodeChangeStat`
  (decompile/4FA000.c) myself rather than trusting the existing comment;
  all 22 bits confirmed distinct, sequential, and correct.
- `BodyPart` — confirmed zero call sites anywhere in `src/` (still dead
  code contradicting its own "replaces BodyPartSlot.ts" doc comment, same
  finding pass 13 already made). Partially corroborated against
  `ENUM_Global_nBodyPart`/`get_bodyaprt_name` (decompile/59EE20.c): found
  the real switch shares one case label between value 17 and a second
  value, 59 — both resolve to "Pendant" — meaning this enum is missing a
  second Pendant slot entirely. Since the enum is provably unreachable
  right now, this is a latent gap, not a live bug; not adding a speculative
  member for it.
- `TempStatMask` — the real mask (`SecondaryStat::DecodeForLocal`,
  decompile/A02FC0.c) is a 128-bit `UINT128` matched against opaque
  unnamed-value globals (`CTS_ComboAbilityBuff_1` etc., no header in this
  dump defines their numeric values) — the individual bit-to-stat
  assignments for the 14 named members couldn't be independently confirmed
  or refuted. Zero real call sites either. Flagged as unconfirmable, not
  touched.

**Investigated, confirmed UNCONFIRMABLE against this decompile export (no
contradicting evidence found, just no source to verify against) —**
`QuestRequestAction`, `GuildRequestAction` (no `CGuild` class body exists at
all in this dump, only the display-only `CTabGuild` UI wrapper),
`PartyRequestAction` (same, only `CTabParty` exists), `FriendRequestAction`
(no `CFriend` sender body — only the already-confirmed inbound
`OnFriendResult`), `ScriptAnswerAction`, `WhisperFlag`, `WhisperSendBit`,
`DropEnterType`/`DropLeaveType` (`CDropPool` is a destructor-only vtable
stub, zero real method bodies recovered), `ShopRequestAction`,
`MessengerRequestAction`, and the `TRP_*`/`PSP_*` half of
`MiniRoomProtocol` (the base `CMiniRoomBaseDlg::OnPacketBase` dispatcher,
decompile/639E10.c, confirms `MRP_Invite/InviteResult/Enter/EnterResult/
Chat/Leave` — all 6 spot-checked, all correct — but TRP_/PSP_ sub-actions
dispatch through a subclass virtual function this export doesn't include
any override body for). None of these show any internal inconsistency
(duplicate values, obvious gaps) — flagged as unconfirmed rather than
guess-fixed, with a consolidated note added near the top of `Enums.ts`
documenting exactly what was searched for so a future pass doesn't have to
re-derive the same dead end.

**Confirmed clean (read in full, zero findings beyond the above) — the
rest of `GameStage.ts`:** every other `on<Something>` callback assignment
in `_wireHandlers`/`_initMenu` (~90 callbacks total) was checked against its
real consumer method and found correctly wired with no stub/no-op/wrong-
field bugs; zero duplicate/conflicting assignments to the same callback
anywhere in the file (mechanically grepped every `.on[A-Za-z]+ *=`
assignment for collisions); the `_onMiniRoom`/`_onMessengerResult` inline
numeric dispatch values (5, 10, 15, 16, 17, 24, 25 for MiniRoom; 0-8 for
Messenger) all cross-checked against `MiniRoomProtocol`/`MessengerAction`
in the now-more-thoroughly-verified `Enums.ts` — all correct, just written
as magic numbers/comments instead of the named enum (cosmetic, left alone
to avoid unrelated churn); `_onScriptMessage`'s case values (0,1,2,3,4,5,
13,14,15) cross-checked against `ScriptMessageType.ts` — all correct.

**Real gap, confirmed, NOT fixed (documented, not built) — `Messenger`
panel has no avatar-portrait UI at all, so `MessengerAction.Avatar`/
`OnAvatar` (case 7, correctly decoded by `FieldHandlers.handleMessenger`)
has no corresponding `case` in `GameStage._onMessengerResult`'s switch and
is silently dropped.** Same "decoded correctly, no UI built yet" category
as several CashShop/ITC callbacks documented in earlier passes — confirmed
`Messenger.ts` has no avatar-related field/method of any kind to wire this
into. Not building speculative avatar-portrait UI this pass.

**Real gap, confirmed, NOT fixed — `Trunk.ts`'s "My Inventory" tab has no
live data source.** Exposed by the `_onTrunkResult` fix above: this opcode
family carries no inventory-side item data at all, so there is no
protocol-level source to feed `invItems` from. Building this would mean
cross-feeding `ItemInventory`'s already-tracked bundle-tab contents into
`Trunk.ts` (the same kind of cross-panel feed `EquipInventory` needed in
pass 13), which is a real, separate wiring task — not done here since it
touches a third file (`ItemInventory.ts`) beyond this pass's two-file scope.

Ran `npx tsc --noEmit` (0 errors) and `npx vitest run` (415/415 passing,
same count as before this pass — updated the existing `ShopResultType`/
`TrunkResultType` assertions in `tests/net/protocol/Enums.spec.ts` to the
corrected values/names; no other existing test asserted any of the other
old wrong values, and no test file exists for `GameStage.ts` at all to
update for the three bugs fixed there).

## Fifteenth pass: CashShop opcode coverage

Picked up the open "Inbound coverage gaps" item for the CashShop opcode family.
Read `OpCodes.ts`'s 13 `CashShop*` values, `CashShopHandlers.ts`, and
`CashShopStage.ts` first to get the real current state rather than trusting the
stale log line — found the actual gap had already shifted since that line was
written: a prior, unlogged edit to `CashShopHandlers.ts` had already added
`router.register` calls for all 13 opcodes (12 calls; 392/393 share one handler,
matching the real dispatch), each with a real decoder and a typed callback
field. What remained completely unwired was the consumer side:
`CashShopHandlers` is constructed once in `MapleClaudeGame.ts`
(`this.cashShopHandlers = new CashShopHandlers()`) and registered on the router,
but grepping every file in `src/` for its 12 callback names turned up zero
assignments anywhere — `CashShopStage.ts` (pushed from `GameStage.onCashShop`)
never touched `game.cashShopHandlers` at all, and its own `_nxCredit`/
`_nxPrepaid`/`_maplePoints` fields were write-never/read-never dead state, same
bug class as pass 13's `EquipInventory` finding (decode correct, nothing
forwards the data to the screen).

**Verified all 12 existing decoders against the real dispatch and each
sub-handler's body, confirmed byte-exact, no changes needed to
`CashShopHandlers.ts` itself:**
`CCashShop::OnPacket` (`decompile/4997E0.c`) confirms the real switch: case
382→`OnChargeParamResult`, 383→`OnQueryCashResult`, 384→`OnCashItemResult`,
385→`OnPurchaseExpChanged`, 386→`OnGiftMateInfoResult`,
387→`OnCheckDuplicatedIDResult`, 388→`OnCheckNameChangePossibleResult`,
390→`OnCheckTransferWorldPossibleResult`,
391→`OnCashShopGachaponStampResult`, 392/393→`OnCashItemGachaponResult` (one
function, two case labels — matches `CashShopCashItemGachaponResultA`/`B`
both routing to `_handleCashItemGachaponResult`), 395→`OnOneADay`,
396→`OnNoticeFreeCashItem` — exactly the 13 `OpCodes.ts` values, no gaps, no
extra cases, `default: return` for anything else. Read every one of the 12
sub-handler bodies (`decompile/496320.c`, `496400.c`, `499370.c`, `493F10.c`,
`48FFA0.c`, `497FB0.c`, `495470.c`, `4980B0.c`, `4983A0.c`, `495820.c`,
`495950.c`, `4959C0.c`) and confirmed field-for-field:
- `OnChargeParamResult`: single `DecodeStr` — matches `p.readString()`.
- `OnQueryCashResult`: three `Decode4`s, `nexonCash`/`maplePoint`/
  `prepaidNxCash` in that order — matches exactly.
- `OnCashItemResult`: `Decode1` sub-action byte, then its own internal 58-way
  switch (`case 0x54`...`0x7A`+, one dedicated sub-function per cash-shop
  action — buy/gift/coupon/wish/locker/slot-count/etc.). Confirmed this really
  is unmappable in one pass (58 sub-functions, each its own decompiled body) —
  the existing generic `{subAction, payload}` decode is the correct level of
  honesty here, not a gap introduced this pass.
- `OnPurchaseExpChanged`: single `Decode1` — matches `p.readByte()`.
- `OnGiftMateInfoResult`: `Decode1` success flag; if false, no further read
  (matches the early-return branch); if true, `Decode4`×2 (ssn2, commoditySn)
  then `DecodeStr`×2 (giveTo, text) then `CharacterData::Decode` (opaque,
  consumed as the remaining-bytes payload) — matches exactly.
- `OnCheckDuplicatedIDResult`: `DecodeStr` (name) THEN `Decode1` (result) —
  name first, matches the existing `readString()` then `readSByte()` order.
- `OnCheckNameChangePossibleResult`: `Decode4` (characterId, discarded) →
  `Decode1` (result) → `Decode4` (birthDate, unsigned per the real
  `unsigned int nBirthDate`) — matches `readInt()` discard,
  `readSByte()`, `readUInt()` exactly.
- `OnCheckTransferWorldPossibleResult`: `Decode4` (characterId, discarded) →
  `Decode1` (result) → `Decode4` (birthDate) → `Decode1` (hasWorldList) → if
  true, `Decode4` (count) then `count× DecodeStr` — matches exactly.
- `OnCashShopGachaponStampResult`: `Decode1` (success); if true, `Decode4`
  (stamp count); if false, nothing further — matches
  `success ? readInt() : null` exactly.
- `OnCashItemGachaponResult`: `Decode1` (subType); if `0xC1`(193),
  `DecodeBuffer` 8 bytes (`_LARGE_INTEGER` itemSn) → `Decode4` (count) →
  `DecodeBuffer` 0x37 bytes (`GW_CashItemInfo`, opaque) — matches
  `readLong()`, `readInt()`, `skip(0x37)` exactly, including the `0xC1`
  sentinel value; `else if (subType == 0xC0)` is a pure client-side failure
  notice with no further packet data, matching the existing `else` branch
  returning `isSuccess: false`.
- `OnOneADay`: `Decode4`×2 (itemDate, itemSn) → `Decode4` (count) → if count>0,
  `DecodeBuffer` count×12 bytes (`OneADayInfo`, opaque 12-byte struct) —
  matches `readInt, readInt, readInt` then `count× skip(12)` exactly.
- `OnNoticeFreeCashItem`: reads nothing from the packet at all (pure
  client-side dialog trigger) — matches `onNoticeFreeCashItem?.()` taking no
  packet args.

**Real bug (FIXED) — `CashShopStage.ts` had zero consumers for any of the 12
now-decoded callbacks; `_nxCredit`/`_nxPrepaid`/`_maplePoints` were dead
fields (written nowhere, read nowhere) despite the panel having dedicated
screen space for them (`_bgStatus`, the CSStatus background sprite).** Fixed
by adding `_wireHandlers(game)`/`_unwireHandlers()`, called from
`onEnter`/`onExit` respectively (handlers must be (re)bound per stage
push/pop rather than once at construction, since `CashShopHandlers` is a
single long-lived instance on `MapleClaudeGame`, not per-stage state —
`onExit` calls `game.cashShopHandlers.clear()`, safe since `CashShopStage` is
confirmed the only consumer anywhere in `src/`). `onQueryCashResult` now
feeds `_nxCredit`/`_nxPrepaid`/`_maplePoints`, rendered as a new status-bar
text line in `update()` (previously nothing displayed the cash balance at
all, even though the screen region for it already existed). The other 9
callbacks (`onNoticeFreeCashItem`, `onChargeParamResult`,
`onGachaponStampResult`, `onCashItemGachaponResult`, `onOneADay`,
`onCheckDuplicatedIDResult`, `onCheckNameChangePossibleResult`,
`onCheckTransferWorldPossibleResult`, `onGiftMateInfoResult`,
`onPurchaseExpChanged`, `onCashItemResult`) have no dedicated dialog/panel
built in this client (no name-change-confirmation UI, no gachapon-roll
panel, no gift-mate compose panel, etc. — same "decoded correctly, no
panel built yet" gap pass 12 documented for `ITCHandlers`'
`onItemList`/`onChargeResult`/`onQueryCashResult`) — wired each to a single
shared `_statusMessage` field rendered as one line of feedback text at the
bottom of the panel, so every one of these server responses is now visibly
surfaced to the player instead of silently dropped, without fabricating
dedicated panels this pass wasn't scoped to build.

**Not fixed, not a gap — `CashShopCashItemResult`'s internal 58-way
sub-action switch.** `CCashShop::OnCashItemResult` (`decompile/499370.c`)
dispatches its own leading byte across 58 distinct sub-functions covering
every cash-shop transaction outcome (buy/gift/coupon-use/wish-list/
locker-load/slot-count-increase/etc., `0x54`-`0x7A`+). Mapping all 58
field-for-field is out of this pass's scope (it would mean reading and
porting 58 more decompiled functions, each its own per-transaction-type
shape) — the existing `{subAction, payload}` decode plus the new generic
`onCashItemResult` status-line consumer is the correct, honest level of
support: the opcode is routed and reaches the UI, just not broken out by
sub-action. Documented, not guessed at further.

Ran `npx tsc --noEmit` (0 errors) and `npx vitest run` (415/415 passing, same
count as before this pass — `tests/net/handlers/CashShopHandlers.spec.ts`
already covered every decoder this pass verified against the decompile
listed above with no changes needed, since none of the 12 decode shapes were
wrong; this pass's only code change was the consumer wiring in
`CashShopStage.ts`, a pure UI-wiring fix with no existing fixture
infrastructure to extend, consistent with this codebase's standing pattern
for that class of fix — see pass 13/14's identical reasoning for
`EquipInventory.ts`/`Revive.ts`).

## Fourteenth pass: UI widget / gameplay-effect tail (`ScriptText`, `EmotionBubble`, `TombstoneEffect`, misc widgets)

Full read-through of 15 files never named in any prior pass's coverage
statements (grepped every filename against this entire log first to confirm):
`ui/BuiltInFont.ts`, `ui/Checkbox.ts`, `ui/TextField.ts`, `ui/MuteButton.ts`,
`ui/DamageDigits.ts`, `ui/game/FamilyWindow.ts`, `ui/game/MiniMapMarkers.ts`,
`ui/game/Revive.ts`, `ui/game/ScriptText.ts`, `ui/game/TooltipAssets.ts`,
`character/EmotionBubble.ts`, `character/TombstoneEffect.ts`, `map/MapInfo.ts`,
`platform/MapleCursor.ts`, `net/packet/ScriptMessageType.ts` — plus their
direct callers (`GameStage.ts`, `character/DamageNumber.ts`). Found and fixed
a cluster of severe bugs: two completely unwired gameplay-effect classes
(`EmotionBubble`/`TombstoneEffect` were imported, fielded, and called from
`GameStage.ts` on every relevant event, but never once *constructed*, making
every call a silent no-op), a shared-Sprite-instance bug that collapsed
repeated digits/glyphs onto a single on-screen position in three independent
files, and a panel (`Revive`) that rendered nothing at all despite being
fully wired into the click/update/draw dispatch lists.

**Severe, confirmed (FIXED) — `EmotionBubble` and `TombstoneEffect` were
never constructed anywhere in the codebase.** `GameStage.ts` declares
`protected _emotionBubble: EmotionBubble | null = null` and
`protected _tombstone: TombstoneEffect | null = null`, imports both classes,
calls `_emotionBubble?.Update(dt)`/`_tombstone?.Update(dt)` every frame, and
calls `_emotionBubble?.Add(...)` from the `onUserEmotion` handler and
`_tombstone?.Spawn(...)` from the HP-hits-0 branch of `_onStatChanged` — but
grepping the entire codebase for `new EmotionBubble`/`new TombstoneEffect`
turned up zero hits. Every one of those call sites was a no-op behind the
`?.` guard the whole time: no emoji bubble ever appeared over a player's
head, and no tombstone-fall animation ever played on death (silently
skipping straight to whatever HP-zero handling exists otherwise). Same bug
class as pass 13's `EquipInventory` finding — both ends compile, the field
is just always null. Fixed by constructing both in `GameStage.ts` right
after `DamageDigits` (`this._emotionBubble = new EmotionBubble(this._effectWz,
this._loader)`; `this._tombstone = new TombstoneEffect(this._effectWz,
this._mobSoundWz, this._loader, this.game.audioPlayer)` — `_mobSoundWz`
already holds the opened `Sound.wz` package `TombstoneEffect` needs for
`Game.img/Tombstone`, confirmed via the existing `_mobSounds = new
MobSoundService(this._mobSoundWz, ...)` line). Wired `_tombstone.OnLanded`
to open `_revivePanel` (matches the real client's flow: the revive prompt
appears once the tombstone-fall animation finishes landing, not the instant
HP hits 0 — `_isPlayerDead` itself is still set immediately in
`_onStatChanged`, unchanged). Added `_tombstone.Reset()` + re-adding both
classes' containers to `mapRoot` inside `_onSetField` (every field load), and
added the actual scene-graph wiring neither class had at all before this
pass (see next two findings).

**Severe, confirmed (FIXED) — even once constructed, neither class had any
path to the screen: `EmotionBubble.RebuildDisplay()`/`TombstoneEffect.Draw()`
were never called, and `DamageNumber.container`/`RebuildDisplay()` —
`EmotionBubble`'s established sibling pattern — had exactly the same gap.**
`TombstoneEffect.ts`'s `Draw()` didn't even exist; it was a stale fully
commented-out stub ("Draw omitted — requires pixi.js SpriteBatch
equivalent") left over from an earlier, incorrect assumption — this codebase
already draws one-shot world-space effects with plain v8 `Sprite`s elsewhere
(`EmotionBubble`, `DamageNumber`), no SpriteBatch needed. Implemented a real
`TombstoneEffect.Draw(worldToScreen)` (persistent `container`/`_sprite`
fields, texture/anchor swapped per current frame) and wired it into
`GameStage.draw()`. For `EmotionBubble`, added a persistent `_emotionLayer`
Container (added to `mapRoot` once per field load) that swaps in
`RebuildDisplay()`'s fresh wrapper each frame, destroying the previous
frame's wrapper *and* its children (see next finding for why that destroy
is now required). While fixing this, discovered `DamageNumber.container`
was *also* never added to any container and `RebuildDisplay()` was never
called from `GameStage.ts` at all — `_dmgNumbers.Add()`/`.Update()` ran every
frame but the result never reached the screen, meaning **every floating
damage number in the game has been completely invisible** independent of
the bugs below. Fixed by adding `_dmgNumbers.container` to `mapRoot` in
`_onSetField` and calling `_dmgNumbers.RebuildDisplay(...)` in
`GameStage.draw()`.

**Severe, confirmed (FIXED) — shared-cached-Sprite-instance bug in
`DamageDigits.ts`, `EmotionBubble.ts`, and `TooltipAssets.ts`: any digit/glyph
value appearing more than once on screen at the same time collapsed onto a
single Sprite, so only the last-positioned occurrence was ever visible.**
`render/WzSprite.ts`'s `ToPixi()` caches and returns ONE Sprite instance per
`WzSprite` (`if (this._pixi && !this._pixi.destroyed) return this._pixi`),
with `NewSprite()` existing specifically for "the same WzSprite must appear
in multiple containers simultaneously" (its own doc comment). All three
files called `ToPixi()` in a loop/multi-instance context instead:
- `DamageDigits._digitSprite` pooled by digit-position-within-string and
  called `src.ToPixi()` for each position — drawing "88" or "100" (any
  number with a repeated digit, extremely common) called `ToPixi()` twice
  for the same digit's `WzSprite`, getting the same cached Sprite back both
  times; `addChild`-ing it the second time just relocated it, so the number
  visually rendered with the repeated digit missing/merged into one position.
  Worse: this pool was *global*, keyed only by digit-index-within-the-current-
  call, with no per-damage-number scoping at all — `DamageNumber.RebuildDisplay`
  loops over every simultaneously-visible damage number and calls
  `DrawNumber`/`DrawMiss` once per entry, so **two damage numbers on screen
  in the same frame reused the identical pool slots**, meaning only the
  last-processed entry in any given frame was ever actually visible; every
  earlier one's sprites silently jumped to the last one's position. Fixed by
  (a) switching `_digitSprite` to `NewSprite()` + explicit anchor refresh on
  reuse (the texture-swap path never updated `.anchor`, leaving a stale
  anchor from whichever digit first occupied that pool slot — a second,
  independent bug), and (b) re-keying the entire pool by
  `${slotKey}:${digitIndex}` instead of bare `digitIndex`, with a new
  `beginFrame(liveSlotKeys)` method `DamageNumber.RebuildDisplay` calls once
  per frame to destroy (not just hide) any slot whose owning damage number
  expired — without this the per-entry pool would otherwise grow unboundedly
  over a play session (every `DamageNumber.Add()` call uses an incrementing
  id as its `slotKey`). `DamageNumber.ts` updated to pass a stable per-entry
  `id` as the slot key and to track `kind` on each `Entry` (previously
  discarded after deriving `color` once), which also surfaced and fixed a
  separate dead-code gap: `DrawNumber`'s `crit` parameter was hardcoded
  `false` at its only call site, so the already-loaded gold/crit digit-skin
  sprite set (`DamageDigits._crit`, fully loaded and ready) was completely
  unreachable. Now `RebuildDisplay` passes `e.kind === DamageKind.DamageCrit`
  through. **Still a real, NOT-fixed gap**: nothing anywhere in `GameStage.ts`
  ever calls `_dmgNumbers.Add(dmg, x, y, DamageKind.DamageCrit)` — the one
  call site (line ~1358) always uses the default `MobDamage` kind, so the
  crit path is now reachable in code but has no real crit-detection signal
  feeding it; that needs real combat-data crit flagging, out of scope here.
  Also fixed: `DamageNumber.RebuildDisplay`'s non-digit fallback `Text` path
  created a fresh `new Text(...)` every single call with no cleanup — the
  exact `StatusBar`/`CashShopStage` leak class pass 5/6 already fixed
  elsewhere, just never caught here since the digit-sprite path normally
  takes over once `DamageDigits` loads successfully. Switched to one
  persistent `Text` per entry id, hidden (not destroyed) while the entry's
  digits are render-able, destroyed in `Update()` when the entry expires.
- `EmotionBubble.RebuildDisplay` had the identical bug: `_animCache` caches
  one `Anim`/`WzSprite` set per emotion name, shared across every player who
  ever plays that emotion — two players both "winking" at the same time
  would call `frame.Sprite.ToPixi(false)` on the same cached `WzSprite` for
  both, collapsing both bubbles onto whichever was positioned last. Fixed by
  switching to `NewSprite(false)`. Since `NewSprite()` allocates a fresh,
  unshared Sprite every call (unlike `ToPixi()`, which is safe to leave
  attached forever since the `WzSprite` itself owns the single cached
  instance), the `GameStage.draw()` call site needed updating too: the old
  code only destroyed the per-frame wrapper Container, not its children,
  which was correct for the old `ToPixi()`-based sprites (owned elsewhere)
  but would now leak a fresh Sprite into memory every single frame. Fixed
  to destroy the previous frame's children before swapping in the new ones.
- `TooltipAssets.BlitAt` had the same bug for an even more common case:
  `DrawNumber` calls `BlitAt` once per digit of a value like 100 — two
  separate '0' digits — via the same cached-per-WzSprite `ToPixi()`. Fixed to
  `NewSprite()`. `TooltipAssets`/`ItemTooltip._assets` are currently dead
  code (next finding), so this fix is "free and correct now whenever it does
  get wired up," matching pass 7's `ListService` precedent for the same
  situation.
Also fixed, while touching the same lines: both `DamageDigits.DrawNumber`/
`DrawMiss` and `TooltipAssets.BlitAt` additionally added the sprite's raw
pixel `OriginX`/`OriginY` on top of the draw position (`x + sp.OriginX`,
`x - sprite.OriginX`) — redundant with the anchor `ToPixi()`/`NewSprite()`
already set to `(OriginX/Width, OriginY/Height)`, which alone is sufficient
to land the sprite's hotspot exactly at the given `(x,y)` with no further
adjustment (confirmed against this codebase's own established convention,
`map/MapScene.ts`'s tile/object blit, which does `s.position.set(bx, by)`
with no Origin arithmetic at all once the WzSprite-returned anchor is set).
Removed both redundant offsets.

**Severe, confirmed (FIXED) — `Revive.ts` (the "you have died, return to
town?" panel) never added anything to its own `_root` container at all.**
Despite being fully wired into `GameStage`'s click/update/draw/panel-list
dispatch (`_panels.push(..., this._revivePanel, ...)`,
`this.uiRoot.addChild(this._revivePanel.container)`), the constructor loaded
a background sprite and an OK button but never called `_root.addChild` for
either — the panel rendered nothing whatsoever, not even a fallback box,
every time a player died. Same bug class as pass 5's "8 panels with
invisible buttons" finding. Also: the constructor probed for the real WZ
`BtYes`/`BtOK`/`BtRevive` button art via `_probeAssets` but then always built
a generic `new Button('OK')` instead of `Button.fromWz(loader, btYes, 'OK')`
— losing the real button art for a fallback box, the same specific mistake
pass 5 fixed in `GoldHammer`/`ItemProtector`/etc. Fixed both: added the
missing `addChild` calls, switched to `Button.fromWz` when WZ art is found,
and added a plain fallback background + "You have died. / Return to town?"
message for the no-WZ-art case (this panel previously had zero fallback
text of any kind, unlike most other panels in this codebase). Also fixed:
`_alpha` was computed every frame (a fade-in over `FadeSeconds`) but never
applied to anything — `this._root.alpha = this._alpha` was simply missing,
making the fade-in dead code that computed a value nobody read. Also fixed:
`Relayout(viewWidth, viewHeight)` is a public method with zero callers
anywhere (`GameStage.onResize` updates `_equip`/`_item`/`_quickSlots` but not
`_revivePanel`) — `_viewW`/`_viewH` permanently stayed at their hardcoded
1024×768 defaults regardless of the actual window size, so the panel would
center on the wrong point after any resize. Added
`this._revivePanel?.Relayout(windowW, windowH)` to `onResize`.

**Confirmed correct against the decompile — `ScriptMessageType.ts`'s numeric
dispatch values, verified the same way pass 9 verified `MessageType`.**
`CScriptMan::OnScriptMessage` (`decompile/6DE0F0.c`) is the real dispatch
switch: `Say=0, SayImage=1, AskYesNo=2, AskText=3, AskNumber=4, AskMenu=5,
AskQuiz=6, AskSpeedQuiz=7, AskAvatar=8, AskMembershopAvatar=9, AskPet=10,
AskPetAll=11`, **no case 12 at all** (falls to `default`), `AskAccept=13`
(dispatches to the same `OnAskYesNo` function as case 2, just with different
trailing args — `(ZXString<char>*)1` sentinel vs. `nullptr`), `AskBoxText=14`,
`AskSlideMenu=15`, then `default` for everything ≥16. Every value 0-11/13-15
in `ScriptMessageType.ts` matches exactly, and `FieldHandlers.handleScriptMessage`
only ever switches on those confirmed values. `Script=12` and `AskCenter=16`
are unconfirmed/fabricated (the real switch has no behavior for either) but
harmless — grepped every call site in `src/`, neither is ever produced or
consumed anywhere outside the enum declaration itself, same "unconfirmed but
unreachable" category as pass 9's `EncryptedMessage`/`OpenURL`/
`WheelOfFortune`. Also independently confirmed `ScriptMessageParam
.SpeakerOnRight = 0x4`'s usage: `CScriptMan::OnSay` (`decompile/6DC110.c`)
gates its conditional speaker-template-id `Decode4` read on exactly
`(bParam & 4) != 0`, byte-for-byte matching
`FieldHandlers.ts`'s `if ((messageParam & ScriptMessageParam.SpeakerOnRight)
!== 0) p.readInt()`; the following `bPrev`/`bNext` read order
(`Decode1` then `Decode1`) also matches `args.hasPrev = p.readBool(); args.hasNext
= p.readBool()` exactly. `AskSlideMenu`'s real decoder
(`CScriptMan::OnAskSlideMenu`, `decompile/6DBE50.c`) immediately hands the
packet to `CSlideMenuDlgEX`'s constructor for further internal decoding not
exposed at this call level — the dispatch value is confirmed correct, but
the per-field shape `FieldHandlers.ts` reads for this case
(`text/slideMenuType/defaultNum`) is genuinely unconfirmable beyond that,
same "dispatch correct, field shape can't be checked deeper" category as
several ITC/CashShop findings in earlier passes; not guessed at further.

**Real gaps found, confirmed, NOT fixed (architecturally blocked or out of
scope):**
- `FamilyWindow.ts` — `Reputation`/`TodayRep`/`JuniorCount`/`InFamily` are
  never written by anything in the codebase (same permanently-empty-panel
  bug class as pass 13's `EquipInventory`, except here there's no existing
  inbound data to route — confirmed no `Family`-prefixed `OutHeader`/handler
  exists anywhere in `OpCodes.ts`/`src/net/handlers/`, only an unrelated
  per-character login-screen `onFamily` boolean in `LoginHandlers.ts` used
  for the char-select card display). Additionally, `isVisible` is never set
  `true` anywhere — no button/keybind/chat-command opens this panel at all,
  unlike every other `_panels`-registered window in this codebase. Real,
  but needs both a new protocol family and a new UI entry point — same
  "needs new UI + new protocol" category as the still-open Guild UI gap
  from pass 3, not a quick fix.
- `ItemTooltip._assets` (a `TooltipAssets` instance) is threaded through two
  separate construction sites (`EquipInventory.ts`, `ItemInventory.ts`) and
  stored as a field, but is never read by any method in `ItemTooltip.ts` —
  `_drawEquip`/`_drawConsumable` draw every stat/requirement/digit by hand
  with raw `Graphics` rects instead of the real WZ tooltip-chrome sprites
  (`Can`/`Cannot` job labels, `Dot`/`Property`/`Speed`/`WeaponCategory`
  digit-style glyphs, `Star`) that `TooltipAssets` exposes and which this
  pass's `BlitAt`/anchor fixes now make safe to actually call. Wiring this
  up is a real rendering rewrite of `ItemTooltip`'s two draw methods, out of
  this pass's scope — documented, not built.
- `Checkbox.ts`'s "remember my ID" checkbox in `LoginStage.ts` toggles its
  own sprite state correctly (`isChecked`/`refresh()` both wired right), but
  `isChecked` is never *read* anywhere — the login ID is never actually
  persisted/restored across sessions regardless of the checkbox's state.
  `Checkbox.ts` itself works exactly as designed; this is a missing
  credential-persistence feature one layer up, and deliberately not built
  here without being asked — same caution pass 9 applied to not
  auto-wiring `onOpenUrl` (persisting login identifiers is a feature
  decision, not a bug fix).
- `MiniMapMarkers.ts`'s `Friend`/`Guild`/`GuildMaster`/`Party`/`PartyMaster`/
  `StartNpc`/`EndNpc` sprites are all loaded correctly but never read by
  `MiniMap.ts` (its only consumer) — `MiniMap`'s own `_npcs`/`_others` arrays
  are plain `{x,y}` tuples with no role tag distinguishing a quest-start NPC
  from any other NPC, or a friend/guildmate/party member from a generic
  other player. `MiniMapMarkers.ts` itself is complete and correct; the gap
  is in its caller's data model, one layer further out than this pass's
  15-file scope.

**Confirmed clean / correct (read in full, no changes beyond the above):**
`BuiltInFont.ts` (canvas-measurement caching, word-wrap, and truncation logic
all internally consistent, no off-by-one); `MuteButton.ts` and its caller in
`app/Stage.ts` (`SetMouse`/`handleMouseButton`/`ServiceAndDraw` all correctly
invoked every frame); `TextField.ts` and its two callers (`LoginStage.ts`'s
mutual-exclusion focus logic between the ID/password fields, and
`CharCreationStage.ts`) — focus/cursor/backspace/maxLength all correct, no
double-input bug despite `onTextInput` being called unconditionally on both
fields per keystroke (each field's own internal `if (!this.isFocused)
return` guard makes that safe); `MapInfo.ts` (plain WZ-key-mirroring struct,
all 19 fields read by `FieldScene.ts` under matching key names, no
transposition; `HasVR`'s `VRRight > VRLeft && VRBottom > VRTop` is correctly
non-degenerate and is read by `Camera2D.ts`); `MapleCursor.ts` (both
`loadFromWz`/`setCursorTexture` confirmed wired from `SplashStage.ts`/
`LoginStage.ts`; no `CWndMan`-style cursor-WZ-index function exists in this
decompile to verify the `Basic.img/Cursor/0`-and-`/12` indices against
beyond the long-public convention, same unconfirmable-but-consistent
category as `AttackAction.ts`'s weapon table from pass 11).

Ran `npx tsc --noEmit` (0 errors) and `npx vitest run` (415/415 passing,
same count as before this pass — no test file exists for any of
`DamageDigits.ts`/`DamageNumber.ts`/`EmotionBubble.ts`/`TombstoneEffect.ts`/
`Revive.ts`/`TooltipAssets.ts`/`ScriptMessageType.ts`, consistent with this
codebase's standing pattern of not always adding new tests for UI-wiring/
rendering fixes when there's no existing fixture infrastructure for
pixi-level Sprite/Container assertions).

## Thirteenth pass: domain/avatar-zmap/equip structs

Full read-through of 13 files never named in any prior pass's coverage
statements (grepped every filename against this entire log first to confirm):
`domain/CharacterStat.ts`, `domain/InventoryItem.ts`, `domain/Account.ts`,
`domain/BodyPartSlot.ts`, `domain/ChannelInfo.ts`, `domain/CharacterEntry.ts`,
`domain/FuncKeyMapped.ts`, `domain/WorldInfo.ts`, `map/BackInfo.ts`,
`map/ObjInfo.ts`, `character/AvatarZMap.ts`, `ui/game/CharInfo.ts`,
`ui/game/EquipInventory.ts` — plus every constructor/call site for each
(`AvatarCodec.ts`, `LoginHandlers.ts`, `ItemDecoder.ts`, `CharacterRenderer.ts`,
`CharSelectStage.ts`, `CharCreationStage.ts`, `ClientSession.ts`,
`WorldSelectStage.ts`, `KeyConfig.ts`/`KeyConfigLayout.ts`/`QuickSlotBar.ts`,
`GameStage.ts`, `ItemInventory.ts`). Found and fixed one real, severe wiring
gap (`EquipInventory` was permanently empty); confirmed everything else
clean or architecturally unconfirmable against this decompile.

**Real bug (FIXED) — `EquipInventory` (the paper-doll equipment panel) had
zero data sources anywhere in the codebase; its `equip`/`setEquipped`/
`unequip`/`findSlotByItemId` methods were never called from any file.**
Grepped every call site across `src/`: `GameStage.ts` constructs
`EquipInventory`, wires its `onUnequip` callback (outbound, confirmed
correct — sends `GameSender.ChangeSlotPosition(InventoryType.Equip,
-bodyPart, freeSlot, 1)`), and reads `tooltipContainer`/`onResize`/
`SetPlayerStats`, but never once calls any method that would populate its
internal `_equipped` map. Meanwhile `fh.onInventoryOperation` (the real
inbound equip/unequip event stream, decode shape already confirmed in pass
10 against `CWvsContext::OnInventoryOperation`, `decompile/A08A70.c`) was
routed only to `this._item.applyOps(ops)` — `ItemInventory` (the
bundle/tab-based inventory list) correctly tracks equip-tab items including
negative (worn) positions internally, but nothing ever forwarded that data
to the separate paper-doll panel. Net effect: the dedicated Equipment
window always rendered every slot empty regardless of what the character
actually had equipped, even though the underlying protocol data was being
decoded and stored correctly the whole time — a real, severe, but pure
client-side display-wiring gap, same bug class as pass 4's "both ends
compile, callback is always null" findings, just on the inbound side
instead of outbound. Fixed by adding `setEquippedByBodyPart`/
`unequipByBodyPart` to `EquipInventory.ts` (keyed by body-part number,
matching the wire's `-bodyPart` slot convention directly, rather than by
`EquipInventory`'s internal string slot-key, since the wire data has no
slot-key concept) and a new `_applyEquipOps` in `GameStage.ts` that mirrors
every equip-tab `Add`/`Move`/`Remove` op with a negative position into the
panel after `_item.applyOps` runs. The `Move` case (equip from inventory or
unequip back to inventory — same opcode, direction told apart by the sign of
`pos` vs. `newPos`) needed one extra lookup: `_item.applyOps` already
relocated the item to `newPos` by the time `_applyEquipOps` runs, so the new
`ItemInventory.itemIdAt(tab, pos)` helper resolves the item id at the
destination slot rather than guessing it from the op alone (the wire's Move
op carries no item id, only positions). `UpdateExp` ops correctly produce no
visual change (they don't move anything). No decompile citation needed for
the `EquipInventory`-side fix itself — it's purely local display state with
no server-side equivalent; the inbound data feeding it was already
decompile-verified in pass 10.

**Investigated, confirmed NOT a bug — `AvatarZMap.ts`'s 35-entry fallback
z-order table.** This is the avatar-part draw/layer order
(`weaponOverGlove` frontmost ... `weaponBelowBody` backmost) used only when
`Base.wz/zmap.img` fails to load. No `CWvsContext::DrawCharacter`/avatar-
compositing function exists anywhere in this decompile dump to verify the
order against directly (grepped `function_index.txt` for every plausible
name — the only "zmap" hits are unrelated `ZMap<K,V>` C++ template
instantiations, zero relation to the avatar z-order); same "genuinely
unconfirmable, not guessed at" category as `StatDerived.ts`'s formulas
(pass 12) and `AttackAction.ts`'s weapon table (pass 11). Checked the list
by hand for internal validity instead: all 35 entries are unique (no
duplicates, confirmed programmatically), and the order matches the
long-public, well-known real MapleStory v95 `zmap.img` z-order exactly.
Also confirmed the *primary* path (real `zmap.img` loaded from `Base.wz`)
is unaffected either way — `CharacterRenderer.ts`'s `_zmap.FrontIndex(z)`
sorts by whatever order the WZ file's `Object.keys(img.Root.Items)` produces,
and `WzProperty.Items` is a plain object built by sequential
`_readItems()` parsing — JS preserves insertion order for non-integer-like
string keys (all zmap names are), so the WZ file's real declared order is
preserved correctly regardless of whether the fallback table is ever right.
The fallback table only matters on `Base.wz` load failure, an edge case, and
is correct anyway.

**Investigated, confirmed NOT a bug — `BodyPartSlot.ts` vs. the newer,
larger `BodyPart` enum in `net/protocol/Enums.ts`.** `Enums.ts`'s own doc
comment says it "replaces" `BodyPartSlot.ts`, which raised a duplication-drift
concern, but every numeric value the two share (`Hair=0` through `Weapon=11`,
`Medal=49`, `Belt=50`, `CashBase=100`, `CashWeapon=111`) is byte-for-byte
identical between the two enums — `BodyPartSlot.ts` is simply the original,
smaller subset still imported directly by `CharacterRenderer.ts` and
`CharCreationStage.ts`for the slots they actually need, not a drifted fork.
`EquipInventory.ts`'s own `SLOTS` table (`Hat→1, FaceAcc→2, EyeAcc→3,
Earring→4, Top/Overall→5, Bottom→6, Shoes→7, Gloves→8, Cape→9, Shield→10,
Weapon→11, Ring1→12, Ring2→13, Pendant→17, Belt→49, Medal→50`) was checked
field-by-field against both enums — every value matches exactly, no swap.
`GameStage._equipBodyPart`'s item-category→body-part dispatch table (a third,
independent encoding of the same mapping, used to compute which slot an
inventory item being double-clicked should equip into) was also checked
against both enums — also consistent. No `is_correct_bodypart`/
`GetEquipSlot`-style function exists anywhere in this decompile to verify
the *category number* side of `_equipBodyPart`'s table (itemId category
100→Hat, 101→FaceAcc, etc.) against, only the well-known public MapleStory
item-id convention — same unconfirmable-but-consistent category as
`AttackAction.ts`'s weapon table (pass 11); not touched.

**Confirmed clean / architecturally unconfirmable (read in full, no changes):**
`CharacterStat.ts`/`Account.ts`/`WorldInfo.ts`/`ChannelInfo.ts`/
`CharacterEntry.ts` — all five are populated exclusively by `LoginHandlers.ts`/
`AvatarCodec.ts`, both already confirmed clean in pass 6 with no decompile
citation possible (these are login/world-select/character-select opcodes,
outside the `CWvsContext::OnPacket` 28-140 dispatch range this export covers
at all — confirmed again this pass, `function_index.txt` has zero hits for
`GW_CharacterStat`'s decode body, `OnCheckPasswordResult`,
`OnSelectWorldResult`, or `OnWorldInformation` under any name).
`CharacterStat.spRaw`/`petSn1`/`petSn2`/`petSn3` are write-only (populated by
`AvatarCodec.DecodeCharacterStat`, read by zero consumers anywhere in
`src/`) — dead fields, harmless, not a decode bug since the decode itself is
internally consistent (`IsExtendSpJob`'s branch already correctly cited
against `decompile/4F9CB0.c`/`4FA000.c` by name in `Enums.ts`'s `MapleStat.Sp`
doc comment, pre-existing from pass 10). `CharacterEntry.rank`'s 4 fields
(`worldRank`/`worldRankMove`/`jobRank`/`jobRankMove`) are all four actually
read by `CharSelectStage._drawCardStats` — initially suspected `jobRank`/
`jobRankMove` might be dead (only `worldRank`/`worldRankMove` are visually
adjacent in the file), checked and both are used a few lines later. `Account`'s
18 fields are all written by exactly one of `handleCheckPasswordResult`/
`handleSelectWorldResult` in `LoginHandlers.ts`, in matching order, no
unused/extra fields. `InventoryItem.ts`/`EquipStats`'s field shape was
already resolved in an earlier session (`net/packet/ItemDecoder.ts` "RESOLVED"
entry, log-searchable above) — `ItemDecoder._decodeEquip`'s 26-field read is
byte-exact against `GW_ItemSlotBase::Decode`'s per-type `RawDecode`, and
`EquipStats`'s own field declarations match that read order 1:1; not
re-litigated, only the domain type's own field *types* were re-checked here
(all plain `number`s, correct — no field declared as a string/bool that's
written a number or vice versa). `InventoryType.Equipped=0` is a dead enum
member (zero call sites; the real wire distinguishes equipped-vs-stored by
slot sign within `Equip=1`, not by a separate type number 0) — harmless,
same category as already-documented dead/duplicate enum values (pass 9's
`Job.GM=500`). `FuncKeyMapped.ts` — `FuncKeyType`'s 9 values and the
`{type,id}` shape are used identically (and correctly) across `KeyConfig.ts`/
`KeyConfigLayout.ts`/`QuickSlotBar.ts`/`GameStage.ts`; `funcKeyMappedIsBound`
is dead (zero call sites, `KeyConfig.ts` has its own private duplicate
`_isBound` with identical logic) — cosmetic, not fixed. `BackInfo.ts`/
`ObjInfo.ts` — plain WZ-key-mirroring data structs (`bS/no/x/y/rx/ry/cx/cy/
type/front/ani/a/f` and `oS/l0/l1/l2/x/y/z/f` respectively) with no logic to
verify beyond field names/types, same category as pass 11's `MobAttack.ts`/
`MobSkillRef.ts`; no `CBackSet`/`CObjectLayer`/map-background-loading class
exists anywhere in this decompile (the only "Backgrnd" hits are an unrelated
`CWnd::SetBackgrnd` Win32-dialog-background API). Their one real consumer,
`FieldScene._loadBackgrounds`/`_loadLayers` in `map/FieldScene.ts`, was also
re-checked for the new angle (parallax/z-sort math, not field-shape) — `Type`
dispatch in `Update()` (`HMoveA`/`VMoveA`/`HMoveB`/`VMoveB` scrolling) and the
tile/obj z-sort (`tileLayers[layer].sort((a,b)=>a.z-b.z)`,
`objLayers[layer].sort((a,b)=>a.info.Z-b.info.Z)`, both ascending — correct,
WZ z-values are designed to sort low-to-high back-to-front) are both correct,
no swap. `CharInfo.ts` — a simple 78-line stat-display panel; close-button
hit-test geometry (`PANEL_W-18`/`ly<22`) matches the same convention used
identically by 20+ other panels in `src/ui/game/`; correctly fed live data
from `GameStage._onSetField`/`_onCharacterInfo`/`_onStatChanged` (`level`/
`job`/`fame`/`guild` all assigned); `job` is resolved via
`nameService.SkillName(stat.job*10000)` (no dedicated `JobName` lookup exists
in `NameService.ts` at all) — this is the standard, real MapleStory
"job's signature/beginner skill id = jobId×10000" trick for resolving a job's
display name out of `Skill.wz` since there's no separate job-name WZ table;
not a bug, pre-existing, out of this pass's 13-file scope anyway (the call
site is in `GameStage.ts`, already covered in pass 5/6's full UI sweep).

Ran `npx tsc --noEmit` (0 errors) and `npx vitest run` (415/415 passing, same
count as before this pass — no test file exists yet for `EquipInventory.ts`/
`ItemInventory.ts`'s new equip-mirroring path, consistent with this
codebase's standing pattern of not always adding new tests for UI-wiring
fixes when the underlying decode path already has its own coverage).

## Twelfth pass: derived-stat math, ITC handlers, FileIO, quest service

Read `src/ui/game/StatDerived.ts`, `src/ui/game/StatsInfo.ts`,
`src/wz/FileIO.ts`, `src/net/handlers/ITCHandlers.ts`, and
`src/character/QuestInfoService.ts` in full — none had a dedicated pass
before (confirmed `FileIO.ts` is genuinely outside pass 8's "all 19
`src/wz/*.ts` files" claim: `src/wz/` actually contains 21 `.ts` files, not
19 — `FileIO.ts` and `WzVector.ts` were the two never covered). Found and
fixed one real bug each in `FileIO.ts` and `ITCHandlers.ts`; confirmed
`StatDerived.ts`'s damage/accuracy formulas are entirely unverifiable
against this decompile (a real, documented gap, not guessed around);
confirmed `StatsInfo.ts` and `QuestInfoService.ts` clean.

**Real bug (FIXED) — `FileIO._fetchRange` accepted any 2xx HTTP status for
a byte-range request, not just `206 Partial Content`.** If a server or
intermediary (CDN, dev proxy, misconfigured static host) ignores the
`Range` header and returns `200 OK` with the FULL file body instead of the
requested slice — a real, common failure mode for Range requests, not a
contrived one — the old `if (!res.ok && res.status !== 206)` check let it
through silently. `_fetchChunked`'s `out.set(new Uint8Array(chunk), start)`
would then write the entire file's bytes at byte offset `start` into the
assembly buffer, corrupting every chunk's region after the first instead of
throwing a detectable error. Fixed by requiring `res.status === 206`
exactly. No decompile citation applies here (this is a client-side HTTP/WZ-
loading-infrastructure file with no `CWvsContext`/game-logic equivalent in
the real client at all — same category as the already-audited crypto stack
in pass 6, verified by internal protocol correctness, not decompile parity).

**Real bug (FIXED) — `FileIO.readFileBytesSync`'s browser path used the
exact same fragile `responseText` + char-by-char byte-decode technique
STATUS.md already documented as silently truncating to empty for large
files (sync XHR's internal string-size ceiling), but that fix was only ever
applied to the *async* chunked path (`_fetchChunked`/`_fetchRange`,
confirmed correct above) — `readFileBytesSync` itself was never touched and
still had the original bug.** Confirmed this function has a live caller:
`WzPackage.Open` (the synchronous load path used by `WzPackage.OpenBase`,
which `MapleClaudeGame.ts` calls for `String.wz` and `Quest.wz`) — so this
wasn't dead code, any sufficiently large synchronously-loaded WZ file would
have silently returned a 0-byte buffer in-browser exactly like the
already-fixed `Map.wz` bug, just never caught because String.wz/Quest.wz
happen to be smaller than the ceiling in practice. (`NxFile.Open`, the
other importer of this function, has zero call sites anywhere in `src/` —
confirmed dead, unaffected either way.) Fixed by switching to
`xhr.responseType = 'arraybuffer'` instead of `responseText` +
`overrideMimeType('text/plain; charset=x-user-defined')` + manual
`charCodeAt` decode loop — sync XHR's `arraybuffer` response type has no
string-size ceiling and needs no manual byte reconstruction at all, the
correct simple fix rather than porting the async path's chunked-Range logic
into a synchronous form. No test coverage existed for `FileIO.ts` before
this pass (confirmed: no `tests/wz/FileIO*` file exists) and none was added
since this is pure browser-XHR plumbing `vitest`'s Node environment can't
exercise without mocking `XMLHttpRequest`/`fetch` wholesale — flagged, not
built, consistent with this codebase's existing pattern of not mocking the
WZ-loading I/O layer (`tests/wz/WzPackage.spec.ts`/`NxIntegration.spec.ts`
both skip unless a real WZ/NX directory env var is set, rather than mock).

**Real bug (FIXED) — `ITCHandlers.ts` routed three independently-dispatched
opcodes through one shared `_handle` keyed on a fabricated leading `nType`
byte (1/3/4), the exact same mistake pass 8 already found and fixed in the
two sibling handler files this pass was told to check first.**
`CashShopHandlers.ts`'s doc comment (pass 8): "no shared subtype byte
across opcodes — that was fabricated too." `MapleTVHandlers.ts`'s doc
comment (pass 8): "three independently-shaped opcodes, no shared subtype
byte — the 405/406/407 split IS the dispatch." `ITCHandlers.ts` had never
been corrected to match either precedent: `ITCNormalItemResult`(412)/
`ITCChargeParamResult`(410)/`ITCQueryCashResult`(411) are three separate
`OutHeader` values, each independently routed through `PacketRouter`
exactly like every other opcode family in this codebase — there is no
precedent anywhere in `src/net/` for a packet carrying an extra internal
type byte on top of its own distinct opcode. Reading that phantom byte
desynced every field after it on every single ITC packet received, and the
blanket `try{}catch{/* skip */}` around the whole dispatch silently
swallowed the resulting decode failure or wrong-branch read — same "total,
silent feature outage" bug class as pass 10's `IncSp`/`IncFame` findings.
Fixed by splitting into three handlers with no shared type byte, one per
opcode, matching the established pattern. **Real gap, confirmed, NOT
fixable this pass (architecturally out of scope) — the real per-opcode
field shapes remain genuinely unconfirmable.** `CWvsContext::SendMigrateTo
ITCRequest` (`decompile/9DEF50.c`) confirms "ITC" is a *separate executable*
(`ITC.exe`, a sub-client the player's session migrates into, analogous to
how `CashShop`/`MapleTV` are separate `CDialog`-hosted contexts but still
inside the same binary) — and unlike CashShop/MapleTV, no ITC-side
`OnPacket`/per-opcode handler class exists anywhere in this decompile dump
at all (grepped `function_index.txt` for "ITC" — the only hit besides the
migrate-request sender itself is that same sender appearing in its own
caller/callee list). `CWvsContext::OnPacket`'s real dispatch table
(`decompile/9E5830.c`, re-confirmed by reading the tail of its case list
directly: ends at `case 140`) doesn't span 410-412 either, consistent with
ITC being a wholly separate dispatcher this export doesn't include. Left the
existing best-effort per-item-list/charge/cash field guesses in place
(documented as unconfirmed in the class doc comment) rather than inventing
a different guess with no more evidence behind it — the fix this pass made
is the *opcode-routing* bug, which is provably wrong independent of the
unconfirmable field shapes. Confirmed zero UI consumers for any of the
three callbacks either (`onItemList`/`onChargeResult`/`onQueryCashResult` —
checked all of `src/stages/*.ts`), same "wired but nothing listens" gap as
many already-documented items, not new.

**Confirmed clean (read in full, zero findings):** `StatsInfo.ts` — its
AP-spend dispatch (`str/dex/int/luk` in that fixed order, decrementing one
shared `ap` pool per click) and callback wiring
(`onStrUp`/`onDexUp`/`onIntUp`/`onLukUp` → `GameSender.UserAbilityUp(MapleStat.Str/
Dex/Int/Luk)` in `GameStage.ts`) both check out; confirmed `_stats` (this
exact `StatsInfo` instance) is correctly fed live `str/dex/int/luk/hp/mp/
level/ap` from both `_onCharacterInfo` and `_onStatChanged` in
`GameStage.ts` — this panel is NOT the one with the wiring gap found below.
`QuestInfoService.ts` — `_parseQuestDate`'s `padEnd(12,'0')` + substring
slicing handles both date-only (8-char) and date+time (12-char) `YYYYMMDD
[HHMM]` strings correctly with no off-by-one; `DayOfWeekMask`'s `1 << day`
bit-packing for `day` 0-6 is standard and bounds-checked; `_index`'s
`Start.Npc`/`Complete.Npc` → `isStart: true/false` tagging is internally
consistent with `ForNpc`'s only consumer (`QuestDetail.ts`, which only reads
`Start.Npc`/`Start.LvMin`/`Start.LvMax`/`Complete.Npc` — confirmed those
four fields are populated correctly). Checked `CWvsContext::
CheckQuestCompleteByItem`/`CheckQuestCompleteByMeso` (`decompile/9FCFD0.c`/
`9FD300.c`, found searching for quest-completion logic) — confirmed these
are a different, runtime, server-driven quest-progress-tracking layer (live
item/meso pickups triggering quest-alarm UI) with no relationship to
`QuestInfoService`'s job (static `QuestInfo.wz`/`Check.img` WZ-template
parsing into requirement data); not a verification source for this file.
No WZ-key-name verification function for `lvmin`/`lvmax`/`dayOfWeek`/
`infoex`/etc. exists anywhere in this decompile (`function_index.txt` has
zero hits for any of those literal key names) — confirmed unconfirmable,
not skipped.

**Real gap, confirmed, NOT fixed (architecturally out of scope) —
`StatDerived.ts`'s entire damage/accuracy/avoidability formula set
(weapon-type multiplier table, mastery-clamped min/max damage, `dex*0.8+
luk*0.5` accuracy, `dex*0.25+luk*0.25` avoidability, the job-category→
primary/secondary-stat switch, `DamageMax=999_999`) has NO corresponding
decompiled function anywhere in this export to verify against.** Searched
`function_index.txt` exhaustively for every plausible name
(`CalcDamage`/`GetMaxDamagePoint`/`GW_CharacterStat::Calc*`/`CUser::*Stat*`/
`GetWeaponConstant`/`GetMastery`/`nAcc`/`nEva`/`Avoidability`/`999999` as a
literal) — zero hits beyond unrelated rounding-constant noise
(`DOUBLE_0_499999999`) and ref-counting plumbing for an opaque
`CUIUserInfo` class whose body isn't in this dump. This is the real client-
side stat-display math (the formula MapleStory's stat window uses to show
predicted min~max damage, the same public formula long documented by the
private-server community), but this specific decompiled export simply does
not contain the function that computes it — same "genuinely unconfirmable,
not guessed at" category as `AttackAction.ts`'s weapon-animation table (pass
11) and `MobAttack.ts`'s field shape (pass 11). Not touched: every constant
here could be transcribed correctly or could be silently wrong, and there
is no way to tell from this dump — flagging precisely rather than either
false-confidently leaving it or guess-"fixing" it against unverified public
knowledge.

**Real gap, confirmed, NOT fixed (pre-existing, not introduced this pass) —
`StatDetailInfo.ts` (the one actual call site of `StatDerived.computeDerived`)
never receives real character data at all.** Its `Inputs: StatInputs` field
is initialized once via `defaultStatInputs()` in the class field initializer
and is never assigned anywhere else in the codebase (`grep`-confirmed zero
writes to `.Inputs` outside that one initializer) — meaning the detailed
stat panel (min~max damage, accuracy, avoidability, pdd/mdd, speed/jump)
permanently displays placeholder zeros/defaults (`jobId:0, str:0,...,
speed:100, jump:100`) regardless of the actual logged-in character's real
stats, even though the simpler `StatsInfo.ts` panel covered above (a
*different* class, sharing no state with this one) is correctly live-fed
from `GameStage.ts`. This is a wiring gap one layer up from the 5 files this
pass was scoped to (`StatDetailInfo.ts` wasn't in the file list, and the
task scope explicitly limits "direct callers" fixes to cases where a
changed formula/shape requires it — this isn't that; the formula didn't
change, the caller was already broken before this pass touched anything).
Documented here rather than silently fixed out-of-scope or silently missed.

Ran `npx tsc --noEmit` (0 errors) and `npx vitest run` (415/415 passing,
same count as before this pass — no test file exists for any of `FileIO.ts`/
`ITCHandlers.ts`/`StatDerived.ts`/`StatsInfo.ts`/`QuestInfoService.ts`, so
no fixtures needed updating).

## Eleventh pass: mob AI / combat-movement layer (`MobController`, `MobAttack`, `AttackAction`, mob action/skill enums, `GameCamera`, `LadderRope`)

Full line-by-line read of `MobController.ts` (350 lines), `MobAttack.ts`,
`AttackAction.ts`, `MobActionType.ts`, `MobSkillType.ts`, `MobSkillRef.ts`,
`GameCamera.ts`, and `LadderRope.ts` — none of these had a dedicated pass
before. Found the real `CVecCtrlMob`/`CWvsPhysicalSpace2D` mob-AI/ladder
classes in the decompile (absent from earlier passes' searches, which were
looking for `CMob::`/camera-class names specifically — the real logic lives
on the move-controller side, `CVecCtrlMob`, not `CMob` itself) and used them
to verify move-ability semantics and ladder/rope geometry. Found one real
bug in `MobInfo.ts` (a direct dependency of `MobController.ts`'s `IsFly`/
`IsJump` dispatch) and one real bug in `MobController.ts`'s knockback path.

**Real bug (FIXED) — `MobInfo.IsFly`/`IsJump` used the wrong `MoveAbility`
threshold/value, conflating ground-hopping "Jump" mobs with flying mobs.**
Confirmed against `CVecCtrlMob::WorkUpdateActive` (`decompile/99D450.c`,
the real mob-AI per-tick dispatcher) and `CVecCtrlMob::InspectUpdateActive`
(`decompile/9996F0.c`): both switch on `this->m_nMoveAbility` with the exact
same discrete case set — `0` (`CtrlUpdateActiveStop`), `1`
(`CtrlUpdateActiveMove`), `3` (`CtrlUpdateActiveJump`), `4`
(`FlyCtrlGuardingBefore`+`CtrlUpdateActiveFly`), `6`
(`CtrlUpdateActiveEscort`) — `2` and `5` fall to `default: break` (no
movement at all). `CVecCtrlMob::SetMoveRandManSeed` (`decompile/997160.c`)
confirms the same mapping again (`==1` uses the direction-RNG seed, `==3`
uses the jump-RNG seed — two genuinely different RNG streams for two
genuinely different movement modes). Read both `CtrlUpdateActiveJump`
(`decompile/9998F0.c`) and `CtrlUpdateActiveFly` (`decompile/99BEB0.c`) in
full to confirm they're unrelated systems: Jump is strictly foothold-bound
(`this->m_pfh`, `CStaticFoothold::GetForwardLink`, `CVecCtrl::Jump` —
ground hops that occasionally arc up, never leaves the foothold's mass
range) while Fly is free unconstrained 2D target-seeking with no foothold
involvement at all. The previous code had `IsFly: MoveAbility >= 3` (which
wrongly classified MoveAbility=3, the ground-hopping Jump type, as flying —
any WZ mob template with `moveAbility:3` would visibly fly through the
level instead of hopping on the ground, since `MobController.Update`
branches `_stepFly`/`_stepWalk` and the move-path-encoder `attr`
17-vs-0/`MobActionType.Fly`-vs-`Move` purely off `IsFly`) and `IsJump:
MoveAbility === 2` (a value the real switch never branches on for mobs at
all — dead/unreachable, since real Jump-ability mobs use value 3, not 2).
Fixed both: `IsFly` now `MoveAbility === 4`, `IsJump` now `MoveAbility ===
3`. `Fly` (the separate WZ `info/fly` boolean, confirmed read independently
in `decompile/53B070.c` reading the literal `L"fly"` WZ key into
`m_bFly`) was already correct and untouched — it's orthogonal to
`m_nMoveAbility`, not a masking condition for this bug.

**Real bug (FIXED) — `MobController`'s knockback path called
`MobLook.SetState` with a raw numeric literal that didn't match its own
comment, playing the Attack animation instead of Hit during knockback.**
`MobLook.ts`'s real `MobState` enum (declared order, no explicit values) is
`Stand=0, Move=1, Attack=2, Hit=3, Die=4...`. `MobController.Update`'s
knockback branch called `this._mob.SetState(2 /* Hit */)` — `2` is
`Attack`, not `Hit` (`Hit` is `3`). This bypassed `MobLook.OnHit()` (the
real, correct, named entry point used by the standard hit-reaction path
elsewhere), which also sets the white `_hitFlash` tint and is the only path
`MobLook.Update`'s frame-advance logic checks (`if (this._curState ===
MobState.Hit) this.SetState(MobState.Stand)`) to auto-return to Stand once
the animation finishes — calling `SetState(2)` directly meant every
knocked-back mob played its Attack swing animation on a forever-loop (no
hit-flash, no auto-return-to-Stand) for the full knockback duration, instead
of the correct one-shot Hit flinch. This is the same bug *class* as the
already-documented `MessageType` off-by-one (pass 9) and `OnInventoryOperation`
mislabeling (pass 10) — a magic number that drifted from the enum it was
supposed to mirror. Fixed by calling `this._mob.OnHit()` directly instead of
poking `SetState` with a raw number — also removes the now-stale comment.
The regular (non-knockback) state dispatch a few lines below this
(`SetState(... ? 1 /* Move */ : ... ? 2 /* Attack */ : 0 /* Stand */)`) was
independently checked against the same enum and is correct (Move=1,
Attack=2, Stand=0 — these three values genuinely do match).

**Confirmed clean / not a bug:** the regular (non-knockback) `MobState`
dispatch in `MobController.Update` (verified above); `MovePathAttr.FlyingBlock
=17` used by `_appendElement`'s `attr: IsFly ? 17 : 0` (matches
`net/protocol/Enums.ts`, independently corroborated by the existing
`MovePathEncoder.ts`/`MobMove.spec.ts` coverage from pass 6, category
dispatch in `EncodeMovePath` already routes attr 17 through
`MoveCategory.FlyingBlock`'s 4-field shape); `MobActionType.Chase=39`
(checked against `tests/net/handlers/MobMove.spec.ts`'s
`(action << 1) | chasing` packing — 39 fits comfortably under the 7-bit
shifted range, no overflow); `MobSkillType.Poison=125`/`AreaFire=130` —
the only two numeric mob-skill-type values independently confirmed against
real code in this decompile (`get_element_from_mobskillid`,
`decompile/6ED550.c`: `125→element 4`, `130→element 2`, both exactly
matching the WZ-derived element each name implies); `_stepWalk`'s
edge-clamp-and-turn-around direction logic (hitting the left edge clamps
position and faces right/`false`, hitting the right edge clamps and faces
left/`true` — both directionally correct, no sign error, verified by hand
since the real `CVecCtrlMob` edge-bounce logic lives in a lower layer
(`CStaticFoothold`/`MoveMobOnRightAngleX`, `decompile/9970A0.c`) this dump
doesn't include the body of); `ApplyHitKnockback`'s kinematics
(`_knockedVx = pushPx / HitKnockbackSec`, giving exactly `pushPx` total
displacement over the knockback duration — correct, no sign error); the
knockback-path foothold clamp (`Math.max(left+4, Math.min(nx, right-4))` —
correct min/max ordering, no swap); `AttackAction.ts`'s weapon-type→
animation-name table — no `CWeaponInfo`/item-attack-type WZ-field-read
function exists anywhere in this decompile dump to check it against (only
unrelated `is_correct_bodypart`-style item/body-part tables were found by
searching for the same numeric ranges); `MobAttack.ts`'s field shape — no
`CMob::ATTACKENTRY` struct body exists in this dump either (only its
template/pool plumbing, same gap pattern as pass 10's `SetMultiPetInfo`).

**Real gap, confirmed, NOT fixed (architecturally out of scope) —
`MobController.ts` has no foothold-to-foothold walk-chaining at all; mobs
bounce at a fixed margin inset of whatever single foothold they're
currently on and never cross onto a neighboring foothold while walking.**
`Foothold.ts` already has the `Prev`/`Next` chain fields (and
`PlayerController.ts` already uses them, confirmed correct back in pass 6),
but `MobController._stepWalk` never reads them — it treats `_currentFh` as
a fixed platform with hard edges. This is a missing feature, not the same
bug class as the PlayerController jump-edge bug (that was a logic error in
existing edge-detection code; this is code that was never written). The
real `CVecCtrlMob` mob-walk system (`CtrlUpdateActiveMove`,
`decompile/99D090.c`) doesn't help port this correctly either — real mob
walk is server-authoritative PRNG-timed direction bursts with edge-bounce
physics resolved in `CStaticFoothold`/`MoveMobOnRightAngleX`
(`decompile/9970A0.c`), a function this dump's body doesn't include, and a
fundamentally different architecture (server picks direction, broadcasts
positions) from this client's deliberately-simplified predictive local mob
AI. Porting real chain-walk would be a feature build (mirror
`PlayerController`'s neighbor-foothold-walk pattern onto `MobController`),
not a one-line fix — documented, not built this pass.

**Real gap, confirmed, NOT fixed (architecturally out of scope) — no
decompiled camera class exists in this export at all (re-confirmed; same
conclusion pass 10 already reached for `CWvsContext::OnPacket`'s opcode
range — this dump simply doesn't include a `CMapleGameCameraView`/
`CWvsContext`-camera class body anywhere), so `GameCamera.ts`'s lerp/clamp
math can't be decompile-verified.** Read it anyway for internal
self-consistency: `Update()`'s smoothing factor `1 - Math.pow(1 -
clamp01(FollowSpeed*dt), 1)` is algebraically identical to plain
`clamp01(FollowSpeed*dt)` (`Math.pow(x, 1) === x`, so `1-(1-x)` reduces to
`x`) — the `Math.pow` call is a no-op, not a bug (it doesn't compute a
*wrong* value, it just doesn't compute what its shape suggests an
exponential framerate-independent decay was supposed to compute; the actual
behavior is a plain framerate-*dependent* linear lerp, clamped to [0,1]).
Left untouched: simplifying dead arithmetic that doesn't change behavior
isn't a bug fix, and there's no decompiled reference to confirm what the
*intended* (framerate-independent) formula should have been. `_clamp()`'s
half-width/half-height viewport-bounds math and `WorldToScreen`/
`ScreenToWorld`'s inverse-pair symmetry were both checked by hand and are
correct (clamp uses the standard `max(min_bound, min(max_bound, pos))`
order with no swap; the two coordinate-transform methods are exact
algebraic inverses of each other). Also re-confirmed (not new) the
pass-6/8-documented `GameCamera`/`FieldScene.Camera2D` dual-camera
aliasing (`GameStage.ts` line 973: `_field.Camera.Position =
this._camera.Position`) — still two independent camera implementations
(`Camera2D`'s dead-zone-snap model, still live via `FieldScene.ts:623`'s
own `Follow()` call, vs. `GameCamera`'s lerp-follow model) kept in sync by
one assignment; not re-litigating the architecture, out of scope for this
file-by-file pass.

**Confirmed clean (read in full, zero findings beyond the above):**
`MobAttack.ts` (plain WZ-mirroring data struct, no logic to verify);
`MobSkillRef.ts` (3-field plain data holder, no logic); `LadderRope.ts`
(`Top`/`Bottom` getters correctly use `min`/`max` of `Y1`/`Y2` with no
swap — too small to hide a bug, and confirmed it has zero importers
anywhere in `src/` besides its own file, same "real prerequisite for an
unbuilt feature" category as `domain/ExpTable.ts`/`MorphLook.ts` documented
in earlier passes: mob-side ladder/rope climbing
(`CVecCtrlMob::WorkUpdateActiveLadderOrRope`, gated on `m_nMoveAbility==6`
per `IsAbleToClimbLadderOrRope`, `decompile/996E50.c`) has no client-side
implementation at all in `MobController.ts` — `MoveAbility` value `6`
(Escort, the real ladder-climbing move-ability per `WorkUpdateActive`'s
switch) falls to `MobController`'s own `default` branches same as Stand,
so any WZ mob template using `moveAbility:6` would just stand still
client-side instead of climbing — a real, larger gap than `LadderRope.ts`
itself, but building real mob ladder-climbing is a feature, not a decode/
math bug, and is flagged here rather than guess-built); `MobActionType.ts`'s
non-Chase values (`Move/Stand/Jump/Fly/Rope/Regen/Bomb/Hit1-2/HitF/
Die1-2/DieF/Attack1-8/AttackF/Skill1-16/SkillF/Miss/Say/Eye/No`) — no
numeric table for these exists anywhere in this decompile dump (the action
byte is a server-assigned value with no client-side validation function to
check it against), consistent with the long-public MapleStory mob-action
convention but not independently decompile-verifiable beyond the one
internal consistency check already covered above (`Chase=39`'s bit-packing
range).

Ran `npx tsc --noEmit` and `npx vitest run` after both fixes — both clean
(0 type errors, 415/415 tests pass, no pre-existing test asserted the old
wrong values since none of these 8 files had any test coverage before this
pass).

## Tenth pass: full read-through of `FieldHandlers.ts`

Did a full, systematic, line-by-line read of the entire file (1567 lines, the
biggest and most central decode surface in the codebase) and cross-checked
every decode against the real decompiled `CWvsContext::On*`/pool functions.
Found and fixed 11 confirmed real bugs, one of which (`StatChanged`'s SP
field) is confirmed but architecturally blocked, documented but not fixed.

**Severe, confirmed (FIXED) — `_decodeCharacterInfo` was one byte short
before the pet section.** `CWvsContext::OnCharacterInfo` (`decompile/A05750.c`)
reads TWO bytes after the alliance string — a discarded scratch byte
(`pMedalInfo.gap0`) then a second byte (`v9`) that's the real pet count,
passed into `CUIUserInfo::SetMultiPetInfo`. The previous code only consumed
one byte, desyncing every field after it (pets, taming-mob block, wishlist,
medal info, chair items) on every single `CharacterInfo` packet. Fixed by
adding the missing byte read. **Not confirmed**: the per-pet field shape
itself (`templateId/name/level/tameness/repleteness/petSkill/petWear`,
terminator-byte-loop) — `SetMultiPetInfo`'s own body isn't present in this
decompile dump (only its call site), so that part is unchanged, flagged as
unconfirmed rather than guessed at a different shape. Updated
`tests/net/handlers/CharacterInfo.spec.ts`'s fixtures for the extra byte.

**Severe, confirmed (FIXED) — `OnInventoryOperation`'s opType=4 was
misnamed/miswired, and its trailing byte was unconditional when the real
client gates it.** Per `CWvsContext::OnInventoryOperation`
(`decompile/A08A70.c`): case 4 is `UpdateExp` (a single int — the new equip
EXP via `GW_ItemSlotEquip::SetEXP`), there is no separate "Expire" case at
all. The old `InventoryOpType` enum had `Expire=4`/`UpdateExp=5`, so case 4
discarded the int into nothing (mislabeled "Expire") and the real
`UpdateExp=4` value was permanently unreachable dead code under the wrong
name. Fixed the enum (`UpdateExp=4`, `Expire` deleted) and wired the int into
a new `InventoryOpArg.equipExp` field. Also: the trailing byte after the
whole op list (`SetSecondaryStatChangedPoint`) is **only sent when
`nCurItemPos` is set** — i.e. only when a Move/Remove op touches equip slot 1
(`invType===1`) with a negative position — not unconditionally. The previous
code read this byte after every `InventoryOperation` packet regardless,
which would desync any packet that didn't hit that specific equip-slot
condition. Fixed with an `hasEquipSlotChange` flag mirroring the real
`nCurItemPos` gate. Updated `tests/net/protocol/Enums.spec.ts`.

**Severe, confirmed, NOT fixed (architectural) — `StatChanged`'s SP field
is conditionally a totally different variable-length structure depending on
the character's CURRENT job, which this stateless decoder has no way to
know.** `GW_CharacterStat::DecodeChangeStat` (`decompile/4FA000.c`): bit
`0x8000` is a plain `short` UNLESS the character's job is Cygnus
(job/1000==3), Aran (job/100==22), or Evan (job==2001), in which case it
reads `ExtendSP::Decode` (`decompile/4F9CB0.c`: `count:byte` then
`count×(jobLevel:byte, sp:byte)`) instead — a count-prefixed list, not a
fixed 2-byte field. The job check depends on the character's *persistent*
current job, which may or may not be present in THIS SAME packet (it's only
included if the `Job` mask bit also happens to be set) — `FieldHandlers` is
a deliberately stateless decoder with zero instance fields for character
state, so it cannot resolve this without either passing current-job context
in from the caller or adding persistent state here, both real design
decisions. Documented in place with a long comment; not touched. Until
fixed, any Cygnus/Aran/Evan character's `StatChanged` packet that sets the
SP bit desyncs every field after it (Exp/Pop/Meso/PetSn2/PetSn3/TempExp) —
same bug class as the two fixes above, just not safely fixable in this pass.
**STALE NOTE, corrected (waterfall implementation pass).** This was fixed
in a later pass (code comment dated 2026-06-20): `FieldHandlers` now
tracks `_currentJob` (updated whenever the `Job` mask bit is read, the
exact same packet-derived source this note assumed was unavailable) and
gates the SP decode through `IsExtendSpJob(this._currentJob)`, falling
back to the plain short read when the job is unknown/0. Re-verified live
in `FieldHandlers.ts` rather than trusting the old "architecturally
blocked" claim.

**Real bug (FIXED, cosmetic/documentation) — `MapleStat.Fatigue` was a
fabricated name.** Bit `0x200000` in `GW_CharacterStat::DecodeChangeStat`
(`decompile/4FA000.c`) is `_ZtlSecureTear_nTempEXP` (TempEXP) — there is no
"Fatigue" field anywhere in that function. The read shape itself (discard
one int) was already correct; only the name was wrong. Renamed to
`MapleStat.TempExp`, updated `Enums.spec.ts`.

**Real bug (FIXED) — `TemporaryStatSet`/`TemporaryStatReset` read a 4-byte
mask instead of the real 16-byte (128-bit) `UINT128` mask.**
`CWvsContext::OnTemporaryStatReset` (`decompile/9F2AB0.c`) makes this
unambiguous: `CInPacket::DecodeBuffer(iPacket, &uFlagTemp, 0x10u)` — an
explicit 16-byte read, confirmed as the same mask shape `OnTemporaryStatSet`
(`decompile/A02FC0.c`) decodes via `SecondaryStat::DecodeForLocal`. The
previous 4-byte read meant any temp-buff status using a bit beyond the low
32 (i.e. most real buffs — this is a 128-bit field for a reason) would
either desync the rest of the packet or silently report the wrong bit count.
Fixed both handlers to read two `readLong()`s (16 bytes) and popcount across
both halves. **Not independently confirmed**: `SecondaryStat::DecodeForLocal`'s
own per-bit field-order body isn't present in this decompile dump (only its
call site is) — the existing `(value:short, skillId:int, seconds:int)`
per-bit tuple loop is unchanged, flagged as unconfirmed beyond the mask-size
fix. Updated the mask construction in
`tests/net/handlers/FieldHandlers.spec.ts`'s two relevant tests.

**Real bug (FIXED) — three `Message`(38) sub-types read a totally wrong
shape, causing two of them to throw and silently drop every notification.**
Cross-checked all 15 `CWvsContext::On*Message` sub-handlers
(`decompile/9F86C0.c`, `9F8570.c`, `9F90A0.c`, `9F91E0.c`, `9FE910.c`,
`9F8060.c`, `9F2DF0.c`, `9F8180.c`, `9FE860.c`, `A03920.c`, `9FE6A0.c`,
`9F82E0.c`, `9FE7A0.c`) against `handleMessage`'s switch:
- `IncSp` (case 4): real shape is `job:short(2), spGain:byte(1)` — a 3-byte
  message. Previous code read `byte(discard), int` — 5 bytes, 2 more than
  the message contains, which throws inside `InPacket.ensureRemaining`.
  `PacketRouter.dispatch`'s catch swallows the exception and logs it, so
  **every IncSp notification was silently dropped, never reaching
  `onIncSp`/the SP-gain toast** — not just a wrong value, a total feature
  outage for this notification type. Fixed to read the real 3-byte shape.
- `IncFame`/`IncGP` (cases 5/7): real shape for both is `value:int(4)` ONLY
  — no leading discard byte (`OnIncPOPMessage`/`OnIncGPMessage` decode a bare
  `Decode4` with nothing before it). Previous code read `byte(discard), int`
  — same over-read-and-drop bug as IncSp. Fixed both.
- `IncExp` (case 3): confirmed CORRECT for the part it reads
  (`flag:byte, exp:int` matches the real first two fields of
  `OnIncEXPMessage` exactly) — the real message has many more optional
  bonus-breakdown fields after (mob-event/party/item/wedding/premium/
  quest/rainbow-week/cake-pie bonus EXP) that nothing in this client's UI
  consumes; under-reading those is safe (each `OutHeader` opcode is its own
  independently framed packet — `PacketRouter.dispatch` reads exactly one
  opcode's payload per call, so leftover unread bytes are simply discarded,
  never carried into the next packet). Not changed, just confirmed and
  documented in place.
- `CashItemExpire`/`GiveBuff`/`System`/`QuestRecordEx` — confirmed correct
  as-is (single `int`/`int`/`string`/`short+string` respectively, matching
  `OnCashItemExpireMessage`/`OnGiveBuffMessage`/`OnSystemMessage`/
  `OnQuestRecordExMessage` exactly).

**Real bug (FIXED) — `QuestRecord`'s `Removed` state read a phantom byte
that doesn't exist on the wire.** `CWvsContext::OnQuestRecordMessage`
(`decompile/A03920.c`): `questId:short, state:byte`, then state==1(Started)
reads `value:string`, state==2(Completed) reads an 8-byte FILETIME, and the
`else` branch (state==0/Removed) reads **nothing further at all** — it goes
straight to `RemoveQuest` with no additional `Decode` call. The previous
code read an extra discard byte for the Removed case that the real wire
never sends — harmless in isolation (last read in an independently-framed
packet, per the framing note above) but still confirmed wrong. Fixed by
removing the phantom read.

**Real bug (FIXED) — `GeneralItemExpire`/`ItemProtectExpire`/
`ItemExpireReplace` all read a single bare value instead of a count-prefixed
list, and `ItemExpireReplace` had the wrong field type entirely.** Per
`OnGeneralItemExpireMessage` (`decompile/9F8180.c`) and
`OnItemProtectExpireMessage` (`decompile/9F82E0.c`): both are
`count:byte` then `count× itemId:int` — a LIST. `OnItemExpireReplaceMessage`
(`decompile/9FE7A0.c`) is `count:byte` then `count× string` (item NAME text,
not an itemId int at all). All three previously read one bare `int` with no
count prefix — meaning any notification covering more than one item dropped
every item past the first, and `ItemExpireReplace` was reading numeric junk
out of what's actually string data. Fixed all three to the real list shapes;
changed `onGeneralItemExpire`'s callback signature from `(itemId: number)`
to `(itemIds: number[])` and updated its one consumer in `GameStage.ts` to
loop. `ItemProtectExpire`/`ItemExpireReplace` still have no UI consumer
(same as before this pass) — logged via `console.debug` with the now-correct
decoded list.

**Real bug (FIXED) — `LootWarning` subtype 2 (`ItemExpire`) shared a case
label with subtype 0 (`ItemWarning`) but has a different shape.** Per
`CWvsContext::OnDropPickUpMessage` (`decompile/9FE190.c`): subtype 0 reads
`itemId:int, quantity:int`; subtype 2 reads `itemId:int` ONLY — no quantity
field exists on the wire for the expire case. The previous code shared one
switch case for both, always reading a quantity int that subtype 2 doesn't
actually send (harmless in isolation per the per-packet-framing note, but a
wrong/over-read regardless). Split into separate cases.

**Real protocol bugs (FIXED) — `FriendResultType` and `GuildResultType` had
multiple wrong/missing numeric values, confirmed against
`CWvsContext::OnFriendResult` (`decompile/A12630.c`) and
`CWvsContext::OnGuildResult` (`decompile/A0D3B0.c`):**
- Friend: confirmed the existing `Load(7)/Set(10)/Delete(18)` case-grouping
  was already correct (all three really do share one case label dispatching
  to `CFriend::Reset`'s full-list decode — verified field-for-field against
  `CFriend::Reset`/`GW_Friend::Decode`, the 39-byte-per-friend record).
  But case **8** (`UpdateFriend`, a single-friend update via
  `CFriend::UpdateFriend` — one 39-byte `GW_Friend` record + an `inShop`
  byte, no count prefix) had no enum member at all and silently fell to
  `default`; same for case **20 (0x14)**, a separate single-friend
  online-status update (`friendId:int, inShop:byte, channel:int`). Added
  `FriendResultType.StatusChanged=20`, wired both new cases to
  `console.debug` (no incremental single-friend-update UI path exists yet —
  `UserList` only supports a full-list refresh via `onFriendList`; building
  that is real UI work, not a decode fix).
- Guild: **severe** — 5 of the previous 7 enum values (`NotifyLogin=6`,
  `NotifyLogout=7`, `Expel=9`, `MarkChange=14`, `LevelUp=23`, `LoadDone=29`)
  **do not exist as case labels anywhere in the real switch at all** — only
  `Load=28` was correct. Every other named case was unreachable dead code
  that could never fire against a real server. Real traffic for "leave/
  expel" (cases 46/49, shared shape: `guildId:int, charId:int, name:string`),
  "online status" (case 63: `guildId:int, charId:int, online:byte`), "grade
  change" (case 66: `guildId:int, charId:int, grade:byte`), "mark change"
  (case 69: `guildId:int, markBg:short, markBgColor:byte, mark:short,
  markColor:byte` — the previous `MarkChange` decode SHAPE was already
  correct, just registered under the wrong numeric value 14 instead of 69),
  "point/level" (case 75: `guildId:int, point:int, level:int` — previous
  `LevelUp` read shape `guildId:int, level:byte` was also wrong), and
  "member join" (case 41: `guildId:int, charId:int`, then conditionally a
  37-byte `GUILDMEMBER` record) all silently fell through to `default`
  before this fix. Rewrote the enum to the 7 real confirmed values
  (`Load=28, MemberJoin=41, OnlineStatus=63, GradeChange=66, MarkChange=69,
  Leave=46, Expel=49, PointLevel=75`) and the handler to match each real
  shape. No UI consumes any of these besides `Load`/`Leave`/`Expel`
  (`onGuildLoad`) — same gap as before, just now reachable instead of dead.
  Updated `tests/net/protocol/Enums.spec.ts` for both enums.

**Confirmed clean (read in full, zero findings, matched decompile
field-for-field):** `handleSetField` (cited decompile already correct from
an earlier session); `handleStatChanged`'s bit *order* and every field
*except* SP (above); `handleMigrateCommand`; `handleAliveReq`; `handleMobLeave`
/`handleMobChangeController`/`handleMobMove`/`handleMobDamaged`/
`handleMobCtrlAck`/`handleMobHpIndicator`/`handleNpcEnter`/`handleNpcLeave`/
`handleUserEnter`/`handleUserLeave`/`handleUserMove`/`handleUserEmotion*`
(no matching `CMobPool`/`CNpcPool`/`CUserPool`/`CField`-scoped decompiled
function exists anywhere in this dump — these are field-pool-scoped opcodes
dispatched through a `CField::OnPacket` this export doesn't include at all;
genuinely unconfirmable, not skipped out of laziness — confirmed by reading
`CWvsContext::OnPacket`'s real dispatch table, `decompile/9E5830.c`, which
only spans the CWvsContext-scoped opcode range 28-140 and does not include
any of these); `handleDropEnter`/`handleDropLeave`; `handleClaimResult`/
`handleSetClaimSvrAvailableTime` (`decompile/9FA7D0.c`/`9F1620.c`, confirmed
exact); `handleClaimSvrStatusChanged`'s inline lambda (`decompile/9F1650.c`,
exact); `handleUserChat`/`handleGroupMessage`/`handleWhisper`/
`handleScriptMessage`/`handleOpenShopDlg`/`handleShopResult`/
`handleTrunkResult`/`handleMessenger`/`handleFuncKeyMappedInit`/
`handleQuickslotMappedInit`/`handleFootHoldInfo`/`handleMiniRoom`/
`handleReactor*`/`handleEmployee*`/`handleSummoned*` (same as above — no
decompiled function exists for any of these in this export; the
`CWvsContext::OnPacket` dispatcher this dump provides only covers opcode
28-140, and these all live on different classes/opcode ranges this export
doesn't include); `handlePartyResult`/`_emitPartyData` (confirmed the case
grouping and the 4-field `Invite` shape against `CWvsContext::OnPartyResult`,
`decompile/A10AB0.c`; `PARTYDATA::Decode`, `decompile/4F2B00.c`, is an opaque
flat 378-byte `DecodeBuffer` with no field-level structure in this dump, so
`_emitPartyData`'s internal field layout can't be independently re-verified
beyond the field *names* it touches matching the real struct member names
seen in `OnPartyResult`'s body — `adwCharacterID`/`asCharacterName`/`anJob`/
`anLevel`/`anChannelID`/`dwPartyBossCharacterID` — not new information, this
matches what an earlier protocol-research pass already established);
`handleChangeSkillRecord` (`decompile/9F5F30.c`, exact field-for-field
match; added the one missing always-present trailing byte, harmless in
isolation since it's the last read in the packet); `handleTownPortalEnter`/
`handleTownPortalLeave`/`handleAffectedAreaCreate`/`handleAffectedAreaRemove`/
`handleOpenGateCreate`/`handleOpenGateRemove` (all already correctly cited
from an earlier pass — re-verified `handleTownPortalEnter`'s citation
(`decompile/762C00.c`) by reading the full function: confirmed
`state:byte, characterId:int, x:short, y:short` exactly).

**New coverage gap found, not fixed (same category as the existing "91
unhandled opcodes" list) — `CWvsContext::OnTownPortal`(69) and
`CWvsContext::OnOpenGate`(70) have NO `OutHeader` entry in this codebase at
all and are completely unhandled.** These are NOT the same as the already-
wired `CTownPortalPool`/`COpenGatePool` opcodes (330-333) — opcode 69 is the
*player's own* active town-portal-skill state (`townId, fieldId, skillId,
x, y` — feeds the minimap "recall" UI), and opcode 70 is a near-empty
2-short discard that just calls `CField::OnOpenGate()`
(`decompile/9F1330.c`/`9F1410.c`). Flagging as a gap, not fixing — adding a
brand-new opcode/handler for previously-unhandled traffic is scope creep for
a "find and fix decode bugs" pass, and there's no UI consumer to wire it to
yet anyway.

## Ninth pass: full read-through of `Enums.ts` surfaced a severe, confirmed protocol bug

**`MessageType` (FIXED) — a cascading off-by-one starting at value 5, plus a
genuine duplicate, both confirmed and corrected against the real decompiled
switch (`CWvsContext::OnMessage`, `decompile/A06C90.c`).** The real switch is
0-14 with `default: return;` beyond. TS was missing case 5 entirely (the
real "IncPOP" = Fame notification), which shifted every subsequent named
value by one: `IncFame` was at 7 instead of 5, `IncGP` at 8 instead of 7,
`GiveBuff` at 9 instead of 8, `GeneralItemExpire` at 10 instead of 9,
`System` at 11 instead of 10 — and that last one collided with the
already-correct `QuestRecordEx=11`, a real duplicate `case` label. Since
`FieldHandlers.ts`'s switch dispatches by named member (`case
MessageType.System:` / `case MessageType.QuestRecordEx:`), and JS switches
match the *first* matching case, **every "System" notice (any server-pushed
chat/system text) was silently decoded using QuestRecordEx's field layout
instead** (reading a questId+string instead of a single string), corrupting
both the displayed text and desyncing the rest of that packet's byte offset.
This would have broken server system announcements completely and
corrupted/crashed quest-record decoding intermittently whenever a System
message happened to arrive. Fixed by renumbering the whole enum to match the
confirmed decompile exactly (0-14); the existing per-case decode *logic*
in `FieldHandlers.ts` needed zero changes, since dispatch is by name —
fixing the enum's numbers alone fixed the bug. `EncryptedMessage=15`/
`OpenURL=16`/`WheelOfFortune=17` are kept but explicitly flagged in a
comment as **not confirmed** against this decompiled switch (its `default`
returns past 14 — these three may belong to a different dispatch mechanism,
or may simply be wrong; not deleting them since real handlers already
consume them, just not claiming false confidence). Added the genuinely
missing `SkillExpire=14` case, confirmed its decode shape against the real
`OnSkillExpireMessage` (`decompile/9F8440.c`: a `count:u8` then `count` ×
`skillId:i32`) and wired it through a new `onSkillExpire` callback.
Updated the one test file that asserted the old wrong values
(`tests/net/protocol/Enums.spec.ts`).

**While fixing this, discovered and wired an entire unwired notification
family in `GameStage.ts`.** `onIncSp`/`onIncFame`/`onIncGp`/
`onCashItemExpire`/`onGiveBuff`/`onSystemMessage`/`onOpenUrl`/
`onGeneralItemExpire`/`onWheelOfFortune` were ALL completely unwired (only
`onIncExp`/`onIncMoney` were) — meaning none of these notifications ever
reached the player even before today's enum bug, they just silently
decoded into nothing. Wired all of them to `_statusMessenger.showLoot(...)`
with item/skill name lookups via `nameService` where relevant.
**Deliberately did not** wire `onOpenUrl` to actually navigate/open the
URL — auto-opening a server-supplied URL is a real security concern (an
untrusted/compromised server could redirect the player anywhere); left as
a `console.log` for now, opening it should be a deliberate user-facing
confirmation prompt if ever built, not silent auto-navigation.

**Investigated and confirmed NOT bugs (verified against the decompile
before touching anything — would have been wrong to "fix"):**
- `TrunkRequestAction.WithdrawMoney=7` / `DepositMoney=7` — initially flagged
  as a likely duplicate-value bug. Verified against the real
  `CTrunkDlg::SendGetMoneyRequest`/`SendPutMoneyRequest`
  (`decompile/7688E0.c`/`decompile/7689E0.c`): both genuinely encode the
  *same* action byte (7) and disambiguate purely by the sign of the amount
  (positive=withdraw, negative=deposit) — exactly matching the existing TS
  senders and their already-passing test. Confirmed correct, not touched.
- `LootSubType.MoneyWarning=1`/`MesoGet=1` and `ItemWarning=0`/
  `ItemUnidentified=0` — checked every call site in `FieldHandlers.ts`;
  only one name from each duplicate pair is ever used as an actual switch
  case, so no collision occurs in the live code. Harmless aliases, not
  fixed.
- `Job.GM=500`/`Pirate=500` and `SuperGM=510`/`Brawler=510` — confirmed zero
  call sites anywhere in `src/`. Dead/documentation-only enum; duplicate
  values are latent but unreachable. Not fixed (no decompile values handy
  to correct them against, and nothing reads this enum to break).

## Eighth pass: WZ binary loader + render + domain (re-run — first attempt hit a session limit with no usable output)

- `src/render/WzAudioPlayer.ts` (FIXED) — `PlayLoop`/`PlayEffect` both call
  `URL.createObjectURL(blob)` for every BGM track change and every sound
  effect, but neither ever called `URL.revokeObjectURL`. Real, continuously-
  growing leak: every map transition (new BGM) and every combat sound
  effect left its blob URL alive in browser memory for the rest of the
  page's lifetime. Fixed by tracking the current BGM url and revoking it in
  `Stop()` (called before every new `PlayLoop`), and revoking each effect's
  url in its own `ended` listener (right where it's already removed from
  `_effects`). Not handled: the rare case where `PlayEffect`'s `audio.play()`
  is blocked by autoplay policy — `ended` never fires then, leaking that one
  url; not fixing, sound effects only ever play after user interaction has
  already happened in a game context, so this path is essentially
  unreachable in practice.
- `src/character/AvatarLook.ts` — DELETED. Confirmed dead duplicate: a
  second `AvatarLook` class with diverged field names (`equips`/`weaponId`
  vs. the real `domain/AvatarLook.ts`'s `hairEquip`/`weaponStickerId`),
  zero references anywhere in the codebase.
- Flagged for awareness, no action taken: `WzSprite.ts`/`WzTextureLoader.ts`
  sprites wrapping shared cached textures are never `.destroy()`-ed —
  consistent with the standing decision earlier this session (destroying a
  Sprite without `{texture:false}` would corrupt every other sprite sharing
  that cached texture; the leak is the lesser evil here, not fixing it).
- Confirmed clean (read in full, zero findings): all 19 `src/wz/*.ts` files
  (no off-by-one/endianness/bounds/sign/crypto-key bugs in the binary
  parser), `AnimatedSprite.ts`, all 10 `src/domain/*.ts` files (all
  genuinely imported/used elsewhere — no dead domain code left).
  `WzReaderException.ts` has a cosmetic-only dead `inner?: Error`
  constructor param (never stored/chained) — not worth fixing.

## Seventh pass: app glue, localization (continuing the multi-agent sweep)

- `src/localization/ListService.ts` `_categoryOf` (FIXED) — the item-category
  prefix ranges overlapped at every boundary (`prefix>=1&&<=2` then
  `prefix>=2&&<=3` then `>=3&&<=4` then `>=4&&<=5` then `>=5`), so since
  checks run in if-chain order, every prefix except 1 fell into the
  *previous* (wrong) bucket — prefix 2 (Use items) misclassified as Equip,
  3 (Setup) as Use, 4 (Etc) as Setup, 5 (Cash) as Etc. Fixed to exact
  per-prefix matches. Confirmed currently dead (the whole `ListService`
  class is constructed in `GameStage.ts` but `GetItemName`/`GetMobName`/etc.
  are never actually called anywhere) — fixed anyway since it's free and
  correct now whenever it does get wired up.
- `src/MapleClaudeGame.ts` (FIXED, cosmetic) — was patching
  `NameService`'s private `_questWz` field via `(this.nameService as
  any)._questWz = ...` after construction, even though the constructor
  already accepts this as its second parameter. Switched to passing it
  through the constructor properly; removes an `any`-cast that happened to
  work only because nothing called `QuestName()` before the patch ran.
- Re-confirmed (not new): `src/debug/*.ts` (5 files) are unwired from
  `MapleClaudeGame.ts`/`Program.ts` — `MAPLECLAUDE_DEBUG` has no effect.
  Already documented earlier in this file as intentional ("dev tooling,
  probably keep, not auto-wired into prod build path") — not a new finding,
  no action taken.
- Confirmed clean: `Program.ts`, `NameService.ts` (aside from the
  construction-site fix above), `SettingsStore.ts`, `UserSettings.ts`, all
  5 `src/debug/*.ts` files internally, `tools/proxy-server.ts`. No pixi v7
  API usage anywhere in this batch. `src/character/MeleeAttackEncoder.ts`/
  `MeleeDamage.ts` don't exist (only the already-audited `src/net/packet/`
  versions do).

## Sixth pass: stages, network layer, character/movement, map, domain (5 parallel agents)

**Severe protocol bug (FIXED) — `GameSender.ScriptAnswerNext` sent the wrong
action byte.** It called `ScriptAnswerSay(msgType, ScriptAnswerAction.Cancel)`
instead of `.Select`. Per the enum's own doc comment (`Cancel=0, Select=1`),
this is wired to **both** `onOk` and `onNext` in `GameStage.ts` — meaning
clicking "OK" or "Next" on literally any NPC dialog told the server the
player *cancelled* the conversation instead of advancing it. This would have
broken every NPC-script-driven interaction in the game (shops via script,
quest dialogue, any multi-page NPC text) the moment a real server was
involved. Fixed the sender and the test that was asserting the old (wrong)
byte value.

**Real bug (FIXED) — `PlayerController.ts` jump-edge detection let holding
the jump key auto-repeat jumps on every landing.** `jumpEdge` was
`input.JumpPressed && (!this._prevJump || this._grounded)` — the `||
this._grounded` clause meant holding the key down while continuously
grounded re-armed the edge trigger every time `_grounded` flips back to true
after a landing, so a held jump key would auto-bunny-hop indefinitely
without ever needing to release and re-press. The sibling climb-jump code
(`_updateClimb`) already had the correct pure rising-edge form
(`input.JumpPressed && !this._prevJump`, no `_grounded` clause) — matched
the ground-jump to it.

**Real bug (FIXED) — `ReactorLook.Load()` ignored its own `loader`
parameter.** It read `this._loader` (only ever assigned by the separate
`LoadWith()` wrapper) instead of the `loader` argument passed directly into
`Load()`. Calling `Load()` directly (without going through `LoadWith()`
first) would throw on the first sprite load. Currently unreachable in
practice — confirmed `GameStage.ts` never calls either method on
`ReactorLook` at all, so reactors always render via the placeholder
colored-box fallback — but fixed regardless since it's a real latent bug
or anyone reading the right reactor sprites (`this._loader = loader;` now
set at the top of `Load()` itself, making it self-sufficient).

**Real bug (FIXED) — `ItemIconLoader` shared one cache between items and
pets.** `LoadIcon(itemId)` and `LoadPetIcon(templateId)` both read/wrote the
same `Map<number, ...>` keyed by raw numeric id with no type tag — if an
item id and a pet template id ever numerically collided, one would
silently return the other's cached sprite. Split into `_cache`/`_petCache`.

**Real bug (FIXED) — `CashShopStage.ts`'s `update()` (called every frame)
added a fresh `Text` for every tab label, every item name/price, and the
page indicator, with zero cleanup** — an unbounded Text-node leak the
entire time this stage is active. Also: the loaded `_bg` sprite was checked
truthy only to redraw the *same flat color* already drawn unconditionally
one line above (the real background art never rendered, silently falling
back to flat color always) — fixed to actually draw `_bg`. Also: **pagination
was completely unreachable** — `_page` was rendered (`Page X / Y`) and used
to compute which items to show, but no click handler anywhere could ever
change it, permanently hiding any cash-shop tab with more than one page of
items. Added Prev/Next click zones. Left the dead `_tabBtns`/`_buyBtns`/
`_btExit`/`_btPrev`/`_btNext`/`_allButtons` Button infrastructure alone
(never constructed, never read — `onMouseButton` already does its own
manual hit-testing correctly without them; removing dead fields here was
lower priority than the leak/rendering/pagination fixes).

**Investigated, confirmed NOT bugs (no changes made):**
- `PlayerController._walkOnFoothold`'s `fh.X2 >= fh.X1 ? fh.Prev : fh.Next`
  (and the mirrored ternary for the opposite edge) — re-derived against the
  standard MapleStory foothold convention (`Prev` always ties to the X1
  endpoint, `Next` to X2, independent of which one is numerically larger).
  Both ternaries correctly resolve to the right neighbor for both ascending
  and descending footholds. Initially flagged as a suspected swap bug by
  the audit agent; verified correct by hand before touching anything.
- `CharacterRenderer.ts`'s per-part `sp.x = 2 * positionX - d.penX` mirroring
  when not facing left — looked like a double-flip at first (`MobLook`/
  `NpcLook` only ever do a single `sprite.ToPixi(flip)` with no extra
  position math), but `CharacterRenderer` composites many independently-
  anchored body parts (body/arm/head/hair/weapon/equips) that must be
  repositioned relative to each other when the whole figure flips, unlike
  the single-sprite `Look` classes. This is the player's own avatar,
  already visually confirmed correct via CDP screenshot testing per
  `STATUS.md` — left untouched.
- `MobLook.OnDie()`'s `this._dead = false` — a deliberate safety reset
  before the death animation starts; `_dead` only flips `true` once the Die
  animation finishes playing (`Update()`, last frame check). Working as
  intended, not a bug.
- `MapScene.ts`'s/`CashShopStage`'s redundant `new Graphics()` per rebuild
  that's never drawn into — genuinely dead allocation but harmless
  (empty Graphics costs nothing to render); not worth the churn given
  everything else fixed this pass.

**Confirmed real but NOT fixed (documented, scoped as future work):**
- `FieldScene.ts`'s `_activeHiddenPortalIndex` is declared, checked
  (`_portalAnimation`'s guard for portal types 10/11 — "hidden" portals),
  but never assigned anywhere — hidden portals can never show their
  reveal animation. This needs a player-proximity check (something like
  the `GameStage._checkPortalTouch` pattern already built for auto-walkthrough
  portals) to actually set/clear this field; the portals themselves still
  function for field transfer (that logic doesn't depend on this field at
  all), this is purely a missing visual cue. Not built this pass —
  deferred rather than rushed.
- `MapScene.ts`'s `_rebuildDisplay()` (and `CashShopStage`'s now-fixed
  equivalent before this pass) recreates fresh `Sprite` objects for every
  tiled background segment on every `SetCamera` call (every frame during
  login-flow background scrolling) without calling `.destroy()` on the
  previous frame's sprites — same leak class fixed elsewhere this session,
  confirmed present here too but not yet fixed (lower urgency: login-flow
  background scroll, not a long-running gameplay screen, so the leak rate
  is bounded by how long a player lingers on login/char-select, not by
  hours of continuous gameplay).

**Audit coverage with zero findings** (read in full, confirmed clean):
all of `src/net/senders/GameSender.ts` (except the one bug above) and
`LoginSender.ts`; `LoginHandlers.ts`; `AvatarCodec.ts`; `InPacket.ts`/
`OutPacket.ts`; `ItemDecoder.ts`; `MovePathEncoder.ts`; `MeleeAttackEncoder.ts`;
`MiniRoomProtocol.ts`; `PacketRouter.ts`; `ClientSession.ts`;
`HandshakeReader.ts`; `MigrationCoordinator.ts`; `MachineId.ts`; the entire
crypto stack (`PacketCipher`/`MapleCrypto`/`ShandaCrypto`/`AesUserKey`/
`IgCipher`) — all confirmed faithful, internally-consistent ports with
exact encrypt/decrypt inverses; `LoginStage.ts`, `PinStage.ts`,
`WorldSelectStage.ts`, `RaceSelectStage.ts`, `CharCreationStage.ts`,
`SplashStage.ts`, `app/Stage.ts`, `app/StageDirector.ts`; `FieldScene.ts`
(aside from the one finding above), `Portal.ts`, `MiniMapData.ts`,
`BackType.ts`, `Foothold.ts`; `PlayerInput.ts`, `Stance.ts`, `CharLook.ts`,
`OtherCharLook.ts`, `NpcLook.ts`, `MorphLook.ts`, `TamingMobLook.ts`,
`DamageNumber.ts`, `MobInfoService.ts`, `SkillInfoService.ts`,
`MobSoundService.ts`, `ForbiddenNameProvider.ts`, `MakeCharInfoProvider.ts`.

## Fifth pass: full deep audit of every UI file (parallel agent sweep + fixes)

Dispatched 8 parallel research agents to read every one of the ~69 files in
`src/ui/**` in full and cross-check against `GameStage.ts`. This surfaced the
largest batch of real bugs in the session, including a genuine crash bug.
Fixed everything below; nothing in this section is still broken unless
explicitly marked.

**Crash bug (FIXED) — pixi.js v7→v8 API mismatch.** This project is on
pixi.js v8 (`package.json`), but 13 files across `src/character/*.ts` and
`src/ui/game/QuestReward.ts` called the removed v7 `Graphics` API
(`beginFill`/`lineStyle`/`drawRect`/`drawCircle`/`drawRoundedRect`/`endFill`)
and/or the removed v7 positional `new Text(string, style)` constructor.
These methods don't exist on v8's `Graphics`/`Text` — calling them throws.
Some of these are placeholder/fallback paths (only hit when a sprite fails
to load), but **`CharLook.ts`'s name-tag-equivalent in `OtherCharLook.ts`
and `NpcLook.ts`'s `_addNameTag` run unconditionally for every other player
and every named NPC** — i.e. this would crash on rendering almost any other
character or NPC with a name. Fixed all 13 call sites
(`CharLook`, `DropSprite`, `MorphLook`, `OtherCharLook`, `MobLook`, `NpcLook`,
`TamingMobLook`, `ReactorLook`, `DamageNumber`, plus `QuestReward.ts`) to the
v8 chainable API (`.rect().fill()`/`.stroke()`, `.circle()`, `.roundRect()`)
and the v8 `new Text({ text, style })` constructor.

**Root-cause fix (FIXED) — `GamePanel.isVisible` had zero connection to
Pixi's actual `container.visible`.** It was a plain boolean field; several
panels only ever set `isVisible` and assumed that alone would make them
render, which silently did nothing (confirmed in `UserList.ts`,
`BattleRecord.ts`, `WorldMap.ts`, and implicitly `GameStage.ts`'s
`_quitOverlay`, which only "worked" by accident because Pixi containers
default to `visible: true`). Changed `isVisible` to a getter/setter that
keeps `this._root.visible` in lockstep — fixes every panel relying on the
default behavior at once instead of patching each site. Verified no
subclass shadows `isVisible` as its own field, and that the only two
`GamePanel`-adjacent files calling `container.visible=` directly without
ever touching `isVisible` (`BuffList.ts`, derived/automatic visibility; and
`ItemTooltip.ts`, which isn't even a `GamePanel`) are unaffected.
**Follow-up correction to the above (FIXED) — the fix itself had a
construction-time gap.** `_root = new Container()` still defaulted to Pixi's
`visible: true`, and field initializers (`private _isVisible = false`)
don't go through the setter — so any panel that never explicitly calls
`this.isVisible = false`/`true` anywhere would default to **visible but
untracked** (the exact inverse of the original bug). Audited every
`GamePanel` subclass for this: fixed `_root = new Container({ visible:
false })` so the constructor default is correct regardless of what the
subclass does, then found and fixed 2 real instances that would otherwise
have *broken* (gone invisible) because they never call `isVisible` at all
and relied on the old Pixi default to render — `ChatBar.ts` (the persistent
chat input bar) and `StatusMessenger.ts` (the loot/EXP toast layer), both
now explicitly set `this.isVisible = true` in their constructors.
`BuffList.ts` was a false alarm (it manages `_root.visible` itself,
dynamically, independent of `isVisible` — never needed a fix).

**Second instance of the exact same root-cause bug (FIXED) — `Overlay.ts`**
(the sibling base class for `SoftKeyOverlay`/`SystemNoticeOverlay`/
`LoginNoticeOverlay`/`LoginWaitOverlay`/`QuitConfirmOverlay`) had the
identical disconnected-`isVisible` bug as `GamePanel`, and unlike `GamePanel`
**confirmed actually broken, not just at-risk**: `QuitConfirmOverlay`'s
"Quit MapleClaude?" prompt text is added directly to its `container` in the
constructor with nothing ever toggling `container.visible` — only
`isVisible` is set (always from `GameStage.ts`, externally, never inside
the class itself). Since Pixi containers default to `visible: true`, this
text would have been **permanently rendered on screen, overlapping the
game, from the moment `GameStage` is constructed**, never actually hidden.
Applied the identical getter/setter fix to `Overlay.ts` (with the same
construction-time `new Container({ visible: false })` correction baked in
from the start this time). Checked all 5 `Overlay` subclasses for the same
"never sets isVisible at all" regression risk the `GamePanel` fix needed
guarding against — all 5 have at least one real `isVisible = true` call
(`QuitConfirmOverlay`'s comes from `GameStage.ts` externally, which is fine,
it still goes through the real setter), so no further fixes needed there.
`src/ui/login/DeleteConfirmOverlay.ts` extends neither base class (plain
class, already-documented dead/unused code) — unaffected.

**Severe bug (FIXED) — `SoftKeyOverlay`'s entire virtual keyboard did
nothing via mouse.** `_makeKey`/`_makeButton` accepted an `onClick`
parameter but never assigned it to the returned `Button.onClick`. Every
digit/letter/Del/Next/OK/Cancel key was clickable (`handleMouseButton`
routed correctly) but fired nothing. This is the PIN-entry overlay used by
`CharSelectStage` (whose visibility was already fixed in an earlier pass) —
clicking any key did nothing until now; keyboard text input still worked as
a workaround. Fixed both helpers to assign `b.onClick = onClick`.

**Severe, widespread bug (FIXED) — invisible buttons across 8 panels.**
`GoldHammer.ts`, `ItemProtector.ts`, `KarmaScissors.ts`, `MiracleCube.ts`,
`Maker.ts`, `Memo.ts`, `SkillMacro.ts`, and `Trunk.ts` all share one
copy-pasted `_makeButton` template that (a) used `new Button(name)` instead
of `Button.fromWz(loader, pr, name)` — losing the real WZ button art for a
generic fallback box — and (b) **never added the button's `container` to the
panel's own `container` at all**, so nothing rendered, not even the
fallback. The same files (`GoldHammer`/`ItemProtector`/`KarmaScissors`/
`MiracleCube`/`SkillMacro`) also never added their loaded `_background`
sprite, and several never positioned their OK/Cancel buttons anywhere.
Fixed all 8: `Button.fromWz` + `addChild` in the shared `_makeButton`
helper, `addChild` for each background, explicit OK/Cancel positions where
none existed.

**Real bugs found and fixed in individual files:**
- `ChatBalloon.ts` — `Draw()`'s cleanup assumed only 2 static children
  (`staticCount = 2`) but the constructor adds 10 (1 center graphic + 9
  border/corner/arrow sprites). The first time any chat bubble was drawn,
  this stripped 8 of those 9 sprites from the display list permanently
  (the class still held references and kept positioning them, but they were
  detached) — chat bubbles lost their border art after the very first
  bubble ever shown. Switched to tracking only the dynamically-added `Text`
  nodes and destroying those before each redraw, leaving the border sprites
  alone (toggling their `.visible` instead when no balloon is active).
- `BuffList.ts` — the no-free-slot eviction path did `this._slots.shift()`
  (discarding the first slot's `icon`/`label`/`duration` display objects as
  orphaned, still-attached, never-cleaned-up children) then spread the
  *last* slot's display objects into a new pushed slot, making two logical
  slots share one set of icon/label/duration objects. Fixed to evict
  whichever slot has the least `remaining` time and refill it in place via
  the existing `_fillSlot` (slots are now never shifted/restructured).
- `StatusBar.ts` — `_drawNamePlate` created a fresh `new Text(...)` (the
  white name-shadow clone) every single redraw with no cleanup — a Text-node
  leak on every frame the status bar renders, i.e. always. Made it a
  persistent field updated in place, matching the pattern already used for
  the adjacent `_nameText`.
- `QuickSlotConfig.ts` — background never added to its container at all;
  `_btSetting` built via `new Button('Setting')` (ignoring the loaded WZ
  node) with no `onClick` and never added to the container — clicking
  "Setting" did nothing and nothing was visible besides the title. Fixed
  rendering, switched to `Button.fromWz`, and added an `OnOpenKeyConfig`
  callback (wired in `GameStage.ts` to open the main `KeyConfig` window,
  the only plausible target for a quickslot "Setting" button).
- `SkillBook.ts` — `onSkillUse` was invoked nowhere in the class at all (only
  `onSkillUp`, the SP-spend button, fired); there was no way to actually
  *use* a skill from this panel. Added a double-click-to-use handler on
  skill rows (mirrors the existing double-click pattern in
  `ItemInventory.ts`), gated on the skill being active (not passive) and
  already having ≥1 level.
- `Reset.ts` / `Repair.ts` / `Delivery.ts` / `Claim.ts` / `EntrustedShop.ts` —
  see below, several of these had `update(): void {}` no-ops with real data
  (`_items`, `_message`, `_money`) that was never rendered at all, while
  click-handlers computed hit-rects against that invisible content anyway.

**Fixed with real rendering added:**
- `Claim.ts` — added background, a word-wrapped message `Text`, and an OK
  button wired to `OnConfirm` (previously: no message ever shown, no button
  existed despite the callback field).
- `Repair.ts` — added background + a real item list (name + durability/
  maxDurability) at the exact coordinates `handleMouseButton` already
  hit-tested against (previously invisible).
- `Delivery.ts` — added background + tab rendering + item list, and wired
  the previously-dead `OnSendItem` to actually fire on item click (it only
  changed `_tab` before). `OnSendItem` itself is wired to a `console.log`
  stub in `GameStage.ts` — **no `GameSender` method exists for "delivery
  send item" at all**, same class of gap as `Memo`'s missing opcode below.
- `EntrustedShop.ts` — added background + a real money display + a
  "withdraw all" button wired to the previously-dead `OnWithdrawAll`
  (stubbed to `console.log` — no sender exists). **Did not** build an item
  list: `GameStage.ts` always calls `.Open(0)` with a hardcoded `0` and no
  items array — there's no inbound decoder for entrusted-shop item data
  anywhere in this client. This needs real protocol research before a real
  item list can be built, not a guess.
- `WorldMap.ts` — was a near-empty stub (full-screen dark overlay + an
  invisible close hit-zone, no label, no map content). Added a visible
  title and close button. **Did not** build real map content (regions,
  travel) — no WZ loading is even attempted in this class; that's a
  standalone feature build (same scope category as Guild UI / MiniRoom
  games), not a rendering bug.
- `Reset.ts` — confirmed an even bigger gap than initially flagged: not just
  "SP mode renders no rows" — **`OpenAp`/`OpenSp` are never called from
  anywhere**, so the entire panel (AP mode included, despite having full
  working render logic) was unreachable. Added `/resetap` (lazy chat-command
  route, consistent with `/shop`/`/omok`/etc.) wiring real `_stats` data into
  `OpenAp`. **Did not** wire SP mode: `OpenSp(sp)` only ever received a
  total SP count, never a list of resettable skills — there's no data model
  for "which skills can be SP-reset" anywhere in this client. Real gap,
  not fixed.

**Confirmed NOT bugs (false positives / already covered):** `NpcTalk.ts`
(no scrollable content, correctly has no wheel-poll); `QuestDetail.ts`'s
`_btAccept`/`_btResign` sharing one position (gated by state, intentional);
`Notice.ts`'s `onDismiss` (per-call-site hook by design); `GameMenu.ts`'s
`_lastMouse` (dead but harmless field); `BattleRecord.ts`'s `_tab` (dead
field, no tab UI built — low-priority cosmetic gap, not fixed, panel is a
static title-only shell with no actual battle-record content); `ScriptAnswerTextOnly`/`NumberOnly` (already confirmed harmless dead duplicates in an earlier pass).

## Fourth pass: systematic callback-wiring sweep (same bug class as TradePutItem)

Did a full mechanical sweep of every `OnXxx`/`onXxx` callback field across
`src/ui/game/*.ts` and `src/ui/*.ts` that the owning class actually invokes
internally, cross-checked against every `src/stages/*.ts` file for an
assignment. Found 12 more instances of the exact "both ends compile, callback
is always null" bug. Fixed the ones with a clear, already-existing target;
documented the rest as genuinely blocked (missing protocol, not missing wiring).

**Fixed:**
- `KeyConfig.onOpenQuickSlot` — now toggles `_quickSlotConfig.isVisible`
  (the panel already existed, just wasn't reachable from the keybind window's
  own "open quickslot config" button).
- `StatusBar.onSystemOption` — toggles `_optionMenu.isVisible` (same target
  `onOptions` already used — this is a second, separate status-bar button
  that does the same thing, not a duplicate in the source).
- `StatusBar.onClaim` — toggles `_claim.isVisible`.
- `StatusBar.onChannel` — opens `_channelSelect` with live population data
  (same logic as the `_gameMenu.onChannel` handler — this is a distinct
  status-bar button, confirmed by checking `StatusBar.ts`'s own button defs,
  not a redundant rewire of the same callback).

**Confirmed NOT a bug (false positives from the sweep), left alone:**
- `KeyConfig.onBindingsChanged` — checked `QuickSlotBar`'s rendering: it
  calls `bindingAt(scancode)` live every frame (pull-based), so there is
  nothing for a "bindings changed" push-notification to actually do. Correctly
  has no listener.
- `Notice.onDismiss` — generic reusable OK-dialog; this hook is meant to be
  set per call-site right before `.show()` for callers that need chained
  behavior, not wired once globally. Not a bug.

**Genuinely blocked — missing protocol, NOT missing wiring (don't fabricate):**
- `KeyConfig.onSaveToServer` — `InHeader.FuncKeyMappedModified = 159` exists
  in `OpCodes.ts` but **no sender uses it**; nothing in this codebase
  confirms its wire format. The inbound `FuncKeyMappedInit` (full 89-slot
  table, confirmed in `FieldHandlers.handleFuncKeyMappedInit`) is a *load*,
  not necessarily the same shape as the outbound incremental *save* — would
  need decompile verification before writing `GameSender.FuncKeyMappedModified`.
  Saved keybinds currently never reach the server.
- `Memo.OnSend`/`OnDelete` — **no Memo opcode exists at all** in `OpCodes.ts`
  (checked both InHeader and OutHeader). The entire Memo (offline mail)
  feature has no confirmed protocol in this client; UI exists, network layer
  doesn't.
  **Re-investigated (waterfall implementation pass, "investigate deep"
  rule) — partially resolved, partially still genuinely blocked.** This
  claim is now stale for the receive/delete half: `CMemoListDlg::
  OnButtonClicked`/`SetRet` (decompile 0x624170/0x624280, the real
  memo-inbox dialog, distinct from `Memo.ts`'s current single-class
  model) confirms a real, previously-undocumented opcode —
  `COutPacket(154)`: subtype `Encode1(1)` for nRet 1/2 (claim/delete
  selected memos: `nFlag` count byte, `nEmptySlotCount` byte, then a
  per-selected-memo record keyed by `dwSN`, partially decompiled this
  pass but not byte-complete — the loop body wasn't fully traced before
  this pass's time budget ran out) and subtype `Encode1(2)` for the
  request-list trigger (`CWvsContext::OnMemoNotify_Receive`,
  decompile/9f3830.c, sent automatically when a new-memo fade
  notification fires and the player isn't already viewing the inbox —
  zero args beyond the subtype byte). The inbound `CWvsContext::
  OnMemoResult` (decompile/9f9da0.c) dispatches by a leading byte: case 3
  = full list refresh (`GW_Memo::Decode` per entry, decompile/4f8d40.c,
  not yet read field-by-field), case 4/5 = StringPool-templated send
  result codes (not yet identified beyond the raw ids 2689-2692/2752),
  case 7 = the same "new memo" notify that triggers the auto-request
  above. **Still genuinely blocked: the actual SEND-new-memo packet.**
  `CUISendMemo::SetRet` (the compose dialog Memo.ts's `_startCompose`
  fix this session targets) builds and validates the receiver/content
  strings (curse-filter, length ≤200, can't-message-self) but contains
  **no `COutPacket`/`SendPacket` call of any kind** — whatever sends it
  happens in a caller this pass didn't find (xref to `CUISendMemo`'s
  constructor resolves only to `CWvsContext::SendConsumeCashItemUseRequest`,
  suggesting this dialog may double as a cash-item "attach a note to a
  gift" UI rather than a standalone free-text memo composer — genuinely
  unconfirmed, not guessed at). Net: `Memo.ts`'s "Open inbox"/"Delete"
  actions are now wireable against real opcode 154 once the claim-record
  loop is fully traced; "Send new memo" remains unwired and possibly
  isn't even the same feature this client's `Memo.ts` UI was modeled on.
- `StatusBar.onMTS` (Maple Trade Station) and `StatusBar.onJoyPad` (gamepad
  config) — no opcodes, no senders, no related UI exist anywhere in this
  codebase. Out of scope, not wiring gaps.
- `StatusBar.onChat` — `ChatBar.ts` never reads its own inherited
  `isVisible` anywhere (always renders regardless — it's a persistent HUD
  bar, not a toggleable panel) and has no focus/open method to call instead.
  Unclear what this button is supposed to do; left unwired rather than guess.

## Third pass: dead-sender cross-check found a real regression (FIXED)

- `GameSender.TradePutItem` — confirmed genuinely uncalled at runtime, which
  meant the trade-item-placement feature documented as "DONE" earlier in this
  file was actually broken: `TradingRoom.ts`'s slot-click handler correctly
  calls `this.OnPutItem?.(...)`, but `GameStage.ts` never assigned
  `_tradingRoom.OnPutItem` — clicking an empty trade slot silently did
  nothing. Fixed by wiring the callback. Lesson: a feature isn't done until
  you check the callback you built is actually assigned somewhere, not just
  that both ends compile.
- `GameSender.MiniRoomCreateTrade` — confirmed genuinely unused (no `/trade`
  command existed, unlike `/shop`/`/omok`/`/memorygame` which all got one).
  Added `/trade <name>` — creates a trade room then invites the named
  visible player, same target-resolution as `/miniroom invite`.
- `ScriptAnswerTextOnly`/`ScriptAnswerNumberOnly` — checked, NOT a bug:
  `NpcTalk.onTextConfirm`/`onNumberConfirm` are correctly wired in
  `GameStage.ts` to `ScriptAnswerText(3, ...)`/`ScriptAnswerNumber(4, ...)`,
  which write byte-identical output to the `*Only` variants when used with
  the same type. The `*Only` methods are harmless dead convenience wrappers,
  superseded by the parameterized versions — left alone.
- `AliveAck` (both `GameSender` and `LoginSender`) — confirmed dead (handlers
  construct the keep-alive ack inline instead of calling the sender). Trivial
  one-liner duplication, no behavior risk either way — left alone, not worth
  the churn.
- Guild family (`GuildCreate`/`Join`/`Withdraw`/`Kick`/`Admin`/`Level`/`Expel`/
  `Load`/`Leave` in `GameSender.ts`) — confirmed entirely unused, **and not
  previously documented anywhere in this file**. No Guild UI exists at all.
  Same scope category as Player-shop-creation-before-it-was-built: needs a
  real UI (create/invite/manage members), not a one-line chat-command fix
  like the simpler missing senders. Flagging as a new "needs new UI" item
  rather than building it speculatively.
  **STALE for most of the family, SHIPPED the rest (waterfall
  implementation pass, "start from phase 1").** A real Guild UI now exists
  (`UserList.ts`'s Guild tab + `GuildBBS.ts`, built in much later passes) —
  `Create`/`Load`/`Leave`/`SetMark` were already wired. Re-checked the
  remaining 5 live: `Join`(invite)/`Kick`/`Admin`/`Expel`/`Level` were
  still genuinely unused, because `GuildEntry` never carried the `charId`
  those 4 senders need at all — `GuildMember.characterId` was already
  decoded by `FieldHandlers.handleGuildResult`, just dropped at
  `GameStage`'s `onGuildLoad` mapping site. Added `GuildEntry.charId`,
  made guild-tab rows selectable (mirroring Party's existing pattern), and
  added Invite/Kick/Admin/Expel/Level buttons wired to the real senders
  (`Kick`/`Admin`/`Expel` need `characterName` too, not just `charId` —
  passed straight from the selected row rather than re-resolving it).
  `Withdraw` (charId-only, no name) left unwired — its real UI trigger
  ("cancel my own pending application"?) isn't clear enough to guess a
  button for.

## Second pass: CharSelectStage notice overlays (FIXED), more dead code, scope checks

- `CharSelectStage.ts` had the same "invisible AND non-interactive" bug as
  `GameMenu` had, but worse — affecting 3 overlays (`SoftKeyOverlay` PIC-entry,
  `SystemNoticeOverlay`, `LoginNoticeOverlay`). It checked `.container.visible`
  (the raw pixi flag) instead of `.isVisible` (the overlay's real state, set
  by `.show()`/`.Show()`), and set `container.visible = false` once at init
  with nothing ever setting it back to `true`. Result: the PIC re-entry flow,
  delete-confirmation notices, and generic system notices on the character-select
  screen could never be seen *or* dismissed by click/key (input dispatch read
  the same always-false flag). Fixed by syncing `container.visible =
  <overlay>.isVisible` every frame in `update()` and switching all dispatch
  checks to `.isVisible` directly.
- `SystemNoticeOverlay.ts` had a second, deeper bug under that: its
  background/text/OK-button sprites were loaded but **never added to its own
  `container` at all** — so even with visibility fixed, nothing would have
  rendered. Added the missing `addChild` calls (background + button once in
  the constructor, text sprite swapped in `Show()` per `textId`).
- `domain/CharInfoPet.ts` — DELETED. Confirmed field-for-field duplicate of
  `PacketArgs.CharacterInfoPet` (the interface actually used by
  `CharacterInfoArgs.pets`, already flowing through `FieldHandlers`/`GameStage`).
  Zero importers on the class.
- Noted, not deleted: `character/MorphLook.ts` and `character/TamingMobLook.ts`
  have zero importers, but `GameStage` already opens their WZ packages
  (`_morphWz`, `_tamingMobWz` at lines ~353-354) and never reads from them —
  data loaded for a feature (Morph skill appearance change, Taming Mob mounts)
  that has no rendering/logic built yet. Same category as `ExpTable.ts`: a
  real prerequisite for an unbuilt feature, not dead/duplicate code.
- Re-confirmed `net/packet/MeleeDamage.ts` (0 importers) is the same
  already-documented `UserHit`-blocked file from earlier in this audit, not a
  new finding.
- Swept all of `src/ui/**/*.ts` for any other panel with an unwired `draw()`
  beyond the 13 already fixed — none found. `LoginNoticeOverlay.draw()` is
  correctly called externally from `LoginStage`/`CharSelectStage` (a valid
  alternative wiring to the self-`update()`-calls-`draw()` pattern used
  elsewhere), confirmed not a bug.

## Systemic bug: render/input dispatch gaps across many GamePanel subclasses (FIXED)

Found while building the player-shop-creation feature: `GamePanel`'s actual
per-frame contract is `update(dt)` — `draw()` is not part of it and is never
called automatically. ~13 panels defined a `draw()` with real rendering logic
(backgrounds, item lists, stat displays) that nothing ever invoked, so they
rendered nothing beyond whatever their constructor added directly (usually
just a title and buttons). Two related dispatch gaps were found alongside it:
`GameStage` had **no `onKeyPress` override at all** (so every panel's
Escape-to-close, Enter-to-confirm, etc. was dead during actual gameplay — only
worked pre-game in other stages), and two panels (`Shop`, `QuestLog`) defined
`handleMouseMove`/`handleWheel` methods that don't match the names
`GameStage` actually calls (`onMouseMove`) or forwards at all (no wheel
dispatch exists), so panel-dragging and scroll were also dead in those two.

Fixed:
- `GameStage.onKeyPress` added, dispatching to the topmost visible panel
  (mirrors the existing mouse-click dispatch order exactly), plus
  `_quitOverlay`/`_gameMenu` special-cased the same way `onMouseButton`
  already special-cases `_quitOverlay`.
- `GameMenu` (the channel/skin/options/quit popup) — confirmed it was wired
  to literally nothing: not in `_panels` (different base class, `Overlay` not
  `GamePanel`), so no `update`, `draw`, `handleMouseButton`, `onKeyPress`, or
  `SetMouse` call ever reached it. It could be opened (`Open()`) but every
  click on it did nothing, it never repositioned for window resize, and
  never faded in. Added explicit special-case wiring in `GameStage` for all
  of: mouse click (consume-or-close-on-outside-click), mouse move, key press,
  update, draw.
- Wired `this.draw()` into `update()` for: `Maker`, `KeyConfig`, `MonsterBook`,
  `Memo`, `OptionMenu`, `MiniMap`, `Reset`, `Ranking`, `Shop`, `TitleWindow`,
  `StatDetailInfo`, `PersonalShop`. Of these, `StatDetailInfo` and `MiniMap`
  already cleared/reused their children correctly (safe as-is); the rest
  created fresh `Graphics`/`Text` per call with no clearing — would have
  leaked a node per call, per frame, forever once actually wired up. Fixed by
  tracking each panel's dynamically-created children in a `_dynamicChildren`
  array, `.destroy()`-ing and clearing it at the top of each `draw()` before
  rebuilding. `Shop.ts` in particular is the in-game NPC buy/sell window —
  it had sample placeholder items in a constructor-populated array but no
  tab bar, item list, or detail panel ever actually rendered.
- `Shop.ts`/`QuestLog.ts`: renamed `handleMouseMove` → `onMouseMove` to match
  what `GameStage` actually calls (fixes panel-drag-by-titlebar and, for
  `QuestLog`, scrollbar-drag). Added a `_pollWheel()` using the same global
  `window.__wheelDelta`/`__mouseX/Y` stash `QuestDetail.ts` already uses
  (`GameStage` has no wheel-event dispatch to panels at all) so mouse-wheel
  scrolling works in both — previously, any list longer than one page was
  permanently unreachable past the first screenful.
- `KeyConfig.ts`: added the missing `onMouseMove` (drag-icon-follow position
  and window-titlebar-drag were both reading/writing fields — `_dragMouseX/Y`,
  `_windowDrag` — that nothing ever updated, so dragging a key/skill icon
  rendered it stuck at a fixed wrong position, and dragging the window by its
  titlebar didn't move it at all). Also fixed `_windowDrag` never being reset
  on mouse-up, which would have made the window drag forever after one click.

Confirmed correct/unaffected: `QuestLog.ts` and `QuickSlotBar.ts` already
called `this.draw()` from `update()` correctly (the pattern the other 12
should have followed). `TradingRoom.ts` had the same dead-`draw()` bug, fixed
earlier in this session before this systemic pass was found.

## Resolved against the v95 decompile

- Maker/SkillMacro-craft/EnchantSkill/MiracleCube/GoldHammer/KarmaScissors/
  ItemProtector/Repair — **closed, not actually blocked.** All route through the
  single existing `InHeader.UserStatChangeItemUseRequest = 78`; the server
  resolves item-type-specific behavior from the item ID. Already wired.
  `SkillMacro`'s own save-to-server flow uses `InHeader.SkillMacroFlushToSvr = 122`
  (added), and the anti-macro "are you human" challenge uses
  `InHeader.SendAntiMacroItemUseRequest = 115` / `OutHeader.AntiMacroResult = 42`
  (both added, not yet wired to UI). `Claim` (NX/voucher claim) opcodes
  `OutHeader.ClaimResult/SetClaimSvrAvailableTime/ClaimSvrStatusChanged = 44/45/46`
  added but unhandled.
  **SHIPPED — anti-macro captcha (waterfall implementation pass, ties
  together this finding with the Eighty-sixth pass's `CUIAntiMacro` flag).**
  `SendAntiMacroItemUseRequest` (115) is a separate function entirely —
  its own signature (`targetCharacterName, pos, itemId`) targets another
  character for an item-use action, not a self-answer to the captcha
  popup. The real captcha-answer submit is `CUIAntiMacro::SetRet`
  (decompile/78c940.c): a previously-undocumented opcode 117, added as
  `InHeader.AntiMacroAnswerRequest`, sent only when the player clicks OK
  (`nRet==1`) — cancel/timeout never sends a packet. Built
  `src/ui/game/AntiMacroDialog.ts` (new file): subType 6 renders the JPEG
  CAPTCHA image (base64 data URI -> `Texture.from(Image)`, skipped
  gracefully where `Image` isn't available, e.g. under vitest's node
  environment) with a `window.prompt`-based answer box (same free-text
  convention as `GuildBBS.ts`'s New Post), OK sends
  `GameSender.AntiMacroAnswerRequest`; subTypes 4/5/7/8/9/10 are
  notice-only variants (`CUIAntiMacroNotice` siblings) shown with no OK
  button at all, matching `SetRet`'s real behavior of never sending
  for any `nRet != 1`. Wired into `GameStage.ts`'s `_panels` array (also
  fixed: `AntiMacroDialog` is now actually mouse/keyboard-interactive,
  unlike if it had been left out of `_panels` the way nothing currently
  dispatches to it otherwise). `ClaimResult`/`SetClaimSvrAvailableTime`/
  `ClaimSvrStatusChanged` remain genuinely unwired — no UI consumes them
  yet, separate scope, left as a TODO.
- Incoming friend request — resolved: `FriendResultType.Request = 9` confirmed
  (payload `friendId, message, x, y`). Added to the enum, `FieldHandlers` now
  parses it and fires `onFriendRequest`, but no UI consumes that callback yet —
  `FriendAccept`/`FriendRefuse` still have nothing calling them. That's a
  "needs new UI" item now, not a blocked-protocol one.
  **SHIPPED (waterfall implementation pass).** Wired `fh.onFriendRequest` in
  `GameStage.ts`, mirroring the existing `onFamilyJoinRequest` pattern:
  shows a confirm notice, `onConfirm` sends `GameSender.FriendAccept`,
  `onDismiss` sends `GameSender.FriendRefuse`. No new UI component needed —
  the existing `_notice` confirm panel covers it, same as Family/Party
  invites. `tsc --noEmit` clean, full suite 109/987 passing.
- `dwCrc`/`Crc32` fields in `GameSender.UserMove` — resolved: read the real
  `CMovePath::Encode` body, there's no CRC field in that packet at all. Deleted
  the two dead writes. `FieldCrc.ts`'s value is a once-per-field-load thing,
  unrelated to per-tick movement; still no confirmed send-site for it.
- `ChannelSelect` population list — resolved, was never actually blocked:
  `LoginHandlers.handleWorldInformation` already decodes per-channel
  `userCount` from `WorldInformation` (opcode 10) into
  `_session.worlds[i].channels[j].userCount`. `ChannelSelect.ts` just needs to
  read that array — no missing opcode, no new handler required.
- `FieldCrc.ts`'s send-site — found, but it's not what was speculated.
  `CField::GetCrc` has zero callers in this decompile (no generic
  "send CRC on field load" handshake exists). The only place `m_dwCrc` is
  actually transmitted is inside `CUserLocal::OnKey`'s **minimap split-view
  click-to-jump** handler (`decompile/9369F0.c`) — a one-off hand-rolled
  `UserMove`-shaped packet for instantly teleporting the avatar to a clicked
  point on the minimap, reusing the existing opcode 44 with a synthetic
  1-element move path. Also: the real CRC chain (`decompile/5469F0.c`) folds
  in `m_bTown`/`m_bSwim`/`m_bFly`/`m_bPersonalShopAvailable`/`m_nPhase` in
  addition to foothold+portal CRCs — worth checking `FieldCrc.ts` includes all
  of those if it's ever wired. Not implementing: this is gated on a
  split-minimap click-to-move UI feature that doesn't exist client-side yet,
  not a simple wiring fix.
- `MapleTVHandlers.ts` — rewritten. The previous implementation multiplexed
  all 3 opcodes through one `_handle` reading a fabricated internal `nType`
  0/1/2 byte; confirmed against `CMapleTVMan::OnPacket` that there's no such
  byte — each of the 3 opcodes has its own independent fixed shape (405
  `SetMessage`: flag + messageType + AvatarLook + 2 names + 5 strings +
  totalWaitTime + conditional second AvatarLook; 406 `ClearMessage`: zero
  bytes; 407 `SendMessageResult`: success byte + conditional reason byte).
  Reuses `AvatarCodec.DecodeAvatarLook`. No UI consumes it yet.
  **SHIPPED (waterfall implementation pass).** Re-decompiled
  `CMapleTVMan::OnSetMessage`/`OnClearMessage`/`OnSendMessageResult`
  (0x60f870/0x60f2f0/0x60f5f0) and `OnPacket`'s switch (0x60fe10) to confirm
  the field order byte-for-byte against the existing `MapleTVHandlers.ts` —
  it was already correct, just never assigned any callbacks from
  `GameStage.ts` despite `mapleTVHandlers.register()` being called in
  `MapleClaudeGame.ts` (decode ran into the void). Wired `onSetMessage`/
  `onSendMessageResult` to `_chatBar.addLine`, matching the existing
  broadcast-message fallback convention (AvatarMegaphone/GM Board/Week
  Event use the same pattern) rather than building a graphical TV-portrait
  banner, which is a bigger UI than exists anywhere else in this client.
  `onClearMessage` correctly has nothing to wire (no persistent banner
  state to clear). **New finding, not yet resolved:** while wiring this,
  found `FieldHandlers.ts`'s separate `onMapleTVUseRes`
  (`OutHeader.MapleTVUseRes = 113`) is a different opcode number entirely
  from the real 405/406/407 — likely a stale/mislabeled leftover from
  before the real numbers were found (CMapleTVMan::OnPacket's switch has
  no `case 113`). Left both call sites alone (113's true identity isn't
  determined yet) rather than guessing which one is "right" and deleting
  the other.
- `CashShopHandlers.ts` — rewritten. 7 of 13 CashShop opcodes now decode their
  confirmed real payload shape directly (no shared subtype byte across
  opcodes — that was fabricated too): `QueryCashResult` (383),
  `PurchaseExpChanged` (385), `CheckDuplicatedIDResult` (387),
  `CheckNameChangePossibleResult` (388), `CheckTransferWorldPossibleResult`
  (390, incl. its conditional world-name list), `GachaponStampResult` (391),
  `CashItemGachaponResult` (392/393, shared handler keyed on a 0xC1/0xC0
  subtype byte — the 0xC1 success case carries an opaque 55-byte
  `GW_CashItemInfo` blob, skipped rather than guessed), `OneADay` (395, opaque
  12-byte `OneADayInfo` records per count, skipped), `NoticeFreeCashItem`
  (396, confirmed zero-payload). All 13 are now registered: `ChargeParamResult`
  (382) decodes the Nexon-club-ID string; `CashItemResult` (384, the 58-way
  sub-dispatch) exposes `{subAction, payload: Uint8Array}` rather than
  field-mapping all 58 sub-handlers — consumers switch on `subAction` and
  decode the opaque payload themselves until each one is individually
  confirmed; `GiftMateInfoResult` (386) similarly exposes
  `characterDataPayload: Uint8Array` opaque rather than a full
  `CharacterData::Decode` port (which doesn't exist in this client yet).
- Tournament family — `OutHeader` names corrected to match
  `CField_Tournament::OnPacket` (`TournamentInfo=374, TournamentMatchTable=375,
  TournamentSetPrize=376, TournamentUEW=377`); confirmed opcode 378 is an
  explicit no-op `return` in the decompile, not a missing/unhandled value —
  removed it rather than carry a fabricated entry. Payloads confirmed simple
  for 374/376/377 (1-3 bytes each), but no `TournamentHandlers.ts` exists and
  there's no Tournament UI at all, so didn't build speculative handlers with
  no consumer. 375's real payload lives inside `CMatchTableDlg`'s constructor,
  not decompiled in this pass.
  **STALE NOTE, corrected (waterfall implementation pass).** This was
  resolved in a later pass (Seventeenth pass, below): `TournamentHandlers.ts`
  and `TournamentWindow.ts` both exist now, wired into `GameStage.ts`
  (`_tournamentWindow`). Re-verified live rather than trusting the old
  "no UI at all" claim.

## Needs new UI before wiring is possible

- Trunk withdraw/deposit **money** — DONE. Added two manually-hit-tested
  buttons (no WZ asset exists for them, matching the panel's existing
  inline-hit-test pattern for Sort/Withdraw-item) that call `window.prompt`
  for the amount (same pattern as the existing party/friend invite-name
  prompts) and fire new `OnWithdrawMoney`/`OnDepositMoney` callbacks, wired in
  `GameStage` to the existing `GameSender.TrunkWithdrawMoney`/`TrunkDepositMoney`.
- Trade **money** — DONE: added a "Put Meso" button + `window.prompt` (same
  pattern as Trunk), wired to `GameSender.TradePutMoney`.
- Trade **item** placement — DONE, via select-then-click (not drag-and-drop,
  to match this codebase's existing interaction model — see `Trunk.ts`).
  `ItemInventory` gained an `onItemSelected` callback (fires on every click,
  additive to the existing double-click equip/use behavior). `GameStage`
  wires it to set `TradingRoom.pendingItem` only while the trade panel is
  open; clicking an empty "my" slot in `TradingRoom` consumes that pending
  item and sends `GameSender.TradePutItem`. Also fixed a real separate bug
  found while building this: `TradingRoom.draw()` was never called by
  anything — `GamePanel`'s actual per-frame hook is `update()`, so the whole
  panel (background, item grids, money labels) rendered nothing but its two
  buttons. Rewrote the panel to build persistent Graphics/Text once and
  refresh them in `update()`, and added real 3x3 slot grids for both sides
  (previously just one big background rectangle, no per-slot rendering or
  hit-testing existed at all).
- `_btReset`/`_btEnter`/`_btClame` (from the real client's `TradingRoom.img`)
  — confirmed they have no matching sender in `GameSender.ts` at all (no
  "take back item" or "reset offer" packet exists). Left un-instantiated
  rather than wire them to fabricated behavior.
- Player shop creation — DONE. `/shop <title>` chat command sends
  `MiniRoomCreate(PersonalShop, title, '', 0)`; the existing inbound handler
  already opened `PersonalShop.OpenAsOwner` on success (that part was already
  wired, just unreachable with nothing to trigger it). Added the owner-mode
  half of `PersonalShop.ts` that didn't exist at all: empty-slot rendering up
  to `PLAYER_SHOP_SLOT_MAX`, click-to-place via the same inventory-selection
  bridge as `TradingRoom` (`pendingItem`, set by `GameStage.onItemSelected`),
  a 3-prompt sequence (bundle size / bundle count / price) on placement
  calling `GameSender.ShopPutItem`, and an open/close toggle for the
  "balloon" (shop visibility to other players) calling `ShopBalloonOpen`.
- MiniRoom social wiring — DONE (Create/Invite/Leave); board games — DELIBERATELY
  SKIPPED. Added `/omok <title>` and `/memorygame <title>` (note: the real
  `MiniRoomType` enum only has `OmokRoom=1`/`MemoryGameRoom=2` in this client
  — no standalone RPS room type exists, so "RPS" in the original note above
  was wrong), `/miniroom invite <name>` (resolves the name against currently
  visible `_otherChars` since `GameSender.MiniRoomInvite` takes a charId, not
  a name — unlike Party/Messenger invites which resolve server-side), and
  `/miniroom leave`. Entering an Omok/Memory-game room now shows a status
  message instead of silently doing nothing. **Not building the actual game
  boards** (15x15 Omok grid with stone-placement/win-detection, or the
  memory-match tile grid) — that's real standalone game logic, large scope
  for a niche feature, not a wiring gap. If wanted later, scope it as its own
  task.
- Messenger — DONE, plus a real protocol bug found and fixed along the way:
  `GameStage._onMessengerResult`'s switch used raw numbers (0,1,2,3,5) that
  didn't match the `MessengerAction` enum already defined in this codebase
  (`Open=0, Join=1, Leave=2, Invite=3, Hide=4, DeclineInvite=5, Chat=6,
  Avatar=7, MigratedIn=8`) — e.g. case 2 called `SetParticipant(slotIndex,
  name)` but action 2 (`Leave`) only ever decodes a bare `userIndex`, no
  name, so it would've added a blank-named ghost participant every time
  someone actually left. Case 3 called `RemoveParticipant(slotIndex)` but
  action 3 (`Invite`) decodes name/channel/messengerId, no slotIndex at all
  — reading a field that's never set. Chat (action 6) wasn't handled at all.
  Rewrote the switch against the real enum and the fields `FieldHandlers
  .handleMessenger` actually decodes per action (confirmed by reading that
  decoder, not guessing). Also rebuilt `Messenger.ts` itself, which had no
  rendering at all beyond a close button — participant slots and chat
  messages were tracked in arrays but never drawn on screen. Added
  `/m invite <name>`, `/m <text>`, `/m leave` chat commands (no dedicated
  text-input widget exists for this window, matching the established
  prompt/chat-command convention used elsewhere in this client).

## Needs new gameplay systems before wiring is possible

- `DropMoney` (drop meso) — DONE, lazy route: added a `/dropmeso <amount>`
  chat command (same pattern as the existing `/p`/`/invite`/etc. slash
  commands in `GameStage._handleChatCommand`) calling the existing
  `GameSender.DropMoney`. No drag-out-of-inventory affordance was built — that
  bigger feature (and the matching item-drop, which has no sender at all,
  `DropItem` doesn't exist in `GameSender.ts`) is still open if a real
  drag-to-drop UX is wanted later.
  **Re-investigated (waterfall implementation pass, "no IDA data, keep
  investigating" rule):** confirmed `CUIItem::OnButtonClicked`
  (decompile, 0x7cc4f0) has no "drop item" case at all — only
  DropMoney/Gather/Sort/Toggle/Migrate-to-shop buttons exist. Real OG
  item-dropping is drag-based only (drag an item icon out of the
  inventory window onto the game field), routed through
  `CDraggableItem`'s ~150KB generic dispatcher (same giant function the
  item-drag-and-drop implementation pass already flagged as out of
  scope for full tracing) — the specific "drop target is the field
  itself, not a UI window" branch within it wasn't isolated this pass.
  No opcode name guess (`UserItemDropRequest`/`DropItemRequest`/etc.)
  hit anything in `OpCodes.ts` either. Real spec for a future pass:
  trace `CDraggableItem::PutItem`'s field-drop branch specifically
  (search for where it calls something on `CField` rather than a
  `CUIWnd` subclass) to find the opcode and wire shape, then add it as
  a `DragTarget` on the field/game-world layer using the existing
  `DragController`. Not implemented — genuinely not located, not
  guessed at.
- `UserHit` (PvP/self-damage report to server): no PvP or self-damage system
  exists client-side to source attackIndex/damage/mobId from.
- `TransferField` (portal walk-through) — DONE: added `GameStage._checkPortalTouch`,
  a per-frame proximity check (±20px x, -100..+10px y around `portal.X/Y`)
  against `_field.Portals`, firing `GameSender.TransferField` once and
  latching `_isFieldTransferring` until the next `SetField` to avoid spamming
  the request while the server responds. **Caveat**: which WZ `pt` (portal
  type) values auto-trigger on touch vs. require an explicit key-press isn't
  in this decompile export (only checked directly via decompile, not
  guessed, for the protocol fixes elsewhere in this file) — the type set used
  here — only `1, 2` trigger; `0` start-point, `10/11` hidden/key-press, and
  `7/8` script portals are excluded since a script portal likely expects a
  script-trigger flow before any field transfer, not an instant one) is the
  long-public MapleStory portal-type convention from the private-server
  community, not decompile-verified. Also skips collision/town-portal types
  entirely. If portal behavior looks wrong in testing, this mapping is the
  first thing to revisit.
- `UserAbilityMassUp` — DONE, lazy route: added `/apup <str|dex|int|luk>
  <count>` chat command sending a single `[[stat, count]]` mass-up request.
  No Reset-window UI batches multiple *different* stats into one request yet
  (e.g. clicking +1 on Str and +1 on Dex before confirming once) — that's
  still open if a real accumulate-then-confirm UX is wanted later.
- `ChannelSelect` population list — DONE. Added `worldId`/`channelId` to
  `ClientSession` (set once in `CharSelectStage._onSelectCharacterResult`,
  where both were already in scope from the world/channel picked in
  `WorldSelectStage`). `GameStage`'s channel-menu handler now calls
  `_channelSelect.setChannels(...)` from `session.worlds`/`session.channelId`
  right before showing the panel. Also fixed `ChannelSelect.ts`'s population
  display: it was rendering `userCount` as if it were a 0-1 fraction
  (`Math.round(population * 100)` + color-banded `%`) with no confirmed max
  capacity to normalize against — changed to show the raw count instead of a
  fabricated percentage.

## Inbound coverage gaps (91 unhandled OutHeader opcodes, not yet triaged individually)

- CashShop opcode family — CLOSED as of the fifteenth pass. All 13 opcodes are
  routed (`CashShopHandlers.ts`, 12 `router.register` calls, 392/393 sharing one
  handler same as the real `CCashShop::OnPacket` switch) and `CashShopStage.ts`
  now consumes all 12 callbacks (see fifteenth-pass section below for per-opcode
  decompile citations and the one remaining sub-dispatch gap, `CashItemResult`'s
  58-way internal sub-action switch, which is decoded generically — subAction
  byte + raw payload — but not field-mapped per sub-action).
- Entire Tournament family.
- Various event minigame opcodes.
- `OpCodes.ts` also got: `MakerResult=248`, `MobCrcKeyChanged=297`,
  `NpcChangeController=313`, `MacroSysDataInit=140`, real `FieldEffect/
  BlowWeather/PlayJukeBox` values (154/158/159, owned by `CField`, distinct from
  `MessageBoxCreateFailed/EnterField/LeaveField` at 325/326/327 which used to
  carry those names), and a corrected `CReactorPool` dispatch order
  (`ChangeState=334, Move=335, EnterField=336, LeaveField=337` — was reversed).
  None of these new/fixed values have handlers wired yet except Reactor (which
  was already wired and is now routing to the right handler for each opcode).

## Orphaned files (zero importers, decide wire vs. delete)

- `debug/DebugLauncher.ts`, `debug/DebugWindow.ts` — dev tooling, probably keep
  (not dead code, just not auto-wired into prod build path).
- `domain/CharInfoPet.ts` — pet data model, likely needed once pet system is
  built; currently nothing reads/writes pet state.
- `domain/ExpTable.ts` — DELETED (waterfall implementation pass,
  re-checked from "phase 1"). This note was stale: an exp bar now exists
  (`StatusBar.ts`'s `exp`/`nextExp`/`_expPct`), and the real per-level
  table was independently found and decompile-verified later in this
  same audit (Forty-sixth pass, `NextLevelExpTable.ts`) — that one was
  finally wired into `StatusBar.nextExp` this pass. `ExpTable.ts`'s own
  formula (1.2x/1.08x/1.07x/1.06x growth-rate bands) was a guess, not
  decompiled, and is strictly inferior to the verified extracted table —
  deleted now that the real one is wired and proven correct.
- `domain/JobConstants.ts` — DELETED. Confirmed zero production callers
  (only its own test imported it); server sends an already-filtered skill
  list, so client-side job-root filtering was genuinely unneeded.
- `domain/SkillRecord.ts` — DELETED. Confirmed dead duplicate of
  `PacketArgs.SkillRecordEntry` (identical 3 fields: skillId/level/masterLevel)
  — the interface is what's actually wired through `FieldHandlers` →
  `GameStage`; the class had zero imports anywhere.
- `localization/StringId.ts`, `localization/StringPool.ts` — DELETED. Confirmed
  superseded: `localization/NameService.ts` (instantiated in `MapleClaudeGame`,
  per STATUS.md Phase 11/12 "SHIPPED") loads `String.wz` directly and is what's
  actually wired for name/text resolution. The CSV-keyed `StringPool` class was
  a separate, never-imported, never-wired localization system.
- `map/FieldCrc.ts` — RESOLVED (see top of file): the real `CMovePath::Encode`
  body has no CRC field at all, confirmed by reading the full decompiled
  function. The two hardcoded-zero fields in `GameSender.UserMove` were dead
  weight, not a slot for `FieldCrc`'s output — deleted them. `FieldCrc` itself
  is still unwired: it's a once-per-field-load value, but no confirmed
  send-site was found in this decompile pass. Still needs its target packet
  identified before wiring.
  **Correction (waterfall implementation pass) — re-investigated this
  before searching the rest of the file first, and partly duplicated
  work that was already done more precisely.** A much more authoritative
  answer already exists in this same file's "Resolved against the v95
  decompile" section: `m_dwCrc`'s **only** transmission site is
  `CUserLocal::OnKey`'s minimap split-view click-to-jump handler
  (decompile/9369F0.c) — a one-off synthetic `UserMove`-shaped packet
  for teleporting on minimap click, gated on a UI feature (split-view
  minimap navigation) this client doesn't have. The real CRC chain
  (decompile/5469F0.c) also folds in `m_bTown`/`m_bSwim`/`m_bFly`/
  `m_bPersonalShopAvailable`/`m_nPhase` beyond what `FieldCrc.ts`
  currently computes. That entry's own conclusion (not implementing —
  gated on a missing UI feature, not a simple wiring fix) stands;
  defer to it rather than this one. **New, non-duplicate finding from
  this pass's re-check, though:** confirmed `CWvsPhysicalSpace2D::GetConstantCRC`
  (0xa12cd0) matches `FieldCrc.ts`'s `constantCrc()` exactly (seeds with
  literal `95`, this build's `GameVersion`, then folds in physics
  constants via `CCrc32::GetCrc32`) — corroborates the existing
  implementation is correct as far as it goes. Also found a genuinely
  **separate, unrelated** anti-tamper mechanism while searching:
  `OpCodes.ts`'s already-named `OutHeader.CheckCrcResult = 23`
  (`CClientSocket::OnCheckCrcResult`) is a disconnect-on-mismatch
  integrity check (`if (!Decode1(iPacket)) throw TerminateException`),
  unrelated to `m_dwCrc`/`CField`. Neither direction is wired in this
  client. **Deliberately not implementing a sender for this if the
  send-site is ever found:** it's specifically a client-integrity check
  — building a sender that reports a CRC matching what an unmodified
  original client would send is "evade an anti-cheat check" territory,
  out of scope regardless of this project's legitimate reimplementation
  goals. Documented for completeness, not a TODO to implement.
- `map/TileInfo.ts` — DELETED. Confirmed dead duplicate: `FieldScene.ts` does
  real tile rendering via its own inline `TileDraw` interface, reading
  `tS`/`tile` straight from the WZ layer data. `TileInfo`'s class was a
  separate, never-instantiated, never-imported shape.
- `net/LoginPacketHandler.ts` — DELETED. Confirmed dead duplicate of
  `LoginHandlers.ts` (which already registered+handled both opcodes).
- `net/packet/ItemDecoder.ts` — RESOLVED: there's exactly one item wire format
  in the real client (`GW_ItemSlotBase::Decode` + per-type `RawDecode`,
  confirmed across 14 call sites in the decompile incl. both
  `OnInventoryOperation`'s add case and the full character/inventory load).
  `ItemDecoder.Decode` is a byte-exact match to it. `FieldHandlers._decodeItem`'s
  flag-byte format (`ItemFlag.Quantity/Expire/PetSn/Stats/LevelExp`) does not
  exist in this client — it was a guess. Deleted `_decodeItem` and `ItemFlag`,
  switched all 7 call sites (`InventoryOperation` add, trunk, trade put-item,
  personal-shop put-item/refresh, entrusted-shop refresh) to `ItemDecoder.Decode`.
- `net/packet/MeleeDamage.ts` — **STALE NOTE, corrected (waterfall
  implementation pass).** This said "no combat/attack system exists
  client-side to call this from" — no longer true; a melee combat
  system was built in a later pass and `GameStage.ts:2221` now calls
  `MeleeDamage.Estimate` directly to spawn client-estimated melee
  damage numbers. Not orphaned, not a gap — re-verified live, not just
  trusting the old claim.
- `platform/ClipboardHelper.ts` — confirmed: tiny wrapper, zero call sites,
  no copy-to-clipboard affordance anywhere (no chat-link copy, no
  char-name copy button). Low-priority polish, not a bug.
- `settings/SettingsStore.ts` — FIXED: confirmed real bug, `OptionMenu.
  onSettingsChanged` was a no-op (`() => {}`), so dragging volume sliders
  did nothing and nothing ever persisted. Wired `SettingsStore.load()` on
  GameStage init to restore volume + apply `game.audioPlayer.Volume`, and
  `onSettingsChanged` now applies + saves via `SettingsStore.save()`.
  **STALE NOTE, corrected (waterfall implementation pass).** The
  "sfxVolume not applied anywhere" half is no longer true — re-verified
  live: `WzAudioPlayer` now has a real `SfxVolume` setter
  (`src/render/WzAudioPlayer.ts`, applies to `PlayEffect`'s one-shot
  `Audio` elements independent of BGM), and `GameStage.ts:966`/`969`
  already apply it from `SettingsStore`/`OptionMenu.onSettingsChanged`
  alongside BGM volume. `funcKeyMap`/`resW`/`resH`/`language` fields in
  `UserSettings` are still genuinely unused by `OptionMenu`/`KeyConfig` —
  re-checked, that part of the note still stands.
- `ui/login/DeleteConfirmOverlay.ts` — confirmed real bug: with no secondary
  password set (`loginOpt !== 1`), `CharSelectStage._onDeleteClicked` deleted
  instantly with zero confirmation. Fixed with a `window.confirm()` guard
  (matches the existing `window.prompt()` pattern used for friend/party
  invite names). This orphaned overlay itself (PIC-entry + confirm combined,
  WZ-skinned) is still unused — could replace the `window.confirm` with it
  for visual consistency, but that's a polish item, not a bug anymore.

Each needs a real read-through, not just the filename guess above, before
deciding wire vs. delete.
## Item panel audit (v95 CUIItem + external inventory comparison)

**Audited against local v95 `UIWindow2.img/Item`, CUIItem IDA results, and the external v83 inventory implementation.** The external project is useful for inventory state/drag patterns, but its obsolete controls and tab ordering must not be copied into v95.

### Deferred item-panel gaps

- **Quality/shadow WZ rendering**: `src/ui/game/ItemInventory.ts` does not load or draw `Item/Quality/0..5` or `Item/shadow`; current quality display is synthetic.
- **Quantity image-font source**: the local v95 `UIWindow2.img/Item` tree has no `number` node, so the current quantity path must be re-verified against the actual v95 number-font source instead of relying on text fallback.
- **Inventory operation completeness**: add/move handling must support destination replacement/swaps and `UpdateExp` operations without leaving `_items` and `_slots` inconsistent.
- **Duplicate item IDs**: removal must use inventory type and slot, not only item ID.
- **Reset lifecycle**: `clear()` must rebuild the visible grid, hide tooltips, clear quantity/effect sprites, and reset item-release/cursor state.
- **Release effect resolution**: the release effect packet flag is not an inventory slot; resolve the affected item/equip position before animating.
- **Item action coverage**: protected items, random morph, lottery, New Year cards, books, minigames, marriage invitations, raise items, Pigmy incubator, and UI-open items remain incomplete or stubbed in `GameStage.ts` item routing.
- **Action ordering**: random morph and lottery predicates must run before generic state-change/projectile handling.
- **EXP-up category**: reconcile the current category check with the verified v95 item predicate and `ItemChecks.ts`.
- **Authoritative cash flag**: preserve the decoded packet cash flag instead of deriving cash status only from item ID ranges.
- **Drag/drop coverage**: add v95 destinations for equip, ground, key configuration, status bar, trade/shop/parcel/item maker, pet, dragon, and mechanic equipment.
- **Drag lifecycle**: start drag only after the OG threshold and preserve cursor offset/cancel/drop state.
- **Extended capacity**: reconcile the declared 96-slot capacity with the currently rendered 48 visible positions and v95 `GetItemSlotRect` behavior.

### Verified, not deferred

- v95 collapsed frame is `172x293`; extended frame is `594x293`.
- v95 tab selector is `(8,9,157,19)`.
- v95 scrollbar is `(1,8,152,51,207)` with wheel range `142`.
- v95 item slot geometry is `(10,51)`, `32x32`, `36px` horizontal spacing, `35px` vertical spacing.
- v95 visual Setup/Etc tab swap remains `visual 2 -> invType 4`, `visual 3 -> invType 3`.
