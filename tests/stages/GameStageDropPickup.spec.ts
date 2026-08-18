import { describe, expect, it, vi } from 'vitest';
import { GameStage } from '../../src/stages/GameStage.js';
import { DropSprite } from '../../src/character/DropSprite.js';

// OG: CDropPool::OnDropLeaveField (decompile/511e20.c) — when a drop is
// picked up by the local character (leaveType 2/3/5 with pickUpId == local
// charId), the client plays the pickup sound and registers an absorb
// animation toward the character body (CAnimationDisplayer::ABSORBITEM).
describe('GameStage drop pickup animation (CDropPool::OnDropLeaveField)', () => {
  function makeStage(): any {
    const stage: any = Object.create(GameStage.prototype);
    stage._drops = [];
    stage._localCharId = 7;
    stage._player = {
      Position: { x: 100, y: 200 },
      NavelPosition: { x: 100, y: 160 }, // body center (OG: pos - height/2)
    };
    stage._fieldSounds = { PlayPickUp: vi.fn() };
    return stage;
  }

  it('routes a local pickup to StartAbsorb toward the player body center', () => {
    const stage = makeStage();
    const drop = new DropSprite(1, false, 2000000, { x: 0, y: 0 }, { x: 50, y: 500 }, false);
    drop.StartAbsorb = vi.fn();
    stage._drops = [drop];

    stage._onDropLeave({ dropId: 1, leaveType: 2, pickUpId: 7 }); // PickedUpByUser

    expect(stage._fieldSounds.PlayPickUp).toHaveBeenCalledTimes(1);
    expect(drop.StartAbsorb).toHaveBeenCalledTimes(1);
    const target = drop.StartAbsorb.mock.calls[0][0] as () => { x: number; y: number };
    expect(target()).toEqual({ x: 100, y: 160 }); // NavelPosition
    // The drop stays in the list (it animates, then is filtered when Finished).
    expect(stage._drops).toContain(drop);
  });

  it('keeps instant removal when a different user picks the drop up', () => {
    const stage = makeStage();
    const drop = new DropSprite(1, false, 2000000, { x: 0, y: 0 }, { x: 50, y: 500 }, false);
    drop.StartAbsorb = vi.fn();
    stage._drops = [drop];

    stage._onDropLeave({ dropId: 1, leaveType: 2, pickUpId: 99 }); // remote user

    expect(stage._fieldSounds.PlayPickUp).not.toHaveBeenCalled();
    expect(drop.StartAbsorb).not.toHaveBeenCalled();
    expect(stage._drops).not.toContain(drop);
  });

  it('routes an Explode leave to the scatter animation', () => {
    const stage = makeStage();
    const drop = new DropSprite(1, false, 2000000, { x: 0, y: 0 }, { x: 50, y: 500 }, false);
    drop.StartExplode = vi.fn();
    stage._drops = [drop];

    stage._onDropLeave({ dropId: 1, leaveType: 4 }); // Explode

    expect(drop.StartExplode).toHaveBeenCalledTimes(1);
    expect(stage._drops).toContain(drop);
  });
});
