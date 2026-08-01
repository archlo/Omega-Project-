import { WzPackage } from './src/wz/WzPackage.js';
import { WzProperty } from './src/wz/WzProperty.js';
import { WzCanvas } from './src/wz/WzCanvas.js';
import { WzTextureLoader } from './src/render/WzTextureLoader.js';

const charWz = WzPackage.OpenBase('wz_client', 'Character');
if (charWz) {
  const cap = charWz.GetItem('Cap/01002000.img');
  if (cap instanceof WzProperty) {
    const info = cap.Get('info');
    if (info instanceof WzProperty) {
      const icon = info.Get('icon');
      console.log('icon:', !!icon);
      console.log('icon instanceof WzCanvas:', icon instanceof WzCanvas);
      console.log('icon constructor:', icon?.constructor.name);
      console.log('icon Width:', (icon as any)?.Width);
      console.log('icon Height:', (icon as any)?.Height);
      
      if (icon instanceof WzCanvas) {
        const loader = new WzTextureLoader();
        const sprite = loader.Load(icon);
        console.log('sprite:', !!sprite);
        console.log('sprite Texture:', !!sprite?.Texture);
      }
    }
  }
}
