import { describe, it, expect, vi } from 'vitest';
import { Text } from 'pixi.js';
import { QuestTimerHud } from '../../../src/ui/game/QuestTimerHud.js';

// ponytail: avoids pulling in jsdom just to satisfy Text.width's canvas measurement in tests
Object.defineProperty(Text.prototype, 'width', { get: () => 0 });

// TODO_AUDIT.md Seventy-fourth pass: CUIQuestTimer — FieldHandlers.onSetQuestTime
// was already fully decoded but never wired into GameStage.ts at all.
describe('QuestTimerHud', () => {
  it('SetTimer shows the panel with a formatted remaining time', () => {
    vi.useFakeTimers();
    const hud = new QuestTimerHud();
    hud.nameOf = () => 'Test Quest';
    hud.SetTimer(1000, Date.now() + 65_000);
    hud.update(0);
    vi.useRealTimers();
    expect(hud.isVisible).toBe(true);
    const label = (hud as any)._entries[0].label;
    expect(label.text).toBe('Test Quest: 1:05');
  });

  it('removes an entry once it expires', () => {
    const hud = new QuestTimerHud();
    hud.SetTimer(1000, Date.now() + 10);
    hud.update(0);
    expect((hud as any)._entries.length).toBe(1);
    vi.useFakeTimers();
    vi.advanceTimersByTime(50);
    hud.update(0);
    vi.useRealTimers();
    expect((hud as any)._entries.length).toBe(0);
    expect(hud.isVisible).toBe(false);
  });

  it('ClearTimer removes a timer by questId immediately', () => {
    const hud = new QuestTimerHud();
    hud.SetTimer(1000, Date.now() + 60_000);
    hud.ClearTimer(1000);
    expect((hud as any)._entries.length).toBe(0);
    expect(hud.isVisible).toBe(false);
  });

  it('SetTimerFromFiletime converts a Windows FILETIME to the correct epoch ms', () => {
    const hud = new QuestTimerHud();
    // 1601-01-01 + 11644473600s = 1970-01-01 (Unix epoch). A FILETIME of
    // exactly that offset (in 100ns ticks) should resolve to epoch 0.
    const epochFiletime = 11644473600000n * 10000n;
    hud.SetTimerFromFiletime(1000, epochFiletime + 60_000n * 10000n); // epoch + 60s
    const entry = (hud as any)._entries[0];
    expect(entry.endEpochMs).toBe(60_000);
  });
});
