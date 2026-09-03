import { Container, Text, TextStyle } from 'pixi.js';
export class ShopMarker {
    _icons;
    _entries = [];
    constructor(_icons) {
        this._icons = _icons;
    }
    Add(id, itemId, characterName, hope, x, y) {
        this._entries = this._entries.filter((e) => e.id !== id);
        this._entries.push({ id, itemId, characterName, hope, fallbackX: x, fallbackY: y });
    }
    Remove(id) {
        this._entries = this._entries.filter((e) => e.id !== id);
    }
    Clear() {
        this._entries = [];
    }
    RebuildDisplay(findWorldPos, worldToScreen) {
        const root = new Container();
        for (const e of this._entries) {
            const world = findWorldPos(e.characterName) ?? { x: e.fallbackX, y: e.fallbackY };
            const screen = worldToScreen(world.x, world.y - 100);
            const icon = this._icons?.LoadIcon(e.itemId);
            if (icon) {
                const sprite = icon.NewSprite(false);
                sprite.anchor.set(0.5, 1);
                sprite.position.set(screen.x, screen.y);
                root.addChild(sprite);
            }
            if (e.hope.length > 0) {
                const t = new Text({ text: e.hope, style: new TextStyle({ fill: '#FFFFFF', fontSize: 10, fontFamily: 'monospace' }) });
                t.anchor.set(0.5, 1);
                t.position.set(screen.x, screen.y - (icon ? icon.Height : 0) - 2);
                root.addChild(t);
            }
        }
        return root;
    }
}
//# sourceMappingURL=ShopMarker.js.map