import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
interface GiftMember {
    id: number;
    name: string;
    level?: number;
}
export declare class SendGifts extends GamePanel {
    private _bg;
    private _members;
    private _scrollOffset;
    private _selectedIndex;
    onSelect: ((member: GiftMember) => void) | null;
    onClose: (() => void) | null;
    constructor(opts?: {
        title?: string;
        loader?: WzTextureLoader;
        uiWz?: WzPackage | null;
    });
    setMembers(members: {
        id: number;
        name: string;
        level?: number;
    }[]): void;
    private _rebuildList;
    setScrollBar(offset: number): void;
    handleMouseButton(x: number, y: number, _down: boolean): boolean;
    onKeyPress(key: string): boolean;
    update(_dt: number): void;
}
export {};
//# sourceMappingURL=SendGifts.d.ts.map