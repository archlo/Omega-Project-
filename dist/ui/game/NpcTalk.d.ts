import { GamePanel } from './GamePanel.js';
export declare enum DialogType {
    Ok = 0,
    Next = 1,
    PrevNext = 2,
    YesNo = 3,
    Menu = 4,
    AskText = 5,
    AskNumber = 6,
    Quiz = 7,
    AskAccept = 8
}
export declare class NpcTalk extends GamePanel {
    onOk: (() => void) | null;
    onNext: (() => void) | null;
    onPrev: (() => void) | null;
    onYes: (() => void) | null;
    onNo: (() => void) | null;
    onTextConfirm: ((text: string) => void) | null;
    onNumberConfirm: ((num: number) => void) | null;
    onMenuChoice: ((choice: number) => void) | null;
    private _bg;
    private _portraitArea;
    private _portraitSprite;
    private _msgText;
    private _btnRow;
    private _menuContainer;
    private _inputContainer;
    private _inputText;
    private _inputCursor;
    private _inputValue;
    private _currentType;
    private _quizTimer;
    private _quizTotalTime;
    private _quizText;
    private _menuItems;
    private _pendingQuestId;
    private _pendingNpcId;
    private _pendingX;
    private _pendingY;
    private _sayMsgType;
    playerName: string;
    npcName: ((id: number) => string | null) | null;
    itemName: ((id: number) => string | null) | null;
    mobName: ((id: number) => string | null) | null;
    mapName: ((id: number) => string | null) | null;
    skillName: ((id: number) => string | null) | null;
    constructor();
    loadPortrait(npcWz: any, speakerId: number): void;
    show(text: string, type?: DialogType, sayMsgType?: number): void;
    /** The real wire msgType (0=Say, 1=SayImage) of the dialog on screen — see `_sayMsgType` above. */
    get sayMsgType(): number;
    showQuiz(text: string, hint: string, min: number, max: number, time: number): void;
    showMenu(text: string, choices: string[]): void;
    showAskText(text: string, _default: string, _min: number, _max: number): void;
    showAskAccept(text: string, questId: number, npcId: number, x: number, y: number): void;
    get pendingQuestId(): number;
    get pendingNpcId(): number;
    get pendingX(): number;
    get pendingY(): number;
    showAskNumber(text: string, _default: number, _min: number, _max: number): void;
    onTextInput(ch: string): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    update(dt: number): void;
    private _rebuildButtons;
    private _syncInput;
    private _stripFormats;
    private _rebuildBg;
}
//# sourceMappingURL=NpcTalk.d.ts.map