export class ClipboardHelper {
    async copy(text) {
        try {
            await navigator.clipboard.writeText(text);
        }
        catch { /* noop */ }
    }
}
//# sourceMappingURL=ClipboardHelper.js.map