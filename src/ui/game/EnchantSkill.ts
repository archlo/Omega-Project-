import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { Button } from '../Button.js';

const PanelW = 360;
const PanelH = 280;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _slotStyle = new TextStyle({ fill: '#FFF', fontSize: 10, fontFamily: 'monospace' });

export class EnchantSkill extends GamePanel {
  OnEnchant: ((slot: number) => void) | null = null;

  private _background: WzSprite | null;
  private _font: BuiltInFont | null;
  private _allButtons: Button[] = [];
  private _skills: { slot: number; name: string; level: number; maxLevel: number }[] = [];
  private _selectedSlot = -1;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = false;
    this.container.position.set(220, 90);

    let es = ui?.GetItem('UIWindow2.img/EnchantSkill');
    if (!(es instanceof WzProperty)) es = ui?.GetItem('IWindow2.img/EnchantSkill');
    const esProp = es instanceof WzProperty ? es : null;
    this._background = esProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(esProp!.Get('backgrnd') as WzCanvas) : null;

    const title = new Text({ text: 'Skill Enchant', style: _titleStyle });
    title.x = 8; title.y = 5;
    this.container.addChild(title);
    // OG: CUIWnd close button
    this.createCloseButton(null, null, 1, 200);
  }

  Open(skills: { slot: number; name: string; level: number; maxLevel: number }[]): void {
    this._skills = skills;
    this._selectedSlot = -1;
    this.isVisible = true;
  }

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
    if (lx >= PanelW - 18 && ly < 22) { this.isVisible = false; return true; }

    const listY = 50;
    const itemH = 22;
    for (let i = 0; i < this._skills.length; i++) {
      if (lx >= 10 && lx < PanelW - 10 && ly >= listY + i * itemH && ly < listY + (i + 1) * itemH) {
        if (this._selectedSlot === i) this.OnEnchant?.(this._skills[i].slot);
        this._selectedSlot = i;
        return true;
      }
    }

    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }
}
