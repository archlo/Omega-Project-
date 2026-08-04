import { describe, expect, it } from 'vitest';
import { ItemInfoService } from '../../src/character/ItemInfoService.js';
import { WzPackage } from '../../src/wz/WzPackage.js';

const character = WzPackage.OpenBase('wz_client', 'Character');
const item = WzPackage.OpenBase('wz_client', 'Item');
const skill = WzPackage.OpenBase('wz_client', 'Skill');
const service = new ItemInfoService(character, item, null, null, null, skill);

describe('ItemInfoService canvas resource paths', () => {
  it('resolves item-specific ring icon canvases from Character/Ring', () => {
    expect(service.GetRingIconCanvas(1112000)).not.toBeNull();
    expect(service.GetRingIconCanvas(1112000, true)).not.toBeNull();
  });

  it('resolves pet icon and pet-dead canvases from Item/Pet', () => {
    expect(service.GetPetIconCanvas(5000000)).not.toBeNull();
    expect(service.GetPetIconCanvas(5000000, false, true)).not.toBeNull();
    expect(service.GetPetIconCanvas(5000000, true, true)).not.toBeNull();
  });

  it('resolves skill icon siblings from Skill/<job>.img/skill', () => {
    expect(service.GetSkillIconCanvas(1001004)).not.toBeNull();
    expect(service.GetSkillIconCanvas(1001004, 'iconDisabled')).not.toBeNull();
    expect(service.GetSkillIconCanvas(1001004, 'iconMouseOver')).not.toBeNull();
  });
});
