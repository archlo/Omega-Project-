import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
export declare class Maker extends GamePanel {
    OnStart: ((recipeId: number) => void) | null;
    static BuildRecipeList(etcWz: WzPackage | null, itemName: (id: number) => string | undefined, max?: number): {
        id: number;
        name: string;
    }[];
    private _background;
    private _font;
    private _allButtons;
    private _btStart;
    private _btCancel;
    private _selectedRecipe;
    private _recipes;
    private _dynamicChildren;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null);
    Open(recipes: {
        id: number;
        name: string;
    }[]): void;
    SetResult(recipeId: number, success: boolean, items: Array<{
        itemId: number;
        count: number;
    }>): void;
    private _doStart;
    update(_dt: number): void;
    draw(): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private _drawRecipeList;
    private _drawButtons;
    private _makeButton;
}
//# sourceMappingURL=Maker.d.ts.map