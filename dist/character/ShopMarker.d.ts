import { Container } from 'pixi.js';
import { ItemIconLoader } from './ItemIconLoader.js';
export declare class ShopMarker {
    private _icons;
    private _entries;
    constructor(_icons: ItemIconLoader | null);
    Add(id: number, itemId: number, characterName: string, hope: string, x: number, y: number): void;
    Remove(id: number): void;
    Clear(): void;
    RebuildDisplay(findWorldPos: (characterName: string) => {
        x: number;
        y: number;
    } | null, worldToScreen: (wx: number, wy: number) => {
        x: number;
        y: number;
    }): Container;
}
//# sourceMappingURL=ShopMarker.d.ts.map