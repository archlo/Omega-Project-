import { Container } from 'pixi.js';
import { BuiltInFont } from './BuiltInFont.js';
export declare class MuteButton {
    private _isMuted;
    private _onToggle;
    private _font;
    private _bounds;
    private _hover;
    private _pressedInside;
    private _container;
    private _g;
    constructor(isMuted: () => boolean, onToggle: () => void, font: BuiltInFont | null);
    get container(): Container;
    SetMouse(x: number, y: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    ServiceAndDraw(viewW: number, _viewH: number): void;
}
//# sourceMappingURL=MuteButton.d.ts.map