import { Container } from 'pixi.js';
export class Checkbox {
    position = { x: 0, y: 0 };
    isChecked = false;
    hitSize = 12;
    container;
    uncheckedSprite = null;
    checkedSprite = null;
    _uncheckedPixi = null;
    _checkedPixi = null;
    constructor(uncheckedSprite, checkedSprite) {
        this.container = new Container();
        this.uncheckedSprite = uncheckedSprite ?? null;
        this.checkedSprite = checkedSprite ?? null;
        if (this.uncheckedSprite) {
            this._uncheckedPixi = this.uncheckedSprite.ToPixi();
            this.container.addChild(this._uncheckedPixi);
        }
        if (this.checkedSprite) {
            this._checkedPixi = this.checkedSprite.ToPixi();
            this.container.addChild(this._checkedPixi);
        }
        this.refresh();
    }
    get bounds() { return { x: this.position.x, y: this.position.y, width: this.hitSize, height: this.hitSize }; }
    setPosition(x, y) {
        this.position.x = x;
        this.position.y = y;
        this.container.position.set(x, y);
    }
    handleMouseButton(x, y, down) {
        const b = this.bounds;
        if (x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height) {
            if (!down) {
                this.isChecked = !this.isChecked;
                this.refresh();
            }
            return true;
        }
        return false;
    }
    refresh() {
        if (this._uncheckedPixi)
            this._uncheckedPixi.visible = !this.isChecked;
        if (this._checkedPixi)
            this._checkedPixi.visible = this.isChecked;
    }
}
//# sourceMappingURL=Checkbox.js.map