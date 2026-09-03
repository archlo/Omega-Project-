import { Container, Graphics, Text } from 'pixi.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
const Ttl = 4;
// decompile/4A2060.c CChatBalloon::CheckTimeOut fades the balloon's alpha
// out linearly over m_tFadeDalay once its timeout has elapsed, rather than
// disappearing instantly. The constructor (decompile/4A2620.c) only zeroes
// m_tFadeDalay as a default; the real per-message fade duration is supplied
// by the caller that shows the balloon (not found in this corpus), so this
// is a reasonable approximation, not an extracted constant.
const FadeDuration = 1;
const MaxTextWidth = 160;
/** CChatBalloon::CreateCanvas/AdjustCoordY equivalent for the nine pieces. */
export function computeChatBalloonLayout(innerWidth, lineCount, lineHeight, border, arrowWidth, arrowHeight, tip) {
    const width = Math.max(innerWidth, 8) + border.left + border.right;
    const height = Math.max(1, lineCount) * lineHeight + border.top + border.bottom;
    const x = Math.floor(tip.x - width / 2);
    const y = Math.floor(tip.y - arrowHeight - height);
    return { x, y, width, height, arrowX: Math.floor(tip.x - arrowWidth / 2), arrowY: y + height - 1 };
}
// Per-balloon sprite set. CChatBalloon::CheckTimeOut/AdjustCoordY operate on
// one balloon at a time; the previous TS implementation drew every active
// balloon onto one shared singleton sprite set, so only the last-drawn
// balloon of the frame ever appeared correctly when 2+ players spoke at
// once. Each balloon now owns its own border sprites/background/text.
class BalloonView {
    container = new Container();
    bg = new Graphics();
    nw = null;
    n = null;
    ne = null;
    c = null;
    w = null;
    e = null;
    sw = null;
    s = null;
    se = null;
    arrow = null;
    texts = [];
    composedWidth = 0;
    composedHeight = 0;
    constructor(parent, src) {
        this.container.addChild(this.bg);
        const bind = (wz) => {
            if (!wz)
                return null;
            const sp = wz.ToPixi();
            this.container.addChild(sp);
            return sp;
        };
        this.nw = bind(src.nw);
        this.n = bind(src.n);
        this.ne = bind(src.ne);
        this.c = bind(src.c);
        this.w = bind(src.w);
        this.e = bind(src.e);
        this.sw = bind(src.sw);
        this.s = bind(src.s);
        this.se = bind(src.se);
        this.arrow = bind(src.arrow);
        parent.addChild(this.container);
    }
    destroy() {
        this.container.destroy({ children: true });
    }
}
export class ChatBalloonLayer {
    _font;
    _assets = new Map();
    _root;
    _active = new Map();
    constructor(loader, ui, font, strings) {
        this._font = font;
        this._root = new Container();
        for (let type = 0; type <= 3; type++) {
            // OG does not hard-code the numeric child for the public/group styles;
            // it asks StringPool for the localized ChatBalloon prefix. Keep the
            // numeric v95 export as a compatibility fallback.
            const poolPrefix = type < 3 ? strings?.getString(1000 + type) : undefined;
            const candidates = poolPrefix
                ? [poolPrefix, `ChatBalloon.img/${type}`]
                : [`ChatBalloon.img/${type}`];
            const b = candidates.map((path) => ui?.GetItem(path)).find((v) => v instanceof WzProperty);
            if (!(b instanceof WzProperty))
                continue;
            const value = b.Get('fontColor');
            const fontColor = typeof value === 'number' ? value & 0xFFFFFF
                : typeof value === 'bigint' ? Number(value) & 0xFFFFFF : 0xFFFFFF;
            const P = (k) => {
                const v = b.Get(k);
                return v instanceof WzCanvas ? loader.Load(v) : null;
            };
            const readNumber = (key, fallback) => {
                const v = b.Get(key);
                return typeof v === 'number' ? v : typeof v === 'bigint' ? Number(v) : fallback;
            };
            const face = b.Get('fontFace');
            const fontFamily = typeof face === 'string' && face.length > 0 ? face : 'Arial';
            this._assets.set(type, {
                nw: P('nw'), n: P('n'), ne: P('ne'), w: P('w'), c: P('c'), e: P('e'),
                sw: P('sw'), s: P('s'), se: P('se'), arrow: P('arrow'), fontColor,
                fontFamily, lineHeight: readNumber('lineHeight', this._font?.lineHeight ?? 13),
            });
        }
    }
    get root() { return this._root; }
    Set(charId, text, ttl = Ttl, type = 0, fadeDelay = FadeDuration) {
        if (!text || text.trim().length === 0)
            return;
        const assets = this._assets.get(type) ?? this._assets.get(0);
        if (!assets?.c)
            return;
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
        view.fontColor = assets.fontColor;
        const delay = Math.max(0, fadeDelay);
        this._active.set(charId, {
            lines, width, life: Math.max(0, ttl) + delay, fadeDelay: delay, view,
            fontColor: assets.fontColor, fontFamily: assets.fontFamily, lineHeight: assets.lineHeight,
        });
    }
    Clear(charId) {
        this._active.get(charId)?.view.destroy();
        this._active.delete(charId);
    }
    get activeCount() { return this._active.size; }
    getBalloonAlpha(charId) {
        return this._active.get(charId)?.view.container.alpha;
    }
    getBalloonLayout(charId) {
        const view = this._active.get(charId)?.view;
        return view ? { width: view.composedWidth, height: view.composedHeight } : undefined;
    }
    Update(dt) {
        if (this._active.size === 0)
            return;
        const expired = [];
        for (const [id, b] of this._active) {
            b.life -= dt;
            if (b.life <= 0)
                expired.push(id);
        }
        for (const id of expired) {
            this._active.get(id)?.view.destroy();
            this._active.delete(id);
        }
    }
    Draw(headScreenPos) {
        for (const [id, b] of this._active) {
            const tip = headScreenPos(id);
            if (tip !== null) {
                b.view.container.visible = true;
                this._drawBubble(b, tip);
            }
            else {
                b.view.container.visible = false;
            }
        }
    }
    _wrap(text) {
        if (this._font === null)
            return [text];
        const lines = [];
        let cur = '';
        for (const word of text.split(' ')) {
            const trial = cur.length === 0 ? word : cur + ' ' + word;
            if (this._font.measure(trial).x > MaxTextWidth && cur.length > 0) {
                lines.push(cur);
                cur = word;
            }
            else {
                cur = trial;
            }
        }
        if (cur.length > 0)
            lines.push(cur);
        return lines.length === 0 ? [text] : lines;
    }
    _drawBubble(b, tip) {
        const v = b.view;
        // decompile/4A2060.c CheckTimeOut: alpha ramps to 0 over the fade
        // window once the message's timeout has elapsed.
        const alpha = b.life < b.fadeDelay && b.fadeDelay > 0
            ? Math.max(0, b.life / b.fadeDelay) : 1;
        v.container.alpha = alpha;
        for (const t of v.texts)
            t.destroy();
        v.texts = [];
        // Use source texture dimensions, not the last composed frame's scaled
        // Sprite dimensions. This keeps the generated layout stable on redraw.
        const naturalW = (px, fallback) => px ? px.texture.width : fallback;
        const naturalH = (px, fallback) => px ? px.texture.height : fallback;
        const bl = naturalW(v.w, 6);
        const br = naturalW(v.e, 6);
        const bt = naturalH(v.n, 6);
        const bb = naturalH(v.s, 6);
        const lineH = b.lineHeight;
        const innerW = Math.max(b.width, 8);
        const layout = computeChatBalloonLayout(innerW, b.lines.length, lineH, { left: bl, right: br, top: bt, bottom: bb }, v.arrow?.texture.width ?? 6, v.arrow?.texture.height ?? 6, tip);
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
        const s = (px, x, y, w, h) => {
            if (!px)
                return;
            px.x = x;
            px.y = y;
            px.visible = true;
            px.scale.set(1);
            if (w !== undefined)
                px.width = w;
            if (h !== undefined)
                px.height = h;
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
            v.c.height = innerH;
            v.c.visible = true;
        }
        else {
            // Keep a fallback for clients whose ChatBalloon asset is incomplete.
            v.bg.rect(winX + bl, winY + bt, innerW, innerH).fill({ color: 0x1A1C28, alpha: 0.9 });
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
//# sourceMappingURL=ChatBalloon.js.map