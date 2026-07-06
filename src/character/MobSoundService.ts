import type { WzPackage } from '../wz/WzPackage.js';
import { WzSound } from '../wz/WzSound.js';
import { WzUol } from '../wz/WzUol.js';
import { WzAudioPlayer } from '../render/WzAudioPlayer.js';

export class MobSoundService {
  private readonly _cache = new Map<string, WzSound | null>();

  constructor(
    private readonly _soundWz: WzPackage | null,
    private readonly _audio: WzAudioPlayer | null,
  ) {}

  PlayDamage(templateId: number): void { this._play(templateId, 'Damage'); }
  PlayDie(templateId: number): void { this._play(templateId, 'Die'); }

  PlayAttack(templateId: number, attackIndex: number): void {
    this._play(templateId, attackIndex < 8 ? `Attack${attackIndex + 1}` : 'AttackF');
  }

  PlaySkill(templateId: number, skillIndex: number): void {
    this._play(templateId, skillIndex < 16 ? `Skill${skillIndex + 1}` : 'SkillF');
  }

  PlayCharDamage(templateId: number, index: number): void {
    this._play(templateId, index === 0 ? 'CharDam1' : index === 1 ? 'CharDam2' : 'CharDamF');
  }

  PlayRegen(templateId: number): void { this._play(templateId, 'Regen'); }
  PlayBomb(templateId: number): void { this._play(templateId, 'Bomb'); }

  private _play(templateId: number, evt: string): void {
    if (!this._audio || !this._soundWz) return;
    const key = `${templateId}:${evt}`;
    let sound = this._cache.get(key);
    if (sound === undefined) {
      const raw = this._soundWz.GetItem(`Mob.img/${templateId.toString().padStart(7, '0')}/${evt}`);
      if (raw instanceof WzSound) {
        sound = raw;
      } else if (raw instanceof WzUol) {
        const resolved = raw.Resolve();
        sound = resolved instanceof WzSound ? resolved : null;
      } else {
        sound = null;
      }
      this._cache.set(key, sound);
      if (!sound) console.log(`Mob sound missing: ${templateId}/${evt}`);
    }
    if (sound) this._audio.PlayEffect(sound.AudioBytes);
  }
}
