import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { WzSprite } from '../render/WzSprite.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzProperty } from '../wz/WzProperty.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { WzImage } from '../wz/WzImage.js';

export class PetLook {
  private _anims = new Map<string, { sprite: WzSprite; delayMs: number }[]>();
  private _state = 'stand';
  private _frame = 0;
  private _frameTimer = 0;
  private _facingLeft = false;
  private _loaded = false;
  private _speechText = '';
  private _speechTimer = 0;

  readonly container = new Container();
  Position = { x: 0, y: 0 };
  Name = '';
  // OG: CPet::OnNameChanged (0x6a11f0) showNameTag byte.
  ShowNameTag = true;

  constructor(public readonly TemplateId: number) {}

  get IsLoaded(): boolean { return this._loaded; }

  Load(loader: WzTextureLoader, charWz: WzPackage | null): void {
    if (charWz === null) return;

    const strid = `${this.TemplateId.toString().padStart(8, '0')}.img`;
    const item = charWz.GetItem(strid);
    const root = item instanceof WzImage ? item.Root : null;
    if (!root) return;

    let resolvedRoot: WzProperty | null = root;

    if (root.Get('info') instanceof WzProperty) {
      const info = root.Get('info') as WzProperty;
      const name = info.Get('name');
      if (typeof name === 'string') this.Name = name;
      const link = info.Get('link');
      if (typeof link === 'number') {
        const linkId = link;
        const linkStrid = `${linkId.toString().padStart(8, '0')}.img`;
        const linkItem = charWz.GetItem(linkStrid);
        const linkRoot = linkItem instanceof WzImage ? linkItem.Root : null;
        if (linkRoot) resolvedRoot = linkRoot;
      }
    }

    for (const [key, value] of Object.entries(resolvedRoot!.Items)) {
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

    this._loaded = this._anims.size > 0;
  }

  Update(dt: number): void {
    if (this._speechTimer > 0) {
      this._speechTimer = Math.max(0, this._speechTimer - dt);
      if (this._speechTimer === 0) this._speechText = '';
    }
    const frames = this._anims.get(this._state);
    if (!frames || frames.length === 0) {
      this._rebuildDisplay();
      return;
    }

    let delayMs = frames[this._frame].delayMs;
    if (delayMs <= 0) delayMs = 150;
    this._frameTimer += dt * 1000;
    if (this._frameTimer >= delayMs) {
      this._frameTimer -= delayMs;
      this._frame = (this._frame + 1) % frames.length;
    }

    this._rebuildDisplay();
  }

  SetState(state: string): void {
    if (this._anims.has(state) && state !== this._state) {
      this._state = state;
      this._frame = 0;
      this._frameTimer = 0;
    }
  }

  PlayAction(action: number): void {
    // TODO_AUDIT.md Hundred-and-forty-sixth pass: remote pet action packets
    // now select real WZ action nodes when present. Numeric action names are
    // common in Pet.wz; fall back to a short walk/stand pulse if absent.
    const key = `${action}`;
    if (this._anims.has(key)) this.SetState(key);
    else if (this._anims.has('walk')) this.SetState('walk');
  }

  FaceLeft(left: boolean): void {
    this._facingLeft = left;
  }

  Say(text: string, durationSec = 4): void {
    // TODO_AUDIT.md Hundred-and-forty-eighth pass: pet speak/interact packets
    // now render above the pet instead of being chat-log only.
    if (!text) return;
    this._speechText = text;
    this._speechTimer = durationSec;
  }

  private _rebuildDisplay(): void {
    this.container.removeChildren();

    if (!this._loaded) {
      this._drawSpeechBubble(-34);
      return;
    }

    const frames = this._anims.get(this._state);
    if (!frames || frames.length === 0) return;

    const { sprite } = frames[Math.min(this._frame, frames.length - 1)];
    const pixi = new Sprite(sprite.Texture);
    pixi.anchor.set(
      sprite.Width > 0 ? sprite.OriginX / sprite.Width : 0,
      sprite.Height > 0 ? sprite.OriginY / sprite.Height : 0,
    );
    if (this._facingLeft) pixi.scale.x = -1;
    this.container.addChild(pixi);

    if (this.Name && this.ShowNameTag) {
      const nameText = new Text({ text: this.Name, style: { fontSize: 10, fill: 0xffffff, stroke: '#000000' } });
      nameText.anchor.set(0.5, 1);
      nameText.y = -(sprite.OriginY) - 4;
      this.container.addChild(nameText);
    }
    this._drawSpeechBubble(-(sprite.OriginY) - 20);
  }

  private _drawSpeechBubble(y: number): void {
    if (!this._speechText) return;
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
}
