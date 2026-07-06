import { Graphics, Text, TextStyle } from 'pixi.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';
import { GamePanel } from './GamePanel.js';

const PanelW = 260;
const PanelH = 150;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 12, fontFamily: 'monospace' });
const _bodyStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' });
const _buttonStyle = new TextStyle({ fill: '#D8D8D8', fontSize: 10, fontFamily: 'monospace' });

export class AdminShop extends GamePanel {
  onReopen: ((npcTemplateId: number) => void) | null = null;

  private _bg = new Graphics();
  private _wzBg: WzSprite | null = null;
  private _title = new Text({ text: 'Admin Shop', style: _titleStyle });
  private _body = new Text({ text: '', style: _bodyStyle });
  private _reopenButton = new Graphics();
  private _reopenLabel = new Text({ text: 'Reopen', style: _buttonStyle });
  private _closeButton = new Graphics();
  private _closeLabel = new Text({ text: 'Close', style: _buttonStyle });
  private _npcTemplateId = 0;
  private _itemCount = 0;
  private _lastAction = 0;
  private _canReopen = false;

  constructor(loader: WzTextureLoader, uiWz: WzPackage | null) {
    super();
    this.container.position.set(300, 150);
    const canvas = uiWz?.GetItem('UIWindow.img/Admin/Block/backgrnd');
    if (canvas instanceof WzCanvas) this._wzBg = loader.Load(canvas);
    if (this._wzBg) this.container.addChild(this._wzBg.ToPixi());
    this.container.addChild(this._bg, this._title, this._body, this._reopenButton, this._reopenLabel, this._closeButton, this._closeLabel);
    this._title.position.set(10, 8);
    this._body.position.set(12, 32);
    this._reopenLabel.position.set(58, 123);
    this._closeLabel.position.set(166, 123);
    this._drawChrome();
    this._refresh();
  }

  SetResult(npcTemplateId: number, itemCount: number): void {
    this._npcTemplateId = npcTemplateId;
    this._itemCount = itemCount;
    this.isVisible = true;
    this._refresh();
  }

  SetAction(action: number, canReopen: boolean): void {
    this._lastAction = action;
    this._canReopen = canReopen;
    this.isVisible = true;
    this._refresh();
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    const lx = x - this.container.position.x;
    const ly = y - this.container.position.y;
    if (this._hit(lx, ly, 40, 118, 80, 22)) {
      if (this._canReopen && this._npcTemplateId !== 0) this.onReopen?.(this._npcTemplateId);
      return true;
    }
    if (this._hit(lx, ly, 150, 118, 70, 22)) { this.isVisible = false; return true; }
    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }

  private _refresh(): void {
    // TODO_AUDIT.md Hundred-and-fifty-fourth pass: CAdminShopDlg's decoded
    // result currently exposes only npcTemplateId/itemCount; per-item tail
    // stays opaque, so this panel intentionally shows only verified state.
    this._body.text = `NPC: ${this._npcTemplateId || '-'}\nItems: ${this._itemCount}\nLast action: ${this._lastAction || '-'}\nReopen: ${this._canReopen ? 'available' : 'not available'}`;
    this._reopenLabel.alpha = this._canReopen && this._npcTemplateId !== 0 ? 1 : 0.45;
  }

  private _drawChrome(): void {
    this._bg.clear();
    if (!this._wzBg) this._bg.rect(0, 0, PanelW, PanelH).fill({ color: '#0C0E18', alpha: 240 / 255 }).stroke({ color: '#4C5570', width: 1 });
    this._reopenButton.clear().rect(40, 118, 80, 22).fill({ color: '#1E2030', alpha: 0.9 }).stroke({ color: '#505570', width: 1 });
    this._closeButton.clear().rect(150, 118, 70, 22).fill({ color: '#1E2030', alpha: 0.9 }).stroke({ color: '#505570', width: 1 });
  }

  private _hit(x: number, y: number, bx: number, by: number, bw: number, bh: number): boolean {
    return x >= bx && x < bx + bw && y >= by && y < by + bh;
  }
}
