import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { Button } from '../Button.js';
const PanelW = 320;
const PanelH = 360;
const ItemH = 36;
const Padding = 8;
// This panel is correctly wired to CScriptMan::OnAskSlideMenu (type 15,
// generic NPC-script reward-pick — see GameStage.ts's ASK_SLIDE_MENU case),
// NOT the PQ-specific CUIPQReward class (RequestReward/SelectReward/
// OnReceiveReward, a separate party-quest-completion reward box that auto-
// opens outside NPC dialogue and isn't built in this client at all).
export class QuestReward extends GamePanel {
    OnSelect = null;
    _background;
    _btOk;
    _allButtons = [];
    _itemContainers = [];
    _selectedIndex = -1;
    _entries = [];
    _questId = 0;
    _titleText;
    _noticeText;
    constructor(loader, ui, _font) {
        super();
        this.isVisible = false;
        this.container.position.set(240, 100);
        const claim = ui?.GetItem('UIWindow2.img/Claim');
        const claimProp = claim instanceof WzProperty ? claim : null;
        this._background = claimProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(claimProp.Get('backgrnd')) : null;
        if (this._background) {
            this.container.addChild(this._background.ToPixi());
        }
        const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
        this._titleText = new Text({ text: 'Quest Complete!', style: _titleStyle });
        this._titleText.x = Padding;
        this._titleText.y = 8;
        this.container.addChild(this._titleText);
        const _noticeStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 10, fontFamily: 'monospace' });
        this._noticeText = new Text({ text: 'Choose a reward:', style: _noticeStyle });
        this._noticeText.x = Padding;
        this._noticeText.y = 28;
        this.container.addChild(this._noticeText);
        this._btOk = new Button('OK');
        this._btOk.onClick = () => { this._doSelect(); };
        this._btOk.container.position.set(PanelW / 2 - 40, PanelH - 38);
        this._allButtons.push(this._btOk);
        this.container.addChild(this._btOk.container);
        const btClose = new Button('X');
        btClose.onClick = () => { this.isVisible = false; };
        btClose.container.position.set(PanelW - 22, 4);
        this._allButtons.push(btClose);
        this.container.addChild(btClose.container);
    }
    Show(questId, _npcId, text) {
        this._questId = questId;
        this._entries = this._parseRewards(text);
        this._selectedIndex = -1;
        this._rebuildItems();
        this.isVisible = true;
    }
    _parseRewards(text) {
        const entries = [];
        const rewardRe = /#L(\d+)##i(\d+)#/g;
        let m;
        while ((m = rewardRe.exec(text)) !== null) {
            entries.push({ index: parseInt(m[1]), itemId: parseInt(m[2]), name: '' });
        }
        return entries;
    }
    _rebuildItems() {
        for (const c of this._itemContainers) {
            this.container.removeChild(c);
        }
        this._itemContainers = [];
        const startY = 52;
        for (let i = 0; i < this._entries.length; i++) {
            const entry = this._entries[i];
            const c = new Container();
            c.position.set(Padding, startY + i * ItemH);
            const bg = new Graphics();
            const isSelected = this._selectedIndex === i;
            bg.roundRect(0, 0, PanelW - Padding * 2, ItemH - 2, 4)
                .fill({ color: isSelected ? 0x1a3a5c : 0x0a1a2a })
                .stroke({ width: 1, color: isSelected ? 0x4a9fff : 0x2a4a6a });
            bg.eventMode = 'static';
            bg.cursor = 'pointer';
            bg.hitArea = { contains: (_x, _y) => true };
            bg.on('pointerdown', () => { this._selectedIndex = i; this._rebuildItems(); });
            c.addChild(bg);
            const numStyle = new TextStyle({ fill: 0x88ccff, fontSize: 10, fontFamily: 'monospace' });
            const numText = new Text({ text: `${entry.index}.`, style: numStyle });
            numText.x = 6;
            numText.y = (ItemH - numText.height) / 2 - 1;
            c.addChild(numText);
            const nameStyle = new TextStyle({ fill: 0xffffff, fontSize: 10, fontFamily: 'monospace' });
            const nameText = new Text({ text: `[${entry.itemId}]`, style: nameStyle });
            nameText.x = 28;
            nameText.y = (ItemH - nameText.height) / 2 - 1;
            c.addChild(nameText);
            const arrowStyle = new TextStyle({ fill: 0xaaaaaa, fontSize: 10, fontFamily: 'monospace' });
            const arrowText = new Text({ text: isSelected ? '>>' : '> ', style: arrowStyle });
            arrowText.x = PanelW - Padding * 2 - arrowText.width;
            arrowText.y = (ItemH - arrowText.height) / 2 - 1;
            c.addChild(arrowText);
            this.container.addChild(c);
            this._itemContainers.push(c);
        }
    }
    _doSelect() {
        if (this._selectedIndex < 0 || this._selectedIndex >= this._entries.length)
            return;
        const entry = this._entries[this._selectedIndex];
        this.OnSelect?.(entry.index, entry.itemId);
        this.isVisible = false;
    }
    update(_dt) { }
    handleMouseButton(x, y, down) {
        if (!this.isVisible)
            return false;
        const px = this.container.position.x;
        const py = this.container.position.y;
        const lx = x - px;
        const ly = y - py;
        for (const b of this._allButtons) {
            if (b.handleMouseButton(lx, ly, down))
                return true;
        }
        if (down) {
            const startY = 52;
            for (let i = 0; i < this._entries.length; i++) {
                const ey = startY + i * ItemH;
                if (lx >= Padding && lx < PanelW - Padding && ly >= ey && ly < ey + ItemH - 2) {
                    this._selectedIndex = i;
                    this._rebuildItems();
                    return true;
                }
            }
        }
        if (lx >= PanelW - 18 && ly < 22) {
            this.isVisible = false;
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
}
//# sourceMappingURL=QuestReward.js.map