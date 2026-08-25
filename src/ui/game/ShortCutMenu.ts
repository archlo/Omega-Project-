import { Container, Sprite } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { Button } from '../Button.js';
import type { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';

// OG: CUIShortCutMenu — the quick-launch modal (CWvsContext::UI_ShortCut
// @0x9DD740). OnCreate @0x7EF480 builds 7 CCtrlButtons (ids 1000-1006) from
// UI/StatusBar2.img/mainBar/Menu/Bt{Item,Equip,Stat,Skill,Community,Quest,MSN}
// stacked vertically at y = 20 + 25*i over the 79px Menu/backgrnd strip
// (3 canvases: 34px top + stretchable 1px middle + 41px bottom). Clicking a
// button runs SetResult @0x7EE460 and DoModal returns the window key:
// key 8 opens the Messenger (CUIMessenger::TryNew), every other key goes to
// CWvsContext::UI_Toggle(wndKey).
export interface ShortCutMenuOptions {
  loader?: WzTextureLoader | null;
  uiWz?: WzPackage | null;
}

export class ShortCutMenu extends GamePanel {
  /** OG SetResult mapping — button index -> CWndMan window key. */
  static readonly ResultKeys = [0, 1, 2, 3, 7, 6, 8];
  /** Our GameStage UI_Toggle keys for each button (BtItem..BtMSN order). */
  static readonly ToggleTargets = [1, 0, 2, 3, 4, 8, 'messenger'] as const;

  onToggle: ((target: number | 'messenger') => void) | null = null;

  private readonly _buttons: Button[] = [];
  private readonly _btnAssets: Array<{ root: WzProperty | null }> = [];

  constructor(options: ShortCutMenuOptions = {}) {
    super();
    const loader = options.loader ?? null;
    const ui = options.uiWz ?? null;

    // OG backgrnd strip: top(79x34) + middle(79x1 stretched) + bottom(79x41)
    if (loader && ui) {
      const bgRoot = ui.GetItem('StatusBar2.img/mainBar/Menu/backgrnd');
      if (bgRoot instanceof WzProperty) {
        const MID_H = 100;
        const layout: Array<[string, number, number | null]> = [
          ['0', 0, 34],
          ['1', 34, MID_H],
          ['2', 34 + MID_H, 41],
        ];
        for (const [key, y, h] of layout) {
          const canvas = bgRoot.Get(key);
          if (!(canvas instanceof WzCanvas)) continue;
          const ws = loader.Load(canvas);
          if (!ws) continue;
          const sp = new Sprite(ws.Texture);
          sp.position.set(-ws.OriginX, y);
          if (h !== null && ws.Height > 0 && ws.Height !== h) sp.height = h;
          this._root.addChild(sp);
        }
      }
    }

    const names = ['BtItem', 'BtEquip', 'BtStat', 'BtSkill', 'BtCommunity', 'BtQuest', 'BtMSN'];
    for (let i = 0; i < names.length; i++) {
      let btn: Button;
      if (loader && ui) {
        const root = ui.GetItem(`StatusBar2.img/mainBar/Menu/${names[i]}`);
        this._btnAssets.push({ root: root instanceof WzProperty ? root : null });
        btn = Button.fromWz(loader, this._btnAssets[i].root);
      } else {
        this._btnAssets.push({ root: null });
        btn = new Button(names[i].slice(2));
      }
      // OG OnCreate: CreateCtrl_2(parent, 1000+i, type=8, l=20+25i, t=0) —
      // buttons run DOWN the menu at 25px pitch starting at 20.
      const idx = i;
      btn.onClick = () => this.select(idx);
      this._buttons.push(btn);
      btn.container.position.set((79 - (btn.width || 63)) / 2, 20 + 25 * i);
      this._root.addChild(btn.container);
    }
    this.isVisible = false;
  }

  private select(index: number): void {
    this.isVisible = false;
    this.onToggle?.(ShortCutMenu.ToggleTargets[index]);
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    const lx = x - this.container.x;
    const ly = y - this.container.y;
    for (const btn of this._buttons) {
      if (btn.handleMouseButton(lx, ly, down)) return true;
    }
    return true;
  }

  onMouseMove(x: number, y: number): void {
    if (!this.isVisible) return;
    const lx = x - this.container.x;
    const ly = y - this.container.y;
    for (const btn of this._buttons) btn.setHover(btn.hitTest(lx, ly));
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') {
      this.isVisible = false;
      return true;
    }
    return true;
  }
}
