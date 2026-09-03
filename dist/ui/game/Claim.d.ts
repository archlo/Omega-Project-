import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
export declare class Claim extends GamePanel {
    OnConfirm: (() => void) | null;
    private _background;
    private _font;
    private _allButtons;
    private _btOk;
    private _message;
    private readonly _msgText;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null);
    Show(message: string): void;
    ShowResult(result: number, success?: boolean, claimDelayMinutes?: number): void;
    ShowServiceStatus(message: string): void;
    update(_dt: number): void;
    private _makeButton;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=Claim.d.ts.map