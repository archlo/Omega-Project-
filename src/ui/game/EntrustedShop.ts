import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { Button } from '../Button.js';

const PanelW = 360;
const PanelH = 400;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _labelStyle = new TextStyle({ fill: '#AAA', fontSize: 9, fontFamily: 'monospace' });

export class EntrustedShop extends GamePanel {
  // IDA-confirmed (CEntrustedShopDlg::OnWithdrawMoney, 0x51de80): 'BtCoin'
  // sends ESP_WithdrawMoney (0x2B) — withdraws accumulated mesos, not items.
  OnWithdrawMoney: (() => void) | null = null;
  // IDA-confirmed (CEntrustedShopDlg::OnGoOut, 0x51dd40): sends ESP_GoOut
  // (0x27), not a generic MiniRoom leave.
  OnClose: (() => void) | null = null;

  private _background: WzSprite | null;
  private _font: BuiltInFont | null;
  private _allButtons: Button[] = [];
  private _btArrange: Button | null = null;
  private _btCoin: Button | null = null;
  private _money = 0;
  private readonly _moneyText: Text;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = false;
    this.container.position.set(220, 80);

    const es = ui?.GetItem('UIWindow2.img/EntrustedShop');
    const esProp = es instanceof WzProperty ? es : null;
    this._background = esProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(esProp!.Get('backgrnd') as WzCanvas) : null;
    if (this._background) this.container.addChild(this._background.ToPixi());

    const title = new Text({ text: 'Entrusted Shop', style: _titleStyle });
    title.x = 8; title.y = 5;
    this.container.addChild(title);

    this._moneyText = new Text({ text: '', style: new TextStyle({ fill: '#FFD700', fontSize: 10, fontFamily: 'monospace' }) });
    this._moneyText.x = 16; this._moneyText.y = 36;
    this.container.addChild(this._moneyText);

    this._btCoin = this._makeButton(loader, esProp, 'BtCoin', () => { this.OnWithdrawMoney?.(); });
    if (this._btCoin) this._btCoin.container.position.set(16, PanelH - 36);
    // No item-list rendering here yet — no inbound decoder for entrusted-shop
    // item data exists in this client at all (GameStage always opens this
    // panel with a hardcoded money=0); see TODO_AUDIT.md.
  }

  Open(money: number): void {
    this._money = money;
    this._moneyText.text = `Mesos: ${money}`;
    this.isVisible = true;
  }

  update(_dt: number): void {}

  private _makeButton(loader: WzTextureLoader, root: WzProperty | null, name: string, onClick: () => void): Button | null {
    const pr = root?.Get(name);
    if (!(pr instanceof WzProperty)) return null;
    const b = Button.fromWz(loader, pr, name);
    b.onClick = onClick;
    this._allButtons.push(b);
    this.container.addChild(b.container);
    return b;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    const px = this.container.position.x;
    const py = this.container.position.y;
    const lx = x - px;
    const ly = y - py;
    for (const b of this._allButtons) {
      if (b.handleMouseButton(lx, ly, down)) return true;
    }
    if (lx >= PanelW - 18 && ly < 22) { this.OnClose?.(); this.isVisible = false; return true; }
    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.OnClose?.(); this.isVisible = false; return true; }
    return false;
  }
}
