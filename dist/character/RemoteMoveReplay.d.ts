import type { DecodedMovePath } from '../net/packet/MovePathDecoder.js';
import type { Foothold } from '../map/Foothold.js';
export declare class RemoteMoveReplay {
    private readonly _path;
    private _elapsedMs;
    private _active;
    private _footholds;
    private _onElement;
    private _nextElementIndex;
    private _nextElementAtMs;
    SetFootholds(footholds: readonly Foothold[]): void;
    SetPath(path: DecodedMovePath, current: {
        x: number;
        y: number;
    }, onElement?: (moveAction: number, index: number) => void): void;
    Update(dt: number, position: {
        x: number;
        y: number;
    }): boolean;
    private _activateElementsThrough;
}
//# sourceMappingURL=RemoteMoveReplay.d.ts.map