import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { Button } from '../Button.js';
import type { DragTarget } from '../DragController.js';
import type { ItemDragPayload } from './ItemInventory.js';

const PanelW = 280;
const PanelH = 180;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });

export class ItemProtector extends GamePanel implements DragTarget {
  OnConfirm: (() => void) | null = null;
  OnCancel: (() => void) | null = null;

  // OG: CUIItemProtector::PutItem (decompile/7d7160.c) — see GoldHammer.ts's
  // identical note (CUIItemUpgrade::PutItem) for why no drag-drop trigger
  // populates this yet.
  ScrollPos = 0;
  ScrollItemId = 0;
  TargetItemTI = 0;
  TargetSlotPosition = 0;

  setTarget(scrollPos: number, scrollItemId: number, targetItemTI: number, targetSlotPosition: number): void {
    this.ScrollPos = scrollPos;
    this.ScrollItemId = scrollItemId;
    this.TargetItemTI = targetItemTI;
    this.TargetSlotPosition = targetSlotPosition;
  }

  // OG: CUIItemProtector::PutItem — accepts a dragged-on equip while open.
  tryAcceptDrag(payload: unknown, _x: number, _y: number): boolean {
    if (!this.isVisible || !payload || typeof payload !== 'object' || !('itemId' in payload)) return false;
    const p = payload as ItemDragPayload;
    this.setTarget(this.ScrollPos, this.ScrollItemId, p.itemId, p.slotPos);
    return true;
  }

  private _background: WzSprite | null;
  private _font: BuiltInFont | null;
  private _allButtons: Button[] = [];
  private _btOk: Button | null = null;
  private _btCancel: Button | null = null;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = false;
    this.container.position.set(260, 180);

    let ip = ui?.GetItem('UIWindow2.img/ItemProtector');
    if (!(ip instanceof WzProperty)) ip = ui?.GetItem('IWindow2.img/ItemProtector');
    const ipProp = ip instanceof WzProperty ? ip : null;
    this._background = ipProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(ipProp!.Get('backgrnd') as WzCanvas) : null;
    if (this._background) this.container.addChild(this._background.ToPixi());
    this._btOk = this._makeButton(loader, ipProp, 'BtOk', () => { this.OnConfirm?.(); this.isVisible = false; });
    this._btCancel = this._makeButton(loader, ipProp, 'BtCancel', () => { this.OnCancel?.(); this.isVisible = false; });
    if (this._btOk) this._btOk.container.position.set(PanelW / 2 - 70, PanelH - 36);
    if (this._btCancel) this._btCancel.container.position.set(PanelW / 2 + 10, PanelH - 36);

    const title = new Text({ text: 'Item Protector', style: _titleStyle });
    title.x = 8; title.y = 5;
    this.container.addChild(title);
  }

  Open(): void { this.isVisible = true; }

  update(_dt: number): void {}

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    const px = this.container.position.x;
    const py = this.container.position.y;
    const lx = x - px;
    const ly = y - py;
    for (const b of this._allButtons) {
      if (b.handleMouseButton(lx, ly, down)) return true;
    }
    if (lx >= PanelW - 18 && ly < 22) { this.OnCancel?.(); this.isVisible = false; return true; }
    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.OnCancel?.(); this.isVisible = false; return true; }
    return false;
  }

  private _makeButton(loader: WzTextureLoader, root: WzProperty | null, name: string, onClick: () => void): Button | null {
    const pr = root?.Get(name);
    if (!(pr instanceof WzProperty)) return null;
    const b = Button.fromWz(loader, pr, name);
    b.onClick = onClick;
    this._allButtons.push(b);
    this.container.addChild(b.container);
    return b;
  }
}
