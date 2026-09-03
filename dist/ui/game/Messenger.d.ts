import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
export declare class Messenger extends GamePanel {
    onClosed: (() => void) | null;
    private _font;
    private _btClose;
    private _allButtons;
    private _wzBg;
    private _slots;
    private _selfIndex;
    private _chatLog;
    private _dynamicChildren;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null);
    Open(): void;
    SetSelf(index: number): void;
    SetParticipant(index: number, name: string): void;
    RemoveParticipant(index: number): void;
    AddChat(text: string): void;
    Reset(): void;
    private _close;
    private _applyLayout;
    update(_dt: number): void;
    draw(): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private _makeButton;
}
//# sourceMappingURL=Messenger.d.ts.map