export class ClipboardHelper {
  async copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch { /* noop */ }
  }
}
