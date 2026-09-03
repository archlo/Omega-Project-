import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
export declare class Repair extends GamePanel {
    OnRepair: ((slot: number) => void) | null;
    OnRepairAll: (() => void) | null;
    OnClosed: (() => void) | null;
    private _background;
    private _font;
    private _allButtons;
    private _items;
    private _selectedSlot;
    private _dynamicChildren;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null);
    Open(items: {
        slot: number;
        name: string;
        durability: number;
        maxDurability: number;
    }[]): void;
    update(_dt: number): void;
    draw(): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=Repair.d.ts.map