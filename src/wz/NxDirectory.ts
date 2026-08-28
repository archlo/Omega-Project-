import type { WzPackage } from './WzPackage.js';
import { WzDirectory } from './WzDirectory.js';
import { WzImage } from './WzImage.js';
import { NxFile, type NxNodeView } from './NxFile.js';
import { NxImage } from './NxImage.js';

/** NX-backed WzDirectory: children are classified by name (`*.img` => image, else directory). */
export class NxDirectory extends WzDirectory {
  private readonly _file: NxFile;
  private readonly _node: NxNodeView;
  private readonly _pkg: WzPackage;
  private _itemsCache: Record<string, WzDirectory | WzImage> | null = null;

  constructor(file: NxFile, node: NxNodeView, pkg: WzPackage) {
    super(pkg, node.index);
    this._file = file;
    this._node = node;
    this._pkg = pkg;
  }

  override get Items(): Record<string, WzDirectory | WzImage> {
    if (this._itemsCache === null) {
      const result: Record<string, WzDirectory | WzImage> = {};
      for (const child of this._file.GetChildren(this._node)) {
        const name = this._file.GetString(child.nameId);
        result[name] = name.toLowerCase().endsWith('.img')
          ? new NxImage(this._file, child, this._pkg)
          : new NxDirectory(this._file, child, this._pkg);
      }
      this._itemsCache = result;
    }
    return this._itemsCache;
  }
}
