import { WzReaderException } from './WzReaderException.js';

export enum WzNodeType {
  Property,
  Canvas,
  Vector,
  Convex,
  PolyShape,
  Sound,
  Uol,
}

export function WzNodeTypeFromUol(uol: string): WzNodeType {
  switch (uol) {
    case 'Property': return WzNodeType.Property;
    case 'Canvas': return WzNodeType.Canvas;
    case 'Shape2D#Vector2D': return WzNodeType.Vector;
    case 'Shape2D#Convex2D': return WzNodeType.Convex;
    case 'Shape2D#PolyShape2D': return WzNodeType.PolyShape;
    case 'Sound_DX8': return WzNodeType.Sound;
    case 'UOL': return WzNodeType.Uol;
    default: throw new WzReaderException(`Unknown extended property UOL: ${uol}`);
  }
}
