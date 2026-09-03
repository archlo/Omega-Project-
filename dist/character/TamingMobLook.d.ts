import { Container } from 'pixi.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import type { WzPackage } from '../wz/WzPackage.js';
export declare class TamingMobLook {
    readonly TemplateId: number;
    private _anims;
    private _curAction;
    private _frame;
    private _frameTimer;
    private _loaded;
    readonly container: Container<import("pixi.js").ContainerChild>;
    Position: {
        x: number;
        y: number;
    };
    constructor(TemplateId: number);
    Load(loader: WzTextureLoader, tamingWz: WzPackage | null): void;
    SetAction(action: string): void;
    Update(dt: number): void;
    private _rebuildDisplay;
}
//# sourceMappingURL=TamingMobLook.d.ts.map