import { WzPackage } from '../src/wz/WzPackage.js';
import { ReactorLook } from '../src/character/ReactorLook.js';
import { Container } from 'pixi.js';

const pkg = (WzPackage as unknown as { Open: (p: string) => unknown }).Open('wz_client/Reactor.nx');
console.log('opened:', pkg ? 'yes' : 'no');
if (!pkg) process.exit(1);
console.log('has 0002001.img:', !!(pkg as unknown as { GetItem: (p: string) => unknown }).GetItem('0002001.img'));

const look = new ReactorLook(1, 2001, 0);
// stub loader: Load(canvas) must return a WzSprite-like
const loaderStub = {
  Load: (canvas: unknown) => {
    return {
      Texture: { width: 30, height: 30 },
      OriginX: 15, OriginY: 30,
      Width: 30, Height: 30,
      ToPixi: () => new Container(),
      NewSprite: () => new Container(),
    };
  },
} as never;
look.Load(loaderStub, pkg as never);
const anyLook = look as unknown as { _loaded: boolean; _anims: Map<number, unknown[]> };
console.log('loaded flag:', anyLook._loaded);
console.log('anim states:', [...anyLook._anims.keys()]);
look.Update(0.05);
console.log('container children after update+rebuild:', look.container.children.length);
