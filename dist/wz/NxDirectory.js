import { WzDirectory } from './WzDirectory.js';
import { NxImage } from './NxImage.js';
/** NX-backed WzDirectory: children are classified by name (`*.img` => image, else directory). */
export class NxDirectory extends WzDirectory {
    _file;
    _node;
    _pkg;
    _itemsCache = null;
    constructor(file, node, pkg) {
        super(pkg, node.index);
        this._file = file;
        this._node = node;
        this._pkg = pkg;
    }
    get Items() {
        if (this._itemsCache === null) {
            const result = {};
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
//# sourceMappingURL=NxDirectory.js.map