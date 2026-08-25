import { describe, it, expect } from 'vitest';
import { MoveActionToStance, Stance } from '../../src/character/Stance.js';
import { PlayerController, PlayerInput } from '../../src/character/PlayerController.js';
import { ActionMan } from '../../src/character/ActionMan.js';
import { WzPackage } from '../../src/wz/WzPackage.js';

// OG ground truth (v95 IDB):
// - CAvatar::MoveAction2RawAction @0x45FA30: wire idx 1 → walkType!=1 ? walk2
//   : walk1; idx 2 → (standType!=1)+2 → stand2/stand1; idx 3 → raw 44 (fall).
//   The wire byte collapses the variants; each client re-expands via the
//   avatar's own weapon entry (CAvatar::NotifyAvatarModified @0x46BB20 loads
//   `stand`/`walk` from Character/<weapon>.img).
describe('MoveActionToStance weapon-variant expansion (MoveAction2RawAction 0x45FA30)', () => {
  it('idx 2 (stand) re-expands through the weapon stand type', () => {
    expect(MoveActionToStance(4).stance).toBe(Stance.Stand1); // standType 1 → raw 2 = stand1
    expect(MoveActionToStance(4, 1).stance).toBe(Stance.Stand1);
    expect(MoveActionToStance(4, 2).stance).toBe(Stance.Stand2); // polearm/two-hand
    // facing bit still decodes
    expect(MoveActionToStance(5, 2).facingLeft).toBe(true);
    expect(MoveActionToStance(4, 2).facingLeft).toBe(false);
  });

  it('idx 1 (walk) re-expands through the weapon walk type', () => {
    expect(MoveActionToStance(2).stance).toBe(Stance.Walk1);
    expect(MoveActionToStance(2, 1, 2).stance).toBe(Stance.Walk2);
  });

  it('idx 3 is fall (was mis-decoded as Walk2)', () => {
    expect(MoveActionToStance(6).stance).toBe(Stance.Fall);
  });

  it('other indices keep their OG mapping', () => {
    expect(MoveActionToStance(10).stance).toBe(Stance.Jump); // idx 5
    expect(MoveActionToStance(14).stance).toBe(Stance.Ladder); // idx 7
    expect(MoveActionToStance(16).stance).toBe(Stance.Rope); // idx 8
    expect(MoveActionToStance(20).stance).toBe(Stance.Sit); // idx 10
    expect(MoveActionToStance(24).stance).toBe(Stance.Prone); // idx 12
  });
});

// OG: while a melee one-time action plays the character must not slide —
// GameStage locks movement input for the swing duration.
describe('PlayerController.InputLocked (melee swing plant)', () => {
  function makeController(): { c: PlayerController; inputCalls: PlayerInput[] } {
    const c = new PlayerController({
      GetFoothold: () => null,
      GetFootholdBelow: () => null,
      GetLadderOrRope: () => null,
      GetCrossCandidate: () => [],
      Info: { FieldWalk: 1, FieldDrag: 1, Swim: false },
    } as any);
    // Plant on a flat foothold at origin.
    const fh = {
      Id: 1, X1: -100, Y1: 0, X2: 100, Y2: 0,
      Uvx: 1, Uvy: 0, Length: 200, Force: 0, Drag: 1, IsWall: false,
      ForbidFallDown: false, YAt: () => 0,
    };
    (c as any)._field.GetFoothold = () => fh;
    (c as any)._field.GetFootholdBelow = () => fh;
    c.Position = { x: 0, y: 0 };
    (c as any)._grounded = true;
    (c as any)._currentFoothold = 1;
    (c as any)._footholdPos = 100;
    return { c, inputCalls: [] };
  }

  const idleInput: PlayerInput = { Left: false, Right: false, Up: false, Down: false, JumpPressed: false };

  it('locks horizontal input so holding a direction does not move the character', () => {
    const { c } = makeController();
    const held: PlayerInput = { ...idleInput, Right: true };
    c.Update(held, 0.5);
    const freeX = c.Position.x;
    expect(freeX).toBeGreaterThan(0);

    c.Position = { x: 0, y: 0 };
    (c as any)._grounded = true;
    (c as any)._velocity = { x: 0, y: 0 };
    (c as any)._footholdPos = 100; // Position is re-derived from this every frame
    c.InputLocked = true;
    for (let i = 0; i < 30; i++) c.Update(held, 0.033);
    expect(c.Position.x).toBe(0); // planted
    // gravity/decel still ran — stance stays grounded stand
    expect(c.Grounded).toBe(true);
  });

  it('blocks jump while locked', () => {
    const { c } = makeController();
    c.InputLocked = true;
    const jump: PlayerInput = { ...idleInput, JumpPressed: true };
    c.Update(jump, 0.016);
    expect(c.Grounded).toBe(true);
    expect(c.Stance).not.toBe(Stance.Jump);
  });
});

// Real-data regression for the reported bug: a polearm (stand=2/walk=2, and
// the img has NO stand1/walk1 nodes) rendered nothing while standing because
// the avatar played stand1. Pins the ActionMan weapon entry + the CharLook
// climb-freeze behavior against Character.nx.
describe('weapon stand/walk types + climb freeze (env-gated real NX)', () => {
  it('polearm entry reports stand=2 walk=2; one-handed sword reports 1/1', () => {
    const nx = process.env.MAPLECLAUDE_NX_DIR;
    if (!nx) return;
    const actMan = ActionMan.GetInstance();
    actMan.SetCharacterWz(WzPackage.Open(`${nx}/Character.nx`));
    const polearm = actMan.GetCharacterImgEntry(1442000, null);
    expect(polearm?.nStand).toBe(2);
    expect(polearm?.nWalk).toBe(2);
    const sword = actMan.GetCharacterImgEntry(1302000, null);
    expect(sword?.nStand).toBe(1);
    expect(sword?.nWalk).toBe(1);
  });

  it('ladder frames freeze while not climbing and advance while moving', async () => {
    const nx = process.env.MAPLECLAUDE_NX_DIR;
    if (!nx) return;
    const { CharLook } = await import('../../src/character/CharLook.js');
    const { AvatarLook } = await import('../../src/domain/AvatarLook.js');
    const { WzTextureLoader } = await import('../../src/render/WzTextureLoader.js');
    const charWz = WzPackage.Open(`${nx}/Character.nx`);
    let itemWz: any = null;
    try { itemWz = WzPackage.Open(`${nx}/Item.nx`); } catch { /* optional */ }
    let baseWz: any = null;
    try { baseWz = WzPackage.Open(`${nx}/Base.nx`); } catch { /* optional */ }
    const cl = new CharLook(0);
    cl.Load(charWz, itemWz, baseWz, new (WzTextureLoader as any)());
    cl.SetAvatar(new (AvatarLook as any)());
    expect(cl.CurrentAction).toBe('stand1');

    // Holding still on a ladder — OG CAvatar::Update pins tCurFrameRemain=0.
    for (let i = 0; i < 600; i++) cl.UpdateFromPhysics(1 / 60, Stance.Ladder, false, false);
    expect(cl.CurrentAction).toBe('ladder');
    expect(cl.Frame).toBe(0);

    // Climbing — frames advance through WZ delays.
    let advanced = false;
    for (let i = 0; i < 600; i++) {
      cl.UpdateFromPhysics(1 / 60, Stance.Ladder, false, true);
      if (cl.Frame !== 0) { advanced = true; break; }
    }
    expect(advanced).toBe(true);
  });
});
