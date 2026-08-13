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