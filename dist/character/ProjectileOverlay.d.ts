import { Container } from 'pixi.js';
import { AnimFrame } from './WzFrameAnimation.js';
export declare class ProjectileOverlay {
    private _entries;
    private _chainEntries;
    Spawn(x1: number, y1: number, x2: number, y2: number, durationMs?: number, frames?: AnimFrame[], fadeOut?: boolean): void;
    SpawnChainLightning(points: {
        x: number;
        y: number;
    }[], durationMs?: number): void;
    Clear(): void;
    Update(dt: number): void;
    RebuildDisplay(worldToScreen: (wx: number, wy: number) => {
        x: number;
        y: number;
    }): Container;
    private _drawChain;
}
//# sourceMappingURL=ProjectileOverlay.d.ts.map