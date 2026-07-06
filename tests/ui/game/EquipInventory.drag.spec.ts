import { describe, it, expect } from 'vitest';
import { Texture } from 'pixi.js';
import { EquipInventory } from '../../../src/ui/game/EquipInventory.js';
import { InventoryType } from '../../../src/domain/InventoryItem.js';

// TODO_AUDIT.md item-drag-and-drop TODO: dragging a worn equip slot starts a
// drag (CDraggableItem::GetOffEquipItem) instead of unequipping immediately.
describe('EquipInventory drag-and-drop', () => {
  function fakeIcons() {
    const texture = Texture.EMPTY;
    return { LoadIcon: () => ({ Texture: texture }) } as any;
  }

  it('starts a drag with the equip-slot payload when icons are available', () => {
    const eq = new EquipInventory({ icons: fakeIcons() });
    eq.isVisible = true;
    eq.setEquipped('Hat', 1002140, 'Hat');
    let started: any = null;
    eq.onDragStart = (payload) => { started = payload; };
    let unequipCalled = false;
    eq.onUnequip = () => { unequipCalled = true; };

    // 'Hat' slot: ox=43, oy=27, bodyPart=1 (root offset defaults to 550,50)
    eq.handleMouseButton(550 + 43 + 4, 50 + 27 + 4, true);

    expect(started).toEqual({ itemId: 1002140, slotPos: -1, invType: InventoryType.Equip });
    expect(unequipCalled).toBe(false);
  });

  it('falls back to immediate unequip when icons are unavailable', () => {
    const eq = new EquipInventory();
    eq.isVisible = true;
    eq.setEquipped('Hat', 1002140, 'Hat');
    let unequippedBodyPart: number | null = null;
    eq.onUnequip = (bodyPart) => { unequippedBodyPart = bodyPart; };
    let dragStarted = false;
    eq.onDragStart = () => { dragStarted = true; };

    eq.handleMouseButton(550 + 43 + 4, 50 + 27 + 4, true);

    expect(unequippedBodyPart).toBe(1);
    expect(dragStarted).toBe(false);
  });
});
