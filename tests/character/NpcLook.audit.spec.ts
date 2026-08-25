import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { WzPackage } from '../../src/wz/WzPackage.js';
import { WzProperty } from '../../src/wz/WzProperty.js';
import { WzImage } from '../../src/wz/WzImage.js';
import { NpcLook } from '../../src/character/NpcLook.js';

const nxDir = process.env.MAPLECLAUDE_NX_DIR ?? 'wz_client';

function findNx(name: string): string | null {
  const p = join(nxDir, name);
  if (existsSync(p)) return p;
  return null;
}

// Stub loader: hands back a fake sprite per canvas so animation frame
// collection runs without GPU textures.
const stubLoader = { Load: () => ({}) } as any;

// Audit: every Npc.nx template must resolve animation frames through
// NpcLook.Load (direct anims or info/link redirect), and every template with
// an info/speak node must surface its String.nx lines through the textOf
// callback.
describe.skipIf(!findNx('Npc.nx'))('NpcLook full-template load audit', () => {
  it('loads anims for every template in Npc.nx', () => {
    const npcWz = WzPackage.Open(findNx('Npc.nx')!);
    const root: any = npcWz.Root;
    const entries: string[] = [];
    for (const [name, val] of Object.entries(root.Items ?? {})) {
      if (name.endsWith('.img')) entries.push(name);
      else if ((val as any)?.Items) {
        for (const n of Object.keys((val as any).Items)) if (n.endsWith('.img')) entries.push(n);
      }
    }
    expect(entries.length).toBeGreaterThan(1500);

    let loaded = 0;
    const failed: string[] = [];
    for (const name of entries) {
      const id = parseInt(name.replace('.img', ''), 10);
      if (!Number.isFinite(id)) continue;
      const look = new NpcLook(id, null as any);
      look.Load(stubLoader, npcWz, undefined);
      if (look.Loaded) loaded++;
      else failed.push(name);
    }
    expect(failed, `templates with no anims after Load (${failed.length}): ${failed.slice(0, 40).join(',')}`).toEqual([]);
    expect(loaded).toBe(entries.length);
  });

  it('resolves speak lines from String.nx via textOf for templates with info/speak', () => {
    const npcWz = WzPackage.Open(findNx('Npc.nx')!);
    const strPath = findNx('String.nx');
    if (!strPath) return;
    const strWz = WzPackage.Open(strPath);

    // NameService-style resolver: String.nx/Npc.img/<id>/<label>
    const npcStringsImg = strWz.GetItem('Npc.img');
    const npcStrings = npcStringsImg instanceof WzImage ? npcStringsImg.Root : null;
    const textOf = (npcId: number, key: string): string | undefined => {
      const entry = npcStrings?.Get(`${npcId}`);
      if (entry instanceof WzProperty) return (entry.Get(key) as string) ?? undefined;
      return undefined;
    };

    const root: any = npcWz.Root;
    const names = Object.keys(root.Items ?? {}).filter((n: string) => n.endsWith('.img'));
    let withSpeak = 0;
    const noTextSamples: string[] = [];
    for (const name of names) {
      const img = npcWz.GetItem(name);
      const rootNode = img instanceof WzImage ? img.Root : null;
      if (!rootNode) continue;
      const info = rootNode.Get('info');
      if (!(info instanceof WzProperty)) continue;
      const speak = (info.Get('speak') as WzProperty | null) ?? (rootNode.Get('speak') as WzProperty | null);
      if (!(speak instanceof WzProperty)) continue;
      withSpeak++;
      const id = parseInt(name.replace('.img', ''), 10);
      const look = new NpcLook(id, null as any);
      look.Load(stubLoader, npcWz, textOf);
      if (look.SpeakLines === 0) noTextSamples.push(name);
    }
    expect(withSpeak).toBeGreaterThan(700);
    expect(noTextSamples, `speak nodes that produced no lines (${noTextSamples.length}): ${noTextSamples.slice(0, 20).join(',')}`).toEqual([]);
  });
});
