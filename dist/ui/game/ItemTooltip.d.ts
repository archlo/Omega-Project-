import { Container, Sprite } from 'pixi.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { ItemIconLoader, ItemAttr } from '../../character/ItemIconLoader.js';
import { ItemInfoService } from '../../character/ItemInfoService.js';
import { StringPoolService } from '../../localization/StringPoolService.js';
import { TooltipAssets } from './TooltipAssets.js';
import { ToolTip } from './ToolTip.js';
type EquipOptionLevel = {
    niSTR?: number;
    niDEX?: number;
    niINT?: number;
    niLUK?: number;
    niMaxHP?: number;
    niMaxMP?: number;
    niACC?: number;
    niEVA?: number;
    niSpeed?: number;
    niJump?: number;
    niPAD?: number;
    niMAD?: number;
    niPDD?: number;
    niMDD?: number;
    niSTRr?: number;
    niDEXr?: number;
    niINTr?: number;
    niLUKr?: number;
    niMaxHPr?: number;
    niMaxMPr?: number;
    niACCr?: number;
    niEVAr?: number;
    niPADr?: number;
    niMADr?: number;
    niPDDr?: number;
    niMDDr?: number;
    niCr?: number;
    niCDr?: number;
    niMAMr?: number;
    niSkill?: number;
    niAllSkill?: number;
    nRecoveryHP?: number;
    nRecoveryMP?: number;
    nMPConReduce?: number;
    nIgnoreTargetDEF?: number;
    nIgnoreDAM?: number;
    nIgnoreDAMr?: number;
    niDAMr?: number;
    nDAMReflect?: number;
    niMesoProb?: number;
    niRewardProb?: number;
};
/** Bundle metadata already formatted by the caller/client data layer. */
export interface BundleTooltipOptions {
    ft?: {
        low: number;
        high: number;
    };
    bProtected?: number;
    nPeriod?: number;
    sDonator?: string;
    sTitle?: string;
    nOriginalPrice?: number;
    nPrice?: number;
    goodsInfo?: any;
    bCashShop?: number;
    nNpcShopTimeLimitedItemPeriod?: number;
    nCommodityID?: number;
    nITCSalePrice?: number;
    ftITCDateExpired?: {
        low: number;
        high: number;
    } | null;
    sOrderComment?: string;
    pii?: any;
    tradeOption?: string;
    tradeOptionEx?: string;
}
export interface RingTooltipOptions {
    ringImage?: WzSprite | Sprite | null;
    resolveRingImage?: (itemId: number) => WzSprite | Sprite | null;
    ringCanvas?: WzCanvas | null;
    partnerText?: string;
}
export declare class ItemTooltip {
    private _font;
    private _icons;
    private _assets;
    private _itemInfo;
    private _strings;
    private _descOf;
    private _setItemOf;
    private _pLevel;
    private _pStr;
    private _pDex;
    private _pInt;
    private _pLuk;
    private _pJob;
    private _root;
    private _g;
    private _iconSprite;
    private _texts;
    private _bgAlpha;
    private _grade;
    private _blitSprites;
    private _equipWidth;
    private _toolTip;
    private _optionOf;
    constructor(font: BuiltInFont, icons: ItemIconLoader, assets: TooltipAssets, descOf?: ((itemId: number) => string | null) | null, setItemOf?: ((itemId: number) => {
        name: string;
        effects: Array<{
            threshold: number;
            effect: Record<string, number>;
        }>;
    } | null) | null, optionOf?: ((optionId: number, level: number) => EquipOptionLevel | null) | null, itemInfo?: ItemInfoService | null, strings?: StringPoolService | null);
    get root(): Container;
    get toolTip(): ToolTip;
    SetPlayer(level: number, str: number, dex: number, intt: number, luk: number, job?: number): void;
    Draw(itemId: number, name: string, grade: number, _quantity: number, mouseX: number, mouseY: number, viewW: number, viewH: number, equippedSetCount?: number, petLevel?: number, petTameness?: number, petRepleteness?: number, petRemainLife?: number, equipStats?: {
        incStr: number;
        incDex: number;
        incInt: number;
        incLuk: number;
        incPad: number;
        incMad: number;
        incPdd: number;
        incMdd: number;
        incMhp: number;
        incMmp: number;
        incAcc: number;
        incEva: number;
        incSpeed: number;
        incJump: number;
        ruc: number;
        cuc: number;
        option1: number;
        option2: number;
        option3: number;
    }, bundleOpts?: BundleTooltipOptions): void;
    Hide(): void;
    private _string;
    private _itemIcon;
    private _txt;
    private _clearTexts;
    private _dot;
    private _blitAt;
    private _drawEquip;
    private _drawConsumable;
    private _isGrowthItem;
    private _drawGrowthItem;
    private _drawDurabilityBar;
    private _buildInfoLines;
    private _wrapText;
    private static _gradeColor;
    DrawSkillTooltip(skillId: number, skillName: string, description: string, currentLevel: number, maxLevel: number, currentHelp: string, nextHelp: string, reqSkills: Array<{
        name: string;
        level: number;
        skillId?: number;
        icon?: WzSprite | Sprite;
    }>, mouseX: number, mouseY: number, viewW: number, viewH: number, bShowLevel?: boolean, skillData?: {
        isSwallowBuff?: boolean;
        swallowBuffType?: number;
        isWildHunter?: boolean;
        linkedCharName?: string;
        expiryStr?: string;
        masterLevel?: number;
        damageMeter?: {
            avgDmg: number;
            maxDmg: number;
        };
        icon?: WzSprite | Sprite;
        masterLevelText?: string;
        swallowBuffs?: string[];
        wildHunterValues?: string[];
        damageMeterValues?: string[];
    }): void;
    DrawPetTooltip(petName: string, templateName: string, description: string, level: number, tameness: number, repleteness: number, isDead: boolean, deathStr: string, donator: string, expiryStr: string, skills: string[], mouseX: number, mouseY: number, viewW: number, viewH: number, nOriginalPrice?: number, nPrice?: number, itemId?: number, goodsInfo?: {
        dwConditionFlag: number;
        nDateStart?: number;
        nDateEnd?: number;
        abWeek?: number[];
        nHourStart?: number;
        nHourEnd?: number;
        nOriginCount?: number;
        nRemainCount?: number;
    } | null): void;
    DrawRingTooltip(ringName: string, description: string, partnerName: string, _ringType: 'couple' | 'friend' | 'spouse', expiryStr: string, itemId: number, mouseX: number, mouseY: number, viewW: number, viewH: number, equipStats?: {
        incStr: number;
        incDex: number;
        incInt: number;
        incLuk: number;
        incPad: number;
        incMad: number;
        incPdd: number;
        incMdd: number;
        incMhp: number;
        incMmp: number;
        incAcc: number;
        incEva: number;
        incSpeed: number;
        incJump: number;
        ruc: number;
        cuc: number;
    }, equipAttr?: ItemAttr | null, options?: RingTooltipOptions): void;
    DrawMacroSysSkillTooltip(macroName: string, skills: Array<{
        name: string;
        desc: string;
    }>, mouseX: number, mouseY: number, viewW: number, viewH: number): void;
    DrawSlotIncTooltip(itemName: string, description: string, category: string, slotIncrease: number, slotType: 'equip' | 'use' | 'setup' | 'etc', mouseX: number, mouseY: number, viewW: number, viewH: number): void;
    DrawEquipExtTooltip(itemName: string, isExpired: boolean, expiryStr: string, mouseX: number, mouseY: number, viewW: number, viewH: number): void;
    DrawString2Tooltip(lines: Array<{
        text: string;
        color: number;
        size?: number;
    }>, mouseX: number, mouseY: number, viewW: number, viewH: number): void;
    DrawStringMultiLineTooltip(text: string, fontType: number, mouseX: number, mouseY: number, viewW: number, viewH: number): void;
}
export {};
//# sourceMappingURL=ItemTooltip.d.ts.map