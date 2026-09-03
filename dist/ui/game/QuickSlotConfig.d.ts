import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
export declare class QuickSlotConfig extends GamePanel {
    OnOpenKeyConfig: (() => void) | null;
    private _background;
    private _btSetting;
    private _font;
    private _windowDrag;
    private _windowDragOff;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null);
    Open(): void;
    update(_dt: number): void;
    setMouse(x: number, y: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=QuickSlotConfig.d.ts.map