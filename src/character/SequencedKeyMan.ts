// IDA_NEW_GAPS.md Section 5: CFinishAttack / CSequencedKeyMan (melee combo-finisher
// auto-trigger). Decompiled from Maplestory95.exe.i64 (v95 leaked IDB) via the
// live Hex-Rays MCP (headless) on 2026-07-01. Sources:
//   KeySequenceElement::KeySequenceElement   0x6de400  (scancode, tExpire, bDown)
//   CDoubleAttack {ctor 0x6de530 exp420, GetSkillID 0x6de560, DoAction 0x6dfef0}
//   CTripleAttack {ctor 0x6de590 exp660, GetSkillID 0x6de5b0, DoAction 0x6e0050}
//   CFinalCharge  {ctor 0x6de610(bLeft), CheckPreOrder 0x6de640==21100001, DoAction 0x6e0200→21100002}
//   CFinalBlow    {ctor 0x6de680, CheckPreOrder 0x6de6b0==triple, DoAction 0x6e0420→21120005/20000016}
//   CFinalToss    {ctor 0x6de6e0 m_nSkillID=21110003, CheckPreOrder 0x6de710==21100001}
//   CFinishAttack {ctor 0x6de730 exp1000, GetSkillID 0x6de760→32001001, DoAction 0x6e0f80}
//   CSequencedKeyMan::{Update 0x6df980, ReserveAction 0x6dfd60, Restore 0x6e11f0}
//
// CSequencedKeyMan::Restore (0x6e11f0) builds a ZMap<key,KeySequence> of tap
// chains. The recovered table (nAttack = bound attack key; DIK scancodes
// 72/75/77/80 = Up/Left/Right/Down):
//   key2 double: [attack↓480][attack↑][CDoubleAttack attack↓420][attack↑]
//   key3 triple: [CTripleAttack attack↓660][attack↑]            (preorder = double)
//   key4 finalChargeL: [←(75)↓600][CFinalCharge bLeft=1]        (preorder = 21100001)
//   key5 finalChargeR: [→(77)↓600][CFinalCharge bLeft=0]        (preorder = 21100001)
//   key6 finalBlow:    [↓(80)↓300][CFinalBlow]                  (preorder = triple)
//   key7 finalToss:    [↑(72)↓300][CFinalToss 21110003]         (preorder = 21100001)
//   (Aran key-up FinishAttack chain follows at key8+.)
//
// This TS port models the OG generic KeySequenceElement matcher as a compact
// per-tier finisher table (FINISHER_TABLE below): a mid-swing attack tap
// advances double→triple, and after a triple a held direction + tap fires the
// Mihile Final* finisher for that direction; the Aran FinishAttack is a
// standalone directionless chain start for the Aran/Legend job range. Every
// entry is gated by CSkillInfo::GetSkillLevel(skillId) > 0 exactly like each
// DoAction body, so a job that has not learned a finisher never fires it.
//
// OG's mid-swing gate reads CAvatar::GetOneTimeAction() against literal engine
// action-enum integers (145..147 Double, 149.. Final, 25..28 Aran) with no TS
// equivalent (CharLook tracks one-time actions by string key). This port
// substitutes the boolean isAttacking() (CharLook.IsPlayingOneTimeAction) —
// faithful to what the OG check means (player is mid an attack swing).
//
// Deferred (needs OG Process/ReserveAction state machine + input infra not in
// this client): the exact tExpire-from-sequence-start timing (this port uses
// each tap's held-duration against the element's expire window), the key-UP
// ignore semantics of KeySequenceElementIgnoreUp.
// Aran per-action dummy-skill variants (GetDummySkillID 0x6de770: 32001007-011)
// are now implemented via ComboCastContext.aranFinishSkillId callback.
// CDashTrigger (0x6df5f0, directional dash → CUser::GetDashingSkill) is a
// separate direction-only sequence, not a melee finisher, and is left to the
// movement path.

export type ComboTier = 'double' | 'triple';
export type FinisherDirection = 'none' | 'left' | 'right' | 'up' | 'down';

export interface ComboCastContext {
  /** CWvsContext::GetCharacterData().job; OG compares against 2000 (Legend/Beginner). */
  jobId: number;
  /** CSkillInfo::GetSkillLevel(charData, skillId). */
  getSkillLevel(skillId: number): number;
  /** CAvatar::GetOneTimeAction() in the active-swing range in OG; true while a swing animation plays. */
  isAttacking(): boolean;
  /** Currently-held movement direction, for the Mihile Final* finishers. Defaults to 'none'. */
  direction?(): FinisherDirection;
  /**
   * OG: CFinishAttack::GetDummySkillID (0x6de770) returns a per-action dummy
   * skill ID (32001007-32001011) used for the finish-attack animation. The
   * caller supplies the correct variant based on combo state/action.
   * Fallback: returns undefined (uses the default 32001001).
   */
  aranFinishSkillId?(): number | undefined;
}

// OG: CDoubleAttack::GetSkillID (0x6de560) / CTripleAttack::GetSkillID (0x6de5b0).
// Job != 2000 (Legend beginner) uses the Warrior-tree IDs; 2000 uses innate IDs.
export function comboSkillId(tier: ComboTier, jobId: number): number {
  const isBeginner = jobId === 2000;
  if (tier === 'double') return isBeginner ? 20000014 : 21000002;
  return isBeginner ? 20000015 : 21100001;
}

/** One finisher in the recovered CSequencedKeyMan::Restore table. */
interface FinisherDef {
  name: string;
  /** Chain tier that must have just fired for this to be eligible ('none' = chain start). */
  fromTier: 'none' | 'double' | 'triple';
  /** Tier the chain advances to after this fires ('none' = chain ends/restarts). */
  advanceTo: 'none' | 'double' | 'triple';
  /** Required held direction, or 'none' for a directionless attack tap. */
  direction: FinisherDirection;
  /** KeySequenceElement tExpire window (ms) for the triggering tap. */
  tapWindowMs: number;
  /** Skill this finisher casts (job-aware), matching the DoAction body. */
  skillId(jobId: number, ctx?: ComboCastContext): number;
  /** Optional job gate (Aran FinishAttack). Omitted = eligible for any job (still skill-gated). */
  jobEligible?(jobId: number): boolean;
}

// Order matters only within a tier: the first skill-learned match wins.
const FINISHER_TABLE: FinisherDef[] = [
  { name: 'DoubleStab', fromTier: 'none', advanceTo: 'double', direction: 'none', tapWindowMs: 420,
    skillId: (j) => comboSkillId('double', j) },
  // Aran FinishAttack (0x6de730/0x6de760): directionless chain start, key-up window 1000ms,
  // gated to the Aran/Legend job range so it never shadows Warrior DoubleStab.
  // GetDummySkillID (0x6de770) returns 32001007-32001011 per current action;
  // the caller supplies the variant via ComboCastContext.aranFinishSkillId.
  { name: 'AranFinish', fromTier: 'none', advanceTo: 'none', direction: 'none', tapWindowMs: 1000,
    skillId: (_j, ctx) => ctx?.aranFinishSkillId?.() ?? 32001001, jobEligible: (j) => j >= 2000 && j <= 2112 },
  { name: 'TripleStab', fromTier: 'double', advanceTo: 'triple', direction: 'none', tapWindowMs: 660,
    skillId: (j) => comboSkillId('triple', j) },
  { name: 'FinalChargeL', fromTier: 'triple', advanceTo: 'none', direction: 'left', tapWindowMs: 600,
    skillId: () => 21100002 },
  { name: 'FinalChargeR', fromTier: 'triple', advanceTo: 'none', direction: 'right', tapWindowMs: 600,
    skillId: () => 21100002 },
  { name: 'FinalToss', fromTier: 'triple', advanceTo: 'none', direction: 'up', tapWindowMs: 300,
    skillId: () => 21110003 },
  { name: 'FinalBlow', fromTier: 'triple', advanceTo: 'none', direction: 'down', tapWindowMs: 300,
    skillId: (j) => (j === 2000 ? 20000016 : 21120005) },
];

/**
 * Generic-engine subset of OG CSequencedKeyMan: detects the attack-key tap
 * that lands while the player is already mid-swing and reserves the eligible
 * finisher to fire once the current swing animation ends (OG:
 * CSequencedKeyMan::Update 0x6df980 / ReserveAction 0x6dfd60).
 */
export class SequencedKeyMan {
  private _keyDownTick = -1;
  private _wasAttackDown = false;
  private _lastTier: 'none' | 'double' | 'triple' = 'none';
  private _reserved: FinisherDef | null = null;

  /** Call once per frame when only the current held-key state is available. */
  observeAttackState(isDown: boolean, nowMs: number, ctx: ComboCastContext): void {
    if (isDown !== this._wasAttackDown) {
      this.onAttackKey(isDown, nowMs, ctx);
      this._wasAttackDown = isDown;
    }
  }

  /** Call on every down/up transition of the bound attack scancode. */
  onAttackKey(down: boolean, nowMs: number, ctx: ComboCastContext): void {
    if (down) {
      this._keyDownTick = nowMs;
      return;
    }
    if (this._keyDownTick < 0) return;
    const heldMs = nowMs - this._keyDownTick;
    this._keyDownTick = -1;
    if (!ctx.isAttacking()) {
      // OG: DoAction's mid-swing branch only runs when GetOneTimeAction() is in
      // the active-swing range; otherwise the tap is a plain attack, chain resets.
      this._lastTier = 'none';
      return;
    }
    const dir = ctx.direction?.() ?? 'none';
    // Try to continue the current chain; if nothing matches (e.g. a plain tap
    // after a triple with no direction held), fall back to a fresh chain start,
    // matching OG restarting the sequence at the DoubleStab element.
    let f = this._pick(this._lastTier, dir, heldMs, ctx);
    if (!f && this._lastTier !== 'none') f = this._pick('none', dir, heldMs, ctx);
    if (!f) { this._lastTier = 'none'; return; }
    this._reserved = f;
  }

  private _pick(tier: 'none' | 'double' | 'triple', dir: FinisherDirection, heldMs: number, ctx: ComboCastContext): FinisherDef | null {
    for (const f of FINISHER_TABLE) {
      if (f.fromTier !== tier) continue;
      if (f.direction !== 'none' && f.direction !== dir) continue;
      if (heldMs > f.tapWindowMs) continue;
      if (f.jobEligible && !f.jobEligible(ctx.jobId)) continue;
      if (ctx.getSkillLevel(f.skillId(ctx.jobId, ctx)) <= 0) continue;
      return f;
    }
    return null;
  }

  /**
   * Call once per frame. Returns the skill ID to cast (GameSender.UseSkill)
   * once the swing that triggered the reservation has finished, or null.
   */
  update(ctx: ComboCastContext): number | null {
    if (!this._reserved || ctx.isAttacking()) return null;
    const f = this._reserved;
    this._reserved = null;
    this._lastTier = f.advanceTo;
    return f.skillId(ctx.jobId, ctx);
  }

  /** OG: CSequencedKeyMan::Clear (0x6def40) — reset on field change/death. */
  clear(): void {
    this._keyDownTick = -1;
    this._wasAttackDown = false;
    this._lastTier = 'none';
    this._reserved = null;
  }
}
