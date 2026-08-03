import { describe, expect, it } from 'vitest';
import { Foothold } from '../../src/map/Foothold.js';
import { FootholdIndex } from '../../src/map/FootholdIndex.js';

function foothold(id: number, x1: number, y1: number, x2: number, y2: number): Foothold {
  const fh = new Foothold();
  fh.Id = id;
  fh.X1 = x1;
  fh.Y1 = y1;
  fh.X2 = x2;
  fh.Y2 = y2;
  return fh;
}

describe('FootholdIndex', () => {
  it('returns only true AABB candidates, including an empty result', () => {
    const index = new FootholdIndex();
    const first = foothold(1, 0, 0, 10, 0);
    const second = foothold(2, 100, 100, 110, 100);
    index.insert(first);
    index.insert(second);

    expect(index.search(2, -1, 3, 1)).toEqual([first]);
    expect(index.search(50, 50, 60, 60)).toEqual([]);
  });

  it('updates moved footholds incrementally', () => {
    const index = new FootholdIndex();
    const fh = foothold(1, 0, 0, 10, 0);
    index.insert(fh);
    fh.SetPosition(100, 110, 100, 100);
    index.update(fh);

    expect(index.search(0, 0, 10, 0)).toEqual([]);
    expect(index.search(100, 100, 110, 100)).toEqual([fh]);
  });

  it('removes leaves without rebuilding the remaining tree', () => {
    const index = new FootholdIndex();
    const first = foothold(1, 0, 0, 10, 0);
    const second = foothold(2, 20, 0, 30, 0);
    index.insert(first);
    index.insert(second);
    index.remove(first);

    expect(index.search(-1, -1, 11, 1)).toEqual([]);
    expect(index.search(19, -1, 31, 1)).toEqual([second]);
  });
});
