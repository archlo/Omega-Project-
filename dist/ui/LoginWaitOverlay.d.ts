import { Overlay } from './Overlay.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzPackage } from '../wz/WzPackage.js';
import { BuiltInFont } from './BuiltInFont.js';
export declare class LoginWaitOverlay extends Overlay {
    OnCancel: (() => void) | null;
    OnDone: (() => void) | null;
    private _background;
    private _btCancel;
    private _font;
    private _center;
    private _autoTimer;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null, center: {
        x: number;
        y: number;
    });
    /** Keeps the Pixi container's visibility in sync with `isVisible`. */
    setVisible(visible: boolean): void;
    ShowAndThen(seconds: number, onDone: () => void): void;
    update(_dt: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=LoginWaitOverlay.d.ts.map