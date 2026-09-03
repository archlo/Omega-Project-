import { Container, Graphics, Text, TextStyle } from 'pixi.js';
// OG: COmokDlg — 15×15 Omok board game
// Button IDs from IDA decompilation
const BTN_READY = 0x3E9;
const BTN_END = 0x3EC;
const BTN_GIVEUP = 0x3EB;
const BTN_BAN = 0x3F0;
// OG: Omok protocol opcodes
const OMOK_PUT_STONE = 64;
const OMOK_TIE_REQUEST = 65;
const OMOK_TIE_RESULT = 66;
const OMOK_GIVEUP_REQUEST = 67;
const OMOK_GIVEUP_RESULT = 68;
const OMOK_RETREAT_REQUEST = 69;
const OMOK_RETREAT_RESULT = 70;
const OMOK_READY = 71;
const OMOK_CANCEL_READY = 72;
const OMOK_START = 73;
const OMOK_GAME_RESULT = 74;
const OMOK_TIME_OVER = 75;
const BOARD_SIZE = 15;
const CELL_SIZE = 24;
const BOARD_X = 20;
const BOARD_Y = 60;
const BOARD_W = BOARD_SIZE * CELL_SIZE;
const BOARD_H = BOARD_SIZE * CELL_SIZE;
export class OmokGame {
    container = new Container();
    _board = [];
    _currentPlayer = 1;
    _myColor = 1;
    _gameActive = false;
    _readySent = false;
    _players = [];
    _winner = 0;
    _winnerName = '';
    _chatMessages = [];
    _sendPacket = null;
    _bg;
    _stones;
    _uiLayer;
    _chatLayer;
    constructor() {
        this._bg = new Graphics();
        this._stones = new Container();
        this._uiLayer = new Container();
        this._chatLayer = new Container();
        this.container.addChild(this._bg, this._stones, this._uiLayer, this._chatLayer);
        this._initBoard();
        this._drawBoard();
    }
    setSendPacket(fn) { this._sendPacket = fn; }
    // OG: ResetMiniGameData
    _initBoard() {
        this._board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
        this._currentPlayer = 1;
        this._winner = 0;
        this._winnerName = '';
        this._chatMessages = [];
        this._readySent = false;
        this._gameActive = false;
    }
    // OG: Draw — renders 15×15 board with grid lines
    _drawBoard() {
        this._bg.clear();
        // Board background
        this._bg.rect(BOARD_X - 2, BOARD_Y - 2, BOARD_W + 4, BOARD_H + 4).fill({ color: 0x8B6914 });
        this._bg.rect(BOARD_X - 2, BOARD_Y - 2, BOARD_W + 4, BOARD_H + 4).stroke({ color: 0x5C4A0A, width: 2 });
        // Grid lines
        for (let i = 0; i < BOARD_SIZE; i++) {
            this._bg.moveTo(BOARD_X + i * CELL_SIZE, BOARD_Y).lineTo(BOARD_X + i * CELL_SIZE, BOARD_Y + BOARD_H).stroke({ color: 0x2C2000, width: 1 });
            this._bg.moveTo(BOARD_X, BOARD_Y + i * CELL_SIZE).lineTo(BOARD_X + BOARD_W, BOARD_Y + i * CELL_SIZE).stroke({ color: 0x2C2000, width: 1 });
        }
        // Star points
        const stars = [3, 7, 11];
        for (const x of stars)
            for (const y of stars) {
                this._bg.circle(BOARD_X + x * CELL_SIZE, BOARD_Y + y * CELL_SIZE, 3).fill({ color: 0x2C2000 });
            }
        this._drawStones();
    }
    _drawStones() {
        this._stones.removeChildren();
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const stone = this._board[r][c];
                if (stone === 0)
                    continue;
                const g = new Graphics();
                const color = stone === 1 ? 0x1A1A1A : 0xF0F0F0;
                const borderColor = stone === 1 ? 0x000000 : 0xCCCCCC;
                g.circle(0, 0, CELL_SIZE / 2 - 2).fill({ color });
                g.circle(0, 0, CELL_SIZE / 2 - 2).stroke({ color: borderColor, width: 1 });
                g.x = BOARD_X + c * CELL_SIZE;
                g.y = BOARD_Y + r * CELL_SIZE;
                this._stones.addChild(g);
            }
        }
        // Winner highlight
        if (this._winner > 0) {
            const t = new Text({ text: `${this._winnerName} wins!`, style: new TextStyle({ fill: '#FFD700', fontSize: 16, fontFamily: 'monospace' }) });
            t.x = BOARD_X + BOARD_W / 2 - t.width / 2;
            t.y = BOARD_Y + BOARD_H + 10;
            this._uiLayer.addChild(t);
        }
    }
    // OG: PutStoneChecker — place stone on board
    putStone(row, col, color) {
        if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE)
            return;
        if (this._board[row][col] !== 0)
            return;
        this._board[row][col] = color;
        this._currentPlayer = color === 1 ? 2 : 1;
        this._drawStones();
        this._checkWin(row, col, color);
    }
    // OG: HitTest — check if click is on board
    hitTest(lx, ly) {
        const col = Math.floor((lx - BOARD_X + CELL_SIZE / 2) / CELL_SIZE);
        const row = Math.floor((ly - BOARD_Y + CELL_SIZE / 2) / CELL_SIZE);
        if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE)
            return null;
        const sx = BOARD_X + col * CELL_SIZE;
        const sy = BOARD_Y + row * CELL_SIZE;
        if (Math.abs(lx - sx) > CELL_SIZE / 2 || Math.abs(ly - sy) > CELL_SIZE / 2)
            return null;
        return { row, col };
    }
    // OG: check 5-in-a-row
    _checkWin(row, col, color) {
        const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (const [dr, dc] of dirs) {
            let count = 1;
            for (let d = 1; d < 5; d++) {
                const r = row + dr * d, c = col + dc * d;
                if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE || this._board[r][c] !== color)
                    break;
                count++;
            }
            for (let d = 1; d < 5; d++) {
                const r = row - dr * d, c = col - dc * d;
                if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE || this._board[r][c] !== color)
                    break;
                count++;
            }
            if (count >= 5) {
                this._winner = color;
                this._winnerName = color === this._myColor ? 'You' : 'Opponent';
                this._gameActive = false;
                this._drawStones();
                return;
            }
        }
    }
    // OG: OnMouseButton — handle board click
    handleClick(lx, ly) {
        if (!this._gameActive)
            return false;
        if (this._currentPlayer !== this._myColor)
            return false;
        const pos = this.hitTest(lx, ly);
        if (!pos)
            return false;
        this.putStone(pos.row, pos.col, this._myColor);
        this._sendPacket?.(OMOK_PUT_STONE, pos.row, pos.col);
        return true;
    }
    // OG: OnButtonClicked
    handleButton(id) {
        switch (id) {
            case BTN_READY:
                this._readySent = true;
                this._sendPacket?.(OMOK_READY);
                break;
            case BTN_GIVEUP:
                this._sendPacket?.(OMOK_GIVEUP_REQUEST);
                break;
            case BTN_END:
                this._sendPacket?.(OMOK_RETREAT_REQUEST);
                break;
        }
    }
    // OG: OnPacket — server responses
    handlePacket(subAction, data) {
        switch (subAction) {
            case OMOK_PUT_STONE:
                this.putStone(data.row, data.col, data.color);
                break;
            case OMOK_START:
                this._gameActive = true;
                this._initBoard();
                this._drawBoard();
                break;
            case OMOK_GAME_RESULT:
                this._winner = data.winner;
                this._winnerName = data.winner === this._myColor ? 'You' : 'Opponent';
                this._gameActive = false;
                this._drawStones();
                break;
            case OMOK_READY:
                if (data.playerIndex !== undefined) {
                    if (!this._players[data.playerIndex])
                        this._players[data.playerIndex] = { name: data.name || '', ready: true };
                    else
                        this._players[data.playerIndex].ready = true;
                }
                break;
            case OMOK_TIE_REQUEST:
                this._chatMessages.push(`${data.playerName} proposes a tie.`);
                break;
            case OMOK_TIE_RESULT:
                this._chatMessages.push(data.accepted ? 'Tie accepted!' : 'Tie declined.');
                break;
            case OMOK_TIME_OVER:
                this._chatMessages.push('Time over!');
                break;
        }
    }
    addChat(name, msg) {
        this._chatMessages.push(`${name}: ${msg}`);
        if (this._chatMessages.length > 20)
            this._chatMessages.shift();
    }
    get isActive() { return this._gameActive; }
    get board() { return this._board; }
}
//# sourceMappingURL=Omok.js.map