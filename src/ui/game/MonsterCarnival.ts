import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';
import { Button } from '../Button.js';

// OG: CUIMonsterCarnival — CP gauge + request/minion buttons + team display.
// Positioned at top-right (495, 82). Shows personal CP, team CP, enemy CP,
// and status messages from the 8 MonsterCarnival packet handlers.
const PANEL_W = 300;
const PANEL_H = 180;
const GAUGE_W = 200;
const GAUGE_H = 14;
const GAUGE_X = 90;

const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _labelStyle = new TextStyle({ fill: '#C8C8C8', fontSize: 10, fontFamily: 'monospace' });
const _valueStyle = new TextStyle({ fill: '#FFF', fontSize: 10, fontFamily: 'monospace' });
const _msgStyle = new TextStyle({ fill: '#FFD700', fontSize: 10, fontFamily: 'monospace' });

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
  // Callbacks for request/minion buttons (wired in GameStage)
  onGuardRequest: (() => void) | null = null;
  onMinionRequest: (() => void) | null = null;
  onBombRequest: (() => void) | null = null;
  onUncleRequest: (() => void) | null = null;

  private _bg: Graphics;
  private _wzBg: WzSprite | null = null;
  private _title: Text;
  private _teamLabel: Text;
  private _personalCpLabel: Text;
  private _personalCpValue: Text;
  private _teamCpLabel: Text;
  private _teamCpValue: Text;
  private _enemyCpLabel: Text;
  private _enemyCpValue: Text;
  private _msgText: Text;

  // CP gauge bars
  private _personalGauge: Graphics;
  private _teamGauge: Graphics;
  private _enemyGauge: Graphics;

  // Request buttons (OG: CUIMonsterCarnival has request/minion/etc buttons)
  private _btGuard: Button | null = null;
  private _btMinion: Button | null = null;
  private _btBomb: Button | null = null;
  private _btUncle: Button | null = null;

  private _state: MonsterCarnivalPanelState = {};
  private _maxCp = 1000; // default max for gauge scaling

  constructor(loader: WzTextureLoader, uiWz: WzPackage | null) {
    super();

    // OG: WZ background from UIWindow2.img/MonsterCarnival/main
    const prop = uiWz?.GetItem('UIWindow2.img/MonsterCarnival/main') as WzProperty | null;
    const bgNode = prop?.Get('backgrnd');
    this._wzBg = bgNode instanceof WzCanvas ? loader.Load(bgNode) ?? null : null;

    this._bg = new Graphics();
    if (!this._wzBg) this._rebuildBg();
    this._root.addChild(this._bg);

    if (this._wzBg) {
      const spr = this._wzBg.ToPixi();
      this._root.addChildAt(spr, 0);
    }

    this.container.position.set(495, 82);

    this._title = new Text({ text: 'Monster Carnival', style: _titleStyle });
    this._title.position.set(10, 6);
    this._root.addChild(this._title);

    // Team label
    this._teamLabel = new Text({ text: '', style: _labelStyle });
    this._teamLabel.position.set(10, 24);
    this._root.addChild(this._teamLabel);

    // Personal CP row
    this._personalCpLabel = new Text({ text: 'My CP:', style: _labelStyle });
    this._personalCpLabel.position.set(10, 42);
    this._root.addChild(this._personalCpLabel);

    this._personalCpValue = new Text({ text: '0', style: _valueStyle });
    this._personalCpValue.position.set(GAUGE_X, 42);
    this._root.addChild(this._personalCpValue);

    this._personalGauge = new Graphics();
    this._personalGauge.position.set(GAUGE_X, 56);
    this._root.addChild(this._personalGauge);

    // Team CP row
    this._teamCpLabel = new Text({ text: 'Team:', style: _labelStyle });
    this._teamCpLabel.position.set(10, 74);
    this._root.addChild(this._teamCpLabel);

    this._teamCpValue = new Text({ text: '0', style: _valueStyle });
    this._teamCpValue.position.set(GAUGE_X, 74);
    this._root.addChild(this._teamCpValue);

    this._teamGauge = new Graphics();
    this._teamGauge.position.set(GAUGE_X, 88);
    this._root.addChild(this._teamGauge);

    // Enemy CP row
    this._enemyCpLabel = new Text({ text: 'Enemy:', style: _labelStyle });
    this._enemyCpLabel.position.set(10, 106);
    this._root.addChild(this._enemyCpLabel);

    this._enemyCpValue = new Text({ text: '0', style: _valueStyle });
    this._enemyCpValue.position.set(GAUGE_X, 106);
    this._root.addChild(this._enemyCpValue);

    this._enemyGauge = new Graphics();
    this._enemyGauge.position.set(GAUGE_X, 120);
    this._root.addChild(this._enemyGauge);

    // Status message
    this._msgText = new Text({ text: '', style: _msgStyle });
    this._msgText.position.set(10, 140);
    this._root.addChild(this._msgText);

    // Request buttons (bottom row)
    this._btGuard = this._makeBtn(loader, uiWz, 'BtGuard', () => this.onGuardRequest?.());
    this._btMinion = this._makeBtn(loader, uiWz, 'BtMinion', () => this.onMinionRequest?.());
    this._btBomb = this._makeBtn(loader, uiWz, 'BtBomb', () => this.onBombRequest?.());
    this._btUncle = this._makeBtn(loader, uiWz, 'BtUncle', () => this.onUncleRequest?.());

    this._layoutButtons();
    this._refresh();
  }

  private _makeBtn(loader: WzTextureLoader, uiWz: WzPackage | null, name: string, onClick: () => void): Button | null {
    const prop = uiWz?.GetItem(`UIWindow2.img/MonsterCarnival/main/${name}`) as WzProperty | null;
    if (!prop) return null;
    const b = Button.fromWz(loader, prop);
    b.onClick = onClick;
    this._root.addChild(b.container);
    return b;
  }

  private _layoutButtons(): void {
    const buttons = [this._btGuard, this._btMinion, this._btBomb, this._btUncle].filter(Boolean) as Button[];
    if (buttons.length === 0) return;
    const btnY = PANEL_H - 28;
    let bx = 10;
    for (const b of buttons) {
      b.container.position.set(bx, btnY);
      bx += b.width + 4;
    }
  }

  SetState(state: MonsterCarnivalPanelState): void {
    this._state = { ...this._state, ...state };
    // Update max CP for gauge scaling
    if (state.enemyCpTotal !== undefined && state.enemyCpTotal > this._maxCp) {
      this._maxCp = state.enemyCpTotal;
    }
    if (state.myTeamCp !== undefined && state.myTeamCp > this._maxCp) {
      this._maxCp = state.myTeamCp;
    }
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
    // Check buttons first
    for (const b of [this._btGuard, this._btMinion, this._btBomb, this._btUncle]) {
      if (b?.handleMouseButton(x, y, down)) return true;
    }
    if (!down) return true;
    const lx = x - this.container.position.x;
    const ly = y - this.container.position.y;
    // Close button
    const pw = this._wzBg?.Width ?? PANEL_W;
    if (lx >= pw - 22 && ly < 20) { this.isVisible = false; return true; }
    return lx >= 0 && lx < pw && ly >= 0 && ly < (this._wzBg?.Height ?? PANEL_H);
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }

  private _refresh(): void {
    const s = this._state;

    // Team label
    this._teamLabel.text = s.team !== undefined ? `Team ${s.team}` : '';

    // Personal CP
    const pcp = s.personalCp ?? 0;
    const pcpDiff = s.personalCpDiff;
    this._personalCpValue.text = `${pcp}${pcpDiff !== undefined ? ` (${pcpDiff >= 0 ? '+' : ''}${pcpDiff})` : ''}`;

    // Team CP
    this._teamCpValue.text = `${s.myTeamCp ?? 0}`;

    // Enemy CP
    const enemy = s.enemyCpTotal !== undefined ? `${s.enemyCp ?? 0}/${s.enemyCpTotal}` : `${s.enemyCp ?? 0}`;
    this._enemyCpValue.text = enemy;

    // Status message
    this._msgText.text = s.lastMessage ?? '';

    // Draw gauge bars
    this._drawGauge(this._personalGauge, pcp, 0x4488FF);
    this._drawGauge(this._teamGauge, s.myTeamCp ?? 0, 0x44AA44);
    this._drawGauge(this._enemyGauge, s.enemyCp ?? 0, 0xFF4444);
  }

  private _drawGauge(gfx: Graphics, value: number, color: number): void {
    gfx.clear();
    // Background
    gfx.rect(0, 0, GAUGE_W, GAUGE_H).fill({ color: 0x1a1a2e });
    gfx.rect(0, 0, GAUGE_W, GAUGE_H).stroke({ color: 0x46465a, width: 1 });
    // Fill
    const ratio = Math.max(0, Math.min(1, value / this._maxCp));
    const fillW = Math.floor(GAUGE_W * ratio);
    if (fillW > 0) {
      gfx.rect(1, 1, fillW - 1, GAUGE_H - 2).fill({ color });
    }
  }

  private _rebuildBg(): void {
    const pw = this._wzBg?.Width ?? PANEL_W;
    const ph = this._wzBg?.Height ?? PANEL_H;
    this._bg.clear();
    this._bg.roundRect(0, 0, pw, ph, 5).fill({ color: 0x101423, alpha: 0.92 });
    this._bg.roundRect(0, 0, pw, ph, 5).stroke({ color: 0xffcc66, width: 1 });
    // Title bar
    this._bg.rect(0, 0, pw, 20).fill({ color: 0x1a2040, alpha: 1 });
    // Close button
    this._bg.rect(pw - 20, 3, 14, 14).fill({ color: 0x302030, alpha: 0.9 });
    this._bg.rect(pw - 20, 3, 14, 14).stroke({ color: 0x705050, width: 1 });
  }
}
