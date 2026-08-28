import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';
import { ScrollBar } from './ScrollBar.js';
import { CCtrlTab } from './CCtrlTab.js';
import { Button } from '../Button.js';

// ═══ CUIUserList (v95 IDB) ═══════════════════════════════════════════════════
// Window 264x382 (CreateUIWndPosSaved 264,382,key10). OnCreate @0x8DB080:
// backgrnd/backgrnd2 from UIWindow2.img/UserList/Main, tab control id 2001
// CreateCtrl_2(.., 8 /*type*/, 9 /*l*/, 25 /*t*/, 250 /*w*/, 19 /*h*/),
// scrollbar id 2000 at x=243 (SetScrollBar @0x8B7920, wheelRange 235),
// fonts FONT_DODOOMCHE_11_WHITE/BLACK/GRAY90 + Arial-11 customs
// (#D10000 blocked, #555555 online, #CBCBCB offline, #666666 location,
// #B5B5B5/#777777 grays — computed from the OnCreate color immediates).
//
// Per-tab buttons (LayoutMan::AddButton uol,id,0,0 — positions come from the
// WZ canvas origin nodes) with ids from the per-tab OnButtonClicked switches:
//   Friend 2010-2024 (CTabFriend::OnButtonClicked @0x8D9410)
//   Party 2200-2208 (@0x8D85B0), Guild 2030-2042 + 2070-2075 (@0x8D5310),
//   Alliance 2050-2060 + 2080+ (@0x8CCFC0), BlackList 2150/2151 (@0x8D0B50),
//   Expedition ids 12-22 (TabExpedition::InitState @0x7AFF90).
// List rendering per CUIUserList::Draw @0x8D0CD0 and the per-tab Draw fns.
// ═════════════════════════════════════════════════════════════════════════════

const PANEL_W = 264;
const PANEL_H = 382;
const ROW_H = 20;

// Tab strip: CreateCtrl_2(tab, this, 2001, 8, 9, 25, 250, 19, paramTab)
const TAB_X = 9;
const TAB_Y = 25;
const TAB_W = 250;
const TAB_CONTROL_ID = 2001;

// OG tab order (m_nCurTab): Friend(0), Party(1), Expedition(2), Guild(3),
// Alliance(4), BlackList(5).
const TAB_NAMES = ['Friend', 'Party', 'Exped', 'Guild', 'Union', 'Block'];
const TAB_INDICES = { FRIEND: 0, PARTY: 1, EXPEDITION: 2, GUILD: 3, ALLIANCE: 4, BLACKLIST: 5 };

// SetScrollBar @0x8B7920 — per-tab {y, h} + range base.
const SCROLLBAR_X = 243;
const SCROLLBAR_WHEEL_RANGE = 235;
const SB_CONFIG: Record<number, { y: number; h: number; base: number }> = {
  [TAB_INDICES.FRIEND]: { y: 115, h: 160, base: 0 },
  [TAB_INDICES.PARTY]: { y: 105, h: 225, base: 117 },
  [TAB_INDICES.EXPEDITION]: { y: 60, h: 225, base: 28 },
  [TAB_INDICES.GUILD]: { y: 100, h: 185, base: 105 },
  [TAB_INDICES.ALLIANCE]: { y: 100, h: 185, base: 105 },
  [TAB_INDICES.BLACKLIST]: { y: 60, h: 228, base: 27 },
};

// Fonts (OnCreate @0x8DB080).
const F_WHITE = '#FFFFFF';    // FONT_DODOOMCHE_11_WHITE
const F_BLACK = '#000000';    // FONT_DODOOMCHE_11_BLACK
const F_GRAY90 = '#909090';   // FONT_DODOOMCHE_11_GRAY90
const F_BLOCKED = '#D10000';  // Arial 11 custom
const F_ONLINE = '#555555';
const F_OFFLINE = '#CBCBCB';
const F_LOCATION = '#666666';
const SEL_FILL = 0x244768;    // CTabFriend::Draw selection fill 0xFF244768

const _styleWhite = new TextStyle({ fill: F_WHITE, fontSize: 11, fontFamily: 'Arial' });
const _styleBlack = new TextStyle({ fill: F_BLACK, fontSize: 11, fontFamily: 'Arial' });
const _styleGray90 = new TextStyle({ fill: F_GRAY90, fontSize: 11, fontFamily: 'Arial' });
const _styleBlocked = new TextStyle({ fill: F_BLOCKED, fontSize: 11, fontFamily: 'Arial' });
const _styleOnline = new TextStyle({ fill: F_ONLINE, fontSize: 11, fontFamily: 'Arial' });
const _styleOffline = new TextStyle({ fill: F_OFFLINE, fontSize: 11, fontFamily: 'Arial' });
const _styleLocation = new TextStyle({ fill: F_LOCATION, fontSize: 11, fontFamily: 'Arial' });

export interface UserEntry {
  charId: number;
  name: string;
  level: number;
  job: string;
  /** Friend-group name (OG GROUPITEM); defaults to "Friends". */
  group?: string;
  blocked?: boolean;
}

export interface PartyEntry { charId: number; name: string; level: number; job: string; isLeader: boolean; online?: boolean; sameMap?: boolean }
export interface GuildEntry { charId: number; name: string; rank: string; online: boolean; job?: string; level?: number }
export interface AllianceEntry { charId: number; name: string; level: number; job: number; grade: number; guildId: number; guildName?: string }

interface FriendGroup {
  name: string;
  folded: boolean;
  members: UserEntry[];
}

// CTabGuild grades (OnCreate @0x8C6F60): SP3296 Master, SP3297 Jr.Master,
// SP6297 Member (grades 2..4 all Member).
function gradeName(rankOrGrade: string | number | undefined): string {
  if (typeof rankOrGrade === 'number') {
    return rankOrGrade <= 1 ? 'Master' : rankOrGrade === 2 ? 'Jr.Master' : 'Member';
  }
  return typeof rankOrGrade === 'string' && rankOrGrade.length > 0 ? rankOrGrade : 'Member';
}

export class UserList extends GamePanel {
  private _wzBg: Sprite | null = null;
  private _scrollBar: ScrollBar;
  private _tab: CCtrlTab;

  // WZ assets
  private _loader: WzTextureLoader | null = null;
  private _uiWz: WzPackage | null = null;
  private _sheets: Record<string, (Sprite | null)[]> = {}; // Sheet1..Sheet9 -> [0..n]
  private _lvDigits: (Sprite | null)[] = [];
  private _lineSprite: Sprite | null = null;
  private _foldOpen: Sprite | null = null;
  private _foldClose: Sprite | null = null;
  private _friendIcons: (Sprite | null)[] = [];
  private _friendTitle: Sprite | null = null;
  /** Party leader crown: Main/Party/icon0/1 (17x16) sameMap leader; icon0/0
   *  (13x13) elseWhere leader. CTabParty::Draw @0x8C4A30 draws it at (11,row+1). */
  private _partyCrown: Sprite | null = null;
  /** Party tab header plate: Main/Party/partyOn (230x25, origin 0,0) — the
   *  fixed title row at the top of the party list (CTabParty::Draw `_214`). */
  private _partyHeader: Sprite | null = null;
  private _guildBase: Sprite | null = null;
  private _guildMark: Sprite | null = null;
  private _guildSectionOn: Sprite | null = null;
  private _guildSectionOff: Sprite | null = null;
  private _unionBase: Sprite | null = null;
  private _unionNamePlate: Sprite | null = null;
  private _expedTable: Sprite | null = null;
  private _expedBase: Sprite | null = null;
  private _blackListBase: Sprite | null = null;

  // Per-tab Button arrays keyed by action name (OG ids in comments).
  private _tabButtons = new Map<number, { btn: Button; id: number; needsSelection?: boolean }[]>();

  private _rowsLayer = new Container();
  private _headerLayer = new Container();

  private _groups: FriendGroup[] = [];
  private _party: PartyEntry[] = [];
  private _guild: GuildEntry[] = [];
  private _guildName = '';
  private _guildNotice = '';
  private _blackList: string[] = [];
  private _alliance: AllianceEntry[] = [];
  private _allianceName = '';
  private _expeditionMembers: { subPartyIdx: number; charId: number; name: string; level: number; job: number }[] = [];
  private _expeditionSubParties: Map<number, { charId: number; name: string; level: number; job: number }[]> = new Map();

  private _activeTab = 0;
  private _curCID = -1;        // OG m_dwCurCID selection model
  private _curBlock = -1;
  private _scrollOffset = 0;
  private _onlineOnly = false;
  private _locationText: Text;
  private _countText: Text;

  // collapsed-section state for guild/alliance (OG m_bSectionCollapsed[n])
  private _sectionFolded = [false, false];

  // Callbacks (GameStage wiring contract kept verbatim)
  onPartyInvite: ((name: string) => void) | null = null;
  onPartyKick: ((charId: number) => void) | null = null;
  onPartyCreate: (() => void) | null = null;
  onPartyLeave: (() => void) | null = null;
  /** BtSearch (id 2208) - CWvsContext::UI_Toggle(21) party search. */
  onPartySearch: (() => void) | null = null;
  /** BtHP (id 2207) - CTabParty::ToggleShowHP. */
  onPartyHpToggle: (() => void) | null = null;
  /** BtChat (id 2205) - CTabParty::OnChat (party chat focus). */
  onPartyChat: ((name: string) => void) | null = null;
  onGuildLeave: (() => void) | null = null;
  onGuildBoard: (() => void) | null = null;
  onGuildInvite: ((name: string) => void) | null = null;
  onGuildKick: ((charId: number, name: string) => void) | null = null;
  /** Legacy direct rank-set path kept for GameStage compat (CTabGuild has no
   *  such button in v95 — grade changes go through onGuildGradeChange). */
  onGuildAdmin: ((charId: number, name: string) => void) | null = null;
  onGuildExpel: ((charId: number, name: string) => void) | null = null;
  onGuildLevel: ((charId: number, level: number) => void) | null = null;
  /** BtGradeUp/BtGradeDown (ids 2033/2034) - CTabGuild::OnGradeChange. */
  onGuildGradeChange: ((charId: number, up: boolean) => void) | null = null;
  /** Btnotice (id 2037) - CTabGuild::OnSetNotice. */
  onGuildSetNotice: ((text: string) => void) | null = null;
  /** BtInfo (id 2039) - CUIUserList::ToggleGuildInfo. */
  onGuildInfoToggle: (() => void) | null = null;
  /** BtWhere (id 2035) - CTabGuild::OnFindUser. */
  onGuildFindUser: ((name: string) => void) | null = null;
  onFriendAdd: ((name: string) => void) | null = null;
  onFriendAddGroup: ((name: string) => void) | null = null;
  onFriendDelete: ((charId: number) => void) | null = null;
  // OG: CTabFriend::OnWhisper (0x8D4CC0)
  onFriendWhisper: ((name: string) => void) | null = null;
  /** BtChat (id 2019) - CTabFriend::OnChat. */
  onFriendChat: ((name: string) => void) | null = null;
  // OG: CTabFriend::OnGroupWhisper (0x8B7250)
  onGroupWhisper: ((groupName: string) => void) | null = null;
  // OG: CTabFriend::ChangeBlockOption (0x8B7280)
  onFriendBlock: ((charId: number, block: boolean) => void) | null = null;
  // OG: CTabFriend::OnToggleView (0x8B9DC0)
  onToggleOnlineOnly: ((onlineOnly: boolean) => void) | null = null;
  // OG: CTabFriend::OnFindFriendView (0x8B7270)
  onFindFriend: (() => void) | null = null;
  /** BtInfo (id 2015) - CTabFriend::OnAccontMoreInfoView @0x8B7260 =
   *  CWvsContext::UI_Open(40) AccountMoreInfo dialog. */
  onAccountMoreInfo: (() => void) | null = null;
  /** BtMessage (id 2021) - CTabFriend::OnSendMemo. */
  onFriendMemo: ((name: string) => void) | null = null;
  getInviteName: () => string = () => '';
  getGuildName: () => string = () => '';
  onGuildCreate: ((name: string) => void) | null = null;
  getBlockName: () => string = () => '';
  onBlockAdd: ((name: string) => void) | null = null;
  onBlockDelete: ((name: string) => void) | null = null;
  onAllianceWithdraw: (() => void) | null = null;
  onAllianceInvite: ((name: string) => void) | null = null;
  onAllianceKick: ((guildId: number, charId: number) => void) | null = null;
  onAllianceChangeMaster: ((charId: number) => void) | null = null;
  onAllianceGradeChange: ((charId: number, up: boolean) => void) | null = null;
  onAllianceSetNotice: ((text: string) => void) | null = null;
  onAllianceWhisper: ((name: string) => void) | null = null;
  onAlliancePartyInvite: ((charId: number, name: string) => void) | null = null;
  /** BtInfo union (id 2057) - ToggleAllianceGrade. */
  onAllianceInfoToggle: (() => void) | null = null;
  getAllianceInviteName: () => string = () => '';
  getAllianceNotice: () => string = () => '';
  onExpeditionCreate: (() => void) | null = null;
  onExpeditionInvite: ((name: string) => void) | null = null;
  onExpeditionKick: ((charId: number) => void) | null = null;
  onExpeditionWithdraw: (() => void) | null = null;
  onExpeditionChangeBoss: ((charId: number) => void) | null = null;
  getExpeditionInviteName: () => string = () => '';

  constructor(loader?: WzTextureLoader, uiWz?: WzPackage | null) {
    super();
    this._root.visible = false;
    this._root.x = 300;
    this._root.y = 100;
    this._loader = loader ?? null;
    this._uiWz = uiWz ?? null;
    this._root.addChild(this._headerLayer);
    this._root.addChild(this._rowsLayer);

    // OG: CCtrlTab id 2001 type 8 at (9,25) 250x19, nTabSpace=1.
    this._tab = new CCtrlTab(TAB_CONTROL_ID, TAB_X, TAB_Y, TAB_W, { type: 8, customHeight: 19, tabSpace: 1 });
    this._tab.setParent({ onTabChanged: (tab) => this._onTabChanged(tab) });
    for (const name of TAB_NAMES) this._tab.addItem(name);
    this._root.addChild(this._tab.container);

    this._locationText = new Text({ text: '', style: _styleLocation });
    this._locationText.position.set(10, 285);
    this._headerLayer.addChild(this._locationText);

    this._countText = new Text({ text: '', style: _styleBlack });
    this._countText.position.set(0, 68);
    this._headerLayer.addChild(this._countText);

    // OG: scrollbar id 2000, x=243, wheelRange 235 (config per tab).
    const cfg = SB_CONFIG[this._activeTab];
    this._scrollBar = new ScrollBar(SCROLLBAR_X, cfg.y, cfg.h, (pos) => {
      this._scrollOffset = pos;
      this._rebuildRows();
    });
    this._root.addChild(this._scrollBar.container);

    if (loader && uiWz) this.initWzAssets(loader, uiWz);
    else this._rebuildButtons();
  }

  /** OG OnCreate asset pass — callable once UI.wz finishes loading. */
  initWzAssets(loader: WzTextureLoader, uiWz: WzPackage | null): void {
    this._loader = loader;
    this._uiWz = uiWz; // `_mkBtn` resolves WZ button subtrees through this field
    const ui = uiWz;
    const main = ui?.GetItem('UIWindow2.img/UserList/Main');
    if (!(main instanceof WzProperty)) { this._rebuildButtons(); return; }

    const bgNode = main.Get('backgrnd');
    if (bgNode instanceof WzCanvas) {
      const ws = loader.Load(bgNode);
      if (ws) {
        const s = ws.ToPixi();
        s.position.set(-ws.OriginX, -ws.OriginY);
        this._wzBg?.removeFromParent();
        this._wzBg = s;
        this._root.addChildAt(s, 0);
      }
    }
    // backgrnd2 (252x354, origin -6,-22 → top-left at (6,22)). ToPixi anchors
    // at the origin, so position (0,0) places the origin point at the panel
    // corner and the canvas top-left lands at (-OriginX,-OriginY)=(6,22).
    const bg2 = main.Get('backgrnd2');
    if (bg2 instanceof WzCanvas) {
      const ws = loader.Load(bg2);
      if (ws) {
        const s = ws.ToPixi();
        s.position.set(0, 0);
        this._root.addChildAt(s, 1);
      }
    }

    // Tab canvases: enabled = selected look, disabled = normal look (per the
    // OnCreate property names pPropSelectedList/pPropNormalList).
    this._loadTabCanvases(main.Get('Tab'), loader);

    // Row plates Sheet1..Sheet9.
    for (let i = 1; i <= 9; i++) {
      const sheetProp = ui!.GetItem(`UIWindow2.img/UserList/Sheet${i}`);
      if (!(sheetProp instanceof WzProperty)) continue;
      const arr: (Sprite | null)[] = [];
      for (const key of Object.keys(sheetProp.Items)) {
        const c = sheetProp.Get(key);
        const ws = c instanceof WzCanvas ? loader.Load(c) : null;
        arr.push(ws ? ws.NewSprite() : null);
      }
      this._sheets[`Sheet${i}`] = arr;
    }

    // Level digit glyphs (lvNumber/enabled 0..9).
    const lvProp = ui!.GetItem('UIWindow2.img/UserList/lvNumber/enabled');
    if (lvProp instanceof WzProperty) {
      for (let d = 0; d <= 9; d++) {
        const c = lvProp.Get(`${d}`);
        const ws = c instanceof WzCanvas ? loader.Load(c) : null;
        this._lvDigits.push(ws ? ws.NewSprite() : null);
      }
    }

    const lineNode = ui!.GetItem('UIWindow2.img/UserList/line');
    if (lineNode instanceof WzCanvas) {
      const ws = loader.Load(lineNode);
      this._lineSprite = ws ? ws.NewSprite() : null;
    }

    // Fold icons for friend group headers / guild sections.
    const foldOpenNode = ui!.GetItem('UIWindow2.img/UserList/BtSheetIOpen/normal');
    if (foldOpenNode instanceof WzProperty) {
      const canvas = foldOpenNode.Get('0');
      if (canvas instanceof WzCanvas) {
        const ws = loader.Load(canvas);
        this._foldOpen = ws ? ws.NewSprite() : null;
      }
    }
    const foldCloseNode = ui!.GetItem('UIWindow2.img/UserList/BtSheetIClose/normal');
    if (foldCloseNode instanceof WzProperty) {
      const canvas = foldCloseNode.Get('0');
      if (canvas instanceof WzCanvas) {
        const ws = loader.Load(canvas);
        this._foldClose = ws ? ws.NewSprite() : null;
      }
    }

    // Friend tab icons (icon0 same-channel, icon1 blocked, icon2-5 alternate states).
    const friendProp = main.Get('Friend');
    if (friendProp instanceof WzProperty) {
      for (let i = 0; i <= 5; i++) {
        const c = friendProp.Get(`icon${i}`);
        const ws = c instanceof WzCanvas ? loader.Load(c) : null;
        this._friendIcons.push(ws ? ws.NewSprite() : null);
      }
      // Friend/title: 244x25 header plate bitmap (origin -10,-60).
      this._friendTitle = this._plate(friendProp.Get('title'));
    }

    // Party leader crown: Main/Party/icon0/1 (17x16, origin 0,0) — CTabParty::Draw
    // draws it for the boss at (11, rowY+1); icon0/0 (13x13) is the elseWhere variant.
    const partyProp = main.Get('Party');
    if (partyProp instanceof WzProperty) {
      this._partyHeader = this._plate(partyProp.Get('partyOn'));
      const icon0 = partyProp.Get('icon0');
      if (icon0 instanceof WzProperty) {
        const c1 = icon0.Get('1');
        if (c1 instanceof WzCanvas) {
          const ws = loader.Load(c1);
          this._partyCrown = ws ? ws.NewSprite() : null;
        }
      }
    }

    // Guild / Union header plates.
    const guildProp = main.Get('Guild');
    if (guildProp instanceof WzProperty) {
      this._guildBase = this._plate(guildProp.Get('base'));
      this._guildSectionOn = this._plate(guildProp.Get('guildOn'));
      this._guildSectionOff = this._plate(guildProp.Get('guildOff'));
      // Guild/guildmark: 20x20 guild mark icon (origin 0,0).
      const markC = guildProp.Get('guildmark');
      if (markC instanceof WzCanvas) {
        const ws = loader.Load(markC);
        this._guildMark = ws ? ws.NewSprite() : null;
      }
    }

    // BlackList/base: 230x25 row plate (origin -10,-60).
    const blProp = main.Get('BlackList');
    if (blProp instanceof WzProperty) {
      this._blackListBase = this._plate(blProp.Get('base'));
    }
    const unionProp = main.Get('Union');
    if (unionProp instanceof WzProperty) {
      this._unionBase = this._plate(unionProp.Get('base'));
      this._unionNamePlate = this._plate(unionProp.Get('guildName'));
    }
    const expedProp = main.Get('Expedition');
    if (expedProp instanceof WzProperty) {
      this._expedBase = this._plate(expedProp.Get('base'));
      this._expedTable = this._plate(expedProp.Get('table'));
    }

    this._rebuildButtons();
    this._rebuild();
  }

  private _plate(node: unknown): Sprite | null {
    if (!(node instanceof WzCanvas) || !this._loader) return null;
    const ws = this._loader.Load(node);
    if (!ws) return null;
    const s = ws.NewSprite();
    s.position.set(-ws.OriginX, -ws.OriginY);
    return s;
  }

  private _spriteAt(ws: WzSprite, x: number, y: number): Sprite {
    const s = ws.NewSprite();
    s.position.set(x - ws.OriginX, y - ws.OriginY);
    return s;
  }

  private _loadTabCanvases(tabProp: unknown, loader: WzTextureLoader): void {
    if (!(tabProp instanceof WzProperty)) return;
    const enabled = tabProp.Get('enabled');
    const disabled = tabProp.Get('disabled');
    const enSprites: (Sprite | null)[] = [];
    const disSprites: (Sprite | null)[] = [];
    for (let i = 0; i < 6; i++) {
      const en = enabled instanceof WzProperty ? enabled.Get(`${i}`) : null;
      const dis = disabled instanceof WzProperty ? disabled.Get(`${i}`) : null;
      const enWs = en instanceof WzCanvas ? loader.Load(en) : null;
      const disWs = dis instanceof WzCanvas ? loader.Load(dis) : null;
      enSprites.push(enWs ? enWs.NewSprite() : null);
      disSprites.push(disWs ? disWs.NewSprite() : null);
    }
    this._tab.setCanvasItems(enSprites, disSprites);
  }

  // ── data setters (GameStage contract unchanged) ──

  /** Read-only view for GameStage helpers (rank lookups etc.). */
  get guildMembers(): GuildEntry[] { return this._guild; }

  setUsers(users: UserEntry[]): void {
    this._usersToGroups(users);
    this._curCID = -1;
    this._resetInfo();
  }

  private _usersToGroups(users: UserEntry[]): void {
    const map = new Map<string, FriendGroup>();
    for (const u of users) {
      const gname = u.group ?? 'Friends';
      let g = map.get(gname);
      if (!g) { g = { name: gname, folded: false, members: [] }; map.set(gname, g); }
      g.members.push(u);
    }
    this._groups = [...map.values()];
  }

  updateFriendStatus(charId: number, online: boolean): void {
    for (const g of this._groups) {
      const e = g.members.find((u) => u.charId === charId);
      if (e) { e.job = online ? e.job : e.job; e.blocked = e.blocked; }
    }
    this._rebuildRows();
  }

  updateFriendEntry(charId: number, channel: number): void {
    void channel;
    this._rebuildRows();
  }

  updateGuildMemberOnline(charId: number, online: boolean): void {
    const entry = this._guild.find((m) => m.charId === charId);
    if (entry) { entry.online = online; this._rebuildRows(); }
  }

  setParty(party: PartyEntry[]): void { this._party = party; this._curCID = -1; this._resetInfo(); }

  setPartyBoss(bossCharId: number): void {
    for (const m of this._party) m.isLeader = m.charId === bossCharId;
    this._rebuildRows();
  }

  updatePartyMemberStat(charId: number, level: number, job: string): void {
    const entry = this._party.find((m) => m.charId === charId);
    if (entry) { entry.level = level; entry.job = job; this._rebuildRows(); }
  }

  setGuild(name: string, members: GuildEntry[]): void {
    this._guildName = name;
    this._guild = members;
    this._curCID = -1;
    this._resetInfo();
  }

  addGuildMember(entry: GuildEntry): void {
    if (!this._guild.some((m) => m.charId === entry.charId)) {
      this._guild.push(entry);
      this._rebuildRows();
    }
  }

  removeGuildMember(charId: number): void {
    const idx = this._guild.findIndex((m) => m.charId === charId);
    if (idx >= 0) { this._guild.splice(idx, 1); this._rebuildRows(); }
  }

  get onlineFriendIds(): Map<number, string> {
    const out = new Map<number, string>();
    for (const g of this._groups) for (const u of g.members) out.set(u.charId, u.name);
    return out;
  }

  /** Name of the currently selected friend (null when none). */
  get friendNameOfSelected(): string | null {
    return this._findFriend(this._curCID)?.name ?? null;
  }

  get guildMemberIds(): Map<number, string> {
    return new Map(this._guild.filter((m) => m.online).map((m) => [m.charId, m.name]));
  }

  SetBlackList(names: string[]): void { this._blackList = names; this._curBlock = -1; this._resetInfo(); }

  /** OG SetFriendViewItem — "My Location - %s" line under the friend list. */
  setFriendLocation(location: string): void {
    this._locationText.text = location ? `My Location - ${location}` : '';
  }

  setGuildNotice(text: string): void { this._guildNotice = text; this._rebuildRows(); }

  setAlliance(name: string, members: AllianceEntry[]): void {
    this._allianceName = name;
    this._alliance = members;
    // One collapsed-state slot per member guild (CTabGuildAlliance sections).
    const guildCount = new Set(members.map((m) => m.guildName || `Guild ${m.guildId}`)).size;
    while (this._sectionFolded.length < guildCount) this._sectionFolded.push(false);
    this._curCID = -1;
    this._resetInfo();
  }

  get allianceMemberIds(): Map<number, string> { return new Map(this._alliance.map((m) => [m.charId, m.name])); }

  setExpedition(members: { subPartyIdx: number; charId: number; name: string; level: number; job: number }[]): void {
    this._expeditionMembers = members;
    this._expeditionSubParties.clear();
    for (const m of members) {
      let arr = this._expeditionSubParties.get(m.subPartyIdx);
      if (!arr) { arr = []; this._expeditionSubParties.set(m.subPartyIdx, arr); }
      arr.push({ charId: m.charId, name: m.name, level: m.level, job: m.job });
    }
    this._curCID = -1;
    this._resetInfo();
  }

  // ── ResetInfo @0x8DBF60 ──
  private _resetInfo(): void {
    this._scrollOffset = 0;
    this._setScrollBar();
    this._syncButtons();
    this._rebuild();
  }

  private _viewItemCount(): number {
    switch (this._activeTab) {
      case TAB_INDICES.FRIEND: return this._groups.reduce((n, g) => n + 1 + Math.max(1, Math.ceil(g.members.length / 2)), 0);
      case TAB_INDICES.PARTY: return this._party.length;
      case TAB_INDICES.GUILD: return this._guild.filter((m) => m.online).length + this._guild.filter((m) => !m.online).length + 2;
      case TAB_INDICES.ALLIANCE: return this._alliance.length;
      case TAB_INDICES.BLACKLIST: return this._blackList.length;
      case TAB_INDICES.EXPEDITION: return this._expeditionMembers.length;
      default: return 0;
    }
  }

  // OG formula: raw = base + 20*viewItems − h; range = raw <= 0 ? 0 : raw/20 + 2.
  private _setScrollBar(): void {
    const cfg = SB_CONFIG[this._activeTab];
    if (!cfg) { this._scrollBar.visible = false; return; }
    this._scrollBar.visible = true;
    this._scrollBar.container.position.set(SCROLLBAR_X, cfg.y);
    const count = this._viewItemCount();
    const raw = cfg.base + ROW_H * count - cfg.h;
    const range = raw <= 0 ? 0 : Math.floor(raw / ROW_H) + 2;
    this._scrollBar.setRange(range + 1);
    if (range <= 0) this._scrollOffset = 0;
  }

  private _onTabChanged(tab: number): void {
    this._activeTab = tab;
    this._curCID = -1;
    this._curBlock = -1;
    this._resetInfo();
  }

  // ═══ Per-tab WZ buttons (SetButton @0x8B76E0 show/hide model) ═══

  private _mkBtn(subtreePaths: string[], id: number, fallbackLabel: string, onClick: () => void, needsSelection = false): { btn: Button; id: number; needsSelection: boolean } {
    let prop: WzProperty | null = null;
    for (const p of subtreePaths) {
      const node = this._uiWz?.GetItem(p);
      if (node instanceof WzProperty) { prop = node; break; }
    }
    const btn = prop && this._loader
      ? Button.fromWz(this._loader, prop, fallbackLabel)
      : new Button(fallbackLabel);
    btn.onClick = onClick;
    if (prop) {
      // OG AddButton(uol, id, 0, 0): the canvas origin encodes the position.
      btn.container.position.set(0, 0);
    } else {
      // No WZ: lay fallback buttons out along the bottom edge of the tab.
      const shown = this._fallbackBtnCount[this._activeTab] ?? 0;
      this._fallbackBtnCount[this._activeTab] = shown + 1;
      btn.width = Math.max(40, fallbackLabel.length * 7 + 12);
      btn.height = 18;
      btn.container.position.set(8 + shown * 52, PANEL_H - 28);
    }
    btn.container.visible = false;
    this._root.addChild(btn.container);
    return { btn, id, needsSelection };
  }

  /** Per-tab running count for the no-WZ fallback layout. */
  private _fallbackBtnCount: Record<number, number> = {};

  /** Build every tab's buttons once assets resolve (CTab*::CreateButton). */
  private _rebuildButtons(): void {
    for (const arr of this._tabButtons.values()) for (const b of arr) b.btn.container.removeFromParent();
    this._tabButtons.clear();
    this._fallbackBtnCount = {};
    const U2 = 'UIWindow2.img/UserList/Main/';
    const U1 = 'UIWindow.img/UserList/';

    const selName = (): string | null => this._selectedEntry();

    // ── Friend (15 buttons, ids 2010..2024; BtMate id 2023 hidden forever) ──
    // CTabFriend::CreateButton @0x8BC7C0: BtInfo (2015) at (208,285) and BtFind
    // (2016) at (10,350) use EXPLICIT positions (UIWindow.img, not UIWindow2.img);
    // buttons 2017..2024 are created with SetEnable(0).
    const friendButtons = [
      this._mkBtn([`${U2}Friend/BtAddFriend`], 2010, 'Add', () => { const n = this.getInviteName(); if (n) this.onFriendAdd?.(n); }),
      this._mkBtn([`${U2}Friend/BtAddGroup`], 2011, 'Grp', () => { const n = this.getInviteName(); if (n) this.onFriendAddGroup?.(n); }),
      this._mkBtn([`${U2}Friend/BtGroupWhisper`], 2012, 'GWhis', () => {
        const g = this._groups.find((gg) => gg.members.some((m) => m.charId === this._curCID));
        this.onGroupWhisper?.(g?.name ?? 'all');
      }),
      this._mkBtn([`${U2}Friend/TapShowOnline`], 2013, 'On', () => { this._onlineOnly = true; this.onToggleOnlineOnly?.(true); this._rebuildRows(); }),
      this._mkBtn([`${U2}Friend/TapShowAll`], 2014, 'All', () => { this._onlineOnly = false; this.onToggleOnlineOnly?.(false); this._rebuildRows(); }),
      this._mkBtn([`${U1}Friend/BtInfo`], 2015, 'Info', () => this.onAccountMoreInfo?.(), true),
      this._mkBtn([`${U1}Friend/BtFind`], 2016, 'Find', () => this.onFindFriend?.()),
      this._mkBtn([`${U2}Friend/BtMod`], 2017, 'Mod', () => {
        // CTabFriend::OnModify @0x8D90E0: with a friend selected, re-add it
        // (regroup via the Add wire keyed by name); with only a current group,
        // rename it. We fold both into the regroup path (friend selected here).
        const f = this._findFriend(this._curCID);
        if (f) { const n = this.getInviteName(); if (n) this.onFriendAddGroup?.(n); }
      }, true),
      this._mkBtn([`${U2}Friend/BtDelete`], 2018, 'Del', () => { if (this._curCID >= 0) this.onFriendDelete?.(this._curCID); }, true),
      this._mkBtn([`${U2}Friend/BtChat`], 2019, 'Chat', () => { const n = selName(); if (n) this.onFriendChat?.(n); }, true),
      this._mkBtn([`${U2}Friend/BtWhisper`], 2020, 'Whis', () => { const n = selName(); if (n) this.onFriendWhisper?.(n); }, true),
      this._mkBtn([`${U2}Friend/BtMessage`], 2021, 'Memo', () => { const n = selName(); if (n) this.onFriendMemo?.(n); }, true),
      this._mkBtn([`${U2}Friend/BtParty`], 2022, 'Pty', () => { const n = selName(); if (n) this.onPartyInvite?.(n); }, true),
      this._mkBtn([`${U2}Friend/BtMate`], 2023, '', () => { /* OG: created then permanently hidden */ }),
      this._mkBtn([`${U2}Friend/BtBlock`], 2024, 'Blk', () => {
        const m = this._findFriend(this._curCID);
        if (m) this.onFriendBlock?.(m.charId, !m.blocked);
      }, true),
    ];
    this._setExplicitPos(friendButtons, 2015, 208, 285);
    this._setExplicitPos(friendButtons, 2016, 10, 350);
    this._tabButtons.set(TAB_INDICES.FRIEND, friendButtons);

    // ── Party (9 buttons, ids 2200..2208) ──
    this._tabButtons.set(TAB_INDICES.PARTY, [
      this._mkBtn([`${U2}Party/BtCreate`], 2200, 'New', () => this.onPartyCreate?.()),
      this._mkBtn([`${U2}Party/BtInvite`], 2201, 'Invt', () => { const n = this.getInviteName(); if (n) this.onPartyInvite?.(n); }),
      this._mkBtn([`${U2}Party/BtKick`], 2202, 'Kick', () => { if (this._curCID >= 0) this.onPartyKick?.(this._curCID); }, true),
      this._mkBtn([`${U2}Party/BtWithdraw`], 2203, 'Leav', () => this.onPartyLeave?.()),
      this._mkBtn([`${U2}Party/BtWhisper`], 2204, 'Whis', () => { const n = selName(); if (n) this.onFriendWhisper?.(n); }, true),
      this._mkBtn([`${U2}Party/BtChat`], 2205, 'Chat', () => { const n = selName(); if (n) this.onPartyChat?.(n); }, true),
      this._mkBtn([`${U2}Party/BtChangeBoss`], 2206, 'Boss', () => { if (this._curCID >= 0) this.onPartyChangeBossInternal(); }, true),
      this._mkBtn([`${U2}Party/BtHP`], 2207, 'HP', () => this.onPartyHpToggle?.()),
      this._mkBtn([`${U2}Party/BtSearch`], 2208, 'Srch', () => this.onPartySearch?.()),
    ]);

    // ── Guild (13 buttons: ids 2030-2042 + section 2070-2075) ──
    const guildButtons = [
      this._mkBtn([`${U2}Guild/BtInvite`], 2030, 'Invt', () => { const n = this.getInviteName(); if (n) this.onGuildInvite?.(n); }),
      this._mkBtn([`${U2}Guild/BtKick`], 2031, 'Kick', () => {
        const m = this._guild.find((g) => g.charId === this._curCID);
        if (m) this.onGuildKick?.(m.charId, m.name);
      }, true),
      this._mkBtn([`${U2}Guild/BtWithdraw`], 2032, 'Leav', () => this.onGuildLeave?.()),
      this._mkBtn([`${U2}Guild/BtGradeUp`], 2033, 'G+', () => { if (this._curCID >= 0) this.onGuildGradeChange?.(this._curCID, true); }, true),
      this._mkBtn([`${U2}Guild/BtGradeDown`], 2034, 'G-', () => { if (this._curCID >= 0) this.onGuildGradeChange?.(this._curCID, false); }, true),
      this._mkBtn([`${U2}Guild/BtWhere`], 2035, 'Wher', () => {
        const m = this._guild.find((g) => g.charId === this._curCID);
        if (m) this.onGuildFindUser?.(m.name);
      }, true),
      this._mkBtn([`${U2}Guild/BtWhisper`], 2036, 'Whis', () => { const n = selName(); if (n) this.onFriendWhisper?.(n); }, true),
      // Btnotice id 2037 — explicit (194,79) position from CTabGuild::CreateButton.
      this._mkBtn([`${U1}Guild/GuildInfo/Btnotice`], 2037, 'Noti', () => {
        const t = window.prompt('Guild notice (max 100 chars):') ?? '';
        if (t) this.onGuildSetNotice?.(t);
      }),
      this._mkBtn([`${U2}Guild/BtChat`], 2038, 'Chat', () => { const n = selName(); if (n) this.onFriendWhisper?.(n); }, true),
      this._mkBtn([`${U2}Guild/BtInfo`], 2039, 'Info', () => this.onGuildInfoToggle?.()),
      this._mkBtn([`${U2}Guild/BtBoard`], 2041, 'Brd', () => this.onGuildBoard?.()),
      // BtPartyInvite id 2040.
      this._mkBtn([`${U2}Guild/BtPartyInvite`], 2040, 'Pty', () => { const n = selName(); if (n) this.onPartyInvite?.(n); }, true),
      // BtGuildBBS id 2042 — explicit (225,340), UOL StringPool 0xEC5.
      this._mkBtn([`${U1}Guild/GuildInfo/BtGuildBBS`], 2042, 'BBS', () => this.onGuildBoard?.()),
    ];
    this._setExplicitPos(guildButtons, 2037, 194, 79);
    this._setExplicitPos(guildButtons, 2042, 225, 340);
    this._tabButtons.set(TAB_INDICES.GUILD, guildButtons);

    // ── Alliance/Union (11 buttons, ids 2050..2060) ──
    this._tabButtons.set(TAB_INDICES.ALLIANCE, [
      this._mkBtn([`${U2}Union/BtInvite`], 2050, 'Invt', () => { const n = this.getAllianceInviteName(); if (n) this.onAllianceInvite?.(n); }),
      this._mkBtn([`${U2}Union/BtWithdraw`], 2052, 'Leav', () => this.onAllianceWithdraw?.()),
      this._mkBtn([`${U2}Union/BtKick`], 2051, 'Kick', () => {
        const m = this._alliance.find((a) => a.charId === this._curCID);
        if (m) this.onAllianceKick?.(m.guildId, m.charId);
      }, true),
      this._mkBtn([`${U2}Union/BtGradeUp`], 2053, 'G+', () => { if (this._curCID >= 0) this.onAllianceGradeChange?.(this._curCID, true); }, true),
      this._mkBtn([`${U2}Union/BtGradeDown`], 2054, 'G-', () => { if (this._curCID >= 0) this.onAllianceGradeChange?.(this._curCID, false); }, true),
      this._mkBtn([`${U2}Union/BtChange`], 2060, 'Mstr', () => { if (this._curCID >= 0) this.onAllianceChangeMaster?.(this._curCID); }, true),
      this._mkBtn([`${U2}Union/BtChat`], 2056, 'Chat', () => { const n = selName(); if (n) this.onFriendWhisper?.(n); }, true),
      this._mkBtn([`${U2}Union/BtInfo`], 2057, 'Info', () => this.onAllianceInfoToggle?.()),
      this._mkBtn([`${U2}Union/BtWhisper`], 2055, 'Whis', () => { const n = selName(); if (n) this.onAllianceWhisper?.(n); }, true),
      this._mkBtn([`${U2}Union/Btnotice`], 2059, 'Noti', () => {
        const t = this.getAllianceNotice();
        if (t) this.onAllianceSetNotice?.(t);
      }),
      this._mkBtn([`${U2}Union/BtPartyInvite`], 2058, 'Pty', () => {
        const m = this._alliance.find((a) => a.charId === this._curCID);
        if (m) this.onAlliancePartyInvite?.(m.charId, m.name);
      }, true),
    ]);

    // ── BlackList (2 buttons, ids 2150/2151) ──
    this._tabButtons.set(TAB_INDICES.BLACKLIST, [
      this._mkBtn([`${U2}BlackList/BtAdd`], 2150, 'Add', () => { const n = this.getBlockName(); if (n) this.onBlockAdd?.(n); }),
      this._mkBtn([`${U2}BlackList/BtDelete`], 2151, 'Del', () => {
        if (this._curBlock >= 0) this.onBlockDelete?.(this._blackList[this._curBlock]);
      }, true),
    ]);

    // ── Expedition (TabExpedition ids 12..22) ──
    this._tabButtons.set(TAB_INDICES.EXPEDITION, [
      this._mkBtn([`${U2}Expedition/BtCreate`], 14, 'New', () => this.onExpeditionCreate?.()),
      this._mkBtn([`${U2}Expedition/BtInvite`], 19, 'Invt', () => { const n = this.getExpeditionInviteName(); if (n) this.onExpeditionInvite?.(n); }),
      this._mkBtn([`${U2}Expedition/BtKick`], 17, 'Kick', () => { if (this._curCID >= 0) this.onExpeditionKick?.(this._curCID); }, true),
      this._mkBtn([`${U2}Expedition/BtWithdraw`], 21, 'Leav', () => this.onExpeditionWithdraw?.()),
      this._mkBtn([`${U2}Expedition/BtChangeMaster`], 16, 'Mstr', () => { if (this._curCID >= 0) this.onExpeditionChangeBoss?.(this._curCID); }, true),
      this._mkBtn([`${U2}Expedition/BtChangeBoss`], 20, 'Boss', () => { if (this._curCID >= 0) this.onExpeditionChangeBoss?.(this._curCID); }, true),
      this._mkBtn([`${U2}Expedition/BtWhisper`], 18, 'Whis', () => { const n = selName(); if (n) this.onFriendWhisper?.(n); }, true),
      this._mkBtn([`${U2}Expedition/BtChat`], 22, 'Chat', () => { const n = selName(); if (n) this.onPartyChat?.(n); }, true),
    ]);

    this._syncButtons();
  }

  /** BtChangeBoss (id 2206) — CTabParty::OnChangeBoss passes the selected member. */
  private onPartyChangeBossInternal(): void {
    if (this._curCID >= 0) this.onPartyChangeBoss?.(this._curCID);
  }

  onPartyChangeBoss: ((charId: number) => void) | null = null;

  private _setExplicitPos(arr: ({ btn: Button; id: number } | null)[], id: number, x: number, y: number): void {
    const b = arr.find((e) => e?.id === id);
    if (b) b.btn.container.position.set(x, y);
  }

  /** OG SetButton: hide all six arrays, show only the active tab's. */
  private _syncButtons(): void {
    for (const arr of this._tabButtons.values()) for (const b of arr) b.btn.container.visible = false;
    const arr = this._tabButtons.get(this._activeTab);
    if (!arr) return;
    const hasSel = this._curCID >= 0 || this._curBlock >= 0;
    for (const b of arr) {
      if (b.id === 2023) continue; // BtMate: created then permanently hidden
      b.btn.container.visible = true;
      b.btn.enabled = b.needsSelection ? hasSel : true;
    }
  }

  private _findFriend(charId: number): UserEntry | null {
    for (const g of this._groups) {
      const m = g.members.find((u) => u.charId === charId);
      if (m) return m;
    }
    return null;
  }

  private _selectedEntry(): string | null {
    const f = this._findFriend(this._curCID);
    if (f) return f.name;
    const p = this._party.find((m) => m.charId === this._curCID);
    if (p) return p.name;
    const g = this._guild.find((m) => m.charId === this._curCID);
    if (g) return g.name;
    const a = this._alliance.find((m) => m.charId === this._curCID);
    if (a) return a.name;
    return null;
  }

  // ═══ Rendering ═══

  private _clearLayers(): void {
    for (const c of [...this._rowsLayer.children]) c.removeFromParent();
    for (const c of [...this._headerLayer.children]) {
      if (c !== this._locationText && c !== this._countText) c.removeFromParent();
    }
  }

  private _rebuild(): void {
    if (!this._wzBg) {
      // Graphics fallback only while WZ assets are absent.
      const bg = new Graphics();
      bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 245 / 255 });
      bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
      this._headerLayer.addChildAt(bg, 0);
    }
    if (this._tab.curTab !== this._activeTab) this._tab.setTab(this._activeTab);
    this._rebuildHeader();
    this._rebuildRows();
  }

  private _rebuildHeader(): void {
    this._clearLayers();
    const t = this._activeTab;

    if (t === TAB_INDICES.FRIEND) {
      // "(%d/%d)" right-aligned ending x=242, y=68, black (CTabFriend::Draw).
      const total = this._groups.reduce((n, g) => n + g.members.length, 0);
      this._countText.text = `${this._onlineOnly ? 'Online' : 'All'} (${total})`;
      this._countText.position.set(242 - this._countText.width, 68);
      this._locationText.visible = true;
    } else if (t === TAB_INDICES.PARTY) {
      // CTabParty::Draw: "%d/%d" (sameMap / total), right-aligned ending x=220,
      // y=68 (SP2121 format, font 10); rcOnlineCount rect (220-20-textW,63,240,84).
      // The partyOn (230x25) header plate is the fixed title row at the top.
      if (this._partyHeader) {
        const hp = new Sprite(this._partyHeader.texture);
        hp.anchor.copyFrom(this._partyHeader.anchor);
        hp.position.copyFrom(this._partyHeader.position);
        this._headerLayer.addChild(hp);
      }
      const sameMap = this._party.filter((m) => m.sameMap).length;
      this._countText.text = `${sameMap}/${this._party.length}`;
      this._countText.position.set(220 - this._countText.width, 68);
      this._locationText.visible = false;
    } else {
      this._countText.text = '';
      this._locationText.visible = false;
    }

    if (t === TAB_INDICES.GUILD && this._guildBase) {
      const base = new Sprite(this._guildBase.texture);
      base.anchor.copyFrom(this._guildBase.anchor);
      base.position.copyFrom(this._guildBase.position);
      this._headerLayer.addChild(base);
      // Guild mark icon (20x20, origin 0,0) at left of plate.
      if (this._guildMark) {
        const mark = new Sprite(this._guildMark.texture);
        mark.position.set(2, 2);
        base.addChild(mark);
      }
      if (this._guildName) {
        const nm = new Text({ text: this._guildName, style: _styleBlack });
        nm.position.set(16, 6);
        base.addChild(nm);
      }
      if (this._guildNotice) {
        const nt = new Text({ text: this._guildNotice.slice(0, 40), style: _styleBlack });
        nt.position.set(4, 29);
        base.addChild(nt);
      }
    }
    if (t === TAB_INDICES.ALLIANCE && this._unionBase) {
      const base = new Sprite(this._unionBase.texture);
      base.anchor.copyFrom(this._unionBase.anchor);
      base.position.copyFrom(this._unionBase.position);
      this._headerLayer.addChild(base);
      if (this._allianceName) {
        const nm = new Text({ text: this._allianceName, style: _styleBlack });
        nm.position.set(16, 6);
        base.addChild(nm);
      }
    }
    if (t === TAB_INDICES.EXPEDITION && this._expedTable) {
      const tbl = new Sprite(this._expedTable.texture);
      tbl.anchor.copyFrom(this._expedTable.anchor);
      tbl.position.copyFrom(this._expedTable.position);
      this._headerLayer.addChild(tbl);
    }
  }

  /** Helper: stamp a Sheet plate sprite (or fallback rect) and return its container. */
  private _sheetRow(sheet: string, variant: number, x: number, y: number, w: number, h: number): Container {
    const c = new Container();
    c.position.set(x, y);
    const arr = this._sheets[sheet];
    const spr = arr?.[variant] ?? null;
    if (spr) {
      const s = new Sprite(spr.texture);
      s.position.copyFrom(spr.position);
      c.addChild(s);
    } else {
      const g = new Graphics();
      g.rect(0, 0, w, h).fill({ color: variant === 1 ? 0x39415e : 0xffffff, alpha: 0.92 });
      g.rect(0, 0, w, h).stroke({ color: 0x2a2f45, width: 1 });
      c.addChild(g);
    }
    return c;
  }

  /** Draw a level value with the lvNumber digit glyphs (pitch 12, leading
   *  zeros skipped; offline draws at alpha 0xB4). */
  private _drawLevel(parent: Container, x: number, y: number, level: number | undefined, dim: boolean): void {
    if (level === undefined || level <= 0 || this._lvDigits.length !== 10) {
      const t = new Text({ text: level !== undefined && level > 0 ? String(level) : '', style: dim ? _styleOffline : _styleBlack });
      t.position.set(x, y);
      parent.addChild(t);
      return;
    }
    const s = String(Math.min(level, 999)).padStart(3, ' ').trim().padStart(3, ' ');
    let dx = x;
    let started = false;
    for (const ch of s) {
      if (ch === ' ') { dx += 12; continue; }
      if (ch === '0' && !started) { dx += 12; continue; }
      started = true;
      const d = this._lvDigits[Number(ch)];
      if (d) {
        const sp = new Sprite(d.texture);
        sp.alpha = dim ? 0xb4 / 255 : 1;
        sp.position.set(dx, y);
        parent.addChild(sp);
      }
      dx += 12;
    }
  }

  private _makeRow(sheet: string, variant: number, x: number, y: number, w: number, onClick: (() => void) | null): Container {
    const row = this._sheetRow(sheet, variant, x, y, w, ROW_H);
    if (onClick) {
      row.eventMode = 'static';
      row.cursor = 'pointer';
      row.on('pointerdown', onClick);
    }
    this._rowsLayer.addChild(row);
    return row;
  }

  private _clipChildren(c: Container, top: number, bottom: number): void {
    const g = new Graphics();
    g.rect(0, top, PANEL_W, bottom - top).fill({ color: 0xffffff, alpha: 0 });
    // Simple software clip: hide children outside the band (Pixi mask).
    c.mask = null;
    for (const child of c.children) {
      const cy = child.y;
      child.visible = cy >= top - ROW_H && cy < bottom;
    }
  }

  private _rebuildRows(): void {
    this._clearRowsOnly();
    const t = this._activeTab;
    switch (t) {
      case TAB_INDICES.FRIEND: this._rowsFriend(); break;
      case TAB_INDICES.PARTY: this._rowsParty(); break;
      case TAB_INDICES.GUILD: this._rowsGuildLike(true); break;
      case TAB_INDICES.ALLIANCE: this._rowsGuildLike(false); break;
      case TAB_INDICES.BLACKLIST: this._rowsBlackList(); break;
      case TAB_INDICES.EXPEDITION: this._rowsExpedition(); break;
    }
    this._syncButtons();
  }

  private _clearRowsOnly(): void {
    for (const c of [...this._rowsLayer.children]) c.removeFromParent();
  }

  // ── CTabFriend::Draw @0x8C2CD0: 230-wide list, two 113px columns ──
  private _rowsFriend(): void {
    const listX = 10;
    let y = 115 - this._scrollOffset * ROW_H;
    const CELL_W = 113;
    for (const g of this._groups) {
      // Group header: Friend/title plate (244x25, origin -10,-60) + fold icon + "%s (%d/%d)".
      const head = new Container();
      head.position.set(listX, y);
      head.eventMode = 'static';
      head.cursor = 'pointer';
      head.on('pointerdown', () => {
        g.folded = !g.folded;
        this._rebuildRows();
      });
      if (this._friendTitle) {
        const sp = new Sprite(this._friendTitle.texture);
        sp.anchor.copyFrom(this._friendTitle.anchor);
        sp.position.copyFrom(this._friendTitle.position);
        head.addChild(sp);
      } else {
        // Fallback: Sheet1/0 plate.
        const fb = this._sheetRow('Sheet1', 0, 0, 0, 230, ROW_H);
        head.addChild(fb);
      }
      if (this._foldOpen && this._foldClose) {
        const icon = new Sprite((g.folded ? this._foldClose : this._foldOpen).texture);
        icon.position.set(3, (ROW_H - 13) / 2);
        head.addChild(icon);
      }
      const ht = new Text({
        text: `${g.name} (${g.members.length}/${g.members.length})`,
        style: _styleBlack,
      });
      ht.position.set(19, 5);
      head.addChild(ht);
      this._rowsLayer.addChild(head);
      y += ROW_H;
      if (g.folded) continue;

      const members = g.members.filter((m) => !this._onlineOnly || true);
      for (let i = 0; i < members.length; i += 2) {
        for (let col = 0; col < 2 && i + col < members.length; col++) {
          const m = members[i + col];
          const colX = col === 0 ? 1 : 115;
          const selected = m.charId === this._curCID;
          const row = this._makeRow('Sheet1', 1, listX + colX, y, CELL_W, () => {
            this._curCID = m.charId;
            this._rebuildRows();
          });
          if (selected) {
            const hi = new Graphics();
            hi.rect(0, 0, CELL_W, ROW_H).fill({ color: SEL_FILL });
            row.addChildAt(hi, 0);
          }
          // icon0 (same channel) / icon1 (blocked) at colX+4, v-centered.
          const iconIdx = m.blocked ? 1 : 0;
          const icon = this._friendIcons[iconIdx];
          if (icon) {
            const ic = new Sprite(icon.texture);
            ic.position.set(4, (ROW_H - icon.height) / 2);
            row.addChild(ic);
          }
          const style = m.blocked ? _styleBlocked : selected ? _styleWhite : _styleOnline;
          const nt = new Text({ text: m.name, style });
          nt.position.set(14, 5);
          row.addChild(nt);
        }
        y += ROW_H;
      }
    }
    this._clipChildren(this._rowsLayer, 115, 115 + SB_CONFIG[TAB_INDICES.FRIEND].h);
  }

  // ── CTabParty::Draw @0x8C4A30: "%-13s   %-11s%6d" on Sheet2 plates ──
  // Three sections drawn in order: sameMap, elseWhere, offline. Within each
  // section every row uses Sheet2/1 (_244); the section's LAST row uses
  // Sheet2/2 (_429) as the section cap (sameMap: last && no elseWhere).
  private _rowsParty(): void {
    const listX = 10;
    const start = SB_CONFIG[TAB_INDICES.PARTY].y; // 105 (v24)
    let y = start - this._scrollOffset * ROW_H;
    const pad = (s: string, n: number) => s.slice(0, n).padEnd(n, ' ');
    const sameMap = this._party.filter((m) => m.sameMap);
    const elseWhere = this._party.filter((m) => m.online && !m.sameMap);
    const offline = this._party.filter((m) => !m.online);
    const sections: { members: PartyEntry[]; isSameMap: boolean }[] = [
      { members: sameMap, isSameMap: true },
      { members: elseWhere, isSameMap: false },
      { members: offline, isSameMap: false },
    ];
    for (const sec of sections) {
      const lastIdx = sec.members.length - 1;
      for (let i = 0; i < sec.members.length; i++) {
        const m = sec.members[i];
        const selected = m.charId === this._curCID;
        // Sheet2/1 (_244) normal; the section's last row uses Sheet2/2 (_429).
        // sameMap only caps when it's the last section (no elseWhere/offline after).
        const isCap = i === lastIdx && (sec.isSameMap ? elseWhere.length === 0 && offline.length === 0 : true);
        const variant = isCap ? 2 : 1;
        const row = this._makeRow('Sheet2', variant, listX, y, 230, () => {
          this._curCID = m.charId;
          this._rebuildRows();
        });
        // CTabParty::Draw selection fill: 0xFF244768 rect at (10, v24, 230, 20).
        if (selected) {
          const hi = new Graphics();
          hi.rect(0, 0, 230, ROW_H).fill({ color: SEL_FILL });
          row.addChildAt(hi, 0);
        }
        // Leader crown (Main/Party/icon0/1, 17x16) at absolute (11, rowY+1);
        // text is at absolute x=27 per DrawTextA(27, v24+5) — both row-local.
        if (m.isLeader && this._partyCrown) {
          const crown = new Sprite(this._partyCrown.texture);
          crown.position.set(1, 1);
          row.addChild(crown);
        }
        const label = `${m.isLeader && !this._partyCrown ? '*' : ''}${pad(m.name, 13)} ${pad(m.job, 11)}${String(m.level).padStart(6, ' ')}`;
        const txt = new Text({ text: label.replace(/\s+\|/, '|'), style: selected ? _styleWhite : _styleOnline });
        txt.position.set(17, 5);
        row.addChild(txt);
        y += ROW_H;
      }
    }
    this._clipChildren(this._rowsLayer, start, start + SB_CONFIG[TAB_INDICES.PARTY].h);
  }

  // ── CTabGuild::Draw @0x8C71F0 / CTabGuildAlliance::Draw @0x8CA6F0 ──
  // Guild: online members then offline members, each on a guildOn/guildOff
  // (230x25) plate with expand/collapse. Alliance: one section per guild
  // (unionName plate header + members). Rows on Sheet3/0|over|1 with column
  // rects Name[1..62] Job[64..125] Level[127..153] Grade[155..]; separators.
  private _rowsGuildLike(isGuild: boolean): void {
    const listX = 10;
    let y = 100 - this._scrollOffset * ROW_H;
    const entries: GuildEntry[] = this._guild;

    type Row = { charId: number; name: string; rank: string; online: boolean; job?: string; level?: number };
    type Section = { title: string; plate: (on: boolean) => Sprite | null; folded: boolean; members: Row[] };

    // ── Alliance: one collapsible section per member guild (CTabGuildAlliance::Draw). ──
    if (!isGuild) {
      const byGuild = new Map<string, Row[]>();
      for (const a of this._alliance) {
        const key = a.guildName || `Guild ${a.guildId}`;
        const list = byGuild.get(key) ?? [];
        list.push({ charId: a.charId, name: a.name, rank: gradeName(a.grade), online: true, level: a.level });
        byGuild.set(key, list);
      }
      const guilds = [...byGuild.entries()];
      for (let gi = 0; gi < guilds.length; gi++) {
        const [title, members] = guilds[gi];
        const head = new Container();
        head.position.set(listX, y);
        head.eventMode = 'static';
        head.cursor = 'pointer';
        head.on('pointerdown', () => {
          this._sectionFolded[gi] = !this._sectionFolded[gi];
          this._rebuildRows();
        });
        if (this._unionNamePlate) {
          const sp = new Sprite(this._unionNamePlate.texture);
          sp.position.copyFrom(this._unionNamePlate.position);
          head.addChild(sp);
        } else {
          const g = new Graphics();
          g.rect(0, 0, 230, 25).fill({ color: 0xdfe3ee });
          head.addChild(g);
        }
        const lbl = new Text({ text: `${title} (${members.length})`, style: _styleBlack });
        lbl.position.set(26, 6);
        head.addChild(lbl);
        if (this._foldOpen && this._foldClose) {
          const icon = new Sprite((this._sectionFolded[gi] ? this._foldClose : this._foldOpen).texture);
          icon.position.set(210, 6);
          head.addChild(icon);
        }
        this._rowsLayer.addChild(head);
        y += 25;
        if (this._sectionFolded[gi]) continue;

        for (const m of members) {
          const selected = m.charId === this._curCID;
          const row = this._makeRow('Sheet3', selected ? 1 : 0, listX, y, 230, () => {
            this._curCID = m.charId;
            this._rebuildRows();
          });
          const nameStyle = selected ? _styleWhite : _styleBlack;
          const nm = new Text({ text: m.name, style: nameStyle });
          nm.position.set(2, 5);
          row.addChild(nm);
          const jobTxt = new Text({ text: (m.job ?? gradeName(m.rank)).slice(0, 8), style: nameStyle });
          jobTxt.position.set(64, 5);
          row.addChild(jobTxt);
          this._drawLevel(row, 127, 4, m.level ?? 0, false);
          const gr = new Text({ text: gradeName(m.rank), style: nameStyle });
          gr.position.set(155, 5);
          row.addChild(gr);
          if (this._lineSprite) {
            const ln = new Sprite(this._lineSprite.texture);
            ln.position.set(0, ROW_H - 1);
            row.addChild(ln);
          }
          y += ROW_H;
        }
      }
      this._clipChildren(this._rowsLayer, 100, 100 + SB_CONFIG[this._activeTab].h);
      return;
    }

    const source: Row[] = entries;
    const online = source.filter((m) => m.online);
    const offline = source.filter((m) => !m.online);
    const sections: Section[] = [
      { title: 'Online', plate: (on) => (on ? this._guildSectionOn : this._guildSectionOff), folded: this._sectionFolded[0], members: online },
      { title: 'Offline', plate: (_on) => this._guildSectionOff, folded: this._sectionFolded[1], members: offline },
    ];

    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si];
      const plate = sec.plate(si === 0);
      const head = new Container();
      head.position.set(listX, y);
      head.eventMode = 'static';
      head.cursor = 'pointer';
      head.on('pointerdown', () => {
        this._sectionFolded[si] = !this._sectionFolded[si];
        this._rebuildRows();
      });
      if (plate) {
        const sp = new Sprite(plate.texture);
        sp.position.copyFrom(plate.position);
        head.addChild(sp);
      } else {
        const g = new Graphics();
        g.rect(0, 0, 230, 25).fill({ color: 0xdfe3ee });
        head.addChild(g);
      }
      // Label at (8,29)-ish → the plate carries the caption; draw counts at (26,6).
      const total = online.length + offline.length;
      const lbl = new Text({
        text: `${sec.title} (${sec.members.length}/${total})`,
        style: _styleBlack,
      });
      lbl.position.set(26, 6);
      head.addChild(lbl);
      // Expand/collapse icon (OG BtOpen/BtClose ids 2071/2070 at ptMaxMin.x+10).
      if (this._foldOpen && this._foldClose) {
        const icon = new Sprite((sec.folded ? this._foldClose : this._foldOpen).texture);
        icon.position.set(210, 6);
        head.addChild(icon);
      }
      this._rowsLayer.addChild(head);
      y += 25;
      if (sec.folded) continue;

      for (const m of sec.members) {
        const selected = m.charId === this._curCID;
        const row = this._makeRow('Sheet3', selected ? 1 : 0, listX, y, 230, () => {
          this._curCID = m.charId;
          this._rebuildRows();
        });
        const nameStyle = selected ? _styleWhite : _styleBlack;
        const nm = new Text({ text: m.name, style: nameStyle });
        nm.position.set(2, 5); // Name column starts x+2
        row.addChild(nm);
        const jobTxt = new Text({ text: (m.job ?? gradeName(m.rank)).slice(0, 8), style: nameStyle });
        jobTxt.position.set(64, 5); // Job column x=64
        row.addChild(jobTxt);
        this._drawLevel(row, 127, 4, m.level ?? 0, !m.online); // Level column x=127
        const gr = new Text({ text: gradeName(m.rank), style: nameStyle });
        gr.position.set(155, 5); // Grade column x=155
        row.addChild(gr);
        if (this._lineSprite) {
          const ln = new Sprite(this._lineSprite.texture);
          ln.position.set(0, ROW_H - 1);
          row.addChild(ln);
        }
        y += ROW_H;
      }
    }
    this._clipChildren(this._rowsLayer, 100, 100 + SB_CONFIG[this._activeTab].h);
  }

  private _rowsBlackList(): void {
    const listX = 10;
    let y = 60 - this._scrollOffset * ROW_H;
    for (let i = 0; i < this._blackList.length; i++) {
      const idx = i;
      const selected = idx === this._curBlock;
      const row = new Container();
      row.position.set(listX, y);
      row.eventMode = 'static';
      row.cursor = 'pointer';
      row.on('pointerdown', () => {
        this._curBlock = idx;
        this._rebuildRows();
      });
      if (this._blackListBase) {
        const sp = new Sprite(this._blackListBase.texture);
        sp.anchor.copyFrom(this._blackListBase.anchor);
        sp.position.copyFrom(this._blackListBase.position);
        row.addChild(sp);
        // Selection highlight overlay.
        if (selected) {
          const hi = new Graphics();
          hi.rect(0, 0, 230, ROW_H).fill({ color: SEL_FILL });
          row.addChildAt(hi, 0);
        }
      } else {
        // Fallback: Sheet3 plate.
        const fb = this._sheetRow('Sheet3', selected ? 1 : 0, 0, 0, 230, ROW_H);
        row.addChild(fb);
      }
      const txt = new Text({ text: this._blackList[idx], style: selected ? _styleWhite : _styleBlocked });
      txt.position.set(2, 5);
      row.addChild(txt);
      this._rowsLayer.addChild(row);
      y += ROW_H;
    }
    this._clipChildren(this._rowsLayer, 60, 60 + SB_CONFIG[TAB_INDICES.BLACKLIST].h);
  }

  private _rowsExpedition(): void {
    const listX = 10;
    let y = 60 - this._scrollOffset * ROW_H;
    const sortedKeys = [...this._expeditionSubParties.keys()].sort((a, b) => a - b);
    for (const spIdx of sortedKeys) {
      const members = this._expeditionSubParties.get(spIdx)!;
      const head = this._makeRow('Sheet1', 0, listX, y, 244, null);
      const ht = new Text({ text: `Party ${spIdx + 1} (${members.length}/6)`, style: _styleBlack });
      ht.position.set(19, 5);
      head.addChild(ht);
      y += ROW_H;
      for (const m of members) {
        const selected = m.charId === this._curCID;
        const row = this._makeRow('Sheet3', selected ? 1 : 0, listX, y, 244, () => {
          this._curCID = m.charId;
          this._rebuildRows();
        });
        const pad = (s: string, n: number) => s.slice(0, n).padEnd(n, ' ');
        const label = `${pad(m.name, 13)}${String(m.level).padStart(6, ' ')}`;
        const txt = new Text({ text: label, style: selected ? _styleWhite : _styleOnline });
        txt.position.set(2, 5);
        row.addChild(txt);
        y += ROW_H;
      }
    }
    this._clipChildren(this._rowsLayer, 60, 60 + SB_CONFIG[TAB_INDICES.EXPEDITION].h);
  }

  // ═══ input ═══

  handleMouseMove(x: number, y: number): void {
    if (!this.isVisible) return;
    const sbx = x - this._root.x - SCROLLBAR_X;
    const sby = y - this._root.y - (SB_CONFIG[this._activeTab]?.y ?? 60);
    if (sbx >= -4 && sbx < 16 && sby >= -4 && sby < (SB_CONFIG[this._activeTab]?.h ?? 225) + 4) {
      this._scrollBar.handleMouseMove(sbx, sby);
    } else {
      this._scrollBar.handleMouseLeave();
    }
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;

    // Active-tab buttons first (OG routes through CWnd hit-testing).
    for (const b of this._tabButtons.get(this._activeTab) ?? []) {
      if (b.btn.handleMouseButton(lx, ly, down)) return true;
    }

    // Scrollbar
    const sbCfg = SB_CONFIG[this._activeTab];
    const sbx = lx - SCROLLBAR_X;
    const sby = ly - (sbCfg?.y ?? 60);
    if (sbx >= -4 && sbx < 16 && sby >= -4 && sby < (sbCfg?.h ?? 225) + 4) {
      if (this._scrollBar.handleMouseButton(sbx, sby, down)) return true;
    }

    if (!down) return true;

    // Rows (Pixi pointerdown handles selection; still swallow clicks inside).
    if (lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H) return true;
    return false;
  }

  onMouseWheel(x: number, y: number, delta: number): void {
    super.onMouseWheel(x, y, delta);
  }

  onKeyPress(key: string): boolean {
    if (key === 'Escape' && this.isVisible) { this.isVisible = false; return true; }
    return false;
  }

  /** Test/inspection hook: currently visible row containers. */
  get rows(): Container[] { return this._rowsLayer.children as Container[]; }
}
