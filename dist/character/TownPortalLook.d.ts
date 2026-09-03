import { Container } from 'pixi.js';
export declare class TownPortalLook {
    readonly ObjId: number;
    State: number;
    readonly CharacterId: number;
    readonly container: Container<import("pixi.js").ContainerChild>;
    Position: {
        x: number;
        y: number;
    };
    constructor(ObjId: number, State: number, CharacterId: number);
    Update(_dt: number): void;
    private _build;
    SetState(state: number): void;
}
//# sourceMappingURL=TownPortalLook.d.ts.map