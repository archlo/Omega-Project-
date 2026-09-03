import { Container } from 'pixi.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
export type EquipTooltipCanvas = `Can/${string}` | `Cannot/${string}` | `Dot/${0 | 1 | 2}` | `GrowthEnabled/${string}` | `GrowthDisabled/${string}` | `ItemCategory/${string}` | `Property/${string}` | `Speed/${string}` | `WeaponCategory/${string}` | 'Star/Star' | 'cash' | 'mesos';
export type ItemCompositorAsset = 'shadow' | `quality/${0 | 1 | 2 | 3 | 4 | 5}`;
export declare const TOOLTIP_EQUIP_ROOT: "UIWindow.img/ToolTip/Equip";
export declare const TOOLTIP_EQUIP_FALLBACK_ROOT: "UIWindow2.img/ToolTip/Equip";
export declare class TooltipAssets {
    private _loader;
    private _uiWz;
    private _root;
    private _cache;
    constructor(loader: WzTextureLoader, uiWz: WzPackage | null);
    get IsAvailable(): boolean;
    Get(subPath: string): WzSprite | null;
    EquipCanvas(path: EquipTooltipCanvas): WzSprite | null;
    /** Verified v95 CItemInfo::DrawItemIconForSlot compositor resources. */
    ItemCompositorCanvas(asset: ItemCompositorAsset): WzSprite | null;
    private static readonly REQ_MAP;
    Req(key: string, met: boolean): WzSprite | null;
    Requirement(key: 'level' | 'str' | 'dex' | 'int' | 'luk' | 'pop', met: boolean): WzSprite | null;
    JobLabel(klass: string, greyed: boolean): WzSprite | null;
    Digit(d: number, met: boolean): WzSprite | null;
    GrowthDigit(d: number, enabled: boolean): WzSprite | null;
    GrowthNumber(d: number, enabled: boolean): WzSprite | null;
    GrowthLabel(index: number, enabled: boolean): WzSprite | null;
    GrowthMax(enabled: boolean): WzSprite | null;
    GrowthPercent(enabled: boolean): WzSprite | null;
    GrowthNone(enabled: boolean): WzSprite | null;
    DurabilityBar(met: boolean): WzSprite | null;
    Percent(met: boolean): WzSprite | null;
    Dot(index: number): WzSprite | null;
    Property(index: number): WzSprite | null;
    Speed(index: number): WzSprite | null;
    WeaponCategory(index: number): WzSprite | null;
    ItemCategory(index: number): WzSprite | null;
    get Cash(): WzSprite | null;
    get Mesos(): WzSprite | null;
    get Star(): WzSprite | null;
    LoadCanvas(canvas: WzCanvas | null | undefined): WzSprite | null;
    private _loadUiCanvas;
    MeasureNumber(value: number, met: boolean, horzSpace?: number): number;
    DrawNumber(value: number, met: boolean, x: number, y: number, parent: Container, spacing?: number): number;
    DrawNumberWith(value: number, digitOf: (d: number) => WzSprite | null, x: number, y: number, parent: Container, spacing?: number): number;
    BlitAt(sprite: WzSprite | null, x: number, y: number, parent: Container): void;
}
//# sourceMappingURL=TooltipAssets.d.ts.map