import { Container } from 'pixi.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import type { WzPackage } from '../wz/WzPackage.js';
export declare class MorphLook {
    readonly MorphId: number;
    private _frames;
    private _frame;
    private _frameTimer;
    private _loaded;
    readonly container: Container<import("pixi.js").ContainerChild>;
    Position: {
        x: number;
        y: number;
    };
    constructor(MorphId: number);
    Load(loader: WzTextureLoader, morphWz: WzPackage | null, charWz: WzPackage | null): void;
    Update(dt: number): void;
    private _rebuildDisplay;
    Draw(cx: number, cy: number, camX: number, camY: number): void;
}
//# sourceMappingURL=MorphLook.d.ts.map