import { Container } from 'pixi.js';
import type { AvatarLook } from '../domain/AvatarLook.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
type AnchorKind = 'face' | 'body';
export interface ItemEffectSpec {
    itemId: number;
    bodyPart: number;
    path: string;
    animate: boolean;
    follow: boolean;
    emission: boolean;
    genOnMove: boolean;
    noFlip: boolean;
    fixed: boolean;
    z: number;
    intervalMs: number;
    delayMs: number;
    left: number;
    top: number;
    right: number;
    bottom: number;
    dx: number;
    dy: number;
    theta: number;
    genPoints: {
        x: number;
        y: number;
    }[];
    anchor: AnchorKind;
}
type AnchorDisplay = {
    face: {
        x: number;
        y: number;
    };
    body: {
        x: number;
        y: number;
    };
    facingLeft: boolean;
};
export declare class ItemEffectOverlay {
    private _loader;
    private _characterWz;
    private _effectWz;
    private _rng;
    private _entries;
    constructor(_loader: WzTextureLoader, _characterWz: WzPackage | null, _effectWz: WzPackage | null, _rng?: () => number);
    /** TODO_AUDIT.md Hundred-and-seventy-eighth pass: CItemEffectManager keeps
        60 slots parallel to equipped hairEquip/body-part IDs and reloads each
        slot when the equipped item changes. */
    SetCharacter(charId: number, look: AvatarLook | null): void;
    RemoveCharacter(charId: number): void;
    Clear(): void;
    Update(dt: number): void;
    RebuildDisplay(resolve: (charId: number) => AnchorDisplay | null): Container;
    static ParseSpec(itemId: number, bodyPart: number, effect: WzProperty): ItemEffectSpec | null;
    private _load;
    private _itemEffectNode;
    private _advanceFrames;
    private _updateEmitter;
    private _spawnParticle;
    private _flipX;
}
export {};
//# sourceMappingURL=ItemEffectOverlay.d.ts.map