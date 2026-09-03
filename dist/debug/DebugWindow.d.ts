import { DebugRegistry } from './DebugRegistry.js';
import { DebugLogSink } from './DebugLogSink.js';
export declare class DebugWindow {
    private _registry;
    private _logSink;
    private _timerId;
    constructor(registry: DebugRegistry, logSink: DebugLogSink);
    show(): void;
    close(): void;
}
//# sourceMappingURL=DebugWindow.d.ts.map