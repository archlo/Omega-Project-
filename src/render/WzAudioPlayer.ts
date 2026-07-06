export class WzAudioPlayer {
  private _bgm: HTMLAudioElement | null = null;
  private _bgmUrl: string | null = null;
  private _effects: HTMLAudioElement[] = [];
  private _bgmVolume = 0.6;
  private _sfxVolume = 1.0;
  private _muted = false;
  private _unblockCleanup: (() => void) | null = null;

  get Volume(): number { return this._bgmVolume; }
  set Volume(v: number) {
    this._bgmVolume = Math.max(0, Math.min(1, v));
    this._applyBgmVolume();
  }

  get SfxVolume(): number { return this._sfxVolume; }
  set SfxVolume(v: number) {
    this._sfxVolume = Math.max(0, Math.min(1, v));
    this._applySfxVolume();
  }

  get Muted(): boolean { return this._muted; }
  set Muted(m: boolean) {
    this._muted = m;
    this._applyBgmVolume();
    this._applySfxVolume();
  }

  ToggleMute(): boolean {
    this.Muted = !this._muted;
    return this._muted;
  }

  private _applyBgmVolume(): void {
    if (this._bgm) this._bgm.volume = this._muted ? 0 : this._bgmVolume;
  }

  private _applySfxVolume(): void {
    const vol = this._muted ? 0 : this._sfxVolume;
    for (const e of this._effects) e.volume = vol;
  }

  PlayLoop(buffer: Uint8Array, mimeType = 'audio/mpeg'): void {
    this.Stop();
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
    const url = URL.createObjectURL(blob);
    this._bgmUrl = url;
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = this._muted ? 0 : this._bgmVolume;
    this._bgm = audio;
    audio.play().catch(() => {
      // Autoplay blocked — retry on the next user interaction.
      this._scheduleUnblock(audio);
    });
  }

  private _scheduleUnblock(audio: HTMLAudioElement): void {
    this._clearUnblock();
    const handler = () => {
      if (this._bgm === audio) audio.play().catch(() => {});
      this._clearUnblock();
    };
    document.addEventListener('click',    handler, { once: true });
    document.addEventListener('keydown',  handler, { once: true });
    document.addEventListener('touchend', handler, { once: true });
    this._unblockCleanup = () => {
      document.removeEventListener('click',    handler);
      document.removeEventListener('keydown',  handler);
      document.removeEventListener('touchend', handler);
    };
  }

  private _clearUnblock(): void {
    this._unblockCleanup?.();
    this._unblockCleanup = null;
  }

  PlayEffect(buffer: Uint8Array, mimeType = 'audio/mpeg'): void {
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.volume = this._muted ? 0 : this._sfxVolume;
    audio.play().catch(() => {});
    this._effects.push(audio);
    audio.addEventListener('ended', () => {
      const idx = this._effects.indexOf(audio);
      if (idx >= 0) this._effects.splice(idx, 1);
      URL.revokeObjectURL(url);
    });
  }

  Stop(): void {
    this._clearUnblock();
    if (this._bgm) {
      this._bgm.pause();
      this._bgm = null;
    }
    if (this._bgmUrl) {
      URL.revokeObjectURL(this._bgmUrl);
      this._bgmUrl = null;
    }
  }

  Pause(): void {
    this._bgm?.pause();
  }

  Resume(): void {
    this._bgm?.play().catch(() => {});
  }
}
