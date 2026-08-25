import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Container } from 'pixi.js';
import { WzPackage } from '../../src/wz/WzPackage.js';
import { WzProperty } from '../../src/wz/WzProperty.js';
import { NpcLook, NPC_QUEST_STATE } from '../../src/character/NpcLook.js';

const nxDir = process.env.MAPLECLAUDE_NX_DIR ?? 'wz_client';

// Loader shim: hands back origin-carrying fake sprites so the full
// Load -> SetQuestList -> Update -> _drawQuestIcon chain runs against real NX.
function makeLoader() {
  return {
    Load: () => ({
      Texture: {} as never,
      OriginX: 0,
      OriginY: 86,
      Width: 50,
      Height: 90,
      ToPixi: () => new Container(),
    }),
  } as any;
}

describe.skipIf(!existsSync(join(nxDir, 'Npc.nx')))('NPC quest mark end-to-end (real NX)', () => {
  it('renders a PreStart quest icon above the NPC head', () => {
    const npcWz = WzPackage.Open(join(nxDir, 'Npc.nx'));
    const uiWz = existsSync(join(nxDir, 'UI.nx')) ? WzPackage.Open(join(nxDir, 'UI.nx')) : null;
    const look = new NpcLook(10000, uiWz);
    look.Load(makeLoader(), npcWz);
    expect(look.Loaded).toBe(true);

    look.SetQuestList(NPC_QUEST_STATE.PreStart);
    expect(look.QuestInfoVisible).toBe(true);
    // Frames must have loaded from UIWindow2.img/QuestIcon/0.
    expect((look as any)._questFrames.length).toBeGreaterThan(0);

    look.Update(0.05);
    const icon = (look as any)._questIconContainer;
    expect(icon).toBeTruthy();
    expect(icon.children.length).toBeGreaterThan(0);
    // OG offset: x = BalloonOffset.x + 20; y = -15 - BalloonOffset.y - head height.
    expect(icon.x).toBe(20);
    expect(icon.y).toBeLessThan(0);

    // Clearing to None empties the layer.
    look.SetQuestList(NPC_QUEST_STATE.None);
    expect(look.QuestInfoVisible).toBe(false);
    expect((look as any)._questIconContainer.children.length).toBe(0);
  });

  it('surfaces real String.nx speak lines instead of generic greetings', () => {
    const npcWz = WzPackage.Open(join(nxDir, 'Npc.nx'));
    const strWz = existsSync(join(nxDir, 'String.nx')) ? WzPackage.Open(join(nxDir, 'String.nx')) : null;
    if (!strWz) return;
    const npcStringsImg = strWz.GetItem('Npc.img');
    const root = npcStringsImg && typeof (npcStringsImg as any).Root !== 'undefined' ? (npcStringsImg as any).Root : null;
    const textOf = (npcId: number, key: string): string | undefined => {
      const entry = root?.Get(`${npcId}`);
      if (entry instanceof WzProperty) return (entry.Get(key) as string) ?? undefined;
      return undefined;
    };

    // Roger (2000): info/speak labels n0..n2 resolve to String.nx lines.
    const roger = new NpcLook(2000, uiWzOf());
    roger.Load(makeLoader(), npcWz, textOf);
    expect(roger.SpeakLines).toBeGreaterThan(0);
    const speech = roger.GetRandomSpeech();
    expect(speech).toBeTruthy();
    expect(speech).not.toBe('Hello, adventurer!'); // no invented fallback text

    function uiWzOf() {
      return existsSync(join(nxDir, 'UI.nx')) ? WzPackage.Open(join(nxDir, 'UI.nx')) : null;
    }
  });
});
