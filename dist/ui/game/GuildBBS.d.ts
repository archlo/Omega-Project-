import { GamePanel } from './GamePanel.js';
import { GuildBBSEntry, GuildBBSComment } from '../../net/handlers/PacketArgs.js';
export declare class GuildBBS extends GamePanel {
    onLoadList: ((startIndex: number) => void) | null;
    onViewEntry: ((entryId: number) => void) | null;
    onNewPost: ((title: string, text: string) => void) | null;
    onDeleteEntry: ((entryId: number) => void) | null;
    onComment: ((entryId: number, comment: string) => void) | null;
    onCommentDelete: ((entryId: number, commentSn: number) => void) | null;
    private _bg;
    private _notice;
    private _entries;
    private _viewing;
    private _rows;
    private _buttons;
    private _titleText;
    constructor();
    Open(): void;
    SetList(notice: GuildBBSEntry | null, entries: GuildBBSEntry[]): void;
    SetEntry(entryId: number, characterId: number, title: string, text: string, comments: GuildBBSComment[]): void;
    ShowNotFound(): void;
    private _redrawBg;
    private _clearDynamic;
    private _addButton;
    private _rebuild;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=GuildBBS.d.ts.map