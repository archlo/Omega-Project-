import { Application, Container } from 'pixi.js';
import { StageDirector } from './app/StageDirector.js';
import { ClientSession } from './net/session/ClientSession.js';
import { PacketRouter } from './net/session/PacketRouter.js';
import { LoginHandlers } from './net/handlers/LoginHandlers.js';
import { FieldHandlers } from './net/handlers/FieldHandlers.js';
import { CashShopHandlers } from './net/handlers/CashShopHandlers.js';
import { ITCHandlers } from './net/handlers/ITCHandlers.js';
import { MapleTVHandlers } from './net/handlers/MapleTVHandlers.js';
import { TournamentHandlers } from './net/handlers/TournamentHandlers.js';
import { EventHandlers } from './net/handlers/EventHandlers.js';
import { BattleRecordHandlers } from './net/handlers/BattleRecordHandlers.js';
import { MigrationCoordinator } from './net/session/MigrationCoordinator.js';
import { NameService } from './localization/NameService.js';
import { WzPackage } from './wz/WzPackage.js';
import { ListService } from './localization/ListService.js';
import { WzAudioPlayer } from './render/WzAudioPlayer.js';
import { MapleCursor } from './platform/MapleCursor.js';
import { QuestInfoService } from './character/QuestInfoService.js';
export declare class MapleClaudeGame {
    pixiApp: Application;
    stageDirector: StageDirector;
    session: ClientSession;
    loginHandlers: LoginHandlers;
    fieldHandlers: FieldHandlers;
    cashShopHandlers: CashShopHandlers;
    itcHandlers: ITCHandlers;
    mapleTVHandlers: MapleTVHandlers;
    tournamentHandlers: TournamentHandlers;
    eventHandlers: EventHandlers;
    battleRecordHandlers: BattleRecordHandlers;
    migration: MigrationCoordinator;
    router: PacketRouter;
    audioPlayer: WzAudioPlayer;
    cursor: MapleCursor;
    /** Full-width container — FieldScene renders here, spans the whole window. */
    mapContainer: Container;
    /** 800-px-wide container centered in the window — all UI lives here. */
    frameContainer: Container;
    /** When true, the 800x600 frame anchors to the bottom instead of center. */
    bottomAlignFrame: boolean;
    nameService: NameService;
    questInfoService: QuestInfoService | null;
    loginHost: string;
    loginPort: number;
    wzDir?: string;
    wz: {
        ui: WzPackage | null;
        map: WzPackage | null;
        sound: WzPackage | null;
        character: WzPackage | null;
        item: WzPackage | null;
        base: WzPackage | null;
        skill: WzPackage | null;
        etc: WzPackage | null;
        reactor: WzPackage | null;
        tamingMob: WzPackage | null;
        morph: WzPackage | null;
        list: WzPackage | null;
        string: WzPackage | null;
        quest: WzPackage | null;
    };
    listService: ListService | null;
    /** Pixels from the left edge of the canvas to the left edge of the 800-px frame. */
    get uiOffset(): number;
    private _updateErrCount;
    private _prevKeys;
    /** Currently-held keyboard keys (event.key values, for continuous input like movement). */
    get heldKeys(): ReadonlySet<string>;
    /** Scale + center the 800x600 UI frame to fill the window. */
    _updateFrameTransform(): void;
    /** Uniform scale factor applied to the 800x600 UI frame. */
    get frameScale(): number;
    /** Convert raw canvas coords to 800x600 frame coords (accounts for scale + offset). */
    private _canvasToFrame;
    constructor();
    init(canvasId: string): Promise<void>;
    private _update;
    shutdown(): void;
}
//# sourceMappingURL=MapleClaudeGame.d.ts.map