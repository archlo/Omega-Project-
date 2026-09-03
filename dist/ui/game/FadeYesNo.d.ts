import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
export declare class FadeYesNo extends GamePanel {
    onYes: (() => void) | null;
    onNo: (() => void) | null;
    private _bg;
    private _wzBg;
    private _msgText;
    private _btYes;
    private _btNo;
    private _alpha;
    private _ignoreInputMs;
    private _viewW;
    private _viewH;
    constructor(loader: WzTextureLoader, ui: WzPackage | null);
    Open(message: string): void;
    Close(): void;
    Relayout(viewWidth: number, viewHeight: number): void;
    update(dt: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private _handleYes;
    private _handleNo;
    private _layout;
    private _rebuildBg;
}
//# sourceMappingURL=FadeYesNo.d.ts.map