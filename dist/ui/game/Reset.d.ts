import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
export declare class Reset extends GamePanel {
    OnApUp: ((stat: string) => void) | null;
    OnSpUp: ((skillId: number) => void) | null;
    private _background;
    private _font;
    private _allButtons;
    private _stats;
    private _ap;
    private _sp;
    private _mode;
    private _dynamicChildren;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null);
    OpenAp(stats: {
        str: number;
        dex: number;
        int: number;
        luk: number;
    }, ap: number): void;
    OpenSp(sp: number): void;
    update(_dt: number): void;
    draw(): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private _drawStats;
}
//# sourceMappingURL=Reset.d.ts.map