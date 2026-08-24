import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect } from 'vitest';
import { Text } from 'pixi.js';
import { WzPackage } from '../../../src/wz/WzPackage.js';
import { SkillInfoService } from '../../../src/character/SkillInfoService.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';
import { SkillBook, SkillRow } from '../../../src/ui/game/SkillBook.js';

Object.defineProperty(Text.prototype, 'width', { get: () => 0 });
(globalThis as any).localStorage = { getItem: () => null, setItem: () => {} };

const nxDir = process.env.MAPLECLAUDE_NX_DIR;

describe('SkillBook.update with REAL NX data', () => {
  if (!nxDir || !fs.existsSync(path.join(nxDir, 'Skill.nx'))) {
    it('skipped without MAPLECLAUDE_NX_DIR', () => expect(true).toBe(true));
    return;
  }

  it('update() does not throw', () => {
    const skillWz = WzPackage.Open(path.join(nxDir, 'Skill.nx'));
    const stringWz = WzPackage.Open(path.join(nxDir, 'String.nx'));
    const svc = new SkillInfoService(() => skillWz, () => stringWz);
    const loader = new WzTextureLoader();

    const sb: any = new SkillBook();
    sb.isVisible = true;
    sb.skillService = svc;
    sb.textureLoader = loader;
    // warrior-like tab
    sb.setSkills([
      new SkillRow(1000000, 'Recovery', 5, 10, false),
      new SkillRow(1001001, 'Power Strike', 10, 20, false),
      new SkillRow(1001002, 'Slash Blast', 10, 20, false),
      new SkillRow(1001003, 'Iron Body', 3, 20, false),
    ]);
    sb['_hoverIndex'] = 1;
    sb['_cooldowns'].set(1001001, { remaining: 4, coolFrame: 0, coolFrameTimer: 0 });
    sb.skillBonusOf = () => 0;
    for (let f = 0; f < 6; f++) {
      sb['_hoverIndex'] = f % 4;
      expect(() => sb.update(0.05)).not.toThrow();
    }
  });
});
