export class WzAudioPlayer {
    _bgm = null;
    _bgmUrl = null;
    _effects = [];
    _bgmVolume = 0.6;
    _sfxVolume = 1.0;
    _muted = false;
    _unblockCleanup = null;
    get Volume() { return this._bgmVolume; }
    set Volume(v) {
        this._bgmVolume = Math.max(0, Math.min(1, v));
        this._applyBgmVolume();
    }
    get SfxVolume() { return this._sfxVolume; }
    set SfxVolume(v) {
        this._sfxVolume = Math.max(0, Math.min(1, v));
        this._applySfxVolume();
    }
    get Muted() { return this._muted; }
    set Muted(m) {
        this._muted = m;
        this._applyBgmVolume();
        this._applySfxVolume();
    }
    ToggleMute() {
        this.Muted = !this._muted;
        return this._muted;
    }
    _applyBgmVolume() {
        if (this._bgm)
            this._bgm.volume = this._muted ? 0 : this._bgmVolume;
    }
    _applySfxVolume() {
        const vol = this._muted ? 0 : this._sfxVolume;
        for (const e of this._effects)
            e.volume = vol;
    }
    PlayLoop(buffer, mimeType = 'audio/mpeg') {
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
    _scheduleUnblock(audio) {
        this._clearUnblock();
        const handler = () => {
            if (this._bgm === audio)
                audio.play().catch(() => { });
            this._clearUnblock();
        };
        document.addEventListener('click', handler, { once: true });
        document.addEventListener('keydown', handler, { once: true });
        document.addEventListener('touchend', handler, { once: true });
        this._unblockCleanup = () => {
            document.removeEventListener('click', handler);
            document.removeEventListener('keydown', handler);
            document.removeEventListener('touchend', handler);
        };
    }
    _clearUnblock() {
        this._unblockCleanup?.();
        this._unblockCleanup = null;
    }
    PlayEffect(buffer, mimeType = 'audio/mpeg') {
        const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.volume = this._muted ? 0 : this._sfxVolume;
        audio.play().catch(() => { });
        this._effects.push(audio);
        audio.addEventListener('ended', () => {
            const idx = this._effects.indexOf(audio);
            if (idx >= 0)
                this._effects.splice(idx, 1);
            URL.revokeObjectURL(url);
        });
    }
    Stop() {
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
    Pause() {
        this._bgm?.pause();
    }
    Resume() {
        this._bgm?.play().catch(() => { });
    }
}
//# sourceMappingURL=WzAudioPlayer.js.map