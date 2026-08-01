import { WzPackage } from './src/wz/WzPackage.js';
import { WzCanvas } from './src/wz/WzCanvas.js';
import { WzTextureLoader } from './src/render/WzTextureLoader.js';

const charWz = WzPackage.OpenBase('wz_client', 'Character');
const loader = new WzTextureLoader();

const cap = charWz.GetItem('Cap/01002000.img');
const root = (cap as any).Root;
const info = root.Get('info');
const icon = info.Get('icon');

console.log('icon instanceof WzCanvas:', icon instanceof WzCanvas);
if (icon instanceof WzCanvas) {
  const sprite = loader.Load(icon);
  console.log('sprite loaded:', !!sprite);
  console.log('sprite Texture:', !!sprite?.Texture);
  console.log('sprite Width:', sprite?.Width);
  console.log('sprite Height:', sprite?.Height);
}
