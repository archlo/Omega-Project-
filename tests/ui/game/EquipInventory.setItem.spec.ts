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

// OG CUIEquip::Draw @0x7AA560 dynamic SetSlotDisable rules.
describe('EquipInventory dynamic slot-disable (CUIEquip::Draw)', () => {
  function makeEq() {
    const eq = new EquipInventory();
    (eq as any)._jobId = 100;
    (eq as any)._subJob = 0;
    return eq;
  }

  it('two-handed weapon (/100000==14) disables the shield slot', () => {
    const eq = makeEq();
    eq.setEquippedByBodyPart(10, 1402000, '2H Sword'); // weapon slot, two-handed
    expect((eq as any)._isSlotDynamicallyDisabled(11)).toBe(true);  // shield slot
    eq.setEquippedByBodyPart(10, 1302000, '1H Sword'); // one-handed
    expect((eq as any)._isSlotDynamicallyDisabled(11)).toBe(false);
    eq.setEquippedByBodyPart(10, 1452000, 'Bow'); // bow is also /100000==14
    expect((eq as any)._isSlotDynamicallyDisabled(11)).toBe(true);
  });

  it('overall (/10000==105) without pants disables the pants slot', () => {
    const eq = makeEq();
    eq.setEquippedByBodyPart(5, 1050000, 'Overall');
    expect((eq as any)._isSlotDynamicallyDisabled(6)).toBe(true);
    // regular top does not
    eq.setEquippedByBodyPart(5, 1040000, 'Top');
    expect((eq as any)._isSlotDynamicallyDisabled(6)).toBe(false);
  });

  it('mount slots 18/19/20 disabled without the novice riding skill', () => {
    const eq = makeEq();
    eq.setHasNoviceSkill1004(false);
    expect((eq as any)._isSlotDynamicallyDisabled(18)).toBe(true);
    expect((eq as any)._isSlotDynamicallyDisabled(19)).toBe(true);
    expect((eq as any)._isSlotDynamicallyDisabled(20)).toBe(true);
    eq.setHasNoviceSkill1004(true);
    expect((eq as any)._isSlotDynamicallyDisabled(18)).toBe(false);
  });

  it('citizen (subJob 1, non-43) disables the weapon slot', () => {
    const eq = makeEq();
    (eq as any)._jobId = 0;
    (eq as any)._subJob = 1;
    expect((eq as any)._isSlotDynamicallyDisabled(10)).toBe(true);
    (eq as any)._jobId = 430; // job/10 == 43 exempt
    expect((eq as any)._isSlotDynamicallyDisabled(10)).toBe(false);
  });

  it('pet panel slides at seconds-based speed and lives under the equip art', () => {
    const eq = makeEq();
    eq.isVisible = true;
    ((eq as any)._togglePetPanel)();
    // _dt is in seconds: one 0.25s step should cover most of the 183px slide
    (eq as any).update(0.25);
    expect((eq as any)._petSlideX).toBeGreaterThan(100);
    (eq as any).update(0.25);
    expect((eq as any)._petSlideX).toBe(183);
    // panel container sits in the under-layer (behind the equip window's art)
    const parent = (eq as any)._petPanel.parent;
    expect(parent).toBe((eq as any)._underLayer);
  });
});
