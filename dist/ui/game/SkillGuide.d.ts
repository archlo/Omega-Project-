import { GamePanel } from './GamePanel.js';
import type { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
export declare class SkillGuide extends GamePanel {
    private _image;
    private _grade;
    private _lastClickTime;
    private _loader;
    private _ui;
    constructor(loader?: WzTextureLoader, ui?: WzPackage | null);
    open(grade: number, _loader?: WzTextureLoader, _ui?: WzPackage | null): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=SkillGuide.d.ts.map