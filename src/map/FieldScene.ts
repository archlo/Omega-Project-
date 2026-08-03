import { Container, Sprite } from 'pixi.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzImage } from '../wz/WzImage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzVector } from '../wz/WzVector.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzSprite } from '../render/WzSprite.js';
import { AnimatedSprite } from '../render/AnimatedSprite.js';
import { MapScene } from './MapScene.js';
import { MapInfo } from './MapInfo.js';
import { Foothold } from './Foothold.js';
import { Portal } from './Portal.js';
import { LadderRope } from './LadderRope.js';
import { FootholdIndex } from './FootholdIndex.js';
import type { GameCamera } from './GameCamera.js';
import { ObjInfo } from './ObjInfo.js';
import { MiniMapData } from './MiniMapData.js';
import { DropSprite } from '../character/DropSprite.js';
import type { PlayerController } from '../character/PlayerController.js';
import type { CharLook } from '../character/CharLook.js';
import type { OtherCharLook } from '../character/OtherCharLook.js';
import type { FootHoldStateEntry } from '../net/handlers/PacketArgs.js';

const LayerCount = 8;

export interface PhysicsConstants {
  walkSpeed: number;
  walkForce: number;
  walkDrag: number;
  jumpSpeed: number;
  gravityAcc: number;
  fallSpeed: number;
  flyForce: number;
  flySpeed: number;
  swimForce: number;
  swimSpeed: number;
  floatDrag1: number;
  floatDrag2: number;
  floatCoefficient: number;
  slipForce: number;
  slipSpeed: number;
}

export const DEFAULT_PHYSICS: PhysicsConstants = {
  walkSpeed: 125, walkForce: 140000, walkDrag: 80000,
  jumpSpeed: 555, gravityAcc: 2000, fallSpeed: 670,
  flyForce: 120000, flySpeed: 200, swimForce: 120000, swimSpeed: 140,
  floatDrag1: 100000, floatDrag2: 10000, floatCoefficient: 0.01,
  slipForce: 5000, slipSpeed: 100,
};

interface ObjDraw {
  info: ObjInfo;
  sprite: AnimatedSprite | null;
}

interface TileDraw {
  x: number;
  y: number;
  z: number;
  sprite: WzSprite | null;
  anim: AnimatedSprite | null;
  pixiSprite: Sprite | null; // cached — created once, reused across frames
}

export class FieldScene {
  readonly container = new Container();

  /** Layers 0..7, each is a child container holding tile+obj children. */
  private readonly _layerContainers: Container[] = [];

  private readonly _bgContainer = new Container();
  private readonly _fgContainer = new Container();
  private readonly _portalContainer = new Container();

  readonly Camera: GameCamera;

  Crc = 0;

  private _mapScene: MapScene | null = null;
  private _info = new MapInfo();
  private _physics: PhysicsConstants = { ...DEFAULT_PHYSICS };
  private _footholds: Record<number, Foothold> = {};
  private _footholdIndex = new FootholdIndex();
  private _portals: Record<number, Portal> = {};
  private _ladderRopes: LadderRope[] = [];
  // OG: CField::m_aSeat — TODO_AUDIT.md Seventy-sixth pass's chair/sitting
  // finding. Literal WZ `seat` node, confirmed against real Map.nx data
  // (e.g. Map9/100000100.img): a flat list of {X,Y} points, not a
  // WzProperty sub-tree (unlike ladderRope's {l,uf,x,y1,y2,page} shape).
  private _seats: { x: number; y: number }[] = [];
  private _loadedMapId = -1;
  private _bounds = { left: -3000, top: -2000, right: 3000, bottom: 2000 };
  private _miniMap: MiniMapData | null = null;

  // Render data
  private _tileLayers: TileDraw[][] = [];
  private _objLayers: ObjDraw[][] = [];

  // Portal animation cache
  private _portalPv: AnimatedSprite | null = null;
  private _portalPh: Map<string, AnimatedSprite | null> = new Map();
  private _portalPsh: Map<string, AnimatedSprite | null> = new Map();
  private _activeHiddenPortalIndex: number | null = null;
  // Per-portal cached PixiJS Sprites (fix: AnimatedSprite.Draw() returns the
  // same Sprite instance, so sharing _portalPv across N portals meant only
  // the last portal was visible — each portal now gets its own Sprite)
  private _portalPixiSprites: Map<number, Sprite> = new Map();

  private _loaded = false;

  constructor(
    private _mapWz: WzPackage | null,
    private _loader: WzTextureLoader,
    camera: GameCamera,
  ) {
    this.Camera = camera;
    for (let i = 0; i < LayerCount; i++) {
      this._layerContainers.push(new Container());
      // _tileLayers/_objLayers are only otherwise filled by _loadLayers(),
      // which only runs on Load()'s success path. UpdateEntities()/Update()
      // are now called unconditionally every frame (see Load()'s docs above)
      // regardless of whether Load() ever succeeded (missing WZ dir, map id
      // not found in Map.wz, etc.) — without this, a failed/skipped Load()
      // left these as `[]` and _rebuildLayerContainers crashed with
      // "not iterable" the next frame instead of just rendering nothing.
      this._tileLayers.push([]);
      this._objLayers.push([]);
    }
    // Build display list: bg, layers, fg, portals (each added once)
    this.container.addChild(this._bgContainer);
    for (let i = 0; i < LayerCount; i++) {
      this.container.addChild(this._layerContainers[i]);
    }
    this.container.addChild(this._fgContainer);
    this.container.addChild(this._portalContainer);
  }

  get Bounds() { return this._bounds; }
  get Info(): MapInfo { return this._info; }
  get Physics(): PhysicsConstants { return this._physics; }
  get Footholds(): Record<number, Foothold> { return this._footholds; }
  get Portals(): Record<number, Portal> { return this._portals; }
  get LadderRopes(): LadderRope[] { return this._ladderRopes; }

  get LoadedMapId(): number { return this._loadedMapId; }
  get MiniMap(): MiniMapData | null { return this._miniMap; }

  // OG: CPortalList::m_pHiddenPortal — the currently-active hidden portal index.
  // Set by GameStage proximity check each frame.
  SetActiveHiddenPortal(index: number | null): void {
    this._activeHiddenPortalIndex = index;
  }

  // ── Loading ──────────────────────────────────────────────────────

  Load(mapId: number): void {
    if (this._mapWz === null) return;
    this._loadedMapId = mapId;

    const prefix = Math.floor(mapId / 100_000_000);
    const padded = mapId.toString().padStart(9, '0');
    const path = `Map/Map${prefix}/${padded}.img`;
    const item = this._mapWz.GetItem(path);
    if (!(item instanceof WzImage)) {
      console.error(`Map ${path} not found in Map.wz`);
      return;
    }
    const root = item.Root;

    this._loadPhysics();

    this._mapScene = new MapScene(this._mapWz, this._loader);
    this._mapScene.ParallaxEnabled = true;
    try { this._mapScene.Load(root); } catch (ex) { console.warn('MapScene backdrop load failed', ex); }

    this._bgContainer.removeChildren();
    if (this._mapScene?.container) this._bgContainer.addChild(this._mapScene.container);

    this._loadInfo(root);
    this._loadMiniMap(root);
    this._loadFootholds(root);
    this._computeBounds();
    this._loadPortals(root);
    this._loadLadderRope(root);
    this._finalizeMiniMapData();
    this._loadSeats(root);
    this._loadPortalAnimations();
    this._loadLayers(root);

    const tileCount = this._tileLayers.reduce((s, l) => s + l.length, 0);
    const objCount = this._objLayers.reduce((s, l) => s + l.length, 0);
    console.log(`FieldScene: map=${mapId} footholds=${Object.keys(this._footholds).length} portals=${Object.keys(this._portals).length} tiles=${tileCount} objs=${objCount}`);

    this._loaded = true;
  }

  private _loadInfo(root: WzProperty): void {
    const info = root.Get('info');
    if (!(info instanceof WzProperty)) return;
    const mi = new MapInfo();
    mi.Bgm = (info.Get('bgm') as string) ?? '';
    mi.ReturnMap = this._readInt(info, 'returnMap');
    mi.ForcedReturn = this._readInt(info, 'forcedReturn');
    mi.FieldLimit = this._readInt(info, 'fieldLimit');
    mi.MapDesc = (info.Get('mapDesc') as string) ?? '';
    mi.Town = this._readInt(info, 'town');
    mi.VRLeft = this._readInt(info, 'VRLeft');
    mi.VRTop = this._readInt(info, 'VRTop');
    mi.VRRight = this._readInt(info, 'VRRight');
    mi.VRBottom = this._readInt(info, 'VRBottom');
    mi.HideMinimap = this._readBool(info, 'hideMinimap');
    mi.Swim = this._readBool(info, 'swim');
    mi.Fly = this._readBool(info, 'fly');
    mi.Cloud = this._readBool(info, 'cloud');
    mi.MoveLimit = this._readInt(info, 'moveLimit');
    mi.NoMapCmd = this._readBool(info, 'noMapCmd');
    mi.ExpeditionOnly = this._readBool(info, 'expeditionOnly');
    mi.PartyOnly = this._readBool(info, 'partyOnly');
    mi.NeedQuest = this._readInt(info, 'needQuest');
    mi.LevelLimit = this._readInt(info, 'levelLimit') || this._readInt(info, 'lvLimit');
    mi.Version = this._readInt(info, 'version');
    mi.FieldWalk = this._readNumber(info, 'walk') || 1;
    mi.FieldDrag = this._readNumber(info, 'drag') || 1;
    mi.OnFirstUserEnter = (info.Get('onFirstUserEnter') as string) ?? '';
    mi.OnUserEnter = (info.Get('onUserEnter') as string) ?? '';
    mi.FieldType = this._readInt(info, 'fieldType');
    mi.Effect = (info.Get('effect') as string) ?? '';

    // OG: Restore* fields — read from Map.wz info/children
    // RestoreForbiddenSkill (0x532FB0): reads `noskill` node
    const noSkillNode = info.Get('noskill');
    if (noSkillNode instanceof WzProperty) {
      for (const key of Object.keys(noSkillNode.Items)) {
        const val = noSkillNode.Get(key);
        if (typeof val === 'number') mi.ForbiddenSkills.push(val);
      }
    }

    // RestoreAllowedItem (0x532AB0): reads `alloweditem` node
    const allowedItemNode = info.Get('alloweditem');
    if (allowedItemNode instanceof WzProperty) {
      for (const key of Object.keys(allowedItemNode.Items)) {
        const val = allowedItemNode.Get(key);
        if (typeof val === 'number') mi.AllowedItems.push(val);
      }
    }

    // RestoreHelpMsg (0x52FF40): reads `help` node (count of help messages)
    const helpNode = info.Get('help');
    if (helpNode instanceof WzProperty) {
      mi.HelpMsgCount = Object.keys(helpNode.Items).length;
    }

    // RestoreClock (0x533AB0): reads `clock` node
    const clockNode = info.Get('clock');
    if (clockNode instanceof WzProperty) {
      mi.ClockType = this._readInt(clockNode, 'type');
      mi.ClockDuration = this._readInt(clockNode, 'duration');
    }

    // RestoreWeatherMsg (0x53CF80): reads `weather` node
    mi.WeatherMsg = (info.Get('weather') as string) ?? '';

    // RestorePhaseBG (0x532DD0): reads `phase` node
    mi.PhaseBG = (info.Get('phase') as string) ?? '';

    // RestoreOption (0x53B070): reads `option` node
    mi.FieldOption = this._readInt(info, 'option');

    // RestoreUserInfo (0x53FA30): reads `userInfo` node
    mi.UserInfo = (info.Get('userInfo') as string) ?? '';

    // RestorePeculiarInfo (0x546560): reads `peculiarInfo` node
    mi.PeculiarInfo = (info.Get('peculiarInfo') as string) ?? '';

    // OG: m_nMiniMapType — reads `miniMapType` node
    // 0=simple (has 2X button), 1=normal (has min/max/worldmap buttons)
    mi.MiniMapType = this._readInt(info, 'miniMapType');

    // RestoreSwinArea (0x5330E0): reads `swimArea` node
    const swimAreaNode = info.Get('swimArea');
    if (swimAreaNode instanceof WzProperty) {
      mi.SwimAreaRect = {
        left: this._readInt(swimAreaNode, 'l'),
        top: this._readInt(swimAreaNode, 't'),
        right: this._readInt(swimAreaNode, 'r'),
        bottom: this._readInt(swimAreaNode, 'b'),
      };
    }

    this._info = mi;
  }

  private _loadMiniMap(root: WzProperty): void {
    const mm = root.Get('miniMap');
    if (!(mm instanceof WzProperty)) return;
    const canvas = mm.Get('canvas');
    const markName = (root.Get('info') instanceof WzProperty ? (root.Get('info') as WzProperty).Get('mapMark') : null)?.toString();
    let mark: WzSprite | null = null;
    if (markName && this._mapWz?.GetItem(`MapHelper.img/mark/${markName}`) instanceof WzCanvas) {
      mark = this._loader.Load(this._mapWz!.GetItem(`MapHelper.img/mark/${markName}`) as WzCanvas);
    }
    this._miniMap = new MiniMapData(
      canvas instanceof WzCanvas ? this._loader.Load(canvas) : null,
      mark,
      this._readInt(mm, 'width'),
      this._readInt(mm, 'height'),
      this._readInt(mm, 'centerX'),
      this._readInt(mm, 'centerY'),
      Math.max(0, this._readInt(mm, 'mag')),
      [], // Footholds — filled in _finalizeMiniMapData
      [], // LadderRopes — filled in _finalizeMiniMapData
      this._readInt(mm, 'width'), // Real_W — same as Width for now
      this._readInt(mm, 'height'), // Real_H — same as Height for now
      this._readInt(mm, 'centerX'), // Real_CX — same as CenterX for now
      this._readInt(mm, 'centerY'), // Real_CY — same as CenterY for now
    );
  }

  // OG: CUIMiniMap::MakeConvexLayer / LoadLadderRope — fill minimap data
  // with foothold lines and ladder/rope segments after both are loaded.
  private _finalizeMiniMapData(): void {
    if (!this._miniMap) return;
    const mag = this._miniMap.Mag;
    const scale = 1 << mag;
    const cx = this._miniMap.CenterX;
    const cy = this._miniMap.CenterY;

    // OG: MakeConvexLayer renders foothold edges as lines on the minimap.
    // Each foothold segment (x1,y1)→(x2,y2) is converted to canvas coords.
    const fhs: { footholdId: number; layer: number }[] = [];
    for (const fh of Object.values(this._footholds)) {
      if (fh.IsWall) continue;
      fhs.push({
        footholdId: fh.Id,
        layer: fh.Layer,
      });
    }

    // OG: LoadLadderRope renders ladders/ropes as vertical lines.
    const lrs: { x: number; y1: number; y2: number; isLadder: boolean }[] = [];
    for (const lr of this._ladderRopes) {
      lrs.push({
        x: Math.floor((lr.X + cx) / scale),
        y1: Math.floor((lr.Top + cy) / scale),
        y2: Math.floor((lr.Bottom + cy) / scale),
        isLadder: lr.IsLadder,
      });
    }

    // Reconstruct MiniMapData with the foothold/ladder data.
    // (MiniMapData is readonly so we rebuild it.)
    this._miniMap = new MiniMapData(
      this._miniMap.Canvas,
      this._miniMap.Mark,
      this._miniMap.Width,
      this._miniMap.Height,
      this._miniMap.CenterX,
      this._miniMap.CenterY,
      this._miniMap.Mag,
      fhs,
      lrs,
      this._miniMap.Real_W,
      this._miniMap.Real_H,
      this._miniMap.Real_CX,
      this._miniMap.Real_CY,
    );
  }

  private _loadFootholds(root: WzProperty): void {
    const fhRoot = root.Get('foothold');
    if (!(fhRoot instanceof WzProperty)) return;
    this._footholds = {};
    this._footholdIndex.clear();
    for (const [layerKey, layerNode] of Object.entries(fhRoot.Items)) {
      if (!(layerNode instanceof WzProperty)) continue;
      const layerIdx = parseInt(layerKey) || 0;
      for (const [groupKey, groupNode] of Object.entries(layerNode.Items)) {
        if (!(groupNode instanceof WzProperty)) continue;
        const groupIdx = parseInt(groupKey) || 0;
        for (const [idStr, entryNode] of Object.entries(groupNode.Items)) {
          if (!(entryNode instanceof WzProperty)) continue;
          const id = parseInt(idStr) || 0;
          const fh = new Foothold();
          fh.Id = id;
          fh.Layer = layerIdx;
          fh.Group = groupIdx;
          fh.X1 = this._readInt(entryNode, 'x1');
          fh.Y1 = this._readInt(entryNode, 'y1');
          fh.X2 = this._readInt(entryNode, 'x2');
          fh.Y2 = this._readInt(entryNode, 'y2');
          fh.Prev = this._readInt(entryNode, 'prev');
          fh.Next = this._readInt(entryNode, 'next');
          // OG CWvsPhysicalSpace2D::Load (0xA18AA0): force/drag are WZ ints used as
          // nForce/100.0 doubles by CVecCtrl::CalcWalk (0x992BA0) — store scaled.
          fh.Force = this._readInt(entryNode, 'force') / 100;
          fh.Drag = this._readInt(entryNode, 'drag') / 100;
          // OG: ZMass = _wtoi of the group key (CWvsPhysicalSpace2D::Load line 388-391)
          fh.ZMass = groupIdx;
          fh.CantThrough = this._readInt(entryNode, 'cantThrough') !== 0;
          fh.ForbidFallDown = this._readInt(entryNode, 'forbidFallDown') !== 0;
          fh.InitVectors(); // Compute m_uvx, m_uvy, m_len from endpoints
           this._footholds[id] = fh;
           this._footholdIndex.insert(fh);
        }
      }
    }
  }

  private _computeBounds(): void {
    const fhArr = Object.values(this._footholds);
    if (fhArr.length === 0) return;
    // OG CWvsPhysicalSpace2D::Load (0xA18AA0) — aggregate m_rcMBR from footholds:
    // left = min(xMin + 30), right = max(xMax - 30), top = min(yMin - 300),
    // bottom = max(yMax + 10, non-vertical only). Then clamp with the info VR
    // rect when present (VRLeft+20, VRRight-4, VRTop+65, VRBottom).
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (const fh of fhArr) {
      left = Math.min(left, Math.min(fh.X1, fh.X2) + 30);
      right = Math.max(right, Math.max(fh.X1, fh.X2) - 30);
      top = Math.min(top, Math.min(fh.Y1, fh.Y2) - 300);
      if (fh.X1 !== fh.X2) {
        bottom = Math.max(bottom, Math.max(fh.Y1, fh.Y2) + 10);
      }
    }
    const info = this._info;
    if (info.VRLeft !== 0) left = Math.max(left, info.VRLeft + 20);
    if (info.VRRight !== 0) right = Math.min(right, info.VRRight - 4);
    if (info.VRTop !== 0) top = Math.max(top, info.VRTop + 65);
    if (info.VRBottom !== 0) bottom = Math.min(bottom, info.VRBottom);
    if (right <= left || bottom <= top) return;
    this._bounds = { left, top, right, bottom };
  }

  private _loadPortals(root: WzProperty): void {
    const portalRoot = root.Get('portal');
    if (!(portalRoot instanceof WzProperty)) return;
    this._portals = {};
    for (const [idxStr, node] of Object.entries(portalRoot.Items)) {
      if (!(node instanceof WzProperty)) continue;
      const idx = parseInt(idxStr) || 0;
      const p = new Portal();
      p.Index = idx;
      p.Name = (node.Get('pn') as string) ?? '';
      p.Type = this._readInt(node, 'pt');
      p.X = this._readInt(node, 'x');
      p.Y = this._readInt(node, 'y');
      p.TargetMap = this._readInt(node, 'tm');
      p.TargetPortal = (node.Get('tn') as string) ?? '';
      p.Image = (node.Get('image') as string) ?? '';
      p.Delay = this._readInt(node, 'delay');
      p.OnlyOnce = this._readInt(node, 'onlyOnce') !== 0;
      p.HRange = this._readInt(node, 'hRange');
      p.VRange = this._readInt(node, 'vRange');
      p.HideTooltip = this._readInt(node, 'hideTooltip') !== 0;
      p.VImpact = this._readInt(node, 'verticalImpact');
      p.HImpact = this._readInt(node, 'horizontalImpact');
      p.ReactorName = (node.Get('reactorName') as string) ?? '';
      p.SessionValueKey = (node.Get('sessionValueKey') as string) ?? '';
      p.SessionValue = (node.Get('sessionValue') as string) ?? '';
      p.Script = (node.Get('script') as string) ?? '';
      p.Teleport = this._readInt(node, 'teleport') !== 0;
      this._portals[idx] = p;
    }
  }

  private _loadLadderRope(root: WzProperty): void {
    const lrRoot = root.Get('ladderRope');
    if (!(lrRoot instanceof WzProperty)) return;
    this._ladderRopes = [];
    for (const [snStr, node] of Object.entries(lrRoot.Items)) {
      if (!(node instanceof WzProperty)) continue;
      const sn = parseInt(snStr) || 0;
      this._ladderRopes.push(new LadderRope(
        sn,
        this._readInt(node, 'l') !== 0,
        this._readInt(node, 'uf') !== 0,
        this._readInt(node, 'x'),
        this._readInt(node, 'y1'),
        this._readInt(node, 'y2'),
        this._readInt(node, 'page'),
      ));
    }
  }

  private _loadSeats(root: WzProperty): void {
    const seatRoot = root.Get('seat');
    this._seats = [];
    if (!(seatRoot instanceof WzProperty)) return;
    for (const node of Object.values(seatRoot.Items)) {
      if (node instanceof WzVector) this._seats.push({ x: node.X, y: node.Y });
    }
  }

  // OG: CField::FindSeatByPosition (decompile) — a fixed [-10,+10]
  // horizontal / [-30,+30] vertical point-in-rect hit-test against each
  // seat point, returning the first match's index or -1.
  FindSeatByPosition(x: number, y: number): number {
    for (let i = 0; i < this._seats.length; i++) {
      const s = this._seats[i];
      if (x >= s.x - 10 && x <= s.x + 10 && y >= s.y - 30 && y <= s.y + 30) return i;
    }
    return -1;
  }

  GetSeatPosition(index: number): { x: number; y: number } | null {
    return this._seats[index] ?? null;
  }

  private _loadPortalAnimations(): void {
    this._portalPv = this._loader.LoadAnimation(this._mapWz?.GetItem('MapHelper.img/portal/game/pv'));
    this._portalPh.clear();
    this._portalPsh.clear();
    this._portalPixiSprites.clear();
    for (const portal of Object.values(this._portals)) {
      if (portal.Type !== 10 && portal.Type !== 11) continue;
      const image = portal.Image || 'default';
      const cache = portal.Type === 10 ? this._portalPh : this._portalPsh;
      if (!cache.has(image)) {
        const family = portal.Type === 10 ? 'ph' : 'psh';
        cache.set(image, this._loader.LoadAnimation(
          this._mapWz?.GetItem(`MapHelper.img/portal/game/${family}/${image}/portalContinue`),
        ));
      }
    }
  }

  private _loadLayers(root: WzProperty): void {
    this._tileLayers = Array.from({ length: LayerCount }, () => []);
    this._objLayers = Array.from({ length: LayerCount }, () => []);

    for (let layer = 0; layer < LayerCount; layer++) {
      const lp = root.Get(String(layer));
      if (!(lp instanceof WzProperty)) continue;

      const tileSet = (lp.Get('info') instanceof WzProperty ? (lp.Get('info') as WzProperty).Get('tS') : null)?.toString();
      if (tileSet && lp.Get('tile') instanceof WzProperty) {
        const tileRoot = lp.Get('tile') as WzProperty;
        for (const [, value] of Object.entries(tileRoot.Items)) {
          if (!(value instanceof WzProperty)) continue;
          const u = (value.Get('u') as string) ?? '';
          const no = this._readInt(value, 'no');

          // Try animated tile path: Tile/<tS>.img/<u>/ani/<no>
          const animNode = this._mapWz?.GetItem(`Tile/${tileSet}.img/${u}/ani/${no}`);
          const anim = this._loader.LoadAnimation(animNode ?? null);

          // Fall back to static canvas
          const canvas = anim === null ? this._mapWz?.GetItem(`Tile/${tileSet}.img/${u}/${no}`) : null;
          const wzSprite = canvas instanceof WzCanvas ? this._loader.Load(canvas) : null;

          // z from canvas.Property.z, fallback to tile zM
          const z = canvas instanceof WzCanvas
            ? (this._readInt(canvas.Property, 'z') || this._readInt(value, 'zM'))
            : this._readInt(value, 'zM');

          this._tileLayers[layer].push({
            x: this._readInt(value, 'x'),
            y: this._readInt(value, 'y'),
            z,
            sprite: wzSprite,
            anim,
            pixiSprite: null,
          });
        }
        this._tileLayers[layer].sort((a, b) => a.z - b.z);
      }

      if (lp.Get('obj') instanceof WzProperty) {
        const objRoot = lp.Get('obj') as WzProperty;
        for (const [, value] of Object.entries(objRoot.Items)) {
          if (!(value instanceof WzProperty)) continue;
          const info = ObjInfo.From(value);
          const node = this._mapWz?.GetItem(`Obj/${info.Os}.img/${info.L0}/${info.L1}/${info.L2}`);
          this._objLayers[layer].push({ info, sprite: this._loader.LoadAnimation(node) });
        }
        // OG: objects within same layer sorted by Y position (vertical sort)
        // so objects lower on screen draw in front of objects higher on screen
        this._objLayers[layer].sort((a, b) => a.info.Y - b.info.Y);
      }
    }
  }

  // ── Per-frame update ─────────────────────────────────────────────

  Update(dtMs: number, screenW = 800, screenH = 600): void {
    if (!this._loaded) return;
    // The real parallax backdrop (MapScene, holding the `back`-tree sprites
    // and its own auto-scroll/tiling logic) was being loaded once in Load()
    // and never touched again: its container was added under _bgContainer at
    // load time but neither SetCamera() nor update() were ever called after
    // that, so every map's background was frozen in screen-space (laid out
    // for Camera={x:0,y:0} forever) instead of parallax-scrolling with the
    // player. Drive both every frame, matching how every other per-frame
    // layer in this method (tiles/objs/portals) is kept live.
    //
    // screenW/screenH must be the real canvas size (game.pixiApp.screen.
    // width/height), not the old hardcoded 800x600 default below — MapScene
    // used to hardcode 400/300/800/600 internally for all its centering and
    // tile-wrap math, which was harmless while SetCamera was dead code but
    // became a real mis-centering/under-tiling bug the moment it went live.
    // The defaults here exist only so callers that genuinely don't know the
    // real size yet (e.g. tests) get the previous behavior, not a crash.
    this._mapScene?.update(dtMs);
    this._mapScene?.SetCamera({ x: this.Camera.Position.x, y: this.Camera.Position.y }, screenW, screenH);
    for (const layer of this._objLayers) {
      for (const o of layer) o.sprite?.Update(dtMs);
    }
    this._portalPv?.Update(dtMs);
    for (const [, anim] of this._portalPh) anim?.Update(dtMs);
    for (const [, anim] of this._portalPsh) anim?.Update(dtMs);
    this._syncPortalTextures();
  }

  // ── Drawing ───────────────────────────────────────────────────────

  UpdateEntities(
    characters: Map<number, OtherCharLook> | (CharLook | OtherCharLook)[],
    player: CharLook | null,
    drops: DropSprite[],
    mobs: Iterable<{ Layer: number; Position: { x: number; y: number }; container: Container }> | null,
    npcs: Iterable<{ Layer: number; Position: { x: number; y: number }; container: Container }> | null,
    screenW: number,
    screenH: number,
  ): void {
    const centerX = screenW / 2;
    const centerY = screenH / 2;

    this._rebuildLayerContainers(centerX, centerY);
    this._updatePortalContainer(centerX, centerY);
    // Convert Map to array only if needed (avoids spread in hot path)
    const charArray = characters instanceof Map ? Array.from(characters.values()) : characters;
    this._updateEntityContainers(charArray, player, drops, mobs, npcs, centerX, centerY);
  }

  private _rebuildLayerContainers(cx: number, cy: number): void {
    for (let layer = 0; layer < LayerCount; layer++) {
      const lc = this._layerContainers[layer];
      lc.removeChildren();

      // OG draw order: objs FIRST (behind), then tiles ON TOP of objs.
      // This means tiles render in front of objects within the same layer.
      for (const o of this._objLayers[layer]) {
        if (!o.sprite) continue;
        const dx = o.info.X - this.Camera.Position.x + cx;
        const dy = o.info.Y - this.Camera.Position.y + cy;
        const pixi = o.sprite.Draw(dx, dy, o.info.Flip);
        lc.addChild(pixi);
      }

      // OG: tiles draw AFTER objs (tiles in front of objects within same layer)
      for (const t of this._tileLayers[layer]) {
        if (!t.sprite && !t.anim) continue;
        const dx = t.x - this.Camera.Position.x + cx;
        const dy = t.y - this.Camera.Position.y + cy;
        if (t.anim) {
          lc.addChild(t.anim.Draw(dx, dy));
        } else if (t.sprite) {
          // Reuse cached Sprite — only create on first render
          if (!t.pixiSprite) {
            t.pixiSprite = new Sprite(t.sprite.Texture);
            t.pixiSprite.anchor.set(
              t.sprite.Width > 0 ? t.sprite.OriginX / t.sprite.Width : 0,
              t.sprite.Height > 0 ? t.sprite.OriginY / t.sprite.Height : 0,
            );
          }
          t.pixiSprite.position.set(dx, dy);
          lc.addChild(t.pixiSprite);
        }
      }
    }
  }

  private _updatePortalContainer(cx: number, cy: number): void {
    this._portalContainer.removeChildren();
    for (const portal of Object.values(this._portals)) {
      const sprite = this._portalPixiSprites.get(portal.Index);
      if (!sprite) continue;
      const dx = portal.X - this.Camera.Position.x + cx;
      const dy = portal.Y - this.Camera.Position.y + cy;
      sprite.position.set(dx, dy);
      this._portalContainer.addChild(sprite);
    }
  }

  private _updateEntityContainers(
    characters: (CharLook | OtherCharLook)[],
    player: CharLook | null,
    drops: DropSprite[],
    mobs: Iterable<{ Layer: number; Position: { x: number; y: number }; container: Container }> | null,
    npcs: Iterable<{ Layer: number; Position: { x: number; y: number }; container: Container }> | null,
    cx: number,
    cy: number,
  ): void {
    // Each entity's own `.Draw(...)` call only repositions its *own*,
    // already-constructed `container` (and rebuilds its internal sprite
    // children) — it never inserts that container into this scene's display
    // tree. Previously nothing here (or anywhere in GameStage.ts) ever called
    // `addChild` on `player.container`/`ch.container`/`d.container`, so the
    // player, every other player, and every item drop were fully constructed,
    // updated every tick, and positioned every frame, yet never actually
    // visible — `Draw()` would set `.position` on a Container with no parent.
    // Fixed by re-parenting each entity's container into its depth-sorted
    // layer container every frame, the same per-frame
    // removeChildren()-then-rebuild pattern `_rebuildLayerContainers` already
    // uses for tiles/objs immediately above this method.
    const allEntities: { layer: number; sortY: number; container: Container; draw: () => void }[] = [];

    // Twenty-fourth pass: both branches below previously read `.FootholdId`
    // (player) or did an `'FootholdId' in ch` runtime check (other chars) —
    // `CharLook.FootholdId`/`OtherCharLook` (which has no such field at all)
    // are NEVER assigned anywhere in src/ (grepped exhaustively; only this
    // file ever *read* it), so the `in` check always evaluated false and
    // `player.FootholdId` was permanently its `=0` default. Since real WZ
    // foothold ids are 1-based, `LayerOfFoothold(0, 7)` always missed
    // `_footholds[0]` and silently fell back to layer 7 (topmost) for the
    // player's own avatar and unconditionally for every other player,
    // regardless of where they actually stood — defeating the per-layer
    // depth-sorting this method's own doc comment above claims exists for
    // them. Fixed by deriving the layer the same way the drops loop below
    // already does (and the only way that's actually wired end to end):
    // `GetFootholdBelow(x, y)` on the entity's live position, every frame.
    if (player) {
      const fh = this.GetFootholdBelow(player.Position.x, player.Position.y);
      allEntities.push({
        layer: fh ? fh.Layer : 7,
        sortY: player.Position.y,
        container: player.container,
        draw: () => player.Draw(this.Camera.Position.x, this.Camera.Position.y, cx, cy),
      });
    }

    for (const ch of characters) {
      const fh = this.GetFootholdBelow(ch.Position.x, ch.Position.y);
      allEntities.push({
        layer: fh ? fh.Layer : 7,
        sortY: ch.Position.y,
        container: ch.container,
        draw: () => ch.Draw(this.Camera.Position.x, this.Camera.Position.y, cx, cy),
      });
    }

    for (const d of drops) {
      const fh = this.GetFootholdBelow(d.Position.x, d.Position.y);
      allEntities.push({
        layer: fh ? fh.Layer : 7,
        sortY: d.Position.y,
        container: d.container,
        draw: () => d.draw(this.Camera.Position.x, this.Camera.Position.y, cx, cy),
      });
    }

    // OG: mobs and NPCs layered into field containers by their Layer field
    if (mobs) {
      for (const m of mobs) {
        allEntities.push({
          layer: m.Layer,
          sortY: m.Position.y,
          container: m.container,
          draw: () => {
            // Position mob container on screen (mobs don't self-position)
            const p = this._worldToScreen(m.Position.x, m.Position.y, cx, cy);
            m.container.position.set(p.x, p.y);
          },
        });
      }
    }
    if (npcs) {
      for (const n of npcs) {
        allEntities.push({
          layer: n.Layer,
          sortY: n.Position.y,
          container: n.container,
          draw: () => {
            const p = this._worldToScreen(n.Position.x, n.Position.y, cx, cy);
            n.container.position.set(p.x, p.y);
          },
        });
      }
    }

    // Render entities sorted by layer then by y (depth sorting within layer)
    allEntities.sort((a, b) => a.layer !== b.layer ? a.layer - b.layer : a.sortY - b.sortY);
    for (const ent of allEntities) {
      ent.draw();
      this._layerContainers[ent.layer].addChild(ent.container);
    }
  }

  private _worldToScreen(wx: number, wy: number, cx: number, cy: number): { x: number; y: number } {
    return { x: wx - this.Camera.Position.x + cx, y: wy - this.Camera.Position.y + cy };
  }

  private _portalAnimation(portal: Portal): AnimatedSprite | null {
    if (portal.Type === 2 || portal.Type === 4 || portal.Type === 7) return this._portalPv;
    if (this._activeHiddenPortalIndex !== portal.Index) return null;
    const image = portal.Image || 'default';
    return portal.Type === 10 ? (this._portalPh.get(image) ?? null) : (this._portalPsh.get(image) ?? null);
  }

  // Sync cached PixiJS Sprites with the current animation frame for each portal.
  // Called after AnimatedSprite.Update() so textures reflect the latest frame.
  private _syncPortalTextures(): void {
    for (const portal of Object.values(this._portals)) {
      const anim = this._portalAnimation(portal);
      if (!anim) {
        this._portalPixiSprites.delete(portal.Index);
        continue;
      }
      let sprite = this._portalPixiSprites.get(portal.Index);
      const frame = anim.Current;
      if (!sprite) {
        sprite = new Sprite(frame.Texture);
        this._portalPixiSprites.set(portal.Index, sprite);
      }
      sprite.texture = frame.Texture;
      sprite.anchor.set(
        frame.width > 0 ? frame.OriginX / frame.width : 0,
        frame.height > 0 ? frame.OriginY / frame.height : 0,
      );
    }
  }

  // ── Dynamic foothold state ──────────────────────────────────────

  // ponytail: tracks the last-seen curX/curY per named dynamic object so we
  // can compute deltas for CWvsPhysicalSpace2D::FootHoldMove equivalent
  private _dynamicObjPos = new Map<string, { x: number; y: number }>();

  // OG: CField::OnFootHoldInfo → CMapLoadable::FootHoldStateChange +
  // CWvsPhysicalSpace2D::FootHoldStateChange / FootHoldMove (decompile/
  // 53a810.c). Updates foothold geometry + state from server notifications.
  ApplyFootHoldState(entries: FootHoldStateEntry[]): void {
    for (const e of entries) {
      if (e.curState === 2 && e.moving) {
        let prev = this._dynamicObjPos.get(e.objName);
        if (!prev) {
          prev = { x: e.moving.curX, y: e.moving.curY };
          this._dynamicObjPos.set(e.objName, prev);
        }
        const dx = e.moving.curX - prev.x;
        const dy = e.moving.curY - prev.y;
        if (dx !== 0 || dy !== 0) {
          for (const sn of e.footholdSns) {
            const fh = this._footholds[sn];
            if (fh) {
              fh.MoveBy(dx, dy);
              this._footholdIndex.update(fh);
            }
          }
        }
        prev.x = e.moving.curX;
        prev.y = e.moving.curY;
      }
      for (const sn of e.footholdSns) {
        const fh = this._footholds[sn];
        if (fh) fh.State = e.curState;
      }
    }
  }

  // ── Foothold queries ────────────────────────────────────────────

  GetFoothold(id: number): Foothold | null {
    return this._footholds[id] ?? null;
  }

  GetFootholdBelow(x: number, y: number): Foothold | null {
    // OG: CWvsPhysicalSpace2D::GetFootholdUnderneath (0xA16430) — non-vertical
    // footholds only (m_x1 < m_x2), interpolated gy >= y, min gy wins.
    let best: Foothold | null = null;
    let bestY = Infinity;
    const belowBottom = this._bounds?.bottom ?? y + 100000;
    const candidates = this._footholdIndex.search(x, y, x, belowBottom);
    for (const fh of candidates.length > 0 ? candidates : Object.values(this._footholds)) {
      if (fh.X1 >= fh.X2) continue;
      const gy = fh.YAt(x);
      if (gy === null) continue;
      if (gy >= y && gy < bestY) { bestY = gy; best = fh; }
    }
    return best;
  }

  GetFootholdAbove(x: number, yTop: number, yBottom: number): Foothold | null {
    // OG: CWvsPhysicalSpace2D::GetFootholdAbove (0xA16320) — non-vertical only,
    // interpolated gy in (yTop, yBottom], max gy wins. No CantThrough filter in
    // the query — callers check CantThrough on the returned foothold.
    if (yTop > yBottom) return null;
    let best: Foothold | null = null;
    let bestY = yTop;
    const candidates = this._footholdIndex.search(x, yTop, x, yBottom);
    for (const fh of candidates.length > 0 ? candidates : Object.values(this._footholds)) {
      if (fh.X1 >= fh.X2) continue;
      const gy = fh.YAt(x);
      if (gy === null) continue;
      if (gy > yTop && gy <= yBottom && gy > bestY) { bestY = gy; best = fh; }
    }
    return best;
  }

  GetClosestFoothold(x: number, y: number): Foothold | null {
    // OG: CWvsPhysicalSpace2D::GetFootholdClosest (0xA14270) — skips degenerate
    // spans (m_x1 + 8 > m_x2), distance to foothold midpoint wins.
    let best: Foothold | null = null;
    let bestDist = Infinity;
    const candidates = this._footholdIndex.search(-Infinity, -Infinity, Infinity, Infinity);
    for (const fh of candidates.length > 0 ? candidates : Object.values(this._footholds)) {
      if (fh.X1 + 8 > fh.X2) continue;
      const cx = Math.trunc((fh.X1 + fh.X2) / 2);
      const cy = Math.trunc((fh.Y1 + fh.Y2) / 2);
      const dx = cx - x, dy = cy - y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; best = fh; }
    }
    return best;
  }

  /** OG: CWvsPhysicalSpace2D::GetCrossCandidate — returns enabled footholds whose
   *  bounding boxes intersect the movement segment (xm1,ym1)→(xm2,ym2). Used by
   *  CollisionDetectFloat to find potential collision targets during freefall. */
  GetCrossCandidate(xm1: number, ym1: number, xm2: number, ym2: number): Foothold[] {
    const minX = Math.min(xm1, xm2);
    const maxX = Math.max(xm1, xm2);
    const minY = Math.min(ym1, ym2);
    const maxY = Math.max(ym1, ym2);
    const result: Foothold[] = [];
    const candidates = this._footholdIndex.search(xm1, ym1, xm2, ym2);
    for (const fh of candidates.length > 0 ? candidates : Object.values(this._footholds)) {
      // Bounding-box rejection
      const fhMinX = Math.min(fh.X1, fh.X2);
      const fhMaxX = Math.max(fh.X1, fh.X2);
      const fhMinY = Math.min(fh.Y1, fh.Y2);
      const fhMaxY = Math.max(fh.Y1, fh.Y2);
      if (fhMaxX < minX || fhMinX > maxX || fhMaxY < minY || fhMinY > maxY) continue;
      result.push(fh);
    }
    return result;
  }

  GetLadderOrRope(x1: number, y1: number, x2 = x1, y2 = y1): LadderRope | null {
    // OG: CWvsPhysicalSpace2D::GetLadderOrRope — the caller supplies a
    // rectangle; the space query expands only X by 10 and tests Y overlap.
    const minX = Math.min(x1, x2) - 10;
    const maxX = Math.max(x1, x2) + 10;
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    for (const lr of this._ladderRopes) {
      if (lr.X >= minX && lr.X <= maxX && lr.Bottom >= minY && lr.Top <= maxY) return lr;
    }
    return null;
  }

  private _loadPhysics(): void {
    const item = this._mapWz?.GetItem('Physics.img');
    const root = item instanceof WzImage ? item.Root : null;
    if (!root) return;
    const read = (key: keyof PhysicsConstants): void => {
      const value = root.Get(key);
      if (typeof value === 'number' && Number.isFinite(value)) this._physics[key] = value;
    };
    for (const key of Object.keys(this._physics) as (keyof PhysicsConstants)[]) read(key);
  }

  /** CWvsPhysicalSpace2D::CanWalkThrough: validates a linked walkable chain. */
  CanWalkThrough(from: Foothold | null, to: Foothold | null): boolean {
    if (!from || !to || from.Uvx <= 0 || to.Uvx <= 0) return false;
    if (from === to) return true;
    if (from.X2 > to.X1) {
      if (to.X2 > from.X1) return false;
      let current: Foothold | null = from;
      while (current && !current.IsVertical()) {
        if (current === to) return true;
        current = this._footholds[current.Prev] ?? null;
      }
    } else {
      let current: Foothold | null = from;
      while (current && current.Uvx > 0) {
        if (current === to) return true;
        current = this._footholds[current.Next] ?? null;
      }
    }
    return false;
  }

  LayerOfFoothold(id: number, fallback = 7): number {
    const fh = this._footholds[id];
    return fh ? fh.Layer : fallback;
  }

  LayerAt(x: number, y: number, fallback = 7): number {
    const fh = this.GetFootholdBelow(x, y);
    return fh ? fh.Layer : fallback;
  }

  GetZMassWallX(zmass: number, fromX: number, toX: number, yTop: number, yBottom: number): number | null {
    if (fromX === toX) return null;
    const movingRight = toX > fromX;
    const lo = Math.min(fromX, toX), hi = Math.max(fromX, toX);
    let best: number | null = null;
    const candidates = this._footholdIndex.search(lo, yTop, hi, yBottom);
    for (const fh of candidates.length > 0 ? candidates : Object.values(this._footholds)) {
      if (fh.X1 >= fh.X2 || fh.ZMass !== zmass) continue;
      const wx = fh.X1;
      if (wx < lo || wx > hi) continue;
      const wTop = Math.min(fh.Y1, fh.Y2), wBot = Math.max(fh.Y1, fh.Y2);
      if (wBot < yTop || wTop > yBottom) continue;
      if (best === null || (movingRight ? wx < best : wx > best)) best = wx;
    }
    return best;
  }

  // ── Player placement ──────────────────────────────────────────────

  PlacePlayerAtPortal(player: PlayerController, portalIndex: number): void {
    let portal = this._portals[portalIndex];
    if (!portal) portal = this._portals[0];
    if (!portal) {
      console.warn('No portals — spawning player at (0,0)');
      player.Position = { x: 0, y: 0 };
      return;
    }
    player.Position = { x: portal.X, y: portal.Y };
    const fhBelow = this.GetFootholdBelow(portal.X, portal.Y + 2);
    player.CurrentFoothold = fhBelow ? fhBelow.Id : 0;
    if (fhBelow) {
      const gy = fhBelow.YAt(portal.X);
      if (gy !== null) player.Position.y = Math.min(player.Position.y, gy);
    }
    this.Camera.Position = { x: portal.X, y: player.Position.y };
  }

  // ── OG CMapLoadable methods — map life system ──────────────────────────

  /** OG: CMapLoadable::RestoreBack — restores background after temporary effect */
  RestoreBack(): void {
    // OG: restores background after temporary visual effect (e.g., town portal)
  }

  /** OG: CMapLoadable::RestoreTile — restores tiles after temporary effect */
  RestoreTile(): void {
    // OG: restores tiles after temporary visual effect
  }

  /** OG: CMapLoadable::RestoreObj — restores objects after temporary effect */
  RestoreObj(): void {
    // OG: restores objects after temporary visual effect
  }

  /** OG: CMapLoadable::IsInSafeZone — checks if position is in safe zone (PVP protection) */
  IsInSafeZone(_rect: { x: number; y: number; w: number; h: number }): boolean {
    // OG: checks if rectangle intersects with safe zone
    return false;
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private _readInt(p: WzProperty, key: string): number {
    const v = p.Get(key);
    if (typeof v === 'number') return v;
    if (typeof v === 'bigint') return Number(v);
    if (typeof v === 'string') { const n = parseInt(v); return isNaN(n) ? 0 : n; }
    return 0;
  }

  private _readNumber(p: WzProperty, key: string): number {
    const v = p.Get(key);
    if (typeof v === 'number') return v;
    if (typeof v === 'bigint') return Number(v);
    if (typeof v === 'string') {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  }

  private _readBool(p: WzProperty, key: string): boolean {
    return this._readInt(p, key) !== 0;
  }
}
