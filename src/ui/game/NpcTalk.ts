import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { ScriptText, ScriptSubst } from './ScriptText.js';
import { BuiltInFont } from '../BuiltInFont.js';

export enum DialogType { Ok, Next, PrevNext, YesNo, Menu, AskText, AskNumber, Quiz, AskAccept }

// OG key code → display name (subset for #k<code># tag resolution in NPC dialogs)
const _KEY_NAMES: Record<number, string> = {
  8: 'Backspace', 9: 'Tab', 13: 'Enter', 16: 'Shift', 17: 'Ctrl', 18: 'Alt',
  27: 'Escape', 32: 'Space', 33: 'Page Up', 34: 'Page Down', 35: 'End', 36: 'Home',
  37: 'Left', 38: 'Up', 39: 'Right', 40: 'Down', 45: 'Insert', 46: 'Delete',
  112: 'F1', 113: 'F2', 114: 'F3', 115: 'F4', 116: 'F5', 117: 'F6',
  118: 'F7', 119: 'F8', 120: 'F9', 121: 'F10', 122: 'F11', 123: 'F12',
};
function _keyName(code: number): string {
  if (_KEY_NAMES[code]) return _KEY_NAMES[code];
  if (code >= 48 && code <= 57) return String.fromCharCode(code);
  if (code >= 65 && code <= 90) return String.fromCharCode(code);
  return `Key ${code}`;
}

const PANEL_W = 470;
const PANEL_H = 200;
const BTN_Y = PANEL_H - 36;

const _msgStyle = new TextStyle({ fill: '#FFF', fontSize: 11, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: 340 });

export class NpcTalk extends GamePanel {
  onOk: (() => void) | null = null;
  onNext: (() => void) | null = null;
  onPrev: (() => void) | null = null;
  onYes: (() => void) | null = null;
  onNo: (() => void) | null = null;
  onTextConfirm: ((text: string) => void) | null = null;
  onNumberConfirm: ((num: number) => void) | null = null;
  onMenuChoice: ((choice: number) => void) | null = null;

  private _bg: Graphics;
  private _portraitArea: Graphics;
  private _portraitSprite: Graphics | null = null;
  private _msgText: Text;
  private _btnRow: Container;
  private _menuContainer: Container;
  private _inputContainer: Container;
  private _inputText: Text;
  private _inputCursor: Graphics;
  private _inputValue = '';
  private _currentType = DialogType.Ok;
  private _quizTimer = 0;
  private _quizTotalTime = 0;
  private _quizText: Text | null = null;
  private _menuItems: Container[] = [];
  private _pendingQuestId = 0;
  private _pendingNpcId = 0;
  private _pendingX = 0;
  private _pendingY = 0;
  // Real wire `nMsgType` (ScriptMessageType.Say=0 / SayImage=1) of the
  // dialog currently on screen. `CScriptMan::OnSay` (decompile/6DC110.c)
  // answers with a hardcoded `Encode1(0)` for its own msgType byte, but
  // `CScriptMan::OnSayImage` (decompile/6DC310.c) answers with a hardcoded
  // `Encode1(1)` instead — the real client always echoes back the msgType
  // of the message it is responding to (0 for Say, 1 for SayImage), it's
  // just two separate functions each hardcoding their own constant rather
  // than reading the original packet's msgType byte. Tracked here so
  // `onOk`/`onNext` can send the matching value instead of a global 0.
  private _sayMsgType = 0;

  // Name resolution hooks (set by GameStage)
  playerName = '';
  npcName: ((id: number) => string | null) | null = null;
  itemName: ((id: number) => string | null) | null = null;
  mobName: ((id: number) => string | null) | null = null;
  mapName: ((id: number) => string | null) | null = null;
  skillName: ((id: number) => string | null) | null = null;

  constructor() {
    super();
    this._root.visible = false;
    this._root.x = 60;
    this._root.y = 370;

    this._bg = new Graphics();
    this._rebuildBg();
    this._root.addChild(this._bg);

    this._portraitArea = new Graphics();
    this._portraitArea.rect(0, 0, 80, 80).fill({ color: '#1A1C28' });
    this._portraitArea.rect(0, 0, 80, 80).stroke({ color: '#3C4164', width: 1 });
    this._portraitArea.x = 6; this._portraitArea.y = 6;
    this._root.addChild(this._portraitArea);

    this._msgText = new Text({ text: '', style: _msgStyle });
    this._msgText.x = 94; this._msgText.y = 10;
    this._root.addChild(this._msgText);

    this._btnRow = new Container();
    this._btnRow.x = 0;
    this._btnRow.y = BTN_Y;
    this._root.addChild(this._btnRow);

    this._menuContainer = new Container();
    this._menuContainer.x = 94; this._menuContainer.y = 36;
    this._root.addChild(this._menuContainer);

    this._inputContainer = new Container();
    this._inputContainer.visible = false;
    this._inputContainer.x = 94; this._inputContainer.y = 150;

    const inputBg = new Graphics();
    inputBg.rect(0, 0, 260, 18).fill({ color: '#111' });
    inputBg.rect(0, 0, 260, 18).stroke({ color: '#555', width: 1 });
    this._inputContainer.addChild(inputBg);

    this._inputText = new Text({ text: '', style: new TextStyle({ fill: '#FFD', fontSize: 11, fontFamily: 'monospace' }) });
    this._inputText.x = 4; this._inputText.y = 2;
    this._inputContainer.addChild(this._inputText);

    this._inputCursor = new Graphics();
    this._inputCursor.rect(0, 0, 1, 13).fill({ color: '#FFF' });
    this._inputCursor.x = 4; this._inputCursor.y = 3;
    this._inputCursor.visible = false;
    this._inputContainer.addChild(this._inputCursor);

    this._root.addChild(this._inputContainer);
  }

  loadPortrait(npcWz: any, speakerId: number): void {
    if (this._portraitSprite) { this._root.removeChild(this._portraitSprite); this._portraitSprite = null; }
    if (!npcWz || speakerId <= 0) return;
    const idStr = speakerId.toString().padStart(7, '0');
    const img = npcWz.GetItem(`${idStr}.img`);
    if (!img) return;
    const root: any = img.Root ?? img;
    for (const stateName of ['stand', 'walk', 'move', 'idle', 'default']) {
      const stateNode: any = root.Get(stateName);
      if (!stateNode) continue;
      let canvas: any = stateNode.Get('0');
      if (canvas && canvas.Items) {
        for (const [, v] of Object.entries(canvas.Items ?? {})) {
          if ((v as any)?.Items == null) { canvas = v; break; }
        }
      }
      if (!canvas || !canvas.Width) continue;
      const s = new Graphics();
      s.rect(0, 0, canvas.Width ?? 80, canvas.Height ?? 80).fill({ color: '#4A5C7A' });
      s.x = 6; s.y = 6;
      this._root.addChild(s);
      this._portraitSprite = s;
      break;
    }
  }

  show(text: string, type: DialogType = DialogType.Ok, sayMsgType = 0): void {
    this._currentType = type;
    this._sayMsgType = sayMsgType;
    this._msgText.text = this._stripFormats(text);
    this._rebuildButtons(type);
    this._inputContainer.visible = false;
    this._menuContainer.removeChildren();
    this._menuItems = [];
    this.isVisible = true;
    this._root.visible = true;
  }

  /** The real wire msgType (0=Say, 1=SayImage) of the dialog on screen — see `_sayMsgType` above. */
  get sayMsgType() { return this._sayMsgType; }

  showQuiz(text: string, hint: string, min: number, max: number, time: number): void {
    this._currentType = DialogType.Quiz;
    this._msgText.text = this._stripFormats(text);
    this._btnRow.removeChildren();
    this._menuContainer.removeChildren();
    this._menuItems = [];
    this._inputValue = hint;
    this._syncInput();
    this._inputContainer.visible = true;
    this._quizTotalTime = time;
    this._quizTimer = 0;
    if (!this._quizText) {
      this._quizText = new Text({ text: '', style: new TextStyle({ fill: '#F44', fontSize: 10, fontFamily: 'monospace' }) });
      this._quizText.x = PANEL_W - 56; this._quizText.y = BTN_Y;
      this._root.addChild(this._quizText);
    }
    this.isVisible = true;
    this._root.visible = true;
  }

  showMenu(text: string, choices: string[]): void {
    this._currentType = DialogType.Menu;
    this._msgText.text = this._stripFormats(text);
    this._btnRow.removeChildren();
    this._inputContainer.visible = false;
    this._menuContainer.removeChildren();
    this._menuItems = [];

    choices.forEach((ch, i) => {
      const c = new Container();
      const t = new Text({
        text: `${i + 1}. ${ch}`,
        style: new TextStyle({ fill: '#8CF', fontSize: 10, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: 300 }),
      });
      t.x = 0; t.y = i * 18;
      const hit = new Graphics();
      hit.rect(0, i * 18, 300, 18).fill({  color: '#FFF', alpha: 0.01 });
      hit.eventMode = 'static';
      hit.cursor = 'pointer';
      hit.on('pointerdown', () => {
        this.onMenuChoice?.(i);
        this.isVisible = false;
        this._root.visible = false;
      });
      c.addChild(t, hit);
      this._menuContainer.addChild(c);
      this._menuItems.push(c);
    });

    this.isVisible = true;
    this._root.visible = true;
  }

  showAskText(text: string, _default: string, _min: number, _max: number): void {
    this._currentType = DialogType.AskText;
    this._msgText.text = this._stripFormats(text);
    this._rebuildButtons(DialogType.AskText);
    this._inputValue = _default;
    this._syncInput();
    this._inputContainer.visible = true;
    this._menuContainer.removeChildren();
    this._menuItems = [];
    this.isVisible = true;
    this._root.visible = true;
  }

  showAskAccept(text: string, questId: number, npcId: number, x: number, y: number): void {
    this._currentType = DialogType.AskAccept;
    this._pendingQuestId = questId;
    this._pendingNpcId = npcId;
    this._pendingX = x;
    this._pendingY = y;
    this._msgText.text = this._stripFormats(text);
    this._rebuildButtons(DialogType.AskAccept);
    this._inputContainer.visible = false;
    this._menuContainer.removeChildren();
    this._menuItems = [];
    this.isVisible = true;
    this._root.visible = true;
  }

  get pendingQuestId() { return this._pendingQuestId; }
  get pendingNpcId() { return this._pendingNpcId; }
  get pendingX() { return this._pendingX; }
  get pendingY() { return this._pendingY; }

  showAskNumber(text: string, _default: number, _min: number, _max: number): void {
    this._currentType = DialogType.AskNumber;
    this._msgText.text = this._stripFormats(text);
    this._rebuildButtons(DialogType.AskNumber);
    this._inputValue = `${_default}`;
    this._syncInput();
    this._inputContainer.visible = true;
    this._menuContainer.removeChildren();
    this._menuItems = [];
    this.isVisible = true;
    this._root.visible = true;
  }

  onTextInput(ch: string): void {
    if (!this._inputContainer.visible) return;
    if (ch === 'Enter') {
      if (this._currentType === DialogType.AskText || this._currentType === DialogType.Quiz) {
        this.onTextConfirm?.(this._inputValue);
      } else if (this._currentType === DialogType.AskNumber) {
        const n = parseInt(this._inputValue, 10);
        if (!isNaN(n)) this.onNumberConfirm?.(n);
      }
      return;
    }
    if (ch === 'Backspace') { this._inputValue = this._inputValue.slice(0, -1); this._syncInput(); return; }
    if (ch.length === 1 && this._inputValue.length < 20) { this._inputValue += ch; this._syncInput(); }
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    if (!down) return true;
    if (this._currentType === DialogType.Quiz && this._inputContainer.visible) {
      const inputRect = { x: this._inputContainer.x, y: this._inputContainer.y, w: 260, h: 18 };
      if (lx >= inputRect.x && lx < inputRect.x + inputRect.w && ly >= inputRect.y && ly < inputRect.y + inputRect.h) {
        return true;
      }
    }
    if (lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H) return true;
    return false;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (this._inputContainer.visible) {
      if (key === 'Enter' && (this._currentType === DialogType.AskText || this._currentType === DialogType.Quiz)) {
        this.onTextConfirm?.(this._inputValue);
        this.isVisible = false; this._root.visible = false;
        return true;
      }
      if (key === 'Escape') {
        this.onNo?.();
        this.isVisible = false; this._root.visible = false;
        return true;
      }
      this.onTextInput(key);
      return true;
    }
    if (key === 'Enter') {
      switch (this._currentType) {
        case DialogType.Ok: this.onOk?.(); break;
        case DialogType.Next: this.onNext?.(); break;
        case DialogType.YesNo: this.onYes?.(); break;
        default: break;
      }
      this.isVisible = false; this._root.visible = false;
      return true;
    }
    if (key === 'Escape') {
      if (this._currentType === DialogType.YesNo || this._currentType === DialogType.Quiz) this.onNo?.();
      this.isVisible = false; this._root.visible = false;
      return true;
    }
    return false;
  }

  update(dt: number): void {
    if (!this.isVisible) return;
    if (this._currentType === DialogType.Quiz && this._quizText) {
      this._quizTimer += dt;
      const remaining = Math.max(0, Math.ceil(this._quizTotalTime - this._quizTimer));
      const clr = remaining < 10 ? '#F44' : '#DCA';
      this._quizText.text = `Time: ${remaining}s`;
      this._quizText.style = new TextStyle({ fill: clr, fontSize: 10, fontFamily: 'monospace' });
      if (remaining <= 0) {
        this.isVisible = false;
        this._root.visible = false;
        this.onNo?.();
      }
    }
  }

  private _rebuildButtons(type: DialogType): void {
    this._btnRow.removeChildren();
    const btnDefs: { label: string; callback: (() => void) | null }[] = [];
    switch (type) {
      case DialogType.Ok: btnDefs.push({ label: 'OK', callback: this.onOk }); break;
      case DialogType.Next: btnDefs.push({ label: 'Next', callback: this.onNext }); break;
      case DialogType.PrevNext: btnDefs.push({ label: 'Prev', callback: this.onPrev }, { label: 'Next', callback: this.onNext }); break;
      case DialogType.YesNo:
      case DialogType.AskAccept: btnDefs.push({ label: 'Yes', callback: this.onYes }, { label: 'No', callback: this.onNo }); break;
      case DialogType.Quiz:
        btnDefs.push({ label: 'OK', callback: () => { this.onTextConfirm?.(this._inputValue); this.isVisible = false; this._root.visible = false; } });
        btnDefs.push({ label: 'No', callback: () => { this.onNo?.(); this.isVisible = false; this._root.visible = false; } });
        break;
      case DialogType.AskText:
      case DialogType.AskNumber:
        btnDefs.push({ label: 'OK', callback: () => {
          if (type === DialogType.AskText) this.onTextConfirm?.(this._inputValue);
          else { const n = parseInt(this._inputValue, 10); if (!isNaN(n)) this.onNumberConfirm?.(n); }
          this.isVisible = false; this._root.visible = false;
        }});
        break;
    }
    let bx = PANEL_W - 20;
    for (const def of btnDefs.reverse()) {
      const c = new Container();
      const bg = new Graphics();
      bg.rect(0, 0, 50, 20).fill({  color: '#1E2030', alpha: 0.9 });
      bg.rect(0, 0, 50, 20).stroke({  color: '#505570', width: 1 });
      const t = new Text({ text: def.label, style: new TextStyle({ fill: '#CCC', fontSize: 10, fontFamily: 'monospace' }) });
      t.x = 10; t.y = 4;
      c.addChild(bg, t);
      bg.eventMode = 'static';
      bg.cursor = 'pointer';
      bg.on('pointerdown', () => { def.callback?.(); this.isVisible = false; this._root.visible = false; });
      bx -= 54;
      c.x = bx; c.y = 0;
      this._btnRow.addChild(c);
    }
  }

  private _syncInput(): void {
    this._inputText.text = this._inputValue;
    this._inputCursor.x = 4 + this._inputText.width;
  }

  private _stripFormats(text: string): string {
    // Resolve name tokens first
    text = text.replace(/#p(\d+)#/g, (_, id) => this.npcName?.(parseInt(id)) ?? this.playerName);
    text = text.replace(/#h#/g, this.playerName);
    text = text.replace(/#t(\d+)#/g, (_, id) => this.itemName?.(parseInt(id)) ?? `#t${id}#`);
    text = text.replace(/#o(\d+)#/g, (_, id) => this.mobName?.(parseInt(id)) ?? `#o${id}#`);
    text = text.replace(/#m(\d+)#/g, (_, id) => this.mapName?.(parseInt(id)) ?? `#m${id}#`);
    text = text.replace(/#q(\d+)#/g, (_, id) => this.skillName?.(parseInt(id)) ?? `#q${id}#`);
    text = text.replace(/#z(\d+)#/g, (_, id) => this.itemName?.(parseInt(id)) ?? `#z${id}#`);
    // #s<id># → skill name (OG tag type 10)
    text = text.replace(/#s(\d+)#/g, (_, id) => this.skillName?.(parseInt(id)) ?? `Skill ${id}`);
    // #k<code># → key name
    text = text.replace(/#k(\d+)#/g, (_m, code) => `[Key: ${_keyName(parseInt(code))}]`);
    // Strip remaining formatting tokens
    return text.replace(/#l/g, '').replace(/#L\d+#/g, '').replace(/#e/g, '').replace(/#n/g, '')
      .replace(/#b/g, '').replace(/#r/g, '').replace(/#g/g, '')
      .replace(/#d/g, '')
      .replace(/#i\d+#/g, '').replace(/#v\d+#/g, '')
      .replace(/#f\d+#/g, '').replace(/#c\d+#/g, '');
  }

  private _rebuildBg(): void {
    this._bg.clear();
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 240 / 255 });
    this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
  }
}
