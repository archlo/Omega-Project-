import { TextStyle } from 'pixi.js';
export declare class BuiltInFont {
    private _style;
    private _canvasCtx;
    constructor(size?: number);
    get lineHeight(): number;
    measure(text: string): {
        x: number;
        y: number;
    };
    get style(): TextStyle;
    private _ctx;
    wrapToWidth(text: string, maxWidth: number): string[];
    truncateToWidth(text: string, maxWidth: number): string;
}
//# sourceMappingURL=BuiltInFont.d.ts.map