import { Container } from 'pixi.js';

export abstract class Overlay {
  // Pixi's Container defaults to visible:true; field initializers below
  // don't go through the isVisible setter, so this has to be set explicitly
  // or every Overlay would render from the moment it's constructed.
  container = new Container({ visible: false });

  // Same fix as GamePanel.isVisible: Pixi's real render visibility lives on
  // `container.visible`, not this flag alone — several subclasses only ever
  // set `isVisible` and assumed that alone would show/hide them. Most
  // accidentally got away with it (Pixi containers default to
  // visible:true, and these subclasses happen to start hidden via other
  // means), but at least one (QuitConfirmOverlay) had no such luck and was
  // permanently visible from construction onward. Keeping both fields in
  // lockstep here fixes every subclass at once.
  private _isVisible = false;
  get isVisible(): boolean { return this._isVisible; }
  set isVisible(v: boolean) { this._isVisible = v; this.container.visible = v; }
}
