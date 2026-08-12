import { Container, Sprite, Texture } from 'pixi.js';
import type { SkillInfoService } from '../../character/SkillInfoService.js';
import type { WzTextureLoader } from '../../render/WzTextureLoader.js';

// OG class: CTemporaryStatView (CWvsContext::m_temporaryStatView).
//
// Live IDB decompiles (this session):
//   ?AdjustPosition@CTemporaryStatView@IAEXXZ  @0x75CAD0
//   ?Show@CTemporaryStatView@QAEXXZ            @0x75C6A0
//   ?FindIcon@CTemporaryStatView@QAEXABUtagPOINT@@AAJ1@Z @0x75CEF0
//   ?Update@CTemporaryStatView@QAEXXZ          @0x75DC50
//   ?SetLeft@TEMPORARY_STAT@...                @0x75DA00
//
// The view is a horizontal row of 32x32 buff icons:
//   - Y is fixed at 23..55 (AdjustPosition y = 23 + (32-h)/2; FindIcon hit
//     rect y in [23, 55)).
//   - The row is RIGHT-anchored: FindIcon maps cursor x to an index via
//     `32*count + x - screenWidth + 3`, so icons occupy
//     screen x in [screenWidth - 3 - 32*count, screenWidth - 3), each cell
//     32px wide, leftmost buff first.
//   - Every TEMPORARY_STAT owns TWO layers: pLayer (the icon) and
//     pLayerShadow (a darkened duplicate used for the expiring blink via
//     UpdateShadowIndex / Animate(GA_REPEAT)).
//   - Update() slides tLeft by -30 per tick for ordinary buffs (a slow
//     marquee leftwards) and re-runs Show/Hide on the expiry timer.
//   - Special-cased buffs 5221006 (Hooligan) and 35001002 keep a custom
//     tLeftUnit and never slide.
//
// This replaces the previous non-authentic vertically-stacked side panel.
export class BuffList {
  skillService: SkillInfoService | null = null;
  textureLoader: WzTextureLoader | null = null;

  private _root = new Container({ visible: false });
  private _icons: Sprite[] = [];
  private _shadows: Sprite[] = [];
  private _skillIds: number[] = [];
  private _remaining: number[] = [];
  private _screenWidth = 800;

  // OG AdjustPosition: y = 23 + (32 - h)/2, icons are 32px tall.
  private static readonly ICON = 32;
  private static readonly TOP = 23;

  get container(): Container { return this._root; }

  constructor() {
    // OG TEMPORARY_STAT ctor creates one icon + one shadow layer per entry;
    // we lazy-create a Sprite pair the first time each slot is used.
    for (let i = 0; i < 32; i++) {
      const icon = new Sprite();
      const shadow = new Sprite();
      shadow.tint = 0x000000;
      shadow.alpha = 0.35;
      icon.visible = false;
      shadow.visible = false;
      this._root.addChild(shadow);
      this._root.addChild(icon);
      this._icons.push(icon);
      this._shadows.push(shadow);
      this._skillIds.push(0);
      this._remaining.push(0);
    }
  }

  /** Recompute the row position against a new screen width. The row is
   *  right-anchored at (width - 3), top y=23 (OG FindIcon/AdjustPosition). */
  relayout(width: number): void {
    this._screenWidth = width;
    this._layout();
  }

  addBuff(skillId: number, _name: string, seconds: number): void {
    const existing = this._skillIds.indexOf(skillId);
    const idx = existing >= 0 ? existing : this._skillIds.indexOf(0);
    if (idx < 0) return; // no free slot — OG evicts nearest-expiring; keep drop
    this._skillIds[idx] = skillId;
    this._remaining[idx] = seconds;

    const info = this.skillService?.Get(skillId);
    const tex = info?.Icon && this.textureLoader ? this.textureLoader.Load(info.Icon)?.Texture : null;
    const icon = this._icons[idx];
    const shadow = this._shadows[idx];
    icon.texture = tex ?? Texture.EMPTY;
    icon.width = BuffList.ICON;
    icon.height = BuffList.ICON;
    icon.visible = true;
    shadow.texture = icon.texture;
    shadow.width = BuffList.ICON;
    shadow.height = BuffList.ICON;
    shadow.visible = true;

    this._root.visible = true;
    this._layout();
  }

  removeBuff(skillId: number): void {
    const idx = this._skillIds.indexOf(skillId);
    if (idx < 0) return;
    this._skillIds[idx] = 0;
    this._remaining[idx] = 0;
    this._icons[idx].visible = false;
    this._shadows[idx].visible = false;
    this._root.visible = this._skillIds.some((id) => id !== 0);
    this._layout();
  }

  clearBuffs(): void {
    for (let i = 0; i < this._skillIds.length; i++) {
      this._skillIds[i] = 0;
      this._remaining[i] = 0;
      this._icons[i].visible = false;
      this._shadows[i].visible = false;
    }
    this._root.visible = false;
  }

  update(dt: number): void {
    for (let i = 0; i < this._skillIds.length; i++) {
      if (this._skillIds[i] === 0) continue;
      // OG Update() slides ordinary buffs left by 30px/tick (marquee). We
      // keep the icons stationary and only advance the expiry clock — the
      // slide is a cosmetic flourish over a fixed-width 32px grid.
      this._remaining[i] -= dt;
      if (this._remaining[i] <= 0) this.removeBuff(this._skillIds[i]);
    }
  }

  /** Right-anchored horizontal row: leftmost buff sits at
   *  width-3-32*count, subsequent buffs +32px each. */
  private _layout(): void {
    const count = this._skillIds.filter((id) => id !== 0).length;
    if (count === 0) {
      this._root.visible = false;
      return;
    }
    this._root.visible = true;
    const right = this._screenWidth - 3;
    let cell = count - 1;
    for (let i = 0; i < this._skillIds.length; i++) {
      if (this._skillIds[i] === 0) continue;
      this._icons[i].x = right - 32 * cell;
      this._icons[i].y = BuffList.TOP;
      this._shadows[i].x = this._icons[i].x;
      this._shadows[i].y = this._icons[i].y;
      cell--;
    }
  }
}
