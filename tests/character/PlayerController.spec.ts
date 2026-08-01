import { describe, it, expect } from 'vitest';
import { PlayerController } from '../../src/character/PlayerController.js';
import { Stance } from '../../src/character/Stance.js';
import { Foothold } from '../../src/map/Foothold.js';
import { MapInfo } from '../../src/map/MapInfo.js';
import type { LadderRope } from '../../src/map/LadderRope.js';

function makeField() {
  // Flat platform from x=-200..200 at y=200 (keep player from falling into void)
  const fh = new Foothold();
  fh.Id = 1; fh.X1 = -200; fh.Y1 = 200; fh.X2 = 200; fh.Y2 = 200;
  fh.Prev = 0; fh.Next = 0;
  fh.InitVectors();

  const footholds: Record<number, Foothold> = { 1: fh };

  const field = {
    _info: new MapInfo(),
    _footholds: footholds,
    _bounds: { left: -3000, top: -2000, right: 3000, bottom: 2000 },
    _ladderRopes: [] as LadderRope[],
    get Info() { return this._info; },
    get Footholds() { return this._footholds; },
    get Bounds() { return this._bounds; },
    get LadderRopes() { return this._ladderRopes; },
    GetFoothold(id: number) { return this._footholds[id] ?? null; },
    GetFootholdBelow(x: number, y: number) {
      let best: Foothold | null = null;
      let bestY = -Infinity;
      for (const fh of Object.values(this._footholds)) {
        if (x >= Math.min(fh.X1, fh.X2) && x <= Math.max(fh.X1, fh.X2)) {
          const fhY = fh.YAt(x);
          if (fhY !== null && fhY >= y && (best === null || fhY < bestY)) {
            best = fh;
            bestY = fhY;
          }
        }
      }
      return best;
    },
    GetClosestFoothold(x: number, y: number) {
      let best: Foothold | null = null;
      let bestD = Infinity;
      for (const fh of Object.values(this._footholds)) {
        const d = fh.DistanceSquaredTo(x, y);
        if (d < bestD) { bestD = d; best = fh; }
      }
      return best;
    },
    GetFootholdAbove(x: number, yTop: number, yBottom: number) {
      for (const fh of Object.values(this._footholds)) {
        if (fh.IsWall || fh.State === 0 || !fh.CantThrough) continue;
        const gy = fh.YAt(x);
        if (gy === null) continue;
        if (gy >= yTop && gy <= yBottom) return fh;
      }
      return null;
    },
    GetLadderOrRope(_x: number, _y: number) { return null; },
    GetZMassWallX(_zmass: number, _fromX: number, _toX: number, _yTop: number, _yBottom: number) { return null; },
  } as any;

  return field;
}

describe('PlayerController', () => {
  describe('SetStats', () => {
    it('walk speed scales with speedPct', () => {
      const pc = new PlayerController(makeField());
      pc.SetStats(50, 0);
      // walk speed should be 125 * 1.5 = 187.5 (BaseWalkSpeed is the real
      // WZ Physics.img/walkSpeed value, confirmed against wz_client — see
      // PlayerController's doc comment)
      // We can observe this: walk right for 1s → should move ~187.5px
      pc.Spawn({ x: 0, y: 200 });
      pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 1.0);
      expect(pc.Position.x).toBeGreaterThanOrEqual(175);
      expect(pc.Position.x).toBeLessThanOrEqual(200);
    });

    it('default walk speed is base', () => {
      const pc = new PlayerController(makeField());
      pc.Spawn({ x: 0, y: 200 });
      pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 1.0);
      expect(pc.Position.x).toBeGreaterThanOrEqual(125);
      expect(pc.Position.x).toBeLessThanOrEqual(155);
    });

    it('jump speed scales with jumpPct', () => {
      const pc = new PlayerController(makeField());
      pc.SetStats(0, 100);
      pc.Spawn({ x: 50, y: 200 });
      // BaseJumpSpeed=555, +100% = 1110. _fallFreely: vy = -1110 + 2000*0.1 = -910, newY = 200 + (-910)*0.1 = 109
      pc.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: true }, 0.1);
      expect(pc.Position.y).toBeCloseTo(109, -0.5);
    });
  });

  describe('Spawn', () => {
    it('placed on foothold when Y within 4px', () => {
      const pc = new PlayerController(makeField());
      pc.Spawn({ x: 50, y: 198 });
      expect(pc.Position.y).toBe(200);
      expect(pc.Grounded).toBe(true);
    });

    it('starts falling when below foothold', () => {
      const pc = new PlayerController(makeField());
      pc.Spawn({ x: 50, y: 250 });
      expect(pc.Grounded).toBe(false);
    });

    it('starts falling when above foothold by >4px', () => {
      const pc = new PlayerController(makeField());
      pc.Spawn({ x: 50, y: 195 });
      expect(pc.Grounded).toBe(false);
    });
  });

  describe('walk physics', () => {
    it('accelerates toward target speed', () => {
      const pc = new PlayerController(makeField());
      pc.Spawn({ x: 0, y: 200 });
      pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 0.1);
      // At 0.1s with 2800 accel, vx should be 280
      // Position: 0 + 0.5 * 280 * 0.1 = 14
      expect(pc.Position.x).toBeGreaterThanOrEqual(10);
      expect(pc.Position.x).toBeLessThanOrEqual(18);
    });

    it('decelerates to stop when no input', () => {
      const pc = new PlayerController(makeField());
      pc.Spawn({ x: 0, y: 200 });
      pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 0.1);
      // Should have moved right a bit with vx≈280 after 0.1s accel
      const midPos = pc.Position.x;
      expect(midPos).toBeGreaterThan(0);
      // Stop pressing — deceleration only applies when grounded
      pc.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: false }, 1.0);
      // After 1s of decel, vx goes to 0 almost immediately (WalkDecel=2200), position should stabilize
      expect(pc.Position.x).toBeGreaterThanOrEqual(midPos);
      expect(pc.Position.x).toBeLessThan(midPos + 5);
    });

    it('changes direction (velocity flip)', () => {
      const pc = new PlayerController(makeField());
      pc.Spawn({ x: 50, y: 200 });
      pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 0.5);
      const rightPos = pc.Position.x;
      pc.Update({ Left: true, Right: false, Up: false, Down: false, JumpPressed: false }, 0.5);
      // Should have moved left from rightPos
      expect(pc.Position.x).toBeLessThan(rightPos);
    });

    it('sets FacingLeft when pressing left', () => {
      const pc = new PlayerController(makeField());
      pc.Spawn({ x: 50, y: 200 });
      pc.Update({ Left: true, Right: false, Up: false, Down: false, JumpPressed: false }, 0.1);
      expect(pc.FacingLeft).toBe(true);
    });

    it('clears FacingLeft when pressing right', () => {
      const pc = new PlayerController(makeField());
      pc.Spawn({ x: 50, y: 200 });
      pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 0.1);
      expect(pc.FacingLeft).toBe(false);
    });
  });

  describe('jump physics', () => {
    it('jump sets negative vy on ground', () => {
      const pc = new PlayerController(makeField());
      pc.Spawn({ x: 50, y: 200 });
      pc.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: true }, 0.05);
      expect(pc.Position.y).toBeLessThan(200);
      expect(pc.Grounded).toBe(false);
    });

    it('jump requires edge trigger (not held)', () => {
      const pc = new PlayerController(makeField());
      pc.Spawn({ x: 50, y: 200 });
      // First frame: JumpPressed
      pc.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: true }, 0.05);
      const yAfterJump = pc.Position.y;
      expect(yAfterJump).toBeLessThan(200); // went up
      // Second frame: JumpPressed still true (held) → NOT a new jump edge
      // Velocity should just get gravity added, not reset to -jumpSpeed
      pc.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: true }, 0.05);
      // Still moving up (momentum), without extra jump boost. Should not snap upward.
      expect(pc.Position.y).toBeLessThanOrEqual(yAfterJump);
    });

    it('jump vy uses -jumpSpeed (OG formula requires different velocity units)', () => {
      const pc = new PlayerController(makeField());
      pc.Spawn({ x: 50, y: 200 });
      // Jump vy = -jumpSpeed = -555 (OG uses pixels-per-tick, we use dt-based)
      // After 0.05s: y = 200 + (-555 * 0.05) = 172.25
      pc.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: true }, 0.05);
      expect(pc.Position.y).toBeLessThan(200);
      expect(pc.Position.y).toBeGreaterThan(150); // Should move ~28 pixels up
    });
  });

  describe('fall damage', () => {
    it('triggers callback on landing after large fall', () => {
      const field = makeField();
      // A narrow high platform the player can walk off
      const ledge = new Foothold();
      ledge.Id = 2; ledge.X1 = 0; ledge.Y1 = 50; ledge.X2 = 30; ledge.Y2 = 50;
      ledge.Next = 0; ledge.Prev = 0;
      ledge.InitVectors();
      field._footholds = { 2: ledge };

      // Landing platform below
      const landing = new Foothold();
      landing.Id = 3; landing.X1 = -300; landing.Y1 = 600; landing.X2 = 300; landing.Y2 = 600;
      landing.Next = 0; landing.Prev = 0;
      landing.InitVectors();
      field._footholds[3] = landing;

      const pc = new PlayerController(field);
      let callbackDmg = 0;
      pc.onTakeFallDamage = (dmg: number) => { callbackDmg = dmg; };

      // Spawn on the narrow ledge (only platform)
      pc.Spawn({ x: 15, y: 48 });
      expect(pc.Position.y).toBe(50);
      expect(pc.Grounded).toBe(true);

      // Walk right — ledge ends at x=30, so walking past it triggers edge fall
      pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 1.0);
      // Should have walked off, now falling (still in air, not grounded yet)
      expect(pc.Grounded).toBe(false);

      // Fall until grounded on the landing platform
      for (let i = 0; i < 30 && !pc.Grounded; i++) {
        pc.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: false }, 0.1);
      }
      expect(pc.Grounded).toBe(true);
      expect(pc.Position.y).toBe(600);
      // Fall damage: fallDist ≈ 600-50=550, threshold=500, perPx=0.08 → 4
      expect(callbackDmg).toBeGreaterThan(0);
    });
  });

  // OG: CVecCtrl::CalcFloat's swim/passive-fly branch (decompile/9934C0.c).
  // Real WZ constants confirmed against wz_client/Map.nx's Physics.img.
  describe('fly/swim physics', () => {
    function airborneField(opts: { fly?: boolean; swim?: boolean }) {
      const field = makeField();
      field._info.Fly = opts.fly ?? false;
      field._info.Swim = opts.swim ?? false;
      return field;
    }

    it('Swim now has vertical input control (previously had none at all)', () => {
      const pc = new PlayerController(airborneField({ swim: true }));
      pc.Spawn({ x: 0, y: -1000 }); // no ground below — stays airborne/swimming
      // Hold Up repeatedly: sink should ease toward the soft 0.3×swimSpeed cap.
      for (let i = 0; i < 60; i++) {
        pc.Update({ Left: false, Right: false, Up: true, Down: false, JumpPressed: false }, 1 / 60);
      }
      // swimSpeed=140 → 0.3×140=42
      expect(pc.Position.y).toBeLessThan(-1000 + 50);
    });

    it('No input passively sinks toward vMax (does not hold position)', () => {
      const pc = new PlayerController(airborneField({ fly: true }));
      pc.Spawn({ x: 0, y: -1000 });
      const yBefore = pc.Position.y;
      for (let i = 0; i < 30; i++) {
        pc.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: false }, 1 / 60);
      }
      expect(pc.Position.y).toBeGreaterThan(yBefore);
    });

    it('Holding Down sinks noticeably faster than holding nothing', () => {
      const pcDown = new PlayerController(airborneField({ fly: true }));
      pcDown.Spawn({ x: 0, y: -1000 });
      for (let i = 0; i < 10; i++) {
        pcDown.Update({ Left: false, Right: false, Up: false, Down: true, JumpPressed: false }, 1 / 60);
      }

      const pcNone = new PlayerController(airborneField({ fly: true }));
      pcNone.Spawn({ x: 0, y: -1000 });
      for (let i = 0; i < 10; i++) {
        pcNone.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: false }, 1 / 60);
      }

      expect(pcDown.Position.y).toBeGreaterThan(pcNone.Position.y);
    });

    it('Holding Up sinks noticeably slower than holding nothing', () => {
      const pcUp = new PlayerController(airborneField({ fly: true }));
      pcUp.Spawn({ x: 0, y: -1000 });
      for (let i = 0; i < 10; i++) {
        pcUp.Update({ Left: false, Right: false, Up: true, Down: false, JumpPressed: false }, 1 / 60);
      }

      const pcNone = new PlayerController(airborneField({ fly: true }));
      pcNone.Spawn({ x: 0, y: -1000 });
      for (let i = 0; i < 10; i++) {
        pcNone.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: false }, 1 / 60);
      }

      expect(pcUp.Position.y).toBeLessThan(pcNone.Position.y);
    });

    it('horizontal input moves toward flySpeed/swimSpeed bounds', () => {
      const pc = new PlayerController(airborneField({ fly: true }));
      pc.Spawn({ x: 0, y: -1000 });
      for (let i = 0; i < 30; i++) {
        pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 1 / 60);
      }
      expect(pc.Position.x).toBeGreaterThan(0);
    });
  });

  describe('ApplyKnockback', () => {
    it('sets velocity, ungrounds, staggers', () => {
      const pc = new PlayerController(makeField());
      pc.Spawn({ x: 50, y: 200 });
      expect(pc.Grounded).toBe(true);
      expect(pc.IsStaggered).toBe(false);

      pc.ApplyKnockback(-200, 0, 0.4);

      // Knockback → ungrounded with velocity
      expect(pc.Grounded).toBe(false);
      expect(pc.IsStaggered).toBe(true);
    });

    it('stagger prevents input processing', () => {
      const pc = new PlayerController(makeField());
      pc.Spawn({ x: 50, y: 200 });
      pc.ApplyKnockback(-200, 0, 0.4);
      const posBefore = pc.Position.x;
      // Try moving right while staggered
      pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 0.1);
      // Should still move due to knockback velocity, not from input
      expect(pc.Position.x).toBeLessThan(posBefore);
    });
  });

  describe('StopWalking', () => {
    it('zeroes horizontal velocity when grounded', () => {
      const pc = new PlayerController(makeField());
      pc.Spawn({ x: 0, y: 200 });
      pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 0.5);
      pc.StopWalking();
      // Next update should keep x stable (vx was zeroed)
      const posBefore = pc.Position.x;
      pc.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: false }, 0.5);
      expect(Math.abs(pc.Position.x - posBefore)).toBeLessThan(1);
    });
  });

  describe('TryFlushMovePath', () => {
    it('returns null when no pending elements', () => {
      const pc = new PlayerController(makeField());
      pc.Spawn({ x: 50, y: 200 });
      expect(pc.TryFlushMovePath()).toBeNull();
    });
  });

  // TODO_AUDIT.md Seventy-sixth pass: chair/sitting — CUserLocal::IsSit's
  // m_bSit flag and the movement-ignored-while-sitting behavior.
  describe('Sit/StandUp', () => {
    it('Sit sets position, Stance.Sit, and IsSitting', () => {
      const pc = new PlayerController(makeField());
      pc.Spawn({ x: 0, y: 200 });
      pc.Sit(42, 100);
      expect(pc.IsSitting).toBe(true);
      expect(pc.Position).toEqual({ x: 42, y: 100 });
      expect(pc.Stance).toBe(Stance.Sit);
    });

    it('Update is a no-op while sitting (position/stance unchanged)', () => {
      const pc = new PlayerController(makeField());
      pc.Spawn({ x: 0, y: 200 });
      pc.Sit(42, 100);
      pc.Update({ Left: true, Right: false, Up: false, Down: false, JumpPressed: false }, 0.5);
      expect(pc.Position).toEqual({ x: 42, y: 100 });
      expect(pc.IsSitting).toBe(true);
    });

    it('StandUp clears IsSitting and resets Stance', () => {
      const pc = new PlayerController(makeField());
      pc.Spawn({ x: 0, y: 200 });
      pc.Sit(42, 100);
      pc.StandUp();
      expect(pc.IsSitting).toBe(false);
      expect(pc.Stance).toBe(Stance.Stand1);
    });
  });
});
