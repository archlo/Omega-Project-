# CMob Full IDA Audit — 147/149 Methods Decompiled

## Summary
- **147/149 CMob methods decompiled** via MCP (GenerateMovePath + LoadLayer too large)
- **~150 methods total** in OG CMob (1512-byte struct, inherits CLife)
- **Current TS**: MobLook (385 lines) + MobController (402 lines) + MobInfoService (238 lines) + MobStat (215 lines, new)
- **147 decompilation files** in `ida_output/cmob_*_clean.txt`

## CMob Class Structure (1512 bytes)
Key fields from v95_symbols.txt:
```
+0000 CLife (base class)
+0088 m_nMobChargeCount, m_bAttackReady, m_nAngerGaugeCount
+00A4 m_effectAttack (ATTACKEFFECT: tStart, bLeft, nAttackIdx)
+00B0 m_lAffectedSkillEntry (ZList<AFFECTEDSKILLENTRY>)
+00C4 m_lAttackEntry (ZList<ATTACKENTRY>)
+0104 m_pvc (VecCtrl - movement controller)
+0108 m_pvcActive (VecCtrl - active controller)
+010C m_pvcHead (VecCtrl - head position)
+011C m_nMobCtrlState (-1=idle, -2=waiting, -3=active, 1=moving, 3/4=attacking)
+0128 m_nMobCtrlSN (control sequence number)
+0130 m_nSkillCommand, m_nSLV (skill command/level)
+0168 m_dwMobID (unique mob instance ID)
+0174 m_pTemplate (CMobTemplate*)
+0178 m_pTemplateByDoom (CMobTemplate* for doom state)
+017C m_nMP (secure int)
+0188 m_stat (MobStat - 568 bytes!)
+03D0 m_nMoveAction (secure int - animation action)
+03DC m_nOneTimeAction (secure int - one-shot action)
+03E8 m_tHitExpire (secure int - hit cooldown)
+0400 m_posFrame (animation frame position)
+0428 m_rcBody (tagRECT - body collision)
+0458 m_aAction (ZArray - action frame data)
+04AC m_lDamageInfo (ZList<DAMAGEINFO>)
+04C0 m_lHitEffect (ZList<HITEFFECT>)
+04D4 m_lDropPickUpLog (ZList<DROPPICKUP>)
+04E8 m_pLayerAction (IWzGr2DLayer)
+04F0 m_pLayerHPTag (IWzGr2DLayer)
+04F4 m_pEffectLayer (IWzGr2DLayer)
+04F8 m_pLayerAngerTag (IWzGr2DLayer)
+0508 m_pCanvasHPIndicator (IWzCanvas)
+0570 m_aMultiTargetForBall (ZArray<tagPOINT>)
+0578 m_delaySkill (DelaySkill: tSkillDelayTime, nSkillID)
+0590 m_lpStatChangeReserved (ZList<ReservedPacket>)
+05A4 m_bChasing (TSecType<int>)
+05B0 m_tTimeBomb (int)
+05D0 m_Bullets (MobBullet::Container)
```

## Decompile Statistics
- **Total files**: 147 clean decompilations
- **Total size**: ~1.2MB of decompiled C++ code
- **Key functions**: Init (failed - too large), Update (1KB), OnHit (16KB), ProcessAttack (17KB), DoAttack (21KB), IsTargetInAttackRange (21KB), SetLayerZ (11KB), ProcessStatSet (14KB), TrySpeaking (15KB)

## Gap Analysis

### Implemented (in existing TS)
1. ✅ Animation states (MobLook: Stand, Move, Attack, Hit, Die, Fly, etc.)
2. ✅ Movement AI (MobController: Walk, Chase, Fly, Idle)
3. ✅ WZ loading (MobLook.Load: animation frames)
4. ✅ Info parsing (MobInfoService: stats, attacks, skills)
5. ✅ HP bar (MobLook._drawHpBar)
6. ✅ Name tag (MobLook._addNameTag)
7. ✅ Hit flash (MobLook.OnHit)
8. ✅ Speech bubble (MobLook.Say)
9. ✅ Status badges (MobLook.SetStatusBadge)
10. ✅ Attack selection (MobController._pickAttack)
11. ✅ Knockback (MobController.ApplyHitKnockback)
12. ✅ MobStat system (MobStat.ts: 80+ stat types, effective stats, tick)

### NOT Implemented (critical gaps)
1. ❌ **MobStat integration** — MobStat exists but not wired to MobLook/Controller
2. ❌ **OnDamaged** — Server damage packet → ShowDamage + HP bar
3. ❌ **OnHit** — Full 15-param hit processing (damage calc, sound, effects, combo)
4. ❌ **OnDie** — Death processing (die animation, revive, drops)
5. ❌ **ShowDamage** — Damage number positioning + display
6. ❌ **ShowHitEffect** — Hit visual effects
7. ❌ **ProcessAttack / DoAttack** — Attack execution with bullets
8. ❌ **OnMove** — Server movement packet processing
9. ❌ **OnCtrlAck** — Control acknowledgment (MP, skill, state)
10. ❌ **SetLayerZ** — Z-layer positioning for draw order
11. ❌ **GetBodyRect / GetAttackBodyRect** — Collision rectangles
12. ❌ **CreateHPIndicator / ShowHPIndicator** — Boss HP bar
13. ❌ **PrepareActionLayer** — Animation frame management
14. ❌ **SetMoveAction / GetCurrentAction** — Action state management
15. ❌ **Affected skills** — Skill effects on mobs
16. ❌ **Anger gauge** — Boss anger indicator
17. ❌ **Escort system** — Escort mob AI
18. ❌ **Bullets** — MobBullet system
19. ❌ **Speaking** — Mob speech system
20. ❌ **Pick up drops** — Mob pickup behavior

## Files Created/Modified
- `src/character/MobStat.ts` (215 lines) — Full OG MobStat class with 80+ stat types
- `ida_output/cmob_audit.md` — Detailed gap analysis
- `ida_output/decompile_cmob.cjs` — MCP decompile script (149 methods)
- `ida_output/retry_cmob.cjs` / `retry_cmob2.cjs` — Retry scripts
- `ida_output/cmob_*_clean.txt` — 147 decompilation files
