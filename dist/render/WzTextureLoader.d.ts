import { WzCanvas } from '../wz/WzCanvas.js';
import { WzSprite } from './WzSprite.js';
import { AnimatedSprite } from './AnimatedSprite.js';
export declare class WzTextureLoader {
    private _cache;
    private _failed;
    Load(canvas: WzCanvas | null): WzSprite | null;
    LoadAnimation(node: unknown): AnimatedSprite | null;
    private _readDelay;
    Dispose(): void;
}
//# sourceMappingURL=WzTextureLoader.d.ts.map