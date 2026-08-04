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
    // DrawTextItemName draws the dot canvas at (10, y+5) and name text at (18, y)
    const yName = 10;
    const yDot1 = yName + lh + 3;
    const yBlock = yDot1 + 5;
    // OG: DrawItemReqJob blits the job strip at raw y+141; icon top = y+32,
    // so jobY = iconTop + 109.
    const jobY = yBlock + JobStripDY - 32;
    const yBlockBottom = jobY + 13;
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

    // OG: Item name — DrawItemTitle @0x88ccb0 (equip branch): the name is drawn
    // centered at (w - titleW - descW)/2 with the desc (StringPool 0xC35,
    // text unverified → empty) right after it, both at yName.
    // DrawTextItemName separately draws the dot at (10, yName+5) and the
    // trade-option desc at (18, yName).
    const nameColor = ItemTooltip._gradeColor(grade);
    const nameW = this._font.measure(name).x;
    const nameX = Math.max(4, (w - nameW) / 2);
    this._txt(0, nameX, yName, name, nameColor, 11);
    this._dot(10, yName + 5);

    let ti = 1;

    // OG: Cash item label (StringPool 5897) — shown after name when item is cash
    if (attr?.Cash) {
      this._txt(ti, nameX + nameW + 6, yName, 'Cash', ToolTip.getFontColor(5), 9);
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

    // OG: Item icon (68x68) — DrawItemIcon: 68x68 rect fill 0xA0FFFFFF at (10, y), then icon at (12, y+66)
    const icon = this._icons.LoadIcon(itemId);
    // OG: DrawItemIcon backdrop — 68x68 rect fill 0xA0FFFFFF (semi-transparent white)
    this._g.rect(IconX, yBlock, IconSize, IconSize).fill({ color: 0xFFFFFF, alpha: 0xa0 / 255 });
    if (icon?.Texture) {
      this._iconSprite.texture = icon.Texture;
      this._iconSprite.x = IconX + 2;
      this._iconSprite.y = yBlock + 66;
      this._iconSprite.width = IconSize - 4;
      this._iconSprite.height = IconSize - 4;
      this._iconSprite.visible = true;
    } else {
      this._iconSprite.visible = false;
    }

    // OG: Requirement rows (Level/STR/DEX/INT/LUK/POP) — DrawTextEquip_Req:
    // all 6 rows always draw. Label at (94, iconTop+12*nNo); then either the
    // requirement digits (left edge 94+12*4+2 = 144, spacing 1) or, for the
    // POP row only when POP req == 0, the "none" glyph (StringPool 0x1AC4)
    // drawn from m_pNumberCan bottom-right anchored at (144-cx, rowY-cy).
    // Non-POP rows with a 0 requirement still draw a Can-style '0' digit.
    const reqs: [string, number, boolean, boolean][] = [
      ['Level:', attr?.ReqLevel ?? 0, this._pLevel >= (attr?.ReqLevel ?? 0), false],
      ['STR:', attr?.ReqStr ?? 0, this._pStr >= (attr?.ReqStr ?? 0), false],
      ['DEX:', attr?.ReqDex ?? 0, this._pDex >= (attr?.ReqDex ?? 0), false],
      ['INT:', attr?.ReqInt ?? 0, this._pInt >= (attr?.ReqInt ?? 0), false],
      ['LUK:', attr?.ReqLuk ?? 0, this._pLuk >= (attr?.ReqLuk ?? 0), false],
      ['POP:', attr?.ReqFame ?? 0, false, true],
    ];
    let reqIndex = 0;
    for (const [label, val, met, isPop] of reqs) {
      const rowY = yBlock + reqIndex * ReqRowStep;
      reqIndex++;

      // OG: Can/Cannot label sprite (met = requirement satisfied)
      const labelSprite = this._assets.Req(label.replace(':', '').toLowerCase(), met);
      if (labelSprite) {
        this._blitAt(labelSprite, ReqLabelX, rowY);
      } else {
        this._txt(ti, ReqLabelX, rowY, label, met ? 0x909090 : 0xFF6060, 9);
      }

      if (val <= 0) {
        // OG: bNone — only the POP row renders the "none" glyph (m_pNumberCan);
        // the other rows still draw a Can-style '0' digit.
        if (isPop) {
          const none = this._assets.Get('Can/none');
          if (none) {
            this._blitAt(none, ReqValueRight - none.Width + none.OriginX,
              rowY - none.Height + none.OriginY);
          }
        } else {
          this._assets.DrawNumber(0, true, ReqValueRight, rowY, this._root, 1);
        }
      } else {
        // OG: draw_number_by_image at x = 94+50 = 144, spacing 1
        const digitW = this._assets.DrawNumber(val, met, ReqValueRight, rowY, this._root, 1);
        if (digitW === 0) {
          const valStr = `${val}`;
          this._txt(ti + 6, ReqValueRight, rowY, valStr, met ? StatColor : 0xFF6060, 9);
        }
      }
      ti++;
    }

    // OG: Inner outline before job strip
    this._g.rect(2, jobY - 8, w - 4, 1).fill({ color: InnerOutlineC, alpha: InnerOutlineA });

    // OG: Job requirement strip — DrawItemReqJob blits at y+141 → iconTop+109
    if (attr?.ReqJob) {
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

    // OG: Growth rows — labels (itemLEV/itemEXP) drawn for every equip, plus
    // max/level-percent (growth items) or "none" glyphs. Row base = iconTop+72.
    if (attr) {
      this._drawGrowthItem(yBlock + 72, attr, this._isGrowthItem(itemId));
    }

    // OG: Durability bar — Can|Cannot/durability at (94, iconTop+96), number
    // (percent 100*cur/max) left-aligned at x=161, '%' suffix at 2*(3*digits+81).
    // OG guard: max durability > 0 (v7->nDurability), not the current value.
    if (attr && (attr.DurabilityMax ?? 0) > 0) {
      this._drawDurabilityBar(yBlock + 96, attr);
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

  // OG: DrawToolTip_Equip growth rows (rows base y = iconTop+72).
  // itemLEV label at (94, y), itemEXP at (94, y+12) — always drawn with the
  // GrowthEnabled (growth item) or GrowthDisabled variant. Right side:
  //   growth + level<max → level digits (148,y), EXP% digits (148,y+12), '%' (161,y+12)
  //   growth + level==max → "max" glyph at (148,y) and (148,y+12)
  //   not growth          → GrowthDisabled "none" glyph, bottom-right anchored at (148,y)
  private _drawGrowthItem(y: number, attr: ItemAttr, isGrowth: boolean): void {
    // OG: percent = clamp(int(100*curEXP/nextEXP), 0, 99); the port reads it
    // off attr as expPct when present (0 otherwise).
    const pct = Math.max(0, Math.min(99, Math.floor((attr as any).expPct ?? 0)));
    const level = attr.Level ?? 0;
    const atMax = attr.MaxLevel !== undefined && attr.MaxLevel > 0 && level >= attr.MaxLevel;

    const levLabel = this._assets.GrowthLabel(0, isGrowth);
    if (levLabel) this._blitAt(levLabel, 94, y);
    const expLabel = this._assets.GrowthLabel(1, isGrowth);
    if (expLabel) this._blitAt(expLabel, 94, y + 12);

    if (!isGrowth) {
      // OG: GrowthDisabled "none" canvas anchored bottom-right at (148, y+12n).
      const none = this._assets.GrowthNone(false);
      if (none) {
        this._blitAt(none, 148 - none.Width, y - none.Height);
        this._blitAt(none, 148 - none.Width, y + 12 - none.Height);
      }
      return;
    }

    if (atMax) {
      const maxGlyph = this._assets.GrowthMax(true);
      if (maxGlyph) {
        this._blitAt(maxGlyph, 148, y);
        this._blitAt(maxGlyph, 148, y + 12);
      }
      return;
    }

    // Level + EXP% digits via m_pNumberGrowthEnable (GrowthEnabled digit set).
    this._assets.DrawNumberWith(level, (d) => this._assets.GrowthDigit(d, true), 148, y, this._root, 1);
    this._assets.DrawNumberWith(pct, (d) => this._assets.GrowthDigit(d, true), 148, y + 12, this._root, 1);
    const pctGlyph = this._assets.GrowthPercent(true);
    if (pctGlyph) this._blitAt(pctGlyph, 161, y + 12);
  }

  // OG: DrawToolTip_Equip durability row (row base y = iconTop+96).
  // bar Can|Cannot/durability at (94, y); percent number (m_pNumberCan/
  // m_pNumberCannot) left-aligned at x=161; '%' suffix canvas at 2*(3*digits+81).
  private _drawDurabilityBar(y: number, attr: ItemAttr): void {
    // OG: v67 = 100 * current / max (integer). DrawToolTip_Equip draws the
    // PERCENT number, not raw durability; low = pct <= 10.
    const max = attr.DurabilityMax ?? 100;
    const cur = attr.Durability ?? max;
    const pct = Math.max(0, Math.min(100, Math.floor((100 * cur) / max)));
    const isLow = pct <= 10;

    const barSprite = this._assets.DurabilityBar(!isLow);
    if (barSprite) {
      this._blitAt(barSprite, 94, y);
    }

    this._assets.DrawNumber(pct, !isLow, 161, y, this._root, 1);

    const suffix = this._assets.Percent(!isLow);
    if (suffix) {
      this._blitAt(suffix, 2 * (3 * String(pct).length + 81), y);
    }
  }

  // OG: Build stat bonus info lines — uses actual equip stats when available
  private _buildInfoLines(_itemId: number, attr: ItemAttr | null, equippedSetCount = 0,
    equipStats?: { incStr: number; incDex: number; incInt: number; incLuk: number; incPad: number; incMad: number; incPdd: number; incMdd: number; incMhp: number; incMmp: number; incAcc: number; incEva: number; incSpeed: number; incJump: number; ruc: number; cuc: number; option1: number; option2: number; option3: number; incMhpPr?: number; incMmpPr?: number }): InfoLine[] {
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

    // OG: Durability label (AddInfo, StringPool 0x1A0D) when WZ base durability > 0
    if ((attr.DurabilityMax ?? 0) > 0) push('Durability:');

    // OG: Stat rows follow SetToolTip_Equip_Basic order and PrintValue formatting.
    // Instance stats win over WZ base; percent rows read from WZ base (pe2) in OG.
    // type 0 = "+N" (skip non-positive), type 1 = plain "N", type 2 = "N%".
    const s = equipStats;
    const base = (v: number | undefined): number => v ?? 0;
    const addStat = (label: string, v: number, type: 0 | 1 | 2): void => {
      if (v <= 0) return;
      const value = type === 0 ? `+${v}` : type === 2 ? `${v}%` : `${v}`;
      push(`${label} ${value}`);
    };

    // OG: STR -> LUK (type 0), MaxHP/MaxMP (type 0), MaxHPr/MaxMPr (type 2)
    addStat('STR:', base(s?.incStr ?? attr.IncStr), 0);
    addStat('DEX:', base(s?.incDex ?? attr.IncDex), 0);
    addStat('INT:', base(s?.incInt ?? attr.IncInt), 0);
    addStat('LUK:', base(s?.incLuk ?? attr.IncLuk), 0);
    addStat('MHP:', base(s?.incMhp ?? attr.IncMhp), 0);
    addStat('MMP:', base(s?.incMmp ?? attr.IncMmp), 0);
    addStat('MHP:', base(s?.incMhpPr ?? attr.IncMHPr), 2);
    addStat('MMP:', base(s?.incMmpPr ?? attr.IncMMPr), 2);
    // OG: PAD -> MDD (type 1, plain -- no '+')
    addStat('PAD:', base(s?.incPad ?? attr.IncPad), 1);
    addStat('MAD:', base(s?.incMad ?? attr.IncMad), 1);
    addStat('PDD:', base(s?.incPdd ?? attr.IncPdd), 1);
    addStat('MDD:', base(s?.incMdd ?? attr.IncMdd), 1);
    // OG: ACC/EVA/Craft/Speed/Jump (type 0)
    addStat('ACC:', base(s?.incAcc ?? attr.IncAcc), 0);
    addStat('EVA:', base(s?.incEva ?? attr.IncEva), 0);
    addStat('Speed:', base(s?.incSpeed ?? attr.IncSpeed), 0);
    addStat('Jump:', base(s?.incJump ?? attr.IncJump), 0);

    // OG: SetToolTip_SetItem appends its rows after SetToolTip_Equip_Basic
    if (attr.SetItemId > 0) push(`Set Item: ${equippedSetCount} piece${equippedSetCount === 1 ? '' : 's'} equipped`);

    // OG: RUC (StringPool 0x2AD) is the last Equip_Basic row; scroll hammers are a client extra
    const ruc = base(s?.ruc ?? attr.Upgrades);
    if (ruc > 0) push(`Upgrades: ${ruc}`);
    if (s?.cuc) push(`Hammers: ${s.cuc}`);

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
