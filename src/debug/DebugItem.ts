export class DebugItem {
  readonly category: string;
  readonly name: string;
  readonly get: () => { x: number; y: number };
  readonly set: (v: { x: number; y: number }) => void;
  getScreenPos: (() => { x: number; y: number }) | null = null;
  setFromScreen: ((v: { x: number; y: number }) => void) | null = null;
  draggable = true;

  constructor(
    category: string,
    name: string,
    get: () => { x: number; y: number },
    set: (v: { x: number; y: number }) => void,
  ) {
    this.category = category;
    this.name = name;
    this.get = get;
    this.set = set;
  }

  effectiveScreenPos(): { x: number; y: number } {
    return this.getScreenPos ? this.getScreenPos() : this.get();
  }

  applyScreenPos(screen: { x: number; y: number }): void {
    (this.setFromScreen ?? this.set)(screen);
  }
}
