import { Container } from 'pixi.js';
export declare class AffectedAreaLook {
    readonly ObjId: number;
    readonly Type: number;
    readonly OwnerId: number;
    readonly SkillId: number;
    readonly SkillLevel: number;
    left: number;
    top: number;
    right: number;
    bottom: number;
    readonly container: Container<import("pixi.js").ContainerChild>;
    Position: {
        x: number;
        y: number;
    };
    constructor(ObjId: number, Type: number, OwnerId: number, SkillId: number, SkillLevel: number, left: number, top: number, right: number, bottom: number);
    Update(_dt: number): void;
    private _build;
}
//# sourceMappingURL=AffectedAreaLook.d.ts.map