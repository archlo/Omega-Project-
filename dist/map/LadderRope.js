export class LadderRope {
    Sn;
    IsLadder;
    UpperFoothold;
    X;
    Y1;
    Y2;
    Page;
    constructor(Sn, IsLadder, UpperFoothold, X, Y1, Y2, Page) {
        this.Sn = Sn;
        this.IsLadder = IsLadder;
        this.UpperFoothold = UpperFoothold;
        this.X = X;
        this.Y1 = Y1;
        this.Y2 = Y2;
        this.Page = Page;
    }
    get Top() { return Math.min(this.Y1, this.Y2); }
    get Bottom() { return Math.max(this.Y1, this.Y2); }
}
//# sourceMappingURL=LadderRope.js.map