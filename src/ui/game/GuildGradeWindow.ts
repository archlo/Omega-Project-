import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { Button } from '../Button.js';

// ═══ CWndGuildGrade / CWndAllianceGrade (v95 IDB) ════════════════════════════
// CUIUserList::ToggleGuildInfo @0x8D1B30 spawns CWndGuildGrade at
// (GetAbsLeft + m_width, GetAbsTop); ctor @0x8CD140 CreateWnd(.., 264, 382).
// Alliance variant OnCreate @0x8CE650: backgrnd from
// UIWindow2.img/UserList/GuildInfo, AddButton BtEdit id 2140 (0x85C) and
// BtSave id 2141 (0x85D); grades SP3296 "Master", SP3297 "Jr.Master",
// SP6297 "Member" (grades 2..4 all Member) — m_asGradeOriginal[5].
// Edit flips the row into an input state; Save commits via the guild packet.

const PANEL_W = 264;
const PANEL_H = 382;
const GRADE_ROWS = 5;

export class GuildGradeWindow extends GamePanel {
  /** (gradeIndex 1..5, newName) — sent as the SetGuildGradeName request. */
  onGradeNameChange: ((gradeIndex: number, name: string) => void) | null = null;

  private _loader: WzTextureLoader | null = null;
  private _ui: WzPackage | null = null;
  private _isAlliance: boolean;
  private _grades: string[] = [];
  private _rowTexts: Text[] = [];
  private _btEdit: Button | null = null;
  private _btSave: Button | null = null;
  private _editingRow = -1;
  private _input = '';

  constructor(isAlliance: boolean, loader?: WzTextureLoader, ui?: WzPackage | null) {
    super();
    this._isAlliance = isAlliance;
    this.isVisible = false;
    this._loader = loader ?? null;
    this._ui = ui ?? null;
    // Default grades (SP3296/3297/6297): Master, Jr.Master, Member x3.
    this._grades = ['Master', 'Jr.Master', 'Member', 'Member', 'Member'];
    if (loader && ui) this.initWzAssets(loader, ui);
    else this._buildFallback();
  }

  initWzAssets(loader: WzTextureLoader, ui: WzPackage | null): void {
    this._loader = loader;
    this._ui = ui;
    const prop = ui?.GetItem('UIWindow2.img/UserList/GuildInfo');
    if (!(prop instanceof WzProperty)) { this._buildFallback(); return; }

    for (const child of [...this._root.children]) child.removeFromParent();

    for (const [name, dx, dy] of [['backgrnd', 0, 0], ['backgrnd2', 6, 22]] as const) {
      const c = prop.Get(name);
      if (!(c instanceof WzCanvas)) continue;
      const ws = loader.Load(c);
      if (!ws) continue;
      const s = ws.ToPixi();
      s.position.set(dx - ws.OriginX, dy - ws.OriginY);
      this._root.addChildAt(s, 0);
    }
    // base (244x98, origin -10,-27 → drawn at (10,27)) + base2 strip.
    for (const name of ['base', 'base2']) {
      const c = prop.Get(name);
      if (!(c instanceof WzCanvas)) continue;
      const ws = loader.Load(c);
      if (!ws) continue;
      const s = ws.ToPixi();
      s.position.set(10 - ws.OriginX, 27 - ws.OriginY);
      this._root.addChild(s);
    }

    this._btEdit = this._mkBtn(prop, 'BtEdit', () => this.beginEdit());
    this._btSave = this._mkBtn(prop, 'BtSave', () => this.commit());
    this.createCloseButton(loader, ui, 5);
    this._rebuild();
  }

  private _mkBtn(prop: WzProperty, name: string, onClick: () => void): Button | null {
    const sub = prop.Get(name);
    if (!(sub instanceof WzProperty) || !this._loader) return null;
    const b = Button.fromWz(this._loader, sub, '');
    b.onClick = onClick;
    b.container.position.set(0, 0); // position encoded in the canvas origin
    this._root.addChild(b.container);
    return b;
  }

  private _buildFallback(): void {
    const g = new Graphics();
    g.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#10131f', alpha: 0.97 });
    g.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
    this._root.addChild(g);
    this.createCloseButton(null, null, 1, PANEL_W);
    this._rebuild();
  }

  /** Sync grade titles from GUILDDATA (index 1..5). */
  setGrades(names: string[]): void {
    for (let i = 0; i < GRADE_ROWS; i++) {
      if (names[i]) this._grades[i] = names[i];
    }
    this._rebuild();
  }

  private beginEdit(): void {
    if (this._editingRow >= 0) return;
    this._editingRow = 0;
    this._input = this._grades[0];
    this._rebuild();
  }

  private commit(): void {
    if (this._editingRow < 0) return;
    const idx = this._editingRow;
    const name = this._input.trim().slice(0, 12);
    this._editingRow = -1;
    this._input = '';
    if (name) {
      this._grades[idx] = name;
      // OG grade rows are 1-based on the wire (m_asGrade[nGrade+4] display).
      this.onGradeNameChange?.(idx + 1, name);
    }
    this._rebuild();
  }

  private _rebuild(): void {
    for (const t of this._rowTexts) t.removeFromParent();
    this._rowTexts = [];

    const title = new Text({
      text: this._isAlliance ? 'Alliance Grade' : 'Guild Grade',
      style: new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'Arial' }),
    });
    title.position.set(20, 34);
    this._root.addChild(title);
    this._rowTexts.push(title);

    const rowStyle = new TextStyle({ fill: '#000000', fontSize: 11, fontFamily: 'Arial' });
    for (let i = 0; i < GRADE_ROWS; i++) {
      const isEditing = i === this._editingRow;
      const label = isEditing ? `${this._input}|` : `${i + 1} ${this._grades[i]}`;
      const t = new Text({ text: label, style: rowStyle });
      t.position.set(30, 70 + i * 22);
      t.eventMode = 'static';
      t.cursor = 'pointer';
      const row = i;
      t.on('pointerdown', () => {
        if (this._editingRow < 0) { this._editingRow = row; this._input = this._grades[row]; this._rebuild(); }
      });
      this._root.addChild(t);
      this._rowTexts.push(t);
    }

    if (this._btSave) this._btSave.enabled = this._editingRow >= 0;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    if (this._btEdit?.handleMouseButton(lx, ly, down)) return true;
    if (this._btSave?.handleMouseButton(lx, ly, down)) return true;
    return lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    if (this._editingRow >= 0) {
      if (key === 'Enter') { this.commit(); return true; }
      if (key === 'Backspace') { this._input = this._input.slice(0, -1); this._rebuild(); return true; }
      if (key.length === 1) { this._input += key; this._rebuild(); return true; }
    }
    return false;
  }
}
