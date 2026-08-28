import type { WzImage } from './WzImage.js';

export class WzUol {
  private _resolved: unknown = undefined;
  private _resolveAttempted = false;

  constructor(
    private _parent: WzImage,
    public readonly Target: string,
  ) {}

  Resolve(): unknown {
    if (this._resolveAttempted) {
      return this._resolved;
    }
    this._resolveAttempted = true;
    // Strip leading `../` segments — WzProperty.GetItem does literal key lookup,
    // cannot navigate to parent. UOLs like `../../front/head` resolve within the
    // same WzImage, so all `..` prefixes are equivalent to starting from the root.
    let path = this.Target;
    while (path.startsWith('../')) path = path.substring(3);
    this._resolved = this._parent.GetItem(path);
    return this._resolved;
  }
}
