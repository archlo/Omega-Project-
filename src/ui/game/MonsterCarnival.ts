import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';

const PanelW = 300;
const PanelH = 150;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 12, fontFamily: 'monospace' });
const _bodyStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' });

export interface MonsterCarnivalPanelState {
  team?: number;
  personalCp?: number;
  personalCpDiff?: number;
  myTeamCp?: number;
  enemyCp?: number;
  enemyCpTotal?: number;
  lastMessage?: string;
}

export class MonsterCarnival extends GamePanel {
  private _bg = new Graphics();
  private _title = new Text({ text: 'Monster Carnival', style: _titleStyle });
  private _body = new Text({ text: '', style: _bodyStyle });
  private _wzBg: WzSprite | null = null;
  private _state: MonsterCarnivalPanelState = {};

  constructor(loader: WzTextureLoader, uiWz: WzPackage | null) {
    super();

    // WZ background
    const prop = uiWz?.GetItem('UIWindow2.img/MonsterCarnival/main');
    const bgNode = prop instanceof WzProperty ? prop.Get('backgrnd') : null;
    this._wzBg = bgNode instanceof WzCanvas ? loader.Load(bgNode) : null;

    this.container.position.set(495, 82);
    this._title.position.set(10, 8);
    this._body.position.set(12, 32);

    const children: any[] = [this._title, this._body];
    if (this._wzBg) {
      this.container.addChildAt(this._wzBg.ToPixi(), 0);
    } else {
      children.unshift(this._bg);
    }
    this.container.addChild(...children);

    if (!this._wzBg) this._drawChrome();
    this._refresh();
  }

  SetState(state: MonsterCarnivalPanelState): void {
    // TODO_AUDIT.md Hundred-and-fifty-fourth pass: CUIMonsterCarnival's
    // request/minion buttons have no verified sender in TS yet; this panel is
    // the decoded score/status surface only.
    this._state = { ...this._state, ...state };
    this.isVisible = true;
    this._refresh();
  }

  Clear(): void {
    this._state = {};
    this.isVisible = false;
    this._refresh();
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    const lx = x - this.container.position.x;
    const ly = y - this.container.position.y;
    if (lx >= PanelW - 24 && ly < 24) { this.isVisible = false; return true; }
    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }

  private _refresh(): void {
    const s = this._state;
    const enemy = s.enemyCpTotal !== undefined ? `${s.enemyCp ?? 0}/${s.enemyCpTotal}` : `${s.enemyCp ?? 0}`;
    this._body.text = [
      `Team: ${s.team ?? '-'}`,
      `Personal CP: ${s.personalCp ?? 0}${s.personalCpDiff !== undefined ? ` (${s.personalCpDiff >= 0 ? '+' : ''}${s.personalCpDiff})` : ''}`,
      `Team CP: ${s.myTeamCp ?? 0}`,
      `Enemy CP: ${enemy}`,
      s.lastMessage ? `Status: ${s.lastMessage}` : 'Status: -',
    ].join('\n');
  }

  private _drawChrome(): void {
    this._bg.clear();
    this._bg.roundRect(0, 0, PanelW, PanelH, 5).fill({ color: 0x101423, alpha: 0.9 });
    this._bg.roundRect(0, 0, PanelW, PanelH, 5).stroke({ color: 0xffcc66, width: 1 });
    this._bg.rect(PanelW - 22, 4, 16, 16).fill({ color: 0x302030, alpha: 0.9 }).stroke({ color: 0x705050, width: 1 });
  }
}
