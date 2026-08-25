import { describe, expect, it, vi } from 'vitest';
import { GameStage } from '../../src/stages/GameStage.js';
import { DragController } from '../../src/ui/DragController.js';
import { SkillBook, SkillRow } from '../../src/ui/game/SkillBook.js';
import { QuickSlotBar } from '../../src/ui/game/QuickSlotBar.js';
import { KeyConfig } from '../../src/ui/game/KeyConfig.js';
import { FuncKeyType, FuncKeyMappedNone } from '../../src/domain/FuncKeyMapped.js';

// Text.width measurement needs a canvas 2D context; provide the minimal shim.
function installCanvasShim(): void {
  if ((globalThis as any).__mapleclaudeCanvasShim) return;
  (globalThis as any).__mapleclaudeCanvasShim = true;
  class Fake2DContext {
    measureText(text: string) {
      const width = String(text).length * 8;
      return { width, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3 };
    }
    fillText() {} strokeText() {} clearRect() {} fillRect() {}
  }
  class FakeOffscreenCanvas {
    width = 0; height = 0;
    private _ctx: any;
    getContext() { if (!this._ctx) this._ctx = new Fake2DContext(); return this._ctx; }
  }
  (globalThis as any).CanvasRenderingContext2D = Fake2DContext;
  (globalThis as any).OffscreenCanvas = FakeOffscreenCanvas;
  (globalThis as any).document = {
    createElement(tag: string) { return tag === 'canvas' ? new FakeOffscreenCanvas() as any : {}; },
  };
}
installCanvasShim();

// OG CDraggableSkill::OnDropped chain: CUISkill::OnMouseButton (0x84B710)
// starts a drag on an icon → CWndMan::BeginDragDrop → mouse-up offers the
// payload to every visible UI window's OnDropped, where CQuickSlot and
// CUIKeyConfig claim skill drops (MapFuncKey / SetFuncKeyMapped).
function makeStage(panels: unknown[]): any {
  const stage: any = Object.create(GameStage.prototype);
  stage._panels = panels;
  stage._quitOverlay = null;
  stage._gameMenu = null;
  stage._keyConfig = null;
  stage._frameMuteButton = null;
  stage._contextMenu = null;
  stage._miniMap = null;
  stage._chatBar = null;
  stage._camera = { ScreenToWorld: (x: number, y: number) => ({ x, y }) };
  stage._npcs = [];
  stage._otherChars = new Map();
  stage._mobs = new Map();
  stage._drops = [];
  stage._physics = null;
  stage._player = null;
  stage._pendingBridle = null;
  stage._dragController = new DragController();
  stage.game = {
    pixiApp: { canvas: { style: { cursor: 'default' } } },
    session: { send: vi.fn() },
  };
  return stage;
}

const SKILL_ID = 1001004; // Power Strike — jobType (id/1000)%10 == 4

function makeSkillBook(): SkillBook {
  const sb = new SkillBook();
  sb.setSkills([new SkillRow(SKILL_ID, 'Power Strike', 1, 20, false)]);
  // 1001004's job root (100 = warrior) maps to explorer degree 1 — tab 1.
  (sb as unknown as { _activeTab: number })._activeTab = 1;
  sb.isVisible = true;
  return sb;
}

function slotRectOf(bar: QuickSlotBar, i = 0): { x: number; y: number; width: number; height: number } {
  return (bar as unknown as { _slotRect(i: number): { x: number; y: number; width: number; height: number } })._slotRect(i);
}

describe('GameStage skill drag-and-drop (OG CDraggableSkill::OnDropped)', () => {
  it('dragging a skill-book icon onto a quickslot binds it to that key', () => {
    const keyConfig = new KeyConfig(null as any, null, null);
    const saveSpy = vi.fn();
    keyConfig.onSaveToServer = saveSpy;

    const quickSlot = new QuickSlotBar(
      null as any, null, null,
      (sc) => keyConfig.bindingAt(sc),
      (sc, skillId) => keyConfig.bindSkillToKey(sc, skillId),
      () => null,
      () => null,
    );
    quickSlot.isVisible = true;

    const skillBook = makeSkillBook();
    skillBook.onDragStart = (payload, texture, x, y) => {
      stage._dragController.beginDrag(payload, texture, x, y);
    };

    const stage = makeStage([quickSlot, skillBook]);

    // Mouse down on the first skill icon rect.
    stage.onMouseButton(210, 140, true, 0); // skill-book root at (190,40); icon rect local (13..45, 96..128)
    expect(stage._dragController.isDragging).toBe(true);

    // Icon follows the cursor.
    stage.onMouseMove(500, 540);
    expect(stage._dragController.container.children[0].x).toBe(500);

    // Release over quickslot cell 0.
    const r = slotRectOf(quickSlot, 0);
    stage.onMouseButton(r.x + r.width / 2, r.y + r.height / 2, false, 0);

    expect(stage._dragController.isDragging).toBe(false);
    const fk = keyConfig.bindingAt(0x2A); // DefaultKeys[0]
    expect(fk.type).toBe(FuncKeyType.Skill);
    expect(fk.id).toBe(SKILL_ID);
    // The binding persisted through bindSkillToKey → onSaveToServer.
    expect(saveSpy).toHaveBeenCalledWith([expect.objectContaining({ index: 0x2A })]);
  });

  it('dropping a skill on a KeyConfig window cell binds AND saves (tryBindSkillAt routes through bindSkillToKey)', () => {
    const keyConfig = new KeyConfig(null as any, null, null);
    keyConfig.isVisible = true;
    const saveSpy = vi.fn();
    keyConfig.onSaveToServer = saveSpy;
    const changedSpy = vi.fn();
    keyConfig.onBindingsChanged = changedSpy;

    // F1 key cap is at cell (79, 28); KeyConfig _root sits at (200, 150).
    const accepted = keyConfig.tryAcceptDrag({ skillId: SKILL_ID }, 200 + 79 + 5, 150 + 28 + 5);
    expect(accepted).toBe(true);
    const fk = keyConfig.bindingAt(59);
    expect(fk.type).toBe(FuncKeyType.Skill);
    expect(fk.id).toBe(SKILL_ID);
    expect(saveSpy).toHaveBeenCalledWith([
      { index: 59, fk: { type: FuncKeyType.Skill, id: SKILL_ID } },
    ]);
    expect(changedSpy).toHaveBeenCalled();
  });

  it('re-binding a skill clears its previous slot and reports both changes', () => {
    const keyConfig = new KeyConfig(null as any, null, null);
    keyConfig.isVisible = true;
    keyConfig.bindSkillToKey(2, SKILL_ID);
    const saveSpy = vi.fn();
    keyConfig.onSaveToServer = saveSpy;

    const ok = keyConfig.tryAcceptDrag({ skillId: SKILL_ID }, 200 + 79 + 5, 150 + 28 + 5);
    expect(ok).toBe(true);
    expect(keyConfig.bindingAt(2)).toEqual(FuncKeyMappedNone);
    expect(keyConfig.bindingAt(59).id).toBe(SKILL_ID);
    expect(saveSpy).toHaveBeenCalledWith([
      { index: 2, fk: FuncKeyMappedNone },
      { index: 59, fk: { type: FuncKeyType.Skill, id: SKILL_ID } },
    ]);
  });

  it('an unclaimed skill drag does not fall into the item-drop fallback', () => {
    const skillBook = makeSkillBook();
    skillBook.onDragStart = (payload, texture, x, y) => {
      stage._dragController.beginDrag(payload, texture, x, y);
    };
    const stage = makeStage([skillBook]);
    const sendSpy = vi.fn();
    stage.game = { session: { send: sendSpy } };
    stage._pointOverVisiblePanel = () => false;

    stage.onMouseButton(210, 140, true, 0); // skill-book root at (190,40); icon rect local (13..45, 96..128)
    expect(stage._dragController.isDragging).toBe(true);
    // Release over empty field — no panel claims it, no packet may be sent
    // (the DropItem fallback only applies to item payloads).
    stage.onMouseButton(700, 300, false, 0);
    expect(sendSpy).not.toHaveBeenCalled();
    expect(stage._dragController.isDragging).toBe(false);
  });
});
