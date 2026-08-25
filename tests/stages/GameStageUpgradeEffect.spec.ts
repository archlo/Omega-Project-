import { describe, expect, it, vi } from 'vitest';
import { GameStage } from '../../src/stages/GameStage.js';
import { WzSound } from '../../src/wz/WzSound.js';

// OG: CUser::ShowItemUpgradeEffect (@0x8E7B00) — local users get the
// StringPool chat lines (lType 12); every viewer gets the
// EnchantSuccess/EnchantFailure game sound plus the
// Effect/BasicEff.img/Enchant/{Success|Failure} one-time animation
// (CAnimationDisplayer::Effect_ItemUpgrade) over the upgrading character.
describe('GameStage item upgrade effect (ShowItemUpgradeEffect)', () => {
  function makeStage(): any {
    const stage: any = Object.create(GameStage.prototype);
    stage._localCharId = 7;
    stage._chatBar = { addLine: vi.fn() };
    const animNodes: Record<string, unknown> = {
      'BasicEff.img/Enchant/Success': { node: 'success' },
      'BasicEff.img/Enchant/Failure': { node: 'failure' },
    };
    stage._effectWz = { GetItem: (path: string) => animNodes[path] ?? null };
    stage._skillEffects = { PlayAtCaster: vi.fn() };
    const sound = Object.create(WzSound.prototype);
    Object.defineProperty(sound, 'AudioBytes', {
      get: () => new Uint8Array([1, 2, 3]),
      configurable: true,
    });
    stage._mobSoundWz = {
      GetItem: vi.fn((path: string) => (path.startsWith('Game.img/Enchant') ? sound : null)),
    };
    stage.game = { audioPlayer: { PlayEffect: vi.fn() } };
    return stage;
  }

  it('local success: scroll message, Success animation, EnchantSuccess sound', () => {
    const s = makeStage();
    s._showItemUpgradeEffect(7, 1, false, false, 0, false);
    expect(s._chatBar.addLine).toHaveBeenCalledTimes(1);
    expect(s._chatBar.addLine.mock.calls[0][0]).toContain('mysterious power has been transferred');
    expect(s._skillEffects.PlayAtCaster).toHaveBeenCalledWith({ node: 'success' }, 7);
    expect(s._mobSoundWz.GetItem).toHaveBeenCalledWith('Game.img/EnchantSuccess');
    expect(s.game.audioPlayer.PlayEffect).toHaveBeenCalledTimes(1);
  });

  it('message matrix: cursed destroy / white-scroll fail / enchant-category extra line', () => {
    const s = makeStage();
    s._showItemUpgradeEffect(7, 0, true, false, 0, false);
    expect(s._chatBar.addLine.mock.calls[0][0]).toContain('item is destroyed');

    s._chatBar.addLine.mockClear();
    s._showItemUpgradeEffect(7, 0, false, false, 0, true);
    expect(s._chatBar.addLine.mock.calls[0][0]).toContain('White Scroll was used');

    // enchantCategory & 2 appends the second-line matrix
    s._chatBar.addLine.mockClear();
    s._showItemUpgradeEffect(7, 1, false, false, 2, false);
    expect(s._chatBar.addLine).toHaveBeenCalledTimes(2);
    expect(s._chatBar.addLine.mock.calls[1][0]).toContain('successful in upgrading');
  });

  it('remote viewer: no chat lines but animation + sound still play', () => {
    const s = makeStage();
    s._showItemUpgradeEffect(99, 0, true, false, 0, false);
    expect(s._chatBar.addLine).not.toHaveBeenCalled();
    expect(s._skillEffects.PlayAtCaster).toHaveBeenCalledWith({ node: 'failure' }, 99);
    expect(s.game.audioPlayer.PlayEffect).toHaveBeenCalledTimes(1);
  });

  it('enchant-skill route and -1 error notice skip the effect', () => {
    const s = makeStage();
    s._showItemUpgradeEffect(7, -1, false, true, 0, false);
    expect(s._skillEffects.PlayAtCaster).not.toHaveBeenCalled();
    expect(s.game.audioPlayer.PlayEffect).not.toHaveBeenCalled();

    s._chatBar.addLine.mockClear();
    s._showItemUpgradeEffect(7, -1, false, false, 0, false);
    expect(s._chatBar.addLine).toHaveBeenCalledWith('You cannot use a Scroll with this item.');
    expect(s._skillEffects.PlayAtCaster).not.toHaveBeenCalled();
  });
});
