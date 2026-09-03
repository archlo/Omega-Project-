import { Sprite } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { FuncKeyMapped } from '../../domain/FuncKeyMapped.js';
import type { DragTarget } from '../DragController.js';
export declare class QuickSlotBar extends GamePanel implements DragTarget {
    private _keys;
    private _loader;
    private _labelRoot;
    private _labelCache;
    private _bgSprite;
    private _keyConfigRoot;
    private _bindingAt;
    private _bindSkill;
    private _skillIcon;
    private _itemIcon;
    private _skillCdInfo;
    private _itemCooltimeRemaining;
    private _itemCooltimeTotal;
    private _isStateChangeItem;
    private _isBindableItem;
    private _itemCountOf;
    private _viewW;
    private _viewH;
    private _slotG;
    private _cdG;
    private _skillSprites;
    private _cashTagSprites;
    private _labelSprites;
    private _fallbackLabels;
    private _numberTexts;
    private _btSlideUp;
    private _btSlideDown;
    private _bShowSlide;
    private _cashTagLoader;
    bindItemToKey: ((scancode: number, itemId: number) => void) | null;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, _font: BuiltInFont | null, bindingAt: (scancode: number) => FuncKeyMapped, bindSkill: (scancode: number, skillId: number) => void, skillIcon: (skillId: number) => WzSprite | null, itemIcon: (itemId: number) => WzSprite | null, skillCdInfo?: (skillId: number) => {
        remain: number;
        total: number;
    } | null, isStateChangeItem?: (itemId: number) => boolean, isBindableItem?: (itemId: number, invType: number) => boolean, cashTagLoader?: () => Sprite | null, itemCountOf?: (itemId: number) => number);
    SetItemCooltime(remaining: number, total: number): void;
    private _toggle;
    draw(): void;
    SetKeys(keys: number[] | null): void;
    Relayout(viewWidth: number, viewHeight: number): void;
    /** Render the 8 quickslot cells — called by the parent stage each frame via the panel update loop. */
    update(_dt: number): void;
    private get _gridTopLeft();
    private _slotRect;
    tryAcceptDrag(payload: unknown, x: number, y: number): boolean;
    TryBindItemAt(itemId: number, x: number, y: number): boolean;
    private _bindItem;
    TryBindSkillAt(skillId: number, x: number, y: number): boolean;
    private _label;
}
//# sourceMappingURL=QuickSlotBar.d.ts.map