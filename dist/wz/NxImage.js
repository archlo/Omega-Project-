import { WzImage } from './WzImage.js';
import { NxProperty } from './NxProperty.js';
/** NX-backed WzImage: the wrapped node doubles as its own property root. */
export class NxImage extends WzImage {
    _file;
    _node;
    _rootCache = null;
    constructor(file, node, pkg) {
        super(pkg, node.index);
        this._file = file;
        this._node = node;
    }
    get Root() {
        if (this._rootCache === null) {
            this._rootCache = new NxProperty(this._file, this._node, this);
        }
        return this._rootCache;
    }
}
//# sourceMappingURL=NxImage.js.map