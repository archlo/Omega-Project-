import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
export declare function incHPVal(job: number): number;
export declare function incMPVal(job: number): number;
export declare function decHPVal(job: number): number;
export declare function decMPVal(job: number): number;
export declare function isUnderMinHP(job: number, newMHP: number): boolean;
export declare function isUnderMinMP(job: number, newMMP: number): boolean;
export declare function isOverMaxHP(_job: number, newMHP: number): boolean;
export declare function isOverMaxMP(_job: number, newMMP: number): boolean;
export declare function calcTotalAP(level: number, job: number): number;
export interface StatChangeResult {
    dwDec: number;
    dwInc: number;
}
export declare class StatChangeDialog extends GamePanel {
    private _loader;
    private _ui;
    private _bgSprite;
    private _statIcons;
    private _statTexts;
    private _selectedStat;
    dwDec: number;
    dwInc: number;
    job: number;
    level: number;
    str: number;
    dex: number;
    intStat: number;
    luk: number;
    maxHp: number;
    maxMp: number;
    ap: number;
    onOk: ((result: StatChangeResult) => void) | null;
    onCancel: (() => void) | null;
    private _buttons;
    private _okButton;
    private _cancelButton;
    constructor(loader: WzTextureLoader, ui: WzPackage | null);
    open(isIncrement: boolean): void;
    private _rebuild;
    private _drawStats;
    private _drawDecStat;
    private _onStatSelected;
    private _onOk;
    private _onCancel;
    private _updateButtons;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
}
export declare class StatChangeConfirmDialog extends GamePanel {
    private _loader;
    private _ui;
    private _bgSprite;
    private _okButton;
    private _cancelButton;
    private _texts;
    dwDec: number;
    dwInc: number;
    job: number;
    level: number;
    str: number;
    dex: number;
    intStat: number;
    luk: number;
    maxHp: number;
    maxMp: number;
    onOk: ((result: StatChangeResult) => void) | null;
    onCancel: (() => void) | null;
    constructor(loader: WzTextureLoader, ui: WzPackage | null);
    open(dwDec: number, dwInc: number): void;
    private _rebuild;
    private _onOk;
    private _onCancel;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
}
//# sourceMappingURL=StatChangeDialog.d.ts.map