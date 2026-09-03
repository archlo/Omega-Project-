# In-Game Security Audit Plan — MapleStory v95

**Source:** `C:\Users\jorge\OneDrive\Desktop\Maplestory95.exe_export_for_ai` (23,396 files, 198.65 MB)
**Decompilation:** 22,262 functions exported from IDA
**Callgraph:** 73,274 call edges in `reconstruct.db`
**Packet handlers:** 2,392 opcodes mapped in `generated/packet_handlers.json`
**Field definitions:** 12,719 lines in `generated/fields.json`
**Enum routing tables:** 281 functions with switches, 201 unique case sets in `generated/enums.json`
**Class hierarchy:** 1,814 inheritance records in `generated/hierarchy_complete.json`

---

## Table of Contents
1. [Packet Dispatch Architecture](#1-packet-dispatch-architecture)
2. [CWvsContext — Main In-Game Dispatcher (Opcodes 28–140)](#2-cwvscontext--main-in-game-dispatcher)
3. [CField / CStage — Map & Field Management (Opcodes 141–381)](#3-cfield--cstage)
4. [CUserLocal — Local Player Input & State (Opcodes 231–276)](#4-cuserlocal)
5. [CUserPool / CUserRemote — Multiplayer & Remote Players (Opcodes 181–195, 197)](#5-cuserpool--cuserremote)
6. [CMobPool — Mob Management (Opcodes 284–297)](#6-cmobpool)
7. [CNpcPool — NPC Management (Opcodes 84–85, 311–313)](#7-cnpcpool)
8. [CDropPool — Drop Management](#8-cdroppool)
9. [CReactorPool — Reactor Management (Opcodes 334–337)](#9-creactorpool)
10. [CSummonedPool — Summon Management (Opcodes 278–283)](#10-csummonedpool)
11. [CCashShop — Cash Shop (Opcodes 382–396)](#11-ccashshop)
12. [Trade & Shop Dialogs (Opcodes 1–27)](#12-trade--shop-dialogs)
13. [Mini-Games (RPS, Omok, Monster Carnival, Snowball, Tournament)](#13-mini-games)
14. [Party, Guild, Family, Buddy, Messenger](#14-social-systems)
15. [Quest System](#15-quest-system)
16. [Combat & Damage System](#16-combat--damage-system)
17. [Movement & Position Validation](#17-movement--position-validation)
18. [Session & Anti-Tamper](#18-session--anti-tamper)
19. [UI Window Hierarchy](#19-ui-window-hierarchy)
20. [Nexon Passport Module](#20-nexon-passport-module)
21. [Vulnerability Categories](#21-vulnerability-categories)
22. [Audit Checklist](#22-audit-checklist)
23. [File Reference Index](#23-file-reference-index)

---

## 1. Packet Dispatch Architecture

### Receive Path
```
CClientSocket::ProcessPacket (0x4B00F0)
  → DecryptData (0x68CCA0): AES-128 OFB decrypt → Shanda inverse
  → CInPacket decode
  → CWvsContext::OnPacket (0x9E5830 / 0x9EB3E0) — opcodes 28–148
  → Or direct dispatch to class OnPacket per opcode routing
```

### Send Path
```
SendPacket (0x4AF9F0)
  → MakeBufferList (0x68D100): Shanda (3-round XOR/ROL/ROR) → AES-128 OFB
  → innoHash sequence update (CIGCipher bShuffle at 0xC61A70)
  → Flush (0x4AF6A0): Winsock send
```

### Encrypted Materials (from memory dumps)
| Material | Address | Description |
|----------|---------|-------------|
| AES UserKey | `0xC560C0` | 128 bytes / 32 DWORDs — hardcoded static key |
| AES Default IV | `0xB4730C` | `0xF25350C6` — static seed |
| CIG bShuffle | `0xC61A70` | 256-byte static substitution table |

### Opcode -> Handler Routing Map (full)
| Opcode Range | Handler Class | Dispatch Function | Address |
|---|---|---|---|
| 0–27 | CLogin, trade/shop dialogs | Per-class OnPacket | Varies |
| 28–140 | CWvsContext | `CWvsContext::OnPacket` | 0x9E5830 (fallback: 0x9EB3E0) |
| 141–143 | CStage | `CStage::OnPacket` | 0x7450800 (0x71B0B0) |
| 144–146 | CMapLoadable | `CMapLoadable::OnPacket` | 0x6421888 |
| 147–177, 196, 359–362, 368, 371–373, 381 | CField | `CField::OnPacket` | 0x5533008 (0x546D50) |
| 181–195, 197 | CUserPool | `CUserPool::OnUserCommonPacket` | 0x9751984 (0x94CDB0) |
| 231–276 | CUserLocal | `CUserLocal::OnPacket` | 0x9650368 (0x9340C0) |
| 278–283 | CSummonedPool | `CSummonedPool::OnPacket` | 0x7711856 |
| 284–286, 297 | CMobPool | `CMobPool::OnPacket` | 0x6655488 (0x658E00) |
| 311–313 | CNpcPool | `CNpcPool::OnPacket` | 0x6788976 (0x679770) |
| 319–321 | CEmployeePool | `CEmployeePool::OnPacket` | 0x5345312 |
| 325–327 | CMessageBoxPool | `CMessageBoxPool::OnPacket` | 0x6517072 |
| 334–337 | CReactorPool | `CReactorPool::OnPacket` | 0x7141808 |
| 338–341 | CField_SnowBall | `CField_SnowBall::OnPacket` | 0x5644944 (0x562290) |
| 346–353 | CField_MonsterCarnival | `CField_MonsterCarnival::OnPacket` | 0x5618592 (0x55BBA0) |
| 374–378 | CField_Tournament | `CField_Tournament::OnPacket` | 0x5650304 (0x563780) |
| 382–396 | CCashShop | `CCashShop::OnPacket` | 0x4823008 |
| 398–400 | CFuncKeyMappedMan | `CFuncKeyMappedMan::OnPacket` | 0x5672160 |
| 405–407 | CMapleTVMan | `CMapleTVMan::OnPacket` | 0x6356496 |
| 410–412 | CITC | `CITC::OnPacket` | 0x5731440 |

---

## 2. CWvsContext — Main In-Game Dispatcher

- **Address:** 0x9E5830 (too large for full decompile; disassembly at `disassembly/9EB3E0.asm`)
- **Opcodes handled:** 28–140 (106 cases in `ENUM_CWvsContext_nType`)
- **57 fields** in `fields.json` lines 11669–12329
- **Singleton:** `TSingleton<CWvsContext>::ms_pInstance`

### CWvsContext Field Inventory
| Field | Type | Init | Purpose |
|---|---|---|---|
| `m_bShowUI` | int | 1 | UI visibility toggle |
| `m_bMiniMapOnOff` | int | 1 | Minimap state |
| `m_bPersonalShopOpen` | int | 0 | Shop open flag |
| `m_bADBoard` | int | 0 | AD board state |
| `m_bADSpaceON` | int | 0 | AD space state |
| `m_bIsGuestAccount` | int | 0 | Guest account flag |
| `m_bDirectionMode` | int | 0 | Direction mode (cutscene) |
| `m_bAvatarMegaphone` | int | 0 | Megaphone state |
| `m_bBambooUsed` | int | 0 | Bamboo used flag |
| `m_bCurTvView` | int | 0 | MapleTV view state |
| `m_bExclRequestSent` | int | 0 | Exclusive request flag |
| `m_bIsFakeGMNotice` | int | 0 | Fake GM notice |
| `m_bKillMobFromEnterField` | int | 0 | Mob kill on enter |
| `m_bLevelUpAutoQuestRequetSent` | int | 0 | Level-up quest auto |
| `m_bPetHelpPopUpShown` | int | 0 | Pet help popup |
| `m_bRecentPickUpEntrance` | int | 0 | Recent pickup |
| `m_bStandAloneMode` | int | 0 | Standalone flag |
| `m_bWasMute` | int | 0 | Mute state |
| `m_bWasRadioUICleared` | int | 0 | Radio UI state |
| `m_dImpactNextBySessionValueVX` | double | 0.0 | Next X velocity |
| `m_dImpactNextBySessionValueVY` | double | 0.0 | Next Y velocity |
| `m_dwAccountId` | int | 0 | Account ID |
| `m_dwCharacterId` | int | 0 | Character ID |
| `m_dwConsultAuthkeyLastUpdated` | int | 0 | Consultation auth key |
| `m_dwClassCompetitionAuthkeyLastUpdated` | int | 0 | Class comp auth key |
| `m_dwGuildBoardAuthkeyLastUpdated` | int | 0 | Guild board auth key |
| `m_dwFollowRequesterID` | int | 0 | Follow requester ID |
| `m_dwMarriedPartnerCurFieldID` | int | 0 | Married partner field |
| `m_dwOldDriverID` | int | 0 | Old driver ID |
| `m_nPartyID` | int | 0 | Party ID |
| `m_nPartyRaidPoint` | int | 0 | Party raid point |
| `m_nPartyRaidStageMine` | int | 1 | Party raid stage (self) |
| `m_nPartyRaidStageOther` | int | 1 | Party raid stage (other) |
| `m_nPartySearch_State` | int | 0 | Party search state |
| `m_nPlaytimeHour` | int | 1 | Playtime tracking |
| `m_nPotionDiscountRate` | int | 0 | Potion discount |
| `m_nLoginBaseStep` | int | 0 | Login base step |
| `m_nMarriedPartnerID` | int | 0 | Married partner ID |
| `m_nDarkForceDamage` | int | 0 | Dark Force damage |
| `m_nDarkForcePddr` | int | 0 | Dark Force PDDR |
| `m_nDragonFury` | int | 0 | Dragon Fury |
| `m_nEnergy` | int | 0 | Energy (combo/etc) |
| `m_nTamingMobExp` | int | 0 | Taming mob exp |
| `m_nTamingMobFatigue` | int | 0 | Taming mob fatigue |
| `m_nTamingMobLevel` | int | 0 | Taming mob level |
| `m_nDoubleJumpChatCtrl` | int | 0 | Double jump chat |
| `m_nAdjustCenterY` | int | 0 | Screen adjustment |
| `m_nScreenWidth` | int | 800 | Screen width |
| `m_nScreenHeight` | int | 600 | Screen height |
| `m_nActiveEffectItemID` | int | 0 | Active effect item |
| `m_tLastUpdateFileTime` | uint | timeGetTime() | Last update time |
| `m_tRemainAntiMacroQuestion` | int | 0 | Anti-macro timer |
| `m_tRemainInitialQuiz` | int | 0 | Initial quiz timer |
| `m_tLastGivePopularity` | int | v18-300000 | Popularity cooldown |
| `m_tLastSueCharacter` | int | v18-300000 | Sue cooldown |
| `m_tNextNoticePlaytime` | int | v18+3600000 | Playtime notice |
| `m_tExpireProtectingItemChecked` | int | 0 | Protect item check |
| `m_tLastFollowCharacterRequest` | int | v18 | Follow request |
| `m_tLastEmotionChange` | int | v18 | Emotion cooldown |
| `m_tLastStatResetRequest` | int | v18 | Stat reset cooldown |

### CWvsContext Sub-Handlers (from callgraph_9e5830.dot)
Key sub-handler functions routed from `CWvsContext::OnPacket`:

| Sub-Opcode | Handler Name | Address | Purpose |
|---|---|---|---|
| 28 | `OnInventoryOperationCWvsContext` | ? | Inventory add/remove/change |
| 29 | `OnInventoryGrowCWvsContext` | ? | Inventory expansion |
| 30 | `OnStatChangedCWvsContext` | ? | Stat updates |
| 31 | `OnSkillUseResultCWvsContext` | ? | Skill use result |
| 32 | `OnSkillCancelResultCWvsContext` | ? | Skill cancel |
| 33 | `OnSkillPrepareResultCWvsContext` | ? | Skill prepare |
| 34 | `OnSkillPetMPConsumedResultCWvsContext` | ? | Pet MP consumed |
| 35 | `OnTemporaryStatSetCWvsContext` | ? | Buff set |
| 36 | `OnTemporaryStatResetCWvsContext` | ? | Buff reset |
| 37 | `OnChangeMPResultCWvsContext` | ? | MP change |
| 38 | `OnChangeHPResultCWvsContext` | ? | HP change |
| 39 | `OnGivePopularityResultCWvsContext` | ? | Popularity result |
| 40 | `OnOpenTombBoxCWvsContext` | ? | Tomb box open |
| 41 | `OnCapturedMobCWvsContext` | ? | Mob capture |
| 42 | `OnResetAllStatCWvsContext` | ? | Stat reset all |
| 44 | `OnDataCRCCheckFailedCWvsContext` | ? | CRC check failure |
| 45 | `OnSetFuncKeyByScriptCWvsContext` | ? | Func key script |
| 46 | `OnFieldSpecificDataCWvsContext` | ? | Field data |
| 47 | `OnFieldSetVariableCWvsContext` | ? | Field variable |
| 48 | `OnSessionValueCWvsContext` | ? | Session value |
| 49 | `OnPartyValueCWvsContext` | ? | Party session value |
| 50 | `OnPortalScrollUsedCWvsContext` | ? | Portal scroll |
| 51 | `OnPartyResultCWvsContext` | ? | Party operation |
| 52 | `OnPartyDoIntroCWvsContext` | ? | Party intro |
| 53 | `OnTimerEventCWvsContext` | ? | Timer event |
| 55 | `OnBombEventCWvsContext` | ? | Bomb event |
| 57 | `OnWarningAboutBloodyCWvsContext` | ? | Auto-pot warning |
| 58 | `OnShopScannerResultCWvsContext` | ? | Shop scan |
| 59 | `OnQuestClearCWvsContext` | ? | Quest complete |
| 61 | `OnQuestResultCWvsContext` | ? | Quest result |
| 62 | `OnUpdateQuestInfoCWvsContext` | ? | Quest info update |
| 64 | `OnGatherItemResultCWvsContext` | ? | Item gather |
| 65 | `OnSortItemResultCWvsContext` | ? | Item sort |
| 67 | `OnEmotionCWvsContext` | ? | Emotion |
| 68 | `OnConfirmShopPurchaseCWvsContext` | ? | Shop purchase confirm |
| 69 | `OnShopDlgResultCWvsContext` | ? | Shop dialog |
| 70 | `OnAdminShopResult_CWvsContext` | ? | Admin shop |
| 71 | `OnAdminShopCommodity_CWvsContext` | ? | Admin commodity |
| 72 | `OnTrunkResultCWvsContext` | ? | Storage result |
| 73 | `OnDestroyTrunkResultCWvsContext` | ? | Storage destroy |
| 74 | `OnGroupMessageCWvsContext` | ? | Group message |
| 75 | `OnWhisperCWvsContext` | ? | Whisper |
| 76 | `OnMessengerResultCWvsContext` | ? | Messenger |
| 77 | `OnMiniRoomBaseDlgResultCWvsContext` | ? | Mini-room dialog |
| 78 | `OnConsultAuthkeyUpdateCWvsContext` | ? | Consult auth key |
| 79 | `OnClassCompetitionAuthkeyUpdateCWvsContext` | ? | Class comp auth key |
| 80 | `OnGuildBoardAuthkeyUpdateCWvsContext` | ? | Guild board auth key |
| 81 | `OnGuildResultCWvsContext` | ? | Guild result |
| 82 | `OnGuildQuestResultCWvsContext` | ? | Guild quest |
| 83 | `OnGuildBBSResultCWvsContext` | ? | Guild BBS |
| 84 | `CNpcPool::OnPacket` | 0x6788976 | NPC update |
| 85 | `CNpcPool::OnPacket` | 0x6788976 | NPC update |
| 86 | `OnShopLinkResultCWvsContext` | ? | Shop link |
| 87 | `OnUserHitByUserResult` | ? | User hit by user |
| 88 | `OnUserHitByMobResult` | ? | User hit by mob |
| 89 | `OnSetPassenserRequestCWvsContext` | ? | Passenger request |
| 90 | `OnMarriageResultCWvsContext` | ? | Marriage result |
| 91 | `OnWeddingProgressCWvsContext` | ? | Wedding progress |
| 92 | `OnWeddingResultCWvsContext` | ? | Wedding result |
| 93 | `OnClientTimerOperationCWvsContext` | ? | Client timer |
| 94 | `OnTransferChannelCWvsContext` | ? | Channel change |
| 95 | `OnDisallowedDeliveryQuestListCWvsContext` | ? | Disallowed delivery |
| 96 | `OnFollowCharacterFailedCWvsContext` | ? | Follow failed |
| 97 | `OnAutoStartQuestSet` | ? | Auto-start quest |
| 98 | `OnExpedtionResultCWvsContext` | ? | Expedition result |
| 99 | `OnPartyRaidResultCWvsContext` | ? | Party raid result |
| 100 | `OnCashShopResultCWvsContext` | ? | Cash shop |
| 101 | `OnEntrustedShopCheckResultCWvsContext` | ? | Entrusted shop |
| 102 | `OnGiveEntrustedShopCheckResultCWvsContext` | ? | Give entrusted check |
| 103 | `OnReturnToEventMapResultCWvsContext` | ? | Return to event map |
| 104 | `OnScriptProgressMessageCWvsContext` | ? | Script progress |
| 105 | `OnAskWhetherUsePamsSongCWvsContext` | ? | Pam's Song |
| 106 | `OnDestroyBuffsOnSkillCWvsContext` | ? | Destroy buffs on skill |
| 107 | `OnAntiMacroResultCWvsContext` | ? | Anti-macro result |
| 108 | `OnFieldSkillResultCWvsContext` | ? | Field skill |
| 109 | `OnSetOffStateForOffSkillCWvsContext` | ? | Off-skill state |
| 110 | `OnAllQuestCompletedCWvsContext` | ? | All quests complete |
| 111 | `OnResultCWvsContext` | ? | Generic result |
| 113 | `OnObtainItemFromCoupleExpCardCWvsContext` | ? | Couple EXP card |
| 114 | `OnMacroSysDataInitCWvsContext` | ? | Macro system init |
| 115 | `OnFieldObstacleOnOffStatusCWvsContext` | ? | Obstacle on/off |
| 116 | `OnFieldObstacleAllResetCWvsContext` | ? | Obstacle reset |
| 117 | `OnFieldMobForceSpawn` | ? | Mob force spawn |
| 118 | `OnCreateOwnFireWorks` | ? | Create fireworks |
| 119 | `OnWeatherEffectCWvsContext` | ? | Weather effect |
| 120 | `OnMapleTVUseResCWvsContext` | ? | MapleTV result |
| 121 | `OnAvatarMegaphoneResCWvsContext` | ? | Avatar megaphone |
| 122 | `OnNoticeMsgCWvsContext` | ? | Notice message |
| 123 | `OnItemRewardResultCWvsContext` | ? | Item reward |
| 124 | `OnDropPickUpItemResultCWvsContext` | ? | Drop pickup |
| 125 | `OnChangeStealMemoryResultCWvsContext` | ? | Steal memory change |
| 126 | `OnPickUpItemResultCWvsContext` | ? | Pickup result |
| 127 | `OnMonsterBookDropItemResultCWvsContext` | ? | Monster book drop |
| 128 | `OnItemProtectExpireCheckResult` | ? | Item protect expire |
| 129 | `OnItemUpgradeResultCWvsContext` | ? | Item upgrade |
| 130 | `OnItemOptionUpgradeResultCWvsContext` | ? | Item option upgrade |
| 131 | `OnItemChangeApplyResultCWvsContext` | ? | Item change apply |
| 132 | `OnSetItemUpgradeResultCWvsContext` | ? | Set item upgrade |
| 133 | `OnItemUpgradeEffectResult` | ? | Upgrade effect |
| 134 | `OnGachaponResultCWvsContext` | ? | Gachapon result |
| 135 | `OnCashGachaponOpenResultCWvsContext` | ? | Cash Gachapon open |
| 136 | `OnCashGachaponItemResultCWvsContext` | ? | Cash Gachapon item |
| 137 | `OnSetConsumeItemEffect` | ? | Consume item effect |
| 138 | `OnPetConsumeItemResultCWvsContext` | ? | Pet consume item |
| 139 | `OnSetItemOptionResultCWvsContext` | ? | Set item option |
| 140 | `OnProtectItemResultCWvsContext` | ? | Protect item |

### CWvsContext Audit Focus
- Map all sub-handler names to their decompiled `.c` files
- Validate singleton access pattern (`TSingleton<CWvsContext>::ms_pInstance`)
- Identify handlers decompiled vs disassembly-only
- Cross-reference `enums.json` sub-opcode routing
- Verify all 106 switch cases handled without default vulns

---

## 3. CField / CStage

### CStage (Base)
- **Address (OnPacket):** 0x7450800 (0x71B0B0 decompiled)
- **Opcodes:** 141–143
- **Global:** `g_pStage` at `0xC6B638` — cast to CField via `IsKindOf`

### CField (Inherits CStage)
- **Address (OnPacket):** 0x5533008 (0x546D50 decompiled)
- **Opcodes:** 147–177, 196, 359–362, 368, 371–373, 381 (36 cases in `ENUM_CField_nType`)
- **Fields (`fields.json` lines 1728–1820):** 14 fields

#### CField Sub-Handler Ops (from `ENUM_CField_nType`)
| Opcode | Sub-Op | Purpose |
|---|---|---|
| 147 | — | Field enter/init |
| 148 | — | Field effect |
| 149 | — | Field message |
| 150 | — | Field mob/player spawn |
| 151 | — | Field despawn |
| 152 | — | Field NPC change |
| 153–163 | — | Various field ops |
| 166–170 | — | Field state sync |
| 172, 175–177 | — | Field events |
| 196 | — | Field specific |
| 359–362 | — | ContiMove / ship state |
| 368 | — | PartyBoss field |
| 371–373 | — | Field weather/clock/msg |
| 381 | — | Field result |

#### CField Field Inventory
| Field | Type | Init |
|---|---|---|
| `m_bKillMob` | int | 0 |
| `m_bExpiredField` | int | 0 |
| `m_bFieldDied` | int | 0 |
| `m_bTimerChatEnable` | int | 0 |
| `m_bPvP` | int | 0 |
| `m_dwGrade` | int | 0 |
| `m_dwCrc` | int | 0 |
| `m_nFieldType` | int | 0 |
| `m_nPostedGuildMark` | int | 0 |
| `m_nDefaultMusic` | int | 0 |
| `m_nFieldID` | int | 0 |
| `m_tFieldDeathCount` | int | 0 |

#### CField Subclasses
| Class | Opcodes | Address | Purpose |
|---|---|---|---|
| `CField_ContiMove` | (implied) | — | Ship/continent move |
| `CField_MonsterCarnival` | 346–353 (8 ops) | 0x5618592 | Monster Carnival game |
| `CField_SnowBall` | 338–341 (4 ops) | 0x5644944 | Snowball event |
| `CField_Tournament` | 374–378 (5 ops) | 0x5650304 | Tournament event |
| `CField_Dojang` | (inherits CField) | — | Mu Lung Dojo |
| `CField_Battlefield` | (inherits CField) | — | PvP battlefield |
| `CField_PartyRaid` | (inherits CField) | — | Party raid |
| `CField_Wedding` | (inherits CField) | — | Wedding chapel |
| `CField_Massacre` | (inherits CField) | — | Massacre event |

#### Field Factory Enum (`ENUM_CField_int32`)
31 field type IDs: 1–4, 8–29, 31–32, 34, 60–61, 82

### Audit Focus
- Stage lifecycle creation/destruction
- Field transition (migration) flow — `OnTransferChannelCWvsContext`
- Timer/weather/boss event handling
- CRC/anti-tamper (`m_dwCrc` field)
- Field factory type validation (prevent loading arbitrary field types)
- ContiMove state machine

---

## 4. CUserLocal

- **Address (OnPacket):** 0x9650368 (0x9340C0 decompiled)
- **Opcodes:** 231–276 (43 cases in `ENUM_CUserLocal_nType`)
- **52 fields** (`fields.json` lines 8751–9193)

### CUserLocal Field Inventory
| Field | Type | Init | Purpose |
|---|---|---|---|
| `_ZtlSecureTear_m_nLastJumpInputX_CS` | int | SecureTear | Obfuscated jump input X |
| `_ZtlSecureTear_m_usActivePetSkill_CS` | int | SecureTear | Obfuscated pet skill |
| `m_bAdminHide` | int | 0 | GM hide flag |
| `m_bAfterLeaveDirectionMode` | int | 0 | Post-cutscene state |
| `m_bAutoStartQuestSet` | int | 0 | Auto-quest start set |
| `m_bConsumePetMP` | int | 0 | Pet MP consumption |
| `m_bCurActionIsFlyingSkill` | int | 0 | Flying skill active |
| `m_bFly` | int | 0 | Flight state |
| `m_bHoldCombo` | int | 0 | Combo hold |
| `m_bInitialAnimationOnPreCompleteQuest` | int | 0 | Quest completion anim |
| `m_bJumpKeyUp` | int | 0 | Jump key state |
| `m_bKeyDown` | int | 0 | Key press state |
| `m_bKnockBackStun` | int | 0 | Knockback stun |
| `m_bMovingMode` | int | 0 | Movement mode |
| `m_bMovingShootStarted` | int | 0 | Moving shoot state |
| `m_bNextAttackCritical` | int | 0 | Next attack crit |
| `m_bNextShootExJablin` | int | 0 | Next shoot ex-jablin |
| `m_bReplacedByMeleeAttack` | int | 0 | Melee replacement |
| `m_bRocketBoosterAttack` | int | 0 | Rocket booster |
| `m_bSendTankSiegeModeEnd` | int | 0 | Tank siege end |
| `m_bSwallowed` | int | 0 | Swallowed by mob |
| `m_bTryPassiveTransferField` | int | 0 | Passive field transfer |
| `m_dwSwallowMobID` | int | 0 | Swallow mob ID |
| `m_dwSwallowMobTemplateID` | int | 0 | Swallow mob template |
| `m_nCombo` | int | 0 | Combo counter |
| `m_nIdx_ToolTipByMouse` | int | -1 | Tooltip index |
| `m_nKeyDownScanCode` | int | 0 | Key scan code |
| `m_nLastPointedItem` | int | 0 | Last pointed item |
| `m_nMineState` | int | 0 | Mine state |
| `m_nPetHPAlert` | int | 0 | Pet HP alert |
| `m_nPetHPConsumeFailed` | int | 0 | Pet HP consume fail |
| `m_nPetMPConsumeFailed` | int | 0 | Pet MP consume fail |
| `m_nRocketBoosterVY` | int | 0 | Rocket booster Y velocity |
| `m_nVehicleValid` | int | 0 | Vehicle validity |
| `m_tConsumeItemUsingLastTime` | int | -1 | Last consume time |
| `m_tCyclone` | int | get_update_time() | Cyclone timer |
| `m_tLastArealDamage` | int | get_update_time() | Area damage timer |
| `m_tLastCantUseSkill` | int | v5 | Skill disabled timer |
| `m_tLastCheckReactorCollision` | int | 0 | Reactor collision timer |
| `m_tLastCheck_AutoCompletionAlertQuest` | int | 0 | Quest alert timer |
| `m_tLastFlameThrower` | int | get_update_time() | Flamethrower timer |
| `m_tLastHideMorphedCheck` | int | get_update_time() | Morph check timer |
| `m_tLastJump` | int | get_update_time() | Last jump time |
| `m_tLastKnockBackStun` | int | 0 | Stun start time |
| `m_tLastPoisonDamage` | int | get_update_time() | Poison timer |
| `m_tLastRapidFire` | int | get_update_time() | Rapid fire timer |
| `m_tLastSetCombo` | int | 0 | Combo set time |
| `m_tLastStopMotionDamage` | int | get_update_time() | Stop motion timer |
| `m_tLastStormArrow` | int | get_update_time() | Storm arrow timer |
| `m_tLastTankSiegeMode` | int | get_update_time() | Tank siege timer |
| `m_tLastTitan` | int | get_update_time() | Titan timer |
| `m_tLastUpdatedNLCTransferTimer` | int | 0 | NLC transfer timer |
| `m_tLastUseAura` | int | get_update_time() | Aura timer |
| `m_tLastVehicleValidSetting` | int | 0 | Vehicle setting timer |
| `m_tLastWarnUsingDisabledWeapon` | int | v5 | Weapon warn timer |
| `m_tMineMoveStart` | int | get_update_time() | Mine move start |
| `m_tMovingShootAttackTime` | int | get_update_time() | Moving shoot attack |
| `m_tPetConsumeNoPotionMsgTime` | int | -1 | Pet no-potion msg |
| `m_tPrevPortalIndex` | int | -1 | Previous portal |
| `m_tRocketBoosterAttack` | int | 0 | Rocket boost attack |
| `m_tSwallowDigestTime` | int | get_update_time() | Swallow digest |
| `m_tSwallowLastMobWriggle` | int | get_update_time() | Swallow wriggle |
| `m_uSkillSoundCookie` | int | 0 | Skill sound ID |

### Audit Focus
- **Admin hide:** `m_bAdminHide` — check privilege enforcement
- **Skill cooldown timers:** all `m_tLast*` fields — can they be reset client-side?
- **Movement validation:** `m_bKeyDown`, `m_nKeyDownScanCode`, `m_bJumpKeyUp`
- **Secure-tear obfuscation:** `_ZtlSecureTear_*` fields — verify XOR mask integrity
- **Pet item consumption rates:** `m_nPetHPAlert`, `m_tPetConsumeNoPotionMsgTime`
- **Swallow mechanic:** `m_bSwallowed`, timers — mob capture abuse
- **First hit priority:** `m_nLastPointedItem`

---

## 5. CUserPool / CUserRemote

### CUserPool
- **Address (OnPacket):** 0x9751984 (0x94CDB0 decompiled for common, 0x94B390 for remote)
- **Opcodes:** 181–195, 197 (15 ops in `ENUM_CUserPool_nType` for common, 19 ops for remote)
- **Fields (`fields.json` lines 10360–10375):** `m_tCooltimeEnd`, `m_tLoadEnd`

### CUserRemote
- **Fields (`fields.json` lines 10376–10412):** 5 fields
  - `m_nJobCode` — remote player job
  - `m_nMovingShootPreparedSkillID` — shoot skill prepared
  - `m_bKeyDown` — remote key state
- **Attack handler:** `CUserRemote::OnShootAttack` (0x9567D0)

### CUserPool Packet Enum
| Opcode | Name | Purpose |
|---|---|---|
| 181 | `ENUM_CUserPool_nType` | User enter field |
| 182 | `ENUM_CUserPool_nType` | User leave field |
| 183 | `ENUM_CUserPool_nType` | User move |
| 184 | `ENUM_CUserPool_nType` | User chat |
| 185 | `ENUM_CUserPool_nType` | User damage |
| 186 | `ENUM_CUserPool_nType` | User skill/attack |
| 187 | `ENUM_CUserPool_nType` | User emotion |
| 188 | `ENUM_CUserPool_nType` | User HP/MP |
| 189 | `ENUM_CUserPool_nType` | User scroll equip |
| 190 | `ENUM_CUserPool_nType` | User set skill |
| 191 | `ENUM_CUserPool_nType` | User effect |
| 192 | `ENUM_CUserPool_nType` | User quest |
| 193 | `ENUM_CUserPool_nType` | User buff |
| 194 | `ENUM_CUserPool_nType` | User stat change |
| 195 | `ENUM_CUserPool_nType` | User generic |
| 197 | `ENUM_CUserPool_nType` | User special |

### Audit Focus
- User enter/leave field validation
- Remote user move packet validation (speed checks)
- Remote damage packet integrity
- Chat packet abuse prevention
- Pool insertion consistency (duplicate user IDs)

---

## 6. CMobPool

- **Address (OnPacket):** 0x6655488 (0x658E00 decompiled)
- **Opcodes:** 284–286, 297 (plus sub-routing via `OnMobPacket` at 0x6570B0)
- **Fields (`fields.json` lines 3947–3962):** `m_dwMobCrcKey`, `m_tLastHitMobDamagedByMob`

### CMob Sub-Enums
- `ENUM_CMob_nMoveType` (0x651100) — movement types
- `ENUM_CMob_nAction` (0x63AA70) — mob actions
- `ENUM_CMob_nMA` (0x63A9C0) — move action raw
- `ENUM_CMob_nSkillID` (0x64EF30) — mob skill IDs

### Audit Focus
- **Mob CRC key verification:** `m_dwMobCrcKey` — anti-tamper for mob state
- Mob spawn/despawn validation
- Mob move path verification (`ENUM_CMob_nMoveType`)
- Mob skill usage bounds
- Mob HP tracking (no negative/overflow)

---

## 7. CNpcPool

- **Address (OnPacket):** 0x6788976 (0x679770 decompiled, sub-dispatch via `OnNpcPacket` at 0x679260)
- **Opcodes:** 84–85 (shared with CWvsContext), 311–313 (CNpcPool exclusive)
- **Fields (`fields.json` lines 4521–4529):** 1 field: `m_nTickCount`

### ENUM_CNpcPool_nType (2 case sets: 0x679770, 0x679260)
NPC opcodes include change, enter, leave, move, shop, quest triggers.

### Audit Focus
- NPC shop trigger validation
- NPC quest requirement checking (server-side postable?)
- NPC animation state sync
- NPC spawn/despawn packet integrity

---

## 8. CDropPool

- **Not in packet_handlers.json** (likely routed through CField::OnPacket)
- **Fields (`fields.json` lines 1562–1577):**
  - `m_bRecentPickupedItemCheck`
  - `m_tLastExplodeSound`

### Audit Focus
- Drop pick-up race conditions (dupe)
- Drop spawn position validity
- Drop owner/timer enforcement
- Meso drop amount integrity

---

## 9. CReactorPool

- **Address (OnPacket):** 0x7141808 (0x7141808)
- **Opcodes:** 334–337 (4 ops)

### Audit Focus
- Reactor state transition validation (hit → destroyed → loot)
- Reactor loot table integrity
- Reactor respawn timer abuse

---

## 10. CSummonedPool

- **Address (OnPacket):** 0x7711856 (0x7711856)
- **Opcodes:** 278–283 (5 ops)
- **Fields:** empty in fields.json (may be inline in CField or CWvsContext)

### Audit Focus
- Summon spawn validation (skill ID, position)
- Summon despawn timer
- Summon attack packet integrity
- Summon owner ID checks

---

## 11. CCashShop

- **Address (OnPacket):** 0x4823008 (0x4823008)
- **Opcodes:** 382–396 (skip 389, 394)
- **20 fields** (`fields.json` lines 749–889)
- `ENUM_CCashShop_nReason`: 56 cases at 0x495BC0 `CCashShop::NoticeFailReason`

### CCashShop Field Inventory
| Field | Type | Init |
|---|---|---|
| `m_bCashShopAuthorized` | int | 0 |
| `m_bCashShopRequestSent` | int | 0 |
| `m_nTrunkCount` | int | 0 |
| `m_nCharacterSlotCount` | int | 0 |
| `m_nBuyCharacterCount` | int | 0 |
| `m_nSpentNXCash` | int | 0 |
| `m_nPurchaseRecord` | int | 0 |
| `m_dwAvatarPurchaseOption` | int | 0 |
| `m_bWearPackage` | int | 0 |
| `m_nCoupleCount` | int | 0 |
| `m_nFriendCount` | int | 0 |
| `m_nWishListCount` | int | 0 |
| `m_nSquadCount` | int | 0 |
| `m_nGuildCount` | int | 0 |
| `m_nProtectedItemCount` | int | 0 |
| `m_nPurchaseCount` | int | 0 |
| `m_nCashPerOnce` | int | 0 |
| `m_nCashPerOnce_BeforeDisassemble` | int | 0 |
| `m_nBonusCashPerOnce` | int | 0 |
| `m_nTotalCash` | int | 0 |

### Audit Focus
- Purchase flow authorization checks (is `m_bCashShopAuthorized` enforced?)
- NX cash spent tracking — desynchronization risk between client `m_nSpentNXCash` and server
- Gift/wish list validation
- Character slot purchase limits
- CashGachapon probability — client-side determination?
- Inventory growth during cash shop session

---

## 12. Trade & Shop Dialogs

### Opcode Sharing Model
Opcodes 1–27 are shared across multiple dialog classes via instance-based routing. The active dialog's `OnPacket` receives the opcode.

### Mini-Room Base (CMiniRoomBaseDlg)
- **Address (OnPacket):** 0x6528528 (0x6528528)
- **Shared opcodes:** 2–6, 9, 10, 14
- **Purpose:** Base for trade, shop, and mini-game rooms

### Trading Room (CTradingRoomDlg)
- **Address (OnPacket):** 0x7752096
- **Opcodes:** 15–17, 21

### Cash Trading Room (CCashTradingRoomDlg)
- **Address (OnPacket):** 0x4839088
- **Opcodes:** 15–17

### Personal Shop (CPersonalShopDlg)
- **Address (OnPacket):** 0x6932512
- **Opcodes:** 24–27

### Storage / Trunk (CTrunkDlg)
- **Address (OnPacket):** 0x7776656
- **Opcodes:** 9–14, 15–16, 19, 22–24

### Parcel (CParcelDlg)
- **Address (OnPacket):** 0x6891888
- **Opcodes:** 8, 23–27

### Wish List (CWishListRecvDlg)
- **Address (OnPacket):** 0x10145872
- **Opcodes:** 10, 15–17

### Admin Shop (CAdminShopDlg)
- **Address (OnPacket):** 0x4395248
- **Opcodes:** 1–14

### ITC Auction (CITC)
- **Address (OnPacket):** 0x5731440
- **Opcodes:** 410–412

### Entrusted Shop (CWvsContext handler)
- `OnEntrustedShopCheckResultCWvsContext`
- `OnGiveEntrustedShopCheckResultCWvsContext`

### Phase 1 Audit Results (CONFIRMED)
**CWvsContext::OnPacket (0x9E5830):** 106 explicit cases + `default: return;` — no fallthrough vulnerability. **CLEAN.**
**ProcessPacket (0x4B00F0):** Proper bounds-checking of opcodes 28–140 before routing. Opcodes 16, 17, 18, 19, 20, 23 handled separately. **CLEAN.**
**Singleton pattern:** `TSingleton<CWvsContext>::ms_pInstance`, `TSingleton<CUserLocal>::ms_pInstance` — consistent ref-counted singleton pattern throughout.
**Disassembly-only functions:** 51 files identified (>12KB threshold). Largest: 7350E0.asm (490KB — `SecondaryStat::DecodeForLocal`), 5B8EF0.asm (370KB — `CItemInfo::RegisterEquipItemInfo`), 91E780.asm (280KB — `CUserLocal::TryDoingMeleeAttack`).

### Phase 3 Audit Results (CONFIRMED)
**OnInventoryOperation (0xA08A70, 547 lines):** Validates 4 operation types (0=add, 1=update count, 2=swap, 3=remove). Compares against old item counts before applying. Calls `CheckQuestCompleteByItem` and `CheckInventoryOnAutoStartQuest`. **Validation appears adequate.**
**OnInventoryGrow (0x9FD540, 38 lines):** Trivially reallocs item slot array from 2 bytes. **NO bounds validation on slot count.**
**OnGatherItemResult (0x9F1280, 17 lines):** Pure UI update. **No security impact.**
**OnSortItemResult (0x9F12B0, 17 lines):** Pure UI update. **No security impact.**
**OnStatChanged (0x9FD5D0, 573 lines):** Complex handler decoding `GW_CharacterStat::DecodeChangeStat`. Triggers level-up UI, quest auto-completion, skill acquisition. **Needs deeper sub-handler review.**
**OnChangeSkillRecordResult (0x9F5F30, 75 lines):** Validates `nInfo >= 0` before inserting into `mSkillRecord`. Handles master level and expiration. Calls `UpdatePassiveSkillData` + `ValidateStat`. **Validation present.**
**OnSkillUseResult (0x9F1300, 14 lines):** Only clears `m_bExclRequestSent` flag. **Minimal — relies on server-side validation.**
**OnTemporaryStatReset (0x9F2AB0, 120 lines):** Properly handles ride vehicle and guided bullet cleanup via 16-byte flag decode.

### Phase 4 Audit Results (CONFIRMED)
**OnDataCRCCheckFailed (0x9E51B0, 67 lines):** ***CRITICAL VULNERABILITY*** — Does NOT disconnect the client. Shows a `CUtilDlgEx::SetUtilDlgEx` dialog with decoded string, then returns cleanly. User can click through and continue playing. Memory edits triggering CRC failures are not enforced.
**OnAntiMacroResult (0x9FF580, 252 lines):** Types 4-10 handled. Type 6 sets `m_tRemainAntiMacroQuestion = 60000` and shows JPEG UI. Types 7/9 destroy UI and release combo hold. **Fully client-side UI-driven with no server enforcement.**

### Phase 5 Audit Results (CONFIRMED)
**OnPartyResult (0xA10AB0, 979 lines):** Very complex handler. Uses `PARTYDATA::Decode` at 0x4F2B00. Manages party create/invite/accept/leave/expel. Interacts with CField (town portal), UI dialogs, party HP display, party quest rewards. **Can send packets back via SendPacket.**
**OnGuildResult (0xA0D3B0, 1270 lines):** Most complex handler. Uses `GUILDDATA::Decode` at 0x4FB760. Handles guild create/invite/join/leave/dismiss, guild marks, BBS, quests, alliance, guild points. **Also uses SendPacket.**

### Audit Focus (All Trade/Shop)
- Item ID and quantity validation in trade
- Meso amount bounds checking
- Shop stock/pricing integrity
- Trade accept/deny state machine
- Admin shop privilege level checks (GM flag required?)
- Trunk storage item duplication on disconnect
- Parcel delivery validation (can you send items you don't have?)
- ITC auction bid integrity (bid increment, outbid notification)

---

## 13. Mini-Games

### Rock-Paper-Scissors (CRPSGameDlg)
- **Address (OnPacket):** 0x7183872
- **Opcodes:** 6–14 (shared with other dialogs)

### Omok (COmokDlg)
- Not in packet_handlers.json directly (likely routed through mini-room base)
- Hierarchy: `COmokDlg → CDialog → CWnd → IUIMsgHandler`

### Monster Carnival (CField_MonsterCarnival)
- **Address (OnPacket):** 0x5618592 (0x55BBA0)
- **Opcodes:** 346–353 (8 ops)
- **Fields:** 2 fields (`m_bFadeOut`, `m_tFadeRemain`)

### Snowball (CField_SnowBall)
- **Address (OnPacket):** 0x5644944 (0x562290)
- **Opcodes:** 338–341 (4 ops)
- **Constructor has DAMAGEINFO buffer** (in constructor_inits)

### Tournament (CField_Tournament)
- **Address (OnPacket):** 0x5650304 (0x563780)
- **Opcodes:** 374–378 (5 ops)
- **Fields:** 1 field (`m_bReceivedAI`)

### Audit Focus
- RPS game logic integrity (predictable outcomes?)
- Maria (Omok) board validation
- Monster Carnival score/CP integrity
- Snowball position/velocity validation
- Tournament match state machine
- All mini-game betting/entry fee checks

---

## 14. Social Systems

### Party
- **Handler:** `OnPartyResultCWvsContext` (opcode 51)
- **Party data decode:** `PARTYDATA` at 0x4F2B00
- **CWvsContext fields:**
  - `m_nPartyID` — current party ID
  - `m_nPartySearch_State` — party search state machine
  - `m_nPartyRaidPoint` — raid point tracking
  - `m_nPartyRaidStageMine` / `m_nPartyRaidStageOther` — raid stages

### Expedition
- **Handler:** `OnExpedtionResultCWvsContext` (opcode 98)
- **ExpeditionIntermediary class:** opcodes 2–7 shared
- Hierarchy: `ExpeditionIntermediary → CDialog → CFadeWnd → CUIFadeYesNo → CWnd`

### Guild
- **Handler:** `OnGuildResultCWvsContext` (opcode 81)
- **Additional:** `OnGuildQuestResultCWvsContext` (82), `OnGuildBBSResultCWvsContext` (83)
- **Guild data decode:** `GUILDDATA` at 0x4FB760
- **Auth keys:**
  - `m_dwGuildBoardAuthkeyLastUpdated` — guild board auth key
  - `OnGuildBoardAuthkeyUpdateCWvsContext` (opcode 80)
- **Field:** `m_nPostedGuildMark` in CField

### Family
- **Multiple handlers:**
  - `OnFamilyChartResultCWvsContext`
  - `OnFamilyInfoResultCWvsContext`
  - `OnFamilyResultCWvsContext`
  - `OnFamilyJoinRequest`
  - `OnFamilyJoinAccepted`
  - `OnFamilyPrivilegeList`
  - `OnFamilyFamousPointIncResultCWvsContext`
  - `OnFamilyNotifyLoginOrLogout`
  - `OnFamilySetPrivilege`
  - `OnFamilySummonRequest`
- **UI:** CUIFamily, CUIFamilyChart (hierarchy `CUIWnd → CWnd`)

### Friend / Buddy
- **Handlers:**
  - `OnFriendResultCWvsContext`
  - `OnFindFirendCWvsContext` (note: typo in original — `OnFindFriend`)

### Messenger
- **Handler:** `OnMessengerResultCWvsContext` (opcode 76)

### Marriage
- **Handlers:**
  - `OnMarriageResultCWvsContext` (opcode 90)
  - `OnWeddingProgressCWvsContext` (opcode 91)
  - `OnWeddingResultCWvsContext` (opcode 92)
- **Fields:**
  - `m_dwMarriedPartnerCurFieldID` — partner's current field
  - `m_nMarriedPartnerID` — partner ID

### Alliance
- **Handler:** `OnAllianceResultCWvsContext`

### Follow
- **Handlers:**
  - `OnFollowCharacterFailedCWvsContext` (opcode 96)
  - `OnSetPassenserRequestCWvsContext` (opcode 89)
- **Fields:**
  - `m_dwFollowRequesterID`
  - `m_tLastFollowCharacterRequest`

### Audit Focus
- Party invite/accept/leave state machine
- Party search state machine abuse (spam)
- Guild board auth key update flow (integrity)
- Guild creation cost validation
- Family privilege escalation (summon, chat, buff)
- Buddy list max size enforcement
- Messenger spam prevention
- Marriage/wedding flow validation

---

## 15. Quest System

### Handlers (all CWvsContext sub-handlers)
| Opcode | Handler | Purpose |
|---|---|---|
| 59 | `OnQuestClearCWvsContext` | Quest complete |
| 61 | `OnQuestResultCWvsContext` | Quest operation result |
| 62 | `OnUpdateQuestInfoCWvsContext` | Quest info update |
| 95 | `OnDisallowedDeliveryQuestListCWvsContext` | Disallowed delivery |
| 97 | `OnAutoStartQuestSet` (affects `m_bAutoStartQuestSet` in CUserLocal) | Auto-start quest |
| 104 | `OnScriptProgressMessageCWvsContext` | NPC script message |
| 105 | `OnAskWhetherUsePamsSongCWvsContext` | Pam's Song prompt |
| 110 | `OnAllQuestCompletedCWvsContext` | All quests done |

### Quest-Related CWvsContext Fields
- `m_bLevelUpAutoQuestRequetSent` — level-up auto quest request
- `m_bNewAutoCompletionAlertQuest` — new auto-complete alert
- `m_bNewPreStartQuest` — new pre-start quest
- `m_bShowOnlyWorthyQuests` — quest filtering (default 1)
- `m_nPreStartQuestCount` — pre-start quest count
- `m_nQuestDeliveryItemPos` — delivery item position
- `m_tAutoAcceptQuestRequest` — auto-accept timer
- `m_usDeliveryQuestID` — delivery quest ID
- `m_usWorldMapQuestID` — world map quest ID
- `m_bInitialAnimationOnPreCompleteQuest` (CUserLocal) — initial animation

### Audit Focus
- Quest clear validation — can client claim rewards without meeting reqs?
- Auto-completion state machine — can exploits skip quest steps?
- Script message handling — injection surface in `OnScriptProgressMessage`
- Delivery quest item removal confirmation
- Quest state desync between client and server

---

## 16. Combat & Damage System

### Attack Functions (TOO LARGE TO DECOMPILE — disassembly only)
| Function | Address | Size | Description |
|---|---|---|---|
| `CUserLocal::TryDoingMeleeAttack` | `0x91E780` | 29,270 bytes | Melee attack sequence |
| `CUserLocal::TryDoingShootAttack` | `0x925A00` | 18,493 bytes | Ranged attack sequence |
| `CUserLocal::TryDoingMagicAttack` | `0x92A240` | 3,000+ instr | Magic attack sequence |

### Damage Calculation (all decompiled)
| Function | Address | Purpose |
|---|---|---|
| `DamageInfo::CalcAverageDamage` | `0x470200` | Average damage calc |
| `DamageInfo::CalcAverageAttrRate` | `0x470220` | Elemental attribute rate |
| `DamageInfo::ChoiceMaxOrMinDamage` | `0x470240` | Max/min damage select |
| `DamageInfo::ChoiceCriMaxOrMinDamage` | `0x470270` | Crit max/min select |
| `DamageInfo::IncTotalDamage` | `0x4702A0` | Increment total damage |
| `DamageInfo::IncTotalAttackNum` | `0x4702C0` | Increment attack count |
| `DamageInfo::IncCriticalNum` | `0x4702D0` | Increment crit count |
| `DamageInfo::ClearAllValue` | `0x4703C0` | Reset damage info |
| `CheckTotalDamageOverflow` | `0x4707D0` | Overflow protection |
| `SetBattleDamageInfo` | `0x470890` | Battle damage info |
| `SetAttrDamageRateInfo` | `0x470920` | Attribute damage rate |
| `IsCalcDamageStat` | `0x7215A0` | Calc damage stat check |
| `CalcDamageByWT` | `0x724DB0` | Weapon-to-monster damage |
| `nAttackSpeed` | `0x50AE70` | Attack speed calculation |

### Attack-Related Functions
| Function | Address | Purpose |
|---|---|---|
| `DoMeleeAttack` | `0x4BE150` | Execute melee attack packet |
| `DoShootAttack` | `0x4BFCC0` | Execute shoot attack packet |
| `GetMeleeAttackRange` | `0x428D00` | Melee range calculation |
| `GetWeaponItemID` | `0x4BD4F0` | Get weapon item ID |
| `CUserRemote::OnShootAttack` | `0x9567D0` | Remote shoot handler |

### Combo System (from callgraph)
- `CComboDrain`, `CComboSmash`, `CDashTrigger`, `CDoubleAttack`, `CFinalBlow`
- Hierarchy: all inherit from `CScriptMan`
- `m_nCombo` in CUserLocal — combo counter

### BattleRecordMan
- DPS tracking via `BattleRecordMan::UpdateDPS`
- Connected to damage meter: `CDamageMeter → GW_ItemSlotBase → GW_ItemSlotEquip`

### Audit Focus
- **Damage formula bounds checking** — verify overflow protection in `CheckTotalDamageOverflow`
- **Attack speed validation** — compare `nAttackSpeed` calculation against real-time attacks
- **Area-of-effect targeting** — validate mob selection logic
- **Critical hit probability** — is crit chance determined client-side?
- **Attack range verification** — compare against `GetMeleeAttackRange`
- **Mob attack handling** — verify mob damage isn't trusted from client
- **Final attack sequence triggers** — key sequence integrity
- **Disassembly fallback reading required** for TryDoingMeleeAttack/ShootAttack/MagicAttack

---

## 17. Movement & Position Validation

### Relevant Fields
- **CUserLocal:** `m_bKeyDown`, `m_nKeyDownScanCode`, `m_bJumpKeyUp`, `m_bFly`, `m_bMovingMode`, `m_tLastJump`
- **CUserRemote:** `m_bKeyDown` (shared with CUserLocal)
- **CWvsContext:** `m_dImpactNextBySessionValueVX`, `m_dImpactNextBySessionValueVY`
- **CField:** (position likely decoded directly from packet)

### Movement Opcodes
- Opcodes 231–276 handled by `CUserLocal::OnPacket`
- Opcodes 181–197 handled by `CUserPool::OnUserCommonPacket` (remotes)

### Audit Focus
- **Speed hack detection** — max move distance between updates
- **Teleport/portal validation** — `m_tPrevPortalIndex` tracking
- **Foothold checking** — verify client position matches expected footholds
- **Jump physics** — `m_bJumpKeyUp` paired with `_ZtlSecureTear_m_nLastJumpInputX_CS`
- **Knockback stun** — `m_tLastKnockBackStun` timing validation
- **Movement mode changes** — `m_bMovingMode`, `m_bFly` transitions

---

## 18. Session & Anti-Tamper

### Auth Key System
Three auth key update flows (client-side timestamps only — no server revalidation):
- `m_dwConsultAuthkeyLastUpdated` — consultation auth key (opcode 78)
- `m_dwClassCompetitionAuthkeyLastUpdated` — class competition auth key (opcode 79)
- `m_dwGuildBoardAuthkeyLastUpdated` — guild board auth key (opcode 80)

### Anti-Macro
- **Handler:** `OnAntiMacroResultCWvsContext` (opcode 107)
- **Timers:**
  - `m_tRemainAntiMacroQuestion` — anti-macro question timer
  - `m_tRemainInitialQuiz` — initial quiz timer

### CRC / Data Integrity
- **Handler:** `OnDataCRCCheckFailedCWvsContext` (opcode 44)
- **CField field:** `m_dwCrc` — field CRC
- **CMobPool field:** `m_dwMobCrcKey` — mob CRC key

### Session Management
- `OnSessionValueCWvsContext` (opcode 48) — session variable updates
- `OnPartyValueCWvsContext` (opcode 49) — party session variable updates
- `OnFieldSetVariableCWvsContext` (opcode 47) — field variable updates

### Channel Transfer
- `OnTransferChannelCWvsContext` (opcode 94) — channel change handler
- `OnMigrateCommand` (0x4ADD50) — server migration
- `IssueConnect` (0x9E0300) — reconnection helper

### Secure-Tear Pattern
Obfuscated fields using `_ZtlSecureTear` template:
- `_ZtlSecureTear_m_nLastJumpInputX_CS` (CUserLocal) — jump input
- `_ZtlSecureTear_m_usActivePetSkill_CS` (CUserLocal) — pet skill
- `_ZtlSecureTear_fT` / `_ZtlSecureTear_fT_CS` (SKILLLEVELDATA) — skill data
- `_ZtlSecureTear_nACC` / `_ZtlSecureTear_nACC_CS` (SKILLLEVELDATA) — accuracy data

### Memory Integrity
- `OnDataCRCCheckFailedCWvsContext` — client memory CRC verification
- CIGCipher innoHash — sequence-based packet validation

### Audit Focus
- Auth key flows — are they just client timestamps with no validation?
- Anti-macro trigger conditions — can they be suppressed?
- CRC check failure handling — disconnect or warning?
- Secure-tear XOR mask verification — can the obfuscation be trivially reversed?
- Channel transfer token validation — is `IssueConnect` address verified?
- Field CRC verification scope — what does `m_dwCrc` actually protect?

---

## 19. UI Window Hierarchy

### Core Window Chain (from `hierarchy_complete.json`)
```
IUIMsgHandler
  └── CWnd
        └── CDialog
              ├── CUniqueModeless
              │     ├── CMiniRoomBaseDlg → CMessageBoxPool
              │     ├── CEmployeePool → CEngageDlg
              │     └── CUICharacterSaleDlg
              ├── CFadeWnd → CUIFadeYesNo
              │     └── ExpeditionIntermediary
              ├── CLoginGradeWnd
              ├── COmokDlg
              └── CConnectionNoticeDlg
```

### UI Subclasses by Area

**Login UI (already audited in login.md):**
- CUITitle, CUICharSelect, CUIAvatar, CUILoginStart, CLoginUtilDlg, CLoginGradeWnd

**Cash Shop UI:**
- `CCSWnd_Char`, `CCSWnd_Inventory`, `CCSWnd_Locker` — all inherit via `CWnd → IUIMsgHandler → INetMsgHandler`

**In-Game UI:**
- `CUIFamily`, `CUIFamilyChart` — inherit `CUIWnd → CWnd`
- `CUISkillDec` — skill deck UI (field: `m_nItemLevel`)
- `CUIAdminShopWishList`, `CUIAdminShopWishListCategory`, `CUIAdminShopWishListSearchResult`
- `CUICharacterSaleDlg` — character sale dialog
- `CUIToolTip` — tooltip system (39 item sub-types: 10002–10246 range)
- `CUIDragonEquip`, `CUIMechanicEquip` — dragon/mech equip (inherit `IWzGr2DLayer`)
- `CAvatar`, `CAvatarMegaphone` — avatar display (inherit `CWnd`)

**Game-specific dialogs:**
- `CAdminShopDlg → AdminShopCommodity@CAdminShopDlg`
- `CBlackListDlg → CEntrustedShopDlg`
- `CVisitListDlg → CEntrustedShopDlg`

### Control Widgets
- `CCtrlButton`, `CCtrlEdit`, `CCtrlComboBox`, `CCtrlComboBoxSelect`
- `CCtrlTab`, `CCtrlPQuestItem`, `CCtrlSelectQuest`, `CCtrlStatic`
- All inherit via `CCtrlWnd → IUIMsgHandler` or directly

### Broadcast/Notice
- `CMapleTVMan` (opcodes 405–407)
- `CClock` (opcodes through CField)

### Audit Focus
- Modal dialog stack management (can multiple be open?) — **NO stack depth limit, single m_pChildModal pointer**
- Focus routing integrity (tab order, keyboard focus) — **SetFocusChild only blocks ComboBoxSelect**
- UI state ↔ game state consistency — **server-authority model; all dialogs decode server data directly**
- Tooltip data loading (can it load arbitrary WZ paths?) — **NO — all from structured game data**
- Button handler privilege checks (admin shop buttons) — **CAdminShopDlg: no per-action auth**
- WZ image loading from packet data — **CRITICAL in CUtilDlgEx IMAGE type**
- Embedded web browser URL validation — **NONE — IWebBrowser2::Navigate with no scheme check**
- String sanitization in dialogs — **NO in OnScriptProgressMessage, minimal in input validation**
- Double-submit protection coverage — **Missing in CPersonalShopDlg, partial in trade dialogs**

---

## 20. Nexon Passport Module

### Class Hierarchy
```
CNMSimpleStreamDecoder
CNMSerializableDecoder
CNMSerializable
  └── CNMDefaultUserInfo
        └── CNMAvatarItemInfo
              └── CNMAvatarFullInfo
                    └── CNMRealUserInfo
                          └── CNMCharacter
                                └── CNMFunc
                                      ├── CNMSetLocaleFunc
                                      ├── CNMGetNexonPassportFunc
                                      ├── CNMLoginAuthFunc
                                      └── CNMLogoutAuthFunc
```

### Auth Flow (from login audit)
```
LoginAuth (CNMLoginAuthFunc) → GetNexonPassport (CNMGetNexonPassportFunc)
  → DetachAuth / LogoutAuth (CNMLogoutAuthFunc)
```

### Audit Focus
- Passport token validation
- Auth function integrity (can they be bypassed?)
- Serialization overflow in CNMSerializableDecoder

---

## 21. Vulnerability Categories

### Critical
1. **Static AES key & IV** — All encryption materials hardcoded in memory dumps, enabling full packet decryption
2. **Client-side damage calculation** — **CONFIRMED:** `TryDoingMeleeAttack` builds attack packet with damage shorts, calls SendPacket directly. `TryDoingMagicAttack` sends two packets (notifier op 0xDB + main attack). All attack damage is client-computed.
3. **Client-side cooldown enforcement** — All 15+ `m_tLast*` timer fields in CUserLocal are validated only by `get_update_time()` — can be manipulated by freezing/skewing game clock

### High
4. **Auth keys are cosmetic web features** — **CONFIRMED:** All three auth key handlers (0x9E3F30, 0x9E4000, 0x9E40D0) just store strings and client-side `timeGetTime()` timestamps. No security mechanism.
5. **Anti-macro timers are client-side** — `m_tRemainAntiMacroQuestion`, `m_tRemainInitialQuiz` — can be cleared by memory write
6. **ZtlSecureFuse crash-on-tamper** — **REVERSED:** XOR scrambles value with random key, stores CS separately. Crash-on-read-mismatch. Feature (not bug) but causes denial-of-service on legitimate detection.
7. **OnDataCRCCheckFailed does NOT disconnect** — **CONFIRMED:** Shows modal dialog, user clicks through. Critical enabler for memory editing attacks.

### Medium
8. **OnInventoryGrow lacks slot count bounds** — **CONFIRMED:** Only reallocs from 2-byte decode, no upper bound validation
9. **OnScriptProgressMessage string injection** — **CONFIRMED:** Decodes packet string into CNoticeQuestProgress with no sanitization
10. **Admin hide flag** — `m_bAdminHide` is client-side — if server trusts it, GMs can be spoofed
11. **Party search state machine** — `m_nPartySearch_State` is client-side state with no server validation
12. **Attack range untrusted** — `nAttackSpeed` and `GetMeleeAttackRange` calculated client-side
13. **Combo counter mutable** — `m_nCombo` in CUserLocal is read/write client-side
14. **No min/max field ID bounds** — `m_nFieldID` in CField has no documented validation
15. **Mob CRC key limited scope** — `m_dwMobCrcKey` only covers mob state, not position/HP

### Low
14. **Pet consume timers are client-only** — `m_tPetConsumeNoPotionMsgTime` is advisory
15. **Character slot count client-trusted** — `m_nCharacterSlotCount` in CCashShop
16. **Screen resolution client-authoritative** — `m_nScreenWidth` / `m_nScreenHeight` not validated
17. **Popularity / sue cooldowns use client delta** — `m_tLastGivePopularity` init at `v18 - 300000`
18. **Tooltip index can be set to invalid** — `m_nIdx_ToolTipByMouse` init at -1 with no guard
19. **CDialog zombie state** — SetRet with m_dwWndKey==0 exits modal loop without freeing resources
20. **CUniqueModeless use-after-free** — Destroy + dtr_ZRefCounted double-free path
21. **CCtrlWnd CreateCtrl no parent validation** — no verification of window hierarchy membership
22. **Packet-controlled dialog layout params** — m_nInputLen/Col/Line from packet
23. **CAdminShopDlg request minimal** — only NPC Template ID in buy request

### UI-Specific (Deep Audit Summary)
- **CUIToolTip:** No WZ path injection. All tooltip content from structured game data (item IDs, string pool). **CLEAN.**
- **ADBoard:** Pure text balloon, 40-char max after curse-word filtering. No WZ or URL loading. **LOW risk.**
- **CWebWnd (IE embedded browser):** `IWebBrowser2::Navigate` with **NO scheme validation**. URLs built from server-sourced strings (packets 188, 299). Can inject `javascript:`, `file://`, `about:` if server compromised. **HIGH.**
- **CUtilDlgEx (script dialogs):** 10 dialog types. TYPE 9 (IMAGE) loads **arbitrary WZ resources** from packet paths via `IWzResMan::GetObjectA()`. **CRITICAL.** String types 3/8 only enforce minimum length. **MEDIUM.**
- **OnScriptProgressMessage:** Decoded string passed with zero sanitization to quest progress display. Only rate-limit protection (3s/slot × 5 slots). **HIGH.**
- **CWnd/CDialog base class:** 9 architectural vulnerabilities including no modal stack, focus bypass, ESC forced termination, zombie state, use-after-free. **MIXED (LOW-MEDIUM).**
- **CPersonalShopDlg:** No double-submit protection. **MEDIUM.**
- **CUtilDlgEx::SetRet input validation:** Numeric types (type 2) well-validated (digit-only + range). String types (3, 8) only min length. **MEDIUM.**

---

## 22. Audit Checklist

### Phase 1 — Core Infrastructure
- [x] Read all 106 CWvsContext sub-handlers and map to `.c` files (180+ callgraph nodes)
- [x] Verify `CWvsContext::OnPacket` switch has no `default` fallthrough vuln — CLEAN (default: return)
- [x] Verify singleton access pattern across all TSingleton usages — consistent pattern
- [x] Cross-reference all 2,392 opcodes against `enums.json` case sets — 106 mapped
- [x] Identify all functions in disassembly-only mode (>12KB threshold) — 51 files

### Phase 2 — Combat & Damage
- [x] Read disassembly for `CUserLocal::TryDoingMeleeAttack` (0x91E780) — found SendPacket at line 4728, damage encoded as shorts
- [x] Read disassembly for `CUserLocal::TryDoingShootAttack` (0x925A00) — no direct SendPacket, delegates to sub-functions
- [x] Read disassembly for `CUserLocal::TryDoingMagicAttack` (0x92A240) — two SendPacket calls (op 0xDB notifier + main attack)
- [x] Verify `DamageInfo::CalcAverageDamage` overflow protection — 16-line division, no overflow risk
- [x] Trace `DoMeleeAttack` / `DoShootAttack` packet construction — client encodes MobID + stance + position + damage shorts
- [x] Read `GetMeleeAttackRange` (0x428D00) / `GetShootRange0` (0x903230) — range from afterimage UOL/animation rects, client-authoritative

### Phase 3 — Inventory & Stats
- [x] Read `OnInventoryOperationCWvsContext` (0xA08A70) — 4 op types, old-count validation **adequate**
- [x] Read `OnStatChangedCWvsContext` (0x9FD5D0, 573 lines) — stat decode + quest auto-completion
- [x] Read `OnGatherItemResultCWvsContext` (17 lines pure UI)
- [x] Read `OnSortItemResultCWvsContext` (17 lines pure UI)
- [ ] Check GW_ItemSlotBase decoding for overflow

### Phase 4 — Anti-Tamper
- [x] **CRITICAL:** `OnDataCRCCheckFailedCWvsContext` — **DOES NOT disconnect**, shows modal dialog
- [x] Trace auth key update flow (consult 0x9E3F30, class comp 0x9E4000, guild board 0x9E40D0) — **cosmetic, client-only timestamps**
- [x] Read `OnAntiMacroResultCWvsContext` (0x9FF580, 252 lines) — client-side timer, no server revalidation
- [x] Reverse `_ZtlSecureTear/XOR` obfuscation — random key + ROL/ROR + checksum, crash-on-tamper
- [ ] Verify CIGCipher innoHash sequence integrity (prevent replay)

### Phase 5 — Social & Trade
- [x] Read `OnPartyResultCWvsContext` (0xA10AB0, 979 lines) + PARTYDATA decode (0x4F2B00)
- [x] Read `OnGuildResultCWvsContext` (0xA0D3B0, 1270 lines) + GUILDDATA decode (0x4FB760)
- [x] Trace trade flow — `OnTradeMoneyLimit` (0x9F65F0), `OnMesoGive_Succeeded/Failed`
- [x] Verify CCashShop purchase authorization flow — `m_bCashShopAuthorized` set by server in LoadData
- [x] Read `OnEntrustedShopCheckResultCWvsContext` — `OnWithdrawMoneyResult` at 0x51C7A0
- [x] Read `OnMarriageResultCWvsContext` (0xA00DA0, 364 lines) / `OnMarriageRequest` (0xA00BB0, 83 lines) / `OnWeddingGiftResult` (0x9F1670, 31 lines) — **All pure UI**

### Phase 6 — Quests & Events
- [x] Read `OnQuestClearCWvsContext` (0x9FA430, 33 lines, pure UI)
- [x] Read `OnScriptProgressMessageCWvsContext` (0x9E5110, 29 lines, string injection via CNoticeQuestProgress)
- [x] Read `OnFieldSetVariableCWvsContext` (0x9E4870, 99 lines, key-value state tracking)
- [x] Timer events: field-local via `m_bTimerEventFlag` (CField), not in CWvsContext opcode switch
- [x] Monster Carnival: `CField_MonsterCarnival` is a field subclass, CP is field-specific logic

### Phase 7 — Migration & Session
- [x] Read `OnMigrateCommand` (0x4ADD50, 58 lines) + `IssueConnect` (0x9E0300, 37 lines)
- [x] Read `OnTransferChannelCWvsContext` (0xA02890, 42 lines) — channel switch init
- [x] Verify `OnCheckCrcResult` (0x4ADF10, 20 lines) — throws CTerminateException on CRC failure

### Phase 8 — UI Security (Deep Audit)
- [x] Map all CWnd subclass dialog IDs — hierarchy_complete.json loaded, 200+ class hierarchy chains
- [x] Read `OnMacroSysDataInitCWvsContext` (0x9F0C70, 13 lines) — trivially calls Reset+SetMacro
- [x] Tooltip system uses CUIToolTip with ShowItemToolTip/SetToolTip_String — tooltips from string pool + item IDs, **no arbitrary WZ path injection**
- [x] CUIToolTip used across inventory, cash shop, character equip, admin shop — standard pattern
- [x] **Deep-audit CUtilDlgEx dialog system** — 10 dialog types, all sub-creators read (0x98EDD0, 0x97DDC0, 0x97E1A0, 0x9816F0, 0x9839A0, 0x983D70, 0x984F70, 0x9846C0, 0x9813C0, 0x981AC0, 0x984380)
- [x] **CRITICAL:** CUtilDlgEx::MakeImage (0x982280) loads arbitrary WZ resources from packet-controlled paths
- [x] **HIGH:** CUtilDlgEx::OnScriptProgressMessage (0x9E5110) string injection — no sanitization
- [x] **HIGH:** CWebWnd::Navigate (0x9A4550) URL injection — no scheme validation, `IWebBrowser2::Navigate` from server strings
- [x] **HIGH:** OnUpdateGMBoard (packet 188) + OnWebBoardAuthkeyUpdate (packet 299) — server-sourced URL/keys
- [x] **MEDIUM:** CUtilDlgEx string-type input validation bypass — only minimum length check
- [x] **MEDIUM:** CDialog::OnKey ESC (0x4FEAD0) forced termination — always SetRet(ID 2)
- [x] **MEDIUM:** CWnd::SetFocusChild (0x9AECF0) — only blocks ComboBoxSelect, no IsEnabled/IsShown
- [x] **MEDIUM:** No modal dialog stack depth protection — CDialog::DoModal single MODAL_OWNER
- [x] **MEDIUM:** CPersonalShopDlg — no double-submit protection flag
- [x] Read ADBoard system — pure text balloon (40 chars, curse-filtered), no WZ/URL loading
- [x] Read CCtrlEdit::OnKey (0x4E3A20) — no input sanitization in paste/insert path
- [x] Read CWnd::Destroy / CDialog::SetRet / CUniqueModeless lifecycle

### Phase 6 — Quests & Events
- [x] Read `OnQuestClearCWvsContext` (0x9FA430, 33 lines, pure UI)
- [x] Read `OnScriptProgressMessageCWvsContext` (0x9E5110, 29 lines, string injection via CNoticeQuestProgress)
- [x] Read `OnFieldSetVariableCWvsContext` (0x9E4870, 99 lines, key-value state tracking)
- [ ] Read `OnTimerEventCWvsContext`
- [ ] Verify Monster Carnival CP tracking

### Phase 7 — Migration & Session
- [x] Read `OnMigrateCommand` (0x4ADD50, 58 lines) + `IssueConnect` (0x9E0300, 37 lines)
- [ ] Read `OnTransferChannelCWvsContext`
- [ ] Verify `OnCheckCrcResult` flow

### Phase 8 — UI Security (stale duplicate — see deep audit above)
- [x] Map all CWnd subclass dialog IDs — hierarchy_complete.json loaded, 200+ class hierarchy chains
- [x] Verify modal dialog stack — **NO protection, no depth limit, single m_pChildModal pointer**
- [x] Check tooltip/AD board WZ path injection — **NONE in tooltip; ADBoard is pure text balloon**
- [x] Verify `OnMacroSysDataInitCWvsContext` bounds — 13 lines, trivially safe

---

## 23. File Reference Index

### Decompiled Handlers (login)
| File | Address | Purpose |
|---|---|---|
| `decompile/5DC600.c` | 0x5DC600 | OnCheckPasswordResult (645 lines) |
| `decompile/5DB9D0.c` | 0x5DB9D0 | SendCheckPasswordPacket |
| `decompile/5FFEC0.c` | 0x5FFEC0 | CUITitle::SetRet (input validation) |
| `decompile/5FFC90.c` | 0x5FFC90 | CUITitle::OnButtonClicked |
| `decompile/5FF940.c` | 0x5FF940 | CUITitle constructor |
| `decompile/5FFAE0.c` | 0x5FFAE0 | CUITitle destructor |
| `decompile/5DEE90.c` | 0x5DEE90 | CLogin::Update (state machine) |
| `decompile/4ADD50.c` | 0x4ADD50 | OnMigrateCommand |
| `decompile/4AFE50.c` | 0x4AFE50 | OnAuthenCodeChanged |
| `decompile/4ADEB0.c` | 0x4ADEB0 | OnAuthenMessage |
| `decompile/9E0300.c` | 0x9E0300 | IssueConnect |

### Decompiled Crypto
| File | Address | Purpose |
|---|---|---|
| `decompile/68C8E0.c` | 0x68C8E0 | ShandaEncrypt (3-round) |
| `decompile/68CAB0.c` | 0x68CAB0 | ShandaDecrypt (3-round inverse) |
| `decompile/68D100.c` | 0x68D100 | MakeBufferList (packet assembly) |
| `decompile/68CCA0.c` | 0x68CCA0 | DecryptData (packet decryption) |
| `decompile/4AF9F0.c` | 0x4AF9F0 | SendPacket (sequence IV + innoHash) |
| `decompile/4AF6A0.c` | 0x4AF6A0 | Flush (Winsock send) |
| `decompile/4B00F0.c` | 0x4B00F0 | ProcessPacket (receive dispatch) |
| `decompile/431D20.c` | 0x431D20 | RIJNDAEL_KeySchedule |
| `decompile/432D60.c` | 0x432D60 | OFB_EncUpdate |
| `decompile/4330F0.c` | 0x4330F0 | AES Encrypt |
| `decompile/4331A0.c` | 0x4331A0 | AES Decrypt |

### Disassembly Fallbacks (too large to decompile)
| File | Address | Size |
|---|---|---|
| `disassembly/9EB3E0.asm` | 0x9E5830 / 0x9EB3E0 | CWvsContext::OnPacket |
| `disassembly/91E780.asm` | 0x91E780 | CUserLocal::TryDoingMeleeAttack (29,270 bytes) |
| `disassembly/925A00.asm` | 0x925A00 | CUserLocal::TryDoingShootAttack (18,493 bytes) |
| `disassembly/92A240.asm` | 0x92A240 | CUserLocal::TryDoingMagicAttack (3,000+ instr) |

### Decompiled Damage
| File | Address | Purpose |
|---|---|---|
| `decompile/470200.c` | 0x470200 | CalcAverageDamage |
| `decompile/470220.c` | 0x470220 | CalcAverageAttrRate |
| `decompile/470240.c` | 0x470240 | ChoiceMaxOrMinDamage |
| `decompile/470270.c` | 0x470270 | ChoiceCriMaxOrMinDamage |
| `decompile/4702A0.c` | 0x4702A0 | IncTotalDamage |
| `decompile/4702C0.c` | 0x4702C0 | IncTotalAttackNum |
| `decompile/4702D0.c` | 0x4702D0 | IncCriticalNum |
| `decompile/4703C0.c` | 0x4703C0 | ClearAllValue |
| `decompile/4707D0.c` | 0x4707D0 | CheckTotalDamageOverflow |
| `decompile/470890.c` | 0x470890 | SetBattleDamageInfo |
| `decompile/470920.c` | 0x470920 | SetAttrDamageRateInfo |
| `decompile/7215A0.c` | 0x7215A0 | IsCalcDamageStat |
| `decompile/724DB0.c` | 0x724DB0 | CalcDamageByWT |
| `decompile/50AE70.c` | 0x50AE70 | nAttackSpeed calculation |

### UI System Files
| File | Address | Content |
|---|---|---|
| `decompile/98EDD0.c` | 0x98EDD0 | CUtilDlgEx::OnCreate — main dispatcher |
| `decompile/97DDC0.c` | 0x97DDC0 | OnCreate_TEXT (type 0) |
| `decompile/97E1A0.c` | 0x97E1A0 | OnCreate_YESNO (type 1) |
| `decompile/9839A0.c` | 0x9839A0 | OnCreate_INPUT (type 2) |
| `decompile/9813C0.c` | 0x9813C0 | OnCreate_INPUT1 (type 3) |
| `decompile/9816F0.c` | 0x9816F0 | OnCreate_LIST (type 4) |
| `decompile/9846C0.c` | 0x9846C0 | OnCreate_AVATAR (type 5) |
| `decompile/981AC0.c` | 0x981AC0 | OnCreate_PET (type 6) |
| `decompile/984380.c` | 0x984380 | OnCreate_COMBOBOX_EDITABLE (type 7) |
| `decompile/983D70.c` | 0x983D70 | OnCreate_MLINPUT (type 8) |
| `decompile/984F70.c` | 0x984F70 | OnCreate_IMAGE (type 9) — **CRITICAL** |
| `decompile/982280.c` | 0x982280 | CUtilDlgEx::MakeImage — **arbitrary WZ load** |
| `decompile/982830.c` | 0x982830 | CUtilDlgEx::SetRet — input validation |
| `decompile/985350.c` | 0x985350 | CUtilDlgEx::OnButtonClicked — result dispatch |
| `decompile/983060.c` | 0x983060 | CUtilDlgEx::OnMouseMove |
| `decompile/9E5110.c` | 0x9E5110 | OnScriptProgressMessage — **string injection** |
| `decompile/9A4550.c` | 0x9A4550 | CWebWnd::Navigate — **IE control, no scheme check** |
| `decompile/8DD080.c` | 0x8DD080 | CUIWebEvent::Update — URL builder |
| `decompile/9E03C0.c` | 0x9E03C0 | OnUpdateGMBoard — server-sourced URL |
| `decompile/9E40D0.c` | 0x9E40D0 | OnWebBoardAuthkeyUpdate — server key |
| `decompile/8A9300.c` | 0x8A9300 | CUIToolTip::ShowItemToolTip |
| `decompile/887140.c` | 0x887140 | SetToolTip_String |
| `decompile/8ED310.c` | 0x8ED310 | CUser::OnADBoard — text balloon |
| `decompile/9AECF0.c` | 0x9AECF0 | CWnd::SetFocusChild |
| `decompile/4FE7A0.c` | 0x4FE7A0 | CDialog::DoModal — MODAL_OWNER |
| `decompile/4FEAD0.c` | 0x4FEAD0 | CDialog::OnKey — ESC forced terminate |
| `decompile/429290.c` | 0x429290 | CDialog::SetRet — zombie state |
| `decompile/429310.c` | 0x429310 | CUniqueModeless::SetRet — use-after-free |
| `decompile/4E3A20.c` | 0x4E3A20 | CCtrlEdit::OnKey — no input sanitization |
| `decompile/4F0900.c` | 0x4F0900 | CCtrlWnd::CreateCtrl — no parent validation |
| `decompile/9B3290.c` | 0x9B3290 | CWndMan::Unlink — reactivates without modal check |
| `decompile/69C820.c` | 0x69C820 | CPersonalShopDlg::OnPacket |
| `decompile/4310F0.c` | 0x4310F0 | CAdminShopDlg::OnPacket |
| `decompile/7649A0.c` | 0x7649A0 | CTradingRoomDlg::OnPacket |

### Data Files (generated/)
| File | Lines | Content |
|---|---|---|
| `generated/packet_handlers.json` | 2,392 | Opcode-to-handler mapping |
| `generated/enums.json` | 3,846 | 201 switch-case routing tables |
| `generated/hierarchy_complete.json` | 1,814 | Full class inheritance |
| `generated/fields.json` | 12,719 | Class field definitions |
| `generated/constructor_inits.json` | ?? | Constructor initializer lists |

### Function Index
| File | Entries | Content |
|---|---|---|
| `function_index.txt` | 4,717 | Mangled names with addresses and callers/callees |

### Memory Dumps
| File | Address Range | Content |
|---|---|---|
| `memory/00C01000--00C77000.txt` | 0xC560C0, 0xC61A70 | AES UserKey, CIG bShuffle |
| `memory/00B01000--00B81000.txt` | 0xB4730C | AES Default IV |

### Pointers
| File | Content |
|---|---|
| `pointers.txt` | Global variable addresses and cross-references |
| `strings.txt` | 1,039 detected strings |
