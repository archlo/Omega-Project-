import { Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { Button } from '../Button.js';
const PanelW = 280;
const PanelH = 180;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
// OG class: CUIKarmaDlg (ctor ??0CUIKarmaDlg@@QAE@JJ@Z; Draw/OnCreate/
// OnButtonClicked/_SendConsumeCashItemUseRequest). Backing item data is
// KARMASCISSORSITEM on CItemInfo (GetKarmaScissorsItem/RegisterKarmaScissorsItem).
export class KarmaScissors extends GamePanel {
    OnConfirm = null;
    OnCancel = null;
    // OG: CUIKarmaDlg::PutItem (decompile/7d7ba0.c) — see GoldHammer.ts's
    // identical note for why no drag-drop trigger populates this yet.
    ScrollPos = 0;
    ScrollItemId = 0;
    TargetItemTI = 0;
    TargetSlotPosition = 0;
    setTarget(scrollPos, scrollItemId, targetItemTI, targetSlotPosition) {
        this.ScrollPos = scrollPos;
        this.ScrollItemId = scrollItemId;
        this.TargetItemTI = targetItemTI;
        this.TargetSlotPosition = targetSlotPosition;
    }
    // OG: CUIKarmaDlg::PutItem — accepts a dragged-on equip while open.
    tryAcceptDrag(payload, _x, _y) {
        if (!this.isVisible || !payload || typeof payload !== 'object' || !('itemId' in payload))
            return false;
        const p = payload;
        this.setTarget(this.ScrollPos, this.ScrollItemId, p.itemId, p.slotPos);
        return true;
    }
    _background;
    _font;
    _allButtons = [];
    _btOk = null;
    _btCancel = null;
    constructor(loader, ui, font) {
        super();
        this._font = font;
        this.isVisible = false;
        this.container.position.set(260, 180);
        let ks = ui?.GetItem('UIWindow2.img/KarmaScissors');
        if (!(ks instanceof WzProperty))
            ks = ui?.GetItem('IWindow2.img/KarmaScissors');
        const ksProp = ks instanceof WzProperty ? ks : null;
        this._background = ksProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(ksProp.Get('backgrnd')) : null;
        if (this._background)
            this.container.addChild(this._background.ToPixi());
        this._btOk = this._makeButton(loader, ksProp, 'BtOk', () => { this.OnConfirm?.(); this.isVisible = false; });
        this._btCancel = this._makeButton(loader, ksProp, 'BtCancel', () => { this.OnCancel?.(); this.isVisible = false; });
        if (this._btOk)
            this._btOk.container.position.set(PanelW / 2 - 70, PanelH - 36);
        if (this._btCancel)
            this._btCancel.container.position.set(PanelW / 2 + 10, PanelH - 36);
        const title = new Text({ text: 'Karma Scissors', style: _titleStyle });
        title.x = 8;
        title.y = 5;
        this.container.addChild(title);
    }
    Open() { this.isVisible = true; }
    update(_dt) { }
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
            this.OnCancel?.();
            this.isVisible = false;
            return true;
        }
        return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
    }
    onKeyPress(key) {
        if (!this.isVisible)
            return false;
        if (key === 'Escape') {
            this.OnCancel?.();
            this.isVisible = false;
            return true;
        }
        return false;
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
//# sourceMappingURL=KarmaScissors.js.map