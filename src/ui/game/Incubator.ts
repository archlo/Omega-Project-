import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import type { IncubatorResultArgs } from '../../net/handlers/PacketArgs.js';
import type { DragTarget } from '../DragController.js';
import type { ItemDragPayload } from './ItemInventory.js';
import { isIncubatorEgg } from '../../util/ItemChecks.js';

// OG: CUIIncubator (0x7CA330–0x7CB570).
// Client-side incubator panel for hatching pigmy eggs (category 417).
// Supports:
// - Dropping an egg item (PutItem) → validates range 4170000-41700099
// - Displaying incubation results from server packet
// - HitTest: click top 24px = code 1, below = code 2

const PanelW = 320;
const PanelH = 200;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 12, fontFamily: 'monospace' });
const _bodyStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 10, fontFamily: 'monospace' });
const _btnStyle = new TextStyle({ fill: '#D8D8D8', fontSize: 10, fontFamily: 'monospace' });

export class Incubator extends GamePanel implements DragTarget {
  private _bg = new Graphics();
  private _title = new Text({ text: 'Incubator', style: _titleStyle });
  private _body = new Text({ text: '', style: _bodyStyle });
  private _eggSlot = new Graphics();
  private _eggSlotLabel = new Text({ text: 'Drop egg here', style: new TextStyle({ fill: '#888888', fontSize: 9, fontFamily: 'monospace' }) });
  private _hintText = new Text({ text: '', style: new TextStyle({ fill: '#AAAAAA', fontSize: 9, fontFamily: 'monospace' }) });
  private _closeBtn = new Graphics();
  private _closeLabel = new Text({ text: 'Close', style: _btnStyle });

  // OG: m_pSelectedItem, m_nSlotPosition, m_nItemTI
  private _selectedItemId = 0;
  private _selectedSlotPos = -1;
  private _selectedItemTI = 0;
  private _itemName = '-';
  private _result: IncubatorResultArgs | null = null;

  constructor() {
    super();
    this.container.position.set(306, 150);
    this._title.position.set(10, 8);
    this._body.position.set(12, 100);
    this._eggSlotLabel.position.set(10, 36);
    this._hintText.position.set(10, 60);
    this._closeLabel.position.set(PanelW - 70, PanelH - 26);
    this.container.addChild(this._bg, this._title, this._body, this._eggSlot, this._eggSlotLabel, this._hintText, this._closeBtn, this._closeLabel);
    this._drawChrome();
    this._refresh();
  }

  /** OG: CUIIncubator::PutItem — accepts an egg item for incubation. */
  PutItem(pItem: { itemId: number; slotPos: number; ti: number }): boolean {
    const id = pItem.itemId;
    if (!isIncubatorEgg(id)) {
      this._hintText.text = 'Invalid item — only pigmy eggs (417xxxx) accepted.';
      return false;
    }
    this._selectedItemId = id;
    this._selectedSlotPos = pItem.slotPos;
    this._selectedItemTI = pItem.ti;
    this._itemName = `Egg #${id}`;
    this._hintText.text = `Selected: ${this._itemName} (slot ${pItem.slotPos})`;
    this.isVisible = true;
    return true;
  }

  /** Called when the server sends an incubation result. */
  SetResult(result: IncubatorResultArgs, itemName: string): void {
    this._result = result;
    this._itemName = itemName;
    this.isVisible = true;
    this._refresh();
  }

  /** OG: HitTest — click above 24px = zone 1, below = zone 2. */
  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    const lx = x - this.container.position.x;
    const ly = y - this.container.position.y;
    // Close button
    if (lx >= PanelW - 76 && lx < PanelW - 4 && ly >= PanelH - 30 && ly < PanelH - 4) {
      this.isVisible = false;
      return true;
    }
    if (lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH) return true;
    return false;
  }

  /** OG: OnKey — Enter or Escape closes. */
  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }

  /** DragTarget: accept egg item drops. */
  tryAcceptDrag(payload: unknown, _x: number, _y: number): boolean {
    if (!this.isVisible || !payload || typeof payload !== 'object') return false;
    const p = payload as ItemDragPayload;
    const id = p.itemId;
    if (!isIncubatorEgg(id)) return false;
    return this.PutItem({ itemId: id, slotPos: p.slotPos, ti: p.invType });
  }

  private _refresh(): void {
    if (this._result) {
      const r = this._result;
      const stats = [
        ['STR', r.str], ['DEX', r.dex], ['INT', r.int], ['LUK', r.luk],
        ['ATK', r.attack], ['MATK', r.magicAttack],
        ['DEF', r.def], ['ACC', r.acc], ['AVO', r.avo],
        ['SPD', r.speed], ['JMP', r.jump], ['UG', r.upgrade],
      ].filter(([, v]) => typeof v === 'number' && v !== 0).map(([k, v]) => `${k}+${v}`).join(' ');
      this._body.text = `${this._itemName}${r.plus ? ` +${r.plus}` : ''}\n${stats || 'No stat delta'}`;
    } else if (this._selectedItemId > 0) {
      this._body.text = `Egg ready: ${this._itemName}\nWaiting for incubation result...`;
    } else {
      this._body.text = 'Drag an egg item here to incubate.';
    }
  }

  private _drawChrome(): void {
    this._bg.clear().roundRect(0, 0, PanelW, PanelH, 5).fill({ color: 0x201814, alpha: 0.92 }).stroke({ color: 0xffbb88, width: 1 });
    // Egg slot (OG: ptPutItem area)
    this._eggSlot.clear().rect(8, 32, PanelW - 16, 40).stroke({ color: 0x705550, width: 1 }).fill({ color: 0x1A1A2E, alpha: 0.5 });
    this._closeBtn.clear().rect(PanelW - 76, PanelH - 28, 70, 24).fill({ color: 0x1E2030, alpha: 0.9 }).stroke({ color: 0x705550, width: 1 });
  }

  /** OG: Click zone: top 24px = title bar (draggable). */
  beginDrag(lx: number, ly: number, down: boolean): boolean {
    if (!this.draggable) return false;
    if (!down && this.draggable) return false;
    if (!down) return false;
    return lx >= 0 && lx < PanelW && ly >= 0 && ly < 24;
  }
}
