import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzVector } from '../../wz/WzVector.js';
import { ToolTip } from './ToolTip.js';

/**
 * OG: CToolTipHelper — panel hover-help loader + hit-tester.
 *
 * The literal tooltip text for a UI panel lives in String.wz under
 * `ToolTipHelp.img/Game/UIWnd/<PanelName>` (child named after the panel — `Stat`,
 * `StatDetail`, …). Each child `<0..N>` has four nodes:
 *   - `Title`  (string)  — short label (e.g. "Strength (STR)")
 *   - `Desc`   (string)  — the tooltip body (may contain \n)
 *   - `lt` / `rb` (Vector2D) — hit-test rect (top-left / bottom-right) for the tip
 *
 * LoadToolTip @0x894C00 iterates every child and reads lt(StringPool 6846) /
 * rb(StringPool 6859) / Title(0x1A70) / Desc(0x5D3). CheckAndShow @0x8A0980 then
 * PtInRect's the cursor against each entry's lt..rb rect; the first hit shows
 * Title + Desc via SetToolTip_String2 at (cursorX, cursorY + 20).
 *
 * Callers (verified in the v95 IDB):
 *   CUIStat::OnCreate @0x867B90       → LoadToolTip(StringPool 1993)   [Stat]
 *   CUIStatDetail::OnCreate @0x8623B0 → LoadToolTip(StringPool 1978)   [StatDetail]
 *   CUIStat::OnMouseMove @0x8649D0    → CheckAndShow(..., maxCount = 8 if beginner)
 *   CUIStatDetail::OnMouseMove @0x861450 → CheckAndShow(..., null)
 *   CUserLocal::OnMouseMove @0x91B4CA → CheckAndShow (character hover)
 */
export interface TTHInfo {
  lt: { x: number; y: number };
  rb: { x: number; y: number };
  title: string;
  desc: string;
}

export class ToolTipHelper {
  private _entries: TTHInfo[] = [];

  get entries(): readonly TTHInfo[] { return this._entries; }
  get count(): number { return this._entries.length; }

  /** Load a `ToolTipHelp.img/Game/UIWnd/<panel>` subtree from the String package. */
  LoadToolTip(stringWz: WzPackage | null, panel: string): void {
    this._entries = [];
    if (!stringWz) return;
    let root: unknown;
    try {
      root = stringWz.GetItem(`ToolTipHelp.img/Game/UIWnd/${panel}`);
    } catch {
      return;
    }
    if (!(root instanceof WzProperty)) return;

    // Iterate children in StringPool index order (0..N).
    for (let i = 0; i < 256; i++) {
      const node = root.Get(String(i));
      if (!(node instanceof WzProperty)) break;
      const lt = node.Get('lt');
      const rb = node.Get('rb');
      const title = node.Get('Title');
      const desc = node.Get('Desc');
      const ltV = lt instanceof WzVector ? lt : null;
      const rbV = rb instanceof WzVector ? rb : null;
      this._entries.push({
        lt: ltV ? { x: ltV.X, y: ltV.Y } : { x: 0, y: 0 },
        rb: rbV ? { x: rbV.X, y: rbV.Y } : { x: 0, y: 0 },
        title: typeof title === 'string' ? title : '',
        desc: typeof desc === 'string' ? desc : '',
      });
    }
  }

  /**
   * OG: CheckAndShow @0x8A0980 — find the entry whose lt..rb rect contains the
   * cursor and show its Title + Desc. Returns the entry index, or -1 if none.
   * `maxCount` clamps how many entries are considered (CUIStat passes 8 for
   * beginners so the covered stat rows don't show tooltips).
   * `rx`/`ry` are panel-local cursor coords; the tooltip is shown at (rx, ry+20)
   * (OG SetToolTip_String2 gets ptCursor.x / ptCursor.y + 20).
   */
  checkAndShow(toolTip: ToolTip | null, rx: number, ry: number, maxCount?: number | null): number {
    const limit = maxCount == null ? this._entries.length : Math.min(this._entries.length, maxCount);
    for (let i = 0; i < limit; i++) {
      const e = this._entries[i];
      if (rx >= e.lt.x && rx <= e.rb.x && ry >= e.lt.y && ry <= e.rb.y) {
        if (toolTip) {
          toolTip.clearToolTip();
          toolTip.setToolTipString2(rx, ry + 20, e.title, e.desc);
        }
        return i;
      }
    }
    if (toolTip) toolTip.clearToolTip();
    return -1;
  }
}
