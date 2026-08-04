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

interface BalloonAssets {
  nw: WzSprite | null; n: WzSprite | null; ne: WzSprite | null;
  w: WzSprite | null; c: WzSprite | null; e: WzSprite | null;
  sw: WzSprite | null; s: WzSprite | null; se: WzSprite | null;
  arrow: WzSprite | null;
  fontColor: number;
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
  c: Sprite | null = null;
  w: Sprite | null = null; e: Sprite | null = null;
  sw: Sprite | null = null; s: Sprite | null = null; se: Sprite | null = null;
  arrow: Sprite | null = null;
  texts: Text[] = [];

  constructor(parent: Container, src: {
    nw: WzSprite | null; n: WzSprite | null; ne: WzSprite | null;
    c: WzSprite | null;
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
    this.c = bind(src.c);
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
  private _assets = new Map<number, BalloonAssets>();
  private _root: Container;
  private _active = new Map<number, Balloon>();

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    this._font = font;
    this._root = new Container();
    for (let type = 0; type <= 3; type++) {
      const b = ui?.GetItem(`ChatBalloon.img/${type}`);
      if (!(b instanceof WzProperty)) continue;
      const value = b.Get('fontColor');
      const fontColor = typeof value === 'number' ? value & 0xFFFFFF
        : typeof value === 'bigint' ? Number(value) & 0xFFFFFF : 0xFFFFFF;
      const P = (k: string): WzSprite | null => {
        const v = b.Get(k);
        return v instanceof WzCanvas ? loader.Load(v) : null;
      };
      this._assets.set(type, {
        nw: P('nw'), n: P('n'), ne: P('ne'), w: P('w'), c: P('c'), e: P('e'),
        sw: P('sw'), s: P('s'), se: P('se'), arrow: P('arrow'), fontColor,
      });
    }
  }

  get root(): Container { return this._root; }

  Set(charId: number, text: string, ttl: number = Ttl, type = 0): void {
    if (!text || text.trim().length === 0) return;
    const assets = this._assets.get(type) ?? this._assets.get(0);
    if (!assets?.c) return;
    this._active.get(charId)?.view.destroy();
    const lines = this._wrap(text);
    let width = 0;
    for (const ln of lines) {
      width = Math.max(width, Math.floor(this._font?.measure(ln).x ?? 0));
    }
    const view = new BalloonView(this._root, {
      nw: assets.nw, n: assets.n, ne: assets.ne, w: assets.w, c: assets.c, e: assets.e,
      sw: assets.sw, s: assets.s, se: assets.se, arrow: assets.arrow,
    });
    (view as BalloonView & { fontColor?: number }).fontColor = assets.fontColor;
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
    const bl = v.w ? v.w.width : 6;
    const br = v.e ? v.e.width : 6;
    const bt = v.n ? v.n.height : 6;
    const bb = v.s ? v.s.height : 6;
    const innerW = Math.max(b.width, 8);
    const innerH = b.lines.length * lineH;
    const winW = innerW + bl + br;
    const winH = innerH + bt + bb;
    const winX = Math.floor(tip.x - winW / 2);
    const winY = Math.floor(tip.y - (v.arrow?.height ?? 6) - winH);

    const s = (px: Sprite | null, x: number, y: number, w?: number, h?: number) => {
      if (!px) return;
      px.x = x; px.y = y; px.visible = true;
      if (w !== undefined) px.width = w;
      if (h !== undefined) px.height = h;
    };

    s(v.nw, winX, winY);
    s(v.ne, winX + winW - (v.ne?.width ?? 0), winY);
    s(v.sw, winX, winY + winH - (v.sw?.height ?? 0));
    s(v.se, winX + winW - (v.se?.width ?? 0), winY + winH - (v.se?.height ?? 0));
    s(v.n, winX + (v.nw?.width ?? 0), winY, Math.max(1, winW - (v.nw?.width ?? 0) - (v.ne?.width ?? 0)));
    s(v.s, winX + (v.sw?.width ?? 0), winY + winH - (v.s?.height ?? 0), Math.max(1, winW - (v.sw?.width ?? 0) - (v.se?.width ?? 0)));
    s(v.w, winX, winY + (v.nw?.height ?? 0), undefined, Math.max(1, winH - (v.nw?.height ?? 0) - (v.sw?.height ?? 0)));
    s(v.e, winX + winW - (v.e?.width ?? 0), winY + (v.ne?.height ?? 0), undefined, Math.max(1, winH - (v.ne?.height ?? 0) - (v.se?.height ?? 0)));

    v.bg.clear();
    if (v.c) {
      v.c.x = winX + bl;
      v.c.y = winY + bt;
      v.c.width = innerW;
      v.c.height = innerH;
      v.c.visible = true;
    } else {
      // Keep a fallback for clients whose ChatBalloon asset is incomplete.
      v.bg.rect(winX + bl, winY + bt, innerW, innerH).fill({ color: 0x1A1C28, alpha: 0.9 });
    }

    if (v.arrow) {
      v.arrow.x = Math.floor(tip.x - v.arrow.width / 2);
      v.arrow.y = winY + winH - 1;
      v.arrow.visible = true;
    }

    if (this._font) {
      const textStyle = this._font.style.clone();
      textStyle.fill = (v as BalloonView & { fontColor?: number }).fontColor ?? 0xFFFFFF;
      for (let i = 0; i < b.lines.length; i++) {
        const t = new Text({ text: b.lines[i], style: textStyle });
        t.x = winX + bl;
        t.y = winY + bt + i * lineH;
        v.container.addChild(t);
        v.texts.push(t);
      }
    }
  }
}
