import { Container } from 'pixi.js';
export interface DeleteConfirmResult {
    confirmed: boolean;
    secondaryPassword: string;
}
export declare class DeleteConfirmOverlay {
    readonly container: Container<import("pixi.js").ContainerChild>;
    private _resolve;
    private _spw;
    private _spwText;
    private _statusText;
    private _promptText;
    constructor();
    show(): Promise<DeleteConfirmResult>;
    onKeyPress(key: string): boolean;
    onMouseButton(x: number, y: number, down: boolean): boolean;
    private _confirm;
    private _cancel;
    private _makeButton;
}
//# sourceMappingURL=DeleteConfirmOverlay.d.ts.map