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
import { SplashStage } from './stages/SplashStage.js';
import { MachineIdProvider } from './net/session/MachineId.js';
import { NameService } from './localization/NameService.js';
import { WzPackage } from './wz/WzPackage.js';
import { WzAudioPlayer } from './render/WzAudioPlayer.js';
import { MapleCursor } from './platform/MapleCursor.js';
import { QuestInfoService } from './character/QuestInfoService.js';
export class MapleClaudeGame {
    pixiApp;
    stageDirector;
    session;
    loginHandlers;
    fieldHandlers;
    cashShopHandlers;
    itcHandlers;
    mapleTVHandlers;
    tournamentHandlers;
    eventHandlers;
    battleRecordHandlers;
    migration;
    router;
    audioPlayer;
    cursor;
    /** Full-width container — FieldScene renders here, spans the whole window. */
    mapContainer;
    /** 800-px-wide container centered in the window — all UI lives here. */
    frameContainer;
    /** When true, the 800x600 frame anchors to the bottom instead of center. */
    bottomAlignFrame = false;
    nameService;
    questInfoService = null;
    loginHost = '127.0.0.1';
    loginPort = 8484;
    wzDir;
    wz = { ui: null, map: null, sound: null, character: null, item: null, base: null, skill: null, etc: null, reactor: null, tamingMob: null, morph: null, list: null, string: null, quest: null };
    listService = null;
    /** Pixels from the left edge of the canvas to the left edge of the 800-px frame. */
    get uiOffset() {
        try {
            const sw = this.pixiApp?.screen.width ?? 800;
            const sh = this.pixiApp?.screen.height ?? 600;
            const scale = Math.min(sw / 800, sh / 600, 1);
            return Math.max(0, Math.floor((sw - 800 * scale) / 2));
        }
        catch {
            return 0;
        }
    }
    _updateErrCount = 0;
    _prevKeys = new Set();
    /** Currently-held keyboard keys (event.key values, for continuous input like movement). */
    get heldKeys() { return this._prevKeys; }
    /** Scale + center the 800x600 UI frame to fill the window. */
    _updateFrameTransform() {
        const sw = this.pixiApp.screen.width;
        const sh = this.pixiApp.screen.height;
        const scale = Math.min(sw / 800, sh / 600, 1);
        this.frameContainer.scale.set(scale);
        this.frameContainer.x = Math.floor((sw - 800 * scale) / 2);
        this.frameContainer.y = this.bottomAlignFrame
            ? Math.floor(sh - 600 * scale)
            : Math.floor((sh - 600 * scale) / 2);
    }
    /** Uniform scale factor applied to the 800x600 UI frame. */
    get frameScale() {
        try {
            const sw = this.pixiApp?.screen.width ?? 800;
            const sh = this.pixiApp?.screen.height ?? 600;
            return Math.min(sw / 800, sh / 600, 1);
        }
        catch {
            return 1;
        }
    }
    /** Convert raw canvas coords to 800x600 frame coords (accounts for scale + offset). */
    _canvasToFrame(cx, cy) {
        const scale = this.frameScale;
        return {
            x: (cx - this.frameContainer.x) / scale,
            y: (cy - this.frameContainer.y) / scale,
        };
    }
    constructor() {
        this.router = new PacketRouter();
        this.session = new ClientSession(this.router);
        this.loginHandlers = new LoginHandlers(this.session);
        this.fieldHandlers = new FieldHandlers();
        this.cashShopHandlers = new CashShopHandlers();
        this.itcHandlers = new ITCHandlers();
        this.mapleTVHandlers = new MapleTVHandlers();
        this.tournamentHandlers = new TournamentHandlers();
        this.eventHandlers = new EventHandlers();
        this.battleRecordHandlers = new BattleRecordHandlers();
        this.migration = new MigrationCoordinator(this.session);
        this.stageDirector = new StageDirector(this);
        this.audioPlayer = new WzAudioPlayer();
        this.cursor = new MapleCursor();
        this.nameService = new NameService(() => {
            if (!this.wzDir)
                return null;
            return WzPackage.OpenBase(this.wzDir, 'String');
        }, () => {
            if (!this.wzDir)
                return null;
            return WzPackage.OpenBase(this.wzDir, 'Quest');
        });
        this.questInfoService = new QuestInfoService(() => {
            if (!this.wzDir)
                return null;
            return WzPackage.OpenBase(this.wzDir, 'Quest');
        });
    }
    async init(canvasId) {
        const initW = typeof window !== 'undefined' ? window.innerWidth : 800;
        const initH = typeof window !== 'undefined' ? window.innerHeight : 600;
        this.pixiApp = new Application();
        await this.pixiApp.init({
            width: initW,
            height: initH,
            backgroundColor: 0x000000,
            canvas: document.getElementById(canvasId),
            antialias: false,
            resolution: 1,
            autoDensity: false,
        });
        // Layer order: full-width map → centered 800px UI → cursor
        this.mapContainer = new Container();
        this.frameContainer = new Container();
        this.pixiApp.stage.addChild(this.mapContainer);
        this.pixiApp.stage.addChild(this.frameContainer);
        this._updateFrameTransform();
        const canvas = document.getElementById(canvasId);
        canvas.style.cursor = 'none';
        this.pixiApp.stage.addChild(this.cursor.container);
        canvas.style.cursor = 'none';
        this.pixiApp.stage.addChild(this.cursor.container);
        // Keyboard
        document.addEventListener('keydown', (e) => {
            // OG: prevent browser defaults for game keys (Alt→menu, Tab→focus, F1-F12→help, Space→scroll)
            if (e.altKey || e.key === 'Tab' || e.key.startsWith('F') && /^F\d{1,2}$/.test(e.key)
                || e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown'
                || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
            }
            if (!this._prevKeys.has(e.key)) {
                this.stageDirector.onKeyPress(e.key);
            }
            this._prevKeys.add(e.key);
        });
        document.addEventListener('keyup', (e) => { this._prevKeys.delete(e.key); });
        window.addEventListener('blur', () => { this._prevKeys.clear(); });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden)
                this._prevKeys.clear();
        });
        document.addEventListener('keypress', (e) => { this.stageDirector.onTextInput(e.key); });
        // Mouse — cursor gets raw canvas coords; __mouseX/Y and stages get
        // frame-relative coords so UI hit-tests and panel dragging work.
        const toCanvas = (cx, cy) => {
            const r = canvas.getBoundingClientRect();
            return { x: cx - r.left, y: cy - r.top };
        };
        document.addEventListener('mousemove', (e) => {
            const { x, y } = toCanvas(e.clientX, e.clientY);
            this.cursor.container.position.set(x, y);
            const f = this._canvasToFrame(x, y);
            window.__mouseX = f.x;
            window.__mouseY = f.y;
            this.stageDirector.onMouseMove(f.x, f.y);
        });
        document.addEventListener('mousedown', (e) => {
            const { x, y } = toCanvas(e.clientX, e.clientY);
            this.cursor.setClicked(true);
            const f = this._canvasToFrame(x, y);
            window.__mouseX = f.x;
            window.__mouseY = f.y;
            window.__shiftKey = e.shiftKey;
            window.__ctrlKey = e.ctrlKey;
            window.__altKey = e.altKey;
            this.stageDirector.onMouseButton(f.x, f.y, true, e.button);
        });
        document.addEventListener('mouseup', (e) => {
            const { x, y } = toCanvas(e.clientX, e.clientY);
            this.cursor.setClicked(false);
            const f = this._canvasToFrame(x, y);
            window.__mouseX = f.x;
            window.__mouseY = f.y;
            window.__shiftKey = e.shiftKey;
            window.__ctrlKey = e.ctrlKey;
            window.__altKey = e.altKey;
            this.stageDirector.onMouseButton(f.x, f.y, false, e.button);
        });
        document.addEventListener('wheel', (e) => {
            window.__wheelDelta = e.deltaY;
            const { x, y } = toCanvas(e.clientX, e.clientY);
            const f = this._canvasToFrame(x, y);
            this.stageDirector.onMouseWheel(f.x, f.y, e.deltaY);
        });
        // Resize
        window.addEventListener('resize', () => {
            const nw = window.innerWidth;
            const nh = window.innerHeight;
            this.pixiApp.renderer.resize(nw, nh);
            this._updateFrameTransform();
            this.stageDirector.onResize(nw, nh);
        });
        await MachineIdProvider.Init();
        this.session.machineId = MachineIdProvider.GetMachineId();
        this.loginHandlers.register(this.router);
        this.fieldHandlers.register(this.router);
        this.cashShopHandlers.register(this.router);
        this.itcHandlers.register(this.router);
        this.mapleTVHandlers.register(this.router);
        this.tournamentHandlers.register(this.router);
        this.eventHandlers.register(this.router);
        this.battleRecordHandlers.register(this.router);
        this.stageDirector.replace(new SplashStage());
        this.pixiApp.ticker.add(() => this._update());
    }
    _update() {
        this.session.drainInbound();
        const dt = Math.min(this.pixiApp.ticker.deltaMS / 1000, 1 / 30);
        this.cursor.update(dt);
        try {
            this.stageDirector.update(dt);
            this.stageDirector.draw();
        }
        catch (ex) {
            if (this._updateErrCount++ < 10)
                console.error('[Game] update threw:', ex);
        }
    }
    shutdown() {
        this.session.disconnectAsync();
        this.pixiApp.destroy(true);
    }
}
//# sourceMappingURL=MapleClaudeGame.js.map