import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { TooltipAssets } from './TooltipAssets.js';

// OG class: CUIToolTip (2632 bytes, standalone — no base class)
// All coordinates, font types, and layout from IDA decompilation.

// OG: CLineInfo structure (36 bytes per entry, 32+32 entries)
interface LineInfo {
  width: number;
  height: number;
  type: number;
  context: string;
  align: number;       // 0=left, 1=right, 2=center, 1000=title/center
  multi: number;       // hasDotImage flag (0=no dot, non-zero=has dot)
  subType: number;     // font type for option value
  subContext: string;  // option value text
  useDotImage: boolean;
}

// OG: Font type mapping (GetFontByType @ 0x881d40)
// Colors verified from constructor @ 0x8839c0 decompilation
const FONT_TYPES = {
  HL_WHITE: 1,
  HL_GOLD: 2,
  HL_ORANGE: 3,
  HL_GRAY: 4,
  HL_GREEN: 5,
  HL_BLUE: 6,
  HL_VIOLET: 7,
  HL_GREEN2: 8,
  HL_EXCELLENT: 9,
  HL_SPECIAL: 10,
  GEN_WHITE: 11,
  GEN_GRAY: 12,
  GEN_GRAY2: 13,
  GEN_RED: 14,
  GEN_ORANGE: 15,
  GEN_GOLD: 16,
  GEN_PURPLE: 17,
  GEN_GREEN: 18,
  GEN_YELLOW: 19,
  GEN_BLUE: 20,
  GEN_UNKNOWN: 21,
  H_WHITE: 22,
  STAN_PRP: 23,
  STAN_DSC: 24,
  STAN_NUM: 25,
  SKILL_PRP: 26,
  SKILL_DSC: 27,
} as const;

// OG: Font colors from constructor — all verified from IDA decompilation
const FONT_COLORS: Record<number, number> = {
  [FONT_TYPES.HL_WHITE]: 0xFFFFFF,
  [FONT_TYPES.HL_GOLD]: 0xFFCC00,
  [FONT_TYPES.HL_ORANGE]: 0xFF8C00,
  [FONT_TYPES.HL_GRAY]: 0xBCBCBC,
  [FONT_TYPES.HL_GREEN]: 0x00FF00,
  [FONT_TYPES.HL_BLUE]: 0x0096FF,
  [FONT_TYPES.HL_VIOLET]: 0xFF00FF,
  [FONT_TYPES.HL_GREEN2]: 0x00FF80,
  [FONT_TYPES.HL_EXCELLENT]: 0x00FFFF,
  [FONT_TYPES.HL_SPECIAL]: 0xFFEEFF,
  [FONT_TYPES.GEN_WHITE]: 0xFFFFFF,
  [FONT_TYPES.GEN_GRAY]: 0xBCBCBC,
  [FONT_TYPES.GEN_GRAY2]: 0x777777,
  [FONT_TYPES.GEN_RED]: 0xFF7155,
  [FONT_TYPES.GEN_ORANGE]: 0xFF8C00,
  [FONT_TYPES.GEN_GOLD]: 0xFFCC00,
  [FONT_TYPES.GEN_PURPLE]: 0x9966FF,
  [FONT_TYPES.GEN_GREEN]: 0x00FF00,
  [FONT_TYPES.GEN_YELLOW]: 0xFFFF00,
  [FONT_TYPES.GEN_BLUE]: 0x00AAFF,
  [FONT_TYPES.GEN_UNKNOWN]: 0x00FF80,
  [FONT_TYPES.H_WHITE]: 0xFFFFFF,
  [FONT_TYPES.STAN_PRP]: 0xFFFFFF,
  [FONT_TYPES.STAN_DSC]: 0xC0C0C0,
  [FONT_TYPES.STAN_NUM]: 0xFFFFFF,
  [FONT_TYPES.SKILL_PRP]: 0xFFFFFF,
  [FONT_TYPES.SKILL_DSC]: 0xC0C0C0,
};

// OG: Font sizes from constructor
const FONT_SIZES: Record<number, number> = {
  [FONT_TYPES.HL_WHITE]: 11,
  [FONT_TYPES.HL_GOLD]: 11,
  [FONT_TYPES.HL_ORANGE]: 11,
  [FONT_TYPES.HL_GRAY]: 11,
  [FONT_TYPES.HL_GREEN]: 11,
  [FONT_TYPES.HL_BLUE]: 11,
  [FONT_TYPES.HL_VIOLET]: 11,
  [FONT_TYPES.HL_GREEN2]: 11,
  [FONT_TYPES.HL_EXCELLENT]: 11,
  [FONT_TYPES.HL_SPECIAL]: 11,
  [FONT_TYPES.GEN_WHITE]: 11,
  [FONT_TYPES.GEN_GRAY]: 11,
  [FONT_TYPES.GEN_GRAY2]: 11,
  [FONT_TYPES.GEN_RED]: 11,
  [FONT_TYPES.GEN_ORANGE]: 11,
  [FONT_TYPES.GEN_GOLD]: 11,
  [FONT_TYPES.GEN_PURPLE]: 11,
  [FONT_TYPES.GEN_GREEN]: 11,
  [FONT_TYPES.GEN_YELLOW]: 11,
  [FONT_TYPES.GEN_BLUE]: 11,
  [FONT_TYPES.GEN_UNKNOWN]: 11,
  [FONT_TYPES.H_WHITE]: 12,
  [FONT_TYPES.STAN_PRP]: 8,
  [FONT_TYPES.STAN_DSC]: 8,
  [FONT_TYPES.STAN_NUM]: 8,
  [FONT_TYPES.SKILL_PRP]: 11,
  [FONT_TYPES.SKILL_DSC]: 11,
};

// OG: Tooltip type constants
export const TOOLTIP_TYPE = {
  NONE: 0,
  NORMAL: 1,
  EQUIP: 4,
  BUNDLE: 5,
  PET: 6,
  SKILL: 7,
  RING: 8,
  MACRO: 11,
} as const;

// OG: Item icon size
const ITEM_ICON_SIZE = 68;
const ITEM_ICON_BG_COLOR = 0xA0000000;

// OG: Outline corner pixel color
const OUTLINE_COLOR = 0xFFFFFF;

// OG: Default padding
const PADDING = 4;

// OG: Background color for tooltip canvas
const BG_COLOR = 0x0C0C16;
const BG_ALPHA = 0.95;

// OG: Border color from MakeLayer
const MAKE_LAYER_BG = 0xCC0E395A;

export class ToolTip {
  private _container: Container;
  private _bg: Graphics;
  private _texts: Text[] = [];
  private _assets: TooltipAssets | null = null;

  // OG: m_nToolTipType (0=None, 1=Normal, 4=Equip, 5=Bundle, 6=Pet, 7=Skill, 8=Ring, 11=Macro)
  private _toolTipType = 0;
  // OG: m_nHeight, m_nWidth
  private _height = 0;
  private _width = 0;
  // OG: m_nLineNo, m_nOptionLineNo
  private _lineNo = 0;
  private _optionLineNo = 0;
  // OG: m_nLineSeparated
  private _lineSeparated = 0;
  // OG: m_nLastX, m_nLastY
  private _lastX = 0;
  private _lastY = 0;

  // OG: Line arrays (32+32 entries)
  private _lines: LineInfo[] = [];
  private _optionLines: LineInfo[] = [];

  // OG: 28 fonts (TextStyle equivalents)
  private _fonts: Map<number, TextStyle> = new Map();

  constructor(assets?: TooltipAssets) {
    this._container = new Container();
    this._bg = new Graphics();
    this._container.addChild(this._bg);
    this._container.visible = false;
    this._assets = assets ?? null;

    // OG: Initialize all 64 line info entries
    for (let i = 0; i < 32; i++) {
      this._lines.push(this._emptyLine());
      this._optionLines.push(this._emptyLine());
    }

    // OG: Initialize fonts (28 types from constructor @ 0x8839c0)
    this._initFonts();
  }

  get container(): Container { return this._container; }
  get width(): number { return this._width; }
  get height(): number { return this._height; }
  get toolTipType(): number { return this._toolTipType; }
  get lineSeparated(): number { return this._lineSeparated; }

  // OG: ClearToolTip @ 0x880f20
  clearToolTip(): void {
    this._toolTipType = 0;
    this._height = 0;
    this._width = 0;
    this._lineNo = 0;
    this._optionLineNo = 0;
    this._lineSeparated = 0;
    this._container.visible = false;

    for (const t of this._texts) {
      if (t.parent) t.parent.removeChild(t);
    }
    this._texts = [];
    this._bg.clear();
  }

  // OG: SetBasicInfo @ 0x880f90
  setBasicInfo(toolTipType: number, width: number, height: number, lineSeparate: number): void {
    this.clearToolTip();
    this._toolTipType = toolTipType;
    this._width = width;
    this._height = height;
    this._lineSeparated = lineSeparate;
  }

  // OG: MakeLayer @ 0x8814b0 — creates positioned tooltip layer
  makeLayer(left: number, top: number, doubleOutline: boolean, color: number = 0): void {
    this._lastX = left;
    this._lastY = top;

    this._initCanvas(doubleOutline, color);

    this._container.x = left;
    this._container.y = top;
    this._container.visible = true;
  }

  // OG: InitCanvas @ 0x880960
  private _initCanvas(doubleOutline: boolean, color: number): void {
    this._bg.clear();

    // Fill background
    this._bg.rect(0, 0, this._width, this._height).fill({ color: color || BG_COLOR, alpha: BG_ALPHA });

    // OG: 4 corner pixels (white border corners)
    this._bg.rect(0, 0, 1, 1).fill({ color: OUTLINE_COLOR });
    this._bg.rect(this._width - 1, 0, 1, 1).fill({ color: OUTLINE_COLOR });
    this._bg.rect(0, this._height - 1, 1, 1).fill({ color: OUTLINE_COLOR });
    this._bg.rect(this._width - 1, this._height - 1, 1, 1).fill({ color: OUTLINE_COLOR });

    if (doubleOutline) {
      this._bg.rect(1, 1, this._width - 2, 1).fill({ color: OUTLINE_COLOR });
      this._bg.rect(1, this._height - 2, this._width - 2, 1).fill({ color: OUTLINE_COLOR });
      this._bg.rect(1, 1, 1, this._height - 2).fill({ color: OUTLINE_COLOR });
      this._bg.rect(this._width - 2, 1, 1, this._height - 2).fill({ color: OUTLINE_COLOR });
      this._bg.rect(1, 1, 1, 1).fill({ color: OUTLINE_COLOR });
      this._bg.rect(this._width - 2, 1, 1, 1).fill({ color: OUTLINE_COLOR });
      this._bg.rect(1, this._height - 2, 1, 1).fill({ color: OUTLINE_COLOR });
      this._bg.rect(this._width - 2, this._height - 2, 1, 1).fill({ color: OUTLINE_COLOR });
    }

    // Border
    this._bg.rect(0, 0, this._width, this._height).stroke({ color: OUTLINE_COLOR, width: 1 });
  }

  // OG: GetFontByType @ 0x881d40 — maps type ID to font
  getFontByType(type: number): TextStyle {
    return this._fonts.get(type) ?? this._fonts.get(FONT_TYPES.GEN_WHITE)!;
  }

  getFontColor(type: number): number {
    return FONT_COLORS[type] ?? FONT_COLORS[FONT_TYPES.GEN_WHITE];
  }

  getFontSize(type: number): number {
    return FONT_SIZES[type] ?? 11;
  }

  // OG: SetToolTip_String @ 0x887140 — simple string tooltip
  setToolTipString(x: number, y: number, text: string): void {
    const font = this.getFontByType(FONT_TYPES.GEN_WHITE);
    const textWidth = this._measureText(text, font);
    const textHeight = 14;
    const width = textWidth + PADDING * 2;
    const height = textHeight + PADDING * 2;

    this.setBasicInfo(1, width, height, 0);
    this.makeLayer(x, y, false, 0);
    this.drawTextLeft(PADDING, text, font);
  }

  // OG: DrawTextLeft @ 0x88c5e0
  drawTextLeft(y: number, text: string, font: TextStyle): void {
    const t = new Text({ text, style: font });
    t.x = PADDING;
    t.y = y;
    this._container.addChild(t);
    this._texts.push(t);
  }

  // OG: DrawTextRight @ 0x88c7c0
  drawTextRight(y: number, text: string, font: TextStyle): void {
    const t = new Text({ text, style: font });
    const textWidth = this._measureText(text, font);
    t.x = this._width - textWidth - PADDING;
    t.y = y;
    this._container.addChild(t);
    this._texts.push(t);
  }

  // OG: DrawTextCenter @ 0x88c360
  drawTextCenter(y: number, text: string, font: TextStyle): void {
    const t = new Text({ text, style: font });
    const textWidth = this._measureText(text, font);
    t.x = (this._width - textWidth) / 2;
    t.y = y;
    this._container.addChild(t);
    this._texts.push(t);
  }

  // OG: DrawTextItemName @ 0x88ca40 — draw item name with dot prefix
  drawTextItemName(y: number, text: string, font: TextStyle): void {
    const dot = new Graphics();
    dot.circle(PADDING + 3, y + 5, 2).fill({ color: 0xFFFFFF });
    this._container.addChild(dot);

    const t = new Text({ text, style: font });
    t.x = PADDING + 8;
    t.y = y;
    this._container.addChild(t);
    this._texts.push(t);
  }

  // OG: DrawItemIcon @ 0x882050 — draw 68x68 item icon with bg
  drawItemIcon(x: number, y: number): void {
    const bg = new Graphics();
    bg.rect(x, y, ITEM_ICON_SIZE, ITEM_ICON_SIZE).fill({ color: ITEM_ICON_BG_COLOR });
    this._container.addChild(bg);
  }

  // OG: DrawCanvasIcon @ 0x882200 — blit WZ canvas at position with alpha
  drawCanvasIcon(x: number, y: number, wzSprite: WzSprite | null): void {
    if (!wzSprite) return;
    const sprite = wzSprite.NewSprite();
    sprite.x = x;
    sprite.y = y;
    this._container.addChild(sprite);
  }

  // OG: AddInfo @ 0x89e620 — add info line
  addInfo(text: string, type: number = FONT_TYPES.GEN_WHITE, align: number = 0, fontType?: number): void {
    if (this._lineNo >= 32) return;
    const useType = fontType ?? type;
    this._lines[this._lineNo] = {
      width: this._measureText(text, this.getFontByType(useType)),
      height: 14,
      type: useType,
      context: text,
      align,
      multi: 0,
      subType: 0,
      subContext: '',
      useDotImage: false,
    };
    this._lineNo++;
  }

  // OG: AddInfoEx @ 0x88bac0 — add info with extra context
  addInfoEx(mainType: number, subType: number, mainText: string, subText: string, align: number = 0, fontOverride?: number): void {
    if (this._lineNo >= 32) return;
    const useType = fontOverride ?? mainType;
    this._lines[this._lineNo] = {
      width: this._measureText(mainText, this.getFontByType(useType)),
      height: 14,
      type: useType,
      context: mainText,
      align,
      multi: 0,
      subType,
      subContext: subText,
      useDotImage: false,
    };
    this._lineNo++;
  }

  // OG: AddOptionInfo @ 0x88bda0 — add option line with sub-type
  addOptionInfo(type: number, text: string, subType: number): void {
    if (this._optionLineNo >= 32) return;
    this._optionLines[this._optionLineNo] = {
      width: this._measureText(text, this.getFontByType(type)),
      height: 14,
      type,
      context: text,
      align: 0,
      multi: 0,
      subType,
      subContext: '',
      useDotImage: false,
    };
    this._optionLineNo++;
  }

  // OG: DrawInfo @ 0x89e8b0 — draw all info lines
  drawInfo(startY: number = PADDING): void {
    let y = startY;

    // Separator line at top if m_nLineSeparated >= 0
    if (this._lineSeparated >= 0) {
      this._bg.rect(6, y + this._lineSeparated, this._width - 12, 1).fill({ color: 0xFFFFFF });
    }

    // Draw main lines
    for (let i = 0; i < this._lineNo; i++) {
      const line = this._lines[i];
      if (!line.context) continue;

      const font = this.getFontByType(line.type);

      // Dot image
      if (line.useDotImage && this._assets) {
        const dotSprite = this._assets.Dot(1);
        if (dotSprite) {
          this._assets.BlitAt(dotSprite, 10, y + 2, this._container);
        }
      }

      const t = new Text({ text: line.context, style: font });

      // Alignment
      if (line.align === 1000 || line.align === 2) {
        // Center-aligned (title)
        t.x = (this._width - line.width) / 2;
      } else if (line.align === 1) {
        // Right-aligned
        t.x = this._width - line.width - PADDING;
      } else {
        // Left-aligned (default)
        t.x = line.useDotImage ? 16 : 10;
      }
      t.y = y;
      this._container.addChild(t);
      this._texts.push(t);

      // Draw sub-context (option value) if present
      if (line.subContext) {
        const subFont = this.getFontByType(line.subType);
        const st = new Text({ text: line.subContext, style: subFont });
        // OG align=1001 is the stat-row layout: the value follows the label
        // at labelWidth + (dot ? 6 : 0) + 10. Other rows right-align it.
        st.x = line.align === 1001
          ? (line.useDotImage ? 16 : 10) + line.width + 10
          : this._width - this._measureText(line.subContext, subFont) - 20;
        st.y = y;
        this._container.addChild(st);
        this._texts.push(st);
      }

      y += line.height + 4;
    }

    // Draw option lines
    for (let i = 0; i < this._optionLineNo; i++) {
      const line = this._optionLines[i];
      if (!line.context) continue;

      const font = this.getFontByType(line.type);
      const t = new Text({ text: line.context, style: font });
      t.x = 10;
      t.y = y;
      this._container.addChild(t);
      this._texts.push(t);
      y += line.height + 4;
    }

    // Update tooltip height to fit content
    if (y > this._height) {
      this._height = y;
      this._initCanvas(false, 0);
    }
  }

  // OG: DrawTextSepartedLine @ 0x894a40 — word-wrap multi-line text, returns rendered height
  drawTextSepartedLine(x1: number, x2: number, y: number, text: string, fontType: number, maxH: number = 9999): number {
    if (!text || this._lineSeparated < 0) return 0;

    const font = this.getFontByType(fontType);
    const maxW = x2 - x1;
    const words = text.split(/\s+/);
    let curLine = '';
    let lineY = y;
    let lineCount = 0;

    for (const word of words) {
      const trial = curLine.length === 0 ? word : curLine + ' ' + word;
      const tw = this._measureText(trial, font);

      if (tw > maxW && curLine.length > 0) {
        // Draw current line
        const t = new Text({ text: curLine, style: font });
        t.x = x1;
        t.y = lineY;
        this._container.addChild(t);
        this._texts.push(t);
        lineY += 14;
        lineCount++;
        curLine = word;

        if (lineCount * 14 > maxH) break;
      } else {
        curLine = trial;
      }
    }

    // Draw remaining text
    if (curLine && lineCount * 14 <= maxH) {
      const t = new Text({ text: curLine, style: font });
      t.x = x1;
      t.y = lineY;
      this._container.addChild(t);
      this._texts.push(t);
      lineY += 14;
      lineCount++;
    }

    return lineCount * 14;
  }

  // OG: DrawItemTitle @ 0x88ccb0 — two-part centered title (name + desc)
  // Equip branch: name (GetFontByType(3)) drawn first at (w - titleW - descW)/2,
  // desc (StringPool 0xC35, GetFontByType(1)) right after it.
  // Non-equip branch: desc (StringPool 0xC36, GetFontByType(10)) first, name
  // (GetFontByType(14)) after it. Both branches center the pair as a whole.
  drawItemTitle(y: number, sText: string, bEquip = true, desc = '',
    titleColor?: number, descColor?: number): number {
    if (!sText) return 0;

    const titleFont = this.getFontByType(bEquip ? FONT_TYPES.HL_WHITE : FONT_TYPES.GEN_RED);
    const descFont = this.getFontByType(bEquip ? FONT_TYPES.GEN_WHITE : FONT_TYPES.H_WHITE);
    const titleW = this._measureText(sText, titleFont);
    const descW = desc ? this._measureText(desc, descFont) : 0;
    const offset = (this._width - titleW - descW) / 2;

    // Equip: name first, desc after. Non-equip: desc first, name after.
    const firstText = bEquip ? sText : desc;
    const firstFont = bEquip ? titleFont : descFont;
    const firstColor = bEquip
      ? titleColor ?? FONT_COLORS[FONT_TYPES.HL_WHITE]
      : descColor ?? FONT_COLORS[FONT_TYPES.GEN_GRAY2];
    const secondText = bEquip ? desc : sText;
    const secondFont = bEquip ? descFont : titleFont;
    const secondColor = bEquip
      ? descColor ?? FONT_COLORS[FONT_TYPES.GEN_GRAY2]
      : titleColor ?? FONT_COLORS[FONT_TYPES.GEN_RED];

    if (firstText) {
      const t1 = new Text({ text: firstText, style: { ...firstFont, fill: firstColor } });
      t1.x = offset;
      t1.y = y;
      this._container.addChild(t1);
      this._texts.push(t1);
    }
    if (secondText) {
      const t2 = new Text({ text: secondText, style: { ...secondFont, fill: secondColor } });
      t2.x = offset + (bEquip ? titleW : descW);
      t2.y = y;
      this._container.addChild(t2);
      this._texts.push(t2);
    }

    return 14;
  }

  // OG: DrawTextEquip_Req @ 0x88d710 — equip requirement row with Can/Cannot label
  drawTextEquipReq(x: number, y: number, label: string, value: number, met: boolean, fontType: number = FONT_TYPES.STAN_PRP): number {
    if (value <= 0) return 0;

    const assets = this._assets;
    if (assets) {
      // Draw Can/Cannot label sprite
      const labelSprite = assets.Req(label, met);
      if (labelSprite) {
        assets.BlitAt(labelSprite, x, y, this._container);
      }
    }

    // Draw value digits
    if (assets) {
      assets.DrawNumber(value, met, x + 60, y, this._container, 1);
    } else {
      // Fallback: text rendering
      const font = this.getFontByType(fontType);
      const t = new Text({ text: `${value}`, style: font });
      t.x = x + 60;
      t.y = y;
      this._container.addChild(t);
      this._texts.push(t);
    }

    return 12; // row height
  }

  // OG: DrawTextEquip_Req_Level @ 0x88dab0 — level requirement row
  drawTextEquipReqLevel(x: number, y: number, level: number, met: boolean): number {
    if (level <= 0) return 0;

    const assets = this._assets;
    if (assets) {
      const labelSprite = assets.Req('level', met);
      if (labelSprite) {
        assets.BlitAt(labelSprite, x, y, this._container);
      }
      assets.DrawNumber(level, met, x + 60, y, this._container, 1);
    } else {
      const font = this.getFontByType(FONT_TYPES.STAN_PRP);
      const t = new Text({ text: `Lv.${level}`, style: font });
      t.x = x + 60;
      t.y = y;
      this._container.addChild(t);
      this._texts.push(t);
    }

    return 12;
  }

  // OG: PrintValue @ 0x891230 — stat value with type-based formatting
  // type 0: +value (StringPool 6028/6029)
  // type 1: value (plain signed)
  // type 2: value% (percentage)
  printValue(x: number, y: number, value: number, label: string, type: number = 0, fontType: number = FONT_TYPES.STAN_PRP): number {
    if (value === 0 && type !== 1) return 0;

    let formatted: string;
    switch (type) {
      case 0: formatted = value > 0 ? `+${value}` : `${value}`; break;
      case 1: formatted = `${value}`; break;
      case 2: formatted = `${value}%`; break;
      default: formatted = `${value}`; break;
    }

    const font = this.getFontByType(fontType);

    // Draw label
    const labelT = new Text({ text: label, style: font });
    labelT.x = x;
    labelT.y = y;
    this._container.addChild(labelT);
    this._texts.push(labelT);

    // Draw value right-aligned
    const valueT = new Text({ text: formatted, style: font });
    const valueW = this._measureText(formatted, font);
    valueT.x = this._width - valueW - 20;
    valueT.y = y;
    this._container.addChild(valueT);
    this._texts.push(valueT);

    return 12;
  }

  // OG: DrawItemReqJob @ 0x880fc0 — job requirement strip (6 job icons)
  drawItemReqJob(x: number, y: number, jobId: number): number {
    const jobNames = ['beginner', 'warrior', 'magician', 'bowman', 'thief', 'pirate'];
    const jobX = [10, 52, 92, 132, 171, 197];

    const assets = this._assets;
    if (!assets) return 0;

    let drawn = false;
    for (let i = 0; i < 6; i++) {
      const bit = 1 << i;
      const greyed = (jobId & bit) === 0;
      const sprite = assets.JobLabel(jobNames[i], greyed);
      if (sprite) {
        assets.BlitAt(sprite, x + jobX[i], y, this._container);
        drawn = true;
      }
    }

    return drawn ? 16 : 0;
  }

  // OG: DrawReqSkill @ 0x88b320 — required skills display
  // Draws skill icon (34x34 bg + icon), skill name (font type 25), required level (StringPool 0x801)
  // Each skill row is 34px tall, starting at y offset from bottom
  drawReqSkill(x: number, y: number, skills: Array<{ name: string; level: number; icon?: any }>): number {
    if (skills.length === 0) return 0;

    const font24 = this.getFontByType(FONT_TYPES.STAN_DSC); // font type 24 for "Required Skills:" header
    const font25 = this.getFontByType(FONT_TYPES.STAN_NUM); // font type 25 for skill name + level

    // Draw "Required Skills:" header (StringPool 0x801)
    const headerT = new Text({ text: 'Required Skills:', style: font24 });
    headerT.x = x;
    headerT.y = y;
    this._container.addChild(headerT);
    this._texts.push(headerT);
    y += 14;

    // Draw each required skill
    for (const skill of skills) {
      // OG: 34x34 background rectangle (semi-transparent)
      const bg = new Graphics();
      bg.rect(x, y, 34, 34).fill({ color: 0x000000, alpha: 0.5 });
      this._container.addChild(bg);

      // OG: Skill icon at (x+11-cx, y) — centered horizontally
      if (skill.icon) {
        const iconSprite = skill.icon.ToPixi?.() ?? skill.icon;
        if (iconSprite) {
          iconSprite.x = x + 11;
          iconSprite.y = y;
          this._container.addChild(iconSprite);
        }
      }

      // OG: Skill name at (x+50, y+2), font type 25
      const nameT = new Text({ text: skill.name, style: font25 });
      nameT.x = x + 50;
      nameT.y = y + 2;
      this._container.addChild(nameT);
      this._texts.push(nameT);

      // OG: Required level at (x+50, y+14), format from StringPool 0x801
      const levelT = new Text({ text: `Lv.${skill.level}`, style: font25 });
      levelT.x = x + 50;
      levelT.y = y + 14;
      this._container.addChild(levelT);
      this._texts.push(levelT);

      y += 34; // OG: each row is 34px
    }

    return y - (skills.length * 34 + 14); // return height of skill section
  }

  // OG: DrawOptionInfo @ 0x88bf80 — draw all option lines
  drawOptionInfo(): number {
    let y = this._height;
    for (let i = 0; i < this._optionLineNo; i++) {
      const line = this._optionLines[i];
      if (!line.context) continue;

      const font = this.getFontByType(line.type);
      const t = new Text({ text: line.context, style: font });
      t.x = 10;
      t.y = y;
      this._container.addChild(t);
      this._texts.push(t);
      y += 14;
    }

    if (y > this._height) {
      this._height = y;
      this._initCanvas(false, 0);
    }

    return y - this._height;
  }

  // OG: DrawDiscount_Info @ 0x88dec0 — discount price display
  drawDiscountInfo(y: number, originalPrice: number, currentPrice: number): number {
    if (originalPrice <= 0 || originalPrice === currentPrice) return 0;

    const font = this.getFontByType(FONT_TYPES.GEN_RED);
    const rate = Math.floor((1 - currentPrice / originalPrice) * 100);

    const t = new Text({ text: `Discount: ${rate}%`, style: font });
    t.x = 10;
    t.y = y;
    this._container.addChild(t);
    this._texts.push(t);

    return 16;
  }

  // OG: DrawLimitInfo @ 0x888be0 — limited goods info
  drawLimitInfo(y: number, limitTexts: string[]): number {
    if (limitTexts.length === 0) return 0;

    const font = this.getFontByType(FONT_TYPES.GEN_WHITE);
    let curY = y;

    for (const text of limitTexts) {
      const t = new Text({ text, style: font });
      t.x = 10;
      t.y = curY;
      this._container.addChild(t);
      this._texts.push(t);
      curY += 14;
    }

    return curY - y;
  }

  // OG: DrawNpcShopLimitedItemInfo @ 0x891530
  drawNpcShopLimitedItemInfo(y: number, period: number): number {
    if (period <= 0) return 0;

    const font = this.getFontByType(FONT_TYPES.GEN_WHITE);
    const t = new Text({ text: `Time Limited: ${period} days`, style: font });
    t.x = 10;
    t.y = y;
    this._container.addChild(t);
    this._texts.push(t);

    return 16;
  }

  // OG: DrawDiscount_Rate @ 0x889d80 — discount rate display with digit sprites
  // Loads WZ discount number images (0-9) from StringPool 0xB74 (2932)
  // Renders: [start_bracket][hundreds][tens][ones][end_bracket]
  // Discount rate = 100 * (original - discount) / original
  drawDiscountRate(x: number, y: number, originalPrice: number, discountPrice: number): number {
    if (originalPrice <= 0 || originalPrice === discountPrice) return 0;

    const discountRate = Math.floor(100 * (originalPrice - discountPrice) / originalPrice);
    if (discountRate <= 0) return 0;

    // OG: Load discount digit images from WZ property (StringPool 0xB74)
    // TS: Use TooltipAssets to load discount number sprites
    if (this._assets) {
      // OG: Load bracket images
      const startBracket = this._assets.Get('discount/start');
      const endBracket = this._assets.Get('discount/end');

      // OG: Load digit images (0-9)
      const digits: Array<any> = [];
      for (let i = 0; i <= 9; i++) {
        digits.push(this._assets.Get(`discount/${i}`));
      }

      // OG: Render bracket + digits + bracket
      let curX = x;
      if (startBracket) {
        this._assets.BlitAt(startBracket, curX, y, this._container);
        curX += startBracket.Width ?? 10;
      }

      // OG: Render hundreds digit
      const hundreds = Math.floor(discountRate / 100);
      if (hundreds > 0 && digits[hundreds]) {
        this._assets.BlitAt(digits[hundreds], curX, y, this._container);
        curX += digits[hundreds].Width ?? 8;
      }

      // OG: Render tens digit
      const tens = Math.floor((discountRate % 100) / 10);
      if (tens > 0 && digits[tens]) {
        this._assets.BlitAt(digits[tens], curX, y, this._container);
        curX += digits[tens].Width ?? 8;
      }

      // OG: Render ones digit
      const ones = discountRate % 10;
      if (digits[ones]) {
        this._assets.BlitAt(digits[ones], curX, y, this._container);
        curX += digits[ones].Width ?? 8;
      }

      // OG: Render end bracket
      if (endBracket) {
        this._assets.BlitAt(endBracket, curX, y, this._container);
        curX += endBracket.Width ?? 10;
      }

      return curX - x;
    }

    // Fallback: text rendering
    const font = this.getFontByType(FONT_TYPES.GEN_RED);
    const text = `${discountRate}%`;
    const t = new Text({ text, style: font });
    t.x = x;
    t.y = y;
    this._container.addChild(t);
    this._texts.push(t);

    return 16;
  }

  // OG: GetItemName @ 0x8899b0 — resolve equip item display name + font type.
  // gender prefix (StringPool 0x3C2/0x3C3) is appended for gender-locked equips;
  // protected items use a bolded name (lType 3); CalcEquipItemQuality overrides
  // the color lType: -1→4(HL_GRAY), 1→5(HL_GREEN), 2→6(HL_BLUE), 3→2(HL_GOLD),
  // 4→8(HL_GREEN2), 5→9(HL_EXCELLENT).
  // The StringPool format strings (0x828/0x829/0x1A19/0x1A1A) are the name +
  // gender/protect decorations; the caller already resolved the base name, so
  // this returns the resolved name + the lType used to color DrawItemTitle.
  getItemName(itemId: number, name: string, opts: { protected?: boolean; quality?: number; gender?: boolean } = {}): { name: string; lType: number } {
    const gender = ToolTip.getGenderFromId(itemId);
    const genderTag = gender === 0 ? 'Male' : gender === 1 ? 'Female' : '';
    const decorated = opts.gender && genderTag ? `${name} (${genderTag})` : name;

    // OG: lType = 3 (protected) or 1 (normal); quality overrides afterward.
    let lType: number = opts.protected ? FONT_TYPES.HL_ORANGE : FONT_TYPES.HL_WHITE;
    switch (opts.quality ?? 0) {
      case -1: lType = FONT_TYPES.HL_GRAY; break;
      case 1: lType = FONT_TYPES.HL_GREEN; break;
      case 2: lType = FONT_TYPES.HL_BLUE; break;
      case 3: lType = FONT_TYPES.HL_GOLD; break;
      case 4: lType = FONT_TYPES.HL_GREEN2; break;
      case 5: lType = FONT_TYPES.HL_EXCELLENT; break;
    }
    return { name: decorated, lType };
  }

  /** OG: get_gender_from_id @ 0x46f6d0 — gender lock from item id.
   *  Returns 0 = male-only, 1 = female-only, 2 = unisex. */
  static getGenderFromId(itemId: number): number {
    if (Math.floor(itemId / 1_000_000) !== 1) return 2;
    switch (Math.floor(itemId / 1000) % 10) {
      case 0: return 0;
      case 1: return 1;
      default: return 2;
    }
  }

  // OG: GetItemExpireDate @ 0x889310 — format expiry date
  getItemExpireDate(ft: { low: number; high: number } | null): string {
    if (!ft || (ft.low === 0 && ft.high === 0)) return '';

    // Convert FILETIME to readable date
    const ms = (ft.high * 0x100000000 + ft.low) / 10000 - 11644473600000;
    const d = new Date(ms);
    if (isNaN(d.getTime())) return '';

    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  // OG: DrawITCSaleInfo @ 0x88e6a0 — ITC sale period remaining until the expiry
  // date. The client subtracts "now" from ftITCExpiredDate (0x861C46800 = 1 day
  // in 100ns units, 0x23C34600 = 1 hour) and formats StringPool 4774 with the
  // whole-day and remainder-hour counts, e.g. "%d days %d hours".
  getItcPeriod(ft: { low: number; high: number } | null, now = Date.now()): string {
    if (!ft || (ft.low === 0 && ft.high === 0)) return '';
    const ms = (ft.high * 0x100000000 + ft.low) / 10000 - 11644473600000;
    const diff = ms - now;
    if (diff <= 0) return 'Expired';
    const DAY = 86400000;
    const HOUR = 3600000;
    const days = Math.floor(diff / DAY);
    const hours = Math.floor((diff % DAY) / HOUR);
    if (days > 0 && hours > 0) return `${days} days ${hours} hours`;
    if (days > 0) return `${days} days`;
    if (hours > 0) return `${hours} hours`;
    return 'Expiring soon';
  }

  // OG: SetToolTip_SetItem_Basic @ 0x8a14b0 — set item tier data population
  // Iterates 60 tiers, calls AddInfo for each stat with font type 10 (equipped) or 12 (unequipped)
  // StringPool IDs: 6753=STR, 6705=DEX, 6722=INT, 6730=LUK, 6719=MaxHP, 6733=MaxMP,
  // 674=PAD, 675=MAD, 676=PDD, 677=MDD, 678=ACC, 679=EVA, 680=Craft, 681=Speed, 682=Jump, 684=Knockback
  // 5820=tier header, 5821=skill bonus format, 6124=special set effect
  setToolTipSetItemBasic(
    setItemId: number,
    effects: Array<{
      niSTR?: number; niDEX?: number; niINT?: number; niLUK?: number;
      niMaxHP?: number; niMaxMP?: number; niPAD?: number; niMAD?: number;
      niPDD?: number; niMDD?: number; niACC?: number; niEVA?: number;
      niCraft?: number; niSpeed?: number; niJump?: number; nKnockback?: number;
      mSkillLevelBonus?: Map<number, number>;
      lSetKey?: number;
    }>,
    equippedCount: number,
  ): number {
    // OG: Font type = 10 (HL_SPECIAL) if equipped, 12 (GEN_GRAY) if not
    const fontType = 10; // equipped
    const unEquippedFontType = 12; // unequipped

    for (let i = 0; i < 60 && i < effects.length; i++) {
      const eff = effects[i];
      if (!eff) continue;

      const isEquipped = i < equippedCount;
      const ft = isEquipped ? fontType : unEquippedFontType;

      // OG: Tier header (StringPool 5820 "Set Item %d")
      if (i + 1 > 0) {
        this.addInfo(`${i + 1} Set`, FONT_TYPES.GEN_GOLD, 0);
      }

      // OG: Each stat via PrintValue with " +%d" format (type 0)
      const stats: Array<[number, string, number]> = [
        [6753, 'STR', eff.niSTR ?? 0],
        [6705, 'DEX', eff.niDEX ?? 0],
        [6722, 'INT', eff.niINT ?? 0],
        [6730, 'LUK', eff.niLUK ?? 0],
        [6719, 'MaxHP', eff.niMaxHP ?? 0],
        [6733, 'MaxMP', eff.niMaxMP ?? 0],
        [674, 'PAD', eff.niPAD ?? 0],
        [675, 'MAD', eff.niMAD ?? 0],
        [676, 'PDD', eff.niPDD ?? 0],
        [677, 'MDD', eff.niMDD ?? 0],
        [678, 'ACC', eff.niACC ?? 0],
        [679, 'EVA', eff.niEVA ?? 0],
        [680, 'Craft', eff.niCraft ?? 0],
        [681, 'Speed', eff.niSpeed ?? 0],
        [682, 'Jump', eff.niJump ?? 0],
        [684, 'Knockback', eff.nKnockback ?? 0],
      ];

      for (const [spId, label, value] of stats) {
        if (value > 0) {
          this.printValue(10, 0, value, ` ${label}:`, 0, ft);
        }
      }

      // OG: Skill level bonuses (StringPool 5821 format)
      if (eff.mSkillLevelBonus && eff.mSkillLevelBonus.size > 0) {
        for (const [skillId, bonusLevel] of eff.mSkillLevelBonus) {
          if (bonusLevel > 0) {
            this.addInfo(`Skill +${bonusLevel}`, ft, 0);
          }
        }
      }

      // OG: Special set effect (StringPool 6124, when lSetKey == 10000)
      if (eff.lSetKey === 10000) {
        this.addInfo('Special Set Effect', ft, 0);
      }
    }

    return this._lineNo;
  }

  // OG: SetToolTip_ItemOption @ 0x891c80 — item option/potential display
  // Large switch on option ID, maps to stat fields + StringPool format strings
  // Duration options (901-905) use StringPool 5822-5826 with nProb + nTime
  setToolTipItemOption(
    optionId: number,
    level: number,
    optionData: {
      nProb?: number; nTime?: number;
      niSTR?: number; niDEX?: number; niINT?: number; niLUK?: number;
      niHP?: number; niMP?: number;
      niSTRr?: number; niDEXr?: number; niINTr?: number; niLUKr?: number;
      nIgnoreDAM?: number;
    },
  ): void {
    // OG: Simple stat bonuses (option IDs 1-14)
    if (optionId <= 14) {
      const statMap: Record<number, [string, number]> = {
        1: ['STR', optionData.niSTR ?? 0],
        2: ['DEX', optionData.niDEX ?? 0],
        3: ['INT', optionData.niINT ?? 0],
        4: ['LUK', optionData.niLUK ?? 0],
        5: ['MaxHP', optionData.niHP ?? 0],
        6: ['MaxMP', optionData.niMP ?? 0],
        7: ['PAD', 0], 8: ['MAD', 0], 9: ['PDD', 0], 10: ['MDD', 0],
        11: ['ACC', 0], 12: ['EVA', 0], 13: ['Speed', 0], 14: ['Jump', 0],
      };
      const stat = statMap[optionId];
      if (stat && stat[1] > 0) {
        this.printValue(10, 0, stat[1], ` ${stat[0]}:`, 0, FONT_TYPES.STAN_PRP);
      }
      return;
    }

    // OG: Duration-based effects (901-905) with probability + time
    if (optionId >= 901 && optionId <= 905) {
      if ((optionData.nProb ?? 0) <= 0 || (optionData.nTime ?? 0) <= 0) return;
      // StringPool 5822-5826 for duration format strings
      const durationStrings: Record<number, string> = {
        901: 'Chance: %d%%, Duration: %ds',
        902: 'Chance: %d%%, Duration: %ds',
        903: 'Chance: %d%%, Duration: %ds',
        904: 'Chance: %d%%, Duration: %ds',
        905: 'Chance: %d%%, Duration: %ds',
      };
      const fmt = durationStrings[optionId] ?? 'Chance: %d%%, Duration: %ds';
      const text = fmt.replace('%d', String(optionData.nProb)).replace('%d', String(optionData.nTime));
      this.addOptionInfo(FONT_TYPES.STAN_PRP, text, FONT_TYPES.STAN_NUM);
      return;
    }

    // OG: Complex stat combinations (10001+)
    if (optionId === 10001) {
      // Relative STR bonus
      if ((optionData.niSTRr ?? 0) > 0) {
        this.printValue(10, 0, optionData.niSTRr!, ' STR:', 0, FONT_TYPES.STAN_PRP);
      }
      return;
    }

    // OG: Ignore damage options (20351, 20352)
    if (optionId === 20351 || optionId === 20352) {
      if ((optionData.nProb ?? 0) <= 0 || (optionData.nIgnoreDAM ?? 0) <= 0) return;
      const text = `Ignore Damage: ${optionData.nIgnoreDAM}%`;
      this.addOptionInfo(FONT_TYPES.STAN_PRP, text, FONT_TYPES.STAN_NUM);
      return;
    }

    // OG: HP/MP recovery options (20201, 20206)
    if (optionId === 20201) {
      if ((optionData.nProb ?? 0) <= 0 || (optionData.niHP ?? 0) <= 0) return;
      this.addOptionInfo(FONT_TYPES.STAN_PRP, `HP Recovery: ${optionData.niHP}`, FONT_TYPES.STAN_NUM);
      return;
    }
    if (optionId === 20206) {
      if ((optionData.nProb ?? 0) <= 0 || (optionData.niMP ?? 0) <= 0) return;
      this.addOptionInfo(FONT_TYPES.STAN_PRP, `MP Recovery: ${optionData.niMP}`, FONT_TYPES.STAN_NUM);
      return;
    }

    // OG: Relative stat options (30041+ = STR, others mapped similarly)
    if (optionId === 30041 || optionId === 20041) {
      if ((optionData.niSTRr ?? 0) > 0) {
        this.printValue(10, 0, optionData.niSTRr!, ' STR:', 0, FONT_TYPES.STAN_PRP);
      }
      return;
    }
  }

  // OG: MakePreviewPetNameTag @ 0x8873b0 — pet name tag preview
  // StringPool 0x542 (1346): path format for pet template "Pet/%d.img/info"
  // StringPool 1444: left canvas key, 1445: right canvas key, 1443: center tile key
  // StringPool 1454: font size key, 1455: font face name key
  // StringPool 6693: font color for IWzFont::Create
  // Creates output canvas, copies pet icon strips, draws name centered via CalcTextWidth
  makePreviewPetNameTag(
    name: string,
    templateId: number,
    petProp?: WzProperty | null,
    loader?: WzTextureLoader | null,
  ): number {
    // OG: Load pet template property from StringPool 0x542 path
    // Format: "Pet/%d.img/info" resolved via g_rm.GetObjectA
    const prop = petProp;
    if (!prop) {
      // Fallback: just draw the name
      const font = this.getFontByType(FONT_TYPES.HL_WHITE);
      const t = new Text({ text: name, style: font });
      t.x = 10;
      t.y = 10;
      this._container.addChild(t);
      this._texts.push(t);
      return 14;
    }

    // OG: Get 3 canvas images from property using StringPool keys
    // StringPool 1444 → left canvas (w)
    // StringPool 1445 → right canvas (c)
    // StringPool 1443 → center tile canvas (e)
    const leftNode = prop.Get('1444') ?? prop.Get('left');
    const rightNode = prop.Get('1445') ?? prop.Get('right');
    const centerNode = prop.Get('1443') ?? prop.Get('center');

    const loadCanvas = (node: unknown): WzSprite | null => {
      if (node instanceof WzCanvas && loader) return loader.Load(node);
      return null;
    };

    const leftSprite = loadCanvas(leftNode);
    const rightSprite = loadCanvas(rightNode);
    const centerSprite = loadCanvas(centerNode);

    // OG: Get font size from StringPool 1454 and font face from StringPool 1455
    const fontSizeVal = prop.Get('1454') ?? prop.Get('fontSize');
    const fontFaceVal = prop.Get('1455') ?? prop.Get('fontFace');
    const fontSize = typeof fontSizeVal === 'number' ? fontSizeVal : 11;
    const fontFace = typeof fontFaceVal === 'string' ? fontFaceVal : 'Arial';

    // OG: Calculate text width via CalcTextWidth (IWzFont::CalcTextWidth)
    // TS equivalent: use _measureText with the font
    const textWidth = this._measureText(name, new TextStyle({ fontSize, fontFamily: fontFace, fill: 0xFFFFFF }));

    // OG: Get center canvas dimensions for total tag size
    const leftW = leftSprite?.Width ?? 20;
    const rightW = rightSprite?.Width ?? 20;
    const centerW = centerSprite?.Width ?? Math.max(textWidth + 20, 80);
    const centerH = centerSprite?.Height ?? 18;

    // OG: Draw left canvas (raw_CopyEx strip)
    if (leftSprite) {
      const s = leftSprite.ToPixi();
      s.x = 0;
      s.y = 0;
      this._container.addChild(s);
    }

    // OG: Draw center tile (tiled horizontally to fill text width)
    if (centerSprite) {
      const tileW = centerSprite.Width;
      const tilesNeeded = Math.ceil(centerW / tileW);
      for (let i = 0; i < tilesNeeded; i++) {
        const s = centerSprite.ToPixi();
        s.x = leftW + i * tileW;
        s.y = 0;
        this._container.addChild(s);
      }
    }

    // OG: Draw right canvas
    if (rightSprite) {
      const s = rightSprite.ToPixi();
      s.x = leftW + centerW;
      s.y = 0;
      this._container.addChild(s);
    }

    // OG: Draw pet name centered on the tag via DrawTextA with CalcTextWidth offset
    const font = new TextStyle({ fontSize, fontFamily: fontFace, fill: 0xFFFFFF, fontWeight: 'bold' });
    const t = new Text({ text: name, style: font });
    t.x = leftW + (centerW - textWidth) / 2;
    t.y = (centerH - fontSize) / 2;
    this._container.addChild(t);
    this._texts.push(t);

    return centerH;
  }

  // OG: GetPetDeadDate @ 0x889540 — check pet death/expiry status
  // Reads 'life' property from CItemInfo::GetItemInfo via StringPool 0x781 (1921)
  // Uses _ZtlSecureFuse for secure stat reading
  // StringPool 693="Lv.%d", 694="%dh %dm remaining", 695=dead text, 696="%d/%d/%d %d:00"
  // StringPool 1919=permanent death text
  // StringPool 0x77E (1918)='dead' property, 0x77D (1917)='lv' property
  getPetDeadDate(
    petData: {
      itemId: number;
      dateDead?: { low: number; high: number };
      nRemainLife?: number;
      isDead?: boolean;
    },
    bShowLife: boolean,
    itemInfo?: WzProperty | null,
  ): { dead: boolean; deathStr: string; remainLife: number } {
    if (!petData) return { dead: false, deathStr: '', remainLife: 0 };

    const dateDead = petData.dateDead;
    const hasDateDead = dateDead && (dateDead.low !== 0 || dateDead.high !== 0);

    if (!hasDateDead && !bShowLife) {
      return { dead: false, deathStr: '', remainLife: 0 };
    }

    // OG: Read 'life' property from CItemInfo::GetItemInfo (StringPool 0x781 = 1921)
    // This is the item's max life value from the WZ info node
    const lifeProp = itemInfo?.Get('life') ?? itemInfo?.Get('0x781');
    const life = typeof lifeProp === 'number' ? lifeProp : (petData.nRemainLife ?? 0);

    if (life > 0) {
      // OG: _ZtlSecureFuse for actual nRemainLife, format as "%dh %dm remaining" (StringPool 694)
      const remainLife = petData.nRemainLife ?? life;
      const hours = Math.floor(remainLife / 60 / 60);
      const minutes = Math.floor(remainLife / 60) % 60;
      return { dead: false, deathStr: `${hours}h ${minutes}m remaining`, remainLife };
    }

    // life <= 0
    if (bShowLife) {
      // OG: Check 'dead' property (StringPool 0x77E = 1918)
      const deadProp = itemInfo?.Get('dead') ?? itemInfo?.Get('0x77E');
      const deadVal = typeof deadProp === 'number' ? deadProp : 0;

      if (deadVal === 0) {
        // Not dead yet: check 'lv' property (StringPool 0x77D = 1917), format "Lv.%d" (StringPool 693)
        const lvProp = itemInfo?.Get('lv') ?? itemInfo?.Get('0x77D');
        const lv = typeof lvProp === 'number' ? lvProp : 0;
        return { dead: false, deathStr: `Lv.${lv}`, remainLife: 0 };
      } else {
        // OG: StringPool 1919 — permanent death text
        return { dead: true, deathStr: 'This pet has permanently died.', remainLife: 0 };
      }
    }

    // !bShowLife path
    if (petData.isDead) {
      // OG: StringPool 695 — dead text
      return { dead: true, deathStr: 'This pet is dead.', remainLife: 0 };
    }

    // OG: Check 'dead' property again (StringPool 0x77E = 1918)
    const deadProp = itemInfo?.Get('dead') ?? itemInfo?.Get('0x77E');
    const deadVal = typeof deadProp === 'number' ? deadProp : 0;

    if (deadVal !== 0) {
      // OG: StringPool 1919 — permanent death text
      return { dead: true, deathStr: 'This pet has permanently died.', remainLife: 0 };
    }

    // OG: Format expiry date from dateDead FILETIME (StringPool 696: "%d/%d/%d %d:00")
    if (hasDateDead) {
      const ms = (dateDead!.high * 0x100000000 + dateDead!.low) / 10000 - 11644473600000;
      const d = new Date(ms);
      if (!isNaN(d.getTime())) {
        // OG: StringPool 696 format — month/day/year hour:00
        return {
          dead: false,
          deathStr: `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${d.getHours()}:00`,
          remainLife: 0,
        };
      }
    }

    return { dead: false, deathStr: '', remainLife: 0 };
  }

  // OG: MakingLimitInfo @ 0x888370 — build limit info strings from CS_LIMITGOODS
  // Parses dwConditionFlag for date range (flag 2), weekday schedule (flag 4),
  // hour range (flag 8), stock count (flag 1)
  makingLimitInfo(goodsInfo: {
    dwConditionFlag: number;
    nDateStart?: number; nDateEnd?: number;
    abWeek?: number[];
    nHourStart?: number; nHourEnd?: number;
    nOriginCount?: number; nRemainCount?: number;
  } | null): string[] {
    if (!goodsInfo) return [];

    const result: string[] = [];

    // OG: Two empty separator strings at top
    result.push('');
    result.push('');

    // OG: Date range (flag 2)
    if ((goodsInfo.dwConditionFlag & 2) !== 0 && (goodsInfo.nDateStart ?? 0) > 0 && (goodsInfo.nDateEnd ?? 0) > 0) {
      const start = goodsInfo.nDateStart!;
      const end = goodsInfo.nDateEnd!;
      // StringPool 0xE95/0xE96 format: "%02d/%02d/%04d"
      const fmt = (d: number) => {
        const month = (d % 10000 - d % 100) / 100;
        const day = d % 100;
        const year = Math.floor(d / 10000);
        return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
      };
      result.push(`Start: ${fmt(start)}`);
      result.push(`End: ${fmt(end)}`);
    }

    // OG: Weekday schedule (flag 4)
    if ((goodsInfo.dwConditionFlag & 4) !== 0) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const week = goodsInfo.abWeek ?? [0, 0, 0, 0, 0, 0, 0];
      let dayCount = 0;
      let scheduleStr = '';
      for (let i = 0; i < 7; i++) {
        if (week[i]) {
          scheduleStr += dayNames[i] + ' ';
          dayCount++;
        }
      }
      if (dayCount < 7) {
        scheduleStr += '(rest days)';
      }
      result.push(scheduleStr.trim());
    }

    // OG: Hour range (flag 8)
    if ((goodsInfo.dwConditionFlag & 8) !== 0 && (goodsInfo.nHourStart ?? 0) >= 0 && (goodsInfo.nHourEnd ?? 0) >= 0) {
      result.push(`Hours: ${goodsInfo.nHourStart}:00 - ${goodsInfo.nHourEnd}:00`);
    }

    // OG: Stock count (flag 1)
    if ((goodsInfo.dwConditionFlag & 1) !== 0 && (goodsInfo.nOriginCount ?? 0) > 0) {
      // StringPool 0x1A57 format
      result.push(`Stock: ${goodsInfo.nOriginCount}`);
      // StringPool 0xEA4 format
      result.push(`Remaining: ${goodsInfo.nRemainCount ?? 0}`);
    } else {
      // StringPool 0xEA5 — unlimited
      result.push(`Stock: ${goodsInfo.nOriginCount ?? 0}`);
    }

    // OG: Separator (StringPool 0xEA6)
    result.push('');

    // OG: Two empty separator strings at bottom
    result.push('');
    result.push('');

    return result;
  }

  // OG: ShowItemToolTip @ 0x8a9300 — master dispatcher
  // Routes to SetToolTip_Equip (type 4), SetToolTip_Bundle (type 5), SetToolTip_Pet (type 6)
  // Extracts nPeriod, sDonator, nOriginalPrice, nPrice from ItemToolTipParam/CS_COMMODITY
  showItemToolTip(
    x: number, y: number, itemId: number, name: string, desc: string = '',
    params?: {
      itemType?: number; // 4=equip, 5=bundle, 6=pet; auto-detected from itemId if omitted
      nPeriod?: number;
      sDonator?: string;
      nOriginalPrice?: number;
      nPrice?: number;
      goodsInfo?: any;
      bCashShop?: number;
      sTitle?: string;
      sOrderComment?: string;
    },
  ): void {
    this.clearToolTip();

    // OG: Determine item type from params or auto-detect from itemId
    let itemType = params?.itemType ?? 0;
    if (itemType === 0) {
      const cat = Math.floor(itemId / 1000000);
      if (cat === 1) {
        itemType = TOOLTIP_TYPE.EQUIP;  // type 4
      } else if (cat === 3) {
        itemType = TOOLTIP_TYPE.PET;    // type 6
      } else {
        itemType = TOOLTIP_TYPE.BUNDLE; // type 5
      }
    }

    // OG: Extract params from ItemToolTipParam/CS_COMMODITY
    const nPeriod = params?.nPeriod ?? 0;
    const sDonator = params?.sDonator ?? '';
    const nOriginalPrice = params?.nOriginalPrice ?? 0;
    const nPrice = params?.nPrice ?? 0;
    const goodsInfo = params?.goodsInfo ?? null;
    const sTitle = params?.sTitle ?? '';
    const sOrderComment = params?.sOrderComment ?? '';

    if (itemType === TOOLTIP_TYPE.EQUIP) {
      // OG: SetToolTip_Equip — equip tooltip (handled by ItemTooltip._drawEquip)
      this.setBasicInfo(TOOLTIP_TYPE.EQUIP, 236, 200, 0);
    } else if (itemType === TOOLTIP_TYPE.BUNDLE) {
      // OG: SetToolTip_Bundle — consumable/bundle tooltip
      this.setBasicInfo(TOOLTIP_TYPE.BUNDLE, 290, 200, 0);
    } else if (itemType === TOOLTIP_TYPE.PET) {
      // OG: SetToolTip_Pet — pet tooltip
      this.setBasicInfo(TOOLTIP_TYPE.PET, 290, 200, 0);
    } else {
      // OG: Normal tooltip fallback
      const maxLines = 3;
      const lineHeight = 14;
      const width = 200;
      const height = PADDING * 2 + maxLines * lineHeight + ITEM_ICON_SIZE + PADDING;
      this.setBasicInfo(TOOLTIP_TYPE.NORMAL, width, height, 0);
    }

    this.makeLayer(x, y, true, 0);

    this.drawItemIcon(PADDING, PADDING);
    this.drawTextItemName(ITEM_ICON_SIZE + PADDING + 5, name, this.getFontByType(FONT_TYPES.HL_WHITE));

    if (desc) {
      this.drawTextLeft(ITEM_ICON_SIZE + PADDING + 25, desc, this.getFontByType(FONT_TYPES.GEN_WHITE));
    }

    // OG: Donator info (StringPool 0x2B0)
    if (sDonator) {
      this.drawTextLeft(this._height - 10, `Donator: ${sDonator}`, this.getFontByType(FONT_TYPES.GEN_WHITE));
    }

    // OG: Period display
    if (nPeriod > 0) {
      this.drawTextLeft(this._height - 10, `Period: ${nPeriod} days`, this.getFontByType(FONT_TYPES.GEN_WHITE));
    }

    // OG: Discount rate
    if (nOriginalPrice > 0 && nOriginalPrice !== nPrice) {
      this.drawDiscountRate(10, this._height - 10, nOriginalPrice, nPrice);
    }

    // OG: ITC sale info
    if (sOrderComment) {
      this.drawITCSaleInfo(this._height - 10, nPrice, null, sOrderComment, 0, 0);
    }
  }

  // OG: GetFontColor helper for external consumers
  static getFontColor(type: number): number {
    return FONT_COLORS[type] ?? FONT_COLORS[FONT_TYPES.GEN_WHITE];
  }

  static getFontSize(type: number): number {
    return FONT_SIZES[type] ?? 11;
  }

  // OG: DrawITCSaleInfo @ 0x88e6a0 — ITC (Item Trading Center) sale information display
  // Renders: divider line, "ITC Sale" header, order comment, ITC price, expiry date, stock info
  // StringPool: 0x12D5="ITC Sale", 4784=format for item count
  // eITCToolTip enum: 0=normal, 1=extended, 2=package
  drawITCSaleInfo(
    y: number,
    nITCPrice: number,
    ftITCExpiredDate: { low: number; high: number } | null,
    sOrderComment: string,
    nItemCount: number,
    itcToolTip: number,
  ): number {
    const font = this.getFontByType(FONT_TYPES.GEN_WHITE);
    const fontHL = this.getFontByType(FONT_TYPES.HL_WHITE);
    let curY = y;

    // OG: Draw divider line (DrawRectangle at y-2, width-12)
    const divider = new Graphics();
    divider.rect(6, curY - 2, this._width - 12, 1).fill({ color: 0xFFFFFF, alpha: 0.3 });
    this._container.addChild(divider);
    curY += 4;

    // OG: If no order comment and no ITC price: draw "ITC Sale" header (StringPool 0x12D5)
    if (!sOrderComment && nITCPrice <= 0) {
      const t = new Text({ text: 'ITC Sale', style: fontHL });
      t.x = (this._width - this._measureText('ITC Sale', fontHL)) / 2;
      t.y = curY;
      this._container.addChild(t);
      this._texts.push(t);
      curY += 14;
    }

    // OG: Draw order comment if present
    if (sOrderComment) {
      const t = new Text({ text: sOrderComment, style: font });
      t.x = 10;
      t.y = curY;
      this._container.addChild(t);
      this._texts.push(t);
      curY += 14;
    }

    // OG: Draw ITC price if present
    if (nITCPrice > 0) {
      const priceText = `Price: ${nITCPrice.toLocaleString()} mesos`;
      const t = new Text({ text: priceText, style: font });
      t.x = 10;
      t.y = curY;
      this._container.addChild(t);
      this._texts.push(t);
      curY += 14;
    }

    // OG: Draw expiry date if present
    if (ftITCExpiredDate && (ftITCExpiredDate.low !== 0 || ftITCExpiredDate.high !== 0)) {
      const dateStr = this.getItemExpireDate(ftITCExpiredDate);
      if (dateStr) {
        const t = new Text({ text: `Expires: ${dateStr}`, style: font });
        t.x = 10;
        t.y = curY;
        this._container.addChild(t);
        this._texts.push(t);
        curY += 14;
      }
    }

    // OG: Draw item count if > 0 (StringPool 4784 format)
    if (nItemCount > 0) {
      const countText = `Quantity: ${nItemCount}`;
      const t = new Text({ text: countText, style: font });
      t.x = 10;
      t.y = curY;
      this._container.addChild(t);
      this._texts.push(t);
      curY += 14;
    }

    return curY - y;
  }

  private _measureText(text: string, font: TextStyle): number {
    return text.length * 7; // rough estimate for monospace font
  }

  private _emptyLine(): LineInfo {
    return { width: 0, height: 0, type: 0, context: '', align: 0, multi: 0, subType: 0, subContext: '', useDotImage: false };
  }

  // OG: Initialize 28 fonts from constructor @ 0x8839c0
  private _initFonts(): void {
    for (const [type, color] of Object.entries(FONT_COLORS)) {
      const t = parseInt(type);
      const size = FONT_SIZES[t] ?? 11;
      const bold = t <= FONT_TYPES.HL_SPECIAL || t === FONT_TYPES.H_WHITE;
      this._fonts.set(t, new TextStyle({
        fill: `#${color.toString(16).padStart(6, '0')}`,
        fontSize: size,
        fontFamily: 'monospace',
        fontWeight: bold ? 'bold' : 'normal',
      }));
    }
  }

  // Expose FONT_TYPES for external consumers
  static FONT_TYPES = FONT_TYPES;
  static TOOLTIP_TYPE = TOOLTIP_TYPE;
}
