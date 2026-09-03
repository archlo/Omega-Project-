import { Container, Graphics, Sprite } from 'pixi.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzImage } from '../wz/WzImage.js';
export class ReactorLook {
    ObjId;
    TemplateId;
    State;
    _anims = new Map();
    _curState = 0;
    _frame = 0;
    _frameTimer = 0;
    _loaded = false;
    container = new Container();
    Position = { x: 0, y: 0 };
    constructor(ObjId, TemplateId, State) {
        this.ObjId = ObjId;
        this.TemplateId = TemplateId;
        this.State = State;
    }
    Load(loader, reactorWz) {
        this._loader = loader;
        if (reactorWz === null)
            return;
        const strid = `${this.TemplateId.toString().padStart(7, '0')}.img`;
        const img = reactorWz.GetItem(strid);
        const root = img instanceof WzImage ? img.Root : null;
        if (!root)
            return;
        const info = root.Get('info');
        if (info instanceof WzProperty) {
            const link = info.Get('link');
            if (typeof link === 'number' && link !== this.TemplateId) {
                const linkImg = reactorWz.GetItem(`${link.toString().padStart(7, '0')}.img`);
                const linkRoot = linkImg instanceof WzImage ? linkImg.Root : null;
                if (linkRoot) {
                    this._loadStates(linkRoot);
                    return;
                }
            }
        }
        this._loadStates(root);
    }
    _loadStates(root) {
        for (let st = 0; st < 8; st++) {
            const stateNode = root.Get(`${st}`);
            if (!(stateNode instanceof WzProperty))
                continue;
            const frames = [];
            let fi = 0;
            while (true) {
                const raw = stateNode.Get(`${fi}`);
                if (raw === null)
                    break;
                let delay = 120;
                let sprite = null;
                if (raw instanceof WzCanvas) {
                    sprite = this._loader.Load(raw);
                }
                else if (raw instanceof WzProperty) {
                    const v = raw.Get('delay');
                    delay = typeof v === 'number' ? v : typeof v === 'bigint' ? Number(v) : 120;
                    for (const [, cv] of Object.entries(raw.Items)) {
                        if (cv instanceof WzCanvas) {
                            sprite = this._loader.Load(cv);
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
                this._anims.set(st, frames);
        }
        this._loaded = this._anims.size > 0;
    }
    _loader;
    LoadWith(loader, reactorWz) {
        this._loader = loader;
        this.Load(loader, reactorWz);
    }
    SetState(state) {
        if (state === this._curState)
            return;
        this._curState = state;
        this._frame = 0;
        this._frameTimer = 0;
    }
    Update(dt) {
        const frames = this._anims.get(this._curState);
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
                this._frame = 0;
        }
        this._rebuildDisplay();
    }
    _rebuildDisplay() {
        this.container.removeChildren();
        const frames = this._anims.get(this._curState);
        if (this._loaded && frames && frames.length > 0) {
            const { sprite } = frames[Math.min(this._frame, frames.length - 1)];
            const s = new Sprite(sprite.Texture);
            s.anchor.set(sprite.Width > 0 ? sprite.OriginX / sprite.Width : 0, sprite.Height > 0 ? sprite.OriginY / sprite.Height : 0);
            this.container.addChild(s);
        }
        else {
            const hue = Math.floor(this.TemplateId / 100) % 6;
            const colors = [0x44aaff, 0xff8844, 0x88ff44, 0xff4488, 0x8844ff, 0x44ff88];
            const gfx = new Graphics();
            gfx.roundRect(-15, -30, 30, 30, 4).fill({ color: colors[hue], alpha: 0.7 });
            this.container.addChild(gfx);
        }
    }
}
//# sourceMappingURL=ReactorLook.js.map