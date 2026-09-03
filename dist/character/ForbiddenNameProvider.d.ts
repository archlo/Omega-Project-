import type { WzPackage } from '../wz/WzPackage.js';
/**
Client-side forbidden-word filter for character names, mirroring the v95 client's
word check (called before the CheckDuplicatedID packet). The list is the
union of `Etc.wz/ForbiddenName.img` and `Etc.wz/Curse.img` — each a flat
list of string children ("0","1",…). Each raw entry is split on ',', trimmed
and lowercased; a name is forbidden if (lowercased) it CONTAINS any entry as
a substring.

The Kinoko server does a narrower exact match against ForbiddenName.img only,
so this client filter is intentionally the stricter, authentic one — it never
lets through a name the server would reject.
*/
export declare class ForbiddenNameProvider {
    private _words;
    constructor(etcWz: WzPackage | null);
    get HasData(): boolean;
    /** True if the (lowercased) name contains any forbidden word as a substring. */
    IsForbidden(name: string): boolean;
    private _load;
    private _addEntry;
}
//# sourceMappingURL=ForbiddenNameProvider.d.ts.map