import { Container, Text, TextStyle } from 'pixi.js';
import { ItemIconLoader } from './ItemIconLoader.js';

// OG: CMessageBoxPool — the floating marker shown above a nearby player who
// has an open personal/entrusted shop or trade room. TODO_AUDIT.md
// Eighty-first pass's `CMessageBoxPool` finding. OG anchors the marker to
// the host's WZ-linked position (IWzVector2D::RelMove) so it tracks the
// player as they move; this client doesn't have that linking, so the
// marker is repositioned each frame via a live character-name lookup
// instead (closer to correct than a fixed spawn-position snapshot, same
// "track by name" convention `GameStage.ts`'s `/miniroom invite` slash
// command already uses).
interface Entry {
  id: number;
  itemId: number;
  characterName: string;
  hope: string;
  fallbackX: number;
  fallbackY: number;
}

export class ShopMarker {
  private _entries: Entry[] = [];

  constructor(private _icons: ItemIconLoader | null) {}

  Add(id: number, itemId: number, characterName: string, hope: string, x: number, y: number): void {
    this._entries = this._entries.filter((e) => e.id !== id);
    this._entries.push({ id, itemId, characterName, hope, fallbackX: x, fallbackY: y });
  }

  Remove(id: number): void {
    this._entries = this._entries.filter((e) => e.id !== id);
  }

  Clear(): void {
    this._entries = [];
  }

  RebuildDisplay(
    findWorldPos: (characterName: string) => { x: number; y: number } | null,
    worldToScreen: (wx: number, wy: number) => { x: number; y: number },
  ): Container {
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
