import { Container } from 'pixi.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { MapInfo } from './MapInfo.js';
import { Foothold } from './Foothold.js';
import { Portal } from './Portal.js';
import { LadderRope } from './LadderRope.js';
import type { GameCamera } from './GameCamera.js';
import { MiniMapData } from './MiniMapData.js';
import { DropSprite } from '../character/DropSprite.js';
import type { PlayerController } from '../character/PlayerController.js';
import type { CharLook } from '../character/CharLook.js';
import type { OtherCharLook } from '../character/OtherCharLook.js';
import type { FootHoldStateEntry } from '../net/handlers/PacketArgs.js';
export interface PhysicsConstants {
    walkSpeed: number;
    walkForce: number;
    walkDrag: number;
    jumpSpeed: number;
    gravityAcc: number;
    fallSpeed: number;
    flyForce: number;
    flySpeed: number;
    swimForce: number;
    swimSpeed: number;
    floatDrag1: number;
    floatDrag2: number;
    floatCoefficient: number;
    slipForce: number;
    slipSpeed: number;
}
export declare const DEFAULT_PHYSICS: PhysicsConstants;
export declare class FieldScene {
    private _mapWz;
    private _loader;
    readonly container: Container<import("pixi.js").ContainerChild>;
    /** Layers 0..7, each is a child container holding tile+obj children. */
    private readonly _layerContainers;
    private readonly _bgContainer;
    private readonly _fgContainer;
    private readonly _portalContainer;
    readonly Camera: GameCamera;
    Crc: number;
    private _mapScene;
    private _info;
    private _physics;
    private _footholds;
    private _footholdIndex;
    private _portals;
    private _ladderRopes;
    private _seats;
    private _loadedMapId;
    private _bounds;
    private _miniMap;
    private _tileLayers;
    private _objLayers;
    private _portalPv;
    private _portalPh;
    private _portalPsh;
    private _activeHiddenPortalIndex;
    private _portalPixiSprites;
    private _loaded;
    constructor(_mapWz: WzPackage | null, _loader: WzTextureLoader, camera: GameCamera);
    get Bounds(): {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
    get Info(): MapInfo;
    get Physics(): PhysicsConstants;
    get Footholds(): Record<number, Foothold>;
    get Portals(): Record<number, Portal>;
    get LadderRopes(): LadderRope[];
    get LoadedMapId(): number;
    get MiniMap(): MiniMapData | null;
    SetActiveHiddenPortal(index: number | null): void;
    Load(mapId: number): void;
    private _loadInfo;
    private _loadMiniMap;
    private _finalizeMiniMapData;
    private _loadFootholds;
    private _computeBounds;
    private _loadPortals;
    private _loadLadderRope;
    private _loadSeats;
    FindSeatByPosition(x: number, y: number): number;
    GetSeatPosition(index: number): {
        x: number;
        y: number;
    } | null;
    private _loadPortalAnimations;
    private _loadLayers;
    Update(dtMs: number, screenW?: number, screenH?: number): void;
    UpdateEntities(characters: Map<number, OtherCharLook> | (CharLook | OtherCharLook)[], player: CharLook | null, drops: DropSprite[], mobs: Iterable<{
        Layer: number;
        Position: {
            x: number;
            y: number;
        };
        container: Container;
    }> | null, npcs: Iterable<{
        Layer: number;
        Position: {
            x: number;
            y: number;
        };
        container: Container;
    }> | null, screenW: number, screenH: number): void;
    private _rebuildLayerContainers;
    private _updatePortalContainer;
    private _updateEntityContainers;
    private _worldToScreen;
    private _portalAnimation;
    private _syncPortalTextures;
    private _dynamicObjPos;
    ApplyFootHoldState(entries: FootHoldStateEntry[]): void;
    GetFoothold(id: number): Foothold | null;
    GetFootholdBelow(x: number, y: number): Foothold | null;
    GetFootholdAbove(x: number, yTop: number, yBottom: number): Foothold | null;
    GetClosestFoothold(x: number, y: number): Foothold | null;
    /** OG: CWvsPhysicalSpace2D::GetCrossCandidate — returns enabled footholds whose
     *  bounding boxes intersect the movement segment (xm1,ym1)→(xm2,ym2). Used by
     *  CollisionDetectFloat to find potential collision targets during freefall. */
    GetCrossCandidate(xm1: number, ym1: number, xm2: number, ym2: number): Foothold[];
    GetLadderOrRope(x1: number, y1: number, x2?: number, y2?: number): LadderRope | null;
    private _loadPhysics;
    /** CWvsPhysicalSpace2D::CanWalkThrough: validates a linked walkable chain. */
    CanWalkThrough(from: Foothold | null, to: Foothold | null): boolean;
    LayerOfFoothold(id: number, fallback?: number): number;
    LayerAt(x: number, y: number, fallback?: number): number;
    GetZMassWallX(zmass: number, fromX: number, toX: number, yTop: number, yBottom: number): number | null;
    PlacePlayerAtPortal(player: PlayerController, portalIndex: number): void;
    /** OG: CMapLoadable::RestoreBack — restores background after temporary effect */
    RestoreBack(): void;
    /** OG: CMapLoadable::RestoreTile — restores tiles after temporary effect */
    RestoreTile(): void;
    /** OG: CMapLoadable::RestoreObj — restores objects after temporary effect */
    RestoreObj(): void;
    /** OG: CMapLoadable::IsInSafeZone — checks if position is in safe zone (PVP protection) */
    IsInSafeZone(_rect: {
        x: number;
        y: number;
        w: number;
        h: number;
    }): boolean;
    private _readInt;
    private _readNumber;
    private _readBool;
}
//# sourceMappingURL=FieldScene.d.ts.map