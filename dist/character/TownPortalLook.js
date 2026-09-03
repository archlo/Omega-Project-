import { Container, Graphics } from 'pixi.js';
export class TownPortalLook {
    ObjId;
    State;
    CharacterId;
    container = new Container();
    Position = { x: 0, y: 0 };
    constructor(ObjId, State, CharacterId) {
        this.ObjId = ObjId;
        this.State = State;
        this.CharacterId = CharacterId;
        this._build();
    }
    Update(_dt) {
    }
    _build() {
        this.container.removeChildren();
        const gfx = new Graphics();
        const c = this.State === 1 ? 0x00cc44 : 0xffaa00;
        gfx.poly([0, -24, -14, 14, 14, 14]).fill({ color: c, alpha: 0.85 });
        gfx.circle(0, -4, 4).fill({ color: 0xffffff, alpha: 0.5 });
        this.container.addChild(gfx);
    }
    SetState(state) {
        if (state === this.State)
            return;
        this.State = state;
        this._build();
    }
}
//# sourceMappingURL=TownPortalLook.js.map