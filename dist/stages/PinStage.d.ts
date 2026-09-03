import { Stage, MouseButton } from '../app/Stage.js';
import { MapleClaudeGame } from '../MapleClaudeGame.js';
import { WzPackage } from '../wz/WzPackage.js';
/**
 * v95 PIN entry stage — shown when CheckPasswordResult sets skipPinCode=false.
 * Renders `UI.wz/Login.img/Pincode` (backgrnd/text canvases + BtLogin/BtNo
 * buttons), following the same WZ-loading pattern as LoginStage.
 */
export declare class PinStage extends Stage {
    private _digits;
    private _statusText;
    private _cells;
    private _cellTexts;
    private _submitting;
    private _updateMode;
    private _pinEntryEnabled;
    private _ui;
    private _map;
    private _sound;
    private _loader;
    private _dimming;
    private _panelContainer;
    private _errorNotice;
    private _backgroundSprite;
    private _textSprite;
    private _loginBtn;
    private _noBtn;
    private readonly _allButtons;
    constructor(ui: WzPackage, map: WzPackage | null, sound: WzPackage | null);
    onEnter(game: MapleClaudeGame): void;
    onExit(): void;
    draw(): void;
    onMouseMove(x: number, y: number): void;
    onTextInput(character: string): void;
    onKeyPress(key: string): void;
    onMouseButton(x: number, y: number, down: boolean, button: MouseButton): void;
    private _buildPanel;
    private _layoutDigitCells;
    private _loadCanvas;
    private _makeButton;
    private _wireBtnSounds;
    private _submitPin;
    private _cancel;
    private _onCheckPinCodeResult;
    private _onUpdatePinCodeResult;
    private _pinErrorMessage;
    private _refresh;
}
//# sourceMappingURL=PinStage.d.ts.map