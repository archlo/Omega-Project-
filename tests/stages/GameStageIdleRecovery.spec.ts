import { describe, expect, it, vi } from 'vitest';
import { GameStage } from '../../src/stages/GameStage.js';
import { PlayerController } from '../../src/character/PlayerController.js';
import { Stance } from '../../src/character/Stance.js';

// OG ground truth (v95 IDB):
// - CWvsContext::TryRecovery @0x9D4020 (called every frame from Update
//   @0x9EA7F0): HP/MP regen only while position is unchanged since the last
//   frame AND the action is stand-family; timers hit 10000ms -> heal
//   rate*10 HP / rate*3 MP via SendStatChangeRequest (opcode 100).
// - CUserLocal::HandleCtrlKeyDown @0x9326B0 + TryDoingNormalAttack: one swing
//   per Ctrl press; while the one-time action plays the character must not
//   slide (GameStage locks movement input for the swing duration).

function makeStage(): { stage: any; sent: any[] } {
  const fh = {
    Id: 1, X1: -100, Y1: 0, X2: 100, Y2: 0,
    Uvx: 1, Uvy: 0, Length: 200, Force: 0, Drag: 1, IsWall: false,
    ForbidFallDown: false, YAt: () => 0,
  };
  const field = {
    GetFoothold: () => fh,
    GetFootholdBelow: () => fh,
    GetLadderOrRope: () => null,
    GetCrossCandidate: () => [],
    Info: { FieldWalk: 1, FieldDrag: 1, Swim: false },
  };
  const physics = new PlayerController(field as any);
  physics.Position = { x: 0, y: 0 };
  (physics as any)._grounded = true;
  (physics as any)._currentFoothold = 1;
  (physics as any)._footholdPos = 100;

  const sent: any[] = [];
  const stage: any = Object.create(GameStage.prototype);
  stage._physics = physics;
  stage._player = null;
  stage._isPlayerDead = false;
  stage._stats = { hp: 50, maxHp: 100, mp: 30, maxMp: 100, level: 10, str: 5, dex: 4, intStat: 4, luk: 4 };
  stage.game = { session: { send: (p: any) => sent.push(p), sendRaw: () => {} } };
  return { stage, sent };
}

describe('idle HP/MP recovery (OG CWvsContext::TryRecovery 0x9D4020)', () => {
  it('sends StatChangeRequest (opcode 100) after 10s stationary on a stand action', () => {
    const { stage, sent } = makeStage();
    // 11 seconds of standing still at the same position.
    for (let i = 0; i < 660; i++) stage._updateIdleRecovery(1000 / 60);
    const statChanges = sent.filter((p) => p && p.header === 100);
    expect(statChanges.length).toBeGreaterThanOrEqual(1); // HP tick (+ MP)
    expect(stage._restForHpMs).toBeLessThan(10000);
  });

  it('does not recover while moving (position changed resets timers)', () => {
    const { stage, sent } = makeStage();
    for (let i = 0; i < 660; i++) {
      stage._physics.Position = { x: i * 0.001, y: 0 }; // moving every frame
      stage._updateIdleRecovery(1000 / 60);
    }
    expect(sent.filter((p) => p && p.header === 100).length).toBe(0);
    expect(stage._restForHpMs).toBe(0);
  });

  it('does not recover on non-stand actions', () => {
    const { stage, sent } = makeStage();
    (stage._physics as any)._grounded = false;
    stage._physics.Stance = Stance.Jump;
    for (let i = 0; i < 660; i++) stage._updateIdleRecovery(1000 / 60);
    expect(sent.filter((p) => p && p.header === 100).length).toBe(0);
  });
});

describe('melee swing input lock (single-fire plant)', () => {
  it('_tryMeleeAttack locks movement input and flags the swing window', () => {
    const { stage } = makeStage();
    expect(vi.isMockFunction(stage.game.session.send)).toBe(false);
    stage._mobs = new Map();
    stage._reactors = new Map();
    stage._attackCooldown = 0;
    stage._tryMeleeAttack();
    expect(stage._meleeSwingActive).toBe(true);
    expect(stage._physics.InputLocked).toBe(true);
    expect(stage._attackCooldown).toBe(GameStage.AttackCooldownSeconds);
  });
});
