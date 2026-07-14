import { Container, Graphics } from 'pixi.js';

export interface WndRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function rectEmpty(r: WndRect): boolean {
  return r.left >= r.right || r.top >= r.bottom;
}

let s_dwKeyCounter = 0;

export enum UIOrigin {
  Center,
  TopLeft,
  TopCenter,
  TopRight,
  CenterLeft,
  CenterRight,
  BottomLeft,
  BottomCenter,
  BottomRight,
}

export class CWnd {
  readonly Key = ++s_dwKeyCounter;
  readonly container = new Container();
  readonly children: CWnd[] = [];
  width = 0;
  height = 0;
  z = 0;
  origin: UIOrigin = UIOrigin.Center;
  invalidatedRect: WndRect = { left: 0, top: 0, right: 0, bottom: 0 };
  parent: CWnd | null = null;
  visible = true;
  enabled = true;
  focused = false;
  m_pFocusWnd: CWnd | null = null;

  private _layerGfx: Graphics | null = null;

  CreateWnd(l: number, t: number, w: number, h: number, z: number, _screenCoord: boolean, _data: unknown, _setFocus: boolean, origin: UIOrigin): void {
    this.width = w;
    this.height = h;
    this.z = z;
    this.origin = origin;

    this._ensureLayer();
    this.container.position.set(l, t);

    this.OnCreate(_data);
    this.InvalidateRect(null);
    WndMan.InsertWindow(this);
  }

  OnCreate(_data: unknown): void {}
  OnDestroy(): void {}
  OnKey(_key: number, _flags: number): void {}
  OnMouseButton(_btn: number, _flags: number, _x: number, _y: number): void {}
  OnMouseMove(_x: number, _y: number): boolean { return false; }
  OnMouseEnter(_active: boolean): void {}
  OnMouseWheel(_x: number, _y: number, _delta: number): boolean { return false; }
  OnSetFocus(): void {}
  OnKillFocus(): void {}

  GetAbsLeft(): number {
    let x = this.container.position.x;
    let p = this.parent;
    while (p) {
      x += p.container.position.x;
      p = p.parent;
    }
    return x;
  }

  GetAbsTop(): number {
    let y = this.container.position.y;
    let p = this.parent;
    while (p) {
      y += p.container.position.y;
      p = p.parent;
    }
    return y;
  }

  Draw(pRect: WndRect | null): void {
    if (!this._layerGfx) return;
    const rect = pRect ?? { left: 0, top: 0, right: this.width, bottom: this.height };
    this._layerGfx.clear();
    this._layerGfx.rect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top).fill({ color: 0x000000, alpha: 0.01 });
  }

  Update(): void {
    for (const c of this.children) {
      if (c.enabled) c.Update();
    }
  }

  Destroy(): void {
    this.OnDestroy();
    if (WndMan.m_pFocusWnd === this) WndMan.SetFocus(null);
    this.m_pFocusWnd = null;
    for (const c of [...this.children]) c.Destroy();
    this.children.length = 0;
    this._layerGfx?.removeFromParent();
    this.container.removeFromParent();
    if (this.parent) {
      const idx = this.parent.children.indexOf(this);
      if (idx >= 0) this.parent.children.splice(idx, 1);
    }
    WndMan.RemoveWindow(this);
    WndMan.RemoveUpdateWindow(this);
    WndMan.RemoveInvalidatedWindow(this);
  }

  MoveWnd(l: number, t: number): void {
    this.container.position.set(l, t);
  }

  HitTest(x: number, y: number): CWnd | null {
    for (let i = this.children.length - 1; i >= 0; i--) {
      const c = this.children[i];
      if (!c.visible) continue;
      const cx = x - c.container.position.x;
      const cy = y - c.container.position.y;
      if (cx >= 0 && cy >= 0 && cx < c.width && cy < c.height) {
        const deeper = c.HitTest(cx, cy);
        return deeper ?? c;
      }
    }
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) return this;
    return null;
  }

  InsertChildAfter(child: CWnd, after: CWnd | null): void {
    if (child.parent === this) {
      const idx = this.children.indexOf(child);
      if (idx >= 0) this.children.splice(idx, 1);
    } else {
      child.parent?.RemoveChild(child);
      child.parent = this;
    }
    if (after) {
      const ai = this.children.indexOf(after);
      this.children.splice(ai + 1, 0, child);
    } else {
      this.children.push(child);
    }
    this.container.addChild(child.container);
  }

  InsertChildBefore(child: CWnd, before: CWnd | null): void {
    if (child.parent === this) {
      const idx = this.children.indexOf(child);
      if (idx >= 0) this.children.splice(idx, 1);
    } else {
      child.parent?.RemoveChild(child);
      child.parent = this;
    }
    if (before) {
      const bi = this.children.indexOf(before);
      this.children.splice(bi, 0, child);
    } else {
      this.children.unshift(child);
    }
    this.container.addChild(child.container);
  }

  RemoveChild(child: CWnd): void {
    const idx = this.children.indexOf(child);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      child.container.removeFromParent();
      child.parent = null;
    }
  }

  InvalidateRect(rect: WndRect | null): void {
    if (rect) {
      this.invalidatedRect = rect;
    } else {
      this.invalidatedRect = { left: 0, top: 0, right: this.width, bottom: this.height };
    }
    WndMan.InsertInvalidatedWindow(this);
  }

  private _ensureLayer(): void {
    if (!this._layerGfx) {
      this._layerGfx = new Graphics();
      this.container.addChild(this._layerGfx);
    }
  }
}

export class WndMan {
  static readonly windows: CWnd[] = [];
  static readonly updateWindows: CWnd[] = [];
  static readonly invalidatedWindows: CWnd[] = [];
  static m_pFocusWnd: CWnd | null = null;

  static SetFocus(wnd: CWnd | null): void {
    if (WndMan.m_pFocusWnd === wnd) return;
    if (WndMan.m_pFocusWnd) {
      WndMan.m_pFocusWnd.focused = false;
      WndMan.m_pFocusWnd.OnKillFocus();
    }
    WndMan.m_pFocusWnd = wnd;
    if (wnd) {
      wnd.focused = true;
      wnd.OnSetFocus();
    }
  }

  static GetFocusWnd(): CWnd | null {
    return WndMan.m_pFocusWnd;
  }

  static OnMouseDown(btn: number, flags: number, x: number, y: number): void {
    const hit = WndMan.GetHandlerFromPoint(x, y);
    if (hit) WndMan.SetFocus(hit);
    hit?.OnMouseButton(btn, flags, x - hit.GetAbsLeft(), y - hit.GetAbsTop());
  }

  static OnKeyDown(key: number, flags: number): void {
    WndMan.m_pFocusWnd?.OnKey(key, flags);
  }

  static OnMouseMove(x: number, y: number): boolean {
    const hit = WndMan.GetHandlerFromPoint(x, y);
    if (hit) return hit.OnMouseMove(x - hit.GetAbsLeft(), y - hit.GetAbsTop());
    return false;
  }

  static OnMouseWheel(x: number, y: number, delta: number): boolean {
    const hit = WndMan.GetHandlerFromPoint(x, y);
    if (hit) return hit.OnMouseWheel(x - hit.GetAbsLeft(), y - hit.GetAbsTop(), delta);
    return false;
  }

  static InsertWindow(wnd: CWnd): void {
    let inserted = false;
    for (let i = 0; i < WndMan.windows.length; i++) {
      if (WndMan.windows[i].z > wnd.z) {
        WndMan.windows.splice(i, 0, wnd);
        inserted = true;
        break;
      }
    }
    if (!inserted) WndMan.windows.push(wnd);
  }

  static RemoveWindow(wnd: CWnd): void {
    const idx = WndMan.windows.indexOf(wnd);
    if (idx >= 0) WndMan.windows.splice(idx, 1);
  }

  static RemoveUpdateWindow(wnd: CWnd): void {
    const idx = WndMan.updateWindows.indexOf(wnd);
    if (idx >= 0) WndMan.updateWindows.splice(idx, 1);
  }

  static RemoveInvalidatedWindow(wnd: CWnd): void {
    const idx = WndMan.invalidatedWindows.indexOf(wnd);
    if (idx >= 0) WndMan.invalidatedWindows.splice(idx, 1);
  }

  static InsertInvalidatedWindow(wnd: CWnd): void {
    if (!WndMan.invalidatedWindows.includes(wnd)) {
      WndMan.invalidatedWindows.push(wnd);
    }
  }

  static RedrawInvalidatedWindows(): void {
    for (const wnd of WndMan.invalidatedWindows) {
      if (rectEmpty(wnd.invalidatedRect)) continue;
      wnd.Draw(wnd.invalidatedRect);
      for (const child of wnd.children) {
        if (!child.visible) continue;
        const cr = {
          left: child.container.position.x,
          top: child.container.position.y,
          right: child.container.position.x + child.width,
          bottom: child.container.position.y + child.height,
        };
        if (rectIntersect(wnd.invalidatedRect, cr)) {
          child.Draw(child.invalidatedRect);
        }
      }
      wnd.invalidatedRect = { left: 0, top: 0, right: 0, bottom: 0 };
    }
    WndMan.invalidatedWindows.length = 0;
  }

  static GetHandlerFromPoint(x: number, y: number): CWnd | null {
    for (let i = WndMan.windows.length - 1; i >= 0; i--) {
      const wnd = WndMan.windows[i];
      if (!wnd.visible) continue;
      const hit = wnd.HitTest(x - wnd.container.position.x, y - wnd.container.position.y);
      if (hit) return hit;
    }
    return null;
  }

  static DestroyAll(): void {
    WndMan.SetFocus(null);
    for (const wnd of [...WndMan.windows]) wnd.Destroy();
    WndMan.windows.length = 0;
    WndMan.updateWindows.length = 0;
    WndMan.invalidatedWindows.length = 0;
  }
}

function rectIntersect(a: WndRect, b: WndRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
