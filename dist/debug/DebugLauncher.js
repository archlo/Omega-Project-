export class DebugLauncher {
    static get isEnabled() {
        const v = typeof process !== 'undefined' && process.env
            ? process.env['MAPLECLAUDE_DEBUG']
            : globalThis['MAPLECLAUDE_DEBUG'];
        return !!v;
    }
    static launch(registry, logSink) {
        if (!DebugLauncher.isEnabled)
            return;
        const sink = globalThis.__debugSink;
        globalThis.__debugRegistry = registry;
        globalThis.__debugLogSink = logSink;
        if (sink) {
            Object.assign(sink, { registry, logSink });
        }
        console.log('[DebugLauncher] Debug mode enabled. DebugRegistry and DebugLogSink available on window.__debug* globals.');
    }
}
//# sourceMappingURL=DebugLauncher.js.map