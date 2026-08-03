import { Container, Graphics, Sprite } from 'pixi.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzProperty } from '../wz/WzProperty.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { WzImage } from '../wz/WzImage.js';
import { WzSprite } from '../render/WzSprite.js';
import type { DecodedMovePath } from '../net/packet/MovePathDecoder.js';
import type { Foothold } from '../map/Foothold.js';
import { RemoteMoveReplay } from './RemoteMoveReplay.js';

export class SummonedLook {
  private _anims = new Map<string, { sprite: WzSprite; delayMs: number }[]>();
  private _curAction = 'stand';
  private _frame = 0;
  private _frameTimer = 0;
  private _loaded = false;
  private readonly _replay = new RemoteMoveReplay();

  readonly container = new Container();
  Position = { x: 0, y: 0 };
  FootholdId = 0;
  MoveAction = 0;
  FacingLeft = false;

  constructor(
    public readonly ObjId: number,
    public readonly CharId: number,
    public SkillId: number,
  ) {}

  Load(loader: WzTextureLoader, skillWz: WzPackage | null): void {
    if (!skillWz) return;
    const strid = `${this.SkillId.toString().padStart(7, '0')}.img`;
    const img = skillWz.GetItem(strid);
    const root = img instanceof WzImage ? img.Root : null;
    if (!root) return;
    let summonRoot = root.Get('summon');
    if (!(summonRoot instanceof WzProperty)) summonRoot = root.Get('summoned');
    if (!(summonRoot instanceof WzProperty)) return;
    const actions = ['stand', 'move', 'fly', 'hit', 'die'];
    for (const action of actions) {
      const node = summonRoot.Get(action);
      if (!(node instanceof WzProperty)) continue;
      const frames: { sprite: WzSprite; delayMs: number }[] = [];
      let fi = 0;
      while (true) {
        const raw = node.Get(`${fi}`);
        if (raw === null) break;
        let delay = 120;
        let sprite: WzSprite | null = null;
        if (raw instanceof WzCanvas) {
          sprite = loader.Load(raw);
        } else if (raw instanceof WzProperty) {
          const v = raw.Get('delay');
          delay = typeof v === 'number' ? v : typeof v === 'bigint' ? Number(v) : 120;
          for (const [, cv] of Object.entries(raw.Items)) {
            if (cv instanceof WzCanvas) { sprite = loader.Load(cv); break; }
          }
        } else break;
        if (sprite) frames.push({ sprite, delayMs: delay });
        fi++;
      }
      if (frames.length > 0) this._anims.set(action, frames);
    }
    this._loaded = this._anims.size > 0;
  }

  SetAction(action: string): void {
    if (action === this._curAction || !this._anims.has(action)) return;
    this._curAction = action;
    this._frame = 0;
    this._frameTimer = 0;
  }

  /** CSummoned::MoveAction2RawAction: raw action is selected from nMA >> 1. */
  SetMoveAction(moveAction: number): void {
    this.MoveAction = moveAction;
    this.FacingLeft = (moveAction & 1) !== 0;
    const rawAction = (() => {
      switch (moveAction >> 1) {
        case 0: return 0;
        case 1: return 1;
        case 6: return 2;
        case 21: return 6;
        default: return moveAction >> 1;
      }
    })();
    // The WZ action table is skill-specific; only the three movement actions
    // have stable names in this renderer. Keep special raw actions numeric
    // rather than guessing a visual action name.
    const action = rawAction === 0 ? 'stand'
      : rawAction === 1 ? 'move'
      : rawAction === 2 ? 'fly'
      : rawAction === 3 ? 'hit'
      : rawAction === 4 ? 'die'
      : '';
    if (action) this.SetAction(action);
  }

  get CurrentAction(): string { return this._curAction; }

  ReplayMove(path: DecodedMovePath): void {
    this._replay.SetPath(path, this.Position, moveAction => this.SetMoveAction(moveAction));
    const first = path.elements[0];
    if (first) {
      if (first.fh !== 0) this.FootholdId = first.fh;
    }
  }

  SetFootholds(footholds: readonly Foothold[]): void { this._replay.SetFootholds(footholds); }

  Update(dt: number): void {
    this._replay.Update(dt, this.Position);
    const frames = this._anims.get(this._curAction);
    if (!frames || frames.length === 0) return;
    let delayMs = frames[this._frame].delayMs;
    if (delayMs <= 0) delayMs = 150;
    this._frameTimer += dt * 1000;
    if (this._frameTimer >= delayMs) {
      this._frameTimer -= delayMs;
      this._frame++;
      if (this._frame >= frames.length) this._frame = 0;
    }
    this._rebuildDisplay();
  }

  private _rebuildDisplay(): void {
    this.container.removeChildren();
    const frames = this._anims.get(this._curAction);
    if (this._loaded && frames && frames.length > 0) {
      const { sprite } = frames[Math.min(this._frame, frames.length - 1)];
      const s = new Sprite(sprite.Texture);
      s.anchor.set(
        sprite.Width > 0 ? sprite.OriginX / sprite.Width : 0,
        sprite.Height > 0 ? sprite.OriginY / sprite.Height : 0,
      );
      this.container.addChild(s);
    } else {
      const hue = this.SkillId % 8;
      const colors = [0x44aaff, 0xff8844, 0x88ff44, 0xff4488, 0x8844ff, 0x44ff88, 0xffaa44, 0x44ffaa];
      const gfx = new Graphics();
      gfx.circle(0, 0, 18).fill({ color: colors[hue], alpha: 0.6 });
      gfx.circle(0, 0, 10).fill({ color: 0xffffff, alpha: 0.3 });
      this.container.addChild(gfx);
    }
  }
}
