import { describe, expect, it, vi } from 'vitest';
import { Text } from 'pixi.js';
import { PartySearchDialog } from '../../../src/ui/game/PartySearchDialog.js';

// ponytail: avoids jsdom/canvas just for Pixi Text measurement in button layout.
Object.defineProperty(Text.prototype, 'width', { get: () => 0 });

describe('PartySearchDialog', () => {
  it('opens and renders an empty-list status', () => {
    const dlg = new PartySearchDialog();

    dlg.Open();

    expect(dlg.isVisible).toBe(true);
    expect((dlg as any)._statusText.text).toBe('No listings found.');
  });

  it('renders adverts and applies to the selected party', () => {
    const dlg = new PartySearchDialog();
    let applied = 0;
    dlg.onApply = (partyId) => { applied = partyId; };
    dlg.Open();
    dlg.SetList([{ nGroupID: 77, sName: 'Zakum', members: [{ sCharacterName: 'Hero' } as any] } as any]);

    expect((dlg as any)._rows[0].text).toBe('Zakum: Hero');
    (dlg as any)._rows[0].emit('pointerdown');
    const apply = (dlg as any)._buttons.find((b: Text) => b.text === '[Apply]');
    apply.emit('pointerdown');

    expect(applied).toBe(77);
  });

  it('search/register buttons emit verified request fields', () => {
    const dlg = new PartySearchDialog();
    const searches: number[] = [];
    let registered: [number, string] | null = null;
    dlg.onSearch = (questId) => { searches.push(questId); };
    dlg.onRegister = (questId, title) => { registered = [questId, title]; };
    dlg.Open();

    vi.stubGlobal('window', { prompt: vi.fn().mockReturnValueOnce('123').mockReturnValueOnce('456').mockReturnValueOnce('LFG') });
    (dlg as any)._buttons.find((b: Text) => b.text === '[Search]').emit('pointerdown');
    (dlg as any)._buttons.find((b: Text) => b.text === '[Register]').emit('pointerdown');
    vi.unstubAllGlobals();

    expect(searches).toEqual([123]);
    expect(registered).toEqual([456, 'LFG']);
  });
});
