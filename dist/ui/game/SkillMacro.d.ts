import { Texture } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
import type { DragTarget } from '../DragController.js';
export declare class SkillMacro extends GamePanel implements DragTarget {
    OnSave: ((macros: {
        slot: number;
        skills: number[];
        name?: string;
        mute?: boolean;
    }[]) => void) | null;
    skillNameOf: (skillId: number) => string;
    skillIconOf: ((skillId: number) => Texture | null) | null;
    private _background;
    private _font;
    private _loader;
    private _ui;
    private _allButtons;
    private _btOk;
    private _btCancel;
    private _macros;
    private _selectedSlot;
    private _scrollOffset;
    private readonly _rows;
    private readonly _mute;
    private _editingName;
    private _rowBg;
    private _selectedRowBg;
    private _scrollBar;
    private _shoutBox;
    private _shoutLabel;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null);
    Open(macros: {
        slot: number;
        skills: number[];
        name?: string;
        mute?: boolean;
    }[]): void;
    private _doSave;
    update(_dt: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    onMouseMove(x: number, y: number): void;
    /**
     * CUIMacroSys::OnDropped accepts a skill dragged from CUISkill.  The old
     * panel rendered the rows but never implemented the receiving side, which
     * made the existing SkillBook drag preview disappear on mouse-up.
     */
    tryAcceptDrag(payload: unknown, x: number, y: number): boolean;
    private _refreshRows;
    private _safeName;
    private _loadMacroIcon;
    private _makeButton;
}
//# sourceMappingURL=SkillMacro.d.ts.map