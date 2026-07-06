import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

const PANEL_W = 90;
const PANEL_H = 26;

function formatHms(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

function formatWallClock(hour: number, minute: number, blink: boolean): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const sep = blink ? ':' : ' ';
  return `${h12.toString().padStart(2, '0')}${sep}${minute.toString().padStart(2, '0')} ${ampm}`;
}

// OG class: CClock (decompile/4797D0.c..4B0C50.c), driven by CField::OnClock
// (decompile/531510.c). TODO_AUDIT.md Seventy-seventh pass flagged this as
// the real generic on-screen countdown overlay — confirmed totally missing
// client-side (`find src -iname "*clock*"` returned nothing). This is the
// Hundred-and-ninth pass's implementation.
//
// OG renders this with per-digit WZ sprite images (`m_apClockCanvas`,
// loaded from `m_sDigitPath`/`m_sBackPath`, both resolved via the
// since-deleted numeric StringPool — see PacketArgs.ts's `ClockArgs` doc
// for why the per-field-type style override isn't reproduced pixel-exact).
// Rendered here as plain text on a flat background instead, matching this
// codebase's established pattern for widgets with no recoverable WZ asset
// path (e.g. Trunk's manually-hit-tested money buttons).
export class Clock extends GamePanel {
  private _bg: Graphics;
  private _text: Text;

  /** Countdown mode: seconds remaining, ticked down in `update()`. */
  private _remaining = 0;
  private _isCountdown = false;

  /** Wall-clock mode: base time + when it was set, ticked off real time. */
  private _baseHour = 0;
  private _baseMinute = 0;
  private _baseSecond = 0;
  private _wallElapsed = 0;

  onExpire: (() => void) | null = null;

  constructor() {
    super();
    this._root.x = (800 - PANEL_W) / 2;
    this._root.y = 4;

    this._bg = new Graphics();
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 200 / 255 });
    this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
    this._root.addChild(this._bg);

    this._text = new Text({
      text: '',
      style: new TextStyle({ fill: '#FFFFFF', fontSize: 14, fontFamily: 'monospace' }),
    });
    this._text.x = PANEL_W / 2;
    this._text.y = PANEL_H / 2;
    this._text.anchor.set(0.5);
    this._root.addChild(this._text);
  }

  /** subType 2/3/0x64 — start (or restart) a countdown. */
  startCountdown(seconds: number): void {
    if (seconds < 0) return;
    this._isCountdown = true;
    this._remaining = seconds;
    this._text.text = formatHms(this._remaining);
    this.isVisible = true;
  }

  /** subType 1 — switch an already-open clock to wall-clock display mode.
   *  No-op if nothing is open (see ClockArgs doc — OG's own creation
   *  trigger for this mode isn't present in this packet). */
  setWallClock(hour: number, minute: number, second: number): void {
    if (!this.isVisible) return;
    this._isCountdown = false;
    this._baseHour = hour;
    this._baseMinute = minute;
    this._baseSecond = second;
    this._wallElapsed = 0;
    this._text.text = formatWallClock(hour, minute, true);
  }

  hide(): void {
    this.isVisible = false;
    this._isCountdown = false;
  }

  update(dt: number): void {
    if (!this.isVisible) return;
    if (this._isCountdown) {
      this._remaining -= dt;
      if (this._remaining <= 0) {
        this._remaining = 0;
        this.hide();
        this.onExpire?.();
        return;
      }
      this._text.text = formatHms(this._remaining);
    } else {
      this._wallElapsed += dt;
      const totalSec = this._baseHour * 3600 + this._baseMinute * 60 + this._baseSecond + this._wallElapsed;
      const blink = Math.floor(this._wallElapsed) % 2 === 0;
      this._text.text = formatWallClock(Math.floor(totalSec / 3600) % 24, Math.floor(totalSec / 60) % 60, blink);
    }
  }
}
