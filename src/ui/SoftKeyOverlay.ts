import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { Overlay } from './Overlay.js';
import { WzSprite } from '../render/WzSprite.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzUol } from '../wz/WzUol.js';
import { BuiltInFont } from './BuiltInFont.js';
import { Button } from './Button.js';

export const MinLength = 6;
export const MaxLength = 16;

const BoardW = 140;
const BoardH = 280;
const TitleBarH = 44;
const BackInitialDelay = 0.35;
const BackRepeatInterval = 0.04;

const EntryPos = { x: 12, y: 47 };
const OkSlot = { x: 14, y: 235 };
const CancelSlot = { x: 72, y: 235 };

function cellPos(idx: number): { x: number; y: number } {
  return { x: 39 * (idx % 3) + 12, y: 35 * Math.floor(idx / 3) + 94 };
}
function tabPos(t: number, _selected: boolean): { x: number; y: number } {
  return { x: 12 + 40 * t, y: _selected ? 68 : 70 };
}

const T9 = ['abc', 'def', 'ghi', 'jkl', 'mno', 'pqr', 'stu', 'vwx', 'yz', ''];

export class SoftKeyOverlay extends Overlay {
  OnSubmit: ((pic: string) => void) | null = null;
  OnCancel: (() => void) | null = null;

  private _font: BuiltInFont | null;
  private _bg: WzSprite | null;
  private _bg2: WzSprite | null;
  private _bg3: WzSprite | null;
  private _tabNormal: (WzSprite | null)[] = [null, null, null];
  private _tabSelected: (WzSprite | null)[] = [null, null, null];
  private _numKeys: (Button | null)[] = new Array(10).fill(null);
  private _lowKeys: (Button | null)[] = new Array(10).fill(null);
  private _highKeys: (Button | null)[] = new Array(10).fill(null);
  private _btDel: Button | null;
  private _btNext: Button | null;
  private _btOk: Button | null;
  private _btCancel: Button | null;
  private _boardTL = { x: 0, y: 0 };
  private _homeTL = { x: 0, y: 0 };
  private _screenW = 800;
  private _screenH = 600;
  private _dragging = false;
  private _dragGrab = { x: 0, y: 0 };
  private _backDown = false;
  private _backTimer = 0;
  private _cellForKey = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  private _rng = () => Math.random();
  private _activeTab = 0;
  private _entered = '';
  private _switchKey = -1;
  private _switchIdx = 0;
  private _error = '';
  private _caption = '';

  private _bgSprites: Container;
  private _tabSprites: Sprite[] = [];
  private _textContainer: Container;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null, screenCenter: { x: number; y: number }) {
    super();
    this._font = font;
    this._homeTL = { x: screenCenter.x - BoardW / 2, y: screenCenter.y - BoardH / 2 };
    this._boardTL = { ...this._homeTL };
    this._screenW = screenCenter.x * 2;
    this._screenH = screenCenter.y * 2;

    this._bgSprites = new Container();
    this._textContainer = new Container();
    this.container.addChild(this._bgSprites);
    this.container.addChild(this._textContainer);

    const root = ui?.GetItem('Login.img/Common/SoftKey');
    const rootProp = root instanceof WzProperty ? root : null;
    this._bg = SoftKeyOverlay._loadCanvas(loader, rootProp, 'backgrnd');
    this._bg2 = SoftKeyOverlay._loadCanvas(loader, rootProp, 'backgrnd2');
    this._bg3 = SoftKeyOverlay._loadCanvas(loader, rootProp, 'backgrnd3');

    if (this._bg) this._bgSprites.addChild(this._bg.ToPixi());
    if (this._bg2) this._bgSprites.addChild(this._bg2.ToPixi());
    if (this._bg3) this._bgSprites.addChild(this._bg3.ToPixi());

    const tabNorm = rootProp?.Get('Tab') instanceof WzProperty ? (rootProp!.Get('Tab') as WzProperty).Get('normal') : null;
    const tabSel = rootProp?.Get('Tab') instanceof WzProperty ? (rootProp!.Get('Tab') as WzProperty).Get('selected') : null;
    const tabNormProp = tabNorm instanceof WzProperty ? tabNorm : null;
    const tabSelProp = tabSel instanceof WzProperty ? tabSel : null;
    for (let t = 0; t < 3; t++) {
      this._tabNormal[t] = SoftKeyOverlay._loadCanvas(loader, tabNormProp, t.toString());
      this._tabSelected[t] = SoftKeyOverlay._loadCanvas(loader, tabSelProp, t.toString());
      const s = new Sprite();
      this._tabSprites.push(s);
      this._bgSprites.addChild(s);
    }
    for (let k = 0; k < 10; k++) {
      const key = k;
      this._numKeys[k] = SoftKeyOverlay._makeKey(loader, rootProp, 'BtNum', k, () => this._typeDigit(key));
      this._lowKeys[k] = SoftKeyOverlay._makeKey(loader, rootProp, 'BtLowCase', k, () => this._typeLetter(key));
      this._highKeys[k] = SoftKeyOverlay._makeKey(loader, rootProp, 'BtHighCase', k, () => this._typeLetter(key));
      if (this._numKeys[k]) this.container.addChild(this._numKeys[k]!.container);
      if (this._lowKeys[k]) this.container.addChild(this._lowKeys[k]!.container);
      if (this._highKeys[k]) this.container.addChild(this._highKeys[k]!.container);
    }
    this._btDel = SoftKeyOverlay._makeButton(loader, rootProp, 'BtDel', () => this._deleteLast());
    this._btNext = SoftKeyOverlay._makeButton(loader, rootProp, 'BtNext', () => this._commitSwitch());
    this._btOk = SoftKeyOverlay._makeButton(loader, rootProp, 'BtOK', () => this._confirm());
    this._btCancel = SoftKeyOverlay._makeButton(loader, rootProp, 'BtCancel', () => this._cancel());
    if (this._btDel) this.container.addChild(this._btDel.container);
    if (this._btNext) this.container.addChild(this._btNext.container);
    if (this._btOk) this.container.addChild(this._btOk.container);
    if (this._btCancel) this.container.addChild(this._btCancel.container);

    this._setupBackspaceTracking();
  }

  private _setupBackspaceTracking(): void {
    document.addEventListener('keydown', (e) => {
      if (!this.isVisible || e.key !== 'Backspace') return;
      if (!this._backDown) {
        this._backDown = true;
        this._deleteLast();
        this._backTimer = BackInitialDelay;
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Backspace') this._backDown = false;
    });
  }

  Show(_title: string, onSubmit: (pic: string) => void, onCancel?: () => void): void {
    this._boardTL = { ...this._homeTL };
    this._dragging = false;
    this._backDown = false;
    this._entered = '';
    this._error = '';
    this._activeTab = 0;
    this._switchKey = -1;
    this.OnSubmit = onSubmit;
    this.OnCancel = onCancel ?? null;
    this._shuffle();
    this._reposition();
    this.isVisible = true;
  }

  private _activeKeys(): (Button | null)[] {
    return this._activeTab === 1 ? this._lowKeys : this._activeTab === 2 ? this._highKeys : this._numKeys;
  }

  private _shuffle(): void {
    const cells = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let key = 0; key < 10; key++) {
      const j = Math.floor(this._rng() * cells.length);
      this._cellForKey[key] = cells[j];
      cells.splice(j, 1);
    }
  }

  private _reposition(): void {
    const keys = this._activeKeys();
    for (let k = 0; k < 10; k++) {
      const num = this._numKeys[k];
      const low = this._lowKeys[k];
      const high = this._highKeys[k];
      if (num) num.container.visible = this._activeTab === 0;
      if (low) low.container.visible = this._activeTab === 1;
      if (high) high.container.visible = this._activeTab === 2;
      const b = keys[k];
      if (b !== null) {
        const cp = cellPos(this._cellForKey[k]);
        b.container.position.set(this._boardTL.x + cp.x, this._boardTL.y + cp.y);
      }
    }
    if (this._btDel !== null) this._btDel.container.position.set(this._boardTL.x, this._boardTL.y);
    if (this._btNext !== null) this._btNext.container.position.set(this._boardTL.x, this._boardTL.y);
    if (this._btOk !== null) this._btOk.container.position.set(this._boardTL.x + OkSlot.x, this._boardTL.y + OkSlot.y);
    if (this._btCancel !== null) this._btCancel.container.position.set(this._boardTL.x + CancelSlot.x, this._boardTL.y + CancelSlot.y);
  }

  private _typeDigit(d: number): void {
    this._switchKey = -1;
    this._error = '';
    if (this._entered.length < MaxLength) this._entered += String.fromCharCode(0x30 + d);
  }

  private _typeLetter(key: number): void {
    const group = T9[key];
    if (group.length === 0) return;
    this._error = '';
    const upper = this._activeTab === 2;
    if (this._switchKey === key && this._entered.length > 0) {
      this._switchIdx = (this._switchIdx + 1) % group.length;
      const ch = group[this._switchIdx];
      this._entered = this._entered.substring(0, this._entered.length - 1) + (upper ? ch.toUpperCase() : ch);
    } else {
      this._switchKey = -1;
      if (this._entered.length >= MaxLength) return;
      this._switchKey = key;
      this._switchIdx = 0;
      const ch = group[0];
      this._entered += upper ? ch.toUpperCase() : ch;
    }
  }

  private _commitSwitch(): void { this._switchKey = -1; }

  private _deleteLast(): void {
    this._switchKey = -1;
    this._error = '';
    if (this._entered.length > 0) this._entered = this._entered.substring(0, this._entered.length - 1);
  }

  private _confirm(): void {
    if (this._entered.length < MinLength) { this._error = `Min ${MinLength} characters.`; return; }
    this.isVisible = false;
    this.OnSubmit?.(this._entered);
  }

  private _cancel(): void {
    this.isVisible = false;
    this.OnCancel?.();
  }

  update(dt: number): void {
    if (!this.isVisible) return;

    // Position background sprites
    this._bgSprites.position.set(this._boardTL.x, this._boardTL.y);

    // Tab sprites
    for (let t = 0; t < 3; t++) {
      const spr = t === this._activeTab ? this._tabSelected[t] : this._tabNormal[t];
      if (spr) {
        this._tabSprites[t].texture = spr.ToPixi().texture;
        const tp = tabPos(t, t === this._activeTab);
        this._tabSprites[t].position.set(tp.x, tp.y);
        this._tabSprites[t].visible = true;
      } else {
        this._tabSprites[t].visible = false;
      }
    }

    // Backspace repeat
    if (this._backDown) {
      this._backTimer -= dt;
      if (this._backTimer <= 0) {
        this._deleteLast();
        this._backTimer = BackRepeatInterval;
      }
    }

    // Dragging
    if (this._dragging) {
      const mx = (window as any).__mouseX as number | undefined;
      const my = (window as any).__mouseY as number | undefined;
      if (mx !== undefined && my !== undefined) {
        this._boardTL.x = Math.max(0, Math.min(this._screenW - BoardW, mx - this._dragGrab.x));
        this._boardTL.y = Math.max(0, Math.min(this._screenH - BoardH, my - this._dragGrab.y));
        this._reposition();
      }
    }

    // Render text (masked entry + error)
    this._textContainer.removeChildren();
    if (this._font) {
      const masked = '*'.repeat(this._entered.length);
      const entryText = new Text({
        text: masked,
        style: new TextStyle({ fill: 0x555555, fontSize: 11, fontFamily: 'monospace' }),
      });
      entryText.position.set(this._boardTL.x + EntryPos.x + 4, this._boardTL.y + EntryPos.y + 1);
      this._textContainer.addChild(entryText);

      if (this._error) {
        const err = new Text({
          text: this._error,
          style: new TextStyle({ fill: 0xD23C3C, fontSize: 11, fontFamily: 'monospace' }),
        });
        err.position.set(
          this._boardTL.x + (BoardW - err.width) / 2,
          this._boardTL.y + 33,
        );
        this._textContainer.addChild(err);
      }

      if (this._caption) {
        const cap = new Text({
          text: this._caption,
          style: new TextStyle({ fill: 0xFFFFFF, fontSize: 11, fontFamily: 'monospace' }),
        });
        const padX = 8, padY = 4, gap = 6;
        const capW = cap.width + padX * 2;
        const capH = (this._font.lineHeight) + padY * 2;
        let capX = this._boardTL.x + BoardW / 2 - capW / 2;
        let capY = this._boardTL.y + BoardH + gap;
        if (capY + capH > this._screenH) capY = this._boardTL.y - gap - capH;
        const bg = new Graphics();
        bg.rect(capX, capY, capW, capH).fill({ color: 0x000000, alpha: 0.82 });
        bg.rect(capX, capY, capW, 1).fill({ color: 0x78643C });
        bg.rect(capX, capY + capH - 1, capW, 1).fill({ color: 0x78643C });
        bg.rect(capX, capY, 1, capH).fill({ color: 0x78643C });
        bg.rect(capX + capW - 1, capY, 1, capH).fill({ color: 0x78643C });
        this._textContainer.addChild(bg);
        cap.position.set(capX + padX, capY + padY);
        this._textContainer.addChild(cap);
      }
    }

    // Dim overlay
    this.container.alpha = 1;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down && this._dragging) { this._dragging = false; return true; }
    if (down) {
      if (x >= this._boardTL.x && x < this._boardTL.x + BoardW && y >= this._boardTL.y && y < this._boardTL.y + TitleBarH) {
        this._dragging = true;
        this._dragGrab = { x: x - this._boardTL.x, y: y - this._boardTL.y };
        return true;
      }
      for (let t = 0; t < 3; t++) {
        const tp = tabPos(t, true);
        if (x >= this._boardTL.x + tp.x && x < this._boardTL.x + tp.x + 39
          && y >= this._boardTL.y + tp.y && y < this._boardTL.y + tp.y + 19) {
          if (this._activeTab !== t) { this._activeTab = t; this._switchKey = -1; this._reposition(); }
          return true;
        }
      }
    }
    for (const b of this._activeKeys()) { if (b?.handleMouseButton(x, y, down) === true) return true; }
    if (this._btDel?.handleMouseButton(x, y, down) === true) return true;
    if (this._btNext?.handleMouseButton(x, y, down) === true) return true;
    if (this._btOk?.handleMouseButton(x, y, down) === true) return true;
    if (this._btCancel?.handleMouseButton(x, y, down) === true) return true;
    return true;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Enter') { this._confirm(); return true; }
    if (key === 'Escape') { this._cancel(); return true; }
    return true;
  }

  OnTextInput(character: string): void {
    if (!this.isVisible) return;
    if ((character >= '0' && character <= '9') || (character >= 'a' && character <= 'z') || (character >= 'A' && character <= 'Z')) {
      this._switchKey = -1;
      this._error = '';
      if (this._entered.length < MaxLength) this._entered += character;
    }
  }

  private static _loadCanvas(loader: WzTextureLoader, parent: WzProperty | null, name: string): WzSprite | null {
    let node = parent?.Get(name);
    if (node instanceof WzUol) node = node.Resolve();
    return node instanceof WzCanvas ? loader.Load(node) : null;
  }

  private static _makeKey(loader: WzTextureLoader, root: WzProperty | null, set: string, k: number, onClick: () => void): Button | null {
    const pr = root?.Get(set);
    const prProp = pr instanceof WzProperty ? pr.Get(k.toString()) : null;
    if (!(prProp instanceof WzProperty)) return null;
    const b = Button.fromWz(loader, prProp, `Key ${k}`);
    b.onClick = onClick;
    return b;
  }

  private static _makeButton(loader: WzTextureLoader, root: WzProperty | null, name: string, onClick: () => void): Button | null {
    const pr = root?.Get(name);
    if (!(pr instanceof WzProperty)) return null;
    const b = Button.fromWz(loader, pr, name);
    b.onClick = onClick;
    return b;
  }
}
