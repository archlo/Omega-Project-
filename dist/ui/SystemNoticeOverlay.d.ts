import { Overlay } from './Overlay.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzPackage } from '../wz/WzPackage.js';
export declare class SystemNoticeOverlay extends Overlay {
    private _loader;
    private _ui;
    private _center;
    private _bg;
    private _btYes;
    private _text;
    private _textSprite;
    private _onOk;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, center: {
        x: number;
        y: number;
    });
    Show(textId: number, onOk: () => void): void;
    private _confirm;
    update(_dt: number): void;
    setMouse(x: number, y: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=SystemNoticeOverlay.d.ts.map