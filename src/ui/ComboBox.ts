import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { WzSprite } from '../render/WzSprite.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';

const DEFAULT_STYLE = new TextStyle({ fill: '#FFF', fontSize: 11, fontFamily: 'monospace' });
const DEFAULT_ITEM_H = 16;
const DEFAULT_WIDTH = 68;
const DEFAULT_HEIGHT = 21;
const TRIANGLE_PAD = 4;
const CHECK_SIZE = 8;
const CHECK_PAD = 3;
const TEXT_PAD = 14;
const TEXT_Y_PAD = 3;

export interface ComboBoxItem {
  label: string;
  value: string;
}

export class ComboBox {
  onChange: ((value: string) => void) | null = null;

  container: Container;
  private _bg: Graphics;
  private _label: Text;
  private _triangle: Graphics;
  private _dropdownContainer: Container;
  private _dropdownGfx: Graphics[] = [];
  private _dropdownLabels: Text[] = [];
  private _wzSprite: WzSprite | null = null;
  private _sprite: import('pixi.js').Sprite | null = null;

  private _items: ComboBoxItem[] = [];
  private _selectedIndex = 0;
  private _isOpen = false;
  private _width: number;
  private _height: number;
  private _itemH: number;

  constructor(opts?: {
    width?: number;
    height?: number;
    itemHeight?: number;
    style?: TextStyle;
  }) {
    this._width = opts?.width ?? DEFAULT_WIDTH;
    this._height = opts?.height ?? DEFAULT_HEIGHT;
    this._itemH = opts?.itemHeight ?? DEFAULT_ITEM_H;

    this.container = new Container();

    this._bg = new Graphics();
    this.container.addChild(this._bg);

    this._label = new Text({ text: '', style: opts?.style ?? DEFAULT_STYLE });
    this._label.x = 4;
    this._label.y = TEXT_Y_PAD;
    this.container.addChild(this._label);

    this._triangle = new Graphics();
    this.container.addChild(this._triangle);

    this._dropdownContainer = new Container();
    this._dropdownContainer.visible = false;
    this.container.addChild(this._dropdownContainer);

    this._drawFallback();
  }

  // ─── Items ───────────────────────────────────────────────────────────

  setItems(items: ComboBoxItem[]): void {
    this._items = items;
    if (this._selectedIndex >= items.length) this._selectedIndex = 0;
    this._label.text = items[this._selectedIndex]?.label ?? '';
    this._closeDropdown();
  }

  get value(): string { return this._items[this._selectedIndex]?.value ?? ''; }

  set value(v: string) {
    const idx = this._items.findIndex(it => it.value === v);
    if (idx >= 0 && idx !== this._selectedIndex) {
      this._selectedIndex = idx;
      this._label.text = this._items[idx].label;
    }
  }

  get selectedIndex(): number { return this._selectedIndex; }

  /** Override the label text without changing the selected item. */
  setLabel(text: string): void {
    this._label.text = text;
  }

  set selectedIndex(i: number) {
    if (i >= 0 && i < this._items.length && i !== this._selectedIndex) {
      this._selectedIndex = i;
      this._label.text = this._items[i].label;
    }
  }

  // ─── Open / Close ────────────────────────────────────────────────────

  toggle(): void {
    if (this._isOpen) this._closeDropdown();
    else this._openDropdown();
  }

  close(): void {
    if (this._isOpen) this._closeDropdown();
  }

  private _openDropdown(): void {
    this._isOpen = true;
    this._rebuildDropdown();
    this._dropdownContainer.visible = true;
  }

  private _closeDropdown(): void {
    this._isOpen = false;
    this._dropdownContainer.visible = false;
  }

  // ─── Dropdown rendering ─────────────────────────────────────────────

  private _rebuildDropdown(): void {
    this._dropdownContainer.removeChildren();
    this._dropdownGfx = [];
    this._dropdownLabels = [];

    const visible = this._items.filter(it => it.label);
    const totalH = visible.length * this._itemH;
    const w = this._width;

    for (let i = 0; i < visible.length; i++) {
      const iy = -totalH + i * this._itemH;
      const isSelected = this._items.indexOf(visible[i]) === this._selectedIndex;

      const g = new Graphics();
      g.rect(0, iy, w, this._itemH).fill({ color: isSelected ? '#3C4164' : '#1A1A2E', alpha: 0.9 });
      g.rect(0, iy, w, this._itemH).stroke({ color: '#444', width: 1 });
      this._dropdownContainer.addChild(g);
      this._dropdownGfx.push(g);

      if (isSelected) {
        const check = new Graphics();
        check.rect(CHECK_PAD, iy + CHECK_PAD, CHECK_SIZE, CHECK_SIZE).fill({ color: '#64DC64' });
        this._dropdownContainer.addChild(check);
      }

      const t = new Text({ text: visible[i].label, style: this._label.style });
      t.x = TEXT_PAD;
      t.y = iy + TEXT_Y_PAD;
      this._dropdownContainer.addChild(t);
      this._dropdownLabels.push(t);
    }
  }

  // ─── Graphics fallback ───────────────────────────────────────────────

  private _drawFallback(): void {
    const g = this._bg;
    g.clear();
    g.rect(0, 0, this._width, this._height).fill({ color: '#111', alpha: 0.8 });
    g.rect(0, 0, this._width, this._height).stroke({ color: '#555', width: 1 });

    this._triangle.clear();
    const tx = this._width - 12;
    this._triangle.poly([
      tx, TRIANGLE_PAD,
      this._width - TRIANGLE_PAD, TRIANGLE_PAD,
      this._width - 8, this._height - TRIANGLE_PAD,
    ]).fill({ color: '#AAA' });
  }

  // ─── WZ asset loading ───────────────────────────────────────────────

  /**
   * Load a WZ sprite as the combo box background.
   * Pass the WzProperty for the combo box node (e.g. "StatusBar.img/base/chatTarget").
   * When loaded, the Graphics fallback is hidden.
   */
  loadWzAsset(loader: WzTextureLoader, root: WzProperty, childPath?: string): void {
    let node: unknown = root;
    if (childPath && typeof root.Get === 'function') {
      node = root.Get(childPath);
      if (!node) return;
    }
    // Unwrap property nodes (look for '0' or 'bmp' child)
    if (node && typeof (node as any).Get === 'function' && typeof (node as any).ToPixi !== 'function') {
      const inner = (node as any).Get('0') ?? (node as any).Get('bmp');
      if (inner) node = inner;
    }
    if (node instanceof WzCanvas) {
      this._wzSprite = loader.Load(node);
      if (this._wzSprite) {
        const s = this._wzSprite.ToPixi();
        if (s) {
          s.anchor.set(0, 0);
          this.container.addChildAt(s, 0);
          this._sprite = s;
          this._bg.visible = false;
          this._triangle.visible = false;
        }
      }
    }
  }

  // ─── Input handling ──────────────────────────────────────────────────

  handleMouseButton(lx: number, ly: number, down: boolean): boolean {
    if (!down) return false;

    const inBox = lx >= 0 && lx < this._width && ly >= 0 && ly < this._height;
    const inDropdown = this._isOpen && lx >= 0 && lx < this._width
      && ly >= -this._items.filter(it => it.label).length * this._itemH && ly < 0;

    if (inDropdown) {
      const totalH = this._items.filter(it => it.label).length * this._itemH;
      const visible = this._items.filter(it => it.label);
      const idx = Math.floor((ly + totalH) / this._itemH);
      if (idx >= 0 && idx < visible.length) {
        const item = visible[idx];
        const newIdx = this._items.indexOf(item);
        if (newIdx !== this._selectedIndex) {
          this._selectedIndex = newIdx;
          this._label.text = item.label;
          this.onChange?.(item.value);
        }
        this._closeDropdown();
      }
      return true;
    }

    if (inBox) {
      this.toggle();
      return true;
    }

    // Outside click → close
    if (this._isOpen) {
      this._closeDropdown();
      return false;
    }

    return false;
  }
}
