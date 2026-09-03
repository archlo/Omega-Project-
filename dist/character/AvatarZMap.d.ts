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
export declare class AvatarZMap {
    private _index;
    constructor(baseWz: WzPackage | null);
    /** Position in the front->back z list. Lower = more in front. Unknown names
        sort behind everything (so unexpected layers don't cover the avatar). */
    FrontIndex(z: string | null): number;
    /** Map a WZ z-string to the OG 5-layer index (0-4).
     *  Name-based — matches the OG binary's per-z-string layer assignment
     *  regardless of zmap.img child order. */
    LayerOf(z: string | null): number;
    private static readonly _layerByName;
    private static readonly Fallback;
}
//# sourceMappingURL=AvatarZMap.d.ts.map