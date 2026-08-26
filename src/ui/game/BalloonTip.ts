import { Container, Sprite, Text, Texture, TextStyle } from 'pixi.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';

// OG: UIHelper::MakeBalloonTip @0x7C9780 + make_balloon @0x95DE30.
// The balloon shape is a 9-slice drawn from the property StringPool 0xC9D =
// "UI/Login.img/WorldNotice/Balloon": corners nw/ne/sw/se (9x9), edges n/s
// (1x9) and w/e (9x1), center c (1x1); text color from the node's clr int
// (0xFF000000). The arrow piece per direction is StringPool 1450(selArrow,
// dir 1) / 1451(swlArrow, dir 2) / 1452(nelArrow, dir 0) / 1453(nwlArrow,
// dir 3). tipW = maxTextWidth+20, tipH = 15*lineCount+20.

export const BALLOON_WZ_PATH = 'Login.img/WorldNotice/Balloon';

/** Corner size of the Balloon 9-slice (all four corner canvases are 9x9). */
export const BALLOON_CORNER = 9;
/** Arrow canvas offset from the tip edge (MakeBalloonTip constants). */
export const BALLOON_ARROW_INSET = 8;
const BALLOON_MARGIN = 20; // tipW = maxTextWidth + 20
const LINE_STEP = 15; // rows advance 15px
const FIRST_ROW_DY = 10; // first row at nTipY + 10

export interface BalloonTipPieces {
  nw: Texture | null;
  n: Texture | null;
  ne: Texture | null;
  e: Texture | null;
  w: Texture | null;
  c: Texture | null;
  sw: Texture | null;
  s: Texture | null;
  se: Texture | null;
  selArrow: Texture | null;
  swlArrow: Texture | null;
  nelArrow: Texture | null;
  nwlArrow: Texture | null;
}

/**
 * Loads the WorldNotice/Balloon pieces from UI.wz. Returns null when the
 * subtree is absent so callers can skip drawing entirely (authentic rule:
 * no hand-drawn fallback).
 */
export function loadBalloonTipPieces(loader: WzTextureLoader, uiWz: WzPackage | null): BalloonTipPieces | null {
  const root = uiWz?.GetItem(BALLOON_WZ_PATH);
  if (!(root instanceof WzProperty)) return null;
  const names = ['nw', 'n', 'ne', 'e', 'w', 'c', 'sw', 's', 'se',
    'selArrow', 'swlArrow', 'nelArrow', 'nwlArrow'] as const;
  const pieces: Record<string, Texture | null> = {};
  for (const p of names) {
    const node = root.Get(p);
    pieces[p] = node instanceof WzCanvas ? (loader.Load(node)?.Texture ?? null) : null;
  }
  return pieces as unknown as BalloonTipPieces;
}

export interface BalloonTipLayout {
  /** Layer position relative to the parent window. */
  x: number;
  y: number;
  /** 9-slice origin inside the layer (content margin toward the anchor). */
  ox: number;
  oy: number;
  /** Arrow piece name + position inside the layer. */
  arrow: string;
  ax: number;
  ay: number;
}

/**
 * OG MakeBalloonTip switch on nDir — exact table:
 *  0: left of the anchor, arrow on the right edge top (nelArrow)
 *  1: left-above, arrow right edge bottom (selArrow)
 *  2: above, arrow left edge bottom (swlArrow)
 *  3: at the anchor, arrow top-left corner (nwlArrow)
 */
export function balloonTipLayout(nDir: number, nX: number, nY: number, tipW: number, tipH: number, lineCount: number): BalloonTipLayout {
  const bottomArrowY = lineCount * LINE_STEP + 4;
  switch (nDir) {
    case 0:
      return { x: nX - tipW - 23, y: nY, ox: 0, oy: 23, arrow: 'nelArrow', ax: tipW - BALLOON_ARROW_INSET, ay: 0 };
    case 1:
      return { x: nX - tipW - 23, y: nY - tipH - 23, ox: 0, oy: 0, arrow: 'selArrow', ax: tipW - BALLOON_ARROW_INSET, ay: bottomArrowY };
    case 2:
      return { x: nX, y: nY - tipH - 23, ox: 23, oy: 0, arrow: 'swlArrow', ax: 0, ay: bottomArrowY };
    default: // 3
      return { x: nX, y: nY, ox: 23, oy: 23, arrow: 'nwlArrow', ax: 0, ay: 0 };
  }
}

export interface MakeBalloonTipOpts {
  pieces: BalloonTipPieces;
  lines: string[];
  nDir: number;
  nX: number;
  nY: number;
  textStyle: TextStyle;
  measure: (line: string) => number;
}

/**
 * Builds the balloon tip Container positioned at (nX, nY) in the caller's
 * coordinate space. Returns an empty-positioned container when the required
 * pieces are missing (no invention).
 */
export function makeBalloonTip(opts: MakeBalloonTipOpts): Container {
  const { pieces, lines, textStyle, measure } = opts;
  const tip = new Container();
  if (!pieces.c) return tip;

  let maxW = 0;
  for (const l of lines) maxW = Math.max(maxW, measure(l));
  const tipW = Math.ceil(maxW) + BALLOON_MARGIN;
  const tipH = lines.length * LINE_STEP + BALLOON_MARGIN;

  const lay = balloonTipLayout(opts.nDir, opts.nX, opts.nY, tipW, tipH, lines.length);
  tip.position.set(lay.x, lay.y);

  const put = (tex: Texture | null, x: number, y: number, w?: number, h?: number): void => {
    if (!tex) return;
    const s = new Sprite(tex);
    s.position.set(x, y);
    if (w !== undefined) s.width = w;
    if (h !== undefined) s.height = h;
    tip.addChild(s);
  };
  const innerW = Math.max(0, tipW - BALLOON_CORNER * 2);
  const innerH = Math.max(0, tipH - BALLOON_CORNER * 2);
  put(pieces.nw, lay.ox, lay.oy, BALLOON_CORNER, BALLOON_CORNER);
  put(pieces.n, lay.ox + BALLOON_CORNER, lay.oy, innerW, BALLOON_CORNER);
  put(pieces.ne, lay.ox + BALLOON_CORNER + innerW, lay.oy, BALLOON_CORNER, BALLOON_CORNER);
  put(pieces.w, lay.ox, lay.oy + BALLOON_CORNER, BALLOON_CORNER, innerH);
  put(pieces.c, lay.ox + BALLOON_CORNER, lay.oy + BALLOON_CORNER, innerW, innerH);
  put(pieces.e, lay.ox + BALLOON_CORNER + innerW, lay.oy + BALLOON_CORNER, BALLOON_CORNER, innerH);
  put(pieces.sw, lay.ox, lay.oy + BALLOON_CORNER + innerH, BALLOON_CORNER, BALLOON_CORNER);
  put(pieces.s, lay.ox + BALLOON_CORNER, lay.oy + BALLOON_CORNER + innerH, innerW, BALLOON_CORNER);
  put(pieces.se, lay.ox + BALLOON_CORNER + innerW, lay.oy + BALLOON_CORNER + innerH, BALLOON_CORNER, BALLOON_CORNER);
  // Arrow
  put(pieces[lay.arrow as keyof BalloonTipPieces], lay.ox + lay.ax, lay.oy + lay.ay);

  // Text rows — centered (OG DrawTextA at nTipX + nTipWidth/2 - w/2),
  // first row at nTipY + 10, +15 step.
  for (let i = 0; i < lines.length; i++) {
    const t = new Text({ text: lines[i], style: textStyle });
    t.x = lay.ox + tipW / 2 - t.width / 2;
    t.y = lay.oy + FIRST_ROW_DY + i * LINE_STEP;
    tip.addChild(t);
  }
  return tip;
}
