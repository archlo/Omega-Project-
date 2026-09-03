import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
export declare class Notice extends GamePanel {
    private _bg;
    private _titleText;
    private _msgText;
    private _btnOk;
    private _btnCancel;
    private _isConfirm;
    onDismiss: (() => void) | null;
    onConfirm: (() => void) | null;
    private _message;
    constructor(opts?: {
        loader?: WzTextureLoader;
        uiWz?: WzPackage | null;
    });
    private _layoutButtons;
    show(title: string, message: string): void;
    showConfirm(title: string, message: string): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private _confirm;
    private _dismiss;
}
//# sourceMappingURL=Notice.d.ts.map