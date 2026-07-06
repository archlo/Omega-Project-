import { Container, Sprite } from 'pixi.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzSprite } from '../render/WzSprite.js';
import { AnimatedSprite } from '../render/AnimatedSprite.js';
import { BackInfo } from './BackInfo.js';
import { ObjInfo } from './ObjInfo.js';
import { BackType } from './BackType.js';

type BackEntry = { info: BackInfo; sprite: WzSprite | null; anim: AnimatedSprite | null };
type ObjEntry  = { layer: number; info: ObjInfo;  sprite: WzSprite | null; anim: AnimatedSprite | null };

export class MapScene {
  readonly container = new Container();

  private _backgrounds: BackEntry[] = [];
  private _foregrounds: BackEntry[] = [];
  private _layer0Objects: ObjEntry[] = [];

  private _bgScrollX: number[] = [];
  private _bgScrollY: number[] = [];
  private _fgScrollX: number[] = [];
  private _fgScrollY: number[] = [];

  private _sprites: Map<string, Sprite> = new Map();

  BgmPath: string | null = null;
  /** World-coordinate position of the map's `sp` (start point) portal, or null if absent. */
  StartPoint: { x: number; y: number } | null = null;
  Camera = { x: 0, y: 0 };
  // Real canvas size, kept in sync via SetCamera()'s screenW/screenH params.
  // Defaults to 800x600 only for the brief window between construction and
  // the first SetCamera() call (matches the previous hardcoded behavior for
  // that narrow case, instead of centering on 0x0 before any real size is
  // known).
  private _screenW = 800;
  private _screenH = 600;

  constructor(
    private _mapPkg: WzPackage | null,
    private _loader: WzTextureLoader,
  ) {}

  Load(mapRoot: WzProperty): void {
    const info = mapRoot.Get('info');
    if (info instanceof WzProperty) {
      this.BgmPath = (info.Get('bgm') as string) ?? null;
    }

    const portalRoot = mapRoot.Get('portal');
    if (portalRoot instanceof WzProperty) {
      for (const [, value] of Object.entries(portalRoot.Items)) {
        if (value instanceof WzProperty) {
          const pn = value.Get('pn');
          if (pn === 'sp') {
            const sx = this._readInt(value, 'x');
            const sy = this._readInt(value, 'y');
            this.StartPoint = { x: sx, y: sy };
            console.log(`Map SP portal at (${sx}, ${sy})`);
            break;
          }
        }
      }
    }

    const backRoot = mapRoot.Get('back');
    if (backRoot instanceof WzProperty) {
      const indexedBg: { idx: number; info: BackInfo; sprite: WzSprite | null; anim: AnimatedSprite | null }[] = [];
      const indexedFg: { idx: number; info: BackInfo; sprite: WzSprite | null; anim: AnimatedSprite | null }[] = [];
      for (const [key, value] of Object.entries(backRoot.Items)) {
        if (!(value instanceof WzProperty)) continue;
        const bg = BackInfo.From(value);
        const { sprite, anim } = this._loadBackEntry(bg);
        const idx = Number.parseInt(key, 10) || 0;
        if (bg.Front) {
          indexedFg.push({ idx, info: bg, sprite, anim });
        } else {
          indexedBg.push({ idx, info: bg, sprite, anim });
        }
      }
      // Draw in numeric back-index order (back/0 furthest behind ... back/N in
      // front) — WZ read order is not numeric, so a later/larger backdrop would
      // otherwise be covered by an earlier small one.
      indexedBg.sort((a, b) => a.idx - b.idx);
      indexedFg.sort((a, b) => a.idx - b.idx);
      this._backgrounds = indexedBg.map(({ info, sprite, anim }) => ({ info, sprite, anim }));
      this._foregrounds = indexedFg.map(({ info, sprite, anim }) => ({ info, sprite, anim }));
      console.log(`Map scene loaded ${this._backgrounds.length} backdrops, ${this._foregrounds.length} foregrounds (bgm=${this.BgmPath})`);
    }

    // Object layers 0-7. Skip Common/frame — the login frame is drawn as a
    // centred UI overlay by the stage, so the map-object copy would double it.
    for (let layerIdx = 0; layerIdx < 8; layerIdx++) {
      const layer = mapRoot.Get(String(layerIdx));
      if (!(layer instanceof WzProperty)) continue;
      const objRoot = layer.Get('obj');
      if (!(objRoot instanceof WzProperty)) continue;
      for (const [, value] of Object.entries(objRoot.Items)) {
        if (!(value instanceof WzProperty)) continue;
        const obj = ObjInfo.From(value);
        if (obj.L0 === 'Common' && obj.L1 === 'frame') continue;
        const { sprite, anim } = this._loadObjEntry(obj);
        if (sprite === null && anim === null) continue;
        this._layer0Objects.push({ layer: layerIdx, info: obj, sprite, anim });
      }
    }
    this._layer0Objects.sort((a, b) => a.layer !== b.layer ? a.layer - b.layer : a.info.Z - b.info.Z);
    console.log(`Map scene loaded ${this._layer0Objects.length} objects across layers 0-7`);

    this._rebuildDisplay();
  }

  /**
   * Updates the camera position and rebuilds the display list. screenW/screenH
   * should be the real canvas size (e.g. `pixiApp.screen.width/height`), not
   * a hardcoded 800x600 — previously `_rebuildDisplay()` ignored real canvas
   * size entirely, which mis-centered/under-tiled the backdrop on any canvas
   * that wasn't exactly 800x600.
   */
  SetCamera(camera: { x: number; y: number }, screenW = 800, screenH = 600): void {
    this.Camera = camera;
    this._screenW = screenW;
    this._screenH = screenH;
    this._rebuildDisplay();
  }

  /** Transforms a map-space coordinate to screen pixel coordinates. */
  WorldToScreen(mapX: number, mapY: number, screenW: number, screenH: number): { x: number; y: number } {
    return {
      x: mapX + screenW / 2 - this.Camera.x,
      y: mapY + screenH / 2 - this.Camera.y,
    };
  }

  private _rebuildDisplay(): void {
    this.container.removeChildren();
    this._sprites.clear();

    const screenCenter = { x: this._screenW / 2, y: this._screenH / 2 };

    for (let i = 0; i < this._backgrounds.length; i++) {
      const { info, sprite, anim } = this._backgrounds[i];
      this._drawBackEntry(info, sprite, anim, screenCenter, this._screenW, this._screenH,
        this._bgScrollX[i] ?? 0, this._bgScrollY[i] ?? 0);
    }

    for (const { info, sprite, anim } of this._layer0Objects) {
      const sx = info.X + screenCenter.x - this.Camera.x;
      const sy = info.Y + screenCenter.y - this.Camera.y;
      if (anim) {
        const s = anim.Draw(sx, sy, info.Flip);
        this.container.addChild(s);
      } else if (sprite) {
        const s = sprite.ToPixi(info.Flip);
        s.position.set(sx, sy);
        this.container.addChild(s);
      }
    }

    for (let i = 0; i < this._foregrounds.length; i++) {
      const { info, sprite, anim } = this._foregrounds[i];
      this._drawBackEntry(info, sprite, anim, screenCenter, this._screenW, this._screenH,
        this._fgScrollX[i] ?? 0, this._fgScrollY[i] ?? 0);
    }
  }

  /** Advance animations and auto-scroll offsets. Call every frame with elapsed ms. */
  // Pixels-per-second for auto-scroll backgrounds. cx/cy in the WZ is the tile
  // repeat period, not a speed; empirically ~30 px/s looks like the original drift.
  private static readonly _ScrollPxSec = 30;
  private _scrollLogged = false;

  update(dtMs: number): void {
    const dtSec = dtMs / 1000;
    for (let i = 0; i < this._backgrounds.length; i++) {
      const { info, anim } = this._backgrounds[i];
      anim?.Update(dtMs);
      const period = info.Cx > 0 ? info.Cx : 100;
      const periodY = info.Cy > 0 ? info.Cy : 100;
      const spd = MapScene._ScrollPxSec * dtSec;
      switch (info.Type) {
        case BackType.HMoveA:
          if (!this._scrollLogged) { console.log(`[MapScene] HMoveA bg cx=${info.Cx} cy=${info.Cy} period=${period}`); this._scrollLogged = true; }
          this._bgScrollX[i] = ((this._bgScrollX[i] ?? 0) - spd) % period; break;
        case BackType.HMoveB: this._bgScrollX[i] = ((this._bgScrollX[i] ?? 0) + spd) % period; break;
        case BackType.VMoveA: this._bgScrollY[i] = ((this._bgScrollY[i] ?? 0) - spd) % periodY; break;
        case BackType.VMoveB: this._bgScrollY[i] = ((this._bgScrollY[i] ?? 0) + spd) % periodY; break;
      }
    }
    for (let i = 0; i < this._foregrounds.length; i++) {
      const { info, anim } = this._foregrounds[i];
      anim?.Update(dtMs);
      const period = info.Cx > 0 ? info.Cx : 100;
      const periodY = info.Cy > 0 ? info.Cy : 100;
      const spd = MapScene._ScrollPxSec * dtSec;
      switch (info.Type) {
        case BackType.HMoveA: this._fgScrollX[i] = ((this._fgScrollX[i] ?? 0) - spd) % period; break;
        case BackType.HMoveB: this._fgScrollX[i] = ((this._fgScrollX[i] ?? 0) + spd) % period; break;
        case BackType.VMoveA: this._fgScrollY[i] = ((this._fgScrollY[i] ?? 0) - spd) % periodY; break;
        case BackType.VMoveB: this._fgScrollY[i] = ((this._fgScrollY[i] ?? 0) + spd) % periodY; break;
      }
    }
    for (const e of this._layer0Objects) e.anim?.Update(dtMs);
  }

  private _drawBackEntry(
    info: BackInfo,
    sprite: WzSprite | null,
    anim: AnimatedSprite | null,
    screenCenter: { x: number; y: number },
    screenWidth: number,
    screenHeight: number,
    scrollX = 0,
    scrollY = 0,
  ): void {
    const bx = info.X + screenCenter.x - this.Camera.x + scrollX;
    const by = info.Y + screenCenter.y - this.Camera.y + scrollY;

    // Animated non-tiled: draw current frame at parallaxed position
    if (anim) {
      const isScrolling = info.Type === BackType.HMoveA || info.Type === BackType.HMoveB
        || info.Type === BackType.VMoveA || info.Type === BackType.VMoveB;
      const isTiled = info.Type === BackType.HTiled || info.Type === BackType.VTiled || info.Type === BackType.Tiled;
      if (!isTiled && !isScrolling) {
        const s = anim.Draw(bx, by);
        this.container.addChild(s);
        return;
      }
    }

    const wz = anim ? anim.Current : sprite;
    if (wz === null) return;

    switch (info.Type) {
      case BackType.Normal: {
        const s = this._newSprite(wz);
        s.position.set(bx, by);
        this.container.addChild(s);
        break;
      }
      // HMoveA/B = HTiled + auto-scroll (offset already in bx via scrollX)
      case BackType.HMoveA:
      case BackType.HMoveB:
      case BackType.HTiled:
        this._tileH(wz, bx, by, info, screenWidth);
        break;
      // VMoveA/B = VTiled + auto-scroll (offset already in by via scrollY)
      case BackType.VMoveA:
      case BackType.VMoveB:
      case BackType.VTiled:
        this._tileV(wz, bx, by, info, screenHeight);
        break;
      case BackType.Tiled:
        this._tileBoth(wz, bx, by, info, screenWidth, screenHeight);
        break;
    }
  }

  /** Create a cached Pixi Sprite for non-tiled entries (Normal). Reuses same sprite per texture+origin combo. */
  private _newSprite(wz: WzSprite): Sprite {
    const key = `${wz.Texture.uid}_${wz.OriginX}_${wz.OriginY}`;
    let s = this._sprites.get(key);
    if (!s) {
      s = this._makeSprite(wz);
      this._sprites.set(key, s);
    }
    return s;
  }

  /** Create a fresh Pixi Sprite for tiled entries — each tile needs its own instance with a unique position. */
  private _cloneSprite(wz: WzSprite): Sprite {
    return this._makeSprite(wz);
  }

  private _makeSprite(wz: WzSprite): Sprite {
    const s = new Sprite(wz.Texture);
    s.anchor.set(
      wz.Width > 0 ? wz.OriginX / wz.Width : 0,
      wz.Height > 0 ? wz.OriginY / wz.Height : 0,
    );
    return s;
  }

  private _tileH(wz: WzSprite, bx: number, by: number, info: BackInfo, screenWidth: number): void {
    const period = info.Cx > 0 ? info.Cx : wz.Width;
    if (period <= 0) { const s = this._cloneSprite(wz); s.position.set(bx, by); this.container.addChild(s); return; }
    let x = bx;
    while (x - wz.OriginX > -period) x -= period;
    for (; x < screenWidth + period; x += period) {
      const s = this._cloneSprite(wz); s.position.set(x, by); this.container.addChild(s);
    }
  }

  private _tileV(wz: WzSprite, bx: number, by: number, info: BackInfo, screenHeight: number): void {
    const period = info.Cy > 0 ? info.Cy : wz.Height;
    if (period <= 0) { const s = this._cloneSprite(wz); s.position.set(bx, by); this.container.addChild(s); return; }
    let y = by;
    while (y - wz.OriginY > -period) y -= period;
    for (; y < screenHeight + period; y += period) {
      const s = this._cloneSprite(wz); s.position.set(bx, y); this.container.addChild(s);
    }
  }

  private _tileBoth(wz: WzSprite, bx: number, by: number, info: BackInfo, screenWidth: number, screenHeight: number): void {
    const px = info.Cx > 0 ? info.Cx : wz.Width;
    const py = info.Cy > 0 ? info.Cy : wz.Height;
    if (px <= 0 || py <= 0) { const s = this._cloneSprite(wz); s.position.set(bx, by); this.container.addChild(s); return; }
    let sx = bx; while (sx - wz.OriginX > -px) sx -= px;
    let sy = by; while (sy - wz.OriginY > -py) sy -= py;
    for (let y = sy; y < screenHeight + py; y += py)
      for (let x = sx; x < screenWidth + px; x += px) {
        const s = this._cloneSprite(wz); s.position.set(x, y); this.container.addChild(s);
      }
  }

  private _loadBackEntry(bg: BackInfo): { sprite: WzSprite | null; anim: AnimatedSprite | null } {
    if (this._mapPkg === null) return { sprite: null, anim: null };
    const subTree = bg.Animated ? 'ani' : 'back';
    const path = `Back/${bg.Bs}.img/${subTree}/${bg.No}`;
    const node = this._mapPkg.GetItem(path);
    if (node instanceof WzProperty) {
      if (bg.Animated) {
        const anim = this._loader.LoadAnimation(node);
        if (anim) return { sprite: null, anim };
      }
      const c0 = node.Get('0');
      return { sprite: c0 instanceof WzCanvas ? this._loader.Load(c0) : null, anim: null };
    }
    return { sprite: node instanceof WzCanvas ? this._loader.Load(node) : null, anim: null };
  }

  private _loadObjEntry(obj: ObjInfo): { sprite: WzSprite | null; anim: AnimatedSprite | null } {
    if (this._mapPkg === null) return { sprite: null, anim: null };
    const path = `Obj/${obj.Os}.img/${obj.L0}/${obj.L1}/${obj.L2}`;
    const node = this._mapPkg.GetItem(path);
    if (node instanceof WzProperty) {
      const anim = this._loader.LoadAnimation(node);
      if (anim) return { sprite: null, anim };
      const c0 = node.Get('0');
      return { sprite: c0 instanceof WzCanvas ? this._loader.Load(c0) : null, anim: null };
    }
    return { sprite: node instanceof WzCanvas ? this._loader.Load(node) : null, anim: null };
  }

  private _readInt(p: WzProperty, key: string): number {
    const v = p.Get(key);
    if (typeof v === 'number') return v;
    if (typeof v === 'bigint') return Number(v);
    return 0;
  }
}
