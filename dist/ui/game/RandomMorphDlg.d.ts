import { GamePanel } from './GamePanel.js';
export declare class RandomMorphDlg extends GamePanel {
    private _bg;
    private _label;
    private _closeLabel;
    private _nItemID;
    private _nPOS;
    constructor();
    /** OG: CUIRandomMorphDlg::ShowDlg — opens or focuses the singleton. */
    static ShowDlg(nPOS: number, nItemID: number): void;
    private static _instance;
    static get instance(): RandomMorphDlg | null;
    /** OG: ShowDlg allocates; we construct once and reuse. */
    static Init(): RandomMorphDlg;
    /** OG: CUIRandomMorphDlg::Draw — fills white rect + CWnd::Draw. */
    private _drawBg;
    private _refresh;
    /** OG: _CloseDlg — sets m_bTerminate=1, hides. */
    private _close;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=RandomMorphDlg.d.ts.map