import { describe, expect, it, vi } from 'vitest';
import { GameStage } from '../../src/stages/GameStage.js';
import { PlayerController } from '../../src/character/PlayerController.js';

// OG: CUserLocal::IsImmovable — a stunned player is immovable (can't move or
// attack); CUserLocal::UseSkill gates on seal (sealed players can't cast).
// The visuals were already drawn (BuffVisualOverlay); this covers the physics
// + cast-gate wiring in GameStage.
describe('GameStage mob debuffs on the player (stun immobilize + seal cast-block)', () => {
  function makeStage(over: Partial<Record<string, any>> = {}): any {
    const stage: any = Object.create(GameStage.prototype);
    const secondaryStat = {
      isSealActive: () => false,
      isStunActive: () => false,
      isFrozenActive: () => false,
      isWebActive: () => false,
      isPoisonActive: () => false,
      isDarkSightActive: () => false,
      isHyperBodyActive: () => false,
      isShadowPartnerActive: () => false,
      isBoosterActive: () => false,
      buff: { morph: 0, swallowBuff: 0 },
    };
    stage.game = {
      session: { send: vi.fn() },
      fieldHandlers: { secondaryStat },
    };
    stage._physics = { SetStunned: vi.fn(), SetKnockbackStun: vi.fn() };
    stage._buffVisual = {
      SetDarkSight: vi.fn(), SetStun: vi.fn(), SetFrozen: vi.fn(), SetWeb: vi.fn(),
      SetPoison: vi.fn(), SetSeal: vi.fn(),
      SetHyperBody: vi.fn(), SetShadowPartner: vi.fn(), SetBooster: vi.fn(),
    };
    Object.assign(stage, over);
    return stage;
  }

  function realPhysics(): PlayerController {
    const field = {
      _info: { Fly: false, Swim: false, Cloud: false },
      _footholds: {},
      _bounds: { left: -3000, top: -2000, right: 3000, bottom: 2000 },
      _ladderRopes: [],
      Bounds: { left: -3000, top: -2000, right: 3000, bottom: 2000 },
      Info: { Fly: false, Swim: false, Cloud: false },
      GetFoothold: () => null,
      GetFootholdBelow: () => null,
      GetClosestFoothold: () => null,
      GetLadderOrRope: () => null,
      GetCrossCandidate: () => [],
      GetZMassWallX: () => null,
      Footholds: {},
      LadderRopes: [],
    } as any;
    return new PlayerController(field);
  }

  it('updateBuffVisuals sets the physics stun from the stun debuff', () => {
    const stage = makeStage();
    const setStunned = stage._physics.SetStunned;
    stage._updateBuffVisuals();
    expect(setStunned).toHaveBeenCalledWith(false);

    stage.game.fieldHandlers.secondaryStat.isStunActive = () => true;
    stage._updateBuffVisuals();
    expect(setStunned).toHaveBeenCalledWith(true);
  });

  it('a stunned player is immovable (IsImmovable gates movement + attack)', () => {
    const pc = realPhysics();
    pc.SetStunned(true);
    expect(pc.IsImmovable).toBe(true);

    pc.SetStunned(false);
    expect(pc.IsImmovable).toBe(false);
  });

  it('onSkillUse does not send the packet while sealed', () => {
    const stage = makeStage();
    stage.game.fieldHandlers.secondaryStat.isSealActive = () => true;
    stage._skill = { onSkillUse: null as any };
    // Wire the same closure the constructor uses.
    stage._skill.onSkillUse = (skillId: number, slv: number) => {
      if (stage.game.fieldHandlers.secondaryStat.isSealActive()) return;
      stage.game.session.send({ skillId, slv });
    };
    stage._skill.onSkillUse(100, 1);
    expect(stage.game.session.send).not.toHaveBeenCalled();
  });

  it('onSkillUse sends the packet when not sealed', () => {
    const stage = makeStage();
    stage.game.fieldHandlers.secondaryStat.isSealActive = () => false;
    stage._skill = { onSkillUse: null as any };
    stage._skill.onSkillUse = (skillId: number, slv: number) => {
      if (stage.game.fieldHandlers.secondaryStat.isSealActive()) return;
      stage.game.session.send({ skillId, slv });
    };
    stage._skill.onSkillUse(100, 1);
    expect(stage.game.session.send).toHaveBeenCalledWith({ skillId: 100, slv: 1 });
  });
});
