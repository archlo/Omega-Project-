export class MiniMapData {
    Canvas;
    Mark;
    Width;
    Height;
    CenterX;
    CenterY;
    Mag;
    Footholds;
    LadderRopes;
    // OG: m_nReal_W/H — real map dimensions in world units
    Real_W;
    Real_H;
    // OG: m_nReal_CX/CY — real center offsets for coordinate transform
    Real_CX;
    Real_CY;
    // OG: m_nMag_Normal — magnification for normal mode (m_nOption=0)
    Mag_Normal;
    // OG: m_nMag_2X — magnification for 2X mode (m_nOption=1)
    Mag_2X;
    constructor(Canvas, Mark, Width, Height, CenterX, CenterY, Mag = 4, Footholds = [], LadderRopes = [], realW, realH, realCX, realCY, magNormal, mag2X) {
        this.Canvas = Canvas;
        this.Mark = Mark;
        this.Width = Width;
        this.Height = Height;
        this.CenterX = CenterX;
        this.CenterY = CenterY;
        this.Mag = Mag;
        this.Footholds = Footholds;
        this.LadderRopes = LadderRopes;
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
    get CanvasWidth() {
        return this.Canvas?.width ?? (this.Width >> this.Mag);
    }
    get CanvasHeight() {
        return this.Canvas?.height ?? (this.Height >> this.Mag);
    }
    // OG: TransformPoint — transforms world coordinates to minimap screen coordinates
    // Formula: screenX = (worldX + realCX) >> mag - scrOrigX
    // This is called per-icon to position entities on the minimap.
    WorldToCanvas(world) {
        const scale = 1 << this.Mag;
        return {
            x: Math.floor((world.x + this.Real_CX) / scale),
            y: Math.floor((world.y + this.Real_CY) / scale),
        };
    }
    // OG: TransformPoint with explicit magnification (for 2X mode)
    WorldToCanvasAtMag(world, mag) {
        const scale = 1 << mag;
        return {
            x: Math.floor((world.x + this.Real_CX) / scale),
            y: Math.floor((world.y + this.Real_CY) / scale),
        };
    }
}
//# sourceMappingURL=MiniMapData.js.map