import { Sprite, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { Button } from '../Button.js';
import { ScrollBar } from './ScrollBar.js';

// ── CUIMessenger (v95 IDB) ────────────────────────────────────────────────────
// SetLayer @0x7F1920 / SetCtrl @0x7F34C0 / DrawTextA @0x7F2A90 /
// AddChatText @0x7F4250 / DrawStatusBar @0x7F4BA0 / OnKey @0x7F6400 /
// OnButtonClicked @0x7F6380 / ProcessChat @0x7F6140 / Update @0x7F2FF0.
//
// m_nState: 0 = Max (295x355), 1 = Min chat-only (295x243), 2 = Min2 title
// strip (209x20). BtClose id1000 = Basic.img/BtClose3 at (276,6) states 0/1,
// (191,3) state 2. LayoutMan buttons take their positions from the WZ canvas
// origin nodes (AddButton uol,id,0,0). Chat edit id1005 white bg black Arial:
// (11,307) state 0, (11,195) state 1, hidden state 2. Scrollbar id1006:
// (275,150,len148) state 0, (275,57,len129) state 1. Visible lines 9/8/0.

const STATE_MAX = 0;
const STATE_MIN = 1;
const STATE_MIN2 = 2;

const STATE_SIZE: Record<number, { w: number; h: number }> = {
  [STATE_MAX]: { w: 295, h: 355 },
  [STATE_MIN]: { w: 295, h: 243 },
  [STATE_MIN2]: { w: 209, h: 20 },
};

// DrawTextA: x=12 fixed; y = (state != 0 ? 60 : 155) + i*16.
const CHAT_X = 12;
const CHAT_LINE_H = 16;
const LINE_COUNT: Record<number, number> = { [STATE_MAX]: 9, [STATE_MIN]: 8, [STATE_MIN2]: 0 };

// AddChatText: first-line wrap budget 240px; continuation lines are prefixed
// with 4 spaces and get 240 minus that prefix width. Measured in Arial 12.
const WRAP_BUDGET = 240;
const CONTINUATION_PREFIX = '    ';

// Status strip (DrawStatusBar): member names joined with "," + " is typing.",
// truncated to 252px, FONT_SMALL_BLACK, drawn beside the state icon — icon at
// x=12, text left edge x=17+12=29, top = icon y (332 Max / 220 Min).
const STATUS_MAX_W = 252;

// AddChatText color mapping (input ftColor → stored ftColor):
// BASIC_WHITE→SMALL_DIMBLUE, BASIC_BLACK→SMALL_RED, BASIC_GRAY→SMALL_DIMGREEN,
// else→SMALL_BLACK. Stored values drawn via get_basic_font. SMALL_BLACK=20 and
// SMALL_RED=34 (#FF2020) confirmed by the get_basic_font case table; DIMBLUE/
// DIMGREEN names are not push-anchored in any dump — #2000FF (case 28) and
// #336600 (case 42) are the deep-blue/dark-green members of the same h11 family.
const CHAT_COLOR_OTHERS = 0xFF2000FF; // SMALL_DIMBLUE
const CHAT_COLOR_SELF = 0xFF000000;   // SMALL_BLACK
const CHAT_COLOR_SYSTEM = 0xFF336600; // SMALL_DIMGREEN

const _chatStyles: Record<number, TextStyle> = {};
function argbHex(argb: number): string {
  return '#' + (argb & 0xffffff).toString(16).padStart(6, '0');
}
function chatStyle(color: number): TextStyle {
  if (!_chatStyles[color]) _chatStyles[color] = new TextStyle({ fill: argbHex(color), fontSize: 11, fontFamily: 'Arial' });
  return _chatStyles[color];
}
const _idFont = new TextStyle({ fill: '#000000', fontSize: 12, fontFamily: 'Arial' });
const _statusStyle = new TextStyle({ fill: '#000000', fontSize: 11, fontFamily: 'Arial' });

export class Messenger extends GamePanel {
  onClosed: (() => void) | null = null;
  /** BtEnter / Enter key - ProcessChat sends the raw text (OG packet 143/6). */
  onSubmit: ((text: string) => void) | null = null;
  /** BtClame (id 1004) - CUIMessenger::SendClaim. */
  onClaim: (() => void) | null = null;
  /** "/invite name" slash command - SendInviteMsg. */
  onInvite: ((name: string) => void) | null = null;

  /** Local character name for the "name : text" echo + status strip. */
  selfName = '';

  // OG m_nState (SetState @0x7F4200)
  private _state = STATE_MAX;

  // CHARACTER slots (OnEnter/OnLeave); names only — avatars need AvatarLook
  // which the current server packet does not carry (documented gap).
  private _slots: (string | null)[] = [null, null, null];
  private _selfIndex = -1;

  // ChatTextInfo[]: wrapped line + font color
  private _lines: { text: string; color: number }[] = [];
  private _history: string[] = []; // CChatHelper: max 8, dedup consecutive

  private _lineNodes: Text[] = [];
  private _plateNodes: (Sprite | Text)[] = [];
  private _statusNode: Text | null = null;
  private _editNode: Text | null = null;

  private _input = '';
  private _focused = false;

  private _btMin: Button | null = null;
  private _btMax: Button | null = null;
  private _btClaim: Button | null = null;
  private _btEnter: Button | null = null;
  private _allButtons: Button[] = [];

  private _scroll: ScrollBar | null = null;
  private _loader: WzTextureLoader | null = null;
  private _ui: WzPackage | null = null;

  constructor(loader?: WzTextureLoader, ui?: WzPackage | null) {
    super();
    this.isVisible = false;
    this._root.position.set(300, 120);
    this._loader = loader ?? null;
    this._ui = ui ?? null;
    this.createCloseButton(loader ?? null, ui ?? null, 5);
    if (loader && ui) this.applyState();
  }

  Open(): void {
    this.SetState(STATE_MAX);
    this.isVisible = true;
    this._addWelcome();
  }

  /** OG SetState @0x7F4200: rebuild layers + controls when the state flips. */
  SetState(state: number): void {
    const s = ((state % 3) + 3) % 3;
    if (s === this._state && this._btMin) return;
    this._state = s;
    if (this._loader && this._ui) this.applyState();
  }

  get state(): number { return this._state; }

  // ── SetLayer @0x7F1920 + SetCtrl @0x7F34C0 ──
  private applyState(): void {
    const loader = this._loader!;
    const ui = this._ui!;
    const size = STATE_SIZE[this._state];
    const rootName = ['Max', 'Min', 'Min2'][this._state];

    // Layers: backgrnd(+2/+3 for Max|Min), then the state icon canvas.
    for (const child of [...this._root.children]) {
      if (child !== this.container) child.removeFromParent();
    }
    const prop = ui.GetItem(`UIWindow2.img/Messenger/${rootName}`);
    if (prop instanceof WzProperty) {
      for (const layer of ['backgrnd', 'backgrnd2', 'backgrnd3']) {
        const canvas = prop.Get(layer);
        if (!(canvas instanceof WzCanvas)) continue;
        const ws = loader.Load(canvas);
        if (!ws) continue;
        const s = ws.ToPixi();
        s.position.set(-ws.OriginX, -ws.OriginY);
        this._root.addChildAt(s, 0);
      }
    }

    for (const b of this._allButtons) b.container.removeFromParent();
    this._allButtons = [];
    this._btMin = this._btMax = this._btClaim = this._btEnter = null;

    const addWz = (name: string, onClick: () => void): Button | null => {
      const sub = prop instanceof WzProperty ? prop.Get(name) : null;
      if (!(sub instanceof WzProperty)) return null;
      const b = Button.fromWz(loader, sub, '');
      b.onClick = onClick;
      // OG AddButton(uol, id, 0, 0): the canvas origin encodes the position.
      b.container.position.set(0, 0);
      this._root.addChild(b.container);
      this._allButtons.push(b);
      return b;
    };

    if (this._state === STATE_MIN2) {
      this._btMin = addWz('BtMin', () => this.SetState(this._state + 1));
      this._btMax = addWz('BtMax', () => this.SetState(this._state - 1));
    } else {
      this._btMin = addWz('BtMin', () => this.SetState(this._state + 1));
      this._btMax = addWz('BtMax', () => this.SetState(this._state - 1));
      this._btClaim = addWz('BtClame', () => { this.onClaim?.(); });
      this._btEnter = addWz('BtEnter', () => this.processChat());
      if (this._btMax) this._btMax.enabled = false; // OG: maximized disables BtMax
      if (this._btEnter) this._btEnter.enabled = false; // OG: starts disabled
    }

    // Close button: id 1000 at (276,6) states 0/1, (191,3) state 2, UOL BtClose3.
    this.createCloseButton(loader, ui, 5, size.w, {
      x: this._state !== STATE_MIN2 ? 276 : 191,
      y: this._state !== STATE_MIN2 ? 6 : 3,
    });

    // Scrollbar id1006 (state <= 1 only).
    if (this._scroll) { this._scroll.container.removeFromParent(); this._scroll = null; }
    if (this._state !== STATE_MIN2) {
      const sbY = this._state === STATE_MAX ? 150 : 57;
      const sbH = this._state === STATE_MAX ? 148 : 129;
      this._scroll = new ScrollBar(275, sbY, sbH, () => this.drawChat());
      this._root.addChild(this._scroll.container);
      this.syncScroll();
    }

    this.draw();
  }

  // ── participants ──
  SetSelf(index: number): void {
    this._selfIndex = index;
    if (index >= 0 && index < 3 && !this._slots[index]) this._slots[index] = this.selfName || '(you)';
    this.isVisible = true;
  }

  SetParticipant(index: number, name: string): void {
    if (index >= 0 && index < 3) this._slots[index] = name;
  }

  RemoveParticipant(index: number): void {
    if (index >= 0 && index < 3) this._slots[index] = null;
  }

  /** Server-relayed chat (already "name : text" formatted per OG ProcessChat). */
  AddChat(text: string): void {
    this.addLine(text, CHAT_COLOR_OTHERS);
  }

  Reset(): void {
    for (let i = 0; i < this._slots.length; i++) this._slots[i] = null;
    this._selfIndex = -1;
    this._lines = [];
    this._input = '';
    this._history = [];
    this.draw();
  }

  // ── OnCreate welcome block: help lines via AddChatText(..., -1 → BLACK) ──
  private _welcomeAdded = false;
  private _addWelcome(): void {
    if (this._welcomeAdded) return;
    this._welcomeAdded = true;
    this.addLine('[ Maple Messenger Help ]', CHAT_COLOR_SELF);
    this.addLine('-------------------------', CHAT_COLOR_SELF);
    this.addLine('Invite : /invite character-name', CHAT_COLOR_SELF);
    this.addLine('End : /q', CHAT_COLOR_SELF);
    this.addLine('-------------------------', CHAT_COLOR_SELF);
  }

  // ── AddChatText @0x7F4250: word-wrap at 240px, continuation indent 4 spaces ──
  addLine(text: string, color: number): void {
    const wasAtEnd = !this._scroll || this._scrollPos() >= this._maxScrollPos();
    let rest = text;
    let first = true;
    while (rest.length > 0) {
      const budgetChars = first
        ? WRAP_BUDGET / 6
        : (WRAP_BUDGET - CONTINUATION_PREFIX.length * 6) / 6;
      let chunk: string;
      if (rest.length <= budgetChars) {
        chunk = (first ? '' : CONTINUATION_PREFIX) + rest;
        rest = '';
      } else {
        let cut = budgetChars;
        while (cut > 1 && rest[cut] !== ' ') cut--;
        if (cut <= 1) cut = budgetChars;
        chunk = (first ? '' : CONTINUATION_PREFIX) + rest.slice(0, cut);
        rest = rest.slice(cut).replace(/^ /, '');
      }
      this._lines.push({ text: chunk, color });
      first = false;
    }
    if (this._lines.length > 200) this._lines.splice(0, this._lines.length - 200);
    this.syncScroll();
    if (wasAtEnd && this._scroll) this.setScrollPos(this._maxScrollPos());
    this.drawChat();
  }

  private syncScroll(): void {
    // CCtrlScrollBar::SetScrollRange(count - lineCount + 1): range includes pos 0.
    if (!this._scroll) return;
    this._scroll.setRange(this._maxScrollPos() + 1);
  }

  private _visibleLines(): number { return LINE_COUNT[this._state]; }
  private _maxScrollPos(): number { return Math.max(0, this._lines.length - this._visibleLines()); }
  private _scrollPos(): number {
    if (!this._scroll) return this._maxScrollPos();
    return Math.min(this._scroll.pos, this._maxScrollPos());
  }
  private setScrollPos(pos: number): void {
    if (this._scroll) this._scroll.pos = pos;
  }

  // ── ProcessChat @0x7F6140 + HandleSlashCommand @0x7F5EE0 ──
  private processChat(): void {
    const text = this._input.trim();
    if (!text || this._selfIndex < 0) return;
    // OG refocuses the edit after every send.
    this._focused = true;
    this._input = '';
    this._setEnterEnabled(false);
    if (text.startsWith('/')) {
      const cmd = text.slice(1);
      if (cmd === 'q' || cmd === 'Q') { this.tryDelete(); return; }
      if (cmd.startsWith('invite')) {
        const target = cmd.slice('invite'.length).trim();
        if (target) this.onInvite?.(target);
      }
      this.drawEdit();
      return;
    }
    if (this._history[this._history.length - 1] !== text) {
      this._history.push(text);
      if (this._history.length > 8) this._history.shift();
    }
    const echo = `${this.selfName} : ${text}`;
    this.addLine(echo, CHAT_COLOR_SELF);
    this.onSubmit?.(text);
    this.drawEdit();
  }

  private tryDelete(): void {
    this.isVisible = false;
    this.Reset();
    this.onClosed?.();
  }

  private _setEnterEnabled(on: boolean): void {
    if (this._btEnter) this._btEnter.enabled = on;
  }

  update(_dt: number): void {
    if (!this.isVisible) return;
    this.drawChat();
  }

  draw(): void {
    if (!this.isVisible) return;
    this.drawChat();
    this.drawPlates();
    this.drawStatus();
    this.drawEdit();
    this._setEnterEnabled(this._input.trim().length > 0);
  }

  // ── DrawTextA @0x7F2A90: x=12, y=(state!=0?60:155)+i*16 ──
  private drawChat(): void {
    if (!this.isVisible || this._state === STATE_MIN2) return;
    for (const t of this._lineNodes) t.removeFromParent();
    this._lineNodes = [];
    const baseY = this._state !== STATE_MAX ? 60 : 155;
    const count = this._visibleLines();
    const start = Math.min(this._scrollPos(), this._maxScrollPos());
    for (let i = 0; i < count; i++) {
      const idx = start + i;
      if (idx >= this._lines.length) break;
      const t = new Text({ text: this._lines[idx].text, style: chatStyle(this._lines[idx].color) });
      t.position.set(CHAT_X, baseY + i * CHAT_LINE_H);
      this._root.addChild(t);
      this._lineNodes.push(t);
    }
  }

  // ── SetAvatar name plates: Name/%d at (58+92*s-47, 117+3), name centered ──
  private drawPlates(): void {
    if (!this.isVisible || this._state === STATE_MIN2) return;
    for (const n of this._plateNodes) n.removeFromParent();
    this._plateNodes = [];
    const loader = this._loader;
    const ui = this._ui;
    for (let s = 0; s < 3; s++) {
      const name = this._slots[s];
      if (!name) continue;
      const px = 58 + 92 * s - 47;
      const py = 120;
      let plateX = px;
      const plateProp = ui?.GetItem(`UIWindow2.img/Messenger/Name/${s}`);
      if (loader && plateProp instanceof WzProperty) {
        const canvas = plateProp.Get('0') instanceof WzCanvas ? (plateProp.Get('0') as WzCanvas) : null;
        const src = canvas ?? plateProp;
        const ws = loader.Load(src as never);
        if (ws) {
          const sp = ws.NewSprite();
          sp.position.set(px - ws.OriginX, py - ws.OriginY);
          this._root.addChild(sp);
          this._plateNodes.push(sp);
          plateX = px - ws.OriginX;
        }
      }
      const label = new Text({ text: name, style: _idFont });
      label.position.set(Math.round(plateX + 45 - name.length * 4), py + 2);
      this._root.addChild(label);
      this._plateNodes.push(label);
    }
  }

  // ── DrawStatusBar @0x7F4BA0: "A,B,C is typing." truncated to 252px ──
  markTyping(_name: string): void { /* typing relay not sent by server yet */ }

  private drawStatus(): void {
    if (this._statusNode) { this._statusNode.removeFromParent(); this._statusNode = null; }
    if (!this.isVisible || this._state === STATE_MIN2) return;
    const names = this._slots
      .filter((n, idx) => !!n && n !== '(you)' && idx !== this._selfIndex);
    if (names.length === 0) return;
    let status = names.join(',');
    if (status.length > STATUS_MAX_W / 6) status = status.slice(0, Math.floor(STATUS_MAX_W / 6));
    status += ' is typing.';
    const iconY = this._state === STATE_MAX ? 332 : 220;
    this._statusNode = new Text({ text: status, style: _statusStyle });
    this._statusNode.position.set(29, iconY);
    this._root.addChild(this._statusNode);
  }

  // ── CCtrlEdit id1005: (11,307)/(11,195) 212x13, white bg, black Arial ──
  private drawEdit(): void {
    if (!this.isVisible || this._state === STATE_MIN2) return;
    if (!this._editNode) {
      this._editNode = new Text({ text: '', style: _idFont });
      this._root.addChild(this._editNode);
    }
    const editY = this._state === STATE_MAX ? 307 : 195;
    this._editNode.position.set(11 + 2, editY - 1);
    this._editNode.text = this._input + (this._focused ? '|' : '');
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    for (const b of this._allButtons) {
      if (b.handleMouseButton(x - this._root.x, y - this._root.y, down)) return true;
    }
    if (this._scroll &&
        this._scroll.handleMouseButton(x - this._root.x, y - this._root.y, down)) return true;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    const inside = lx >= 0 && lx < STATE_SIZE[this._state].w && ly >= 0 && ly < STATE_SIZE[this._state].h;
    if (inside && down && this._state !== STATE_MIN2) {
      const editY = this._state === STATE_MAX ? 307 : 195;
      this._focused = lx >= 11 && lx < 11 + 212 && ly >= editY - 4 && ly < editY + 16;
      if (this._focused) this.drawEdit();
    }
    return inside;
  }

  onMouseWheel(x: number, y: number, delta: number): void {
    if (!this.isVisible || !this._scroll) return;
    this._scroll.handleMouseWheel(x - this._root.x, y - this._root.y, delta);
  }

  // ── OnKey @0x7F6400 ──
  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.tryDelete(); return true; }
    if (this._state === STATE_MIN2) return false;
    if (key === 'Enter') {
      if (this._focused) this.processChat();
      else this._focused = true;
      this.drawEdit();
      return true;
    }
    if (!this._focused) return false;
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      if (this._history.length > 0) {
        const cur = this._history.indexOf(this._input);
        let next = key === 'ArrowUp' ? (cur < 0 ? this._history.length - 1 : cur - 1)
                                     : (cur < 0 ? -1 : cur + 1);
        next = Math.max(0, Math.min(this._history.length - 1, next));
        this._input = this._history[next] ?? '';
      }
      this.drawEdit();
      return true;
    }
    if (key === 'Backspace') { this._input = this._input.slice(0, -1); this.drawEdit(); return true; }
    if (key.length === 1 && this._input.length < 256) {
      this._input += key;
      this.draw();
      return true;
    }
    return true;
  }
}
