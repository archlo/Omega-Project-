import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { ItemIconLoader, ItemAttr } from '../../character/ItemIconLoader.js';
import { TooltipAssets } from './TooltipAssets.js';

// TODO_AUDIT.md Hundred-and-twelfth pass: these were 0xRRGGBBAA (alpha in
// the low byte) and 0xAARRGGBB (alpha in high byte) respectively — both
// formats crash Pixi's color parser which expects plain 0xRRGGBB ints.
// Text colors converted to 0xRRGGBB; overlay constants split into color+alpha.
const BgColor        = 0x0E395A;   // was 0xCC0E395A (AA=CC handled as bgAlpha)
const CornerWhite    = 0xFFFFFF;   // was 0xFFFFFFFF
const InnerOutlineC  = 0xFFFFFF;
const InnerOutlineA  = 0x90 / 255; // was 0x90FFFFFF (AARRGGBB: A=90, RGB=white)
const DividerThinC   = 0xFFFFFF;
const DividerThinA   = 0x1C / 255; // was 0x1CFFFFFF (AARRGGBB: A=1C, RGB=white)
const NameColor      = 0xFFFFFF;   // was 0xFFFFFFFF
const DescColor      = 0xEEEEE0;   // was 0xEEEEE0FF
const StatColor      = 0xD6DCE6;   // was 0xD6DCE6FF
const InfoColor      = 0xBEC8DC;   // was 0xBEC8DCFF
const IdColor        = 0xE6E66E;   // was 0xE6E66EFF

const JobKlassNames = ['beginner', 'warrior', 'magician', 'bowman', 'thief', 'pirate'];
const JobX = [10, 52, 92, 132, 171, 197];
const EquipWidth = 244;
const IconX = 10;
const IconSize = 68;
const ReqLabelX = 94;
const ReqValueRight = 144;
const ReqRowStep = 12;
const ReqRowBaseDY = 32;
const JobStripDY = 141;

const enum InfoKind { Text, Bitmap }

interface InfoLine {
  kind: InfoKind;
  sprite: WzSprite | null;
  text: string | null;
}

// OG class: CUIToolTip — confirmed as the single shared tooltip renderer
// across item/equip/buff contexts (also used by CTemporaryStatView::
// ShowToolTip for buffs, CUIItemProtector::m_uiToolTip), not split into a
// separate item-specific class. Owns SetToolTip_Equip_Basic(GW_ItemSlotEquip*),
// DrawItemReqJob, SetToolTip_SlotInc, InitCanvas, GetFontByType, MakeLayer —
// see TooltipAssets.ts's citation for the asset-loading half of this.
export class ItemTooltip {
  private _font: BuiltInFont;
  private _icons: ItemIconLoader;
  private _assets: TooltipAssets;
  private _descOf: ((itemId: number) => string | null) | null;
  private _pLevel = 0; private _pStr = 0; private _pDex = 0; private _pInt = 0; private _pLuk = 0;

  private _root: Container;
  private _g: Graphics;
  private _iconSprite: Sprite;
  private _texts: Text[] = [];
  private _bgAlpha = 240 / 255;
  private _grade = 0;

  constructor(font: BuiltInFont, icons: ItemIconLoader, assets: TooltipAssets,
    descOf: ((itemId: number) => string | null) | null = null) {
    this._font = font;
    this._icons = icons;
    this._assets = assets;
    this._descOf = descOf;

    this._root = new Container();
    this._g = new Graphics();
    this._root.addChild(this._g);
    this._iconSprite = new Sprite();
    this._root.addChild(this._iconSprite);
    for (let i = 0; i < 32; i++) {
      const t = new Text({ text: '', style: this._font.style });
      t.visible = false;
      this._root.addChild(t);
      this._texts.push(t);
    }
    this._root.visible = false;
  }

  get root(): Container { return this._root; }

  SetPlayer(level: number, str: number, dex: number, intt: number, luk: number, _jobId: number): void {
    this._pLevel = level; this._pStr = str; this._pDex = dex; this._pInt = intt; this._pLuk = luk;
  }

  Draw(itemId: number, name: string, grade: number, _quantity: number,
    mouseX: number, mouseY: number, viewW: number, viewH: number,
    equippedSetCount: number = 0,
    petLevel?: number, petTameness?: number, petRepleteness?: number, petRemainLife?: number): void {
    const attr = this._icons.LoadAttr(itemId);
    const isEquip = (attr?.IsEquip === true) || Math.floor(itemId / 1_000_000) === 1;
    this._grade = grade;
    if (isEquip) {
      this._drawEquip(itemId, name, grade, attr, mouseX, mouseY, viewW, viewH, equippedSetCount);
    } else {
      this._drawConsumable(itemId, name, attr, mouseX, mouseY, viewW, viewH, petLevel, petTameness, petRepleteness, petRemainLife);
    }
  }

  Hide(): void { this._root.visible = false; }

  private _txt(idx: number, x: number, y: number, text: string, color: number, size?: number): void {
    const t = this._texts[idx];
    if (!t) return;
    t.visible = true;
    t.text = text;
    t.style = new TextStyle({
      fontFamily: 'monospace',
      fontSize: size ?? 10,
      fill: color,
    });
    t.x = x;
    t.y = y;
  }

  private _clearTexts(from = 0): void {
    for (let i = from; i < this._texts.length; i++) this._texts[i].visible = false;
  }

  private _dot(x: number, y: number, alpha = 0.3): void {
    this._g.rect(x, y, 2, 2).fill({ color: 0xFFFFFF, alpha });
  }

  private _drawEquip(itemId: number, name: string, grade: number, attr: ItemAttr | null,
    mouseX: number, mouseY: number, viewW: number, viewH: number, equippedSetCount = 0): void {
    const lh = this._font.lineHeight;
    const w = EquipWidth;
    const info = this._buildInfoLines(itemId, attr, equippedSetCount);
    const desc = this._descOf?.call(this, itemId);
    const descLines = !desc ? [] : this._wrapText(desc, w - 14);

    const yName = 6;
    const yDot1 = yName + lh + 3;
    const yBlock = yDot1 + 5;
    const yBlockBottom = yBlock + JobStripDY + 13;
    const yDot2 = yBlockBottom + 6;
    const yInfo = yDot2 + 6;
    const yDot3 = yInfo + info.length * (lh - 2) + 6;
    const yDesc = descLines.length > 0 ? yDot3 + 6 : yDot3;
    const yDescBottom = descLines.length > 0 ? yDesc + descLines.length * (lh - 1) : yDesc;
    const yDot4 = yDescBottom + 6;
    const yId = yDot4 + 6;
    const yIdBottom = yId + lh;
    const h = yIdBottom + 6;

    let x = mouseX + 16;
    let y = mouseY + 16;
    if (x + w > viewW) x = Math.max(0, mouseX - w - 4);
    if (y + h > viewH) y = Math.max(0, viewH - h);

    this._g.clear();
    this._clearTexts(0);

    // background
    this._g.rect(0, 0, w, h).fill({ color: 0x0E395A, alpha: this._bgAlpha });
    this._g.rect(0, 0, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, h - 1, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, 0, 1, h).fill({ color: 0x1A4A6A });
    this._g.rect(w - 1, 0, 1, h).fill({ color: 0x1A4A6A });

    const gx = x, gy = y;
    this._root.x = gx;
    this._root.y = gy;

    // name
    const nameColor = ItemTooltip._gradeColor(grade);
    this._txt(0, 4, yName, name, nameColor, 11);
    // inner outline
    this._g.rect(2, yName + lh, w - 4, 1).fill({ color: InnerOutlineC, alpha: InnerOutlineA });

    // dot line below name
    for (let d = 4; d < w - 4; d += 6) this._dot(d, yName + lh + 4);

    // icon
    const icon = this._icons.LoadIcon(itemId);
    if (icon?.Texture) {
      this._iconSprite.texture = icon.Texture;
      this._iconSprite.x = IconX;
      this._iconSprite.y = yBlock;
      this._iconSprite.width = IconSize;
      this._iconSprite.height = IconSize;
      this._iconSprite.visible = true;
    } else {
      this._iconSprite.visible = false;
      this._g.rect(IconX, yBlock, IconSize, IconSize).fill({ color: 0x1A2A3A });
    }

    // requirement rows
    let ti = 1;
    const reqs: [string, number, boolean][] = [
      ['Level:', attr?.ReqLevel ?? 0, this._pLevel >= (attr?.ReqLevel ?? 0)],
      ['STR:', attr?.ReqStr ?? 0, this._pStr >= (attr?.ReqStr ?? 0)],
      ['DEX:', attr?.ReqDex ?? 0, this._pDex >= (attr?.ReqDex ?? 0)],
      ['INT:', attr?.ReqInt ?? 0, this._pInt >= (attr?.ReqInt ?? 0)],
      ['LUK:', attr?.ReqLuk ?? 0, this._pLuk >= (attr?.ReqLuk ?? 0)],
      ['POP:', attr?.ReqFame ?? 0, false],
    ];
    for (const [label, val, met] of reqs) {
      if (val <= 0) continue;
      const rowY = yBlock + (ti - 1) * ReqRowStep;
      this._txt(ti, ReqLabelX, rowY, label, met ? 0x909090 : 0xFF6060, 9);
      const valStr = `${val}`;
      this._txt(ti + 6, ReqValueRight - this._font.measure(valStr).x, rowY, valStr, met ? StatColor : 0xFF6060, 9);
      ti++;
    }

    // inner outline before job strip
    this._g.rect(2, yBlockBottom - 8, w - 4, 1).fill({ color: InnerOutlineC, alpha: InnerOutlineA });

    // job strip (show which jobs can use)
    if (attr?.ReqJob) {
      const jobY = yBlock + JobStripDY;
      this._txt(ti, 4, jobY, `Jobs: ${attr.ReqJob}`, InfoColor, 9);
      ti++;
    }

    // info lines
    for (let il = 0; il < info.length; il++) {
      const lineY = yInfo + il * (lh - 2);
      const line = info[il];
      if (line.kind === InfoKind.Text && line.text) {
        this._txt(ti, 4, lineY, line.text, InfoColor, 9);
      }
      ti++;
    }

    // dot line after info
    if (info.length > 0) {
      for (let d = 4; d < w - 4; d += 6) this._dot(d, yDot3);
    }

    // description
    for (let dl = 0; dl < descLines.length; dl++) {
      this._txt(ti, 4, yDesc + dl * (lh - 1), descLines[dl], DescColor, 9);
      ti++;
    }

    // dot line before ID
    if (descLines.length > 0) {
      for (let d = 4; d < w - 4; d += 6) this._dot(d, yDot4);
    }

    // item id
    this._txt(ti, 4, yId, `ID: ${itemId}`, IdColor, 9);
    ti++;

    this._root.visible = true;
  }

  private _drawConsumable(itemId: number, name: string, attr: ItemAttr | null,
    mouseX: number, mouseY: number, viewW: number, viewH: number,
    petLevel?: number, petTameness?: number, petRepleteness?: number, petRemainLife?: number): void {
    const lh = this._font.lineHeight;
    const w = EquipWidth;
    const isPet = !!(petLevel !== undefined);

    // pet info lines (shown above description for pet items)
    const petLines: string[] = [];
    if (isPet) {
      petLines.push(`Level: ${petLevel!}`);
      petLines.push(`Tameness: ${petTameness!}`);
      petLines.push(`Hunger: ${petRepleteness!}`);
      const lifeRemaining = petRemainLife!;
      if (lifeRemaining > 0) {
        const days = Math.floor(lifeRemaining / 1440); // daily deplete cycle
        petLines.push(`Remaining Life: ${days} day${days === 1 ? '' : 's'}`);
      } else {
        petLines.push('Remaining Life: Expired');
      }
    }
    const petBlockH = isPet ? 4 + petLines.length * (lh - 1) + 4 : 0;

    const desc = this._descOf?.call(this, itemId) ?? '';
    const descLines = this._wrapText(desc, w - 14);
    const h = 6 + lh + 4 + petBlockH + 6 + descLines.length * (lh - 1) + 6 + lh + 6;

    let x = mouseX + 16;
    let y = mouseY + 16;
    if (x + w > viewW) x = Math.max(0, mouseX - w - 4);
    if (y + h > viewH) y = Math.max(0, viewH - h);

    this._g.clear();
    this._clearTexts(0);
    this._root.x = x;
    this._root.y = y;

    this._g.rect(0, 0, w, h).fill({ color: 0x0E395A, alpha: this._bgAlpha });
    this._g.rect(0, 0, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, h - 1, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, 0, 1, h).fill({ color: 0x1A4A6A });
    this._g.rect(w - 1, 0, 1, h).fill({ color: 0x1A4A6A });

    this._txt(0, 4, 6, name, NameColor, 11);
    this._g.rect(2, 6 + lh, w - 4, 1).fill({ color: InnerOutlineC, alpha: InnerOutlineA });

    let ti = 1;
    let yCursor = 6 + lh + 4;

    // pet info block
    if (isPet) {
      for (let pl = 0; pl < petLines.length; pl++) {
        this._txt(ti, 4, yCursor + pl * (lh - 1), petLines[pl], StatColor, 9);
        ti++;
      }
      yCursor += petBlockH;
      // dot line after pet info
      for (let d = 4; d < w - 4; d += 6) this._dot(d, yCursor - 2);
      yCursor += 6;
    }

    // description
    for (let dl = 0; dl < descLines.length; dl++) {
      this._txt(ti, 4, yCursor + dl * (lh - 1), descLines[dl], DescColor, 9);
      ti++;
    }

    // dot line before ID
    if (descLines.length > 0) {
      const yDot4 = yCursor + descLines.length * (lh - 1) + 6;
      for (let d = 4; d < w - 4; d += 6) this._dot(d, yDot4);
    }

    const yId = yCursor + descLines.length * (lh - 1) + (descLines.length > 0 ? 12 : 6);
    this._txt(ti, 4, yId, `ID: ${itemId}`, IdColor, 9);

    this._iconSprite.visible = false;
    this._root.visible = true;
  }

  private _buildInfoLines(_itemId: number, attr: ItemAttr | null, equippedSetCount = 0): InfoLine[] {
    const lines: InfoLine[] = [];
    if (attr === null) return lines;
    const push = (text: string) => lines.push({ kind: InfoKind.Text, sprite: null, text });
    // OG: CUIToolTip::SetToolTip_SetItem_Basic (IDA 0x8a14b0) reads
    // CItemInfo::SETITEMINFO from Item.wz/Special/SetItemInfo.img and lists
    // every stat-bonus tier via StringPool-templated text — that WZ schema
    // and string table aren't ported in this client (same accepted gap as
    // the Item-Upgrade-result "StringPool text not ported" case in
    // GameStage.ts). This is the verified-correct subset: which/how-many
    // pieces of the item's own set are currently equipped, computed the
    // same way CWvsContext::CheckEquippedSetItem does (count equipped items
    // sharing this one's setItemID) — TODO_AUDIT.md Hundred-and-ninth pass.
    if (attr.SetItemId > 0) push(`Set Item: ${equippedSetCount} piece${equippedSetCount === 1 ? '' : 's'} equipped`);
    if (attr.IncStr) push(`STR: +${attr.IncStr}`);
    if (attr.IncDex) push(`DEX: +${attr.IncDex}`);
    if (attr.IncInt) push(`INT: +${attr.IncInt}`);
    if (attr.IncLuk) push(`LUK: +${attr.IncLuk}`);
    if (attr.IncMhp) push(`MHP: +${attr.IncMhp}`);
    if (attr.IncMmp) push(`MMP: +${attr.IncMmp}`);
    if (attr.IncPad) push(`PAD: +${attr.IncPad}`);
    if (attr.IncMad) push(`MAD: +${attr.IncMad}`);
    if (attr.IncPdd) push(`PDD: +${attr.IncPdd}`);
    if (attr.IncMdd) push(`MDD: +${attr.IncMdd}`);
    if (attr.IncSpeed) push(`Speed: +${attr.IncSpeed}`);
    if (attr.IncJump) push(`Jump: +${attr.IncJump}`);
    if (attr.AttackSpeed) push(`Speed: ${attr.AttackSpeed}`);
    if (attr.Upgrades) push(`Upgrades: ${attr.Upgrades}`);
    return lines;
  }

  private _wrapText(text: string, maxW: number): string[] {
    const lines: string[] = [];
    for (const paragraph of text.replace('\\r', '\n').replace('\\n', '\n').replace('\r', '').split('\n')) {
      let cur = '';
      for (const word of paragraph.split(' ')) {
        const trial = cur.length === 0 ? word : cur + ' ' + word;
        if (this._font.measure(trial).x > maxW && cur.length > 0) { lines.push(cur); cur = word; }
        else { cur = trial; }
      }
      lines.push(cur);
    }
    return lines;
  }

  private static _gradeColor(g: number): number {
    // TODO_AUDIT.md Hundred-and-twelfth pass: stripped alpha byte (was 0xRRGGBBAA).
    switch (g) {
      case 1: return 0x77CCFF;
      case 2: return 0xCC88FF;
      case 3: return 0xFFCC33;
      case 4: return 0x55EE77;
      default: return 0xFFFFFF;
    }
  }
}
