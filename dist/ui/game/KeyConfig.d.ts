import { GamePanel } from './GamePanel.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzSprite } from '../../render/WzSprite.js';
import { FuncKeyType } from '../../domain/FuncKeyMapped.js';
import type { DragTarget } from '../DragController.js';
export declare enum KeyAction {
    None = -1,
    Equipment = 0,
    Items = 1,
    Stats = 2,
    Skills = 3,
    Friends = 4,
    WorldMap = 5,
    MapleChat = 6,
    MiniMap = 7,
    QuestLog = 8,
    KeyBindings = 9,
    Say = 10,
    Whisper = 11,
    PartyChat = 12,
    FriendsChat = 13,
    Menu = 14,
    QuickSlots = 15,
    ToggleChat = 16,
    Guild = 17,
    GuildChat = 18,
    Party = 19,
    Notifier = 20,
    SpouseChat = 21,
    CashShop = 22,
    AllianceChat = 24,
    ManageLegion = 25,
    Family = 26,
    BossParty = 27,
    ExpeditionChat = 29,
    CharInfo = 44,
    ChangeChannel = 45,
    MainMenu = 46,
    Screenshot = 47,
    PickUp = 50,
    Sit = 51,
    Attack = 52,
    Jump = 53,
    Interact = 54,
    MoveLeft = 1002,
    MoveRight = 1003
}
type FuncKeyMappedRecord = {
    type: FuncKeyType;
    id: number;
};
export declare class KeyConfig extends GamePanel implements DragTarget {
    private readonly _map;
    private readonly _mapOnOpen;
    private readonly _loader;
    private readonly _kc;
    private readonly _kc2;
    private readonly _iconRoot;
    private readonly _bg;
    private readonly _bg2;
    private readonly _bg3;
    private readonly _iconCache;
    private readonly _keyCells;
    private readonly _font;
    private readonly _btClose;
    private readonly _btHelp;
    private readonly _btOk;
    private readonly _btCancel;
    private readonly _btDefault;
    private readonly _btDelete;
    private readonly _btQuickSlot;
    private readonly _allButtons;
    private _noticeBgs;
    private _qsBg;
    private _qsBtOK;
    private _qsBtCancel;
    private _qsBtQuickSetting;
    private _dragActive;
    private _dragIcon;
    private _dragFromScancode;
    private _dragMouseX;
    private _dragMouseY;
    private _selectedKeySc;
    private _windowDrag;
    private _windowDragOffX;
    private _windowDragOffY;
    private _confirm;
    private readonly _panelW;
    private readonly _panelH;
    private readonly _gfx;
    private readonly _content;
    onBindingsChanged: (() => void) | null;
    onSaveToServer: ((changed: {
        index: number;
        fk: FuncKeyMappedRecord;
    }[]) => void) | null;
    onOpenQuickSlot: (() => void) | null;
    skillIconResolver: ((skillId: number) => WzSprite | null) | null;
    itemIconResolver: ((itemId: number) => WzSprite | null) | null;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null);
    private _loadCanvas;
    private _makeBtn;
    private _makeQsBtn;
    forKey(keyCode: string): FuncKeyMappedRecord;
    isActionDown(isKeyDown: (key: string) => boolean, action: KeyAction): boolean;
    private _anyHeld;
    private _rightMod;
    exportMap(): FuncKeyMappedRecord[];
    importMap(map: FuncKeyMappedRecord[] | null): void;
    applyServerKeymap(entries: {
        keyIndex: number;
        type: number;
        actionId: number;
    }[]): void;
    open(): void;
    bindingAt(scancode: number): FuncKeyMappedRecord;
    bindSkillToKey(scancode: number, skillId: number): void;
    bindItemToKey(scancode: number, itemId: number): void;
    tryBindSkillAt(skillId: number, screenX: number, screenY: number): boolean;
    tryAcceptDrag(payload: unknown, x: number, y: number): boolean;
    tryBindItemAt(itemId: number, screenX: number, screenY: number): boolean;
    update(_dt: number): void;
    onMouseMove(x: number, y: number): void;
    draw(): void;
    private _drawKeyIcons;
    private _drawKeyCells;
    private _drawPalette;
    private _isPlaced;
    private _drawIconAt;
    private _drawPlaceholder;
    private _iconFor;
    private _loadIcon;
    private _loadKeyCell;
    private _drawConfirm;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private _layoutButtons;
    private _finishDrag;
    private _cancelDrag;
    private _handleConfirmClick;
    private _applyConfirm;
    private _closeOk;
    private _closeCancel;
    private _closeInternal;
    private _loadDefaultMap;
    private _snapshotOpen;
    private _isBound;
    private _actionToFk;
    private _keysToScanCode;
    private _scanCodeToKey;
}
export {};
//# sourceMappingURL=KeyConfig.d.ts.map