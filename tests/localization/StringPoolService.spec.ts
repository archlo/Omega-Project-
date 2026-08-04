import { describe, expect, it } from 'vitest';
import { WzPackage } from '../../src/wz/WzPackage.js';
import { WzImage } from '../../src/wz/WzImage.js';
import { OG_TOOLTIP_STRING_IDS } from '../../src/localization/StringPoolIds.js';
import { StringPoolService } from '../../src/localization/StringPoolService.js';

describe('StringPoolService', () => {
  it('exposes the decompiler-verified tooltip IDs without text guesses', () => {
    expect(OG_TOOLTIP_STRING_IDS.equipTitleDescription).toBe(0xC35);
    expect(OG_TOOLTIP_STRING_IDS.skillLevel).toBe(691);
    expect(OG_TOOLTIP_STRING_IDS.optionProbTime1).toBe(0x16BE);
    expect(OG_TOOLTIP_STRING_IDS.limitHeader).toBe(0xEA7);
  });

  it('loads NoSound.img when the supplied resource contains it', () => {
    const image = new WzImage({} as any, 0);
    (image as any)._root = { Items: { '123': 'Level %d' } };
    const packageLike = {
      Root: { Items: { 'NoSound.img': image } },
    } as any;
    const service = new StringPoolService(() => packageLike);

    expect(service.getString(123)).toBe('Level %d');
    expect(service.formatString(service.getString(123)!, 30)).toBe('Level 30');
    expect(service.formatById(OG_TOOLTIP_STRING_IDS.skillLevel, 30)).toBe('Lv.30');
  });

  it('uses the IDA-extracted embedded v95 table when NoSound.img is absent', () => {
    const stringWz = WzPackage.Open('wz_client/String.nx');
    const service = new StringPoolService(() => stringWz);

    expect(service.getString(OG_TOOLTIP_STRING_IDS.equipTitleDescription)).toBe("'s");
    expect(service.formatById(OG_TOOLTIP_STRING_IDS.skillLevel, 1)).toBe('Lv.1');
  });
});
