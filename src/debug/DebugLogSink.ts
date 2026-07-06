const MAX_QUEUE_DEPTH = 2000;

export class DebugLogSink {
  private _queue: string[] = [];

  emit(line: string): void {
    this._queue.push(line);
    while (this._queue.length > MAX_QUEUE_DEPTH) {
      this._queue.shift();
    }
  }

  drain(max = 200): string[] {
    const result: string[] = [];
    for (let i = 0; i < max && this._queue.length > 0; i++) {
      result.push(this._queue.shift()!);
    }
    return result;
  }
}
