import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { PartyAdverData, ExpeditionAdverData } from '../../net/handlers/PacketArgs.js';

const PANEL_W = 320;
const PANEL_H = 340;
const ROW_H = 16;

const _titleStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });
const _entryStyle = new TextStyle({ fill: '#CCCCCC', fontSize: 10, fontFamily: 'monospace' });
const _btnStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });
const _labelStyle = new TextStyle({ fill: '#9AC2E0', fontSize: 10, fontFamily: 'monospace' });

export class PartySearchDialog extends GamePanel {
  onSearch: ((questId: number) => void) | null = null;
  onRegister: ((questId: number, title: string) => void) | null = null;
  onApply: ((partyId: number) => void) | null = null;

  private _bg: Graphics;
  private _titleText: Text;
  private _rows: Text[] = [];
  private _buttons: Text[] = [];
  private _statusText: Text;

  private _adverts: (PartyAdverData | ExpeditionAdverData)[] = [];
  private _selIdx = -1;
  private _currentGroupId = 0;

  constructor() {
    super();
    this.isVisible = false;
    this._root.x = 120;
    this._root.y = 100;

    this._bg = new Graphics();
    this._root.addChild(this._bg);

    this._titleText = new Text({ text: 'Party Search', style: _titleStyle });
    this._titleText.x = 8; this._titleText.y = 5;
    this._root.addChild(this._titleText);

    this._statusText = new Text({ text: '', style: _labelStyle });
    this._statusText.x = 8; this._statusText.y = PANEL_H - 24;
    this._root.addChild(this._statusText);

    this._redraw();
  }

  Open(): void {
    this.isVisible = true;
    this._currentGroupId = 0;
    this._rebuildList();
  }

  SetList(adverts: (PartyAdverData | ExpeditionAdverData)[]): void {
    this._adverts = adverts;
    this._selIdx = -1;
    this._rebuildList();
  }

  private _redraw(): void {
    this._bg.clear();
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 245 / 255 });
    this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
    this._bg.rect(0, 0, PANEL_W, 22).fill({ color: '#0F1224' });
  }

  private _rebuildList(): void {
    this._redraw();
    for (const r of this._rows) r.destroy();
    this._rows = [];

    const top = 28;
    for (let i = 0; i < this._adverts.length; i++) {
      const a = this._adverts[i];
      const y = top + i * ROW_H;
      if (y > PANEL_H - 36) break;
      const names = a.members.map((m) => m.sCharacterName).join(', ');
      const t = new Text({
        text: `${a.sName}: ${names}`,
        style: i === this._selIdx ? new TextStyle({ fill: '#FFE082', fontSize: 10, fontFamily: 'monospace' }) : _entryStyle,
      });
      t.x = 8;
      t.y = y;
      t.eventMode = 'static';
      t.cursor = 'pointer';
      const idx = i;
      t.on('pointerdown', () => { this._selIdx = idx; this._rebuildList(); });
      this._rows.push(t);
      this._root.addChild(t);
    }

    this._statusText.text = this._adverts.length > 0 ? `${this._adverts.length} listing(s)` : 'No listings found.';
    this._rebuildButtons();
  }

  private _rebuildButtons(): void {
    for (const b of this._buttons) b.destroy();
    this._buttons = [];

    const y = PANEL_H - 26;
    let x = 8;
    const add = (label: string, onClick: () => void): void => {
      const t = new Text({ text: `[${label}]`, style: _btnStyle });
      t.x = x; t.y = y;
      t.eventMode = 'static';
      t.cursor = 'pointer';
      t.on('pointerdown', onClick);
      this._buttons.push(t);
      this._root.addChild(t);
      x += t.width + 10;
    };

    add('Search', () => {
      const raw = window.prompt('Enter quest/group ID:');
      if (raw !== null) {
        const qid = parseInt(raw, 10);
        if (Number.isFinite(qid)) {
          this._currentGroupId = qid;
          this.onSearch?.(qid);
        }
      }
    });
    add('Register', () => {
      const questRaw = window.prompt('Quest ID:');
      if (questRaw === null) return;
      const qid = parseInt(questRaw, 10);
      if (!Number.isFinite(qid)) return;
      const title = window.prompt('Advertisement title:') ?? '';
      this.onRegister?.(qid, title);
    });
    if (this._selIdx >= 0 && this._selIdx < this._adverts.length) {
      add('Apply', () => {
        const partyId = this._adverts[this._selIdx].nGroupID;
        this.onApply?.(partyId);
      });
    }
    add('Close', () => { this.isVisible = false; });
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
}
