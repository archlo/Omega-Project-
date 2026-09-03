import { GamePanel } from './GamePanel.js';
export declare class Clock extends GamePanel {
    private _bg;
    private _text;
    /** Countdown mode: seconds remaining, ticked down in `update()`. */
    private _remaining;
    private _isCountdown;
    /** Wall-clock mode: base time + when it was set, ticked off real time. */
    private _baseHour;
    private _baseMinute;
    private _baseSecond;
    private _wallElapsed;
    onExpire: (() => void) | null;
    constructor();
    /** subType 2/3/0x64 — start (or restart) a countdown. */
    startCountdown(seconds: number): void;
    /** subType 1 — switch an already-open clock to wall-clock display mode.
     *  No-op if nothing is open (see ClockArgs doc — OG's own creation
     *  trigger for this mode isn't present in this packet). */
    setWallClock(hour: number, minute: number, second: number): void;
    hide(): void;
    update(dt: number): void;
}
//# sourceMappingURL=Clock.d.ts.map