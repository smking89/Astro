/** A data-layer failure with an HTTP status and a machine-readable code. */
export class AstroDataError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 500, code = "ASTRO_DATA_ERROR") {
    super(message);
    this.name = "AstroDataError";
    this.status = status;
    this.code = code;
  }
}
