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
export declare function comboSkillId(tier: ComboTier, jobId: number): number;
/**
 * Generic-engine subset of OG CSequencedKeyMan: detects the attack-key tap
 * that lands while the player is already mid-swing and reserves the eligible
 * finisher to fire once the current swing animation ends (OG:
 * CSequencedKeyMan::Update 0x6df980 / ReserveAction 0x6dfd60).
 */
export declare class SequencedKeyMan {
    private _keyDownTick;
    private _wasAttackDown;
    private _lastTier;
    private _reserved;
    /** Call once per frame when only the current held-key state is available. */
    observeAttackState(isDown: boolean, nowMs: number, ctx: ComboCastContext): void;
    /** Call on every down/up transition of the bound attack scancode. */
    onAttackKey(down: boolean, nowMs: number, ctx: ComboCastContext): void;
    private _pick;
    /**
     * Call once per frame. Returns the skill ID to cast (GameSender.UseSkill)
     * once the swing that triggered the reservation has finished, or null.
     */
    update(ctx: ComboCastContext): number | null;
    /** OG: CSequencedKeyMan::Clear (0x6def40) — reset on field change/death. */
    clear(): void;
}
//# sourceMappingURL=SequencedKeyMan.d.ts.map