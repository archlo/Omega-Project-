import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
export declare class EnchantSkill extends GamePanel {
    OnEnchant: ((slot: number) => void) | null;
    private _background;
    private _font;
    private _allButtons;
    private _skills;
    private _selectedSlot;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null);
    Open(skills: {
        slot: number;
        name: string;
        level: number;
        maxLevel: number;
    }[]): void;
    update(_dt: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=EnchantSkill.d.ts.map