import { describe, it, expect } from 'vitest';
import { ItemInventory } from '../../../src/ui/game/ItemInventory.js';

// TODO_AUDIT.md Seventy-sixth pass: chair/sitting — CUserLocal::HandleXKeyDown
// scans the Install tab (invType 3, tab index 2) for the first
// is_portable_chair_item (itemId/10000===301) match.
describe('ItemInventory.FindPortableChair', () => {
  it('finds a portable chair item in the Install tab', () => {
    const inv = new ItemInventory();
    inv.applyOps([{ opType: 0, invType: 3, pos: 1, itemId: 3010100, quantity: 1 }]);
    const chair = inv.FindPortableChair();
    expect(chair?.id).toBe(3010100);
  });

  it('ignores non-chair items in the Install tab', () => {
    const inv = new ItemInventory();
    inv.applyOps([{ opType: 0, invType: 3, pos: 1, itemId: 4000000, quantity: 1 }]);
    expect(inv.FindPortableChair()).toBeNull();
  });

  it('ignores chair-id items outside the Install tab', () => {
    const inv = new ItemInventory();
    inv.applyOps([{ opType: 0, invType: 2, pos: 1, itemId: 3010100, quantity: 1 }]);
    expect(inv.FindPortableChair()).toBeNull();
  });
});
