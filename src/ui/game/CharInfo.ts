import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

const PANEL_W = 204;
const PANEL_H = 274;

const _titleStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });
const _nameStyle = new TextStyle({ fill: '#FF0', fontSize: 11, fontFamily: 'monospace' });
const _valueStyle = new TextStyle({ fill: '#FFF', fontSize: 11, fontFamily: 'monospace' });

// OG class: CUIUserInfo, populated by CWvsContext::OnCharacterInfo
// (decompile/A05750.c) — reads nLevel/nJob/nPOP(fame)/sAlliance/sCommunity
// (guild), matching this panel's level/job/fame/guild fields exactly.
export class CharInfo extends GamePanel {
  charName = '';
  level = 1;
  job = 'Beginner';
  fame = 0;
  guild = '';

  private _bg: Graphics;
  private _titleText: Text;
  private _nameText: Text;
  private _detailTexts: Text[] = [];

  constructor() {
    super();
    this._root.visible = false;
    this._root.x = 300;
    this._root.y = 180;

    this._bg = new Graphics();
    this._rebuildBg();
    this._root.addChild(this._bg);

    this._titleText = new Text({ text: 'Character Info', style: _titleStyle });
    this._titleText.x = 50; this._titleText.y = 5;
    this._root.addChild(this._titleText);

    this._nameText = new Text({ text: '', style: _nameStyle });
    this._nameText.x = 8; this._nameText.y = 24;
    this._root.addChild(this._nameText);

    for (let i = 0; i < 5; i++) {
      const t = new Text({ text: '', style: _valueStyle });
      t.x = 8; t.y = 46 + i * 15;
      this._detailTexts.push(t);
      this._root.addChild(t);
    }
  }

  update(_dt: number): void {
    if (!this.isVisible) return;
    this._nameText.text = this.charName;
    this._detailTexts[0].text = `Lv.${this.level} ${this.job}`;
    this._detailTexts[1].text = `Fame: ${this.fame}`;
    this._detailTexts[2].text = this.guild ? `Guild: ${this.guild}` : '';
    this._detailTexts[3].text = '';
    this._detailTexts[4].text = '';
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    if (!down) return true;
    if (lx >= PANEL_W - 18 && ly < 22) { this.isVisible = false; return true; }
    return lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H;
  }

  onKeyPress(key: string): boolean {
    if (key === 'Escape' && this.isVisible) { this.isVisible = false; return true; }
    return false;
  }

  private _rebuildBg(): void {
    this._bg.clear();
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({  color: '#0F0F19', alpha: 230 / 255 });
    this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({  color: '#504632', width: 1 });
  }
}
