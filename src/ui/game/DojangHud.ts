import { Container, Graphics, Text, TextStyle } from 'pixi.js';

/**
 * OG: CField_Dojang — Mu Lung Dojo HUD.
 * Decompiled from v95 IDB:
 * - Init (0x54FFA0) — loads digit canvases, player stats overlay layers
 * - Update (0x54EF10) — boss HP bar via CMobPool::FindBossMob, player stats
 * - UpdateTimer (0x54EDF0) — countdown timer with DrawDigit
 * - DrawDigit (0x54EBB0) — renders per-digit WZ sprites
 * - OnClock (0x550940) — receives floor timer from server (subType=2)
 * - CanUseSpecialArts (0x54EA40) — gates special arts in dojang maps
 *
 * Dojang has 486 maps with fieldType=14. Server drives floor progression
 * by moving the player to a new map for each floor. The timer is set via
 * Clock packet (subType 2). Boss mob presence is detected via
 * CMobPool::FindBossMob — the OG updates m_pLayerMonsterGage width as
 * 305 * m_nMonsterHPPercentage / 100.
 *
 * WZ assets: UI/UIWindow2.img/Dojang/ (boss bar, digit sprites)
 */

// OG: m_pLayerMonsterGage bar dimensions (from Init 0x54FFA0)
const BOSS_BAR_X = 250;
const BOSS_BAR_Y = 10;
const BOSS_BAR_W = 305;  // OG: put_width(305 * pct / 100)
const BOSS_BAR_H = 20;

// OG: floor/round display position
const FLOOR_X = 12;
const FLOOR_Y = 95;

// OG: player stats overlay position (from Init)
const STATS_X = 12;
const STATS_Y = 120;

const _bossStyle = new TextStyle({ fill: '#FFD700', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' });
const _floorStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold' });
const _hpTextStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 9, fontFamily: 'monospace' });
const _statStyle = new TextStyle({ fill: '#CCCCCC', fontSize: 9, fontFamily: 'monospace' });

/** Dojang stage/round tracking. */
export interface DojangStage {
  /** Current floor number (1-based, server-driven). */
  floor: number;
  /** Current round within the floor (1-based, mob waves). */
  round: number;
  /** Total mobs remaining on this floor. */
  mobsRemaining: number;
  /** Whether a boss mob is present on this floor. */
  hasBoss: boolean;
  /** Boss mob template ID (0 if no boss). */
  bossTemplateId: number;
}

export class DojangHud {
  readonly container = new Container({ visible: false });

  // Boss HP bar (OG: m_pLayerMonsterGage)
  private _bossBarBg: Graphics;
  private _bossBarFill: Graphics;
  private _bossName: Text;
  private _hpText: Text;
  private _bossBarVisible = false;

  // Floor/round display
  private _floorText: Text;
  private _roundText: Text;

  // Player stats overlay (OG: renders HP/MP/digits on screen)
  private _statsContainer: Container;
  private _hpStatText: Text;
  private _mpStatText: Text;

  // Stage state
  private _stage: DojangStage = {
    floor: 0,
    round: 1,
    mobsRemaining: 0,
    hasBoss: false,
    bossTemplateId: 0,
  };

  // Callbacks
  onFloorClear: ((floor: number) => void) | null = null;

  constructor() {
    // Boss HP bar background (OG: m_pLayerMonsterGage)
    this._bossBarBg = new Graphics();
    this._bossBarBg.rect(BOSS_BAR_X, BOSS_BAR_Y, BOSS_BAR_W, BOSS_BAR_H).fill({ color: '#1a1a2e' });
    this._bossBarBg.rect(BOSS_BAR_X, BOSS_BAR_Y, BOSS_BAR_W, BOSS_BAR_H).stroke({ color: '#4a4a6a', width: 1 });
    this._bossBarBg.visible = false;
    this.container.addChild(this._bossBarBg);

    // Boss HP bar fill
    this._bossBarFill = new Graphics();
    this._bossBarFill.visible = false;
    this.container.addChild(this._bossBarFill);

    // Boss name
    this._bossName = new Text({ text: '', style: _bossStyle });
    this._bossName.x = BOSS_BAR_X;
    this._bossName.y = BOSS_BAR_Y - 16;
    this._bossName.visible = false;
    this.container.addChild(this._bossName);

    // HP text
    this._hpText = new Text({ text: '', style: _hpTextStyle });
    this._hpText.x = BOSS_BAR_X + BOSS_BAR_W / 2;
    this._hpText.y = BOSS_BAR_Y + 3;
    this._hpText.anchor.set(0.5, 0);
    this._hpText.visible = false;
    this.container.addChild(this._hpText);

    // Floor display
    this._floorText = new Text({ text: '', style: _floorStyle });
    this._floorText.x = FLOOR_X;
    this._floorText.y = FLOOR_Y;
    this.container.addChild(this._floorText);

    // Round display
    this._roundText = new Text({ text: '', style: _statStyle });
    this._roundText.x = FLOOR_X;
    this._roundText.y = FLOOR_Y + 18;
    this.container.addChild(this._roundText);

    // Player stats overlay (OG: renders HP/MP digits on screen)
    this._statsContainer = new Container();
    this._statsContainer.x = STATS_X;
    this._statsContainer.y = STATS_Y;
    this.container.addChild(this._statsContainer);

    this._hpStatText = new Text({ text: '', style: _statStyle });
    this._hpStatText.x = 0;
    this._hpStatText.y = 0;
    this._statsContainer.addChild(this._hpStatText);

    this._mpStatText = new Text({ text: '', style: _statStyle });
    this._mpStatText.x = 0;
    this._mpStatText.y = 14;
    this._statsContainer.addChild(this._mpStatText);
  }

  /** Get current stage state. */
  get stage(): DojangStage { return { ...this._stage }; }

  /** Set the current floor number (from server clock/field change). */
  setFloor(floor: number): void {
    this._stage.floor = floor;
    this._stage.round = 1;
    this._stage.mobsRemaining = 0;
    this._stage.hasBoss = false;
    this._stage.bossTemplateId = 0;
    this._clearBossBar();
    this._refreshDisplay();
    this.container.visible = floor > 0;
  }

  /** Advance to next round within the current floor. */
  advanceRound(): void {
    this._stage.round++;
    this._stage.mobsRemaining = 0;
    this._refreshDisplay();
  }

  /** Set mob count remaining on current floor/round. */
  setMobCount(count: number): void {
    this._stage.mobsRemaining = count;
    this._refreshDisplay();
    // OG: when all mobs cleared, floor is clear
    if (count <= 0 && this._stage.floor > 0) {
      this.onFloorClear?.(this._stage.floor);
    }
  }

  /**
   * OG: CField_Dojang::Update (0x54EF10) — boss HP bar overlay.
   * Called when a boss mob enters the field in a dojang map.
   * OG uses CMobPool::FindBossMob() and updates m_pLayerMonsterGage.
   */
  onBossEnter(templateId: number, name: string, hpPct: number): void {
    this._stage.hasBoss = true;
    this._stage.bossTemplateId = templateId;
    this._bossNameStr = name;
    this._bossBarVisible = true;
    this._bossBarBg.visible = true;
    this._bossBarFill.visible = true;
    this._bossName.visible = true;
    this._hpText.visible = true;
    this._bossName.text = name;
    this._updateBossBar(hpPct);
    this._refreshDisplay();
  }

  /**
   * OG: CField_Dojang::Update — boss HP update.
   * OG: m_nMonsterHPPercentage = boss->m_nHPpercentage;
   * OG: m_pLayerMonsterGage.put_width(305 * m_nMonsterHPPercentage / 100)
   */
  onBossHpUpdate(hpPct: number): void {
    this._updateBossBar(hpPct);
  }

  /** Boss mob died or left the field. */
  onBossLeave(): void {
    this._stage.hasBoss = false;
    this._stage.bossTemplateId = 0;
    this._clearBossBar();
    this._refreshDisplay();
  }

  /**
   * OG: CField_Dojang::Update — player stats overlay.
   * OG renders HP/MP/digits on screen via DrawDigit.
   */
  updatePlayerStats(hp: number, maxHp: number, mp: number, maxMp: number): void {
    this._hpStatText.text = `HP: ${hp.toLocaleString()} / ${maxHp.toLocaleString()}`;
    this._mpStatText.text = `MP: ${mp.toLocaleString()} / ${maxMp.toLocaleString()}`;
  }

  /** Hide the dojang HUD. */
  hide(): void {
    this.container.visible = false;
    this._stage = { floor: 0, round: 1, mobsRemaining: 0, hasBoss: false, bossTemplateId: 0 };
    this._clearBossBar();
  }

  /** OG: CField_Dojang::CanUseSpecialArts (0x54EA40). */
  static canUseSpecialArts(fieldType: number): boolean {
    return fieldType === 14;
  }

  // --- Internal ---

  private _bossNameStr = '';

  private _updateBossBar(hpPct: number): void {
    this._bossBarFill.clear();
    const pct = Math.max(0, Math.min(100, hpPct));
    // OG: put_width(305 * m_nMonsterHPPercentage / 100)
    const fillW = Math.round(BOSS_BAR_W * pct / 100);
    // OG: green > 50%, yellow > 25%, red <= 25%
    const ratio = pct / 100;
    const color = ratio > 0.5 ? 0x00CC00 : ratio > 0.25 ? 0xCCCC00 : 0xCC0000;
    this._bossBarFill.rect(BOSS_BAR_X + 1, BOSS_BAR_Y + 1, fillW - 2, BOSS_BAR_H - 2).fill({ color });
    this._hpText.text = `${Math.round(pct)}%`;
  }

  private _clearBossBar(): void {
    this._bossBarVisible = false;
    this._bossBarBg.visible = false;
    this._bossBarFill.visible = false;
    this._bossName.visible = false;
    this._hpText.visible = false;
    this._bossBarFill.clear();
    this._bossNameStr = '';
  }

  private _refreshDisplay(): void {
    this._floorText.text = this._stage.floor > 0 ? `Floor: ${this._stage.floor}` : '';
    if (this._stage.round > 1 || this._stage.mobsRemaining > 0) {
      this._roundText.text = `Round: ${this._stage.round}  Mobs: ${this._stage.mobsRemaining}`;
    } else {
      this._roundText.text = '';
    }
  }
}
