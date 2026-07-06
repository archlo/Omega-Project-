export class LadderRope {
  constructor(
    public readonly Sn: number,
    public readonly IsLadder: boolean,
    public readonly UpperFoothold: boolean,
    public readonly X: number,
    public readonly Y1: number,
    public readonly Y2: number,
    public readonly Page: number,
  ) {}

  get Top(): number { return Math.min(this.Y1, this.Y2); }
  get Bottom(): number { return Math.max(this.Y1, this.Y2); }
}
