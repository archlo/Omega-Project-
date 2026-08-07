import { describe, it, expect } from 'vitest';
import { PlayerController } from '../../src/character/PlayerController.js';
import { DEFAULT_PHYSICS } from '../../src/map/FieldScene.js';
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
    GetCrossCandidate(xm1: number, ym1: number, xm2: number, ym2: number) {
      const minX = Math.min(xm1, xm2), maxX = Math.max(xm1, xm2);
      const minY = Math.min(ym1, ym2), maxY = Math.max(ym1, ym2);
      return Object.values(this._footholds).filter((fh: any) => {
        if (fh.State === 0) return false;
        const fhMinX = Math.min(fh.X1, fh.X2), fhMaxX = Math.max(fh.X1, fh.X2);
        const fhMinY = Math.min(fh.Y1, fh.Y2), fhMaxY = Math.max(fh.Y1, fh.Y2);
        return fhMaxX >= minX && fhMinX <= maxX && fhMaxY >= minY && fhMinY <= maxY;
      });
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

    it('applies the shoe swim speed multiplier to swimming movement', () => {
      const normal = new PlayerController(airborneField({ swim: true }));
      normal.Spawn({ x: 0, y: -1000 });
      const fast = new PlayerController(airborneField({ swim: true }));
      fast.SetShoePhysics({ swimSpeedMultiplier: 2 });
      fast.Spawn({ x: 0, y: -1000 });
      for (let i = 0; i < 60; i++) {
        const input = { Left: false, Right: true, Up: false, Down: false, JumpPressed: false };
        normal.Update(input, 1 / 60);
        fast.Update(input, 1 / 60);
      }
      expect(fast.Position.x).toBeGreaterThan(normal.Position.x);
    });
  });

  describe('moving footholds', () => {
    it('carries a grounded player by the foothold translation', () => {
      const field = makeField();
      const pc = new PlayerController(field);
      pc.Spawn({ x: 40, y: 200 });
      field._footholds[1].MoveBy(25, -10);
      pc.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: false }, 0);
      expect(pc.Position).toEqual({ x: 65, y: 190 });
    });
  });

  describe('linked foothold junction traversal', () => {
    it('crosses a junction mid-foothold without falling (leftover distance is edgeDistance, not fh.Length)', () => {
      // Platform split into two linked footholds. The player spawns at
      // x=60 (mid-foothold-1) and walks right far enough to cross the
      // x=100 junction AND continue onto foothold 2 in the SAME frame.
      const a = new Foothold();
      a.Id = 1; a.X1 = 0; a.Y1 = 200; a.X2 = 100; a.Y2 = 200;
      a.Next = 2; a.Prev = 0; a.InitVectors();
      const b = new Foothold();
      b.Id = 2; b.X1 = 100; b.Y1 = 200; b.X2 = 200; b.Y2 = 200;
      b.Next = 0; b.Prev = 1; b.InitVectors();

      const field = makeField();
      field._footholds = { 1: a, 2: b };

      const pc = new PlayerController(field);
      pc.Spawn({ x: 60, y: 200 });
      expect(pc.Grounded).toBe(true);
      expect(pc.CurrentFoothold).toBe(1);

      // Walk right 1s at full walk speed (~125px/s) — must cross the x=100
      // junction and keep walking on foothold 2, never detaching.
      for (let i = 0; i < 10; i++) {
        pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 0.1);
        expect(pc.Grounded, `frame ${i} fell off`).toBe(true);
      }
      expect(pc.Position.x).toBeGreaterThan(120);
      expect(pc.CurrentFoothold).toBe(2);
    });

    it('crosses a backward junction mid-foothold without falling', () => {
      const a = new Foothold();
      a.Id = 1; a.X1 = 0; a.Y1 = 200; a.X2 = 100; a.Y2 = 200;
      a.Next = 2; a.Prev = 0; a.InitVectors();
      const b = new Foothold();
      b.Id = 2; b.X1 = 100; b.Y1 = 200; b.X2 = 200; b.Y2 = 200;
      b.Next = 0; b.Prev = 1; b.InitVectors();

      const field = makeField();
      field._footholds = { 1: a, 2: b };

      const pc = new PlayerController(field);
      pc.Spawn({ x: 140, y: 200 });
      expect(pc.Grounded).toBe(true);
      expect(pc.CurrentFoothold).toBe(2);

      for (let i = 0; i < 10; i++) {
        pc.Update({ Left: true, Right: false, Up: false, Down: false, JumpPressed: false }, 0.1);
        expect(pc.Grounded, `frame ${i} fell off`).toBe(true);
      }
      expect(pc.Position.x).toBeLessThan(80);
      expect(pc.CurrentFoothold).toBe(1);
    });
  });

  // OG: CVecCtrl::CalcWalk (0x992BA0) — friction clamp + dSwimSpeedDec + the
  // (hd·f ≤ 0) slope speed-cap distinction, all verified against the live IDB
  // decompile and wz_client/Map.nx Physics.img (minFriction=0.05,
  // maxFriction=2.0, swimSpeedDec=0.9).
  describe('CalcWalk parity (friction clamp, swim dec, slope cap)', () => {
    it('clamps the friction product to [minFriction, maxFriction] before ×0.5 and ×dWalkDrag', () => {
      const field = makeField() as any;
      field.Physics = { ...DEFAULT_PHYSICS, maxFriction: 2.0, minFriction: 0.05, walkDrag: 80000 };
      // Shoe walkDrag 5 → clamped to maxFriction 2.0 → effective drag 160000.
      const pc = new PlayerController(field);
      pc.SetShoePhysics({ mass: 10, walkDrag: 5 });
      pc.Spawn({ x: 0, y: 200 });
      // Push right for a tick to build velocity, then release.
      pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 0.1);
      const fastV = pc['_velocity'].x;
      expect(fastV).toBeGreaterThan(0);
      // Release: decel uses 160000 drag / 10 mass = 16000 px/s² → stops fast.
      pc.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: false }, 0.05);
      expect(pc['_velocity'].x).toBeCloseTo(0, -1);
    });

    it('reduces friction ×0.5 when the clamped product is < 1', () => {
      const field = makeField() as any;
      field.Physics = { ...DEFAULT_PHYSICS, maxFriction: 2.0, minFriction: 0.05, walkDrag: 80000 };
      // Product = 0.4 → clamped stays 0.4 (<1) → ×0.5 = 0.2 → drag 16000.
      const pc = new PlayerController(field);
      pc.SetShoePhysics({ mass: 10, walkDrag: 0.4 });
      pc.Spawn({ x: 0, y: 200 });
      pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 0.1);
      const fastV = pc['_velocity'].x;
      expect(fastV).toBeGreaterThan(0);
      pc.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: false }, 0.05);
      // 0.2 × 80000 / 10 = 1600 px/s² of decel over 0.05s = 80 px/s removed —
      // far less than the un-clamped 0.4 × 80000 / 10 = 3200 px/s².
      expect(pc['_velocity'].x).toBeCloseTo(fastV - 80, 0);
    });

    it('scales grounded walk force/speed by dSwimSpeedDec while swimming', () => {
      const field = makeField() as any;
      field.Physics = { ...DEFAULT_PHYSICS, swimSpeedDec: 0.9 };
      field._info.Swim = true;
      const pc = new PlayerController(field);
      pc.Spawn({ x: 0, y: 200 });
      // Walk right 1s — the cap is 125 × 0.9 = 112.5 (not 125).
      pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 1.0);
      expect(pc.Position.x).toBeGreaterThanOrEqual(110);
      expect(pc.Position.x).toBeLessThan(125);
    });

    it('keeps the (1+sin²) speed cap only when the force aligns with the downhill (hd·f ≤ 0)', () => {
      // Downhill (Uvy > 0 → hd = -1), walking right (dir > 0) → hd·f < 0 → cap = (1+sin²)·base.
      const field = makeField() as any;
      const fh = field._footholds[1];
      fh.X1 = -200; fh.Y1 = 200; fh.X2 = 200; fh.Y2 = 220; // gentle downhill, Uvy>0
      fh.InitVectors();
      const pc = new PlayerController(field);
      pc.Spawn({ x: 0, y: 210 });
      pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 1.0);
      const downhillX = pc.Position.x;

      // Uphill (Uvy < 0 → hd = 1), walking right → hd·f > 0 → cap stays base.
      const field2 = makeField() as any;
      const fh2 = field2._footholds[1];
      fh2.X1 = -200; fh2.Y1 = 220; fh2.X2 = 200; fh2.Y2 = 200;
      fh2.InitVectors();
      const pc2 = new PlayerController(field2);
      pc2.Spawn({ x: 0, y: 210 });
      pc2.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 1.0);
      const uphillX = pc2.Position.x;

      // Same slope magnitude; the downhill cap (1+sin²) is strictly larger.
      expect(downhillX).toBeGreaterThan(uphillX);
    });

    it('walks up a moderate slope instead of slipping (OG CAttrShoe walkSlant=0.9)', () => {
      // A 45°-ish uphill slope: Uvy = 0.5, so sin1 = 0.5 < 0.9. The OG default
      // shoe walkSlant is 0.9 (CAttrShoe ctor 0x50B710), so the slip branch
      // must NOT fire — the player should climb. With a bogus 0.1 threshold
      // the slip branch braked velocity to 0 and the player never moved.
      const field = makeField() as any;
      const fh = field._footholds[1];
      fh.X1 = -200; fh.Y1 = 200; fh.X2 = 200; fh.Y2 = 100; // uphill to the right
      fh.InitVectors();
      const pc = new PlayerController(field);
      pc.Spawn({ x: -50, y: fh.YAt(-50)! }); // exactly on the slope line at x=-50 (y=162.5)
      expect(pc.Grounded).toBe(true);
      for (let i = 0; i < 12; i++) {
        pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 0.1);
        expect(pc.Grounded, `frame ${i} fell off the slope`).toBe(true);
      }
      // Must have climbed rightward and up along the slope (not slipped down).
      expect(pc.Position.x).toBeGreaterThan(0);
      expect(pc.Position.y).toBeLessThan(162.5);
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

  describe('ladder eligibility', () => {
    it('mirrors the v95 avatar and repeat-skill restrictions', () => {
      const pc = new PlayerController(makeField());
      expect(pc.CanClimbLadderOrRope()).toBe(true);

      pc.SetOneTimeAction(100);
      expect(pc.CanClimbLadderOrRope()).toBe(false);
      pc.SetOneTimeAction(207);
      expect(pc.CanClimbLadderOrRope()).toBe(true);
      pc.SetPreparingSkill(1);
      expect(pc.CanClimbLadderOrRope()).toBe(false);
      pc.SetPreparingSkill(0);

      pc.SetMechanicMode(1);
      expect(pc.CanClimbLadderOrRope()).toBe(false);
      pc.SetMechanicMode(0);
      pc.SetMorphed(2210000);
      expect(pc.CanClimbLadderOrRope()).toBe(false);
      pc.SetMorphed(0);
      pc.SetRidingVehicle(1932016);
      expect(pc.CanClimbLadderOrRope()).toBe(false);
      pc.SetRidingVehicle(0);
      pc.SetRepeatSkill(35121005);
      expect(pc.CanClimbLadderOrRope()).toBe(false);
    });

    it('rejects user flying independently of field flying', () => {
      const pc = new PlayerController(makeField());
      pc.SetUserFlying(true);
      expect(pc.CanClimbLadderOrRope()).toBe(false);
      pc.SetUserFlying(false);
      expect(pc.CanClimbLadderOrRope()).toBe(true);
    });

    it('grabs a rope from below with Up and snaps to its X', () => {
      const field = makeField();
      const rope = new (class {
        X = 50; Top = 100; Bottom = 200; IsLadder = false; UpperFoothold = false;
      })();
      field.GetLadderOrRope = () => rope;
      const pc = new PlayerController(field);
      pc.Spawn({ x: 50, y: 200 });
      pc.Update({ Left: false, Right: false, Up: true, Down: false, JumpPressed: false }, 1 / 60);

      expect(pc.IsOnRope()).toBe(true);
      expect(pc.Position.x).toBe(50);
    });

    it('only grabs downward when the rope upper endpoint is within 10px', () => {
      const field = makeField();
      const rope = new (class {
        X = 50; Top = 205; Bottom = 260; IsLadder = false; UpperFoothold = false;
      })();
      field.GetLadderOrRope = () => rope;
      const pc = new PlayerController(field);
      pc.Spawn({ x: 50, y: 200 });
      pc.Update({ Left: false, Right: false, Up: false, Down: true, JumpPressed: false }, 1 / 60);

      expect(pc.IsOnRope()).toBe(true);
      expect(pc.Position.y).toBe(205);
    });

    it('stays attached at the top of a rope without an upper foothold', () => {
      const field = makeField();
      const rope = new (class {
        X = 50; Top = 100; Bottom = 200; IsLadder = false; UpperFoothold = false;
      })();
      field.GetLadderOrRope = () => rope;
      const pc = new PlayerController(field);
      pc.Spawn({ x: 50, y: 200 });
      pc.Update({ Left: false, Right: false, Up: true, Down: false, JumpPressed: false }, 1 / 60);
      for (let i = 0; i < 20; i++) {
        pc.Update({ Left: false, Right: false, Up: true, Down: false, JumpPressed: false }, 0.1);
      }

      expect(pc.IsOnRope()).toBe(true);
      expect(pc.Position.y).toBe(100);
    });
  });

  describe('jump parity (OG CVecCtrl::JustJump 0x993EA0)', () => {
    it('ground jump launches upward at the stat-scaled jump speed', () => {
      const pc = new PlayerController(makeField());
      pc.Spawn({ x: 0, y: 200 });

      const ok = pc.JustJump({ Left: false, Right: false, Up: false, Down: false, JumpPressed: true }, 0);
      expect(ok).toBe(true);
      expect(pc.Grounded).toBe(false);

      // vy = -jumpSpeed (555 px/s); over 1/60s the player rises ~9.25px.
      pc.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: false }, 1 / 60);
      expect(pc.Position.y).toBeLessThan(200);
      expect(pc.Position.y).toBeGreaterThan(180);
    });

    it('refuses to jump when a CantThrough platform is directly above', () => {
      const field = makeField();
      const plat = new Foothold();
      plat.Id = 2; plat.X1 = -10; plat.Y1 = 160; plat.X2 = 10; plat.Y2 = 160;
      plat.Prev = 0; plat.Next = 0; plat.CantThrough = true;
      plat.InitVectors();
      field._footholds[2] = plat;

      const pc = new PlayerController(field);
      pc.Spawn({ x: 0, y: 200 });

      const ok = pc.JustJump({ Left: false, Right: false, Up: false, Down: false, JumpPressed: true }, 0);
      expect(ok).toBe(false);
      expect(pc.Grounded).toBe(true);
    });

    it('refuses to jump while pressing Down (platform drop stays grounded)', () => {
      const pc = new PlayerController(makeField());
      pc.Spawn({ x: 0, y: 200 });

      const ok = pc.JustJump({ Left: false, Right: false, Up: false, Down: true, JumpPressed: true }, 0);
      expect(ok).toBe(false);
      expect(pc.Grounded).toBe(true);
    });

    it('jumping from a rope uses the 0.5 ladder-jump factor and detaches', () => {
      const field = makeField();
      const rope = new (class {
        X = 50; Top = 100; Bottom = 200; IsLadder = false; UpperFoothold = false;
      })();
      field.GetLadderOrRope = () => rope;
      const pc = new PlayerController(field);
      pc.Spawn({ x: 50, y: 200 });
      pc.Update({ Left: false, Right: false, Up: true, Down: false, JumpPressed: false }, 1 / 60);
      expect(pc.IsOnRope()).toBe(true);

      pc.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: true }, 1 / 60);
      expect(pc.IsOnRope()).toBe(false);
      // The jump frame sets vy = -555 * 0.5 = -277.5; the next frame
      // integrates it into a ~4px rise.
      pc.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: false }, 1 / 60);
      expect(pc.Position.y).toBeLessThan(200);
      expect(pc.Position.y).toBeGreaterThan(193);
    });

    it('jumping from a rope with a flying-capable shoe uses the 0.3 factor', () => {
      const field = makeField();
      const rope = new (class {
        X = 50; Top = 100; Bottom = 200; IsLadder = false; UpperFoothold = false;
      })();
      field.GetLadderOrRope = () => rope;
      const pc = new PlayerController(field);
      pc.SetShoePhysics({ flyAcc: 10 });
      pc.Spawn({ x: 50, y: 200 });
      pc.Update({ Left: false, Right: false, Up: true, Down: false, JumpPressed: false }, 1 / 60);

      pc.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: true }, 1 / 60);
      expect(pc.IsOnRope()).toBe(false);
      // vy = -555 * 0.3 = -166.5; next frame integrates into a ~2.2px rise.
      pc.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: false }, 1 / 60);
      expect(pc.Position.y).toBeLessThan(200);
      expect(pc.Position.y).toBeGreaterThan(196);
    });

    it('rope grab and rope jump both fire onAttachedObjectChanged', () => {
      const field = makeField();
      const rope = new (class {
        X = 50; Top = 100; Bottom = 200; IsLadder = false; UpperFoothold = false;
      })();
      field.GetLadderOrRope = () => rope;
      const pc = new PlayerController(field);
      let calls = 0;
      pc.onAttachedObjectChanged = () => { calls++; };
      pc.Spawn({ x: 50, y: 200 });
      pc.Update({ Left: false, Right: false, Up: true, Down: false, JumpPressed: false }, 1 / 60);
      expect(calls).toBe(1);
      pc.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: true }, 1 / 60);
      expect(calls).toBe(2);
    });

    it('grabbing a rope mid-fall resets fall tracking so the landing is safe', () => {
      const field = makeField();
      field._footholds = {};
      const ground = new Foothold();
      ground.Id = 1; ground.X1 = -200; ground.Y1 = 700; ground.X2 = 200; ground.Y2 = 700;
      ground.Prev = 0; ground.Next = 0;
      ground.InitVectors();
      field._footholds[1] = ground;
      const rope = new (class {
        X = 50; Top = 500; Bottom = 600; IsLadder = false; UpperFoothold = false;
      })();
      field.GetLadderOrRope = () => rope;

      const pc = new PlayerController(field);
      let damage = 0;
      pc.onTakeFallDamage = (d) => { damage += d; };
      pc.Spawn({ x: 50, y: 50 });

      // Fall for a while, then grab the rope (Up) while falling.
      let grabbed = false;
      for (let i = 0; i < 120 && !grabbed; i++) {
        pc.Update({ Left: false, Right: false, Up: i >= 40, Down: false, JumpPressed: false }, 1 / 60);
        grabbed = pc.IsOnRope();
      }
      expect(grabbed).toBe(true);
      expect(pc.Position.y).toBeLessThan(600);

      // Jump from the rope and land on the ground at y=700.
      for (let i = 0; i < 300 && !pc.Grounded; i++) {
        pc.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: true }, 1 / 60);
      }
      expect(pc.Grounded).toBe(true);
      // Grab interrupted the long fall, so the short jump onto the ground
      // (well under the 500px threshold) must not deal any damage.
      expect(damage).toBe(0);
    });

    it('falling the same distance without grabbing a rope does deal damage', () => {
      const field = makeField();
      field._footholds = {};
      const ground = new Foothold();
      ground.Id = 1; ground.X1 = -200; ground.Y1 = 700; ground.X2 = 200; ground.Y2 = 700;
      ground.Prev = 0; ground.Next = 0;
      ground.InitVectors();
      field._footholds[1] = ground;

      const pc = new PlayerController(field);
      let damage = 0;
      pc.onTakeFallDamage = (d) => { damage += d; };
      pc.Spawn({ x: 50, y: 50 });

      for (let i = 0; i < 300 && !pc.Grounded; i++) {
        pc.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: false }, 1 / 60);
      }
      expect(pc.Grounded).toBe(true);
      expect(damage).toBeGreaterThan(0);
    });
  });

  describe('foothold collision parity', () => {
    it('stops grounded walking at a vertical wall and pushes the player out', () => {
      const field = makeField();
      const wall = new Foothold();
      wall.Id = 2; wall.X1 = 100; wall.Y1 = 200; wall.X2 = 100; wall.Y2 = 120;
      wall.InitVectors();
      field._footholds[2] = wall;

      const pc = new PlayerController(field);
      pc.Spawn({ x: 50, y: 200 });
      pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 1);

      expect(pc.Position.x).toBeLessThan(100);
      expect(pc.Grounded).toBe(true);
      expect(pc.CurrentFoothold).toBe(1);
    });

    it('ignores disabled crossing footholds', () => {
      const field = makeField();
      const disabled = new Foothold();
      disabled.Id = 2; disabled.X1 = -100; disabled.Y1 = 100; disabled.X2 = 100; disabled.Y2 = 100;
      disabled.State = 0;
      disabled.InitVectors();
      const enabled = new Foothold();
      enabled.Id = 3; enabled.X1 = -100; enabled.Y1 = 200; enabled.X2 = 100; enabled.Y2 = 200;
      enabled.InitVectors();
      field._footholds = { 2: disabled, 3: enabled };

      const pc = new PlayerController(field);
      pc.Spawn({ x: 0, y: 0 });
      pc.ApplyKnockback(0, 100, 0);
      const collision = pc.CollisionDetectFloat(0, 250);

      expect(collision.fh?.Id).toBe(3);
      expect(collision.landed).toBe(true);
      expect(collision.y).toBe(200);
    });

    it('uses the reserved foothold when the sweep does not intersect it', () => {
      const field = makeField();
      const reserved = new Foothold();
      reserved.Id = 2; reserved.X1 = 0; reserved.Y1 = 100; reserved.X2 = 100; reserved.Y2 = 100;
      reserved.InitVectors();
      field._footholds = { 2: reserved };
      field.GetCrossCandidate = () => [reserved];

      const pc = new PlayerController(field);
      pc.Spawn({ x: 50, y: 0 });
      pc.ApplyKnockback(0, 100, 0);
      pc.SetReservedLandingFoothold(2);
      const collision = pc.CollisionDetectFloat(50, 50);

      expect(collision.fh?.Id).toBe(2);
      expect(collision.landed).toBe(true);
      expect(collision.x).toBe(50);
      expect(collision.y).toBe(100);
    });

    it('projects velocity onto a blocking wall tangent', () => {
      const field = makeField();
      const wall = new Foothold();
      wall.Id = 2; wall.X1 = 50; wall.Y1 = 150; wall.X2 = 50; wall.Y2 = 0;
      wall.InitVectors();
      field._footholds = { 2: wall };

      const pc = new PlayerController(field);
      pc.Spawn({ x: 0, y: 50 });
      pc.ApplyKnockback(100, 100, 0);
      const collision = pc.CollisionDetectFloat(100, 150);

      expect(collision.blocked).toBe(true);
      expect(Math.abs(collision.tangentVx ?? 0)).toBe(0);
      expect(Math.abs(collision.tangentVy ?? 0)).toBe(100);
    });

    it('treats a left-facing sloped ledge as a wall, not a landing', () => {
      const field = makeField();
      const ledge = new Foothold();
      ledge.Id = 2; ledge.X1 = 50; ledge.Y1 = 150; ledge.X2 = 40; ledge.Y2 = 0;
      ledge.InitVectors();
      field._footholds = { 2: ledge };

      const pc = new PlayerController(field);
      pc.Spawn({ x: 0, y: 50 });
      pc.ApplyKnockback(100, 100, 0);
      const collision = pc.CollisionDetectFloat(100, 150);

      expect(collision.fh?.Id).toBe(2);
      expect(collision.blocked).toBe(true);
      expect(collision.landed).toBe(false);
      expect(Math.abs(collision.tangentVy ?? 0)).toBeGreaterThan(0);
    });

    it('returns the movement fraction consumed to reach the contact', () => {
      const field = makeField();
      const wall = new Foothold();
      wall.Id = 2; wall.X1 = 50; wall.Y1 = 150; wall.X2 = 50; wall.Y2 = 0;
      wall.InitVectors();
      field._footholds = { 2: wall };

      const pc = new PlayerController(field);
      pc.Spawn({ x: 0, y: 50 });
      pc.ApplyKnockback(100, 100, 0);
      const collision = pc.CollisionDetectFloat(100, 150);

      // Movement (0,50)->(100,150); the vertical wall sits at x=50, so the
      // contact consumes exactly half of the segment (t = 50/100 = 0.5).
      expect(collision.t).toBeGreaterThanOrEqual(0);
      expect(collision.t!).toBeLessThanOrEqual(1);
      expect(collision.x).toBeCloseTo(50, 0);
      expect(collision.t).toBeCloseTo(0.5, 1);
    });

    it('bounds the fall endpoint before the foothold sweep', () => {
      const field = makeField();
      // A floor whose entire span sits past the right bound. Without the
      // OG-ordered clamp-before-sweep, CollisionDetectFloat would land on it
      // (out of bounds) and only the post-sweep clamp would yank the player
      // back, leaving CurrentFoothold pointing at the out-of-bounds floor.
      const floor = new Foothold();
      floor.Id = 5; floor.X1 = 200; floor.Y1 = 0; floor.X2 = 400; floor.Y2 = 0;
      floor.InitVectors();
      field._footholds[5] = floor;
      field._bounds = { left: -3000, top: -2000, right: 150, bottom: 2000 };

      const pc = new PlayerController(field);
      pc.Spawn({ x: 100, y: -1000 }); // airborne above, drifting right+down
      // Knockback frame (its own path); then _fallFreely takes over while airborne.
      pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 0.1);
      for (let i = 0; i < 50 && !pc.Grounded; i++) {
        pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 0.05);
      }
      // The clamped sweep must not have landed on the out-of-bounds floor.
      expect(pc.Position.x).toBeLessThanOrEqual(150 + 0.5);
      expect(pc.CurrentFoothold).not.toBe(5);
    });

    it('keeps a left-facing linked edge grounded instead of falling', () => {
      const field = makeField();
      const current = new Foothold();
      current.Id = 2; current.X1 = 0; current.Y1 = 100; current.X2 = 100; current.Y2 = 100;
      current.Next = 3;
      current.InitVectors();
      const reverse = new Foothold();
      reverse.Id = 3; reverse.X1 = 100; reverse.Y1 = 100; reverse.X2 = 0; reverse.Y2 = 100;
      reverse.Prev = 2;
      reverse.InitVectors();
      field._footholds = { 2: current, 3: reverse };

      const pc = new PlayerController(field);
      pc.Spawn({ x: 50, y: 100 });
      pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 1);

      expect(pc.Grounded).toBe(true);
      expect(pc.CurrentFoothold).toBe(2);
      expect(pc.Position.x).toBe(100);
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
