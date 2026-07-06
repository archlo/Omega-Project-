import { describe, expect, it, vi } from 'vitest';
import { GameStage } from '../../src/stages/GameStage.js';
import { AvatarLook } from '../../src/domain/AvatarLook.js';
import { InventoryType } from '../../src/domain/InventoryItem.js';
import { InventoryOpType } from '../../src/net/protocol/Enums.js';

function makeStage(look: AvatarLook): any {
  const stage: any = Object.create(GameStage.prototype);
  stage.game = { nameService: { ItemName: (id: number) => `Item ${id}` } };
  stage._player = { AvatarLook: look };
  stage._equip = {
    setEquippedByBodyPart: vi.fn(),
    unequipByBodyPart: vi.fn(),
  };
  stage._equipStats = new Map();
  stage._item = { itemIdAt: vi.fn((_tab: number, _pos: number) => 0), itemAt: vi.fn(() => undefined) };
  return stage;
}

describe('GameStage avatar equip op sync', () => {
  it('cash top overrides the visible avatar equip and restores the regular item on removal', () => {
    const look = new AvatarLook();
    look.hairEquip.set(5, 1042000);
    const stage = makeStage(look);

    stage._applyEquipOps([{ opType: InventoryOpType.Add, invType: InventoryType.Cash, pos: -105, itemId: 1049000 }]);
    expect(look.hairEquip.get(5)).toBe(1049000);
    expect(look.unseenEquip.get(5)).toBe(1042000);
    expect(stage._equip.setEquippedByBodyPart).toHaveBeenCalledWith(5, 1049000, 'Item 1049000');

    stage._applyEquipOps([{ opType: InventoryOpType.Remove, invType: InventoryType.Cash, pos: -105 }]);
    expect(look.hairEquip.get(5)).toBe(1042000);
    expect(look.unseenEquip.has(5)).toBe(false);
  });

  it('cash weapon updates weaponStickerId from the cash inventory tab', () => {
    const look = new AvatarLook();
    const stage = makeStage(look);
    stage._item.itemIdAt = vi.fn((tab: number, pos: number) => tab === 4 && pos === -111 ? 1702000 : 0);

    stage._applyEquipOps([{ opType: InventoryOpType.Move, invType: InventoryType.Cash, pos: 1, newPos: -111 }]);
    expect(stage._item.itemIdAt).toHaveBeenCalledWith(4, -111);
    expect(look.weaponStickerId).toBe(1702000);
  });
});
