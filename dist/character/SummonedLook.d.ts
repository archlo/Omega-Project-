import { Container } from 'pixi.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import type { WzPackage } from '../wz/WzPackage.js';
import type { DecodedMovePath } from '../net/packet/MovePathDecoder.js';
import type { Foothold } from '../map/Foothold.js';
export declare class SummonedLook {
    readonly ObjId: number;
    readonly CharId: number;
    SkillId: number;
    private _anims;
    private _curAction;
    private _frame;
    private _frameTimer;
    private _loaded;
    private readonly _replay;
    readonly container: Container<import("pixi.js").ContainerChild>;
    Position: {
        x: number;
        y: number;
    };
    FootholdId: number;
    MoveAction: number;
    FacingLeft: boolean;
    constructor(ObjId: number, CharId: number, SkillId: number);
    Load(loader: WzTextureLoader, skillWz: WzPackage | null): void;
    SetAction(action: string): void;
    /** CSummoned::MoveAction2RawAction: raw action is selected from nMA >> 1. */
    SetMoveAction(moveAction: number): void;
    get CurrentAction(): string;
    ReplayMove(path: DecodedMovePath): void;
    SetFootholds(footholds: readonly Foothold[]): void;
    Update(dt: number): void;
    private _rebuildDisplay;
}
//# sourceMappingURL=SummonedLook.d.ts.map