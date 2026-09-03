import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { GamePanel } from './GamePanel.js';
export declare class AdminShop extends GamePanel {
    onReopen: ((npcTemplateId: number) => void) | null;
    private _bg;
    private _wzBg;
    private _title;
    private _body;
    private _reopenButton;
    private _reopenLabel;
    private _closeButton;
    private _closeLabel;
    private _npcTemplateId;
    private _itemCount;
    private _lastAction;
    private _canReopen;
    constructor(loader: WzTextureLoader, uiWz: WzPackage | null);
    SetResult(npcTemplateId: number, itemCount: number): void;
    SetAction(action: number, canReopen: boolean): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private _refresh;
    private _drawChrome;
    private _hit;
}
//# sourceMappingURL=AdminShop.d.ts.map