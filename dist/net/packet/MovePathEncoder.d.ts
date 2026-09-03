export interface MoveElement {
    attr: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    fh: number;
    fhFallStart: number;
    xOffset: number;
    yOffset: number;
    stat: number;
    moveAction: number;
    elapse: number;
}
export declare function EncodeMovePath(originX: number, originY: number, originVx: number, originVy: number, elements: MoveElement[]): Uint8Array;
//# sourceMappingURL=MovePathEncoder.d.ts.map