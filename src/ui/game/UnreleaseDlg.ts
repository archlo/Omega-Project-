import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import type { DragTarget } from '../DragController.js';
import type { ItemDragPayload } from './ItemInventory.js';
import { InventoryType } from '../../domain/InventoryItem.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { ItemIconLoader } from '../../character/ItemIconLoader.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { Button } from '../Button.js';

// OG: CUIUnreleaseDlg — inherits CUniqueModeless (modeless dialog).
// Reverses item release (returns scrolls to normal state).
// PutItem: place item to un-release.

const PANEL_W = 180;
const PANEL_H = 120;

export class UnreleaseDlg extends GamePanel implements DragTarget {
  private _bg: Graphics;
  private _slotIcon: Sprite;
  private _gradeFrame: Graphics;
  private _buttons: Button[] = [];
  private _btConfirm: Button | null = null;
  private _btCancel: Button | null = null;
  private _selectedItemId = 0;
  private _mouseX = 0;
  private _mouseY = 0;
  private _viewW = 800;
  private _viewH = 600;

  onConfirm: ((itemId: number) => void) | null = null;
  onClose: (() => void) | null = null;

  constructor(opts: {
    loader?: WzTextureLoader;
    uiWz?: WzPackage | null;
    font?: BuiltInFont | null;
    icons?: ItemIconLoader | null;
  } = {}) {
    super();

    this._bg = new Graphics();
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 240 / 255 });
    this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
    this._bg.rect(0, 0, PANEL_W, 22).fill({ color: '#0F1224' });
    this._root.addChild(this._bg);

    this._slotIcon = new Sprite(Texture.EMPTY);
    this._slotIcon.x = 74;
    this._slotIcon.y = 40;
    this._root.addChild(this._slotIcon);

    this._gradeFrame = new Graphics();
    this._root.addChild(this._gradeFrame);

    // Fallback buttons
    const btnStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });
    const confirmBtn = new Text({ text: 'Confirm', style: btnStyle });
    confirmBtn.x = 50; confirmBtn.y = 95;
    confirmBtn.eventMode = 'static'; confirmBtn.cursor = 'pointer';
    confirmBtn.on('pointertap', () => { this.onConfirm?.(this._selectedItemId); this.isVisible = false; });
    this._root.addChild(confirmBtn);

    const cancelBtn = new Text({ text: 'Cancel', style: btnStyle });
    cancelBtn.x = 110; cancelBtn.y = 95;
    cancelBtn.eventMode = 'static'; cancelBtn.cursor = 'pointer';
    cancelBtn.on('pointertap', () => { this.onClose?.(); this.isVisible = false; });
    this._root.addChild(cancelBtn);
  }

  putItem(itemId: number, name: string, grade = 0): void {
    this._selectedItemId = itemId;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    for (const button of this._buttons) {
      if (button.handleMouseButton(lx, ly, down)) return true;
    }
    return lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H;
  }

  onMouseMove(x: number, y: number): void { this._mouseX = x; this._mouseY = y; }
  onKeyPress(key: string): boolean {
    if (key === 'Escape' && this.isVisible) { this.onClose?.(); this.isVisible = false; return true; }
    return false;
  }

  tryAcceptDrag(payload: unknown, x: number, y: number): boolean {
    if (!this.isVisible) return false;
    if (!payload || typeof payload !== 'object' || !('invType' in payload)) return false;
    const p = payload as ItemDragPayload;
    if (p.invType !== InventoryType.Equip) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    if (lx >= 58 && lx < 90 && ly >= 40 && ly < 72) {
      this._selectedItemId = p.itemId;
      return true;
    }
    return false;
  }

  update(_dt: number): void {}
  onResize(viewW: number, viewH: number): void { this._viewW = viewW; this._viewH = viewH; }
}
