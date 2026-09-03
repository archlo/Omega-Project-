import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
export declare class WorldMap extends GamePanel {
    onTeleportToMap: ((mapId: number) => void) | null;
    onNavigateToMap: ((mapName: string) => void) | null;
    private _mapName;
    private _spots;
    private _links;
    private _mapImage;
    private _questToggle;
    private _bg;
    private _dynamicChildren;
    private _btClose;
    private _btQuestToggle;
    private _loader;
    private _mapWz;
    private _transferMapIds;
    constructor(loader?: WzTextureLoader | null, mapWz?: WzPackage | null);
    /**
     * OG: CWorldMapDlg::LoadInfo (0x9B7B00) — load world map data from WZ.
     * WZ path: Map.wz/WorldMap.img/<mapName>
     */
    openWorldMap(mapName: string): void;
    /**
     * OG: CWorldMapDlg map-transfer support.
     * Opens the world map in transfer mode with clickable map IDs.
     */
    OpenMapTransfer(mapIds: number[]): void;
    private _createButtons;
    private _getStringProp;
    private _getNumProp;
    private _rebuildBg;
    update(_dt: number): void;
    draw(): void;
    private _drawTransferList;
    handleMouseButton(mx: number, my: number, down: boolean): boolean;
    onMouseMove(_mx: number, _my: number): void;
    handleWheel(_dx: number, _dy: number): void;
    onKeyPress(key: string): boolean;
    onResize(_w: number, _h: number): void;
    private _transferIdAt;
}
//# sourceMappingURL=WorldMap.d.ts.map