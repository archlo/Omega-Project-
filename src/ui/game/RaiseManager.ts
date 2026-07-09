import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

// OG: CUIRaiseManager (0x838880–0x83C5AC).
// Manages multiple CUIRaiseWndBase sub-windows (one per raise item).
// Internal map m_mWnds: ZMap<itemId, ZRef<CUIRaiseWndBase>> with tableSize=31, autoGrow=100.
// Also maintains m_mPosBackup: ZMap<itemId, POINT> for window position persistence.
//
// OpenWindow(itemId): look up in m_mWnds → bring to front, or _CreateWindow(itemId).
// Special case: item 4220176 → CCakePieEvent::OpenUI_ItemInfo (not managed here).

const PANEL_W = 300;
const PANEL_H = 200;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _textStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 10, fontFamily: 'monospace' });
const _btnStyle = new TextStyle({ fill: '#D8D8D8', fontSize: 10, fontFamily: 'monospace' });

interface RaiseWndInfo {
  itemId: number;
  title: string;
  body: string;
}

export class RaiseManager extends GamePanel {
  private _bg: Graphics;
  private _titleText: Text;
  private _bodyText: Text;
  private _closeBtn: Graphics;
  private _closeLabel: Text;

  // OG: m_mWnds — map of itemId → RaiseWndBase
  private _windows = new Map<number, RaiseWndInfo>();
  private _currentItemId = 0;

  constructor() {
    super();
    this._root.position.set(200, 150);

    this._bg = new Graphics();
    this._titleText = new Text({ text: 'Raise Manager', style: _titleStyle });
    this._titleText.position.set(10, 8);
    this._bodyText = new Text({ text: '', style: _textStyle });
    this._bodyText.position.set(12, 32);
    this._closeLabel = new Text({ text: 'Close', style: _btnStyle });
    this._closeBtn = new Graphics();
    this._closeLabel.position.set(PANEL_W - 60, PANEL_H - 26);

    this._root.addChild(this._bg, this._titleText, this._bodyText, this._closeBtn, this._closeLabel);
    this._drawChrome();
    this.isVisible = false;
  }

  /** OG: CUIRaiseManager::OpenWindow — opens or focuses a raise window. */
  OpenWindow(nItemID: number): void {
    if (this._windows.has(nItemID)) {
      // Bring to front — just show with existing data
      this._currentItemId = nItemID;
      this._refresh();
      this.isVisible = true;
      return;
    }

    // OG: _CreateWindow creates a new CUIRaiseWndBase subclass
    const wnd = this._createWindow(nItemID);
    if (wnd) {
      this._windows.set(nItemID, wnd);
      this._currentItemId = nItemID;
      this._refresh();
      this.isVisible = true;
    }
  }

  /** OG: CUIRaiseManager::_CreateWindow — creates the appropriate window for the item. */
  private _createWindow(nItemID: number): RaiseWndInfo | null {
    // OG: Creates CUIRaiseWndBase subclass per item type.
    // For now, generic panel with item info.
    const name = this._getRaiseName(nItemID);
    return {
      itemId: nItemID,
      title: name,
      body: `Raise item ${nItemID}\n\nUse this item to start a raise/pet evolution process.\n\nThis is a client-side dialog — no server packet sent.`,
    };
  }

  /** OG: OpenRaise dispatches to CCakePieEvent for item 4220176. */
  static IsCakePieEvent(nItemID: number): boolean {
    return nItemID === 4220176;
  }

  private _getRaiseName(nItemID: number): string {
    // OG: resolved from WZ Item data — fallback to item ID
    const names: Record<number, string> = {
      4220000: 'Pigmy',
      4220001: 'Pigmy',
      4220002: 'Pigmy',
      4220010: 'Pigmy Egg',
      4220100: 'Pigmy',
      4220101: 'Pigmy',
      4220102: 'Pigmy',
      4220200: 'Pigmy',
      4220201: 'Pigmy',
      4220202: 'Pigmy',
      4221000: 'Pet Evolution',
      4221001: 'Pet Evolution',
      4221002: 'Pet Evolution',
    };
    return names[nItemID] ?? `Raise #${nItemID}`;
  }

  private _refresh(): void {
    const wnd = this._windows.get(this._currentItemId);
    if (wnd) {
      this._titleText.text = wnd.title;
      this._bodyText.text = wnd.body;
    } else {
      this._titleText.text = 'Raise Manager';
      this._bodyText.text = 'No window open.';
    }
  }

  private _close(): void {
    this.isVisible = false;
  }

  private _drawChrome(): void {
    this._bg.clear();
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: 0x1A1A2E, alpha: 0.95 });
    this._bg.rect(0, 0, PANEL_W, 1).fill({ color: 0x5A6478 });
    this._bg.rect(0, PANEL_H - 1, PANEL_W, 1).fill({ color: 0x5A6478 });
    this._bg.rect(0, 0, 1, PANEL_H).fill({ color: 0x5A6478 });
    this._bg.rect(PANEL_W - 1, 0, 1, PANEL_H).fill({ color: 0x5A6478 });
    this._closeBtn.clear().rect(PANEL_W - 66, PANEL_H - 28, 60, 22).fill({ color: 0x2A2A3E, alpha: 0.9 }).stroke({ color: 0x5A6478, width: 1 });
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    const lx = x - this._root.position.x;
    const ly = y - this._root.position.y;
    if (lx >= PANEL_W - 72 && lx < PANEL_W - 6 && ly >= PANEL_H - 32 && ly < PANEL_H - 6) {
      this._close();
      return true;
    }
    return lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this._close(); return true; }
    return false;
  }
}
