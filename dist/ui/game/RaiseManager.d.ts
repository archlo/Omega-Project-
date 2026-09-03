import { GamePanel } from './GamePanel.js';
export declare class RaiseManager extends GamePanel {
    private _bg;
    private _titleText;
    private _bodyText;
    private _closeBtn;
    private _closeLabel;
    private _windows;
    private _currentItemId;
    constructor();
    /** OG: CUIRaiseManager::OpenWindow — opens or focuses a raise window. */
    OpenWindow(nItemID: number): void;
    /** OG: CUIRaiseManager::_CreateWindow — creates the appropriate window for the item. */
    private _createWindow;
    /** OG: OpenRaise dispatches to CCakePieEvent for item 4220176. */
    static IsCakePieEvent(nItemID: number): boolean;
    private _getRaiseName;
    private _refresh;
    private _close;
    private _drawChrome;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=RaiseManager.d.ts.map