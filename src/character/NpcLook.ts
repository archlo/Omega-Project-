import { Container, Sprite, Graphics, Text } from 'pixi.js';
import { WzSprite } from '../render/WzSprite.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzProperty } from '../wz/WzProperty.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { WzImage } from '../wz/WzImage.js';

export class NpcLook {
  private _anims = new Map<string, { sprite: WzSprite; delayMs: number }[]>();
  private _state = 'stand';
  private _frame = 0;
  private _frameTimer = 0;
  private _facingLeft = false;
  private _loaded = false;
  get Loaded(): boolean { return this._loaded; }
  private _speak: string[] = [];

  readonly container = new Container();
  Position = { x: 0, y: 0 };
  Name = '';
  FuncName = '';
  ShowNameTag = true;
  ObjId = 0;
  readonly HeadY = -86;

  // Cached display objects
  private _bodySprite: Sprite | null = null;
  private _placeholderGfx: Graphics | null = null;
  private _nameTagContainer: Container | null = null;
  private _nameText: Text | null = null;
  private _funcText: Text | null = null;
  // Dirty tracking
  private _lastState = '';
  private _lastFrame = -1;
  private _lastFacing = false;

  constructor(public readonly NpcId: number) {}

  get NpcIdValue(): number { return this.NpcId; }

  /** Retry name/function resolution from String.wz. Safe to call multiple times. */
  LoadNames(textOf: (npcId: number, key: string) => string | undefined): void {
    const name = textOf(this.NpcId, 'name');
    const func = textOf(this.NpcId, 'func');
    if (!this.Name && name) this.Name = name;
    if (func) this.FuncName = func;
  }

  Load(loader: WzTextureLoader, npcWz: WzPackage | null, textOf?: (npcId: number, key: string) => string | undefined): void {
    if (npcWz === null) return;

    const strid = `${this.NpcId.toString().padStart(7, '0')}.img`;
    const item = npcWz.GetItem(strid);
    const npcRoot = item instanceof WzImage ? item.Root : null;
    if (!npcRoot) return;

    let resolvedRoot: WzProperty | null = npcRoot;

    if (npcRoot.Get('info') instanceof WzProperty) {
      const info = npcRoot.Get('info') as WzProperty;
      const name = info.Get('name');
      if (typeof name === 'string') this.Name = name;
      this.ShowNameTag = this._readBool(info.Get('hideName')) !== true;
      const link = info.Get('link');
      if (typeof link === 'number') {
        const linkId = link;
        const linkStrid = `${linkId.toString().padStart(7, '0')}.img`;
        const linkItem = npcWz.GetItem(linkStrid);
        const linkRoot = linkItem instanceof WzImage ? linkItem.Root : null;
        if (linkRoot) resolvedRoot = linkRoot;
      }
    }

    for (const [key, value] of Object.entries((resolvedRoot ?? npcRoot).Items)) {
      if (!(value instanceof WzProperty)) continue;
      if (key === 'info') continue;

      const frames: { sprite: WzSprite; delayMs: number }[] = [];
      let fi = 0;
      while (true) {
        const raw = (value as WzProperty).Get(`${fi}`);
        if (raw === null) break;

        let delay: number;
        let sprite: WzSprite | null = null;

        if (raw instanceof WzCanvas) {
          delay = 150;
          sprite = loader.Load(raw);
        } else if (raw instanceof WzProperty) {
          delay = this._readDelay(raw);
          sprite = this._loadFrame(loader, raw);
        } else break;

        if (sprite) frames.push({ sprite, delayMs: delay });
        fi++;
      }

      if (frames.length > 0) {
        this._anims.set(key, frames);
        if (!this._anims.has(this._state)) this._state = key;
      }
    }

    // TODO_AUDIT.md Hundred-and-eighty-second pass: OG stores NPC speak
    // entries as labels (n0/n1) under Npc.wz, then resolves them through
    // StringPool(0x6AC) => String/Npc.img/<template>/<label> in
    // CNpcTemplate::GetChatMessageList (0x67B670).
    const speakRoot = npcRoot.Get('speak');
    if (speakRoot instanceof WzProperty) {
      this._collectStrings(speakRoot, this._speak, textOf);
    }
    // Fallback: resolve name/function from String/Npc.img. OG draws these as
    // separate CLife::MakeNameTag layers (types 1001 and 1002), not one
    // combined "name : func" string.
    if (textOf) {
      const name = textOf(this.NpcId, 'name');
      const func = textOf(this.NpcId, 'func');
      if (!this.Name && name) this.Name = name;
      if (func) this.FuncName = func;
    }
    this._loaded = this._anims.size > 0;
  }

  GetRandomSpeech(): string | null {
    return this._speak.length > 0
      ? this._speak[Math.floor(Math.random() * this._speak.length)]
      : null;
  }

  private _collectStrings(node: WzProperty, out: string[], textOf?: (npcId: number, key: string) => string | undefined): void {
    for (const v of Object.values(node.Items)) {
      if (typeof v === 'string') {
        out.push(textOf?.(this.NpcId, v) ?? v);
      } else if (v instanceof WzProperty) {
        this._collectStrings(v, out, textOf);
      }
    }
  }

  Update(dt: number): void {
    const frames = this._anims.get(this._state);
    if (!frames || frames.length === 0) return;

    let delayMs = frames[this._frame].delayMs;
    if (delayMs <= 0) delayMs = 150;
    this._frameTimer += dt * 1000;
    if (this._frameTimer >= delayMs) {
      this._frameTimer -= delayMs;
      this._frame = (this._frame + 1) % frames.length;
    }

    // Only rebuild when state, frame, or facing changed
    if (this._state !== this._lastState || this._frame !== this._lastFrame || this._facingLeft !== this._lastFacing) {
      this._lastState = this._state;
      this._lastFrame = this._frame;
      this._lastFacing = this._facingLeft;
      this._rebuildDisplay();
    }
  }

  SetState(state: string): void {
    if (this._anims.has(state) && state !== this._state) {
      this._state = state;
      this._frame = 0;
      this._frameTimer = 0;
    }
  }

  FaceLeft(left: boolean): void {
    this._facingLeft = left;
  }

  /** World-space hit test against the current frame's sprite bounds (falls back to the 40x70 placeholder box). */
  HitTest(worldX: number, worldY: number): boolean {
    const frames = this._anims.get(this._state);
    const frame = frames?.[Math.min(this._frame, frames.length - 1)];
    const halfW = frame ? frame.sprite.OriginX : 20;
    const left = frame ? -halfW : -20;
    const right = frame ? frame.sprite.Width - halfW : 20;
    const top = frame ? -frame.sprite.OriginY : -70;
    const bottom = frame ? frame.sprite.Height - frame.sprite.OriginY : 0;
    const dx = worldX - this.Position.x;
    const dy = worldY - this.Position.y;
    return dx >= left && dx < right && dy >= top && dy < bottom;
  }

  private _rebuildDisplay(): void {
    this.container.removeChildren();

    if (!this._loaded) {
      this._addPlaceholder();
      return;
    }

    const frames = this._anims.get(this._state);
    if (!frames || frames.length === 0) {
      this._addPlaceholder();
      return;
    }

    const { sprite } = frames[Math.min(this._frame, frames.length - 1)];
    if (!this._bodySprite) {
      this._bodySprite = new Sprite(sprite.Texture);
      this._bodySprite.anchor.set(
        sprite.Width > 0 ? sprite.OriginX / sprite.Width : 0,
        sprite.Height > 0 ? sprite.OriginY / sprite.Height : 0,
      );
    } else {
      this._bodySprite.texture = sprite.Texture;
    }
    this._bodySprite.scale.x = this._facingLeft ? -1 : 1;
    this.container.addChild(this._bodySprite);
    this._addNameTags();
  }

  drawFrameOnly(parent: Container, screenX: number, screenY: number, flip = false): void {
    if (!this._loaded) {
      const gfx = new Graphics();
      gfx.rect(-20, -70, 40, 70).fill({ color: 0x503c64, alpha: 0.78 });
      gfx.rect(-15, -86, 30, 16).fill({ color: 0xdcb48c, alpha: 0.78 });
      gfx.position.set(screenX, screenY);
      parent.addChild(gfx);
      return;
    }
    const frames = this._anims.get(this._state);
    if (!frames || frames.length === 0) return;
    const { sprite } = frames[Math.min(this._frame, frames.length - 1)];
    const pixi = sprite.ToPixi(flip);
    pixi.position.set(screenX, screenY);
    parent.addChild(pixi);
  }

  private _addPlaceholder(): void {
    if (!this._placeholderGfx) {
      this._placeholderGfx = new Graphics();
      this._placeholderGfx.rect(-20, -70, 40, 70).fill({ color: 0x503c64, alpha: 0.78 });
      this._placeholderGfx.rect(-15, -86, 30, 16).fill({ color: 0xdcb48c, alpha: 0.78 });
    }
    this.container.addChild(this._placeholderGfx);
  }

  private _addNameTags(): void {
    if (!this.ShowNameTag) return;
    if (!this._nameTagContainer) this._nameTagContainer = new Container();
    this._nameTagContainer.removeChildren();

    // Position above NPC head (HeadY is negative from origin, so y is negative)
    let y = this.HeadY - 2;
    if (this.Name) {
      if (!this._nameText) {
        this._nameText = new Text({ text: this.Name, style: { fontFamily: 'Arial', fontSize: 12, fill: 0xffcc00 } });
      } else {
        this._nameText.text = this.Name;
      }
      const w = Math.ceil(this._nameText.width) + 8;
      const h = 18;
      const bg = new Graphics();
      bg.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.6 });
      this._nameText.x = 4;
      this._nameText.y = 2;
      this._nameTagContainer.addChild(bg, this._nameText);
      this._nameTagContainer.pivot.set(w / 2, h);
      this._nameTagContainer.position.set(0, y);
      this.container.addChild(this._nameTagContainer);
      y -= h + 1;
    }
    if (this.FuncName) {
      const funcTag = this._makeNameTag(this.FuncName);
      funcTag.position.set(0, y);
      this.container.addChild(funcTag);
    }
  }

  private _makeNameTag(label: string): Container {
    const tag = new Container();
    const text = new Text({ text: label, style: {
      fontFamily: 'Arial',
      fontSize: 12,
      fill: 0xffcc00,
    } });
    const w = Math.ceil(text.width) + 8;
    const h = 18;
    const bg = new Graphics();
    bg.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.6 });
    text.x = 4;
    text.y = 2;
    tag.addChild(bg, text);
    tag.pivot.set(w / 2, h);
    return tag;
  }

  private _loadFrame(loader: WzTextureLoader, frameNode: WzProperty): WzSprite | null {
    for (const [, v] of Object.entries(frameNode.Items)) {
      if (v instanceof WzCanvas) return loader.Load(v);
    }
    return null;
  }

  private _readDelay(node: WzProperty): number {
    const v = node.Get('delay');
    if (typeof v === 'number') return v;
    if (typeof v === 'bigint') return Number(v);
    return 150;
  }

  private _readBool(v: unknown): boolean | null {
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'bigint') return v !== 0n;
    if (typeof v === 'boolean') return v;
    return null;
  }
}
