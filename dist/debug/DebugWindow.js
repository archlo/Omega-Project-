export class DebugWindow {
    _registry;
    _logSink;
    _timerId = null;
    constructor(registry, logSink) {
        this._registry = registry;
        this._logSink = logSink;
    }
    show() {
        console.log('[DebugWindow] Debug overlay active — polling registry.', this._registry.snapshot().length, 'items registered.');
        this._timerId = setInterval(() => {
            const lines = this._logSink.drain();
            for (const line of lines) {
                console.log('[DebugLog]', line);
            }
        }, 500);
    }
    close() {
        if (this._timerId !== null) {
            clearInterval(this._timerId);
            this._timerId = null;
        }
    }
}
//# sourceMappingURL=DebugWindow.js.map