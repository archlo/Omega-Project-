import { WzPackage } from '../src/wz/WzPackage.js';
import { WzProperty } from '../src/wz/WzProperty.js';
import { WzCanvas } from '../src/wz/WzCanvas.js';

const pkg = WzPackage.OpenBase('wz_client', 'UI');

const root = (pkg as unknown as { Root?: unknown }).Root ?? pkg;
console.log('pkg:', pkg.constructor.name);
console.log('root:', (root as any)?.constructor?.name);

// Try to enumerate directory children
const dirs = (pkg as any).Directory?.children ?? (pkg as any).Director?? null;
function probe(obj: any, label: string) {
  if (!obj) { console.log(label, 'null'); return; }
  if (typeof obj === 'string') { console.log(label, 'str', obj); return; }
  const keys = Object.keys(obj);
  console.log(label, keys.slice(0, 40));
}
probe(root, 'root keys:');
probe((root as any)?.Get?.('UIWindow2.img'), 'UIWindow2.img prop:');
probe((root as any)?.Get?.('UIWindow.img'), 'UIWindow.img prop:');

const ui2 = pkg.GetItem('UI.wz/UIWindow2.img');
console.log('GetItem UI.wz/UIWindow2.img =>', ui2?.constructor?.name);

// Try all path forms for KeyConfig
for (const p of ['UIWindow2.img/KeyConfig', 'KeyConfig', 'UIWindow2.img', 'UIWindow.img/KeyConfig']) {
  const r = (pkg.GetItem as any)(p);
  console.log(`GetItem('${p}') =>`, r?.constructor?.name ?? 'undefined');
}