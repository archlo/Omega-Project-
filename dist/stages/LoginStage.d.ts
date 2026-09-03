import { Stage, MouseButton } from '../app/Stage.js';
import { MapleClaudeGame } from '../MapleClaudeGame.js';
import { WzPackage } from '../wz/WzPackage.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
/**
 * Real v95 login stage. Renders `UI.wz/MapLogin1.img` as the backdrop with the
 * signboard panel overlaid in the centre, using the v95 GMS English button set
 * under `Login.img/Title/*`. ID and PW fields accept typed input; Login
 * connects to the configured Kinoko server.
 *
 * Ports `src/MapleClaude/Stages/LoginStage.cs` to Pixi/TS.
 */
export declare class LoginStage extends Stage {
    private static readonly SIGNBOARD_CENTER;
    private static readonly CAMERA_OFFSET;
    private static readonly ID_OFFSET;
    private static readonly PW_OFFSET;
    private static readonly LOGIN_BTN_OFFSET;
    private static readonly CHECK_OFFSET;
    private static readonly SAVE_TEXT_OFFSET;
    private static readonly LOST_ID_OFFSET;
    private static readonly LOST_PW_OFFSET;
    private static readonly NEW_OFFSET;
    private static readonly HOME_OFFSET;
    private static readonly QUIT_OFFSET;
    private _statusLabel;
    private _statusText;
    private _idField;
    private _pwField;
    private _saveCheck;
    private _loginBtn;
    private _connecting;
    private _bg;
    private _ui;
    private _map;
    private _sound;
    private _loader;
    private _scene;
    private _signboard;
    private _signboardSprite;
    private _commonFrame;
    private _commonFrameSprite;
    private readonly _allButtons;
    private _loginWait;
    private _errorNotice;
    private _mapContainer;
    private _panelContainer;
    constructor(ui: WzPackage, map: WzPackage | null, sound: WzPackage | null, loader: WzTextureLoader);
    onEnter(game: MapleClaudeGame): void;
    /** Called once Map/Sound finish loading in the background, if they weren't ready yet at construction. */
    attachMapSound(map: WzPackage, sound: WzPackage): void;
    onExit(): void;
    update(dt: number): void;
    draw(): void;
    onMouseMove(x: number, y: number): void;
    onTextInput(character: string): void;
    onMouseButton(x: number, y: number, down: boolean, button: MouseButton): void;
    onKeyPress(key: string): void;
    private _buildLoginPanel;
    private _buildMapScene;
    private _loadCursor;
    private _wireBtnSounds;
    private _loadCanvas;
    private _makeButton;
    private beginLogin;
    private onHandshake;
    private onCheckPasswordResult;
    /** CLogin::OnAccountInfoResult resultType 14/15 — SSN/DOB registration
     *  required. OG shows a YesNo dialog + opens a website, then terminates. */
    private onAccountInfoResult;
    private onWorldListComplete;
    private onDisconnected;
    private _updateStatus;
    private _loginErrorMessage;
}
//# sourceMappingURL=LoginStage.d.ts.map