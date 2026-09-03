import { WzSprite } from '../render/WzSprite.js';
export interface ICanvasSprite {
    width: number;
    height: number;
}
export interface MiniMapFoothold {
    footholdId: number;
    layer: number;
}
export interface MiniMapLadderRope {
    x: number;
    y1: number;
    y2: number;
    isLadder: boolean;
}
export declare class MiniMapData {
    readonly Canvas: WzSprite | null;
    readonly Mark: WzSprite | null;
    readonly Width: number;
    readonly Height: number;
    readonly CenterX: number;
    readonly CenterY: number;
    readonly Mag: number;
    readonly Footholds: MiniMapFoothold[];
    readonly LadderRopes: MiniMapLadderRope[];
    readonly Real_W: number;
    readonly Real_H: number;
    readonly Real_CX: number;
    readonly Real_CY: number;
    readonly Mag_Normal: number;
    readonly Mag_2X: number;
    constructor(Canvas: WzSprite | null, Mark: WzSprite | null, Width: number, Height: number, CenterX: number, CenterY: number, Mag?: number, Footholds?: MiniMapFoothold[], LadderRopes?: MiniMapLadderRope[], realW?: number, realH?: number, realCX?: number, realCY?: number, magNormal?: number, mag2X?: number);
    get CanvasWidth(): number;
    get CanvasHeight(): number;
    WorldToCanvas(world: {
        x: number;
        y: number;
    }): {
        x: number;
        y: number;
    };
    WorldToCanvasAtMag(world: {
        x: number;
        y: number;
    }, mag: number): {
        x: number;
        y: number;
    };
}
//# sourceMappingURL=MiniMapData.d.ts.map