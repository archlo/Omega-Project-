import { WzPackage } from './src/wz/WzPackage.js';
import { WzCanvas } from './src/wz/WzCanvas.js';

const charWz = WzPackage.OpenBase('wz_client', 'Character');
const cap = charWz.GetItem('Cap/01002000.img');
const info = cap.Get('info');
const icon = info.Get('icon');
console.log('icon is WzCanvas:', icon instanceof WzCanvas);
console.log('icon type:', typeof icon);
console.log('icon constructor:', icon?.constructor?.name);
