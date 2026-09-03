import { WzPackage } from '../src/wz/WzPackage.js';
const pkg = WzPackage.Open('C:/Users/jorge/OneDrive/Desktop/ts/wz_client/Map.nx', 95);
const img = pkg.GetItem('WorldMap/WorldMap010.img');
function walk(n, prefix, depth) {
  if (depth > 5) return;
  if (n === null || n === undefined) { console.log(prefix + ' = null'); return; }
  const cn = n.constructor.name;
  if (cn === 'WzImage') { walk(n.Root, prefix, depth); return; }
  if (cn === 'WzProperty') {
    const keys = Object.keys(n.Items);
    if (depth >= 5) { console.log(prefix + ' {' + keys.length + ':' + keys.join(',') + '}'); return; }
    for (const k of keys) walk(n.Get(k), prefix + '/' + k, depth + 1);
    return;
  }
  if (cn === 'WzCanvas') {
    const o = n.Property.Get('origin');
    const s = n.Property.Get('spot');
    console.log(prefix + ' [canvas ' + n.Width + 'x' + n.Height + ' origin=' + (o ? JSON.stringify(o) : '?') + ' spot=' + (s ? JSON.stringify(s) : '?') + ']');
    return;
  }
  if (cn === 'WzVector') { console.log(prefix + ' = vector' + JSON.stringify(n)); return; }
  if (typeof n === 'number' || typeof n === 'bigint') { console.log(prefix + ' = ' + String(n)); return; }
  if (typeof n === 'string') { console.log(prefix + ' = "' + n + '"'); return; }
  console.log(prefix + ' [' + cn + ']');
}
walk(img, 'WorldMap010.img', 0);