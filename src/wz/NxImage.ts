import type { WzPackage } from './WzPackage.js';
import { WzImage } from './WzImage.js';
import { WzProperty } from './WzProperty.js';
import { NxFile, type NxNodeView } from './NxFile.js';
import { NxProperty } from './NxProperty.js';

/** NX-backed WzImage: the wrapped node doubles as its own property root. */
export class NxImage extends WzImage {
  private readonly _file: NxFile;
  private readonly _node: NxNodeView;
  private _rootCache: WzProperty | null = null;

  constructor(file: NxFile, node: NxNodeView, pkg: WzPackage) {
    super(pkg, node.index);
    this._file = file;
    this._node = node;
  }

  override get Root(): WzProperty {
    if (this._rootCache === null) {
      this._rootCache = new NxProperty(this._file, this._node, this);
    }
    return this._rootCache;
  }
}
