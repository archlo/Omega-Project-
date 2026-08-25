import { describe, it, expect } from 'vitest';
import { Container, Text } from 'pixi.js';
import { UserList } from '../../../src/ui/game/UserList.js';

// ponytail: avoids pulling in jsdom just to satisfy Text.width's canvas measurement in tests
Object.defineProperty(Text.prototype, 'width', { get: () => 0 });

type Btn = { btn: { label: string; onClick: (() => void) | null; container: Container; enabled: boolean }; id: number };

function buttons(list: UserList, tab: number): Btn[] {
  return ((list as unknown as { _tabButtons: Map<number, Btn[]> })._tabButtons.get(tab) ?? []);
}

function click(list: UserList, tab: number, label: string): void {
  const b = buttons(list, tab).find((x) => x.btn.label === label);
  expect(b, `button "${label}" on tab ${tab}`).toBeDefined();
  b!.btn.onClick!();
}

function selectRowByText(list: UserList, text: string): void {
  const rows = list.rows;
  const row = rows.find((r) =>
    r.children.some((c) => c instanceof Text && c.text.includes(text)));
  expect(row, `row containing "${text}"`).toBeDefined();
  row!.emit('pointerdown');
}

// OG CUIUserList (v95 IDB): window 264x382, tabs Friend(0) Party(1)
// Expedition(2) Guild(3) Alliance(4) BlackList(5), per-tab button arrays with
// the OnButtonClicked ids (CTabFriend::OnButtonClicked @0x8D9410 etc.).
describe('UserList authentic structure', () => {
  it('tab strip sits at (9,25) sized 250x19 with the OG 6 tabs', () => {
    const list = new UserList();
    const tab = (list as unknown as { _tab: { x: number; y: number; width: number; height: number; itemCount: number } })._tab;
    expect([tab.x, tab.y, tab.width, tab.height]).toEqual([9, 25, 250, 19]);
    expect(tab.itemCount).toBe(6);
  });

  it('creates the OG button ids per tab (2010.. / 2200.. / 2030.. / 2050.. / 2150)', () => {
    const list = new UserList();
    expect(buttons(list, 0).map((b) => b.id)).toEqual([2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]);
    expect(buttons(list, 1).map((b) => b.id)).toEqual([2200, 2201, 2202, 2203, 2204, 2205, 2206, 2207, 2208]);
    expect(buttons(list, 3).map((b) => b.id)).toEqual([2030, 2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038, 2039, 2041, 2040, 2042]);
    expect(buttons(list, 4).map((b) => b.id)).toEqual([2050, 2052, 2051, 2053, 2054, 2060, 2056, 2057, 2055, 2059, 2058]);
    expect(buttons(list, 5).map((b) => b.id)).toEqual([2150, 2151]);
  });

  it('SetButton model: only the active tab shows its buttons; BtMate stays hidden', () => {
    const list = new UserList();
    list.isVisible = true;
    (list as unknown as { _tab: { setTab(t: number): void } })._tab.setTab(3);
    const anyFriendVisible = buttons(list, 0).some((b) => b.btn.container.visible);
    const allGuildVisible = buttons(list, 3).every((b) => b.btn.container.visible);
    const mate = buttons(list, 0).find((b) => b.id === 2023)!;
    expect(anyFriendVisible).toBe(false);
    expect(allGuildVisible).toBe(true);
    expect(mate.btn.container.visible).toBe(false);
  });

  it('selection-gated buttons start disabled until a row is selected', () => {
    const list = new UserList();
    list.isVisible = true;
    (list as unknown as { _tab: { setTab(t: number): void } })._tab.setTab(3);
    const kick = buttons(list, 3).find((b) => b.id === 2031)!;
    expect(kick.btn.enabled).toBe(false);
    list.setGuild('My Guild', [{ charId: 42, name: 'Bob', rank: 'Jr.Master', online: true }]);
    selectRowByText(list, 'Bob');
    expect(kick.btn.enabled).toBe(true);
  });
});

// TODO_AUDIT.md Ninety-second/Hundred-and-eighth passes: GameSender.GuildCreate
// wiring through the community panel.
describe('UserList guild tab actions', () => {
  function openGuildTab(list: UserList): void {
    list.isVisible = true;
    (list as unknown as { _tab: { setTab(t: number): void } })._tab.setTab(3);
  }

  it('has no inline Create button — v95 guild creation uses the Guild_Make dialog', () => {
    const list = new UserList();
    openGuildTab(list);
    // CTabGuild::CreateButton makes exactly 13 buttons; none is a create.
    const labels = buttons(list, 3).map((b) => b.btn.label);
    expect(labels).not.toContain('Create');
    expect(buttons(list, 3)).toHaveLength(13);
  });

  it('Kick passes the selected member charId and name (id 2031)', () => {
    const list = new UserList();
    list.setGuild('My Guild', [{ charId: 42, name: 'Bob', rank: 'Member', online: true }]);
    openGuildTab(list);
    selectRowByText(list, 'Bob');
    let kicked: [number, string] | null = null;
    list.onGuildKick = (id, name) => { kicked = [id, name]; };
    click(list, 3, 'Kick');
    expect(kicked).toEqual([42, 'Bob']);
  });

  it('BtBoard/BBS opens the guild board', () => {
    const list = new UserList();
    openGuildTab(list);
    let opened = 0;
    list.onGuildBoard = () => { opened++; };
    click(list, 3, 'Brd');
    click(list, 3, 'BBS');
    expect(opened).toBe(2);
  });

  it('grade change sends the clamped rank delta (ids 2033/2034)', () => {
    const list = new UserList();
    list.setGuild('G', [{ charId: 7, name: 'C', rank: 'Jr.Master', online: true }]);
    openGuildTab(list);
    selectRowByText(list, 'C');
    let sent: [number, number] | null = null;
    (list as unknown as { onPartyChangeBoss: unknown });
    // GameStage computes the delta; here verify the callback shape.
    list.onGuildGradeChange = (charId, up) => { sent = [charId, up ? 1 : 0]; };
    click(list, 3, 'G+');
    expect(sent).toEqual([7, 1]);
    click(list, 3, 'G-');
    expect(sent).toEqual([7, 0]);
  });

  it('Invite uses the prompt-provided name without a selection', () => {
    const list = new UserList();
    list.setGuild('My Guild', []);
    openGuildTab(list);
    let invited: string | null = null;
    list.getInviteName = () => 'Alice';
    list.onGuildInvite = (name) => { invited = name; };
    click(list, 3, 'Invt');
    expect(invited).toBe('Alice');
  });

  it('renders online/offline sections with grade column text', () => {
    const list = new UserList();
    list.setGuild('G', [
      { charId: 1, name: 'OnlineGuy', rank: 'Member', online: true },
      { charId: 2, name: 'OfflineGuy', rank: 'Master', online: false },
    ]);
    openGuildTab(list);
    const texts = list.rows.flatMap((r) => r.children.filter((c) => c instanceof Text).map((c) => (c as Text).text));
    expect(texts.some((t) => t.startsWith('Online'))).toBe(true);
    expect(texts.some((t) => t.startsWith('Offline'))).toBe(true);
    expect(texts).toContain('OnlineGuy');
    expect(texts).toContain('OfflineGuy');
    expect(texts).toContain('Master');   // grade column
    expect(texts).toContain('Member');
  });
});

// TODO_AUDIT.md Eighty-second pass: CTabBlackList local-only ignore list.
describe('UserList block tab', () => {
  function openBlockTab(list: UserList): void {
    list.isVisible = true;
    (list as unknown as { _tab: { setTab(t: number): void } })._tab.setTab(5);
  }

  it('adds a name via the Add button (id 2150)', () => {
    const list = new UserList();
    openBlockTab(list);
    let added: string | null = null;
    list.getBlockName = () => 'Annoying';
    list.onBlockAdd = (name) => { added = name; };
    click(list, 5, 'Add');
    expect(added).toBe('Annoying');
  });

  it('deletes the selected blocked name (id 2151)', () => {
    const list = new UserList();
    list.SetBlackList(['Annoying']);
    openBlockTab(list);
    selectRowByText(list, 'Annoying');
    let deleted: string | null = null;
    list.onBlockDelete = (name) => { deleted = name; };
    click(list, 5, 'Del');
    expect(deleted).toBe('Annoying');
  });
});

// Community panel party tab - the data path server PARTYDATA feeds
// (GameStage.onPartyLoad -> UserList.setParty).
describe('UserList party tab', () => {
  function openPartyTab(list: UserList): void {
    list.isVisible = true;
    (list as unknown as { _tab: { setTab(t: number): void } })._tab.setTab(1);
  }

  it('renders member rows with the leader marked (*)', () => {
    const list = new UserList();
    openPartyTab(list);
    list.setParty([
      { charId: 1001, name: 'BossPerson', level: 33, job: 'Magician', isLeader: true },
      { charId: 2002, name: 'MemberTwo', level: 71, job: 'Hermit', isLeader: false },
    ]);
    const texts = list.rows.flatMap((r) => r.children.filter((c) => c instanceof Text).map((c) => (c as Text).text));
    const bossRow = texts.find((t) => t.includes('BossPerson'));
    expect(bossRow).toBeDefined();
    expect(bossRow!.startsWith('*')).toBe(true);
    expect(texts.some((t) => t.includes('MemberTwo') && !t.startsWith('*'))).toBe(true);
  });

  it('setPartyBoss moves the leader marker', () => {
    const list = new UserList();
    openPartyTab(list);
    list.setParty([
      { charId: 1001, name: 'A', level: 10, job: 'Warrior', isLeader: true },
      { charId: 2002, name: 'B', level: 20, job: 'Rogue', isLeader: false },
    ]);
    list.setPartyBoss(2002);
    const texts = list.rows.flatMap((r) => r.children.filter((c) => c instanceof Text).map((c) => (c as Text).text));
    expect(texts.find((t) => t.includes('B'))!.startsWith('*')).toBe(true);
    expect(texts.find((t) => t.includes('A'))!.startsWith('*')).toBe(false);
  });

  it('updatePartyMemberStat refreshes level/job in place', () => {
    const list = new UserList();
    openPartyTab(list);
    list.setParty([{ charId: 1001, name: 'A', level: 10, job: 'Warrior', isLeader: false }]);
    list.updatePartyMemberStat(1001, 11, 'Fighter');
    const texts = list.rows.flatMap((r) => r.children.filter((c) => c instanceof Text).map((c) => (c as Text).text));
    const row = texts.find((t) => /^A/.test(t))!;
    expect(row).toContain('Fighter');
    expect(row).toContain('11');
  });
});

// CTabFriend::Draw @0x8C2CD0 — two-column group layout + count header.
describe('UserList friend tab', () => {
  it('renders groups with headers and two-column member cells', () => {
    const list = new UserList();
    list.isVisible = true;
    list.setUsers([
      { charId: 1, name: 'Alice', level: 30, job: 'Magician' },
      { charId: 2, name: 'Bob', level: 40, job: 'Warrior' },
      { charId: 3, name: 'Carol', level: 50, job: 'Bowman', group: 'Guildies' },
    ]);
    const texts = list.rows.flatMap((r) => r.children.filter((c) => c instanceof Text).map((c) => (c as Text).text));
    expect(texts.some((t) => t.startsWith('Friends ('))).toBe(true);
    expect(texts.some((t) => t.startsWith('Guildies ('))).toBe(true);
    expect(texts).toContain('Alice');
    expect(texts).toContain('Carol');

    // Count header "(n)" ends near x=242 at y=68 (right-aligned black text).
    const count = (list as unknown as { _countText: Text })._countText;
    expect(count.y).toBe(68);
    expect(count.x).toBeLessThanOrEqual(242);
  });

  it('clicking a group header folds it', () => {
    const list = new UserList();
    list.setUsers([{ charId: 1, name: 'Alice', level: 30, job: 'Magician' }]);
    const header = list.rows[0];
    header.emit('pointerdown');
    const texts = list.rows.flatMap((r) => r.children.filter((c) => c instanceof Text).map((c) => (c as Text).text));
    expect(texts.some((t) => t.includes('Alice'))).toBe(false);
  });
});
