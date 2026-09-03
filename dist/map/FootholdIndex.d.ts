import type { Foothold } from './Foothold.js';
/** Incremental fat-AABB tree used for foothold candidate queries. */
export declare class FootholdIndex {
    private readonly _nodes;
    private _root;
    clear(): void;
    insert(fh: Foothold): void;
    remove(fh: Foothold): void;
    /** Update a foothold after its endpoints change. Small moves stay in place. */
    update(fh: Foothold): void;
    search(x1: number, y1: number, x2: number, y2: number): Foothold[];
    private _leaf;
    private _insertLeaf;
    private _removeLeaf;
    private _fixUpward;
    private _balance;
}
//# sourceMappingURL=FootholdIndex.d.ts.map