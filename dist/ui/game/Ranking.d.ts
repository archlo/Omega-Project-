import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
export interface RankingEntry {
    rank: number;
    name: string;
    level: number;
    job: string;
    value: number;
}
export declare class Ranking extends GamePanel {
    private _background;
    private _font;
    private _tab;
    private _entries;
    private _rows;
    private _dynamicChildren;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null);
    Open(tab: number | undefined, entries: RankingEntry[]): void;
    update(_dt: number): void;
    draw(): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private _rebuildBackground;
    private _drawTabs;
    private _drawRows;
}
//# sourceMappingURL=Ranking.d.ts.map