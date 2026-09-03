const MAX_QUEUE_DEPTH = 2000;
export class DebugLogSink {
    _queue = [];
    emit(line) {
        this._queue.push(line);
        while (this._queue.length > MAX_QUEUE_DEPTH) {
            this._queue.shift();
        }
    }
    drain(max = 200) {
        const result = [];
        for (let i = 0; i < max && this._queue.length > 0; i++) {
            result.push(this._queue.shift());
        }
        return result;
    }
}
//# sourceMappingURL=DebugLogSink.js.map