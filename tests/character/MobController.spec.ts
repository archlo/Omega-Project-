import { describe, it, expect, vi } from 'vitest';
import { MobController } from '../../src/character/MobController.js';
import { Foothold } from '../../src/map/Foothold.js';
import { LadderRope } from '../../src/map/LadderRope.js';
import { MapInfo } from '../../src/map/MapInfo.js';
import { MobInfo } from '../../src/character/MobInfo.js';
import { MobAttack } from '../../src/character/MobAttack.js';
import type { MobLook } from '../../src/character/MobLook.js';

function makeField(footholds: Record<number, Foothold> = {}, ladders: LadderRope[] = []) {
  return {
    _info: new MapInfo(),
    _footholds: footholds,
    get Info() { return this._info; },
    get Footholds() { return this._footholds; },
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
    GetLadderOrRope(x1: number, y1: number, x2 = x1, y2 = y1) {
      const minX = Math.min(x1, x2) - 10;
      const maxX = Math.max(x1, x2) + 10;
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      return ladders.find((lr) => lr.X >= minX && lr.X <= maxX && lr.Bottom >= minY && lr.Top <= maxY) ?? null;
    },
  } as any;
}

function makeMobLook(position = { x: 0, y: 0 }): MobLook {
  return {
    MobId: 1,
    TemplateId: 2100100,
    Position: { ...position },
    Hp: -1,
    MaxHp: -1,
    container: {} as any,
    IsDead: false,
    OnHit: vi.fn(),
    ShowHitEffect: vi.fn(),
    SetState: vi.fn(),
    SetFacing: vi.fn(),
    Update: vi.fn(),
    OnDie: vi.fn(),
    nameOf: () => '',
    Load: vi.fn(),
  } as any;
}

describe('MobController', () => {
  describe('OnDamagedByPlayer', () => {
    it('sets aggro timer', () => {
      const fh = new Foothold(); fh.InitVectors();
      fh.Id = 1; fh.X1 = 0; fh.Y1 = 200; fh.X2 = 100; fh.Y2 = 200;

      const mob = makeMobLook({ x: 50, y: 200 });
      const info = new MobInfo();
      const ctl = new MobController(mob, makeField({ 1: fh }), info);

      expect(ctl.IsAggressive).toBe(false);
      ctl.OnDamagedByPlayer();
      expect(ctl.IsAggressive).toBe(true);
    });
  });

  describe('CanHitPlayer / NotePlayerHit', () => {
    it('cooldown resets after timer expires', () => {
      const fh = new Foothold(); fh.InitVectors();
      fh.Id = 1; fh.X1 = 0; fh.Y1 = 200; fh.X2 = 100; fh.Y2 = 200;

      const mob = makeMobLook({ x: 50, y: 200 });
      const ctl = new MobController(mob, makeField({ 1: fh }), new MobInfo());

      expect(ctl.CanHitPlayer).toBe(true);
      ctl.NotePlayerHit();
      expect(ctl.CanHitPlayer).toBe(false);

      // Advance time past the 2s cooldown
      ctl.Update(2.1, { x: 50, y: 200 });
      expect(ctl.CanHitPlayer).toBe(true);
    });
  });

  describe('ApplyHitKnockback', () => {
    it('pushes mob horizontally', () => {
      const fh = new Foothold(); fh.InitVectors();
      fh.Id = 1; fh.X1 = 0; fh.Y1 = 200; fh.X2 = 100; fh.Y2 = 200;

      const mob = makeMobLook({ x: 50, y: 200 });
      const info = new MobInfo();
      const ctl = new MobController(mob, makeField({ 1: fh }), info);

      ctl.ApplyHitKnockback(100);
      // Knockback: pushPx=100, knockbackSec=0.2 → vx=500
      // After 0.1s → move 50px
      ctl.Update(0.1, { x: 100, y: 200 });
      expect(mob.Position.x).toBeGreaterThan(50);
    });
  });

  describe('ShouldTick', () => {
    it('returns false for stay mobs', () => {
      const mob = makeMobLook();
      const info = new MobInfo();
      info.MoveAbility = 0;
      const ctl = new MobController(mob, makeField(), info);
      expect(ctl.ShouldTick).toBe(false);
    });

    it('returns true for non-stay mobs', () => {
      const mob = makeMobLook();
      const info = new MobInfo();
      info.MoveAbility = 1;
      const ctl = new MobController(mob, makeField(), info);
      expect(ctl.ShouldTick).toBe(true);
    });
  });

  describe('IsAggressive', () => {
    it('aggressive mobs (FirstAttack) start with aggro', () => {
      const fh = new Foothold(); fh.InitVectors();
      fh.Id = 1; fh.X1 = 0; fh.Y1 = 200; fh.X2 = 100; fh.Y2 = 200;

      const mob = makeMobLook({ x: 50, y: 200 });
      const info = new MobInfo();
      info.FirstAttack = true;
      const ctl = new MobController(mob, makeField({ 1: fh }), info);

      expect(ctl.IsAggressive).toBe(true);
    });

    it('aggro timer decays over time', () => {
      const fh = new Foothold(); fh.InitVectors();
      fh.Id = 1; fh.X1 = 0; fh.Y1 = 200; fh.X2 = 100; fh.Y2 = 200;

      const mob = makeMobLook({ x: 50, y: 200 });
      const info = new MobInfo();
      const ctl = new MobController(mob, makeField({ 1: fh }), info);
      ctl.OnDamagedByPlayer();
      expect(ctl.IsAggressive).toBe(true);

      // Move player outside aggro range to prevent re-aggro
      ctl.Update(8.1, { x: 500, y: 500 });
      expect(ctl.IsAggressive).toBe(false);
    });
  });

  describe('attack trigger', () => {
    it('fires onAttackPlayer when player in range', () => {
      const fh = new Foothold(); fh.InitVectors();
      fh.Id = 1; fh.X1 = 0; fh.Y1 = 200; fh.X2 = 100; fh.Y2 = 200;

      const mob = makeMobLook({ x: 50, y: 200 });
      const info = new MobInfo();
      info.Pad = 100;
      info.FirstAttack = true; // start aggro
      const ctl = new MobController(mob, makeField({ 1: fh }), info);

      let dmg = 0;
      ctl.onAttackPlayer = (n: number) => { dmg = n; };

      // Player is at x=50, y=200 — within attack range (50x60)
      ctl.Update(1.0, { x: 50, y: 200 });
      expect(dmg).toBeGreaterThan(0);
      expect(dmg).toBeLessThanOrEqual(100);
    });

    it('does not fire onAttackPlayer when player out of range', () => {
      const fh = new Foothold(); fh.InitVectors();
      fh.Id = 1; fh.X1 = 0; fh.Y1 = 200; fh.X2 = 100; fh.Y2 = 200;

      const mob = makeMobLook({ x: 50, y: 200 });
      const info = new MobInfo();
      info.Pad = 100;
      info.FirstAttack = true;
      const ctl = new MobController(mob, makeField({ 1: fh }), info);

      let dmg = 0;
      ctl.onAttackPlayer = (n: number) => { dmg = n; };

      // Player far away
      ctl.Update(1.0, { x: 500, y: 200 });
      expect(dmg).toBe(0);
    });

    // TODO_AUDIT.md Thirty-fourth pass: real OG derives the attack range
    // from each attack's own WZ frame-0 lt/rb hit rect, not a universal
    // box. Verified live against wz_client/Mob.nx (8800000.img/attack1/0).
    it('uses the real per-attack HitRect instead of the universal box when present', () => {
      const fh = new Foothold(); fh.InitVectors();
      fh.Id = 1; fh.X1 = 0; fh.Y1 = 200; fh.X2 = 1000; fh.Y2 = 200;

      const mob = makeMobLook({ x: 50, y: 200 });
      const info = new MobInfo();
      info.Pad = 100;
      info.FirstAttack = true;
      const atk = new MobAttack();
      atk.HitRect = { ltx: -175, lty: -65, rbx: 180, rby: 0 }; // real 8800000.img/attack1 rect
      info.Attacks.set(0, atk);
      const ctl = new MobController(mob, makeField({ 1: fh }), info);

      let dmg = 0;
      ctl.onAttackPlayer = (n: number) => { dmg = n; };

      // 150px away on X — outside the universal 50px box, inside the real rect (up to 180 to the right)
      ctl.Update(1.0, { x: 200, y: 200 });
      expect(dmg).toBeGreaterThan(0);
    });

    it('mirrors the real HitRect on X when the target is to the mob\'s left', () => {
      const fh = new Foothold(); fh.InitVectors();
      fh.Id = 1; fh.X1 = -1000; fh.Y1 = 200; fh.X2 = 1000; fh.Y2 = 200;

      const mob = makeMobLook({ x: 500, y: 200 });
      const info = new MobInfo();
      info.Pad = 100;
      info.FirstAttack = true;
      const atk = new MobAttack();
      atk.HitRect = { ltx: -175, lty: -65, rbx: 180, rby: 0 };
      info.Attacks.set(0, atk);
      const ctl = new MobController(mob, makeField({ 1: fh }), info);

      let dmg = 0;
      ctl.onAttackPlayer = (n: number) => { dmg = n; };

      // 150px to the LEFT — only in range if the rect mirrors with facing
      ctl.Update(1.0, { x: 350, y: 200 });
      expect(dmg).toBeGreaterThan(0);
    });

    it('respects attack cooldown', () => {
      const fh = new Foothold(); fh.InitVectors();
      fh.Id = 1; fh.X1 = 0; fh.Y1 = 200; fh.X2 = 100; fh.Y2 = 200;

      const mob = makeMobLook({ x: 50, y: 200 });
      const info = new MobInfo();
      info.Pad = 100;
      info.FirstAttack = true;
      const ctl = new MobController(mob, makeField({ 1: fh }), info);

      let hitCount = 0;
      ctl.onAttackPlayer = () => { hitCount++; };

      ctl.Update(1.0, { x: 50, y: 200 });
      expect(hitCount).toBe(1);
      // Immediately try again
      ctl.Update(0.01, { x: 50, y: 200 });
      expect(hitCount).toBe(1);
      // After cooldown (0.7s)
      ctl.Update(0.7, { x: 50, y: 200 });
      expect(hitCount).toBe(2);
    });
  });

  describe('proximity aggro', () => {
    it('detects player within aggro range', () => {
      const fh = new Foothold(); fh.InitVectors();
      fh.Id = 1; fh.X1 = 0; fh.Y1 = 200; fh.X2 = 100; fh.Y2 = 200;

      const mob = makeMobLook({ x: 50, y: 200 });
      const info = new MobInfo();
      const ctl = new MobController(mob, makeField({ 1: fh }), info);

      // Player very close (within 10px) — 100% aggro chance
      ctl.Update(1.0, { x: 55, y: 200 });
      expect(ctl.IsAggressive).toBe(true);
    });

    it('does not aggro when player is far away', () => {
      const fh = new Foothold(); fh.InitVectors();
      fh.Id = 1; fh.X1 = 0; fh.Y1 = 200; fh.X2 = 100; fh.Y2 = 200;

      const mob = makeMobLook({ x: 50, y: 200 });
      const info = new MobInfo();
      const ctl = new MobController(mob, makeField({ 1: fh }), info);

      // Player outside aggro range (>200px away)
      ctl.Update(1.0, { x: 300, y: 200 });
      expect(ctl.IsAggressive).toBe(false);
    });
  });

  describe('body attack', () => {
    it('fires onBodyAttack when mob touches player', () => {
      const fh = new Foothold(); fh.InitVectors();
      fh.Id = 1; fh.X1 = 0; fh.Y1 = 200; fh.X2 = 100; fh.Y2 = 200;

      const mob = makeMobLook({ x: 50, y: 200 });
      const info = new MobInfo();
      info.Pad = 50;
      info.BodyAttack = true;
      info.FirstAttack = true;
      const ctl = new MobController(mob, makeField({ 1: fh }), info);

      let bodyDmg = 0;
      ctl.onBodyAttack = (n: number) => { bodyDmg = n; };

      // Player very close (within 40px)
      ctl.Update(1.0, { x: 60, y: 200 });
      expect(bodyDmg).toBeGreaterThan(0);
    });

    it('does not fire onBodyAttack when player is far', () => {
      const fh = new Foothold(); fh.InitVectors();
      fh.Id = 1; fh.X1 = 0; fh.Y1 = 200; fh.X2 = 100; fh.Y2 = 200;

      const mob = makeMobLook({ x: 50, y: 200 });
      const info = new MobInfo();
      info.Pad = 50;
      info.BodyAttack = true;
      info.FirstAttack = true;
      const ctl = new MobController(mob, makeField({ 1: fh }), info);

      let bodyDmg = 0;
      ctl.onBodyAttack = (n: number) => { bodyDmg = n; };

      // Player far away (>40px)
      ctl.Update(1.0, { x: 150, y: 200 });
      expect(bodyDmg).toBe(0);
    });
  });

  describe('foothold transitions', () => {
    it('transitions to next foothold when walking right', () => {
      const fh1 = new Foothold(); fh1.InitVectors();
      fh1.Id = 1; fh1.X1 = 0; fh1.Y1 = 200; fh1.X2 = 100; fh1.Y2 = 200;
      fh1.Next = 2;
      fh1.InitVectors();

      const fh2 = new Foothold(); fh2.InitVectors();
      fh2.Id = 2; fh2.X1 = 100; fh2.Y1 = 200; fh2.X2 = 200; fh2.Y2 = 200;
      fh2.Prev = 1;
      fh2.InitVectors();

      const mob = makeMobLook({ x: 90, y: 200 });
      const info = new MobInfo();
      info.FirstAttack = true; // Start aggressive to avoid idle delay
      const ctl = new MobController(mob, makeField({ 1: fh1, 2: fh2 }), info);

      // Chase player far right — should walk and transition
      for (let i = 0; i < 20; i++) {
        ctl.Update(0.1, { x: 500, y: 200 });
      }

      // Should have transitioned to fh2
      expect(mob.Position.x).toBeGreaterThan(100);
    });

    it('does not transition when blocked by connected foothold', () => {
      // Create a "wall" — vertical foothold blocking horizontal movement
      const fh1 = new Foothold(); fh1.InitVectors();
      fh1.Id = 1; fh1.X1 = 0; fh1.Y1 = 200; fh1.X2 = 100; fh1.Y2 = 200;
      fh1.Next = 2;
      fh1.InitVectors();

      const fh2 = new Foothold(); fh2.InitVectors();
      fh2.Id = 2; fh2.X1 = 100; fh2.Y1 = 200; fh2.X2 = 100; fh2.Y2 = 150; // Vertical wall
      fh2.Prev = 1;
      fh2.InitVectors();

      const mob = makeMobLook({ x: 90, y: 200 });
      const info = new MobInfo();
      info.FirstAttack = true;
      const ctl = new MobController(mob, makeField({ 1: fh1, 2: fh2 }), info);

      // Try to walk into the wall
      for (let i = 0; i < 20; i++) {
        ctl.Update(0.1, { x: 500, y: 200 });
      }

      // Should not have passed the wall (x should be <= 100)
      expect(mob.Position.x).toBeLessThanOrEqual(100);
    });
  });

  describe('slope walking', () => {
    it('walks faster downhill than uphill', () => {
      // Downhill slope (Y increases as X increases)
      const fhDown = new Foothold(); fhDown.InitVectors();
      fhDown.Id = 1; fhDown.X1 = 0; fhDown.Y1 = 100; fhDown.X2 = 100; fhDown.Y2 = 200;
      fhDown.InitVectors();

      // Uphill slope (Y decreases as X increases)
      const fhUp = new Foothold(); fhUp.InitVectors();
      fhUp.Id = 2; fhUp.X1 = 0; fhUp.Y1 = 200; fhUp.X2 = 100; fhUp.Y2 = 100;
      fhUp.InitVectors();

      const mobDown = makeMobLook({ x: 50, y: 150 });
      const mobUp = makeMobLook({ x: 50, y: 150 });
      const info = new MobInfo();
      info.FirstAttack = true;

      const ctlDown = new MobController(mobDown, makeField({ 1: fhDown }), info);
      const ctlUp = new MobController(mobUp, makeField({ 2: fhUp }), info);

      // Walk both for same duration
      for (let i = 0; i < 10; i++) {
        ctlDown.Update(0.1, { x: 500, y: 150 });
        ctlUp.Update(0.1, { x: 500, y: 150 });
      }

      // Downhill mob should have moved further
      const distDown = Math.abs(mobDown.Position.x - 50);
      const distUp = Math.abs(mobUp.Position.x - 50);
      expect(distDown).toBeGreaterThan(distUp);
    });

    it('applies foothold force in the direction of travel', () => {
      const normal = new Foothold(); normal.InitVectors();
      normal.Id = 1; normal.X1 = 0; normal.Y1 = 200; normal.X2 = 1000; normal.Y2 = 200;
      const conveyor = new Foothold(); conveyor.InitVectors();
      conveyor.Id = 2; conveyor.X1 = 0; conveyor.Y1 = 200; conveyor.X2 = 1000; conveyor.Y2 = 200;
      conveyor.Force = 2;

      const info = new MobInfo();
      info.FirstAttack = true;
      const normalMob = makeMobLook({ x: 100, y: 200 });
      const conveyorMob = makeMobLook({ x: 100, y: 200 });
      new MobController(normalMob, makeField({ 1: normal }), info).Update(0.1, { x: 500, y: 200 });
      new MobController(conveyorMob, makeField({ 2: conveyor }), info).Update(0.1, { x: 500, y: 200 });

      expect(conveyorMob.Position.x).toBeGreaterThan(normalMob.Position.x);
    });

    it('keeps a mob at the same relative point on a moving foothold', () => {
      const fh = new Foothold(); fh.InitVectors();
      fh.Id = 1; fh.X1 = 0; fh.Y1 = 200; fh.X2 = 200; fh.Y2 = 200;
      const mob = makeMobLook({ x: 100, y: 200 });
      const info = new MobInfo();
      info.FirstAttack = true;
      const field = makeField({ 1: fh });
      const ctl = new MobController(mob, field, info);

      ctl.Update(0.01, { x: 500, y: 200 });
      fh.SetPosition(10, 210, 210, 210);
      ctl.Update(0.01, { x: 500, y: 200 });

      expect(mob.Position.x).toBeCloseTo(110, 0);
      expect(mob.Position.y).toBeCloseTo(210, 0);
    });
  });

  describe('OnServerMove', () => {
    it('does not teleport mob to last path element (interpolation owned by MobLook)', () => {
      const fh = new Foothold(); fh.InitVectors();
      fh.Id = 1; fh.X1 = 0; fh.Y1 = 200; fh.X2 = 100; fh.Y2 = 200;

      const mob = makeMobLook({ x: 50, y: 200 });
      const ctl = new MobController(mob, makeField({ 1: fh }), new MobInfo());

      const path = {
        originX: 50, originY: 200,
        elements: [
          { attr: 0, x: 55, y: 200, vx: 0, vy: 0, fh: 1, moveAction: 1, elapse: 250 },
          { attr: 0, x: 95, y: 200, vx: 0, vy: 0, fh: 1, moveAction: 1, elapse: 250 },
        ],
      };
      ctl.OnServerMove(path, 1, false);

      // The mob should stay near the interpolation start (first element),
      // not snap to the final path position.
      expect(mob.Position.x).toBeLessThan(95);
      expect(mob.Position.y).toBe(200);
      // Foothold from path is adopted for subsequent client-side stepping
      expect(ctl.IsAggressive).toBe(false);

      ctl.Update(0.4, { x: 500, y: 200 });
      expect(mob.Position.x).toBe(50);
      ctl.Update(0.2, { x: 500, y: 200 });
      ctl.Update(0.01, { x: 500, y: 200 });
      expect(mob.Position.x).toBeGreaterThan(50);
    });

    it('retains the server endpoint for escort mobs without simulating it locally', () => {
      const mob = makeMobLook({ x: 10, y: 200 });
      const info = new MobInfo();
      info.EscortType = 1;
      const ctl = new MobController(mob, makeField(), info);

      ctl.OnServerMove({
        originX: 10, originY: 200,
        elements: [{ attr: 0, x: 80, y: 150, vx: 0, vy: 0, fh: 0, moveAction: 1, elapse: 500 }],
      }, 1, false);

      expect(ctl.ShouldTick).toBe(false);
      expect(ctl.EscortDestination).toEqual({ x: 80, y: 150 });
      ctl.Update(1, { x: 10, y: 200 });
      expect(mob.Position).toEqual({ x: 10, y: 200 });
    });
  });

  describe('ladder movement', () => {
    it('climbs a ladder only for hybrid move ability 6', () => {
      const lower = new Foothold(); lower.InitVectors();
      lower.Id = 1; lower.X1 = 0; lower.Y1 = 200; lower.X2 = 200; lower.Y2 = 200;
      const upper = new Foothold(); upper.InitVectors();
      upper.Id = 2; upper.X1 = 0; upper.Y1 = 100; upper.X2 = 200; upper.Y2 = 100;
      const ladder = new LadderRope(1, true, false, 100, 100, 200, 0);
      const mob = makeMobLook({ x: 100, y: 200 });
      const info = new MobInfo();
      info.MoveAbility = 6;
      const ctl = new MobController(mob, makeField({ 1: lower, 2: upper }, [ladder]), info);

      ctl.Update(0.1, { x: 100, y: 100 });

      expect(mob.Position.x).toBe(100);
      expect(mob.Position.y).toBeLessThan(200);
      expect(mob.SetState).toHaveBeenCalledWith(6);
    });

    it('does not climb for ordinary walking mobs', () => {
      const fh = new Foothold(); fh.InitVectors();
      fh.Id = 1; fh.X1 = 0; fh.Y1 = 200; fh.X2 = 200; fh.Y2 = 200;
      const ladder = new LadderRope(1, true, false, 100, 100, 200, 0);
      const mob = makeMobLook({ x: 100, y: 200 });
      const info = new MobInfo();
      info.FirstAttack = true;
      const ctl = new MobController(mob, makeField({ 1: fh }, [ladder]), info);

      ctl.Update(0.1, { x: 100, y: 100 });

      expect(mob.Position.y).toBe(200);
      expect(mob.SetState).not.toHaveBeenCalledWith(6);
    });
  });
});
