import { Overlay } from './Overlay.js';
import { WzPackage } from '../wz/WzPackage.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { BuiltInFont } from './BuiltInFont.js';
export declare enum NoticeType {
    Ok = 0,
    OkCancel = 1
}
export declare class LoginNoticeOverlay extends Overlay {
    private _bgSprite;
    private _btOk;
    private _btCancel;
    private _font;
    private _center;
    private _message;
    private _type;
    private _autoDismiss;
    private _fallbackBox;
    private _lineTexts;
    private _msgText;
    onOk: (() => void) | null;
    onCancel: (() => void) | null;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont, center: {
        x: number;
        y: number;
    });
    show(message: string, type?: NoticeType, autoDismissSeconds?: number): void;
    hide(): void;
    update(dt: number): void;
    private _applyLayout;
    private _rebuildText;
    draw(): void;
    handleMouseButton(x: number, y: number, down: boolean): void;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=LoginNoticeOverlay.d.ts.map