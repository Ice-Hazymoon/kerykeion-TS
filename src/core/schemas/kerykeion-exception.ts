export class KerykeionException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KerykeionException";
  }
}
