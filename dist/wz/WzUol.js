export class WzUol {
    _parent;
    Target;
    _resolved = undefined;
    _resolveAttempted = false;
    constructor(_parent, Target) {
        this._parent = _parent;
        this.Target = Target;
    }
    Resolve() {
        if (this._resolveAttempted) {
            return this._resolved;
        }
        this._resolveAttempted = true;
        // Strip leading `../` segments — WzProperty.GetItem does literal key lookup,
        // cannot navigate to parent. UOLs like `../../front/head` resolve within the
        // same WzImage, so all `..` prefixes are equivalent to starting from the root.
        let path = this.Target;
        while (path.startsWith('../'))
            path = path.substring(3);
        this._resolved = this._parent.GetItem(path);
        return this._resolved;
    }
}
//# sourceMappingURL=WzUol.js.map