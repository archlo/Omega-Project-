import type { WzPackage } from './WzPackage.js';
import { WzDirectory } from './WzDirectory.js';
import { WzImage } from './WzImage.js';
import { NxFile, type NxNodeView } from './NxFile.js';
/** NX-backed WzDirectory: children are classified by name (`*.img` => image, else directory). */
export declare class NxDirectory extends WzDirectory {
    private readonly _file;
    private readonly _node;
    private readonly _pkg;
    private _itemsCache;
    constructor(file: NxFile, node: NxNodeView, pkg: WzPackage);
    get Items(): Record<string, WzDirectory | WzImage>;
}
//# sourceMappingURL=NxDirectory.d.ts.map