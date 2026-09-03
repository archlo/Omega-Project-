import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
export interface TitleInfo {
    main: string;
    sub: string;
}
export declare class TitleWindow extends GamePanel {
    private _background;
    private _font;
    private _mainTitle;
    private _subTitle;
    private _dynamicChildren;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null);
    Set(main: string, sub: string): void;
    update(_dt: number): void;
    draw(): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=TitleWindow.d.ts.map