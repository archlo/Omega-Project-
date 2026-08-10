import { describe, expect, it, vi } from 'vitest';
import { GameStage } from '../../src/stages/GameStage.js';

// Friend-list → minimap stalkee fallback. The server never broadcasts
// StalkResult in a form our OnStalkResult decoder can parse (it replies to
// the payload-less minimap-click opcode 166 with a single-entry find-friend
// packet instead of the count→array CField::OnStalkResult @0x539910 format),
// so online friends present in the field are fed to CUIMiniMap::InsertStalkee
// directly. These tests pin that wiring.
function makeStage(): any {
  const stage: any = Object.create(GameStage.prototype);
  stage._onlineFriends = new Map();
  stage._friendStalkeeIds = new Set();
  stage._otherChars = new Map();
  stage._miniMap = { insertStalkee: vi.fn(), removeStalkee: vi.fn() };
  stage._userList = { setUsers: vi.fn(), updateFriendStatus: vi.fn(), updateFriendEntry: vi.fn() };
  stage._notice = null;
  stage._chatBalloon = null;
  stage._itemEffects = { RemoveCharacter: vi.fn() };
  stage._removePetsForOwner = vi.fn();
  return stage;
}

const onlineFriend = (charId: number, name: string, online: boolean) => ({
  charId, name, flag: 0, channel: 1, online, group: 'Friends',
});

describe('GameStage friend → minimap stalkee fallback', () => {
  it('feeds in-field online friends into InsertStalkee with live positions', () => {
    const stage = makeStage();
    stage.onFriendList([onlineFriend(101, 'Alice', true), onlineFriend(102, 'Bob', false)]);
    stage._otherChars.set(101, { Position: { x: 300, y: 400 } });
    stage._syncFriendStalkees();
    expect(stage._miniMap.insertStalkee).toHaveBeenCalledWith(101, 'Alice', 300, 400);
    // Offline friends are filtered — Bob was never online.
    expect(stage._miniMap.insertStalkee).not.toHaveBeenCalledWith(102, expect.any(String), expect.anything(), expect.anything());
    expect(stage._friendStalkeeIds.has(101)).toBe(true);
  });

  it('skips online friends not currently in the field (server stalk still owns those)', () => {
    const stage = makeStage();
    stage.onFriendList([onlineFriend(101, 'Alice', true)]);
    stage._syncFriendStalkees();
    expect(stage._miniMap.insertStalkee).not.toHaveBeenCalled();
  });

  it('onFriendStatusChanged offline removes the stalkee immediately', () => {
    const stage = makeStage();
    stage._onlineFriends.set(101, 'Alice');
    stage._friendStalkeeIds.add(101);
    stage.onFriendStatusChanged({ charId: 101, online: false });
    expect(stage._miniMap.removeStalkee).toHaveBeenCalledWith(101);
    expect(stage._onlineFriends.has(101)).toBe(false);
  });

  it('_onUserLeave removes the stalkee when a friend leaves the field', () => {
    const stage = makeStage();
    stage._friendStalkeeIds.add(101);
    stage._otherChars.set(101, {});
    stage._onUserLeave(101);
    expect(stage._miniMap.removeStalkee).toHaveBeenCalledWith(101);
    expect(stage._friendStalkeeIds.has(101)).toBe(false);
  });
});