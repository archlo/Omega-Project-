import { describe, expect, it, vi } from 'vitest';
import { CharCreationStage } from '../../src/stages/CharCreationStage.js';
import { LoginSender } from '../../src/net/senders/LoginSender.js';
import { InHeader } from '../../src/net/packet/OpCodes.js';
import { InPacket } from '../../src/net/packet/InPacket.js';

// OG ground truth: CLogin::SendNewCharPacket (normal branch, opcode 22) =
// str name, int race, short subJob, 8x int GetSelectedAL(0..7) (appearance
// item ids from MakeCharInfo), byte gender. Only Dual Blade (uiRace 0,
// server race 1) sends subJob 1 — CUINewCharRaceSelect::SelectRaceButton.

function makeStage(over: Record<string, any> = {}): any {
  const stage: any = Object.create(CharCreationStage.prototype);
  stage._raceIndex = 1;
  stage._male = true;
  stage._sel = new Array(9).fill(0);
  stage._checkedName = '';
  stage._checkingName = false;
  stage._subScreen = 1; // Look
  stage._makeChar = { Options: () => [0] };
  stage._forbidden = { IsForbidden: () => false };
  stage._nameField = { text: 'Abcd', isFocused: false };
  stage._notice = { show: vi.fn() };
  stage.game = { session: { isConnected: true, send: vi.fn() } };
  Object.assign(stage, over);
  return stage;
}

describe('CharCreation OG parity', () => {
  it('CreateNewCharacter wire order matches SendNewCharPacket (22)', () => {
    const p = new InPacket(
      LoginSender.CreateNewCharacter('Abcd', 1, 20000, 30030, 7, 0, 1000000, 1000000, 1000000, 1302000, true, 0).toArray(),
    );
    expect(p.readShort()).toBe(InHeader.CreateNewCharacter);
    expect(p.readString()).toBe('Abcd');
    expect(p.readInt()).toBe(1);
    expect(p.readShort()).toBe(0);
    expect(p.readInt()).toBe(20000); // AL0 face
    expect(p.readInt()).toBe(30030); // AL1 hair base
    expect(p.readInt()).toBe(7); // AL2 hair color
    expect(p.readInt()).toBe(0); // AL3 skin
    expect(p.readInt()).toBe(1000000); // AL4 coat
    expect(p.readInt()).toBe(1000000); // AL5 pants
    expect(p.readInt()).toBe(1000000); // AL6 shoes
    expect(p.readInt()).toBe(1302000); // AL7 weapon
    expect(p.readByte()).toBe(0); // male = 0
    expect(p.remaining).toBe(0);
  });

  it('sends subJob 1 only for Dual Blade (uiRace 0)', () => {
    for (const [uiRace, srace, subJob] of [[0, 1, 1], [1, 1, 0], [5, 0, 0], [2, 2, 0]] as const) {
      const stage = makeStage({ _raceIndex: uiRace, _checkedName: 'Abcd', _nameField: { text: 'Abcd' } });
      stage._sendCreate();
      const sent = stage.game.session.send.mock.calls[0][0];
      const p = new InPacket(sent.toArray());
      expect(p.readShort()).toBe(22);
      expect(p.readString()).toBe('Abcd');
      expect(p.readInt()).toBe(srace);
      expect(p.readShort()).toBe(subJob);
    }
  });

  it('re-runs the name check when the live name differs from the checked name', () => {
    const stage = makeStage({
      _checkedName: 'Abcd',
      _nameField: { text: 'Abcde', isFocused: false },
    });
    stage._sendCreate();
    const sent = stage.game.session.send.mock.calls[0][0];
    const p = new InPacket(sent.toArray());
    // CheckDuplicatedID (21), not CreateNewCharacter (22)
    expect(p.readShort()).toBe(InHeader.CheckDuplicatedID);
    expect(p.readString()).toBe('Abcde');
    expect(stage._subScreen).toBe(0); // back to Name screen
    expect(stage._checkedName).toBe('');
  });

  it('builds hair OG-style: AL[2] + 10 * (AL[1] / 10)', () => {
    const byCat: Record<number, number[]> = { 0: [20000], 1: [30031], 2: [7], 3: [0], 4: [0], 5: [0], 6: [0], 7: [0] };
    const stage = makeStage({ _makeChar: { Options: (_s: string, _m: boolean, cat: number) => byCat[cat] ?? [0] } });
    const look = stage._buildLook();
    // 10 * floor(30031 / 10) + 7 = 30037 (naive add would give 30038)
    expect(look.hair).toBe(30037);
  });

  it('maps create-failure 30 to invalid-name (not already-in-use)', () => {
    const stage = makeStage({ _subScreen: 1, _checkedName: 'Abcd' });
    stage._onCreateCharacterResult({ success: false, resultCode: 30 });
    expect(stage._notice.show).toHaveBeenCalledWith('This name cannot be used.');
    expect(stage._subScreen).toBe(0);
    expect(stage._checkedName).toBe('');
  });

  it('maps create-failure 10 to the character-limit message', () => {
    const stage = makeStage({ _subScreen: 1 });
    stage._onCreateCharacterResult({ success: false, resultCode: 10 });
    expect(stage._notice.show).toHaveBeenCalledWith('You cannot create any more characters.');
  });
});
