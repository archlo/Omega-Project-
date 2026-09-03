import { Container, Graphics, Text, TextStyle } from 'pixi.js';
export class DropSprite {
    DropId;
    IsMoney;
    ItemIdOrAmount;
    container = new Container();
    Position = { x: 0, y: 0 };
    Layer = 7;
    static Vy = 400;
    _source;
    _ground;
    _tEnd;
    _icon = null;
    _state;
    _tick = 0;
    _angle = 0;
    _absorbing = false;
    _absorbFrom = { x: 0, y: 0 };
    _absorbTarget = null;
    _absorbT = 0;
    _alpha = 1;
    static AbsorbDur = 0.4;
    Finished = false;
    nameOf = () => '';
    constructor(DropId, IsMoney, ItemIdOrAmount, source, ground, animated, icon, font) {
        this.DropId = DropId;
        this.IsMoney = IsMoney;
        this.ItemIdOrAmount = ItemIdOrAmount;
        this._ground = { x: ground.x, y: ground.y };
        this._source = animated ? { x: source.x, y: source.y } : { x: ground.x, y: ground.y };
        this._icon = icon ?? null;
        this._tEnd = this._parabolicDuration(this._source.y, this._ground.y);
        this._state = animated ? 1 : 3;
        this.Position = { x: this._source.x, y: this._source.y };
        this._rebuildDisplay();
    }
    StartAbsorb(target) {
        this._absorbing = true;
        this._absorbFrom = { x: this.Position.x, y: this.Position.y };
        this._absorbTarget = target;
        this._absorbT = 0;
    }
    _parabolicDuration(y1, y2) {
        if (y1 <= y2)
            return 1000;
        const v6 = 30 * (Math.floor(Math.sqrt(1000 * (2 * (100 + y2 - y1)) / 800)) + 1) + 500;
        return Math.min(1000, v6);
    }
    Update(dt) {
        if (this._absorbing) {
            this._absorbT += dt;
            const at = Math.min(1, this._absorbT / DropSprite.AbsorbDur);
            const tgt = this._absorbTarget ? this._absorbTarget() : this._absorbFrom;
            this.Position.x = this._absorbFrom.x + (tgt.x - this._absorbFrom.x) * at * at;
            this.Position.y = this._absorbFrom.y + (tgt.y - this._absorbFrom.y) * at * at;
            this._alpha = 1 - at;
            if (at >= 1)
                this.Finished = true;
            return;
        }
        const dtMs = dt * 1000;
        switch (this._state) {
            case 1: {
                this._tick += dtMs;
                const dx = this._ground.x - this._source.x;
                const t = this._tick / 1000;
                const xf = Math.min(1, this._tick / 500)
                    + (this._tick > 500 ? Math.min(1, (this._tick - 500) / Math.max(1, this._tEnd - 500)) : 0);
                const x = this._source.x + xf * dx * 0.5;
                const y = this._source.y - DropSprite.Vy * t + 400 * t * t;
                this.Position = { x, y };
                if (this._tick >= this._tEnd) {
                    if (this._source.y < this._ground.y) {
                        this._state = 2;
                        this._tick = 0;
                    }
                    else {
                        this._state = 3;
                        this._tick = 0;
                        this.Position = { x: this._ground.x, y: this._ground.y };
                    }
                }
                break;
            }
            case 2: {
                this._tick += dtMs;
                const y = this._source.y + (this._tick / 1000) * DropSprite.Vy;
                if (y >= this._ground.y) {
                    this._state = 3;
                    this.Position = { x: this._ground.x, y: this._ground.y };
                }
                else
                    this.Position = { x: this._ground.x, y };
                break;
            }
            default: {
                this._angle += Math.PI * dt;
                this.Position = { x: this._ground.x, y: this._ground.y + Math.sin(this._angle) * 3 };
                break;
            }
        }
    }
    draw(camX, camY, cx, cy) {
        this.container.position.set(this.Position.x - camX + cx, this.Position.y - camY + cy);
        this.container.alpha = this._alpha;
    }
    _rebuildDisplay() {
        this.container.removeChildren();
        const iconW = 20;
        const iconH = 20;
        const gfx = new Graphics();
        if (this.IsMoney) {
            const mesoColors = [
                { min: 1, color: 0xdcc864 },
                { min: 1000, color: 0xc8c8c8 },
                { min: 10000, color: 0xffd700 },
                { min: 100000, color: 0xff6464 },
            ];
            let coinColor = mesoColors[0].color;
            for (const mc of mesoColors) {
                if (this.ItemIdOrAmount >= mc.min)
                    coinColor = mc.color;
            }
            gfx.rect(-iconW / 2, -iconH, iconW, iconH).fill({ color: coinColor });
        }
        else if (this._icon) {
            // Real WZ item icon loaded — draw it instead of the placeholder
            // rectangle. Previously this branch only suppressed the placeholder
            // and never actually added the icon sprite to the container, so any
            // drop with a real `_icon` rendered as a completely empty Graphics
            // (worse than the no-icon placeholder below).
            this.container.addChild(this._icon.NewSprite());
            const name = this.nameOf(this.ItemIdOrAmount);
            if (name) {
                const nameStyle = new TextStyle({ fontSize: 9, fill: 0xffffff, stroke: '#000000' });
                const nameText = new Text({ text: name, style: nameStyle });
                nameText.anchor.set(0.5, 0);
                nameText.y = -iconH - 2;
                this.container.addChild(nameText);
            }
        }
        else {
            const invType = Math.floor(this.ItemIdOrAmount / 1000000);
            const itemColor = (() => {
                switch (invType) {
                    case 1: return 0x5078c8;
                    case 2: return 0x50b450;
                    case 3: return 0xa0783c;
                    case 4: return 0x969696;
                    case 5: return 0xc850c8;
                    default: return 0x8c8c8c;
                }
            })();
            gfx.rect(-iconW / 2, -iconH, iconW, iconH).fill({ color: itemColor, alpha: 0.86 });
            const name = this.nameOf(this.ItemIdOrAmount);
            if (name) {
                const nameStyle = new TextStyle({ fontSize: 9, fill: 0xffffff, stroke: '#000000' });
                const nameText = new Text({ text: name, style: nameStyle });
                nameText.anchor.set(0.5, 0);
                nameText.y = -iconH - 2;
                this.container.addChild(nameText);
            }
        }
        this.container.addChild(gfx);
    }
}
//# sourceMappingURL=DropSprite.js.map