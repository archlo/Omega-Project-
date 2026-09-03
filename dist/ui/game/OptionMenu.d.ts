import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
export interface SysOptConfig {
    video: number;
    bgmVol: number;
    bgmMute: boolean;
    seVol: number;
    seMute: boolean;
    mouseSpeed: number;
    hpFlash: number;
    mpFlash: number;
    tremble: boolean;
    screenshot: number;
    mobInfo: number;
    largeScreen: boolean;
    windowed: boolean;
    minimapNormal: boolean;
}
export declare class OptionMenu extends GamePanel {
    onSettingsChanged: (() => void) | null;
    config: SysOptConfig;
    private _bg;
    private _dynamicChildren;
    private _labels;
    private _dragTarget;
    private _btOk;
    private _btCancel;
    private _openCombo;
    get BgmVolume(): number;
    get SfxVolume(): number;
    get HpFlash(): number;
    get MpFlash(): number;
    constructor();
    loadWz(loader: WzTextureLoader, ui: WzPackage | null): void;
    LoadVolumes(bgm: number, sfx: number): void;
    LoadWarningFlash(hp: number, mp: number): void;
    update(_dt: number): void;
    setPosition(x: number, y: number): void;
    draw(): void;
    private _drawDropdown;
    private _drawButton;
    private _drawCombo;
    private _drawSlider;
    private _drawCheck;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    private _hitChild;
    private _setSlider;
    private _lxToVal;
    private _ogToPct;
    private _pctToOg;
    private _hitRect;
    private _hitCheck;
    private _hitCombo;
    private _hitSlider;
    onKeyPress(key: string): boolean;
    private _rebuildBg;
}
//# sourceMappingURL=OptionMenu.d.ts.map