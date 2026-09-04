import { describe, expect, it, vi } from 'vitest';
import { Text, Texture } from 'pixi.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { InHeader } from '../../../src/net/packet/OpCodes.js';
import { TAB_TO_INVTYPE, INVTYPE_TO_TAB } from '../../../src/ui/game/ItemInventory.js';
import { TradingRoom } from '../../../src/ui/game/TradingRoom.js';
import { PersonalShop } from '../../../src/ui/game/PersonalShop.js';
import { ItemScrollDialog } from '../../../src/ui/game/ItemScrollDialog.js';
import { VegaDialog } from '../../../src/ui/game/VegaDialog.js';
import { KeyConfig } from '../../../src/ui/game/KeyConfig.js';
import { SkillMacro } from '../../../src/ui/game/SkillMacro.js';
import { QuickSlotBar } from '../../../src/ui/game/QuickSlotBar.js';
import { FuncKeyType } from '../../../src/domain/FuncKeyMapped.js';
import { MegaphoneCompose } from '../../../src/ui/game/MegaphoneCompose.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';
import { GameStage } from '../../../src/stages/GameStage.js';
import { InventoryType } from '../../../src/domain/InventoryItem.js';

// ponytail: avoids pulling in jsdom just to satisfy Text.width/height's canvas measurement in tests
Object.defineProperty(Text.prototype, 'width', { get: () => 0 });
Object.defineProperty(Text.prototype, 'height', { get: () => 0 });

// OG CDraggableItem::OnDropped matrix + ThrowItem guards (live IDB):
// - payload TI is the SERVER type (tabs 2/3 swapped — tab+1 is wrong there),
// - trade/shop windows arm pendingItem from drags (PutItem path),
// - scroll dialog takes Equip TI only; Vega discriminates by TI, not id range,
// - KeyConfig item drops pass the MapFuncKey category gate,
// - worn equips thrown over the field go straight to the ground (newPos 0).

describe('drag payload TI mapping', () => {
  it('swaps visual tabs 2/3 to server TIs 4/3', () => {
    expect(TAB_TO_INVTYPE).toEqual([1, 2, 4, 3, 5]);
    expect(INVTYPE_TO_TAB).toEqual({ 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 });
  });
});

describe('TradingRoom drag target', () => {
  it('arms pendingItem from an inventory drag', () => {
    const room = new TradingRoom();
    room.isVisible = true;
    const ok = room.tryAcceptDrag({ itemId: 2000000, slotPos: 3, invType: 2, quantity: 50 }, 0, 0);
    expect(ok).toBe(true);
    expect(room.pendingItem).toEqual({ invType: 2, position: 3, itemId: 2000000, quantity: 50 });
  });

  it('rejects worn slots and locked offers', () => {
    const room = new TradingRoom();
    room.isVisible = true;
    expect(room.tryAcceptDrag({ itemId: 1302000, slotPos: -11, invType: 1 }, 0, 0)).toBe(false);
    expect(room.pendingItem).toBe(null);
  });
});

describe('PersonalShop drag target', () => {
  it('arms pendingItem for the owner from an inventory drag', () => {
    const shop = new PersonalShop(null, null, null);
    shop.isVisible = true;
    (shop as any)._isOwner = true;
    const ok = shop.tryAcceptDrag({ itemId: 4000000, slotPos: 2, invType: 4, quantity: 10 }, 0, 0);
    expect(ok).toBe(true);
    expect(shop.pendingItem).toEqual({ invType: 4, position: 2, stackSize: 10 });
  });

  it('rejects visitor and worn-slot drags', () => {
    const shop = new PersonalShop(null, null, null);
    shop.isVisible = true;
    (shop as any)._isOwner = false;
    expect(shop.tryAcceptDrag({ itemId: 4000000, slotPos: 2, invType: 4 }, 0, 0)).toBe(false);
    (shop as any)._isOwner = true;
    expect(shop.tryAcceptDrag({ itemId: 1302000, slotPos: -11, invType: 1 }, 0, 0)).toBe(false);
    expect(shop.pendingItem).toBe(null);
  });
});

describe('ItemScrollDialog TI guard', () => {
  it('accepts Equip TI and rejects scroll/consume payloads as target', () => {
    const dlg = new ItemScrollDialog(new WzTextureLoader(), null, null);
    dlg.Open(1, 2040000);
    expect(dlg.tryAcceptDrag({ itemId: 1302000, slotPos: 5, invType: 1 }, 0, 0)).toBe(true);
    expect(dlg.tryAcceptDrag({ itemId: 2040000, slotPos: 1, invType: 2 }, 0, 0)).toBe(false);
    expect(dlg.tryAcceptDrag({ itemId: 4000000, slotPos: 1, invType: 4 }, 0, 0)).toBe(false);
  });
});

describe('VegaDialog TI discriminator', () => {
  it('routes by inventory type, not id range', () => {
    const dlg = new VegaDialog(new WzTextureLoader(), null, null);
    dlg.isVisible = true;
    // Cash equip (5M id) is still an equip by TI.
    expect(dlg.tryAcceptDrag({ itemId: 5000000, slotPos: -5, invType: 1 }, 0, 0)).toBe(true);
    // Use-tab scroll by TI.
    expect(dlg.tryAcceptDrag({ itemId: 2040000, slotPos: 2, invType: 2 }, 0, 0)).toBe(true);
    // Setup/Etc/Cash tabs are neither.
    expect(dlg.tryAcceptDrag({ itemId: 4000000, slotPos: 1, invType: 4 }, 0, 0)).toBe(false);
    expect(dlg.tryAcceptDrag({ itemId: 50200000, slotPos: 1, invType: 5 }, 0, 0)).toBe(false);
  });
});

describe('KeyConfig item gate', () => {
  it('denies non-bindable items when the gate is injected', () => {
    const kc = new KeyConfig(new WzTextureLoader(), null, null);
    kc.isVisible = true;
    kc.isBindableItem = (id, ti) => ti === 2 && Math.floor(id / 10000) === 200;
    expect(kc.tryAcceptDrag({ itemId: 4000000, slotPos: 1, invType: 4 }, 0, 0)).toBe(false);
  });

  it('binds a gated-OK item on a real key cell', () => {
    const kc = new KeyConfig(new WzTextureLoader(), null, null);
    kc.isVisible = true;
    kc.isBindableItem = () => true;
    // Row-1 col-1 key (scancode 2) local (45..79, 66..98); root sits at (200,150).
    expect(kc.tryAcceptDrag({ itemId: 2000000, slotPos: 1, invType: 2 }, 250, 220)).toBe(true);
    expect(kc.bindingAt(2).id).toBe(2000000);
  });
});

describe('KeyConfig drag-off unmap', () => {
  function boundKeyConfig(): any {
    const kc = new KeyConfig(new WzTextureLoader(), null, null);
    kc.isVisible = true;
    kc.isBindableItem = () => true;
    kc.tryAcceptDrag({ itemId: 2000000, slotPos: 1, invType: 2 }, 250, 220);
    kc.tryAcceptDrag({ skillId: 1001003 }, 284, 220);
    return kc;
  }

  it('unmaps item bindings dropped off every key, keeps skills', () => {
    const kc = boundKeyConfig();
    // Pick up the item from sc 2 (root at 200,150 + local 50,70).
    kc.handleMouseButton(250, 220, true);
    // Release off-grid: the picked-up cell stays empty (OG UnmapFuncKey —
    // the binding is gone; OK diffs it against the open snapshot to persist).
    kc.handleMouseButton(0, 0, true);
    expect(kc.bindingAt(2).type).toBe(0);
    expect(kc._mapOnOpen[2].id).toBe(2000000);
    // Skill binding survives the same trip (OG keeps non-item drags).
    kc.handleMouseButton(284, 220, true);
    kc.handleMouseButton(0, 0, true);
    expect(kc.bindingAt(3).id).toBe(1001003);
  });
});

describe('MegaphoneCompose TI store', () => {
  it('stores the inventory type, not the item id', () => {
    const dlg = new MegaphoneCompose();
    dlg.isVisible = true;
    expect(dlg.tryAcceptDrag({ itemId: 2000000, slotPos: 3, invType: 2 }, 0, 0)).toBe(true);
    expect((dlg as any)._targetTI).toBe(2);
    expect((dlg as any)._targetPOS).toBe(3);
  });
});

describe('SkillMacro move semantics', () => {
  function openMacro(): any {
    return new SkillMacro(new WzTextureLoader(), null, null);
  }

  it('macro-to-macro drop moves (source cleared)', () => {
    const m = openMacro();
    m.Open([{ slot: 0, skills: [1111003, 0, 0] }]);
    m.isVisible = true;
    // Container at (240,100): row 0 slot 1 local (49..81, 44..76).
    const ok = m.tryAcceptDrag({ skillId: 2221001, macroSlot: 0, macroIndex: 0 }, 300, 160);
    expect(ok).toBe(true);
    expect(m._macros[0].skills).toEqual([0, 2221001, 0]);
  });

  it('same-slot drop keeps the skill', () => {
    const m = openMacro();
    m.Open([{ slot: 0, skills: [1111003, 0, 0] }]);
    m.isVisible = true;
    // Row 0 slot 0 local (15..47).
    const ok = m.tryAcceptDrag({ skillId: 1111003, macroSlot: 0, macroIndex: 0 }, 270, 160);
    expect(ok).toBe(true);
    expect(m._macros[0].skills).toEqual([1111003, 0, 0]);
  });

  it('clearSlot empties one slot', () => {
    const m = openMacro();
    m.Open([{ slot: 0, skills: [1111003, 2221001, 0] }]);
    expect(m.clearSlot(0, 1)).toBe(true);
    expect(m._macros[0].skills).toEqual([1111003, 0, 0]);
    expect(m.clearSlot(0, 2)).toBe(false);
    expect(m.clearSlot(9, 0)).toBe(false);
  });
});

describe('QuickSlotBar drag-out', () => {
  function makeBar(binding: { type: number; id: number }): any {
    const bar: any = new QuickSlotBar(
      null as any, null, null,
      () => binding as any,
      () => {},
      () => ({ Texture: Texture.EMPTY }) as any,
      () => ({ Texture: Texture.EMPTY }) as any,
    );
    bar.isVisible = true;
    bar.onDragStart = vi.fn();
    return bar;
  }

  // Popup mode (viewW <= 800): grid at (viewW/2 + 143 + 7, viewH - 144 + 15).
  // Default 800x600 → slot 0 at (550, 471), 32px cells.
  it('starts a skill drag from a bound cell', () => {
    const bar = makeBar({ type: FuncKeyType.Skill, id: 1001003 });
    expect(bar.tryStartDrag(560, 480)).toBe(true);
    expect(bar.onDragStart).toHaveBeenCalledWith({ skillId: 1001003 }, Texture.EMPTY, 560, 480);
  });

  it('starts an id-only item drag from a bound cell', () => {
    const bar = makeBar({ type: FuncKeyType.Item, id: 2000000 });
    expect(bar.tryStartDrag(560, 480)).toBe(true);
    expect(bar.onDragStart).toHaveBeenCalledWith({ itemId: 2000000 }, Texture.EMPTY, 560, 480);
  });

  it('ignores empty cells and misses', () => {
    const bar = makeBar({ type: FuncKeyType.None, id: 0 });
    expect(bar.tryStartDrag(560, 480)).toBe(false);
    expect(bar.onDragStart).not.toHaveBeenCalled();
    const bound = makeBar({ type: FuncKeyType.Skill, id: 1 });
    expect(bound.tryStartDrag(10, 10)).toBe(false);
  });
});

describe('MapFuncKey gates', () => {
  function gate(): any {
    return Object.create(GameStage.prototype);
  }

  it('binds 429/501s as Effect, 516s as Emotion, rest as Item', () => {
    const s = gate();
    expect(s._isBindableItem(2040000, 2)).toBe(false);
    expect(s._isBindableItem(2000000, 2)).toBe(true);
    expect(s._isBindableItem(3010000, 3)).toBe(true);
    expect(s._isBindableItem(4290000, 4)).toBe(true);
    expect(s._funcKeyItemType(4290000, 4)).toBe(FuncKeyType.Effect);
    expect(s._isBindableItem(5010000, 5)).toBe(true);
    expect(s._funcKeyItemType(5010000, 5)).toBe(FuncKeyType.Effect);
    expect(s._isBindableItem(5160000, 5)).toBe(true);
    expect(s._funcKeyItemType(5160000, 5)).toBe(FuncKeyType.Emotion);
    expect(s._isBindableItem(5240000, 5)).toBe(true);
    expect(s._funcKeyItemType(5240000, 5)).toBe(FuncKeyType.Item);
    expect(s._isBindableItem(4000000, 4)).toBe(false);
  });

  it('dispatches Emotion bindings through the cash-item emotion', () => {
    const s: any = Object.create(GameStage.prototype);
    s._quitOverlay = null;
    s._quizModal = null;
    s._gameMenu = null;
    s._panels = [];
    s._chatBar = null;
    s._keyConfig = { forKey: () => ({ type: FuncKeyType.Emotion, id: 5160000 }) };
    s._item = { countItem: () => 3 };
    s._player = { morphTemplateId: 0, SetEmotion: vi.fn() };
    s.game = { session: { send: vi.fn(), isConnected: true } };
    s.handleKeyDown = () => true;
    s.onKeyPress('Q');
    const out = s.game.session.send.mock.calls[0][0];
    const p = new InPacket(out.toArray());
    expect(p.readShort()).toBe(InHeader.UserEmotion);
    // 5160000 % 100 + 8 = 8
    expect(p.readInt()).toBe(8);
    expect(s._player.SetEmotion).toHaveBeenCalledWith(8);
  });

  it('skips Emotion dispatch without the item', () => {
    const s: any = Object.create(GameStage.prototype);
    s._quitOverlay = null;
    s._quizModal = null;
    s._gameMenu = null;
    s._panels = [];
    s._chatBar = null;
    s._keyConfig = { forKey: () => ({ type: FuncKeyType.Emotion, id: 5160000 }) };
    s._item = { countItem: () => 0 };
    s._player = { morphTemplateId: 0, SetEmotion: vi.fn() };
    s.game = { session: { send: vi.fn(), isConnected: true } };
    s.handleKeyDown = () => true;
    s.onKeyPress('Q');
    expect(s.game.session.send).not.toHaveBeenCalled();
  });
});

describe('GameStage drop fallback', () => {
  function makeStage(panels: any[], payload: unknown): any {
    const stage: any = Object.create(GameStage.prototype);
    stage._quizModal = null;
    stage._fadeYesNo = null;
    stage._quitOverlay = null;
    stage._gameMenu = null;
    stage._panels = panels;
    stage._dragController = { isDragging: true, payload, endDrag: vi.fn(() => false) };
    stage._item = { itemAt: () => null, firstFreeSlot: vi.fn(() => 7) };
    stage._utilDlg = null;
    stage.game = { session: { send: vi.fn() } };
    return stage;
  }

  function sentDrop(stage: any) {
    const out = stage.game.session.send.mock.calls[0][0];
    const p = new InPacket(out.toArray());
    return { op: p.readShort(), ts: p.readInt(), ti: p.readByte(), from: p.readShort(), to: p.readShort(), count: p.readShort() };
  }

  it('throws a worn equip straight to the field (OG ThrowItem)', () => {
    const stage = makeStage([], { itemId: 1302000, slotPos: -11, invType: InventoryType.Equip });
    stage.onMouseButton(400, 300, false, 0);
    const d = sentDrop(stage);
    expect(d.op).toBe(InHeader.UserChangeSlotPositionRequest);
    expect(d.to).toBe(0);
    expect(d.from).toBe(-11);
    expect(d.count).toBe(1);
  });

  it('unequips into the payload tab (Cash TI 5 → tab 4)', () => {
    const covering = { isVisible: true, container: { getBounds: () => ({ minX: 0, maxX: 800, minY: 0, maxY: 600 }) }, tryAcceptDrag: () => false };
    const stage = makeStage([covering], { itemId: 5000000, slotPos: -50, invType: InventoryType.Cash });
    stage.onMouseButton(400, 300, false, 0);
    expect(stage._item.firstFreeSlot).toHaveBeenCalledWith(4);
    const d = sentDrop(stage);
    expect(d.ti).toBe(InventoryType.Cash);
    expect(d.from).toBe(-50);
    expect(d.to).toBe(7);
  });

  it('clears a macro slot dropped on the field, keeps it over panels', () => {
    const clearSlot = vi.fn(() => true);
    const stage = makeStage([], { skillId: 1111003, macroSlot: 0, macroIndex: 1 });
    stage._skillMacro = { clearSlot };
    stage.onMouseButton(400, 300, false, 0);
    expect(clearSlot).toHaveBeenCalledWith(0, 1);
    expect(stage.game.session.send).not.toHaveBeenCalled();

    clearSlot.mockClear();
    const covering = { isVisible: true, container: { getBounds: () => ({ minX: 0, maxX: 800, minY: 0, maxY: 600 }) }, tryAcceptDrag: () => false };
    const stage2 = makeStage([covering], { skillId: 1111003, macroSlot: 0, macroIndex: 1 });
    stage2._skillMacro = { clearSlot };
    stage2.onMouseButton(400, 300, false, 0);
    expect(clearSlot).not.toHaveBeenCalled();
  });

  it('lets plain skill drags vanish on the field', () => {
    const stage = makeStage([], { skillId: 1001003 });
    stage._skillMacro = { clearSlot: vi.fn(() => true) };
    stage.onMouseButton(400, 300, false, 0);
    expect(stage._skillMacro.clearSlot).not.toHaveBeenCalled();
    expect(stage.game.session.send).not.toHaveBeenCalled();
  });

  it('unmaps quickslot-bound items dropped on the field (scoped to quickslot keys)', () => {
    const { KeyConfig: KC } = { KeyConfig };
    const kc: any = new KC(new WzTextureLoader(), null, null);
    kc.isVisible = true;
    kc.bindItemToKey(42, 2000000);
    kc.bindItemToKey(3, 2000001);
    const sent: unknown[] = [];
    kc.onSaveToServer = (c: unknown) => sent.push(c);
    const stage = makeStage([], { itemId: 2000000 });
    stage._keyConfig = kc;
    stage._quickSlots = { GetKeys: () => [42, 2, 47, 73, 29, 83, 79, 81] };
    stage.onMouseButton(400, 300, false, 0);
    // Cleared on quickslot scancode 42, kept on regular key 3.
    expect(kc.bindingAt(42).type).toBe(0);
    expect(kc.bindingAt(3).id).toBe(2000001);
    expect(stage.game.session.send).not.toHaveBeenCalled();
    expect(sent.length).toBe(1);
  });

  it('keeps quickslot bindings when the drop lands on a panel', () => {
    const kc: any = new KeyConfig(new WzTextureLoader(), null, null);
    kc.isVisible = true;
    kc.bindItemToKey(42, 2000000);
    const covering = { isVisible: true, container: { getBounds: () => ({ minX: 0, maxX: 800, minY: 0, maxY: 600 }) }, tryAcceptDrag: () => false };
    const stage = makeStage([covering], { itemId: 2000000 });
    stage._keyConfig = kc;
    stage._quickSlots = { GetKeys: () => [42, 2, 47, 73, 29, 83, 79, 81] };
    stage.onMouseButton(400, 300, false, 0);
    expect(kc.bindingAt(42).id).toBe(2000000);
    expect(stage.game.session.send).not.toHaveBeenCalled();
  });
});
