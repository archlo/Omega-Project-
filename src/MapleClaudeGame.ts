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
import { ListService } from './localization/ListService.js';
import { WzAudioPlayer } from './render/WzAudioPlayer.js';
import { MapleCursor } from './platform/MapleCursor.js';
import { QuestInfoService } from './character/QuestInfoService.js';

export class MapleClaudeGame {
  pixiApp!: Application;
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
  mapContainer!: Container;
  /** 800-px-wide container centered in the window — all UI lives here. */
  frameContainer!: Container;

  nameService: NameService;
  questInfoService: QuestInfoService | null = null;
  loginHost = '127.0.0.1';
  loginPort = 8484;
  wzDir?: string;

  wz: {
    ui:        WzPackage | null;
    map:       WzPackage | null;
    sound:     WzPackage | null;
    character: WzPackage | null;
    item:      WzPackage | null;
    base:      WzPackage | null;
    skill:     WzPackage | null;
    etc:       WzPackage | null;
    reactor:   WzPackage | null;
    tamingMob: WzPackage | null;
    morph:     WzPackage | null;
    list:      WzPackage | null;
    string:    WzPackage | null;
    quest:     WzPackage | null;
  } = { ui: null, map: null, sound: null, character: null, item: null, base: null, skill: null, etc: null, reactor: null, tamingMob: null, morph: null, list: null, string: null, quest: null };

  listService: ListService | null = null;

  /** Pixels from the left edge of the canvas to the left edge of the 800-px frame. */
  get uiOffset(): number {
    try {
      return Math.max(0, Math.floor(((this.pixiApp?.screen.width ?? 800) - 800) / 2));
    } catch {
      return 0;
    }
  }

  private _updateErrCount = 0;
  private _prevKeys = new Set<string>();

  /** Currently-held keyboard keys (event.key values), for continuous input like movement. */
  get heldKeys(): ReadonlySet<string> { return this._prevKeys; }

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
    this.nameService = new NameService(
      () => {
        if (!this.wzDir) return null;
        return WzPackage.OpenBase(this.wzDir, 'String');
      },
      () => {
        if (!this.wzDir) return null;
        return WzPackage.OpenBase(this.wzDir, 'Quest');
      },
    );
    this.questInfoService = new QuestInfoService(() => {
      if (!this.wzDir) return null;
      return WzPackage.OpenBase(this.wzDir, 'Quest');
    });
  }

  async init(canvasId: string): Promise<void> {
    const initW = typeof window !== 'undefined' ? window.innerWidth : 800;
    const initH = typeof window !== 'undefined' ? window.innerHeight : 600;

    this.pixiApp = new Application();
    await this.pixiApp.init({
      width: initW,
      height: initH,
      backgroundColor: 0x000000,
      canvas: document.getElementById(canvasId) as HTMLCanvasElement,
      antialias: false,
      resolution: 1,
      autoDensity: false,
    });

    // Layer order: full-width map → centered 800px UI → cursor
    this.mapContainer = new Container();
    this.frameContainer = new Container();
    this.pixiApp.stage.addChild(this.mapContainer);
    this.pixiApp.stage.addChild(this.frameContainer);
    this.frameContainer.x = this.uiOffset;

    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    canvas.style.cursor = 'none';
    this.pixiApp.stage.addChild(this.cursor.container);
    canvas.style.cursor = 'none';
    this.pixiApp.stage.addChild(this.cursor.container);

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (!this._prevKeys.has(e.key)) {
        this.stageDirector.onKeyPress(e.key);
        if (e.key === 'Escape') this.shutdown();
      }
      this._prevKeys.add(e.key);
    });
    document.addEventListener('keyup', (e) => { this._prevKeys.delete(e.key); });
    window.addEventListener('blur', () => { this._prevKeys.clear(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this._prevKeys.clear();
    });
    document.addEventListener('keypress', (e) => { this.stageDirector.onTextInput(e.key); });

    // Mouse — cursor gets raw canvas coords; __mouseX/Y and stages get
    // frame-relative coords so UI hit-tests and panel dragging work.
    const toCanvas = (cx: number, cy: number) => {
      const r = canvas.getBoundingClientRect();
      return { x: cx - r.left, y: cy - r.top };
    };
    document.addEventListener('mousemove', (e) => {
      const { x, y } = toCanvas(e.clientX, e.clientY);
      this.cursor.container.position.set(x, y);
      const fx = x - this.uiOffset;
      (window as any).__mouseX = fx;
      (window as any).__mouseY = y;
      this.stageDirector.onMouseMove(fx, y);
    });
    document.addEventListener('mousedown', (e) => {
      const { x, y } = toCanvas(e.clientX, e.clientY);
      this.cursor.setClicked(true);
      const fx = x - this.uiOffset;
      (window as any).__mouseX = fx;
      (window as any).__mouseY = y;
      this.stageDirector.onMouseButton(fx, y, true, 0);
    });
    document.addEventListener('mouseup', (e) => {
      const { x, y } = toCanvas(e.clientX, e.clientY);
      this.cursor.setClicked(false);
      const fx = x - this.uiOffset;
      (window as any).__mouseX = fx;
      (window as any).__mouseY = y;
      this.stageDirector.onMouseButton(fx, y, false, 0);
    });
    document.addEventListener('wheel', (e) => {
      (window as any).__wheelDelta = e.deltaY;
    });

    // Resize
    window.addEventListener('resize', () => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      this.pixiApp.renderer.resize(nw, nh);
      this.frameContainer.x = this.uiOffset;
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

  private _update(): void {
    this.session.drainInbound();
    const dt = Math.min(this.pixiApp.ticker.deltaMS / 1000, 1 / 30);
    this.cursor.update(dt);

    try {
      this.stageDirector.update(dt);
      this.stageDirector.draw();
    } catch (ex) {
      if (this._updateErrCount++ < 10) console.error('[Game] update threw:', ex);
    }
  }

  shutdown(): void {
    this.session.disconnectAsync();
    this.pixiApp.destroy(true);
  }
}
