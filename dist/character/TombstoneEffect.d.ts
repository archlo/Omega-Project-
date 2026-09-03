import { Container } from 'pixi.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzAudioPlayer } from '../render/WzAudioPlayer.js';
export declare class TombstoneEffect {
    readonly container: Container<import("pixi.js").ContainerChild>;
    private _sprite;
    private _effectWz;
    private _soundWz;
    private _loader;
    private _audio;
    private _fallFrames;
    private _landFrames;
    private _burialSound;
    private _world;
    private _frameIndex;
    private _frameTimerMs;
    private _fellDown;
    private _soundPlayed;
    Started: boolean;
    Landed: boolean;
    OnLanded: (() => void) | null;
    constructor(effectWz: WzPackage | null, soundWz: WzPackage | null, loader: WzTextureLoader, audio: WzAudioPlayer | null);
    Spawn(foothold: {
        x: number;
        y: number;
    }): void;
    Reset(): void;
    Update(dt: number): void;
    /** Rebuild the pixi display for the current frame. Call each frame after
        Update, with the live world->screen transform (the tombstone has a
        fixed world position, same as DamageNumber/EmotionBubble). */
    Draw(worldToScreen: (wx: number, wy: number) => {
        x: number;
        y: number;
    }): void;
    private _land;
    private _loadFrames;
}
//# sourceMappingURL=TombstoneEffect.d.ts.map