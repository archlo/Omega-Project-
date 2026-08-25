import { Container, Sprite, Text, Texture } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { Button } from '../Button.js';

// CUIMessenger::SetLayer @0x7F1920 - m_nState 0 = Max: m_width 295, m_height 355,
// background UI/UIWindow2.img/Messenger/Max/backgrnd(+2,+3).
const PANEL_W = 295;
const PANEL_H = 355;

// CUIMessenger::DrawTextA @0x7F2A90 - chat lines at x=12, y = 155 + i*16
// (state Max), up to m_nTextLineCount = 9 visible lines (SetCtrl @0x7F34C0),
// each drawn with get_basic_font(ftColor).
const CHAT_X = 12;
const CHAT_Y = 155;
const CHAT_LINE_H = 16;
const MAX_LINES = 9;

export class Messenger extends GamePanel {
  onClosed: (() => void) | null = null;
  /** BtEnter / Enter key - submit the current chat input line. */
  onSubmit: ((text: string) => void) | null = null;
  /** BtClame (id 1004) - CUIMessenger::SendClaim. */
  onClaim: (() => void) | null = null;

  private _slots: (string | null)[] = [null, null, null];
  private _selfIndex = -1;
  private _chatLog: string[] = [];
  private _input = '';
  private _focused = false;
  private _chatTexts: Container[] = [];
  private _nameTexts: Container[] = [];
  private _inputText: Container | null = null;
  private _btEnter: Button | null = null;
  private _allButtons: Button[] = [];

  constructor(loader?: WzTextureLoader, ui?: WzPackage | null) {
    super();
    this.isVisible = false;
    // Default placement matches other utility windows (OG persists per-user).
    this._root.position.set(300, 120);

    const messengerRoot = ui?.GetItem('UIWindow2.img/Messenger/Max');
    const prop = messengerRoot instanceof WzProperty ? messengerRoot : null;

    // SetLayer: backgrnd, backgrnd2, backgrnd3 layered canvases.
    if (prop && loader) {
      for (const layer of ['backgrnd', 'backgrnd2', 'backgrnd3']) {
        const canvas = prop.Get(layer);
        if (!canvas || typeof canvas !== 'object') continue;
        const ws = loader.Load(canvas as never);
        if (ws) {
          const s = ws.ToPixi();
          s.position.set(-ws.OriginX, -ws.OriginY);
          this._root.addChild(s);
        }
      }
    }

    // SetCtrl @0x7F34C0: AddButton paths under Messenger/Max/*.
    // ids: BtMin 1001(0x3E9), BtMax 1002(0x3EA), BtEnter 1003(0x3EB),
    // BtClame 1004(0x3EC). BtMax disabled while maximized; BtEnter starts
    // disabled until text is entered.
    if (loader && prop) {
      const btMin = this._makeButton(loader, prop, 'BtMin', () => { /* minimize: Min state */ });
      const btMax = this._makeButton(loader, prop, 'BtMax', () => { /* already maximized */ });
      const btClaim = this._makeButton(loader, prop, 'BtClame', () => this.onClaim?.());
      const btEnter = this._makeButton(loader, prop, 'BtEnter', () => this._submit());
      if (btMin) { btMin.container.position.set(8, 8); this._root.addChild(btMin.container); }
      if (btClaim) { btClaim.container.position.set(PANEL_W - 100, PANEL_H - 48); this._root.addChild(btClaim.container); }
      if (btEnter) {
        this._btEnter = btEnter;
        btEnter.container.position.set(PANEL_W - 60, PANEL_H - 48);
        this._root.addChild(btEnter.container);
        this._setBtnEnabled(btEnter, false);
      }
      if (btMax) this._setBtnEnabled(btMax, false);
    }

    // BtClose id 1000 at (276, 6) - CreateCtrl_2(..., 1000u, 276, 6, 2, ...).
    this.createCloseButton(loader ?? null, ui ?? null, 1, PANEL_W, { x: 276, y: 6 });
  }

  Open(): void {
    this.isVisible = true;
  }

  SetSelf(index: number): void {
    this._selfIndex = index;
    if (index >= 0 && index < 3) this._slots[index] = '(you)';
    this.isVisible = true;
  }

  SetParticipant(index: number, name: string): void {
    if (index >= 0 && index < 3) this._slots[index] = name;
  }

  RemoveParticipant(index: number): void {
    if (index >= 0 && index < 3) this._slots[index] = null;
  }

  AddChat(text: string): void {
    this._chatLog.push(text);
    // OG keeps the last lines visible via scrollbar; cap the log.
    if (this._chatLog.length > 50) this._chatLog.shift();
  }

  Reset(): void {
    for (let i = 0; i < this._slots.length; i++) this._slots[i] = null;
    this._selfIndex = -1;
    this._chatLog = [];
    this._input = '';
  }

  private _close(): void {
    this.isVisible = false;
    this.Reset();
    this.onClosed?.();
  }

  private _submit(): void {
    const text = this._input.trim();
    if (!text) return;
    this.onSubmit?.(text);
    this._input = '';
    if (this._btEnter) this._setBtnEnabled(this._btEnter, false);
  }

  update(_dt: number): void {
    if (!this.isVisible) return;
    this.draw();
  }

  draw(): void {
    if (!this.isVisible) return;

    // Chat log - DrawTextA @0x7F2A90: x=12, y=155+i*16, 9 lines.
    for (const t of this._chatTexts) { t.removeFromParent(); t.destroy({ children: true }); }
    this._chatTexts = [];
    const start = Math.max(0, this._chatLog.length - MAX_LINES);
    for (let i = start; i < this._chatLog.length; i++) {
      const c = new Container();
      c.position.set(CHAT_X, CHAT_Y + (i - start) * CHAT_LINE_H);
      const t = new Text({
        text: this._chatLog[i],
        style: { fill: '#000000', fontSize: 12, fontFamily: 'Arial' },
      });
      c.addChild(t);
      this._root.addChild(c);
      this._chatTexts.push(c);
    }

    // Member name plates - Name/0..2 canvases hold one plate per slot; the
    // name itself draws over the plate in FONT_BASIC_BLACK.
    for (const t of this._nameTexts) { t.removeFromParent(); t.destroy({ children: true }); }
    this._nameTexts = [];
    for (let i = 0; i < 3; i++) {
      const c = new Container();
      c.position.set(14, 24 + i * 40);
      const name = this._slots[i];
      const label = new Text({
        text: name ?? '',
        style: { fill: '#000000', fontSize: 11, fontFamily: 'Arial' },
      });
      c.addChild(label);
      this._root.addChild(c);
      this._nameTexts.push(c);
    }

    // Chat input line - CCtrlEdit id1005 at (11,307) 212x13, black text.
    if (!this._inputText) {
      this._inputText = new Container();
      this._inputText.position.set(13, 308);
      this._root.addChild(this._inputText);
    }
    this._inputText.removeChildren().forEach((c) => c.destroy());
    const caret = this._focused ? '|' : '';
    const input = new Text({
      text: this._input + caret,
      style: { fill: '#000000', fontSize: 11, fontFamily: 'Arial' },
    });
    this._inputText.addChild(input);

    if (this._btEnter) this._setBtnEnabled(this._btEnter, this._input.trim().length > 0);
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    for (const b of this._allButtons) {
      if (b.handleMouseButton(x, y, down)) return true;
    }
    const px = this._root.x;
    const py = this._root.y;
    const inside = x >= px && x < px + PANEL_W && y >= py && y < py + PANEL_H;
    if (inside && down) {
      // Focus the chat edit when clicking its rect ((11,307) 212x13).
      const lx = x - px;
      const ly = y - py;
      this._focused = lx >= 11 && lx < 11 + 212 && ly >= 307 && ly < 307 + 13;
      return true;
    }
    return inside;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (!this._focused) {
      if (key === 'Escape') { this._close(); return true; }
      return false;
    }
    if (key === 'Enter') { this._submit(); return true; }
    if (key === 'Escape') { this._focused = false; return true; }
    if (key === 'Backspace') { this._input = this._input.slice(0, -1); return true; }
    if (key.length === 1 && this._input.length < 256) { this._input += key; return true; }
    return true;
  }

  private _makeButton(loader: WzTextureLoader, root: WzProperty, name: string, onClick: () => void): Button | null {
    const pr = root.Get(name);
    if (!(pr instanceof WzProperty)) return null;
    const b = Button.fromWz(loader, pr, name);
    b.onClick = onClick;
    this._allButtons.push(b);
    return b;
  }

  private _setBtnEnabled(btn: Button, enabled: boolean): void {
    btn.container.alpha = enabled ? 1 : 0.35;
    (btn as unknown as { container: { interactive?: boolean } }).container.interactive = enabled;
  }
}

void Sprite;
void Texture;
