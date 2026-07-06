import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { Button } from '../Button.js';

const PanelW = 340;
const PanelH = 260;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _slotStyle = new TextStyle({ fill: '#FFF', fontSize: 10, fontFamily: 'monospace' });

// OG class: CRepairDurabilityDlg (SetNPC/ResetInfo/OnMouseButton/Move/Enter/
// OnCreate/OnButtonClicked/Draw/ClearToolTip).
export class Repair extends GamePanel {
  OnRepair: ((slot: number) => void) | null = null;
  OnClosed: (() => void) | null = null;
  // ponytail: OG OnButtonClicked (decompile/6d3a20.c) also has a "repair all"
  // button (id 0x3E8 -> SendRepairDurabilityAll, GameSender.RepairDurabilityAll).
  // No such button exists in this panel yet — add one if repair-all is needed.

  private _background: WzSprite | null;
  private _font: BuiltInFont | null;
  private _allButtons: Button[] = [];
  private _items: { slot: number; name: string; durability: number; maxDurability: number }[] = [];
  private _selectedSlot = -1;
  private _dynamicChildren: Container[] = [];

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = false;
    this.container.position.set(230, 120);

    const rp = ui?.GetItem('UIWindow2.img/Repair');
    const rpProp = rp instanceof WzProperty ? rp : null;
    this._background = rpProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(rpProp!.Get('backgrnd') as WzCanvas) : null;
    if (this._background) this.container.addChild(this._background.ToPixi());

    const title = new Text({ text: 'Repair', style: _titleStyle });
    title.x = 8; title.y = 5;
    this.container.addChild(title);
  }

  Open(items: { slot: number; name: string; durability: number; maxDurability: number }[]): void {
    this._items = items;
    this._selectedSlot = -1;
    this.isVisible = true;
  }

  update(_dt: number): void { this.draw(); }

  draw(): void {
    if (!this.isVisible) return;
    for (const c of this._dynamicChildren) c.destroy();
    this._dynamicChildren = [];

    const listY = 48;
    const itemH = 20;
    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i];
      const iy = listY + i * itemH;

      const bg = new Graphics();
      bg.rect(10, iy, PanelW - 20, itemH - 2).fill({ color: i === this._selectedSlot ? '#2E2E4C' : (i % 2 === 0 ? '#13131F' : '#181828'), alpha: 0.8 });
      this.container.addChild(bg);
      this._dynamicChildren.push(bg);

      const name = new Text({ text: item.name, style: _slotStyle });
      name.x = 14; name.y = iy + 2;
      this.container.addChild(name);
      this._dynamicChildren.push(name);

      const dur = new Text({ text: `${item.durability} / ${item.maxDurability}`, style: new TextStyle({ fill: '#AAA', fontSize: 9, fontFamily: 'monospace' }) });
      dur.x = PanelW - 100; dur.y = iy + 2;
      this.container.addChild(dur);
      this._dynamicChildren.push(dur);
    }
  }

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
    if (lx >= PanelW - 18 && ly < 22) { this.OnClosed?.(); this.isVisible = false; return true; }

    const listY = 48;
    const itemH = 20;
    for (let i = 0; i < this._items.length; i++) {
      if (lx >= 10 && lx < PanelW - 10 && ly >= listY + i * itemH && ly < listY + (i + 1) * itemH) {
        this._selectedSlot = i;
        this.OnRepair?.(this._items[i].slot);
        return true;
      }
    }

    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.OnClosed?.(); this.isVisible = false; return true; }
    return false;
  }
}
