# CMob Full IDA Audit — Gap Analysis & Implementation Plan

## Summary
- **147/149 CMob methods decompiled** (GenerateMovePath + LoadLayer too large for MCP)
- **~150 methods total** in OG CMob (1512-byte struct, inherits CLife)
- **Current TS implementation**: MobLook (385 lines) + MobController (402 lines) + MobInfoService (238 lines)
- **Key gaps**: MobStat system, damage handling, movement processing, animation management

## CMob Struct Layout (1512 bytes)
Key fields from v95_symbols.txt:
```
+0000 CLife (base class)
+0088 m_nMobChargeCount
+008C m_bAttackReady
+0090 m_nAngerGaugeCount
+0094 m_nUpdateTime
+00A4 m_effectAttack (ATTACKEFFECT)
+00B0 m_lAffectedSkillEntry (ZList)
+00C4 m_lAttackEntry (ZList)
+0104 m_pvc (VecCtrl)
+0108 m_pvcActive (VecCtrl)
+010C m_pvcHead (VecCtrl)
+011C m_nMobCtrlState
+0128 m_nMobCtrlSN
+0130 m_nSkillCommand
+0134 m_nSLV
+0168 m_dwMobID
+0174 m_pTemplate
+0178 m_pTemplateByDoom
+017C m_nMP
+0188 m_stat (MobStat - 568 bytes!)
+03D0 m_nMoveAction
+03DC m_nOneTimeAction
+03E8 m_tHitExpire
+0400 m_posFrame
+0428 m_rcBody (tagRECT)
+0458 m_aAction (ZArray)
+04AC m_lDamageInfo (ZList)
+04C0 m_lHitEffect (ZList)
+04D4 m_lDropPickUpLog (ZList)
+04E8 m_pLayerAction
+04F0 m_pLayerHPTag
+04F4 m_pEffectLayer
+04F8 m_pLayerAngerTag
+0508 m_pCanvasHPIndicator
+0570 m_aMultiTargetForBall
+0578 m_delaySkill
+0590 m_lpStatChangeReserved
+05A4 m_bChasing
+05B0 m_tTimeBomb
+05D0 m_Bullets (MobBullet::Container)
```

## Gap Categories

### HIGH Priority (Core Gameplay)
| # | Method | Current State | Notes |
|---|--------|--------------|-------|
| 1 | MobStat system | ❌ Missing | 80+ stat types, buff/debuff management |
| 2 | SetTemporaryStat | ❌ Missing | Stat buff application from packet |
| 3 | ProcessStatSet | ❌ Missing | Stat flag processing + visual effects |
| 4 | ProcessStatReset | ❌ Missing | Stat removal |
| 5 | OnDamaged | ❌ Missing | Server damage packet → ShowDamage + HP bar |
| 6 | OnHit | ❌ Missing | Full hit processing (15 params!) |
| 7 | OnDie | ❌ Missing | Death → die anim → revive/drops |
| 8 | ShowDamage | ❌ Missing | Damage number positioning + display |
| 9 | ShowHitEffect | ❌ Missing | Hit visual effects |
| 10 | ProcessAttack | ❌ Missing | Attack execution with bullets |
| 11 | DoAttack | ❌ Missing | DoAttack with TARGETINFO |
| 12 | OnMove | ❌ Missing | Server move path processing |
| 13 | OnCtrlAck | ❌ Missing | Control ack (MP, skill, state) |
| 14 | SetLayerZ | ❌ Missing | Z-layer draw order |
| 15 | GetBodyRect | ❌ Missing | Body collision rectangle |
| 16 | GetAttackBodyRect | ❌ Missing | Attack collision rectangle |
| 17 | CreateHPIndicator | ❌ Missing | Boss HP bar creation |
| 18 | PrepareActionLayer | ❌ Missing | Animation frame setup |
| 19 | SetMoveAction | ❌ Missing | Action state management |
| 20 | GetCurrentAction | ❌ Missing | Get current action |

### MEDIUM Priority (Features)
| # | Method | Current State | Notes |
|---|--------|--------------|-------|
| 21 | Affected skills | ❌ Missing | ShowAffectedSkill, UpdateAffectedSkillList |
| 22 | Anger gauge | ❌ Missing | Boss anger indicator |
| 23 | Escort system | ❌ Missing | Escort mob AI |
| 24 | Time bomb | ❌ Missing | Time bomb mechanic |
| 25 | Bullets | ❌ Missing | MobBullet system |
| 26 | Pick up drops | ❌ Missing | Mob pickup behavior |
| 27 | Speaking | ❌ Missing | Mob speech system |
| 28 | Catch effect | ❌ Missing | Pet catch animation |
| 29 | Bomb/Doomed | ❌ Missing | Special death types |

### LOW Priority (Edge Cases)
| # | Method | Current State | Notes |
|---|--------|--------------|-------|
| 30 | Body attack | ❌ Missing | Contact damage |
| 31 | DamagedByMob | ❌ Missing | Mob-vs-mob damage |
| 32 | First attack | ❌ Missing | Aggro on spawn |
| 33 | Self destruction | ❌ Missing | Self-destruct mechanic |
| 34 | CRC | ❌ Missing | Anti-cheat checksum |
| 35 | Suspended | ❌ Missing | Suspended state |
| 36 | Shoe attr | ❌ Missing | Element attributes |

## Implementation Phases

### Phase 1: MobStat System (Foundation)
- Create `MobStat.ts` with all 80+ stat types
- Implement stat flag processing (UINT128 bitfield)
- Wire to MobLook for visual effects

### Phase 2: Damage Handling
- Implement OnDamaged packet handler
- Implement ShowDamage with positioning
- Implement ShowHitEffect
- Wire to GameStage packet handlers

### Phase 3: Movement Processing
- Implement OnMove packet handler
- Implement SetMoveAction / GetCurrentAction
- Implement MoveAction2RawAction / RawAction2MoveAction

### Phase 4: Combat
- Implement OnHit (15-param hit processing)
- Implement ProcessAttack / DoAttack
- Implement GetBodyRect / GetAttackBodyRect
- Implement SetLayerZ for draw order

### Phase 5: Animation
- Implement PrepareActionLayer
- Implement SetFrameInfo
- Implement ProcessAction

### Phase 6: HP Indicators
- Implement CreateHPIndicator / ShowHPIndicator / HideHPIndicator
- Implement Anger gauge system

### Phase 7: Features
- Implement Affected skills
- Implement Escort system
- Implement Bullets
- Implement Speaking/Pickup/Bomb

### Phase 8: Edge Cases
- Implement Body attack, DamagedByMob, First attack
- Implement Self destruction, CRC, Suspended
- Implement Shoe attr
