import { WzSprite } from '../render/WzSprite.js';

export interface ICanvasSprite {
  width: number;
  height: number;
}

// OG: CUIMiniMap::MakeConvexLayer renders foothold lines on the minimap.
// Each convex layer is a set of connected foothold segments (x1,y1)→(x2,y2)
// that form the walkable platforms visible as lines on the minimap.
export interface MiniMapFoothold {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  layer: number;
}

// OG: CUIMiniMap::LoadLadderRope renders ladders/ropes as vertical lines.
export interface MiniMapLadderRope {
  x: number;
  y1: number;
  y2: number;
  isLadder: boolean;
}

export class MiniMapData {
  constructor(
    public readonly Canvas: WzSprite | null,
    public readonly Mark: WzSprite | null,
    public readonly Width: number,
    public readonly Height: number,
    public readonly CenterX: number,
    public readonly CenterY: number,
    public readonly Mag: number = 4,
    public readonly Footholds: MiniMapFoothold[] = [],
    public readonly LadderRopes: MiniMapLadderRope[] = [],
  ) {}

  get CanvasWidth(): number {
    return this.Canvas?.width ?? (this.Width >> this.Mag);
  }

  get CanvasHeight(): number {
    return this.Canvas?.height ?? (this.Height >> this.Mag);
  }

  WorldToCanvas(world: { x: number; y: number }): { x: number; y: number } {
    const scale = 1 << this.Mag;
    return {
      x: Math.floor((world.x + this.CenterX) / scale),
      y: Math.floor((world.y + this.CenterY) / scale),
    };
  }
}
