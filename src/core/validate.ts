import * as z from "zod";

/**
 * Parses `data` against `schema` and returns the typed result.
 * Throws a plain Error with a human-readable message on failure
 * so Commander action handlers can forward it to `die()`.
 */
export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const msg = z.prettifyError(result.error);
    throw new Error(msg);
  }
  return result.data;
}
