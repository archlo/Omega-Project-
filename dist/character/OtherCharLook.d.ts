import { Container } from 'pixi.js';
import type { AvatarLook } from '../domain/AvatarLook.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { Stance } from './Stance.js';
import type { TempStatBuff } from '../net/handlers/PacketArgs.js';
import { SkillEffectOverlay } from './SkillEffectOverlay.js';
import type { DecodedMovePath } from '../net/packet/MovePathDecoder.js';
export declare class OtherCharLook {
    readonly CharId: number;
    readonly Name: string;
    readonly Level: number;
    Look: AvatarLook | null;
    readonly container: Container<import("pixi.js").ContainerChild>;
    Position: {
        x: number;
        y: number;
    };
    private _facingLeft;
    private _stance;
    private _charLook;
    private _loader;
    private _charWz;
    private _itemWz;
    private _baseWz;
    private _movePath;
    private _movePathElapsed;
    private _movePathActive;
    private _hitFlash;
    private _adBoardText;
    private _adBoardTimer;
    private _statusBadges;
    private _tempStatMaskLo;
    private _tempStatMaskHi;
    private _tempStatBuffs;
    private _defenseAtt;
    private _defenseState;
    private _diceInfo;
    private _swallowBuffTime;
    private _blessingArmorIncPAD;
    private _guildName;
    private _guildMarkBg;
    private _guildMarkBgColor;
    private _guildMark;
    private _guildMarkColor;
    private _medalItemId;
    private _teamName;
    private _hpRatio;
    private _buffOverlays;
    PortableChairItemId: number;
    private _nameText;
    private _guildText;
    private _medalText;
    private _placeholderGfx;
    private _badgeContainer;
    private _adBoardBg;
    private _adBoardLabel;
    private _hpGaugeGfx;
    private _lastHitFlash;
    private _lastBadgeCount;
    private _lastAdBoard;
    private _lastLevel;
    private _lastName;
    private _lastGuildName;
    private _lastMedalId;
    private _lastHpRatio;
    private _lastTeamName;
    constructor(CharId: number, Name: string, Level: number, Look: AvatarLook | null);
    LoadSprites(loader: WzTextureLoader, charWz: WzPackage | null, itemWz: WzPackage | null, baseWz: WzPackage | null): void;
    SetPosition(x: number, y: number): void;
    get FacingLeft(): boolean;
    SetFacing(facingLeft: boolean): void;
    Attack(): void;
    PlayAttackCode(action: number): boolean;
    PlayAttackAction(actionKey: string): void;
    OnHit(): void;
    SetADBoard(message: string): void;
    SetStatusBadge(key: string, text: string, durationSec?: number): void;
    ClearStatusBadge(key: string): void;
    SetTemporaryStats(maskLo: bigint, maskHi: bigint, buffs: TempStatBuff[], defenseAtt: number, defenseState: number, diceInfo: number[], swallowBuffTime: number, blessingArmorIncPAD: number): void;
    ClearTemporaryStats(maskLo: bigint, maskHi: bigint): void;
    get TempStatBuffs(): readonly TempStatBuff[];
    get TempStatMaskLo(): bigint;
    get TempStatMaskHi(): bigint;
    get DefenseAtt(): number;
    get DefenseState(): number;
    get DiceInfo(): readonly number[];
    get SwallowBuffTime(): number;
    get BlessingArmorIncPAD(): number;
    /** Look up a buff by bit position. Returns undefined if not set. */
    GetBuffByBit(bit: number): TempStatBuff | undefined;
    SetGuildInfo(name: string, markBg: number, markBgColor: number, mark: number, markColor: number): void;
    SetMedalItemId(medalId: number): void;
    SetTeamName(name: string): void;
    /** OG CUser::DrawGauge — sets the HP ratio (0..1) for the HP gauge bar.
     *  Pass -1 to hide the gauge entirely. */
    SetHpRatio(curHp: number, maxHp: number): void;
    HideHpGauge(): void;
    /** Returns a SkillEffectOverlay for persistent buff visuals (OG LoadSkillRepeatEffect).
     *  Lazy-created — only allocates when a buff effect is first needed. */
    GetBuffOverlay(): SkillEffectOverlay;
    SetEmotion(emotionId: number): void;
    SetChairHeight(itemId: number): void;
    UpdateAvatar(look: AvatarLook): void;
    private _anchor;
    get NavelPosition(): {
        x: number;
        y: number;
    };
    get HeadPosition(): {
        x: number;
        y: number;
    };
    get BrowPosition(): {
        x: number;
        y: number;
    };
    get MuzzlePosition(): {
        x: number;
        y: number;
    };
    SetStance(stance: Stance): void;
    SetMovePath(path: DecodedMovePath): void;
    /** World-space hit test against the fixed 30x78 body box (matches placeholder/avatar footprint). */
    HitTest(worldX: number, worldY: number): boolean;
    Update(dt: number): void;
    Draw(camX: number, camY: number, cx: number, cy: number): void;
    private _rebuildDisplay;
    /** OG CUser::DrawGauge — renders the 52×10 HP gauge bar.
     *  3 nested border rectangles + red fill proportional to HP. */
    private _drawHpGauge;
    private _drawBadges;
    private _drawADBoard;
}
//# sourceMappingURL=OtherCharLook.d.ts.map