import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { ClipboardHelper } from '../../platform/ClipboardHelper.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';

const PANEL_W = 240;
const PANEL_H = 320;
const ENTRY_H = 18;
// TODO_AUDIT.md Hundred-and-twenty-third pass: CTabGuildAlliance added as tab 4.
// Hundred-and-thirty-sixth pass: Expedition added as tab 5.
const TAB_NAMES = ['Friend', 'Party', 'Guild', 'Block', 'Alliance', 'Exped'];

export interface UserEntry {
  charId: number;
  name: string;
  level: number;
  job: string;
}

export interface PartyEntry { charId: number; name: string; level: number; job: string; isLeader: boolean }
// TODO_AUDIT.md Second/Third passes: GuildJoin/Withdraw/Kick/Admin/Level/
// Expel were all confirmed entirely unused — GuildEntry never carried the
// charId those senders need at all (`GuildMember.characterId` was already
// decoded, just dropped at the GameStage mapping site).
export interface GuildEntry { charId: number; name: string; rank: string; online: boolean }
export interface AllianceEntry { charId: number; name: string; level: number; job: number; grade: number; guildId: number }

const _entryStyle = new TextStyle({ fill: '#CCCCCC', fontSize: 11, fontFamily: 'monospace' });
const _btnStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });

interface ActionButton { label: string; x: number; w: number; onClick: () => void }

export class UserList extends GamePanel {
  private _bg: Graphics;
  private _wzBg: WzSprite | null = null;
  private _titleText: Text;
  private _tabBgs: Graphics[] = [];
  private _tabLabels: Text[] = [];
  private _entries: Text[] = [];
  private _buttons: Text[] = [];
  private _buttonDefs: ActionButton[] = [];
  private _guildNameText: Text;

  private _users: UserEntry[] = [];
  private _party: PartyEntry[] = [];
  private _guild: GuildEntry[] = [];
  private _guildName = '';
  private _blackList: string[] = [];
  private _alliance: AllianceEntry[] = [];
  private _allianceName = '';
  // Expedition tab data
  private _expeditionMembers: { subPartyIdx: number; charId: number; name: string; level: number; job: number }[] = [];

  private _activeTab = 0; // 0 Friend, 1 Party, 2 Guild, 3 Block, 4 Alliance, 5 Expedition
  private _selParty = -1;
  private _selFriend = -1;
  private _selBlock = -1;
  private _selGuild = -1;
  private _selAlliance = -1;
  private _selExped = -1;

  /** Invite by name (Friend tab "Invite" or Party tab "Invite"). */
  onPartyInvite: ((name: string) => void) | null = null;
  onPartyKick: ((charId: number) => void) | null = null;
  onPartyCreate: (() => void) | null = null;
  onPartyLeave: (() => void) | null = null;
  onGuildLeave: (() => void) | null = null;
  onGuildBoard: (() => void) | null = null;
  onGuildInvite: ((name: string) => void) | null = null;
  // Kick/Admin/Expel's real senders take charId + characterName, unlike
  // PartyKick's charId-only shape — pass both rather than have the caller
  // re-look the name up.
  onGuildKick: ((charId: number, name: string) => void) | null = null;
  onGuildAdmin: ((charId: number, name: string) => void) | null = null;
  onGuildExpel: ((charId: number, name: string) => void) | null = null;
  onGuildLevel: ((charId: number, level: number) => void) | null = null;
  onFriendAdd: ((name: string) => void) | null = null;
  onFriendDelete: ((charId: number) => void) | null = null;

  /** Caller supplies the name to invite (e.g. from a text field elsewhere, or a prompt). */
  getInviteName: () => string = () => '';
  getGuildName: () => string = () => '';
  onGuildCreate: ((name: string) => void) | null = null;

  // OG: CTabBlackList::OnAdd/OnDelete (decompile, 0x8d0600/0x8d09e0) —
  // TODO_AUDIT.md Eighty-second pass's `CTabBlackList` finding.
  // Decompile-confirmed purely local (CConfig::AddBlackList/DeleteBlackList,
  // no packet), not a server round trip.
  getBlockName: () => string = () => '';
  onBlockAdd: ((name: string) => void) | null = null;
  onBlockDelete: ((name: string) => void) | null = null;

  // TODO_AUDIT.md Hundred-and-twenty-sixth pass: CTabGuildAlliance action callbacks.
  // Senders confirmed via IDA decompile (CTabGuildAlliance::On* methods,
  // all using COutPacket(0xA7=167)=InHeader.AllianceRequest).
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

  private _clipboard = new ClipboardHelper();

  // Expedition callbacks
  onExpeditionCreate: (() => void) | null = null;
  onExpeditionInvite: ((name: string) => void) | null = null;
  onExpeditionKick: ((charId: number) => void) | null = null;
  onExpeditionWithdraw: (() => void) | null = null;
  onExpeditionChangeBoss: ((charId: number) => void) | null = null;
  getExpeditionInviteName: () => string = () => '';

  setExpedition(members: { subPartyIdx: number; charId: number; name: string; level: number; job: number }[]): void {
    this._expeditionMembers = members;
    this._selExped = -1;
    this._rebuild();
  }

  constructor(loader?: WzTextureLoader, uiWz?: WzPackage | null) {
    super();
    this._root.visible = false;
    this._root.x = 600;
    this._root.y = 100;

    const prop = uiWz?.GetItem('UIWindow2.img/UserList/Main');
    const bgNode = prop instanceof WzProperty ? prop.Get('backgrnd') : null;
    this._wzBg = bgNode instanceof WzCanvas ? (loader ?? new WzTextureLoader()).Load(bgNode) : null;

    this._bg = new Graphics();
    this._root.addChild(this._bg);

    if (this._wzBg) {
      this._root.addChildAt(this._wzBg.ToPixi(), 0);
    }

    this._titleText = new Text({ text: 'Community', style: new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' }) });
    this._titleText.x = 8; this._titleText.y = 5;
    this._root.addChild(this._titleText);

    for (let i = 0; i < TAB_NAMES.length; i++) {
      const g = new Graphics();
      this._tabBgs.push(g);
      this._root.addChild(g);
      const t = new Text({ text: TAB_NAMES[i], style: _btnStyle });
      t.y = 27;
      this._tabLabels.push(t);
      this._root.addChild(t);
    }

    this._guildNameText = new Text({ text: '', style: new TextStyle({ fill: '#9AC2E0', fontSize: 10, fontFamily: 'monospace' }) });
    this._guildNameText.x = 8; this._guildNameText.y = 46;
    this._root.addChild(this._guildNameText);

    this._rebuild();
  }

  setUsers(users: UserEntry[]): void { this._users = users; this._selFriend = -1; this._rebuild(); }
  updateFriendStatus(charId: number, online: boolean): void {
    const entry = this._users.find(u => u.charId === charId);
    if (!entry) return;
    entry.job = online ? 'Online' : 'Offline';
    this._rebuild();
  }
  // TODO_AUDIT.md Hundred-and-sixty-sixth pass: FriendResult UpdateFriend (OG: CWvsContext::CFriend::UpdateFriend decompile/A125D0.c).
  updateFriendEntry(charId: number, channel: number): void {
    const entry = this._users.find(u => u.charId === charId);
    if (!entry) return;
    entry.job = channel >= 0 ? 'Online' : 'Offline';
    this._rebuild();
  }
  // TODO_AUDIT.md Hundred-and-sixty-sixth pass: GuildResult OnlineStatus (OG case 63, decompile/A0D3B0.c).
  updateGuildMemberOnline(charId: number, online: boolean): void {
    const entry = this._guild.find(m => m.charId === charId);
    if (!entry) return;
    entry.online = online;
    this._rebuild();
  }
  setParty(party: PartyEntry[]): void { this._party = party; this._selParty = -1; this._rebuild(); }
  setPartyBoss(bossCharId: number): void {
    let changed = false;
    for (const m of this._party) { const was = m.isLeader; m.isLeader = m.charId === bossCharId; if (was !== m.isLeader) changed = true; }
    if (changed) this._rebuild();
  }

  updatePartyMemberStat(charId: number, level: number, job: string): void {
    const entry = this._party.find((m) => m.charId === charId);
    if (!entry) return;
    entry.level = level;
    entry.job = job;
    this._rebuild();
  }
  setGuild(name: string, members: GuildEntry[]): void { this._guildName = name; this._guild = members; this._selGuild = -1; this._rebuild(); }
  // TODO_AUDIT.md Hundred-and-sixty-seventh pass: GuildResult MemberJoin (OG case 41, decompile/A0D3B0.c).
  addGuildMember(entry: GuildEntry): void {
    if (this._guild.some(m => m.charId === entry.charId)) return;
    this._guild.push(entry);
    this._rebuild();
  }
  removeGuildMember(charId: number): void {
    const idx = this._guild.findIndex(m => m.charId === charId);
    if (idx < 0) return;
    this._guild.splice(idx, 1);
    if (this._selGuild >= this._guild.length) this._selGuild = -1;
    this._rebuild();
  }
  get onlineFriendIds(): Map<number, string> { return new Map(this._users.filter(u => u.job !== 'Offline').map(u => [u.charId, u.name])); }
  get guildMemberIds(): Map<number, string> { return new Map(this._guild.filter(m => m.online).map(m => [m.charId, m.name])); }
  SetBlackList(names: string[]): void { this._blackList = names; this._selBlock = -1; this._rebuild(); }
  setAlliance(name: string, members: AllianceEntry[]): void { this._allianceName = name; this._alliance = members; this._selAlliance = -1; this._rebuild(); }
  get allianceMemberIds(): Map<number, string> { return new Map(this._alliance.map(m => [m.charId, m.name])); }

  private _rebuild(): void {
    this._bg.clear();
    if (!this._wzBg) {
      this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 245 / 255 });
      this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
      this._bg.rect(0, 0, PANEL_W, 22).fill({ color: '#0F1224' });
    }

    const tabW = PANEL_W / TAB_NAMES.length;
    for (let i = 0; i < TAB_NAMES.length; i++) {
      const tx = i * tabW;
      this._tabBgs[i].clear();
      this._tabBgs[i].rect(tx, 24, tabW, 20).fill({ color: i === this._activeTab ? '#26304A' : '#141628' });
      this._tabBgs[i].rect(tx, 24, tabW, 20).stroke({ color: i === this._activeTab ? '#5A6E9A' : '#282D41', width: 1 });
      this._tabLabels[i].x = tx + 8;
    }

    this._guildNameText.text =
      this._activeTab === 2 && this._guildName ? `Guild: ${this._guildName}` :
      this._activeTab === 4 && this._allianceName ? `Alliance: ${this._allianceName}` :
      this._activeTab === 5 ? `Expedition (${this._expeditionMembers.length})` : '';

    for (const t of this._entries) this._root.removeChild(t);
    this._entries = [];
    const listTop = 62;

    if (this._activeTab === 0) {
      this._titleText.text = `Friends (${this._users.length})`;
      for (let i = 0; i < this._users.length && i < 12; i++) {
        const u = this._users[i];
        const t = this._addEntry(`${u.name} (Lv.${u.level})`, listTop + i * ENTRY_H, i === this._selFriend);
        t.eventMode = 'static';
        t.cursor = 'pointer';
        const idx = i;
        t.on('pointerdown', () => { this._selFriend = idx; this._rebuild(); });
      }
    } else if (this._activeTab === 1) {
      this._titleText.text = `Party (${this._party.length}/6)`;
      for (let i = 0; i < this._party.length && i < 12; i++) {
        const p = this._party[i];
        const leaderMark = p.isLeader ? '[L] ' : '';
        const t = this._addEntry(`${leaderMark}${p.name} Lv.${p.level} ${p.job}`, listTop + i * ENTRY_H, i === this._selParty);
        t.eventMode = 'static';
        t.cursor = 'pointer';
        const idx = i;
        t.on('pointerdown', () => { this._selParty = idx; this._rebuild(); });
      }
    } else if (this._activeTab === 2) {
      this._titleText.text = `Guild (${this._guild.length})`;
      for (let i = 0; i < this._guild.length && i < 12; i++) {
        const g = this._guild[i];
        const t = this._addEntry(`${g.name} - ${g.rank}${g.online ? '' : ' (offline)'}`, listTop + i * ENTRY_H, i === this._selGuild);
        t.eventMode = 'static';
        t.cursor = 'pointer';
        const idx = i;
        t.on('pointerdown', () => { this._selGuild = idx; this._rebuild(); });
      }
    } else if (this._activeTab === 3) {
      this._titleText.text = `Blocked (${this._blackList.length})`;
      for (let i = 0; i < this._blackList.length && i < 12; i++) {
        const name = this._blackList[i];
        const t = this._addEntry(name, listTop + i * ENTRY_H, i === this._selBlock);
        t.eventMode = 'static';
        t.cursor = 'pointer';
        const idx = i;
        t.on('pointerdown', () => { this._selBlock = idx; this._rebuild(); });
      }
    } else if (this._activeTab === 4) {
      this._titleText.text = `Alliance (${this._alliance.length})`;
      for (let i = 0; i < this._alliance.length && i < 12; i++) {
        const a = this._alliance[i];
        const t = this._addEntry(`${a.name} Lv.${a.level} [${a.grade}]`, listTop + i * ENTRY_H, i === this._selAlliance);
        t.eventMode = 'static';
        t.cursor = 'pointer';
        const idx = i;
        t.on('pointerdown', () => { this._selAlliance = idx; this._rebuild(); });
      }
    } else if (this._activeTab === 5) {
      this._titleText.text = `Expedition (${this._expeditionMembers.length})`;
      for (let i = 0; i < this._expeditionMembers.length && i < 12; i++) {
        const e = this._expeditionMembers[i];
        const t = this._addEntry(`[SP${e.subPartyIdx}] ${e.name} Lv.${e.level}`, listTop + i * ENTRY_H, i === this._selExped);
        t.eventMode = 'static';
        t.cursor = 'pointer';
        const idx = i;
        t.on('pointerdown', () => { this._selExped = idx; this._rebuild(); });
      }
    }

    this._rebuildButtons();
  }

  private _addEntry(text: string, y: number, selected: boolean): Text {
    const t = new Text({ text, style: selected ? new TextStyle({ fill: '#FFE082', fontSize: 11, fontFamily: 'monospace' }) : _entryStyle });
    t.x = 8; t.y = y;
    this._entries.push(t);
    this._root.addChild(t);
    return t;
  }

  private _rebuildButtons(): void {
    for (const b of this._buttons) this._root.removeChild(b);
    this._buttons = [];
    this._buttonDefs = [];

    const y = PANEL_H - 26;
    let x = 8;
    const add = (label: string, onClick: () => void): void => {
      const t = new Text({ text: `[${label}]`, style: _btnStyle });
      t.x = x; t.y = y;
      t.eventMode = 'static';
      t.cursor = 'pointer';
      t.on('pointerdown', onClick);
      this._buttons.push(t);
      this._buttonDefs.push({ label, x, w: t.width, onClick });
      this._root.addChild(t);
      x += t.width + 10;
    };

    if (this._activeTab === 0) {
      add('Add', () => { const n = this.getInviteName(); if (n.length > 0) this.onFriendAdd?.(n); });
      add('Delete', () => { if (this._selFriend >= 0 && this._selFriend < this._users.length) this.onFriendDelete?.(this._users[this._selFriend].charId); });
      if (this._selFriend >= 0 && this._selFriend < this._users.length) add('Copy', () => { this._clipboard.copy(this._users[this._selFriend].name); });
    } else if (this._activeTab === 1) {
      add('Create', () => this.onPartyCreate?.());
      add('Invite', () => { const n = this.getInviteName(); if (n.length > 0) this.onPartyInvite?.(n); });
      add('Kick', () => { if (this._selParty >= 0 && this._selParty < this._party.length) this.onPartyKick?.(this._party[this._selParty].charId); });
      add('Leave', () => this.onPartyLeave?.());
      if (this._selParty >= 0 && this._selParty < this._party.length) add('Copy', () => { this._clipboard.copy(this._party[this._selParty].name); });
    } else if (this._activeTab === 2 && this._guildName) {
      // OG: CUIGuildBBS — TODO_AUDIT.md Sixty-third pass's finding: the
      // whole guild-message-board protocol was already decoded both
      // directions, just with no UI panel to trigger it from.
      add('Board', () => this.onGuildBoard?.());
      // TODO_AUDIT.md Second/Third passes: GuildJoin (invite)/Kick/Admin/
      // Expel/Level all existed in GameSender.ts with zero callers — no
      // Guild UI had buttons for them at all. `GuildEntry.charId` (just
      // added) is what makes Kick/Admin/Expel/Level resolvable; Invite
      // still resolves the target by name like Party's existing Invite.
      add('Invite', () => { const n = this.getInviteName(); if (n.length > 0) this.onGuildInvite?.(n); });
      add('Kick', () => { if (this._selGuild >= 0 && this._selGuild < this._guild.length) { const g = this._guild[this._selGuild]; this.onGuildKick?.(g.charId, g.name); } });
      add('Admin', () => { if (this._selGuild >= 0 && this._selGuild < this._guild.length) { const g = this._guild[this._selGuild]; this.onGuildAdmin?.(g.charId, g.name); } });
      add('Expel', () => { if (this._selGuild >= 0 && this._selGuild < this._guild.length) { const g = this._guild[this._selGuild]; this.onGuildExpel?.(g.charId, g.name); } });
      add('Level', () => {
        if (this._selGuild < 0 || this._selGuild >= this._guild.length) return;
        const raw = window.prompt('Set member guild rank (1-5):');
        const level = raw === null ? NaN : parseInt(raw, 10);
        if (Number.isFinite(level)) this.onGuildLevel?.(this._guild[this._selGuild].charId, level);
      });
      add('Leave', () => this.onGuildLeave?.());
    } else if (this._activeTab === 2) {
      // OG: GuildRequestAction.Create (decompile/GameSender.GuildCreate) —
      // TODO_AUDIT.md Ninety-second/Hundred-and-eighth passes: the sender
      // existed with zero callers. Wire-shape is name-only (no party-member
      // list), so this follows the same window.prompt() convention as
      // getInviteName above rather than porting CCreateGuildAgreeDlg, which
      // (per a fresh decompile) is actually the *other* party members'
      // agree-to-this-request popup, not the initiator's name-entry UI.
      add('Create', () => { const n = this.getGuildName(); if (n.length > 0) this.onGuildCreate?.(n); });
    } else if (this._activeTab === 3) {
      add('Add', () => { const n = this.getBlockName(); if (n.length > 0) this.onBlockAdd?.(n); });
      add('Delete', () => { if (this._selBlock >= 0 && this._selBlock < this._blackList.length) this.onBlockDelete?.(this._blackList[this._selBlock]); });
    } else if (this._activeTab === 4 && this._allianceName) {
      // TODO_AUDIT.md Hundred-and-twenty-sixth pass: CTabGuildAlliance action buttons.
      // Withdraw/Invite confirmed; Kick/ChangeMaster/GradeChange require a selected member.
      add('Withdraw', () => this.onAllianceWithdraw?.());
      add('Invite', () => { const n = this.getAllianceInviteName(); if (n.length > 0) this.onAllianceInvite?.(n); });
      add('Notice', () => { const t = this.getAllianceNotice(); if (t.length > 0) this.onAllianceSetNotice?.(t); });
      if (this._selAlliance >= 0 && this._selAlliance < this._alliance.length) {
        const a = this._alliance[this._selAlliance];
        add('Whisper', () => this.onAllianceWhisper?.(a.name));
        add('Chat', () => this.onAllianceWhisper?.(a.name));
        add('Party', () => this.onAlliancePartyInvite?.(a.charId, a.name));
        add('Kick', () => this.onAllianceKick?.(a.guildId, a.charId));
        add('Master', () => this.onAllianceChangeMaster?.(a.charId));
        add('G+', () => this.onAllianceGradeChange?.(a.charId, false));
        add('G-', () => this.onAllianceGradeChange?.(a.charId, true));
      }
    } else if (this._activeTab === 5) {
      add('Create', () => {
        const raw = window.prompt('Quest ID for expedition:');
        if (raw !== null) this.onExpeditionCreate?.();
      });
      add('Invite', () => { const n = this.getExpeditionInviteName(); if (n.length > 0) this.onExpeditionInvite?.(n); });
      add('Kick', () => { if (this._selExped >= 0 && this._selExped < this._expeditionMembers.length) this.onExpeditionKick?.(this._expeditionMembers[this._selExped].charId); });
      add('Leave', () => this.onExpeditionWithdraw?.());
      if (this._selExped >= 0 && this._selExped < this._expeditionMembers.length) {
        const e = this._expeditionMembers[this._selExped];
        add('Boss', () => this.onExpeditionChangeBoss?.(e.charId));
      }
    }
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    if (!down) return true;
    if (lx >= PANEL_W - 18 && ly < 22) { this.isVisible = false; return true; }

    if (ly >= 24 && ly < 44) {
      const tabW = PANEL_W / TAB_NAMES.length;
      const tab = Math.floor(lx / tabW);
      if (tab >= 0 && tab < TAB_NAMES.length) { this._activeTab = tab; this._rebuild(); return true; }
    }

    // Buttons/entries are Pixi event-mode 'static' so pointerdown fires directly; just
    // claim the click if it landed inside the panel bounds.
    return lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H;
  }

  onKeyPress(key: string): boolean {
    if (key === 'Escape' && this.isVisible) { this.isVisible = false; return true; }
    return false;
  }
}
