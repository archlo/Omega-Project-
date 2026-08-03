import { describe, expect, it } from 'vitest';
import { ActionMan } from '../../src/character/ActionMan.js';
import { WzPackage } from '../../src/wz/WzPackage.js';

describe('ActionMan.GetCharacterImgEntry', () => {
  const man = ActionMan.GetInstance();

  it('resolves the weapon img itself when pImg is null (OG get_equip_data_path 0x5A6060)', () => {
    man.SetCharacterWz(WzPackage.OpenBase('wz_client', 'Character'));

    // Polearm — only stand2/walk2 exist; info/stand=2, info/walk=2.
    const polearm = man.GetCharacterImgEntry(1442000, null);
    expect(polearm).not.toBeNull();
    expect(polearm!.nWeapon).toBe(12);
    expect(polearm!.nStand).toBe(2);
    expect(polearm!.nWalk).toBe(2);
    expect(polearm!.nAttack).toBe(2);
    expect(polearm!.nAttackSpeed).toBe(8);
    expect(polearm!.sWeaponAfterimage).toBe('poleArm');
  });

  it('keeps one-handed weapons on stand1/walk1', () => {
    const sword = man.GetCharacterImgEntry(1302000, null);
    expect(sword).not.toBeNull();
    expect(sword!.nWeapon).toBe(1);
    expect(sword!.nStand).toBe(1);
    expect(sword!.nWalk).toBe(1);
  });

  it('loads a taming mob body img but gates weapon fields off (OG GetWeaponType gate)', () => {
    const tm = man.GetCharacterImgEntry(1902000, null);
    expect(tm).not.toBeNull();
    expect(tm!.pImg).not.toBeNull();
    expect(tm!.nWeapon).toBe(0);
    expect(tm!.nStand).toBe(0);
    expect(tm!.nWalk).toBe(0);
  });

  it('returns null for a non-equip id with no resolvable image', () => {
    expect(man.GetCharacterImgEntry(4000000, null)).toBeNull();
  });
});
