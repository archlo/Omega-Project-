import { WzSound } from '../wz/WzSound.js';
import { WzUol } from '../wz/WzUol.js';
export class MobSoundService {
    _soundWz;
    _audio;
    _cache = new Map();
    constructor(_soundWz, _audio) {
        this._soundWz = _soundWz;
        this._audio = _audio;
    }
    PlayDamage(templateId) { this._play(templateId, 'Damage'); }
    PlayDie(templateId) { this._play(templateId, 'Die'); }
    PlayAttack(templateId, attackIndex) {
        this._play(templateId, attackIndex < 8 ? `Attack${attackIndex + 1}` : 'AttackF');
    }
    PlaySkill(templateId, skillIndex) {
        this._play(templateId, skillIndex < 16 ? `Skill${skillIndex + 1}` : 'SkillF');
    }
    PlayCharDamage(templateId, index) {
        this._play(templateId, index === 0 ? 'CharDam1' : index === 1 ? 'CharDam2' : 'CharDamF');
    }
    PlayRegen(templateId) { this._play(templateId, 'Regen'); }
    PlayBomb(templateId) { this._play(templateId, 'Bomb'); }
    _play(templateId, evt) {
        if (!this._audio || !this._soundWz)
            return;
        const key = `${templateId}:${evt}`;
        let sound = this._cache.get(key);
        if (sound === undefined) {
            const raw = this._soundWz.GetItem(`Mob.img/${templateId.toString().padStart(7, '0')}/${evt}`);
            if (raw instanceof WzSound) {
                sound = raw;
            }
            else if (raw instanceof WzUol) {
                const resolved = raw.Resolve();
                sound = resolved instanceof WzSound ? resolved : null;
            }
            else {
                sound = null;
            }
            this._cache.set(key, sound);
            if (!sound)
                console.log(`Mob sound missing: ${templateId}/${evt}`);
        }
        if (sound)
            this._audio.PlayEffect(sound.AudioBytes);
    }
}
//# sourceMappingURL=MobSoundService.js.map