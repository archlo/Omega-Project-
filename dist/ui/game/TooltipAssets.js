import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzUol } from '../../wz/WzUol.js';
export const TOOLTIP_EQUIP_ROOT = 'UIWindow.img/ToolTip/Equip';
export const TOOLTIP_EQUIP_FALLBACK_ROOT = 'UIWindow2.img/ToolTip/Equip';
// No separate shared-asset class — confirmed this chrome (Can/Cannot job
// labels, digit-style glyphs, weapon-category icons, Star) is owned directly
// by CUIToolTip's own methods: InitCanvas, GetFontByType (~15 call sites for
// different font/digit-style lookups), MakeLayer, DrawItemReqJob (strongest
// match for the job-requirement label rendering). No CUICommon/CWzResource-
// style shared class exists anywhere in this corpus.
export class TooltipAssets {
    _loader;
    _uiWz;
    _root;
    _cache = new Map();
    constructor(loader, uiWz) {
        this._loader = loader;
        this._uiWz = uiWz;
        // OG: CUIToolTip ctor loads the equip chrome from UIWindow.img/ToolTip/Equip
        // (verified in the v95 IDB + real UI.nx). Keep UIWindow2.img as a fallback
        // for clients that only ship the duplicate tree.
        let v = uiWz?.GetItem(TOOLTIP_EQUIP_ROOT);
        if (!(v instanceof WzProperty)) {
            v = uiWz?.GetItem(TOOLTIP_EQUIP_FALLBACK_ROOT);
        }
        this._root = v instanceof WzProperty ? v : null;
    }
    get IsAvailable() { return this._root !== null; }
    Get(subPath) {
        const cached = this._cache.get(subPath);
        if (cached !== undefined)
            return cached;
        let sprite = null;
        if (this._root !== null) {
            let node = this._root.GetItem(subPath);
            if (node instanceof WzUol)
                node = node.Resolve();
            if (node instanceof WzCanvas)
                sprite = this._loader.Load(node);
        }
        this._cache.set(subPath, sprite);
        return sprite;
    }
    EquipCanvas(path) {
        return this.Get(path);
    }
    /** Verified v95 CItemInfo::DrawItemIconForSlot compositor resources. */
    ItemCompositorCanvas(asset) {
        if (!this._uiWz)
            return null;
        const path = asset === 'shadow'
            ? 'UIWindow.img/Item/shadow'
            : `UIWindow.img/Item/Quality/${asset.substring('quality/'.length)}/0`;
        const fallback = asset === 'shadow'
            ? 'UIWindow2.img/Item/shadow'
            : `UIWindow2.img/Item/Quality/${asset.substring('quality/'.length)}/0`;
        return this._loadUiCanvas(path) ?? this._loadUiCanvas(fallback);
    }
    // OG: WZ asset names use reqLEV, reqSTR, etc. — map from display names
    static REQ_MAP = {
        'level': 'reqLEV',
        'str': 'reqSTR',
        'dex': 'reqDEX',
        'int': 'reqINT',
        'luk': 'reqLUK',
        'pop': 'reqPOP',
    };
    Req(key, met) {
        const wzKey = TooltipAssets.REQ_MAP[key] ?? key;
        return this.Get(`${met ? 'Can' : 'Cannot'}/${wzKey}`);
    }
    Requirement(key, met) {
        return this.Req(key, met);
    }
    JobLabel(klass, greyed) {
        return this.Get(`${greyed ? 'Cannot' : 'Can'}/${klass}`);
    }
    Digit(d, met) {
        const ns = met ? 'Can' : 'Cannot';
        if (d < 0 || d > 9)
            return this.Get(`${ns}/none`);
        return this.Get(`${ns}/${d}`);
    }
    // OG: m_pNumberGrowthEnable/m_pNumberGrowthDisable — the GrowthEnabled/
    // GrowthDisabled property nodes carry their own digit canvases 0..9.
    GrowthDigit(d, enabled) {
        const ns = enabled ? 'GrowthEnabled' : 'GrowthDisabled';
        if (d < 0 || d > 9)
            return null;
        return this.Get(`${ns}/${d}`);
    }
    GrowthNumber(d, enabled) {
        return this.GrowthDigit(d, enabled);
    }
    // OG: m_pCanvasEquip_GrowthItem[0..3][enabled] = itemLEV/itemEXP/max/percent
    // labels under GrowthEnabled|GrowthDisabled.
    GrowthLabel(index, enabled) {
        const name = index === 0 ? 'itemLEV' : 'itemEXP';
        return this.Get(`${enabled ? 'GrowthEnabled' : 'GrowthDisabled'}/${name}`);
    }
    GrowthMax(enabled) { return this.Get(`${enabled ? 'GrowthEnabled' : 'GrowthDisabled'}/max`); }
    GrowthPercent(enabled) { return this.Get(`${enabled ? 'GrowthEnabled' : 'GrowthDisabled'}/percent`); }
    GrowthNone(enabled) { return this.Get(`${enabled ? 'GrowthEnabled' : 'GrowthDisabled'}/none`); }
    // OG: m_pCanvasEquip_Durability[0][under] bar + [1][under] '%' suffix.
    DurabilityBar(met) { return this.Get(`${met ? 'Can' : 'Cannot'}/durability`); }
    Percent(met) { return this.Get(`${met ? 'Can' : 'Cannot'}/percent`); }
    Dot(index) { return this.Get(`Dot/${index}`); }
    Property(index) { return this.Get(`Property/${index}`); }
    Speed(index) { return this.Get(`Speed/${index}`); }
    WeaponCategory(index) { return this.Get(`WeaponCategory/${index}`); }
    ItemCategory(index) { return this.Get(`ItemCategory/${index}`); }
    get Cash() { return this.Get('cash'); }
    get Mesos() { return this.Get('mesos'); }
    get Star() { return this.Get('Star/Star'); }
    // Ring canvases live under the item record, not under ToolTip/Equip. The
    // item loader/caller owns that lookup; this hook only converts a WZ canvas
    // when the caller already resolved it.
    LoadCanvas(canvas) {
        return canvas ? this._loader.Load(canvas) : null;
    }
    _loadUiCanvas(path) {
        let node = this._uiWz?.GetItem(path);
        if (node instanceof WzUol)
            node = node.Resolve();
        return node instanceof WzCanvas ? this._loader.Load(node) : null;
    }
    MeasureNumber(value, met, horzSpace = 0) {
        let w = 0;
        let first = true;
        for (const ch of String(value)) {
            const s = this.Digit(parseInt(ch), met);
            if (s === null)
                continue;
            if (!first)
                w += horzSpace;
            w += s.Width;
            first = false;
        }
        return w;
    }
    DrawNumber(value, met, x, y, parent, spacing = 0) {
        return this.DrawNumberWith(value, (d) => this.Digit(d, met), x, y, parent, spacing);
    }
    // Like DrawNumber but resolves each digit through a caller-supplied getter —
    // used for growth digits (m_pNumberGrowthEnable/GrowthDisable digit sets).
    DrawNumberWith(value, digitOf, x, y, parent, spacing = 0) {
        const digits = String(value);
        let curX = x;
        let first = true;
        for (const ch of digits) {
            if (!first)
                curX += spacing;
            const d = parseInt(ch, 10);
            const s = digitOf(d);
            if (s) {
                this.BlitAt(s, curX, y, parent);
                curX += s.Width;
            }
            else {
                curX += 8; // fallback width
            }
            first = false;
        }
        return curX - x;
    }
    BlitAt(sprite, x, y, parent) {
        if (!sprite)
            return;
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
//# sourceMappingURL=TooltipAssets.js.map