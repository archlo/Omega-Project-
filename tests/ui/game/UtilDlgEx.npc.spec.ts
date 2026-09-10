import { describe, expect, it } from 'vitest';
import { Container, Sprite } from 'pixi.js';
import { UtilDlgEx, UtilDlgType } from '../../../src/ui/game/UtilDlgEx.js';
import { WzPackage } from '../../../src/wz/WzPackage.js';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';

const nxDir = process.env.MAPLECLAUDE_NX_DIR ?? '';

function btnIds(dlg: UtilDlgEx): number[] {
  const root = (dlg as any)._root as Container;
  return root.children
    .filter((c) => (c as any).__btnId !== undefined)
    .map((c) => (c as any).__btnId as number);
}

describe.skipIf(!nxDir)('UtilDlgEx NPC dialog (real NX repro)', () => {
  function openSay(): UtilDlgEx {
    const uiWz = WzPackage.Open(`${nxDir}/UI.nx`);
    const npcWz = WzPackage.Open(`${nxDir}/Npc.nx`);
    const dlg = new UtilDlgEx({ uiWz, npcWz, loader: new WzTextureLoader() });
    dlg.npcNameOf = () => 'Grendel the Really Old';
    // Exact GameStage._onScriptMessage Say sequence.
    dlg.SetUtilDlgEx(UtilDlgType.TEXT, 1012000, false, false, 'Hello traveler!');
    dlg.SetUtilDlgEx_TEXT(false, true);
    dlg.show();
    return dlg;
  }

  it('renders the NPC speaker layer', () => {
    const dlg = openSay();
    const npcLayer = (dlg as any)._npcLayer as Container;
    expect(npcLayer.children.length).toBeGreaterThan(0);
  });

  it('builds Next + Close buttons with WZ art', () => {
    const dlg = openSay();
    const ids = btnIds(dlg);
    // Say with hasNext: Next (8193); param&1==0 so Close (2) too.
    expect(ids).toContain(8193);
    expect(ids).toContain(2);
    const root = (dlg as any)._root as Container;
    const next = root.children.find((c) => (c as any).__btnId === 8193)!;
    // Real WZ art: a Sprite child, not the Graphics+Text fallback.
    expect(next.children.some((c) => c instanceof Sprite)).toBe(true);
  });

  it('builds OK + Close for a terminal Say', () => {
    const uiWz = WzPackage.Open(`${nxDir}/UI.nx`);
    const npcWz = WzPackage.Open(`${nxDir}/Npc.nx`);
    const dlg = new UtilDlgEx({ uiWz, npcWz, loader: new WzTextureLoader() });
    dlg.SetUtilDlgEx(UtilDlgType.TEXT, 1012000, false, false, 'Farewell.');
    dlg.SetUtilDlgEx_TEXT(false, false);
    dlg.show();
    expect(btnIds(dlg)).toContain(1);
    expect(btnIds(dlg)).toContain(2);
  });
});
