import { WzImage } from '../wz/WzImage.js';
import type { WzPackage } from '../wz/WzPackage.js';

/**
OG-style 5-layer avatar rendering system mirroring CAvatar's layer stack:
  0 = UnderCharacter — parts behind the character body (back hair, cape below body)
  1 = UnderFace      — body and its immediate parts (head, arms, torso, legs)
  2 = Face           — face emotion canvas
  3 = OverFace       — parts in front of the face (cap, eyewear, hair over head)
  4 = OverCharacter  — frontmost parts (weapon, gloves, cape front, shoes over pants)

Each avatar part canvas carries a `z` string; `LayerOf(z)` maps it to one of the
five bands above, and `FrontIndex(z)` gives its intra-band sort order (lower = more front).
*/
export class AvatarZMap {
  private _index = new Map<string, number>();

  constructor(baseWz: WzPackage | null) {
    const img = baseWz?.GetItem('zmap.img');
    if (img instanceof WzImage) {
      let i = 0;
      for (const key of Object.keys(img.Root.Items)) {
        this._index.set(key, i++);
      }
    }
    if (this._index.size === 0) {
      console.warn('Base.wz/zmap.img not loaded — using the fallback avatar layer order');
      let i = 0;
      for (const z of AvatarZMap.Fallback) {
        this._index.set(z, i++);
      }
    }
  }

  /** Position in the front->back z list. Lower = more in front. Unknown names
      sort behind everything (so unexpected layers don't cover the avatar). */
  FrontIndex(z: string | null): number {
    if (z !== null) {
      const v = this._index.get(z);
      if (v !== undefined) return v;
    }
    return Number.MAX_SAFE_INTEGER;
  }

  /** Map a WZ z-string to the OG 5-layer index (0-4).
   *  Name-based — matches the OG binary's per-z-string layer assignment
   *  regardless of zmap.img child order. */
  LayerOf(z: string | null): number {
    if (z === null) return 0;
    return AvatarZMap._layerByName.get(z) ?? 0;
  }

  private static readonly _layerByName = new Map<string, number>([
    // 0 = UnderCharacter — behind the body
    ['capeBelowBody', 0], ['hairBelowBody', 0], ['backHairBelowCap', 0], ['weaponBelowBody', 0],
    // 1 = UnderFace — body and immediate parts
    ['hairShade', 1], ['backHair', 1], ['head', 1],
    ['mailArmBelowHead', 1], ['armBelowHead', 1], ['weaponOverBody', 1],
    ['pantsOverMailChest', 1], ['mailChest', 1], ['pants', 1], ['shoes', 1],
    ['gloveOverBody', 1], ['body', 1],
    // 2 = Face
    ['face', 2],
    // 3 = OverFace — in front of face
    ['capOverHair', 3], ['hairOverHead', 3], ['cap', 3], ['hair', 3], ['accessoryFace', 3],
    // 4 = OverCharacter — frontmost
    ['weaponOverGlove', 4], ['gloveOverHair', 4], ['handOverHair', 4],
    ['weaponOverHand', 4], ['weaponOverArm', 4], ['weaponBelowArm', 4],
    ['cape', 4], ['mailArm', 4], ['glove', 4], ['hand', 4], ['arm', 4], ['weapon', 4],
    ['shoesOverPants', 4],
  ]);

  // Minimal front->back fallback (only used if Base.wz/zmap.img is unavailable).
  private static readonly Fallback = [
    'weaponOverGlove', 'gloveOverHair', 'handOverHair', 'weaponOverHand', 'weaponOverArm',
    'weaponBelowArm', 'capOverHair', 'hairOverHead', 'cap', 'hair', 'accessoryFace', 'face',
    'hairShade', 'backHair', 'head', 'cape', 'mailArm', 'glove', 'hand', 'arm', 'weapon',
    'mailArmBelowHead', 'armBelowHead', 'weaponOverBody', 'pantsOverMailChest', 'mailChest',
    'shoesOverPants', 'pants', 'shoes', 'gloveOverBody', 'body', 'capeBelowBody',
    'hairBelowBody', 'backHairBelowCap', 'weaponBelowBody',
  ];
}
