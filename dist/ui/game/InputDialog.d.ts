import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
export declare class InputDialog extends GamePanel {
    private _bg;
    private _titleText;
    private _labelText;
    private _inputBg;
    private _inputText;
    private _inputValue;
    private _btnOk;
    private _btnCancel;
    private _maxValue;
    onConfirm: ((value: number) => void) | null;
    onCancel: (() => void) | null;
    constructor(opts?: {
        loader?: WzTextureLoader;
        uiWz?: WzPackage | null;
    });
    show(title: string, label: string, defaultValue: number, maxValue: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private _confirm;
    private _cancel;
}
//# sourceMappingURL=InputDialog.d.ts.map