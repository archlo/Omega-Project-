import { Container, Sprite, Graphics, Text } from 'pixi.js';
import { WzSprite } from '../render/WzSprite.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzProperty } from '../wz/WzProperty.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { WzImage } from '../wz/WzImage.js';

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

  readonly container = new Container();
  Position = { x: 0, y: 0 };
  Name = '';
  FuncName = '';
  ShowNameTag = true;
  ObjId = 0;
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
          delay = 150;
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
    // OG CNpc::Update — decrement wait timer by ~30ms per frame
    if (this._waitTimeForNextAction > 0) {
      this._waitTimeForNextAction = Math.max(0, this._waitTimeForNextAction - dt * 1000);
    }
    // Decrement speech timer
    if (this._speechTimer > 0) {
      this._speechTimer = Math.max(0, this._speechTimer - dt);
      if (this._speechTimer <= 0) this._currentSpeech = '';
    }
    // OG: advance frame animation
    const frames = this._anims.get(this._state);
    if (frames && frames.length > 0) {
      this._tFrameDelay -= dt * 1000;
      if (this._tFrameDelay <= 0) {
        this._actionFrameIdx = (this._actionFrameIdx + 1) % frames.length;
        this._tFrameDelay = frames[this._actionFrameIdx].delayMs || 150;
        this._frame = this._actionFrameIdx;
      }
    }
    // Only rebuild when state, frame, or facing changed
    if (this._state !== this._lastState || this._frame !== this._lastFrame || this._facingLeft !== this._lastFacing) {
      this._lastState = this._state;
      this._lastFrame = this._frame;
      this._lastFacing = this._facingLeft;
      this._rebuildDisplay();
    }
  }

  SetState(state: string): void {
    if (this._anims.has(state) && state !== this._state) {
      this._state = state;
      this._frame = 0;
      this._frameTimer = 0;
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
    const left = frame ? -halfW : -20;
    const right = frame ? frame.sprite.Width - halfW : 20;
    const top = frame ? -frame.sprite.OriginY : -70;
    const bottom = frame ? frame.sprite.Height - frame.sprite.OriginY : 0;
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
    this._bodySprite.scale.x = this._facingLeft ? -1 : 1;
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

    // Position below NPC feet (positive Y = below origin in screen coords)
    let y = this.HeadY;
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
    const boxY = -70 - boxH;
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

  /** OG CNpc::GetCurrentAction — returns current move action + direction */
  GetCurrentAction(pnDir?: { value: number }): number {
    if (pnDir) pnDir.value = this._facingLeft ? 1 : 0;
    // OG: returns (moveAction << 1) | direction
    const actionIdx = this._actionNames.indexOf(this._state);
    return ((actionIdx >= 0 ? actionIdx : 0) << 1) | (this._facingLeft ? 1 : 0);
  }

  /** OG CNpc::SetActive — activates/deactivates NPC vector controller */
  SetActive(bActive: boolean): void {
    // OG: activates physics controller, sets random wait time
    if (bActive) {
      this._waitTimeForNextAction = Math.floor(Math.random() * 6000) + 3000;
      this._movePathSent = false;
    }
  }

  /** OG CNpc::SetLayerZ — z = 10 * (3000 * y - footholdY) - 1073711829 */
  SetLayerZ(footholdY?: number): void {
    const y = this.Position.y;
    const fhY = footholdY ?? y;
    const z = 10 * (3000 * y - fhY) - 1073711829;
    this.container.zIndex = z;
  }

  /** OG CNpc::SetMoveAction — sets NPC move action from index */
  SetMoveAction(nMA: number, _bReload: boolean): void {
    // OG: nMA >> 1 determines special state (2 = special action)
    this._facingLeft = (nMA & 1) !== 0;
    // Map action index to animation state name
    const actionIdx = nMA >> 1;
    if (actionIdx >= 0 && actionIdx < this._actionNames.length) {
      this.SetState(this._actionNames[actionIdx]);
    }
  }

  /** OG CNpc::ViewOrHide — shows/hides NPC and name tag */
  ViewOrHide(bView: boolean, bViewNameTag: boolean): void {
    this._bHideToLocalUser = !bView;
    this.container.visible = bView;
    this.ShowNameTag = bViewNameTag;
  }

  /** OG CNpc::PrepareActionLayer — resets frame list and sets flip from direction */
  PrepareActionLayer(): void {
    // OG: gets current action frame list, clears layer, inserts canvases, sets flip
    // In our TS: reset frame index and rebuild display for current state
    this._actionFrameIdx = 0;
    this._frame = 0;
    this._tFrameDelay = 0;
    this._rebuildDisplay();
  }

  /** OG CNpc::RestoreLayers — restores NPC visual layers after hide/show */
  RestoreLayers(): void {
    this.container.visible = true;
    this._rebuildDisplay();
  }

  /** OG CNpc::OnChat — shows chat balloon above NPC */
  OnChat(chatIdx: number): void {
    const speech = this._speak;
    if (chatIdx >= 0 && chatIdx < speech.length) {
      this._currentSpeech = speech[chatIdx];
      this._speechTimer = 4; // show for 4 seconds
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

  /** OG CNpc::SetQuestList — sets quest list from server */
  SetQuestList(quests: number[] | boolean): void {
    if (typeof quests === 'boolean') {
      // Overload: single quest flag
      this._questList = quests ? [1] : [];
    } else {
      this._questList = quests;
    }
  }

  /** OG CNpc::ShowQuestList — shows quest list above NPC */
  ShowQuestList(): void {
    // OG: renders quest icons above NPC
    // Simplified: quest list stored, icons rendered by GameStage
  }

  /** OG CNpc::SetAcceptQuestOnlyOne — sets quest acceptance mode */
  SetAcceptQuestOnlyOne(_flag?: number): void {
    // OG: restricts to accepting one quest at a time
  }

  /** OG CNpc::SetCompletedQuestOnlyOne — sets quest completion mode */
  SetCompletedQuestOnlyOne(_flag?: number): void {
    // OG: restricts to completing one quest at a time
  }

  /** OG CNpc::GenerateMovePath — server-controlled, no-op on client */
  GenerateMovePath(_nAction: number, _nChatIdx: number): void {
    // OG: client sends NpcMove with move path blob. Server drives NPC movement.
  }

  /** OG CNpc::SetClientActionByQuest — sets client action by quest state */
  SetClientActionByQuest(): void {
    // OG: checks quest conditions and sets appropriate action
  }

  /** OG CNpc::OnSetSpecialAction — handles special action from server */
  OnSetSpecialAction(actionName: string): void {
    // OG: loads action from WZ by name and sets as one-time action
    if (this._anims.has(actionName)) {
      this.SetState(actionName);
    }
  }

  /** OG CNpc::RequestSpecialAction — sends special action request to server */
  RequestSpecialAction(actionName: string): void {
    // OG: sends NpcActionRequest packet to server
    // Simplified: store for later use
    this._currentSpeech = actionName;
  }

  /** OG CNpc::SetImitatedLook — sets NPC imitated appearance (player disguise) */
  SetImitatedLook(_look?: unknown): void {
    // OG: loads AvatarLook and prepares action layer for imitated appearance
    // Requires full AvatarLook decode — deferred
  }

  /** OG CNpc::UpdateScript — updates NPC script state from system time */
  UpdateScript(_systemTime?: unknown): void {
    // OG: checks time-based script conditions
    // Requires SYSTEMTIME-based condition checking — deferred
  }

  /** OG CNpc::GetShoeAttr — returns shoe attribute (field effect) */
  GetShoeAttr(): unknown {
    return null;
  }

  /** OG CNpc::SetShoeAttr — sets shoe attribute (field effect) */
  SetShoeAttr(_attr?: unknown): void {
    // OG: applies field-specific movement effects (e.g. ice physics)
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

  /** OG CNpc::OnUpdateLimitedInfo — toggles NPC enabled/disabled state */
  OnUpdateLimitedInfo(enabled: boolean): void {
    this._bHideToLocalUser = !enabled;
    this.container.visible = enabled;
  }

  /** OG CNpc::DoActionOrChat — randomly selects action or chat from template */
  DoActionOrChat(): { action: number; chatIdx: number } {
    // OG: if wait time > 0 or chat balloon showing or one-time action playing, skip
    if (this._waitTimeForNextAction > 0) return { action: -1, chatIdx: -1 };
    if (this._nOneTimeAction > -1) return { action: -1, chatIdx: -1 };
    // OG: set wait time to rand() % 6000 + 3000 (3-9 seconds)
    this._waitTimeForNextAction = Math.floor(Math.random() * 6000) + 3000;
    // OG: total = actionCount + chatCount; pick random index
    const actionCount = this._actionNames.length;
    const chatCount = this._speak.length;
    const total = actionCount + chatCount;
    if (total === 0) return { action: -1, chatIdx: -1 };
    const idx = Math.floor(Math.random() * 50) % total;
    if (idx < actionCount) {
      // It's an action — action index = idx + 2 (OG convention)
      const actionIdx = idx + 2;
      // If this action has associated chat entries, pick one randomly
      const chatForAction = this._actionChatMap.get(actionIdx);
      const chatIdx = chatForAction && chatForAction.length > 0
        ? Math.floor(Math.random() * chatForAction.length)
        : -1;
      return { action: actionIdx, chatIdx };
    } else {
      // It's a chat entry
      return { action: -1, chatIdx: idx - actionCount };
    }
  }

  // ── Private fields for CNpc ──────────────────────────────────────────────

  private _waitTimeForNextAction = 0;
  private _movePathSent = false;
  private _bHideToLocalUser = false;
  private _mapleTVMessage = '';
  private _questList: number[] = [];
  private _currentSpeech = '';
  private _tFrameDelay = 0;
  private _nOneTimeAction = -1;
  private _bSpecialAction = false;
  private _actionFrameIdx = 0;
  /** OG: template action names (e.g. "walk", "sit") — indexed by actionIdx-2 */
  private _actionNames: string[] = [];
  /** OG: per-action chat entries — key = actionIdx, value = chat string indices */
  private _actionChatMap = new Map<number, string[]>();
  private _speechTimer = 0;
  private _speechBg: Graphics | null = null;
  private _speechLabel: Text | null = null;

  private _readDelay(node: WzProperty): number {
    const v = node.Get('delay');
    if (typeof v === 'number') return v;
    if (typeof v === 'bigint') return Number(v);
    return 150;
  }

  private _readBool(v: unknown): boolean | null {
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'bigint') return v !== 0n;
    if (typeof v === 'boolean') return v;
    return null;
  }
}
