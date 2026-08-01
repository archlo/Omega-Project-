import { WzPackage } from './src/wz/WzPackage.js';
import { WzProperty } from './src/wz/WzProperty.js';
import { WzCanvas } from './src/wz/WzCanvas.js';

const charWz = WzPackage.OpenBase('wz_client', 'Character');
const itemWz = WzPackage.OpenBase('wz_client', 'Item');

console.log('Character.wz:', !!charWz);
console.log('Item.wz:', !!itemWz);

if (charWz) {
  const cap = charWz.GetItem('Cap/01002000.img');
  console.log('\nCap/01002000.img:', !!cap, cap?.constructor.name);
  if (cap instanceof WzProperty) {
    const info = cap.Get('info');
    console.log('  info:', !!info, info?.constructor.name);
    if (info instanceof WzProperty) {
      const icon = info.Get('icon');
      console.log('  info/icon:', !!icon, icon?.constructor.name);
      if (icon instanceof WzCanvas) {
        console.log('  icon size:', icon.Width, 'x', icon.Height);
      }
    }
  }
}

if (itemWz) {
  const potion = itemWz.GetItem('Consume/0200.img/02000000');
  console.log('\nConsume/0200.img/02000000:', !!potion, potion?.constructor.name);
  if (potion instanceof WzProperty) {
    const info = potion.Get('info');
    console.log('  info:', !!info, info?.constructor.name);
    if (info instanceof WzProperty) {
      const icon = info.Get('icon');
      console.log('  info/icon:', !!icon, icon?.constructor.name);
    }
  }
}
