import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
export declare class QuestLog extends GamePanel {
    private _bg;
    private _wzBg;
    private _tabText;
    private _filterButtons;
    private _activeTab;
    private _scrollOffset;
    private _maxScroll;
    private _dragScroll;
    private _dragX;
    private _dragY;
    private _dragging;
    private _prevWheel;
    private _groups;
    private _entries;
    private _selected;
    /** Resolves a quest id to a display name. */
    nameOf: (id: number) => string;
    /** Fired when a quest row is clicked. The stage opens the companion QuestDetail panel. */
    onSelectQuest: ((id: number) => void) | null;
    /** Currently selected quest id (or -1). Read-only from outside. */
    get selectedId(): number;
    private _levelFilters;
    constructor(opts?: {
        loader?: WzTextureLoader;
        uiWz?: WzPackage | null;
    });
    private _setupFilterButtons;
    /** Replace quest data from server. Each entry: { name, quests }. */
    setQuests(groups: {
        name: string;
        quests: number[];
    }[]): void;
    private _rebuildEntries;
    private _recalcScroll;
    private _totalRows;
    update(_dt: number): void;
    draw(): void;
    private _drawTabs;
    private _drawFilterHighlight;
    private _drawQuestList;
    private _drawScrollbar;
    setPosition(x: number, y: number): void;
    handleMouseButton(mx: number, my: number, down: boolean): boolean;
    onMouseMove(mx: number, my: number): void;
    handleWheel(dx: number, dy: number): void;
    /** GameStage doesn't forward wheel events to panels — poll the same global
        `window.__wheelDelta`/`__mouseX/Y` stash QuestDetail.ts already uses. */
    private _pollWheel;
    private _setScrollFromY;
    /** Resolve a click in content space to a quest id (0 if no hit). */
    private _hitTestQuest;
    onKeyPress(key: string): boolean;
    onResize(w: number, h: number): void;
    private _rebuildBg;
}
//# sourceMappingURL=QuestLog.d.ts.map