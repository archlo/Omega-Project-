import { WzPackage } from './src/wz/WzPackage.js';
import { WzProperty } from './src/wz/WzProperty.js';
import { WzCanvas } from './src/wz/WzCanvas.js';

const charWz = WzPackage.OpenBase('wz_client', 'Character');
const cap = charWz.GetItem('Cap/01002000.img');
console.log('cap:', cap?.constructor.name);
// NxImage has .Root property
const root = (cap as any).Root;
console.log('root:', root?.constructor.name);
if (root instanceof WzProperty) {
  const info = root.Get('info');
  console.log('info:', info?.constructor.name);
  if (info instanceof WzProperty) {
    const icon = info.Get('icon');
    console.log('icon:', icon?.constructor.name);
    console.log('icon instanceof WzCanvas:', icon instanceof WzCanvas);
  }
}
