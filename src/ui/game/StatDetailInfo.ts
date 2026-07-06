import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { Button } from '../Button.js';
import { computeDerived, defaultStatInputs, DerivedStats, StatInputs } from './StatDerived.js';

const ColValue = 74;
const RowDamage = 15;
const RowCritical = 33;
const RowPdd = 51;
const RowMdd = 69;
const RowAcc = 87;
const RowEva = 105;
const RowSpeed = 177;
const RowJump = 195;
// TODO_AUDIT.md Hundred-and-fourteenth pass: was 0x332A21FF (RRGGBBAA) which
// crashes Pixi's color parser — stripped to 0xRRGGBB.
const ValueColor = 0x332A21;

// OG class: CUIStatDetail (TSingleton, ctor ??0CUIStatDetail@@QAE@JJ@Z,
// OnCreate/Draw confirmed). GetCriticalProp@CUIStatDetail confirms this
// class owns at least some derived-stat formula logic inline — see
// StatDerived.ts, which has no standalone OG equivalent (folded in here).
export class StatDetailInfo extends GamePanel {
  Inputs: StatInputs = defaultStatInputs();

  private _loader: WzTextureLoader;
  private _font: BuiltInFont | null;
  private _bg: WzSprite | null;
  private _bg2: WzSprite | null;
  private _btHpUp: Button | null;
  private _bgSprite: Sprite | null = null;
  private _statTexts: Text[] = [];

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._loader = loader;
    this._font = font;
    this.isVisible = false;

    const detail = ui?.GetItem('UIWindow2.img/Stat/detail');
    const detailProp = detail instanceof WzProperty ? detail : null;
    this._bg = detailProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(detailProp!.Get('backgrnd') as WzCanvas) : null;
    this._bg2 = detailProp?.Get('backgrnd2') instanceof WzCanvas ? loader.Load(detailProp!.Get('backgrnd2') as WzCanvas) : null;
    this._btHpUp = detailProp?.Get('BtHpUp') instanceof WzProperty ? new Button('HP Up') : null;
  }

  update(_dt: number): void {
    if (!this.isVisible) return;
    this.draw();
  }

  draw(): void {
    if (!this.isVisible) return;
    // background
    if (this._bg?.Texture && !this._bgSprite) {
      this._bgSprite = this._bg.ToPixi();
      this._root.addChild(this._bgSprite);
    }
    if (this._bgSprite) this._bgSprite.visible = true;

    // derived stats
    const d = computeDerived(this.Inputs);
    const vals: [number, string][] = [
      [RowDamage, `${d.minDamage} ~ ${d.maxDamage}`],
      [RowCritical, `${d.criticalPercent}%`],
      [RowPdd, `${d.pdd}`],
      [RowMdd, `${d.mdd}`],
      [RowAcc, `${d.accuracy}`],
      [RowEva, `${d.avoidability}`],
      [RowSpeed, `${d.speed}`],
      [RowJump, `${d.jump}`],
    ];
    // clear old texts
    for (const t of this._statTexts) { this._root.removeChild(t); t.destroy(); }
    this._statTexts = [];
    const pw = this._bg?.Width ?? 178;
    for (const [rowY, val] of vals) {
      const t = new Text({ text: val, style: new TextStyle({ fontFamily: 'monospace', fontSize: 9, fill: ValueColor }) });
      t.x = ColValue;
      t.y = rowY;
      this._root.addChild(t);
      this._statTexts.push(t);
    }
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (this._btHpUp?.handleMouseButton(x, y, down) === true) return true;
    const px = this.container.position.x;
    const py = this.container.position.y;
    const pw = this._bg?.Width ?? 178;
    const ph = this._bg?.Height ?? 247;
    return x >= px && x < px + pw && y >= py && y < py + ph;
  }
}
