import { describe, it, expect } from 'vitest';
import { PlayerController } from '../../src/character/PlayerController.js';
import { Foothold } from '../../src/map/Foothold.js';
import { MapInfo } from '../../src/map/MapInfo.js';
import type { LadderRope } from '../../src/map/LadderRope.js';

function makeField(opts: { footholds?: Record<number, Foothold>; fly?: boolean; swim?: boolean } = {}) {
  const fh = new Foothold();
  fh.Id = 1; fh.X1 = -200; fh.Y1 = 200; fh.X2 = 200; fh.Y2 = 200;
  fh.Prev = 0; fh.Next = 0;
  fh.InitVectors();

  const footholds = opts.footholds ?? { 1: fh };

  const info = new MapInfo();
  if (opts.fly) info.Fly = true;
  if (opts.swim) info.Swim = true;

  const field = {
    _info: info,
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
    GetFootholdAbove(_x: number, _yTop: number, _yBottom: number) { return null; },
    GetLadderOrRope(_x: number, _y: number) { return null; },
    GetClosestFoothold(_x: number, _y: number) { return null; },
    GetZMassWallX(_zmass: number, _fromX: number, _toX: number, _yTop: number, _yBottom: number) { return null; },
  };
  return field;
}

describe('slope physics', () => {
  it('downhill slope increases walk speed', () => {
    // Downhill: Y increases from 100 to 200 over 100px
    const fh = new Foothold();
    fh.Id = 1; fh.X1 = 0; fh.Y1 = 100; fh.X2 = 100; fh.Y2 = 200;
    fh.InitVectors();

    const field = makeField({ footholds: { 1: fh } });
    const pc = new PlayerController(field);
    pc.Spawn({ x: 50, y: 100 });

    // Walk right for 1 second
    for (let i = 0; i < 10; i++) {
      pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 0.1);
    }

    // Should have moved further than on flat ground
    const distDown = Math.abs(pc.Position.x - 50);
    expect(distDown).toBeGreaterThan(50); // More than base walk speed
  });

  it('uphill slope decreases walk speed', () => {
    // Uphill: Y decreases from 200 to 100 over 100px
    const fh = new Foothold();
    fh.Id = 1; fh.X1 = 0; fh.Y1 = 200; fh.X2 = 100; fh.Y2 = 100;
    fh.InitVectors();

    const field = makeField({ footholds: { 1: fh } });
    const pc = new PlayerController(field);
    pc.Spawn({ x: 50, y: 200 });

    // Walk right for 1 second
    for (let i = 0; i < 10; i++) {
      pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 0.1);
    }

    // Should have moved less than on flat ground
    const distUp = Math.abs(pc.Position.x - 50);
    expect(distUp).toBeLessThan(80); // Less than base walk speed
  });
});

describe('foothold force', () => {
  it('force foothold applies auto-slide when no input', () => {
    const fh = new Foothold();
    fh.Id = 1; fh.X1 = 0; fh.Y1 = 200; fh.X2 = 200; fh.Y2 = 200;
    fh.Force = 2.0; // Conveyor force
    fh.InitVectors();

    const field = makeField({ footholds: { 1: fh } });
    const pc = new PlayerController(field);
    pc.Spawn({ x: 50, y: 200 });

    // No input — should auto-slide
    for (let i = 0; i < 10; i++) {
      pc.Update({ Left: false, Right: false, Up: false, Down: false, JumpPressed: false }, 0.1);
    }

    // Should have moved due to conveyor force
    expect(pc.Position.x).toBeGreaterThan(50);
  });

  it('force opposes player input', () => {
    const fh = new Foothold();
    fh.Id = 1; fh.X1 = 0; fh.Y1 = 200; fh.X2 = 200; fh.Y2 = 200;
    fh.Force = -2.0; // Force going left
    fh.InitVectors();

    const field = makeField({ footholds: { 1: fh } });
    const pc = new PlayerController(field);
    pc.Spawn({ x: 100, y: 200 });

    // Walk right (opposing force) — should be slower
    for (let i = 0; i < 10; i++) {
      pc.Update({ Left: false, Right: true, Up: false, Down: false, JumpPressed: false }, 0.1);
    }

    // Should have moved less due to opposing force
    const dist = Math.abs(pc.Position.x - 100);
    expect(dist).toBeLessThan(50); // Reduced by force
  });
});
