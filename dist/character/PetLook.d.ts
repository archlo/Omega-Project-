import { Container } from 'pixi.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import type { WzPackage } from '../wz/WzPackage.js';
export declare class PetLook {
    readonly TemplateId: number;
    private _anims;
    private _state;
    private _frame;
    private _frameTimer;
    private _facingLeft;
    private _loaded;
    private _speechText;
    private _speechTimer;
    readonly container: Container<import("pixi.js").ContainerChild>;
    Position: {
        x: number;
        y: number;
    };
    Name: string;
    ShowNameTag: boolean;
    constructor(TemplateId: number);
    get IsLoaded(): boolean;
    Load(loader: WzTextureLoader, charWz: WzPackage | null): void;
    Update(dt: number): void;
    SetState(state: string): void;
    PlayAction(action: number): void;
    FaceLeft(left: boolean): void;
    Say(text: string, durationSec?: number): void;
    private _rebuildDisplay;
    private _drawSpeechBubble;
    private _loadFrame;
    private _readDelay;
}
//# sourceMappingURL=PetLook.d.ts.map