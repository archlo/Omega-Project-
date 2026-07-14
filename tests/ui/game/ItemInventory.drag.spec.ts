import { describe, it, expect } from 'vitest';
import { Texture, Sprite } from 'pixi.js';
import { ItemInventory } from '../../../src/ui/game/ItemInventory.js';

// TODO_AUDIT.md item-drag-and-drop TODO: mousedown over an inventory item
// fires onDragStart (mirrors SkillBook.onDragStart's convention).
describe('ItemInventory drag-and-drop', () => {
  function fakeIcons() {
    const texture = Texture.EMPTY;
    const fakeSprite = new Sprite(texture);
    return { LoadIcon: () => ({ Texture: texture, ToPixi: () => fakeSprite }) } as any;
  }

  it('starts a drag with the item payload on mousedown over a slot', () => {
    const inv = new ItemInventory({ icons: fakeIcons() });
    inv.isVisible = true;
    inv.applyOps([{ opType: 0, invType: 1, pos: 1, itemId: 1302000, quantity: 1 }]);
    let started: any = null;
    inv.onDragStart = (payload) => { started = payload; };

    // Equip tab (index 0) is active by default; slot (0,0) at GRID_X=10, GRID_Y=51.
    inv.handleMouseButton(370 + 10 + 4, 50 + 51 + 4, true);

    expect(started).toEqual({ itemId: 1302000, slotPos: 1, invType: 1 });
  });

  it('does not start a drag when the slot is empty', () => {
    const inv = new ItemInventory({ icons: fakeIcons() });
    inv.isVisible = true;
    let started = false;
    inv.onDragStart = () => { started = true; };

    inv.handleMouseButton(370 + 10 + 4, 50 + 51 + 4, true);

    expect(started).toBe(false);
  });
});
