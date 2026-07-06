import { describe, it, expect } from 'vitest';
import { QuickSlotBar } from '../../../src/ui/game/QuickSlotBar.js';
import { FuncKeyMappedNone } from '../../../src/domain/FuncKeyMapped.js';

// TODO_AUDIT.md Eighty-ninth/Hundred-and-eighth passes: OG CDraggableSkill::OnDropped
// (IDA 0x50a4e0) — dragging a skill onto the quickslot bar should bind it.
describe('QuickSlotBar drag target', () => {
  function makeBar(onBindSkill: (scancode: number, skillId: number) => void) {
    return new QuickSlotBar(
      { Load: () => null } as any, null, null,
      () => FuncKeyMappedNone,
      onBindSkill,
      () => null,
    );
  }

  it('tryAcceptDrag binds the dropped skill to the slot under the cursor', () => {
    let bound: [number, number] | null = null;
    const bar = makeBar((scancode, skillId) => { bound = [scancode, skillId]; });
    bar.Relayout(800, 600);
    const r = (bar as any)._slotRect(0);

    const accepted = bar.tryAcceptDrag({ skillId: 12345 }, r.x + 4, r.y + 4);

    expect(accepted).toBe(true);
    expect(bound).not.toBeNull();
    expect(bound![1]).toBe(12345);
  });

  it('tryAcceptDrag declines payloads without a skillId, and drops outside any slot', () => {
    const bar = makeBar(() => { throw new Error('should not bind'); });
    bar.Relayout(800, 600);
    expect(bar.tryAcceptDrag({ notASkill: true }, 0, 0)).toBe(false);
    expect(bar.tryAcceptDrag({ skillId: 1 }, -999, -999)).toBe(false);
  });
});
