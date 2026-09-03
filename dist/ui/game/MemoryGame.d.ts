import { GamePanel } from './GamePanel.js';
export interface MemoryGameCallbacks {
    onTurnUpCard: (cardIdx: number, bSelected: boolean) => void;
    onReady: (bReady: boolean) => void;
    onStart: () => void;
    onTieRequest: () => void;
    onGiveUp: () => void;
    onBan: () => void;
    onLeave: () => void;
}
export declare class MemoryGame extends GamePanel {
    private _callbacks;
    private _background;
    private _font;
    private _cardSelected;
    private _bSelected;
    private _nCardInRow;
    private _anShowState;
    private _anScore;
    private _nRound;
    private _nLast1;
    private _nLast2;
    private _nCount;
    private _bCurTurn;
    private _bRoomMaster;
    private _bReady;
    private _bTournament;
    private _nGameSituation;
    private _nTimeLeft;
    private _nWinnerIdx;
    private _nGameResultType;
    private _tTurnBack;
    private _bTurnBack;
    private _anShuffle;
    private _title;
    private _bg;
    private _cardGraphics;
    private _cardTexts;
    private _scoreTextP1;
    private _scoreTextP2;
    private _roundText;
    private _statusText;
    private _timerText;
    private _player1Name;
    private _player2Name;
    private _myPosition;
    private _btStart;
    private _btTie;
    private _btGiveUp;
    private _btEnd;
    private _btReady;
    private _btBan;
    private _lastTime;
    constructor(callbacks: MemoryGameCallbacks);
    private _drawBackground;
    private _createButtons;
    private _createLabels;
    private _createCards;
    private _onCardClick;
    private _updateButtonVisibility;
    private _updateCardVisuals;
    Open(title: string, myPosition: number, users: {
        index: number;
        name: string;
        job: number;
    }[], maxUsers: number, bTournament: boolean): void;
    private _updateLabels;
    /** OG: OnEnterResult — another user entered the room */
    OnUserEnter(userIndex: number, name: string, _job: number): void;
    /** OG: OnLeave — a user left the room */
    OnUserLeave(userIndex: number, _leaveType: number): void;
    /** OG: OnUserReady — user toggled ready state */
    OnUserReady(userIndex: number): void;
    /** OG: OnUserCancelReady — user cancelled ready */
    OnUserCancelReady(userIndex: number): void;
    /** OG: OnUserStart — game started, server sent card arrangement */
    OnUserStart(round: number, cardOrder: number[]): void;
    /** OG: OnTurnUpCard — server confirmed a card flip */
    OnTurnUpCard(cardIndex: number, cardType: number, showState: number, userIndex: number): void;
    /** OG: OnGameResult — game over */
    OnGameResult(winnerIndex: number, gameResultType: number): void;
    /** OG: OnTimeOver — turn timer expired */
    OnTimeOver(userIndex: number): void;
    /** OG: OnTieRequest — opponent requests tie */
    OnTieRequest(userIndex: number): void;
    /** OG: OnTieResult — tie result */
    OnTieResult(userIndex: number, resultCode: number): void;
    /** Match found — OG: MGP_MatchCard server packet */
    OnMatchCard(card1Index: number, card2Index: number, userIndex: number): void;
    /** OG: SetCardFree — reset card selection state */
    SetCardFree(): void;
    /** Set whose turn it is */
    SetCurTurn(bCurTurn: boolean): void;
    /** OG: TurnUpCard_Pic — animate card flip to face */
    TurnUpCardPic(cardIdx: number, cardType: number): void;
    /** OG: TurnUpCard_Back — animate card flip to back */
    TurnUpCardBack(cardIdx: number): void;
    /** OG: SetCard_Pic — immediately show card face (no animation) */
    SetCardPic(cardIdx: number, cardType: number): void;
    /** OG: SetCard_Back — immediately hide card (no animation) */
    SetCardBack(cardIdx: number): void;
    /** OG: DrawScore — update score display */
    DrawScore(): void;
    /** OG: DrawReadyOrNot — update ready status display */
    DrawReadyOrNot(): void;
    update(dt: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    /** OG: ResetMiniGameData */
    ResetMiniGameData(): void;
}
//# sourceMappingURL=MemoryGame.d.ts.map