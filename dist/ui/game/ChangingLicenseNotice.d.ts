import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
export declare class ChangingLicenseNotice extends GamePanel {
    private _bg;
    onClose: (() => void) | null;
    constructor(opts?: {
        message?: string;
        loader?: WzTextureLoader;
        uiWz?: WzPackage | null;
    });
    handleMouseButton(x: number, y: number, _down: boolean): boolean;
    onKeyPress(key: string): boolean;
    update(_dt: number): void;
}
//# sourceMappingURL=ChangingLicenseNotice.d.ts.map