import { GamePanel } from './GamePanel.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
export declare class BookDlg extends GamePanel {
    private _bg;
    private _titleText;
    private _curPage;
    private _lastPage;
    private _nItemID;
    private _selectIndex;
    private _colTexts;
    private _colLabels;
    private _bookProp;
    private _prevBtn;
    private _prevLabel;
    private _nextBtn;
    private _nextLabel;
    private _closeBtn;
    private _closeLabel;
    private _loader;
    private _itemWz;
    constructor(loader?: WzTextureLoader, itemWz?: WzPackage);
    /** OG: CBookDlg::SetBookItem — loads WZ book data and displays page 0. */
    SetBookItem(nItemID: number): void;
    /** OG: CBookDlg::SetPage — reads WZ book/<page>/<line> nodes. */
    private _setPage;
    /** OG: SetCtrlEnabled — enables prev/next based on current page. */
    private _setCtrlEnabled;
    private _updateTitle;
    /** OG: OpenBook — loads WZ data from item's "book" property. */
    private _loadBookProperty;
    private _drawChrome;
    /** OG: OnKey — Enter or Escape → CloseBook. */
    private _close;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=BookDlg.d.ts.map