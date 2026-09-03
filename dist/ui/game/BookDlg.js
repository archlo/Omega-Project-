import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
// OG: CBookDlg (0x471360–0x47455F).
// Client-side skill / quest book dialog backed by WZ node "UI/UIWindow.img/Book/".
// Constructor: CWnd::CreateWnd(190, 148, 478, 353, 10, 1, nullptr, 1, Origin_LT)
// displays two page-columns (220px each) with text+images parsed from WZ book data.
const WND_X = 190;
const WND_Y = 148;
const WND_W = 478;
const WND_H = 353;
const COL_W = 220;
const PAGE_W = 190;
const PAGE_MARGIN = 1;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _textStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 10, fontFamily: 'monospace' });
const _btnStyle = new TextStyle({ fill: '#D8D8D8', fontSize: 10, fontFamily: 'monospace' });
export class BookDlg extends GamePanel {
    _bg;
    _titleText;
    // OG: m_nCurPage, m_nLastPage
    _curPage = -1;
    _lastPage = 0;
    _nItemID = 0;
    _selectIndex = -1;
    // OG: m_aaCT[2] — two column text arrays
    _colTexts = [[], []];
    _colLabels = [[], []];
    // WZ: book property tree
    _bookProp = null;
    // Buttons
    _prevBtn;
    _prevLabel;
    _nextBtn;
    _nextLabel;
    _closeBtn;
    _closeLabel;
    _loader = null;
    _itemWz = null;
    constructor(loader, itemWz) {
        super();
        this._loader = loader ?? null;
        this._itemWz = itemWz ?? null;
        this._root.position.set(WND_X, WND_Y);
        this._bg = new Graphics();
        this._titleText = new Text({ text: 'Book', style: _titleStyle });
        this._titleText.position.set(10, 6);
        this._prevLabel = new Text({ text: '< Prev', style: _btnStyle });
        this._prevBtn = new Graphics();
        this._nextLabel = new Text({ text: 'Next >', style: _btnStyle });
        this._nextBtn = new Graphics();
        this._closeLabel = new Text({ text: 'Close', style: _btnStyle });
        this._closeBtn = new Graphics();
        this._prevLabel.position.set(10, WND_H - 24);
        this._nextLabel.position.set(WND_W - 70, WND_H - 24);
        this._closeLabel.position.set(WND_W / 2 - 20, WND_H - 24);
        this._root.addChild(this._bg, this._titleText, this._prevBtn, this._prevLabel, this._nextBtn, this._nextLabel, this._closeBtn, this._closeLabel);
        this._drawChrome();
        this.isVisible = false;
    }
    /** OG: CBookDlg::SetBookItem — loads WZ book data and displays page 0. */
    SetBookItem(nItemID) {
        if (this._nItemID === nItemID)
            return;
        this._nItemID = nItemID;
        // Load book property from WZ: item's "book" sub-node
        this._bookProp = this._loadBookProperty(nItemID);
        if (!this._bookProp) {
            this._titleText.text = `Book [${nItemID}] — no data`;
            return;
        }
        this._lastPage = Math.max(0, Object.keys(this._bookProp.Items).length - 1);
        this._setPage(0);
    }
    /** OG: CBookDlg::SetPage — reads WZ book/<page>/<line> nodes. */
    _setPage(nPage) {
        if (nPage < 0 || nPage > this._lastPage || nPage === this._curPage)
            return;
        this._curPage = nPage;
        // Clear old text display
        for (const col of this._colLabels) {
            for (const t of col) {
                if (t.parent)
                    t.removeFromParent();
                t.destroy();
            }
        }
        this._colLabels = [[], []];
        this._colTexts = [[], []];
        if (!this._bookProp)
            return;
        // OG: Loads two columns (index 0 and 1) per page
        for (let col = 0; col < 2; col++) {
            const pageKey = String(nPage + col);
            const pageNode = this._bookProp.Get(pageKey);
            if (!pageNode)
                continue;
            let lineY = 0;
            let lineIdx = 0;
            while (true) {
                const lineNode = pageNode.Get(String(lineIdx));
                if (!lineNode)
                    break;
                const textVal = lineNode.Get('text');
                const text = textVal !== undefined && textVal !== null ? String(textVal) : '';
                const alignVal = lineNode.Get('align');
                const align = alignVal !== undefined && alignVal !== null ? Number(alignVal) : 0;
                // OG: CTextAnalyzer with width=PAGE_W, margin=PAGE_MARGIN
                const t = new Text({
                    text,
                    style: new TextStyle({
                        fill: '#FFFFFF',
                        fontSize: 10,
                        fontFamily: 'monospace',
                        wordWrap: true,
                        wordWrapWidth: PAGE_W,
                    }),
                });
                const tx = col === 0 ? 10 : 10 + COL_W;
                const ty = 30 + lineY;
                t.position.set(tx, ty);
                t.visible = true;
                const info = {
                    x: tx,
                    y: ty,
                    w: PAGE_W,
                    h: t.height,
                    text,
                };
                this._colTexts[col].push(info);
                this._colLabels[col].push(t);
                this._root.addChild(t);
                lineY += t.height + 10;
                lineIdx++;
            }
        }
        // OG: SetCtrlEnabled
        this._setCtrlEnabled();
        this._updateTitle();
    }
    /** OG: SetCtrlEnabled — enables prev/next based on current page. */
    _setCtrlEnabled() {
        // Prev: enabled if curPage >= 2 (paired pages)
        // Next: enabled if curPage <= lastPage - 2
        const prevEnabled = this._curPage >= 2;
        const nextEnabled = this._curPage <= this._lastPage - 2;
        this._prevLabel.style = new TextStyle({
            fill: prevEnabled ? '#D8D8D8' : '#555555',
            fontSize: 10,
            fontFamily: 'monospace',
        });
        this._nextLabel.style = new TextStyle({
            fill: nextEnabled ? '#D8D8D8' : '#555555',
            fontSize: 10,
            fontFamily: 'monospace',
        });
    }
    _updateTitle() {
        this._titleText.text = `Book [${this._nItemID}] — Page ${this._curPage + 1}/${this._lastPage + 1}`;
    }
    /** OG: OpenBook — loads WZ data from item's "book" property. */
    _loadBookProperty(nItemID) {
        if (!this._itemWz)
            return null;
        const category = Math.floor(nItemID / 10000);
        try {
            const prop = this._itemWz.GetItem(`Consume/${category}.img/${nItemID}/book`);
            if (prop && Object.keys(prop.Items).length > 0)
                return prop;
        }
        catch {
            // fall through
        }
        return null;
    }
    _drawChrome() {
        this._bg.clear();
        // OG background: UI/UIWindow.img/Book/backgrnd — white-ish with border
        this._bg.rect(0, 0, WND_W, WND_H).fill({ color: 0xF5F0E8, alpha: 0.95 });
        this._bg.rect(0, 0, WND_W, 1).fill({ color: 0x888888 });
        this._bg.rect(0, WND_H - 1, WND_W, 1).fill({ color: 0x888888 });
        this._bg.rect(0, 0, 1, WND_H).fill({ color: 0x888888 });
        this._bg.rect(WND_W - 1, 0, 1, WND_H).fill({ color: 0x888888 });
        // Column divider
        this._bg.rect(COL_W, 22, 1, WND_H - 50).fill({ color: 0xCCCCCC });
    }
    /** OG: OnKey — Enter or Escape → CloseBook. */
    _close() {
        this.isVisible = false;
    }
    handleMouseButton(x, y, down) {
        if (!this.isVisible)
            return false;
        if (!down)
            return true;
        const lx = x - this._root.position.x;
        const ly = y - this._root.position.y;
        // Close button
        if (lx >= WND_W / 2 - 26 && lx <= WND_W / 2 + 26 && ly >= WND_H - 30 && ly <= WND_H - 4) {
            this._close();
            return true;
        }
        // Prev
        if (lx >= 4 && lx <= 64 && ly >= WND_H - 30 && ly <= WND_H - 4) {
            if (this._curPage >= 2)
                this._setPage(this._curPage - 2);
            return true;
        }
        // Next
        if (lx >= WND_W - 72 && lx <= WND_W - 4 && ly >= WND_H - 30 && ly <= WND_H - 4) {
            if (this._curPage <= this._lastPage - 2)
                this._setPage(this._curPage + 2);
            return true;
        }
        // Check click on text links (OG: CheckMousePoint)
        for (let col = 0; col < 2; col++) {
            for (const info of this._colTexts[col]) {
                if (lx >= info.x && lx < info.x + info.w && ly >= info.y && ly < info.y + info.h) {
                    if (info.link !== undefined) {
                        // OG: m_nSelect triggers link navigation
                        this._selectIndex = info.link;
                    }
                }
            }
        }
        return lx >= 0 && lx < WND_W && ly >= 0 && ly < WND_H;
    }
    onKeyPress(key) {
        if (!this.isVisible)
            return false;
        if (key === 'Escape' || key === 'Enter') {
            this._close();
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=BookDlg.js.map