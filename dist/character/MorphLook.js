import { Container, Graphics, Sprite } from 'pixi.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzImage } from '../wz/WzImage.js';
export class MorphLook {
    MorphId;
    _frames = [];
    _frame = 0;
    _frameTimer = 0;
    _loaded = false;
    container = new Container();
    Position = { x: 0, y: 0 };
    constructor(MorphId) {
        this.MorphId = MorphId;
    }
    Load(loader, morphWz, charWz) {
        if (!morphWz && !charWz)
            return;
        const strid = `${this.MorphId.toString().padStart(7, '0')}.img`;
        let root = null;
        if (morphWz) {
            const img = morphWz.GetItem(strid);
            root = img instanceof WzImage ? img.Root : null;
        }
        if (!root && charWz) {
            const img = charWz.GetItem(`Morph.img`);
            if (img instanceof WzImage)
                root = img.Root?.Get(strid) ?? null;
        }
        if (!root)
            return;
        let fi = 0;
        while (true) {
            const raw = root.Get(`${fi}`);
            if (raw === null)
                break;
            let delay = 120;
            let sprite = null;
            if (raw instanceof WzCanvas) {
                sprite = loader.Load(raw);
            }
            else if (raw instanceof WzProperty) {
                const v = raw.Get('delay');
                delay = typeof v === 'number' ? v : typeof v === 'bigint' ? Number(v) : 120;
                for (const [, cv] of Object.entries(raw.Items)) {
                    if (cv instanceof WzCanvas) {
                        sprite = loader.Load(cv);
                        break;
                    }
                }
            }
            else
                break;
            if (sprite)
                this._frames.push({ sprite, delayMs: delay });
            fi++;
        }
        this._loaded = this._frames.length > 0;
    }
    Update(dt) {
        if (this._frames.length === 0)
            return;
        let delayMs = this._frames[this._frame].delayMs;
        if (delayMs <= 0)
            delayMs = 150;
        this._frameTimer += dt * 1000;
        if (this._frameTimer >= delayMs) {
            this._frameTimer -= delayMs;
            this._frame = (this._frame + 1) % this._frames.length;
        }
        this._rebuildDisplay();
    }
    _rebuildDisplay() {
        this.container.removeChildren();
        if (this._loaded && this._frames.length > 0) {
            const { sprite } = this._frames[this._frame];
            const s = new Sprite(sprite.Texture);
            s.anchor.set(sprite.Width > 0 ? sprite.OriginX / sprite.Width : 0, sprite.Height > 0 ? sprite.OriginY / sprite.Height : 0);
            this.container.addChild(s);
        }
        else {
            const gfx = new Graphics();
            gfx.circle(0, 0, 18).fill({ color: 0x9966cc, alpha: 0.7 });
            this.container.addChild(gfx);
        }
    }
    Draw(cx, cy, camX, camY) {
        const dx = this.Position.x - camX + cx;
        const dy = this.Position.y - camY + cy;
        this.container.position.set(dx, dy);
    }
}
//# sourceMappingURL=MorphLook.js.map