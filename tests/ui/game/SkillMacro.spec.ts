import { describe, expect, it } from 'vitest';
import { Texture } from 'pixi.js';
import { SkillMacro } from '../../../src/ui/game/SkillMacro.js';

// The SkillMacro panel is constructed without a loader/ui (plain fallback), so
// icon textures stay EMPTY and the check glyph stays null — the tests below
// exercise the OG GetIndexByPos hit bands + draw layout logic that is data-
// driven (not texture-driven).
function makePanel(): SkillMacro {
  const panel = new SkillMacro({} as any, null, null);
  return panel;
}

describe('SkillMacro (CUIMacroSys 1:1)', () => {
  it('anchors to the skill window right edge (OG ctor @0x84c0d0: skillX+174)', () => {
    const panel = makePanel();
    panel.anchorToSkill(190, 40);
    expect(panel.container.position.x).toBe(190 + 174);
    expect(panel.container.position.y).toBe(40);
    panel.anchorToSkill(210, 60, 174);
    expect(panel.container.position.x).toBe(384);
    expect(panel.container.position.y).toBe(60);
  });

  it('Open selects no row initially and sets the scroll range', () => {
    const panel = makePanel();
    panel.Open([
      { slot: 0, skills: [1001000, 1001001, 1001002] },
      { slot: 1, skills: [1001003, 0, 0] },
      { slot: 2, skills: [0, 0, 0] },
      { slot: 3, skills: [0, 0, 0] },
    ]);
    expect(panel.isVisible).toBe(true);
    expect((panel as any)._selectedSlot).toBe(-1);
    // rows = 4 macros → setRange(4-3+1=2) → maxPosition = 2-1 = 1
    expect((panel as any)._scrollBar.maxPosition).toBe(1);
  });

  it('row hit bands match OG GetIndexByPos @0x849f70 (y in [44,76]/[88,120]/[132,164])', () => {
    const panel = makePanel();
    panel.Open(Array.from({ length: 5 }, (_, i) => ({ slot: i, skills: [0, 0, 0] })));
    // rows at y bands
    expect((panel as any)._rowAt(44)).toBe(0);
    expect((panel as any)._rowAt(76)).toBe(0);
    expect((panel as any)._rowAt(77)).toBe(-1); // 77 > 76 → no band
    expect((panel as any)._rowAt(88)).toBe(1);
    expect((panel as any)._rowAt(120)).toBe(1);
    expect((panel as any)._rowAt(132)).toBe(2);
    expect((panel as any)._rowAt(164)).toBe(2);
    expect((panel as any)._rowAt(165)).toBe(-1);
  });

  it('skill slot bands match OG GetIndexByPos (x in [15,47]/[49,81]/[83,115])', () => {
    const panel = makePanel();
    expect((panel as any)._slotAt(15)).toBe(0);
    expect((panel as any)._slotAt(47)).toBe(0);
    expect((panel as any)._slotAt(48)).toBe(-1);
    expect((panel as any)._slotAt(49)).toBe(1);
    expect((panel as any)._slotAt(81)).toBe(1);
    expect((panel as any)._slotAt(83)).toBe(2);
    expect((panel as any)._slotAt(115)).toBe(2);
    expect((panel as any)._slotAt(116)).toBe(-1);
  });

  it('clicking a row band selects that macro (OnSelected)', () => {
    const panel = makePanel();
    panel.Open(Array.from({ length: 5 }, (_, i) => ({ slot: i, skills: [0, 0, 0] })));
    panel.container.position.set(0, 0);
    const hit = panel.handleMouseButton(20, 60, true); // row 0, skill slot 0
    expect(hit).toBe(true);
    expect((panel as any)._selectedSlot).toBe(0);
  });

  it('skill-icon drag starts on a populated slot and returns true', () => {
    const panel = makePanel();
    panel.skillIconOf = (id) => Texture.WHITE;
    panel.Open([{ slot: 0, skills: [1001000, 0, 0] }]);
    panel.container.position.set(0, 0);
    const drags: { skillId: number }[] = [];
    panel.onDragStart = (payload) => { drags.push(payload); };
    const hit = panel.handleMouseButton(20, 60, true);
    expect(hit).toBe(true);
    expect(drags.length).toBe(1);
    expect(drags[0].skillId).toBe(1001000);
  });

  it('tryAcceptDrag drops a skill into the OG slot bands and selects the row', () => {
    const panel = makePanel();
    panel.Open([{ slot: 0, skills: [0, 0, 0] }]);
    panel.container.position.set(0, 0);
    // slot (row 0, skill slot 1) → x band [49,81], y band [44,76]
    expect(panel.tryAcceptDrag({ skillId: 1001001 }, 50, 60)).toBe(true);
    expect((panel as any)._macros[0].skills[1]).toBe(1001001);
    expect((panel as any)._selectedSlot).toBe(0);
    // macro icon slot (x in [136,168]) is not a skill drop target
    expect(panel.tryAcceptDrag({ skillId: 1001002 }, 140, 60)).toBe(false);
    // outside row bands → rejected
    expect(panel.tryAcceptDrag({ skillId: 1001003 }, 20, 180)).toBe(false);
  });

  it('saves macros with safe names and the shout flag (OnButtonClicked id 0xBB8)', () => {
    const panel = makePanel();
    panel.Open([{ slot: 0, skills: [1001000, 0, 0], name: 'Attack!' }]);
    panel.handleMouseButton(20, 60, true); // select row 0
    let saved: any[] | null = null;
    panel.OnSave = (macros) => { saved = macros; };
    (panel as any)._doSave();
    expect(saved).toHaveLength(1);
    expect(saved![0].name).toBe('Attack!');
    expect(saved![0].mute).toBe(false);
    expect(panel.isVisible).toBe(false);
  });
});
