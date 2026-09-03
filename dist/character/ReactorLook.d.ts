import { Container } from 'pixi.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import type { WzPackage } from '../wz/WzPackage.js';
export declare class ReactorLook {
    readonly ObjId: number;
    readonly TemplateId: number;
    State: number;
    private _anims;
    private _curState;
    private _frame;
    private _frameTimer;
    private _loaded;
    readonly container: Container<import("pixi.js").ContainerChild>;
    Position: {
        x: number;
        y: number;
    };
    constructor(ObjId: number, TemplateId: number, State: number);
    Load(loader: WzTextureLoader, reactorWz: WzPackage | null): void;
    private _loadStates;
    private _loader;
    LoadWith(loader: WzTextureLoader, reactorWz: WzPackage | null): void;
    SetState(state: number): void;
    Update(dt: number): void;
    private _rebuildDisplay;
}
//# sourceMappingURL=ReactorLook.d.ts.map