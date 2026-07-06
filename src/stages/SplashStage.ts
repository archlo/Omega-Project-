import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Stage, MouseButton } from '../app/Stage.js';
import { LoginStage } from './LoginStage.js';
import { WzPackage } from '../wz/WzPackage.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';

const W = 800, H = 600;
const BAR_W = 420, BAR_H = 10;
const BAR_X = (W - BAR_W) / 2;
const FILES = ['UI', 'Map', 'Sound', 'Character', 'Item', 'Base', 'Skill', 'Etc'] as const;
type FileName = typeof FILES[number];

const COL = {
  bg:        0x06080F,
  panel:     0x0D1426,
  border:    0x1E2D50,
  accent:    0xC8860A,
  barBg:     0x111928,
  barFill:   0xD4900F,
  barDone:   0x2A7A3A,
  title:     0xFFE066,
  subtitle:  0x8899BB,
  label:     0xCCDDFF,
  dim:       0x556688,
  error:     0xFF4444,
  white:     0xFFFFFF,
};

export class SplashStage extends Stage {
  // Splash state
  private _bg!: Graphics;
  private _titleText!: Text;
  private _promptText!: Text;
  private _timer = 0;
  private _loading = false;

  // Loading state
  private _loadContainer!: Container;
  private _bars: Record<FileName, { bg: Graphics; fill: Graphics; label: Text; info: Text }> = {} as any;
  private _statusText!: Text;
  private _errorText!: Text;
  private _progress: Record<FileName, { r: number; t: number; done: boolean }> = {
    UI:        { r: 0, t: 0, done: false },
    Map:       { r: 0, t: 0, done: false },
    Sound:     { r: 0, t: 0, done: false },
    Character: { r: 0, t: 0, done: false },
    Item:      { r: 0, t: 0, done: false },
    Base:      { r: 0, t: 0, done: false },
    Skill:     { r: 0, t: 0, done: false },
    Etc:       { r: 0, t: 0, done: false },
  };

  constructor() {
    super();

    // ── Background ─────────────────────────────────────────────────────
    this._bg = new Graphics();
    this._bg.rect(0, 0, W, H).fill({ color: COL.bg });
    // Vignette rings (fake glow at center)
    for (let i = 3; i >= 1; i--) {
      this._bg.ellipse(W / 2, H / 2, 260 * i, 180 * i).fill({ color: 0x0A1530, alpha: 0.18 / i });
    }
    // Decorative top/bottom bars
    this._bg.rect(0, 0, W, 3).fill({ color: COL.accent });
    this._bg.rect(0, H - 3, W, 3).fill({ color: COL.accent });
    this._bg.rect(0, 3, W, 1).fill({ color: COL.border });
    this._bg.rect(0, H - 4, W, 1).fill({ color: COL.border });

    // ── Title ──────────────────────────────────────────────────────────
    this._titleText = new Text({
      text: 'MapleClaude',
      style: new TextStyle({
        fill: COL.title,
        fontSize: 42,
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontWeight: 'bold',
        dropShadow: { color: 0x000000, blur: 8, distance: 3, angle: Math.PI / 4, alpha: 0.8 },
      }),
    });
    this._titleText.anchor.set(0.5);
    this._titleText.position.set(W / 2, 240);
    this._titleText.alpha = 0;

    const sub = new Text({
      text: 'v95 TypeScript Client',
      style: new TextStyle({ fill: COL.subtitle, fontSize: 13, fontFamily: 'monospace' }),
    });
    sub.anchor.set(0.5);
    sub.position.set(W / 2, 290);

    this._promptText = new Text({
      text: '▶  Click anywhere to start',
      style: new TextStyle({ fill: COL.label, fontSize: 14, fontFamily: 'monospace' }),
    });
    this._promptText.anchor.set(0.5);
    this._promptText.position.set(W / 2, 360);

    // ── Loading panel ──────────────────────────────────────────────────
    this._loadContainer = new Container();
    this._loadContainer.visible = false;

    const panel = new Graphics();
    const ph = 320, py = (H - ph) / 2;
    panel.roundRect(W / 2 - 240, py, 480, ph, 8).fill({ color: COL.panel });
    panel.roundRect(W / 2 - 240, py, 480, ph, 8).stroke({ color: COL.border, width: 1 });
    this._loadContainer.addChild(panel);

    const loadTitle = new Text({
      text: 'Loading Assets',
      style: new TextStyle({ fill: COL.title, fontSize: 16, fontFamily: 'monospace', fontWeight: 'bold' }),
    });
    loadTitle.anchor.set(0.5, 0);
    loadTitle.position.set(W / 2, py + 18);
    this._loadContainer.addChild(loadTitle);

    FILES.forEach((name, i) => {
      const barY = py + 52 + i * 36;

      const label = new Text({
        text: name,
        style: new TextStyle({ fill: COL.label, fontSize: 12, fontFamily: 'monospace' }),
      });
      label.anchor.set(0, 0.5);
      label.position.set(BAR_X, barY - 9);

      const info = new Text({
        text: 'connecting...',
        style: new TextStyle({ fill: COL.dim, fontSize: 11, fontFamily: 'monospace' }),
      });
      info.anchor.set(1, 0.5);
      info.position.set(BAR_X + BAR_W, barY - 9);

      const bg = new Graphics();
      bg.roundRect(BAR_X, barY, BAR_W, BAR_H, 3).fill({ color: COL.barBg });
      bg.roundRect(BAR_X, barY, BAR_W, BAR_H, 3).stroke({ color: COL.border, width: 1 });

      const fill = new Graphics();

      this._loadContainer.addChild(bg);
      this._loadContainer.addChild(fill);
      this._loadContainer.addChild(label);
      this._loadContainer.addChild(info);
      this._bars[name] = { bg, fill, label, info };
    });

    this._statusText = new Text({
      text: '',
      style: new TextStyle({ fill: COL.dim, fontSize: 11, fontFamily: 'monospace' }),
    });
    this._statusText.anchor.set(0.5, 0);
    this._statusText.position.set(W / 2, py + ph - 26);
    this._loadContainer.addChild(this._statusText);

    this._errorText = new Text({
      text: '',
      style: new TextStyle({ fill: COL.error, fontSize: 12, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: 460 }),
    });
    this._errorText.anchor.set(0.5);
    this._errorText.position.set(W / 2, H / 2 + 120);

    this.uiRoot.addChild(this._bg);
    this.uiRoot.addChild(sub);
    this.uiRoot.addChild(this._titleText);
    this.uiRoot.addChild(this._promptText);
    this.uiRoot.addChild(this._loadContainer);
    this.uiRoot.addChild(this._errorText);
  }

  onEnter(game: any): void {
    super.onEnter(game);
    this._promptText.visible = false;
    this._startLoading();
  }

  update(dt: number): void {
    this._timer += dt;
    this._titleText.alpha = Math.min(1, this._timer / 1.2);
  }

  draw(): void {}

  onMouseButton(_x: number, _y: number, down: boolean, button: MouseButton): void {
    // Only used for retry after a load error
    if (!down || button !== MouseButton.Left || this._loading) return;
    if (this._promptText.visible) this._startLoading();
  }

  private _startLoading(): void {
    this._loading = true;
    this._promptText.visible = false;
    this._loadContainer.visible = true;
    this._loadAll().catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      this._errorText.text = `⚠ Load error: ${msg}`;
      this._loading = false;
      this._promptText.visible = true;
      this._promptText.text = '▶  Click to retry';
      this._promptText.alpha = 1;
      this._loading = false;
    });
  }

  private _redrawBar(name: FileName): void {
    const s = this._progress[name];
    const { fill, info } = this._bars[name];
    const barY = _barY(FILES.indexOf(name));

    fill.clear();
    if (s.t > 0) {
      const pct = Math.min(1, s.r / s.t);
      const fillW = Math.max(4, pct * BAR_W);
      const color = s.done ? COL.barDone : COL.barFill;
      fill.roundRect(BAR_X, barY, fillW, BAR_H, 3).fill({ color });
      info.text = s.done
        ? `✓ ${_fmtBytes(s.t)}`
        : `${_fmtBytes(s.r)} / ${_fmtBytes(s.t)}  ${Math.round(pct * 100)}%`;
      info.style.fill = s.done ? COL.barDone : COL.dim;
    } else {
      info.text = 'connecting...';
    }
  }

  private async _loadAll(): Promise<void> {
    const wzDir = this.game.wzDir;
    if (!wzDir) {
      this._errorText.text = '⚠ wzDir not configured — pass ?wzDir=/path in URL';
      return;
    }

    const mkCb = (name: FileName) => (_p: string, r: number, t: number) => {
      this._progress[name].r = r;
      this._progress[name].t = t;
      this._redrawBar(name);
    };
    const done = (name: FileName) => (p: WzPackage) => {
      this._progress[name].done = true;
      this._redrawBar(name);
      return p;
    };
    const open = (name: FileName) => WzPackage.OpenBaseAsync(wzDir, name, 95, mkCb(name)).then(done(name));

    // Load all packages in parallel; only transition to LoginStage once everything is ready.
    const g = this.game;
    const [ui, map, sound, character, item, base, skill, etc] = await Promise.all([
      open('UI'),
      open('Map'),
      open('Sound'),
      open('Character'),
      open('Item'),
      open('Base'),
      open('Skill'),
      open('Etc'),
    ]);
    g.wz.ui        = ui;
    g.wz.map       = map;
    g.wz.sound     = sound;
    g.wz.character = character;
    g.wz.item      = item;
    g.wz.base      = base;
    g.wz.skill     = skill;
    g.wz.etc       = etc;

    g.cursor.loadFromWz(ui).catch((e: unknown) => console.warn('[SplashStage] cursor WZ load failed', e));

    this._statusText.text = 'Building scene...';
    await new Promise(r => setTimeout(r, 50));
    this.stageDirector.replace(new LoginStage(ui, map, sound, new WzTextureLoader()));
  }
}

function _barY(i: number): number {
  return (H - 320) / 2 + 52 + i * 36;
}

function _fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
