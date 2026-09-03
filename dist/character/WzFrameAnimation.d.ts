import type { WzSprite } from '../render/WzSprite.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
export interface AnimFrame {
    sprite: WzSprite;
    delayMs: number;
}
/** Loads a one-shot frame sequence from an already-resolved WZ node (the
    caller does its own `wz.GetItem(path)` first): either a single
    `WzCanvas`, or a `WzProperty` with numeric-keyed canvas children — gaps
    allowed (e.g. Skill.wz effect nodes that skip 19-26 then resume at 27).
    Falls back to treating `root` itself as one frame when it has no
    numeric children at all. */
export declare function loadFrameSequence(loader: WzTextureLoader, root: unknown, defaultDelay?: number, singleFallbackDelay?: number): AnimFrame[];
export declare function totalDurationMs(frames: AnimFrame[]): number;
//# sourceMappingURL=WzFrameAnimation.d.ts.map