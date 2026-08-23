import { describe, expect, it, vi } from 'vitest';
import { GameStage } from '../../src/stages/GameStage.js';

// OG: CUserLocal::OnSetDead @0x903FC0 → UI_OpenRevive stamps m_tReviveDialog;
// CWvsContext::Update opens CUIRevive exactly when now - m_tReviveDialog > 2200.
// The revive prompt must NOT be tied to the tombstone-fall landing.
describe('GameStage revive dialog timing (OG CWvsContext::Update)', () => {
  it('opens the revive panel 2200ms after death', () => {
    const stage: any = Object.create(GameStage.prototype);
    stage._isPlayerDead = true;
    stage._reviveDialogClockMs = 0;
    const panel = { Open: vi.fn(), Close: vi.fn() };
    stage._revivePanel = panel;

    stage._updateReviveDialog(1000);
    expect(panel.Open).not.toHaveBeenCalled();

    stage._updateReviveDialog(1199);
    expect(panel.Open).not.toHaveBeenCalled();

    stage._updateReviveDialog(1);
    expect(panel.Open).toHaveBeenCalledTimes(1);
  });

  it('does not re-open after the clock is consumed', () => {
    const stage: any = Object.create(GameStage.prototype);
    stage._isPlayerDead = true;
    stage._reviveDialogClockMs = 0;
    const panel = { Open: vi.fn() };
    stage._revivePanel = panel;
    stage._updateReviveDialog(5000);
    expect(panel.Open).toHaveBeenCalledTimes(1);
    stage._updateReviveDialog(5000);
    expect(panel.Open).toHaveBeenCalledTimes(1);
  });

  it('does nothing once revived (clock reset to -1)', () => {
    const stage: any = Object.create(GameStage.prototype);
    stage._isPlayerDead = false;
    stage._reviveDialogClockMs = -1;
    const panel = { Open: vi.fn() };
    stage._revivePanel = panel;
    stage._updateReviveDialog(99999);
    expect(panel.Open).not.toHaveBeenCalled();
  });
});

// OG: CUserLocal::TryDoingNormalAttack @0x9123C0 pre-conditions are ONLY
// !IsImmovable / !IsOnPlayingOneTimeAction / !IsAttract / !IsPreparingSkill /
// !GetLadderOrRope — walking is NOT a blocker, and CUser::SetAttackAction
// @0x8E70B0 never touches the player's velocity. So a melee attack must not
// stop the walk.
describe('GameStage melee attack while walking (OG TryDoingNormalAttack)', () => {
  function makeStage(): any {
    const stage: any = Object.create(GameStage.prototype);
    stage._physics = {
      Position: { x: 100, y: 200 },
      FacingLeft: false,
      StopWalking: vi.fn(),
    };
    stage._player = { PickAttackAction: () => 'swingO1', PlayAttackAction: vi.fn(), IsPlayingOneTimeAction: false };
    stage._mobs = new Map();
    stage._equip = { equippedWeaponItemId: null };
    stage._itemIcons = null;
    stage._job = 0;
    stage._stats = { str: 4, dex: 4, intStat: 4, luk: 4 };
    stage._mobSounds = null;
    stage._dmgNumbers = null;
    stage._battleRecord = null;
    stage._skill = { setDamageMeterSummary: vi.fn() };
    stage._mobCtl = new Map();
    stage._fieldKey = 0;
    stage._masteryFromSkills = 0;
    stage.game = { session: { sendRaw: vi.fn() } };
    return stage;
  }

  it('does not stop walking when attacking', () => {
    const stage = makeStage();
    stage._tryMeleeAttack();
    expect(stage._physics.StopWalking).not.toHaveBeenCalled();
  });

  it('still sends the melee attack packet', () => {
    const stage = makeStage();
    stage._tryMeleeAttack();
    expect(stage.game.session.sendRaw).toHaveBeenCalledTimes(1);
  });
});

// OG CUser::OnSetDead @0x8E4250: the tomb/revive point is clamped to the
// foothold underneath (x, y-20); when that ground is >80px below (airborne),
// (x+15,y-20) then (x-15,y-20) are probed and whichever succeeds wins. The
// body layers' alpha is set to 0 instantly and fades back in over 1250ms.
describe('GameStage local death: foothold clamp + corpse alpha fade', () => {
  function makeStage(groundAt: number | null): any {
    const stage: any = Object.create(GameStage.prototype);
    stage._isPlayerDead = false;
    stage._physics = { Position: { x: 100, y: 50 }, SetDead: vi.fn() };
    stage._player = { PlayOneTimeAction: vi.fn(), container: { alpha: 1 } };
    stage._field = groundAt === null ? null : {
      GetFootholdBelow: (_x: number, y: number) => ({ YAt: () => Math.max(groundAt!, y + 350) }),
    };
    stage._tombstone = { Spawn: vi.fn(), Reset: vi.fn() };
    stage._chatBalloon = { Clear: vi.fn() };
    stage._localCharId = 7;
    stage._reviveDialogClockMs = -1;
    return stage;
  }

  it('clamps the tomb spawn to the ground when the death happens mid-air', () => {
    const stage = makeStage(400);
    // Ground at 400 vs body at 50 → airborne path; all three probes succeed
    // (mock returns max(400, y+350)) → OG takes the x-15 result.
    stage._applyLocalDeath();
    const spawn = stage._tombstone.Spawn.mock.calls[0][0];
    expect(spawn.y).toBe(400);
    expect(spawn.x).toBe(85);
    expect(stage._isPlayerDead).toBe(true);
    expect(stage._physics.SetDead).toHaveBeenCalledWith(true);
    expect(stage._reviveDialogClockMs).toBe(0);
  });

  it('hides the corpse instantly and schedules the 1250ms fade-in', () => {
    const stage = makeStage(null);
    stage._applyLocalDeath();
    expect(stage._player.container.alpha).toBe(0);
    expect(stage._deathFadeMs).toBe(0);
    expect(stage._chatBalloon.Clear).toHaveBeenCalledWith(7);
  });

  it('revive restores alpha and resets the tween', () => {
    const stage = makeStage(null);
    stage._applyLocalDeath();
    stage._player.container.alpha = 0.5;
    stage._deathFadeMs = 600;
    stage._applyLocalRevive();
    expect(stage._player.container.alpha).toBe(1);
    expect(stage._deathFadeMs).toBe(-1);
    expect(stage._tombstone.Reset).toHaveBeenCalled();
  });

  it('death is idempotent', () => {
    const stage = makeStage(null);
    stage._applyLocalDeath();
    stage._applyLocalDeath();
    expect(stage._tombstone.Spawn).toHaveBeenCalledTimes(1);
  });
});