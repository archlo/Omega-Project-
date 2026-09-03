import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
interface RecommendWorldInfo {
    id: number;
    name: string;
    recommended: boolean;
    eventDescription?: string;
}
export declare class RecommendWorld extends GamePanel {
    private _bg;
    private _wzBg;
    private _worlds;
    private _selectedWorld;
    onWorldSelect: ((worldId: number) => void) | null;
    onClose: (() => void) | null;
    constructor(opts?: {
        loader?: WzTextureLoader;
        uiWz?: WzPackage | null;
    });
    setWorlds(worlds: RecommendWorldInfo[]): void;
    private _rebuildWorldList;
    resetWorldAndMessage(reset: boolean): void;
    handleMouseButton(x: number, y: number, _down: boolean): boolean;
    onKeyPress(key: string): boolean;
    update(_dt: number): void;
}
export {};
//# sourceMappingURL=RecommendWorld.d.ts.map