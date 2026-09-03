import { Container, Graphics, Sprite } from 'pixi.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzImage } from '../wz/WzImage.js';
export class TamingMobLook {
    TemplateId;
    _anims = new Map();
    _curAction = 'stand';
    _frame = 0;
    _frameTimer = 0;
    _loaded = false;
    container = new Container();
    Position = { x: 0, y: 0 };
    constructor(TemplateId) {
        this.TemplateId = TemplateId;
    }
    Load(loader, tamingWz) {
        if (!tamingWz)
            return;
        const strid = `${this.TemplateId.toString().padStart(7, '0')}.img`;
        const img = tamingWz.GetItem(strid);
        const root = img instanceof WzImage ? img.Root : null;
        if (!root)
            return;
        const actions = ['stand', 'move', 'jump', 'fly', 'fall', 'hit', 'eat'];
        for (const action of actions) {
            const node = root.Get(action);
            if (!(node instanceof WzProperty))
                continue;
            const frames = [];
            let fi = 0;
            while (true) {
                const raw = node.Get(`${fi}`);
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
                    frames.push({ sprite, delayMs: delay });
                fi++;
            }
            if (frames.length > 0)
                this._anims.set(action, frames);
        }
        this._loaded = this._anims.size > 0;
    }
    SetAction(action) {
        if (action === this._curAction || !this._anims.has(action))
            return;
        this._curAction = action;
        this._frame = 0;
        this._frameTimer = 0;
    }
    Update(dt) {
        const frames = this._anims.get(this._curAction);
        if (!frames || frames.length === 0)
            return;
        let delayMs = frames[this._frame].delayMs;
        if (delayMs <= 0)
            delayMs = 150;
        this._frameTimer += dt * 1000;
        if (this._frameTimer >= delayMs) {
            this._frameTimer -= delayMs;
            this._frame++;
            if (this._frame >= frames.length)
                this._frame = frames.length - 1;
        }
        this._rebuildDisplay();
    }
    _rebuildDisplay() {
        this.container.removeChildren();
        const frames = this._anims.get(this._curAction);
        if (this._loaded && frames && frames.length > 0) {
            const { sprite } = frames[Math.min(this._frame, frames.length - 1)];
            const s = new Sprite(sprite.Texture);
            s.anchor.set(sprite.Width > 0 ? sprite.OriginX / sprite.Width : 0, sprite.Height > 0 ? sprite.OriginY / sprite.Height : 0);
            this.container.addChild(s);
        }
        else {
            const gfx = new Graphics();
            gfx.roundRect(-20, -25, 40, 25, 6).fill({ color: 0x8b4513, alpha: 0.7 });
            this.container.addChild(gfx);
        }
    }
}
//# sourceMappingURL=TamingMobLook.js.map