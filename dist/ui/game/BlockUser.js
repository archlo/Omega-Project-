import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { Button } from '../Button.js';
// OG: CUIBlockUser — inherits CDialog (modal dialog).
// OnCreate: creates block/unblock dialog with edit input for character name.
// WZ: UI/UIWindow2.img/BlockUser/backgrnd
// OnButtonClicked: nId=1000 → block, nId=1001-1002 → cancel
const PANEL_W = 230;
const PANEL_H = 130;
export class BlockUser extends GamePanel {
    _bg;
    _wzBg;
    _loader;
    _buttons = [];
    _btBlock = null;
    _btCancel = null;
    // Edit field for character name (rendered as text input)
    _inputText;
    _inputValue = '';
    _inputFocused = false;
    // Result
    _result = 0; // 0=none, 1=blocked, 2=cancelled
    _characterName = '';
    // Callbacks
    onBlock = null;
    onClose = null;
    constructor(opts = {}) {
        super();
        this._loader = opts.loader ?? null;
        // Load WZ background
        const bgNode = opts.uiWz?.GetItem('UIWindow2.img/BlockUser/backgrnd');
        this._wzBg = (bgNode instanceof WzCanvas && opts.loader) ? opts.loader.Load(bgNode) : null;
        this._bg = new Graphics();
        this._root.addChild(this._bg);
        if (this._wzBg) {
            const s = this._wzBg.ToPixi();
            this._root.addChild(s);
        }
        else {
            this._rebuildBg();
        }
        // Input field
        const inputStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 12, fontFamily: 'monospace' });
        this._inputText = new Text({ text: '', style: inputStyle });
        this._inputText.x = 20;
        this._inputText.y = 50;
        this._inputText.eventMode = 'static';
        this._inputText.cursor = 'text';
        this._inputText.on('pointertap', () => { this._inputFocused = true; });
        this._root.addChild(this._inputText);
        // Input field background
        const inputBg = new Graphics();
        inputBg.rect(18, 48, 194, 20).fill({ color: '#1A1D2E' });
        inputBg.rect(18, 48, 194, 20).stroke({ color: '#3C4164', width: 1 });
        this._root.addChildAt(inputBg, 1);
        // Create buttons
        const charProp = opts.uiWz?.GetItem('UIWindow2.img/BlockUser') instanceof WzProperty
            ? opts.uiWz.GetItem('UIWindow2.img/BlockUser') : null;
        if (opts.loader && charProp) {
            const btBlockNode = charProp.Get('BtOK');
            if (btBlockNode instanceof WzProperty) {
                this._btBlock = Button.fromWz(opts.loader, btBlockNode, 'Block');
                this._btBlock.onClick = () => this._doBlock();
                this._buttons.push(this._btBlock);
                this._root.addChild(this._btBlock.container);
            }
            const btCancelNode = charProp.Get('BtCancel');
            if (btCancelNode instanceof WzProperty) {
                this._btCancel = Button.fromWz(opts.loader, btCancelNode, 'Cancel');
                this._btCancel.onClick = () => this._doCancel();
                this._buttons.push(this._btCancel);
                this._root.addChild(this._btCancel.container);
            }
        }
        // Fallback buttons
        if (!this._btBlock) {
            const btnStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });
            const blockBtn = new Text({ text: 'Block', style: btnStyle });
            blockBtn.x = 100;
            blockBtn.y = 100;
            blockBtn.eventMode = 'static';
            blockBtn.cursor = 'pointer';
            blockBtn.on('pointertap', () => this._doBlock());
            this._root.addChild(blockBtn);
        }
        if (!this._btCancel) {
            const btnStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });
            const cancelBtn = new Text({ text: 'Cancel', style: btnStyle });
            cancelBtn.x = 155;
            cancelBtn.y = 100;
            cancelBtn.eventMode = 'static';
            cancelBtn.cursor = 'pointer';
            cancelBtn.on('pointertap', () => this._doCancel());
            this._root.addChild(cancelBtn);
        }
        // Label
        const labelStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });
        const label = new Text({ text: 'Character Name:', style: labelStyle });
        label.x = 20;
        label.y = 35;
        this._root.addChild(label);
    }
    _rebuildBg() {
        this._bg.clear();
        this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 240 / 255 });
        this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
        this._bg.rect(0, 0, PANEL_W, 22).fill({ color: '#0F1224' });
    }
    _doBlock() {
        this._characterName = this._inputValue;
        this._result = 1;
        this.onBlock?.(this._characterName);
        this.isVisible = false;
    }
    _doCancel() {
        this._result = 2;
        this.onClose?.();
        this.isVisible = false;
    }
    get result() { return this._result; }
    get characterName() { return this._characterName; }
    handleMouseButton(x, y, down) {
        if (!this.isVisible)
            return false;
        const lx = x - this._root.x;
        const ly = y - this._root.y;
        for (const button of this._buttons) {
            if (button.handleMouseButton(lx, ly, down))
                return true;
        }
        return lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H;
    }
    onKeyPress(key) {
        if (!this.isVisible)
            return false;
        if (key === 'Escape') {
            this._doCancel();
            return true;
        }
        if (key === 'Enter') {
            this._doBlock();
            return true;
        }
        if (this._inputFocused) {
            if (key === 'Backspace') {
                this._inputValue = this._inputValue.slice(0, -1);
            }
            else if (key.length === 1 && this._inputValue.length < 12) {
                this._inputValue += key;
            }
            this._inputText.text = this._inputValue;
            return true;
        }
        return false;
    }
    update(_dt) {
        // Update input field display
        this._inputText.text = this._inputValue || (this._inputFocused ? '|' : '');
    }
}
//# sourceMappingURL=BlockUser.js.map