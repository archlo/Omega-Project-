import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzImage } from '../wz/WzImage.js';
export class PetLook {
    TemplateId;
    _anims = new Map();
    _state = 'stand';
    _frame = 0;
    _frameTimer = 0;
    _facingLeft = false;
    _loaded = false;
    _speechText = '';
    _speechTimer = 0;
    container = new Container();
    Position = { x: 0, y: 0 };
    Name = '';
    // OG: CPet::OnNameChanged (0x6a11f0) showNameTag byte.
    ShowNameTag = true;
    constructor(TemplateId) {
        this.TemplateId = TemplateId;
    }
    get IsLoaded() { return this._loaded; }
    Load(loader, charWz) {
        if (charWz === null)
            return;
        const strid = `${this.TemplateId.toString().padStart(8, '0')}.img`;
        const item = charWz.GetItem(strid);
        const root = item instanceof WzImage ? item.Root : null;
        if (!root)
            return;
        let resolvedRoot = root;
        if (root.Get('info') instanceof WzProperty) {
            const info = root.Get('info');
            const name = info.Get('name');
            if (typeof name === 'string')
                this.Name = name;
            const link = info.Get('link');
            if (typeof link === 'number') {
                const linkId = link;
                const linkStrid = `${linkId.toString().padStart(8, '0')}.img`;
                const linkItem = charWz.GetItem(linkStrid);
                const linkRoot = linkItem instanceof WzImage ? linkItem.Root : null;
                if (linkRoot)
                    resolvedRoot = linkRoot;
            }
        }
        for (const [key, value] of Object.entries(resolvedRoot.Items)) {
            if (!(value instanceof WzProperty))
                continue;
            if (key === 'info')
                continue;
            const frames = [];
            let fi = 0;
            while (true) {
                const raw = value.Get(`${fi}`);
                if (raw === null)
                    break;
                let delay;
                let sprite = null;
                if (raw instanceof WzCanvas) {
                    delay = 150;
                    sprite = loader.Load(raw);
                }
                else if (raw instanceof WzProperty) {
                    delay = this._readDelay(raw);
                    sprite = this._loadFrame(loader, raw);
                }
                else
                    break;
                if (sprite)
                    frames.push({ sprite, delayMs: delay });
                fi++;
            }
            if (frames.length > 0) {
                this._anims.set(key, frames);
                if (!this._anims.has(this._state))
                    this._state = key;
            }
        }
        this._loaded = this._anims.size > 0;
    }
    Update(dt) {
        if (this._speechTimer > 0) {
            this._speechTimer = Math.max(0, this._speechTimer - dt);
            if (this._speechTimer === 0)
                this._speechText = '';
        }
        const frames = this._anims.get(this._state);
        if (!frames || frames.length === 0) {
            this._rebuildDisplay();
            return;
        }
        let delayMs = frames[this._frame].delayMs;
        if (delayMs <= 0)
            delayMs = 150;
        this._frameTimer += dt * 1000;
        if (this._frameTimer >= delayMs) {
            this._frameTimer -= delayMs;
            this._frame = (this._frame + 1) % frames.length;
        }
        this._rebuildDisplay();
    }
    SetState(state) {
        if (this._anims.has(state) && state !== this._state) {
            this._state = state;
            this._frame = 0;
            this._frameTimer = 0;
        }
    }
    PlayAction(action) {
        // TODO_AUDIT.md Hundred-and-forty-sixth pass: remote pet action packets
        // now select real WZ action nodes when present. Numeric action names are
        // common in Pet.wz; fall back to a short walk/stand pulse if absent.
        const key = `${action}`;
        if (this._anims.has(key))
            this.SetState(key);
        else if (this._anims.has('walk'))
            this.SetState('walk');
    }
    FaceLeft(left) {
        this._facingLeft = left;
    }
    Say(text, durationSec = 4) {
        // TODO_AUDIT.md Hundred-and-forty-eighth pass: pet speak/interact packets
        // now render above the pet instead of being chat-log only.
        if (!text)
            return;
        this._speechText = text;
        this._speechTimer = durationSec;
    }
    _rebuildDisplay() {
        this.container.removeChildren();
        if (!this._loaded) {
            this._drawSpeechBubble(-34);
            return;
        }
        const frames = this._anims.get(this._state);
        if (!frames || frames.length === 0)
            return;
        const { sprite } = frames[Math.min(this._frame, frames.length - 1)];
        const pixi = new Sprite(sprite.Texture);
        pixi.anchor.set(sprite.Width > 0 ? sprite.OriginX / sprite.Width : 0, sprite.Height > 0 ? sprite.OriginY / sprite.Height : 0);
        if (this._facingLeft)
            pixi.scale.x = -1;
        this.container.addChild(pixi);
        if (this.Name && this.ShowNameTag) {
            const nameText = new Text({ text: this.Name, style: { fontSize: 10, fill: 0xffffff, stroke: '#000000' } });
            nameText.anchor.set(0.5, 1);
            nameText.y = -(sprite.OriginY) - 4;
            this.container.addChild(nameText);
        }
        this._drawSpeechBubble(-(sprite.OriginY) - 20);
    }
    _drawSpeechBubble(y) {
        if (!this._speechText)
            return;
        const bubbleW = Math.min(150, Math.max(60, this._speechText.length * 7 + 14));
        const style = new TextStyle({ fontSize: 10, fill: '#ffffff', wordWrap: true, wordWrapWidth: bubbleW - 10 });
        const label = new Text({ text: this._speechText, style });
        const h = Math.max(22, label.height + 8);
        const bg = new Graphics();
        bg.roundRect(-bubbleW / 2, y - h, bubbleW, h, 4).fill({ color: 0x000000, alpha: 0.75 });
        label.anchor.set(0.5, 0);
        label.position.set(0, y - h + 4);
        this.container.addChild(bg, label);
    }
    _loadFrame(loader, frameNode) {
        for (const [, v] of Object.entries(frameNode.Items)) {
            if (v instanceof WzCanvas)
                return loader.Load(v);
        }
        return null;
    }
    _readDelay(node) {
        const v = node.Get('delay');
        if (typeof v === 'number')
            return v;
        if (typeof v === 'bigint')
            return Number(v);
        return 150;
    }
}
//# sourceMappingURL=PetLook.js.map