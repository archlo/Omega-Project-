import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';

const Ttl = 4;
// decompile/4A2060.c CChatBalloon::CheckTimeOut fades the balloon's alpha
// out linearly over m_tFadeDalay once its timeout has elapsed, rather than
// disappearing instantly. The constructor (decompile/4A2620.c) only zeroes
// m_tFadeDalay as a default; the real per-message fade duration is supplied
// by the caller that shows the balloon (not found in this corpus), so this
// is a reasonable approximation, not an extracted constant.
const FadeDuration = 1;
const MaxTextWidth = 160;

interface Balloon {
  lines: string[];
  width: number;
  life: number;
  view: BalloonView;
}

// Per-balloon sprite set. CChatBalloon::CheckTimeOut/AdjustCoordY operate on
// one balloon at a time; the previous TS implementation drew every active
// balloon onto one shared singleton sprite set, so only the last-drawn
// balloon of the frame ever appeared correctly when 2+ players spoke at
// once. Each balloon now owns its own border sprites/background/text.
class BalloonView {
  readonly container = new Container();
  readonly bg = new Graphics();
  nw: Sprite | null = null; n: Sprite | null = null; ne: Sprite | null = null;
  w: Sprite | null = null; e: Sprite | null = null;
  sw: Sprite | null = null; s: Sprite | null = null; se: Sprite | null = null;
  arrow: Sprite | null = null;
  texts: Text[] = [];

  constructor(parent: Container, src: {
    nw: WzSprite | null; n: WzSprite | null; ne: WzSprite | null;
    w: WzSprite | null; e: WzSprite | null;
    sw: WzSprite | null; s: WzSprite | null; se: WzSprite | null;
    arrow: WzSprite | null;
  }) {
    this.container.addChild(this.bg);
    const bind = (wz: WzSprite | null): Sprite | null => {
      if (!wz) return null;
      const sp = wz.ToPixi();
      this.container.addChild(sp);
      return sp;
    };
    this.nw = bind(src.nw); this.n = bind(src.n); this.ne = bind(src.ne);
    this.w = bind(src.w); this.e = bind(src.e);
    this.sw = bind(src.sw); this.s = bind(src.s); this.se = bind(src.se);
    this.arrow = bind(src.arrow);
    parent.addChild(this.container);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

export class ChatBalloonLayer {
  private _font: BuiltInFont | null;
  private _nw: WzSprite | null; private _n: WzSprite | null; private _ne: WzSprite | null;
  private _w: WzSprite | null; private _c: WzSprite | null; private _e: WzSprite | null;
  private _sw: WzSprite | null; private _s: WzSprite | null; private _se: WzSprite | null;
  private _arrow: WzSprite | null;
  private _root: Container;
  private _active = new Map<number, Balloon>();

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    this._font = font;
    this._root = new Container();
    this._nw = this._n = this._ne = this._w = this._c = this._e = this._sw = this._s = this._se = this._arrow = null;

    const b = ui?.GetItem('ChatBalloon.img/0');
    if (b instanceof WzProperty) {
      const P = (k: string): WzSprite | null => {
        const v = b.Get(k);
        return v instanceof WzCanvas ? loader.Load(v) : null;
      };
      this._nw = P('nw'); this._n = P('n'); this._ne = P('ne');
      this._w = P('w'); this._c = P('c'); this._e = P('e');
      this._sw = P('sw'); this._s = P('s'); this._se = P('se');
      this._arrow = P('arrow');
    }
  }

  get root(): Container { return this._root; }

  Set(charId: number, text: string, ttl: number = Ttl): void {
    if (!text || text.trim().length === 0) return;
    if (this._c === null) return;
    this._active.get(charId)?.view.destroy();
    const lines = this._wrap(text);
    let width = 0;
    for (const ln of lines) {
      width = Math.max(width, Math.floor(this._font?.measure(ln).x ?? 0));
    }
    const view = new BalloonView(this._root, {
      nw: this._nw, n: this._n, ne: this._ne, w: this._w, e: this._e,
      sw: this._sw, s: this._s, se: this._se, arrow: this._arrow,
    });
    this._active.set(charId, { lines, width, life: ttl, view });
  }

  Clear(charId: number): void {
    this._active.get(charId)?.view.destroy();
    this._active.delete(charId);
  }

  Update(dt: number): void {
    if (this._active.size === 0) return;
    const expired: number[] = [];
    for (const [id, b] of this._active) {
      b.life -= dt;
      if (b.life <= 0) expired.push(id);
    }
    for (const id of expired) {
      this._active.get(id)?.view.destroy();
      this._active.delete(id);
    }
  }

  Draw(headScreenPos: (charId: number) => { x: number; y: number } | null): void {
    if (this._c === null) return;
    for (const [id, b] of this._active) {
      const tip = headScreenPos(id);
      if (tip !== null) {
        b.view.container.visible = true;
        this._drawBubble(b, tip);
      } else {
        b.view.container.visible = false;
      }
    }
  }

  private _wrap(text: string): string[] {
    if (this._font === null) return [text];
    const lines: string[] = [];
    let cur = '';
    for (const word of text.split(' ')) {
      const trial = cur.length === 0 ? word : cur + ' ' + word;
      if (this._font.measure(trial).x > MaxTextWidth && cur.length > 0) {
        lines.push(cur);
        cur = word;
      } else {
        cur = trial;
      }
    }
    if (cur.length > 0) lines.push(cur);
    return lines.length === 0 ? [text] : lines;
  }

  private _drawBubble(b: Balloon, tip: { x: number; y: number }): void {
    const v = b.view;
    // decompile/4A2060.c CheckTimeOut: alpha ramps to 0 over the fade
    // window once the message's timeout has elapsed.
    const alpha = b.life < FadeDuration ? Math.max(0, b.life / FadeDuration) : 1;
    v.container.alpha = alpha;

    for (const t of v.texts) t.destroy();
    v.texts = [];

    const lineH = this._font?.lineHeight ?? 13;
    const bl = this._w?.Width ?? 6;
    const br = this._e?.Width ?? 6;
    const bt = this._n?.Height ?? 6;
    const bb = this._s?.Height ?? 6;
    const innerW = Math.max(b.width, 8);
    const innerH = b.lines.length * lineH;
    const winW = innerW + bl + br;
    const winH = innerH + bt + bb;
    const winX = Math.floor(tip.x - winW / 2);
    const winY = Math.floor(tip.y - (this._arrow?.Height ?? 6) - winH);

    const s = (px: Sprite | null, x: number, y: number, w?: number, h?: number) => {
      if (!px) return;
      px.x = x; px.y = y; px.visible = true;
      if (w !== undefined) px.width = w;
      if (h !== undefined) px.height = h;
    };

    s(v.nw, winX, winY);
    s(v.ne, winX + winW - (this._ne?.Width ?? 0), winY);
    s(v.sw, winX, winY + winH - (this._sw?.Height ?? 0));
    s(v.se, winX + winW - (this._se?.Width ?? 0), winY + winH - (this._se?.Height ?? 0));
    s(v.n, winX + (this._nw?.Width ?? 0), winY, Math.max(1, winW - (this._nw?.Width ?? 0) - (this._ne?.Width ?? 0)));
    s(v.s, winX + (this._sw?.Width ?? 0), winY + winH - (this._s?.Height ?? 0), Math.max(1, winW - (this._sw?.Width ?? 0) - (this._se?.Width ?? 0)));
    s(v.w, winX, winY + (this._nw?.Height ?? 0), undefined, Math.max(1, winH - (this._nw?.Height ?? 0) - (this._sw?.Height ?? 0)));
    s(v.e, winX + winW - (this._e?.Width ?? 0), winY + (this._ne?.Height ?? 0), undefined, Math.max(1, winH - (this._ne?.Height ?? 0) - (this._se?.Height ?? 0)));

    v.bg.clear();
    v.bg.rect(winX + bl, winY + bt, innerW, innerH).fill({ color: 0x1A1C28, alpha: 0.9 });

    if (v.arrow) {
      v.arrow.x = Math.floor(tip.x - (this._arrow?.Width ?? 0) / 2);
      v.arrow.y = winY + winH - 1;
      v.arrow.visible = true;
    }

    if (this._font) {
      for (let i = 0; i < b.lines.length; i++) {
        const t = new Text({ text: b.lines[i], style: this._font.style });
        t.x = winX + bl;
        t.y = winY + bt + i * lineH;
        v.container.addChild(t);
        v.texts.push(t);
      }
    }
  }
}
