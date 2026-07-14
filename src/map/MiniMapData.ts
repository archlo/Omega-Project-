import { WzSprite } from '../render/WzSprite.js';

export interface ICanvasSprite {
  width: number;
  height: number;
}

// OG: CUIMiniMap::MakeConvexLayer renders foothold lines on the minimap.
// Each convex layer is a set of connected foothold segments (x1,y1)→(x2,y2)
// that form the walkable platforms visible as lines on the minimap.
export interface MiniMapFoothold {
  footholdId: number;
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
  // OG: m_nReal_W/H — real map dimensions in world units
  public readonly Real_W: number;
  public readonly Real_H: number;
  // OG: m_nReal_CX/CY — real center offsets for coordinate transform
  public readonly Real_CX: number;
  public readonly Real_CY: number;
  // OG: m_nMag_Normal — magnification for normal mode (m_nOption=0)
  public readonly Mag_Normal: number;
  // OG: m_nMag_2X — magnification for 2X mode (m_nOption=1)
  public readonly Mag_2X: number;

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
    realW?: number,
    realH?: number,
    realCX?: number,
    realCY?: number,
    magNormal?: number,
    mag2X?: number,
  ) {
    // OG: m_nReal_W/H default to Width/Height if not provided
    this.Real_W = realW ?? Width;
    this.Real_H = realH ?? Height;
    // OG: m_nReal_CX/CY default to CenterX/CenterY if not provided
    this.Real_CX = realCX ?? CenterX;
    this.Real_CY = realCY ?? CenterY;
    // OG: magnification values — Mag_Normal is typically 4, Mag_2X is typically 3
    this.Mag_Normal = magNormal ?? Mag;
    this.Mag_2X = mag2X ?? Math.max(0, Mag - 1);
  }

  get CanvasWidth(): number {
    return this.Canvas?.width ?? (this.Width >> this.Mag);
  }

  get CanvasHeight(): number {
    return this.Canvas?.height ?? (this.Height >> this.Mag);
  }

  // OG: TransformPoint — transforms world coordinates to minimap screen coordinates
  // Formula: screenX = (worldX + realCX) >> mag - scrOrigX
  // This is called per-icon to position entities on the minimap.
  WorldToCanvas(world: { x: number; y: number }): { x: number; y: number } {
    const scale = 1 << this.Mag;
    return {
      x: Math.floor((world.x + this.Real_CX) / scale),
      y: Math.floor((world.y + this.Real_CY) / scale),
    };
  }

  // OG: TransformPoint with explicit magnification (for 2X mode)
  WorldToCanvasAtMag(world: { x: number; y: number }, mag: number): { x: number; y: number } {
    const scale = 1 << mag;
    return {
      x: Math.floor((world.x + this.Real_CX) / scale),
      y: Math.floor((world.y + this.Real_CY) / scale),
    };
  }
}
