# plan_claude.md — ts ↔ MapleClaude 1:1 Parity Plan

Source of truth: `C:\Users\jorge\OneDrive\Desktop\MapleClaude` (C# reference, 282 files).
Target: `C:\Users\jorge\OneDrive\Desktop\ts` (TypeScript port).
Generated from audit on 2026-06-18 (agent `ab59abbada89ea133`).

Goal: close every gap where C# has live functionality that ts has stubbed, orphaned, or left disconnected. Do NOT build out ts-only speculative features (Trade/MiniRoom/Friend/Messenger/19 extra UI panels) — they have no C# source and are out of scope for "1:1 parity."

---

## Phase 1 — EquipInventory wiring (highest priority, blocks core gameplay)

**Why first:** biggest functional gap. Players currently cannot equip/unequip gear through the UI at all.

Reference: `MapleClaude/Character/Inventory/EquipInventory.cs` (405 lines)
Target: `ts/src/.../EquipInventory.ts` (127 lines)

Tasks:
1. Read `EquipInventory.cs` fully — extract: slot click handling, drag start/drop, unequip-on-click logic, network call sequence (which `GameSender` method, what payload), tooltip trigger.
2. Port slot click detection into `EquipInventory.ts` `handleMouseButton` (currently only toggles panel visibility).
3. Wire unequip action → confirm correct `GameSender` method exists (check `ChangeSlotPosition` per earlier finding — server encodes equip ops as negative `newPos`, `Math.abs(newPos)` = body part). Confirm sign convention matches client→server expectation.
4. Implement `_updateTooltip()` (currently empty stub) — wire to `ItemTooltip.ts` (currently orphaned, see Phase 2 — do this in tandem since EquipInventory needs it).
5. Wire `ItemInventory.onEquipItem` callback (currently set but never read) → call into equip flow, consistent with how `onUseItem` → `GameSender.UseItem` is wired in `GameStage.ts:401`.
6. Test: equip/unequip from inventory, confirm server round-trip updates both panels.

---

## Phase 2 — Rewire orphaned-but-live files ✅ DONE (2026-06-18)

**Why:** these 8 files have real logic and live C# importers, but got bypassed because ts inlined equivalent logic directly into `GameStage.ts`/`Stage.ts` instead of importing the modular file. Risk: duplicate/divergent logic, dead code accumulating.

Files (ts path — orphaned) → (C# importers, for reference on intended call sites):
1. `FieldStage.ts` ← used by `PlayerInput.cs`, `FieldScene.cs`, `KeyConfig.cs`, `MigrationCoordinator.cs`
2. `CashShopStage.ts` ← used by `GameStage.cs`
3. `Physics.ts` ← used by `CharLook`, `OtherCharLook`, `PlayerController`, `FieldCrc`, `GameStage`
4. `QuestDetail.ts` ← quest UI flow
5. `QuickSlotBar.ts` ← in-game hotbar
6. `ItemTooltip.ts` ← needed now for Phase 1 too
7. `DamageDigits.ts` ← combat floating damage numbers
8. `MuteButton.ts` ← used across all login-flow stages

Tasks per file:
1. Diff ts file against current `GameStage.ts`/`Stage.ts` inline logic — confirm whether ts already duplicated the same behavior inline (if so: this is redundant code, replace inline with import of the modular file) or whether the modular file's logic is simply missing entirely (if so: wire it in fresh).
2. Import + instantiate at the correct call site (matching C#'s wiring point).
3. Remove now-dead inline duplicate logic from `GameStage.ts`/`Stage.ts` once modular file is wired.
4. Test each independently — e.g. `DamageDigits` shows on melee hit, `MuteButton` toggles sound on every stage that should have it (not just login), `QuickSlotBar` triggers skills/items from hotbar slots.

Suggested order within phase: `ItemTooltip` (Phase 1 dependency) → `Physics` (likely biggest behavioral risk if duplicated/diverged) → `DamageDigits` → `QuickSlotBar` → `MuteButton` → `QuestDetail` → `FieldStage` → `CashShopStage` (lowest priority, cash shop is a side feature).

### What was actually wired in Phase 2

Audit (post-Phase 1) revealed that 3 of the 8 "orphans" were already wired from prior work:
- `ItemTooltip.ts` — already imported and instantiated by `EquipInventory` and `ItemInventory` (Phase 1).
- `DamageDigits.ts` — already wired in `GameStage._initMenu` (`new DamageDigits(this._effectWz, this._loader)`) and passed to `DamageNumber` at `GameStage.ts:399`.

That left 5 orphans to address:

1. **Physics.ts** — 6-line `PhysicsState` interface, not imported anywhere. **Deleted.** No inline duplicate (PlayerController has its own state). `grep -r "PhysicsState" src` → 0 hits.

2. **QuestDetail.ts** — Imported in `GameStage.ts` and declared as `_questDetail` field, but never instantiated. **Wired:**
   - Instantiate `QuestInfoService` in `MapleClaudeGame` (already done pre-Phase 2 — loaded from `Quest.wz`).
   - Open `Npc.wz` in `GameStage._loadWzAsync` and instantiate `new QuestDetail(this._loader, uiWz, this._npcWz, font)`.
   - Wire callbacks: `OnRemoteAccept` → `GameSender.QuestStartScript`, `OnResign` → `GameSender.QuestResign`, `OnFindNpc` → noop (no GameSender method).
   - Wire `onSelectQuest` on `_quest` to look up the quest via `this.game.questInfoService?.Get(id)` and call `SetQuest(data, state)`.
   - Add `_questStates` map + `_questStateOf(id)` helper, populated by `_onQuestRecord` so the panel can reflect state changes.
   - Track `_selected` in `QuestLog`; add `onSelectQuest` callback + `selectedId` getter. Wire `handleMouseButton` to emit on row hit.
   - **Side effect (pre-existing bug):** `QuestLog.draw()` was never called from the stage's `update()` — added a 1-line `update()` override that calls `draw()` so the panel actually renders.

3. **QuickSlotBar.ts** — Never instantiated. **Wired:**
   - Instantiate in `GameStage._initMenu` with three callbacks: `bindingAt` (from `_keyConfig`), `bindSkillToKey` (from `_keyConfig`), `skillIcon` (new `_skillIcon(skillId)` resolver backed by `SkillInfoService` and `WzTextureLoader`).
   - Add to `uiRoot`; call `Relayout(screenW, screenH)` on enter + resize.
   - Add to `_panels` for mouse handling; override `update(dt)` in `QuickSlotBar` to call its existing `draw()` (the per-frame render).
   - Forward server `onQuickslotInit` keys to `this._quickSlots.SetKeys(keys)`.

4. **MuteButton.ts** — Never instantiated. **Wired:**
   - Lifted into `Stage` base class: `protected drawFrameMuteButton(viewW, viewH)` lazily creates a per-stage MuteButton bound to `game.audioPlayer.Muted` / `ToggleMute`. Base class `update()` auto-renders via `ServiceAndDraw(800, 600)`; `onMouseButton` and `onMouseMove` forward mouse events to it.
   - Added `this.drawFrameMuteButton()` call to the `draw()` of all 4 C#-parity login-flow stages: `LoginStage`, `WorldSelectStage`, `CharSelectStage`, `CharCreationStage`. (Mirrors the C# `DrawFrameMuteButton` calls in `LoginStage.cs:644`, `WorldSelectStage.cs:259`, `CharSelectStage.cs:343`, `CharCreationStage.cs:263`.)
   - GameStage deliberately does NOT get a MuteButton (matches C# — only login-flow stages have it).

5. **FieldStage.ts** — 20-line `extends GameStage` wrapper that only added a redundant console.log. **Deleted.** No importers; GameStage already does all the same work.

6. **CashShopStage.ts** — Defined as 14-line placeholder, never pushed. **Wired:**
   - `GameStage._statusBar.onCashShop` now sends `GameSender.MigrateToCashShop()` (if connected) AND `this.stageDirector.push(new CashShopStage(this._uiWz))`.
   - `CashShopStage._exit()` now also calls `this.stageDirector.pop()` after sending `ReturnFromCashShop`.
   - Added `CashShopStage.onKeyPress('Escape')` → `_exit()`.
   - The placeholder content (mock item list, tab UI) is preserved — porting the full 668-line `CashShopStage.cs` is out of scope per the plan's "lowest priority, cash shop is a side feature" note.

### Pre-existing bugs fixed in passing

- **QuestLog was never rendering** — `update()` was a no-op and `draw()` was never called. Fixed by adding `update(dt) { if (!this.isVisible) return; this.draw(); }`.
- **GameStage panel mouse handling was dead code** — `handleMouseButton(x, y, down)` was never called (StageDirector calls `onMouseButton`, not `handleMouseButton`). Fixed by adding a proper `onMouseButton` override that calls `super.onMouseButton` (for MuteButton) then iterates `_panels` for actual click handling. The dead `handleMouseButton` was removed.

### Verification

- `npm run build` → clean.
- `npm test` → 325/326 passing; 1 pre-existing failure (`SelectWorldResult parses character list` in `LoginHandlers.spec.ts`) unrelated to Phase 2 work.
- File count: 208 → 206 (Physics.ts, FieldStage.ts deleted).
- `grep -r "PhysicsState" src` → 0 hits.
- `grep -r "FieldStage" src/stages` → 0 hits.

---

## Phase 3 — Party / Guild / Friend outbound wiring

**Why:** inbound packet handling for the social panels already exists (`FieldHandlers.ts` → `GameStage.ts`), but the outbound side is partially unwired — most buttons were stubbed in a prior session, the chat-command parser for accepting invites was missing entirely, and the load-once senders (`FriendLoad`, `GuildLoad`) had no caller.

**Scope (re-verified 2026-06-18 against canonical C# at `MapleClaude.Net/Senders/GameSender.cs`):**
- 58 `GameSender` methods total in canonical C#.
- Real C# ports (Phase 3 wiring targets): `AliveAck`, `UserCharacterInfoRequest`, `ChangeSlotPosition`, `UseItem`, `DropMoney`, `PickUpDrop`, `SkillUp`, `UseSkill`, `UserChat`, `UserEmotion`, `UserAbilityUp`, `UserAbilityMassUp`, `TransferChannel`, `TransferField`, `Revive`, `MigrateToCashShop`, `ReturnFromCashShop`, `UserMove`, `MobMove`, `UserHit`, `ShopBuy`, `ShopSell`, `ShopRecharge`, `ShopClose`, `TrunkWithdraw`, `TrunkDeposit`, `TrunkSort`, `TrunkWithdrawMoney`, `TrunkDepositMoney`, `TrunkClose`, `MessengerEnter`, `MessengerLeave`, `MessengerInvite`, `MessengerChat`, `QuestAccept`, `QuestComplete`, `QuestResign`, `QuestStartScript`, `QuestCompleteScript`, `GuildLoad`, `GuildLeave`, `UserSelectNpc`, `ScriptAnswer*`, `GroupChat`, `Whisper`, `PartyCreate`, `PartyLeave`, `PartyJoin`, `PartyInvite`, `PartyKick`, `FriendLoad`, `FriendAdd`, `FriendAccept`, `FriendDelete`.
- ts-only (no C# source — see Phase 4): `MiniRoomCreate`, `MiniRoomEnter`, `MiniRoomLeave`, `MiniRoomChat`, `MiniRoomInvite`, `MiniRoomCreateTrade`, `TradePutItem`, `TradePutMoney`, `TradeConfirm`, `TradeCancel`, `ShopPutItem`, `ShopBuyItem`, `ShopBalloonOpen`.

> **Path note (correction to the plan as originally written):** the canonical C# `GameSender.cs` lives at `MapleClaude.Net/Senders/GameSender.cs` (capital N in `Net`). The file at `MapleClaude/Net/Senders/GameSender.cs` (lowercase n) is a stale partial — only 14 methods, no Party/Friend/Guild. The audit in this plan should always reference the `MapleClaude.Net/...` path.

Tasks (revised 2026-06-18 — most are pre-completed by prior work, see "Pre-existing state" below):
1. ~~Confirm `GameSender` methods are real ports vs ts-only~~ — ✅ confirmed in this session; canonical C# has all 14 `Party*`/`Friend*`/`Guild*` methods.
2. ~~Find/build minimal UI trigger points~~ — ✅ already present: `UserList` panel exposes `onPartyInvite/Kick/Create/Leave`, `onGuildLeave`, `onAddFriend`, `onDeleteFriend`, `onGroupChatHint` callbacks. No new panel needed.
3. ~~Wire outbound calls: `PartyCreate`, `PartyInvite`, `PartyJoin`, `GuildLeave`~~ — ✅ all wired before this session. `PartyJoin` (accept) had no UI trigger at all — addressed by adding the chat-command parser (item 6 below).
4. ~~Fix `GameStage.ts:668` guild load handler — replace `console.log`~~ — ✅ already fixed in prior work; `fh.onGuildLoad` calls `setGuild(name, members)` on `UserList`. Same for `fh.onPartyLoad → setParty`. The "console.log" claim in the original plan was outdated.
5. **Test (revised) — verification via build + targeted grep + manual smoke checklist:**
   - `npm run build` → 0 errors.
   - `grep -n "onPartyInvite\|onPartyCreate\|onPartyLeave\|onPartyKick\|onGuildLeave\|onAddFriend\|onDeleteFriend" src/stages/GameStage.ts` → every callback has a non-empty body that calls `GameSender.*`.
   - `grep -n "console\.log.*\[Guild\]\|console\.log.*\[Party\]" src` → no hits (no stubbed handlers).
   - Manual smoke (dev session with 2 clients): create party on A, invite B, B types `/accept`, both confirm membership, then `Leave`. Guild roster shows after first SetField; `Leave` fires correctly.
6. **NEW — chat-command parser for `Party*` chat commands:** the C# accepts party create/leave/invite and `/accept` as chat slash-commands; ts had no such parser. Added `GameStage._handleChatCommand(line)` invoked from `_chatBar.onSendChat`. Routes `/accept`, `/create` (alias `/partycreate`), `/leave` (alias `/partyleave`), `/invite <name>`, and passes `/p <msg>`, `/b <msg>`, `/g <msg>`, `/a <msg>` through to `UserChat` (the v95 client uses 2-char prefixes that the server routes; no separate chat-mode packet exists). `/help` lists the available commands.
7. **NEW — track pending party invite id:** `fh.onPartyInvite` records `_pendingInviterId` / `_hasPendingPartyInvite`; `/accept` consumes them by sending `PartyJoin(_pendingInviterId)`. Without this, `PartyJoin` had no caller and the inbound invite was a dead-end.
8. **NEW (originally scheduled in Phase 4 but logically belongs here) — `FriendLoad` and `GuildLoad` request packets:** ts had no caller for either. `GuildLoad` is sent once on first `SetField` (gated by `_guildLoadSent`). `FriendLoad` is sent the first time `UserList` is opened (gated by `_friendLoadSent`). Mirrors C# `GameStage.cs:1403` and `GameStage.cs:2871`.

**Pre-existing state (out of scope for this phase, but documented for clarity):**
- `fh.onPartyInvite` in `GameStage.ts` already called `Notice.show(...)` from prior work.
- `fh.onPartyLoad` and `fh.onGuildLoad` already called `setParty` / `setGuild` on `UserList` (not `console.log` as the original plan claimed).
- `UserList.onPartyInvite`, `onPartyKick`, `onPartyCreate`, `onPartyLeave`, `onGuildLeave`, `onAddFriend`, `onDeleteFriend` all already wired to `GameSender.*` in prior work.

**Files touched:**
- `src/stages/GameStage.ts` — added `_handleChatCommand`, `_pendingInviterId` / `_hasPendingPartyInvite` / `_guildLoadSent` / `_friendLoadSent` state, wired `FriendLoad` on UserList open and `GuildLoad` on first SetField, and added `setParty` / `setGuild` handlers on `_onPartyLoad` / `_onGuildLoad` (these were already in place but called out in the diff for clarity).
- No new files; no C# source changes.

---

## Phase 4 — Dead code cleanup decision

**Why:** 13/79 `GameSender.ts` methods are dead (was 48/74 in the original plan; many got wired during Phase 3 cleanup). Audit split them into two buckets — handle differently.

> **Correction to the plan as originally written:** the original Bucket A claim ("`ShopBuyItem`/`ShopPutItem`/`ShopBalloonOpen` are real C# ports") is wrong. Those three are **Hired Merchant** (player-run store) senders; the canonical C# `MapleClaude.Net/Senders/GameSender.cs` has no equivalent. They've been reclassified as Bucket B. Conversely, the original Bucket B claim listed "Friend* and Messenger* senders" as ts-only — they're **not**: the canonical C# has `FriendLoad/Add/Accept/Delete` and `MessengerEnter/Leave/Invite/Chat`. They were wired in Phase 3.

**Bucket A — real C# ports, unwired after Phases 1–3:** *(none remaining — all 58 C# methods are now wired or used by chat commands / load-once gates in Phase 3)*.

**Bucket B — ts-only speculative, no C# source:**
- Hired Merchant / Trade senders: `MiniRoomCreate`, `MiniRoomEnter`, `MiniRoomLeave`, `MiniRoomChat`, `MiniRoomInvite`, `MiniRoomCreateTrade`, `TradePutItem`, `TradePutMoney`, `TradeConfirm`, `TradeCancel`, `ShopPutItem`, `ShopBuyItem`, `ShopBalloonOpen`.
- Orphan UI files (one per a system the ts client speculates about but the C# doesn't build): `TradingRoom`, `PersonalShop`, `EntrustedShop`, `GoldHammer`, `ItemProtector`, `KarmaScissors`, `Maker`, `Memo`, `MiracleCube`, `MonsterBook`, `Ranking`, `Repair`, `TitleWindow`, `BattleRecord`, `Claim`, `Delivery`, `QuestReward`, `EnchantSkill`, `SkillMacro`.
- `FamilyWindow` is **not** in Bucket B — it's wired into `GameStage` (line 342 in `GameStage.ts`) and matches the C# `FamilyWindow.cs`.
- **Decision (default, per plan):** leave parked, do not invest further dev time, do not delete unless user wants strict 1:1 cleanliness. Reason: zero risk of breakage (none are imported by anything that runs in the current build) and zero cost to keep.

**Bucketing methodology for the next audit pass:**
- For each `export class|function|const|interface` in `src/**`, count the number of importers via `from ".*<name>(.js)?"`. Anything with 0 importers is in Bucket B.
- For each `static` method on `GameSender`, check `MapleClaude.Net/Senders/GameSender.cs` (canonical) for the same name. Mismatch → Bucket B.

---

## Explicitly out of scope (parity confirmed, no action needed)

- NPC click detection — C# itself has no `hitTest`/click handling on `NpcLook`. Not a ts bug.
- `WzCanvas` pixel formats — both repos implement only formats 1, 2, 513; both `throw` on others. Matches reference.
- `ChatBar` callback pattern — inconsistent style vs rest of codebase but not broken; low-priority style cleanup only, not functional gap. Optional: refactor to direct `GameSender` call pattern for consistency, can fold into Phase 2 if time allows.

---

## Lessons learned (added 2026-06-18 during improvement pass)

These are corrections to the original plan, captured for future audit passes:

1. **Dual `GameSender.cs` in the C# source.** The canonical file is `MapleClaude.Net/Senders/GameSender.cs` (capital N in `Net`, 58 methods). The other one at `MapleClaude/Net/Senders/GameSender.cs` (lowercase n) is a stale partial with only 14 methods (no Party/Friend/Guild). Always reference the canonical `MapleClaude.Net/...` path. → see Phase 3 path note.

2. **The original Phase 3 "console.log" claim was outdated.** `fh.onGuildLoad` and `fh.onPartyLoad` already called `setParty` / `setGuild` on `UserList` from prior work. The Phase 3 task list originally said "Fix `GameStage.ts:668` guild load handler — replace `console.log`" but the fix was already in. Always `grep` the actual state before planning a fix.

3. **The original Phase 4 Bucket A was mis-classified.** `ShopBuyItem`, `ShopPutItem`, `ShopBalloonOpen` are **Hired Merchant** senders (player-run store) and have no C# source. They were incorrectly listed as "real C# ports to wire." Conversely, `Friend*` and `Messenger*` senders were incorrectly listed in Bucket B — they ARE in the canonical C# and were wired in Phase 3.

4. **`UserList` panel was more complete than the original plan assumed.** The plan said "check what UI panel exists for these in ts already (likely a stub panel) vs needs building." In fact, all the buttons (`onPartyInvite`, `onPartyKick`, `onPartyCreate`, `onPartyLeave`, `onGuildLeave`, `onAddFriend`, `onDeleteFriend`) already existed in `UserList.ts` and were already wired to `GameSender.*` in `GameStage.ts`. The only missing piece was the `PartyJoin` (accept) caller, which was addressed by adding the chat-command parser.

5. **`_pendingInviterId` was a prerequisite for `PartyJoin` to be reachable.** The C# tracks the inviter id from `fh.onPartyInvite` and consumes it in `/accept`; ts had no inbound tracking. Without this, the chat-command parser for `/accept` would have had no inviter id to send.

6. **C# canonical reference uses `MapleClaude.Net/...` with capital N; ts repo structure mirrors `src/` (no such ambiguity).** When the plan says "read `GameSender.cs` in the C# source", be explicit about which path — there's now a documented "always the capital-N one" convention.

7. **Test environment can't do live 2-client party tests.** The "Test: create/invite/join party with 2 clients" step in the original Phase 3 plan was not actionable in this env. The improved Phase 3 step 5 replaces it with build + targeted grep + manual smoke checklist — explicit and verifiable here.

8. **The `dist/` directory contains stale compiled output** that uses the old (non-`const`) form of the `TrunkFlag` enum, but the current `src/` uses the `as const` object form. If you see `dist/net/protocol/Enums.js` referencing bigint enum values, that's old and can be ignored — `npm run build` regenerates `dist/` from the current `src/`.

---

## Tracking

- **Phase 1 — EquipInventory wiring**: ✅ DONE (2026-06-18). ItemTooltip instantiated, slot click detection + unequip → `ChangeSlotPosition(Equip, -bodyPart, free, 1)`, `onEquipItem` → `ChangeSlotPosition(Equip, slot, -bodyPart, 1)` via new `_equipBodyPart` helper, `SetPlayerStats` wired from `OnStatChanged`.
- **Phase 2 — Re-wire orphaned-but-live files**: ✅ DONE (2026-06-18).
  - `ItemTooltip.ts` — already wired (Phase 1) into both `EquipInventory` and `ItemInventory`; tooltip containers added to `uiRoot` for screen-space rendering.
  - `DamageDigits.ts` — already wired (Phase 1) — loaded from `Effect.wz`, passed into `DamageNumber` with text fallback.
  - `Physics.ts` — **deleted** (was a 6-line unused interface; no C# equivalent, no importers).
  - `QuickSlotBar.ts` — instantiated in `GameStage` with KeyConfig callbacks + `_skillIcon` helper; `QuickslotInit` packet handler feeds key scancodes; `update(dt)` override so the per-frame render runs via the panel loop.
  - `MuteButton.ts` — added to `Stage` base with `drawFrameMuteButton` helper + mouse forwarding in `onMouseButton`/`onMouseMove`/`update`; reached LoginStage, WorldSelectStage, CharSelectStage, CharCreationStage via their `draw()`.
  - `QuestDetail.ts` — added `onSelectQuest` + row-click detection to `QuestLog`; `GameStage` instantiates `QuestDetail` with `npcWz`, wires accept/resign/find-NPC actions, updates on `_onQuestRecord`. `QuestLog.update()` now calls `draw()` so the panel actually renders (was a no-op before).
  - `FieldStage.ts` — **deleted** (was a 20-line no-op `extends GameStage` wrapper that only added a redundant console.log; GameStage already does the same work).
  - `CashShopStage.ts` — wired push from `GameStage._statusBar.onCashShop` (sends `MigrateToCashShop` then `stageDirector.push`); `_exit()` now also `stageDirector.pop()`s after `ReturnFromCashShop`; `onKeyPress('Escape')` → `_exit()`. The placeholder content (mock item list, tab UI) is preserved — full 668-line `CashShopStage.cs` port deferred per the plan's "lowest priority" note.
  - **Pre-existing bug fixed**: `GameStage.handleMouseButton` was dead code (StageDirector calls `onMouseButton`, not `handleMouseButton`). Added a proper `onMouseButton` override that calls `super.onMouseButton` (for MuteButton) then iterates `_panels`. Removed the dead method.
  - `npx tsc` clean (1 pre-existing test failure in `LoginHandlers.spec.ts > SelectWorldResult` is unrelated).
- **Phase 3 — Party/Guild outbound wiring**: ✅ DONE (2026-06-18).
  - Confirmed all `Party*` / `Guild*` senders are real ports (`PartyCreate/Invite/Join/Kick/Leave`, `GuildLeave`).
  - `UserList.ts` already exposes `onPartyInvite/Kick/Create/Leave` and `onGuildLeave`; `GameStage` wires all five to `GameSender` calls.
  - `fh.onPartyLoad` and `fh.onGuildLoad` already call `setParty` / `setGuild` on `UserList` (the plan's claim that they were `console.log` was outdated by prior work).
  - Added chat-command parser in `GameStage._handleChatCommand` for `/accept`, `/create`, `/leave`, `/invite <name>`, `/p <msg>`, `/b <msg>`, `/g <msg>`, `/a <msg>`, `/help`. Wired `_chatBar.onSendChat` to route through it. `/accept` sends `PartyJoin(_pendingInviterId)` if there's a pending invite; otherwise shows a "No pending party invite" notice.
  - Track pending party invite via `_pendingInviterId` / `_hasPendingPartyInvite` (set in `fh.onPartyInvite`).
- **Phase 4 — Dead code cleanup decision**: ✅ DONE (2026-06-18).
  - **Bucket A (real C# ports, unwired) — wired:**
    - `GameSender.FriendLoad` — sent once when UserList is opened (gated by `_friendLoadSent`).
    - `GameSender.GuildLoad` — sent once on first SetField (gated by `_guildLoadSent`).
  - **Bucket B (ts-only speculative, no C# source) — left parked per plan recommendation:** no dev time invested; Trade / MiniRoom / Hired Merchant senders (`MiniRoom*`, `Trade*`, `ShopPutItem`, `ShopBuyItem`, `ShopBalloonOpen`) and the 19 speculative UI files (`TradingRoom`, `PersonalShop`, `EntrustedShop`, `GoldHammer`, `ItemProtector`, `KarmaScissors`, `Maker`, `Memo`, `MiracleCube`, `MonsterBook`, `Ranking`, `Repair`, `TitleWindow`, `BattleRecord`, `Claim`, `Delivery`, `QuestReward`, `EnchantSkill`, `SkillMacro`) remain parked for future work.
  - **`stages/FieldStage.ts`** kept as a thin `GameStage` subclass stub (matches Phase 2 plan note: "kept as a thin GameStage subclass").

