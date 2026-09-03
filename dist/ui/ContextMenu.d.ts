import { GamePanel } from './game/GamePanel.js';
export interface ContextMenuItem {
    label: string;
    icon?: string;
    enabled?: boolean;
    onClick?: () => void;
}
export interface ContextMenuSeparator {
    separator: true;
}
export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;
export declare class ContextMenu extends GamePanel {
    private _entries;
    private _bg;
    private _hoverBg;
    private _texts;
    private _itemBounds;
    private _menuW;
    private _menuH;
    private _hoveredIndex;
    private _mouseLeaveTimer;
    private _onDismiss;
    private _dynamicChildren;
    constructor();
    /** Show the context menu at screen position (x, y) with the given entries. */
    show(x: number, y: number, entries: ContextMenuEntry[], onDismiss?: () => void): void;
    /** Hide and clear the context menu. */
    close(): void;
    private _rebuild;
    private _positionMenu;
    private _updateHover;
    private _clearMouseLeaveTimer;
    private _scheduleMouseLeaveClose;
    onMouseMove(x: number, y: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=ContextMenu.d.ts.map