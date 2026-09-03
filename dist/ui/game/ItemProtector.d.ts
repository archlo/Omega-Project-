import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
import type { DragTarget } from '../DragController.js';
export declare class ItemProtector extends GamePanel implements DragTarget {
    OnConfirm: (() => void) | null;
    OnCancel: (() => void) | null;
    ScrollPos: number;
    ScrollItemId: number;
    TargetItemTI: number;
    TargetSlotPosition: number;
    setTarget(scrollPos: number, scrollItemId: number, targetItemTI: number, targetSlotPosition: number): void;
    tryAcceptDrag(payload: unknown, _x: number, _y: number): boolean;
    private _background;
    private _font;
    private _allButtons;
    private _btOk;
    private _btCancel;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null);
    Open(): void;
    update(_dt: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private _makeButton;
}
//# sourceMappingURL=ItemProtector.d.ts.map