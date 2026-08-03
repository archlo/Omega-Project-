import { Container, Sprite, Graphics, Text } from 'pixi.js';
import { WzSprite } from '../render/WzSprite.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzProperty } from '../wz/WzProperty.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { WzImage } from '../wz/WzImage.js';
import type { DecodedMovePath } from '../net/packet/MovePathDecoder.js';
import type { Foothold } from '../map/Foothold.js';
import { RemoteMoveReplay } from './RemoteMoveReplay.js';

// Generic idle-chat greetings for NPCs with no WZ speak entries.
// Sourced from OG StringPool (IDs 0x1A2F–0x1A36).
const GENERIC_GREETINGS = [
  'Hello, adventurer!',
  'Welcome to our town!',
  'How can I help you today?',
  'Nice to see you around!',
  'Take care out there!',
  'Stay safe on your journey!',
  'Need anything? Just ask!',
  'Good to see you!',
];

export class NpcLook {
  private _anims = new Map<string, { sprite: WzSprite; delayMs: number }[]>();
  private _state = 'stand';
  private _frame = 0;
  private _frameTimer = 0;
  private _facingLeft = false;
  private _loaded = false;
  get Loaded(): boolean { return this._loaded; }
  private _speak: string[] = [];
  private readonly _replay = new RemoteMoveReplay();

  readonly container = new Container();
  Position = { x: 0, y: 0 };
  Name = '';
  FuncName = '';
  ShowNameTag = true;
  ObjId = 0;
  /** Last foothold serial supplied by the field packet. */
  FootholdId = 0;
  /** OG CNpcTemplate data — category, shop ID, quest conditions */
  _info: { Category?: number; ShopId?: number } | null = null;
  // OG: NPC name tag is BELOW the NPC (positive Y), not above like characters
  // HeadY is the NPC's head position relative to origin (negative = above origin)
  // Name tag goes BELOW the NPC feet, so we use a positive Y offset
  readonly HeadY = 10; // below NPC feet
  /** OG: entity layer assignment — derived from foothold layer at spawn */
  Layer = 7;

  // Cached display objects
  private _bodySprite: Sprite | null = null;
  private _placeholderGfx: Graphics | null = null;
  private _nameTagContainer: Container | null = null;
  private _nameText: Text | null = null;
  private _funcText: Text | null = null;
  // Dirty tracking
  private _lastState = '';
  private _lastFrame = -1;
  private _lastFacing = false;

  constructor(public readonly NpcId: number) {}

  get NpcIdValue(): number { return this.NpcId; }

  /** Returns the loaded animation map (key = animation name, value = frames) */
  get Animations(): Map<string, { sprite: WzSprite; delayMs: number }[]> { return this._anims; }

  /** Retry name/function resolution from String.wz. Safe to call multiple times. */
  LoadNames(textOf: (npcId: number, key: string) => string | undefined): void {
    const name = textOf(this.NpcId, 'name');
    const func = textOf(this.NpcId, 'func');
    if (!this.Name && name) this.Name = name;
    if (func) this.FuncName = func;
  }

  Load(loader: WzTextureLoader, npcWz: WzPackage | null, textOf?: (npcId: number, key: string) => string | undefined): void {
    if (npcWz === null) return;

    const strid = `${this.NpcId.toString().padStart(7, '0')}.img`;
    const item = npcWz.GetItem(strid);
    const npcRoot = item instanceof WzImage ? item.Root : null;
    if (!npcRoot) return;

    let resolvedRoot: WzProperty | null = npcRoot;

    if (npcRoot.Get('info') instanceof WzProperty) {
      const info = npcRoot.Get('info') as WzProperty;
      const name = info.Get('name');
      if (typeof name === 'string') this.Name = name;
      this.ShowNameTag = this._readBool(info.Get('hideName')) !== true;
      const link = info.Get('link');
      if (typeof link === 'number') {
        const linkId = link;
        const linkStrid = `${linkId.toString().padStart(7, '0')}.img`;
        const linkItem = npcWz.GetItem(linkStrid);
        const linkRoot = linkItem instanceof WzImage ? linkItem.Root : null;
        if (linkRoot) resolvedRoot = linkRoot;
      }
    }

    for (const [key, value] of Object.entries((resolvedRoot ?? npcRoot).Items)) {
      if (!(value instanceof WzProperty)) continue;
      if (key === 'info') continue;

      const frames: { sprite: WzSprite; delayMs: number }[] = [];
      let fi = 0;
      while (true) {
        const raw = (value as WzProperty).Get(`${fi}`);
        if (raw === null) break;

        let delay: number;
        let sprite: WzSprite | null = null;

        if (raw instanceof WzCanvas) {
          delay = this._readDelayFromCanvas(raw) || 150;
          sprite = loader.Load(raw);
        } else if (raw instanceof WzProperty) {
          delay = this._readDelay(raw);
          sprite = this._loadFrame(loader, raw);
        } else break;

        if (sprite) frames.push({ sprite, delayMs: delay });
        fi++;
      }

      if (frames.length > 0) {
        this._anims.set(key, frames);
        if (!this._anims.has(this._state)) this._state = key;
      }
    }

    // TODO_AUDIT.md Hundred-and-eighty-second pass: OG stores NPC speak
    // entries as labels (n0/n1) under Npc.wz, then resolves them through
    // StringPool(0x6AC) => String/Npc.img/<template>/<label> in
    // CNpcTemplate::GetChatMessageList (0x67B670).
    const speakRoot = npcRoot.Get('speak');
    if (speakRoot instanceof WzProperty) {
      this._collectStrings(speakRoot, this._speak, textOf);
    }
    // Fallback: resolve name/function from String/Npc.img. OG draws these as
    // separate CLife::MakeNameTag layers (types 1001 and 1002), not one
    // combined "name : func" string.
    if (textOf) {
      const name = textOf(this.NpcId, 'name');
      const func = textOf(this.NpcId, 'func');
      if (!this.Name && name) this.Name = name;
      if (func) this.FuncName = func;
    }
    this._loaded = this._anims.size > 0;
    // OG: build action name list from animation keys (excluding 'info', 'speak')
    this._actionNames = [];
    for (const key of this._anims.keys()) {
      if (key !== 'info' && key !== 'speak') this._actionNames.push(key);
    }
  }

  GetRandomSpeech(): string | null {
    if (this._speak.length > 0) {
      return this._speak[Math.floor(Math.random() * this._speak.length)];
    }
    // OG fallback: NPCs with no WZ speak entries show a random generic greeting.
    // These match common idle-chat phrases from the v95 StringPool (IDs 0x1A2F-0x1A36).
    return GENERIC_GREETINGS[Math.floor(Math.random() * GENERIC_GREETINGS.length)];
  }

  private _collectStrings(node: WzProperty, out: string[], textOf?: (npcId: number, key: string) => string | undefined): void {
    for (const v of Object.values(node.Items)) {
      if (typeof v === 'string') {
        out.push(textOf?.(this.NpcId, v) ?? v);
      } else if (v instanceof WzProperty) {
        this._collectStrings(v, out, textOf);
      }
    }
  }

  Update(dt: number): void {
    // OG CNpc::Update (0x677b50) — runs on a fixed 30ms tick
    // Guard: OG checks m_bEnabled before processing
    if (!this._bEnabled) return;

    if (this._replay.Update(dt, this.Position)) this.SetState('move');

    // OG: both timers decrement by 30 per tick (fixed 30ms tick).
    // dt is in seconds — convert to ms for timer math.
    const dtMs = dt * 1000;

    // OG: m_tWaitTimeForNextActionOrChat -= 30
    if (this._waitTimeForNextAction > 0) {
      this._waitTimeForNextAction = Math.max(0, this._waitTimeForNextAction - dtMs);
    }

    // OG: CChatBalloon::CheckTimeOut — decrement speech timer
    if (this._speechTimer > 0) {
      this._speechTimer = Math.max(0, this._speechTimer - dtMs);
      if (this._speechTimer <= 0) this._currentSpeech = '';
    }

    // OG: DoActionOrChat — when wait timer expires and no one-time action playing,
    // pick a random action/chat and send NpcMoveRequest to server.
    if (this._waitTimeForNextAction <= 0 && this._nOneTimeAction <= -1 && !this._currentSpeech) {
      const result = this.DoActionOrChat();
      if (result.action !== -1 || result.chatIdx !== -1) {
        if (this.onDoActionOrChat) {
          this.onDoActionOrChat(this.ObjId, result.action, result.chatIdx);
        }
      }
    }

    // OG: frame animation — m_tFrameDelay -= 30 (per tick, ~30ms real time)
    const isOneTime = this._nOneTimeAction > -1;
    const frames = this._anims.get(this._state);
    if (frames && frames.length > 0) {
      this._tFrameDelay -= dtMs;
      if (this._tFrameDelay <= 0) {
        const nextIdx = this._actionFrameIdx + 1;
        if (nextIdx >= frames.length) {
          if (isOneTime) {
            this._nOneTimeAction = -1;
            this._bSpecialAction = false;
            this.PrepareActionLayer();
            return;
          }
          this._actionFrameIdx = 0;
        } else {
          this._actionFrameIdx = nextIdx;
        }
        this._tFrameDelay = frames[this._actionFrameIdx].delayMs || 150;
        this._frame = this._actionFrameIdx;
      }
    }

    // OG: _GetSnapshot — position sync happens in GameStage via physics update

    // Only rebuild when state, frame, or facing changed
    if (this._state !== this._lastState || this._frame !== this._lastFrame || this._facingLeft !== this._lastFacing) {
      this._lastState = this._state;
      this._lastFrame = this._frame;
      this._lastFacing = this._facingLeft;
      this._rebuildDisplay();
    }
  }

  ReplayMove(path: DecodedMovePath): void {
    this._replay.SetPath(path, this.Position);
    // CMovePath elements carry the action state used by the original
    // CVecCtrlNpc replay. Apply the first state immediately; subsequent
    // positions remain packet-driven through RemoteMoveReplay.
    const first = path.elements[0];
    if (first) {
      if (first.fh !== 0) this.FootholdId = first.fh;
      this.SetMoveAction(first.moveAction, false);
    }
    this.SetState('move');
  }

  SetFootholds(footholds: readonly Foothold[]): void { this._replay.SetFootholds(footholds); }

  SetState(state: string): void {
    if (this._anims.has(state) && state !== this._state) {
      this._state = state;
      this._frame = 0;
      this._actionFrameIdx = 0;
      // OG: PrepareActionLayer resets frame delay — first frame shows for its WZ delay
      const frames = this._anims.get(state);
      this._tFrameDelay = frames?.[0]?.delayMs || 150;
    }
  }

  FaceLeft(left: boolean): void {
    this._facingLeft = left;
  }

  /** World-space hit test against the current frame's sprite bounds (falls back to the 40x70 placeholder box). */
  HitTest(worldX: number, worldY: number): boolean {
    const frames = this._anims.get(this._state);
    const frame = frames?.[Math.min(this._frame, frames.length - 1)];
    const halfW = frame ? frame.sprite.OriginX : 20;
    const top = frame ? -frame.sprite.OriginY : -70;
    const bottom = frame ? frame.sprite.Height - frame.sprite.OriginY : 0;
    const left = -halfW;
    const right = frame ? frame.sprite.Width - halfW : 20;
    const dx = worldX - this.Position.x;
    const dy = worldY - this.Position.y;
    return dx >= left && dx < right && dy >= top && dy < bottom;
  }

  private _rebuildDisplay(): void {
    this.container.removeChildren();

    if (!this._loaded) {
      this._addPlaceholder();
      return;
    }

    const frames = this._anims.get(this._state);
    if (!frames || frames.length === 0) {
      this._addPlaceholder();
      return;
    }

    const { sprite } = frames[Math.min(this._frame, frames.length - 1)];
    if (!this._bodySprite) {
      this._bodySprite = new Sprite(sprite.Texture);
      this._bodySprite.anchor.set(
        sprite.Width > 0 ? sprite.OriginX / sprite.Width : 0,
        sprite.Height > 0 ? sprite.OriginY / sprite.Height : 0,
      );
    } else {
      this._bodySprite.texture = sprite.Texture;
    }
    // OG: put_flip(nDir == 0) — WZ sprites face LEFT by default;
    // flip (scale.x=-1) makes them face RIGHT; no flip keeps LEFT.
    // _facingLeft=true → should face LEFT → no flip → scale.x=1
    // _facingLeft=false → should face RIGHT → flip → scale.x=-1
    this._bodySprite.scale.x = this._facingLeft ? 1 : -1;
    this.container.addChild(this._bodySprite);
    this._addNameTags();
    this._drawSpeechBubble();
  }

  drawFrameOnly(parent: Container, screenX: number, screenY: number, flip = false): void {
    if (!this._loaded) {
      const gfx = new Graphics();
      gfx.rect(-20, -70, 40, 70).fill({ color: 0x503c64, alpha: 0.78 });
      gfx.rect(-15, -86, 30, 16).fill({ color: 0xdcb48c, alpha: 0.78 });
      gfx.position.set(screenX, screenY);
      parent.addChild(gfx);
      return;
    }
    const frames = this._anims.get(this._state);
    if (!frames || frames.length === 0) return;
    const { sprite } = frames[Math.min(this._frame, frames.length - 1)];
    const pixi = sprite.ToPixi(flip);
    pixi.position.set(screenX, screenY);
    parent.addChild(pixi);
  }

  private _addPlaceholder(): void {
    if (!this._placeholderGfx) {
      this._placeholderGfx = new Graphics();
      this._placeholderGfx.rect(-20, -70, 40, 70).fill({ color: 0x503c64, alpha: 0.78 });
      this._placeholderGfx.rect(-15, -86, 30, 16).fill({ color: 0xdcb48c, alpha: 0.78 });
    }
    this.container.addChild(this._placeholderGfx);
  }

  private _addNameTags(): void {
    if (!this.ShowNameTag) return;
    if (!this._nameTagContainer) this._nameTagContainer = new Container();
    this._nameTagContainer.removeChildren();

    // OG: name tag goes below NPC feet. Feet = sprite bottom = Height - OriginY.
    const frames = this._anims.get(this._state);
    const frame = frames?.[Math.min(this._frame, frames.length - 1)];
    const feetY = frame ? (frame.sprite.Height - frame.sprite.OriginY) : 70;
    let y = feetY + 10; // padding below feet
    if (this.Name) {
      if (!this._nameText) {
        this._nameText = new Text({ text: this.Name, style: { fontFamily: 'Arial', fontSize: 12, fill: 0xffcc00 } });
      } else {
        this._nameText.text = this.Name;
      }
      const w = Math.ceil(this._nameText.width) + 8;
      const h = 18;
      const bg = new Graphics();
      bg.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.6 });
      this._nameText.x = 4;
      this._nameText.y = 2;
      this._nameTagContainer.addChild(bg, this._nameText);
      this._nameTagContainer.pivot.set(w / 2, h);
      this._nameTagContainer.position.set(0, y);
      this.container.addChild(this._nameTagContainer);
      y -= h + 1;
    }
    if (this.FuncName) {
      const funcTag = this._makeNameTag(this.FuncName);
      funcTag.position.set(0, y);
      this.container.addChild(funcTag);
    }
  }

  private _makeNameTag(label: string): Container {
    const tag = new Container();
    const text = new Text({ text: label, style: {
      fontFamily: 'Arial',
      fontSize: 12,
      fill: 0xffcc00,
    } });
    const w = Math.ceil(text.width) + 8;
    const h = 18;
    const bg = new Graphics();
    bg.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.6 });
    text.x = 4;
    text.y = 2;
    tag.addChild(bg, text);
    tag.pivot.set(w / 2, h);
    return tag;
  }

  private _drawSpeechBubble(): void {
    if (!this._currentSpeech || this._speechTimer <= 0) return;
    const bubbleW = 140;
    const pad = 6;
    if (!this._speechLabel) {
      this._speechLabel = new Text({ text: this._currentSpeech, style: { fontSize: 11, fill: '#ffffff', wordWrap: true, wordWrapWidth: bubbleW - pad * 2 } });
      this._speechLabel.anchor.set(0.5, 0);
    } else {
      this._speechLabel.text = this._currentSpeech;
    }
    const boxH = Math.max(this._speechLabel.height + pad * 2, 24);
    // OG: uses m_ptBalloonOffset for Y positioning, above the NPC head
    const frames = this._anims.get(this._state);
    const frame = frames?.[Math.min(this._frame, frames.length - 1)];
    const headY = frame ? -frame.sprite.OriginY : -70;
    const boxY = headY - boxH - 4 + this._ptBalloonOffset.y;
    if (!this._speechBg) this._speechBg = new Graphics();
    this._speechBg.clear();
    this._speechBg.roundRect(-bubbleW / 2, boxY, bubbleW, boxH, 4).fill({ color: 0x000000, alpha: 0.75 });
    this._speechBg.roundRect(-bubbleW / 2, boxY + boxH - 4, 10, 8, 2).fill({ color: 0x000000, alpha: 0.75 });
    this._speechLabel.y = boxY + pad;
    this.container.addChild(this._speechBg, this._speechLabel);
  }

  private _loadFrame(loader: WzTextureLoader, frameNode: WzProperty): WzSprite | null {
    for (const [, v] of Object.entries(frameNode.Items)) {
      if (v instanceof WzCanvas) return loader.Load(v);
    }
    return null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // OG CNpc methods — added from IDA decompilation
  // ──────────────────────────────────────────────────────────────────────────

  /** OG CNpc::GetCurrentAction (0x670240) — returns current move action + direction */
  GetCurrentAction(pnDir?: { value: number }): number {
    // OG: returns m_nMoveAction, sets *pnDir to direction bit
    if (pnDir) pnDir.value = this._facingLeft ? 1 : 0;
    return this._nMoveAction;
  }

  /** OG CNpc::SetActive (0x6710b0) — activates/deactivates NPC vector controller */
  SetActive(bActive: boolean): void {
    this._bEnabled = bActive;
    if (bActive) {
      // OG: activate m_pvcActive with position/foothold from m_pvc
      // OG: m_bMovePathSent = 0
      this._movePathSent = false;
      // OG: m_tWaitTimeForNextActionOrChat = rand() % 6000 + 3000
      this._waitTimeForNextAction = Math.floor(Math.random() * 6000) + 3000;
    } else {
      // OG: deactivate m_pvcActive with all zeros
    }
  }

  /** OG CNpc::SetLayerZ (0x66fed0) — z = 10 * (3000 * y - footholdY) - 1073711829 */
  SetLayerZ(footholdY?: number): void {
    const y = this.Position.y;
    const fhY = footholdY ?? y;
    const z = 10 * (3000 * y - fhY) - 1073711829;
    this.container.zIndex = z;
    // OG: if m_pImitatedLook, CAvatar::SetLayerZ(z) — handled by GameStage
  }

  /** OG CNpc::SetMoveAction (0x671280) — sets NPC move action from index */
  SetMoveAction(nMA: number, bReload: boolean): void {
    // OG: if bReload or nMA changed, update and call PrepareActionLayer
    if (bReload || nMA !== this._nMoveAction) {
      this._nMoveAction = nMA;
      this._facingLeft = (nMA & 1) !== 0;
      // OG: only call PrepareActionLayer if no one-time action is playing
      if (this._nOneTimeAction <= -1) {
        this.PrepareActionLayer();
      }
    }
  }

  /** OG CNpc::ViewOrHide (0x66fe00) — shows/hides NPC, DC mark, quest info, name tag */
  ViewOrHide(bView: boolean, bViewNameTag: boolean): void {
    this._bHideToLocalUser = !bView;
    this.container.visible = bView;
    // OG: also hides m_pLayerDcMark and m_pLayerQuestInfo
    // In our TS: these are sub-containers within the main container
    this.ShowNameTag = bViewNameTag;
    // CLife::ShowNameTag controls name tag visibility
  }

  /** OG CNpc::PrepareActionLayer (0x670580) — sets up action frame list and flip */
  PrepareActionLayer(): void {
    // OG: if m_dwImitate, delegate to CAvatar::PrepareActionLayer(6, 100, 0)
    if (this._imitatedLook) {
      return;
    }
    // OG: if !m_bEnabled, remove all canvases from layer
    if (!this._bEnabled) {
      this.container.visible = false;
      return;
    }
    // OG: GetCurrentAction → GetActionFrameList → InsertCanvas loop
    this._actionFrameIdx = 0;
    this._frame = 0;
    // OG: frame delay reset — first frame shows for its WZ delay
    const frames = this._anims.get(this._state);
    this._tFrameDelay = frames?.[0]?.delayMs || 150;
    // Reset to stand if available
    if (this._anims.has('stand')) {
      this._state = 'stand';
    }
    this._rebuildDisplay();
  }

  /** OG CNpc::OnChat (0x675520) — shows chat balloon above NPC */
  OnChat(chatIdx: number): void {
    // OG: skip if disabled, hidden, or quest info layer visible
    if (!this._bEnabled || this._bHideToLocalUser) return;

    const speech = this._speak;
    if (chatIdx >= 0 && chatIdx < speech.length) {
      let text = speech[chatIdx];
      // OG: replace "{NAME}" with template name for imitated NPCs
      if (text.includes('{NAME}') && this.Name) {
        text = text.replace('{NAME}', this.Name);
      }
      this._currentSpeech = text;
      // OG: CChatBalloon::MakeBalloon timeout = 5000ms
      this._speechTimer = 5;
    }
  }

  /** OG CNpc::SetMapleTVMessage — sets MapleTV message from server */
  SetMapleTVMessage(_message?: string): void {
    // OG: reads MapleTV template from WZ and sets message
    // Simplified: store for display
  }

  /** OG CNpc::DrawMapleTVMessage — draws MapleTV message above NPC */
  DrawMapleTVMessage(): void {
    // OG: renders MapleTV message bubble above NPC
    // Simplified: no-op until MapleTV WZ data is wired
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 2: Quest System (from IDA decompilation)
  // ──────────────────────────────────────────────────────────────────────────

  /** OG CNpc::SetQuestList (0x671980) — sets quest list from server */
  SetQuestList(bClear: boolean | number[]): void {
    // OG: when called with 0 (false), clears quest info layer
    // when called with quest list, populates quest icons
    if (typeof bClear === 'boolean') {
      if (!bClear) {
        // OG: clear quest list and hide quest info layer
        this._questList = [];
        this._questInfoVisible = false;
      }
    } else {
      this._questList = bClear;
      this._questInfoVisible = bClear.length > 0;
    }
  }

  /** OG CNpc::ShowQuestList (0x672b50) — renders quest icons above NPC */
  ShowQuestList(): void {
    // OG: renders quest exclamation/question marks above NPC
    // Quest icons are loaded from Quest.wz and positioned above the NPC
    // In our TS: GameStage reads questList to decide icon rendering
  }

  /** OG CNpc::SetAcceptQuestOnlyOne (0x672010) — sets quest acceptance mode */
  SetAcceptQuestOnlyOne(nQuestId: number): void {
    // OG: when set, NPC only shows one quest at a time
    // The quest ID restricts which quest dialog is shown
    this._acceptQuestOnlyOne = nQuestId;
  }

  /** OG CNpc::SetCompletedQuestOnlyOne (0x6724f0) — sets quest completion mode */
  SetCompletedQuestOnlyOne(nQuestId: number): void {
    // OG: when set, NPC only shows one quest completion at a time
    this._completedQuestOnlyOne = nQuestId;
  }

  /** Get quest list for external rendering (GameStage) */
  get QuestList(): number[] { return this._questList; }
  /** Whether quest info layer is visible */
  get QuestInfoVisible(): boolean { return this._questInfoVisible; }

  /** OG CNpc::GenerateMovePath — server-controlled, no-op on client */
  GenerateMovePath(_nAction: number, _nChatIdx: number): void {
    // OG: client sends NpcMove with move path blob. Server drives NPC movement.
  }

  /** Maps actionIdx to WZ animation name (actionIdx-2 = array position) */
  _getActionName(actionIdx: number): string | null {
    const arrayIdx = actionIdx - 2;
    if (arrayIdx >= 0 && arrayIdx < this._actionNames.length) {
      return this._actionNames[arrayIdx];
    }
    return null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 1: Core Action System (from IDA decompilation)
  // ──────────────────────────────────────────────────────────────────────────

  /** OG CNpc::GetActionFrameList (0x670140) — returns frame list for action */
  GetActionFrameList(nAction: number): { sprite: WzSprite; delayMs: number }[] | null {
    // OG: maps nAction to animation name via template action list
    const animName = this._getActionName(nAction);
    if (!animName) return null;
    return this._anims.get(animName) ?? null;
  }

  /** OG CNpc::IsOnPlayingOneTimeAction (0x670210) — checks if one-time action is playing */
  IsOnPlayingOneTimeAction(): boolean {
    // OG: returns m_nOneTimeAction > -1
    return this._nOneTimeAction > -1;
  }

  /** OG CNpc::SetClientActionByQuest (0x671020) — sets client action by quest state */
  SetClientActionByQuest(): void {
    // OG: iterates quest conditions in template, sets m_nClientActionIdx
    // when a quest condition matches the player's quest state.
    // This affects which action set is used for chat/action selection.
    // In our simplified TS: no-op until full quest condition system is wired
  }

  /** OG CNpc::OnSetSpecialAction (0x6750f0) — handles special action from server */
  OnSetSpecialAction(actionName: string): void {
    // OG: loads action from WZ by name, sets m_bSpecialAction and m_nOneTimeAction
    if (this._anims.has(actionName)) {
      this._bSpecialAction = true;
      // Map action name to action index
      const idx = this._actionNames.indexOf(actionName);
      if (idx >= 0) {
        this._nOneTimeAction = idx + 2; // OG convention: actions start at index 2
      }
      this.SetState(actionName);
    }
  }

  /** OG: SetBalloonOffset — special balloon offset for certain NPCs */
  SetBalloonOffset(x: number, y: number): void {
    this._ptBalloonOffset.x = x;
    this._ptBalloonOffset.y = y;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 3: Visual/Effect System (from IDA decompilation)
  // ──────────────────────────────────────────────────────────────────────────

  /** OG CNpc::SetImitatedLook (0x6729d0) — sets NPC imitated appearance (player disguise) */
  SetImitatedLook(avatarLook?: unknown): void {
    // OG: loads AvatarLook and prepares action layer for imitated appearance
    // When m_pImitatedLook is set, the NPC renders as a player character
    // instead of using its own NPC sprite
    this._imitatedLook = avatarLook ?? null;
    if (this._imitatedLook) {
      // OG: PrepareActionLayer(6, 100, 0) — action 6 = stand, 100 = speed
      // In our TS: mark as imitated, GameStage handles avatar rendering
    }
  }

  /** OG CNpc::RestoreLayers (0x6751d0) — restores NPC visual layers after hide/show */
  RestoreLayers(): void {
    // OG: restores m_pLayerAction, m_pLayerDcMark, m_pLayerQuestInfo visibility
    // and re-attaches them to the parent layer
    this.container.visible = true;
    this._bHideToLocalUser = false;
    this._rebuildDisplay();
  }

  /** OG CNpc::OnUpdateLimitedInfo (0x676340) — toggles NPC enabled/disabled state */
  OnUpdateLimitedInfo(enabled: boolean): void {
    // OG: when disabled, NPC becomes invisible and stops updating
    // when enabled, NPC resumes normal behavior
    this._bEnabled = enabled;
    this._bHideToLocalUser = !enabled;
    this.container.visible = enabled;
  }

  /** OG CNpc::RequestSpecialAction (0x673bc0) — sends special action request to server */
  RequestSpecialAction(actionName: string): void {
    // OG: sends NpcActionRequest packet to server with action name
    // Server responds with OnSetSpecialAction to play the animation
    // Store the request for potential client-side prediction
    this._pendingSpecialAction = actionName;
  }

  /** OG CNpc::UpdateScript (0x66fd50) — updates NPC script state from system time */
  UpdateScript(_systemTime?: unknown): void {
    // OG: checks time-based script conditions for NPC dialog
    // Requires SYSTEMTIME-based condition checking — deferred
  }

  /** OG CNpc::GetShoeAttr — returns shoe attribute (field effect) */
  GetShoeAttr(): unknown {
    return this._shoeAttr;
  }

  /** OG CNpc::SetShoeAttr (0x671180) — sets shoe attribute (field effect) */
  SetShoeAttr(attr?: unknown): void {
    // OG: applies field-specific movement effects (e.g. ice physics)
    this._shoeAttr = attr ?? null;
  }

  /** OG CNpc::GetType — returns NPC type from template */
  GetType(): number {
    return this._info?.Category ?? 0;
  }

  /** OG CNpc::GetZMass — returns Z mass for draw ordering */
  GetZMass(): number {
    return this.Position.y;
  }

  /** OG CNpc::GetDCRange — returns DC (disconnect) range */
  GetDCRange(): { left: number; top: number; right: number; bottom: number } {
    return { left: -100, top: -100, right: 100, bottom: 100 };
  }

  /** OG CNpc::GetQuestDCRange — returns quest DC range */
  GetQuestDCRange(): { left: number; top: number; right: number; bottom: number } {
    return { left: -150, top: -150, right: 150, bottom: 150 };
  }

  /** OG CNpc::DoActionOrChat (0x6702b0) — randomly selects action or chat from template */
  DoActionOrChat(): { action: number; chatIdx: number } {
    // OG: if wait time > 0 or chat balloon showing or one-time action playing, skip
    if (this._waitTimeForNextAction > 0) return { action: -1, chatIdx: -1 };
    if (this._nOneTimeAction > -1) return { action: -1, chatIdx: -1 };
    // OG: set wait time to rand() % 6000 + 3000 (3-9 seconds)
    this._waitTimeForNextAction = Math.floor(Math.random() * 6000) + 3000;
    // OG: total = regularActionCount + chatCount
    // Regular actions exclude special actions (nSpecialAct offset)
    const regularActionCount = this._actionNames.length;
    const chatCount = this._speak.length;
    const total = regularActionCount + chatCount;
    if (total === 0) return { action: -1, chatIdx: -1 };
    // OG: idx = rand() % 50 % total
    const idx = Math.floor(Math.random() * 50) % total;
    if (idx < regularActionCount) {
      // It's an action — action index = idx + 2 (OG convention: 0=stand, 1=chat, 2+=actions)
      const actionIdx = idx + 2;
      // If this action has associated chat entries, pick one randomly
      const chatForAction = this._actionChatMap.get(actionIdx);
      const chatIdx = chatForAction && chatForAction.length > 0
        ? Math.floor(Math.random() * chatForAction.length)
        : -1;
      return { action: actionIdx, chatIdx };
    } else {
      // It's a chat entry — chatIdx = idx - regularActionCount
      return { action: -1, chatIdx: idx - regularActionCount };
    }
  }

  // ── Private fields for CNpc ──────────────────────────────────────────────

  private _waitTimeForNextAction = 0;
  private _movePathSent = false;
  private _bHideToLocalUser = false;
  /** OG: m_bEnabled — NPC enabled state (0 = disabled, 1 = active) */
  private _bEnabled = true;
  /** OG: m_pImitatedLook — player-disguised NPC avatar (null = not imitated) */
  private _imitatedLook: unknown | null = null;
  /** OG: m_pPendingSpecialAction — pending special action request */
  private _pendingSpecialAction: string | null = null;
  /** OG: m_pShoeAttr — field shoe attribute (ice physics etc.) */
  private _shoeAttr: unknown | null = null;
  private _mapleTVMessage = '';
  private _questList: number[] = [];
  /** OG: m_bQuestInfoVisible — quest info layer visibility */
  private _questInfoVisible = false;
  /** OG: m_nAcceptQuestOnlyOne — restricts to one quest acceptance */
  private _acceptQuestOnlyOne = 0;
  /** OG: m_nCompletedQuestOnlyOne — restricts to one quest completion */
  private _completedQuestOnlyOne = 0;
  private _currentSpeech = '';
  private _tFrameDelay = 0;
  private _nOneTimeAction = -1;
  private _bSpecialAction = false;
  private _actionFrameIdx = 0;
  /** OG: m_nMoveAction — stored move action value (>>1 = action index, &1 = direction) */
  private _nMoveAction = 0;
  /** OG: m_nClientActionIdx — client action index for quest-based actions */
  private _nClientActionIdx = -1;
  /** OG: m_ptBalloonOffset — balloon position offset (NPC 1300000 uses y=-20) */
  private _ptBalloonOffset = { x: 0, y: 0 };
  /** OG: template action names (e.g. "walk", "sit") — indexed by actionIdx-2 */
  private _actionNames: string[] = [];
  /** OG: per-action chat entries — key = actionIdx, value = chat string indices */
  private _actionChatMap = new Map<number, string[]>();
  private _speechTimer = 0;
  private _speechBg: Graphics | null = null;
  private _speechLabel: Text | null = null;
  /** OG: callback fired when DoActionOrChat picks an action — GameStage wires this to send NpcMoveRequest */
  onDoActionOrChat: ((objectId: number, action: number, chatIdx: number) => void) | null = null;

  private _readDelay(node: WzProperty): number {
    const v = node.Get('delay');
    if (typeof v === 'number') return v;
    if (typeof v === 'bigint') return Number(v);
    return 150;
  }

  private _readDelayFromCanvas(canvas: WzCanvas): number {
    // NX/WZ canvas stores delay as a child property of the canvas node
    try {
      const prop = (canvas as any).Property;
      if (prop && typeof prop.Get === 'function') {
        const v = prop.Get('delay');
        if (typeof v === 'number') return v;
        if (typeof v === 'bigint') return Number(v);
      }
    } catch { /* ignore */ }
    return 150;
  }

  private _readBool(v: unknown): boolean | null {
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'bigint') return v !== 0n;
    if (typeof v === 'boolean') return v;
    return null;
  }
}
