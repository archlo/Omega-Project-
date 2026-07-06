import { DebugRegistry } from './DebugRegistry.js';
import { DebugLogSink } from './DebugLogSink.js';

export class DebugWindow {
  private _registry: DebugRegistry;
  private _logSink: DebugLogSink;
  private _timerId: ReturnType<typeof setInterval> | null = null;

  constructor(registry: DebugRegistry, logSink: DebugLogSink) {
    this._registry = registry;
    this._logSink = logSink;
  }

  show(): void {
    console.log('[DebugWindow] Debug overlay active — polling registry.', this._registry.snapshot().length, 'items registered.');

    this._timerId = setInterval(() => {
      const lines = this._logSink.drain();
      for (const line of lines) {
        console.log('[DebugLog]', line);
      }
    }, 500);
  }

  close(): void {
    if (this._timerId !== null) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
  }
}
