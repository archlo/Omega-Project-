import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
export interface MemoMessage {
    id: number;
    from: string;
    text: string;
    date: string;
    read: boolean;
}
export declare class Memo extends GamePanel {
    OnSend: ((target: string, text: string) => void) | null;
    OnDelete: ((id: number) => void) | null;
    private _background;
    private _font;
    private _messages;
    private _selected;
    private _composing;
    private _composeTarget;
    private _composeText;
    private _allButtons;
    private _btClose;
    private _btSend;
    private _btDelete;
    private _btNew;
    private _dynamicChildren;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null);
    Open(messages: MemoMessage[]): void;
    private _startCompose;
    private _doSend;
    private _doDelete;
    update(_dt: number): void;
    draw(): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private _rebuildBackground;
    private _drawList;
    private _drawButtons;
    private _makeButton;
}
//# sourceMappingURL=Memo.d.ts.map