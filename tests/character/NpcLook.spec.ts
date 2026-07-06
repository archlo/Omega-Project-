import { describe, expect, it } from 'vitest';
import { NpcLook } from '../../src/character/NpcLook.js';
import { WzProperty } from '../../src/wz/WzProperty.js';
import { WzImage } from '../../src/wz/WzImage.js';

function prop(items: Record<string, unknown>): WzProperty {
  return new WzProperty(null as any, 0, items);
}

describe('NpcLook', () => {
  it('resolves OG speak labels through String/Npc text', () => {
    const npcRoot = prop({
      speak: prop({ group: prop({ text: 'n0' }) }),
    });
    const npcWz = {
      GetItem(path: string) {
        if (path !== '2071010.img') return null;
        const image = Object.create(WzImage.prototype);
        Object.defineProperty(image, 'Root', { get: () => npcRoot });
        return image;
      },
    } as any;

    const npc = new NpcLook(2071010);
    npc.Load({ Load: () => { throw new Error('no sprites in this fixture'); } } as any, npcWz, (_id, key) => key === 'n0' ? 'Resolved speech' : undefined);

    expect(npc.GetRandomSpeech()).toBe('Resolved speech');
  });

  it('loads OG separate name/function tag fields and hideName flag', () => {
    const npcRoot = prop({
      info: prop({ hideName: 1 }),
    });
    const npcWz = {
      GetItem(path: string) {
        if (path !== '1002005.img') return null;
        const image = Object.create(WzImage.prototype);
        Object.defineProperty(image, 'Root', { get: () => npcRoot });
        return image;
      },
    } as any;

    const npc = new NpcLook(1002005);
    npc.Load({ Load: () => { throw new Error('no sprites in this fixture'); } } as any, npcWz, (_id, key) => {
      if (key === 'name') return 'Mr. Kim';
      if (key === 'func') return 'Storage Keeper';
      return undefined;
    });

    expect(npc.Name).toBe('Mr. Kim');
    expect(npc.FuncName).toBe('Storage Keeper');
    expect(npc.ShowNameTag).toBe(false);
  });
});
