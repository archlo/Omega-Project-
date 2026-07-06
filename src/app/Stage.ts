import { Container } from 'pixi.js';
import { MapleClaudeGame } from '../MapleClaudeGame.js';
import { MuteButton } from '../ui/MuteButton.js';
import { BuiltInFont } from '../ui/BuiltInFont.js';

export enum MouseButton { Left, Right, Middle }

export abstract class Stage {
  protected game!: MapleClaudeGame;

  /** Full-width layer — FieldScene goes here; empty for pre-game stages. */
  readonly mapRoot = new Container();
  /** 800-px frame layer — all UI elements go here; coords are frame-relative. */
  readonly uiRoot = new Container();

  private _frameMuteButton: MuteButton | null = null;
  private _frameMuteFont: BuiltInFont | null = null;

  get stageDirector() { return this.game.stageDirector; }

  onEnter(game: MapleClaudeGame): void {
    this.game = game;
    game.mapContainer.addChild(this.mapRoot);
    game.frameContainer.addChild(this.uiRoot);
  }

  onExit(): void {
    this.game.mapContainer.removeChild(this.mapRoot);
    this.game.frameContainer.removeChild(this.uiRoot);
  }

  update(dt: number): void {
    if (this._frameMuteButton !== null) {
      // MuteButton lives in the 800-px frame container (uiRoot) and is positioned
      // in frame-local coordinates; the frame size is constant regardless of the
      // window size, so we always pass 800×600 here.
      this._frameMuteButton.ServiceAndDraw(800, 600);
    }
  }
  abstract draw(): void;

  /** Lazily creates a MuteButton backed by the persistent audio player. Call once per
      frame from a framed login stage's draw, right after the frame sprite is drawn.
      State is shared with the audio player so the toggle persists across stages.
      The viewW/viewH arguments are the 800-px frame dimensions (always 800×600). */
  protected drawFrameMuteButton(viewW = 800, viewH = 600): void {
    if (this._frameMuteButton === null) {
      this._frameMuteFont ??= new BuiltInFont();
      this._frameMuteButton = new MuteButton(
        () => this.game.audioPlayer.Muted,
        () => this.game.audioPlayer.ToggleMute(),
        this._frameMuteFont,
      );
      this.uiRoot.addChild(this._frameMuteButton.container);
    }
    this._frameMuteButton.ServiceAndDraw(viewW, viewH);
  }

  onTextInput(character: string): void {}
  onMouseButton(x: number, y: number, down: boolean, button: MouseButton): void {
    if (this._frameMuteButton !== null) {
      this._frameMuteButton.SetMouse(x, y);
      if (this._frameMuteButton.handleMouseButton(x, y, down)) return;
    }
  }
  onMouseMove(x: number, y: number): void {
    this._frameMuteButton?.SetMouse(x, y);
  }
  onKeyPress(key: string): void {}
  onResize(windowW: number, windowH: number): void {}
}
