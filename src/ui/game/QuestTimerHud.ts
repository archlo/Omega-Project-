import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

const PANEL_W = 140;
const ROW_H = 16;

// Windows FILETIME (100ns ticks since 1601-01-01) -> Unix epoch ms. No
// existing helper in this codebase (every other FILETIME field is decoded
// and discarded, never actually used) — this is the first feature that
// needs the real conversion.
const FILETIME_EPOCH_DIFF_MS = 11644473600000n;
function filetimeToEpochMs(ft: bigint): number {
  return Number(ft / 10000n - FILETIME_EPOCH_DIFF_MS);
}

function formatRemaining(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

interface Entry {
  questId: number;
  endEpochMs: number;
  label: Text;
}

// OG: CUIQuestTimer/CUIQuestTimerAction (decompile) — a floating list of
// active per-quest countdown timers, driven by `CField::OnSetQuestTime`.
// TODO_AUDIT.md Seventy-fourth pass's `CUIQuestTimer` finding:
// `FieldHandlers.onSetQuestTime` was already fully decoded but never
// wired into `GameStage.ts` at all — the classic decoded-but-dropped
// shape. Rendered here as plain text rows (same fallback convention as
// `Clock.ts`/`KillCountHud.ts`), not OG's per-quest WZ-styled window.
export class QuestTimerHud extends GamePanel {
  private _bg: Graphics;
  private _entries: Entry[] = [];

  nameOf: (questId: number) => string = (id) => `Quest ${id}`;

  constructor() {
    super();
    this.isVisible = false;
    this._root.x = 800 - PANEL_W - 8;
    this._root.y = 60;

    this._bg = new Graphics();
    this._root.addChild(this._bg);
  }

  SetTimer(questId: number, endEpochMs: number): void {
    this._entries = this._entries.filter((e) => e.questId !== questId);
    const label = new Text({ text: '', style: new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' }) });
    this._root.addChild(label);
    this._entries.push({ questId, endEpochMs, label });
    this.isVisible = true;
    this._rebuildBg();
  }

  // OG: `start`/`end` are raw 8-byte FILETIME — see `filetimeToEpochMs` above.
  SetTimerFromFiletime(questId: number, endFiletime: bigint): void {
    this.SetTimer(questId, filetimeToEpochMs(endFiletime));
  }

  ClearTimer(questId: number): void {
    const e = this._entries.find((e) => e.questId === questId);
    if (e) this._root.removeChild(e.label);
    this._entries = this._entries.filter((e) => e.questId !== questId);
    if (this._entries.length === 0) this.isVisible = false;
    this._rebuildBg();
  }

  update(_dt: number): void {
    if (!this.isVisible) return;
    const now = Date.now();
    for (let i = this._entries.length - 1; i >= 0; i--) {
      const e = this._entries[i];
      const remaining = e.endEpochMs - now;
      if (remaining <= 0) {
        this._root.removeChild(e.label);
        this._entries.splice(i, 1);
        continue;
      }
      e.label.text = `${this.nameOf(e.questId)}: ${formatRemaining(remaining)}`;
    }
    for (let i = 0; i < this._entries.length; i++) {
      this._entries[i].label.position.set(4, 2 + i * ROW_H);
    }
    if (this._entries.length === 0) this.isVisible = false;
    this._rebuildBg();
  }

  private _rebuildBg(): void {
    this._bg.clear();
    const h = Math.max(1, this._entries.length) * ROW_H + 4;
    this._bg.rect(0, 0, PANEL_W, h).fill({ color: '#0C0E18', alpha: 200 / 255 });
    this._bg.rect(0, 0, PANEL_W, h).stroke({ color: '#3C4164', width: 1 });
  }
}
