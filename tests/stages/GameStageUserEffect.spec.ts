import { describe, expect, it, vi } from 'vitest';
import { GameStage } from '../../src/stages/GameStage.js';
import { OutPacket } from '../../src/net/packet/OutPacket.js';

// OG: CUser::OnEffect cases 1/2/3 (SkillUse / SkillAffected /
// SkillAffected_Select) play the skill's own effect node at the character —
// the same resolution the local cast path (onSkillUse) uses, so remote
// buff/cast visuals match the caster's own. The TS handler was dropping these
// three types entirely; the fix decodes the server Effect.encode layout and
// routes them through _playSkillCastEffect -> PlayAtCaster.
describe('GameStage remote skill-cast effects (effectType 1/2/3)', () => {
  function makeStage(): any {
    const stage: any = Object.create(GameStage.prototype);
    stage._localCharId = 55;
    stage._physics = { FacingLeft: false };
    stage._otherChars = new Map([[7, { FacingLeft: true }]]);
    stage._skillEffects = { PlayAtCaster: vi.fn(), PlayFullScreen: vi.fn() };
    stage._effectWz = { GetItem: () => undefined };
    stage._uiWz = { GetItem: () => undefined };
    return stage;
  }

  function payload(write: (p: OutPacket) => void): Uint8Array {
    const p = OutPacket.Raw();
    write(p);
    return p.toArray();
  }

  function castInfo(effect: unknown, effect0: unknown): any {
    return { Actions: [], Effect: effect, Effect0: effect0, Screen: null };
  }

  it('type 1 (SkillUse) plays the skill effect at the local caster', () => {
    const stage = makeStage();
    const effect = { fake: true };
    stage._skillService = { GetCastInfo: vi.fn(() => castInfo(effect, null)) };

    stage._onUserEffect({
      charId: 0,
      effectType: 1,
      payload: payload((p) => { p.writeInt(2301004); p.writeByte(10); p.writeByte(20); }),
      isLocal: true,
    });

    expect(stage._skillService.GetCastInfo).toHaveBeenCalledWith(2301004);
    expect(stage._skillEffects.PlayAtCaster).toHaveBeenCalledWith(effect, 55, false);
  });

  it('type 1 plays at a remote character with that character facing', () => {
    const stage = makeStage();
    const effect = { fake: true };
    stage._skillService = { GetCastInfo: vi.fn(() => castInfo(effect, null)) };

    stage._onUserEffect({
      charId: 7,
      effectType: 1,
      payload: payload((p) => { p.writeInt(2301004); p.writeByte(10); p.writeByte(20); }),
      isLocal: false,
    });

    expect(stage._skillEffects.PlayAtCaster).toHaveBeenCalledWith(effect, 7, true);
  });

  it('type 2 (SkillAffected) decodes int skillId + byte skillLevel', () => {
    const stage = makeStage();
    const effect = { fake: true };
    stage._skillService = { GetCastInfo: vi.fn(() => castInfo(effect, null)) };

    stage._onUserEffect({
      charId: 0,
      effectType: 2,
      payload: payload((p) => { p.writeInt(3121002); p.writeByte(30); }),
      isLocal: true,
    });

    expect(stage._skillEffects.PlayAtCaster).toHaveBeenCalledWith(effect, 55, false);
  });

  it('type 3 (SkillAffected_Select) skips the leading int info and uses the skillId', () => {
    const stage = makeStage();
    const effect = { fake: true };
    stage._skillService = { GetCastInfo: vi.fn(() => castInfo(effect, null)) };

    stage._onUserEffect({
      charId: 0,
      effectType: 3,
      payload: payload((p) => { p.writeInt(0xDEADBEEF); p.writeInt(1101006); p.writeByte(10); }),
      isLocal: true,
    });

    // The discarded info int must NOT be mistaken for the skillId.
    expect(stage._skillService.GetCastInfo).toHaveBeenCalledWith(1101006);
    expect(stage._skillEffects.PlayAtCaster).toHaveBeenCalledWith(effect, 55, false);
  });

  it('falls back to the effect0 node when Effect is missing', () => {
    const stage = makeStage();
    const fallback = { fake: 'effect0' };
    stage._skillService = { GetCastInfo: vi.fn(() => castInfo(undefined, fallback)) };

    stage._onUserEffect({
      charId: 0,
      effectType: 2,
      payload: payload((p) => { p.writeInt(1001000); p.writeByte(1); }),
      isLocal: true,
    });

    expect(stage._skillEffects.PlayAtCaster).toHaveBeenCalledWith(fallback, 55, false);
  });

  it('is a no-op for unknown skills (no cast info)', () => {
    const stage = makeStage();
    stage._skillService = { GetCastInfo: vi.fn(() => null) };

    stage._onUserEffect({
      charId: 7,
      effectType: 1,
      payload: payload((p) => { p.writeInt(999999999); p.writeByte(1); p.writeByte(1); }),
      isLocal: false,
    });

    expect(stage._skillEffects.PlayAtCaster).not.toHaveBeenCalled();
  });

  it('is a no-op for a truncated payload (safe decode guard)', () => {
    const stage = makeStage();
    stage._skillService = { GetCastInfo: vi.fn(() => castInfo({ fake: true }, null)) };

    stage._onUserEffect({
      charId: 0,
      effectType: 2,
      payload: payload((p) => p.writeByte(1)),
      isLocal: true,
    });

    expect(stage._skillEffects.PlayAtCaster).not.toHaveBeenCalled();
  });
});