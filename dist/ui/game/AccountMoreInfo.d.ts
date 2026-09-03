import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
export declare class AccountMoreInfo extends GamePanel {
    private _bg;
    onClose: (() => void) | null;
    constructor(opts?: {
        accountName?: string;
        nx?: number;
        maplePoints?: number;
        loader?: WzTextureLoader;
        uiWz?: WzPackage | null;
    });
    handleMouseButton(x: number, y: number, _down: boolean): boolean;
    onKeyPress(key: string): boolean;
    update(_dt: number): void;
}
//# sourceMappingURL=AccountMoreInfo.d.ts.map