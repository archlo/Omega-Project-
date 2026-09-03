import { DebugItem } from './DebugItem.js';
export declare class DebugRegistry {
    private _items;
    private _itemsChanged;
    get itemsChanged(): (() => void) | null;
    set itemsChanged(value: (() => void) | null);
    dragMode: boolean;
    register(item: DebugItem): void;
    unregister(category: string, name: string): void;
    snapshot(): DebugItem[];
    private key;
}
//# sourceMappingURL=DebugRegistry.d.ts.map