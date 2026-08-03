/**
 * Reads the `error` field from a non-ok Response body.
 * Falls back to `fallback` if the body isn't JSON or has no `error` field.
 */
export async function getApiError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.error === "string" && body.error) return body.error;
  } catch { /* non-JSON body */ }
  return fallback;
}
