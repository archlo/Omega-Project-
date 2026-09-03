import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
export interface MonsterCard {
    mobId: number;
    name: string;
    level: number;
    caught: boolean;
    count: number;
}
export declare class MonsterBook extends GamePanel {
    private _background;
    private _font;
    private _cards;
    private _scroll;
    private _selected;
    private _total;
    private _caught;
    private _dynamicChildren;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null);
    Open(cards: MonsterCard[], total: number, caught: number): void;
    update(_dt: number): void;
    draw(): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private _rebuildBackground;
    private _drawStats;
    private _drawCards;
}
//# sourceMappingURL=MonsterBook.d.ts.map