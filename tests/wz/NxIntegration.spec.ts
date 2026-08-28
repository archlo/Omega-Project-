import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect } from 'vitest';
import { WzPackage } from '../../src/wz/WzPackage.js';
import { WzDirectory } from '../../src/wz/WzDirectory.js';
import { WzImage } from '../../src/wz/WzImage.js';
import { WzProperty } from '../../src/wz/WzProperty.js';

const nxDir = process.env.MAPLECLAUDE_NX_DIR;
const wzDir = process.env.MAPLECLAUDE_WZ_DIR;

function countProps(prop: WzProperty, depth: number): number {
  let count = 0;
  for (const value of Object.values(prop.Items)) {
    count++;
    if (depth > 0 && value instanceof WzProperty) {
      count += countProps(value, depth - 1);
    }
  }
  return count;
}

function countTree(dir: WzDirectory, depth: number): number {
  let count = 0;
  for (const child of Object.values(dir.Items)) {
    count++;
    if (depth <= 0) continue;
    if (child instanceof WzDirectory) {
      count += countTree(child, depth - 1);
    } else if (child instanceof WzImage) {
      count += countProps(child.Root, depth - 1);
    }
  }
  return count;
}

describe('NX integration (real files)', () => {
  if (!nxDir) {
    it('skipped when MAPLECLAUDE_NX_DIR not set', () => {
      console.log('MAPLECLAUDE_NX_DIR not set — skipping NX integration tests');
      expect(true).toBe(true);
    });
    return;
  }

  const nxFiles = fs.readdirSync(nxDir).filter(f => f.toLowerCase().endsWith('.nx'));
  if (nxFiles.length === 0) {
    it('skipped when no .nx files found', () => {
      console.log(`No .nx files in ${nxDir} — skipping NX integration tests`);
      expect(true).toBe(true);
    });
    return;
  }

  it('opens a real .nx package and walks the tree', () => {
    const pkg = WzPackage.Open(path.join(nxDir, nxFiles[0]));
    expect(pkg.Root).toBeInstanceOf(WzDirectory);
    const items = pkg.Root.Items;
    expect(Object.keys(items).length).toBeGreaterThan(0);
    expect(countTree(pkg.Root, 2)).toBeGreaterThan(0);
  });

  it('matches WZ tree shape for a shared asset (parity)', () => {
    if (!wzDir) {
      console.log('MAPLECLAUDE_WZ_DIR not set — skipping parity check');
      return;
    }

    const pair = nxFiles
      .map(nx => ({ nx, wz: nx.slice(0, -3) + '.wz' }))
      .find(p => fs.existsSync(path.join(wzDir, p.wz)));

    if (!pair) {
      console.log(`No matching .wz/.nx pair found between ${wzDir} and ${nxDir} — skipping parity check`);
      return;
    }

    const nxPkg = WzPackage.Open(path.join(nxDir, pair.nx));
    const wzPkg = WzPackage.Open(path.join(wzDir, pair.wz));

    const nxKeys = Object.keys(nxPkg.Root.Items).sort();
    const wzKeys = Object.keys(wzPkg.Root.Items).sort();
    expect(nxKeys).toEqual(wzKeys);

    for (const key of nxKeys) {
      const nxChild = nxPkg.Root.Items[key];
      const wzChild = wzPkg.Root.Items[key];
      expect(nxChild instanceof WzDirectory).toBe(wzChild instanceof WzDirectory);
      expect(nxChild instanceof WzImage).toBe(wzChild instanceof WzImage);
    }

    console.log(`Parity OK for ${pair.nx} <-> ${pair.wz}: ${nxKeys.length} top-level entries match`);
  });

  it('perf: NX load completes (and compares against WZ if available)', () => {
    const nxPath = path.join(nxDir, nxFiles[0]);

    const nxStart = performance.now();
    const nxPkg = WzPackage.Open(nxPath);
    const nxNodeCount = countTree(nxPkg.Root, 3);
    const nxMs = performance.now() - nxStart;
    console.log(`NX load+walk (${nxFiles[0]}, ${nxNodeCount} nodes): ${nxMs.toFixed(1)}ms`);
    expect(nxMs).toBeLessThan(30000);

    if (!wzDir) return;
    const wzName = nxFiles[0].slice(0, -3) + '.wz';
    const wzPath = path.join(wzDir, wzName);
    if (!fs.existsSync(wzPath)) return;

    const wzStart = performance.now();
    const wzPkg = WzPackage.Open(wzPath);
    const wzNodeCount = countTree(wzPkg.Root, 3);
    const wzMs = performance.now() - wzStart;
    console.log(`WZ load+walk (${wzName}, ${wzNodeCount} nodes): ${wzMs.toFixed(1)}ms`);
  });
});
