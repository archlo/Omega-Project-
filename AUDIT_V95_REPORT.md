# AUDIT v95 — Deep-Audit Progress Report

Confirms: 5-Jun-2026 across decompile (`Maplestory95.exe_export_for_ai/generated/`) and TS src.

---

## 1. OpCode Coverage (OutHeader)

| Metric | Count |
|--------|-------|
| `OutHeader` entries defined in `OpCodes.ts` | **161** |
| Handlers registered in `FieldHandlers.ts` | **61** |
| Handlers registered in `LoginHandlers.ts` | 13 |
| Handlers registered in `CashShopHandlers.ts` | 13 |
| Handlers registered in `ITCHandlers.ts` | 3 |
| Handlers registered in `MapleTVHandlers.ts` | 3 |
| Handlers registered in `TournamentHandlers.ts` | 4 |
| Handlers registered in `EventHandlers.ts` | 9 |
| **Total handlers registered** | **106** |
| **Unhandled OutHeader values** | **55** |

### OG Sub-Dispatch Enum Parity

| OG Enum | Cases | TS Coverage |
|---------|-------|------------|
| `ENUM_CWvsContext_nType` | 106 | Handled as individual OutHeader registrations (not 1:1) |
| `ENUM_CCashShop_nType` | 13 | ✓ All 13 have handlers in CashShopHandlers.ts |
| `ENUM_CCashShop_nReason` | **56** | **NOT IMPLEMENTED** — internal sub-action dispatch inside each handler |
| `ENUM_CField_nType` | 36 | 21 of 36 values NOT defined in TS OutHeader |
| `ENUM_CUserLocal_nType` | 43 | 43 values — check if all defined; **Verify** |
| `ENUM_CMobPool_nType` | 19 | 6 registered (284-298 range) — 13 mob sub-types unhandled |
| `ENUM_CUserPool_v6` | 16 | Handled via OutHeader 179-195 |
| `ENUM_CUserPool_nType` | 13 | Remote user pool — needs audit |
| `ENUM_CSummonedPool_nType` | 6 | ✓ All 6 registered |
| `ENUM_CField_MonsterCarnival_nType` | 8 | ✓ All 8 registered |
| `ENUM_CField_SnowBall` | 4 | ✓ All 4 registered via EventHandlers |
| `ENUM_CField_Tournament` | 5 | ✓ All 5 registered |

### CField_nType Missing from TS OutHeader (21 values)
These are opcodes the OG CField handler receives but TS has no enum entry:
```
147, 148, 149, 150, 151, 152, 153, 155, 156, 157,
160, 161, 162, 166, 167, 168, 169, 170, 172, 177, 196
```

---

## 2. GameStage Log-Only Callbacks (22 sites)

| UI Panel | Callback | Log Only? | Fix Status |
|----------|----------|-----------|------------|
| Maker | OnStart(recipeId) | YES `console.log` | Needs sender via `UserScriptMessageAnswer` (recipeId as answer number) |
| Delivery | OnSendItem(slot) | YES `console.log` | NPC script answer → `UserScriptMessageAnswer` |
| Claim | OnConfirm() | YES `console.log` | CashShop sub-action (nReason=?) — blocked until sub-dispatch wired |
| EnchantSkill | OnEnchant(slot) | YES `console.log` | Item-use → `UserStatChangeItemUseRequest` |
| MiracleCube | OnConfirm/OnCancel(2) | YES `console.log` | Item-use → `UserStatChangeItemUseRequest` |
| GoldHammer | OnConfirm/OnCancel(2) | YES `console.log` | Item-use → `UserStatChangeItemUseRequest` |
| KarmaScissors | OnConfirm/OnCancel(2) | YES `console.log` | Item-use → `UserStatChangeItemUseRequest` |
| ItemProtector | OnConfirm/OnCancel(2) | YES `console.log` | Item-use → `UserStatChangeItemUseRequest` |
| Repair | OnRepair(slot)+OnClosed(2) | YES `console.log` | NPC shop repair → `UserShopRequest` |
| EntrustedShop | OnWithdrawAll() | YES `console.log` | MiniRoom protocol → `MiniRoom` (PSP_WithdrawAll) |

**Total log-only: 22 sites** → 11 panels with stubbed callbacks that just print.

### Sender Priority

| Priority | Panel | Sender | OG Protocol |
|----------|-------|--------|-------------|
| **P0** | **Repair** | `UserShopRequest` (buy=0) with itemId/price for NPC repair | CWvsContext OnShopResult → repair dlg |
| **P0** | **Maker** | `UserScriptMessageAnswer` with recipeId as number | NPC Maker dialog → number input |
| **P1** | **GoldHammer** | `UserStatChangeItemUseRequest` with item position | Item option apply |
| **P1** | **MiracleCube** | `UserStatChangeItemUseRequest` with cube position | Cash item use |
| **P1** | **KarmaScissors** | `UserStatChangeItemUseRequest` | Cash item use |
| **P1** | **ItemProtector** | `UserStatChangeItemUseRequest` | Cash item use |
| **P1** | **EnchantSkill** | `UserStatChangeItemUseRequest` with scroll+item | Skill enchant |
| **P2** | **Delivery** | `UserScriptMessageAnswer` | NPC delivery |
| **P2** | **EntrustedShop** | MiniRoom PSP_WithdrawAll | Hired merchant |
| **P3** | **Claim** | CashShop nReason=blocked | Needs CashShop sub-dispatch |

---

## 3. FieldHandlers.ts Try Blocks Risk Assessment

Total try blocks: **31**

| Category | Count | Risk | Action |
|----------|-------|------|--------|
| Optional trailing fields (harmless) | ~8 | Low | Keep; document which try is trailing data |
| Mob stat decode (hp/maxHp) | ~4 | Low | HP reads fail silently — OK |
| Party data sub-decode | ~5 | Medium | 3x try blocks in party-dispatch; verify sub-types |
| Mob control ack decode | ~4 | Medium | try blocks in mob control handler |
| Buff/temporary stat decode | ~3 | Medium | try { readLong } in buff decode — verify mask bits |
| Reactor/pool sub-decode | ~3 | Low-traffic | Rarely triggered |
| Drop pick-up decode | ~1 | Low | Optional trailing read |
| Skill/buff effect decode | ~2 | Medium | Need verify against OG sub-types |

### High-Risk Try Sites (need decompile verification)

| Line | Context | Risk |
|------|---------|------|
| 475 | Mob enter field: cooldown + skill fields | Skipping possible required fields |
| 502 | Mob enter field: additional data | Second try block for same handler |
| 579 | Mob control ack: controller + extra | Multiple conditional reads |
| 917-940 | Party data (3 try blocks) | Missing sub-type dispatch |
| 1072-1125 | Reactor pool sub-cases | 5 sequential try blocks |
| 1312 | Skill use result | Optional buff data |
| 1429,1448 | TempStatSet/Reset | Mask bits + optional fields |
| 1594-1680 | Damage decode | 8 try blocks for mob damage parsing |

---

## 4. CCashShop Internal Sub-Dispatch (nReason)

The OG `ENUM_CCashShop_nReason` has **56 cases**:
```
1, 3-11, 14, 16-34, 37-38, 43, 46, 48-69
```

Each CashShop handler (e.g., `CashShopCashItemResult` = OutHeader 384) internally sub-dispatches on a `nReason` field. TS has **zero sub-dispatch logic** for any CashShop handler — every handler reads the packet but only fires generic callbacks.

**Impact:** The Claim dialog (CashShop claim) and other CashShop UI actions cannot send proper responses because the sub-reason dispatch isn't wired.

---

## 5. Next Concrete Steps (Priority Order)

### P0 — GameStage Wiring
1. **Repair sender**: Add `GameSender.RepairItem(slot, itemId)` → `UserShopRequest` buy action
2. **Maker sender**: Add `GameSender.MakerStart(recipeId)` → `UserScriptMessageAnswer(AskNumber, recipeId)`
3. **Wire callback fields** in GameStage.ts — replace log-only arrows

### P1 — FieldHandlers Try-Block Audit
4. Read decompile CField::OnPacket for the 21 CField_nType values TS doesn't define
5. Verify 5x party-data try blocks against OG CField::OnPartyResult
6. Verify 8x damage-decode try blocks against OG CMobPool::OnMobPacket

### P2 — CashShop Sub-Dispatch
7. Add `CASH_SHOP_REASON` enum matching OG 56 values
8. Split each CashShop handler into sub-dispatch + per-reason decoder

### P3 — OpCodes Coverage
9. Define missing 21 CField_nType values in OutHeader enum
10. Add handler registration for 55 missing OutHeader values (or document as intentionally skipped)
