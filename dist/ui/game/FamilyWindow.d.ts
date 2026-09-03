import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { FamilyPrivilegeEntry } from '../../net/handlers/PacketArgs.js';
export declare class FamilyWindow extends GamePanel {
    Reputation: number;
    TodayRep: number;
    JuniorCount: number;
    InFamily: boolean;
    onUsePrivilege: ((privilegeIndex: number) => void) | null;
    onSetPrecept: ((precept: string) => void) | null;
    private _privileges;
    private _privilegeUse;
    private _privilegeIndex;
    private _bg;
    private _bg2;
    private _btClose;
    private _font;
    private _dragging;
    private _dragOff;
    private _bgPixi;
    private _textLayer;
    private _privButtons;
    private get _panelW();
    private get _panelH();
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null);
    SetPrivileges(privileges: FamilyPrivilegeEntry[]): void;
    SetPrivilegeUse(privilegeUse: {
        key: number;
        value: number;
    }[]): void;
    update(_dt: number): void;
    private _drawPrivilege;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=FamilyWindow.d.ts.map