export class WzReaderException extends Error {
  constructor(message: string, inner?: Error) {
    super(message);
    this.name = 'WzReaderException';
  }
}
