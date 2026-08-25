import { describe, it, expect } from 'vitest';
import { Text } from 'pixi.js';
import { UserList } from '../../../src/ui/game/UserList.js';

// ponytail: avoids pulling in jsdom just to satisfy Text.width's canvas measurement in tests
Object.defineProperty(Text.prototype, 'width', { get: () => 0 });

// TODO_AUDIT.md Ninety-second/Hundred-and-eighth passes: GameSender.GuildCreate
// existed with zero callers — this is the missing "Create" button wiring.
describe('UserList guild tab', () => {
  // OG tab order: Friend(0), Party(1), Expedition(2), Guild(3), Alliance(4), BlackList(5)
  // Panel: 264×382, root at (300,100), tab bar at y=9
  function openGuildTab(list: UserList): void {
    list.isVisible = true;
    list.handleMouseButton(300 + 3 * (264 / 6) + 1, 100 + 14, true); // Guild tab = index 3
  }

  function clickButton(list: UserList, label: string): void {
    const btn = (list as any)._buttons.find((t: any) => {
      const txt = t.children?.find((c: any) => c.text === label);
      return txt !== undefined;
    });
    expect(btn).toBeDefined();
    btn.emit('pointerdown');
  }

  it('shows a Create button (not Leave) when the player has no guild', () => {
    const list = new UserList();
    openGuildTab(list);
    let created: string | null = null;
    list.getGuildName = () => 'My Guild';
    list.onGuildCreate = (name) => { created = name; };
    clickButton(list, 'Create');
    expect(created).toBe('My Guild');
  });

  it('shows a Leave button once the player is in a guild', () => {
    const list = new UserList();
    list.setGuild('Existing Guild', []);
    openGuildTab(list);
    let left = false;
    list.onGuildLeave = () => { left = true; };
    clickButton(list, 'Leave');
    expect(left).toBe(true);
  });

  it('does not send a create request for an empty name', () => {
    const list = new UserList();
    openGuildTab(list);
    let called = false;
    list.getGuildName = () => '';
    list.onGuildCreate = () => { called = true; };
    clickButton(list, 'Create');
    expect(called).toBe(false);
  });

  // TODO_AUDIT.md Second/Third passes: GuildJoin(invite)/Kick/Admin/Expel/
  // Level all existed with zero callers — GuildEntry didn't even carry the
  // charId those senders need.
  it('Kick/Admin/Expel pass the selected member\'s charId and name', () => {
    const list = new UserList();
    list.setGuild('My Guild', [{ charId: 42, name: 'Bob', rank: 'Member', online: true }]);
    openGuildTab(list);
    (list as any)._entries[0].emit('pointerdown'); // select the member row

    let kicked: [number, string] | null = null;
    list.onGuildKick = (id, name) => { kicked = [id, name]; };
    clickButton(list, 'Kick');
    expect(kicked).toEqual([42, 'Bob']);

    let admined: [number, string] | null = null;
    list.onGuildAdmin = (id, name) => { admined = [id, name]; };
    clickButton(list, 'Admin');
    expect(admined).toEqual([42, 'Bob']);

    let expelled: [number, string] | null = null;
    list.onGuildExpel = (id, name) => { expelled = [id, name]; };
    clickButton(list, 'Expel');
    expect(expelled).toEqual([42, 'Bob']);
  });

  it('Invite sends the prompted name without needing a selection', () => {
    const list = new UserList();
    list.setGuild('My Guild', []);
    openGuildTab(list);
    let invited: string | null = null;
    list.getInviteName = () => 'Alice';
    list.onGuildInvite = (name) => { invited = name; };
    clickButton(list, 'Invite');
    expect(invited).toBe('Alice');
  });
});

// TODO_AUDIT.md Eighty-second pass: CTabBlackList — local-only ignore list
// (CConfig::AddBlackList/DeleteBlackList, decompile-confirmed no packet).
describe('UserList block tab', () => {
  // OG tab order: Friend(0), Party(1), Expedition(2), Guild(3), Alliance(4), BlackList(5)
  function openBlockTab(list: UserList): void {
    list.isVisible = true;
    list.handleMouseButton(300 + 5 * (264 / 6) + 1, 100 + 14, true); // BlackList tab = index 5
  }

  function clickButton(list: UserList, label: string): void {
    const btn = (list as any)._buttons.find((t: any) => {
      const txt = t.children?.find((c: any) => c.text === label);
      return txt !== undefined;
    });
    expect(btn).toBeDefined();
    btn.emit('pointerdown');
  }

  it('adds a name via the Add button', () => {
    const list = new UserList();
    openBlockTab(list);
    let added: string | null = null;
    list.getBlockName = () => 'Annoying';
    list.onBlockAdd = (name) => { added = name; };
    clickButton(list, 'Add');
    expect(added).toBe('Annoying');
  });

  it('deletes the selected blocked name', () => {
    const list = new UserList();
    list.SetBlackList(['Annoying']);
    openBlockTab(list);
    const entry = (list as any)._entries.find((t: any) => t.text === 'Annoying');
    entry.emit('pointerdown');
    let deleted: string | null = null;
    list.onBlockDelete = (name) => { deleted = name; };
    clickButton(list, 'Delete');
    expect(deleted).toBe('Annoying');
  });
});

// Community panel party tab - the data path the server PARTYDATA load feeds
// (GameStage.onPartyLoad -> UserList.setParty).
describe('UserList party tab', () => {
  function openPartyTab(list: UserList): void {
    list.isVisible = true;
    (list as any)._tab.setTab(1); // Party tab = index 1
    (list as any)._rebuild();
  }

  it('renders member rows with the leader marked', () => {
    const list = new UserList();
    openPartyTab(list);
    list.setParty([
      { charId: 1001, name: 'BossPerson', level: 33, job: 'Magician', isLeader: true },
      { charId: 2002, name: 'MemberTwo', level: 71, job: 'Hermit', isLeader: false },
    ]);
    const texts = (list as any)._entries.map((t: any) => t.text);
    expect(texts.some((t: string) => t.includes('BossPerson'))).toBe(true);
    expect(texts.some((t: string) => t.includes('MemberTwo'))).toBe(true);
    expect(texts.find((t: string) => t.includes('BossPerson'))).toContain('[L]');
  });

  it('setPartyBoss moves the leader marker', () => {
    const list = new UserList();
    openPartyTab(list);
    list.setParty([
      { charId: 1001, name: 'A', level: 10, job: 'Warrior', isLeader: true },
      { charId: 2002, name: 'B', level: 20, job: 'Rogue', isLeader: false },
    ]);
    list.setPartyBoss(2002);
    const texts = (list as any)._entries.map((t: any) => t.text);
    expect(texts.find((t: string) => t.includes('B '))).toContain('[L]');
    expect(texts.find((t: string) => t.includes('A '))).not.toContain('[L]');
  });

  it('updatePartyMemberStat refreshes level/job in place', () => {
    const list = new UserList();
    openPartyTab(list);
    list.setParty([{ charId: 1001, name: 'A', level: 10, job: 'Warrior', isLeader: false }]);
    list.updatePartyMemberStat(1001, 11, 'Fighter');
    const row = (list as any)._entries.find((t: any) => /^A /.test(t.text));
    expect(row.text).toContain('Fighter');
    expect(row.text).toContain('Lv.11');
  });
});
