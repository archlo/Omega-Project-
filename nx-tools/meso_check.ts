import { fileURLToPath } from 'node:url';
import { WzPackage } from '../src/wz/WzPackage.js';
import { WzCanvas } from '../src/wz/WzCanvas.js';
import { WzProperty } from '../src/wz/WzProperty.js';

const ui = WzPackage.Open(fileURLToPath(new URL('../wz_client/UI.nx', import.meta.url)));
const item = ui.GetItem('UIWindow2.img/Item');
if (!(item instanceof WzProperty)) { console.error('no Item root'); process.exit(1); }

function sample(name: string) {
  const node = item.Get(name);
  if (!(node instanceof WzCanvas)) { console.error(name, 'not a canvas'); return; }
  const bgra = node.DecodeBgra();
  const w = node.Width, h = node.Height;
  const px = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return 'OOB';
    const o = (y * w + x) * 4;
    const b = bgra[o], g = bgra[o + 1], r = bgra[o + 2], a = bgra[o + 3];
    return `(${w}x${h}) @(${x},${y}) r=${r} g=${g} b=${b} a=${a} -> #${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  };
  console.log(`== ${name} ==`);
  for (const y of [264, 268, 270, 275, 280, 285, 292]) {
    const row = [50, 76, 100, 126, 147, 160].map(x => px(x, y)).join(' | ');
    console.log(`y=${y}: ${row}`);
  }
}

sample('backgrnd');
sample('FullBackgrnd');
