import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';

/** OG CChatBalloon::MakeBalloon @0x4A84F0 nType values. */
export const BalloonType = {
  /** ChatBalloon.img/<nIdx> — player chat (CUser::OnChat @0x8E86C0). */
  Player: 1000,
  /** ChatBalloon.img/npc — NPC chat (CNpc::OnChat @0x675520). */
  Npc: 1001,
  /** ChatBalloon.img/pet/<nIdx> — pet chat (CPet @0x6A1450). */
  Pet: 1002,
  /** ChatBalloon.img/adboard/<nIdx> — routed to m_pLayerAD. */
  AdBoard: 1003,
  /** ChatBalloon.img/mob/<nIdx> — mob chat (CMob::TrySpeaking @0x64B6D0). */
  Mob: 1004,
  /** Special-font path (CreateCanvas font special-case). */
  Special: 1005,
} as const;

export type BalloonTypeValue = typeof BalloonType[keyof typeof BalloonType];

/** OG MakeBalloon tTimeOut for player chat: 5000ms (CUser::OnChat). */
const DefaultTtl = 5;
// OG CChatBalloon::CheckTimeOut @0x4A2060 fades the balloon's alpha out
// linearly over m_tFadeDalay once its timeout has elapsed. Per-message fade
// is supplied by the caller (SetFadeDelay @0x4A1200 clamps nDelay < 0 to 0);
// 1s is the v95 default look used by the TS layer.
const FadeDuration = 1;
// OG MakeBalloon reads the per-node nWidth via StringPool 0x1AA9, default 120
// (CreateCanvas @0x4A59D0 width budget / CalcLongestTextForGlobal).
const MaxTextWidth = 120;

export interface ChatBalloonLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  arrowX: number;
  arrowY: number;
}

/** CChatBalloon::CreateCanvas/AdjustCoordY equivalent for the nine pieces. */
export function computeChatBalloonLayout(
  innerWidth: number,
  lineCount: number,
  lineHeight: number,
  border: { left: number; right: number; top: number; bottom: number },
  arrowWidth: number,
  arrowHeight: number,
  tip: { x: number; y: number },
): ChatBalloonLayout {
  const width = Math.max(innerWidth, 8) + border.left + border.right;
  const height = Math.max(1, lineCount) * lineHeight + border.top + border.bottom;
  const x = Math.floor(tip.x - width / 2);
  // OG AdjustCoordY @0x4A1300 → RelMove(m_nPosY - m_nHeight - 5): the
  // composed balloon's bottom (the arrow tip) sits 5px above its anchor Y.
  // The arrow is drawn below the body, so back the body up by the arrow
  // height as well — the arrow's bottom edge lands at tip.y - 5.
  const arrowY = Math.floor(tip.y - 5 - arrowHeight);
  const y = Math.floor(arrowY - height);
  return { x, y, width, height, arrowX: Math.floor(tip.x - arrowWidth / 2), arrowY };
}

/** OG CreateCanvas @0x4A59D0: the node's `clr` is a signed BigInt ARGB color
    (e.g. player 0xFF000000, npc 0xFF800000) threaded into IWzFont::Create. */
export function decodeClr(value: unknown): number {
  if (typeof value === 'bigint') return Number(value) & 0xFFFFFF;
  if (typeof value === 'number') return value & 0xFFFFFF;
  return 0xFFFFFF;
}

/**
 * OG MakeBalloon path construction. Base = StringPool 0x59A "ChatBalloon.img";
 * fragments appended per nType (0x59B npc, 0x1AC6 pet, 0x59C adboard, 0x666 mob),
 * each followed by "/" + _Int2StrW(nIdx) where the node has numeric children.
 * bDead (StringPool 0x1AA8) appends the bare "dead" node — no nIdx.
 */
export function chatBalloonNodePath(type: number, nIdx = 0, bDead = false): string {
  const base = 'ChatBalloon.img';
  if (bDead) return `${base}/dead`;
  switch (type) {
    case BalloonType.Npc: return `${base}/npc`;
    case BalloonType.Pet: return `${base}/pet/${nIdx}`;
    case BalloonType.AdBoard: return `${base}/adboard/${nIdx}`;
    case BalloonType.Mob: return `${base}/mob/${nIdx}`;
    case BalloonType.Player:
    default: return `${base}/${nIdx}`;
  }
}

interface Balloon {
  lines: string[];
  width: number;
  life: number;
  view: BalloonView;
  fadeDelay: number;
  fontColor: number;
  fontFamily: string;
  lineHeight: number;
}

interface BalloonAssets {
  nw: WzSprite | null; n: WzSprite | null; ne: WzSprite | null;
  w: WzSprite | null; c: WzSprite | null; e: WzSprite | null;
  sw: WzSprite | null; s: WzSprite | null; se: WzSprite | null;
  arrow: WzSprite | null;
  fontColor: number;
  fontFamily: string;
  lineHeight: number;
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
  composedWidth = 0;
  composedHeight = 0;

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
      // The nine pieces + arrow are positioned by _drawBubble with (x, y)
      // meaning the piece's TOP-LEFT (a simple 3x3 tiling grid), not the WZ
      // origin. ToPixi() would anchor each piece at its WZ origin (inward
      // corner), which scatters every piece off its grid slot — zero the
      // anchor so the pieces tile into one coherent balloon.
      sp.anchor.set(0);
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
  private _loader: WzTextureLoader;
  private _ui: WzPackage | null;
  private _assets = new Map<string, BalloonAssets>();
  private _root: Container;
  private _active = new Map<number, Balloon>();

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    this._font = font;
    this._loader = loader;
    this._ui = ui;
    this._root = new Container();
  }

  get root(): Container { return this._root; }

  /**
   * OG MakeBalloon(this, bsText, pLayerOverlay, pVectorOrigin, tTimeOut, nType,
   * nIdx, bDead, nAdjustCoordY, nWidth). The anchor (pVectorOrigin) is resolved
   * per-charId by the Draw callback.
   */
  Set(charId: number, text: string, ttl: number = DefaultTtl,
    type: BalloonTypeValue = BalloonType.Player, nIdx = 0, fadeDelay = FadeDuration,
    bDead = false): void {
    if (!text || text.trim().length === 0) return;
    const assets = this._resolveAssets(type, nIdx, bDead);
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
    const delay = Math.max(0, fadeDelay);
    this._active.set(charId, {
      lines, width, life: Math.max(0, ttl) + delay, fadeDelay: delay, view,
      fontColor: assets.fontColor, fontFamily: assets.fontFamily, lineHeight: assets.lineHeight,
    });
  }

  Clear(charId: number): void {
    this._active.get(charId)?.view.destroy();
    this._active.delete(charId);
  }

  get activeCount(): number { return this._active.size; }

  getBalloonAlpha(charId: number): number | undefined {
    return this._active.get(charId)?.view.container.alpha;
  }

  getBalloonLayout(charId: number): { width: number; height: number } | undefined {
    const view = this._active.get(charId)?.view;
    return view ? { width: view.composedWidth, height: view.composedHeight } : undefined;
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

  private _resolveAssets(type: number, nIdx: number, bDead: boolean): BalloonAssets | undefined {
    const path = chatBalloonNodePath(type, nIdx, bDead);
    const cached = this._assets.get(path);
    if (cached) return cached;
    if (!(this._ui instanceof WzPackage)) return undefined;
    const node = this._ui.GetItem(path);
    if (!(node instanceof WzProperty)) return undefined;
    // OG CreateCanvas @0x4A59D0: the font color is the node's `clr` property
    // (BigInt, ARGB) threaded into IWzFont::Create. There is no per-node
    // `fontFace`/`lineHeight` — those come from the global font object.
    const fontColor = decodeClr(node.Get('clr'));
    const P = (k: string): WzSprite | null => {
      const v = node.Get(k);
      return v instanceof WzCanvas ? this._loader.Load(v) : null;
    };
    const family = this._font?.style.fontFamily;
    const fontFamily = Array.isArray(family) ? family[0] : (family ?? 'Arial');
    const assets: BalloonAssets = {
      nw: P('nw'), n: P('n'), ne: P('ne'), w: P('w'), c: P('c'), e: P('e'),
      sw: P('sw'), s: P('s'), se: P('se'), arrow: P('arrow'), fontColor,
      fontFamily, lineHeight: this._font?.lineHeight ?? 13,
    };
    this._assets.set(path, assets);
    return assets;
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
    // OG CheckTimeOut @0x4A2060: alpha ramps to 0 over the fade window once
    // the message's timeout has elapsed.
    const alpha = b.life < b.fadeDelay && b.fadeDelay > 0
      ? Math.max(0, b.life / b.fadeDelay) : 1;
    v.container.alpha = alpha;

    for (const t of v.texts) t.destroy();
    v.texts = [];

    // Use source texture dimensions, not the last composed frame's scaled
    // Sprite dimensions. This keeps the generated layout stable on redraw.
    const naturalW = (px: Sprite | null, fallback: number) => px ? px.texture.width : fallback;
    const naturalH = (px: Sprite | null, fallback: number) => px ? px.texture.height : fallback;
    const bl = naturalW(v.w, 6);
    const br = naturalW(v.e, 6);
    const bt = naturalH(v.n, 6);
    const bb = naturalH(v.s, 6);
    const lineH = b.lineHeight;
    const innerW = Math.max(b.width, 8);
    const layout = computeChatBalloonLayout(innerW, b.lines.length, lineH,
      { left: bl, right: br, top: bt, bottom: bb }, v.arrow?.texture.width ?? 6,
      v.arrow?.texture.height ?? 6, tip);
    const winW = layout.width;
    const winH = layout.height;
    v.composedWidth = winW;
    v.composedHeight = winH + (v.arrow?.texture.height ?? 6);
    const winX = layout.x;
    const winY = layout.y;

    const nwW = naturalW(v.nw, 6), neW = naturalW(v.ne, 6);
    const swW = naturalW(v.sw, 6), seW = naturalW(v.se, 6);
    const nwH = naturalH(v.nw, 6), neH = naturalH(v.ne, 6);
    const swH = naturalH(v.sw, 6), seH = naturalH(v.se, 6);

    const s = (px: Sprite | null, x: number, y: number, w?: number, h?: number) => {
      if (!px) return;
      px.x = x; px.y = y; px.visible = true;
      px.scale.set(1);
      if (w !== undefined) px.width = w;
      if (h !== undefined) px.height = h;
    };

    s(v.nw, winX, winY);
    s(v.ne, winX + winW - neW, winY);
    s(v.sw, winX, winY + winH - swH);
    s(v.se, winX + winW - seW, winY + winH - seH);
    s(v.n, winX + nwW, winY, Math.max(1, winW - nwW - neW));
    s(v.s, winX + swW, winY + winH - naturalH(v.s, bb), Math.max(1, winW - swW - seW));
    s(v.w, winX, winY + nwH, undefined, Math.max(1, winH - nwH - swH));
    s(v.e, winX + winW - naturalW(v.e, br), winY + neH, undefined, Math.max(1, winH - neH - seH));

    v.bg.clear();
    if (v.c) {
      v.c.x = winX + bl;
      v.c.y = winY + bt;
      v.c.width = innerW;
      v.c.height = Math.max(1, winH - bt - bb);
      v.c.visible = true;
    } else {
      // Keep a fallback for clients whose ChatBalloon asset is incomplete.
      v.bg.rect(winX + bl, winY + bt, innerW, Math.max(1, winH - bt - bb)).fill({ color: 0x1A1C28, alpha: 0.9 });
    }

    if (v.arrow) {
      v.arrow.scale.set(1);
      v.arrow.x = Math.floor(tip.x - v.arrow.texture.width / 2);
      v.arrow.y = layout.arrowY;
      v.arrow.visible = true;
    }

    if (this._font) {
      const textStyle = this._font.style.clone();
      textStyle.fill = b.fontColor;
      textStyle.fontFamily = b.fontFamily;
      textStyle.lineHeight = lineH;
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
