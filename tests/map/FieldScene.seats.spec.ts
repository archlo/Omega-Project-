import { describe, it, expect } from 'vitest';
import { FieldScene } from '../../src/map/FieldScene.js';
import { GameCamera } from '../../src/map/GameCamera.js';

// TODO_AUDIT.md Seventy-sixth pass: chair/sitting — CField::FindSeatByPosition
// (decompile: [-10,+10] horizontal / [-30,+30] vertical point-in-rect
// hit-test against each WZ `seat` point).
describe('FieldScene.FindSeatByPosition', () => {
  function makeScene(): FieldScene {
    const camera = new GameCamera();
    const field = new FieldScene(null, { Load: () => null } as any, camera);
    (field as any)._seats = [{ x: 100, y: 200 }, { x: 300, y: 400 }];
    return field;
  }

  it('returns the index of the seat whose rect contains the position', () => {
    const field = makeScene();
    expect(field.FindSeatByPosition(105, 210)).toBe(0);
    expect(field.FindSeatByPosition(305, 420)).toBe(1);
  });

  it('returns -1 outside any seat rect', () => {
    const field = makeScene();
    expect(field.FindSeatByPosition(105, 250)).toBe(-1); // outside the +-30 vertical band
    expect(field.FindSeatByPosition(125, 210)).toBe(-1); // outside the +-10 horizontal band
  });

  it('GetSeatPosition returns the seat coordinates by index', () => {
    const field = makeScene();
    expect(field.GetSeatPosition(1)).toEqual({ x: 300, y: 400 });
    expect(field.GetSeatPosition(5)).toBeNull();
  });
});
