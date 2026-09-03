import { WzProperty } from './WzProperty.js';
import { WzVector } from './WzVector.js';
import { WzReaderException } from './WzReaderException.js';
import { NxCanvas } from './NxCanvas.js';
import { NxSound } from './NxSound.js';
/**
 * NX-backed WzProperty. NX type 1 (int64) is returned as `bigint` to match
 * WzProperty's `case 20`, which existing consumers already normalize via
 * `typeof v === 'bigint' ? Number(v) : v`.
 */
export class NxProperty extends WzProperty {
    _file;
    _node;
    _img;
    _itemsCache = null;
    constructor(file, node, img) {
        super(img, 0);
        this._file = file;
        this._node = node;
        this._img = img;
    }
    get Items() {
        if (this._itemsCache === null) {
            const result = {};
            for (const child of this._file.GetChildren(this._node)) {
                result[this._file.GetString(child.nameId)] = this._toValue(child);
            }
            this._itemsCache = result;
        }
        return this._itemsCache;
    }
    _toValue(node) {
        switch (node.type) {
            case 0:
                return node.childCount > 0 ? new NxProperty(this._file, node, this._img) : null;
            case 1:
                return this._file.ReadInt64(node);
            case 2:
                return this._file.ReadDouble(node);
            case 3:
                return this._file.GetString(this._file.ReadStringId(node));
            case 4: {
                const v = this._file.ReadVector(node);
                return new WzVector(v.x, v.y);
            }
            case 5:
                return new NxCanvas(this._file, node, this._img);
            case 6:
                return new NxSound(this._file, node, this._img);
            default:
                throw new WzReaderException(`Unknown NX node type: ${node.type}`);
        }
    }
}
//# sourceMappingURL=NxProperty.js.map