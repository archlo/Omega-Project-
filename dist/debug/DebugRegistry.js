export class DebugRegistry {
    _items = new Map();
    _itemsChanged = null;
    get itemsChanged() {
        return this._itemsChanged;
    }
    set itemsChanged(value) {
        this._itemsChanged = value;
    }
    dragMode = false;
    register(item) {
        this._items.set(this.key(item.category, item.name), item);
        this._itemsChanged?.();
    }
    unregister(category, name) {
        this._items.delete(this.key(category, name));
        this._itemsChanged?.();
    }
    snapshot() {
        return Array.from(this._items.values());
    }
    key(category, name) {
        return `${category}::${name}`;
    }
}
//# sourceMappingURL=DebugRegistry.js.map