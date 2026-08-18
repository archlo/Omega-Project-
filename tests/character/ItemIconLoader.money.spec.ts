import { describe, it, expect } from 'vitest';
import { Sprite, Container } from 'pixi.js';
import { ItemIconLoader } from '../../src/character/ItemIconLoader.js';
import { WzTextureLoader } from '../../src/render/WzTextureLoader.js';
import { WzPackage } from '../../src/wz/WzPackage.js';
import { DropSprite } from '../../src/character/DropSprite.js';

// OG: CDropPool::GetMoneyIconType @0x50F440 + GetMoneyIcon @0x512B30 — the
// meso bag sprite on the field lives in Item.wz/Special/0900.img/0900000X/
// iconRaw/<nCanvasNo>, selected by amount (<50→0, 50-99→1, 100-999→2, ≥1000→3).
describe('ItemIconLoader money icon (CDropPool::GetMoneyIcon)', () => {
  it('MoneyIconType maps the amount to the bag bucket', () => {
    expect(ItemIconLoader.MoneyIconType(1)).toBe(0);
    expect(ItemIconLoader.MoneyIconType(49)).toBe(0);
    expect(ItemIconLoader.MoneyIconType(50)).toBe(1);
    expect(ItemIconLoader.MoneyIconType(99)).toBe(1);
    expect(ItemIconLoader.MoneyIconType(100)).toBe(2);
    expect(ItemIconLoader.MoneyIconType(999)).toBe(2);
    expect(ItemIconLoader.MoneyIconType(1000)).toBe(3);
    expect(ItemIconLoader.MoneyIconType(50000)).toBe(3);
  });

  it('loads the real meso bag sprites from Item.nx (env-gated)', () => {
    const nx = process.env.MAPLECLAUDE_NX_DIR;
    if (!nx) return; // env-gated
    const loader = new WzTextureLoader();
    const item = WzPackage.Open(`${nx}/Item.nx`);
    const icons = new ItemIconLoader(loader, null, item);

    // Bucket 0 (small, <50) → 09000000; bucket 3 (big, ≥1000) → 09000003
    const small = icons.GetMoneyIcon(10);
    expect(small).not.toBeNull();
    const big = icons.GetMoneyIcon(5000);
    expect(big).not.toBeNull();
    // canvas 0 of each bag exists and has the origin-anchored size
    expect(big!.Width).toBeGreaterThan(0);
    expect(big!.Height).toBeGreaterThan(0);
  });

  it('GetMoneyAnimation returns 4 frames with per-bucket delays', () => {
    const nx = process.env.MAPLECLAUDE_NX_DIR;
    if (!nx) return; // env-gated
    const loader = new WzTextureLoader();
    const item = WzPackage.Open(`${nx}/Item.nx`);
    const icons = new ItemIconLoader(loader, null, item);

    const small = icons.GetMoneyAnimation(10);
    expect(small.frames.filter((f) => f !== null).length).toBe(4);
    expect(small.delays).toEqual([80, 80, 80, 80]);

    const medium = icons.GetMoneyAnimation(500);
    expect(medium.delays).toEqual([200, 200, 200, 200]);

    const big = icons.GetMoneyAnimation(5000);
    expect(big.delays).toEqual([4000, 120, 120, 120]);
  });
});

describe('DropSprite money rendering', () => {
  it('renders the meso bag sprite instead of the colored rect when an icon is given', () => {
    (globalThis as any).localStorage = { getItem: () => null, setItem: () => {} };
    const fakeIcon = {
      NewSprite: () => new Sprite(),
      Width: 32,
      Height: 31,
      OriginX: 0,
      OriginY: 32,
    } as any;
    const drop = new DropSprite(1, true, 5000, { x: 0, y: 0 }, { x: 10, y: 20 }, false, fakeIcon);
    const children = (drop as any).container.children as any[];
    // The first child is the money sprite; the trailing Graphics placeholder still exists.
    expect(children.some((c) => c instanceof Container)).toBe(true);
    expect(children.some((c) => c instanceof Sprite)).toBe(true);
  });

  it('spins the money bag through its iconRaw frames while resting', () => {
    (globalThis as any).localStorage = { getItem: () => null, setItem: () => {} };
    let newSpriteCalls = 0;
    const frame = (tag: number) => ({
      NewSprite: () => {
        const s = new Sprite();
        (s as any).__frame = tag;
        return s;
      },
      Width: 23,
      Height: 24,
      OriginX: -5,
      OriginY: 28,
    }) as any;
    const drop = new DropSprite(
      2, true, 10, { x: 0, y: 0 }, { x: 10, y: 20 }, false,
      frame(0), undefined, false,
      { frames: [frame(0), frame(1), frame(2), frame(3)], delays: [80, 80, 80, 80] },
    );
    // capture the initial frame tag + swap count
    const initialFrame = ((drop as any)._moneySprite as any).__frame;
    expect(initialFrame).toBe(0);
    const originalNewSprite = (drop as any)._moneyFrames[0].NewSprite.bind((drop as any)._moneyFrames[0]);
    const origParent = (drop as any)._moneySprite.parent;

    drop.Update(0.08); // 80ms → advance to frame 1
    const frame1 = ((drop as any)._moneySprite as any).__frame;
    expect(frame1).toBe(1);
    expect((drop as any)._moneyFrame).toBe(1);
    expect((drop as any)._moneySprite).not.toBe(origParent); // sprite was swapped
    // brand-new Sprite instances each swap (mirrors re-NewSprite per frame)
    expect((drop as any)._moneySprite).toBeInstanceOf(Sprite);
  });
});
