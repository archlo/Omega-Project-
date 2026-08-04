import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { ClipboardHelper } from '../../platform/ClipboardHelper.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';
import { ScrollBar } from './ScrollBar.js';
import { CCtrlTab } from './CCtrlTab.js';
import { Sprite } from 'pixi.js';

// OG CUIUserList constants (from IDA decompilation)
// Window: 264×382, CreateUIWndPosSaved(264, 382, 10)
const PANEL_W = 264;
const PANEL_H = 382;
const ROW_H = 20; // OG: row height = 20px per item
const LIST_START_Y = 50; // below tab bar
const TAB_Y = 9;
const TAB_CONTROL_ID = 2001;
const SCROLLBAR_ID = 2000;

// OG: 6 tabs — Friend(0), Party(1), Expedition(2), Guild(3), Alliance(4), BlackList(5)
const TAB_NAMES = ['Friend', 'Party', 'Guild', 'Alliance', 'Block', 'Exped'];
const TAB_INDICES = { FRIEND: 0, PARTY: 1, EXPEDITION: 2, GUILD: 3, ALLIANCE: 4, BLACKLIST: 5 };

// OG: Button counts per tab (from SetButton @ 0x8b76e0)
const FRIEND_BUTTONS = 15;
const PARTY_BUTTONS = 9;
const GUILD_BUTTONS = 13;
const ALLIANCE_BUTTONS = 11;
const BLACKLIST_BUTTONS = 2;

// OG: Scrollbar positions per tab (from SetScrollBar @ 0x8b7920)
const SCROLLBAR_X = 243;
const SCROLLBAR_CONFIG: Record<number, { y: number; h: number; offset: number }> = {
  [TAB_INDICES.FRIEND]: { y: 115, h: 0, offset: 0 }, // dynamic from m_nListHeight
  [TAB_INDICES.PARTY]: { y: 60, h: 225, offset: 117 },
  [TAB_INDICES.EXPEDITION]: { y: 60, h: 225, offset: 28 }, // OG: TabExpedition list height
  [TAB_INDICES.GUILD]: { y: 100, h: 185, offset: 105 },
  [TAB_INDICES.ALLIANCE]: { y: 100, h: 185, offset: 105 },
  [TAB_INDICES.BLACKLIST]: { y: 60, h: 228, offset: 27 },
};
const SCROLLBAR_WHEEL_RANGE = 235;

// OG: Fonts from OnCreate (FONT_DODOOMCHE_11_*)
const _fontWhite = new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' });
const _fontBlack = new TextStyle({ fill: '#000000', fontSize: 11, fontFamily: 'monospace' });
const _fontGray = new TextStyle({ fill: '#909090', fontSize: 11, fontFamily: 'monospace' });
const _fontGrayB5 = new TextStyle({ fill: '#FFB5B5', fontSize: 11, fontFamily: 'monospace' }); // OG: 0xFFB5B5
const _fontGray77 = new TextStyle({ fill: '#FF7777', fontSize: 11, fontFamily: 'monospace' }); // OG: 0xFF7777
const _fontGroupName = new TextStyle({ fill: '#FFFFFF', fontSize: 10, fontFamily: 'monospace' }); // OG: same as m_pFontWhite
const _fontOnline = new TextStyle({ fill: '#FF54A5', fontSize: 11, fontFamily: 'monospace' }); // OG: 0xFF54A5
const _fontOffline = new TextStyle({ fill: '#FFCA8B', fontSize: 11, fontFamily: 'monospace' }); // OG: 0xFFCA8B
const _fontLocation = new TextStyle({ fill: '#FF6666', fontSize: 10, fontFamily: 'monospace' }); // OG: 0xFF6666
const _fontBlocked = new TextStyle({ fill: '#FF0D0D', fontSize: 11, fontFamily: 'monospace' }); // OG: 0xFF0D0D
const _tabStyle = new TextStyle({ fill: '#DCC896', fontSize: 10, fontFamily: 'monospace' });

export interface UserEntry {
  charId: number;
  name: string;
  level: number;
  job: string;
}

export interface PartyEntry { charId: number; name: string; level: number; job: string; isLeader: boolean }
export interface GuildEntry { charId: number; name: string; rank: string; online: boolean }
export interface AllianceEntry { charId: number; name: string; level: number; job: number; grade: number; guildId: number }

// OG class: CUIUserList (3260 bytes, inherits CUIWnd)
// All coordinates and behavior from IDA decompilation of v95 client.
export class UserList extends GamePanel {
  private _bg: Graphics;
  private _wzBg: WzSprite | null = null;
  private _scrollBar: ScrollBar;
  private _tab: CCtrlTab;
  private _entries: Text[] = [];
  private _buttons: Container[] = [];
  private _guildNameText: Text;
  private _titleText: Text;
  private _locationText: Text | null = null; // OG: m_pFontLocation — friend location at (10, 285)

  // OG: Guild/Alliance dynamic button overlay (CreateGuildButton/CreateAllianceButton)
  // Buttons are created per-section at positions defined by SectionData
  private _guildDynButtons: Container[] = [];
  private _allianceDynButtons: Container[] = [];

  // OG: Tab WZ canvases from UserList/Main/Tab/enabled and Tab/disabled
  private _tabEnabledCanvases: Sprite[] = [];
  private _tabDisabledCanvases: Sprite[] = [];

  private _users: UserEntry[] = [];
  private _party: PartyEntry[] = [];
  private _guild: GuildEntry[] = [];
  private _guildName = '';
  private _blackList: string[] = [];
  private _alliance: AllianceEntry[] = [];
  private _allianceName = '';
  private _expeditionMembers: { subPartyIdx: number; charId: number; name: string; level: number; job: number }[] = [];
  private _expeditionSubParties: Map<number, { charId: number; name: string; level: number; job: number }[]> = new Map();

  private _activeTab = 0;
  private _selParty = -1;
  private _selFriend = -1;
  private _selBlock = -1;
  private _selGuild = -1;
  private _selAlliance = -1;
  private _selExped = -1;
  private _scrollOffset = 0;
  private _viewItemCount = 0;

  // Callbacks
  onPartyInvite: ((name: string) => void) | null = null;
  onPartyKick: ((charId: number) => void) | null = null;
  onPartyCreate: (() => void) | null = null;
  onPartyLeave: (() => void) | null = null;
  onGuildLeave: (() => void) | null = null;
  onGuildBoard: (() => void) | null = null;
  onGuildInvite: ((name: string) => void) | null = null;
  onGuildKick: ((charId: number, name: string) => void) | null = null;
  onGuildAdmin: ((charId: number, name: string) => void) | null = null;
  onGuildExpel: ((charId: number, name: string) => void) | null = null;
  onGuildLevel: ((charId: number, level: number) => void) | null = null;
  onFriendAdd: ((name: string) => void) | null = null;
  onFriendDelete: ((charId: number) => void) | null = null;
  // OG: CTabFriend::OnWhisper (0x8D4CC0) — whisper to selected friend
  onFriendWhisper: ((name: string) => void) | null = null;
  // OG: CTabFriend::OnGroupWhisper (0x8B7250) — whisper to friend group
  onGroupWhisper: ((groupName: string) => void) | null = null;
  // OG: CTabFriend::ChangeBlockOption (0x8B7280) — block/unblock friend
  onFriendBlock: ((charId: number, block: boolean) => void) | null = null;
  // OG: CTabFriend::OnToggleView (0x8B9DC0) — toggle online/all view
  onToggleOnlineOnly: ((onlineOnly: boolean) => void) | null = null;
  // OG: CTabFriend::OnFindFriendView (0x8B7270) — open find friend dialog
  onFindFriend: (() => void) | null = null;
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
  getAllianceInviteName: () => string = () => '';
  getAllianceNotice: () => string = () => '';
  onExpeditionCreate: (() => void) | null = null;
  onExpeditionInvite: ((name: string) => void) | null = null;
  onExpeditionKick: ((charId: number) => void) | null = null;
  onExpeditionWithdraw: (() => void) | null = null;
  onExpeditionChangeBoss: ((charId: number) => void) | null = null;
  getExpeditionInviteName: () => string = () => '';

  private _clipboard = new ClipboardHelper();

  constructor(loader?: WzTextureLoader, uiWz?: WzPackage | null) {
    super();
    this._root.visible = false;
    this._root.x = 300;
    this._root.y = 100;

    // OG: CUIWnd::OnCreate loads backgrnd from UIWindow2.img/UserList/Main
    const prop = uiWz?.GetItem('UIWindow2.img/UserList/Main');
    const bgNode = prop instanceof WzProperty ? prop.Get('backgrnd') : null;
    this._wzBg = bgNode instanceof WzCanvas ? (loader ?? new WzTextureLoader()).Load(bgNode) : null;

    // OG: Load tab WZ canvases from UserList/Main/Tab/enabled and Tab/disabled
    if (loader && prop instanceof WzProperty) {
      const tabProp = prop.Get('Tab');
      if (tabProp instanceof WzProperty) {
        const enabledProp = tabProp.Get('enabled');
        const disabledProp = tabProp.Get('disabled');
        for (let i = 0; i < 6; i++) {
          if (enabledProp instanceof WzProperty) {
            const canvas = enabledProp.Get(`${i}`);
            if (canvas instanceof WzCanvas) {
              const s = loader.Load(canvas)?.ToPixi();
              if (s) this._tabEnabledCanvases.push(s);
            }
          }
          if (disabledProp instanceof WzProperty) {
            const canvas = disabledProp.Get(`${i}`);
            if (canvas instanceof WzCanvas) {
              const s = loader.Load(canvas)?.ToPixi();
              if (s) this._tabDisabledCanvases.push(s);
            }
          }
        }
      }
    }

    this._bg = new Graphics();
    this._root.addChild(this._bg);
    if (this._wzBg) this._root.addChildAt(this._wzBg.ToPixi(), 0);

    this._titleText = new Text({ text: 'Community', style: _fontWhite });
    this._titleText.x = 8; this._titleText.y = 5;
    this._root.addChild(this._titleText);

    // OG: Tab control id=2001, position=(8,9), width=250, type 8 (custom height 19)
    this._tab = new CCtrlTab(TAB_CONTROL_ID, 8, TAB_Y, 250, { type: 8, customHeight: 19, tabSpace: 1 });
    this._tab.setParent({ onTabChanged: (tab) => this._onTabChanged(tab) });
    for (const name of TAB_NAMES) this._tab.addItem(name);
    this._root.addChild(this._tab.container);

    this._guildNameText = new Text({ text: '', style: _fontGroupName });
    this._guildNameText.x = 8; this._guildNameText.y = 35;
    this._root.addChild(this._guildNameText);

    // OG: m_pFontLocation — friend location text at (10, 285)
    this._locationText = new Text({ text: '', style: _fontLocation });
    this._locationText.x = 10; this._locationText.y = 285;
    this._root.addChild(this._locationText);

    // OG: Scrollbar at (243, varies), nWheelRange=235
    const sbConfig = SCROLLBAR_CONFIG[this._activeTab] || { y: 60, h: 225 };
    this._scrollBar = new ScrollBar(SCROLLBAR_X, sbConfig.y, sbConfig.h || 225, (pos) => {
      this._scrollOffset = pos;
    });
    this._root.addChild(this._scrollBar.container);

    this._rebuild();

    // OG: CUIWnd close button
    this.createCloseButton(null, null, 1, 265);
  }

  setUsers(users: UserEntry[]): void { this._users = users; this._selFriend = -1; this._scrollOffset = 0; this._rebuild(); }
  updateFriendStatus(charId: number, online: boolean): void {
    const entry = this._users.find(u => u.charId === charId);
    if (entry) { entry.job = online ? 'Online' : 'Offline'; this._rebuild(); }
  }
  updateFriendEntry(charId: number, channel: number): void {
    const entry = this._users.find(u => u.charId === charId);
    if (entry) { entry.job = channel >= 0 ? 'Online' : 'Offline'; this._rebuild(); }
  }
  updateGuildMemberOnline(charId: number, online: boolean): void {
    const entry = this._guild.find(m => m.charId === charId);
    if (entry) { entry.online = online; this._rebuild(); }
  }
  setParty(party: PartyEntry[]): void { this._party = party; this._selParty = -1; this._scrollOffset = 0; this._rebuild(); }
  setPartyBoss(bossCharId: number): void {
    for (const m of this._party) m.isLeader = m.charId === bossCharId;
    this._rebuild();
  }
  updatePartyMemberStat(charId: number, level: number, job: string): void {
    const entry = this._party.find(m => m.charId === charId);
    if (entry) { entry.level = level; entry.job = job; this._rebuild(); }
  }
  setGuild(name: string, members: GuildEntry[]): void { this._guildName = name; this._guild = members; this._selGuild = -1; this._scrollOffset = 0; this._rebuild(); }
  addGuildMember(entry: GuildEntry): void {
    if (!this._guild.some(m => m.charId === entry.charId)) { this._guild.push(entry); this._rebuild(); }
  }
  removeGuildMember(charId: number): void {
    const idx = this._guild.findIndex(m => m.charId === charId);
    if (idx >= 0) { this._guild.splice(idx, 1); this._rebuild(); }
  }
  get onlineFriendIds(): Map<number, string> { return new Map(this._users.filter(u => u.job !== 'Offline').map(u => [u.charId, u.name])); }
  get guildMemberIds(): Map<number, string> { return new Map(this._guild.filter(m => m.online).map(m => [m.charId, m.name])); }
  SetBlackList(names: string[]): void { this._blackList = names; this._selBlock = -1; this._scrollOffset = 0; this._rebuild(); }

  // OG: SetFriendViewItem — sets friend location text from server data
  setFriendLocation(location: string): void {
    if (this._locationText) {
      this._locationText.text = location;
    }
  }

  setAlliance(name: string, members: AllianceEntry[]): void { this._allianceName = name; this._alliance = members; this._selAlliance = -1; this._scrollOffset = 0; this._rebuild(); }
  get allianceMemberIds(): Map<number, string> { return new Map(this._alliance.map(m => [m.charId, m.name])); }
  setExpedition(members: { subPartyIdx: number; charId: number; name: string; level: number; job: number }[]): void {
    this._expeditionMembers = members;
    // OG: TabExpedition groups members by subPartyIdx
    this._expeditionSubParties.clear();
    for (const m of members) {
      let arr = this._expeditionSubParties.get(m.subPartyIdx);
      if (!arr) { arr = []; this._expeditionSubParties.set(m.subPartyIdx, arr); }
      arr.push({ charId: m.charId, name: m.name, level: m.level, job: m.job });
    }
    this._selExped = -1;
    this._scrollOffset = 0;
    this._rebuild();
  }

  // OG: CreateGuildButton @ 0x8c01a0 — creates expand/collapse + page buttons per guild section
  private _createGuildDynButtons(): void {
    for (const b of this._guildDynButtons) this._root.removeChild(b);
    this._guildDynButtons = [];

    // OG: Each guild section has m_ptBtMaxMin (expand/collapse) and m_ptBtPage (prev/next)
    // Button IDs: 2071=expand, 2070=collapse, 2072=prev, 2073=next
    const sectionY = 55; // first guild section starts below guild name
    for (let i = 0; i < Math.min(this._guild.length, 5); i++) {
      const y = sectionY + i * 20;
      // Expand/collapse toggle
      const toggleBtn = this._makeSmallBtn('+', () => {});
      toggleBtn.x = 220; toggleBtn.y = y;
      this._guildDynButtons.push(toggleBtn);
      this._root.addChild(toggleBtn);
    }
    // Page buttons for guild sections
    if (this._guild.length > 5) {
      const prevBtn = this._makeSmallBtn('<', () => {});
      prevBtn.x = 10; prevBtn.y = PANEL_H - 50;
      this._guildDynButtons.push(prevBtn);
      this._root.addChild(prevBtn);
      const nextBtn = this._makeSmallBtn('>', () => {});
      nextBtn.x = 30; nextBtn.y = PANEL_H - 50;
      this._guildDynButtons.push(nextBtn);
      this._root.addChild(nextBtn);
    }
  }

  // OG: CreateAllianceButton @ 0x8c0460 — creates expand/collapse + page buttons per alliance section
  private _createAllianceDynButtons(): void {
    for (const b of this._allianceDynButtons) this._root.removeChild(b);
    this._allianceDynButtons = [];

    // OG: Alliance section IDs: 2080+ for expand/collapse, 2085/2086+ for prev/next
    const sectionY = 55;
    for (let i = 0; i < Math.min(this._alliance.length, 5); i++) {
      const y = sectionY + i * 20;
      const toggleBtn = this._makeSmallBtn('+', () => {});
      toggleBtn.x = 220; toggleBtn.y = y;
      this._allianceDynButtons.push(toggleBtn);
      this._root.addChild(toggleBtn);
    }
    if (this._alliance.length > 5) {
      const prevBtn = this._makeSmallBtn('<', () => {});
      prevBtn.x = 10; prevBtn.y = PANEL_H - 50;
      this._allianceDynButtons.push(prevBtn);
      this._root.addChild(prevBtn);
      const nextBtn = this._makeSmallBtn('>', () => {});
      nextBtn.x = 30; nextBtn.y = PANEL_H - 50;
      this._allianceDynButtons.push(nextBtn);
      this._root.addChild(nextBtn);
    }
  }

  private _makeSmallBtn(label: string, onClick: () => void): Container {
    const btn = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, 14, 14).fill({ color: '#1A1A2E' });
    bg.rect(0, 0, 14, 14).stroke({ color: '#5050A0', width: 1 });
    const txt = new Text({ text: label, style: new TextStyle({ fill: '#8888CC', fontSize: 9, fontFamily: 'monospace' }) });
    txt.x = 2; txt.y = 1;
    btn.addChild(bg, txt);
    btn.eventMode = 'static'; btn.cursor = 'pointer';
    btn.on('pointerdown', onClick);
    return btn;
  }

  // OG: ResetInfo — loads tab data, SetScrollBar, SetButton
  private _resetInfo(): void {
    this._scrollOffset = 0;
    this._setScrollBar();
    this._rebuild();
  }

  // OG: SetScrollBar @ 0x8b7920 — per-tab scrollbar config
  private _setScrollBar(): void {
    const config = SCROLLBAR_CONFIG[this._activeTab];
    if (!config) { this._scrollBar.visible = false; return; }
    this._scrollBar.visible = true;
    this._scrollBar.container.y = config.y;

    let itemCount = 0;
    switch (this._activeTab) {
      case TAB_INDICES.FRIEND: itemCount = this._users.length; break;
      case TAB_INDICES.PARTY: itemCount = this._party.length; break;
      case TAB_INDICES.GUILD: itemCount = this._guild.length; break;
      case TAB_INDICES.ALLIANCE: itemCount = this._alliance.length; break;
      case TAB_INDICES.BLACKLIST: itemCount = this._blackList.length; break;
      case TAB_INDICES.EXPEDITION: itemCount = this._expeditionMembers.length; break;
    }
    this._viewItemCount = itemCount;

    // OG: range = (offset + 20*count - listHeight) / 20 + 2
    const listH = config.h || 225;
    const rawRange = config.offset + 20 * itemCount - listH;
    if (rawRange <= 0 || this._activeTab === TAB_INDICES.PARTY) {
      this._scrollBar.setRange(0);
    } else {
      this._scrollBar.setRange(Math.floor(rawRange / 20) + 3);
    }
  }

  // OG: OnTabChanged @ 0x8dc580
  private _onTabChanged(tab: number): void {
    this._activeTab = tab;
    this._scrollOffset = 0;
    this._resetInfo();
  }

  private _getCurrentList(): { name: string; sub?: string; online?: boolean; selected: boolean; charId?: number }[] {
    switch (this._activeTab) {
      case TAB_INDICES.FRIEND:
        return this._users.map((u, i) => ({
          name: u.name, sub: `Lv.${u.level}`, online: u.job !== 'Offline',
          selected: i === this._selFriend, charId: u.charId
        }));
      case TAB_INDICES.PARTY:
        return this._party.map((p, i) => ({
          name: `${p.isLeader ? '[L] ' : ''}${p.name}`, sub: `Lv.${p.level} ${p.job}`,
          selected: i === this._selParty, charId: p.charId
        }));
      case TAB_INDICES.GUILD:
        return this._guild.map((g, i) => ({
          name: g.name, sub: g.rank, online: g.online,
          selected: i === this._selGuild, charId: g.charId
        }));
      case TAB_INDICES.ALLIANCE:
        return this._alliance.map((a, i) => ({
          name: a.name, sub: `Lv.${a.level} [${a.grade}]`,
          selected: i === this._selAlliance, charId: a.charId
        }));
      case TAB_INDICES.BLACKLIST:
        return this._blackList.map((n, i) => ({
          name: n, selected: i === this._selBlock
        }));
      case TAB_INDICES.EXPEDITION: {
        // OG: TabExpedition renders sub-party headers + member rows
        const items: { name: string; sub?: string; online?: boolean; selected: boolean; charId?: number; isHeader?: boolean }[] = [];
        const sortedKeys = [...this._expeditionSubParties.keys()].sort((a, b) => a - b);
        let flatIdx = 0;
        for (const spIdx of sortedKeys) {
          const members = this._expeditionSubParties.get(spIdx)!;
          items.push({ name: `Sub-Party ${spIdx + 1} (${members.length})`, selected: false, isHeader: true });
          for (const m of members) {
            items.push({
              name: m.name, sub: `Lv.${m.level}`,
              selected: flatIdx === this._selExped, charId: m.charId
            });
            flatIdx++;
          }
        }
        return items;
      }
      default: return [];
    }
  }

  private _rebuild(): void {
    this._bg.clear();
    if (!this._wzBg) {
      this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 245 / 255 });
      this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
      this._bg.rect(0, 0, PANEL_W, 22).fill({ color: '#0F1224' });
    }

    // OG: CCtrlTab handles its own rendering via SetTab
    // Only sync if not already set (avoids recursion from onTabChanged callback)
    if (this._tab.curTab !== this._activeTab) {
      this._tab.setTab(this._activeTab);
    }

    // OG: Guild/Alliance/Expedition name
    this._guildNameText.text =
      this._activeTab === TAB_INDICES.GUILD && this._guildName ? `Guild: ${this._guildName}` :
      this._activeTab === TAB_INDICES.ALLIANCE && this._allianceName ? `Alliance: ${this._allianceName}` :
      this._activeTab === TAB_INDICES.EXPEDITION ? `Expedition (${this._expeditionMembers.length})` : '';

    // OG: Friend tab location text at (10, 285) via m_pFontLocation
    // Shows current map/street name from sLocationInfo
    if (this._locationText) {
      if (this._activeTab === TAB_INDICES.FRIEND) {
        this._locationText.visible = true;
        // Location would be set by the server via SetFriendViewItem
        // For now show empty until server sends location data
      } else {
        this._locationText.visible = false;
      }
    }

    // OG: List rendering — clear old entries
    for (const t of this._entries) this._root.removeChild(t);
    this._entries = [];

    const items = this._getCurrentList();
    const maxVisible = Math.floor((PANEL_H - LIST_START_Y - 40) / ROW_H);

    // OG: Title with count
    const tabTitles: Record<number, string> = {
      [TAB_INDICES.FRIEND]: `Friends (${this._users.length})`,
      [TAB_INDICES.PARTY]: `Party (${this._party.length}/6)`,
      [TAB_INDICES.GUILD]: `Guild (${this._guild.length})`,
      [TAB_INDICES.ALLIANCE]: `Alliance (${this._alliance.length})`,
      [TAB_INDICES.BLACKLIST]: `Blocked (${this._blackList.length})`,
      [TAB_INDICES.EXPEDITION]: `Expedition (${this._expeditionMembers.length})`,
    };
    this._titleText.text = tabTitles[this._activeTab] || 'Community';

    // OG: Render visible rows
    for (let i = 0; i < maxVisible; i++) {
      const absIdx = this._scrollOffset + i;
      if (absIdx >= items.length) break;
      const item = items[absIdx];
      const y = LIST_START_Y + i * ROW_H;

      const label = item.sub ? `${item.name} ${item.sub}` : item.name;
      const isHeader = (item as any).isHeader === true;
      const style = isHeader ? _fontGroupName :
        item.selected ? new TextStyle({ fill: '#FFE082', fontSize: 11, fontFamily: 'monospace' }) :
        item.online === false ? _fontOffline : _fontGrayB5;
      const t = new Text({ text: label, style });
      t.x = 8; t.y = y;
      t.eventMode = 'static'; t.cursor = 'pointer';
      const idx = absIdx;
      t.on('pointerdown', () => this._onEntryClick(idx));
      this._entries.push(t);
      this._root.addChild(t);
    }

    // OG: Action buttons
    this._rebuildActionButtons();

    // OG: Guild/Alliance dynamic button overlay (CreateGuildButton/CreateAllianceButton)
    for (const b of this._guildDynButtons) this._root.removeChild(b);
    this._guildDynButtons = [];
    for (const b of this._allianceDynButtons) this._root.removeChild(b);
    this._allianceDynButtons = [];
    if (this._activeTab === TAB_INDICES.GUILD && this._guildName) {
      this._createGuildDynButtons();
    } else if (this._activeTab === TAB_INDICES.ALLIANCE && this._allianceName) {
      this._createAllianceDynButtons();
    }
  }

  private _onEntryClick(idx: number): void {
    switch (this._activeTab) {
      case TAB_INDICES.FRIEND: this._selFriend = idx; break;
      case TAB_INDICES.PARTY: this._selParty = idx; break;
      case TAB_INDICES.GUILD: this._selGuild = idx; break;
      case TAB_INDICES.ALLIANCE: this._selAlliance = idx; break;
      case TAB_INDICES.BLACKLIST: this._selBlock = idx; break;
      case TAB_INDICES.EXPEDITION: this._selExped = idx; break;
    }
    this._rebuild();
  }

  // OG: SetButton @ 0x8b76e0 — hides ALL buttons first, shows only current tab's
  private _rebuildActionButtons(): void {
    for (const b of this._buttons) this._root.removeChild(b);
    this._buttons = [];

    const y = PANEL_H - 28;
    let x = 8;
    const add = (label: string, onClick: () => void): void => {
      const btn = new Container();
      const bg = new Graphics();
      bg.rect(0, 0, label.length * 7 + 12, 18).fill({ color: '#1A1A2E' });
      bg.rect(0, 0, label.length * 7 + 12, 18).stroke({ color: '#5050A0', width: 1 });
      const txt = new Text({ text: label, style: _tabStyle });
      txt.x = 6; txt.y = 2;
      btn.addChild(bg, txt);
      btn.x = x; btn.y = y;
      btn.eventMode = 'static'; btn.cursor = 'pointer';
      btn.on('pointerdown', onClick);
      this._buttons.push(btn);
      this._root.addChild(btn);
      x += label.length * 7 + 18;
    };

    switch (this._activeTab) {
      case TAB_INDICES.FRIEND:
        add('Add', () => { const n = this.getInviteName(); if (n) this.onFriendAdd?.(n); });
        add('Delete', () => { if (this._selFriend >= 0) this.onFriendDelete?.(this._users[this._selFriend]?.charId); });
        // OG: CTabFriend::OnWhisper (0x8D4CC0)
        add('Whisper', () => { if (this._selFriend >= 0) this.onFriendWhisper?.(this._users[this._selFriend]?.name); });
        // OG: CTabFriend::OnGroupWhisper (0x8B7250)
        add('Group', () => { this.onGroupWhisper?.('all'); });
        // OG: CTabFriend::ChangeBlockOption (0x8B7280)
        add('Block', () => { if (this._selFriend >= 0) this.onFriendBlock?.(this._users[this._selFriend]?.charId, true); });
        // OG: CTabFriend::OnFindFriendView (0x8B7270)
        add('Find', () => { this.onFindFriend?.(); });
        break;
      case TAB_INDICES.PARTY:
        add('Create', () => this.onPartyCreate?.());
        add('Invite', () => { const n = this.getInviteName(); if (n) this.onPartyInvite?.(n); });
        add('Kick', () => { if (this._selParty >= 0) this.onPartyKick?.(this._party[this._selParty]?.charId); });
        add('Leave', () => this.onPartyLeave?.());
        break;
      case TAB_INDICES.GUILD:
        if (this._guildName) {
          add('Board', () => this.onGuildBoard?.());
          add('Invite', () => { const n = this.getInviteName(); if (n) this.onGuildInvite?.(n); });
          add('Kick', () => { if (this._selGuild >= 0) { const g = this._guild[this._selGuild]; this.onGuildKick?.(g.charId, g.name); } });
          add('Admin', () => { if (this._selGuild >= 0) { const g = this._guild[this._selGuild]; this.onGuildAdmin?.(g.charId, g.name); } });
          add('Expel', () => { if (this._selGuild >= 0) { const g = this._guild[this._selGuild]; this.onGuildExpel?.(g.charId, g.name); } });
          add('Level', () => {
            if (this._selGuild < 0) return;
            const raw = window.prompt('Set guild rank (1-5):');
            if (raw !== null) this.onGuildLevel?.(this._guild[this._selGuild].charId, parseInt(raw, 10));
          });
          add('Leave', () => this.onGuildLeave?.());
        } else {
          add('Create', () => { const n = this.getGuildName(); if (n) this.onGuildCreate?.(n); });
        }
        break;
      case TAB_INDICES.ALLIANCE:
        if (this._allianceName) {
          add('Withdraw', () => this.onAllianceWithdraw?.());
          add('Invite', () => { const n = this.getAllianceInviteName(); if (n) this.onAllianceInvite?.(n); });
          add('Notice', () => { const t = this.getAllianceNotice(); if (t) this.onAllianceSetNotice?.(t); });
          if (this._selAlliance >= 0) {
            const a = this._alliance[this._selAlliance];
            add('Whisper', () => this.onAllianceWhisper?.(a.name));
            add('Party', () => this.onAlliancePartyInvite?.(a.charId, a.name));
            add('Kick', () => this.onAllianceKick?.(a.guildId, a.charId));
            add('Master', () => this.onAllianceChangeMaster?.(a.charId));
            add('G+', () => this.onAllianceGradeChange?.(a.charId, false));
            add('G-', () => this.onAllianceGradeChange?.(a.charId, true));
          }
        }
        break;
      case TAB_INDICES.BLACKLIST:
        add('Add', () => { const n = this.getBlockName(); if (n) this.onBlockAdd?.(n); });
        add('Delete', () => { if (this._selBlock >= 0) this.onBlockDelete?.(this._blackList[this._selBlock]); });
        break;
      case TAB_INDICES.EXPEDITION:
        add('Create', () => this.onExpeditionCreate?.());
        add('Invite', () => { const n = this.getExpeditionInviteName(); if (n) this.onExpeditionInvite?.(n); });
        add('Kick', () => { if (this._selExped >= 0) this.onExpeditionKick?.(this._expeditionMembers[this._selExped]?.charId); });
        add('Leave', () => this.onExpeditionWithdraw?.());
        if (this._selExped >= 0) {
          add('Boss', () => this.onExpeditionChangeBoss?.(this._expeditionMembers[this._selExped].charId));
        }
        break;
    }
  }

  // OG: OnChildNotify routing
  handleMouseMove(x: number, y: number): void {
    if (!this.isVisible) return;
    const sbx = x - this._root.x - SCROLLBAR_X;
    const sby = y - this._root.y - (SCROLLBAR_CONFIG[this._activeTab]?.y || 60);
    if (sbx >= 0 && sbx < 12 && sby >= 0 && sby < 225) {
      this._scrollBar.handleMouseMove(sbx, sby);
    } else {
      this._scrollBar.handleMouseLeave();
    }
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;

    // Forward to scrollbar
    const sbx = lx - SCROLLBAR_X;
    const sby = ly - (SCROLLBAR_CONFIG[this._activeTab]?.y || 60);
    if (sbx >= 0 && sbx < 12 && sby >= 0 && sby < 225) {
      if (this._scrollBar.handleMouseButton(sbx, sby, down)) return true;
    }

    if (!down) return true;
    if (lx >= PANEL_W - 18 && ly < 22) { this.isVisible = false; return true; }

    // OG: Tab click — delegated to CCtrlTab
    const tabLx = lx - 8;
    const tabLy = ly - TAB_Y;
    if (this._tab.handleMouseButton(tabLx, tabLy, down)) return true;

    return lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H;
  }

  onKeyPress(key: string): boolean {
    if (key === 'Escape' && this.isVisible) { this.isVisible = false; return true; }
    return false;
  }
}
