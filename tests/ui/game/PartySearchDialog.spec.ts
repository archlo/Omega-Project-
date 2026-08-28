import { describe, expect, it, vi } from 'vitest';
import { Text } from 'pixi.js';
import { PartySearchDialog } from '../../../src/ui/game/PartySearchDialog.js';

Object.defineProperty(Text.prototype, 'width', { get: () => 0 });

describe('PartySearchDialog', () => {
  it('opens and renders an empty-list status', () => {
    const dlg = new PartySearchDialog();
    dlg.Open();
    // Authentic panel renders "No listings found." as a centered row when empty
    const texts = (dlg as any)._rowTexts as Text[];
    expect(dlg.isVisible).toBe(true);
    expect(texts.some((t: Text) => t.text === 'No listings found.')).toBe(true);
  });

  it('renders adverts and applies to the selected party', () => {
    const dlg = new PartySearchDialog();
    let applied = 0;
    dlg.onApply = (partyId) => { applied = partyId; };
    dlg.Open();
    dlg.SetList([{ nGroupID: 77, sName: 'Zakum', members: [{ sCharacterName: 'Hero' } as any] } as any]);

    const rows = (dlg as any)._rowTexts as Text[];
    // First row label is "Zakum (1 members)" with member sub-text below
    expect(rows[0].text).toContain('Zakum');
    // Simulate selecting first row
    rows[0].emit('pointerdown');
    // Apply via internal method
    (dlg as any)._applySelected();
    expect(applied).toBe(77);
  });

  it('search/register buttons emit verified request fields', () => {
    const dlg = new PartySearchDialog();
    const searches: number[] = [];
    let registered: [number, string] | null = null;
    dlg.onSearch = (questId) => { searches.push(questId); };
    dlg.onRegister = (questId, title) => { registered = [questId, title]; };
    dlg.Open();

    // Fallback prompt flow: _doRegist prompts questId then title
    vi.stubGlobal('window', { prompt: vi.fn().mockReturnValueOnce('123').mockReturnValueOnce('MyTitle') });
    // Search is not in fallback party tab; test _doRegist path
    (dlg as any)._doRegist();
    vi.unstubAllGlobals();

    // _doRegist calls onRegister with parsed questId and title
    expect(registered).toEqual([123, 'MyTitle']);
  });
});
