import { Container, Sprite } from 'pixi.js';
import { WzSprite } from '../render/WzSprite.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';

const DigitOverlap = 2;
const BasicEff = 'BasicEff.img';

const MaxDigits = 16;

export class DamageDigits {
  readonly container = new Container();
  private _white: (WzSprite | null)[] = new Array(10).fill(null);
  private _crit: (WzSprite | null)[] = new Array(10).fill(null);
  private _miss: WzSprite | null = null;
  // Keyed by "<slotKey>:<digitIndex>", not just digitIndex — multiple
  // damage numbers are commonly on screen at once (e.g. two simultaneous
  // mob hits), each needing its own independent set of digit Sprites.
  // Pooling purely by digit-position-within-string (the original design)
  // made every DrawNumber/DrawMiss call in the same frame reuse the exact
  // same slots, so only the last-drawn number in any given frame actually
  // ended up visible — every earlier one's sprites got silently relocated
  // onto the last call's position.
  private _digitSprites = new Map<string, Sprite>();
  private _activeSlots = new Set<string>();

  get LoadedWhite(): boolean { return this._white[0] !== null; }
  get LoadedCrit(): boolean { return this._crit[0] !== null; }
  get LoadedMiss(): boolean { return this._miss !== null; }

  constructor(effectWz: WzPackage | null, loader: WzTextureLoader) {
    if (effectWz === null) return;

    for (const node of ['NoRed1', 'NoRed0', 'Basic']) {
      if (DamageDigits._tryLoadDigits(effectWz, loader, `${BasicEff}/${node}`, this._white)) break;
    }
    for (const node of ['NoCri1', 'NoCri0', 'Cri']) {
      if (DamageDigits._tryLoadDigits(effectWz, loader, `${BasicEff}/${node}`, this._crit)) break;
    }
    for (const path of [`${BasicEff}/NoMiss/0`, `${BasicEff}/Miss/0`]) {
      const mc = effectWz.GetItem(path);
      if (mc instanceof WzCanvas) { this._miss = loader.Load(mc); break; }
    }
  }

  /** Destroy every digit Sprite belonging to a slotKey that wasn't drawn
      this frame (the caller's damage-number entry expired/was removed).
      Call once per frame before the DrawNumber/DrawMiss calls for the
      surviving entries, with the set of still-live slotKeys — without this,
      every distinct damage number ever shown over a play session would leave
      its digit Sprites permanently allocated (just invisible) instead of
      reclaimed. */
  beginFrame(liveSlotKeys: ReadonlySet<string>): void {
    for (const key of this._activeSlots) {
      if (liveSlotKeys.has(key)) continue;
      for (let i = 0; i < MaxDigits; i++) {
        const slotId = `${key}:${i}`;
        const s = this._digitSprites.get(slotId);
        if (s) { s.destroy(); this._digitSprites.delete(slotId); }
      }
      this._activeSlots.delete(key);
    }
  }

  DrawNumber(slotKey: string, text: string, screenCenter: { x: number; y: number }, alpha: number, crit: boolean): boolean {
    const set = crit ? this._crit : this._white;
    if (set[0] === null) return false;

    let totalW = 0;
    let count = 0;
    for (const ch of text) {
      if (ch < '0' || ch > '9') continue;
      const sp = set[parseInt(ch)];
      if (sp === null) return false;
      totalW += sp.Width;
      count++;
    }
    if (count === 0) return false;
    totalW -= (count - 1) * DigitOverlap;

    this._activeSlots.add(slotKey);
    let spIdx = 0;
    let x = Math.round(screenCenter.x - totalW / 2);
    const y = Math.round(screenCenter.y);
    for (const ch of text) {
      if (ch < '0' || ch > '9') continue;
      const sp = set[parseInt(ch)]!;
      const pixi = this._digitSprite(`${slotKey}:${spIdx++}`, sp);
      // NewSprite() already sets anchor = (OriginX/Width, OriginY/Height),
      // so position alone (no extra +Origin) lands the sprite's hotspot
      // exactly at (x, y) — matching the convention used everywhere else in
      // this codebase that draws WzSprites (see MapScene.ts's tile/obj blit).
      pixi.position.set(x, y);
      pixi.alpha = alpha;
      pixi.visible = true;
      x += sp.Width - DigitOverlap;
    }
    for (; spIdx < MaxDigits; spIdx++) {
      const s = this._digitSprites.get(`${slotKey}:${spIdx}`);
      if (s) s.visible = false;
    }
    return true;
  }

  DrawMiss(slotKey: string, screenCenter: { x: number; y: number }, alpha: number): boolean {
    if (this._miss === null) return false;
    this._activeSlots.add(slotKey);
    const x = Math.round(screenCenter.x - this._miss.Width / 2);
    const y = Math.round(screenCenter.y);
    const pixi = this._digitSprite(`${slotKey}:0`, this._miss);
    pixi.position.set(x, y);
    pixi.alpha = alpha;
    pixi.visible = true;
    for (let i = 1; i < MaxDigits; i++) {
      const s = this._digitSprites.get(`${slotKey}:${i}`);
      if (s) s.visible = false;
    }
    return true;
  }

  private _digitSprite(key: string, src: WzSprite): Sprite {
    // Each on-screen digit position needs its own Sprite instance — the same
    // digit value (e.g. '8') commonly appears more than once in one number
    // (88, 100, 1000, ...), and WzSprite.ToPixi() caches a single shared
    // Sprite per WzSprite, which Pixi can only place in one position at a
    // time. NewSprite() always allocates a fresh instance, exactly the case
    // its own doc comment calls out ("same WzSprite in multiple containers
    // simultaneously").
    let s = this._digitSprites.get(key);
    if (!s) {
      s = src.NewSprite();
      this._digitSprites.set(key, s);
      this.container.addChild(s);
    } else {
      s.texture = src.Texture;
      s.anchor.set(
        src.Width > 0 ? src.OriginX / src.Width : 0,
        src.Height > 0 ? src.OriginY / src.Height : 0,
      );
    }
    return s;
  }

  private static _tryLoadDigits(wz: WzPackage, loader: WzTextureLoader, basePath: string, dst: (WzSprite | null)[]): boolean {
    for (let i = 0; i < 10; i++) {
      const node = wz.GetItem(`${basePath}/${i}`);
      if (node instanceof WzCanvas) {
        dst[i] = loader.Load(node);
      } else if (node instanceof WzProperty) {
        for (const [, v] of Object.entries(node.Items)) {
          if (v instanceof WzCanvas) { dst[i] = loader.Load(v); break; }
        }
      }
    }
    return dst[0] !== null;
  }
}
