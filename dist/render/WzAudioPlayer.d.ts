export declare class WzAudioPlayer {
    private _bgm;
    private _bgmUrl;
    private _effects;
    private _bgmVolume;
    private _sfxVolume;
    private _muted;
    private _unblockCleanup;
    get Volume(): number;
    set Volume(v: number);
    get SfxVolume(): number;
    set SfxVolume(v: number);
    get Muted(): boolean;
    set Muted(m: boolean);
    ToggleMute(): boolean;
    private _applyBgmVolume;
    private _applySfxVolume;
    PlayLoop(buffer: Uint8Array, mimeType?: string): void;
    private _scheduleUnblock;
    private _clearUnblock;
    PlayEffect(buffer: Uint8Array, mimeType?: string): void;
    Stop(): void;
    Pause(): void;
    Resume(): void;
}
//# sourceMappingURL=WzAudioPlayer.d.ts.map