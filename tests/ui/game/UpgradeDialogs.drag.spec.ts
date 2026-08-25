import { describe, it, expect } from 'vitest';
import { GoldHammer } from '../../../src/ui/game/GoldHammer.js';
import { KarmaScissors } from '../../../src/ui/game/KarmaScissors.js';
import { ItemProtector } from '../../../src/ui/game/ItemProtector.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';

// CUIKarmaDlg::PutItem family — dropping an equip onto an open dialog stores
// its SERVER inventory type (nTargetTI on the opcode-85 wire, decoded back
// via InventoryType.getByValue by kinoko KARMASCISSORS/ITEMUPGRADE), NOT the
// dragged item's id. Inventory equips only; worn slots are never targets.
type DialogCtor = new (loader: WzTextureLoader, ui: null, font: null) => {
  ScrollPos: number; ScrollItemId: number; TargetItemTI: number; TargetSlotPosition: number;
  Open(scrollPos?: number, scrollItemId?: number): void;
  tryAcceptDrag(payload: unknown, x: number, y: number): boolean;
};
describe.each([
  ['GoldHammer', GoldHammer],
  ['ItemProtector', ItemProtector],
] as const)('%s drag-and-drop target', (_name, Ctor) => {
  it('stores the equip inventory type + slot as the packet target', () => {
    const dlg = new Ctor(new WzTextureLoader(), null, null);
    dlg.ScrollPos = 5;
    dlg.ScrollItemId = 5570000;
    dlg.Open();

    const accepted = dlg.tryAcceptDrag({ itemId: 1302000, slotPos: 9, invType: 1 }, 0, 0);

    expect(accepted).toBe(true);
    expect(dlg.TargetItemTI).toBe(1);
    expect(dlg.TargetSlotPosition).toBe(9);
    expect(dlg.ScrollPos).toBe(5);
    expect(dlg.ScrollItemId).toBe(5570000);
  });

  it('declines the drop while closed', () => {
    const dlg = new Ctor(new WzTextureLoader(), null, null);
    expect(dlg.tryAcceptDrag({ itemId: 1302000, slotPos: 9, invType: 1 }, 0, 0)).toBe(false);
  });

  it('declines a payload with no invType', () => {
    const dlg = new Ctor(new WzTextureLoader(), null, null);
    dlg.Open();
    expect(dlg.tryAcceptDrag({ skillId: 1000 }, 0, 0)).toBe(false);
  });
});

describe('KarmaScissors drag-and-drop target', () => {
  const Ctor = KarmaScissors as DialogCtor;

  it('Open(nPOS, nItemID) seeds the scissors being used and clears any previous target', () => {
    const dlg = new Ctor(new WzTextureLoader(), null, null);
    dlg.Open(3, 5520000);
    expect(dlg.ScrollPos).toBe(3);
    expect(dlg.ScrollItemId).toBe(5520000);
    expect(dlg.TargetSlotPosition).toBe(0);
  });

  it('accepts an inventory equip drop and records TI=Equip', () => {
    const dlg = new Ctor(new WzTextureLoader(), null, null);
    dlg.Open(2, 5520001);
    const accepted = dlg.tryAcceptDrag({ itemId: 1040000, slotPos: 4, invType: 1 }, 0, 0);
    expect(accepted).toBe(true);
    expect(dlg.hasValidTarget).toBe(true);
  });

  it('declines non-equip payloads and worn/negative slots', () => {
    const dlg = new Ctor(new WzTextureLoader(), null, null);
    dlg.Open(2, 5520000);
    expect(dlg.tryAcceptDrag({ itemId: 2000000, slotPos: 1, invType: 2 }, 0, 0)).toBe(false);
    expect(dlg.tryAcceptDrag({ itemId: 1040000, slotPos: -5, invType: 1 }, 0, 0)).toBe(false);
    expect(dlg.hasValidTarget).toBe(false);
  });
});
