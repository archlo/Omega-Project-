import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { QuestData } from '../../character/QuestInfoService.js';
export declare class QuestDetail extends GamePanel {
    AnchorTopLeft: {
        x: number;
        y: number;
    };
    OnRemoteAccept: ((id: number) => void) | null;
    OnResign: ((id: number) => void) | null;
    OnFindNpc: ((id: number) => void) | null;
    private _loader;
    private _npcWz;
    private _font;
    private _bg;
    private _bg2;
    private _bg3;
    private _summaryBg;
    private _btClose;
    private _btAccept;
    private _btResign;
    private _btFindNpc;
    private _speaker;
    private _speakerNpcId;
    private _quest;
    private _state;
    private _scroll;
    private _draggingThumb;
    private _thumbGrabDy;
    private _wrappedSummary;
    private _prevWheel;
    private _bgLayer;
    private _headerLayer;
    private _bodyLayer;
    private _summaryTexts;
    private _scrollbarG;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, npcWz: WzPackage | null, font: BuiltInFont | null);
    private _buttonFrom;
    /** The currently displayed quest id, or 0 if none. */
    get selectedId(): number;
    SetQuest(data: QuestData | null, state: number): void;
    private get _visibleLines();
    private _clampScroll;
    update(dt: number): void;
    private _drawHeader;
    private _drawBody;
    private _drawScrollbar;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    private _panelRect;
    onKeyPress(key: string): boolean;
    private _canvas;
}
//# sourceMappingURL=QuestDetail.d.ts.map