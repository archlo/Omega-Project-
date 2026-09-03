import { Container } from 'pixi.js';
import { WzSprite } from '../render/WzSprite.js';
export declare class TextField {
    position: {
        x: number;
        y: number;
    };
    width: number;
    height: number;
    private _text;
    set text(v: string);
    get text(): string;
    maxLength: number;
    isPassword: boolean;
    drawBackground: boolean;
    private _enabled;
    get enabled(): boolean;
    set enabled(v: boolean);
    private _isFocused;
    get isFocused(): boolean;
    set isFocused(v: boolean);
    private _hovered;
    get hovered(): boolean;
    /** Optional WZ background sprite, rendered when the field is empty. */
    background: WzSprite | null;
    container: Container;
    private _bg;
    private _bgSprite;
    private _textNode;
    private _cursor;
    private _textColor;
    private _caretColor;
    constructor(background?: WzSprite | null);
    get bounds(): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    set textColor(v: number);
    get textColor(): number;
    set caretColor(v: number);
    get caretColor(): number;
    setPosition(x: number, y: number): void;
    onTextInput(character: string): void;
    onKeyPress(key: string): boolean;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    /** OG: CCtrlEdit::OnMouseEnter — hover tracking. */
    onMouseMove(x: number, y: number): void;
    private _updateDisplay;
    private _updateCursorPos;
    drawBg(): void;
}
//# sourceMappingURL=TextField.d.ts.map