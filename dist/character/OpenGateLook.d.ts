import { Container } from 'pixi.js';
export declare class OpenGateLook {
    readonly CharacterId: number;
    State: number;
    readonly First: boolean;
    readonly container: Container<import("pixi.js").ContainerChild>;
    Position: {
        x: number;
        y: number;
    };
    private _animTimer;
    private _pulse;
    constructor(CharacterId: number, State: number, First: boolean);
    Update(dt: number): void;
    SetState(state: number): void;
    private _build;
}
//# sourceMappingURL=OpenGateLook.d.ts.map