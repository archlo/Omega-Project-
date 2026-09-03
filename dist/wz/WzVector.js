export class WzVector {
    X;
    Y;
    static Zero = new WzVector(0, 0);
    constructor(X, Y) {
        this.X = X;
        this.Y = Y;
    }
    toString() {
        return `(${this.X}, ${this.Y})`;
    }
}
//# sourceMappingURL=WzVector.js.map