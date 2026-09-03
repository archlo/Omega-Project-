import { Sprite } from 'pixi.js';
import { WzSprite } from './WzSprite.js';
export interface ISprite {
    draw(x: number, y: number, flipX?: boolean): void;
}
export declare class AnimatedSprite {
    private readonly _frames;
    private readonly _delaysMs;
    private _index;
    private _accumMs;
    private _pixiSprite;
    constructor(frames: WzSprite[], delaysMs: number[]);
    get FrameCount(): number;
    readonly TotalDurationMs: number;
    get Current(): WzSprite;
    get Target(): Sprite;
    Update(dtMs: number): void;
    Draw(x: number, y: number, flipX?: boolean): Sprite;
    private _applyOrigin;
}
//# sourceMappingURL=AnimatedSprite.d.ts.map