import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzImage } from '../../wz/WzImage.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { Button } from '../Button.js';

const PanelW = 295;
const PanelH = 344;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _labelStyle = new TextStyle({ fill: '#AAA', fontSize: 9, fontFamily: 'monospace' });

// OG class: CUIItemMaker (TSingleton<CUIItemMaker>, RTTI ms_RTTI_CUIItemMaker).
// Crafting data/cost logic: CItemMakerInfo (decompile/9C7CB0.c),
// CItemInfo::CalcMakerSkillDisassembleCost.
export class Maker extends GamePanel {
  OnStart: ((recipeId: number) => void) | null = null;

  static BuildRecipeList(etcWz: WzPackage | null, itemName: (id: number) => string | undefined, max = 12): { id: number; name: string }[] {
    // TODO_AUDIT.md Hundred-and-fifty-third pass: recipes live in
    // Etc.nx/ItemMake.img. The current panel has no scroll control, so only
    // expose a bounded, deterministic slice instead of drawing thousands.
    const img = etcWz?.GetItem('ItemMake.img');
    const root = img instanceof WzImage ? img.Root : null;
    if (!(root instanceof WzProperty)) return [];
    const recipes: { id: number; name: string }[] = [];
    const cats = Object.entries(root.Items)
      .filter(([, v]) => v instanceof WzProperty)
      .sort(([a], [b]) => Number(a) - Number(b));
    for (const [, cat] of cats) {
      const entries = Object.keys((cat as WzProperty).Items).sort((a, b) => Number(a) - Number(b));
      for (const key of entries) {
        const id = Number(key);
        if (!Number.isFinite(id)) continue;
        recipes.push({ id, name: itemName(id) ?? `Recipe ${id}` });
        if (recipes.length >= max) return recipes;
      }
    }
    return recipes;
  }

  private _background: WzSprite | null;
  private _font: BuiltInFont | null;
  private _allButtons: Button[] = [];
  private _btStart: Button | null = null;
  private _btCancel: Button | null = null;
  private _selectedRecipe = -1;
  private _recipes: { id: number; name: string }[] = [];
  private _dynamicChildren: Container[] = [];

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = false;
    this.container.position.set(260, 80);

    let maker = ui?.GetItem('UIWindow2.img/Maker');
    if (!(maker instanceof WzProperty)) maker = ui?.GetItem('IWindow2.img/Maker');
    const makerProp = maker instanceof WzProperty ? maker : null;
    this._background = makerProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(makerProp!.Get('backgrnd') as WzCanvas) : null;
    this._btStart = this._makeButton(loader, makerProp, 'BtStart', () => this._doStart());
    this._btCancel = this._makeButton(loader, makerProp, 'BtCancel', () => { this.isVisible = false; });

    const title = new Text({ text: 'Maker', style: _titleStyle });
    title.x = 8; title.y = 5;
    this.container.addChild(title);
  }

  Open(recipes: { id: number; name: string }[]): void {
    this._recipes = recipes;
    this._selectedRecipe = -1;
    this.isVisible = true;
  }

  SetResult(recipeId: number, success: boolean, items: Array<{ itemId: number; count: number }>): void {
    if (!this.isVisible) return;
    const resultText = `${recipeId}: ${success ? 'SUCCESS' : 'FAIL'} (${items.map((i) => `${i.itemId}x${i.count}`).join(', ')})`;
  }

  private _doStart(): void {
    if (this._selectedRecipe >= 0 && this._selectedRecipe < this._recipes.length) {
      this.OnStart?.(this._recipes[this._selectedRecipe].id);
    }
  }

  update(_dt: number): void {
    if (!this.isVisible) return;
    this.draw();
  }

  draw(): void {
    if (!this.isVisible) return;
    if (this._background) this.container.addChildAt(this._background.ToPixi(), 0);
    for (const c of this._dynamicChildren) c.destroy();
    this._dynamicChildren = [];
    this._drawRecipeList();
    this._drawButtons();
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    const px = this.container.position.x;
    const py = this.container.position.y;
    const lx = x - px;
    const ly = y - py;
    for (const b of this._allButtons) {
      if (b.handleMouseButton(lx, ly, down)) return true;
    }

    if (lx >= PanelW - 18 && ly < 22) { this.isVisible = false; return true; }

    const listX = 10;
    const listY = 82;
    const itemH = 18;
    if (lx >= listX && lx < PanelW - 10 && ly >= listY && ly < listY + this._recipes.length * itemH) {
      this._selectedRecipe = Math.floor((ly - listY) / itemH);
      return true;
    }

    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }

  private _drawRecipeList(): void {
    const listY = 82;
    const itemH = 18;
    for (let i = 0; i < this._recipes.length; i++) {
      const ry = listY + i * itemH;
      const bg = new Graphics();
      bg.rect(10, ry, PanelW - 20, itemH)
        .fill({ color: i === this._selectedRecipe ? '#2E2E4C' : (i % 2 === 0 ? '#13131F' : '#181828'), alpha: 0.8 });
      this.container.addChild(bg);
      this._dynamicChildren.push(bg);
      const t = new Text({ text: this._recipes[i].name, style: _labelStyle });
      t.x = 14; t.y = ry + 2;
      this.container.addChild(t);
      this._dynamicChildren.push(t);
    }
  }

  private _drawButtons(): void {
    if (this._btStart) this._btStart.container.position.set(180, 310);
    if (this._btCancel) this._btCancel.container.position.set(230, 310);
  }

  private _makeButton(loader: WzTextureLoader, root: WzProperty | null, name: string, onClick: () => void): Button | null {
    const pr = root?.Get(name);
    if (!(pr instanceof WzProperty)) return null;
    const b = Button.fromWz(loader, pr, name);
    b.onClick = onClick;
    this._allButtons.push(b);
    this.container.addChild(b.container);
    return b;
  }
}
