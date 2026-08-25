import { describe, it, expect } from 'vitest';

// Pixi v8 Text needs a 2D context at construction — same shim as ChatBar.spec.
if (typeof document !== 'undefined' && !('__canvasShim' in (globalThis as Record<string, unknown>))) {
  const proto = HTMLCanvasElement.prototype as unknown as Record<string, unknown>;
  if (!proto.getContext) {
    proto.getContext = () => ({
      measureText: (t: string) => ({ width: t.length * 7 }),
      fillText: () => {},
      strokeText: () => {},
    });
  }
  (globalThis as Record<string, unknown>).__canvasShim = true;
}

import { EnchantSkill } from '../../../src/ui/game/EnchantSkill.js';
import { InventoryType } from '../../../src/domain/InventoryItem.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';
import type { ItemDragPayload } from '../../../src/ui/game/ItemInventory.js';

function equip(slotPos: number): ItemDragPayload {
  return { itemId: 1302000, slotPos, invType: InventoryType.Equip };
}
function scroll(slotPos: number): ItemDragPayload {
  return { itemId: 2040000, slotPos, invType: InventoryType.Consume };
}

// OG CUIEnchantDlg: ctor 0x7A1B30 / PutItem 0x7A1200 / GetWhiteScrollCheck
// 0x7A08E0 / EnableWhiteScrollCheck 0x7A0940 / SetResult 0x7A1340 /
// ShowResult 0x7A1610 / ModifyEquipItem case 0 @0x50654F.
describe('CUIEnchantDlg port', () => {
  it('PutItem parks an inventory equip; rejects worn slots', () => {
    const dlg = new EnchantSkill(new WzTextureLoader(), null, null);
    expect(dlg.PutItem(1302000, 9)).toBe(true);
    expect(dlg.hasValidTarget).toBe(true);
    expect(dlg.PutItem(1302000, -5)).toBe(false); // worn slot
  });

  it('PutItem rejects cash items except pet equips (/10000 == 180)', () => {
    const dlg = new EnchantSkill(new WzTextureLoader(), null, null);
    const notices: string[] = [];
    dlg.OnNotice = (t) => notices.push(t);
    expect(dlg.PutItem(5520000, 3)).toBe(false); // cash scissors
    expect(notices.length).toBe(1);
    expect(dlg.PutItem(1802000, 3)).toBe(true); // pet equip allowed
  });

  it('checkbox: enabled+checked with white scroll in inventory, unchecked otherwise', () => {
    const dlg = new EnchantSkill(new WzTextureLoader(), null, null);
    dlg.Open();
    expect(dlg.GetWhiteScrollCheck()).toBe(1);
    dlg.EnableWhiteScrollCheck(true);
    expect(dlg.GetWhiteScrollCheck()).toBe(2); // (checked!=0)+1
    dlg.EnableWhiteScrollCheck(false);
    expect(dlg.GetWhiteScrollCheck()).toBe(1);
  });

  it('dropping a scroll on the parked-equip dialog sends bEnchantSkill=1 once', () => {
    const dlg = new EnchantSkill(new WzTextureLoader(), null, null);
    dlg.Open();
    const sent: Array<[number, number, boolean]> = [];
    dlg.OnEnchantRequest = (s, e, w) => sent.push([s, e, w]);
    dlg.EnableWhiteScrollCheck(true);

    expect(dlg.tryAcceptDrag(equip(9), 0, 0)).toBe(true);
    expect(dlg.tryAcceptDrag(scroll(4), 0, 0)).toBe(true);
    expect(sent).toEqual([[4, 9, true]]);
    // requestSent guard blocks re-sends and button clicks
    expect(dlg.tryAcceptDrag(scroll(5), 0, 0)).toBe(false);
    expect(dlg.isRequestSent).toBe(true);
  });

  it('scroll drop without a parked equip is declined', () => {
    const dlg = new EnchantSkill(new WzTextureLoader(), null, null);
    dlg.Open();
    let sent = 0;
    dlg.OnEnchantRequest = () => { sent++; };
    expect(dlg.tryAcceptDrag(scroll(4), 0, 0)).toBe(false);
    expect(sent).toBe(0);
  });

  it('SetResult(-1) surfaces the notice and re-enables', () => {
    const dlg = new EnchantSkill(new WzTextureLoader(), null, null);
    dlg.Open();
    const notices: string[] = [];
    dlg.OnNotice = (t) => notices.push(t);
    dlg.SetResult(-1, false, 0, false);
    expect(notices.length).toBe(1);
    expect(dlg.isRequestSent).toBe(false);
  });

  it('SetResult -> effect finishes -> ShowResult success line (white-scroll variant)', () => {
    const dlg = new EnchantSkill(new WzTextureLoader(), null, null);
    dlg.Open();
    dlg.EnableWhiteScrollCheck(true);
    const lines: string[] = [];
    let worldEffect: boolean[] = [];
    dlg.OnChatLine = (t) => lines.push(t);
    dlg.OnShowWorldEffect = (ok) => worldEffect.push(ok);

    dlg.SetResult(1, false, 0, true);
    expect(lines.length).toBe(0); // parked until IsOKToShowResult
    for (let i = 0; i < 40 && lines.length === 0; i++) dlg.update(0.05); // 26 frames @100ms
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain('white scroll was used');
    expect(worldEffect).toEqual([true]);
    expect(dlg.isRequestSent).toBe(false);
  });

  it('cursed failure closes the dialog after ShowResult', () => {
    const dlg = new EnchantSkill(new WzTextureLoader(), null, null);
    dlg.Open();
    const lines: string[] = [];
    dlg.OnChatLine = (t) => lines.push(t);
    dlg.SetResult(0, true, 0, false);
    for (let i = 0; i < 40 && dlg.isVisible; i++) dlg.update(0.05);
    expect(lines[0]).toBe('The item is destroyed due to the overwhelming power of the scroll.');
    expect(dlg.isVisible).toBe(false);
  });

  it('enchantCategory & 2 overrides the message matrix', () => {
    const dlg = new EnchantSkill(new WzTextureLoader(), null, null);
    dlg.Open();
    const lines: string[] = [];
    dlg.OnChatLine = (t) => lines.push(t);
    dlg.SetResult(0, false, 2, false);
    for (let i = 0; i < 40 && lines.length === 0; i++) dlg.update(0.05);
    expect(lines[0]).toBe('You fail to upgrade the equipment.');
  });
});
