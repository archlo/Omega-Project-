import type { WzPackage } from '../wz/WzPackage.js';
import { WzSound } from '../wz/WzSound.js';
import { WzUol } from '../wz/WzUol.js';
import { WzAudioPlayer } from '../render/WzAudioPlayer.js';

export class FieldSoundService {
  private readonly _cache = new Map<string, WzSound | null>();

  constructor(
    private readonly _soundWz: WzPackage | null,
    private readonly _audio: WzAudioPlayer | null,
  ) {}

  PlayDrop(): void { this._play('DropItem'); }
  PlayPickUp(): void { this._play('PickUpItem'); }

  private _play(evt: string): void {
    if (!this._audio || !this._soundWz) return;
    let sound = this._cache.get(evt);
    if (sound === undefined) {
      const raw = this._soundWz.GetItem(`Game.img/${evt}`);
      if (raw instanceof WzSound) {
        sound = raw;
      } else if (raw instanceof WzUol) {
        const resolved = raw.Resolve();
        sound = resolved instanceof WzSound ? resolved : null;
      } else {
        sound = null;
      }
      this._cache.set(evt, sound);
      if (!sound) console.log(`Field sound missing: Game.img/${evt}`);
    }
    if (sound) this._audio.PlayEffect(sound.AudioBytes);
  }
}