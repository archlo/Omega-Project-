import { GamePanel } from './GamePanel.js';
export declare class FindFriend extends GamePanel {
    onMyInfo: (() => void) | null;
    onSearch: (() => void) | null;
    private _bg;
    private _title;
    private _body;
    private _myInfoBtn;
    private _myInfoLabel;
    private _searchBtn;
    private _searchLabel;
    private _closeBtn;
    private _closeLabel;
    private _flag1;
    private _flag2;
    constructor();
    SetResult(flag1: number, flag2: number): void;
    Open(): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private _refresh;
    private _drawChrome;
    private _hit;
}
//# sourceMappingURL=FindFriend.d.ts.map