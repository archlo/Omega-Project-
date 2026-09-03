import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
export declare class Revive extends GamePanel {
    OnRevive: ((premium: boolean) => void) | null;
    private _backgrnd;
    private _bgPixi;
    private _fallbackBg;
    private _message;
    private _btOk;
    private _font;
    private _viewW;
    private _viewH;
    private _alpha;
    private _ignoreInputMs;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null);
    Open(): void;
    Close(): void;
    private _acceptTownRevive;
    Relayout(viewWidth: number, viewHeight: number): void;
    update(dt: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private get _panelWidth();
    private get _panelHeight();
    private _topLeft;
    private static _probeAssets;
}
//# sourceMappingURL=Revive.d.ts.map