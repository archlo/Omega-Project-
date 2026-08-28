import { WzPackage } from '../src/wz/WzPackage.js';
import { WzProperty } from '../src/wz/WzProperty.js';

const dir = 'C:/Users/jorge/OneDrive/Desktop/ts/wz_client';
const pkg = WzPackage.OpenBase(dir, 'UI');

function list(root: string, max = 120) {
  const v = pkg.GetItem(root);
  console.log('==', root, '=>', v?.constructor?.name ?? 'NULL');
  if (v instanceof WzProperty) {
    const names: string[] = [];
    for (const k of Object.keys(v.Items)) names.push(String(k));
    console.log('   children(%d):', names.length, names.slice(0, max).join(', '));
  }
}

list('UIWindow.img/ToolTip/Equip/Can');
list('UIWindow.img/ToolTip/Equip/Cannot');
list('UIWindow.img/ToolTip/Equip/Dot');
list('UIWindow.img/ToolTip/Equip/GrowthEnabled');
list('UIWindow.img/ToolTip/Equip/GrowthDisabled');
list('UIWindow.img/ToolTip/Equip/ItemCategory');
list('UIWindow.img/ToolTip/Equip/Property');
list('UIWindow.img/ToolTip/Equip/Speed');
list('UIWindow.img/ToolTip/Equip/Star');
list('UIWindow.img/ToolTip/Equip/WeaponCategory');
