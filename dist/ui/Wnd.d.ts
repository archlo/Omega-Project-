import { Container } from 'pixi.js';
export interface WndRect {
    left: number;
    top: number;
    right: number;
    bottom: number;
}
export declare enum UIOrigin {
    Center = 0,
    TopLeft = 1,
    TopCenter = 2,
    TopRight = 3,
    CenterLeft = 4,
    CenterRight = 5,
    BottomLeft = 6,
    BottomCenter = 7,
    BottomRight = 8
}
export declare class CWnd {
    readonly Key: number;
    readonly container: Container<import("pixi.js").ContainerChild>;
    readonly children: CWnd[];
    width: number;
    height: number;
    z: number;
    origin: UIOrigin;
    invalidatedRect: WndRect;
    parent: CWnd | null;
    visible: boolean;
    enabled: boolean;
    focused: boolean;
    m_pFocusWnd: CWnd | null;
    private _layerGfx;
    CreateWnd(l: number, t: number, w: number, h: number, z: number, _screenCoord: boolean, _data: unknown, _setFocus: boolean, origin: UIOrigin): void;
    OnCreate(_data: unknown): void;
    OnDestroy(): void;
    OnKey(_key: number, _flags: number): void;
    OnMouseButton(_btn: number, _flags: number, _x: number, _y: number): void;
    OnMouseMove(_x: number, _y: number): boolean;
    OnMouseEnter(_active: boolean): void;
    OnMouseWheel(_x: number, _y: number, _delta: number): boolean;
    OnSetFocus(): void;
    OnKillFocus(): void;
    GetAbsLeft(): number;
    GetAbsTop(): number;
    Draw(pRect: WndRect | null): void;
    Update(): void;
    Destroy(): void;
    MoveWnd(l: number, t: number): void;
    HitTest(x: number, y: number): CWnd | null;
    InsertChildAfter(child: CWnd, after: CWnd | null): void;
    InsertChildBefore(child: CWnd, before: CWnd | null): void;
    RemoveChild(child: CWnd): void;
    InvalidateRect(rect: WndRect | null): void;
    private _ensureLayer;
}
export declare class WndMan {
    static readonly windows: CWnd[];
    static readonly updateWindows: CWnd[];
    static readonly invalidatedWindows: CWnd[];
    static m_pFocusWnd: CWnd | null;
    static SetFocus(wnd: CWnd | null): void;
    static GetFocusWnd(): CWnd | null;
    static OnMouseDown(btn: number, flags: number, x: number, y: number): void;
    static OnKeyDown(key: number, flags: number): void;
    static OnMouseMove(x: number, y: number): boolean;
    static OnMouseWheel(x: number, y: number, delta: number): boolean;
    static InsertWindow(wnd: CWnd): void;
    static RemoveWindow(wnd: CWnd): void;
    static RemoveUpdateWindow(wnd: CWnd): void;
    static RemoveInvalidatedWindow(wnd: CWnd): void;
    static InsertInvalidatedWindow(wnd: CWnd): void;
    static RedrawInvalidatedWindows(): void;
    static GetHandlerFromPoint(x: number, y: number): CWnd | null;
    static DestroyAll(): void;
}
//# sourceMappingURL=Wnd.d.ts.map