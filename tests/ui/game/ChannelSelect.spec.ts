import { describe, it, expect } from 'vitest';
import { ChannelSelect } from '../../../src/ui/game/ChannelSelect.js';

// OG CUIChannelShift:
//   GetRectFromIdx (0x9689C0): left=70*(idx%5)+11, top=20*(idx/5)+55, right=left+68, bottom=top+20.
//   Cell grid: 5 columns, 68x20 cells, first row at y=55.
//   m_nSel starts at m_nChannelID; clicking a different cell moves the highlight.
//   Mouse-up over the pressed cell → SetRet(1) → onChannelChange.
describe('ChannelSelect (CUIChannelShift)', () => {
  it('places grid cells on the 5-column layout', () => {
    const panel = new ChannelSelect();
    panel.setChannels(
      Array.from({ length: 10 }, (_, i) => ({ channel: i, population: 100 })),
      0,
    );
    panel.isVisible = true;
    const cells = panel['_cells'];
    // index 0 → (11, 55); index 4 → (291, 55); index 5 → (11, 75)
    expect(cells[0].container.x).toBe(11);
    expect(cells[0].container.y).toBe(55);
    expect(cells[4].container.x).toBe(291);
    expect(cells[4].container.y).toBe(55);
    expect(cells[5].container.x).toBe(11);
    expect(cells[5].container.y).toBe(75);
  });

  it('selects a different channel on press and confirms on release over the same cell', () => {
    const panel = new ChannelSelect();
    panel.setChannels(
      Array.from({ length: 5 }, (_, i) => ({ channel: i, population: 100 })),
      0,
    );
    panel.isVisible = true;
    const fired: number[] = [];
    panel.onChannelChange = (ch) => fired.push(ch);

    // Click cell 1 (index 1): left=81, top=55
    const x = panel.container.x + 81 + 20;
    const y = panel.container.y + 55 + 8;
    expect(panel.handleMouseButton(x, y, true)).toBe(true);
    expect(panel['_sel']).toBe(1);
    // Release over the same cell → confirm (channel 1 != current 0)
    expect(panel.handleMouseButton(x, y, false)).toBe(true);
    expect(fired).toEqual([1]);
  });

  it('does not fire onChannelChange when releasing over a different cell', () => {
    const panel = new ChannelSelect();
    panel.setChannels(
      Array.from({ length: 5 }, (_, i) => ({ channel: i, population: 100 })),
      0,
    );
    panel.isVisible = true;
    const fired: number[] = [];
    panel.onChannelChange = (ch) => fired.push(ch);

    const x1 = panel.container.x + 81 + 20;
    const y1 = panel.container.y + 55 + 8;
    panel.handleMouseButton(x1, y1, true); // press cell 1
    const x0 = panel.container.x + 11 + 20;
    const y0 = panel.container.y + 55 + 8;
    panel.handleMouseButton(x0, y0, false); // release over cell 0
    expect(fired).toEqual([]);
    expect(panel['_sel']).toBe(1); // selection stays on the pressed cell
  });

  it('keeps the current-channel cell highlighted on the channel0 canvas path', () => {
    const panel = new ChannelSelect();
    panel.setChannels(
      Array.from({ length: 3 }, (_, i) => ({ channel: i, population: 100 })),
      1, // current = channel 1 (grid index 1)
    );
    panel.isVisible = true;
    // Current cell (index 1) and selected cell (index 1, m_nSel = current) → bg visible.
    expect(panel['_cells'][1].bg.visible).toBe(true);
    // Plain cell (index 0) → no bg.
    expect(panel['_cells'][0].bg.visible).toBe(false);
  });

  it('Escape hides the panel and Enter confirms', () => {
    const panel = new ChannelSelect();
    panel.setChannels([{ channel: 0, population: 100 }, { channel: 1, population: 100 }], 0);
    panel.isVisible = true;
    expect(panel.onKeyPress('Escape')).toBe(true);
    expect(panel.isVisible).toBe(false);

    panel.isVisible = true;
    panel['_sel'] = 1;
    const fired: number[] = [];
    panel.onChannelChange = (ch) => fired.push(ch);
    expect(panel.onKeyPress('Enter')).toBe(true);
    expect(fired).toEqual([1]);
    expect(panel.isVisible).toBe(false);
  });

  it('arrow keys move the selection within the grid', () => {
    const panel = new ChannelSelect();
    panel.setChannels(
      Array.from({ length: 10 }, (_, i) => ({ channel: i, population: 100 })),
      5, // selected = 5
    );
    panel.isVisible = true;
    expect(panel.onKeyPress('ArrowLeft')).toBe(true);
    expect(panel['_sel']).toBe(4);
    expect(panel.onKeyPress('ArrowUp')).toBe(true);
    expect(panel['_sel']).toBe(0); // 4 - 5 clamped to 0
    expect(panel.onKeyPress('ArrowDown')).toBe(true);
    expect(panel['_sel']).toBe(5);
  });
});
