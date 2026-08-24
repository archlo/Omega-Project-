import { describe, it, expect } from 'vitest';
import { Text } from 'pixi.js';
import { SkillBook, SkillRow } from '../../../src/ui/game/SkillBook.js';
import { SkillInfo } from '../../../src/character/SkillInfoService.js';

Object.defineProperty(Text.prototype, 'width', { get: () => 0 });
(globalThis as any).localStorage = { getItem: () => null, setItem: () => {} };

function makeBook(): any {
  const sb: any = new SkillBook();
  sb.isVisible = true;
  const icon = { width: 32, height: 32 } as any;
  sb.skillService = {
    Get: (id: number) => {
      const info = new SkillInfo();
      (info as any).Icon = icon;
      (info as any).Icon0 = icon;
      (info as any).Icon1 = icon;
      (info as any).Icon2 = icon;
      return info;
    },
    GetBookIcon: () => null,
    GetBookName: () => null,
  };
  sb.textureLoader = { Load: () => ({ Texture: { width: 10 } as any }) };
  sb.setSkills([
    new SkillRow(1100001, 'a', 1, 10, false),
    new SkillRow(2000000, 'b', 1, 10, false),
  ]);
  sb['_cooldowns'].set(1100001, { remaining: 5, coolFrame: 0, coolFrameTimer: 0 });
  return sb;
}

describe('null-injection probe', () => {
  const keys = [
    '_rowIcons', '_rowSlotBgs', '_rowRecommendBgs', '_rowNames', '_rowLevels',
    '_rowCds', '_rowCoolTimeSprites', '_rowBonuses', '_rowSpBtns', '_rowLineBgs',
    '_tabSprites', '_tabLabels', '_guideBtns', '_bookIcon', '_coolTimeSprite',
    'textureLoader', 'skillService', 'skillIncPanel', 'skillDecPanel',
    'skillChangeConfirm', '_scrollBar',
  ];

  it('finds which nulled field yields reading x of null', () => {
    const results: string[] = [];
    for (const key of keys) {
      for (const mode of ['null-prop', 'null-entry']) {
        const sb = makeBook();
        if (mode === 'null-prop') sb[key] = null;
        else if (Array.isArray(sb[key]) && sb[key].length > 0) sb[key][0] = null;
        else continue;
        try {
          sb.update(0.05);
          results.push(`${key}(${mode}): ok`);
        } catch (e: any) {
          results.push(`${key}(${mode}): ${e.message}`);
        }
      }
    }
    console.log(results.join('\n'));
    expect(true).toBe(true);
  });
});
