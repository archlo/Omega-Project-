import { GamePanel } from './GamePanel.js';
import { PartyAdverData, ExpeditionAdverData } from '../../net/handlers/PacketArgs.js';
export declare class PartySearchDialog extends GamePanel {
    onSearch: ((questId: number) => void) | null;
    onRegister: ((questId: number, title: string) => void) | null;
    onApply: ((partyId: number) => void) | null;
    private _bg;
    private _titleText;
    private _rows;
    private _buttons;
    private _statusText;
    private _adverts;
    private _selIdx;
    private _currentGroupId;
    constructor();
    Open(): void;
    SetList(adverts: (PartyAdverData | ExpeditionAdverData)[]): void;
    private _redraw;
    private _rebuildList;
    private _rebuildButtons;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=PartySearchDialog.d.ts.map