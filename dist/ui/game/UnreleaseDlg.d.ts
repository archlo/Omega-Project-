import { GamePanel } from './GamePanel.js';
import type { DragTarget } from '../DragController.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { ItemIconLoader } from '../../character/ItemIconLoader.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
export declare class UnreleaseDlg extends GamePanel implements DragTarget {
    private _bg;
    private _slotIcon;
    private _gradeFrame;
    private _buttons;
    private _btConfirm;
    private _btCancel;
    private _selectedItemId;
    private _mouseX;
    private _mouseY;
    private _viewW;
    private _viewH;
    onConfirm: ((itemId: number) => void) | null;
    onClose: (() => void) | null;
    constructor(opts?: {
        loader?: WzTextureLoader;
        uiWz?: WzPackage | null;
        font?: BuiltInFont | null;
        icons?: ItemIconLoader | null;
    });
    putItem(itemId: number, name: string, grade?: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onMouseMove(x: number, y: number): void;
    onKeyPress(key: string): boolean;
    tryAcceptDrag(payload: unknown, x: number, y: number): boolean;
    update(_dt: number): void;
    onResize(viewW: number, viewH: number): void;
}
//# sourceMappingURL=UnreleaseDlg.d.ts.map