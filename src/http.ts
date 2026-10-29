import { AstroDataError } from "./errors";
import { AstroLinkError } from "./links";

/** Parses a JSON body or fails with a 400 instead of throwing a syntax error. */
export async function readJson<T extends Record<string, unknown>>(request: Request): Promise<Partial<T>> {
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new AstroDataError("Request body must be a JSON object.", 400, "INVALID_BODY");
    }
    return body as Partial<T>;
  } catch (error) {
    if (error instanceof AstroDataError) throw error;
    throw new AstroDataError("Request body must be valid JSON.", 400, "INVALID_BODY");
  }
}

/** Maps typed errors to responses and keeps unexpected failures out of the client. */
export function astroErrorResponse(error: unknown): Response {
  if (error instanceof AstroDataError) {
    return Response.json({ error: error.message, code: error.code }, { status: error.status });
  }

  if (error instanceof AstroLinkError) {
    return Response.json({ error: error.message, code: "INVALID_HANDLE" }, { status: 422 });
  }

  console.error("[astro] unexpected data-layer failure", error);
  return Response.json(
    { error: "The ASTRO data layer could not complete this request.", code: "INTERNAL" },
    { status: 500 },
  );
}
