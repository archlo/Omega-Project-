import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzImage } from '../../wz/WzImage.js';
import { Button } from '../Button.js';
const PanelW = 295;
const PanelH = 344;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _labelStyle = new TextStyle({ fill: '#AAA', fontSize: 9, fontFamily: 'monospace' });
// OG class: CUIItemMaker (TSingleton<CUIItemMaker>, RTTI ms_RTTI_CUIItemMaker).
// Crafting data/cost logic: CItemMakerInfo (decompile/9C7CB0.c),
// CItemInfo::CalcMakerSkillDisassembleCost.
export class Maker extends GamePanel {
    OnStart = null;
    static BuildRecipeList(etcWz, itemName, max = 12) {
        // TODO_AUDIT.md Hundred-and-fifty-third pass: recipes live in
        // Etc.nx/ItemMake.img. The current panel has no scroll control, so only
        // expose a bounded, deterministic slice instead of drawing thousands.
        const img = etcWz?.GetItem('ItemMake.img');
        const root = img instanceof WzImage ? img.Root : null;
        if (!(root instanceof WzProperty))
            return [];
        const recipes = [];
        const cats = Object.entries(root.Items)
            .filter(([, v]) => v instanceof WzProperty)
            .sort(([a], [b]) => Number(a) - Number(b));
        for (const [, cat] of cats) {
            const entries = Object.keys(cat.Items).sort((a, b) => Number(a) - Number(b));
            for (const key of entries) {
                const id = Number(key);
                if (!Number.isFinite(id))
                    continue;
                recipes.push({ id, name: itemName(id) ?? `Recipe ${id}` });
                if (recipes.length >= max)
                    return recipes;
            }
        }
        return recipes;
    }
    _background;
    _font;
    _allButtons = [];
    _btStart = null;
    _btCancel = null;
    _selectedRecipe = -1;
    _recipes = [];
    _dynamicChildren = [];
    constructor(loader, ui, font) {
        super();
        this._font = font;
        this.isVisible = false;
        this.container.position.set(260, 80);
        let maker = ui?.GetItem('UIWindow2.img/Maker');
        if (!(maker instanceof WzProperty))
            maker = ui?.GetItem('IWindow2.img/Maker');
        const makerProp = maker instanceof WzProperty ? maker : null;
        this._background = makerProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(makerProp.Get('backgrnd')) : null;
        this._btStart = this._makeButton(loader, makerProp, 'BtStart', () => this._doStart());
        this._btCancel = this._makeButton(loader, makerProp, 'BtCancel', () => { this.isVisible = false; });
        const title = new Text({ text: 'Maker', style: _titleStyle });
        title.x = 8;
        title.y = 5;
        this.container.addChild(title);
        // OG: CUIWnd close button
        this.createCloseButton(null, null, 1, 300);
    }
    Open(recipes) {
        this._recipes = recipes;
        this._selectedRecipe = -1;
        this.isVisible = true;
    }
    SetResult(recipeId, success, items) {
        if (!this.isVisible)
            return;
        const resultText = `${recipeId}: ${success ? 'SUCCESS' : 'FAIL'} (${items.map((i) => `${i.itemId}x${i.count}`).join(', ')})`;
    }
    _doStart() {
        if (this._selectedRecipe >= 0 && this._selectedRecipe < this._recipes.length) {
            this.OnStart?.(this._recipes[this._selectedRecipe].id);
        }
    }
    update(_dt) {
        if (!this.isVisible)
            return;
        this.draw();
    }
    draw() {
        if (!this.isVisible)
            return;
        if (this._background)
            this.container.addChildAt(this._background.ToPixi(), 0);
        for (const c of this._dynamicChildren)
            c.destroy();
        this._dynamicChildren = [];
        this._drawRecipeList();
        this._drawButtons();
    }
    handleMouseButton(x, y, down) {
        if (!this.isVisible)
            return false;
        if (!down)
            return true;
        const px = this.container.position.x;
        const py = this.container.position.y;
        const lx = x - px;
        const ly = y - py;
        for (const b of this._allButtons) {
            if (b.handleMouseButton(lx, ly, down))
                return true;
        }
        if (lx >= PanelW - 18 && ly < 22) {
            this.isVisible = false;
            return true;
        }
        const listX = 10;
        const listY = 82;
        const itemH = 18;
        if (lx >= listX && lx < PanelW - 10 && ly >= listY && ly < listY + this._recipes.length * itemH) {
            this._selectedRecipe = Math.floor((ly - listY) / itemH);
            return true;
        }
        return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
    }
    onKeyPress(key) {
        if (!this.isVisible)
            return false;
        if (key === 'Escape') {
            this.isVisible = false;
            return true;
        }
        return false;
    }
    _drawRecipeList() {
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
            t.x = 14;
            t.y = ry + 2;
            this.container.addChild(t);
            this._dynamicChildren.push(t);
        }
    }
    _drawButtons() {
        if (this._btStart)
            this._btStart.container.position.set(180, 310);
        if (this._btCancel)
            this._btCancel.container.position.set(230, 310);
    }
    _makeButton(loader, root, name, onClick) {
        const pr = root?.Get(name);
        if (!(pr instanceof WzProperty))
            return null;
        const b = Button.fromWz(loader, pr, name);
        b.onClick = onClick;
        this._allButtons.push(b);
        this.container.addChild(b.container);
        return b;
    }
}
//# sourceMappingURL=Maker.js.map