import { WzPackage } from '../src/wz/WzPackage.js';
import { WzProperty } from '../src/wz/WzProperty.js';
import { WzCanvas } from '../src/wz/WzCanvas.js';

const dir = 'C:/Users/jorge/OneDrive/Desktop/ts/wz_client';
const pkg = WzPackage.OpenBase(dir, 'UI');

for (const root of ['UIWindow.img/ToolTip/Equip', 'UIWindow2.img/ToolTip/Equip', 'UIWindow.img/ToolTip', 'UIWindow2.img/ToolTip']) {
  const v = pkg.GetItem(root);
  console.log('==', root, '=>', v?.constructor?.name ?? 'NULL');
  if (v instanceof WzProperty) {
    const names = v.Keys?.() ?? [];
    console.log('   children:', names.slice(0, 80).join(', '));
  }
}
