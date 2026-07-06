import { describe, it, expect } from 'vitest';
import { Foothold } from '../../src/map/Foothold.js';

describe('Foothold', () => {
  it('Slope returns 0 for vertical line', () => {
    const fh = new Foothold();
    fh.X1 = 100; fh.Y1 = 0; fh.X2 = 100; fh.Y2 = 200;
    expect(fh.Slope).toBe(0);
  });

  it('Slope returns correct ratio', () => {
    const fh = new Foothold();
    fh.X1 = 0; fh.Y1 = 0; fh.X2 = 100; fh.Y2 = 50;
    expect(fh.Slope).toBe(0.5);
  });

  it('IsWall returns true when X1==X2', () => {
    const fh = new Foothold();
    fh.X1 = 50; fh.X2 = 50;
    expect(fh.IsWall).toBe(true);
  });

  it('IsWall returns false when X1!=X2', () => {
    const fh = new Foothold();
    fh.X1 = 0; fh.X2 = 100;
    expect(fh.IsWall).toBe(false);
  });

  it('LeftEdgeX returns min', () => {
    const fh = new Foothold();
    fh.X1 = 200; fh.X2 = 50;
    expect(fh.LeftEdgeX).toBe(50);
  });

  it('RightEdgeX returns max', () => {
    const fh = new Foothold();
    fh.X1 = 200; fh.X2 = 50;
    expect(fh.RightEdgeX).toBe(200);
  });

  describe('YAt', () => {
    it('returns null when x out of range (left)', () => {
      const fh = new Foothold();
      fh.X1 = 100; fh.Y1 = 200; fh.X2 = 200; fh.Y2 = 300;
      expect(fh.YAt(50)).toBeNull();
    });

    it('returns null when x out of range (right)', () => {
      const fh = new Foothold();
      fh.X1 = 100; fh.Y1 = 200; fh.X2 = 200; fh.Y2 = 300;
      expect(fh.YAt(250)).toBeNull();
    });

    it('interpolates Y correctly on horizontal foothold', () => {
      const fh = new Foothold();
      fh.X1 = 0; fh.Y1 = 200; fh.X2 = 100; fh.Y2 = 200;
      expect(fh.YAt(50)).toBe(200);
    });

    it('interpolates Y correctly on sloped foothold', () => {
      const fh = new Foothold();
      fh.X1 = 0; fh.Y1 = 200; fh.X2 = 100; fh.Y2 = 300;
      expect(fh.YAt(50)).toBe(250);
    });

    it('returns min Y for wall foothold', () => {
      const fh = new Foothold();
      fh.X1 = 100; fh.Y1 = 200; fh.X2 = 100; fh.Y2 = 400;
      expect(fh.YAt(100)).toBe(200);
    });

    it('works with X1 > X2 (reversed direction)', () => {
      const fh = new Foothold();
      fh.X1 = 100; fh.Y1 = 300; fh.X2 = 0; fh.Y2 = 200;
      expect(fh.YAt(50)).toBe(250);
    });

    it('returns exact endpoint values', () => {
      const fh = new Foothold();
      fh.X1 = 0; fh.Y1 = 100; fh.X2 = 100; fh.Y2 = 200;
      expect(fh.YAt(0)).toBe(100);
      expect(fh.YAt(100)).toBe(200);
    });
  });

  describe('DistanceSquaredTo', () => {
    it('returns 0 at exact midpoint', () => {
      const fh = new Foothold();
      fh.X1 = 0; fh.Y1 = 0; fh.X2 = 100; fh.Y2 = 0;
      expect(fh.DistanceSquaredTo(50, 0)).toBe(0);
    });

    it('returns perpendicular distance squared', () => {
      const fh = new Foothold();
      fh.X1 = 0; fh.Y1 = 0; fh.X2 = 100; fh.Y2 = 0;
      expect(fh.DistanceSquaredTo(50, 10)).toBe(100);
    });

    it('clamps t to [0,1] for points before segment', () => {
      const fh = new Foothold();
      fh.X1 = 50; fh.Y1 = 0; fh.X2 = 100; fh.Y2 = 0;
      expect(fh.DistanceSquaredTo(0, 0)).toBe(2500);
    });

    it('clamps t to [0,1] for points after segment', () => {
      const fh = new Foothold();
      fh.X1 = 0; fh.Y1 = 0; fh.X2 = 50; fh.Y2 = 0;
      expect(fh.DistanceSquaredTo(100, 0)).toBe(2500);
    });

    it('handles zero-length segment', () => {
      const fh = new Foothold();
      fh.X1 = 50; fh.Y1 = 100; fh.X2 = 50; fh.Y2 = 100;
      expect(fh.DistanceSquaredTo(50, 100)).toBe(0);
      expect(fh.DistanceSquaredTo(60, 100)).toBe(100);
    });
  });
});
