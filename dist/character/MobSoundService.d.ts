import type { WzPackage } from '../wz/WzPackage.js';
import { WzAudioPlayer } from '../render/WzAudioPlayer.js';
export declare class MobSoundService {
    private readonly _soundWz;
    private readonly _audio;
    private readonly _cache;
    constructor(_soundWz: WzPackage | null, _audio: WzAudioPlayer | null);
    PlayDamage(templateId: number): void;
    PlayDie(templateId: number): void;
    PlayAttack(templateId: number, attackIndex: number): void;
    PlaySkill(templateId: number, skillIndex: number): void;
    PlayCharDamage(templateId: number, index: number): void;
    PlayRegen(templateId: number): void;
    PlayBomb(templateId: number): void;
    private _play;
}
//# sourceMappingURL=MobSoundService.d.ts.map