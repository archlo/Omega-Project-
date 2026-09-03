import { GamePanel } from './GamePanel.js';
export declare class AntiMacroDialog extends GamePanel {
    onSubmit: ((answer: string) => void) | null;
    private _bg;
    private _titleText;
    private _msgText;
    private _sprite;
    private _btnOk;
    private _btnCancel;
    private _isQuestion;
    constructor();
    private _makeButton;
    private _redrawBg;
    /** subType 6: real CAPTCHA — image + free-text answer + OK/Cancel. */
    showQuestion(jpeg: Uint8Array | undefined): void;
    /** subTypes 4/5/7/8/9/10: notice-only, no answer sent either way. */
    showNotice(message: string): void;
    private _confirm;
    private _cancel;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=AntiMacroDialog.d.ts.map