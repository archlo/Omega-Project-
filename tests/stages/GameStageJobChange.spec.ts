import { describe, expect, it, vi } from 'vitest';
import { GameStage } from '../../src/stages/GameStage.js';
import { WzSound } from '../../src/wz/WzSound.js';

// OG: CUser::OnEffect case 0xA (JobChanged) plays BasicEff.img/JobChanged at
// the character (layer under face) + Sound/Game.img/JobChanged, and
// CUISkill::SetSkillRootList re-derives the skill roots on the live job — so
// a statChanged JOB update must rebuild the SkillBook from held records.
describe('GameStage job change (effect 10 + skill rebuild)', () => {
  function makeStats(): any {
    return {
      hp: 100, maxHp: 100, mp: 50, maxMp: 50, level: 10, exp: 0,
      str: 4, dex: 4, intStat: 4, luk: 4,
      baseStr: 4, baseDex: 4, baseInt: 4, baseLuk: 4,
      ap: 0, fame: 0, job: 'Beginner', jobId: 0, meso: 0,
    };
  }

  function makeStage(): any {
    const stage: any = Object.create(GameStage.prototype);
    stage._job = 0;
    stage._stats = makeStats();
    stage._prevExp = -1;
    stage._statusBar = {
      hp: 0, maxHp: 0, mp: 0, maxMp: 0, level: 0, exp: 0, nextExp: 0, jobName: '',
      set hpv(v: number) { /* noop */ },
    } as any;
    stage._skill = {
      characterHp: 100, characterLevel: 10, sp: 0,
      characterJob: 0, setExtendedSp: vi.fn(),
      setSkillRecords: vi.fn(), setSwallowBuffType: vi.fn(),
      setDamageMeterSummary: vi.fn(),
    };
    stage._charInfo = { job: '', fame: 0 } as any;
    stage._equip = { SetPlayerStats: vi.fn(), setHasNoviceSkill1004: vi.fn() };
    stage._item = { setMeso: vi.fn(), SetPlayerStats: vi.fn() };
    stage._player = null;
    stage._field = null;
    stage._physics = null;
    stage._dmgNumbers = null;
    stage._dojangHud = { updatePlayerStats: vi.fn() };
    stage._syncStatDetailInputs = vi.fn();
    return stage;
  }

  it('re-feeds skill records when the job changes so SkillBook rebuilds tabs', () => {
    const stage = makeStage();
    const records = [{ skillId: 1001003, level: 1 }];
    stage._skillRecords = records;

    stage._onStatChanged({ job: 100 });

    expect(stage._skill.characterJob).toBe(100);
    expect(stage._skill.setSkillRecords).toHaveBeenCalledWith(records);
  });

  it('does not rebuild when the job is unchanged', () => {
    const stage = makeStage();
    stage._job = 100;
    stage._skillRecords = [{ skillId: 1001003, level: 1 }];

    stage._onStatChanged({ job: 100 });

    expect(stage._skill.setSkillRecords).not.toHaveBeenCalled();
  });

  it('is safe when no skill records have arrived yet', () => {
    const stage = makeStage();
    stage._onStatChanged({ job: 100 });
    expect(stage._skill.characterJob).toBe(100);
    expect(stage._skill.setSkillRecords).not.toHaveBeenCalled();
  });

  it('JobChanged effect (10) plays BasicEff.img/JobChanged at the local caster + sound', () => {
    const stage = makeStage();
    stage._localCharId = 55;
    stage._physics = { FacingLeft: false };
    const node = { fake: true };
    stage._effectWz = { GetItem: (p: string) => (p === 'BasicEff.img/JobChanged' ? node : undefined) };
    const sound = Object.create(WzSound.prototype) as WzSound;
    (sound as any)._audioBytes = new Uint8Array([1, 2, 3]);
    stage._mobSoundWz = { GetItem: (p: string) => (p === 'Game.img/JobChanged' ? sound : undefined) };
    stage._skillEffects = { PlayAtCaster: vi.fn() };
    stage.game = { audioPlayer: { PlayEffect: vi.fn() } };

    stage._onUserEffect({ charId: 0, effectType: 10, payload: new Uint8Array(0), isLocal: true });

    expect(stage._skillEffects.PlayAtCaster).toHaveBeenCalledWith(node, 55, false);
    expect(stage.game.audioPlayer.PlayEffect).toHaveBeenCalledWith(sound.AudioBytes);
  });

  it('JobChanged effect (10) plays for a remote character with its facing', () => {
    const stage = makeStage();
    const node = { fake: true };
    stage._effectWz = { GetItem: () => node };
    stage._mobSoundWz = { GetItem: () => undefined };
    stage._otherChars = new Map([[7, { FacingLeft: true }]]);
    stage._skillEffects = { PlayAtCaster: vi.fn() };
    stage.game = { audioPlayer: { PlayEffect: vi.fn() } };

    stage._onUserEffect({ charId: 7, effectType: 10, payload: new Uint8Array(0), isLocal: false });

    expect(stage._skillEffects.PlayAtCaster).toHaveBeenCalledWith(node, 7, true);
  });

  it('unhandled effect types still early-return without touching the overlays', () => {
    const stage = makeStage();
    stage._effectWz = { GetItem: () => ({ fake: true }) };
    stage._skillEffects = { PlayAtCaster: vi.fn() };
    stage.game = { audioPlayer: { PlayEffect: vi.fn() } };

    stage._onUserEffect({ charId: 0, effectType: 3, payload: new Uint8Array(0), isLocal: true });

    expect(stage._skillEffects.PlayAtCaster).not.toHaveBeenCalled();
  });
});