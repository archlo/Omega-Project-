import { WzCanvas } from '../wz/WzCanvas.js';
import { WzProperty } from '../wz/WzProperty.js';
function resolveCanvas(node) {
    if (node instanceof WzCanvas)
        return { canvas: node, delayNode: node };
    if (node instanceof WzProperty) {
        const zero = node.Get('0');
        if (zero instanceof WzCanvas)
            return { canvas: zero, delayNode: node };
        for (const v of Object.values(node.Items)) {
            if (v instanceof WzCanvas)
                return { canvas: v, delayNode: node };
        }
    }
    return null;
}
function readDelay(node, fallback) {
    const raw = node instanceof WzCanvas ? node.Property.Get('delay') : node.Get('delay');
    const n = typeof raw === 'number' ? raw : typeof raw === 'bigint' ? Number(raw) : 0;
    return n > 0 ? n : fallback;
}
/** Loads a one-shot frame sequence from an already-resolved WZ node (the
    caller does its own `wz.GetItem(path)` first): either a single
    `WzCanvas`, or a `WzProperty` with numeric-keyed canvas children — gaps
    allowed (e.g. Skill.wz effect nodes that skip 19-26 then resume at 27).
    Falls back to treating `root` itself as one frame when it has no
    numeric children at all. */
export function loadFrameSequence(loader, root, defaultDelay = 100, singleFallbackDelay = defaultDelay) {
    if (root instanceof WzCanvas) {
        const sprite = loader.Load(root);
        return sprite ? [{ sprite, delayMs: readDelay(root, defaultDelay) }] : [];
    }
    if (!(root instanceof WzProperty))
        return [];
    const indices = Object.keys(root.Items)
        .map((k) => parseInt(k, 10))
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);
    const frames = [];
    for (const idx of indices) {
        const resolved = resolveCanvas(root.Get(idx.toString()));
        if (!resolved)
            continue;
        const sprite = loader.Load(resolved.canvas);
        if (!sprite)
            continue;
        frames.push({ sprite, delayMs: readDelay(resolved.delayNode, defaultDelay) });
    }
    if (frames.length > 0)
        return frames;
    const resolved = resolveCanvas(root);
    if (!resolved)
        return [];
    const sprite = loader.Load(resolved.canvas);
    if (!sprite)
        return [];
    return [{ sprite, delayMs: readDelay(resolved.delayNode, singleFallbackDelay) }];
}
export function totalDurationMs(frames) {
    return frames.reduce((sum, f) => sum + f.delayMs, 0);
}
//# sourceMappingURL=WzFrameAnimation.js.map