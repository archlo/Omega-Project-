import { Container, Graphics, Text } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { Button } from '../Button.js';

// CUIFindFriend::OnCreate @0x7BA180 control table:
//   backgrnd     StringPool 0x16B1 -> UI/UIWindow.img/FriendRecommendations/FriendsList/back
//   m_pCBSort    CCtrlComboBox id 2005 CreateCtrl_2(0, 85, 57, 93, 18)
//                items: Name(0) Level(1) Job(2) Playstyle(3) Field(4)
//   BtAddBuddy   id 2001 CreateCtrl_2(7, 57)
//   BtWhisper    id 2002 CreateCtrl_2(6, 284)
//   BtFindFriend id 2003 CreateCtrl_2(51, 284)
//   BtDetail     id 2004 CreateCtrl_2(136, 284)
//   m_pSBList    CCtrlScrollBar id 2006 CreateCtrl_2(1, 3, 160, 78, 188) wheel 156
const COMBO = { x: 85, y: 57, w: 93, h: 18 };
const SORT_ITEMS = ['Name', 'Level', 'Job', 'Playstyle', 'Field'];
const BT_ADD_BUDDY = { x: 7, y: 57 };
const BT_WHISPER = { x: 6, y: 284 };
const BT_FIND_FRIEND = { x: 51, y: 284 };
const BT_DETAIL = { x: 136, y: 284 };
const SB = { x: 3, y: 160, len: 78 };
// Friend rows fill the scroll area between the sort combo and the bottom
// button row (scrollbar spans y=160..238).
const LIST_TOP = 82;
const LIST_BOTTOM = 238;

export interface FriendRowData {
  name: string;
  level?: number;
  jobName?: string;
  online?: boolean;
  channel?: number;
}

export class FindFriend extends GamePanel {
  onMyInfo: (() => void) | null = null;
  onSearch: (() => void) | null = null;
  /** BtAddBuddy id 2001 - CUIFindFriend::OnAddBuddy. */
  onAddBuddy: (() => void) | null = null;
  /** BtWhisper id 2002 - CUIFindFriend::OnWhisper. */
  onWhisper: ((name: string | null) => void) | null = null;
  /** BtFindFriend id 2003 - SendSearchRequest. */
  onFindFriend: (() => void) | null = null;
  /** BtDetail id 2004 - OnToggleDetail. */
  onToggleDetail: (() => void) | null = null;
  /** Sort combo id 2005 selection changed (index into SORT_ITEMS). */
  onSortChanged: ((index: number) => void) | null = null;

  private _friends: FriendRowData[] = [];
  private _selected = -1;
  private _sortIndex = 0;
  private _flag1 = 0;
  private _flag2 = 0;
  private _rows: Container[] = [];
  private _allButtons: Button[] = [];

  constructor(loader?: WzTextureLoader | null, uiWz?: WzPackage | null) {
    super();
    this.isVisible = false;
    this._root.position.set(338, 178);

    const propRoot = uiWz?.GetItem('UIWindow.img/FriendRecommendations/FriendsList');
    const prop = propRoot instanceof WzProperty ? propRoot : null;

    if (prop && loader) {
      const back = prop.Get('back');
      if (back && typeof back === 'object') {
        const ws = loader.Load(back as never);
        if (ws) {
          const s = ws.ToPixi();
          s.position.set(-ws.OriginX, -ws.OriginY);
          this._root.addChild(s);
        }
      }
      this._makeButton(loader, prop, 'BtAddBuddy', BT_ADD_BUDDY, () => this.onAddBuddy?.());
      this._makeButton(loader, prop, 'BtWhisper', BT_WHISPER, () => this.onWhisper?.(this._selectedName()));
      this._makeButton(loader, prop, 'BtFind', BT_FIND_FRIEND, () => this.onFindFriend?.());
      this._makeButton(loader, prop, 'BtDetail', BT_DETAIL, () => this.onToggleDetail?.());
    }

    // Sort combo (id 2005): drawn per CCtrlComboBox CREATEPARAM colors
    // (#FFEECE back, focused #A5A198, border #999999), text offset y -2.
    this._comboBg = new Container();
    this._comboBg.position.set(COMBO.x, COMBO.y);
    const g = new Graphics();
    g.rect(0, 0, COMBO.w, COMBO.h).fill({ color: 0xFEEECE }).stroke({ color: 0x999999, width: 1 });
    this._comboLabel = new Text({ text: SORT_ITEMS[0], style: { fill: '#000000', fontSize: 11, fontFamily: 'Arial' } });
    this._comboLabel.position.set(6, -2);
    this._comboBg.addChild(g, this._comboLabel);
    this._root.addChild(this._comboBg);

    this.createCloseButton(loader ?? null, uiWz ?? null, 1);
  }

  private _comboBg!: Container;
  private _comboLabel!: Text;

  Open(): void {
    this.isVisible = true;
    this.draw();
  }

  /** FriendLoaded data - replaces the logged-only handler in GameStage. */
  SetFriends(friends: FriendRowData[]): void {
    this._friends = friends;
    this._selected = -1;
    if (this.isVisible) this.draw();
  }

  SetResult(flag1: number, flag2: number): void {
    // CUIFindFriend::OnSearchResult decoded state.
    this._flag1 = flag1;
    this._flag2 = flag2;
    this.isVisible = true;
    this.draw();
  }

  private _selectedName(): string | null {
    return this._selected >= 0 && this._selected < this._friends.length
      ? this._friends[this._selected].name : null;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    for (const b of this._allButtons) {
      if (b.handleMouseButton(x, y, down)) return true;
    }
    const px = this._root.x;
    const py = this._root.y;
    const lx = x - px;
    const ly = y - py;
    // Sort combo click cycles the selection (dropdown rendering is the
    // shared ComboBox control's job when wired to a real popup).
    if (down && lx >= COMBO.x && lx < COMBO.x + COMBO.w && ly >= COMBO.y && ly < COMBO.y + COMBO.h) {
      this._sortIndex = (this._sortIndex + 1) % SORT_ITEMS.length;
      this._comboLabel.text = SORT_ITEMS[this._sortIndex];
      this.onSortChanged?.(this._sortIndex);
      return true;
    }
    if (down && ly >= LIST_TOP && ly < LIST_BOTTOM) {
      const idx = Math.floor((ly - LIST_TOP) / 20);
      if (idx >= 0 && idx < this._friends.length) {
        this._selected = idx;
        this.draw();
        return true;
      }
    }
    return lx >= 0 && lx < 260 && ly >= 0 && ly < 310;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }

  draw(): void {
    if (!this.isVisible) return;
    for (const r of this._rows) { r.removeFromParent(); r.destroy({ children: true }); }
    this._rows = [];
    let y = LIST_TOP;
    for (let i = 0; i < this._friends.length && y < LIST_BOTTOM; i++, y += 20) {
      const f = this._friends[i];
      const c = new Container();
      c.position.set(14, y);
      const color = f.online === false ? '#999999' : '#000000';
      const label = `${f.name}${f.level !== undefined ? `  Lv.${f.level}` : ''}${f.jobName ? `  ${f.jobName}` : ''}`;
      c.addChild(new Text({ text: label, style: { fill: color, fontSize: 11, fontFamily: 'Arial' } }));
      if (i === this._selected) {
        const sel = new Graphics();
        sel.rect(-4, -2, 232, 18).fill({ color: 0xA5A198, alpha: 0.5 });
        c.addChildAt(sel, 0);
      }
      this._root.addChild(c);
      this._rows.push(c);
    }
    if (this._friends.length === 0 && (this._flag1 || this._flag2)) {
      const info = new Text({
        text: `Result ${this._flag1}/${this._flag2}`,
        style: { fill: '#666666', fontSize: 10, fontFamily: 'Arial' },
      });
      info.position.set(14, LIST_TOP);
      this._root.addChild(info);
      this._rows.push(info);
    }
  }

  private _makeButton(loader: WzTextureLoader, root: WzProperty, name: string, pos: { x: number; y: number }, onClick: () => void): Button | null {
    const pr = root.Get(name);
    if (!(pr instanceof WzProperty)) return null;
    const b = Button.fromWz(loader, pr, name);
    b.onClick = onClick;
    b.container.position.set(pos.x, pos.y);
    this._root.addChild(b.container);
    this._allButtons.push(b);
    return b;
  }
}
