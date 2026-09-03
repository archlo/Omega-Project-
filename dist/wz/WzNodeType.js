import { WzReaderException } from './WzReaderException.js';
export var WzNodeType;
(function (WzNodeType) {
    WzNodeType[WzNodeType["Property"] = 0] = "Property";
    WzNodeType[WzNodeType["Canvas"] = 1] = "Canvas";
    WzNodeType[WzNodeType["Vector"] = 2] = "Vector";
    WzNodeType[WzNodeType["Convex"] = 3] = "Convex";
    WzNodeType[WzNodeType["PolyShape"] = 4] = "PolyShape";
    WzNodeType[WzNodeType["Sound"] = 5] = "Sound";
    WzNodeType[WzNodeType["Uol"] = 6] = "Uol";
})(WzNodeType || (WzNodeType = {}));
export function WzNodeTypeFromUol(uol) {
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
//# sourceMappingURL=WzNodeType.js.map