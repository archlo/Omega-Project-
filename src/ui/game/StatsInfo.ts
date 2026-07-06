import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';
import { Button } from '../Button.js';

const PANEL_W = 172;
const PANEL_H = 340;
const COL_LABEL = 10;
const COL_VALUE = 95;
const COL_BTN = 140;
const ROW_H = 17;
const ROW_Y = 39;

const _titleStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });
const _labelStyle = new TextStyle({ fill: '#C8C8C8', fontSize: 10, fontFamily: 'monospace' });
const _valueStyle = new TextStyle({ fill: '#FFF', fontSize: 10, fontFamily: 'monospace' });
const _apStyle = new TextStyle({ fill: '#FFDC3C', fontSize: 10, fontFamily: 'monospace' });

// OG class: CUIStat (ms_aStatName, ZRef-template instantiations confirmed).
// Sibling classes CUIStatChange/CUIStatChangeConfirm are the AP-allocation
// confirm/preview dialogs (IncStat-style methods), not this panel.
export class StatsInfo extends GamePanel {
  level = 1; job = 'Beginner'; ap = 0;
  str = 4; dex = 4; intStat = 4; luk = 4;
  hp = 50; maxHp = 50; mp = 5; maxMp = 5;
  atk = 10; def = 10; speed = 100; jump = 100;

  onHpUp: (() => void) | null = null;
  onMpUp: (() => void) | null = null;
  onStrUp: (() => void) | null = null;
  onDexUp: (() => void) | null = null;
  onIntUp: (() => void) | null = null;
  onLukUp: (() => void) | null = null;

  private _bg: Graphics;
  private _wzBg: WzSprite | null = null;
  private _titleText: Text;
  private _rows: { label: Text; value: Text; plusBtn: Container | null; apIndex: number | null }[] = [];
  private _apBanner: Graphics;
  private _apLabel: Text;
  private _apValue: Text;
  private _autoBtn: Container | null = null;
  private _showDetail = false;
  private _btHpUp: Button | null = null;
  private _btMpUp: Button | null = null;
  private _btStrUp: Button | null = null;
  private _btDexUp: Button | null = null;
  private _btIntUp: Button | null = null;
  private _btLukUp: Button | null = null;
  private _btAuto: Button | null = null;
  private _btDetailOpen: Button | null = null;
  private _btDetailClose: Button | null = null;

  constructor(loader: WzTextureLoader, ui: WzPackage | null) {
    super();
    this._root.visible = false;
    this._root.x = 10;
    this._root.y = 80;

    // Load WZ background
    const stat = ui?.GetItem('UIWindow2.img/Stat/main') as WzProperty | null;
    if (stat) {
      const bgNode = stat.Get('backgrnd');
      if (bgNode instanceof WzCanvas) {
        this._wzBg = loader.Load(bgNode);
      }
    }

    this._bg = new Graphics();
    if (!this._wzBg) this._rebuildBg();
    this._root.addChild(this._bg);

    if (this._wzBg) {
      const bgSprite = this._wzBg.ToPixi();
      this._root.addChildAt(bgSprite, 0);
    }

    this._titleText = new Text({ text: 'Character Stats', style: _titleStyle });
    this._titleText.x = 34; this._titleText.y = 5;
    this._root.addChild(this._titleText);

    this._apBanner = new Graphics();
    this._apLabel = new Text({ text: 'AP', style: _labelStyle });
    this._apLabel.x = COL_LABEL;
    this._apValue = new Text({ text: '0', style: _apStyle });
    this._apValue.x = COL_VALUE;

    // Load WZ buttons if available
    if (stat) {
      this._btHpUp = this._loadButton(loader, stat, 'BtHpUp');
      this._btMpUp = this._loadButton(loader, stat, 'BtMpUp');
      this._btStrUp = this._loadButton(loader, stat, 'BtStrUp');
      this._btDexUp = this._loadButton(loader, stat, 'BtDexUp');
      this._btIntUp = this._loadButton(loader, stat, 'BtIntUp');
      this._btLukUp = this._loadButton(loader, stat, 'BtLukUp');
      this._btAuto = this._loadButton(loader, stat, 'BtAuto');
      this._btDetailOpen = this._loadButton(loader, stat, 'BtDetailOpen');
      this._btDetailClose = this._loadButton(loader, stat, 'BtDetailClose');

      // Position stat buttons
      const statBtns = [
        { btn: this._btHpUp, cb: () => this._requestAP(0) },
        { btn: this._btMpUp, cb: () => this._requestAP(1) },
        { btn: this._btStrUp, cb: () => this._requestAP(2) },
        { btn: this._btDexUp, cb: () => this._requestAP(3) },
        { btn: this._btIntUp, cb: () => this._requestAP(4) },
        { btn: this._btLukUp, cb: () => this._requestAP(5) },
      ];
      const btnY = [ROW_Y + ROW_H * 2, ROW_Y + ROW_H * 3, ROW_Y + ROW_H * 5, ROW_Y + ROW_H * 6, ROW_Y + ROW_H * 7, ROW_Y + ROW_H * 8];
      for (let i = 0; i < statBtns.length; i++) {
        const { btn, cb } = statBtns[i];
        if (btn) {
          btn.container.position.set(COL_BTN, btnY[i]);
          btn.onClick = cb;
          this._root.addChild(btn.container);
        }
      }
    }

    const statDefs = [
      { label: 'Level', key: 'level', apIndex: null },
      { label: 'Job', key: 'job', apIndex: null },
      { label: 'HP', key: 'hp', apIndex: 0 },
      { label: 'MP', key: 'mp', apIndex: 1 },
      { label: 'AP', key: 'ap', apIndex: null },
      { label: 'STR', key: 'str', apIndex: 2 },
      { label: 'DEX', key: 'dex', apIndex: 3 },
      { label: 'INT', key: 'intStat', apIndex: 4 },
      { label: 'LUK', key: 'luk', apIndex: 5 },
      { label: 'Attack', key: 'atk', apIndex: null },
      { label: 'Defense', key: 'def', apIndex: null },
      { label: 'Speed', key: 'speed', apIndex: null },
      { label: 'Jump', key: 'jump', apIndex: null },
    ];
    for (let i = 0; i < statDefs.length; i++) {
      const def = statDefs[i];
      const y = ROW_Y + i * ROW_H;
      const lt = new Text({ text: def.label, style: _labelStyle });
      lt.x = COL_LABEL;
      lt.y = y;
      const vt = new Text({ text: '0', style: _valueStyle });
      vt.x = COL_VALUE;
      vt.y = y;
      const btn = def.apIndex === null ? null : new Container();
      if (btn) {
        const bg = new Graphics();
        bg.rect(0, 0, 18, 14).fill({  color: '#1E3C1E' });
        bg.rect(0, 0, 18, 14).stroke({  color: '#50A050', width: 1 });
        const pt = new Text({ text: '+', style: new TextStyle({ fill: '#64DC64', fontSize: 10, fontFamily: 'monospace' }) });
        pt.x = 4; pt.y = 0;
        btn.addChild(bg, pt);
        btn.x = COL_BTN;
        btn.y = y;
      }
      this._rows.push({ label: lt, value: vt, plusBtn: btn, apIndex: def.apIndex });
      this._root.addChild(lt, vt);
      if (btn) this._root.addChild(btn);
    }
    this._root.addChild(this._apBanner, this._apLabel, this._apValue);
  }

  private _loadButton(loader: WzTextureLoader, prop: WzProperty, name: string): Button | null {
    const btnProp = prop.Get(name);
    if (!(btnProp instanceof WzProperty)) return null;
    return Button.fromWz(loader, btnProp);
  }

  SetDerivedStats(atk: number, def: number, speed: number, jump: number): void {
    this.atk = atk;
    this.def = def;
    this.speed = speed;
    this.jump = jump;
  }

  update(_dt: number): void {
    if (!this.isVisible) return;
    this._apValue.text = `${this.ap}`;

    const vals = [
      `${this.level}`,
      this.job,
      `${this.hp} / ${this.maxHp}`,
      `${this.mp} / ${this.maxMp}`,
      `${this.ap}`,
      `${this.str}`,
      `${this.dex}`,
      `${this.intStat}`,
      `${this.luk}`,
      `${this.atk}`,
      `${this.def}`,
      `${this.speed}%`,
      `${this.jump}%`,
    ];
    const hasWzApButtons = this._btHpUp !== null || this._btStrUp !== null;
    for (let i = 0; i < this._rows.length; i++) {
      const row = this._rows[i];
      row.value.text = vals[i] ?? '';
      if (row.plusBtn) {
        row.plusBtn.visible = this.ap > 0 && !hasWzApButtons;
      }
    }
    for (const b of [this._btHpUp, this._btMpUp, this._btStrUp, this._btDexUp, this._btIntUp, this._btLukUp, this._btAuto]) {
      if (b) b.enabled = this.ap > 0;
    }
    if (this._btHpUp) this._btHpUp.enabled = this.ap > 0 && this.level >= 20;
    if (this._btMpUp) this._btMpUp.enabled = this.ap > 0 && this.level >= 20;

    this._apBanner.visible = this.ap > 0;
    this._apLabel.visible = true;
    this._apValue.visible = true;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;

    // Check WZ buttons first
    for (const b of [this._btHpUp, this._btMpUp, this._btStrUp, this._btDexUp, this._btIntUp, this._btLukUp, this._btAuto, this._btDetailOpen, this._btDetailClose]) {
      if (b?.handleMouseButton(x - this._root.x, y - this._root.y, down)) return true;
    }

    const lx = x - this._root.x;
    const ly = y - this._root.y;
    if (!down) return true;

    // Close button fallback
    if (!this._btDetailClose && lx >= PANEL_W - 18 && ly < 22) { this.isVisible = false; return true; }
    if (ly >= 22 && ly < 40) { this._showDetail = !this._showDetail; return true; }

    // Graphics button fallback
    if (!this._btStrUp && this.ap > 0) {
      for (const row of this._rows) {
        const btn = row.plusBtn;
        if (!btn || !btn.visible) continue;
        if (lx >= btn.x && lx < btn.x + 18 && ly >= btn.y && ly < btn.y + 14) {
          if (row.apIndex !== null) this._requestAP(row.apIndex);
          return true;
        }
      }
    }
    return lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H;
  }

  onKeyPress(key: string): boolean {
    if (key === 'Escape' && this.isVisible) { this.isVisible = false; return true; }
    return false;
  }

  private _requestAP(idx: number): void {
    if (this.ap <= 0) return;
    switch (idx) {
      case 0: if (this.level >= 20) this.onHpUp?.(); break;
      case 1: if (this.level >= 20) this.onMpUp?.(); break;
      case 2: this.onStrUp?.(); break;
      case 3: this.onDexUp?.(); break;
      case 4: this.onIntUp?.(); break;
      case 5: this.onLukUp?.(); break;
    }
  }

  private _rebuildBg(): void {
    this._bg.clear();
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({  color: '#0C0C16', alpha: 235 / 255 });
    this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({  color: '#46465A', width: 1 });
  }
}
