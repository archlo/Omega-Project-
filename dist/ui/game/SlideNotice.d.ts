import { GamePanel } from './GamePanel.js';
export declare class SlideNotice extends GamePanel {
    private _bg;
    private _text;
    private _textOffsetX;
    private _textFullWidth;
    private _active;
    constructor();
    show(text: string, screenW: number): void;
    hide(): void;
    update(dt: number): void;
}
//# sourceMappingURL=SlideNotice.d.ts.map