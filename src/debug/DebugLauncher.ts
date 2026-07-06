import { DebugRegistry } from './DebugRegistry.js';
import { DebugLogSink } from './DebugLogSink.js';

export class DebugLauncher {
  static get isEnabled(): boolean {
    const v = typeof process !== 'undefined' && process.env
      ? process.env['MAPLECLAUDE_DEBUG']
      : (globalThis as any)['MAPLECLAUDE_DEBUG'];
    return !!v;
  }

  static launch(registry: DebugRegistry, logSink: DebugLogSink): void {
    if (!DebugLauncher.isEnabled) return;

    const sink = (globalThis as any).__debugSink;
    (globalThis as any).__debugRegistry = registry;
    (globalThis as any).__debugLogSink = logSink;

    if (sink) {
      Object.assign(sink, { registry, logSink });
    }

    console.log('[DebugLauncher] Debug mode enabled. DebugRegistry and DebugLogSink available on window.__debug* globals.');
  }
}
