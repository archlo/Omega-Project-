import { WzPackage } from '../src/wz/WzPackage.js';
import { WzProperty } from '../src/wz/WzProperty.js';
import { WzCanvas } from '../src/wz/WzCanvas.js';

const pkg = WzPackage.OpenBase('wz_client', 'UI');

function walk(node: unknown, indent: number, out: string[], depth: number): void {
  if (!node || depth < 0) return;
  const pad = '  '.repeat(indent);
  if (node instanceof WzCanvas) {
    const ox = node.Origin ? ` origin=(${node.Origin && (node.Origin as { x: number }).x},${node.Origin && (node.Origin as { x: number }).y})` : '';
    out.push(`${pad}[c] ${node.Name} ${node.Width}x${node.Height}${ox}`);
    return;
  }
  if (node instanceof WzProperty) {
    out.push(`${pad}[p] ${node.Name}`);
    const keys = Object.keys(node.Items);
    for (const k of keys) {
      const v = node.Get(k);
      if (v instanceof WzProperty || v instanceof WzCanvas) walk(v, indent + 1, out, depth - 1);
      else out.push(`${pad}   = ${k}: ${JSON.stringify(v)}`);
    }
  }
}

for (const path of ['UI.wz/UIWindow2.img/KeyConfig', 'UI.wz/UIWindow.img/KeyConfig']) {
  const kc = pkg.GetItem(path);
  console.log(`===== ${path} => ${kc?.constructor?.name} =====`);
  const out: string[] = [];
  walk(kc, 0, out, 3);
  console.log(out.join('\n') || '(empty)');
}