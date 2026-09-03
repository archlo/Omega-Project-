import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzSprite } from '../../render/WzSprite.js';
/** Carnival item (guard/minion/bomb/uncle). */
export interface CarnivalItem {
    index: number;
    itemId: number;
    name: string;
    cost: number;
    icon: WzSprite | null;
}
export interface MonsterCarnivalPanelState {
    team?: number;
    personalCp?: number;
    personalCpTotal?: number;
    personalCpDiff?: number;
    myTeamCp?: number;
    enemyCp?: number;
    enemyCpTotal?: number;
    lastMessage?: string;
}
export declare class MonsterCarnival extends GamePanel {
    onGuardRequest: ((index: number) => void) | null;
    onMinionRequest: ((index: number) => void) | null;
    onBombRequest: ((index: number) => void) | null;
    onUncleRequest: ((index: number) => void) | null;
    onLock: (() => void) | null;
    private _state;
    private _activeTab;
    private _guardItems;
    private _minionItems;
    private _specialItems;
    private _selectedItem;
    private _scrollOffset;
    private _maxCp;
    private _bg;
    private _wzBg;
    private _dynamicChildren;
    private _scrollBar;
    private _itemNameOf;
    constructor(loader: WzTextureLoader, uiWz: WzPackage | null);
    /** Set name resolver. */
    setResolvers(itemNameOf: (id: number) => string): void;
    /** Set carnival items per tab. */
    setItems(tab: number, items: CarnivalItem[]): void;
    /** OG: CUIMonsterCarnival::SetState — update CP display. */
    SetState(state: MonsterCarnivalPanelState): void;
    Clear(): void;
    private _getActiveList;
    private _updateScrollRange;
    private _makeButton;
    private _rebuildBg;
    update(_dt: number): void;
    draw(): void;
    private _drawTabs;
    private _drawItemList;
    /** OG: Draw (0x80D250) — CP display at bottom. */
    private _drawCP;
    handleMouseButton(mx: number, my: number, down: boolean): boolean;
    onMouseMove(_mx: number, _my: number): void;
    handleWheel(_dx: number, dy: number): void;
    onKeyPress(key: string): boolean;
    onResize(w: number, h: number): void;
}
//# sourceMappingURL=MonsterCarnival.d.ts.map