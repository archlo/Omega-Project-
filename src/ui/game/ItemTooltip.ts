import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { ItemIconLoader, ItemAttr } from '../../character/ItemIconLoader.js';
import { TooltipAssets } from './TooltipAssets.js';
import { ToolTip } from './ToolTip.js';
const FONT_TYPES = ToolTip.FONT_TYPES;

// OG: Colors from IDA decompilation
const BgColor        = 0x0E395A;
const CornerWhite    = 0xFFFFFF;
const InnerOutlineC  = 0xFFFFFF;
const InnerOutlineA  = 0x90 / 255;
const DividerThinC   = 0xFFFFFF;
const DividerThinA   = 0x1C / 255;
const NameColor      = 0xFFFFFF;
const DescColor      = 0xEEEEE0;
const StatColor      = 0xD6DCE6;
const InfoColor      = 0xBEC8DC;
const IdColor        = 0xE6E66E;

// OG: Protection border colors (from SetToolTip_Equip)
const PROTECTION_COLORS = [
  0xFF66FFFF, // type 0: yellow/gold
  0xFFFFA15C, // type 1: orange
  0xFFFF61C2, // type 2: pink
  0xFF00CCFF, // type 3: cyan/blue
];

const JobKlassNames = ['beginner', 'warrior', 'magician', 'bowman', 'thief', 'pirate'];
const JobX = [10, 52, 92, 132, 171, 197];
const EquipWidth = 236; // OG: SetBasicInfo width for equip tooltips
const BundleWidth = 290; // OG: SetBasicInfo width for bundle tooltips
const SkillWidth = 320; // OG: SetBasicInfo width for skill tooltips
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

// OG class: CUIToolTip — the single shared tooltip renderer
// Handles equip/consumable/pet/skill/ring/macro tooltips
export class ItemTooltip {
  private _font: BuiltInFont;
  private _icons: ItemIconLoader;
  private _assets: TooltipAssets;
  private _descOf: ((itemId: number) => string | null) | null;
  private _pLevel = 0; private _pStr = 0; private _pDex = 0; private _pInt = 0; private _pLuk = 0;
  private _pJob = 0;

  private _root: Container;
  private _g: Graphics;
  private _iconSprite: Sprite;
  private _texts: Text[] = [];
  private _bgAlpha = 240 / 255;
  private _grade = 0;
  private _blitSprites: Sprite[] = []; // Track sprites added by BlitAt for cleanup

  // OG: SetToolTip_Equip parameters cache
  private _equipWidth = EquipWidth;
  private _toolTip: ToolTip;

  constructor(font: BuiltInFont, icons: ItemIconLoader, assets: TooltipAssets,
    descOf: ((itemId: number) => string | null) | null = null) {
    this._font = font;
    this._icons = icons;
    this._assets = assets;
    this._descOf = descOf;
    this._toolTip = new ToolTip(assets);

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
  get toolTip(): ToolTip { return this._toolTip; }

  SetPlayer(level: number, str: number, dex: number, intt: number, luk: number, job: number = 0): void {
    this._pLevel = level; this._pStr = str; this._pDex = dex; this._pInt = intt; this._pLuk = luk; this._pJob = job;
  }

  // OG: Master draw dispatcher — routes to equip vs consumable
  Draw(itemId: number, name: string, grade: number, _quantity: number,
    mouseX: number, mouseY: number, viewW: number, viewH: number,
    equippedSetCount: number = 0,
    petLevel?: number, petTameness?: number, petRepleteness?: number, petRemainLife?: number,
    equipStats?: { incStr: number; incDex: number; incInt: number; incLuk: number; incPad: number; incMad: number; incPdd: number; incMdd: number; incMhp: number; incMmp: number; incAcc: number; incEva: number; incSpeed: number; incJump: number; ruc: number; cuc: number; option1: number; option2: number; option3: number },
    bundleOpts?: {
      ft?: { low: number; high: number }; bProtected?: number; nPeriod?: number;
      sDonator?: string; sTitle?: string; nOriginalPrice?: number; nPrice?: number;
      goodsInfo?: any; bCashShop?: number; nNpcShopTimeLimitedItemPeriod?: number;
      nCommodityID?: number; nITCSalePrice?: number; ftITCDateExpired?: { low: number; high: number } | null;
      sOrderComment?: string; pii?: any;
    }): void {
    const attr = this._icons.LoadAttr(itemId);
    const isEquip = (attr?.IsEquip === true) || Math.floor(itemId / 1_000_000) === 1;
    this._grade = grade;
    if (isEquip) {
      this._drawEquip(itemId, name, grade, attr, mouseX, mouseY, viewW, viewH, equippedSetCount, equipStats);
    } else {
      this._drawConsumable(itemId, name, attr, mouseX, mouseY, viewW, viewH, petLevel, petTameness, petRepleteness, petRemainLife, bundleOpts);
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

  // OG: BlitAt — create sprite from WzSprite and add to parent
  // Tracks sprites for cleanup on next draw
  private _blitAt(sprite: any, x: number, y: number): void {
    if (!sprite) return;
    const sp = sprite.NewSprite();
    sp.x = x;
    sp.y = y;
    this._root.addChild(sp);
    this._blitSprites.push(sp);
  }

  // OG: Full equip tooltip — SetToolTip_Equip flow
  private _drawEquip(itemId: number, name: string, grade: number, attr: ItemAttr | null,
    mouseX: number, mouseY: number, viewW: number, viewH: number, equippedSetCount = 0,
    equipStats?: { incStr: number; incDex: number; incInt: number; incLuk: number; incPad: number; incMad: number; incPdd: number; incMdd: number; incMhp: number; incMmp: number; incAcc: number; incEva: number; incSpeed: number; incJump: number; ruc: number; cuc: number; option1: number; option2: number; option3: number }): void {
    const lh = this._font.lineHeight;
    const w = EquipWidth; // OG: 236px for equip
    const info = this._buildInfoLines(itemId, attr, equippedSetCount, equipStats);
    const desc = this._descOf?.call(this, itemId);
    const descLines = !desc ? [] : this._wrapText(desc, w - 14);

    // OG: Layout calculation from SetToolTip_Equip
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
    // OG: Remove sprites added by BlitAt (Can/Cannot labels, digit sprites, job icons)
    for (const sp of this._blitSprites) {
      if (sp.parent) sp.parent.removeChild(sp);
      sp.destroy();
    }
    this._blitSprites = [];

    // OG: Background with border
    this._g.rect(0, 0, w, h).fill({ color: BgColor, alpha: this._bgAlpha });
    this._g.rect(0, 0, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, h - 1, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, 0, 1, h).fill({ color: 0x1A4A6A });
    this._g.rect(w - 1, 0, 1, h).fill({ color: 0x1A4A6A });

    // OG: Protection border (4px colored border on ALL sides based on protection type)
    if (attr && attr.ProtectionType !== undefined && attr.ProtectionType >= 0 && attr.ProtectionType <= 3) {
      const borderC = PROTECTION_COLORS[attr.ProtectionType];
      this._g.rect(0, 0, w, 4).fill({ color: borderC, alpha: 0.8 });
      this._g.rect(0, h - 4, w, 4).fill({ color: borderC, alpha: 0.8 });
      this._g.rect(0, 0, 4, h).fill({ color: borderC, alpha: 0.8 });
      this._g.rect(w - 4, 0, 4, h).fill({ color: borderC, alpha: 0.8 });
    }

    const gx = x, gy = y;
    this._root.x = gx;
    this._root.y = gy;

    // OG: Item name
    const nameColor = ItemTooltip._gradeColor(grade);
    this._txt(0, 4, yName, name, nameColor, 11);

    let ti = 1;

    // OG: Cash item label (StringPool 5897) — shown after name when item is cash
    if (attr?.Cash) {
      this._txt(ti, 4 + this._font.measure(name).x + 6, yName, 'Cash', ToolTip.getFontColor(5), 9);
      ti++;
    }

    // OG: Star force display for enhanced items
    if (attr?.StarForce !== undefined && attr.StarForce > 0) {
      this._txt(ti, 4, yName + lh + 6, `★ ${attr.StarForce}`, ToolTip.getFontColor(5), 9);
      ti++;
    }

    // OG: Inner outline below name
    this._g.rect(2, yName + lh, w - 4, 1).fill({ color: InnerOutlineC, alpha: InnerOutlineA });

    // OG: Dot line below name
    for (let d = 4; d < w - 4; d += 6) this._dot(d, yName + lh + 4);

    // OG: Item icon (68x68)
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

    // OG: Requirement rows (Level/STR/DEX/INT/LUK/POP)
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

      // OG: Can/Cannot label sprite
      const labelSprite = this._assets.Req(label.replace(':', '').toLowerCase(), met);
      if (labelSprite) {
        this._blitAt(labelSprite, ReqLabelX, rowY);
      } else {
        this._txt(ti, ReqLabelX, rowY, label, met ? 0x909090 : 0xFF6060, 9);
      }

      // OG: Digit sprites
      const digitW = this._assets.DrawNumber(val, met, ReqValueRight - 20, rowY, this._root, 1);
      if (digitW === 0) {
        const valStr = `${val}`;
        this._txt(ti + 6, ReqValueRight - this._font.measure(valStr).x, rowY, valStr, met ? StatColor : 0xFF6060, 9);
      }
      ti++;
    }

    // OG: Inner outline before job strip
    this._g.rect(2, yBlockBottom - 8, w - 4, 1).fill({ color: InnerOutlineC, alpha: InnerOutlineA });

    // OG: Job requirement strip
    if (attr?.ReqJob) {
      const jobY = yBlock + JobStripDY;
      const jobNames = ['beginner', 'warrior', 'magician', 'bowman', 'thief', 'pirate'];
      const jobXPositions = [10, 52, 92, 132, 171, 197];
      for (let i = 0; i < 6; i++) {
        const bit = 1 << i;
        const greyed = (attr.ReqJob & bit) === 0;
        const sprite = this._assets.JobLabel(jobNames[i], greyed);
        if (sprite) {
          this._blitAt(sprite, jobXPositions[i], jobY);
        }
      }
      ti++;
    }

    // OG: Growth item rendering (if applicable)
    if (attr && this._isGrowthItem(itemId)) {
      this._drawGrowthItem(yBlock + JobStripDY + 20, attr);
    }

    // OG: Durability bar (if applicable)
    if (attr && attr.Durability !== undefined && attr.Durability > 0) {
      this._drawDurabilityBar(yBlock + JobStripDY + 40, attr);
    }

    // OG: Info lines (stat bonuses)
    for (let il = 0; il < info.length; il++) {
      const lineY = yInfo + il * (lh - 2);
      const line = info[il];
      if (line.kind === InfoKind.Text && line.text) {
        this._txt(ti, 4, lineY, line.text, InfoColor, 9);
      }
      ti++;
    }

    // OG: Dot line after info
    if (info.length > 0) {
      for (let d = 4; d < w - 4; d += 6) this._dot(d, yDot3);
    }

    // OG: Description
    for (let dl = 0; dl < descLines.length; dl++) {
      this._txt(ti, 4, yDesc + dl * (lh - 1), descLines[dl], DescColor, 9);
      ti++;
    }

    // OG: Dot line before ID
    if (descLines.length > 0) {
      for (let d = 4; d < w - 4; d += 6) this._dot(d, yDot4);
    }

    // OG: Item ID
    this._txt(ti, 4, yId, `ID: ${itemId}`, IdColor, 9);
    ti++;

    this._root.visible = true;
  }

  // OG: Full consumable tooltip — SetToolTip_Bundle flow
  // OG signature: (x, y, nItemID, ft, bProtected, nPeriod, sDonator, sTitle, nOriginalPrice, nPrice,
  //                goodsInfo, pe, bCashShop, nNpcShopTimeLimitedItemPeriod, nCommodityID,
  //                nITCSalePrice, ftITCDateExpired, sOrderComment, pii, itcToolTip)
  private _drawConsumable(itemId: number, name: string, attr: ItemAttr | null,
    mouseX: number, mouseY: number, viewW: number, viewH: number,
    petLevel?: number, petTameness?: number, petRepleteness?: number, petRemainLife?: number,
    bundleOpts?: {
      ft?: { low: number; high: number }; bProtected?: number; nPeriod?: number;
      sDonator?: string; sTitle?: string; nOriginalPrice?: number; nPrice?: number;
      goodsInfo?: any; bCashShop?: number; nNpcShopTimeLimitedItemPeriod?: number;
      nCommodityID?: number; nITCSalePrice?: number; ftITCDateExpired?: { low: number; high: number } | null;
      sOrderComment?: string; pii?: any;
    }): void {
    const lh = this._font.lineHeight;
    const w = BundleWidth; // OG: 290px for bundle
    const isPet = !!(petLevel !== undefined);
    const opts = bundleOpts ?? {};

    // OG: Pet info lines (shown above description for pet items)
    const petLines: string[] = [];
    if (isPet) {
      petLines.push(`Level: ${petLevel!}`);
      petLines.push(`Tameness: ${petTameness!}`);
      petLines.push(`Hunger: ${petRepleteness!}`);
      const lifeRemaining = petRemainLife!;
      if (lifeRemaining > 0) {
        const days = Math.floor(lifeRemaining / 1440);
        petLines.push(`Remaining Life: ${days} day${days === 1 ? '' : 's'}`);
      } else {
        petLines.push('Remaining Life: Expired');
      }
    }
    const petBlockH = isPet ? 4 + petLines.length * (lh - 1) + 4 : 0;

    // OG: Donator info (StringPool 0x2B0)
    const donatorLine = opts.sDonator ? `Donator: ${opts.sDonator}` : '';
    const donatorH = donatorLine ? lh + 4 : 0;

    // OG: Title (if provided)
    const titleLine = opts.sTitle ?? '';
    const titleH = titleLine ? lh + 4 : 0;

    // OG: Expiry date from ft
    const expiryStr = opts.ft ? this._toolTip.getItemExpireDate(opts.ft) : '';
    const expiryH = expiryStr ? lh + 4 : 0;

    // OG: Protected item indication
    const protectedLine = opts.bProtected ? 'Protected Item' : '';
    const protectedH = protectedLine ? lh + 4 : 0;

    // OG: Period display
    const periodStr = (opts.nPeriod ?? 0) > 0 ? `Period: ${opts.nPeriod} days` : '';
    const periodH = periodStr ? lh + 4 : 0;

    // OG: NPC shop time limited
    const timeLimitedStr = (opts.nNpcShopTimeLimitedItemPeriod ?? 0) > 0 ? `Time Limited: ${opts.nNpcShopTimeLimitedItemPeriod} days` : '';
    const timeLimitedH = timeLimitedStr ? lh + 4 : 0;

    // OG: Discount rate display
    const origPrice = opts.nOriginalPrice ?? 0;
    const curPrice = opts.nPrice ?? 0;
    const discountStr = origPrice > 0 && origPrice !== curPrice
      ? `${Math.floor((1 - curPrice / origPrice) * 100)}% Discount`
      : '';
    const discountH = discountStr ? lh + 4 : 0;

    // OG: ITC sale info
    const itcPrice = opts.nITCSalePrice ?? 0;
    const itcStr = itcPrice > 0 ? `ITC Price: ${itcPrice.toLocaleString()} mesos` : '';
    const itcH = itcStr ? lh + 4 : 0;

    // OG: ITC expiry
    const itcExpiryStr = opts.ftITCDateExpired ? this._toolTip.getItemExpireDate(opts.ftITCDateExpired) : '';
    const itcExpiryH = itcExpiryStr ? lh + 4 : 0;

    // OG: Order comment
    const orderCommentStr = opts.sOrderComment ?? '';
    const orderCommentH = orderCommentStr ? lh + 4 : 0;

    const desc = this._descOf?.call(this, itemId) ?? '';
    const descLines = this._wrapText(desc, w - 14);

    // OG: Calculate total height
    const extraH = donatorH + titleH + expiryH + protectedH + periodH + timeLimitedH + discountH + itcH + itcExpiryH + orderCommentH;
    const h = 6 + lh + 4 + petBlockH + extraH + 6 + descLines.length * (lh - 1) + 6 + lh + 6;

    let x = mouseX + 16;
    let y = mouseY + 16;
    if (x + w > viewW) x = Math.max(0, mouseX - w - 4);
    if (y + h > viewH) y = Math.max(0, viewH - h);

    this._g.clear();
    this._clearTexts(0);
    this._root.x = x;
    this._root.y = y;

    // OG: Background (0xCC0E395A with alpha)
    this._g.rect(0, 0, w, h).fill({ color: 0x0E395A, alpha: 204 / 255 });
    this._g.rect(0, 0, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, h - 1, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, 0, 1, h).fill({ color: 0x1A4A6A });
    this._g.rect(w - 1, 0, 1, h).fill({ color: 0x1A4A6A });

    // OG: Item name
    this._txt(0, 4, 6, name, NameColor, 11);
    this._g.rect(2, 6 + lh, w - 4, 1).fill({ color: InnerOutlineC, alpha: InnerOutlineA });

    let ti = 1;
    let yCursor = 6 + lh + 4;

    // OG: Title (if provided)
    if (titleLine) {
      this._txt(ti, 4, yCursor, titleLine, ToolTip.getFontColor(10), 10); // HL_SPECIAL
      ti++;
      yCursor += lh;
    }

    // OG: Pet info block
    if (isPet) {
      for (let pl = 0; pl < petLines.length; pl++) {
        this._txt(ti, 4, yCursor + pl * (lh - 1), petLines[pl], StatColor, 9);
        ti++;
      }
      yCursor += petBlockH;
      for (let d = 4; d < w - 4; d += 6) this._dot(d, yCursor - 2);
      yCursor += 6;
    }

    // OG: Donator info
    if (donatorLine) {
      this._txt(ti, 4, yCursor, donatorLine, DescColor, 9);
      ti++;
      yCursor += lh + 4;
    }

    // OG: Protected item
    if (protectedLine) {
      this._txt(ti, 4, yCursor, protectedLine, ToolTip.getFontColor(10), 10);
      ti++;
      yCursor += lh + 4;
    }

    // OG: Period display
    if (periodStr) {
      this._txt(ti, 4, yCursor, periodStr, DescColor, 9);
      ti++;
      yCursor += lh + 4;
    }

    // OG: Time limited
    if (timeLimitedStr) {
      this._txt(ti, 4, yCursor, timeLimitedStr, DescColor, 9);
      ti++;
      yCursor += lh + 4;
    }

    // OG: Discount rate
    if (discountStr) {
      this._txt(ti, 4, yCursor, discountStr, ToolTip.getFontColor(14), 10); // GEN_RED
      ti++;
      yCursor += lh + 4;
    }

    // OG: ITC sale info
    if (itcStr) {
      this._txt(ti, 4, yCursor, itcStr, DescColor, 9);
      ti++;
      yCursor += lh + 4;
    }

    // OG: ITC expiry
    if (itcExpiryStr) {
      this._txt(ti, 4, yCursor, `ITC Expires: ${itcExpiryStr}`, DescColor, 9);
      ti++;
      yCursor += lh + 4;
    }

    // OG: Order comment
    if (orderCommentStr) {
      this._txt(ti, 4, yCursor, orderCommentStr, DescColor, 9);
      ti++;
      yCursor += lh + 4;
    }

    // OG: Expiry date
    if (expiryStr) {
      this._txt(ti, 4, yCursor, `Expires: ${expiryStr}`, DescColor, 9);
      ti++;
      yCursor += lh + 4;
    }

    // OG: Description
    for (let dl = 0; dl < descLines.length; dl++) {
      this._txt(ti, 4, yCursor + dl * (lh - 1), descLines[dl], DescColor, 9);
      ti++;
    }

    // OG: Dot line before ID
    if (descLines.length > 0) {
      const yDot4 = yCursor + descLines.length * (lh - 1) + 6;
      for (let d = 4; d < w - 4; d += 6) this._dot(d, yDot4);
    }

    const yId = yCursor + descLines.length * (lh - 1) + (descLines.length > 0 ? 12 : 6);
    this._txt(ti, 4, yId, `ID: ${itemId}`, IdColor, 9);

    this._iconSprite.visible = false;
    this._root.visible = true;
  }

  // OG: Growth item check (item category 135xxx)
  private _isGrowthItem(itemId: number): boolean {
    const cat = Math.floor(itemId / 10000);
    return cat === 135;
  }

  // OG: Draw growth item indicators with EXP bar fill
  // Uses get_next_item_level_exp from CharacterData and canvas Copy for bar rendering
  private _drawGrowthItem(y: number, attr: ItemAttr): void {
    // Growth item top/bottom icons
    const growthEnabled = this._assets.Get('Can/growth');
    if (growthEnabled) {
      this._blitAt(growthEnabled, 94, y);
    }

    // Growth level digits
    if (attr.Level !== undefined) {
      this._assets.DrawNumber(attr.Level, true, 148, y, this._root, 1);
    }

    // OG: Growth EXP bar — percentage-based fill using canvas copy
    // The bar background is loaded from WZ, filled proportionally to currentExp/maxExp
    const expBarBg = this._assets.Get('Growth/expBarBg');
    if (expBarBg) {
      this._blitAt(expBarBg, 94, y + 12);
      // Fill percentage bar (simplified — OG uses canvas Copy with clipping)
      const expBarFill = this._assets.Get('Growth/expBarFill');
      if (expBarFill) {
        const fillRatio = Math.min(1, (attr as any).expPct ?? 0);
        const fullW = expBarFill.Width ?? 40;
        const fillW = Math.floor(fullW * fillRatio);
        if (fillW > 0) {
          const sprite = (expBarFill as any).NewSprite?.() ?? (expBarFill as any).ToPixi?.();
          if (sprite) {
            sprite.x = 94;
            sprite.y = y + 12;
            // OG: canvas Copy with clipping to show only fillW pixels
            (sprite as any).width = fillW;
            this._root.addChild(sprite);
            this._blitSprites.push(sprite);
          }
        }
      }
    } else {
      // Fallback: text-based EXP display
      const growthDisabled = this._assets.Get('Cannot/growth');
      if (growthDisabled) {
        this._blitAt(growthDisabled, 148, y + 12);
      }
    }
  }

  // OG: Draw durability bar with percentage fill calculation
  private _drawDurabilityBar(y: number, attr: ItemAttr): void {
    const dur = attr.Durability ?? 0;
    const isLow = dur <= 10;

    // Durability bar background
    const barSprite = this._assets.Get(isLow ? 'Cannot/durability' : 'Can/durability');
    if (barSprite) {
      this._blitAt(barSprite, 94, y);
    }

    // OG: Durability percentage fill — bar fill proportional to dur/100
    const durFillBg = this._assets.Get('Can/durabilityFill');
    if (durFillBg) {
      const fillRatio = Math.min(1, dur / 100);
      const fullW = (durFillBg as any).Width ?? 50;
      const fillW = Math.floor(fullW * fillRatio);
      if (fillW > 0) {
        const sprite = (durFillBg as any).NewSprite?.() ?? (durFillBg as any).ToPixi?.();
        if (sprite) {
          sprite.x = 94;
          sprite.y = y;
          (sprite as any).width = fillW;
          this._root.addChild(sprite);
          this._blitSprites.push(sprite);
        }
      }
    }

    // Durability number
    this._assets.DrawNumber(dur, !isLow, 161, y, this._root, 1);

    // Durability suffix
    const suffix = this._assets.Get(isLow ? 'Cannot/max' : 'Can/max');
    if (suffix) {
      this._blitAt(suffix, 161 + dur * 2 + 8, y);
    }
  }

  // OG: Build stat bonus info lines — uses actual equip stats when available
  private _buildInfoLines(_itemId: number, attr: ItemAttr | null, equippedSetCount = 0,
    equipStats?: { incStr: number; incDex: number; incInt: number; incLuk: number; incPad: number; incMad: number; incPdd: number; incMdd: number; incMhp: number; incMmp: number; incAcc: number; incEva: number; incSpeed: number; incJump: number; ruc: number; cuc: number; option1: number; option2: number; option3: number }): InfoLine[] {
    const lines: InfoLine[] = [];
    if (attr === null) return lines;
    const push = (text: string) => lines.push({ kind: InfoKind.Text, sprite: null, text });

    // OG: Weapon category name (StringPool 0x1A25)
    const cat = Math.floor(_itemId / 10000);
    const weaponCategories: Record<number, string> = {
      130: 'Sword', 131: 'Axe', 132: 'Blunt Weapon', 133: 'Dagger',
      137: 'Polearm', 138: 'Staff', 139: 'Bow', 140: 'Crossbow',
      141: 'Claw', 143: 'Knuckle', 144: 'Gun', 145: 'Shield',
      146: 'Cape', 148: 'Ring',
    };
    const itemCategories: Record<number, string> = {
      100: 'Cap', 104: 'Coat', 105: 'Longcoat', 106: 'Pants',
      107: 'Shoes', 108: 'Glove', 109: 'Shield',
    };
    if (weaponCategories[cat]) {
      push(weaponCategories[cat]);
    } else if (itemCategories[cat]) {
      push(itemCategories[cat]);
    }

    // OG: Attack speed display (StringPool 0x2A1)
    if (attr.AttackSpeed) {
      const speedNames = ['', '1-Hit', '2-Hit', '3-Hit', '4-Hit', '5-Hit', '6-Hit', '7-Hit', '8-Hit', 'Slow', 'Normal', 'Fast', 'Faster', 'Fastest'];
      const speedName = speedNames[attr.AttackSpeed] ?? `Speed ${attr.AttackSpeed}`;
      push(`Attack Speed: ${speedName}`);
    }

    // OG: Set item bonus
    if (attr.SetItemId > 0) push(`Set Item: ${equippedSetCount} piece${equippedSetCount === 1 ? '' : 's'} equipped`);

    // OG: Use actual equip stats if available, fall back to WZ base stats
    const s = equipStats;
    if (s) {
      // Actual equipped item stats (includes scrolls, potentials, hammers)
      if (s.incStr) push(`STR: +${s.incStr}`);
      if (s.incDex) push(`DEX: +${s.incDex}`);
      if (s.incInt) push(`INT: +${s.incInt}`);
      if (s.incLuk) push(`LUK: +${s.incLuk}`);
      if (s.incMhp) push(`MHP: +${s.incMhp}`);
      if (s.incMmp) push(`MMP: +${s.incMmp}`);
      if (s.incPad) push(`PAD: +${s.incPad}`);
      if (s.incMad) push(`MAD: +${s.incMad}`);
      if (s.incPdd) push(`PDD: +${s.incPdd}`);
      if (s.incMdd) push(`MDD: +${s.incMdd}`);
      if (s.incAcc) push(`ACC: +${s.incAcc}`);
      if (s.incEva) push(`EVA: +${s.incEva}`);
      if (s.incSpeed) push(`Speed: +${s.incSpeed}`);
      if (s.incJump) push(`Jump: +${s.incJump}`);
      if (s.ruc) push(`Upgrades: ${s.ruc}`);
      if (s.cuc) push(`Hammers: ${s.cuc}`);
    } else {
      // WZ base stats (no scrolls/potentials)
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
      if (attr.Upgrades) push(`Upgrades: ${attr.Upgrades}`);
    }
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
    switch (g) {
      case 1: return 0x77CCFF;
      case 2: return 0xCC88FF;
      case 3: return 0xFFCC33;
      case 4: return 0x55EE77;
      default: return 0xFFFFFF;
    }
  }

  // OG: SetToolTip_Skill @ 0x8a2500 — skill tooltip with level info and required skills
  // Handles swallow buff (33101006), Wild Hunter (30001061/30001062), linked character, skill expiry
  DrawSkillTooltip(
    skillId: number, skillName: string, description: string,
    currentLevel: number, maxLevel: number,
    currentHelp: string, nextHelp: string,
    reqSkills: Array<{ name: string; level: number }>,
    mouseX: number, mouseY: number, viewW: number, viewH: number,
    bShowLevel = true,
    // OG: Additional skill data for special handling
    skillData?: {
      isSwallowBuff?: boolean; swallowBuffType?: number;
      isWildHunter?: boolean; linkedCharName?: string;
      expiryStr?: string; masterLevel?: number;
      damageMeter?: { avgDmg: number; maxDmg: number };
    },
  ): void {
    const lh = this._font.lineHeight;
    const w = SkillWidth; // OG: 320px for skill tooltips

    // OG: Calculate description height via DrawTextSepartedLine measurement
    const descLines = this._wrapText(description, w - 94);
    const descH = descLines.length * (lh - 2);

    // OG: Level info height (2 lines per level: current + next)
    let levelH = 0;
    if (bShowLevel && currentLevel > 0) levelH += lh + 4; // current level line
    if (currentLevel < maxLevel) levelH += lh + 4; // next level line

    // OG: Required skills height
    const reqH = reqSkills.length > 0 ? reqSkills.length * 14 + 20 : 0;

    // OG: Swallow buff / Wild Hunter / DamageMeter extra height
    let extraH = 0;
    if (skillData?.isSwallowBuff) extraH += 5 * (lh + 4); // 5 buff types
    if (skillData?.isWildHunter) extraH += lh + 4;
    if (skillData?.linkedCharName) extraH += lh + 4;
    if (skillData?.expiryStr) extraH += lh + 4;
    if (skillData?.damageMeter) extraH += 2 * (lh + 4);

    // OG: Height calculation from IDA (v17 = v15 + 128, where v15 is desc overflow)
    const descOverflow = descH > 68 ? descH - 68 : 0;
    const h = descOverflow + 128 + reqH + extraH;

    let x = mouseX + 16;
    let y = mouseY + 16;
    if (x + w > viewW) x = Math.max(0, mouseX - w - 4);
    if (y + h > viewH) y = Math.max(0, viewH - h);

    this._g.clear();
    this._clearTexts(0);
    this._root.x = x;
    this._root.y = y;

    // OG: Background
    this._g.rect(0, 0, w, h).fill({ color: BgColor, alpha: this._bgAlpha });
    this._g.rect(0, 0, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, h - 1, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, 0, 1, h).fill({ color: 0x1A4A6A });
    this._g.rect(w - 1, 0, 1, h).fill({ color: 0x1A4A6A });

    const gx = x, gy = y;
    this._root.x = gx;
    this._root.y = gy;

    let ti = 0;

    // OG: Skill name (centered)
    this._txt(ti, 0, 6, skillName, NameColor, 11);
    const nameW = this._font.measure(skillName).x;
    this._texts[ti].x = (w - nameW) / 2;
    ti++;

    // OG: Inner outline below name
    this._g.rect(2, 6 + lh, w - 4, 1).fill({ color: InnerOutlineC, alpha: InnerOutlineA });

    // OG: Description (word-wrapped, x1=87 from IDA)
    let yCursor = 6 + lh + 6;
    for (const line of descLines) {
      this._txt(ti, 10, yCursor, line, DescColor, 9);
      ti++;
      yCursor += lh - 2;
    }

    // OG: Dot line after description
    yCursor += 4;
    for (let d = 4; d < w - 4; d += 6) this._dot(d, yCursor);
    yCursor += 6;

    // OG: Current level info (StringPool 691 "Lv.%d")
    if (bShowLevel && currentLevel > 0) {
      this._txt(ti, 10, yCursor, `Lv.${currentLevel}`, ToolTip.getFontColor(10), 10);
      ti++;
      yCursor += lh;
      // Current level help text
      const helpLines = this._wrapText(currentHelp, w - 20);
      for (const line of helpLines) {
        this._txt(ti, 10, yCursor, line, DescColor, 9);
        ti++;
        yCursor += lh - 2;
      }
      yCursor += 4;
    }

    // OG: Next level info (StringPool 692 "Lv.%d")
    if (currentLevel < maxLevel) {
      this._txt(ti, 10, yCursor, `Lv.${currentLevel + 1}`, ToolTip.getFontColor(10), 10);
      ti++;
      yCursor += lh;
      // Next level help text
      const nextLines = this._wrapText(nextHelp, w - 20);
      for (const line of nextLines) {
        this._txt(ti, 10, yCursor, line, DescColor, 9);
        ti++;
        yCursor += lh - 2;
      }
      yCursor += 4;
    }

    // OG: Required skills
    if (reqSkills.length > 0) {
      for (let d = 4; d < w - 4; d += 6) this._dot(d, yCursor);
      yCursor += 6;
      this._txt(ti, 10, yCursor, 'Required Skills:', ToolTip.getFontColor(10), 10);
      ti++;
      yCursor += lh;
      for (const req of reqSkills) {
        this._txt(ti, 20, yCursor, `${req.name} (Lv.${req.level})`, DescColor, 9);
        ti++;
        yCursor += 14;
      }
    }

    // OG: Swallow buff (skill 33101006) — 5 buff types
    if (skillData?.isSwallowBuff) {
      for (let d = 4; d < w - 4; d += 6) this._dot(d, yCursor);
      yCursor += 6;
      this._txt(ti, 10, yCursor, 'Swallow Buff:', ToolTip.getFontColor(10), 10);
      ti++;
      yCursor += lh;
      const swallowBuffs = ['Critical', 'MaxMP', 'Attack', 'Defence', 'Evasion'];
      for (const buff of swallowBuffs) {
        this._txt(ti, 20, yCursor, buff, DescColor, 9);
        ti++;
        yCursor += lh + 4;
      }
    }

    // OG: Wild Hunter (30001061/30001062) — monster name display
    if (skillData?.isWildHunter) {
      for (let d = 4; d < w - 4; d += 6) this._dot(d, yCursor);
      yCursor += 6;
      this._txt(ti, 10, yCursor, 'Wild Hunter:', ToolTip.getFontColor(10), 10);
      ti++;
      yCursor += lh;
      this._txt(ti, 20, yCursor, 'Linked Monster', DescColor, 9);
      ti++;
      yCursor += lh + 4;
    }

    // OG: Linked character (StringPool 5219)
    if (skillData?.linkedCharName) {
      for (let d = 4; d < w - 4; d += 6) this._dot(d, yCursor);
      yCursor += 6;
      this._txt(ti, 10, yCursor, `Linked Character: ${skillData.linkedCharName}`, DescColor, 9);
      ti++;
      yCursor += lh + 4;
    }

    // OG: Skill expiry
    if (skillData?.expiryStr) {
      for (let d = 4; d < w - 4; d += 6) this._dot(d, yCursor);
      yCursor += 6;
      this._txt(ti, 10, yCursor, skillData.expiryStr, ToolTip.getFontColor(14), 9);
      ti++;
      yCursor += lh + 4;
    }

    // OG: DamageMeter stats
    if (skillData?.damageMeter) {
      for (let d = 4; d < w - 4; d += 6) this._dot(d, yCursor);
      yCursor += 6;
      this._txt(ti, 10, yCursor, 'Damage Meter:', ToolTip.getFontColor(10), 10);
      ti++;
      yCursor += lh;
      this._txt(ti, 20, yCursor, `Average: ${skillData.damageMeter.avgDmg.toLocaleString()}`, DescColor, 9);
      ti++;
      yCursor += lh + 4;
      this._txt(ti, 20, yCursor, `Maximum: ${skillData.damageMeter.maxDmg.toLocaleString()}`, DescColor, 9);
      ti++;
      yCursor += lh + 4;
    }

    this._iconSprite.visible = false;
    this._root.visible = true;
  }

  // OG: SetToolTip_Pet @ 0x898700 — pet tooltip with death/donator/expiry
  // IDA: tooltip type=6, width=290, dead icon canvas at (10,33), death text font 22,
  //      MakingLimitInfo, DrawDiscount_Info, DrawLimitInfo
  DrawPetTooltip(
    petName: string, templateName: string, description: string,
    level: number, tameness: number, repleteness: number,
    isDead: boolean, deathStr: string,
    donator: string, expiryStr: string,
    skills: string[],
    mouseX: number, mouseY: number, viewW: number, viewH: number,
    nOriginalPrice = 0, nPrice = 0,
    itemId = 0,
    goodsInfo?: { dwConditionFlag: number; nDateStart?: number; nDateEnd?: number; abWeek?: number[]; nHourStart?: number; nHourEnd?: number; nOriginCount?: number; nRemainCount?: number } | null,
  ): void {
    const lh = this._font.lineHeight;
    const w = 290; // OG: 290px for pet tooltips

    // OG: nCashDescOffset accumulator (16 per non-empty death/donator string)
    let cashDescOffset = 0;
    if (deathStr) cashDescOffset += 16;
    if (donator) cashDescOffset += 16;

    // OG: Description height via DrawTextSepartedLine measurement (x1=92, x2=270)
    const descLines = this._wrapText(description, w - 92);
    const descH = descLines.length * (lh - 2);
    const descOverflow = descH > 68 ? descH - 68 : 0;

    // OG: Discount height (35 if prices differ)
    const discountH = (nOriginalPrice > 0 && nOriginalPrice !== nPrice) ? 35 : 0;

    // OG: MakingLimitInfo — build limit info strings from goodsInfo
    const limitTexts = this._toolTip.makingLimitInfo(goodsInfo ?? null);
    const limitH = limitTexts.length > 0 ? limitTexts.length * 14 : 0;

    // OG: SetBasicInfo(6, 290, descOverflow + discountH + nCashDescOffset + 116, -1)
    const h = descOverflow + discountH + cashDescOffset + 116 + limitH;

    let x = mouseX + 16;
    let y = mouseY + 16;
    if (x + w > viewW) x = Math.max(0, mouseX - w - 4);
    if (y + h > viewH) y = Math.max(0, viewH - h);

    this._g.clear();
    this._clearTexts(0);
    // Clean up blit sprites (dead icon canvas, etc.)
    for (const sp of this._blitSprites) {
      if (sp.parent) sp.parent.removeChild(sp);
      sp.destroy();
    }
    this._blitSprites = [];
    this._root.x = x;
    this._root.y = y;

    // OG: Background (MakeLayer with 0xCC0E395A)
    this._g.rect(0, 0, w, h).fill({ color: BgColor, alpha: this._bgAlpha });
    this._g.rect(0, 0, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, h - 1, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, 0, 1, h).fill({ color: 0x1A4A6A });
    this._g.rect(w - 1, 0, 1, h).fill({ color: 0x1A4A6A });

    let ti = 0;

    // OG: Pet name (DrawTextItemName at x=10, font type 1 = HL_WHITE, centered)
    this._txt(ti, 0, 10, petName, NameColor, 11);
    const nameW = this._font.measure(petName).x;
    this._texts[ti].x = (w - nameW) / 2;
    ti++;

    // OG: Inner outline below name
    this._g.rect(2, 10 + lh, w - 4, 1).fill({ color: InnerOutlineC, alpha: InnerOutlineA });

    // OG: v42 tracks yCursor for donator placement (31 if no dead, 47 if dead)
    let v42 = 31;

    // OG: Dead icon canvas (m_pCanvasDot[1]) at (10, 33) with alpha=255
    if (isDead && deathStr) {
      const deadIcon = this._assets.Dot(1);
      if (deadIcon) {
        this._blitAt(deadIcon, 10, 33);
      }
      // OG: Death text at (16, 29) with font type 22 (H_WHITE, size 12)
      this._txt(ti, 16, 29, deathStr, ToolTip.getFontColor(22), 12);
      ti++;
      v42 = 47;
    }

    // OG: Donator info (StringPool 0x2B0), font type 10 (HL_SPECIAL), DrawTextCenter
    if (donator) {
      const donatorText = `Donator: ${donator}`;
      this._txt(ti, 0, v42, donatorText, ToolTip.getFontColor(10), 10);
      const donatorW = this._font.measure(donatorText).x;
      this._texts[ti].x = (w - donatorW) / 2;
      ti++;
    }

    // OG: Pet template name
    this._txt(ti, 10, v42 + lh + 4, templateName, DescColor, 9);
    ti++;
    let yCursor = v42 + lh + 4 + lh;

    // OG: Pet stats (level, tameness, repleteness) — extra info beyond OG
    this._txt(ti, 10, yCursor, `Lv.${level}`, StatColor, 9);
    this._txt(ti, 100, yCursor, `Tameness: ${tameness}`, StatColor, 9);
    this._txt(ti, 200, yCursor, `Full: ${repleteness}`, StatColor, 9);
    ti++;
    yCursor += lh;

    // OG: Pet skills — extra info beyond OG
    if (skills.length > 0) {
      for (const skill of skills) {
        this._txt(ti, 10, yCursor, skill, DescColor, 9);
        ti++;
        yCursor += 14;
      }
    }

    // OG: Item icon at (10, nCashDescOffset + 32) via DrawItemIcon
    if (itemId > 0) {
      const iconY = cashDescOffset + 32;
      const icon = this._icons.LoadIcon(itemId);
      if (icon?.Texture) {
        this._iconSprite.texture = icon.Texture;
        this._iconSprite.x = 10;
        this._iconSprite.y = iconY;
        this._iconSprite.width = IconSize;
        this._iconSprite.height = IconSize;
        this._iconSprite.visible = true;
      }
    }

    // OG: Description (DrawTextSepartedLine at x=92, maxW=270, y=nCashDescOffset+32)
    if (description) {
      const descY = cashDescOffset + 32;
      for (let d = 4; d < w - 4; d += 6) this._dot(d, descY - 2);
      for (let dl = 0; dl < descLines.length; dl++) {
        this._txt(ti, 92, descY + dl * (lh - 2), descLines[dl], DescColor, 9);
        ti++;
      }
    }

    // OG: Expiry date
    if (expiryStr) {
      this._txt(ti, 10, yCursor, expiryStr, ToolTip.getFontColor(14), 9);
      ti++;
      yCursor += 16;
    }

    // OG: DrawDiscount_Info when nOriginalPrice > 0 && nOriginalPrice != nPrice
    // Position: max(descH, 68) + nCashDescOffset + 40
    if (nOriginalPrice > 0 && nOriginalPrice !== nPrice) {
      const discountY = Math.max(descH, 68) + cashDescOffset + 40;
      const rate = Math.floor((1 - nPrice / nOriginalPrice) * 100);
      this._txt(ti, 10, discountY, `Discount: ${rate}%`, ToolTip.getFontColor(14), 10);
      ti++;
    }

    // OG: DrawLimitInfo at m_nHeight - 16 * limitCount when goodsInfo present
    if (limitTexts.length > 0) {
      let limitY = h - 16 * limitTexts.length;
      for (const text of limitTexts) {
        if (text) {
          this._txt(ti, 10, limitY, text, ToolTip.getFontColor(11), 9);
          ti++;
        }
        limitY += 14;
      }
    }

    this._root.visible = true;
  }

  // OG: SetToolTip_Ring @ 0x8a3460 — ring tooltip with partner/friend/spouse
  // Loads ring image from WZ (StringPool 0xAD3), handles couple/friend/marriage records
  DrawRingTooltip(
    ringName: string, description: string,
    partnerName: string, ringType: 'couple' | 'friend' | 'spouse',
    expiryStr: string, itemId: number,
    mouseX: number, mouseY: number, viewW: number, viewH: number,
    equipStats?: { incStr: number; incDex: number; incInt: number; incLuk: number; incPad: number; incMad: number; incPdd: number; incMdd: number; incMhp: number; incMmp: number; incAcc: number; incEva: number; incSpeed: number; incJump: number; ruc: number; cuc: number },
    equipAttr?: ItemAttr | null,
  ): void {
    const lh = this._font.lineHeight;
    const w = EquipWidth; // OG: 236px for ring tooltips

    const descLines = this._wrapText(description, w - 20);
    const descH = descLines.length * (lh - 2);
    const partnerH = partnerName ? lh + 4 : 0;

    // OG: Build stat lines from equip stats
    const infoLines: string[] = [];
    if (equipStats) {
      if (equipStats.incStr) infoLines.push(`STR: +${equipStats.incStr}`);
      if (equipStats.incDex) infoLines.push(`DEX: +${equipStats.incDex}`);
      if (equipStats.incInt) infoLines.push(`INT: +${equipStats.incInt}`);
      if (equipStats.incLuk) infoLines.push(`LUK: +${equipStats.incLuk}`);
      if (equipStats.incPad) infoLines.push(`PAD: +${equipStats.incPad}`);
      if (equipStats.incMad) infoLines.push(`MAD: +${equipStats.incMad}`);
      if (equipStats.incPdd) infoLines.push(`PDD: +${equipStats.incPdd}`);
      if (equipStats.incMdd) infoLines.push(`MDD: +${equipStats.incMdd}`);
      if (equipStats.incMhp) infoLines.push(`MHP: +${equipStats.incMhp}`);
      if (equipStats.incMmp) infoLines.push(`MMP: +${equipStats.incMmp}`);
      if (equipStats.incAcc) infoLines.push(`ACC: +${equipStats.incAcc}`);
      if (equipStats.incEva) infoLines.push(`EVA: +${equipStats.incEva}`);
      if (equipStats.incSpeed) infoLines.push(`Speed: +${equipStats.incSpeed}`);
      if (equipStats.incJump) infoLines.push(`Jump: +${equipStats.incJump}`);
      if (equipStats.ruc) infoLines.push(`Upgrades: ${equipStats.ruc}`);
    } else if (equipAttr) {
      if (equipAttr.IncStr) infoLines.push(`STR: +${equipAttr.IncStr}`);
      if (equipAttr.IncDex) infoLines.push(`DEX: +${equipAttr.IncDex}`);
      if (equipAttr.IncInt) infoLines.push(`INT: +${equipAttr.IncInt}`);
      if (equipAttr.IncLuk) infoLines.push(`LUK: +${equipAttr.IncLuk}`);
      if (equipAttr.IncPad) infoLines.push(`PAD: +${equipAttr.IncPad}`);
      if (equipAttr.IncMad) infoLines.push(`MAD: +${equipAttr.IncMad}`);
      if (equipAttr.IncPdd) infoLines.push(`PDD: +${equipAttr.IncPdd}`);
      if (equipAttr.IncMdd) infoLines.push(`MDD: +${equipAttr.IncMdd}`);
      if (equipAttr.IncMhp) infoLines.push(`MHP: +${equipAttr.IncMhp}`);
      if (equipAttr.IncMmp) infoLines.push(`MMP: +${equipAttr.IncMmp}`);
      if (equipAttr.IncSpeed) infoLines.push(`Speed: +${equipAttr.IncSpeed}`);
      if (equipAttr.IncJump) infoLines.push(`Jump: +${equipAttr.IncJump}`);
      if (equipAttr.Upgrades) infoLines.push(`Upgrades: ${equipAttr.Upgrades}`);
    }
    const infoH = infoLines.length > 0 ? infoLines.length * (lh - 2) + 6 : 0;

    // OG: Ring image from WZ (StringPool 0xAD3)
    const ringImage = this._assets?.Get('ring');
    const ringH = ringImage ? 68 : 0; // OG: ring image is 68px tall

    const h = 10 + lh + 6 + partnerH + infoH + descH + ringH + 6 + lh + 10;

    let x = mouseX + 16;
    let y = mouseY + 16;
    if (x + w > viewW) x = Math.max(0, mouseX - w - 4);
    if (y + h > viewH) y = Math.max(0, viewH - h);

    this._g.clear();
    this._clearTexts(0);
    this._root.x = x;
    this._root.y = y;

    // OG: Background (0xCC0E395A)
    this._g.rect(0, 0, w, h).fill({ color: 0x0E395A, alpha: 204 / 255 });
    this._g.rect(0, 0, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, h - 1, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, 0, 1, h).fill({ color: 0x1A4A6A });
    this._g.rect(w - 1, 0, 1, h).fill({ color: 0x1A4A6A });

    let ti = 0;

    // OG: Ring name (centered)
    this._txt(ti, 0, 10, ringName, NameColor, 11);
    const nameW = this._font.measure(ringName).x;
    this._texts[ti].x = (w - nameW) / 2;
    ti++;

    // OG: Inner outline below name
    this._g.rect(2, 10 + lh, w - 4, 1).fill({ color: InnerOutlineC, alpha: InnerOutlineA });

    let yCursor = 10 + lh + 6;

    // OG: Partner/friend/spouse name (StringPool 689/690/4236)
    if (partnerName) {
      let label = '';
      switch (ringType) {
        case 'couple': label = 'Partner: '; break;  // StringPool 689
        case 'friend': label = 'Friend: '; break;   // StringPool 690
        case 'spouse': label = 'Spouse: '; break;   // StringPool 4236
      }
      this._txt(ti, 10, yCursor, label + partnerName, DescColor, 9);
      ti++;
      yCursor += lh + 4;
    }

    // OG: Stat lines (from SetToolTip_Equip_Basic)
    for (const line of infoLines) {
      this._txt(ti, 10, yCursor, line, InfoColor, 9);
      ti++;
      yCursor += lh - 2;
    }
    if (infoLines.length > 0) {
      for (let d = 4; d < w - 4; d += 6) this._dot(d, yCursor);
      yCursor += 6;
    }

    // OG: Description
    for (const line of descLines) {
      this._txt(ti, 10, yCursor, line, DescColor, 9);
      ti++;
      yCursor += lh - 2;
    }

    // OG: Ring image (from WZ StringPool 0xAD3)
    if (ringImage) {
      this._blitAt(ringImage, (w - 68) / 2, yCursor);
      yCursor += ringH;
    }

    // OG: Expiry date
    if (expiryStr) {
      for (let d = 4; d < w - 4; d += 6) this._dot(d, yCursor);
      yCursor += 6;
      this._txt(ti, 10, yCursor, expiryStr, ToolTip.getFontColor(14), 9);
    }

    this._iconSprite.visible = false;
    this._root.visible = true;
  }

  // OG: SetToolTip_MacroSysSkill @ 0x89e1f0 — macro system skill tooltip
  DrawMacroSysSkillTooltip(
    macroName: string, skills: Array<{ name: string; desc: string }>,
    mouseX: number, mouseY: number, viewW: number, viewH: number,
  ): void {
    const w = 290; // OG: 290px
    const h = 142; // OG: fixed 142px height
    const lh = this._font.lineHeight;

    let x = mouseX + 16;
    let y = mouseY + 16;
    if (x + w > viewW) x = Math.max(0, mouseX - w - 4);
    if (y + h > viewH) y = Math.max(0, viewH - h);

    this._g.clear();
    this._clearTexts(0);
    this._root.x = x;
    this._root.y = y;

    // OG: Background
    this._g.rect(0, 0, w, h).fill({ color: BgColor, alpha: this._bgAlpha });
    this._g.rect(0, 0, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, h - 1, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, 0, 1, h).fill({ color: 0x1A4A6A });
    this._g.rect(w - 1, 0, 1, h).fill({ color: 0x1A4A6A });

    let ti = 0;

    // OG: Macro name (centered at y=10, font type 1)
    this._txt(ti, 0, 10, macroName, NameColor, 11);
    const nameW = this._font.measure(macroName).x;
    this._texts[ti].x = (w - nameW) / 2;
    ti++;

    // OG: Separator line (StringPool 0x1101)
    this._g.rect(2, 10 + lh + 2, w - 4, 1).fill({ color: DividerThinC, alpha: DividerThinA });

    // OG: 3 skill slots (each at y = 27 + i*38)
    let yCursor = 27;
    for (let i = 0; i < 3 && i < skills.length; i++) {
      const skill = skills[i];
      this._txt(ti, 15, yCursor, skill.name, ToolTip.getFontColor(10), 10);
      ti++;
      yCursor += lh;
      if (skill.desc) {
        this._txt(ti, 15, yCursor, skill.desc, DescColor, 9);
        ti++;
      }
      yCursor += 24;
    }

    this._iconSprite.visible = false;
    this._root.visible = true;
  }

  // OG: SetToolTip_SlotInc @ 0x89d5f0 — slot increase tooltip
  DrawSlotIncTooltip(
    itemName: string, description: string, category: string,
    slotIncrease: number, slotType: 'equip' | 'use' | 'setup' | 'etc',
    mouseX: number, mouseY: number, viewW: number, viewH: number,
  ): void {
    const lh = this._font.lineHeight;
    const w = 290; // OG: 290px

    const descLines = this._wrapText(description, w - 20);
    const descH = descLines.length * (lh - 2);
    const h = 10 + lh + 6 + descH + 6 + lh + 10;

    let x = mouseX + 16;
    let y = mouseY + 16;
    if (x + w > viewW) x = Math.max(0, mouseX - w - 4);
    if (y + h > viewH) y = Math.max(0, viewH - h);

    this._g.clear();
    this._clearTexts(0);
    this._root.x = x;
    this._root.y = y;

    // OG: Background
    this._g.rect(0, 0, w, h).fill({ color: BgColor, alpha: this._bgAlpha });
    this._g.rect(0, 0, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, h - 1, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, 0, 1, h).fill({ color: 0x1A4A6A });
    this._g.rect(w - 1, 0, 1, h).fill({ color: 0x1A4A6A });

    let ti = 0;

    // OG: Item name (centered)
    this._txt(ti, 0, 10, itemName, NameColor, 11);
    const nameW = this._font.measure(itemName).x;
    this._texts[ti].x = (w - nameW) / 2;
    ti++;

    // OG: Inner outline below name
    this._g.rect(2, 10 + lh, w - 4, 1).fill({ color: InnerOutlineC, alpha: InnerOutlineA });

    let yCursor = 10 + lh + 6;

    // OG: Category
    if (category) {
      this._txt(ti, 10, yCursor, category, DescColor, 9);
      ti++;
      yCursor += lh;
    }

    // OG: Description
    for (const line of descLines) {
      this._txt(ti, 10, yCursor, line, DescColor, 9);
      ti++;
      yCursor += lh - 2;
    }

    // OG: Slot increase info (StringPool 594/597/598)
    const slotLabel = slotType === 'equip' ? 'Equip' : slotType === 'use' ? 'Use' : slotType === 'setup' ? 'Setup' : 'Etc';
    this._txt(ti, 10, yCursor, `${slotLabel} slots: +${slotIncrease}`, ToolTip.getFontColor(5), 10); // HL_GREEN

    this._iconSprite.visible = false;
    this._root.visible = true;
  }

  // OG: SetToolTip_EquipExt @ 0x89dcf0 — equipment extension tooltip
  DrawEquipExtTooltip(
    itemName: string, isExpired: boolean, expiryStr: string,
    mouseX: number, mouseY: number, viewW: number, viewH: number,
  ): void {
    const lh = this._font.lineHeight;
    const w = 290; // OG: 290px
    const h = 10 + lh + 6 + lh + 10;

    let x = mouseX + 16;
    let y = mouseY + 16;
    if (x + w > viewW) x = Math.max(0, mouseX - w - 4);
    if (y + h > viewH) y = Math.max(0, viewH - h);

    this._g.clear();
    this._clearTexts(0);
    this._root.x = x;
    this._root.y = y;

    // OG: Background
    this._g.rect(0, 0, w, h).fill({ color: BgColor, alpha: this._bgAlpha });
    this._g.rect(0, 0, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, h - 1, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, 0, 1, h).fill({ color: 0x1A4A6A });
    this._g.rect(w - 1, 0, 1, h).fill({ color: 0x1A4A6A });

    let ti = 0;

    // OG: Item name (centered)
    this._txt(ti, 0, 10, itemName, NameColor, 11);
    const nameW = this._font.measure(itemName).x;
    this._texts[ti].x = (w - nameW) / 2;
    ti++;

    // OG: Inner outline below name
    this._g.rect(2, 10 + lh, w - 4, 1).fill({ color: InnerOutlineC, alpha: InnerOutlineA });

    // OG: Expiry info (StringPool 0x1475 "Expired" or 0x1476 "Expires: %d/%d/%d %d:%d")
    const color = isExpired ? (ToolTip.getFontColor(14)) : DescColor; // GEN_RED for expired
    this._txt(ti, 10, 10 + lh + 6, expiryStr, color, 9);

    this._iconSprite.visible = false;
    this._root.visible = true;
  }

  // OG: SetToolTip_String2 — multi-param string tooltip
  DrawString2Tooltip(
    lines: Array<{ text: string; color: number; size?: number }>,
    mouseX: number, mouseY: number, viewW: number, viewH: number,
  ): void {
    const lh = this._font.lineHeight;
    const w = 200;
    const h = lines.length * (lh + 2) + 12;

    let x = mouseX + 16;
    let y = mouseY + 16;
    if (x + w > viewW) x = Math.max(0, mouseX - w - 4);
    if (y + h > viewH) y = Math.max(0, viewH - h);

    this._g.clear();
    this._clearTexts(0);
    this._root.x = x;
    this._root.y = y;

    // OG: Background
    this._g.rect(0, 0, w, h).fill({ color: BgColor, alpha: this._bgAlpha });
    this._g.rect(0, 0, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, h - 1, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, 0, 1, h).fill({ color: 0x1A4A6A });
    this._g.rect(w - 1, 0, 1, h).fill({ color: 0x1A4A6A });

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      this._txt(i, 6, 6 + i * (lh + 2), line.text, line.color, line.size ?? 9);
    }

    this._iconSprite.visible = false;
    this._root.visible = true;
  }

  // OG: SetToolTip_String_MultiLine — multi-line string tooltip
  DrawStringMultiLineTooltip(
    text: string, fontType: number,
    mouseX: number, mouseY: number, viewW: number, viewH: number,
  ): void {
    const lh = this._font.lineHeight;
    const w = 290;
    const lines = this._wrapText(text, w - 16);
    const h = lines.length * (lh + 2) + 12;

    let x = mouseX + 16;
    let y = mouseY + 16;
    if (x + w > viewW) x = Math.max(0, mouseX - w - 4);
    if (y + h > viewH) y = Math.max(0, viewH - h);

    this._g.clear();
    this._clearTexts(0);
    this._root.x = x;
    this._root.y = y;

    // OG: Background
    this._g.rect(0, 0, w, h).fill({ color: BgColor, alpha: this._bgAlpha });
    this._g.rect(0, 0, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, h - 1, w, 1).fill({ color: 0x1A4A6A });
    this._g.rect(0, 0, 1, h).fill({ color: 0x1A4A6A });
    this._g.rect(w - 1, 0, 1, h).fill({ color: 0x1A4A6A });

    const color = ToolTip.getFontColor(fontType);
    for (let i = 0; i < lines.length; i++) {
      this._txt(i, 8, 6 + i * (lh + 2), lines[i], color, 9);
    }

    this._iconSprite.visible = false;
    this._root.visible = true;
  }
}
