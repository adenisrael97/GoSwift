/**
 * Request validation helper for /api/* routes.
 *
 * Standardises Zod parsing + error response shape so every route handler
 * follows the same contract:
 *
 *   const { data, errorResponse } = await validateBody(request, MySchema);
 *   if (errorResponse) return errorResponse;
 *   // data is the parsed, typed payload
 *
 * On failure we return a 400 with a structured error so callers can
 * branch on specific field issues without parsing free-form strings.
 */
import 'server-only';

import { NextResponse } from 'next/server';

/**
 * Parse and validate a JSON request body against a Zod schema.
 *
 * @template T
 * @param {Request} request
 * @param {import('zod').ZodType<T>} schema
 * @returns {Promise<{ data: T, errorResponse: null } | { data: null, errorResponse: NextResponse }>}
 */
export async function validateBody(request, schema) {
  let body;
  try {
    body = await request.json();
  } catch {
    return {
      data: null,
      errorResponse: NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      ),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // Zod's issue list is verbose; condense to the first problem so the
    // client gets a tight, actionable message. The full issue array is
    // still emitted under `details` for debugging without leaking stack
    // traces.
    const first = parsed.error.issues[0];
    const path = first?.path?.length ? first.path.join('.') : null;
    const message = path
      ? `${path}: ${first.message}`
      : (first?.message ?? 'Invalid request body');

    return {
      data: null,
      errorResponse: NextResponse.json(
        {
          error: message,
          details: parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code,
          })),
        },
        { status: 400 },
      ),
    };
  }

  return { data: parsed.data, errorResponse: null };
}

/**
 * Validate `?key=value` query parameters against a Zod schema.
 * Returns the same envelope shape as `validateBody`.
 *
 * @template T
 * @param {Request} request
 * @param {import('zod').ZodType<T>} schema
 * @returns {{ data: T, errorResponse: null } | { data: null, errorResponse: NextResponse }}
 */
export function validateQuery(request, schema) {
  const url = new URL(request.url);
  /** @type {Record<string, string>} */
  const params = {};
  for (const [k, v] of url.searchParams.entries()) params[k] = v;

  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path?.length ? first.path.join('.') : null;
    return {
      data: null,
      errorResponse: NextResponse.json(
        {
          error: path ? `${path}: ${first.message}` : (first?.message ?? 'Invalid query'),
          details: parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code,
          })),
        },
        { status: 400 },
      ),
    };
  }

  return { data: parsed.data, errorResponse: null };
}
