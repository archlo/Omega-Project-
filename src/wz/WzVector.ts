export class WzVector {
  static readonly Zero = new WzVector(0, 0);

  constructor(
    public readonly X: number,
    public readonly Y: number,
  ) {}

  toString(): string {
    return `(${this.X}, ${this.Y})`;
  }
}
