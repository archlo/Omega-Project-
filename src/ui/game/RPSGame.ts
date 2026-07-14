import { Graphics, Text, TextStyle, Container } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

// OG: CRPSGameDlg — full decompilation-based implementation
// Struct layout from v95_symbols.txt: CRPSGameDlg (316 bytes), inherits CUniqueModeless
// CP_RPSGame = 0xa0 = 160 (client→server), LP_RPSGame = 0x173 = 371 (server→client)

const PanelW = 340;
const PanelH = 340;

// OG button IDs from CRPSGameDlg::<unnamed_tag>
const ID_CTRL_BT_ROCK    = 0x7D0; // 2000
const ID_CTRL_BT_PAPER   = 0x7D1; // 2001
const ID_CTRL_BT_SCISSOR = 0x7D2; // 2002
const ID_CTRL_BT_START   = 0xBB8; // 3000
const ID_CTRL_BT_CONTINUE = 0xBB9; // 3001
const ID_CTRL_BT_RETRY   = 0xBBA; // 3002
const ID_CTRL_BT_EXIT    = 0xBBB; // 3003

// RPS choice constants
const RPS_ROCK     = 0;
const RPS_PAPER    = 1;
const RPS_SCISSOR  = 2;

const RPS_NAMES = ['Rock', 'Paper', 'Scissors'];
const RPS_ICONS = ['✊', '✋', '✌️'];

// OG ProcessPacket sub-action types
const SUBACTION_ERROR        = 6;  // Game error (StringPool 3724)
const SUBACTION_UNAVAILABLE  = 7;  // Game unavailable (StringPool 3723)
const SUBACTION_START_SEL    = 9;  // Enable RPS buttons, 30s timer, NPC animates
const SUBACTION_GAME_OVER    = 10; // Final result, game ends
const SUBACTION_RESULT       = 11; // NPC choice + win streak
const SUBACTION_CONTINUE_SEL = 12; // Re-enable selection (continue round)
const SUBACTION_CLOSED       = 14; // Game closed

// OG SetMainButton types
const MAINBUTTON_START    = 3000;
const MAINBUTTON_CONTINUE = 3001;
const MAINBUTTON_RETRY    = 3002;

// OG StringPool IDs for button UOLs
const STR_START    = 0xE72; // 3698
const STR_CONTINUE = 0xE73; // 3699
const STR_RETRY    = 0xE74; // 3700

// OG StringPool IDs for tip text
const STR_TIP_START     = 0xE84; // 3716
const STR_TIP_COUNTDOWN = 0xE85; // 3717
const STR_TIP_STREAK    = 0xE86; // 3718
const STR_TIP_RETRY_10  = 0xE87; // 3719
const STR_TIP_RETRY_NO  = 0xE88; // 3720
const STR_TIP_RETRY_YES = 0xE89; // 3721
const STR_TIP_RETRY_MED = 0xE8A; // 3722

// OG StringPool IDs for result sounds
const SND_SWITCH   = 0x64D; // 1613 — NPC switching sound
const SND_TICK     = 0x648; // 1608 — countdown tick
const SND_RESULT   = 0x647; // 1607 — loss sound
const SND_TIE      = 0x645; // 1605 — tie sound
const SND_WIN      = 0x646; // 1606 — win sound

// OG emotion types for avatar
const EMOTION_LOSS = 4;
const EMOTION_TIE  = 3;
const EMOTION_WIN  = 2;

// OG result canvas indices
const RESULT_TIE   = 0;
const RESULT_LOSS  = 1;
const RESULT_WIN   = 2;
const RESULT_FINAL = 3; // when m_nCntStraightVictories < 0

const _labelStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'Arial', fontWeight: 'bold' });
const _statusStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 10, fontFamily: 'Arial' });
const _tipStyle = new TextStyle({ fill: '#FFCC00', fontSize: 9, fontFamily: 'Arial' });
const _resultStyle = new TextStyle({ fill: '#FFD700', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold' });
const _btnLabelStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 10, fontFamily: 'Arial', fontWeight: 'bold' });
const _btnDisabledStyle = new TextStyle({ fill: '#666666', fontSize: 10, fontFamily: 'Arial', fontWeight: 'bold' });

interface RPSButton {
  id: number;
  label: string;
  icon: string;
  gfx: Container;
  bg: Graphics;
  labelTxt: Text;
  iconTxt: Text;
  enabled: boolean;
}

export class RPSGame extends GamePanel {
  // OG state fields (from CRPSGameDlg struct)
  private _bRequestSent = false;
  private _dwNpcTemplateID = 0;
  private _tShowResult = 0;
  private _nUserSelect = 0;
  private _nNpcSelect = -1;
  private _nNpcCurShown = 0;
  private _tLastSwitched = 0;
  private _tSwitchingTerm = 0;
  private _tLimit = 0;
  private _nCntStraightVictories = 0;
  private _bReceiveCompensation = false;
  private _tShowResultLayer = 0;
  private _tEndResult = 0;
  private _nLastTipOption = 0;
  private _nCurTipLength = 0;
  private _nTipPos = 0;
  private _sTip = '';

  // Callbacks
  onSendPacket: ((subOpcode: number, data?: number) => void) | null = null;

  // UI elements
  private _bg = new Graphics();
  private _userLabel = new Text({ text: 'You', style: _labelStyle });
  private _npcLabel = new Text({ text: 'NPC', style: _labelStyle });
  private _userIcon = new Text({ text: '✊', style: new TextStyle({ fontSize: 48 }) });
  private _npcIcon = new Text({ text: '❓', style: new TextStyle({ fontSize: 48 }) });
  private _statusText = new Text({ text: '', style: _statusStyle });
  private _resultText = new Text({ text: '', style: _resultStyle });
  private _tipText = new Text({ text: '', style: _tipStyle });
  private _timerText = new Text({ text: '', style: new TextStyle({ fill: '#FF6666', fontSize: 10, fontFamily: 'Arial' }) });
  private _streakText = new Text({ text: '', style: new TextStyle({ fill: '#00FF88', fontSize: 10, fontFamily: 'Arial' }) });

  // RPS selection buttons (OG: m_pBtRPS[3])
  private _rpsButtons: RPSButton[] = [];

  // Main action button (OG: m_pBtMain — dynamically swapped)
  private _mainBtn: RPSButton | null = null;
  private _mainBtnType = MAINBUTTON_START;

  // Exit button (OG: m_pBtExit)
  private _exitBtn: RPSButton | null = null;

  // Animation state
  private _lastFrameTime = 0;
  private _animPhase = 0;
  private _resultShowTime = 0;
  private _resultPhase = 0;

  constructor() {
    super();
    this.container.position.set(340, 160);
    this._buildUI();
  }

  // ── OG: SetSubAction (called from FieldHandlers.onRPSGameDlg) ───────────
  SetSubAction(subAction: number): void {
    this.isVisible = true;

    switch (subAction) {
      case SUBACTION_START_SEL:
      case SUBACTION_CONTINUE_SEL:
        // OG ProcessPacket case 9/12: enable selection
        this._nNpcSelect = -1;
        this._tSwitchingTerm = 120;
        this._tLastSwitched = performance.now() || 1;
        this._tLimit = performance.now() + 30000 || 1;
        this._setRPSButtonsEnabled(true);
        this._setStatus('Choose: Rock, Paper, or Scissors!');
        this._resultText.text = '';
        this._bRequestSent = false;
        break;

      case SUBACTION_RESULT:
        // OG ProcessPacket case 11: handled via full packet decode in handleServerResult
        break;

      case SUBACTION_GAME_OVER:
        // OG ProcessPacket case 10
        this._tSwitchingTerm = 0;
        this._nNpcSelect = -1;
        this._nCntStraightVictories = -1;
        this._showFinalResult();
        break;

      case SUBACTION_ERROR:
        // OG ProcessPacket case 6: StringPool 3724
        this._resetToStart();
        this._setStatus('Game error occurred.');
        break;

      case SUBACTION_UNAVAILABLE:
        // OG ProcessPacket case 7: StringPool 3723
        this._resetToStart();
        this._setStatus('RPS game is not available.');
        break;

      case SUBACTION_CLOSED:
        // OG ProcessPacket case 14
        this._resetToStart();
        this._setStatus('Game closed.');
        this._setMainButton(MAINBUTTON_START);
        break;
    }

    this._refreshDisplay();
  }

  // ── OG: ProcessPacket case 11 — full result decode ──────────────────────
  handleServerResult(npcSelect: number, cntStraightVictories: number): void {
    this._nNpcSelect = npcSelect;
    this._bReceiveCompensation = cntStraightVictories < 0 && this._nCntStraightVictories === 0;
    this._nCntStraightVictories = cntStraightVictories;
    this._showResult();
  }

  // ── GamePanel overrides ──────────────────────────────────────────────────
  update(dt: number): void {
    if (!this.isVisible) return;

    const now = performance.now();

    // OG Update: NPC animation switching (m_tSwitchingTerm)
    if (this._tSwitchingTerm > 0 && now - this._tLastSwitched > this._tSwitchingTerm) {
      this._nNpcCurShown = (this._nNpcCurShown + 1) % 3;
      this._tLastSwitched = now || 1;

      // OG: if m_nNpcSelect >= 0, speed up switching (1.2x)
      if (this._nNpcSelect >= 0) {
        this._tSwitchingTerm = Math.floor(this._tSwitchingTerm * 1.2);
        // OG: stop when switchingTerm >= 720 and NPC matches selection
        if (this._tSwitchingTerm >= 720 && this._nNpcCurShown === this._nNpcSelect) {
          this._tSwitchingTerm = 0;
          this._showResult();
        }
      }
      this._refreshDisplay();
    }

    // OG Update: timer countdown (m_tLimit)
    if (this._tLimit > 0) {
      if (now <= this._tLimit) {
        // OG: play tick sound every 1000ms when < 10s
        if ((this._tLimit - now) % 1000 < 30 && this._tLimit - now < 10000) {
          // SND_TICK sound
        }
      } else {
        // OG: time up — send sub-opcode 2 (timeout)
        this.onSendPacket?.(2);
        this._tLimit = 0;
        this._setRPSButtonsEnabled(false);
      }
      this._refreshDisplay();
    }

    // OG Update: result layer timing (m_tShowResultLayer)
    if (this._tShowResultLayer > 0 && now - this._tShowResultLayer > 0) {
      // Result canvas shown — determine emotion and sound
      let emotion: number;
      let soundId: number;
      if (this._nCntStraightVictories < 0) {
        emotion = EMOTION_LOSS;
        soundId = SND_RESULT;
      } else if (this._nUserSelect === this._nNpcSelect) {
        emotion = EMOTION_TIE;
        soundId = SND_TIE;
      } else {
        emotion = EMOTION_WIN;
        soundId = SND_WIN;
      }
      // Avatar emotion + sound would be triggered here
      this._tShowResultLayer = 0;
    }

    // OG Update: end result timing (m_tEndResult)
    if (this._tEndResult > 0 && now - this._tEndResult > 0) {
      this._tEndResult = 0;
      // OG: remove result canvas, reset avatar emotion
      if (this._nUserSelect === this._nNpcSelect) {
        // Tie — restart selection
        this._nNpcSelect = -1;
        this._tSwitchingTerm = 120;
        this._tLastSwitched = now || 1;
        this._tLimit = now + 30000 || 1;
        this._setRPSButtonsEnabled(true);
      } else {
        // Win/Loss — show main button
        const mainType = (this._nCntStraightVictories > 0 && this._nCntStraightVictories < 10)
          ? MAINBUTTON_CONTINUE : MAINBUTTON_RETRY;
        this._setMainButton(mainType);
        this._exitBtnSetEnabled(true);
      }
      this._refreshDisplay();
    }

    // Tip scrolling (OG: m_nTipPos for long text)
    if (this._nCurTipLength > 270) {
      this._nTipPos--;
      if (this._nCurTipLength + this._nTipPos < 0) {
        this._nTipPos = 270;
      }
    }
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;

    const lx = x - this.container.position.x;
    const ly = y - this.container.position.y;

    // Check RPS buttons
    for (const btn of this._rpsButtons) {
      if (btn.enabled && this._hit(lx, ly, btn.bg.x, btn.bg.y, 80, 50)) {
        this._onRPSSelection(btn.id - ID_CTRL_BT_ROCK);
        return true;
      }
    }

    // Check main button
    if (this._mainBtn && this._mainBtn.enabled) {
      const mb = this._mainBtn;
      if (this._hit(lx, ly, mb.bg.x, mb.bg.y, 100, 28)) {
        this._onMainButtonClick();
        return true;
      }
    }

    // Check exit button
    if (this._exitBtn && this._exitBtn.enabled) {
      const eb = this._exitBtn;
      if (this._hit(lx, ly, eb.bg.x, eb.bg.y, 80, 28)) {
        this._onExitClick();
        return true;
      }
    }

    // Title bar drag
    if (ly >= 0 && ly < 22) return this.beginDrag(lx, ly, true);

    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }

  // ── OG button handlers ───────────────────────────────────────────────────

  // OG: OnButtonClicked — routes by nId
  private _onRPSSelection(rpsIndex: number): void {
    if (this._bRequestSent) return;
    // OG: SendSelection(nRPS)
    this.onSendPacket?.(1, rpsIndex);
    this._nUserSelect = rpsIndex;
    this._tLimit = 0;
    this._setRPSButtonsEnabled(false);
    this._bRequestSent = true;
    this._refreshDisplay();
  }

  private _onMainButtonClick(): void {
    if (this._bRequestSent) return;
    switch (this._mainBtnType) {
      case MAINBUTTON_START:
        // OG: OnBtStart — sub-opcode 0
        this.onSendPacket?.(0);
        break;
      case MAINBUTTON_CONTINUE:
        // OG: OnBtContinue — sub-opcode 3
        this.onSendPacket?.(3);
        break;
      case MAINBUTTON_RETRY:
        // OG: OnBtRetry — sub-opcode 5
        this.onSendPacket?.(5);
        break;
    }
    this._setMainButtonEnabled(false);
    this._exitBtnSetEnabled(false);
    this._bRequestSent = true;
  }

  private _onExitClick(): void {
    if (this._bRequestSent) return;
    // OG: OnBtExit — sub-opcode 4
    this.onSendPacket?.(4);
    this._setMainButtonEnabled(false);
    this._exitBtnSetEnabled(false);
    this._bRequestSent = true;
  }

  // ── OG SetMainButton ─────────────────────────────────────────────────────
  private _setMainButton(type: number): void {
    this._mainBtnType = type;
    let label: string;
    switch (type) {
      case MAINBUTTON_START:    label = 'Start'; break;
      case MAINBUTTON_CONTINUE: label = 'Continue'; break;
      case MAINBUTTON_RETRY:    label = 'Retry'; break;
      default: label = '?'; break;
    }
    if (this._mainBtn) {
      this._mainBtn.labelTxt.text = label;
      this._mainBtn.enabled = true;
    }
    this._refreshDisplay();
  }

  // ── OG ShowResult ────────────────────────────────────────────────────────
  private _showResult(): void {
    if (this._nCntStraightVictories >= 0) {
      if (this._nUserSelect === this._nNpcSelect) {
        // Tie
        this._resultText.text = 'Tie!';
        this._statusText.text = `${RPS_NAMES[this._nUserSelect]} vs ${RPS_NAMES[this._nNpcSelect]}`;
      } else {
        // Win
        this._resultText.text = 'You Win!';
        this._statusText.text = `${RPS_NAMES[this._nUserSelect]} beats ${RPS_NAMES[this._nNpcSelect]}`;
      }
    } else {
      // Loss
      this._resultText.text = 'You Lose!';
      this._statusText.text = `${RPS_NAMES[this._nNpcSelect]} beats ${RPS_NAMES[this._nUserSelect]}`;
    }

    // Show NPC's choice
    if (this._nNpcSelect >= 0) {
      this._npcIcon.text = RPS_ICONS[this._nNpcSelect];
    }

    this._tShowResultLayer = performance.now() + 1000 || 1;
    this._tEndResult = performance.now() + 3000 || 1;
    this._refreshDisplay();
  }

  private _showFinalResult(): void {
    this._resultText.text = 'Game Over';
    if (this._nNpcSelect >= 0) {
      this._npcIcon.text = RPS_ICONS[this._nNpcSelect];
    }
    this._setMainButton(MAINBUTTON_RETRY);
    this._exitBtnSetEnabled(true);
    this._setRPSButtonsEnabled(false);
    this._refreshDisplay();
  }

  private _resetToStart(): void {
    this._tSwitchingTerm = 0;
    this._nCntStraightVictories = 0;
    this._tLimit = 0;
    this._tShowResultLayer = 0;
    this._tEndResult = 0;
    this._nNpcSelect = -1;
    this._nUserSelect = 0;
    this._nNpcCurShown = 0;
    this._bRequestSent = false;
    this._setMainButton(MAINBUTTON_START);
    this._exitBtnSetEnabled(true);
    this._npcIcon.text = '❓';
    this._userIcon.text = '✊';
    this._resultText.text = '';
  }

  // ── UI helpers ───────────────────────────────────────────────────────────

  private _setRPSButtonsEnabled(enabled: boolean): void {
    for (const btn of this._rpsButtons) {
      btn.enabled = enabled;
    }
    this._refreshDisplay();
  }

  private _setMainButtonEnabled(enabled: boolean): void {
    if (this._mainBtn) this._mainBtn.enabled = enabled;
    this._refreshDisplay();
  }

  private _exitBtnSetEnabled(enabled: boolean): void {
    if (this._exitBtn) this._exitBtn.enabled = enabled;
    this._refreshDisplay();
  }

  private _setStatus(text: string): void {
    this._statusText.text = text;
  }

  private _refreshDisplay(): void {
    // Update NPC icon based on animation phase
    if (this._tSwitchingTerm > 0) {
      this._npcIcon.text = RPS_ICONS[this._nNpcCurShown];
    }

    // Update user icon
    if (this._nUserSelect >= 0 && this._nUserSelect < 3) {
      this._userIcon.text = RPS_ICONS[this._nUserSelect];
    }

    // Update timer
    if (this._tLimit > 0) {
      const remaining = Math.max(0, Math.ceil((this._tLimit - performance.now()) / 1000));
      this._timerText.text = remaining > 0 ? `${remaining}s` : 'Time!';
    } else {
      this._timerText.text = '';
    }

    // Update streak
    if (this._nCntStraightVictories > 0) {
      this._streakText.text = `Streak: ${this._nCntStraightVictories}`;
    } else {
      this._streakText.text = '';
    }

    // Update button visuals
    this._drawButton(this._mainBtn);
    this._drawButton(this._exitBtn);
    for (const btn of this._rpsButtons) {
      this._drawButton(btn);
    }
  }

  private _drawButton(btn: RPSButton | null): void {
    if (!btn) return;
    const g = btn.bg;
    g.clear();
    const w = btn.id >= ID_CTRL_BT_ROCK && btn.id <= ID_CTRL_BT_SCISSOR ? 80 : 100;
    const h = btn.id >= ID_CTRL_BT_ROCK && btn.id <= ID_CTRL_BT_SCISSOR ? 50 : 28;
    const color = btn.enabled ? 0x2A2D4A : 0x1A1A2A;
    const border = btn.enabled ? 0x8888AA : 0x444466;
    g.roundRect(0, 0, w, h, 4).fill({ color, alpha: 0.95 }).stroke({ color: border, width: 1 });
    btn.labelTxt.style = btn.enabled ? _btnLabelStyle : _btnDisabledStyle;
  }

  private _buildUI(): void {
    // Background — OG: CDialog window chrome
    this._bg.roundRect(0, 0, PanelW, PanelH, 6)
      .fill({ color: 0x101020, alpha: 0.95 })
      .stroke({ color: 0x888866, width: 2 });
    this.container.addChild(this._bg);

    // Title
    const title = new Text({ text: 'Rock Paper Scissors', style: new TextStyle({ fill: '#FFE4B5', fontSize: 13, fontFamily: 'Arial', fontWeight: 'bold' }) });
    title.position.set(12, 6);
    this.container.addChild(title);

    // Separator line
    const sep = new Graphics();
    sep.moveTo(0, 24).lineTo(PanelW, 24).stroke({ color: 0x555544, width: 1 });
    this.container.addChild(sep);

    // User section
    this._userLabel.position.set(50, 30);
    this.container.addChild(this._userLabel);
    this._userIcon.anchor.set(0.5);
    this._userIcon.position.set(78, 85);
    this.container.addChild(this._userIcon);

    // VS text
    const vsText = new Text({ text: 'VS', style: new TextStyle({ fill: '#888888', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold' }) });
    vsText.anchor.set(0.5);
    vsText.position.set(PanelW / 2, 85);
    this.container.addChild(vsText);

    // NPC section
    this._npcLabel.position.set(250, 30);
    this.container.addChild(this._npcLabel);
    this._npcIcon.anchor.set(0.5);
    this._npcIcon.position.set(278, 85);
    this.container.addChild(this._npcIcon);

    // RPS selection buttons (OG: m_pBtRPS[3])
    const rpsLabels = ['Rock', 'Paper', 'Scissors'];
    const rpsIcons = ['✊', '✋', '✌️'];
    const btnStartX = 30;
    const btnY = 140;
    const btnSpacing = 95;

    for (let i = 0; i < 3; i++) {
      const bg = new Graphics();
      bg.position.set(btnStartX + i * btnSpacing, btnY);

      const iconTxt = new Text({ text: rpsIcons[i], style: new TextStyle({ fontSize: 22 }) });
      iconTxt.anchor.set(0.5);
      iconTxt.position.set(40, 14);

      const labelTxt = new Text({ text: rpsLabels[i], style: _btnLabelStyle });
      labelTxt.anchor.set(0.5);
      labelTxt.position.set(40, 38);

      const gfx = new Container();
      gfx.addChild(bg, iconTxt, labelTxt);
      this.container.addChild(gfx);

      this._rpsButtons.push({
        id: ID_CTRL_BT_ROCK + i,
        label: rpsLabels[i],
        icon: rpsIcons[i],
        gfx, bg, labelTxt, iconTxt,
        enabled: false,
      });
    }

    // Status text
    this._statusText.position.set(12, 200);
    this._statusText.style = _statusStyle;
    this.container.addChild(this._statusText);

    // Result text
    this._resultText.anchor.set(0.5);
    this._resultText.position.set(PanelW / 2, 225);
    this.container.addChild(this._resultText);

    // Timer
    this._timerText.position.set(PanelW - 50, 200);
    this.container.addChild(this._timerText);

    // Streak
    this._streakText.position.set(12, 200);
    this.container.addChild(this._streakText);

    // Main button (OG: m_pBtMain — dynamically created at pos 108,202)
    {
      const bg = new Graphics();
      bg.position.set(80, 240);
      const labelTxt = new Text({ text: 'Start', style: _btnLabelStyle });
      labelTxt.anchor.set(0.5);
      labelTxt.position.set(50, 14);
      const gfx = new Container();
      gfx.addChild(bg, labelTxt);
      this.container.addChild(gfx);
      this._mainBtn = {
        id: MAINBUTTON_START,
        label: 'Start',
        icon: '',
        gfx, bg, labelTxt,
        iconTxt: new Text({ text: '' }),
        enabled: true,
      };
    }

    // Exit button (OG: m_pBtExit)
    {
      const bg = new Graphics();
      bg.position.set(200, 240);
      const labelTxt = new Text({ text: 'Exit', style: _btnLabelStyle });
      labelTxt.anchor.set(0.5);
      labelTxt.position.set(40, 14);
      const gfx = new Container();
      gfx.addChild(bg, labelTxt);
      this.container.addChild(gfx);
      this._exitBtn = {
        id: ID_CTRL_BT_EXIT,
        label: 'Exit',
        icon: '',
        gfx, bg, labelTxt,
        iconTxt: new Text({ text: '' }),
        enabled: true,
      };
    }

    // Tip text (OG: m_pLayerTip at position 20,294)
    this._tipText.position.set(20, 290);
    this._tipText.style = _tipStyle;
    this.container.addChild(this._tipText);

    // Bottom separator
    const sep2 = new Graphics();
    sep2.moveTo(0, 280).lineTo(PanelW, 280).stroke({ color: 0x444433, width: 1 });
    this.container.addChild(sep2);

    this._drawAllButtons();
  }

  private _drawAllButtons(): void {
    for (const btn of this._rpsButtons) this._drawButton(btn);
    this._drawButton(this._mainBtn);
    this._drawButton(this._exitBtn);
  }

  private _hit(x: number, y: number, bx: number, by: number, bw: number, bh: number): boolean {
    return x >= bx && x < bx + bw && y >= by && y < by + bh;
  }
}
