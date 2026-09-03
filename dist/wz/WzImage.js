import { WzProperty } from './WzProperty.js';
export class WzImage {
    _parent;
    _root = null;
    Offset;
    constructor(parent, offset) {
        this._parent = parent;
        this.Offset = offset;
    }
    get Package() { return this._parent; }
    get Crypto() { return this._parent.Crypto; }
    GetBuffer(offset) {
        return this._parent.GetBuffer(offset);
    }
    get Root() {
        if (this._root === null) {
            this._root = new WzProperty(this, this.Offset);
        }
        return this._root;
    }
    GetItem(path) {
        return this.Root.GetItem(path);
    }
}
//# sourceMappingURL=WzImage.js.map