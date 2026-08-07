import { describe, expect, it } from 'vitest';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';
import { BuiltInFont } from '../../../src/ui/BuiltInFont.js';
import { StatusBar } from '../../../src/ui/game/StatusBar.js';

describe('StatusBar warning flash', () => {
  it('flashes only when HP decreases below the OG configured threshold', () => {
    const bar = new StatusBar(new WzTextureLoader(), null, new BuiltInFont());
    bar.hpFlash = 10; // OG default: threshold = 5 * setting = 50%.
    bar.hp = 60;
    bar.maxHp = 100;
    bar.update(0);

    bar.hp = 49;
    bar.update(0);
    expect((bar as any)._hpFlashTime).toBe(0.5);

    (bar as any)._hpFlashTime = 0;
    bar.update(0);
    expect((bar as any)._hpFlashTime).toBe(0);

    bar.hpFlash = 0;
    bar.hp = 10;
    bar.update(0);
    expect((bar as any)._hpFlashTime).toBe(0);
  });
});

describe('StatusBar gauge fill (OG CGauge::SetVal 0x86DEA0)', () => {
  it('fills exactly to gauge length at 100%, never overshoots, min 1px', () => {
    // nLen = max(1, floor(len * pct))
    expect(StatusBar.gaugeFillLength(138, 1)).toBe(138);   // full = exactly full
    expect(StatusBar.gaugeFillLength(138, 0.5)).toBe(69);
    expect(StatusBar.gaugeFillLength(138, 0)).toBe(1);     // OG: min 1px center
    expect(StatusBar.gaugeFillLength(308, 0.9998)).toBe(307); // EXP 99.98% clamp: never fully full
    expect(StatusBar.gaugeFillLength(138, 1.5)).toBe(138); // clamped, no overshoot
  });

  it('animates toward the target exponentially (per-frame retarget) without overshoot', () => {
    const bar = new StatusBar(new WzTextureLoader(), null, new BuiltInFont());
    bar.hp = 50; bar.maxHp = 50;
    bar.update(1); // k = min(1, 1/0.7) = 1 -> snap
    expect((bar as any)._hpPct).toBe(1);

    bar.hp = 0;
    bar.update(1);
    expect((bar as any)._hpPct).toBe(0);

    bar.hp = 50; bar.maxHp = 50;
    bar.update(0.35); // k = 0.5: 0 -> 0.5
    expect((bar as any)._hpPct).toBeCloseTo(0.5);
    bar.update(0.35); // 0.5 -> 0.75
    expect((bar as any)._hpPct).toBeCloseTo(0.75);
    bar.update(10);   // converge
    expect((bar as any)._hpPct).toBe(1);
    expect((bar as any)._hpPct).toBeLessThanOrEqual(1);
  });

  it('clamps EXP to 99.98% and formats the text like OG "%d[%0.2f%%]"', () => {
    const bar = new StatusBar(new WzTextureLoader(), null, new BuiltInFont());
    bar.exp = 50; bar.nextExp = 100;
    bar.update(1);
    expect((bar as any)._expPct).toBe(0.5);
    expect((bar as any)._lastExpText).toBe('50[50.00%]');

    bar.exp = 100; bar.nextExp = 100;
    bar.update(1);
    expect((bar as any)._lastExpText).toBe('100[99.98%]');
  });
});

describe('StatusBar name plate (OG SetStatusValue 0x873590)', () => {
  it('draws ONLY the job name above the character name — no "Lv.X" prefix', () => {
    const bar = new StatusBar(new WzTextureLoader(), null, new BuiltInFont());
    bar.charName = 'Heena';
    bar.jobName = 'Beginner';
    bar.level = 12;
    bar.update(0);
    const children = (bar as any)._textLayer.children as any[];
    // Job line is the job name alone (OG get_job_name at (75, 549)).
    expect(children.some((c) => c.text === 'Beginner' && c.position.y === (bar as any)._barTopLeft.y + 52)).toBe(true);
    expect(children.some((c) => c.text === 'Lv.12 Beginner')).toBe(false);
    // Character name below the job: 1 white center + 4 black outline corners.
    const white = children.filter((c) => c.text === 'Heena' && c.style?.fill === 0xffffff);
    expect(white.length).toBe(1);
    const outline = children.filter((c) => c.text === 'Heena' && c.style?.fill === 0x000000);
    expect(outline.length).toBe(4);
    const atNameY = (c: any) => Math.abs(c.position.y - ((bar as any)._barTopLeft.y + 64)) <= 1;
    expect(white.filter(atNameY).length).toBe(1);
    expect(outline.filter(atNameY).length).toBe(4);
  });
});
