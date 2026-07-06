import { describe, it, expect } from 'vitest';
import { GoldHammer } from '../../../src/ui/game/GoldHammer.js';
import { KarmaScissors } from '../../../src/ui/game/KarmaScissors.js';
import { ItemProtector } from '../../../src/ui/game/ItemProtector.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';

// TODO_AUDIT.md item-drag-and-drop TODO: CUIItemUpgrade::PutItem/
// CUIKarmaDlg::PutItem/CUIItemProtector::PutItem — these dialogs could never
// receive a dropped target equip before; now implement DragTarget.
describe.each([
  ['GoldHammer', GoldHammer],
  ['KarmaScissors', KarmaScissors],
  ['ItemProtector', ItemProtector],
] as const)('%s drag-and-drop target', (_name, Ctor) => {
  it('accepts a dropped item payload while open', () => {
    const dlg = new Ctor(new WzTextureLoader(), null, null);
    dlg.ScrollPos = 5;
    dlg.ScrollItemId = 2040000;
    dlg.Open();

    const accepted = dlg.tryAcceptDrag({ itemId: 1302000, slotPos: -1, invType: 1 }, 0, 0);

    expect(accepted).toBe(true);
    expect(dlg.TargetItemTI).toBe(1302000);
    expect(dlg.TargetSlotPosition).toBe(-1);
    expect(dlg.ScrollPos).toBe(5);
    expect(dlg.ScrollItemId).toBe(2040000);
  });

  it('declines the drop while closed', () => {
    const dlg = new Ctor(new WzTextureLoader(), null, null);
    expect(dlg.tryAcceptDrag({ itemId: 1302000, slotPos: -1, invType: 1 }, 0, 0)).toBe(false);
  });

  it('declines a payload with no itemId', () => {
    const dlg = new Ctor(new WzTextureLoader(), null, null);
    dlg.Open();
    expect(dlg.tryAcceptDrag({ skillId: 1000 }, 0, 0)).toBe(false);
  });
});
