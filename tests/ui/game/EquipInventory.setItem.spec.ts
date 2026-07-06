import { describe, it, expect } from 'vitest';
import { EquipInventory } from '../../../src/ui/game/EquipInventory.js';

// TODO_AUDIT.md Hundred-and-second/Hundred-and-fifth/Hundred-and-ninth passes:
// OG CWvsContext::CheckEquippedSetItem (IDA 0x9e04d0) — count of currently
// equipped items sharing an item's setItemID.
describe('EquipInventory equipped-set counting', () => {
  function fakeIcons(setByItemId: Record<number, number>) {
    return {
      LoadAttr: (itemId: number) => ({ SetItemId: setByItemId[itemId] ?? 0 }),
    } as any;
  }

  it('counts only equipped items sharing the same setItemID', () => {
    const eq = new EquipInventory({ icons: fakeIcons({ 100: 5, 101: 5, 102: 9, 103: 0 }) });
    eq.setEquipped('Hat', 100, 'Hat');
    eq.setEquipped('Top', 101, 'Top');
    eq.setEquipped('Bottom', 102, 'Bottom'); // different set
    eq.setEquipped('Shoes', 103, 'Shoes'); // no set

    expect((eq as any)._equippedSetCount(100)).toBe(2);
    expect((eq as any)._equippedSetCount(102)).toBe(1);
  });

  it('returns 0 for items with no set and when icons is unavailable', () => {
    const eq = new EquipInventory({ icons: fakeIcons({ 100: 0 }) });
    eq.setEquipped('Hat', 100, 'Hat');
    expect((eq as any)._equippedSetCount(100)).toBe(0);

    const eqNoIcons = new EquipInventory();
    expect((eqNoIcons as any)._equippedSetCount(100)).toBe(0);
  });
});
