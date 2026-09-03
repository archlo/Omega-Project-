import { Container, Texture } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import type { SkillInfoService } from '../../character/SkillInfoService.js';
import type { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { ItemInfoService } from '../../character/ItemInfoService.js';
import { StringPoolService } from '../../localization/StringPoolService.js';
import { SkillIncPanel, SkillDecPanel, SkillChangeConfirm } from './SkillIncDec.js';
import type { BuiltInFont } from '../BuiltInFont.js';
import type { ItemIconLoader } from '../../character/ItemIconLoader.js';
export interface SkillDragPayload {
    skillId: number;
}
export declare class SkillRow {
    id: number;
    name: string;
    level: number;
    maxLevel: number;
    passive: boolean;
    masterLevel: number;
    constructor(id: number, name: string, level: number, maxLevel: number, passive: boolean, masterLevel?: number);
}
export interface CooldownEntry {
    skillId: number;
    remaining: number;
    total: number;
    coolFrame: number;
    coolFrameTimer: number;
}
export declare class SkillBook extends GamePanel {
    skillService: SkillInfoService | null;
    textureLoader: WzTextureLoader | null;
    sp: number;
    onSkillUp: ((skillId: number) => void) | null;
    onSkillUse: ((skillId: number, slv: number) => void) | null;
    onMacroOpen: (() => void) | null;
    nameOf: (id: number) => string;
    onDragStart: ((payload: SkillDragPayload, texture: Texture, x: number, y: number) => void) | null;
    onSendSkillUp: ((skillId: number) => void) | null;
    onDragSound: (() => void) | null;
    private _skills;
    private _tabs;
    private _activeTab;
    private _scrollOffset;
    private _lastClickSkillId;
    private _lastClickTime;
    private _cooldowns;
    characterLevel: number;
    characterJob: number;
    characterSubJob: number;
    characterHp: number;
    linkedCharacter: string;
    wildHunterMobNames: string[];
    swallowBuffType: number;
    damageMeter: {
        avgDmg: number;
        maxDmg: number;
    } | null;
    isAdmin: boolean;
    private _lastSkillUpTime;
    private _extendSP;
    private _noviceSp;
    private _tabOption;
    private _dualRogueSkillWarning;
    private _resetIncreaseRows;
    private _resetDecreaseRows;
    private _resetSelectedDecrease;
    private _resetSelectedIncrease;
    private _resetOrigin;
    /**
     * Applies the compact ExtendSP::Decode payload used by Aran/Evan/Cygnus.
     * The wire format is count followed by (job-degree, sp) byte pairs.  The
     * original CUISkillEx indexes this array by the selected tab, so keeping
     * the degree in its native slot is important; deriving SP from row count
     * makes later job tabs appear to have (or lose) points incorrectly.
     */
    setExtendedSp(encoded: Uint8Array | undefined): void;
    setSpecialTooltipContext(linkedCharacter: string | undefined, wildHunterMobNames: string[]): void;
    setSwallowBuffType(value: number): void;
    setDamageMeterSummary(summary: {
        avgDmg: number;
        maxDmg: number;
    } | null): void;
    private _titleText;
    private _titleSecond;
    private _spText;
    private _tabSprites;
    private _tabLabels;
    private _tabLabelStrings;
    private _tabKinds;
    private _isAranJob;
    private _rowIcons;
    private _rowNames;
    private _rowLevels;
    private _rowCds;
    private _rowBonuses;
    private _rowSpBtns;
    private _scrollBar;
    private _macroBtn;
    onSkillGuide: ((grade: number) => void) | null;
    onSkillResetConfirm: ((increaseSkillId: number, decreaseSkillId: number) => void) | null;
    private _skillSlotNormalTex;
    private _skillSlotEnabledTex;
    private _rowSlotBgs;
    private _recommendBgTex;
    private _rowRecommendBgs;
    private _lineBgTex;
    private _background2;
    private _background3;
    private _rowLineBgs;
    private _bookIcon;
    private _hoverIndex;
    private _recommendSkillId;
    private _tooltip;
    private _viewW;
    private _viewH;
    private _mouseX;
    private _mouseY;
    private _tabDisabledTex;
    private _tabEnabledTex;
    private _coolTimeTex;
    private _coolTimeSprite;
    private _rowCoolTimeSprites;
    private _aranBtnTex;
    private _aranBtnDisabledTex;
    private _dualTabDisabledTex;
    private _dualTabEnabledTex;
    skillIncPanel: SkillIncPanel;
    skillDecPanel: SkillDecPanel;
    skillChangeConfirm: SkillChangeConfirm;
    private static readonly _posKey;
    constructor(loader?: WzTextureLoader, ui?: WzPackage | null, font?: BuiltInFont, icons?: ItemIconLoader, descOf?: (itemId: number) => string | null, setItemOf?: (itemId: number) => {
        name: string;
        effects: Array<{
            threshold: number;
            effect: Record<string, number>;
        }>;
    } | null, optionOf?: (optionId: number, level: number) => Record<string, number> | null, itemInfo?: ItemInfoService | null, strings?: StringPoolService | null);
    get tooltipContainer(): Container | null;
    setViewSize(w: number, h: number): void;
    private _getJobLevel;
    activeSkillGuideGrade(): number;
    private _getJobChangeLevel;
    private _getMaxSkillDegreeSP;
    private _getMySkillDegreeSP;
    private _getMySkillDegreeSPDualJob;
    private _dualJobCodes;
    private _dualJobChangeLevel;
    private _getMaxSkillDegreeSPDualJob;
    private _findSkill;
    canSkillUp(skillId: number): boolean;
    canSkillUpDualJob(skillId: number): boolean;
    getTabSp(): number;
    onSkillLevelUp(skillId: number): boolean;
    setSkills(skills: SkillRow[]): void;
    /** Opens the OG three-step SP reset wizard with caller-provided candidates. */
    openSkillReset(decrease: SkillRow[], increase: SkillRow[], x?: number, y?: number): void;
    /**
     * Build the visible skill list the same way CUISkill does: the character's
     * skill records provide levels, while Skill.wz provides the complete skill
     * roots.  This is intentionally separate from setSkills(), which remains a
     * small deterministic API for tests and callers that already have rows.
     */
    setSkillRecords(records: Array<{
        skillId: number;
        level: number;
        masterLevel?: number;
    }>): void;
    private _skillRootsForJob;
    rebuildTabs(): void;
    startCooldown(skillId: number, totalSeconds: number): void;
    clearCooldown(skillId: number): void;
    cooldownOf(skillId: number): {
        remain: number;
        total: number;
    } | null;
    update(_dt: number): void;
    private _getSkillIndexFromPoint;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onMouseMove(x: number, y: number): void;
    onMouseLeave(): void;
    onKeyPress(key: string): boolean;
    onChildNotify(nId: number, param1: number, param2: number): boolean;
    private onTabChanged;
}
//# sourceMappingURL=SkillBook.d.ts.map