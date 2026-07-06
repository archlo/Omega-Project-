import { Container, Graphics, Sprite } from 'pixi.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzUol } from '../../wz/WzUol.js';

// No separate shared-asset class — confirmed this chrome (Can/Cannot job
// labels, digit-style glyphs, weapon-category icons, Star) is owned directly
// by CUIToolTip's own methods: InitCanvas, GetFontByType (~15 call sites for
// different font/digit-style lookups), MakeLayer, DrawItemReqJob (strongest
// match for the job-requirement label rendering). No CUICommon/CWzResource-
// style shared class exists anywhere in this corpus.
export class TooltipAssets {
  private _loader: WzTextureLoader;
  private _root: WzProperty | null;
  private _cache = new Map<string, WzSprite | null>();

  constructor(loader: WzTextureLoader, uiWz: WzPackage | null) {
    this._loader = loader;
    const v = uiWz?.GetItem('UIWindow2.img/ToolTip/Equip');
    this._root = v instanceof WzProperty ? v : null;
  }

  get IsAvailable(): boolean { return this._root !== null; }

  Get(subPath: string): WzSprite | null {
    const cached = this._cache.get(subPath);
    if (cached !== undefined) return cached;

    let sprite: WzSprite | null = null;
    if (this._root !== null) {
      let node = this._root.GetItem(subPath);
      if (node instanceof WzUol) node = node.Resolve();
      if (node instanceof WzCanvas) sprite = this._loader.Load(node);
    }
    this._cache.set(subPath, sprite);
    return sprite;
  }

  Req(key: string, met: boolean): WzSprite | null {
    return this.Get(`${met ? 'Can' : 'Cannot'}/${key}`);
  }

  JobLabel(klass: string, greyed: boolean): WzSprite | null {
    return this.Get(`${greyed ? 'Cannot' : 'Can'}/${klass}`);
  }

  Digit(d: number, met: boolean): WzSprite | null {
    const ns = met ? 'Can' : 'Cannot';
    if (d < 0 || d > 9) return this.Get(`${ns}/none`);
    return this.Get(`${ns}/${d}`);
  }

  Dot(index: number): WzSprite | null { return this.Get(`Dot/${index}`); }
  Property(index: number): WzSprite | null { return this.Get(`Property/${index}`); }
  Speed(index: number): WzSprite | null { return this.Get(`Speed/${index}`); }
  WeaponCategory(index: number): WzSprite | null { return this.Get(`WeaponCategory/${index}`); }
  ItemCategory(index: number): WzSprite | null { return this.Get(`ItemCategory/${index}`); }
  get Cash(): WzSprite | null { return this.Get('cash'); }
  get Mesos(): WzSprite | null { return this.Get('mesos'); }
  get Star(): WzSprite | null { return this.Get('Star/Star'); }

  MeasureNumber(value: number, met: boolean, horzSpace = 0): number {
    let w = 0;
    let first = true;
    for (const ch of String(value)) {
      const s = this.Digit(parseInt(ch), met);
      if (s === null) continue;
      if (!first) w += horzSpace;
      w += s.Width;
      first = false;
    }
    return w;
  }

  DrawNumber(value: number, met: boolean, x: number, y: number, parent: Container, spacing = 0): number {
    const digits = String(value);
    let curX = x;
    let first = true;
    for (const ch of digits) {
      if (!first) curX += spacing;
      const d = parseInt(ch, 10);
      const s = this.Digit(d, met);
      if (s) {
        this.BlitAt(s, curX, y, parent);
        curX += s.Width;
      } else {
        curX += 8; // fallback width
      }
      first = false;
    }
    return curX - x;
  }

  BlitAt(sprite: WzSprite | null, x: number, y: number, parent: Container): void {
    if (!sprite) return;
    // NewSprite(), not ToPixi(): the same digit/glyph WzSprite is routinely
    // blitted more than once in one call (e.g. DrawNumber(100, ...) needs
    // two separate on-screen '0's), but ToPixi() caches one shared Sprite
    // per WzSprite — re-adding that single cached Sprite would just move it
    // to the last position instead of drawing a second instance. Anchor is
    // already set to (OriginX/Width, OriginY/Height) by NewSprite(), so
    // position alone (no extra +/-Origin) lands the hotspot at (x, y).
    const sp = sprite.NewSprite();
    sp.x = x;
    sp.y = y;
    parent.addChild(sp);
  }
}
