import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { WzPackage } from '../../src/wz/WzPackage.js';
import { InPacket } from '../../src/net/packet/InPacket.js';

const nxDir = process.env.MAPLECLAUDE_NX_DIR ?? 'wz_client';

describe.skipIf(!existsSync(join(nxDir, 'Reactor.nx')))('ReactorLook real-NX states', () => {
  it('loads every state of the big-chick reactor (1002000) and animates on hit', () => {
    const reactorWz = WzPackage.Open(join(nxDir, 'Reactor.nx'));
    // dynamic import to avoid module cycle in plain vitest
    return import('../../src/character/ReactorLook.js').then(({ ReactorLook }) => {
      const loader = {
        Load: () => ({
          Texture: {} as never, OriginX: 0, OriginY: 0, Width: 10, Height: 10,
          ToPixi: () => { throw new Error('not reached'); },
        }),
      } as any;
      const look = new ReactorLook(1, 1002000, 0);
      look.Load(loader, reactorWz);

      // 1002000.img carries 5+ numbered state subtrees in Reactor.nx.
      const anims = (look as unknown as { _anims: Map<number, unknown[]> })._anims;
      expect(anims.size).toBeGreaterThanOrEqual(5);

      look.SetState(4);
      look.Update(0.05);
      // After Update the display was rebuilt with real sprite children
      // (no colored placeholder box).
      const kids = (look.container.children ?? []) as Array<{ constructor: { name: string } }>;
      expect(kids.length).toBeGreaterThan(0);
      expect(kids[0].constructor.name).toBe('Sprite');
    });
  });
});

describe('GameSender.HitReactor wire format', () => {
  it('encodes fields in the order the server decodes them', async () => {
    const { GameSender } = await import('../../src/net/senders/GameSender.js');
    const p = new InPacket(GameSender.HitReactor(7, 0, 30, 4001344).toArray());
    expect(p.readShort()).toBe(249); // InHeader.UserHitReactor
    const objectId = p.readInt();
    const skillReactor = p.readInt();
    const hitOption = p.readInt();
    const delay = p.readShort();
    const skillId = p.readInt();
    expect(objectId).toBe(7);
    expect(skillReactor).toBe(0);
    expect(hitOption).toBe(0);
    expect(delay).toBe(30);
    expect(skillId).toBe(4001344);
  });
});
