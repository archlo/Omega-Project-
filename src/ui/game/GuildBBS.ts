import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';
import { Button } from '../Button.js';
import { GuildBBSEntry, GuildBBSComment } from '../../net/handlers/PacketArgs.js';

// ═══ CUIGuildBBS (v95 IDB) ═══════════════════════════════════════════════════
// CUIUserList::ToggleBBS spawns CUIGuildBBS; ctor creates a 264×382 window.
// WZ subtree: UIWindow2.img/UserList/GuildBoard.
//
// Layout (all origins are panel-relative, container at (0,0)):
//   backgrnd  264×382  origin (0,0)
//   backgrnd2 252×354  origin (-6,-22)  → drawn at (6,22)
//   BtWrite   origin (-10,-332)  → (10,332)   58×16
//   BtComment origin (-72,-332)  → (72,332)   58×16
//   BtModify  origin (-134,-332) → (134,332)  58×16
//   BtDelete  origin (-196,-332) → (196,332)  58×16
//   BtList    origin (-196,-283) → (196,283)  58×16
//   Tab enabled/0 origin (-10,-25),  enabled/1 origin (-41,-25)
//   Tab disabled/0 origin (-10,-27), disabled/1 origin (-41,-27)
//
//   Coment/backgrnd  260×120 origin (0,0)
//   Coment/BtSave    origin (-158,-257) → (158,257)  40×16
//   Coment/BtCancel  origin (-200,-257) → (200,257)  40×16
//
//   Write/backgrnd   260×291 origin (0,0)
//   Write/BtSave     origin (-158,-257) → (158,257)  40×16
//   Write/BtCancel   origin (-200,-257) → (200,257)  40×16
//
//   Loading  5 frames (0-4), 69×34 each, origin (0,0)
//
// Modes: 'list' (entries), 'view' (entry+comments), 'write' (new post),
//        'comment' (add comment on viewed entry).
// ═════════════════════════════════════════════════════════════════════════════

const PANEL_W = 264;
const PANEL_H = 382;
const ROW_H = 16;
const MAX_ROWS = 14;

const _textWhite = new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'Arial' });
const _textGold = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'Arial' });
const _textGray = new TextStyle({ fill: '#AAAAAA', fontSize: 11, fontFamily: 'Arial' });
const _textBody = new TextStyle({ fill: '#DDDDDD', fontSize: 10, fontFamily: 'Arial', wordWrap: true, wordWrapWidth: PANEL_W - 20 });
const _textEntry = new TextStyle({ fill: '#CCCCCC', fontSize: 11, fontFamily: 'Arial' });
const _textNotice = new TextStyle({ fill: '#FFE082', fontSize: 11, fontFamily: 'Arial' });
const _textDim = new TextStyle({ fill: '#666666', fontSize: 10, fontFamily: 'Arial' });

type PanelMode = 'list' | 'view' | 'write' | 'comment';

export class GuildBBS extends GamePanel {
  onLoadList: ((startIndex: number) => void) | null = null;
  onViewEntry: ((entryId: number) => void) | null = null;
  onNewPost: ((title: string, text: string) => void) | null = null;
  onDeleteEntry: ((entryId: number) => void) | null = null;
  onComment: ((entryId: number, comment: string) => void) | null = null;
  onCommentDelete: ((entryId: number, commentSn: number) => void) | null = null;

  private _loader: WzTextureLoader | null = null;
  private _ui: WzPackage | null = null;

  // WZ assets
  private _tabEnabledSprites: Sprite[] = [];
  private _tabDisabledSprites: Sprite[] = [];
  private _loadingAnim: WzSprite[] = [];
  private _loadingSprite: Sprite | null = null;
  private _comentBg: Sprite | null = null;
  private _writeBg: Sprite | null = null;

  // Buttons
  private _btWrite: Button | null = null;
  private _btComment: Button | null = null;
  private _btModify: Button | null = null;
  private _btDelete: Button | null = null;
  private _btList: Button | null = null;
  private _btSave: Button | null = null;
  private _btCancel: Button | null = null;

  // State
  private _mode: PanelMode = 'list';
  private _selectedTab = 0;
  private _notice: GuildBBSEntry | null = null;
  private _entries: GuildBBSEntry[] = [];
  private _viewing: {
    entryId: number;
    characterId: number;
    title: string;
    text: string;
    comments: GuildBBSComment[];
  } | null = null;
  private _loadingFrame = 0;
  private _loadingTimer = 0;
  private _dynamicChildren: (Sprite | Text | Container)[] = [];
  private _pageOffset = 0;

  constructor(loader?: WzTextureLoader | null, ui?: WzPackage | null) {
    super();
    this._loader = loader ?? null;
    this._ui = ui ?? null;
    this.isVisible = false;
    if (loader && ui) this.initWzAssets(loader, ui);
    else this._buildFallback();
  }

  initWzAssets(loader: WzTextureLoader, ui: WzPackage | null): void {
    this._loader = loader;
    this._ui = ui;
    const prop = ui?.GetItem('UIWindow2.img/UserList/GuildBoard');
    if (!(prop instanceof WzProperty)) { this._buildFallback(); return; }

    // Clear any old children
    for (const child of [...this._root.children]) child.removeFromParent();

    // Background layers
    this._addBgCanvas(prop, 'backgrnd', 0, 0);
    this._addBgCanvas(prop, 'backgrnd2', 6, 22);

    // Coment sub-panel background (hidden by default)
    const comentProp = prop.Get('Coment');
    if (comentProp instanceof WzProperty) {
      const cbg = comentProp.Get('backgrnd');
      if (cbg instanceof WzCanvas) {
        const ws = loader.Load(cbg);
        if (ws) {
          this._comentBg = ws.NewSprite();
          this._comentBg.position.set(-ws.OriginX, -ws.OriginY);
          this._comentBg.visible = false;
          this._root.addChild(this._comentBg);
        }
      }
      this._btSave = this._mkBtn(comentProp, 'BtSave', () => this._onSave());
      this._btCancel = this._mkBtn(comentProp, 'BtCancel', () => this._onCancel());
    }

    // Write sub-panel background (hidden by default)
    const writeProp = prop.Get('Write');
    if (writeProp instanceof WzProperty) {
      const wbg = writeProp.Get('backgrnd');
      if (wbg instanceof WzCanvas) {
        const ws = loader.Load(wbg);
        if (ws) {
          this._writeBg = ws.NewSprite();
          this._writeBg.position.set(-ws.OriginX, -ws.OriginY);
          this._writeBg.visible = false;
          this._root.addChild(this._writeBg);
        }
      }
      // Write sub-panel also has BtSave/BtCancel — reuse same buttons
      if (!this._btSave) this._btSave = this._mkBtn(writeProp, 'BtSave', () => this._onSave());
      if (!this._btCancel) this._btCancel = this._mkBtn(writeProp, 'BtCancel', () => this._onCancel());
    }

    // Main action buttons
    this._btWrite = this._mkBtn(prop, 'BtWrite', () => this._enterWriteMode());
    this._btComment = this._mkBtn(prop, 'BtComment', () => this._enterCommentMode());
    this._btModify = this._mkBtn(prop, 'BtModify', () => this._onModify());
    this._btDelete = this._mkBtn(prop, 'BtDelete', () => this._onDelete());
    this._btList = this._mkBtn(prop, 'BtList', () => this._goBack());

    // Tab canvases
    const tabProp = prop.Get('Tab');
    if (tabProp instanceof WzProperty) {
      for (const state of ['enabled', 'disabled']) {
        const arr: Sprite[] = [];
        const stateProp = tabProp.Get(state);
        if (stateProp instanceof WzProperty) {
          for (let i = 0; i < 2; i++) {
            const canvas = stateProp.Get(String(i));
            if (canvas instanceof WzCanvas) {
              const ws = loader.Load(canvas);
              if (ws) {
                const s = ws.NewSprite();
                s.position.set(-ws.OriginX, -ws.OriginY);
                arr.push(s);
              }
            }
          }
        }
        if (state === 'enabled') this._tabEnabledSprites = arr;
        else this._tabDisabledSprites = arr;
      }
    }

    // Loading animation frames
    const loadingProp = prop.Get('Loading');
    if (loadingProp instanceof WzProperty) {
      for (let i = 0; i < 5; i++) {
        const canvas = loadingProp.Get(String(i));
        if (canvas instanceof WzCanvas) {
          const ws = loader.Load(canvas);
          if (ws) this._loadingAnim.push(ws);
        }
      }
    }

    // Close button
    this.createCloseButton(loader, ui, 5);

    this._rebuildButtons();
    this._rebuild();
  }

  private _buildFallback(): void {
    const g = new Graphics();
    g.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 245 / 255 });
    g.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
    this._root.addChild(g);
    this.createCloseButton(null, null, 1, PANEL_W);
    this._rebuild();
  }

  Open(): void {
    this.isVisible = true;
    this._mode = 'list';
    this._viewing = null;
    this._pageOffset = 0;
    this._rebuildButtons();
    this._rebuild();
    this.onLoadList?.(0);
  }

  SetList(notice: GuildBBSEntry | null, entries: GuildBBSEntry[]): void {
    this._notice = notice;
    this._entries = entries;
    this._viewing = null;
    this._mode = 'list';
    this._rebuildButtons();
    this._rebuild();
  }

  SetEntry(entryId: number, characterId: number, title: string, text: string, comments: GuildBBSComment[]): void {
    this._viewing = { entryId, characterId, title, text, comments };
    this._mode = 'view';
    this._rebuildButtons();
    this._rebuild();
  }

  ShowNotFound(): void {
    this._viewing = { entryId: -1, characterId: 0, title: '', text: '', comments: [] };
    this._mode = 'list';
    this._rebuildButtons();
    this._rebuild();
  }

  // ── WZ helpers ──────────────────────────────────────────────────────────

  private _addBgCanvas(prop: WzProperty, name: string, dx: number, dy: number): void {
    const c = prop.Get(name);
    if (!(c instanceof WzCanvas) || !this._loader) return;
    const ws = this._loader.Load(c);
    if (!ws) return;
    const s = ws.ToPixi();
    s.position.set(dx - ws.OriginX, dy - ws.OriginY);
    this._root.addChildAt(s, 0);
  }

  private _mkBtn(prop: WzProperty, name: string, onClick: () => void): Button | null {
    const sub = prop.Get(name);
    if (!(sub instanceof WzProperty) || !this._loader) return null;
    const b = Button.fromWz(this._loader, sub, '');
    b.onClick = onClick;
    b.container.position.set(0, 0);
    this._root.addChild(b.container);
    return b;
  }

  // ── Tab rendering ───────────────────────────────────────────────────────

  private _drawTabs(): void {
    // Two tabs: 0=Notice, 1=List (per Tab/0 and Tab/1)
    const tabNames = ['Notice', 'List'];
    for (let i = 0; i < tabNames.length; i++) {
      const isEnabled = i <= this._selectedTab;
      const sprites = isEnabled ? this._tabEnabledSprites : this._tabDisabledSprites;
      if (i < sprites.length) {
        const s = sprites[i];
        s.visible = true;
        if (!s.parent) this._root.addChild(s);
      } else {
        // Fallback tab text
        const t = new Text({ text: tabNames[i], style: _textWhite });
        t.position.set(10 + i * 31, isEnabled ? 25 : 27);
        t.eventMode = 'static';
        t.cursor = 'pointer';
        const tab = i;
        t.on('pointerdown', () => { this._selectedTab = tab; this._rebuild(); });
        this._dynamicChildren.push(t);
        this._root.addChild(t);
      }
    }
  }

  // ── Button visibility ───────────────────────────────────────────────────

  private _rebuildButtons(): void {
    if (!this._btWrite && !this._loader) return; // fallback mode

    const isList = this._mode === 'list';
    const isView = this._mode === 'view';

    if (this._btWrite) this._btWrite.container.visible = isList;
    if (this._btComment) this._btComment.container.visible = isView;
    if (this._btModify) this._btModify.container.visible = isView;
    if (this._btDelete) this._btDelete.container.visible = isView;
    if (this._btList) this._btList.container.visible = isView || this._mode === 'write' || this._mode === 'comment';

    // Sub-panel buttons only visible in write/comment mode
    if (this._btSave) this._btSave.container.visible = this._mode === 'write' || this._mode === 'comment';
    if (this._btCancel) this._btCancel.container.visible = this._mode === 'write' || this._mode === 'comment';
    if (this._comentBg) this._comentBg.visible = this._mode === 'comment';
    if (this._writeBg) this._writeBg.visible = this._mode === 'write';
  }

  // ── Dynamic content ─────────────────────────────────────────────────────

  private _clearDynamic(): void {
    for (const child of this._dynamicChildren) {
      child.removeFromParent();
    }
    this._dynamicChildren = [];
  }

  private _rebuild(): void {
    this._clearDynamic();

    if (this._loadingAnim.length > 0) {
      this._showLoading(true);
    }

    if (this._mode === 'view' && this._viewing) {
      this._drawViewEntry();
    } else if (this._mode === 'write') {
      this._drawWritePanel();
    } else if (this._mode === 'comment') {
      this._drawCommentPanel();
    } else {
      this._drawList();
    }
  }

  // ── List view ───────────────────────────────────────────────────────────

  private _drawList(): void {
    const listTop = 42;
    const listH = 270;

    // Notice entry
    if (this._notice) {
      const nt = new Text({ text: `[Notice] ${this._notice.title}`, style: _textNotice });
      nt.position.set(12, listTop);
      nt.eventMode = 'static';
      nt.cursor = 'pointer';
      const nid = this._notice.entryId;
      nt.on('pointerdown', () => this.onViewEntry?.(nid));
      this._dynamicChildren.push(nt);
      this._root.addChild(nt);
    }

    // Entry rows
    let y = listTop + (this._notice ? ROW_H + 4 : 0);
    const start = this._pageOffset;
    for (let i = start; i < this._entries.length && y < listTop + listH; i++) {
      const e = this._entries[i];
      const label = e.comments > 0
        ? `${e.title}  [${e.comments}]`
        : e.title;
      const row = new Text({ text: label, style: _textEntry });
      row.position.set(12, y);
      row.eventMode = 'static';
      row.cursor = 'pointer';
      const eid = e.entryId;
      row.on('pointerdown', () => this.onViewEntry?.(eid));
      this._dynamicChildren.push(row);
      this._root.addChild(row);
      y += ROW_H;
    }

    // Page info
    if (this._entries.length > MAX_ROWS) {
      const totalPages = Math.ceil(this._entries.length / MAX_ROWS);
      const curPage = Math.floor(this._pageOffset / MAX_ROWS) + 1;
      const pt = new Text({ text: `${curPage} / ${totalPages}`, style: _textDim });
      pt.position.set(12, listTop + listH + 4);
      this._dynamicChildren.push(pt);
      this._root.addChild(pt);
    }

    this._rebuildButtons();
  }

  // ── View entry ──────────────────────────────────────────────────────────

  private _drawViewEntry(): void {
    if (!this._viewing) return;
    const v = this._viewing;
    const listTop = 42;

    // Title
    const title = new Text({ text: v.title, style: _textGold });
    title.position.set(12, listTop);
    this._dynamicChildren.push(title);
    this._root.addChild(title);

    // Body
    const body = new Text({ text: v.text, style: _textBody });
    body.position.set(12, listTop + 18);
    this._dynamicChildren.push(body);
    this._root.addChild(body);

    // Separator
    const sepY = listTop + 18 + Math.max(16, body.height) + 6;
    const sep = new Graphics();
    sep.rect(12, sepY, PANEL_W - 24, 1).fill({ color: 0x3C4164 });
    this._dynamicChildren.push(sep);
    this._root.addChild(sep);

    // Comments
    let cy = sepY + 8;
    for (const c of v.comments) {
      const ct = new Text({ text: `- ${c.comment}`, style: _textEntry });
      ct.position.set(12, cy);
      this._dynamicChildren.push(ct);
      this._root.addChild(ct);
      cy += ROW_H;
    }

    if (v.comments.length === 0) {
      const noCom = new Text({ text: 'No comments.', style: _textDim });
      noCom.position.set(12, cy);
      this._dynamicChildren.push(noCom);
      this._root.addChild(noCom);
    }

    this._rebuildButtons();
  }

  // ── Write sub-panel ─────────────────────────────────────────────────────

  private _drawWritePanel(): void {
    // Placeholder text over the write background
    const label = new Text({ text: 'Enter your post title and content...', style: _textDim });
    label.position.set(12, 48);
    this._dynamicChildren.push(label);
    this._root.addChild(label);
    this._rebuildButtons();
  }

  // ── Comment sub-panel ───────────────────────────────────────────────────

  private _drawCommentPanel(): void {
    const label = new Text({ text: 'Enter your comment...', style: _textDim });
    label.position.set(12, 48);
    this._dynamicChildren.push(label);
    this._root.addChild(label);
    this._rebuildButtons();
  }

  // ── Loading animation ───────────────────────────────────────────────────

  private _showLoading(show: boolean): void {
    if (this._loadingAnim.length === 0) return;
    if (show) {
      this._loadingFrame = 0;
      this._loadingTimer = 0;
      if (!this._loadingSprite) {
        this._loadingSprite = this._loadingAnim[0].NewSprite();
        this._loadingSprite.position.set(
          (PANEL_W - (this._loadingAnim[0].Width || 69)) / 2,
          (PANEL_H - (this._loadingAnim[0].Height || 34)) / 2,
        );
      }
      this._loadingSprite.visible = true;
      if (!this._loadingSprite.parent) this._root.addChild(this._loadingSprite);
    } else {
      if (this._loadingSprite) this._loadingSprite.visible = false;
    }
  }

  update(dt: number): void {
    if (this._loadingSprite?.visible && this._loadingAnim.length > 1) {
      this._loadingTimer += dt;
      if (this._loadingTimer > 150) {
        this._loadingTimer = 0;
        this._loadingFrame = (this._loadingFrame + 1) % this._loadingAnim.length;
        const ws = this._loadingAnim[this._loadingFrame];
        const newSprite = ws.NewSprite();
        newSprite.position.copyFrom(this._loadingSprite.position);
        if (this._loadingSprite.parent) this._loadingSprite.parent.addChild(newSprite);
        this._loadingSprite.removeFromParent();
        this._loadingSprite.destroy();
        this._loadingSprite = newSprite;
      }
    }
  }

  // ── Button actions ──────────────────────────────────────────────────────

  private _enterWriteMode(): void {
    this._mode = 'write';
    this._rebuild();
    // Prompt for title + body via window.prompt (matching current code pattern)
    const title = window.prompt('Post title:') ?? '';
    if (title.length === 0) { this._mode = 'list'; this._rebuild(); return; }
    const text = window.prompt('Post text:') ?? '';
    this.onNewPost?.(title, text);
    this._mode = 'list';
    this._rebuild();
  }

  private _enterCommentMode(): void {
    if (!this._viewing) return;
    this._mode = 'comment';
    this._rebuild();
    const c = window.prompt('Comment:') ?? '';
    if (c.length > 0) this.onComment?.(this._viewing.entryId, c);
    this._mode = 'view';
    this._rebuild();
  }

  private _onModify(): void {
    if (!this._viewing) return;
    const title = window.prompt('New title:', this._viewing.title) ?? '';
    if (title.length === 0) return;
    const text = window.prompt('New text:', this._viewing.text) ?? '';
    this.onNewPost?.(title, text);
  }

  private _onDelete(): void {
    if (!this._viewing || this._viewing.entryId < 0) return;
    this.onDeleteEntry?.(this._viewing.entryId);
  }

  private _onSave(): void {
    // Reuse current mode's prompt
    if (this._mode === 'write') this._enterWriteMode();
    else if (this._mode === 'comment') this._enterCommentMode();
  }

  private _onCancel(): void {
    if (this._mode === 'comment' && this._viewing) {
      this._mode = 'view';
    } else {
      this._mode = 'list';
    }
    this._rebuildButtons();
    this._rebuild();
  }

  private _goBack(): void {
    if (this._mode === 'view' || this._mode === 'comment') {
      this._viewing = null;
      this._mode = 'list';
      this.onLoadList?.(this._pageOffset);
    } else if (this._mode === 'write') {
      this._mode = 'list';
    }
    this._rebuildButtons();
    this._rebuild();
  }

  // ── Event routing ───────────────────────────────────────────────────────

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;

    // Route to buttons in current mode
    if (down) {
      if (this._btWrite?.handleMouseButton(lx, ly, true)) return true;
      if (this._btComment?.handleMouseButton(lx, ly, true)) return true;
      if (this._btModify?.handleMouseButton(lx, ly, true)) return true;
      if (this._btDelete?.handleMouseButton(lx, ly, true)) return true;
      if (this._btList?.handleMouseButton(lx, ly, true)) return true;
      if (this._btSave?.handleMouseButton(lx, ly, true)) return true;
      if (this._btCancel?.handleMouseButton(lx, ly, true)) return true;
    } else {
      if (this._btWrite?.handleMouseButton(lx, ly, false)) return true;
      if (this._btComment?.handleMouseButton(lx, ly, false)) return true;
      if (this._btModify?.handleMouseButton(lx, ly, false)) return true;
      if (this._btDelete?.handleMouseButton(lx, ly, false)) return true;
      if (this._btList?.handleMouseButton(lx, ly, false)) return true;
      if (this._btSave?.handleMouseButton(lx, ly, false)) return true;
      if (this._btCancel?.handleMouseButton(lx, ly, false)) return true;
    }

    // Tab click hit-test
    if (down) {
      const tabW = 31;
      for (let i = 0; i < 2; i++) {
        const tx = 10 + i * tabW;
        if (lx >= tx && lx < tx + tabW && ly >= 25 && ly < 44) {
          this._selectedTab = i;
          this._rebuild();
          return true;
        }
      }
    }

    return lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }
}
