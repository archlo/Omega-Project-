import { Overlay } from './Overlay.js';
export declare class QuitConfirmOverlay extends Overlay {
    onYes: (() => void) | null;
    onNo: (() => void) | null;
    private _prompt;
    constructor();
    handleMouseButton(x: number, y: number, down: boolean): void;
    onKeyPress(key: string): void;
}
//# sourceMappingURL=QuitConfirmOverlay.d.ts.map