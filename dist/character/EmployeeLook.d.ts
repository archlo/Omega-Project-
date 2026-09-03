import { Container } from 'pixi.js';
import type { DecodedMovePath } from '../net/packet/MovePathDecoder.js';
import type { Foothold } from '../map/Foothold.js';
export declare class EmployeeLook {
    readonly ObjId: number;
    readonly EmployerObjId: number;
    readonly NameTag: string | number | null;
    readonly container: Container<import("pixi.js").ContainerChild>;
    Position: {
        x: number;
        y: number;
    };
    private readonly _replay;
    constructor(ObjId: number, EmployerObjId: number, NameTag?: string | number | null);
    ReplayMove(path: DecodedMovePath): void;
    SetFootholds(footholds: readonly Foothold[]): void;
    Update(dt: number): void;
    private _build;
    private _makeNameTag;
}
//# sourceMappingURL=EmployeeLook.d.ts.map