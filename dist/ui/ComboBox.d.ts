import { Container, TextStyle } from 'pixi.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzProperty } from '../wz/WzProperty.js';
export interface ComboBoxItem {
    label: string;
    value: string;
}
export declare class ComboBox {
    onChange: ((value: string) => void) | null;
    container: Container;
    private _bg;
    private _label;
    private _triangle;
    private _dropdownContainer;
    private _dropdownGfx;
    private _dropdownLabels;
    private _wzSprite;
    private _sprite;
    private _items;
    private _selectedIndex;
    private _isOpen;
    private _width;
    private _height;
    private _itemH;
    constructor(opts?: {
        width?: number;
        height?: number;
        itemHeight?: number;
        style?: TextStyle;
    });
    setItems(items: ComboBoxItem[]): void;
    get value(): string;
    set value(v: string);
    get selectedIndex(): number;
    /** Override the label text without changing the selected item. */
    setLabel(text: string): void;
    set selectedIndex(i: number);
    toggle(): void;
    close(): void;
    private _openDropdown;
    private _closeDropdown;
    private _rebuildDropdown;
    private _drawFallback;
    /**
     * Load a WZ sprite as the combo box background.
     * Pass the WzProperty for the combo box node (e.g. "StatusBar.img/base/chatTarget").
     * When loaded, the Graphics fallback is hidden.
     */
    loadWzAsset(loader: WzTextureLoader, root: WzProperty, childPath?: string): void;
    handleMouseButton(lx: number, ly: number, down: boolean): boolean;
}
//# sourceMappingURL=ComboBox.d.ts.map