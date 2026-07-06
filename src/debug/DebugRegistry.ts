import { DebugItem } from './DebugItem.js';

export class DebugRegistry {
  private _items = new Map<string, DebugItem>();
  private _itemsChanged: (() => void) | null = null;

  get itemsChanged(): (() => void) | null {
    return this._itemsChanged;
  }

  set itemsChanged(value: (() => void) | null) {
    this._itemsChanged = value;
  }

  dragMode = false;

  register(item: DebugItem): void {
    this._items.set(this.key(item.category, item.name), item);
    this._itemsChanged?.();
  }

  unregister(category: string, name: string): void {
    this._items.delete(this.key(category, name));
    this._itemsChanged?.();
  }

  snapshot(): DebugItem[] {
    return Array.from(this._items.values());
  }

  private key(category: string, name: string): string {
    return `${category}::${name}`;
  }
}
