import { describe, it, expect } from 'vitest';
import { Container, Graphics, Sprite, Text } from 'pixi.js';
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

  it('BtInfo (2015) and BtFind (2016) sit at explicit OG positions even without WZ', () => {
    const list = new UserList();
    // CTabFriend::CreateButton @0x8BC7C0: BtInfo at (208,285), BtFind at (10,350).
    const info = buttons(list, 0).find((b) => b.id === 2015)!;
    const find = buttons(list, 0).find((b) => b.id === 2016)!;
    expect([info.btn.container.position.x, info.btn.container.position.y]).toEqual([208, 285]);
    expect([find.btn.container.position.x, find.btn.container.position.y]).toEqual([10, 350]);
  });

  it('friend buttons 2017..2024 (except BtMate) start disabled with no selection', () => {
    const list = new UserList();
    list.isVisible = true;
    for (const id of [2017, 2018, 2019, 2020, 2021, 2022, 2024]) {
      const b = buttons(list, 0).find((x) => x.id === id)!;
      expect(b.btn.enabled, `id ${id}`).toBe(false);
    }
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

  it('groups alliance members by guild with per-guild section headers', () => {
    const list = new UserList();
    list.isVisible = true;
    (list as unknown as { _tab: { setTab(t: number): void } })._tab.setTab(4);
    list.setAlliance('Grand Union', [
      { charId: 1, name: 'Alpha', level: 50, job: 110, grade: 1, guildId: 10, guildName: 'Red Guild' },
      { charId: 2, name: 'Beta', level: 60, job: 120, grade: 3, guildId: 10, guildName: 'Red Guild' },
      { charId: 3, name: 'Gamma', level: 40, job: 210, grade: 2, guildId: 20, guildName: 'Blue Guild' },
    ]);
    const texts = list.rows.flatMap((r) => r.children.filter((c) => c instanceof Text).map((c) => (c as Text).text));
    // Per-guild header rows appear before their members (CTabGuildAlliance::Draw).
    const redIdx = texts.findIndex((t) => t.startsWith('Red Guild'));
    const blueIdx = texts.findIndex((t) => t.startsWith('Blue Guild'));
    expect(redIdx).toBeGreaterThanOrEqual(0);
    expect(blueIdx).toBeGreaterThan(redIdx);
    const redMemberIdx = texts.findIndex((t) => t.includes('Alpha'));
    const blueMemberIdx = texts.findIndex((t) => t.includes('Gamma'));
    expect(redMemberIdx).toBeGreaterThan(redIdx);
    expect(blueMemberIdx).toBeGreaterThan(blueIdx);
    expect(texts).toContain('Beta');
    // Grade names via gradeName (1=Master, 2=Jr.Master, 3=Member).
    expect(texts).toContain('Master');
    expect(texts).toContain('Jr.Master');
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

  it('uses Sheet2/1 for member rows and Sheet2/2 for the last row', () => {
    const list = new UserList();
    openPartyTab(list);
    // CTabParty::Draw @0x8C4A30: rows use _244 (Sheet2/1); the section-last row
    // uses _429 (Sheet2/2). Inject sentinel plates with distinguishable origins
    // and assert which variant each row selected.
    const sentinels = [0, 1, 2, 3].map((i) => {
      const s = new Sprite();
      s.position.set(i, 0);
      return s;
    });
    (list as unknown as { _sheets: Record<string, (Sprite | null)[]> })._sheets['Sheet2'] = sentinels;
    list.setParty([
      { charId: 1, name: 'A', level: 10, job: 'Warrior', isLeader: false },
      { charId: 2, name: 'B', level: 20, job: 'Rogue', isLeader: false },
    ]);
    const rows = list.rows;
    expect(rows).toHaveLength(2);
    const plateIdx = (row: Container) => {
      const sp = row.children.find((c) => c instanceof Sprite);
      return sp ? Math.round(sp.position.x) : -1;
    };
    expect(plateIdx(rows[0])).toBe(1); // Sheet2/1 normal
    expect(plateIdx(rows[1])).toBe(2); // Sheet2/2 section-last
  });

  it('draws the leader crown sprite for the party boss', () => {
    const list = new UserList();
    openPartyTab(list);
    const crown = new Sprite();
    (list as unknown as { _partyCrown: Sprite | null })._partyCrown = crown;
    list.setParty([
      { charId: 1, name: 'Boss', level: 33, job: 'Magician', isLeader: true },
      { charId: 2, name: 'Minion', level: 71, job: 'Hermit', isLeader: false },
    ]);
    const bossRow = list.rows[0];
    const minionRow = list.rows[1];
    expect(bossRow.children.some((c) => c instanceof Sprite && c.texture === crown.texture)).toBe(true);
    expect(minionRow.children.some((c) => c instanceof Sprite && c.texture === crown.texture)).toBe(false);
    // Crown sits at absolute x=11 (row-local (1,1)).
    const bossCrown = bossRow.children.find((c) => c instanceof Sprite && c.texture === crown.texture) as Sprite;
    expect([bossCrown.position.x, bossCrown.position.y]).toEqual([1, 1]);
  });

  it('renders sameMap / elseWhere / offline sections in OG order', () => {
    const list = new UserList();
    openPartyTab(list);
    list.setParty([
      { charId: 1, name: 'OfflineGuy', level: 10, job: 'Warrior', isLeader: false, online: false, sameMap: false },
      { charId: 2, name: 'SameMapGuy', level: 20, job: 'Rogue', isLeader: false, online: true, sameMap: true },
      { charId: 3, name: 'ElseWhereGuy', level: 30, job: 'Mage', isLeader: false, online: true, sameMap: false },
    ]);
    const texts = list.rows.flatMap((r) => r.children.filter((c) => c instanceof Text).map((c) => (c as Text).text));
    // sameMap first, then elseWhere, then offline (CTabParty::Draw order).
    expect(texts[0]).toContain('SameMapGuy');
    expect(texts[1]).toContain('ElseWhereGuy');
    expect(texts[2]).toContain('OfflineGuy');
  });

  it('caps only the last section row with Sheet2/2 when sections follow', () => {
    const list = new UserList();
    openPartyTab(list);
    const sentinels = [0, 1, 2, 3].map((i) => {
      const s = new Sprite();
      s.position.set(i, 0);
      return s;
    });
    (list as unknown as { _sheets: Record<string, (Sprite | null)[]> })._sheets['Sheet2'] = sentinels;
    // sameMap + elseWhere present: sameMap's last row is NOT capped (_244), the
    // elseWhere section's last row IS (_429). Offline empty.
    list.setParty([
      { charId: 1, name: 'A', level: 10, job: 'Warrior', isLeader: false, online: true, sameMap: true },
      { charId: 2, name: 'B', level: 20, job: 'Rogue', isLeader: false, online: true, sameMap: false },
    ]);
    const rows = list.rows;
    const plateIdx = (row: Container) => {
      const sp = row.children.find((c) => c instanceof Sprite);
      return sp ? Math.round(sp.position.x) : -1;
    };
    expect(plateIdx(rows[0])).toBe(1); // sameMap last row: _244 (elseWhere follows)
    expect(plateIdx(rows[1])).toBe(2); // elseWhere last row: _429 cap
  });

  it('shows the "%d/%d" online count right-aligned ending x=220 y=68', () => {
    const list = new UserList();
    openPartyTab(list);
    list.setParty([
      { charId: 1, name: 'A', level: 10, job: 'Warrior', isLeader: false, online: true, sameMap: true },
      { charId: 2, name: 'B', level: 20, job: 'Rogue', isLeader: false, online: true, sameMap: false },
      { charId: 3, name: 'C', level: 30, job: 'Mage', isLeader: false, online: false, sameMap: false },
    ]);
    const count = (list as unknown as { _countText: Text })._countText;
    expect(count.text).toBe('1/3');
    expect(count.y).toBe(68);
    expect(count.x).toBeLessThanOrEqual(220);
  });

  it('draws the partyOn header plate as the fixed party title row', () => {
    const list = new UserList();
    openPartyTab(list);
    const plate = new Sprite();
    (list as unknown as { _partyHeader: Sprite | null })._partyHeader = plate;
    list.setParty([{ charId: 1, name: 'A', level: 10, job: 'Warrior', isLeader: false }]);
    const header = (list as unknown as { _headerLayer: Container })._headerLayer;
    expect(header.children.some((c) => c instanceof Sprite && c.texture === plate.texture)).toBe(true);
  });

  it('draws the SEL_FILL selection rect on the selected party row', () => {
    const list = new UserList();
    openPartyTab(list);
    list.setParty([
      { charId: 1, name: 'A', level: 10, job: 'Warrior', isLeader: false },
      { charId: 2, name: 'B', level: 20, job: 'Rogue', isLeader: false },
    ]);
    selectRowByText(list, 'A');
    const rows = list.rows;
    const selectedFill = (row: Container) => row.children.filter((c) => c instanceof Graphics).length;
    // The fallback plate is a Graphics; the selected row adds the SEL_FILL on top.
    expect(selectedFill(rows[0])).toBe(2);
    expect(selectedFill(rows[1])).toBe(1);
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

  it('BtInfo (2015) fires onAccountMoreInfo (OG UI_Open(40))', () => {
    const list = new UserList();
    list.isVisible = true;
    let opened = 0;
    list.onAccountMoreInfo = () => { opened++; };
    click(list, 0, 'Info');
    expect(opened).toBe(1);
  });

  it('BtMod (2017) regroups the selected friend through onFriendAddGroup', () => {
    const list = new UserList();
    list.isVisible = true;
    list.setUsers([{ charId: 1, name: 'Alice', level: 30, job: 'Magician' }]);
    list.getInviteName = () => 'Guildies';
    let regrouped: string | null = null;
    list.onFriendAddGroup = (group) => { regrouped = group; };
    selectRowByText(list, 'Alice');
    click(list, 0, 'Mod');
    expect(regrouped).toBe('Guildies');
  });

  it('friendNameOfSelected exposes the selected friend name', () => {
    const list = new UserList();
    list.setUsers([{ charId: 1, name: 'Alice', level: 30, job: 'Magician' }]);
    expect(list.friendNameOfSelected).toBe(null);
    selectRowByText(list, 'Alice');
    expect(list.friendNameOfSelected).toBe('Alice');
  });
});
