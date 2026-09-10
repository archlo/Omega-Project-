import type { WzPackage } from '../wz/WzPackage.js';
import { WzSound } from '../wz/WzSound.js';
import { WzUol } from '../wz/WzUol.js';
import { WzAudioPlayer } from '../render/WzAudioPlayer.js';

export class FieldSoundService {
  private readonly _cache = new Map<string, WzSound | null>();
  private _lastDropMs = 0;

  constructor(
    private readonly _soundWz: WzPackage | null,
    private readonly _audio: WzAudioPlayer | null,
  ) {}

  PlayDrop(): void {
    // OG CDropPool::Update: the drop sound (StringPool 1284 over the
    // "Sound/Game.img/" prefix, enterType CREATE only) is gated on a global
    // 300ms throttle (tCur - tLastSfx > 300) so multi-drop bursts don't stack.
    const now = Date.now();
    if (now - this._lastDropMs <= 300) return;
    this._lastDropMs = now;
    this._play('DropItem');
  }
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