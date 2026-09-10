import { describe, expect, it, vi } from 'vitest';
import { GameStage } from '../../src/stages/GameStage.js';

vi.mock('../../src/wz/WzSound.js', () => ({
  WzSound: class MockWzSound {
    AudioBytes: Uint8Array;
    constructor() { this.AudioBytes = new Uint8Array([7, 7, 7]); }
  },
}));

// OG play_reactor_sound (0x967630): Sound/Reactor.img/<id>/<state>/Hit where
// <id>/<state> is Format(SP2121 "%d/%d", dwTemplateID, nOldState) — RAW decimal
// template id, seType HIT only, positional volume, fired from LoadReactorLayer
// on the hit visual switch.
describe('GameStage reactor hit sound (play_reactor_sound)', () => {
  function makeStage(entries: Record<string, unknown> = {}): any {
    const stage: any = Object.create(GameStage.prototype);
    stage._mobSoundWz = { GetItem: vi.fn((path: string) => entries[path] ?? null) };
    stage.game = { audioPlayer: { PlayEffect: vi.fn() } };
    stage._reactorSoundCache = new Map();
    return stage;
  }

  it('uses the raw decimal template id (no zero-padding)', async () => {
    const { WzSound } = await import('../../src/wz/WzSound.js');
    const sound = new (WzSound as any)();
    const stage = makeStage({ 'Reactor.img/2000/0/Hit': sound });
    stage._playReactorSound(2000, 0);
    expect(stage._mobSoundWz.GetItem).toHaveBeenCalledWith('Reactor.img/2000/0/Hit');
    expect(stage.game.audioPlayer.PlayEffect).toHaveBeenCalledWith(sound.AudioBytes);
  });

  it('addresses per-state Hit nodes for 7-digit templates', async () => {
    const { WzSound } = await import('../../src/wz/WzSound.js');
    const sound = new (WzSound as any)();
    const stage = makeStage({ 'Reactor.img/2002000/3/Hit': sound });
    stage._playReactorSound(2002000, 3);
    expect(stage._mobSoundWz.GetItem).toHaveBeenCalledWith('Reactor.img/2002000/3/Hit');
    expect(stage.game.audioPlayer.PlayEffect).toHaveBeenCalledTimes(1);
  });

  it('caches the resolved node instead of re-resolving per hit', async () => {
    const { WzSound } = await import('../../src/wz/WzSound.js');
    const stage = makeStage({ 'Reactor.img/2002000/0/Hit': new (WzSound as any)() });
    stage._playReactorSound(2002000, 0);
    stage._playReactorSound(2002000, 0);
    expect(stage._mobSoundWz.GetItem).toHaveBeenCalledTimes(1);
    expect(stage.game.audioPlayer.PlayEffect).toHaveBeenCalledTimes(2);
  });

  it('stays silent when the node is missing (e.g. state with no Hit)', () => {
    const stage = makeStage({});
    stage._playReactorSound(2002000, 4);
    expect(stage.game.audioPlayer.PlayEffect).not.toHaveBeenCalled();
  });
});
