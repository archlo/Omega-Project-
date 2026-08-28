import { WzPackage } from '../src/wz/WzPackage.js';
import { WzProperty } from '../src/wz/WzProperty.js';
import { WzCanvas } from '../src/wz/WzCanvas.js';

const pkg = WzPackage.OpenBase('C:/Users/jorge/OneDrive/Desktop/ts/wz_client', 'UI');

function walk(node, indent, out, depth) {
  if (!node || depth < 0) return;
  const pad = '  '.repeat(indent);
  if (node instanceof WzCanvas) {
    const ox = node.Origin ? ` origin=(${node.Origin.x},${node.Origin.y})` : '';
    out.push(`${pad}[canvas] ${node.Name} ${node.Width}x${node.Height}${ox}`);
    return;
  }
  if (node instanceof WzProperty) {
    out.push(`${pad}[prop] ${node.Name}`);
    const keys = Object.keys(node.Items);
    for (const k of keys) {
      const v = node.Get(k);
      if (v instanceof WzProperty || v instanceof WzCanvas) {
        walk(v, out, depth - 1);
      } else {
        out.push(`${pad}  = ${k}: ${JSON.stringify(v)}`);
      }
    }
  }
}

const ui2 = pkg.GetItem('UI.wz/UIWindow2.img');
const kc = (ui2 instanceof WzProperty ? ui2.Get('KeyConfig') : null);
const out = [];
out.push('=== UIWindow2.img/KeyConfig ===');
walk(kc, out, 3);
console.log(out.join('\n'));

const ui = pkg.GetItem('UI.wz/UIWindow.img');
const kc1 = (ui instanceof WzProperty ? ui.Get('KeyConfig') : null);
const out2 = [];
out2.push('\n=== UIWindow.img/KeyConfig ===');
walk(kc1, out2, 2);
console.log(out2.length > 1 ? out2.join('\n') : '(none)');