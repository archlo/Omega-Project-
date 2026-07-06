import type { WzPackage } from './WzPackage.js';
import type { WzBuffer } from './WzBuffer.js';
import type { WzCrypto } from './WzCrypto.js';
import { WzProperty } from './WzProperty.js';

export class WzImage {
  private _parent: WzPackage;
  private _root: WzProperty | null = null;

  public readonly Offset: number;

  constructor(parent: WzPackage, offset: number) {
    this._parent = parent;
    this.Offset = offset;
  }

  get Package(): WzPackage { return this._parent; }
  get Crypto(): WzCrypto { return this._parent.Crypto; }

  GetBuffer(offset: number): WzBuffer {
    return this._parent.GetBuffer(offset);
  }

  get Root(): WzProperty {
    if (this._root === null) {
      this._root = new WzProperty(this, this.Offset);
    }
    return this._root;
  }

  GetItem(path: string): unknown {
    return this.Root.GetItem(path);
  }
}
