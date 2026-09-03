import { Container } from 'pixi.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import type { DecodedMovePath } from '../net/packet/MovePathDecoder.js';
import type { Foothold } from '../map/Foothold.js';
export declare class DragonLook {
    readonly OwnerCharId: number;
    readonly container: Container<import("pixi.js").ContainerChild>;
    Position: {
        x: number;
        y: number;
    };
    private _actionTimer;
    private _action;
    private _sprite;
    private _replay;
    constructor(OwnerCharId: number);
    Load(loader: WzTextureLoader, tamingMobWz: WzPackage | null): void;
    SetOwnerPosition(x: number, y: number): void;
    PlayAction(action: number): void;
    ReplayMove(path: DecodedMovePath): void;
    SetFootholds(footholds: readonly Foothold[]): void;
    Update(dt: number): void;
    private _rebuild;
}
//# sourceMappingURL=DragonLook.d.ts.map