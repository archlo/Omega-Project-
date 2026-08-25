import { describe, expect, it, beforeEach } from 'vitest';
import { CashShopStage } from '../../src/stages/CashShopStage.js';

/**
 * CCSWnd_Inventory 1:1 behavior: CharacterData-backed tabs, OG mouse model
 * (down = SetSelectedNo for cash items, up = OnMoveCashItemStoL), scroll
 * semantics (FirstPosition = 4*pos) and the 96-slot expansion gate.
 */
describe('CashShopStage inventory (CCSWnd_Inventory)', () => {
  let stage: any;
  let sent: any[];

  const consumeItem = (slot: number, itemId: number, quantity = 1, cashSn?: bigint) => ({
    slot,
    item: {
      itemId,
      quantity,
      cash: cashSn !== undefined,
      itemSn: cashSn ?? 0n,
    },
  });

  beforeEach(() => {
    sent = [];
    stage = new CashShopStage(null) as any;
    stage.game = { session: { send: (p: any) => sent.push(p) } };
    stage._characterData = {
      characterStat: { name: 'Tester' },
      equipInventory: [consumeItem(1, 1302000)],
      consumeInventory: [
        consumeItem(5, 2000001, 12),
        consumeItem(2, 2000000, 3),
        // Non-cash equips carry an SN but cash=false → never StoL-able
        consumeItem(7, 3010000, 1),
      ],
      installInventory: [],
      etcInventory: [consumeItem(1, 4000000, 50)],
      cashInventory: [consumeItem(1, 1702026, 1, 123n)],
    };
    stage._cashInventoryItems = [];
  });

  describe('_getInvItems maps the decoded CharacterData tabs', () => {
    it('Use tab sorts by slot and keeps quantities', () => {
      stage._invItemTI = 1;
      const items = stage._getInvItems();
      expect(items.map((i: any) => i.itemId)).toEqual([2000000, 2000001, 3010000]);
      expect(items[0].count).toBe(3);
      expect(items[1].count).toBe(12);
      expect(items.every((i: any) => i.cashSN === 0)).toBe(true);
    });

    it('tabs map to the right inventory arrays', () => {
      stage._invItemTI = 0;
      expect(stage._getInvItems().map((i: any) => i.itemId)).toEqual([1302000]);
      stage._invItemTI = 3;
      expect(stage._getInvItems().map((i: any) => i.itemId)).toEqual([4000000]);
    });

    it('Cash tab exposes liCashItemSN.lowPart and merges session purchases', () => {
      stage._invItemTI = 4;
      stage._cashInventoryItems = [{ sn: 777, itemId: 5000000, count: 1 }];
      const items = stage._getInvItems();
      expect(items.map((i: any) => i.cashSN)).toEqual([123, 777]);
    });
  });

  describe('OG scroll semantics', () => {
    it('SetSelectedNo selects absolute slots and auto-scrolls the row into view', () => {
      stage._invItemTI = 1;
      // 14 use-slot items spread over 4 rows of visible grid math
      const many = Array.from({ length: 14 }, (_, i) => consumeItem(i + 1, 2000000 + i));
      stage._characterData.consumeInventory = many;
      stage._inventoryScrollbar = { pos: 0, setRange: (_r: number) => {} };
      // Slot 13 is on row 3 — below the 3-row window at scroll pos 0
      stage._invSetSelectedNo(13);
      expect(stage._selectedInvCell).toBe(13);
      expect(stage._inventoryScrollbar.pos).toBe(1); // row-2 clamp keeps row 3 last-visible
      expect(stage._invFirstPosition).toBe(4);

      // Selecting above the window scrolls back up
      stage._invSetSelectedNo(0);
      expect(stage._inventoryScrollbar.pos).toBe(0);
      expect(stage._invFirstPosition).toBe(0);
    });

    it('mouse-down over a non-cash item never selects it (cashSN gate in OnMouseButton)', () => {
      stage._invItemTI = 1;
      stage.onMouseButton(22 + 5, 426 + 55 + 5, true, 0);
      expect(stage._selectedInvCell).toBe(-1);
    });
  });

  describe('OG click model', () => {
    beforeEach(() => {
      stage._root.x = 0;
    });

    const cellPoint = () => ({ x: 22 + 5, y: 426 + 55 + 5 }); // first visible cell

    it('mouse-down over a cash item selects it', () => {
      stage._invItemTI = 4;
      const p = cellPoint();
      stage.onMouseButton(p.x, p.y, true, 0);
      expect(stage._selectedInvCell).toBe(0);
      expect(sent.length).toBe(0);
    });

    it('mouse-up over a cash item sends exactly one MoveStoL request', () => {
      stage._invItemTI = 4;
      const p = cellPoint();
      stage.onMouseButton(p.x, p.y, false, 0);
      expect(sent.length).toBe(1);
      expect(sent[0].bytes ?? sent[0]).toBeDefined();
      // Guard: a second release must not re-send while the request is pending
      stage.onMouseButton(p.x, p.y, false, 0);
      expect(sent.length).toBe(1);
    });

    it('mouse-up over a non-cash item sends nothing', () => {
      const p = cellPoint(); // Use tab by default → non-cash items
      stage.onMouseButton(p.x, p.y, false, 0);
      expect(sent.length).toBe(0);
    });
  });

  describe('expansion gating (EnableExButton @0x4BD9D0)', () => {
    it('blocks slot expansion past the 96-slot cap without sending', () => {
      // The (176,54) button sends IncSlotCount for inventory type 2 (Setup)
      stage._characterData.installInventory = Array.from({ length: 97 }, (_, i) => consumeItem(i + 1, 2060000));
      stage.onMouseButton(176 + 5, 426 + 54 + 5, true, 0);
      expect(sent.length).toBe(0);
    });

    it('allows expansion below the cap', () => {
      stage.onMouseButton(176 + 5, 426 + 54 + 5, true, 0);
      expect(sent.length).toBe(1);
    });
  });
});
