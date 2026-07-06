import { describe, it, expect, vi } from 'vitest';
import { MobController } from '../../src/character/MobController.js';
import { Foothold } from '../../src/map/Foothold.js';
import { MapInfo } from '../../src/map/MapInfo.js';
import { MobInfo } from '../../src/character/MobInfo.js';
import { MobAttack } from '../../src/character/MobAttack.js';
import type { MobLook } from '../../src/character/MobLook.js';

function makeField(footholds: Record<number, Foothold> = {}) {
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
      const fh = new Foothold();
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
      const fh = new Foothold();
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
      const fh = new Foothold();
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
      const fh = new Foothold();
      fh.Id = 1; fh.X1 = 0; fh.Y1 = 200; fh.X2 = 100; fh.Y2 = 200;

      const mob = makeMobLook({ x: 50, y: 200 });
      const info = new MobInfo();
      info.FirstAttack = true;
      const ctl = new MobController(mob, makeField({ 1: fh }), info);

      expect(ctl.IsAggressive).toBe(true);
    });

    it('aggro timer decays over time', () => {
      const fh = new Foothold();
      fh.Id = 1; fh.X1 = 0; fh.Y1 = 200; fh.X2 = 100; fh.Y2 = 200;

      const mob = makeMobLook({ x: 50, y: 200 });
      const info = new MobInfo();
      const ctl = new MobController(mob, makeField({ 1: fh }), info);
      ctl.OnDamagedByPlayer();
      expect(ctl.IsAggressive).toBe(true);

      ctl.Update(8.1, { x: 50, y: 200 });
      expect(ctl.IsAggressive).toBe(false);
    });
  });

  describe('attack trigger', () => {
    it('fires onAttackPlayer when player in range', () => {
      const fh = new Foothold();
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
      const fh = new Foothold();
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
      const fh = new Foothold();
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
      const fh = new Foothold();
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
      const fh = new Foothold();
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
});
