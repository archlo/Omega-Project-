import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { GuildBBSEntry, GuildBBSComment } from '../../net/handlers/PacketArgs.js';

const PANEL_W = 280;
const PANEL_H = 320;
const ROW_H = 18;

const _titleStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });
const _entryStyle = new TextStyle({ fill: '#CCCCCC', fontSize: 11, fontFamily: 'monospace' });
const _noticeStyle = new TextStyle({ fill: '#FFE082', fontSize: 11, fontFamily: 'monospace' });
const _btnStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });
const _bodyStyle = new TextStyle({ fill: '#DDDDDD', fontSize: 10, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: PANEL_W - 20 });

// OG: CUIGuildBBS (decompile, OnCreate/Draw at 0x7c69f0/0x7c82b0).
// TODO_AUDIT.md Sixty-third pass's finding: the whole list/view/comment/
// register/delete protocol was already fully decoded both directions
// (FieldHandlers.ts/GameSender.ts) with zero UI panel to trigger it from.
// WZ-confirmed present (UIWindow2.img/UserList/GuildBoard) but the exact
// control layout wasn't mapped this pass — rendered as plain text/buttons
// instead, same fallback convention as Clock.ts/KillCountHud.ts/etc.
export class GuildBBS extends GamePanel {
  onLoadList: ((startIndex: number) => void) | null = null;
  onViewEntry: ((entryId: number) => void) | null = null;
  onNewPost: ((title: string, text: string) => void) | null = null;
  onDeleteEntry: ((entryId: number) => void) | null = null;
  onComment: ((entryId: number, comment: string) => void) | null = null;
  onCommentDelete: ((entryId: number, commentSn: number) => void) | null = null;

  private _bg: Graphics;
  private _notice: GuildBBSEntry | null = null;
  private _entries: GuildBBSEntry[] = [];
  private _viewing: { entryId: number; characterId: number; title: string; text: string; comments: GuildBBSComment[] } | null = null;
  private _rows: Text[] = [];
  private _buttons: Text[] = [];
  private _titleText: Text;

  constructor() {
    super();
    this.isVisible = false;
    this._root.x = 250;
    this._root.y = 80;

    this._bg = new Graphics();
    this._root.addChild(this._bg);

    this._titleText = new Text({ text: 'Guild Board', style: _titleStyle });
    this._titleText.x = 8; this._titleText.y = 5;
    this._root.addChild(this._titleText);

    this._redrawBg();
    // OG: CUIWnd close button
    this.createCloseButton(null, null, 1, 300);
  }

  Open(): void {
    this.isVisible = true;
    this._viewing = null;
    this.onLoadList?.(0);
  }

  SetList(notice: GuildBBSEntry | null, entries: GuildBBSEntry[]): void {
    this._notice = notice;
    this._entries = entries;
    this._viewing = null;
    this._rebuild();
  }

  SetEntry(entryId: number, characterId: number, title: string, text: string, comments: GuildBBSComment[]): void {
    this._viewing = { entryId, characterId, title, text, comments };
    this._rebuild();
  }

  ShowNotFound(): void {
    this._viewing = { entryId: -1, characterId: 0, title: 'Not found', text: 'This post no longer exists.', comments: [] };
    this._rebuild();
  }

  private _redrawBg(): void {
    this._bg.clear();
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 245 / 255 });
    this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
  }

  private _clearDynamic(): void {
    for (const r of this._rows) this._root.removeChild(r);
    this._rows = [];
    for (const b of this._buttons) this._root.removeChild(b);
    this._buttons = [];
  }

  private _addButton(label: string, x: number, y: number, onClick: () => void): void {
    const t = new Text({ text: `[${label}]`, style: _btnStyle });
    t.position.set(x, y);
    t.eventMode = 'static';
    t.cursor = 'pointer';
    t.on('pointerdown', onClick);
    this._buttons.push(t);
    this._root.addChild(t);
  }

  private _rebuild(): void {
    this._clearDynamic();
    if (this._viewing) {
      this._titleText.text = this._viewing.title;
      const body = new Text({ text: this._viewing.text, style: _bodyStyle });
      body.position.set(8, 26);
      this._rows.push(body);
      this._root.addChild(body);

      let y = 26 + Math.max(20, body.height) + 6;
      for (const c of this._viewing.comments) {
        const ct = new Text({ text: `- ${c.comment}`, style: _entryStyle });
        ct.position.set(8, y);
        this._rows.push(ct);
        this._root.addChild(ct);
        y += ROW_H;
      }

      this._addButton('Back', 8, PANEL_H - 24, () => { this._viewing = null; this.onLoadList?.(0); });
      this._addButton('Comment', 70, PANEL_H - 24, () => {
        const c = window.prompt('Comment:') ?? '';
        if (c.length > 0) this.onComment?.(this._viewing!.entryId, c);
      });
      this._addButton('Delete', 160, PANEL_H - 24, () => this.onDeleteEntry?.(this._viewing!.entryId));
      return;
    }

    this._titleText.text = 'Guild Board';
    let y = 26;
    if (this._notice) {
      const n = new Text({ text: `[Notice] ${this._notice.title}`, style: _noticeStyle });
      n.position.set(8, y);
      n.eventMode = 'static';
      n.cursor = 'pointer';
      const id = this._notice.entryId;
      n.on('pointerdown', () => this.onViewEntry?.(id));
      this._rows.push(n);
      this._root.addChild(n);
      y += ROW_H;
    }
    for (const e of this._entries) {
      const row = new Text({ text: `${e.title} (${e.comments})`, style: _entryStyle });
      row.position.set(8, y);
      row.eventMode = 'static';
      row.cursor = 'pointer';
      const id = e.entryId;
      row.on('pointerdown', () => this.onViewEntry?.(id));
      this._rows.push(row);
      this._root.addChild(row);
      y += ROW_H;
    }

    this._addButton('New Post', 8, PANEL_H - 24, () => {
      const title = window.prompt('Post title:') ?? '';
      if (title.length === 0) return;
      const text = window.prompt('Post text:') ?? '';
      this.onNewPost?.(title, text);
    });
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
