import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { Button } from '../Button.js';
import { ScrollBar } from './ScrollBar.js';
import type { DragTarget } from '../DragController.js';

const PanelW = 195;
const PanelH = 281;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _labelStyle = new TextStyle({ fill: '#AAA', fontSize: 9, fontFamily: 'monospace' });

// OG classes: CUIMacroSys (base) and CUIMacroSysEx (extended/advanced
// variant) — both RTTI-confirmed TSingletons with OnCreate/OnSelected/
// OnMouseMove/OnMouseButton/OnButtonClicked/SetShow/Draw. Distinct from the
// unrelated CUIAntiMacro/CUIAdminAntiMacro (anti-macro "are you human"
// challenge popup) and CUIAntiMacroNotice — don't conflate.
export class SkillMacro extends GamePanel implements DragTarget {
  OnSave: ((macros: { slot: number; skills: number[]; name?: string; mute?: boolean }[]) => void) | null = null;
  skillNameOf: (skillId: number) => string = (skillId) => `Skill ${skillId}`;
  skillIconOf: ((skillId: number) => Texture | null) | null = null;

  private _background: WzSprite | null;
  private _font: BuiltInFont | null;
  private _loader: WzTextureLoader;
  private _ui: WzPackage | null;
  private _allButtons: Button[] = [];
  private _btOk: Button | null = null;
  private _btCancel: Button | null = null;
  private _macros: { slot: number; skills: number[]; name?: string; mute?: boolean }[] = [];
  private _selectedSlot = 0;
  private _scrollOffset = 0;
  private readonly _rows: Array<{ bg: Sprite; title: Text; slots: Sprite[]; labels: Text[] }> = [];
  private readonly _mute = new Map<number, boolean>();
  private _editingName = false;
  private _rowBg: Texture = Texture.EMPTY;
  private _selectedRowBg: Texture = Texture.EMPTY;
  private _scrollBar: ScrollBar;
  private _shoutBox: Graphics;
  private _shoutLabel: Text;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._loader = loader;
    this._ui = ui;
    this._font = font;
    this.isVisible = false;
    this.container.position.set(240, 100);
    this._scrollBar = new ScrollBar(174, 42, 124, (pos) => {
      this._scrollOffset = pos;
      this._refreshRows();
    });
    this.container.addChild(this._scrollBar.container);
    // CUIMacroSys::OnCreate creates the shout checkbox at (156,231).
    // Keep it explicit instead of silently discarding the server's mute flag.
    this._shoutBox = new Graphics();
    this._shoutBox.position.set(156, 231);
    this.container.addChild(this._shoutBox);
    this._shoutLabel = new Text({ text: 'Shout', style: _labelStyle });
    this._shoutLabel.position.set(137, 248);
    this.container.addChild(this._shoutLabel);

    let macro = ui?.GetItem('UIWindow2.img/Skill/macro');
    const macroProp = macro instanceof WzProperty ? macro : null;
    this._background = macroProp?.Get('backgrnd') instanceof WzCanvas
      ? loader.Load(macroProp.Get('backgrnd') as WzCanvas)
      : null;
    if (this._background) this.container.addChild(this._background.ToPixi());
    for (const key of ['skill0', 'skill1']) {
      const node = macroProp?.Get(key);
      if (node instanceof WzCanvas) {
        const tex = loader.Load(node)?.Texture ?? Texture.EMPTY;
        if (key === 'skill0') this._rowBg = tex;
        else this._selectedRowBg = tex;
      }
    }
    this._btOk = this._makeButton(loader, macroProp, 'BtOK', () => this._doSave());
    this._btCancel = this._makeButton(loader, macroProp, 'BtCancel', () => { this.isVisible = false; });
    if (this._btOk) this._btOk.container.position.set(145, 255);
    if (this._btCancel) this._btCancel.container.position.set(97, 255);

    // CUIMacroSys draws three rows at a time; each row contains three skill
    // slots and a fourth macro-icon slot.
    for (let row = 0; row < 3; row++) {
      const y = 41 + row * 44;
      const bg = new Sprite(this._rowBg);
      bg.position.set(12, y);
      this.container.addChild(bg);
      const title = new Text({ text: '', style: _labelStyle });
      title.position.set(15, y + 2);
      this.container.addChild(title);
      const slots: Sprite[] = [];
      const labels: Text[] = [];
      for (let slot = 0; slot < 4; slot++) {
        const icon = new Sprite(Texture.EMPTY);
        icon.position.set(slot === 3 ? 136 : 15 + slot * 34, y + 15);
        icon.width = 32; icon.height = 32;
        this.container.addChild(icon);
        slots.push(icon);
        const label = new Text({ text: '', style: new TextStyle({ fill: '#DDD', fontSize: 7, fontFamily: 'monospace' }) });
        label.position.set(icon.x, y + 48);
        this.container.addChild(label);
        labels.push(label);
      }
      this._rows.push({ bg, title, slots, labels });
    }

    const title = new Text({ text: 'Skill Macro', style: _titleStyle });
    title.x = 8; title.y = 5;
    this.container.addChild(title);
  }

  Open(macros: { slot: number; skills: number[]; name?: string; mute?: boolean }[]): void {
    this._macros = macros.map((macro, slot) => ({
      slot: macro.slot ?? slot,
      skills: [macro.skills[0] ?? 0, macro.skills[1] ?? 0, macro.skills[2] ?? 0],
      name: macro.name ?? `Macro ${slot + 1}`,
      mute: macro.mute ?? false,
    }));
    this._selectedSlot = 0;
    this._scrollOffset = 0;
    this._scrollBar.pos = 0;
    this._scrollBar.setRange(Math.max(0, this._macros.length - 3) + 1);
    this._editingName = false;
    this.isVisible = true;
    this._refreshRows();
  }

  private _doSave(): void {
    this.OnSave?.(this._macros.map((macro) => ({
      ...macro,
      // CCurseProcess rejects invalid names before CMacroSysMan::SetMacroInfo.
      // The browser client has no StringPool-backed notice here, so preserve
      // the safe portion and never send control characters or an overlong name.
      name: this._safeName(macro.name ?? ''),
      mute: this._mute.get(macro.slot) ?? macro.mute,
    })));
    this.isVisible = false;
  }

  update(_dt: number): void { if (this.isVisible) this._refreshRows(); }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    const px = this.container.position.x;
    const py = this.container.position.y;
    const lx = x - px;
    const ly = y - py;
    const sbx = lx - 174;
    const sby = ly - 42;
    if (sbx >= 0 && sbx < 12 && sby >= 0 && sby < 124) {
      if (this._scrollBar.handleMouseButton(sbx, sby, down)) return true;
    }
    for (const b of this._allButtons) {
      if (b.handleMouseButton(lx, ly, down)) return true;
    }
    if (lx >= 150 && lx < 174 && ly >= 226 && ly < 255) {
      const selected = this._macros.find((macro) => macro.slot === this._selectedSlot);
      if (selected) {
        this._mute.set(selected.slot, !(this._mute.get(selected.slot) ?? selected.mute ?? false));
        this._refreshRows();
      }
      return true;
    }
    if (lx >= PanelW - 18 && ly < 22) { this.isVisible = false; return true; }
    if (ly >= 41 && ly < 173 && lx >= 12 && lx < 190) {
      const row = Math.floor((ly - 41) / 44);
      const slot = this._macros[this._scrollOffset + row];
      if (slot) {
        this._selectedSlot = slot.slot;
        this._refreshRows();
        return true;
      }
    }
    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    if (!this.isVisible || this._selectedSlot < 0) return false;
    const selected = this._macros.find((macro) => macro.slot === this._selectedSlot);
    if (!selected) return false;
    if (key === 'Enter') { this._editingName = !this._editingName; return true; }
    if (!this._editingName) return false;
    if (key === 'Backspace') { selected.name = (selected.name ?? '').slice(0, -1); return true; }
    if (key.length === 1 && (selected.name ?? '').length < 12) {
      if (!/[\\x00-\\x1F\\x7F]/.test(key)) selected.name = `${selected.name ?? ''}${key}`;
      return true;
    }
    return true;
  }

  onMouseMove(x: number, y: number): void {
    if (!this.isVisible) return;
    const lx = x - this.container.position.x;
    const ly = y - this.container.position.y;
    const sbx = lx - 174;
    const sby = ly - 42;
    if (sbx >= 0 && sbx < 12 && sby >= 0 && sby < 124) this._scrollBar.handleMouseMove(sbx, sby);
    else this._scrollBar.handleMouseLeave();
  }

  /**
   * CUIMacroSys::OnDropped accepts a skill dragged from CUISkill.  The old
   * panel rendered the rows but never implemented the receiving side, which
   * made the existing SkillBook drag preview disappear on mouse-up.
   */
  tryAcceptDrag(payload: unknown, x: number, y: number): boolean {
    if (!this.isVisible || !payload || typeof payload !== 'object' || !('skillId' in payload)) return false;
    const skillId = Number((payload as { skillId?: unknown }).skillId);
    if (!Number.isInteger(skillId) || skillId <= 0) return false;
    const lx = x - this.container.position.x;
    const ly = y - this.container.position.y;
    if (lx < 12 || lx >= 12 + 3 * 34 || ly < 56 || ly >= 56 + 3 * 44) return false;
    const row = Math.floor((ly - 41) / 44);
    const slot = Math.floor((lx - 15) / 34);
    if (row < 0 || row >= 3 || slot < 0 || slot >= 3) return false;
    const macro = this._macros[this._scrollOffset + row];
    if (!macro) return false;
    macro.skills[slot] = skillId;
    this._selectedSlot = macro.slot;
    this._refreshRows();
    return true;
  }

  private _refreshRows(): void {
    const selected = this._macros.find((macro) => macro.slot === this._selectedSlot);
    const shout = selected ? (this._mute.get(selected.slot) ?? selected.mute ?? false) : false;
    this._shoutBox.clear();
    this._shoutBox.lineStyle(1, shout ? 0xFFE066 : 0x777777, 1);
    this._shoutBox.beginFill(shout ? 0xA87816 : 0x201E2A, 1);
    this._shoutBox.drawRect(0, 0, 15, 15);
    this._shoutBox.endFill();
    if (shout) {
      this._shoutBox.beginFill(0xFFE066, 1);
      this._shoutBox.drawRect(3, 3, 9, 9);
      this._shoutBox.endFill();
    }
    for (let row = 0; row < this._rows.length; row++) {
      const view = this._rows[row];
      const macro = this._macros[this._scrollOffset + row];
      view.bg.texture = macro?.slot === this._selectedSlot ? this._selectedRowBg : this._rowBg;
      view.title.text = macro ? `${macro.slot + 1}: ${macro.name ?? ''}` : '';
      for (let i = 0; i < 4; i++) {
        const skillId = macro?.skills[i] ?? 0;
        const icon = view.slots[i];
        icon.texture = i < 3 ? (skillId && this.skillIconOf?.(skillId) ? this.skillIconOf(skillId)! : Texture.EMPTY) : Texture.EMPTY;
        view.labels[i].text = i < 3 && skillId ? this.skillNameOf(skillId) : (i === 3 && macro ? 'macro' : '');
        if (i === 3 && macro) this._loadMacroIcon(icon, macro.slot);
      }
    }
  }

  private _safeName(name: string): string {
    const clean = name.replace(/[\\x00-\\x1F\\x7F]/g, '').trim().slice(0, 12);
    return clean || 'Macro';
  }

  private _loadMacroIcon(target: Sprite, macroId: number): void {
    const node = this._ui?.GetItem(`UIWindow2.img/Skill/macro/Macroicon/${macroId}/icon`);
    if (node instanceof WzCanvas && this._loader) {
      const ws = this._loader.Load(node);
      if (ws) target.texture = ws.Texture;
    }
  }

  private _makeButton(loader: WzTextureLoader, root: WzProperty | null, name: string, onClick: () => void): Button | null {
    const pr = root?.Get(name);
    if (!(pr instanceof WzProperty)) return null;
    const b = Button.fromWz(loader, pr, name);
    b.onClick = onClick;
    this._allButtons.push(b);
    this.container.addChild(b.container);
    return b;
  }
}
