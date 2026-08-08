import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { Button } from '../Button.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';
import { FuncKeyMapped, FuncKeyType } from '../../domain/FuncKeyMapped.js';

// OG class: CQuickslotKeyModifyDlg (decompile/qscfg_decomp/00..10.c) — modal
// quickslot-key remap dialog opened from CUIKeyConfig::OnQuickslotKeyConf.
// WZ: UIWindow2.img/KeyConfig/quickslotConfig/{backgrnd,BtQuickSetting,BtOK,
// BtCancel,key/<sc>}. The 8 slot buttons get nId 1000..1007 at GetSlotPos;
// OK = nId 1 @ (127,180), Cancel = nId 2 @ (171,180).
//
// Keyboard state lives in the m_anQuickslotInfo[7] sentinel:
//   -1 idle (Esc closes), 0 slot-capture (digits/scancodes remap the focused
//  slot, arrows move the slot focus), 1 OK/Cancel mode (Left/Right toggles OK/
//  Cancel, Enter confirms). OG self-KeepFocus semantics come from the decompile.

export function GetSlotPos(nIdx: number): { x: number; y: number } {
  return { x: 33 * (nIdx % 4) + 50, y: nIdx >= 4 ? 130 : 97 };
}

const PanelW = 230;
const PanelH = 210;
const OkX = 127;
const OkY = 180;
const CancelX = 171;
const CancelY = 180;
const XCase = 32;

const ENUM_KEY_IDLE = -1;
const ENUM_KEY_CAPTURE = 0;
const ENUM_KEY_OKCANCEL = 1;

function slotRect(i: number): { x: number; y: number; w: number; h: number } {
  const p = GetSlotPos(i);
  return { x: p.x, y: p.y, w: XCase, h: XCase };
}

export class QuickSlotConfig extends GamePanel {
  /** Open the KeyConfig window instead (OG: dialog only lives under KeyConfig). */
  OnOpenKeyConfig: (() => void) | null = null;

  /** Snapshot of the 8 quickslot keys from the manager. */
  keysOf: (() => number[] | null) | null = null;
  /** User clicked OK -> pass the 8 new keys up. */
  onConfirm: ((keys: number[]) => void) | null = null;
  /** Plain-text notice (OG CUtilDlg::Notice — StringPool 0x1555 / 0x1556). */
  notify: ((message: string) => void) | null = null;
  /** FuncKey bound at a scancode (for the icon under each keycap). */
  bindingAt: ((scancode: number) => FuncKeyMapped) | null = null;
  /** Icon resolvers mirroring GameStage's skill/item icon plumbing. */
  skillIcon: ((skillId: number) => WzSprite | null) | null = null;
  itemIcon: ((itemId: number) => WzSprite | null) | null = null;

  private readonly _loader: WzTextureLoader;
  private readonly _font: BuiltInFont | null;
  private readonly _qc: WzProperty | null;
  private readonly _keycapRoot: WzProperty | null;

  private readonly _bg: Sprite | null;
  private readonly _slotHit: { x: number; y: number; w: number; h: number; index: number }[] = [];
  private readonly _btOk: Button | null;
  private readonly _btCancel: Button | null;

  private readonly _gfx: Graphics;
  private readonly _iconLayer: Container;

  private _keys: number[] = [0x2A, 0x52, 0x47, 0x49, 0x1D, 0x53, 0x4F, 0x51];
  private _mode: number = ENUM_KEY_IDLE;
  private _slotFocus = 0;
  private _okCancelFocus = 0;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._loader = loader;
    this._font = font;
    this.isVisible = false;
    this._root.position.set(Math.round((800 - PanelW) / 2), Math.round((600 - PanelH) / 2));

    this._qc = (ui?.GetItem('UIWindow2.img/KeyConfig/quickslotConfig') as WzProperty) ?? null;
    const key = this._qc?.Get('key');
    this._keycapRoot = key instanceof WzProperty ? key : this._qc;

    const bgNode = this._qc?.Get('backgrnd');
    this._bg = bgNode instanceof WzCanvas ? loader.Load(bgNode)?.ToPixi() ?? null : null;
    if (this._bg) this._root.addChild(this._bg);

    this._gfx = new Graphics();
    this._root.addChild(this._gfx);
    this._iconLayer = new Container();
    this._root.addChild(this._iconLayer);

    // Invisible slot hit rects (OG: CCtrlButtonDisableSpaceKey, nId 1000..1007).
    for (let i = 0; i < 8; i++) {
      const c = slotRect(i);
      this._slotHit.push({ x: c.x, y: c.y, w: c.w, h: c.h, index: i });
    }

    this._btOk = this._makeBtn('BtOK');
    this._btCancel = this._makeBtn('BtCancel');
    if (this._btOk) {
      this._btOk.container.position.set(OkX, OkY);
      this._btOk.onClick = () => this._confirm();
    }
    if (this._btCancel) {
      this._btCancel.container.position.set(CancelX, CancelY);
      this._btCancel.onClick = () => this._cancel();
    }
  }

  private _makeBtn(name: string): Button | null {
    const pr = this._qc?.Get(name);
    if (!(pr instanceof WzProperty)) return null;
    const b = Button.fromWz(this._loader, pr);
    return b;
  }

  // ---- Public API -----------------------------------------------------

  /** Snapshot the current keys from the manager and open (state -> idle). */
  Open(): void {
    this._resetFresh();
    this.isVisible = true;
  }

  // Every open path (game-menu toggle, KeyConfig BtQuickSetting, StatusBar
  // QuickSlot toggle) assigns isVisible directly — re-snapshot whenever the
  // dialog becomes visible so shown keys stay in sync with the manager.
  get isVisible(): boolean { return super.isVisible; }
  set isVisible(v: boolean) {
    if (v) this._resetFresh();
    super.isVisible = v;
  }

  private _resetFresh(): void {
    const snap = this.keysOf?.();
    if (snap) for (let i = 0; i < 8 && i < snap.length; i++) this._keys[i] = snap[i];
    this._mode = ENUM_KEY_IDLE;
    this._slotFocus = 0;
    this._okCancelFocus = 0;
  }

  /** Snapshot of the currently-shown keys (what the dialog is editing). */
  GetKeys(): number[] {
    return this._keys.slice();
  }

  /** Replace all 8 keys (used when re-opening over a changed manager). */
  SetKeys(keys: number[]): void {
    for (let i = 0; i < 8 && i < keys.length; i++) this._keys[i] = keys[i];
  }

  update(_dt: number): void {
    if (this.isVisible) this.draw();
  }

  // ---- Event handlers -------------------------------------------------

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    const inside = lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;

    if (this._btOk && this._btOk.handleMouseButton(lx, ly, down)) return true;
    if (this._btCancel && this._btCancel.handleMouseButton(lx, ly, down)) return true;

    if (!down) return inside;

    for (const hit of this._slotHit) {
      if (lx >= hit.x && lx < hit.x + hit.w && ly >= hit.y && ly < hit.y + hit.h) {
        this._focusSlot(hit.index);
        return true;
      }
    }

    // OG OnMouseButton @0x6c6330: mouse down inside the window but outside the
    // slot pad (65,113)-(202,180) clears capture -> info[7] = -1.
    const inPad = lx >= 65 && lx <= 202 && ly >= 113 && ly <= 180;
    if (!inPad) {
      this._mode = ENUM_KEY_IDLE;
      this.draw();
    }
    return inside;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    switch (key) {
      case 'Tab':
        this._setCtrlFocus();
        return true;
      case 'Enter':
        this._confirm();
        return true;
      case 'Escape':
        this._onEscape();
        return true;
      case 'ArrowLeft':
        this._arrow(37);
        return true;
      case 'ArrowUp':
        this._upDown(-4);
        return true;
      case 'ArrowRight':
        this._arrow(39);
        return true;
      case 'ArrowDown':
        this._upDown(4);
        return true;
      default:
        if (this._mode === ENUM_KEY_CAPTURE) this._modifyKey(key);
        return true;
    }
  }

  // ---- Focus state machine (OG OnKey @0x6c7f00) --------------------------------

  private _onEscape(): void {
    if (this._mode === ENUM_KEY_IDLE) {
      this._cancel();
    } else {
      // Esc during capture/OK mode: ClearAllFocus -> info[7] = -1, slot=0.
      this._mode = ENUM_KEY_IDLE;
      this._slotFocus = 0;
      this._okCancelFocus = 0;
      this.draw();
    }
  }

  private _arrow(vk: number): void {
    if (this._mode === ENUM_KEY_CAPTURE) {
      const s = this._slotFocus;
      if (vk === 37 && s !== 0 && s !== 4) this._setSlotFocus(s - 1);
      else if (vk === 39 && s !== 3 && s !== 7) this._setSlotFocus(s + 1);
    } else if (this._mode === ENUM_KEY_OKCANCEL) {
      // Left -> OK, Right -> Cancel (SetOkCancleFocus semantics).
      this._setOkCancelFocus(vk === 37 ? 0 : 1);
    }
  }

  private _upDown(delta: number): void {
    if (this._mode !== ENUM_KEY_CAPTURE) return;
    const s = this._slotFocus;
    if ((delta === -4 && s > 3) || (delta === 4 && s < 4)) this._setSlotFocus(s + delta);
  }

  // OG SetCtrlFocus: Ctrl-Focus toggles slot-0 capture <-> OK/Cancel nav.
  private _setCtrlFocus(): void {
    if (this._mode === ENUM_KEY_IDLE || this._mode === ENUM_KEY_OKCANCEL) {
      this._mode = ENUM_KEY_CAPTURE;
      this._slotFocus = 0;
    } else {
      this._mode = ENUM_KEY_OKCANCEL;
      this._okCancelFocus = 0;
    }
    this.draw();
  }

  private _setSlotFocus(i: number): void {
    if (i < 0 || i > 7) return;
    this._slotFocus = i;
    this.draw();
  }

  private _setOkCancelFocus(v: number): void {
    this._okCancelFocus = v;
    this.draw();
  }

  private _focusSlot(i: number): void {
    this._mode = ENUM_KEY_CAPTURE;
    this._slotFocus = i;
    // CCtrlButton::SetKeyFocus on the slot button.
    this.draw();
  }

  // ---- ModifyQuickslotKeyMap @0x6c7be0 --------------------------------

  private _modifyKey(key: string): void {
    const sc = this._keyToScanCode(key);
    if (sc < 0) return;
    if (!this._isAvail(sc)) {
      this.notify?.('Invalid key.');
      return;
    }
    if (this._isUsedKey(sc)) {
      this.notify?.('That key is already in use.');
      return;
    }
    this._keys[this._slotFocus] = sc;
    this.draw();
  }

  private _isAvail(sc: number): boolean {
    if (!this._keycapRoot) return true;
    const node = this._keycapRoot.Get(String(sc));
    return node != null;
  }

  private _isUsedKey(sc: number): boolean {
    for (let i = 0; i < 8; i++) if (i !== this._slotFocus && this._keys[i] === sc) return true;
    return false;
  }

  // ---- Save / cancel ------------------------------------------------------

  private _confirm(): void {
    // OG OnButtonClicked nId==1 -> SetRet(1); caller copies into manager.
    this.onConfirm?.(this._keys.slice());
    this.isVisible = false;
  }

  private _cancel(): void {
    // OG OnButtonClicked nId==2 -> SetRet(2); caller discards.
    this.isVisible = false;
  }

  // ---- Draw --------------------------------------------------------------

  draw(): void {
    if (!this.isVisible) return;
    this._gfx.clear();
    this._iconLayer.removeChildren();

    if (!this._bg) {
      this._gfx.rect(0, 0, PanelW, PanelH).fill({ color: 0x0c0e16, alpha: 0.95 });
      this._gfx.rect(0, 0, PanelW, 24).fill({ color: 0x0f1224 });
      const t = new Text({ text: 'QuickSlot Config', style: new TextStyle({ fill: 0xdcc896, fontSize: 11, fontFamily: 'monospace' }) });
      t.position.set(8, 5);
      this._iconLayer.addChild(t);
    }

    for (let i = 0; i < 8; i++) {
      const r = slotRect(i);
      // Keycap label at (x+2, y+2).
      const label = this._keycap(this._keys[i]);
      if (label) {
        const sp = label.ToPixi();
        sp.position.set(r.x + 2, r.y + 2);
        this._iconLayer.addChild(sp);
      } else {
        const ft = new Text({ text: String(this._keys[i]), style: new TextStyle({ fill: 0x9090a0, fontSize: 9, fontFamily: 'monospace' }) });
        ft.position.set(r.x + 2, r.y + 2);
        this._iconLayer.addChild(ft);
      }

      // Bound func-key icon bottom-centered in the cell (OG DrawItemIconForSlot).
      const fk = this.bindingAt?.(this._keys[i]);
      if (fk && fk.type !== FuncKeyType.None) {
        const icon = this._boundIcon(fk);
        if (icon) {
          const sp = icon.ToPixi();
          sp.anchor.set(0.5, 0.5);
          sp.position.set(r.x + r.w / 2, r.y + r.h - icon.Height / 2);
          this._iconLayer.addChild(sp);
        }
      }
    }

    // Highlight the focused control (SetKeyFocus indicator).
    if (this._mode === ENUM_KEY_CAPTURE) {
      const r = slotRect(this._slotFocus);
      this._gfx.rect(r.x - 1, r.y - 1, r.w + 2, r.h + 2).stroke({ color: 0xffd700, width: 2 });
    } else if (this._mode === ENUM_KEY_OKCANCEL) {
      const r = this._okCancelFocus === 0
        ? { x: OkX, y: OkY, w: 40, h: 24 }
        : { x: CancelX, y: CancelY, w: 40, h: 24 };
      this._gfx.rect(r.x - 1, r.y - 1, r.w + 2, r.h + 2).stroke({ color: 0xffd700, width: 2 });
    }
  }

  private _keycap(sc: number): WzSprite | null {
    const node = this._keycapRoot?.Get(String(sc));
    return node instanceof WzCanvas ? this._loader.Load(node) : null;
  }

  private _boundIcon(fk: FuncKeyMapped): WzSprite | null {
    switch (fk.type) {
      case FuncKeyType.Skill:
        return this.skillIcon?.(fk.id) ?? null;
      case FuncKeyType.Item:
        return this.itemIcon?.(fk.id) ?? null;
      default:
        return null;
    }
  }

  // browser e.key -> DirectInput scancode (same table as KeyConfig).
  private _keyToScanCode(key: string): number {
    const k = key.length === 1 ? key.toLowerCase() : key;
    const map: Record<string, number> = {
      '1': 2, '2': 3, '3': 4, '4': 5, '5': 6,
      '6': 7, '7': 8, '8': 9, '9': 10, '0': 11,
      '-': 12, '=': 13, 'Backspace': 14, 'Tab': 15,
      'q': 16, 'w': 17, 'e': 18, 'r': 19, 't': 20,
      'y': 21, 'u': 22, 'i': 23, 'o': 24, 'p': 25,
      '[': 26, ']': 27, 'Enter': 28,
      'a': 30, 's': 31, 'd': 32, 'f': 33, 'g': 34,
      'h': 35, 'j': 36, 'k': 37, 'l': 38,
      ';': 39, "'": 40, '`': 41,
      'Shift': 42, '\\': 43,
      'z': 44, 'x': 45, 'c': 46, 'v': 47, 'b': 48,
      'n': 49, 'm': 50, ',': 51, '.': 52, '/': 53,
      'F1': 59, 'F2': 60, 'F3': 61, 'F4': 62, 'F5': 63,
      'F6': 64, 'F7': 65, 'F8': 66, 'F9': 67, 'F10': 68,
      'Home': 71, 'PageUp': 73, 'End': 79, 'PageDown': 81,
      'Insert': 82, 'Delete': 83, 'F11': 87, 'F12': 88,
      'Control': 29, 'Alt': 56, ' ': 57, 'CapsLock': 58,
    };
    return map[k] ?? -1;
  }
}