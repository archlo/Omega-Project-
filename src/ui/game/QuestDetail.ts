import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { Button } from '../Button.js';
import { NpcLook } from '../../character/NpcLook.js';
import { QuestData } from '../../character/QuestInfoService.js';

const PanelW0 = 296, PanelH0 = 396;
const HeaderX = 10, HeaderY = 27, HeaderW = 276, HeaderH = 95;
const BodyX = 16, BodyY = 130, BodyW = 263, BodyH = 196;
const ScrollW = 12, ScrollGutterX = PanelW0 - 18;

// OG class: CUIQuestInfoDetail (vtable-only in pointers.txt, not present in
// function_index.txt). Ctor takes a ZRef<CUIQuestInfo> (the quest-log panel,
// see QuestLog.ts), confirming a parent/child relationship. Methods include
// MarkNpcLocation_InWorldMap/MarkMobLocation_InWorldMap/DrawTimeText/
// SetGauge_SeriesQuest.
export class QuestDetail extends GamePanel {
  AnchorTopLeft = { x: 0, y: 0 };
  OnRemoteAccept: ((id: number) => void) | null = null;
  OnResign: ((id: number) => void) | null = null;
  OnFindNpc: ((id: number) => void) | null = null;

  private _loader: WzTextureLoader;
  private _npcWz: WzPackage | null;
  private _font: BuiltInFont | null;
  private _bg: WzSprite | null;
  private _bg2: WzSprite | null;
  private _bg3: WzSprite | null;
  private _summaryBg: WzSprite | null;
  private _btClose: Button | null;
  private _btAccept: Button | null;
  private _btResign: Button | null;
  private _btFindNpc: Button | null;
  private _speaker: NpcLook | null = null;
  private _speakerNpcId = 0;
  private _quest: QuestData | null = null;
  private _state = 0;
  private _scroll = 0;
  private _draggingThumb = false;
  private _thumbGrabDy = 0;
  private _wrappedSummary: string[] = [];
  private _prevWheel = 0;

  private _bgLayer: Container;
  private _headerLayer: Container;
  private _bodyLayer: Container;
  private _summaryTexts: Text[] = [];
  private _scrollbarG: Graphics;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, npcWz: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._loader = loader;
    this._npcWz = npcWz;
    this._font = font;
    this.isVisible = false;

    this._bgLayer = new Container();
    this._headerLayer = new Container();
    this._bodyLayer = new Container();
    this._scrollbarG = new Graphics();
    this._bodyLayer.addChild(this._scrollbarG);
    this._root.addChild(this._bgLayer);
    this._root.addChild(this._headerLayer);
    this._root.addChild(this._bodyLayer);

    const qi = ui?.GetItem('UIWindow2.img/Quest/quest_info');
    const qiProp = qi instanceof WzProperty ? qi : null;
    this._bg = this._canvas(loader, qiProp, 'backgrnd');
    this._bg2 = this._canvas(loader, qiProp, 'backgrnd2');
    this._bg3 = this._canvas(loader, qiProp, 'backgrnd3');
    this._summaryBg = this._canvas(loader, qiProp, 'summary');
    this._btClose = this._buttonFrom(loader, qiProp, 'BtClose', () => this.isVisible = false);
    this._btAccept = this._buttonFrom(loader, qiProp, 'BtArlim', () => { if (this._quest) this.OnRemoteAccept?.(this._quest.Id); });
    this._btResign = this._buttonFrom(loader, qiProp, 'BtGiveup', () => { if (this._quest) this.OnResign?.(this._quest.Id); });
    this._btFindNpc = this._buttonFrom(loader, qiProp, 'BtNPC', () => { if (this._quest) this.OnFindNpc?.(this._quest.Id); });

    if (this._bg) this._bgLayer.addChild(this._bg.ToPixi());
    if (this._bg2) this._bgLayer.addChild(this._bg2.ToPixi());
    if (this._bg3) this._bgLayer.addChild(this._bg3.ToPixi());
    if (this._summaryBg) this._bodyLayer.addChild(this._summaryBg.ToPixi());
  }

  private _buttonFrom(loader: WzTextureLoader, root: WzProperty | null, name: string, onClick: () => void): Button | null {
    const v = root?.Get(name);
    if (!(v instanceof WzProperty)) return null;
    const b = Button.fromWz(loader, v, name);
    b.onClick = onClick;
    return b;
  }

  /** The currently displayed quest id, or 0 if none. */
  get selectedId(): number { return this._quest?.Id ?? 0; }

  SetQuest(data: QuestData | null, state: number): void {
    this._quest = data;
    this._state = state;
    this._scroll = 0;
    this._wrappedSummary = [];
    if (data === null) { this.isVisible = false; return; }
    this.isVisible = true;
    if (this._font !== null) {
      this._wrappedSummary = this._font.wrapToWidth(data.Summary, BodyW - 6);
    }

    const npcId = state === 2 && data.Complete.Npc !== 0 ? data.Complete.Npc : data.Start.Npc;
    if (npcId !== 0 && npcId !== this._speakerNpcId) {
      this._speakerNpcId = npcId;
      this._speaker = new NpcLook(npcId);
      this._speaker.Load(this._loader, this._npcWz);
      this._speaker.SetState('stand');
    } else if (npcId === 0) {
      this._speaker = null;
      this._speakerNpcId = 0;
    }
  }

  private get _visibleLines(): number {
    return this._font ? Math.max(1, Math.floor(BodyH / this._font.lineHeight)) : 0;
  }

  private _clampScroll(): void {
    const max = Math.max(0, this._wrappedSummary.length - this._visibleLines);
    if (this._scroll > max) this._scroll = max;
    if (this._scroll < 0) this._scroll = 0;
  }

  update(dt: number): void {
    if (!this.isVisible) return;
    const p = { x: this.AnchorTopLeft.x, y: this.AnchorTopLeft.y };
    this.container.position.set(p.x, p.y);

    // Position background layer
    this._bgLayer.position.set(p.x, p.y);

    // Position buttons
    if (this._btClose) this._btClose.container.position.set(p.x + PanelW0 - 18, p.y + 6);
    if (this._btAccept) this._btAccept.container.position.set(p.x + HeaderX + 6, p.y + HeaderY + 60);
    if (this._btResign) this._btResign.container.position.set(p.x + HeaderX + 6, p.y + HeaderY + 60);
    if (this._btFindNpc) this._btFindNpc.container.position.set(p.x + PanelW0 - 92, p.y + PanelH0 - 30);

    // Draw header
    this._headerLayer.removeChildren();
    this._drawHeader(p);

    // Draw body
    this._bodyLayer.position.set(p.x, p.y);
    this._bodyLayer.removeChildren();
    if (this._summaryBg) this._bodyLayer.addChild(this._summaryBg.ToPixi());
    this._drawBody(p);
    this._bodyLayer.addChild(this._scrollbarG);

    // Mouse wheel
    const mx = (window as any).__mouseX as number | undefined;
    const my = (window as any).__mouseY as number | undefined;
    if (mx !== undefined && my !== undefined) {
      if (mx >= p.x + BodyX && mx < p.x + BodyX + BodyW && my >= p.y + BodyY && my < p.y + BodyY + BodyH) {
        if (typeof (window as any).__wheelDelta === 'number') {
          const d = (window as any).__wheelDelta;
          if (d !== this._prevWheel) {
            this._scroll = Math.max(0, this._scroll - Math.sign(d));
            this._prevWheel = d;
          }
        }
      }
    }

    this._clampScroll();

    // Speaker animation
    this._speaker?.Update(dt);
  }

  private _drawHeader(p: { x: number; y: number }): void {
    if (!this._quest || !this._font) return;
    const headerLeft = p.x + HeaderX + 10;
    const headerTop = p.y + HeaderY + 6;
    const nameMax = HeaderW - 90;

    const name = this._font.truncateToWidth(this._quest.Name, nameMax);
    const nameText = new Text({ text: name, style: new TextStyle({ fill: 0xFFFFFF, fontSize: 11, fontFamily: 'monospace' }) });
    nameText.position.set(headerLeft, headerTop);
    this._headerLayer.addChild(nameText);

    const idText = new Text({ text: `Quest ID : ${this._quest.Id}`, style: new TextStyle({ fill: 0xE6F5FF, fontSize: 11, fontFamily: 'monospace' }) });
    idText.position.set(headerLeft, headerTop + 18);
    this._headerLayer.addChild(idText);

    const min = this._quest.Start.LvMin;
    const max = this._quest.Start.LvMax;
    let levelStr = '';
    if (min > 0 && max > 0) levelStr = `Over Level ${min}  Under Level ${max}`;
    else if (min > 0) levelStr = `Over Level ${min}`;
    else if (max > 0) levelStr = `Under Level ${max}`;
    if (levelStr) {
      const lvText = new Text({ text: levelStr, style: new TextStyle({ fill: 0xDCF0FF, fontSize: 11, fontFamily: 'monospace' }) });
      lvText.position.set(headerLeft, headerTop + 36);
      this._headerLayer.addChild(lvText);
    }

    if (this._speaker) {
      const feetX = p.x + HeaderX + HeaderW - 36;
      const feetY = p.y + HeaderY + HeaderH - 8;
      this._speaker.drawFrameOnly(this._headerLayer, feetX, feetY);
    }
  }

  private _drawBody(p: { x: number; y: number }): void {
    if (!this._font) return;
    const x = p.x + BodyX;
    const y = p.y + BodyY;
    const start = Math.floor(this._scroll);
    const lh = this._font.lineHeight;

    for (let i = 0; i < this._visibleLines; i++) {
      const idx = start + i;
      if (idx >= this._wrappedSummary.length) break;
      const t = new Text({
        text: this._wrappedSummary[idx],
        style: new TextStyle({ fill: 0x3C3C46, fontSize: 11, fontFamily: 'monospace' }),
      });
      t.position.set(x, y + i * lh);
      this._bodyLayer.addChild(t);
    }

    this._drawScrollbar(p);
  }

  private _drawScrollbar(p: { x: number; y: number }): void {
    if (this._wrappedSummary.length <= this._visibleLines) {
      this._scrollbarG.visible = false;
      return;
    }
    this._scrollbarG.visible = true;
    this._scrollbarG.clear();
    const trackTop = p.y + BodyY;
    const trackBot = p.y + BodyY + BodyH;
    const trackX = p.x + ScrollGutterX;
    const trackH = trackBot - trackTop;
    this._scrollbarG.rect(trackX, trackTop, ScrollW, trackH).fill({ color: 0xB4AA91, alpha: 0.75 });
    const thumbH = Math.max(18, Math.floor(trackH * this._visibleLines / Math.max(1, this._wrappedSummary.length)));
    const span = trackH - thumbH;
    const frac = this._scroll / Math.max(1, this._wrappedSummary.length - this._visibleLines);
    const ty = trackTop + Math.floor(span * Math.max(0, Math.min(1, frac)));
    this._scrollbarG.rect(trackX + 1, ty, ScrollW - 2, thumbH).fill({ color: 0x5F6E82 });
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const p = { x: this.AnchorTopLeft.x, y: this.AnchorTopLeft.y };

    if (this._btClose?.handleMouseButton(x, y, down) === true) return true;
    if (this._state === 0 && this._btAccept?.handleMouseButton(x, y, down) === true) return true;
    if (this._state === 1 && this._btResign?.handleMouseButton(x, y, down) === true) return true;
    if (this._btFindNpc?.handleMouseButton(x, y, down) === true) return true;

    if (!down) return this._panelRect(p).contains(x, y);

    if (this._wrappedSummary.length > this._visibleLines) {
      const trackTop = p.y + BodyY;
      const trackBot = p.y + BodyY + BodyH;
      const trackX = p.x + ScrollGutterX;
      const trackR = { x: trackX, y: trackTop, width: ScrollW, height: trackBot - trackTop };
      if (x >= trackR.x && x < trackR.x + trackR.width && y >= trackR.y && y < trackR.y + trackR.height) {
        const thumbH = Math.max(18, Math.floor(trackR.height * this._visibleLines / Math.max(1, this._wrappedSummary.length)));
        const span = trackR.height - thumbH;
        const frac = this._scroll / Math.max(1, this._wrappedSummary.length - this._visibleLines);
        const ty = trackTop + Math.floor(span * Math.max(0, Math.min(1, frac)));
        if (y >= ty && y < ty + thumbH) {
          this._draggingThumb = true;
          this._thumbGrabDy = y - ty;
        } else {
          this._scroll = y < ty ? this._scroll - this._visibleLines : this._scroll + this._visibleLines;
          this._clampScroll();
        }
        return true;
      }
    }

    return this._panelRect(p).contains(x, y);
  }

  private _panelRect(p: { x: number; y: number }): { x: number; y: number; width: number; height: number; contains(x: number, y: number): boolean } {
    return {
      x: p.x, y: p.y, width: PanelW0, height: PanelH0,
      contains(cx: number, cy: number) { return cx >= this.x && cx < this.x + this.width && cy >= this.y && cy < this.y + this.height; },
    };
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return true;
  }

  private _canvas(loader: WzTextureLoader, root: WzProperty | null, name: string): WzSprite | null {
    const v = root?.Get(name);
    return v instanceof WzCanvas ? loader.Load(v) : null;
  }
}
