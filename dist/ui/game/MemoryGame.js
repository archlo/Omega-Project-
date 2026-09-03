import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { Button } from '../Button.js';
// OG: CMemoryGameDlg (size=3464, inherits CMiniRoomBaseDlg 420 bytes)
// Cards are laid out in m_nCardInRow columns; OG uses a 4x4 grid (8 pairs)
// for MemoryGameRoom type 2. m_anShuffle holds the shuffled card order.
const PanelW = 526;
const PanelH = 472;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _labelStyle = new TextStyle({ fill: '#AAA', fontSize: 9, fontFamily: 'monospace' });
const _cardStyle = new TextStyle({ fill: '#FFF', fontSize: 16, fontFamily: 'monospace', fontWeight: 'bold' });
const _scoreStyle = new TextStyle({ fill: '#FFD700', fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold' });
// Card grid layout (OG: m_nCardInRow = 4 for MemoryGameRoom)
const CARD_COLS = 4;
const CARD_ROWS = 4;
const CARD_W = 56;
const CARD_H = 56;
const CARD_GAP = 6;
const GRID_X = 160;
const GRID_Y = 70;
// OG button IDs from enum
const ID_BT_START = 0x3E9;
const ID_BT_TIE = 0x3EA;
const ID_BT_GIVEUP = 0x3EB;
const ID_BT_END = 0x3EC;
const ID_BT_READY = 0x3EF;
const ID_BT_BAN = 0x3F0;
// Card states (from OG m_anShowState)
const CARD_HIDDEN = 0;
const CARD_SHOWING = 1;
const CARD_MATCHED = 2;
// OG card type symbols — the real client uses WZ card images from
// MemoryGame.img. We use placeholder symbols for now.
const CARD_SYMBOLS = [
    '\u2660', '\u2665', '\u2666', '\u2663',
    '\u2605', '\u2606', '\u263E', '\u263D',
];
export class MemoryGame extends GamePanel {
    _callbacks;
    _background = null;
    _font = null;
    // OG fields
    _cardSelected = -1;
    _bSelected = false;
    _nCardInRow = CARD_COLS;
    _anShowState = new Array(CARD_COLS * CARD_ROWS).fill(CARD_HIDDEN);
    _anScore = [0, 0];
    _nRound = 0;
    _nLast1 = -1;
    _nLast2 = -1;
    _nCount = 0;
    _bCurTurn = false;
    _bRoomMaster = false;
    _bReady = false;
    _bTournament = false;
    _nGameSituation = 0;
    _nTimeLeft = 0;
    _nWinnerIdx = -1;
    _nGameResultType = 0;
    _tTurnBack = 0;
    _bTurnBack = false;
    _anShuffle = [];
    _title = '';
    // PixiJS drawing
    _bg;
    _cardGraphics = [];
    _cardTexts = [];
    _scoreTextP1 = null;
    _scoreTextP2 = null;
    _roundText = null;
    _statusText = null;
    _timerText = null;
    // Player info
    _player1Name = '';
    _player2Name = '';
    _myPosition = 0;
    // Buttons
    _btStart = null;
    _btTie = null;
    _btGiveUp = null;
    _btEnd = null;
    _btReady = null;
    _btBan = null;
    // Timer
    _lastTime = 0;
    constructor(callbacks) {
        super();
        this._callbacks = callbacks;
        this._root.label = 'MemoryGame';
        this._bg = new Graphics();
        this._root.addChild(this._bg);
        this._drawBackground();
        this._createButtons();
        this._createLabels();
        this._createCards();
        this._updateButtonVisibility();
    }
    _drawBackground() {
        const g = this._bg;
        g.clear();
        // Dark blue panel background (OG: MemoryGame.wz UI)
        g.roundRect(0, 0, PanelW, PanelH, 6);
        g.fill({ color: 0x1A1A2E, alpha: 0.95 });
        // Border
        g.roundRect(0, 0, PanelW, PanelH, 6);
        g.stroke({ color: 0x4A4A6A, width: 2 });
        // Title bar
        g.roundRect(2, 2, PanelW - 4, 20, 4);
        g.fill({ color: 0x2A2A4E, alpha: 0.9 });
        // Card area background
        g.roundRect(GRID_X - 8, GRID_Y - 8, CARD_COLS * (CARD_W + CARD_GAP) + 8, CARD_ROWS * (CARD_H + CARD_GAP) + 8, 4);
        g.fill({ color: 0x0F0F1F, alpha: 0.8 });
        // Score area
        g.roundRect(10, 70, 140, 120, 4);
        g.fill({ color: 0x151530, alpha: 0.8 });
        g.roundRect(10, 200, 140, 60, 4);
        g.fill({ color: 0x151530, alpha: 0.8 });
        // Chat area background
        g.roundRect(10, PanelH - 120, PanelW - 20, 110, 4);
        g.fill({ color: 0x0A0A1A, alpha: 0.7 });
    }
    _createButtons() {
        const btnY = PanelH - 150;
        // Start button (0x3E9) — only visible to room master when not started
        this._btStart = new Button('Start');
        this._btStart.onClick = () => this._callbacks.onStart();
        this._btStart.container.x = 10;
        this._btStart.container.y = btnY;
        this._root.addChild(this._btStart.container);
        // Ready button (0x3EF) — visible to non-master when waiting
        this._btReady = new Button('Ready');
        this._btReady.onClick = () => {
            this._bReady = !this._bReady;
            this._callbacks.onReady(this._bReady);
            this._btReady.label = this._bReady ? 'Cancel' : 'Ready';
        };
        this._btReady.container.x = 10;
        this._btReady.container.y = btnY + 28;
        this._root.addChild(this._btReady.container);
        // Tie button (0x3EA) — during game
        this._btTie = new Button('Tie');
        this._btTie.onClick = () => this._callbacks.onTieRequest();
        this._btTie.container.x = 10;
        this._btTie.container.y = btnY;
        this._root.addChild(this._btTie.container);
        // Give Up button (0x3EB) — during game
        this._btGiveUp = new Button('Give Up');
        this._btGiveUp.onClick = () => this._callbacks.onGiveUp();
        this._btGiveUp.container.x = 10;
        this._btGiveUp.container.y = btnY + 28;
        this._root.addChild(this._btGiveUp.container);
        // End button (0x3EC) — room master ends room
        this._btEnd = new Button('End');
        this._btEnd.onClick = () => this._callbacks.onLeave();
        this._btEnd.container.x = 10;
        this._btEnd.container.y = btnY + 56;
        this._root.addChild(this._btEnd.container);
        // Ban button (0x3F0) — room master bans player
        this._btBan = new Button('Ban');
        this._btBan.onClick = () => this._callbacks.onBan();
        this._btBan.container.x = 80;
        this._btBan.container.y = btnY + 56;
        this._root.addChild(this._btBan.container);
    }
    _createLabels() {
        // Title
        const title = new Text({ text: 'Memory Game', style: _titleStyle });
        title.x = PanelW / 2 - title.width / 2;
        title.y = 3;
        this._root.addChild(title);
        // Player 1 name + score
        const p1Label = new Text({ text: 'Player 1:', style: _labelStyle });
        p1Label.x = 14;
        p1Label.y = 74;
        this._root.addChild(p1Label);
        this._scoreTextP1 = new Text({ text: '0', style: _scoreStyle });
        this._scoreTextP1.x = 14;
        this._scoreTextP1.y = 92;
        this._root.addChild(this._scoreTextP1);
        // Player 2 name + score
        const p2Label = new Text({ text: 'Player 2:', style: _labelStyle });
        p2Label.x = 14;
        p2Label.y = 120;
        this._root.addChild(p2Label);
        this._scoreTextP2 = new Text({ text: '0', style: _scoreStyle });
        this._scoreTextP2.x = 14;
        this._scoreTextP2.y = 138;
        this._root.addChild(this._scoreTextP2);
        // Round
        const roundLabel = new Text({ text: 'Round:', style: _labelStyle });
        roundLabel.x = 14;
        roundLabel.y = 170;
        this._root.addChild(roundLabel);
        this._roundText = new Text({ text: '0', style: _scoreStyle });
        this._roundText.x = 60;
        this._roundText.y = 170;
        this._root.addChild(this._roundText);
        // Status text
        this._statusText = new Text({ text: 'Waiting...', style: _labelStyle });
        this._statusText.x = 14;
        this._statusText.y = 204;
        this._root.addChild(this._statusText);
        // Timer
        this._timerText = new Text({ text: '', style: _scoreStyle });
        this._timerText.x = 14;
        this._timerText.y = 240;
        this._root.addChild(this._timerText);
    }
    _createCards() {
        const totalCards = CARD_COLS * CARD_ROWS;
        for (let i = 0; i < totalCards; i++) {
            const col = i % CARD_COLS;
            const row = Math.floor(i / CARD_COLS);
            const x = GRID_X + col * (CARD_W + CARD_GAP);
            const y = GRID_Y + row * (CARD_H + CARD_GAP);
            // Card background
            const cardG = new Graphics();
            cardG.roundRect(0, 0, CARD_W, CARD_H, 4);
            cardG.fill({ color: 0x2A2A5E });
            cardG.roundRect(0, 0, CARD_W, CARD_H, 4);
            cardG.stroke({ color: 0x5A5A8A, width: 1 });
            cardG.x = x;
            cardG.y = y;
            cardG.eventMode = 'static';
            cardG.cursor = 'pointer';
            const cardIdx = i;
            cardG.on('pointerdown', () => this._onCardClick(cardIdx));
            this._root.addChild(cardG);
            this._cardGraphics.push(cardG);
            // Card text (hidden initially)
            const cardT = new Text({ text: '?', style: _cardStyle });
            cardT.anchor.set(0.5);
            cardT.x = x + CARD_W / 2;
            cardT.y = y + CARD_H / 2;
            cardT.visible = false;
            this._root.addChild(cardT);
            this._cardTexts.push(cardT);
        }
    }
    _onCardClick(cardIdx) {
        if (!this._bCurTurn)
            return;
        if (this._anShowState[cardIdx] !== CARD_HIDDEN)
            return;
        if (this._nCount >= 2)
            return; // Already two cards flipped this turn
        // OG: SetCardSelected → SendTurnUpCard
        this._cardSelected = cardIdx;
        this._bSelected = true;
        this._callbacks.onTurnUpCard(cardIdx, true);
    }
    _updateButtonVisibility() {
        const waiting = this._nGameSituation === 0; // Not started
        const playing = this._nGameSituation === 1; // In progress
        const ended = this._nGameSituation === 2; // Game over
        // Start: room master, waiting, not tournament
        this._btStart.container.visible = waiting && this._bRoomMaster && !this._bTournament;
        // Ready: non-master, waiting
        this._btReady.container.visible = waiting && !this._bRoomMaster;
        // Tie/GiveUp: during game
        this._btTie.container.visible = playing;
        this._btGiveUp.container.visible = playing;
        // End/Ban: always available to room master
        this._btEnd.container.visible = this._bRoomMaster;
        this._btBan.container.visible = this._bRoomMaster;
    }
    _updateCardVisuals() {
        for (let i = 0; i < this._cardGraphics.length; i++) {
            const state = this._anShowState[i];
            const g = this._cardGraphics[i];
            const t = this._cardTexts[i];
            g.clear();
            if (state === CARD_MATCHED) {
                // Matched — green tint
                g.roundRect(0, 0, CARD_W, CARD_H, 4);
                g.fill({ color: 0x1A4A2E });
                g.roundRect(0, 0, CARD_W, CARD_H, 4);
                g.stroke({ color: 0x2A8A4E, width: 2 });
                t.visible = true;
                t.style.fill = '#4AE06A';
            }
            else if (state === CARD_SHOWING) {
                // Flipped face-up — blue highlight
                g.roundRect(0, 0, CARD_W, CARD_H, 4);
                g.fill({ color: 0x3A3A7E });
                g.roundRect(0, 0, CARD_W, CARD_H, 4);
                g.stroke({ color: 0x7A7ADE, width: 2 });
                t.visible = true;
                t.style.fill = '#FFF';
            }
            else {
                // Hidden — dark card back
                g.roundRect(0, 0, CARD_W, CARD_H, 4);
                g.fill({ color: 0x2A2A5E });
                g.roundRect(0, 0, CARD_W, CARD_H, 4);
                g.stroke({ color: 0x5A5A8A, width: 1 });
                t.visible = false;
            }
        }
    }
    // ── Public API (called by GameStage) ─────────────────────────────────
    Open(title, myPosition, users, maxUsers, bTournament) {
        this._title = title;
        this._myPosition = myPosition;
        this._bTournament = bTournament;
        this._nGameSituation = 0; // Waiting
        this._bReady = false;
        this._cardSelected = -1;
        this._bSelected = false;
        this._anShowState.fill(CARD_HIDDEN);
        this._anScore = [0, 0];
        this._nRound = 0;
        this._nCount = 0;
        this._nLast1 = -1;
        this._nLast2 = -1;
        this._bTurnBack = false;
        this._tTurnBack = 0;
        this._nWinnerIdx = -1;
        this._anShuffle = [];
        // Room master is position 0
        this._bRoomMaster = myPosition === 0;
        // Assign player names
        this._player1Name = '';
        this._player2Name = '';
        for (const u of users) {
            if (u.index === 0)
                this._player1Name = u.name;
            else if (u.index === 1)
                this._player2Name = u.name;
        }
        this._updateLabels();
        this._updateButtonVisibility();
        this._updateCardVisuals();
        this.isVisible = true;
    }
    _updateLabels() {
        if (this._scoreTextP1) {
            const p1Label = this._scoreTextP1.parent?.children.find((c) => c instanceof Text && c.text.startsWith('Player 1'));
            if (p1Label)
                p1Label.text = `Player 1: ${this._player1Name}`;
            this._scoreTextP1.text = `${this._anScore[0]}`;
        }
        if (this._scoreTextP2) {
            const p2Label = this._scoreTextP2.parent?.children.find((c) => c instanceof Text && c.text.startsWith('Player 2'));
            if (p2Label)
                p2Label.text = `Player 2: ${this._player2Name}`;
            this._scoreTextP2.text = `${this._anScore[1]}`;
        }
        if (this._roundText)
            this._roundText.text = `${this._nRound}`;
    }
    /** OG: OnEnterResult — another user entered the room */
    OnUserEnter(userIndex, name, _job) {
        if (userIndex === 0)
            this._player1Name = name;
        else if (userIndex === 1)
            this._player2Name = name;
        this._updateLabels();
    }
    /** OG: OnLeave — a user left the room */
    OnUserLeave(userIndex, _leaveType) {
        if (userIndex === 0)
            this._player1Name = '';
        else if (userIndex === 1)
            this._player2Name = '';
        this._updateLabels();
    }
    /** OG: OnUserReady — user toggled ready state */
    OnUserReady(userIndex) {
        if (userIndex === this._myPosition) {
            this._bReady = true;
        }
    }
    /** OG: OnUserCancelReady — user cancelled ready */
    OnUserCancelReady(userIndex) {
        if (userIndex === this._myPosition) {
            this._bReady = false;
        }
        this._updateButtonVisibility();
    }
    /** OG: OnUserStart — game started, server sent card arrangement */
    OnUserStart(round, cardOrder) {
        this._nRound = round;
        this._nGameSituation = 1; // Playing
        this._bCurTurn = false;
        this._anShuffle = [...cardOrder];
        this._anShowState.fill(CARD_HIDDEN);
        this._nCount = 0;
        this._nLast1 = -1;
        this._nLast2 = -1;
        this._bTurnBack = false;
        // Assign card types from the shuffle order
        // cardOrder maps card index → card type (0..7 for 8 pairs)
        this._updateLabels();
        this._updateButtonVisibility();
        this._updateCardVisuals();
    }
    /** OG: OnTurnUpCard — server confirmed a card flip */
    OnTurnUpCard(cardIndex, cardType, showState, userIndex) {
        // Set the card's show state
        this._anShowState[cardIndex] = showState;
        this._nCount++;
        // Store the card type for display
        // In the OG, the card type maps to a WZ image. We use symbols.
        if (showState === CARD_SHOWING) {
            const symbolIdx = cardType % CARD_SYMBOLS.length;
            this._cardTexts[cardIndex].text = CARD_SYMBOLS[symbolIdx];
        }
        // Track last two flipped cards for match detection
        if (this._nLast1 === -1) {
            this._nLast1 = cardIndex;
        }
        else {
            this._nLast2 = cardIndex;
        }
        // It's our turn if the server says so
        if (userIndex === this._myPosition) {
            this._bCurTurn = true;
        }
        else {
            this._bCurTurn = false;
        }
        this._updateCardVisuals();
    }
    /** OG: OnGameResult — game over */
    OnGameResult(winnerIndex, gameResultType) {
        this._nGameSituation = 2; // Ended
        this._nWinnerIdx = winnerIndex;
        this._nGameResultType = gameResultType;
        this._bCurTurn = false;
        // Show result
        if (this._statusText) {
            if (gameResultType === 0) {
                this._statusText.text = winnerIndex === this._myPosition ? 'You Win!' : 'You Lose!';
            }
            else if (gameResultType === 1) {
                this._statusText.text = 'Draw!';
            }
            else {
                this._statusText.text = 'Game Over';
            }
        }
        this._updateButtonVisibility();
    }
    /** OG: OnTimeOver — turn timer expired */
    OnTimeOver(userIndex) {
        if (userIndex === this._myPosition) {
            this._bCurTurn = false;
            if (this._statusText)
                this._statusText.text = 'Time Over!';
        }
    }
    /** OG: OnTieRequest — opponent requests tie */
    OnTieRequest(userIndex) {
        if (this._statusText) {
            this._statusText.text = `Player ${userIndex + 1} requests a tie`;
        }
    }
    /** OG: OnTieResult — tie result */
    OnTieResult(userIndex, resultCode) {
        if (this._statusText) {
            this._statusText.text = resultCode === 0 ? 'Tie accepted!' : 'Tie declined';
        }
    }
    /** Match found — OG: MGP_MatchCard server packet */
    OnMatchCard(card1Index, card2Index, userIndex) {
        this._anShowState[card1Index] = CARD_MATCHED;
        this._anShowState[card2Index] = CARD_MATCHED;
        // Update score
        if (userIndex === 0)
            this._anScore[0]++;
        else if (userIndex === 1)
            this._anScore[1]++;
        this._nCount = 0;
        this._nLast1 = -1;
        this._nLast2 = -1;
        this._updateLabels();
        this._updateCardVisuals();
    }
    /** OG: SetCardFree — reset card selection state */
    SetCardFree() {
        this._cardSelected = -1;
        this._bSelected = false;
        this._nCount = 0;
        this._nLast1 = -1;
        this._nLast2 = -1;
        this._bTurnBack = false;
        this._anShowState.fill(CARD_HIDDEN);
        this._updateCardVisuals();
    }
    /** Set whose turn it is */
    SetCurTurn(bCurTurn) {
        this._bCurTurn = bCurTurn;
        if (this._statusText) {
            this._statusText.text = bCurTurn ? 'Your Turn' : 'Opponent\'s Turn';
        }
    }
    /** OG: TurnUpCard_Pic — animate card flip to face */
    TurnUpCardPic(cardIdx, cardType) {
        this._anShowState[cardIdx] = CARD_SHOWING;
        const symbolIdx = cardType % CARD_SYMBOLS.length;
        this._cardTexts[cardIdx].text = CARD_SYMBOLS[symbolIdx];
        this._updateCardVisuals();
    }
    /** OG: TurnUpCard_Back — animate card flip to back */
    TurnUpCardBack(cardIdx) {
        this._anShowState[cardIdx] = CARD_HIDDEN;
        this._updateCardVisuals();
    }
    /** OG: SetCard_Pic — immediately show card face (no animation) */
    SetCardPic(cardIdx, cardType) {
        this._anShowState[cardIdx] = CARD_SHOWING;
        const symbolIdx = cardType % CARD_SYMBOLS.length;
        this._cardTexts[cardIdx].text = CARD_SYMBOLS[symbolIdx];
        this._updateCardVisuals();
    }
    /** OG: SetCard_Back — immediately hide card (no animation) */
    SetCardBack(cardIdx) {
        this._anShowState[cardIdx] = CARD_HIDDEN;
        this._updateCardVisuals();
    }
    /** OG: DrawScore — update score display */
    DrawScore() {
        this._updateLabels();
    }
    /** OG: DrawReadyOrNot — update ready status display */
    DrawReadyOrNot() {
        this._updateButtonVisibility();
    }
    // ── GamePanel overrides ──────────────────────────────────────────────
    update(dt) {
        // Handle turn-back timer (OG: m_tTurnBack)
        if (this._bTurnBack && this._tTurnBack > 0) {
            this._tTurnBack -= dt;
            if (this._tTurnBack <= 0) {
                this._bTurnBack = false;
                // Flip cards back
                if (this._nLast1 >= 0)
                    this.TurnUpCardBack(this._nLast1);
                if (this._nLast2 >= 0)
                    this.TurnUpCardBack(this._nLast2);
                this._nLast1 = -1;
                this._nLast2 = -1;
                this._nCount = 0;
            }
        }
    }
    handleMouseButton(x, y, down) {
        if (!this.isVisible)
            return false;
        if (this.beginDrag(x, y, down))
            return true;
        return false;
    }
    /** OG: ResetMiniGameData */
    ResetMiniGameData() {
        this._anShowState.fill(CARD_HIDDEN);
        this._anScore = [0, 0];
        this._nRound = 0;
        this._nCount = 0;
        this._nLast1 = -1;
        this._nLast2 = -1;
        this._bCurTurn = false;
        this._bReady = false;
        this._nGameSituation = 0;
        this._nWinnerIdx = -1;
        this._anShuffle = [];
        this._cardSelected = -1;
        this._bSelected = false;
        this._updateLabels();
        this._updateButtonVisibility();
        this._updateCardVisuals();
    }
}
//# sourceMappingURL=MemoryGame.js.map