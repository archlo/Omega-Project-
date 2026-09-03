import { GamePanel } from './GamePanel.js';
import type { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
export interface SkillResetRow {
    id: number;
    name: string;
    level: number;
    maxLevel?: number;
    icon?: WzCanvas;
}
export declare class SkillIncPanel extends GamePanel {
    private _rows;
    private _scrollBar;
    private _scrollOffset;
    private _skills;
    private _onSkillUp;
    private _textureLoader;
    private _skill0Tex;
    private _skill1Tex;
    private _lineTex;
    constructor(loader?: WzTextureLoader, ui?: WzPackage | null);
    setOnSkillUp(cb: (skillId: number) => void): void;
    open(skills: SkillResetRow[], x: number, y: number): void;
    update(_dt: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    onMouseMove(x: number, y: number): void;
}
export declare class SkillDecPanel extends GamePanel {
    private _rows;
    private _scrollBar;
    private _scrollOffset;
    private _skills;
    private _onSkillDown;
    private _textureLoader;
    private _skill0Tex;
    private _skill1Tex;
    private _lineTex;
    constructor(loader?: WzTextureLoader, ui?: WzPackage | null);
    setOnSkillDown(cb: (skillId: number) => void): void;
    open(skills: SkillResetRow[], x: number, y: number): void;
    update(_dt: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    onMouseMove(x: number, y: number): void;
}
export declare class SkillChangeConfirm extends GamePanel {
    private _incRow;
    private _decRow;
    private _incTab;
    private _decTab;
    private _btOk;
    private _btCancel;
    private _skill0Tex;
    private _skill1Tex;
    private _lineTex;
    private _textureLoader;
    private _ui;
    onConfirm: (() => void) | null;
    onCancel: (() => void) | null;
    constructor(loader?: WzTextureLoader, ui?: WzPackage | null);
    open(incSkill: SkillResetRow, decSkill: SkillResetRow, job: number, x: number, y: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=SkillIncDec.d.ts.map