# CMob Full Audit — v95 IDA Database

## Complete Function Inventory (164 functions)

### Lifecycle (4)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `Init` | 0x64d3b0 | 0x1100 | Initialize mob from server packet: decode position, foothold, move action, appear type, option, team, phase. Create CVecCtrlMob (main + active). Load head controller (StringPool 0x3D2). Set template move ability. Set up WZ layers, effects. |
| `Update` | 0x654300 | 0x1abc | Main per-frame update: processes attack entries, burned DOT damage (poison/venom/ambush/obstacle), affected skill timers, HP indicator position, bullet updates, action layer animation, time bomb timer, effect attack processing, suspended state checks. |
| `OnRevive` | 0x640aa0 | 0x180 | Restore mob from suspended=2 (dead): set m_nSuspended=0, restore alpha from 0→255. |
| `SetActive` | 0x640950 | 0x14b | Toggle mob active/inactive state. If inactive, hide action layer. If active, show layer, restore alpha to 255, reset hit expiry. |

### Death/Die (4)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `OnDie` | 0x64e4b0 | 0x574 | Death handler. Special case for templateID 0x866E8A (alpha fade). Play SE_MOB_DIE sound. Pick die action: if m_nDeadType==3 → action 22, else random 10..nDieCount+9. PrepareActionLayer. Set suspended=2. TrySpeaking(-1,-1). Clear affected skills, bullets, damage timers. Screen shake for specific template IDs (30.0/10.0/5.0 force). |
| `OnDestructByMiss` | 0x64ea30 | 0x201 | Death by miss (no drop): plays die action, clears affected skills, sets suspended=2. |
| `OnDoomed` | 0x64ed40 | 0x1e6 | Doom transformation: stores m_pTemplateByDoom, reloads move ability, recreates CVecCtrlMob, resets layers. |
| `OnSwallowed` | 0x641810 | 0x63b | Swallow attack (Pinkbean): loads swallow effect canvas, animates user flying toward mob mouth, plays skill sound 33101005 (SE_SKILL_USE). |

### Damage/Hit (6)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `OnDamaged` | 0x64ecb0 | 0x85 | Server damage packet: decode nType, damage. If nType!=2 → ShowDamage. If bDamagedByMob → ShowHitEffect + CreateHPIndicator + ShowHPIndicator. |
| `OnHit` | 0x653100 | 0x909 | Client-side hit processing. 15 params: dwCharacterId, nSkillID, nHitAction, bLeft, nDamage, bCritical, nAttackIdx, bChase, nMoveType, nBulletCashItemID, nMoveEndingPosX/Y, bMoveLeft, bZigZagDamage. Handles toss skills, rise-by-toss, move path generation for chase, screen shake on hit, combo increment request, ShowHitEffect + ShowDamage + AddDamageInfo. |
| `ShowDamage` | 0x63c950 | 0x195 | Display damage number. Special template IDs 9400752 / 0x8F71AF skip. Gets head position, adjusts for critical (+15/-15), bHalfHeight, bAdjustHeight. Calls Effect_HP (damage>0), Effect_HP (damage<0, heal), Effect_Miss (damage==0). |
| `ShowHitEffect` | 0x64b140 | 0x120 | Trigger hit reaction. Only if action is NOT in ranges [13..21], [22..38], [7..9]. Check nPushedDamage threshold. Boss mobs: only if 10s since last hit. GetRandomHitAction → set as OneTimeAction → PrepareActionLayer → set tHitExpire. |
| `AddDamageInfo` | 0x653a10 | 0x693 | Add damage display entry. Decodes from packet, creates DAMAGEINFO struct, inserts into m_lDamageInfo list. Handles damage delay timing. |
| `SetDamagedByMob` | 0x64b260 | 0x467 | Mob-vs-mob damage. Checks dazzle/escort type mismatch, hit cooldown (2000ms normal, 1500ms escort). Calculates PDamage/MDamage via CalcDamage. Shows hit effect + damage number. Plays mob attack sound. |

### Attack (6)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `DoAttack` | 0x6504d0 | 0x9b0 | Execute attack by action index. Guard checks: no doom, no stun/freeze/web/seal, not suspended==4. Gets MobAttackInfo via nAction-13. Four attack types: 0=melee (add ATTACKENTRY with rect), 1=melee target (with summoned/user body rect check), 2=bullet (create MobBullet with SetBallDestPoint), 3/4=area (trapezoid rect with foothold range). Plays attack sound. |
| `ProcessAttack` | 0x652950 | 0x7ad | Process pending attacks each frame. Guard: !bNotAttack, !suspended(1/3), !ourTeam, samePhase, !dazzle(our), !disable. Loads attack effect WZ (StringPool 986). Updates bullets. Iterates ATTACKENTRY list: for type 0, checks rush attack + GenerateMovePath; for type 1, IntersectRect with user/summoned/mobs; for type 3/4, area rect intersection. Plays screen tremble for bTremble attacks. |
| `ProcessAction` | 0x64ab60 | 0x14f | Process current action layer: update frame delay, check action completion, prepare next frame. |
| `TryFirstAttack` | 0x6482f0 | 0x348 | Initial aggro: check if mob should first-attack local user. Checks bFirstAttack template flag, distance, phase, dazzle. |
| `TryFirstSelfDestruction` | 0x640ee0 | 0x1c4 | Self-destruct timer check: if template has nSelfDestruct and timer expired, trigger death. |
| `TryDoingSkill` | 0x64ae60 | 0x169 | Attempt to use mob skill: check skill delay, call MobSkillMan. |

### Movement (5)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `GenerateMovePath` | 0x651100 | 0x10d4 | Generate movement path. 10 params: nAction, bLeft, ti, bChase, nMoveType, nMoveEndingX/Y, bMoveLeft, bRiseByToss. Sets OneTimeAction, MoveAction. Handles move types: 0=chase, 1=teleport, 2=fly, 3=jump. Creates CMovePath waypoints. Sets m_nMobCtrlState. |
| `OnMove` | 0x6521e0 | 0x477 | Server move packet: decode bNotForceLanding, bNotChangeAction, bNextAttackPossible, bLeft (action). Discards current move path. Decodes multi-target array. Updates OneTimeAction, MoveAction. Plays move sound. Processes mob skill effects. |
| `ApplyControl` | 0x640d20 | 0x1b3 | Send control acknowledgment. Only if bPickUpDrop or bFirstAttack and 1000ms cooldown. Calculates distance to user, sends opcode 228 (UserMovePath) with mobID + encoded distance. Adds 100 if job is 0x12 or 0x13. |
| `ChaseTarget` | 0x642db0 | 0x135 | Chase a target: set OneTimeAction, move action, call GenerateMovePath with chase parameters. |
| `OnResolveMoveAction` | 0x63caf0 | 0x208 | Resolve move action from VecCtrl: handles ladder/rope, flying, jumping states. Updates MoveAction based on movement direction. |

### AI/Controller (7)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `OnCtrlAck` | 0x640c50 | 0xc3 | Control acknowledgment from server: decode ctrlSN, decoded control state. Update m_nMobCtrlState. |
| `OnSuspendReset` | 0x64acb0 | 0x1ab | Suspend/resume control: decode new state, reset controllers, update suspended flag. |
| `IsChaseTargetEscort` | 0x63b7b0 | 0x7e | Check if chase target is an escort mob. |
| `IsChaseTargetDazzle` | 0x63b830 | 0x6a | Check if chase target is dazzled by this mob. |
| `IsAbleTargetEscortMob` | 0x63b8a0 | 0xd5 | Check if mob can target escort mobs. |
| `ClearEscortInfo` | 0x63b980 | 0x3f | Clear escort-related data. |
| `OnEscortStopEndPermmision` | 0x63b9c0 | 0x4e | Escort stop permission handler. |

### Stats (6)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `ProcessStatSet` | 0x64bdd0 | 0x726 | Apply stat changes from packet. UINT128 bitmask of which stats to apply. |
| `ProcessStatReset` | 0x650030 | 0x187 | Remove stat buffs from packet. UINT128 bitmask. |
| `OnStatSet` | 0x652660 | 0x114 | Server stat set packet: decode stat type, call ProcessStatSet. |
| `OnStatReset` | 0x652780 | 0x11b | Server stat reset packet: decode stat type, call ProcessStatReset. |
| `SetTemporaryStat` | 0x64afd0 | 0x167 | Apply temporary stat from packet: decode stat value, duration. |
| `GetMobStat` | 0x639f60 | 0x7 | Return pointer to m_stat. |

### HP/Display (5)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `CreateHPIndicator` | 0x643160 | 0x537 | Create HP bar. Creates WZ layer, loads HP bar frames from `Mob.wz/Mob/<id>/hp`. Sets HP percentage. StringPool paths for HP bar components. |
| `ShowHPIndicator` | 0x63e200 | 0x32c | Show HP bar with fade-in animation. |
| `HideHPIndicator` | 0x63e530 | 0xd1 | Hide HP bar with fade-out. |
| `AdjustHPIndicatorPosition` | 0x642f80 | 0x1d6 | Update HP bar position to follow mob. |
| `OnHPIndicator` | 0x642ef0 | 0x90 | Server HP indicator packet: decode HP percentage, update bar. |

### Animation (8)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `PrepareActionLayer` | 0x64a030 | 0x4d0 | Setup animation frame: GetCurrentAction → GetFineAction → LoadMobAction → iterate frame entries, set delay, flip, alpha, z-order. Set m_tActionDelay. |
| `GetCurrentAction` | 0x649ea0 | 0x73 | Get current action index + direction. Combines m_nMoveAction and m_nOneTimeAction. |
| `GetFineAction` | 0x649270 | 0x160 | Map raw action to actual action index. Handles errata table (sMobActionErrata). |
| `GetFineMoveDirAction` | 0x6493d0 | 0x33 | Get move direction action from move action. |
| `SetMoveAction` | 0x64ec40 | 0x6b | Set move action with optional force flag. |
| `MoveAction2RawAction` | 0x63a9c0 | 0xac | Convert move action (directional) to raw action index. Formula: extracts direction from moveAction, combines with base action. |
| `RawAction2MoveAction` | 0x63aa70 | 0xb8 | Convert raw action index back to move action. |
| `LoadMobAction` | 0x63b6b0 | 0x6e | Load action frames via CActionMan. |
| `ClearActionLayer` | 0x63e940 | 0x2b | Remove current action canvas (index -2). |
| `SetFrameInfo` | 0x642560 | 0x843 | Process action frame entries: set canvas, position, alpha, delay, sound triggers, z-order per frame. |
| `GetActionDelay` | 0x63e970 | 0x9a | Calculate total delay for an action by summing frame delays. |
| `GetCurrentFrameIndex` | 0x749c60 | 0x24 | Get current animation frame index. |

### Skills/Affected (6)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `ShowAffectedSkill` | 0x64ef30 | 0x10ce | Render affected skill visual (poison, stun, etc.). Creates WZ layers for skill icons/animations. Loads from `Mob.wz/Mob/<skillId>`. Handles position, animation, duration. |
| `UpdateAffectedSkillList` | 0x64a500 | 0x652 | Update affected skill timers, remove expired entries, refresh visual layers. |
| `ShiftAffectedSkillAnimation` | 0x648640 | 0x4bb | Shift affected skill animation position based on mob body rect. |
| `SetAffectedLayerPos` | 0x63eaf0 | 0x3e0 | Update affected layer positions to follow mob. |
| `OnAffected` | 0x644400 | 0x4e | Server affected skill packet: decode, update affected list. |
| `OnSpecialEffectBySkill` | 0x6540b0 | 0x242 | Handle special skill effects on mob. |

### Speaking (2)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `TrySpeaking` | 0x64b6d0 | 0x6f5 | Try to display speech bubble. Uses sIgnoreSymbols table (static). Checks cooldown, template speaking probability. Loads speech text from StringPool. Creates WZ speech layer. |
| `OnMobSpeaking` | 0x650000 | 0x28 | Server mob speaking packet: decode, call TrySpeaking. |

### Collision/Body Rect (6)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `GetBodyRect` | 0x642140 | 0x114 | Get mob body collision rect. Uses m_pLayerAction for position, adjusts for flip (bNoFlip). Returns scaled rect based on mob height. |
| `GetAttackBodyRect` | 0x6443c0 | 0x20 | Get attack body rect (delegates to GetArrayBodyRectImpl). |
| `GetMultiBodyRect` | 0x6443e0 | 0x20 | Get multi-body rect (delegates to GetArrayBodyRectImpl). |
| `GetArrayBodyRectImpl` | 0x642400 | 0x158 | Implementation of body rect calculation with array of rects. |
| `GetHitPoint` | 0x642260 | 0xa7 | Get random hit point within body rect. |
| `GetHitPointHeightRand` | 0x642310 | 0xe5 | Get hit point with height-based randomization. |
| `IsRectIntersectWithTrapezoid` | 0x63b390 | 0xd5 | Check if rect intersects with trapezoid shape (for area attacks). |

### Effects (4)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `ShowCatchEffect` | 0x63b220 | 0xa3 | Show catch animation effect. |
| `ShowEffectByItem` | 0x63b2d0 | 0xbc | Show effect triggered by item (decode item ID, play effect). |
| `LoadEffectLayer` | 0x6458e0 | 0x666 | Load effect WZ layer for mob. |
| `LoadLayer` | 0x644900 | 0xfd4 | Load a WZ layer with position, flip, alpha. Generic layer loader used by many functions. |

### Bullets (3)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `MobBullet::ctor` | 0x6495b0 | 0xd9 | Bullet constructor: store start/end pos, timing, speed, sound path. |
| `MobBullet::vdtor` | 0x649690 | 0x3b | Bullet virtual destructor. |
| `SetBallDestPoint` | 0x63a130 | 0xfe | Calculate bullet destination point. Uses law of cosines for trajectory. |

### Multi-ball (3)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `IsMultiBallAttack` | 0x641100 | 0x49 | Check if current action is a multi-ball attack. |
| `SetMultiBallTarget` | 0x6438a0 | 0x2d7 | Set multi-ball target positions. |
| `SetRandTimeForAreaAttack` | 0x643b80 | 0xa5 | Set random delay times for area attack bullets. |

### Anger (4)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `CreateAngerIndicator` | 0x63cd70 | 0x2ec | Create anger gauge indicator layer. |
| `AnimateAngerIndicator` | 0x63d060 | 0x44e | Animate anger gauge fill/empty. |
| `ChangeAngerIndicator` | 0x63a100 | 0x2b | Update anger gauge value. |
| `InitAngerGaugeData` | 0x648b00 | 0x5b0 | Initialize anger gauge WZ layers. |
| `AngerGaugeFullChargeEffect` | 0x6490b0 | 0x1b4 | Full anger gauge charge visual effect. |

### Escort (7)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `SendCollisionEscort` | 0x641150 | 0x9e | Send escort collision packet. |
| `SendRequestEscortPath` | 0x6411f0 | 0x9c | Request escort movement path from server. |
| `SendEscortStopEndRequest` | 0x641290 | 0x97 | Send escort stop/end request. |
| `OnEscortFullPath` | 0x643d90 | 0x399 | Handle escort full path from server. |
| `OnEscortReturnBefore` | 0x649410 | 0x19a | Handle escort return-to-start. |
| `OnEscortStopSay` | 0x64c500 | 0x227 | Handle escort NPC dialog. |
| `UpdateEscortStopActRepeat` | 0x64c730 | 0x6c | Update escort stop action repeat timer. |

### Misc/Utility (14)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `MakeNameTag` | 0x646ae0 | 0x1806 | Create mob name tag WZ layer. StringPool paths for name tag bg. |
| `IsTargetInAttackRange` | 0x645f50 | 0xb88 | Check if target is within attack range. Complex multi-attack-type range check. |
| `SetLayerZ` | 0x63ab50 | 0x6d0 | Set Z-order for all mob layers. Formula: `10 * (3000 * footholdZ - footholdY) - 1073711833`. Special cases for specific template IDs (0x866E13-0x866E7D series). |
| `SetTimeBombTime` | 0x63b720 | 0x8b | Set time bomb detonation time. |
| `UpdateTimeBomb` | 0x643c30 | 0x155 | Update time bomb countdown, trigger explosion. |
| `OnBomb` | 0x650ec0 | 0x23a | Handle bomb explosion: area damage, screen shake. |
| `TryPickUpDrop` | 0x63ea60 | 0x8f | Try to pick up nearby drops (for bPickUpDrop mobs). |
| `SendDropPickUpRequest` | 0x644450 | 0x113 | Send drop pickup request to server. |
| `OnCatchEffect` | 0x63cd00 | 0x35 | Handle catch effect packet. |
| `OnEffectByItem` | 0x63cd40 | 0x2b | Handle item-based effect packet. |
| `OnIncMobChargeCount` | 0x63d500 | 0x27 | Handle mob charge count increment. |
| `OnMobSkillDelay` | 0x63d560 | 0x4c | Handle mob skill delay packet. |
| `OnNextAttack` | 0x6528a0 | 0x6e | Handle next attack notification from server. |
| `OnMobAttackedByMob` | 0x6436a0 | 0x1f4 | Handle mob-vs-mob damage notification. |

### Getters/Setters (25)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `GetMobID` | 0x63c5b0 | 0x17 | Return m_dwMobID (secure fuse). |
| `GetTemplate` | 0x639f30 | 0x7 | Return m_pTemplate. |
| `GetCurTemplate` | 0x639f40 | 0x1a | Return m_pTemplateByDoom or m_pTemplate. |
| `IsBossMob` | 0x439350 | 0x17 | Return m_pTemplate->bBoss. |
| `IsSuspended` | 0x63c5d0 | 0x1d | Return m_nSuspended != 0. |
| `GetOneTimeAction` | 0x63c5f0 | 0x17 | Return m_nOneTimeAction (secure fuse). |
| `IsLeft` | 0x63c610 | 0x2f | Return (m_nMoveAction & 1) == 0. |
| `IsImmovable` | 0x63c640 | 0x3f | Check nMoveAbility == 0 or position fixed. |
| `GetMoveAbility` | 0x63a690 | 0x17 | Return template nMoveAbility. |
| `IsNoFlip` | 0x63a6b0 | 0x21 | Return template bNoFlip. |
| `IsPosFixed` | 0x63a6e0 | 0x1c | Return template bPosFixed. |
| `IsActive` | 0x63ab30 | 0x14 | Check VecCtrl active state. |
| `GetVecCtrl` | 0x63c680 | 0x29 | Return m_pvc. |
| `GetActiveVecCtrl` | 0x63c6b0 | 0x29 | Return m_pvcActive. |
| `GetHeight` | 0x63c810 | 0x13f | Calculate mob display height from action frames. |
| `GetHalfWidth` | 0x63e790 | 0x1a9 | Calculate half-width from action frames. |
| `GetAttackInfo` | 0x641330 | 0x23 | Return MobAttackInfo by attack index. |
| `GetFoothold` | 0x93a1a0 | 0x1a | Return foothold from VecCtrl. |
| `GetPos` | 0x64cff0 | 0x29 | Return position from VecCtrl. |
| `GetPosPrev` | 0x64d020 | 0x29 | Return previous position. |
| `GetZMass` | 0x64cfa0 | 0x1a | Return foothold Z-mass. |
| `IsKindOf` | 0x64cfc0 | 0x25 | RTTI check (always returns CMob). |
| `GetType` | 0x64cf70 | 0x6 | Return mob type constant. |
| `GetRTTI` | 0x64cf80 | 0x6 | Return CMob::ms_RTTI_CMob. |
| `CalcCrc` | 0x63b5a0 | 0x15 | Calculate CRC checksum. |
| `GetCrc` | 0x63d530 | 0x2b | Return CRC. |
| `CheckDamagedByMob` | 0x63d4b0 | 0x4d | Check if mob was damaged by another mob. |
| `IsNotEnemyMob` | 0x639fb0 | 0x2a | Check if mob is not enemy (same team). |
| `IsMobOurTeam` | 0x63b4a0 | 0x68 | Check if mob is on our team (MCarnival). |
| `IsSamePhaseWithMe` | 0x63b510 | 0x55 | Check if mob is in same phase as local user. |
| `IsDazzledMobByMe` | 0x63b570 | 0x25 | Check if mob is dazzled by local user. |
| `IsRisingByToss` | 0x63a980 | 0x35 | Check if mob is being tossed (airborne). |
| `IsOnPlayingOneTimeAction` | 0x63e1d0 | 0x21 | Check if playing a one-time action. |
| `GetOneTimeActionRemain` | 0x63e6d0 | 0x53 | Get remaining time for current one-time action. |
| `GetRemainDamageInfoDelay` | 0x63e730 | 0x5d | Get remaining damage info display delay. |
| `GetPushedDamage` | 0x63b5c0 | 0xe5 | Calculate push-back damage from collision. |
| `GetRandomHitAction` | 0x639f70 | 0x30 | Pick random hit reaction action from template. |
| `GetCalcDamageStatIndex` | 0x748d80 | 0x7 | Return damage stat index for CalcDamage. |

### Secure Getters/Setters (12)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `SecureGet_m_nMobCtrlState` | 0x63a700 | 0x17 | Secure fuse m_nMobCtrlState. |
| `SecureGet_m_dwMobID` | 0x63a720 | 0x17 | Secure fuse m_dwMobID. |
| `SecureGet_m_nMP` | 0x63a740 | 0x17 | Secure fuse m_nMP. |
| `SecureGet_m_nMoveAction` | 0x63a760 | 0x17 | Secure fuse m_nMoveAction. |
| `SecureGet_m_tHitExpire` | 0x63a780 | 0x17 | Secure fuse m_tHitExpire. |
| `SecureGet_m_tLastHitExpire` | 0x63a7a0 | 0x17 | Secure fuse m_tLastHitExpire. |
| `SecureGet_m_tInitDelay` | 0x63a7c0 | 0x17 | Secure fuse m_tInitDelay. |
| `SecurePut_m_nMoveAction` | 0x63e610 | 0x1e | Secure tear m_nMoveAction. |
| `SecurePut_m_nOneTimeAction` | 0x63e630 | 0x1e | Secure tear m_nOneTimeAction. |
| `SecurePut_m_tHitExpire` | 0x63e650 | 0x1e | Secure tear m_tHitExpire. |
| `SecurePut_m_tLastHitExpire` | 0x63e670 | 0x1e | Secure tear m_tLastHitExpire. |
| `SecurePut_m_tInitDelay` | 0x63e690 | 0x1e | Secure tear m_tInitDelay. |

### Shoe/Movement (2)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `GetShoeAttr` | 0x640c20 | 0x2c | Return shoe attribute from VecCtrl. |
| `SetShoeAttr` | 0x641e50 | 0x2e1 | Set shoe attributes based on equipped items. |

### Misc (3)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `SetSuspended` | 0x640910 | 0x1c | Set m_nSuspended value. |
| `ResetGuided` | 0x6410b0 | 0x4a | Reset guided bullet state. |
| `SetGuided` | 0x644570 | 0x49 | Set guided bullet target. |
| `OnLayerZChanged` | 0x63b470 | 0x22 | Callback when layer Z changes. |
| `SetDamagedByMob` | 0x64b260 | 0x467 | Handle mob-vs-mob damage with damage calculation. |

### Inner Types (5)
| Function | Addr | Size | Description |
|----------|------|------|-------------|
| `TARGETINFO::ctor` | 0x639fa0 | 0x9 | TARGETINFO constructor (zero-init). |
| `ATTACKEFFECT::dtor` | 0x6447c0 | 0x18 | ATTACKENTRY destructor. |
| `MobBullet::ctor` | 0x6495b0 | 0xd9 | Bullet constructor. |
| `MobBullet::vdtor` | 0x649690 | 0x3b | Bullet virtual destructor. |

---

## Key Fields (CMob struct, 1512 bytes)

### Core Identity
- `m_dwMobID` (secure) — unique mob instance ID
- `m_pTemplate` / `m_pTemplateByDoom` — CMobTemplate pointer (doom replaces template)
- `m_nTeamForMCarnival` — MCarnival team assignment
- `m_nPhase` — mob phase

### Position/Physics
- `m_ptPos` / `m_ptPosPrev` (TSecType) — current and previous position
- `m_pvc` — main CVecCtrlMob (IWzVector2D)
- `m_pvcActive` — active CVecCtrlMob
- `m_pvcHead` — head position controller (StringPool 0x3D2)

### Animation
- `m_nMoveAction` (secure) — directional movement action (bit 0 = facing)
- `m_nOneTimeAction` (secure) — override action (attack, die, hit)
- `m_tActionDelay` (secure) — remaining action delay
- `m_aAction[]` — action frame arrays per action index

### Combat
- `m_lAttackEntry` — ZList of pending ATTACKENTRY
- `m_lDamageInfo` — ZList of DAMAGEINFO display entries
- `m_effectAttack` — current attack effect (sEffect, bLeft, tStart)
- `m_bAttackReady` — attack ready flag
- `m_tRushAttackEnd` / `m_nRushAttackIdx` — rush attack tracking

### Hit
- `m_tHitExpire` (secure) — when hit animation expires
- `m_tLastHitExpire` (secure) — last hit expire time
- `m_tInitDelay` (secure) — initial spawn delay

### Stats
- `m_stat` — MobStat struct (nStun_, nFreeze_, nWeb_, nDoom_, nDazzle_, nSeal_, nRiseByToss_, bDisable, etc.)
- `m_nMP` (secure) — mob MP

### Control
- `m_nMobCtrlState` (secure) — 0=idle, 1=normal, 2=suspended, 3=chase, 4=attack
- `m_nSuspended` (secure) — 0=active, 1=suspended, 2=dead

### Display
- `m_pLayerAction` — main action layer (IWzGr2DLayer)
- `m_lpLayerASAni` — affected skill animation layers
- `m_lpLayerASIcon` — affected skill icon layers
- `m_lAffectedSkillEntry` — ZList of AFFECTEDSKILLENTRY

### HP Indicator
- `m_pHPIndicator` — HP bar layer
- `m_nHPRatio` — HP percentage

### Bullets
- `m_Bullets` — BulletContainer of MobBullet
- `m_aMultiTargetForBall` — multi-target positions for ball attacks
- `m_aRandTimeforAreaAttack` — random delay array for area attacks

### Damage Timing
- `m_tLastPoisonDamage` — poison DOT cooldown
- `m_tLastVenomDamage` — venom DOT cooldown
- `m_tLastAmbushDamage` — ambush DOT cooldown
- `m_tLastObstacleDamage` — obstacle DOT cooldown
- `m_tLastHitByMob` — mob-vs-mob hit cooldown
- `m_tLastAreaAttack` — area attack cooldown

### Escort
- `m_dwSwallowCharacterID` — swallow target character
- `nEscortType` — escort type (1 = escort mob)

---

## State Machine

```
Init (from server packet)
  → State 0: Active (normal)
      → OnHit → ShowHitEffect → OneTimeAction = hit action → PrepareActionLayer
      → OnDamaged → ShowDamage + HPIndicator
      → DoAttack → ATTACKENTRY queued
      → ProcessAttack → rect intersection → SetDamaged on targets
      → GenerateMovePath → CMovePath created → movement
      → Update → frame tick (burned DOT, affected skills, bullets)
      
      Transitions:
        → State 1 (suspended): OnDie, OnDestructByMiss
        → State 3 (chase): ChaseTarget → GenerateMovePath with chase
        → State 4 (attack): DoAttack → ProcessAttack
        
  → State 1 (suspended=1): CVecCtrlMob paused
      → OnRevive → State 0
  
  → State 2 (suspended=2): Dead
      → PrepareActionLayer with die action
      → Clear affected skills, bullets, damage timers
      → Removed from CMobPool after delay
  
  → Doom state: m_pTemplateByDoom replaces m_pTemplate
      → All template reads go through CurTemplate check
```

---

## WZ Asset Paths

### Mob Template
- `Mob.wz/Mob/<templateID>/` — root mob data
- `Mob.wz/Mob/<templateID>/info/` — template properties

### Actions/Animation
- `CActionMan::LoadMobAction(templateID, actionIdx)` — loads frame entries
- `Mob.wz/Mob/<templateID>/<actionIdx>/` — action frame data

### HP Bar
- `Mob.wz/Mob/<templateID>/hp/` — HP bar frames (StringPool paths)
- StringPool 986 — attack effect WZ path template

### Name Tag
- StringPool for name tag background (used in MakeNameTag)

### Head Position
- StringPool 0x3D2 — head position controller WZ path

### Affected Skills
- `Mob.wz/Mob/<skillId>/` — affected skill visual data

### Effects
- `StringPool 986` — attack effect format string
- `CAnimationDisplayer::Effect_*` — various effect functions

### Speech
- StringPool for speech text (sIgnoreSymbols table filters certain chars)

---

## Sound Triggers

| Trigger | Sound | When |
|---------|-------|------|
| `play_mob_sound(templateID, SE_MOB_DIE, vol)` | Death sound | OnDie |
| `play_mob_sound(templateID, SE_MOB_ATTACK+n, vol)` | Attack sounds | DoAttack, ProcessAttack |
| `play_mob_sound(templateID, SE_MOB_MOVE, vol)` | Movement sound | OnMove |
| `play_mob_sound(templateID, SE_MOB_HIT, vol)` | Hit sound | OnHit |
| `play_skill_sound(33101005, SE_SKILL_USE, 0)` | Swallow skill | OnSwallowed |
| `get_sound_volume_by_pos(x, y)` | Volume calculation | All sound triggers |

---

## Packet Interactions

### Incoming (Server → Client)
| Opcode | Handler | Purpose |
|--------|---------|---------|
| Mob enter | `Init` | Spawn mob with full state |
| Mob leave | CMobPool | Remove mob |
| `OnMove` | Movement path update |
| `OnDamaged` | Damage display |
| `OnHit` | Client-side hit processing |
| `OnStatSet` / `OnStatReset` | Stat buff/debuff |
| `OnHPIndicator` | HP bar update |
| `OnAffected` | Affected skill update |
| `OnMobSpeaking` | Speech bubble |
| `OnCtrlAck` | Control acknowledgment |
| `OnSuspendReset` | Suspend/resume |
| `OnMobAttackedByMob` | Mob-vs-mob damage |
| `OnIncMobChargeCount` | Charge count |
| `OnMobSkillDelay` | Skill delay |
| `OnNextAttack` | Next attack |
| `OnCatchEffect` | Catch effect |
| `OnEffectByItem` | Item effect |
| `OnSpecialEffectBySkill` | Skill special effect |
| `OnEscortFullPath` | Escort path |
| `OnEscortReturnBefore` | Escort return |
| `OnEscortStopSay` | Escort dialog |

### Outgoing (Client → Server)
| Opcode | Function | Purpose |
|--------|----------|---------|
| 228 | `ApplyControl` | Mob control ack (distance encoding) |
| Various | `SendCollisionEscort` | Escort collision |
| Various | `SendRequestEscortPath` | Request escort path |
| Various | `SendEscortStopEndRequest` | Escort stop/end |
| Various | `SendDropPickUpRequest` | Drop pickup |

---

## Gap Analysis vs TS Implementation

### Implemented in TS (MobLook.ts + MobController.ts + MobStat.ts)
- [x] Basic mob rendering and animation
- [x] HP bar display
- [x] Name tag
- [x] Damage numbers
- [x] Basic movement (chase, wander)
- [x] Attack selection
- [x] Hit reaction
- [x] Death animation
- [x] Stat system (basic)
- [x] Mob template loading

### Partially Implemented
- [ ] **SetLayerZ** — TS has basic Z-ordering but OG has complex formula `10*(3000*footholdZ - footholdY) - 1073711833` with special template ID overrides
- [ ] **ShowAffectedSkill** — TS shows affected skills but OG loads specific WZ layers per skill type with position tracking
- [ ] **ProcessAttack** — TS handles melee/basic but OG has 4 attack types (0=melee rect, 1=melee target, 2=bullet, 3/4=area trapezoid)
- [ ] **DoAttack** — TS has basic attack but OG has full bullet system (MobBullet), area attack warnings, rush attack mechanics
- [ ] **GenerateMovePath** — TS has basic pathfinding but OG has 10 parameters including chase, fly, jump, teleport, rise-by-toss
- [ ] **OnHit** — TS has basic hit but OG handles 15 parameters including toss, rise-by-toss, guided bullets, combo increment
- [ ] **AddDamageInfo** — TS shows damage but OG has delayed damage display system with DAMAGEINFO queue

### Missing
- [ ] **MobBullet system** — Complete bullet projectile system (constructor, update, collision, removal)
- [ ] **Anger gauge** — Complete anger gauge (CreateAngerIndicator, AnimateAngerIndicator, AngerGaugeFullChargeEffect)
- [ ] **Escort system** — Full escort mob AI (7 functions)
- [ ] **Time bomb** — SetTimeBombTime, UpdateTimeBomb, OnBomb
- [ ] **Doom transformation** — OnDoomed (template replacement)
- [ ] **Swallow attack** — OnSwallowed (Pinkbean mechanic)
- [ ] **OnDestructByMiss** — Death without drops
- [ ] **TryPickUpDrop** — Mob drop pickup AI
- [ ] **SetShoeAttr** — Equipment-based movement attributes
- [ ] **OnResolveMoveAction** — Complex move action resolution (ladder/rope/fly states)
- [ ] **IsTargetInAttackRange** — Complex multi-type attack range check (0xb88 bytes)
- [ ] **TryFirstAttack** — Initial aggro system
- [ ] **TryFirstSelfDestruction** — Self-destruct timer
- [ ] **SetMultiBallTarget** — Multi-target ball attacks
- [ ] **SetRandTimeForAreaAttack** — Area attack delay randomization
- [ ] **OnLayerZChanged** — Layer Z change callback
- [ ] **ShiftAffectedSkillAnimation** — Affected skill position tracking
- [ ] **SetAffectedLayerPos** — Affected layer position updates
- [ ] **Secure getters/setters** — All 12 secure fuse/tear functions (anti-cheat)
- [ ] **CalcCrc/GetCrc** — Mob state verification
- [ ] **OnSuspendReset** — Suspend/resume control flow
- [ ] **SetBallDestPoint** — Bullet trajectory calculation
- [ ] **UpdateEscortStopActRepeat** — Escort action repeat
- [ ] **MakeNameTag** — Full name tag creation (0x1806 bytes, very complex)
- [ ] **LoadLayer/LoadEffectLayer** — Generic WZ layer loading
- [ ] **SetFrameInfo** — Action frame processing (0x843 bytes)
- [ ] **InitAngerGaugeData** — Anger gauge WZ initialization (0x5b0 bytes)

### Key Formulas/Constants
- **Z-order**: `10 * (3000 * footholdZ - footholdY) - 1073711833` (general case)
- **Special Z-order**: Template IDs 0x866E13-0x866E7D have unique Z offsets (-1073711836 to -1073711844)
- **Hit cooldown**: Boss mobs 10000ms, normal mobs based on action delay
- **Mob-vs-mob hit cooldown**: 2000ms normal, 1500ms escort
- **Die actions**: If m_nDeadType==3 → action 22, else random in [10, nDieCount+9]
- **Move action encoding**: bit 0 = facing direction, upper bits = base action
- **Attack action base**: nAction - 13 = attack index
- **Screen shake forces**: 30.0 (boss death), 10.0 (specific mobs), 5.0 (other specific mobs)
- **ApplyControl distance encoding**: `abs(dx)/10 + abs(dy)/3 + (job==0x12||0x13 ? 100 : 0)`
