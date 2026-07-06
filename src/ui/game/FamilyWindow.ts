import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { Button } from '../Button.js';
import { FamilyPrivilegeEntry } from '../../net/handlers/PacketArgs.js';

const _btnStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });

export class FamilyWindow extends GamePanel {
  Reputation = 0;
  TodayRep = 0;
  JuniorCount = 0;
  InFamily = false;

  onUsePrivilege: ((privilegeIndex: number) => void) | null = null;
  onSetPrecept: ((precept: string) => void) | null = null;
  private _privileges: FamilyPrivilegeEntry[] = [];
  private _privilegeUse: Map<number, number> = new Map();
  private _privilegeIndex = 0;

  private _bg: WzSprite | null;
  private _bg2: WzSprite | null;
  private _btClose: Button | null;
  private _font: BuiltInFont | null;
  private _dragging = false;
  private _dragOff = { x: 0, y: 0 };
  private _bgPixi: Container;
  private _textLayer: Container;
  private _privButtons: Text[] = [];

  private get _panelW(): number { return this._bg?.Width ?? 214; }
  private get _panelH(): number { return this._bg?.Height ?? 343; }

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = false;
    this._root.x = 330;
    this._root.y = 120;

    this._bgPixi = new Container();
    this._textLayer = new Container();

    const fam = ui?.GetItem('UIWindow2.img/Family');
    const famProp = fam instanceof WzProperty ? fam : null;
    this._bg = famProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(famProp!.Get('backgrnd') as WzCanvas) : null;
    this._bg2 = famProp?.Get('backgrnd2') instanceof WzCanvas ? loader.Load(famProp!.Get('backgrnd2') as WzCanvas) : null;

    const closeImg = ui?.GetItem('Basic.img/BtClose3');
    this._btClose = closeImg instanceof WzProperty ? Button.fromWz(loader, closeImg, 'Close') : null;
    if (this._btClose) this._btClose.onClick = () => { this.isVisible = false; };

    if (this._bg) this._bgPixi.addChild(this._bg.ToPixi());
    if (this._bg2) this._bgPixi.addChild(this._bg2.ToPixi());
    this._root.addChildAt(this._bgPixi, 0);
    this._root.addChild(this._textLayer);
  }

  SetPrivileges(privileges: FamilyPrivilegeEntry[]): void {
    this._privileges = privileges;
    this._privilegeIndex = 0;
  }

  SetPrivilegeUse(privilegeUse: { key: number; value: number }[]): void {
    this._privilegeUse = new Map(privilegeUse.map((e) => [e.key, e.value]));
  }

  update(_dt: number): void {
    if (!this.isVisible) return;

    // Dragging
    if (this._dragging) {
      const mx = (window as any).__mouseX as number | undefined;
      const my = (window as any).__mouseY as number | undefined;
      if (mx !== undefined && my !== undefined) {
        this._root.x = mx - this._dragOff.x;
        this._root.y = my - this._dragOff.y;
      }
    }

    if (this._btClose !== null) this._btClose.container.position.set(this._panelW - 18, 4);

    // Text content — all positions are local to _root (0-based)
    for (const child of this._textLayer.removeChildren()) child.destroy();
    const style = new TextStyle({ fill: 0xE1E1E1, fontSize: 11, fontFamily: 'monospace' });
    if (!this._bg && this._font) {
      const titleStyle = new TextStyle({ fill: 0xDCC896, fontSize: 11, fontFamily: 'monospace' });
      const title = new Text({ text: 'FAMILY', style: titleStyle });
      title.position.set(84, 5);
      this._textLayer.addChild(title);
    }
    if (this._font) {
      if (!this.InFamily) {
        const noFam = new Text({ text: 'You are not in a family.', style: new TextStyle({ fill: 0x9696A0, fontSize: 11, fontFamily: 'monospace' }) });
        noFam.position.set(30, 150);
        this._textLayer.addChild(noFam);
      } else {
        let y = 44;
        const x = 18;
        const rep = new Text({ text: `Reputation : ${this.Reputation}`, style });
        rep.position.set(x, y); y += 18;
        this._textLayer.addChild(rep);
        const today = new Text({ text: `Today's Rep : ${this.TodayRep}`, style });
        today.position.set(x, y); y += 18;
        this._textLayer.addChild(today);
        const junior = new Text({ text: `Juniors : ${this.JuniorCount}`, style });
        junior.position.set(x, y);
        this._textLayer.addChild(junior);
        y += 24;

        this._drawPrivilege(x, y, style);
      }
    }
  }

  private _drawPrivilege(x: number, y: number, style: TextStyle): void {
    for (const b of this._privButtons) this._root.removeChild(b);
    this._privButtons = [];

    if (this._privileges.length === 0) return;
    const idx = this._privilegeIndex % this._privileges.length;
    const priv = this._privileges[idx];
    const used = this._privilegeUse.get(idx) ?? 0;

    const nameStyle = new TextStyle({ fill: 0xDCC896, fontSize: 11, fontFamily: 'monospace' });
    const name = new Text({ text: priv.name, style: nameStyle });
    name.position.set(x, y);
    this._textLayer.addChild(name);

    const cost = new Text({ text: `Cost: ${priv.fame.toLocaleString()} fame`, style });
    cost.position.set(x, y + 16);
    this._textLayer.addChild(cost);

    const usage = new Text({ text: `Used: ${used} / ${priv.dayLimit}`, style });
    usage.position.set(x, y + 32);
    this._textLayer.addChild(usage);

    const page = new Text({ text: `[${idx + 1}/${this._privileges.length}]`, style });
    page.position.set(x, y + 48);
    this._textLayer.addChild(page);

    if (this._font) {
      const lines = this._font.wrapToWidth(priv.desc, this._panelW - 36);
      const descStyle = new TextStyle({ fill: 0x9696A0, fontSize: 11, fontFamily: 'monospace' });
      for (let i = 0; i < lines.length; i++) {
        const l = new Text({ text: lines[i], style: descStyle });
        l.position.set(x, y + 66 + i * 14);
        this._textLayer.addChild(l);
      }
    }

    const addBtn = (label: string, bx: number, onClick: () => void): void => {
      const t = new Text({ text: `[${label}]`, style: _btnStyle });
      t.position.set(bx, this._panelH - 24);
      t.eventMode = 'static';
      t.cursor = 'pointer';
      t.on('pointerdown', onClick);
      this._privButtons.push(t);
      this._root.addChild(t);
    };
    addBtn('<', 18, () => { this._privilegeIndex = (this._privilegeIndex - 1 + this._privileges.length) % this._privileges.length; });
    addBtn('>', 48, () => { this._privilegeIndex = (this._privilegeIndex + 1) % this._privileges.length; });
    if (used < priv.dayLimit) {
      addBtn('Use', this._panelW - 50, () => this.onUsePrivilege?.(idx));
    }
    addBtn('Precept', 78, () => {
      const text = window.prompt('Set family precept:', '');
      if (text !== null) this.onSetPrecept?.(text);
    });
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    // Convert frame coords to local coords (relative to _root)
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    if (this._btClose?.handleMouseButton(lx, ly, down) === true) return true;
    if (down && lx >= 0 && lx < this._panelW && ly >= 0 && ly < 22) {
      this._dragging = true;
      this._dragOff = { x: lx, y: ly };
      return true;
    }
    if (!down && this._dragging) { this._dragging = false; return true; }
    return lx >= 0 && lx < this._panelW && ly >= 0 && ly < this._panelH;
  }

  onKeyPress(key: string): boolean {
    if (key === 'Escape' && this.isVisible) { this.isVisible = false; return true; }
    return false;
  }
}
