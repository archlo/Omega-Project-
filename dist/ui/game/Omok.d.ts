import { Container } from 'pixi.js';
type StoneColor = 0 | 1 | 2;
export interface OmokSendPacket {
    (subAction: number, ...args: number[]): void;
}
export declare class OmokGame {
    readonly container: Container<import("pixi.js").ContainerChild>;
    private _board;
    private _currentPlayer;
    private _myColor;
    private _gameActive;
    private _readySent;
    private _players;
    private _winner;
    private _winnerName;
    private _chatMessages;
    private _sendPacket;
    private _bg;
    private _stones;
    private _uiLayer;
    private _chatLayer;
    constructor();
    setSendPacket(fn: OmokSendPacket): void;
    private _initBoard;
    private _drawBoard;
    private _drawStones;
    putStone(row: number, col: number, color: StoneColor): void;
    hitTest(lx: number, ly: number): {
        row: number;
        col: number;
    } | null;
    private _checkWin;
    handleClick(lx: number, ly: number): boolean;
    handleButton(id: number): void;
    handlePacket(subAction: number, data: any): void;
    addChat(name: string, msg: string): void;
    get isActive(): boolean;
    get board(): StoneColor[][];
}
export {};
//# sourceMappingURL=Omok.d.ts.map