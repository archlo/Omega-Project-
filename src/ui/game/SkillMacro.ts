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

// OG CUIMacroSys (base, @0x84c430-0x84e450) — v95 macro-edit popup attached to
// the right edge of the skill window (CUIMacroSys ctor @0x84c0d0 anchors at
// skill panel +174,+0). NX-verified WZ subtree: UIWindow2.img/Skill/macro.
const PanelW = 195;
const PanelH = 281;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });

// OG Draw @0x84c430 row loop: k = 44; k < 176; k += 44 → three rows at
// y = 44 / 88 / 132. Skill slot icons at Copy(34*j + 15, k) → x = 15/49/83;
// the combination-skill (macro) icon at Copy(136, k). The selected-row
// highlight is the `select` canvas (158×38) copied at (12, 44*rel + 41).
const ROW_Y_START = 44;
const ROW_STEP = 44;
const SKILL_SLOT_X0 = 15;
const SKILL_SLOT_STEP = 34;
const MACRO_ICON_X = 136;

// OG GetIndexByPos @0x849f70 — row hit bands: v8=76 check (v8-32..v8], step 44
// → y ∈ [44,76] / [88,120] / [132,164]. Skill slots v11=47 check, step 34 →
// x ∈ [15,47] / [49,81] / [83,115]. Macro slot: (rx-136) <= 32 → x ∈ [136,168].
const ROW_HIT = { min: 44, max: 164, bandTop: 32 };
const SLOT_HIT = { min: 15, max: 115, bandTop: 32 };

export interface MacroRowData { slot: number; skills: number[]; name?: string; mute?: boolean; }

// OG classes: CUIMacroSys (base) and CUIMacroSysEx (extended/advanced
// variant) — both RTTI-confirmed TSingletons with OnCreate/OnSelected/
// OnMouseMove/OnMouseButton/OnButtonClicked/SetShow/Draw. Distinct from the
// unrelated CUIAntiMacro/CUIAdminAntiMacro (anti-macro "are you human"
// challenge popup) and CUIAntiMacroNotice — don't conflate.
export class SkillMacro extends GamePanel implements DragTarget {
  OnSave: ((macros: MacroRowData[]) => void) | null = null;
  skillNameOf: (skillId: number) => string = (skillId) => `Skill ${skillId}`;
  skillIconOf: ((skillId: number) => Texture | null) | null = null;
  onDragStart: ((payload: { skillId: number }, texture: Texture, x: number, y: number) => void) | null = null;

  private _background: WzSprite | null = null;
  private _loader: WzTextureLoader;
  private _ui: WzPackage | null;
  private _font: BuiltInFont | null;
  private _allButtons: Button[] = [];
  private _btOk: Button | null = null;
  private _macros: MacroRowData[] = [];
  private _selectedSlot = -1;
  private _scrollOffset = 0;
  private readonly _rows: Array<{ select: Sprite; slots: Sprite[]; icons: Texture[] }> = [];
  private readonly _mute = new Map<number, boolean>();
  private _editingName = false;
  private _scrollBar: ScrollBar;
  private _shoutCheck: Sprite | null = null;
  private _shoutLabel: Text;
  private _nameBox: Graphics;
  private _nameText: Text;
  private _previewIcon: Sprite | null = null;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._loader = loader;
    this._ui = ui;
    this._font = font;
    this.isVisible = false;
    this.container.position.set(240, 100);
    // OG OnCreate @0x84df20: m_pSBMacro = CreateCtrl_2(3010, 1, 8, 174, 42, 124)
    this._scrollBar = new ScrollBar(174, 42, 124, (pos) => {
      this._scrollOffset = pos;
      this._refreshRows();
    });
    this.container.addChild(this._scrollBar.container);

    // OG OnCreate: m_pCheckShout = CreateCtrl_2(3011, 156, 231, param) with
    // nWidth=15, nHeight=15, nBackColor=0. The checked glyph is the WZ `check`
    // canvas (6×6, origin -161,-235 → WzSprite.ToPixi renders it at 161,235
    // from a (0,0) container — inside the checkbox rect). CCtrlCheckBox::Draw
    // @0x4D6360 copies the state glyph at (x+2, y+1) and draws the (empty)
    // label text after it; nBackColor=0 means no box fill is drawn.
    this._shoutLabel = new Text({ text: '', style: new TextStyle({ fill: '#FFF', fontSize: 11, fontFamily: 'monospace' }) });
    this._shoutLabel.position.set(156 + 18, 231);
    this.container.addChild(this._shoutLabel);

    // OG OnCreate: m_pEditName = CreateCtrl(3012, 55, 208, 116, 15, param)
    // nFontColor = -11184811 (0xABABAB), nHorzMax = 12, font = StringPool 6693.
    // The CCtrlEdit chrome is a plain rectangle (no WZ canvas in this subtree).
    this._nameBox = new Graphics();
    this._nameBox.position.set(55, 208);
    this.container.addChild(this._nameBox);
    this._nameText = new Text({ text: '', style: new TextStyle({ fill: '#ABABAB', fontSize: 11, fontFamily: 'monospace' }) });
    this._nameText.position.set(58, 210);
    this.container.addChild(this._nameText);

    let macro = ui?.GetItem('UIWindow2.img/Skill/macro');
    const macroProp = macro instanceof WzProperty ? macro : null;
    // OG CUIMacroSys::OnCreate calls SetBackgrnd("macro/backgrnd") — the three
    // layered backgrounds (backgrnd 195×281 z-5, backgrnd2 183×253 z-4,
    // backgrnd3 161×202 z-3) form the frame via their origin anchors.
    const bgLayers = ['backgrnd', 'backgrnd2', 'backgrnd3'];
    for (const key of bgLayers) {
      const node = macroProp?.Get(key);
      if (node instanceof WzCanvas) {
        const ws = loader.Load(node);
        if (ws) {
          const sprite = ws.ToPixi();
          if (key === 'backgrnd') this._background = ws;
          this.container.addChild(sprite);
        }
      }
    }

    // OG OnCreate: m_pBtChangeName = AddButton(0xBB8, "BtOK", 0, 0). The WZ
    // origin (-145,-255) places the 40×16 texture at (145,255) from a (0,0)
    // container — Button.fromWz bounds account for OriginX/Y, so the container
    // must stay at (0,0) to avoid doubling the offset.
    this._btOk = this._makeButton(loader, macroProp, 'BtOK', () => this._doSave());
    this._btOk?.container.position.set(0, 0);

    // Shout checkbox glyph — the WZ `check` canvas (6×6, origin -161,-235)
    // anchors it at (161,235) from a (0,0) container, inside the 15×15 checkbox
    // rect at (156,231). CCtrlCheckBox::Draw @0x4D6360 copies this state glyph
    // at (x+2, y+1); nBackColor=0 draws no box fill, so only the mark shows.
    const checkNode = macroProp?.Get('check');
    if (checkNode instanceof WzCanvas) {
      const ws = loader.Load(checkNode);
      if (ws) {
        this._shoutCheck = ws.ToPixi();
        this._shoutCheck.visible = false;
        this.container.addChild(this._shoutCheck);
      }
    }

    // OG Draw row loop + select highlight. Each of the three visible rows has:
    //   `select` highlight canvas (hidden unless the row is the selected one)
    //   3 skill-icon slots + 1 macro-icon slot (drawn at x=15/49/83/136, y=k).
    for (let row = 0; row < 3; row++) {
      const y = ROW_Y_START + row * ROW_STEP;
      const select = new Sprite(Texture.EMPTY);
      select.position.set(12, 44 * row + 41);
      select.visible = false;
      this.container.addChild(select);
      const slots: Sprite[] = [];
      const icons: Texture[] = [];
      for (let slot = 0; slot < 4; slot++) {
        const icon = new Sprite(Texture.EMPTY);
        icon.position.set(slot === 3 ? MACRO_ICON_X : SKILL_SLOT_X0 + slot * SKILL_SLOT_STEP, y);
        this.container.addChild(icon);
        slots.push(icon);
        icons.push(Texture.EMPTY);
      }
      this._rows.push({ select, slots, icons });
    }
    const selNode = macroProp?.Get('select');
    if (selNode instanceof WzCanvas) {
      const ws = loader.Load(selNode);
      if (ws) {
        for (const r of this._rows) r.select.texture = ws.Texture;
      }
    }

    // OG Draw: preview of the selected macro's icon at Copy(16, 189).
    this._previewIcon = new Sprite(Texture.EMPTY);
    this._previewIcon.position.set(16, 189);
    this.container.addChild(this._previewIcon);

    const title = new Text({ text: 'Skill Macro', style: _titleStyle });
    title.x = 8; title.y = 5;
    this.container.addChild(title);
  }

  Open(macros: MacroRowData[]): void {
    this._macros = macros.map((macro, slot) => ({
      slot: macro.slot ?? slot,
      skills: [macro.skills[0] ?? 0, macro.skills[1] ?? 0, macro.skills[2] ?? 0],
      name: macro.name ?? `Macro ${slot + 1}`,
      mute: macro.mute ?? false,
    }));
    this._selectedSlot = -1;
    this._scrollOffset = 0;
    this._scrollBar.pos = 0;
    this._scrollBar.setRange(Math.max(0, this._macros.length - 3) + 1);
    this._editingName = false;
    this.isVisible = true;
    this._refreshRows();
  }

  /** OG CUIMacroSys ctor @0x84c0d0 anchors at (skillPanelAbsLeft + 174,
   *  skillPanelAbsTop) — the macro popup hangs off the skill window's right
   *  edge. Re-position whenever the skill window is shown or dragged. */
  anchorToSkill(skillX: number, skillY: number, skillW = 174): void {
    this.container.position.set(skillX + skillW, skillY);
  }

  private _doSave(): void {
    this.OnSave?.(this._macros.map((macro) => ({
      ...macro,
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
    // Shout checkbox (OG: m_pCheckShout at 156,231 15×15)
    if (lx >= 150 && lx < 174 && ly >= 226 && ly < 255) {
      const selected = this._macros.find((macro) => macro.slot === this._selectedSlot);
      if (selected) {
        this._mute.set(selected.slot, !(this._mute.get(selected.slot) ?? selected.mute ?? false));
        this._refreshRows();
      }
      return true;
    }
    if (lx >= PanelW - 18 && ly < 22) { this.isVisible = false; return true; }

    // OG OnMouseButton msg 513: GetIndexByPos(rx, ry, bIncludeCombinationSkill=1).
    // Row hit bands y ∈ [44,76] / [88,120] / [132,164]; skill slots x ∈ [15,47] /
    // [49,81] / [83,115]; macro slot x ∈ [136,168]. A hit selects the row; a
    // skill-slot hit also starts a drag of that skill (CDraggableSkill).
    const row = this._rowAt(ly);
    if (row !== -1) {
      const macro = this._macros[this._scrollOffset + row];
      if (macro) {
        this._selectedSlot = macro.slot;
        this._refreshRows();
        const slot = this._slotAt(lx);
        if (slot >= 0 && slot < 3) {
          const skillId = macro.skills[slot];
          const tex = this._rows[row].slots[slot].texture;
          if (skillId && tex && tex !== Texture.EMPTY) this.onDragStart?.({ skillId }, tex, x, y);
        }
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
      if (!/[\x00-\x1F\x7F]/.test(key)) selected.name = `${selected.name ?? ''}${key}`;
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

  /** OG GetIndexByPos @0x849f70 row hit — y bands [44,76]/[88,120]/[132,164]. */
  private _rowAt(ly: number): number {
    for (let i = 0; i < 3; i++) {
      const center = 76 + i * 44;
      if (ly >= center - ROW_HIT.bandTop && ly <= center) return i;
    }
    return -1;
  }

  /** OG GetIndexByPos @0x849f70 skill-slot hit — x bands [15,47]/[49,81]/[83,115]. */
  private _slotAt(lx: number): number {
    for (let i = 0; i < 3; i++) {
      const center = 47 + i * 34;
      if (lx >= center - SLOT_HIT.bandTop && lx <= center) return i;
    }
    return -1;
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
    const row = this._rowAt(ly);
    const slot = this._slotAt(lx);
    if (row < 0 || slot < 0) return false;
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
    // Shout checkbox glyph — WZ `check` 6×6 canvas, origin (-161,-235) anchors
    // it at (161,235). Show the glyph when checked; nothing when unchecked.
    if (this._shoutCheck) this._shoutCheck.visible = shout;
    // OG CCtrlEdit: (55,208) 116×15 with dark chrome
    this._nameBox.clear();
    this._nameBox.lineStyle(1, 0x999999, 1);
    this._nameBox.beginFill(0x201E2A, 1);
    this._nameBox.drawRect(0, 0, 116, 15);
    this._nameBox.endFill();
    this._nameText.text = selected ? (selected.name ?? '') : '';
    if (this._editingName) {
      this._nameText.text += ((Date.now() / 500 | 0) % 2 === 0) ? '_' : '';
    }
    const relSel = this._selectedSlot >= 0 ? this._selectedSlot - this._scrollOffset : -1;
    for (let row = 0; row < this._rows.length; row++) {
      const view = this._rows[row];
      const macro = this._macros[this._scrollOffset + row];
      view.select.visible = relSel === row;
      for (let i = 0; i < 4; i++) {
        const icon = view.slots[i];
        if (i < 3) {
          const skillId = macro?.skills[i] ?? 0;
          icon.texture = skillId && this.skillIconOf?.(skillId) ? this.skillIconOf(skillId)! : Texture.EMPTY;
        } else {
          this._loadMacroIcon(icon, macro?.slot ?? -1);
        }
      }
    }
    this._loadPreviewIcon();
  }

  private _safeName(name: string): string {
    const clean = name.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, 12);
    return clean || 'Macro';
  }

  private _loadMacroIcon(target: Sprite, macroId: number): void {
    if (macroId < 0) { target.texture = Texture.EMPTY; return; }
    const node = this._ui?.GetItem(`UIWindow2.img/Skill/macro/Macroicon/${macroId}/icon`);
    if (node instanceof WzCanvas && this._loader) {
      const ws = this._loader.Load(node);
      if (ws) target.texture = ws.Texture;
    } else {
      target.texture = Texture.EMPTY;
    }
  }

  private _loadPreviewIcon(): void {
    if (!this._previewIcon) return;
    const sel = this._macros.find((macro) => macro.slot === this._selectedSlot);
    if (!sel) { this._previewIcon.texture = Texture.EMPTY; return; }
    const node = this._ui?.GetItem(`UIWindow2.img/Skill/macro/Macroicon/${sel.slot}/icon`);
    if (node instanceof WzCanvas && this._loader) {
      const ws = this._loader.Load(node);
      if (ws) this._previewIcon.texture = ws.Texture;
    } else {
      this._previewIcon.texture = Texture.EMPTY;
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
