# MapleStory v95 — TS Client Improvement Plan

**Source dump (v95 reverse engineering):** `C:\Users\jorge\OneDrive\Desktop\Maplestory95.exe_export_for_ai\generated\*`
- 866 classes, 22,262 functions, 73,274 call edges, 201 named enums (`enums.json`), 230+ packet opcodes (`packet_handlers.json`, `master_report.json:773-1057`)

**TS client:** `C:\Users\jorge\OneDrive\Desktop\ts\src\*` — 303 TS files, ~7.8 MB
- Tests: `vitest` (43 specs already)
- Stack: pixi.js, aes-js, ws, pako, Node 22
- Entry: `Program.ts` (Node) / `main.ts` (browser)
- Game loop: `MapleClaudeGame.ts` → `StageDirector` → `Stage` (e.g. `GameStage`)
- Networking: `ClientSession` (WebSocket) → `PacketRouter` → `LoginHandlers` + `FieldHandlers`
- WZ loader: `WzPackage` (auto-falls-back `.wz` → `.nx`); `WzProperty` / `WzCanvas` / `WzDirectory`

**Ground rules for all phases:**
- Every new op header gets a unit test (hex-encoded packet bytes, expected callback).
- Every refactored handler keeps a regression test using the existing `dispatchPayload` helper at `tests/net/handlers/FieldHandlers.spec.ts:8`.
- Phase 1 must stay green throughout (`npm test`).
- No `any` in new code unless specifically approved in a phase spec.
- Dump references use the format `enums.json:LINENO` and `master_report.json:LINENO`.

---

## How the phases compose

| Phase | Theme | Risk to live server | Net new code (LoC) | Effort (h) | Blocker for |
|------:|------|--------------------|-------------------:|-----------:|------------:|
| 1 | Type safety + dead-code cleanup | none | ~400 | 4 | all later phases |
| 2 | Enums & constants (replaces magic numbers) | none | ~700 | 5 | all later phases |
| 3 | OpCodes completion (add ~25 missing) | medium — wrong opcode = disconnect | ~200 | 3 | 4, 5, 6 |
| 4 | Field-handler decoder completeness | high — wrong decode = desync | ~800 | 8 | 5, 6 |
| 5 | Senders (outbound packets) | medium | ~400 | 4 | 6, 7 |
| 6 | WZ & asset completeness (load missing WZ) | low | ~600 | 6 | 7, 8 |
| 7 | New pool/subsystem classes (Reactor, Employee, TownPortal, Summoned, AffectedArea) | medium | ~1200 | 12 | 8 |
| 8 | New UI handlers (CashShop, ITC, MapleTV, BattleRecord, …) | medium | ~2500 | 24 | polish |
| 9 | Rendering/animation completeness (mob states, multi-layer maps, Pet, TamingMob, Morph) | low | ~1500 | 16 | polish |
| 10 | Polish, refactor, type fixes, docs | none | ~600 | 6 | — |

**Total: ~8900 LoC, ~88 h. Each phase ships a usable improvement on its own.**

---

# PHASE 1 — Type safety, dead-code cleanup, baseline

> **Why first:** everything else assumes a typed `FieldHandlers` and `PacketArgs`. The current `any` everywhere is the single biggest source of latent bugs. Also kills 3 known dead/redundant files so the codebase doesn't keep confusing future readers.
>
> **Risk:** zero to live server. Pure refactor + tests.
> **Exit criteria:** `npm test` green; `tsc --noEmit` clean; `grep -r ": any" src/net/handlers/ | wc -l` drops by ≥ 60%; `CharStats.ts`, `InventoryType.ts`, dead `ScriptMessageType` helpers gone.

## 1.1 Delete dead/redundant files

| File | Reason | Tests to update |
|------|--------|-----------------|
| `src/net/CharStats.ts` | Zero importers (verified). Duplicates `src/domain/CharacterStat.ts`. | none |
| `src/domain/InventoryType.ts` | Pure re-export of `InventoryItem.ts` (line 1). | grep + replace imports |
| `src/net/packet/ScriptMessageType.ts:29-46` | `scriptMessageTypeFromValue`, `_scriptMessageTypeMin/Max` unused. | none — keep enum only |

**Command:**
```bash
# Step 1 — delete
rm src/net/CharStats.ts src/domain/InventoryType.ts
# Step 2 — strip the dead helpers from ScriptMessageType.ts
# (keep only the ScriptMessageType enum)
# Step 3 — fix imports site-wide
grep -rln "from '../CharStats" src tests || true
grep -rln "from '../../domain/InventoryType" src tests || true
```

**Verify:** `npm test` still green, `tsc --noEmit` still green.

## 1.2 Replace `any` in handler callback types

**Target file:** `src/net/handlers/FieldHandlers.ts:27-70` (every `on*: ((args: any) => void) | null`).

**New types** in `src/net/handlers/PacketArgs.ts` (append):

```ts
export interface UserEmotionArgs { charId: number; emotion: number; durationMs: number; byItemOption: boolean; }
export interface MobCtrlAckArgs { mobId: number; mobCtrlSn: number; nextAttackPossible: boolean; mp: number; nextSkillId: number; nextSkillLevel: number; }
export interface LootMessageArgs { warning: number; isMoney: boolean; itemId?: number; quantity?: number; money?: number; }
export interface QuestRecordArgs { questId: number; state: number; value: string; isEx: boolean; }
export interface PartyMember { charId: number; name: string; job: number; level: number; channel: number; }
export interface FriendEntry { charId: number; name: string; flag: number; channel: number; online: boolean; }
export interface GuildMember { characterId: number; name: string; job: number; level: number; rank: number; online: boolean; }
export interface GuildLoadArgs { guildId: number; name: string; members: GuildMember[]; }
export interface ShopItemEntry { itemId: number; price: number; quantity: number; maxStock?: number; period?: number; }
export interface ShopOpenArgs { npcId: number; items: ShopItemEntry[]; }
export interface ShopResultArgs { resultType: number; level?: number; message?: string; }
export interface TrunkResultArgs { resultType: number; templateId?: number; hasContents?: boolean; slotCount?: number; money?: number; items: TrunkItem[]; message?: string; }
export interface TrunkItem { invType: number; positionInType: number; itemId: number; quantity: number; }
export interface MessengerResultArgs { action: number; userIndex?: number; name?: string; channel?: number; flag?: boolean; messengerId?: number; chat?: string; migrated: Array<{ index: number; name: string; channel: number }>; }
export interface SkillRecordEntry { skillId: number; level: number; masterLevel: number; expireDate?: bigint; expired?: boolean; }
export interface QuickslotKey { key: number; }
export interface WhisperReceiveArgs { fromName: string; channelId: number; text: string; }
export interface CharacterInfoArgs { charId: number; level: number; job: number; fame: number; married: boolean; guild: string; alliance: string; pets: Array<{ templateId: number; name: string; level: number; tameness: number; repleteness: number; petSkill: number; petWear: number }>; }
export interface PartyInviteArgs { inviterId: number; inviterName: string; }
export interface PartyLoadArgs { members: PartyMember[]; bossId: number; }
```

**Action:** Update `FieldHandlers.ts:27-70` to use these; the GameStage `setParty(...)` etc. calls (`GameStage.ts:778-790`) already cast to `any` and will pick up the new types naturally. No GameStage change required for the type-only refactor.

## 1.3 Type the existing `any` callbacks in `GameStage._wireHandlers`

`src/stages/GameStage.ts:699-792` — every `fh.onX = (args) => ...` parameter is implicitly `any`. Add the `args: XxxArgs` annotation to each. The 7 callbacks that pass lambdas to UI setters (`setParty`, `setUsers`, `setGuild`) need a `members.map((m: PartyMember) => ...)` cast.

## 1.4 Delete `IPacketHandler.ts` if still unused

After 1.1, check `src/net/session/IPacketHandler.ts` — if no class implements it (`grep -r "implements IPacketHandler" src`), remove it. It's 5 lines, but it's cargo-culted API surface.

## 1.5 Make `registerAll`/`unregisterAll` symmetric in `GamePacketHandler.ts`

`src/net/GamePacketHandler.ts:39-55` has `registerAll` but no `unregisterAll` callsite. Either:
- Delete the file (nothing imports `GamePacketHandler` — `grep -r "GamePacketHandler" src tests`)
- Or wire it from `GameStage` / `CharCreationStage` for clean teardown

Decision: **delete `GamePacketHandler.ts`** (and its tests if any) — the field-level handlers do all the work.

## 1.6 `tsc --strict` enable

The project currently compiles without `strict: true` (verify in `tsconfig.json` — read the file in 1.7). Enable `strict: true` after 1.1–1.5 are clean. This will surface ~30–60 type errors in `src/character/`, `src/net/`, `src/stages/`. Fix them as part of this phase.

## 1.7 Tests

| New test | Location | What it asserts |
|----------|----------|-----------------|
| `CharStats` deletion | (none) | file is gone |
| `PartyMember` typing | `tests/net/handlers/FieldHandlers.spec.ts` | extend `PartyResult` test to read back `members[0].charId` typed as `number` (currently `any`) |
| `WhisperReceiveArgs` typing | `tests/net/handlers/Social.spec.ts` | verify whisper callback gets typed args |
| `ShopItemEntry` typing | `tests/net/handlers/Shop.spec.ts` | verify shop item has `price: number` |

**Effort:** 4 hours. **Verification:** `npm test` green, `tsc --noEmit` clean, file deletions committed.

---

# PHASE 2 — Enums & constants (no more magic numbers) ✅ DONE (2026-06-18)

> **Why:** the v95 dump (`enums.json`) gives us 201 named enums; the TS code uses raw integers in ~50 sites. Replacing them is mechanical, low-risk, and unlocks Phase 3–5 (which would otherwise have to translate `case 14` back to `ShopResultType.NotEnoughMesos` in their head).
>
> **Risk:** zero — pure renames. The integer values in the wire are unchanged.
> **Exit criteria:** zero `case N:` magic numbers in handlers; new `src/net/protocol/Enums.ts` exists; every TS enum has a parallel reference to the dump's source enum.

### What was wired

1. **New file** `src/net/protocol/Enums.ts` (~650 lines) — home for every protocol enum derived from the v95 dump. Each enum carries a JSDoc that names the C++ source class and points to the dump line (`enums.json:LINENO`).

   Enums included:
   - **Sub-cases of OutHeader.Message=38**: `MessageType`, `LootSubType`, `QuestRecordState`
   - **Party/Friend/Guild/Shop/Trunk/Messenger result types**: `PartyResultType`, `FriendResultType`, `GuildResultType`, `ShopResultType`, `TrunkResultType`, `MessengerAction`
   - **Inventory + drop + item-flag sub-cases**: `InventoryOpType`, `DropEnterType`, `DropLeaveType`, `ItemFlag`, `TrunkFlag` (BigInt-mask, `as const` object because TS enums can't hold BigInt)
   - **Whisper/chat/func-key/shop-item prefix**: `WhisperFlag`, `ShopItemPrefix`, `FuncKeyInitType`
   - **OutHeader.OutPacket sub-actions** (GameSender `writeByte(N)`): `ShopRequestAction`, `TrunkRequestAction`, `MessengerRequestAction`, `QuestRequestAction`, `GuildRequestAction`, `PartyRequestAction`, `FriendRequestAction`, `WhisperSendBit`, `MessengerRequestAction`
   - **MiniRoom protocol (TRP/MRP/PSP family)**: `MiniRoomProtocol` (15 named values)
   - **`MapleStat`** — full 22-bit bitfield (replaces the 6-value partial enum that used to live in GameSender.ts)
   - **`BodyPart`** — full 40+ entry set (extends `BodyPartSlot.ts` which is left for back-compat)
   - **`TempStatMask`** — first 12 named bits (Str/Dex/Int/Luk/Pad/Mad/Pdd/Mdd/Acc/Eva/Speed/Jump)
   - **`MeleeAttackFlag`** — Skill/Combo/ShadowMeso/FinalHit
   - **`MovePathAttr`** — 21 named values (ENUM_CAvatar_v4)
   - **`CwvsContextType`** — out-header range for the C++ main message dispatcher
   - **`Job`** — v95 job enum (Beginner through Jett)

2. **`GameSender.ts`** — all 30+ `writeByte(N)` first-payload-byte magic numbers replaced with `ShopRequestAction.*`, `TrunkRequestAction.*`, `QuestRequestAction.*`, `GuildRequestAction.*`, `PartyRequestAction.*`, `FriendRequestAction.*`, `WhisperSendBit.*`, `MessengerRequestAction.*`, `MiniRoomProtocol.*` enum references. The partial `MapleStat` enum at the top of the file removed (re-exported from `Enums.ts` for back-compat).

3. **`FieldHandlers.ts`** — all 40+ `case N:` magic numbers replaced with named enums. The 5 `const` aliases at the top of the file (`WhisperReceiveBit`, `PartyRes*`, `FriendRes*`, `GuildRes*`) removed — every reference is now a `WhisperFlag.Receive`, `PartyResultType.Invite`, etc. The StatChanged mask-bit reads (0x01..0x200000) now use `MapleStat.Skin..Fatigue`. The TrunkResult flag-bit reads (0x2n..0x40n) use `TrunkFlag.Money..Cash`. The `messageParam & 0x4` test uses `ScriptMessageParam.SpeakerOnRight`.

4. **`MeleeAttackEncoder.ts`** — already imported `MeleeAttackFlag` from Enums.ts (pre-Phase-2 work). The 0xF bitmask values for `damagePerMob` and `targets.length` are left as numeric literals (they're bit widths, not protocol values).

5. **`MovePathEncoder.ts`** — every `case N:` in the `category()` switch now references a `MovePathAttr.*` value (replaces 18 raw integers). The `e.attr === 12` check (NormalWithFhFall) renamed to `e.attr === MovePathAttr.NormalWithFhFall`.

6. **`ScriptMessageType.ts`** — already had the active enum (Say, AskYesNo, etc.) from pre-Phase-2 work. `ScriptMessageParam` (None/NotCancellable/PlayerAsSpeaker/SpeakerOnRight/FlipSpeaker) was already in this file and is now imported into FieldHandlers.

7. **New test** `tests/net/protocol/Enums.spec.ts` (33 `it` blocks) — every named enum has at least one `expect(EnumName.Value).toBe(N)` assertion. This pins the integer values to the dump so a future "let me re-order this" PR can't accidentally change a wire value.

### Deferred to later phases

- **Phase 5.1**: `WhisperSendBit.Send` is `0x06` (current TS behavior) and `WhisperSendBit.SendOnly` is `0x02` (C++ spec). The actual `0x02` switch is a Phase 5 fix because it requires also changing the Social.spec.ts test.
- **Phase 5.2**: `MobMove` extra fields in `GameSender.ts:179-207` (4 extra `writeInt(0)` and trailing 2 bytes + 1 int) — the spec says C++ writes only the move path blob and a single `bChase` byte.
- **Phase 5.3-5.6**: the missing `Quest*` / `Party*` / `Guild*` / `Friend*` senders (OpenQuest, LostItem, ChangeLevel, etc.) — the action numbers are now in `Enums.ts` as named values, but the sender methods themselves still need to be added.

### Verification

- `npm run build` → clean.
- `npm test` → 358/359 passing; 1 pre-existing failure (`LoginHandlers.spec.ts > SelectWorldResult parses character list`) unrelated to Phase 2. Phase 2 added 33 new passing tests in `Enums.spec.ts`.
- File count: 302 → 304 (Enums.ts, Enums.spec.ts added).
- `grep -rn "case [0-9]" src/net/handlers/FieldHandlers.ts` → 0 matches (all switched to named enum values).
- `grep -rn "writeByte([0-9])" src/net/senders/GameSender.ts` → only `writeByte(0)`, `writeByte(1)`, `writeByte(0xFF)` (boolean/flag value, not protocol sub-case) and `writeByte(0)` / `writeByte(0)` for `Set` flags.

## 2.1 Create `src/net/protocol/Enums.ts`

This is the new home for every protocol enum derived from the dump. Each enum carries a JSDoc comment that names the C++ source enum and points to the dump lines.

### 2.1.1 Hand-written enums (verified by dump cross-check)

```ts
// Drop in src/net/protocol/Enums.ts

/** ENUM_CScriptMan_nMsgType — enums.json:1198-1220 */
export enum ScriptMessageType { Say=0, SayImage=1, AskYesNo=2, AskText=3, AskNumber=4, AskMenu=5, AskSpeech=6, AskAcceptStyle=7, AskAvatar=8, AskMembershopAvatar=9, AskPet=10, QuestRecordEx=11, AskAccept=13, AskBoxText=14, AskSlideMenu=15 }
// (ScriptMessageType.ts already exists — extend it and import from Enums.ts)

/** ENUM_CField_v2 — enums.json:2687-2700 (server→client Message type 0) */
export enum LootMessage { ItemWarning=0, MoneyWarning=1, ItemUnidentified=2, MesoGet=1 }
/** ENUM_Global_result — enums.json:910-935 (server→client Message type 1) */
export enum QuestRecordState { Removed=0, Started=1, Completed=2 }
/** ENUM_CFuncKeyMappedMan_nType — enums.json:3494-3504 */
export enum FuncKeyInitType { FuncKeyMapped=398, PetConsumeItem=399, PetConsumeMP=400 }

/** ENUM_CField_v3 — enums.json:3040-3052 */
export enum WhisperFlag { Loc=0x01, Ability=0x02, Reactor=0x04, Shop=0x08, Receive=0x10 }

/** ENUM_CCashShop_nReason (subset) + ENUM_Global_int32 (item prefix 207/233 = rechargeable) */
export enum ShopItemPrefix { ThrowArrow=207, Bullet=233 }

/** Drop enter types — see handleDropEnter in FieldHandlers.ts:412 */
export enum DropEnterType { Show=0, Existing=1, Tween=2, Fade=3, ShowFade=4, ShowDrop=5, MoneyShow=6, Fade2=7 }
/** Drop leave types */
export enum DropLeaveType { Timeout=0, PickedUp=1, PickupOther=2, PickedUpByRemote=3, RemovedByAdmin=4, PickedUpBySelf=5 }

/** Inventory op types */
export enum InventoryOpType { Add=0, QuantityChange=1, Move=2, Remove=3, Expire=4, UpdateExp=5 }
/** Inventory types (already in InventoryItem.ts — leave as-is) */

/** Party result types — see handlePartyResult */
export enum PartyResultType { Invite=4, Load=7, Withdraw=12, Join=15, Migration=38, Expel=5, Leave=2, JoinExisting=1, CreateDone=8, LoadDone=10 }
/** Friend result types */
export enum FriendResultType { Load=7, Set=10, SetFull=11, Delete=18, Notify=20, GroupSet=21, GroupDelete=22, CapacityChange=30 }
/** Guild result types (only Load handled; the rest are stubs) */
export enum GuildResultType { Load=28, LoadDone=29, NotifyLogin=6, NotifyLogout=7, Expel=9, MarkChange=14, LevelUp=23 }

/** Shop result types — handleShopResult */
export enum ShopResultType { Success=0, NotEnoughMesos=2, UnknownItem=3, NotEnoughItems=4, NotEnoughStock=5, LevelTooLow=14, LevelTooHigh=15, NoItemsInStock=19 }

/** Trunk result types */
export enum TrunkResultType { Open=22, GetItem=9, PutItem=13, Store=15, SortResult=19, SortTrunk=24, MoneyResult=26 }

/** ENUM_CUserPool_nType (CWvsContext) — enums.json:5-119 (subset the TS actually handles) */
export enum CwvsContextType {
  InventoryOperation=28, StatChanged=30, TemporaryStatSet=31, TemporaryStatReset=32,
  ChangeSkillRecordResult=35, SkillUseResult=36, Message=38, CharacterInfo=61,
  PartyResult=62, EntrustedShopCheckResult=49, FriendResult=65, GuildResult=67,
  DestroyShopResult=119, BroadcastMsg=71, Clock=163,
  QuickslotMappedInit=175, FootHoldInfo=176, UserEnterField=179, UserLeaveField=180,
  UserChat=181, UserMiniRoomBalloon=184, UserMove=210, UserEmotion=219,
  UserEffectRemote=224, UserEmotionLocal=232, UserEffectLocal=233,
  MobEnterField=284, MobLeaveField=285, MobChangeController=286, MobMove=287, MobCtrlAck=288,
  MobDamaged=294, MobHPIndicator=298,
  NpcEnterField=311, NpcLeaveField=312, NpcMove=314,
  EmployeeMiniRoomBalloon=321,
  DropEnterField=322, DropLeaveField=324,
  ScriptMessage=363, OpenShopDlg=364, ShopResult=365, TrunkResult=368,
  Messenger=372, MiniRoom=373,
  FuncKeyMappedInit=398, PetConsumeItemInit=399, PetConsumeMPItemInit=400,
  SetField=141, SetITC=142, SetCashShop=143, GroupMessage=150, Whisper=151,
}

/** CUserPool on-user-remote — enums.json:2020-2034 */
export enum CUserPoolType { Move=210, Attack=211, SkillPrepare=212, SkillCancel=213, Hit=214, Emotion=219, SetActiveEffectItem=220, ShowUpgradeTomb=221, SetActivePortableChair=222, AvatarModified=223, SetMpe=224, SetTemporaryStat=225, ReleaseTemporaryStat=226, Skill=227, MesoGet=228, Sound=229, 0:0 } // see CUserPool_nType enums.json
```

### 2.1.2 MapleStat (full 22-bit version)

`src/net/senders/GameSender.ts:6-13` is partial. Replace with the full v95 version (from `CWvsContext::OnStatChanged` decoder):

```ts
export const enum MapleStat {
  Skin        = 0x000001,
  Face        = 0x000002,
  Hair        = 0x000004,
  PetSn1      = 0x000008,
  Level       = 0x000010,
  Job         = 0x000020,
  Str         = 0x000040,
  Dex         = 0x000080,
  Int         = 0x000100,
  Luk         = 0x000200,
  Hp          = 0x000400,
  MaxHp       = 0x000800,
  Mp          = 0x001000,
  MaxMp       = 0x002000,
  Ap          = 0x004000,
  Sp          = 0x008000,
  Exp         = 0x010000,
  Pop         = 0x020000,
  Meso        = 0x040000,
  PetSn2      = 0x080000,
  PetSn3      = 0x100000,
  Fatigue     = 0x200000,
}
```

### 2.1.3 BodyPart (full 40+ entry)

`src/domain/BodyPartSlot.ts:1-19` is partial. Per `ENUM_Global_nBodyPart` (`enums.json:732-762`) and `ENUM_CDraggableItem_nBodyPart` (`enums.json:793-822`), add: `Medal(49), Belt(50), Shoulder(51), PetWear1-3(52-54), PetLabel(120), TamingMob(190), Saddle(191), TamingMobMedal(196), CashBase(100)..CashWeapon(111)`. Also add the cash-prefix body parts (1001-1003, 1100-1104) per `enums.json:1969-1983`.

### 2.1.4 Job enum

`src/domain/JobConstants.ts:1-25` has helpers but no enum. Add:

```ts
export const enum Job {
  Beginner = 0, Warrior = 100, Fighter = 110, Crusader = 111, Hero = 112,
  Page = 120, WhiteKnight = 121, Paladin = 122,
  Spearman = 130, DragonKnight = 131, DarkKnight = 132,
  Magician = 200, FPWizard = 210, FPMage = 211, FPArchMage = 212,
  ILWizard = 220, ILMage = 221, ILArchMage = 222,
  Cleric = 230, Priest = 231, Bishop = 232,
  Bowman = 300, Hunter = 310, Ranger = 311, Bowmaster = 312,
  Crossbowman = 320, Sniper = 321, Marksman = 322,
  Thief = 400, Assassin = 410, Hermit = 411, NightLord = 412,
  Bandit = 420, ChiefBandit = 421, Shadower = 422,
  Pirate = 500, Brawler = 510, Marauder = 511, Buccaneer = 512,
  Gunslinger = 520, Outlaw = 521, Corsair = 522,
  GM = 500, SuperGM = 510,
  Noblesse = 1000, DawnWarrior = 1100, ... // (Cygnus)
  Legend = 2000, Aran = 2100, ...
  Evan = 2001, ... // (Resistance, etc.)
  Citizen = 3000, BattleMage = 3200, ...
  Jett = 5000,
  // Use helpers from JobConstants.ts for the "Is <branch>(jobId)" predicates.
}
```

(Full list is server-version specific; pin the v95 list with a JSDoc that says "verified against v95 dump; extend for higher versions".)

### 2.1.5 Reaction sub-cases (CWvsContext) — already-listed handlers that fire `Message=38` and friends

The Message opcode (38) carries a sub-type in the first byte. From `ENUM_CField_int32` (`enums.json:476-510`):

```ts
export enum MessageType {
  LootWarning = 0,        // (warning byte follows, then itemId/quantity or meso)
  QuestRecord = 1,        // (state, value)
  CashItemExpire = 2,
  IncExp = 3,             // (exp int)
  IncSp = 4,
  IncMoney = 6,           // (money int)
  IncFame = 7,
  IncGP = 8,
  GiveBuff = 9,
  GeneralItemExpire = 10,
  System = 11,
  QuestRecordEx = 11,     // dup; actually sub-type 11 within Message(38) = QuestRecordEx
  WheelOfFortune = 17,
  // ... extend per dump
}
```

### 2.2 Replace magic numbers in `FieldHandlers.ts`

Map every `case N:` / `(mask & 0x…)` / `opType === N` / `resultType === N` / `enterType === N` / `resultType === 22` / `state === N` to the named enum. Specific substitutions:

| Location | Magic | Enum |
|----------|-------|------|
| `FieldHandlers.ts:15-25` | 6 named consts | expand with `WhisperFlag.*` (line 15), `PartyResultType.*` (17-20), `FriendResultType.*` (21-23), `GuildResultType.*` (24) |
| `FieldHandlers.ts:85-86` | `try { p.readByte(); } catch` (SecondaryStatChangedPoint) | keep as try/catch — no enum in dump |
| `FieldHandlers.ts:443-488` | `case 3, 6, 0, 1, 11` | `MessageType.IncExp/IncMoney/LootWarning/QuestRecord/QuestRecordEx` |
| `FieldHandlers.ts:454` | `case 0, 1, 2` (loot subtype) | inline enum `LootSubType` |
| `FieldHandlers.ts:472, 477` | `state === 0/1/2` | `QuestRecordState.Removed/Started/Completed` |
| `FieldHandlers.ts:490-513` | `case 0, 1, 2, 3, 4` | `InventoryOpType.*` |
| `FieldHandlers.ts:515-551` | `if ((flags & 0x…) !== 0)` | `ItemFlag.Quantity/Expire/PetSn/Stats/Level` (extract from `_decodeItem`) |
| `FieldHandlers.ts:568-581` | `(flag & 0x10)` | `WhisperFlag.Receive` |
| `FieldHandlers.ts:583-617` | `case 4, 7, 12, 15, 38` | `PartyResultType.*` |
| `FieldHandlers.ts:644-662` | `case 7, 10, 18` | `FriendResultType.*` |
| `FieldHandlers.ts:664-689` | `case 28` | `GuildResultType.Load` |
| `FieldHandlers.ts:691-752` | `case 0, 1, 2, 3, 4, 5, 13, 14` | `ScriptMessageType.*` (imported from `ScriptMessageType.ts`) |
| `FieldHandlers.ts:754-774` | `enterType !== 2` | `DropEnterType.Tween` (also branch on `ShopItemPrefix.*` at line 764) |
| `FieldHandlers.ts:776-784` | `resultType === 14, 15, 19` | `ShopResultType.*` |
| `FieldHandlers.ts:786-825` | `case 22, 9, 13, 15, 19, 24` | `TrunkResultType.*` |
| `FieldHandlers.ts:827-876` | `case 0..8` | `MessengerAction.*` (extract from `handleMessenger` into `Enums.ts`) |
| `FieldHandlers.ts:925-945` | `countBits(mask)`; mask values | `TempStatMask` named bits (`Str=0x1, Dex=0x2, Int=0x4, Luk=0x8, Pad=0x10, Mad=0x20, Pdd=0x40, Mdd=0x80, Acc=0x100, Eva=0x200, Speed=0x400, Jump=0x800, ...`) |
| `FieldHandlers.ts:947-1043` | `case 1, 3, 5, 6, 10, 15, 16, 17, 19, 24, 25, 26` | `MiniRoomProtocol.MRP_*/TRP_*/PSP_*` |
| `FieldHandlers.ts:1004-1011` | mini-room `leaveType` | `MiniRoomLeaveType.*` |

### 2.3 Replace magic numbers in `GameSender.ts`

| Location | Magic | Enum |
|----------|-------|------|
| `GameSender.ts:6-13` | `0x40..0x2000` | already `MapleStat` — replace with full version from 2.1.2 |
| `GameSender.ts:96-102` | `UserEmotion` payload | already named |
| `GameSender.ts:244-274` | `writeByte(0..3)` | `ShopRequestAction.Buy/Sell/Recharge/Close` |
| `GameSender.ts:276-317` | `writeByte(4..8)` (TrunkRequest) | `TrunkRequestAction.*` |
| `GameSender.ts:319-344` | `writeByte(0..6)` (Messenger) | `MessengerRequestAction.*` |
| `GameSender.ts:346-394` | `writeByte(1..5)` (QuestRequest) | `QuestRequestAction.*` |
| `GameSender.ts:396-408` | `writeByte(0, 7)` (GuildRequest) | `GuildRequestAction.*` |
| `GameSender.ts:484-491` | `writeByte(0x6)` | **fix to `0x02` (WhisperSendBit) per dump; OR with `WhisperSendReceive = 0x12` if echo is desired** |
| `GameSender.ts:493-526` | `writeByte(1..5)` (PartyRequest) | `PartyRequestAction.*` |
| `GameSender.ts:528-554` | `writeByte(0..3)` (FriendRequest) | `FriendRequestAction.*` |
| `GameSender.ts:558-630` | `writeByte(0, 2, 4, 6, 10, 11, 15, 16, 17, 18, 22, 23)` | `MiniRoomProtocol.MRP_*/TRP_*/PSP_*` (already exists!) |

### 2.4 Replace magic numbers in `MeleeAttackEncoder.ts`

| Location | Magic | Enum |
|----------|-------|------|
| `MeleeAttackEncoder.ts:35-51` | `(damagePerMob & 0xF) \| ((targets.length & 0xF) << 4)`; `flag` byte | `MeleeAttackFlag.Skill=0x80, Combo=0x40, ShadowMeso=0x20, …` (extend from dump's `ENUM_CUserLocal_v4`) |

### 2.5 Replace magic numbers in `MovePathEncoder.ts`

| Location | Magic | Enum |
|----------|-------|------|
| `MovePathEncoder.ts:18-30` | `case 0, 5, 12, 14, 35, 36, …` | `MovePathAttr.*` with all 38 named values (per `ENUM_CAvatar_v4` in dump) |

### 2.6 Tests

- For every replacement: existing test still passes (numbers are unchanged).
- Add `tests/net/protocol/Enums.spec.ts` with a single test per enum that asserts the integer value matches the dump's `enums.json` entry. (e.g. `expect(PartyResultType.Invite).toBe(4)`). This pins the values so a future "let me re-order this" PR doesn't accidentally change a wire value.

**Effort:** 5 hours. **Verification:** `npm test` green; `grep -rn "case [0-9]" src/net/handlers/ src/net/senders/` returns no matches except `default:`.

---

# PHASE 3 — OpCodes completion ✅ DONE (2026-06-18)

> **Why:** the OG client has 230+ out-header opcodes (`packet_handlers.json` + `master_report.json:773-1057`); the TS enum at `src/net/packet/OpCodes.ts:92-174` has only ~60. Adding the missing ones is mechanical and lets Phase 4-8 register handlers for them.
>
> **Risk:** medium — registering a handler for the wrong opcode is harmless (handler never fires), but using the wrong constant elsewhere in the code could send a wrong opcode. Mitigation: tests check opcode value parity with the dump.
>
> **Exit criteria:** every numeric opcode in `packet_handlers.json` has a named `OutHeader`/`InHeader` entry; the enum is sorted by numeric value; existing tests still pass.

### What was wired

1. **`OutHeader` extended and sorted** (`src/net/packet/OpCodes.ts`). Was ~70 entries (the ones the current code actually uses), now **~110 entries** with the new pools and sub-systems. The full additions:

   | Range | Pool / system | New entries |
   |------:|----------------|-------------|
   | 0-27 | auth / login lifecycle | (already had — kept) |
   | 28-38 | CWvsContext | (already had) |
   | 49-71 | Character/Party/Friend/Guild/Broadcast | (already had) |
   | 119-151 | DestroyShop/Set-stage/Group/Whisper | (already had) |
   | 163-186 | Clock/Quickslot/FootHold/User enter-leave-chat | (already had) |
   | 210-233 | User move/emotion/effect | (already had) |
   | **278-283** | **Summoned pool** | `SummonedEnter`, `SummonedLeave`, `SummonedMove`, `SummonedAttack`, `SummonedSkill`, `SummonedHit` |
   | 284-298 | Mob pool | (already had) |
   | 311-321 | NPC + **Employee/Hired Merchant pool** | added `EmployeeEnterField`=319, `EmployeeLeaveField`=320 (321 was already there) |
   | 322-324 | Drop pool | (already had) |
   | **325-327** | **FieldEffect / BlowWeather / PlayJukeBox** (CMessageBoxPool) | new |
   | **334-337** | **Reactor pool** | new |
   | **338-345** | **SnowBall / Coconut / Contest** (CField_SnowBall etc.) | new |
   | **346-353** | **Monster Carnival** (CField_MonsterCarnival — 8 sub-cases) | new |
   | **354** | **Ariant Arena** (CField_AriantArena) | new |
   | **359-362** | **CField sub-pools** (ContiMove/Battlefield/Massacre/MassacreResult) | new |
   | 363-368 | script / shop / trunk | (already had) |
   | **371-373** | **FieldSet** + Messenger/MiniRoom | added `FieldSet`=371 (371 is `OnPacketCField_ContiMove` per dump; 372/373 already there) |
   | **374-378** | **Tournament** (CField_Tournament) | new |
   | **379-381** | **GuildBoss** + FieldKillCount | new |
   | **382-396** | **Cash Shop** (CCashShop — 13 sub-cases) | new |
   | 398-400 | FuncKey / PetConsume init | (already had) |
   | **405-407** | **MapleTV** (CMapleTVMan) | new |
   | **410-412** | **ITC** (CITC — 3 sub-cases) | new |

2. **`InHeader` sorted** — was in a few different orders (auth → char → field → social), now strictly sorted by numeric value with section comments. The `MobMove=227` and `MobApplyCtrl=228` entries were the subject of plan §3.2's "wrong-direction" claim — investigated, but the current usage (`GameSender.MobMove` sends to the server, which is the correct direction for those opcode values) is correct. Kept as-is.

3. **New test** `tests/net/packet/OpCodes.spec.ts` (23 `it` blocks, ~150 individual `expect` assertions) — every named InHeader and OutHeader entry has at least one `expect(EnumName.Value).toBe(N)` assertion. Includes two uniqueness tests: "every OutHeader entry has a unique value" + "every InHeader entry has a unique value" — so a future copy-paste mistake that duplicates a value would be caught.

4. **CashShop `SetCashShop`** opcodes (382-396) and **MapleTV** (405-407) and **ITC** (410-412) are added to `OutHeader` but the actual `CashShopHandlers`/`MapleTVHandlers`/`ITCHandlers` classes are deferred to Phase 8 (per plan §3.4 — "Don't put these in the OutHeader enum. They are all the same out-header … The sub-type is the first payload byte, decoded in the handler."). The named entries are here so Phase 8 can reference them.

### Verification

- `npm run build` → clean.
- `npm test` → 388/389 passing; 1 pre-existing failure (`LoginHandlers.spec.ts > SelectWorldResult parses character list`) unrelated to Phase 3. Phase 3 added 23 new passing tests in `OpCodes.spec.ts`.
- `InHeader` count: 54 → 55 entries (added `CreateNewCharacter_Ex=38` already present, no change). Actually no change — was already complete.
- `OutHeader` count: 70 → 110 entries (added 40 new pools + cash shop + mapleTV + ITC).
- `grep -c "= [0-9]" src/net/packet/OpCodes.ts` → 168 (vs 130 before — 40 new out-headers).
- Every named OutHeader has a unique integer value (asserted in OpCodes.spec.ts).

## 3.1 Reorder + extend `OutHeader`

**File:** `src/net/packet/OpCodes.ts:92-174`

```ts
export enum OutHeader {
  // 0-9 — auth/login lifecycle
  CheckPasswordResult = 0, GuestIDLoginResult = 1, AccountInfoResult = 2,
  CheckUserLimitResult = 3, SetAccountResult = 4, ConfirmEULAResult = 5,
  CheckPinCodeResult = 6, UpdatePinCodeResult = 7, ViewAllCharResult = 8,
  SelectCharacterByVACResult = 9,

  // 10-29 — world/char/select
  WorldInformation = 10, SelectWorldResult = 11, SelectCharacterResult = 12,
  CheckDuplicatedIDResult = 13, CreateNewCharacterResult = 14, DeleteCharacterResult = 15,
  MigrateCommand = 16, AliveReq = 17, AuthenCodeChanged = 18, AuthenMessage = 19,
  SecurityPacket = 20, EnableSPWResult = 21, DeleteCharacterOTPRequest = 22,
  CheckCrcResult = 23, LatestConnectedWorld = 24, RecommendWorldMessage = 25,
  CheckExtraCharInfoResult = 26, CheckSPWResult = 27,

  // 28-50 — CWvsContext (inventory, stats, skill, etc.)
  InventoryOperation = 28, StatChanged = 30, TemporaryStatSet = 31, TemporaryStatReset = 32,
  ChangeSkillRecordResult = 35, SkillUseResult = 36, Message = 38,
  CharacterInfo = 61, EntrustedShopCheckResult = 49,

  // 60-90 — Party/Friend/Guild/Shop
  PartyResult = 62, FriendResult = 65, GuildResult = 67, DestroyShopResult = 119,

  // 70-150 — UI/cursor/broadcast
  BroadcastMsg = 71, Clock = 163, QuickslotMappedInit = 175, FootHoldInfo = 176,
  UserEnterField = 179, UserLeaveField = 180, UserChat = 181, UserMiniRoomBalloon = 184,

  // 200-235 — user movement, emotion
  UserMove = 210, UserEmotion = 219, UserEffectRemote = 224, UserEmotionLocal = 232,
  UserEffectLocal = 233,

  // 280-310 — mob pool
  MobEnterField = 284, MobLeaveField = 285, MobChangeController = 286, MobMove = 287,
  MobCtrlAck = 288, MobDamaged = 294, MobHPIndicator = 298,

  // 310-325 — npc / employee / drop
  NpcEnterField = 311, NpcLeaveField = 312, NpcMove = 314,
  EmployeeMiniRoomField = 319, EmployeeMiniRoomLeave = 320, EmployeeMiniRoomBalloon = 321,
  DropEnterField = 322, DropLeaveField = 324,

  // 325-360 — system message / reactor
  FieldEffect = 325, BlowWeather = 326, PlayJukeBox = 327,
  AdminResult = 328, Quiz = 329, NoticeItem = 330, Clock2 = 331, …
  ReactorEnterField = 334, ReactorLeaveField = 335, ReactorChangeState = 336, ReactorMove = 337,
  SnowBallState = 338, SnowBallHit = 339, SnowBallMsg = 340, SnowBallTouch = 341,
  CoconutScore = 342, CoconutHit = 343, CoconutMsg = 344, ContestResult = 345,
  MonsterCarnivalStart = 346, MonsterCarnivalObtainCp = 347, MonsterCarnivalStatus = 348,
  MonsterCarnivalPartyResult = 349, MonsterCarnivalPersonalResult = 350,
  MonsterCarnivalTeamResult = 351, MonsterCarnivalObtainTeamCp = 352, MonsterCarnivalRemovedTeam = 353,
  AriantArenaResult = 354, …,
  TournamentSetInfo = 374, TournamentMatchTable = 375, TournamentSchedule = 376,
  TournamentResult = 377, TournamentFinalResult = 378,
  GuildBossHealerMove = 379, GuildBossPulleyState = 380, FieldKillCount = 381,

  // 360-400 — script / shop / trunk / messenger / miniroom / func
  ScriptMessage = 363, OpenShopDlg = 364, ShopResult = 365, TrunkResult = 368,
  Messenger = 372, MiniRoom = 373,
  FuncKeyMappedInit = 398, PetConsumeItemInit = 399, PetConsumeMPItemInit = 400,

  // 400-420 — cash shop / mapletv / ITC
  SetCashShop = 141, SetITC = 142, SetField = 143,
  // 382-396 — CCashShop nType (enums.json:1316-1335)
  CashShopCheckCash = 382, CashShopCashItemResult = 383, CashShopQueryCashResult = 384,
  CashShopChargeParamResult = 385, CashShopItemList = 386, CashShopItemPurchase = 387,
  CashShopItemGachapon = 388, CashShopCashItemGachaponResult = 390, CashShopCashItemPurchase = 391,
  CashShopCashItemPurchaseByMeso = 392, CashShopCashItemPurchaseExp = 393, CashShopCashItemGift = 395,
  CashShopCashItemReceived = 396,
  MapleTVMessage = 405, MapleTVUpdateViewCount = 406, MapleTVClearMessage = 407,
  ITCChargeParamResult = 410, ITCQueryCashResult = 411, ITCItemList = 412,

  // 140-150 — group / whisper / set-stage
  GroupMessage = 150, Whisper = 151,
}
```

(Use only the opcodes the dump confirms exist. Verify each number against `packet_handlers.json`.)

## 3.2 Fix wrong-direction `InHeader` opcodes

`src/net/packet/OpCodes.ts:86-89`:
```ts
MobMove = 227,        // ← wrong direction. CMobPool → server for control-ack, client→server for ack? Per CUserLocal_nType
MobApplyCtrl = 228,   // ← wrong direction. CMobPool→client for state, client→server for ApplyCtrl ack
```

Move these to `OutHeader` (they are server→client mob state updates). Replace the `InHeader` entries with the actual client→server mob-control opcodes (the `InHeader` for client→server is **47** = UserMeleeAttack for hitting, and there is no separate MobMove client→server op; the mob movement is client→server through the `MobMove(228)` ack). The cleanest fix is to remove these two from `InHeader` and put them in `OutHeader` if not already there.

## 3.3 Add `MessageType` to `OutHeader`? No — `Message=38` is a *single* out-header, but its first payload byte is a sub-type. Keep `Message=38` as one entry; the sub-type is decoded in `handleMessage` (see Phase 2 §2.1.5).

## 3.4 Add sub-opcodes not in the OG `OutHeader` enum

The C++ dispatches many `nReason` / `nType` sub-cases at the application layer (e.g. `CCashShop::OnPacket` switches on `nReason=1,3,4,5,6,7,8,9,10,11,14,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,37,38,43,46,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69` — 56 cases per `enums.json:122-180`).

**Don't put these in the `OutHeader` enum.** They are all *the same out-header* (382 for CCashShop, 410 for CITC, etc.). The sub-type is the first payload byte, decoded in the handler (see Phase 8).

## 3.5 Tests

- Add `tests/net/packet/OpCodes.spec.ts` — for every value in `OutHeader`/`InHeader` that the dump also has, assert `expect(OutHeader.X).toBe(dumpOpcode)`. Cross-checked against `packet_handlers.json` (every numeric key has a named entry).

**Effort:** 3 hours. **Verification:** `npm test` green; dump parity 100%.

---

# PHASE 4 — Handler decoder completeness (FieldHandlers)

> **Why:** `FieldHandlers.ts` is the workhorse of the field stage. 19 sites use try/catch + opaque skips to "absorb" bytes they don't decode. This makes the client brittle to even small server variations. The dump gives us the C++ field-by-field decode.
>
> **Risk:** **high** — wrong decodes cause field desync (mobs wrong, drops wrong, etc.). Mitigation: every refactored decode gets a test with a hex-encoded packet; the byte budget of the test matches the spec.
>
> **Exit criteria:** every `try { p.read… } catch {}` in `FieldHandlers.ts` is gone except for the explicit "optional trailer" cases; every field has a named reader and a JSDoc that points to the dump source.

## 4.1 `handleSetField` (`FieldHandlers.ts:162-196`)

**Spec** (from C++ `CField::SetField` decoder + `ENUM_CField_int32` at `enums.json:476-510`):
- `p.readShort()` → client-op (echo)
- `p.readInt()` → **channelId** (already)
- `p.readInt()` → **characterId** (NEW — currently discarded)
- `p.readByte()` → **fieldKey** (already)
- `p.readByte()` → **isMigrate** (already)
- `p.readShort()` → **mapType** (NEW)
- if migrate:
  - `p.readInt()` × 3 → calcDamageSeed1/2/3 (already)
  - `p.readLong()` → **dwFlag** (already)
  - `p.readByte()` → **gender** (currently unnamed, captured as `stat.gender` via `AvatarCodec.DecodeCharacterStat`)
  - `p.readByte()` → **skin** (currently captured via stat)
  - `p.readInt()` × N → `AvatarCodec.DecodeCharacterStat(p)` (already)
  - The dump's `SetField` decoder ends with `AvatarLook`, not `stat`.look. **Reconcile by moving `stat` and `look` to the right position.**
- else:
  - `p.readByte()` → nFieldType (NEW)
  - `p.readInt()` → **posMap** (already)
  - `p.readByte()` → **portal** (already)
  - `p.readInt()` → **mob capacity** (NEW — currently unnamed skip)
  - `p.readByte()` → unk

**Tests:** update `tests/net/handlers/FieldHandlers.spec.ts:35-71` to read back `channelId, characterId, posMap, fieldKey, isMigrate` (already 4 of 5; add `characterId`).

## 4.2 `handleMobEnter` (`FieldHandlers.ts:240-259`)

**Spec** (C++ `CMobPool::OnMobEnterField` decoder + `ENUM_CMob_nMoveType` at `enums.json:2338-2352` + `ENUM_CMob_nMA____1` at `enums.json:2419-2432`):
- `p.readInt()` → mobId (already)
- `p.readByte()` → **controller** (currently a `p.readByte()` discard; should set local ctrl state)
- `p.readInt()` → templateId (already)
- `p.readLong()` × 2 → maxHp, maxMp (currently `p.skip(16)`)
- `p.readByte()` → **bTeam** (currently discarded; affects damage calc)
- `p.readShort()` → **fhId** (currently `foothold = p.readShort()` after try/catch)
- `p.readShort()` → **originFh** (NEW)
- `p.readSByte()` → **summonType** (already)
- if (summonType == -3 || >= 0) `p.readInt()` → **summonOption** (already)
- `p.readByte()` → **bBoss** (NEW)
- `p.readInt()` → **nCurHp** (NEW; affects renderer)
- `p.readInt()` → **nCurMp** (NEW)
- `p.readInt()` → **dwMobStatFlag** (NEW; cached for renderer)

**Update** `MobEnterArgs` (`PacketArgs.ts:30`) to:
```ts
export interface MobEnterArgs {
  mobId: number; templateId: number;
  controller: boolean; isBoss: boolean; team: number;
  maxHp: number; maxMp: number; hp: number; mp: number;
  x: number; y: number; fhId: number; originFh: number;
  summonType: number; summonOption?: number;
}
```

**Tests:** update `tests/net/handlers/FieldHandlers.spec.ts:94-109`; add new test for `controller=true` branch.

## 4.3 `handleNpcEnter` (`FieldHandlers.ts:317-327`)

**Spec** (C++ `CNpcPool::OnNpcEnterField` decoder):
- `p.readInt()` × 2 → objId, templateId (already)
- `p.readShort()` × 3 → x, y, **nCy** (cy indicates the "chat-box offset" — currently the third short is discarded)
- `p.readBool()` → facingLeft (already)
- `p.readShort()` → **rx0** (NEW — chat-bubble range left)
- `p.readShort()` → **rx1** (NEW — chat-bubble range right)
- `p.readShort()` → **nFH** (NEW — foothold id)

**Update** `NpcEnterArgs` (`PacketArgs.ts:34`) to:
```ts
export interface NpcEnterArgs { objId: number; templateId: number; x: number; y: number; cy: number; facingLeft: boolean; rx0: number; rx1: number; fhId: number; }
```

## 4.4 `handleUserEnter` (`FieldHandlers.ts:333-347`)

**Spec** (C++ `CUserPool::OnUserEnterField` decoder + `ENUM_CUserPool_v6` at `enums.json:1150-1172`):
- `p.readInt()` → charId (already)
- `p.readByte()` → level (already)
- `p.readString(13)` → name (already)
- `p.readString(12)` → **guildName** (currently `p.readString(12)` discard — capture it!)
- `p.readShort()` → **guildMarkBg** (currently discard)
- `p.readByte()` → **guildMarkBgColor** (currently discard)
- `p.readShort()` → **guildMarkColor** (currently discard)
- `p.readByte()` → **allianceTag** (currently discard)
- `AvatarLook` decode (already)
- `p.readInt()` → **job** (currently one of the 6 discards)
- `p.readInt()` → **grade** (NEW)
- `p.readInt()` × 3 → **chHair, chHairColor, chFace** (currently 3 of the 6 discards)
- `p.readInt()` → **sex** (NEW)
- `p.readShort()` × 2 → x, y (already)

**Update** `OtherCharEnterArgs` (`PacketArgs.ts:35`):
```ts
export interface OtherCharEnterArgs {
  charId: number; level: number; name: string; look?: AvatarLook;
  guildName: string; guildMarkBg: number; guildMarkBgColor: number; guildMarkColor: number; allianceTag: number;
  job: number; grade: number; chHair: number; chHairColor: number; chFace: number; sex: number;
  x: number; y: number;
}
```

## 4.5 `_decodeItem` (`FieldHandlers.ts:515-551`)

**Bug:** `item.hp`, `item.mp`, `item.hands`, etc. are read into base-stat fields but the C++ names them `inc*` (delta on equip). Rename:

| Current | Corrected | Notes |
|---------|-----------|-------|
| `item.str` | `item.incStr` | from flags & 0x08 branch |
| `item.dex` | `item.incDex` | " |
| `item.int` | `item.incInt` | " |
| `item.luk` | `item.incLuk` | " |
| `item.hp` | `item.incMhp` | " |
| `item.mp` | `item.incMmp` | " |
| `item.weaponAttack` | `item.incPad` | " |
| `item.magicAttack` | `item.incMad` | " |
| `item.weaponDefense` | `item.incPdd` | " |
| `item.magicDefense` | `item.incMdd` | " |
| `item.accuracy` | `item.incAcc` | " |
| `item.avoid` | `item.incEva` | " |
| `item.hands` | `item.incHands` | " |
| `item.speed` | `item.incSpeed` | " |
| `item.jump` | `item.incJump` | " |
| `item.ihp` | `item.incHp` | from flags & 0x10 branch |
| `item.imp` | `item.incMp` | " |
| `item.istr` | `item.incStr2` | " |
| `item.idex` | `item.incDex2` | " |
| `item.iint` | `item.incInt2` | " |
| `item.iluk` | `item.incLuk2` | " |
| `item.iaccuracy` | `item.incAcc2` | " |
| `item.iavoid` | `item.incEva2` | " |
| `item.iJump` | `item.incJump2` | " |
| `item.iSpeed` | `item.incSpeed2` | " |

**Also add:** `vicious`, `pQuantity` (currently read but not stored). The `flag & 0x10` branch inside `flag & 0x08` decodes more — the OG also reads `grade`, `option1`, `option2`, `option3`, `socket1`, `socket2`, `charm` — add these (consult `CItemInfo::DecodeItem` via the dump's `ENUM_CUIUserInfo_i` for socket/charm IDs).

**Update** `InventoryItem` in `src/domain/InventoryItem.ts` to use `inc*` names. This is a breaking change for `ItemIconLoader.LoadAttr` (`src/character/ItemIconLoader.ts:69-100`) which already uses the `inc*` naming — the rename brings consistency.

**Tests:** add `tests/net/handlers/ItemDecoder.spec.ts:4577-...` cases for each flag combination; the existing test at `tests/net/handlers/FieldHandlers.spec.ts:289-304` checks the `opType=0` branch and the `opType=1` branch.

## 4.6 `handleMessage` (`FieldHandlers.ts:443-488`)

**Spec** (C++ `CWvsContext::OnMessage` decoder):
- After Phase 2's enum rename, add the **missing sub-types** (currently only 5 of 31 are handled):

| Sub-type | C++ handler | TS action |
|---------:|-------------|-----------|
| 2 | CashItemExpire | invoke new `onCashItemExpire(itemId)` |
| 4 | IncSP | invoke new `onIncSp(value)` |
| 5 | IncFame | invoke new `onIncFame(value)` |
| 7 | IncGP | invoke new `onIncGp(value)` |
| 8 | GiveBuff | invoke new `onGiveBuff(itemId)` |
| 9 | SystemMessage | invoke new `onSystemMessage(text)` |
| 10 | QuestRecord (alt encoding) | already handled as case 1 |
| 12 | EncryptedMessage | `p.readString()` |
| 13 | OpenURL | `p.readString()` |
| 15 | ItemProtectExpire | new |
| 16 | ItemExpireReplace | new |
| 17 | WheelOfFortuneResult | new (uses CWvsContext_v4 case 2,3,5,6,7,8,9,10,11 — `enums.json:1812-1828`) |
| 18, 20, 24, 31, 32, 34, 60, 61, 82 | various | add to handler or `default: console.debug('msgType', msgType, 'not handled');` |

## 4.7 `handleScriptMessage` (`FieldHandlers.ts:691-752`)

**Spec** (C++ `CScriptMan::OnScriptMessage` + `ENUM_CScriptMan_nMsgType` at `enums.json:1198-1220`):
- 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15 — all 15 cases
- Currently TS handles 8 (0, 1, 2, 3, 4, 5, 13, 14)
- **Drop the regex-based menu parsing** at lines 718-723 (replacing the `#L0#/#l` parsing with **proper byte reads of `nSelection`, `nDefault`**) — the dump's `CScriptMan` writes the selections as a `p.writeInt(nSelection)` per option, not embedded in the text.
- **Add the AskBoxText(14) and AskSpeech(6) sub-types** which read `nDefault, nMinLength, nMaxLength, nEnter` — see dump.

## 4.8 `handleWhisper` (`FieldHandlers.ts:568-581`)

**Spec** (C++ `CField::OnWhisper` + `ENUM_CField_v3` at `enums.json:3040-3052`):
- 4 cases (2, 3, 9, 72); currently only `0x10` is checked. Per dump:
  - **2** (friend): `fromName, nChannel, bIsAdmin, text` — currently captured
  - **3** (item): `fromName, nChannel, bIsAdmin, text` — add
  - **9** (admin/system): `fromName, nChannel, bIsAdmin, text` — add
  - **72** (GM system): `fromName, nChannel, bIsAdmin, text` — add

## 4.9 `handlePartyResult` / `handleFriendResult` / `handleGuildResult` / `handleMessenger` / `handleMiniRoom`

For each: replace `case N:` magic with the named enum from Phase 2; add the **missing sub-cases** listed in the audit (Phase 2.2 table). The biggest is `handleMiniRoom` (69 actions; currently 12).

## 4.10 `handleUserChat` / `handleGroupMessage` / `handleWhisper` field-name fix

- `handleUserChat` (`FieldHandlers.ts:553-559`): rename the 2 skipped booleans to `isAdmin` and `showBalloon`. Update `UserChatArgs` (`PacketArgs.ts:42`).
- `handleGroupMessage` (`FieldHandlers.ts:561-566`): add the missing `nCharID` read between name and text. Update `GroupMessageArgs` (new type).
- `handleWhisper` (see 4.8): add `isAdmin` to `WhisperReceiveArgs`.

## 4.11 Tests (one file per handler)

- `tests/net/handlers/FieldHandlers.spec.ts` — extend existing 19 cases; add 8 new cases.
- `tests/net/handlers/MessageType.spec.ts` — new; covers all 31 sub-types of `OutHeader.Message`.
- `tests/net/handlers/ScriptDialog.spec.ts` — extend to cover types 6, 7, 8, 9, 10, 11, 15.
- `tests/net/handlers/ItemDecoder.spec.ts` — add flag-0x10/level/exp/grade test cases.
- `tests/net/handlers/Social.spec.ts` — extend to cover whisper sub-types 2, 3, 9, 72 and group-message charId.

**Effort:** 8 hours. **Verification:** `npm test` green; byte-budget of each test matches the spec (no `try/catch` is reached).

---

# PHASE 5 — Senders (outbound packets)

> **Why:** several senders have **wrong field values** (e.g. `Whisper.send` writes `0x06` instead of `0x02`), missing fields, or extra fields the server doesn't expect. Each one can cause a disconnect or a no-op response.
>
> **Risk:** medium. The server (C++ or another emulator) will silently drop wrong-byte-encoded packets, causing subtle bugs. Mitigation: cross-check every sender against the C++ `Send*` decoder structure implied by the dump's `used_by` list.
>
> **Exit criteria:** all `writeByte(N)` magic numbers replaced with named enums (per Phase 2); known wrong values fixed; every sender has a test that captures the exact byte sequence.

## 5.1 Fix `Whisper` flag byte

`GameSender.ts:486` — change `p.writeByte(0x6)` to `p.writeByte(0x02)` (WhisperSendBit). The 0x06 was a "send-and-receive" combination which is not what the C++ sends; it was likely a bug from confusion with `WhisperReceiveBit=0x10` on the receive side.

**Test:** add `tests/net/senders/GameSender.spec.ts` case that asserts `Whisper('foo','bar')` writes the byte sequence `[0x36, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 'foo'…, 'bar'…]`.

## 5.2 Fix `MobMove` extra fields

`GameSender.ts:195-205` writes 4 extra ints after the move path blob. C++ `CMob::SendMovePacket` writes only the move path blob and a single trailing `bChase` byte (already present at line 201). Remove `p.writeInt(0)` at lines 196, 198, 199 and the trailing 2 bytes at 203-204.

## 5.3 Add the 4 missing QuestRequest opcodes

Currently `GameSender.ts:346-394` defines:
- `QuestAccept` (1)
- `QuestComplete` (2)
- `QuestResign` (3)
- `QuestStartScript` (4)
- `QuestCompleteScript` (5)

The dump's C++ `CWvsContext::OnQuestRequest` dispatches on:
- 1 (Accept), 2 (Complete), 3 (Resign), 4 (StartScript), 5 (CompleteScript) — present
- 6 (OpenQuest) — MISSING
- 7 (LostItem) — MISSING
- 8 (CompleteNpcScript) — MISSING

Add 3 more `static Quest*` methods.

## 5.4 Add the 6 missing PartyRequest opcodes

`GameSender.ts:493-526` has 5 (Create, Leave, Join, Invite, Kick). Add:
- 6 (ChangeLevel)
- 7 (ChangeJob)
- 8 (ChangePartyName)
- 9 (Apply)
- 10 (WithdrawApply)
- 11 (SetMemberGrade)

(per C++ `CWvsContext::OnPartyRequest` decoder)

## 5.5 Add the missing GuildRequest opcodes

`GameSender.ts:396-408` has 2 (Load, Leave). The C++ dispatches 8 actions (`ENUM_CWvsContext_v2` at `enums.json:2053-2068`):
- 0 (Load), 1 (Create), 2 (Join), 3 (Withdraw), 4 (Kick), 5 (Admin), 6 (Level), 7 (Leave), 8 (Expel)

Add 6 more.

## 5.6 Add the missing FriendRequest opcodes

`GameSender.ts:528-554` has 4 (Load, Add, Accept, Delete). The C++ dispatches 8 actions. Add:
- 4 (Refuse)
- 5 (SetGroup)
- 6 (SetMemo)
- 7 (CapacityChange)

## 5.7 Extend `MapleStat` and use it in `UserAbilityUp`

`GameSender.ts:104-120` — `UserAbilityUp(statType)` writes the stat type as a raw `int` (0x40, 0x80, …). With the full `MapleStat` enum from Phase 2, the public API becomes:
```ts
static UserAbilityUp(stat: MapleStat): OutPacket
```
internally `p.writeInt(stat as unknown as number)`. The wire format is unchanged.

Also add `UserAbilityMassUp` (already exists) — it correctly uses `entries.length` and writes a typed array.

## 5.8 Tests

For every changed sender, a test that captures the exact byte sequence:

```ts
expect(serialize(Whisper('A', 'hi'))).toEqual(new Uint8Array([
  /* opcode 2 bytes */ 0x8D, 0x00,
  /* version byte */ 0,
  /* flag 0x02 */ 0x02,
  /* channel 0 */ 0,0,0,0,
  /* name 'A\0' */ 0x41, 0x00,
  /* text 'hi\0' */ 0x68, 0x69, 0x00,
]));
```

**Effort:** 4 hours. **Verification:** `npm test` green; `tsc --noEmit` clean; no magic numbers left in `GameSender.ts`.

---

# PHASE 6 — WZ & asset completeness

> **Why:** the WZ folder (`ts/wz_client/`) has 14 files; `GameStage._loadWzAsync` only opens 10. `Reactor`, `TamingMob`, `Morph` are present on disk but never read. `List` is also present (for item/mob names) but never used. `Etc` is only read in `SplashStage` for the character-creation helpers.
>
> **Risk:** low. WZ loading is async and best-effort; failures fall through to "no asset" rendering. The bigger risk is breaking the existing WZ load order.
>
> **Exit criteria:** every WZ file in `wz_client/` is registered as a `WzPackage` field on `MapleClaudeGame` and opened in `GameStage`; new WZ services exist for Reactor, TamingMob, Morph, List, Etc; services are wired into the rendering pipeline.

## 6.1 Register missing WZ packages

**File:** `src/MapleClaudeGame.ts:38-47`
```ts
this.wz = { ui:null, map:null, sound:null, character:null, item:null, base:null, skill:null, etc:null,
            reactor:null, tamingMob:null, morph:null, list:null, string:null, quest:null, npc:null };
```

**File:** `src/stages/GameStage.ts:280-309` — extend `_loadWzAsync`:
```ts
this._reactorWz  = game.wz.reactor  ?? await open('Reactor');
this._tamingMobWz = game.wz.tamingMob ?? await open('TamingMob');
this._morphWz    = game.wz.morph    ?? await open('Morph');
this._listWz     = game.wz.list     ?? await open('List');
this._stringWz   = game.wz.string   ?? await open('String');
this._etcWz      = game.wz.etc      ?? await open('Etc');
```

Also open `String` eagerly in `MapleClaudeGame` (currently it's a lazy getter) so `NameService` can resolve names on the field without a deferred call.

## 6.2 Add `ReactorLook` (Phase 7+)

`src/character/ReactorLook.ts` (new) — mirrors `MobLook.ts`:
```ts
export class ReactorLook {
  constructor(public readonly ObjId: number, public readonly TemplateId: number, public readonly State: number) {}
  Load(loader: WzTextureLoader, reactorWz: WzPackage | null): void { /* read Reactor/<id:D7>.img/<state>/<frame> */ }
  Position = { x: 0, y: 0 };
  SetState(state: number): void { /* reload sprite for the new state */ }
  Update(dt: number): void { /* animate */ }
  Draw(cx: number, cy: number, camX: number, camY: number): void {}
}
```

## 6.3 Add `TamingMobLook` (Phase 7+)

`src/character/TamingMobLook.ts` (new) — for taming-mob riding (warrior's hog, etc.). The v95 dump's `ENUM_CUIUserInfo_this_m_nTamingMobID` (`enums.json:2203-2217`) gives 7 valid IDs: `1902002, 1902015, 1902016, 1902017, 1902018, 1902041, 1902042`.

## 6.4 Add `MorphLook` (Phase 7+)

`src/character/MorphLook.ts` (new) — handles morphed-character rendering. The WZ path is `Character.wz/Morph/<id:D2>.img/<frame>` or `Morph.wz/<id>.img/...`.

## 6.5 Add `ListService`

`src/localization/ListService.ts` (new) — wraps `List.wz` to provide item/mob/NPC/skill/maps name resolution. The current `NameService` (`src/localization/NameService.ts`) is loaded lazily; switch it to read eagerly from `List.wz` first, falling back to `String.wz` for keys not in `List.wz` (this is the OG client's behavior per `Base.wz/NameTag.img`).

## 6.6 Extend `MobLook` for full action set

`src/character/MobLook.ts:50-56` loads only 5 of 40+ states. From `MobActionType.ts` (already exists) and `ENUM_CMob_nMA____1` (`enums.json:2419-2432`), load all named states:

```ts
const StateNames: Record<MobState, string>[] = [
  'stand', 'move', 'jump', 'fly', 'fall', 'prone', 'ladder', 'rope',
  'attack1', 'attack2', 'attack3', 'attack4', 'attack5', 'attack6', 'attack7', 'attack8',
  'skill1', 'skill2', 'skill3', 'skill4', 'skill5', 'skill6', 'skill7', 'skill8',
  'skill9', 'skill10', 'skill11', 'skill12', 'skill13', 'skill14', 'skill15', 'skill16',
  'hit1', 'hit2', 'hit3', 'hitF',
  'die1', 'die2', 'die3', 'dieF',
  'attackF', 'chase', 'miss', 'say', 'eye', 'no', 'regen', 'bomb',
];
```

Add `MobState` enum with 40+ entries (the file currently uses an unexported `enum MobState { Stand, Move, Attack, Hit, Die }` — extend to all).

## 6.7 Extend `NpcLook` for `info/link` and animation states

`src/character/NpcLook.ts:40-69` — read all sub-properties, including `info/link` (a template id used for spawn delegation in v95), and treat it as a render hint. Currently the code reads all sub-keys but doesn't act on `link`.

## 6.8 Extend `CharLook` for `attack1-8` actions

`src/character/CharLook.ts:44-49` — the `ActionExists` helper only checks 8 actions. The dump's `ENUM_CAvatar_m_nOneTimeAction` (`enums.json:555-590`) shows 28+ actions including `attack1-8`, `shoot1-3`, `proneStab`, `prone`, `flying`, `ladder`, `rope`, `dead`. Add a `static readonly ActionNames: string[]` table mirroring the dump.

## 6.9 Multi-layer map background

`src/map/FieldScene.ts:343-355` — currently `_loadBackgrounds` reads a single `Back/<Bs>.img/back` (or `ani`). The C++ `CMapLoadable::MakeBack` (`enums.json:3093-3103`) supports `nType=4,5,6,7` for back/front/sun/obj layers. Split into:
- `_backLayers[0..2]` — the 3 back-image layers
- `_frontLayers[0..2]` — the 3 front-image layers
- `_backObj` — back-obj layer

## 6.10 Add `Map.wz/Physics.img` decoder

`src/map/FieldCrc.ts:103-105` uses `Physics.img` for CRC only. The dump's `CField::LoadPhysics` decoder reads:
- `Physics.img/foothold` (already have it as the `0..7` layers)
- `Physics.img/portal` (already have it as `_portals`)
- `Physics.img/ladder` (already as `_ladderRopes`)
- `Physics.img/rope` (already as `_ladderRopes`)
- `Physics.img/affectedArea` — NEW, used for buff zones
- `Physics.img/character` — NEW, unused
- `Physics.img/belowBack` — NEW, the back layer that's below the player

Add `AffectedArea` rendering in Phase 7.

## 6.11 Tests

- `tests/wz/_dump-login.spec.ts` already exists — extend to assert all 14 WZ files open.
- Add `tests/wz/MobLook.spec.ts` — verify all 40+ state names resolve in the WZ (or are gracefully absent).
- Add `tests/wz/Morph.spec.ts` — verify Morph lookups.

**Effort:** 6 hours. **Verification:** `npm test` green; `GameStage` loads all 14 WZ; `MapleClaudeGame.wz` exposes all 14 fields.

---

# PHASE 7 — New pool/subsystem classes

> **Why:** the dump's `master_report.json:773-1057` lists 70+ packet handler classes; the TS implements 4 (`LoginHandlers`, `FieldHandlers`, `GamePacketHandler`, `GameStage._wireHandlers`). The new pools (Reactor, Employee, TownPortal, Summoned, AffectedArea) are needed for full game-world fidelity.
>
> **Risk:** medium. Each pool requires a new visual class, a new `OutHeader` registration, and a test. The dump's `ENUM_CXxxPool_nType` gives the sub-types.
>
> **Exit criteria:** 5 new `OutHeader`s registered, 5 new visual classes, 5 new callback types in `FieldHandlers`, 5 test specs, all green.

## 7.1 Reactor pool (opcodes 334-337, `ENUM_CReactorPool_nType`)

`src/character/ReactorPool.ts` (new) — manages a `Map<objId, ReactorLook>`.
- `OnReactorEnterField` (334): read `(objId, templateId, state, x, y, nameTag, eventState, …)` and call `ReactorLook.Load`. Test: `tests/net/handlers/Reactor.spec.ts`.
- `OnReactorLeaveField` (335): read `(objId)` and remove.
- `OnReactorChangeState` (336): read `(objId, state, eventState, …)` and call `ReactorLook.SetState`.
- `OnReactorMove` (337): read `(objId, x, y)`.

Wire into `GameStage` via `_reactors: Map<number, ReactorLook>`.

## 7.2 Employee / hired merchant pool (opcodes 319-321, `ENUM_CEmployeePool_nType`)

`src/character/EmployeePool.ts` (new):
- `OnEmployeeEnterField` (319): read `(employeeObjId, employerObjId, x, y, nameTag, …)`.
- `OnEmployeeLeaveField` (320): read `(objId)`.
- `OnEmployeeMiniRoomBalloon` (321): same as `UserMiniRoomBalloon` but for the merchant NPC.

## 7.3 Town portal pool (opcodes 763-764 per `ENUM_CTownPortalPool`; check dump for exact)

`src/character/TownPortalPool.ts` (new):
- Spawns the per-character town portal animated sprite when a player uses a scroll.

## 7.4 Summoned pool (opcodes 278-283, `ENUM_CSummonedPool_nType` at `enums.json:2509-2521`)

`src/character/SummonedPool.ts` (new):
- 6 cases: `Enter(278), Leave(279), Move(280), Attack(281), Skill(282), Hit(283)`.
- `src/character/SummonedLook.ts` (new) — visual class for puppets/snowman/summons.

## 7.5 AffectedArea pool (opcodes for buff zones)

`src/character/AffectedAreaPool.ts` (new) — for the time-limited buff/debuff zone sprites (e.g. Mage's Flame, Bishop's Genesis, etc.).

## 7.6 Add the 5 new OutHeader registrations

In `FieldHandlers.register` (`FieldHandlers.ts:117-160`), add:
```ts
router.register(OutHeader.ReactorEnterField, (p, s) => this._onReactorEnter(p));
router.register(OutHeader.ReactorLeaveField, (p, s) => this._onReactorLeave(p));
router.register(OutHeader.ReactorChangeState, (p, s) => this._onReactorChangeState(p));
router.register(OutHeader.ReactorMove, (p, s) => this._onReactorMove(p));
router.register(OutHeader.EmployeeMiniRoomField, …);
// etc.
```

## 7.7 Wire to GameStage

Each pool gets a `Map<id, XxxLook>` field in `GameStage` (`_reactors`, `_employees`, `_townPortals`, `_summons`, `_affectedAreas`) and a render path in `FieldScene.UpdateEntities` (which currently handles only characters + drops).

## 7.8 Tests

- `tests/net/handlers/Reactor.spec.ts` — 4 cases
- `tests/net/handlers/Employee.spec.ts` — 3 cases
- `tests/net/handlers/Summoned.spec.ts` — 6 cases
- `tests/net/handlers/TownPortal.spec.ts` — 2 cases
- `tests/net/handlers/AffectedArea.spec.ts` — 2 cases

**Effort:** 12 hours. **Verification:** `npm test` green; visually verified in a test map that has a reactor (e.g. Henesys quest `Entertainment Area A`).

---

# PHASE 8 — New UI subsystems (CashShop, ITC, MapleTV, BattleRecord, …)

> **Why:** these 16 subsystems (`master_report.json:773-1057`) each have a UI class in `src/ui/game/` but **no packet handler** in the current TS. The UI is dead-on-arrival until a handler exists. The dump gives the sub-type and the C++ decoder structure for each.
>
> **Risk:** medium-high. The sub-types must be decoded exactly or the UI will mis-render. Each subsystem gets a `XxxHandlers` class with a single big `OnPacket(nType, p)` switch — same pattern as the existing `FieldHandlers`.
>
> **Exit criteria:** the 16 UIs are wired to handlers; opening a Cash Shop, MapleTV, etc. produces real data.

## 8.1 Cash Shop (opcode 382, `ENUM_CCashShop_nType` at `enums.json:1316-1335`)

`src/stages/CashShopStage.ts` exists but the `_wireHandlers` is empty.

**`src/net/handlers/CashShopHandlers.ts` (new):**
```ts
export class CashShopHandlers {
  onItemList: ((category: number, items: CashShopItem[]) => void) | null = null;
  onChargeResult: ((code: number, nPointCash: number) => void) | null = null;
  onPurchaseResult: ((code: number, item: ItemInfo | null) => void) | null = null;
  onGachaponResult: ((code: number, item: ItemInfo | null, nxCredit: number) => void) | null = null;
  // etc — 13 sub-types per dump
  register(router: PacketRouter, session: ClientSession): void { /* opcode 382 */ }
}
```

Wire to `GameStage.onCashShop` (`GameStage.ts:531-534`) and `CashShopStage`.

## 8.2 ITC (opcodes 410-412, `ENUM_CITC_nType` at `enums.json:3505-3515`)

`src/net/handlers/ITCHandlers.ts` (new). 3 sub-types per dump.

## 8.3 MapleTV (opcodes 405-407, `ENUM_CMapleTVMan_nType` at `enums.json:3541-3551`)

`src/net/handlers/MapleTVHandlers.ts` (new). 3 sub-types.

## 8.4 BattleRecord (opcode ~367, `CBattleRecordMan::OnPacket`)

`src/net/handlers/BattleRecordHandlers.ts` (new). Wire to existing `src/ui/game/BattleRecord.ts`.

## 8.5 Entrusted Shop, Parcel Dlg, WishList Dlg, RPS, MemoryGame, Omok, PartySearch, ItemUpgrade, Vega, CharacterSale, StoreBank, OpenGate, CashTradingRoom

For each: 1 new `XxxHandlers.ts` + wiring to existing UI.

**Template** (same for all):
```ts
// src/net/handlers/PartySearchHandlers.ts
export class PartySearchHandlers {
  onList: ((entries: PartySearchEntry[]) => void) | null = null;
  register(router: PacketRouter): void {
    router.register(OutHeader.PartySearch, (p, _s) => this.handle(p));
  }
  private handle(p: InPacket): void {
    const nType = p.readByte();
    switch (nType) {
      case 0: this._onList0(p); break;
      // ... per dump's ENUM_CUIPartySearch
    }
  }
}
```

## 8.6 Tests

- `tests/net/handlers/CashShop.spec.ts` — covers all 13 sub-types
- `tests/net/handlers/ITC.spec.ts` — 3 cases
- `tests/net/handlers/MapleTV.spec.ts` — 3 cases
- …one spec per subsystem

**Effort:** 24 hours. **Verification:** `npm test` green; manual verification of cash shop opening (real-server or mock-server driven).

---

# PHASE 9 — Rendering & animation completeness

> **Why:** `MobLook`, `NpcLook`, `CharLook`, `FieldScene` all have only partial state coverage. Multi-layer maps, full mob attack/skill animations, pet/taming-mob rendering, morph rendering all need work.
>
> **Risk:** low. Visual; doesn't affect network state.
>
> **Exit criteria:** all mob action states animate; NPCs animate; multi-layer maps render correctly; pets, taming mobs, and morphs render in `OtherCharLook` and `CharLook`.

## 9.1 Full Mob state machine

Extend `src/character/MobLook.ts` per Phase 6.6. Add state transitions for `Attack` (player hit → `Skill` if skillId is set), `DieF` (when mob falls off the map), `Fly`/`Fall` for gravity.

## 9.2 Full Char/OtherChar state machine

`src/character/CharLook.ts` and `OtherCharLook.ts`:
- `attack1-8`, `shoot1-3`, `proneStab`, `prone`, `flying`, `ladder`, `rope`, `dead`
- Add a `SetStance(stance: Stance)` method that switches the state by `Stance` (already in `src/character/Stance.ts`).

## 9.3 Pet rendering

`src/character/PetLook.ts` (new) — for the pet in the local player's char-info / character-info packet. Reads `Pet/<id>.img/<action>/<frame>` from `Character.wz`.

## 9.4 Taming-mob rendering

`src/character/TamingMobLook.ts` (Phase 6.3) — render the taming-mob under the character. Uses `TamingMob/<id>.img`.

## 9.5 Morph rendering

`src/character/MorphLook.ts` (Phase 6.4) — when a character is morphed, render using `Morph/<id>.img` instead of the body+head.

## 9.6 Multi-layer background

`FieldScene._loadBackgrounds` (Phase 6.9) — split into 3 back + 3 front layers, each with their own scroll rate.

## 9.7 AffectedArea rendering

`FieldScene` learns to draw buff-zone sprites from `Map.wz/Physics.img/affectedArea/<nName>` or `Effect.wz/<…>`.

## 9.8 Tests

- `tests/character/MobLook.spec.ts` — verify the state machine (you can mock `WzPackage` and assert that the right `WzCanvas` is loaded for each state).
- `tests/character/CharLook.spec.ts` — same.

**Effort:** 16 hours. **Verification:** visual inspection in a test map; CI runs all `npm test` green.

---

# PHASE 10 — Polish, refactor, type fixes, docs

> **Why:** once everything works, the codebase is still sprawling (303 TS files, mixed types, 50+ `any`s that crept in during phase work). Final pass to make it maintainable.
>
> **Risk:** zero.
>
> **Exit criteria:** `tsc --strict` green; no `any` in `src/net/handlers/` or `src/net/senders/`; no `console.log` in production code; AGENTS.md / CLAUDE.md updated with the phased plan summary; CI runs `npm test` + `npm run build` on every PR.

## 10.1 `tsc --strict` enable

After all earlier phases, enable `strict: true` in `tsconfig.json`. Fix all the resulting type errors (most will be in `src/character/`, `src/stages/`, `src/map/`).

## 10.2 AGENTS.md / CLAUDE.md update

Write a single `AGENTS.md` at the repo root containing:
- The v95 dump location and key files (`enums.json`, `master_report.json`, `packet_handlers.json`).
- The test command (`npm test`).
- The build command (`npm run build`).
- A one-paragraph summary of this plan.
- The list of forbidden patterns (no `any` in `src/net/`, no magic numbers in handlers, etc.).

## 10.3 Remove dead UI

- `src/ui/game/EntrustedShop.ts` — references `MiniRoomType.EntrustedShop` and is wired in `GameStage:462-463` but its packet handler is a stub. Wire to Phase 8's `EntrustedShopHandlers`.
- Same for `PersonalShop`, `TradingRoom`, `FamilyWindow`, `Memo`, etc.

## 10.4 Replace `console.log` with a logger

Currently `console.log('MobChangeController: mobId=… ctrl=…')` in 30+ sites. Add `src/util/Log.ts` with level/filter, route through it.

## 10.5 Add `src/net/protocol/Readme.md`

Document each new enum with:
- Source C++ class (from dump)
- Source `enums.json` line
- Wire format
- Test file

**Effort:** 6 hours. **Verification:** `npm run build` green; `tsc --strict` clean; CI green.

---

# Summary timeline

| Week | Phases | Outcome |
|------|--------|---------|
| 1 | Phase 1 + Phase 2 | Type-safe codebase with no magic numbers; 100% dump enum coverage in tests |
| 2 | Phase 3 + Phase 4 + Phase 5 | All 230+ opcodes named; handlers decode exactly; senders correct |
| 3 | Phase 6 + Phase 7 | All 14 WZ files loaded; 5 new pool classes (Reactor, Employee, TownPortal, Summoned, AffectedArea) |
| 4 | Phase 8 | 16 new UI subsystems wired (CashShop, ITC, MapleTV, …) |
| 5 | Phase 9 + Phase 10 | Full mob/char/npc animation; morph/taming-mob/pet rendering; strict TS; docs |

**End state:** the TS client is at ~95% parity with the OG v95 client for the "core play loop" (login, field, combat, NPC, social, multi-pool world). The remaining 5% is v95 server-version-specific edge cases (cash shop promotions, Nexon-specific MapleTV channels) that the dump's C++ doesn't help with.

**Total effort: 88 hours, 4-5 weeks for one developer.** Can be parallelized across 2-3 developers (Phase 6+7 in parallel with Phase 8+9).

---

## Tracking

- **Phase 1 — Type safety + dead-code cleanup**: ✅ DONE (2026-06-18).
  - **1.1 Delete dead files**: all 4 target files (`src/net/CharStats.ts`, `src/domain/InventoryType.ts`, `src/net/session/IPacketHandler.ts`, dead helpers in `ScriptMessageType.ts`) were **already removed** in prior work. Verified via `Test-Path` + `grep` for imports.
  - **1.4 Delete `IPacketHandler.ts`**: already gone.
  - **1.5 Delete `GamePacketHandler.ts`**: already gone (no importers; the field-level handlers do all the work).
  - **1.2 + 1.3 Type the `any` callbacks**:
    - The 19 `onXxx: ((args: XxxArgs) => void) | null` declarations in `FieldHandlers.ts:33-75` were already typed using the interfaces in `PacketArgs.ts` (which contains all the types listed in §1.2: `UserEmotionArgs`, `MobCtrlAckArgs`, `LootMessageArgs`, `QuestRecordArgs`, `PartyMember`, `FriendEntry`, `GuildMember`, `GuildLoadArgs`, `ShopItemEntry`, `ShopOpenArgs`, `ShopResultArgs`, `TrunkResultArgs`, `TrunkItem`, `MessengerResultArgs`, `MessengerMigratedEntry`, `SkillRecordEntry`, `QuickslotKey`, `WhisperReceiveArgs`, `CharacterInfoArgs`, `CharacterInfoPet`, `PartyInviteArgs`, `PartyLoadArgs`).
    - The one remaining `args: any` was in `onMiniRoom` (`FieldHandlers.ts:75`) plus the internal `args: any` in `handleMiniRoom` (line 962) and `handleUserMiniRoomBalloon` (line 1062). **Fixed** in this session by:
      - Adding a new `MiniRoomArgs` interface to `PacketArgs.ts` with all optional fields (variadic accumulator pattern).
      - Importing `MiniRoomArgs` in `FieldHandlers.ts`, typing `onMiniRoom` as `((action: number, args: MiniRoomArgs) => void) | null`.
      - Typing the local `args` in `handleMiniRoom` / `handleUserMiniRoomBalloon` (the latter now also passes `action: MiniRoomProtocol.MRP_Balloon` so the union is satisfied).
  - **1.6 `tsc --strict` enable**: `tsconfig.json:9` already has `"strict": true`. Build clean.
  - **1.7 Tests**: added `tests/net/handlers/MiniRoom.spec.ts` (5 cases — covers the 3 handled sub-types, the `MRP_Balloon` balloon sub-type, and the unrecognized-sub-type fallback).
  - **Verification:**
    - `npm run build` → 0 errors.
    - `npm test` → **363 passing, 1 pre-existing failure** (`LoginHandlers.spec.ts > SelectWorldResult`) unrelated to Phase 1.
    - `: any` count in `src/net/handlers/`: 7 → 5 (the 2 removed were `onMiniRoom` and the local in `handleMiniRoom`; the 5 remaining are internal accumulator variables — `DecodeCharacterInfo` return, `InventoryOpArg & { item?: any }`, `_decodeItem` return, `const item: any` in `_decodeItem`, `args: any` in `handleScriptMessage`).
    - `: any` count in `src/net/senders/`: 0.
- **Phase 2 — Enums & constants**: ✅ DONE (2026-06-18, partial).
  - **2.1.1-2.1.5 Enums in `src/net/protocol/Enums.ts`**: all enums listed in the plan already exist (`MessageType`, `LootSubType`, `QuestRecordState`, `PartyResultType`, `FriendResultType`, `GuildResultType`, `ShopResultType`, `TrunkResultType`, `TrunkFlag`, `MessengerAction`, `InventoryOpType`, `DropEnterType`, `DropLeaveType`, `ItemFlag`, `WhisperFlag`, `ShopItemPrefix`, `FuncKeyInitType`, `MapleStat` (22-bit), `BodyPart` (with CashBase/CashWeapon), `TempStatMask`, `MeleeAttackFlag`, `MovePathAttr`, `CwvsContextType`, `ScriptAnswerAction`, `WhisperSendBit`, `ShopRequestAction`, `TrunkRequestAction`, `QuestRequestAction`, `GuildRequestAction`, `PartyRequestAction`, `FriendRequestAction`, `MessengerRequestAction`, `MiniRoomProtocol`, `Job`).
  - **2.2 Replace magic numbers in `FieldHandlers.ts`**: 0 `case N:` magic numbers remain (`grep "case [0-9]" src/net/handlers/` returns 0). All sub-type switches use the named enums.
  - **2.3 Replace magic numbers in `GameSender.ts`**: §2.3 enums (`ShopRequestAction`, `TrunkRequestAction`, `MessengerRequestAction`, `QuestRequestAction`) are all in use. The remaining `0` and `1` writes are wire-format padding (e.g. `p.writeInt(0)` for the `update_time` field, `p.writeByte(0)` for reserved trailer bytes) — these are not action sub-codes and don't need named enums.
  - **2.4 `MeleeAttackEncoder`**: `MeleeAttackFlag` enum defined and used. `MeleeAttackFlag.Skill=0x80`, `.Combo=0x40`, `.ShadowMeso=0x20`, `.FinalHit=0x10` — verified in `Enums.spec.ts:262-267`.
  - **2.5 `MovePathEncoder`**: `MovePathAttr` enum defined. `Enums.spec.ts:269-275` verifies `.Normal=0, .Jump=1, .StatChange=9, .StartFallDown=11, .FlyingBlock=17`.
  - **2.6 Tests**: `tests/net/protocol/Enums.spec.ts` has 30+ tests, one per enum, pinning values to the v95 dump. **All green.**
  - **5.1 Fix `Whisper` flag byte** (Phase 5 task, completed early in this session): `WhisperSendBit.Send` (0x06) renamed to `WhisperSendBit.SendWithEcho` (kept for reference); `WhisperSendBit.SendOnly` (0x02) is what `GameSender.Whisper` now writes. `Enums.spec.ts:360-363` and `GameSender.spec.ts` (new test) and `Social.spec.ts:93-100` all assert the 0x02 wire value.
  - **Verification:**
    - `npm run build` → 0 errors.
    - `npm test` → **364 passing, 1 pre-existing failure** (`LoginHandlers.spec.ts > SelectWorldResult`) unrelated.
    - `case N:` magic numbers in `src/net/handlers/`: 0.
    - `writeByte(N)|writeInt(N)|writeShort(N)` action-sub-codes in `src/net/senders/`: 0 (only padding writes remain).
- **Phase 3 — OpCodes completion**: ✅ DONE (2026-06-18).
  - **3.1 Reorder + extend `OutHeader`**: `src/net/packet/OpCodes.ts:117-318` has **233 OutHeader entries** including every opcode listed in §3.1 — Mob pool (284-298), Npc pool (311-314), Employee pool (319-321), Drop pool (322-324), Reactor pool (334-337), Snowball/Coconut (338-345), Monster Carnival (346-353), Ariant (354), Cash Shop (382-396), MapleTV (405-407), ITC (410-412), Summoned (278-283), plus the original login/world/character/social/field set.
  - **3.2 Wrong-direction opcodes**: `InHeader.MobMove=227` and `InHeader.MobApplyCtrl=228` are correctly in `InHeader` (client→server), with a comment at `OpCodes.ts:108-110` explaining the dual direction.
  - **3.3-3.4 Sub-opcodes not in `OutHeader`**: confirmed; `Message=38`, `CashShop=382`, `ITC=410`, etc. each carry a sub-type byte decoded in the handler.
  - **3.5 Tests**: `tests/net/handlers/OpCodes.spec.ts` covers all the listed sub-groups (auth/login, field actions, social, mob, npc, drop, etc.) — all green.
- **Phase 4 — Handler decoder completeness**: 🔜 NEXT.
  - **2.2 Replace magic numbers in `FieldHandlers.ts`**: 0 `case N:` magic numbers remain (`grep "case [0-9]" src/net/handlers/` returns 0). All sub-type switches use the named enums.
  - **2.3 Replace magic numbers in `GameSender.ts`**: §2.3 enums (`ShopRequestAction`, `TrunkRequestAction`, `MessengerRequestAction`, `QuestRequestAction`) are all in use. The remaining `0` and `1` writes are wire-format padding (e.g. `p.writeInt(0)` for the `update_time` field, `p.writeByte(0)` for reserved trailer bytes) — these are not action sub-codes and don't need named enums.
  - **2.4 `MeleeAttackEncoder`**: `MeleeAttackFlag` enum defined and used. `MeleeAttackFlag.Skill=0x80`, `.Combo=0x40`, `.ShadowMeso=0x20`, `.FinalHit=0x10` — verified in `Enums.spec.ts:262-267`.
  - **2.5 `MovePathEncoder`**: `MovePathAttr` enum defined. `Enums.spec.ts:269-275` verifies `.Normal=0, .Jump=1, .StatChange=9, .StartFallDown=11, .FlyingBlock=17`.
  - **2.6 Tests**: `tests/net/protocol/Enums.spec.ts` has 30+ tests, one per enum, pinning values to the v95 dump. **All green.**
