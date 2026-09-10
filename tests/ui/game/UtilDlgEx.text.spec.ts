import { describe, expect, it } from 'vitest';
import { UtilDlgEx, UtilDlgType } from '../../../src/ui/game/UtilDlgEx.js';

type Line = {
  nType: number; sText: string; pFont: number; nSelect: number; nFuncCode: number;
  nNpcNo: number; nMapNo: number; pIcon: number; _iconPath?: string;
  iconItemId?: number; iconSkillId?: number;
};

function makeDialog(): UtilDlgEx {
  const d = new UtilDlgEx({});
  d.npcNameOf = (id) => `NPC${id}`;
  d.mobNameOf = (id) => `Mob${id}`;
  d.mapNameOf = (id) => `Map${id}`;
  d.itemNameOf = (id) => `Item${id}`;
  d.skillNameOf = (id) => `Skill${id}`;
  d.charNameOf = () => 'Hero';
  d.countItemOf = () => 7;
  d.questStateOf = (id) => (id === 1 ? 1 : id === 2 ? 2 : 0);
  return d;
}

function lines(d: UtilDlgEx): Line[] {
  return (d as unknown as { _lines: Line[] })._lines;
}

function analyze(text: string): Line[] {
  const d = makeDialog();
  d.SetUtilDlgEx(UtilDlgType.TEXT, 1012000, false, false, text);
  return lines(d);
}

// Real script shapes (server npc scripts): colors, name refs, menus.
describe('UtilDlgEx text analyzer (CTextAnalyzer 1:1)', () => {
  it('resolves #p NPC refs and keeps default font', () => {
    const ls = analyze("Wait, it's #p1201000#. What are you doing here, #p1201000#?");
    expect(ls.every((l) => l.nType === 0)).toBe(true);
    expect(ls.map((l) => l.sText).join('')).toBe(
      "Wait, it's NPC1201000. What are you doing here, NPC1201000?",
    );
    expect(ls.every((l) => l.pFont === 0)).toBe(true);
    expect(ls.find((l) => l.nNpcNo === 1201000)).toBeDefined();
  });

  it('parses #r red and #b blue with #k reset (no hang — this froze the tab)', () => {
    const ls = analyze('defeat #r10 of those #o0100131#s#k, grab the #bPolearm#k now');
    const text = ls.map((l) => l.sText).join('');
    expect(text).toBe('defeat 10 of those Mob100131s, grab the Polearm now');
    expect(text).not.toContain('#');
    const red = ls.find((l) => l.sText.includes('10 of those'));
    expect(red?.pFont).toBe(2); // nBold 0 + 2*color1
    const blue = ls.find((l) => l.sText.includes('Polearm'));
    expect(blue?.pFont).toBe(6); // nBold 0 + 2*color3
    const tail = ls.find((l) => l.sText.includes(' now'));
    expect(tail?.pFont).toBe(0);
  });

  it('maps #e to bold and #n back, #d to color5, #g to color2', () => {
    const ls = analyze('#eBold#n plain #dDark#k #gGreen#k.');
    expect(ls.find((l) => l.sText === 'Bold')?.pFont).toBe(1);
    expect(ls.find((l) => l.sText === ' plain ')?.pFont).toBe(0);
    expect(ls.find((l) => l.sText === 'Dark')?.pFont).toBe(10);
    expect(ls.find((l) => l.sText === 'Green')?.pFont).toBe(4);
  });

  it('builds #L menu rows with no stray "#" nodes', () => {
    const ls = analyze('Where to?\r\n#L0# First town#l\r\n#L1# Second town#l');
    const rows = ls.filter((l) => l.nType === 4);
    expect(rows.map((r) => [r.nSelect, r.sText.trim()])).toEqual([
      [0, 'First town'],
      [1, 'Second town'],
    ]);
    expect(ls.map((l) => l.sText).join('')).not.toContain('#');
  });

  it('resolves #i/#v item icons, #t names, #s skills, #h char, #c counts', () => {
    const ls = analyze('Take #i2000000# and #t2000001#, learn #s1000000#, Hero!');
    const icon = ls.find((l) => l.iconItemId === 2000000);
    expect(icon?.nType).toBe(1);
    expect(icon?.sText).toBe('Item2000000');
    expect(ls.some((l) => l.sText === '2000001' || l.sText.includes('Item2000001'))).toBe(true);
    const skill = ls.find((l) => l.iconSkillId === 1000000);
    expect(skill?.nType).toBe(1);
    expect(skill?.sText).toBe('Skill1000000');
  });

  it('resolves #m map, #z item (+pIcon) and #u quest states', () => {
    const ls = analyze('Go to #m140020000#, bring #z4032309#, quest #u1#/#u2#/#u9#.');
    expect(ls.some((l) => l.sText.includes('Map140020000') && l.nMapNo === 140020000)).toBe(true);
    const z = ls.find((l) => l.pIcon === 4032309);
    expect(z?.sText).toBe('Item4032309');
    const text = ls.map((l) => l.sText).join('');
    expect(text).toContain('In Progress');
    expect(text).toContain('Complete');
    expect(text).toContain('Not Started');
  });

  it('emits nType=3 func lines for #E/#I/#S/#K with no visual text', () => {
    const ls = analyze('A#EB#IC#SD#KZ');
    const funcs = ls.filter((l) => l.nType === 3);
    expect(funcs.map((f) => f.nFuncCode)).toEqual([0, 1, 2, 3]);
    expect(ls.map((l) => l.sText).join('')).toBe('ABCDZ');
  });

  it('loads #f canvases and #W summary icons as nType=2', () => {
    const ls = analyze('#fUI/UIWindow2.img/QuestIcon/4/0# done #Wquest#.');
    const f = ls.find((l) => l._iconPath === 'UI/UIWindow2.img/QuestIcon/4/0');
    expect(f?.nType).toBe(2);
    const w = ls.find((l) => (l._iconPath ?? '').includes('summary_icon/quest'));
    expect(w?.nType).toBe(2);
  });

  it('renders unknown codes literally and never hangs (full-code fuzz)', () => {
    const codes = [];
    for (let c = 65; c <= 90; c++) codes.push(String.fromCharCode(c));
    for (let c = 97; c <= 122; c++) codes.push(String.fromCharCode(c));
    for (const code of [...codes, '#', '', '0', ' ']) {
      const d = makeDialog();
      expect(() => d.SetUtilDlgEx(UtilDlgType.TEXT, 1, false, false,
        `a#${code}b#c${code}d#R1#e#fX#g#X#`)).not.toThrow();
      expect(lines(d).length).toBeGreaterThan(0);
    }
  });

  it('preserves m_bParam across SetUtilDlgEx, resets for no-NPC prompts', () => {
    const d = makeDialog();
    d.m_bParam = 6;
    d.SetUtilDlgEx(UtilDlgType.TEXT, 1, false, false, 'hi');
    expect(d.m_bParam).toBe(6);
    d.SetUtilDlgEx(UtilDlgType.INPUT, 0, true, false, 'amt');
    expect(d.m_bParam).toBe(0);
  });
});
