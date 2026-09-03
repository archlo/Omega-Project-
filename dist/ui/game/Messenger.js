import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { Button } from '../Button.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
const PanelW = 180;
const PanelH = 220;
const MaxChatLines = 8;
const _slotStyle = new TextStyle({ fill: '#FFD700', fontSize: 9, fontFamily: 'monospace' });
const _chatStyle = new TextStyle({ fill: '#CCC', fontSize: 9, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: PanelW - 16 });
export class Messenger extends GamePanel {
    onClosed = null;
    _font;
    _btClose;
    _allButtons = [];
    _wzBg = null;
    _slots = [null, null, null];
    _selfIndex = -1;
    _chatLog = [];
    _dynamicChildren = [];
    constructor(loader, ui, font) {
        super();
        this._font = font;
        this.isVisible = false;
        this.container.position.set(300, 120);
        const win = ui?.GetItem('UIWindow.img/MemoChat');
        this._btClose = win instanceof WzProperty ? this._makeButton(loader, win, 'BtClose', () => this._close()) : null;
        const messengerProp = ui?.GetItem('UIWindow2.img/Messenger/Max');
        const bgNode = messengerProp instanceof WzProperty ? messengerProp.Get('backgrnd') : null;
        this._wzBg = bgNode instanceof WzCanvas ? loader.Load(bgNode) : null;
        if (this._wzBg) {
            this.container.addChildAt(this._wzBg.ToPixi(), 0);
        }
        this._applyLayout();
    }
    Open() {
        this.isVisible = true;
    }
    SetSelf(index) {
        this._selfIndex = index;
        if (index >= 0 && index < 3)
            this._slots[index] = '(you)';
        this.isVisible = true;
    }
    SetParticipant(index, name) {
        if (index >= 0 && index < 3)
            this._slots[index] = name;
    }
    RemoveParticipant(index) {
        if (index >= 0 && index < 3)
            this._slots[index] = null;
    }
    AddChat(text) {
        this._chatLog.push(text);
        if (this._chatLog.length > MaxChatLines)
            this._chatLog.shift();
    }
    Reset() {
        for (let i = 0; i < this._slots.length; i++)
            this._slots[i] = null;
        this._selfIndex = -1;
        this._chatLog = [];
    }
    _close() {
        this.isVisible = false;
        this.Reset();
        this.onClosed?.();
    }
    _applyLayout() {
        if (this._btClose !== null)
            this._btClose.container.position.set(this.container.position.x + PanelW - 18, this.container.position.y + 4);
    }
    update(_dt) {
        this._applyLayout();
        this.draw();
    }
    draw() {
        if (!this.isVisible)
            return;
        for (const c of this._dynamicChildren)
            c.destroy();
        this._dynamicChildren = [];
        for (let i = 0; i < this._slots.length; i++) {
            const name = this._slots[i];
            const t = new Text({ text: name ? `${i + 1}. ${name}` : `${i + 1}. (empty)`, style: name ? _slotStyle : new TextStyle({ fill: '#666', fontSize: 9, fontFamily: 'monospace' }) });
            t.x = 8;
            t.y = 26 + i * 14;
            this.container.addChild(t);
            this._dynamicChildren.push(t);
        }
        const chatBg = new Graphics();
        chatBg.rect(6, 72, PanelW - 12, PanelH - 80).fill({ color: '#0C0E18', alpha: 0.85 });
        this.container.addChild(chatBg);
        this._dynamicChildren.push(chatBg);
        let cy = 76;
        for (const line of this._chatLog) {
            const t = new Text({ text: line, style: _chatStyle });
            t.x = 10;
            t.y = cy;
            this.container.addChild(t);
            this._dynamicChildren.push(t);
            cy += 14;
        }
    }
    handleMouseButton(x, y, down) {
        if (!this.isVisible)
            return false;
        for (const b of this._allButtons) {
            if (b.handleMouseButton(x, y, down))
                return true;
        }
        const px = this.container.position.x;
        const py = this.container.position.y;
        return x >= px && x < px + PanelW && y >= py && y < py + PanelH;
    }
    onKeyPress(key) {
        if (!this.isVisible)
            return false;
        if (key === 'Escape') {
            this._close();
            return true;
        }
        return false;
    }
    _makeButton(loader, root, name, onClick) {
        const pr = root.Get(name);
        if (!(pr instanceof WzProperty))
            return null;
        const b = Button.fromWz(loader, pr, name);
        b.onClick = onClick;
        this._allButtons.push(b);
        return b;
    }
}
//# sourceMappingURL=Messenger.js.map