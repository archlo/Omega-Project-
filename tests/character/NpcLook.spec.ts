import { describe, expect, it } from 'vitest';
import { NpcLook } from '../../src/character/NpcLook.js';
import { WzProperty } from '../../src/wz/WzProperty.js';
import { WzImage } from '../../src/wz/WzImage.js';

function prop(items: Record<string, unknown>): WzProperty {
  return new WzProperty(null as any, 0, items);
}

describe('NpcLook', () => {
  it('transitions packed movement actions at path element boundaries', () => {
    const npc = new NpcLook(1);
    const animations = new Map<string, any[]>([
      ['stand', [{}]], ['move', [{}]], ['wave', [{}]],
    ]);
    (npc as any)._anims = animations;
    (npc as any)._actionNames = ['wave'];

    npc.ReplayMove({
      originX: 0, originY: 0, originVx: 0, originVy: 0,
      elements: [
        { attr: 0, x: 10, y: 0, vx: 0, vy: 0, fh: 0, moveAction: 2, elapse: 100 },
        { attr: 20, x: 10, y: 0, vx: 0, vy: 0, fh: 0, moveAction: 4, elapse: 0 },
      ],
    } as any);

    expect((npc as any)._state).toBe('move');
    npc.Update(0.1);
    expect((npc as any)._state).toBe('wave');
  });

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
