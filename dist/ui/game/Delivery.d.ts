import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
export declare class Delivery extends GamePanel {
    OnSendItem: ((slot: number) => void) | null;
    private _background;
    private _font;
    private _allButtons;
    private _tab;
    private _items;
    private _noticeLine;
    private _dynamicChildren;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null);
    Open(tab: number | undefined, items: {
        slot: number;
        name: string;
    }[]): void;
    SetDisallowedQuestList(field1: number, field2: number): void;
    update(_dt: number): void;
    draw(): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=Delivery.d.ts.map