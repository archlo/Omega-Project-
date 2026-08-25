import { describe, it, expect } from 'vitest';
import { ActionMan } from '../../src/character/ActionMan.js';
import { WzPackage } from '../../src/wz/WzPackage.js';

describe('weapon stand/walk probe (env-gated)', () => {
  it('polearm entry reports stand=2 walk=2', () => {
    const nx = process.env.MAPLECLAUDE_NX_DIR;
    if (!nx) return;
    const actMan = ActionMan.GetInstance();
    actMan.SetCharacterWz(WzPackage.Open(`${nx}/Character.nx`));
    const e = actMan.GetCharacterImgEntry(1442000, null);
    console.log('entry', JSON.stringify({ nStand: e?.nStand, nWalk: e?.nWalk, nWeapon: e?.nWeapon, after: e?.sWeaponAfterimage }));
    expect(e?.nStand).toBe(2);
    expect(e?.nWalk).toBe(2);
    const sword = actMan.GetCharacterImgEntry(1302000, null);
    console.log('sword', JSON.stringify({ nStand: sword?.nStand, nWalk: sword?.nWalk }));
  });
});
