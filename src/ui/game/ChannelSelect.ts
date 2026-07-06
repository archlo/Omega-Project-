import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';

const PANEL_W = 280;
const PANEL_H = 280;
const TITLE_H = 22;
const COL_W = 52;
const COL_COUNT = 5;
const ROW_H = 36;

const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _chanStyle = new TextStyle({ fill: '#FFF', fontSize: 10, fontFamily: 'monospace' });
const _popStyle = new TextStyle({ fill: '#AAA', fontSize: 8, fontFamily: 'monospace' });

export class ChannelSelect extends GamePanel {
  onChannelChange: ((ch: number) => void) | null = null;

  private _channels: { channel: number; population: number }[] = [];
  private _currentChannel = 0;
  private _selectedChannel = -1;

  private _bg: Graphics;
  private _wzBg: WzSprite | null;
  private _chanSlots: { container: Container; index: number }[] = [];
  private _btnChange: Container;
  private _btnCancel: Container;
  private _selHighlight: Graphics | null = null;
  private _titleText: Text;

  constructor(opts: { loader?: WzTextureLoader; uiWz?: WzPackage | null } = {}) {
    super();
    this._root.visible = false;

    // Try WZ background first
    const chanProp = opts.uiWz?.GetItem('UIWindow2.img/Channel');
    const wzBgNode = chanProp instanceof WzProperty ? chanProp.Get('backgrnd') : null;
    this._wzBg = wzBgNode instanceof WzCanvas ? (opts.loader?.Load(wzBgNode) ?? null) : null;

    this._bg = new Graphics();
    this._root.addChild(this._bg);

    if (this._wzBg) {
      this._root.addChildAt(this._wzBg.ToPixi(), 0);
    }

    this._titleText = new Text({ text: 'Select Channel', style: _titleStyle });
    this._root.addChild(this._titleText);

    this._btnChange = this._makeBtn('Change', 160, PANEL_H - 28);
    this._btnCancel = this._makeBtn('Cancel', 80, PANEL_H - 28);
    this._root.addChild(this._btnChange, this._btnCancel);

    this._rebuild();
  }

  setChannels(channels: { channel: number; population: number }[], current: number): void {
    this._channels = channels;
    this._currentChannel = current;
    this._selectedChannel = current;
    this._rebuild();
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    if (!down) return lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H;
    for (const slot of this._chanSlots) {
      const tr = slot.container;
      if (lx >= tr.x && lx < tr.x + COL_W + 4 && ly >= tr.y && ly < tr.y + ROW_H) {
        this._selectChannel(slot.index);
        return true;
      }
    }
    if (this._hitBtn(this._btnChange, lx, ly)) { this._confirm(); return true; }
    if (this._hitBtn(this._btnCancel, lx, ly)) { this.isVisible = false; return true; }
    return lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    if (key === 'Enter') { this._confirm(); return true; }
    return false;
  }

  private _rebuild(): void {
    this._root.removeChildren();
    this._chanSlots = [];

    this._bg.clear();
    if (!this._wzBg) {
      this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({  color: '#0C0E18', alpha: 0.95 });
      this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({  color: '#3C4164', width: 1 });
      this._bg.rect(0, 0, PANEL_W, TITLE_H).fill({  color: '#0F1224' });
    }
    this._root.addChild(this._bg);

    if (this._wzBg) {
      this._root.addChildAt(this._wzBg.ToPixi(), 0);
    }

    this._titleText.text = this._currentChannel > 0
      ? `Select Channel (Ch.${this._currentChannel})`
      : 'Select Channel';
    this._titleText.x = 10; this._titleText.y = 4;
    this._root.addChild(this._titleText);

    for (let i = 0; i < Math.min(this._channels.length, 20); i++) {
      const ch = this._channels[i];
      const col = i % COL_COUNT;
      const row = Math.floor(i / COL_COUNT);
      const cx = 10 + col * (COL_W + 6);
      const cy = TITLE_H + 8 + row * ROW_H;

      const c = new Container();
      const bg = new Graphics();
      const isCurrent = ch.channel === this._currentChannel;
      const isSelected = ch.channel === this._selectedChannel;
      bg.rect(0, 0, COL_W, ROW_H - 4).fill({  color: isCurrent ? '#2A3A2A' : '#161824' });
      bg.rect(0, 0, COL_W, ROW_H - 4).stroke({  color: isSelected ? '#8AF' : isCurrent ? '#5A7A5A' : '#303450', width: 1 });

      const t1 = new Text({ text: `Ch.${ch.channel}`, style: _chanStyle });
      t1.x = 4; t1.y = 4;
      // population is a raw user count (WorldInformation's nUserNo) — no confirmed
      // max-capacity scale exists to render this as a percentage, so show the count.
      const t2 = new Text({ text: `${ch.population}`, style: _popStyle });
      t2.x = 4; t2.y = 18;

      c.addChild(bg, t1, t2);
      c.x = cx; c.y = cy;

      if (ch.channel === this._selectedChannel) {
        this._selHighlight = bg;
      }
      this._root.addChild(c);
      this._chanSlots.push({ container: c, index: i });
    }

    this._root.addChild(this._btnChange, this._btnCancel);
  }

  private _selectChannel(index: number): void {
    this._selectedChannel = this._channels[index].channel;
    this._rebuild();
  }

  private _confirm(): void {
    if (this._selectedChannel > 0 && this._selectedChannel !== this._currentChannel) {
      this.onChannelChange?.(this._selectedChannel);
    }
    this.isVisible = false;
  }

  private _makeBtn(label: string, x: number, y: number): Container {
    const c = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, 60, 20).fill({  color: '#1E2030', alpha: 0.9 });
    bg.rect(0, 0, 60, 20).stroke({  color: '#505570', width: 1 });
    const t = new Text({ text: label, style: new TextStyle({ fill: '#CCC', fontSize: 10, fontFamily: 'monospace' }) });
    t.x = 12; t.y = 4;
    c.addChild(bg, t);
    c.x = x; c.y = y;
    return c;
  }

  private _hitBtn(btn: Container, lx: number, ly: number): boolean {
    return lx >= btn.x && lx < btn.x + 60 && ly >= btn.y && ly < btn.y + 22;
  }
}
