import { Container, Graphics } from 'pixi.js';
function rectEmpty(r) {
    return r.left >= r.right || r.top >= r.bottom;
}
let s_dwKeyCounter = 0;
export var UIOrigin;
(function (UIOrigin) {
    UIOrigin[UIOrigin["Center"] = 0] = "Center";
    UIOrigin[UIOrigin["TopLeft"] = 1] = "TopLeft";
    UIOrigin[UIOrigin["TopCenter"] = 2] = "TopCenter";
    UIOrigin[UIOrigin["TopRight"] = 3] = "TopRight";
    UIOrigin[UIOrigin["CenterLeft"] = 4] = "CenterLeft";
    UIOrigin[UIOrigin["CenterRight"] = 5] = "CenterRight";
    UIOrigin[UIOrigin["BottomLeft"] = 6] = "BottomLeft";
    UIOrigin[UIOrigin["BottomCenter"] = 7] = "BottomCenter";
    UIOrigin[UIOrigin["BottomRight"] = 8] = "BottomRight";
})(UIOrigin || (UIOrigin = {}));
export class CWnd {
    Key = ++s_dwKeyCounter;
    container = new Container();
    children = [];
    width = 0;
    height = 0;
    z = 0;
    origin = UIOrigin.Center;
    invalidatedRect = { left: 0, top: 0, right: 0, bottom: 0 };
    parent = null;
    visible = true;
    enabled = true;
    focused = false;
    m_pFocusWnd = null;
    _layerGfx = null;
    CreateWnd(l, t, w, h, z, _screenCoord, _data, _setFocus, origin) {
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
    OnCreate(_data) { }
    OnDestroy() { }
    OnKey(_key, _flags) { }
    OnMouseButton(_btn, _flags, _x, _y) { }
    OnMouseMove(_x, _y) { return false; }
    OnMouseEnter(_active) { }
    OnMouseWheel(_x, _y, _delta) { return false; }
    OnSetFocus() { }
    OnKillFocus() { }
    GetAbsLeft() {
        let x = this.container.position.x;
        let p = this.parent;
        while (p) {
            x += p.container.position.x;
            p = p.parent;
        }
        return x;
    }
    GetAbsTop() {
        let y = this.container.position.y;
        let p = this.parent;
        while (p) {
            y += p.container.position.y;
            p = p.parent;
        }
        return y;
    }
    Draw(pRect) {
        if (!this._layerGfx)
            return;
        const rect = pRect ?? { left: 0, top: 0, right: this.width, bottom: this.height };
        this._layerGfx.clear();
        this._layerGfx.rect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top).fill({ color: 0x000000, alpha: 0.01 });
    }
    Update() {
        for (const c of this.children) {
            if (c.enabled)
                c.Update();
        }
    }
    Destroy() {
        this.OnDestroy();
        if (WndMan.m_pFocusWnd === this)
            WndMan.SetFocus(null);
        this.m_pFocusWnd = null;
        for (const c of [...this.children])
            c.Destroy();
        this.children.length = 0;
        this._layerGfx?.removeFromParent();
        this.container.removeFromParent();
        if (this.parent) {
            const idx = this.parent.children.indexOf(this);
            if (idx >= 0)
                this.parent.children.splice(idx, 1);
        }
        WndMan.RemoveWindow(this);
        WndMan.RemoveUpdateWindow(this);
        WndMan.RemoveInvalidatedWindow(this);
    }
    MoveWnd(l, t) {
        this.container.position.set(l, t);
    }
    HitTest(x, y) {
        for (let i = this.children.length - 1; i >= 0; i--) {
            const c = this.children[i];
            if (!c.visible)
                continue;
            const cx = x - c.container.position.x;
            const cy = y - c.container.position.y;
            if (cx >= 0 && cy >= 0 && cx < c.width && cy < c.height) {
                const deeper = c.HitTest(cx, cy);
                return deeper ?? c;
            }
        }
        if (x >= 0 && y >= 0 && x < this.width && y < this.height)
            return this;
        return null;
    }
    InsertChildAfter(child, after) {
        if (child.parent === this) {
            const idx = this.children.indexOf(child);
            if (idx >= 0)
                this.children.splice(idx, 1);
        }
        else {
            child.parent?.RemoveChild(child);
            child.parent = this;
        }
        if (after) {
            const ai = this.children.indexOf(after);
            this.children.splice(ai + 1, 0, child);
        }
        else {
            this.children.push(child);
        }
        this.container.addChild(child.container);
    }
    InsertChildBefore(child, before) {
        if (child.parent === this) {
            const idx = this.children.indexOf(child);
            if (idx >= 0)
                this.children.splice(idx, 1);
        }
        else {
            child.parent?.RemoveChild(child);
            child.parent = this;
        }
        if (before) {
            const bi = this.children.indexOf(before);
            this.children.splice(bi, 0, child);
        }
        else {
            this.children.unshift(child);
        }
        this.container.addChild(child.container);
    }
    RemoveChild(child) {
        const idx = this.children.indexOf(child);
        if (idx >= 0) {
            this.children.splice(idx, 1);
            child.container.removeFromParent();
            child.parent = null;
        }
    }
    InvalidateRect(rect) {
        if (rect) {
            this.invalidatedRect = rect;
        }
        else {
            this.invalidatedRect = { left: 0, top: 0, right: this.width, bottom: this.height };
        }
        WndMan.InsertInvalidatedWindow(this);
    }
    _ensureLayer() {
        if (!this._layerGfx) {
            this._layerGfx = new Graphics();
            this.container.addChild(this._layerGfx);
        }
    }
}
export class WndMan {
    static windows = [];
    static updateWindows = [];
    static invalidatedWindows = [];
    static m_pFocusWnd = null;
    static SetFocus(wnd) {
        if (WndMan.m_pFocusWnd === wnd)
            return;
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
    static GetFocusWnd() {
        return WndMan.m_pFocusWnd;
    }
    static OnMouseDown(btn, flags, x, y) {
        const hit = WndMan.GetHandlerFromPoint(x, y);
        if (hit)
            WndMan.SetFocus(hit);
        hit?.OnMouseButton(btn, flags, x - hit.GetAbsLeft(), y - hit.GetAbsTop());
    }
    static OnKeyDown(key, flags) {
        WndMan.m_pFocusWnd?.OnKey(key, flags);
    }
    static OnMouseMove(x, y) {
        const hit = WndMan.GetHandlerFromPoint(x, y);
        if (hit)
            return hit.OnMouseMove(x - hit.GetAbsLeft(), y - hit.GetAbsTop());
        return false;
    }
    static OnMouseWheel(x, y, delta) {
        const hit = WndMan.GetHandlerFromPoint(x, y);
        if (hit)
            return hit.OnMouseWheel(x - hit.GetAbsLeft(), y - hit.GetAbsTop(), delta);
        return false;
    }
    static InsertWindow(wnd) {
        let inserted = false;
        for (let i = 0; i < WndMan.windows.length; i++) {
            if (WndMan.windows[i].z > wnd.z) {
                WndMan.windows.splice(i, 0, wnd);
                inserted = true;
                break;
            }
        }
        if (!inserted)
            WndMan.windows.push(wnd);
    }
    static RemoveWindow(wnd) {
        const idx = WndMan.windows.indexOf(wnd);
        if (idx >= 0)
            WndMan.windows.splice(idx, 1);
    }
    static RemoveUpdateWindow(wnd) {
        const idx = WndMan.updateWindows.indexOf(wnd);
        if (idx >= 0)
            WndMan.updateWindows.splice(idx, 1);
    }
    static RemoveInvalidatedWindow(wnd) {
        const idx = WndMan.invalidatedWindows.indexOf(wnd);
        if (idx >= 0)
            WndMan.invalidatedWindows.splice(idx, 1);
    }
    static InsertInvalidatedWindow(wnd) {
        if (!WndMan.invalidatedWindows.includes(wnd)) {
            WndMan.invalidatedWindows.push(wnd);
        }
    }
    static RedrawInvalidatedWindows() {
        for (const wnd of WndMan.invalidatedWindows) {
            if (rectEmpty(wnd.invalidatedRect))
                continue;
            wnd.Draw(wnd.invalidatedRect);
            for (const child of wnd.children) {
                if (!child.visible)
                    continue;
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
    static GetHandlerFromPoint(x, y) {
        for (let i = WndMan.windows.length - 1; i >= 0; i--) {
            const wnd = WndMan.windows[i];
            if (!wnd.visible)
                continue;
            const hit = wnd.HitTest(x - wnd.container.position.x, y - wnd.container.position.y);
            if (hit)
                return hit;
        }
        return null;
    }
    static DestroyAll() {
        WndMan.SetFocus(null);
        for (const wnd of [...WndMan.windows])
            wnd.Destroy();
        WndMan.windows.length = 0;
        WndMan.updateWindows.length = 0;
        WndMan.invalidatedWindows.length = 0;
    }
}
function rectIntersect(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
//# sourceMappingURL=Wnd.js.map