import { NextResponse } from "next/server";

import {
  resolveEmailFromIdentifier,
  requestPasswordReset,
} from "@/lib/server/auth/sessionService";
import { validateBody }        from "@/lib/api/validate";
import { ForgotPasswordSchema } from "@/lib/api/schemas/auth";
import { withLogger }          from "@/lib/api/withLogger";

/**
 * POST /api/auth/forgot-password
 *
 * Sends a password-recovery email. Accepts an email OR phone identifier
 * (phone is resolved to the account email). ALWAYS responds 200 with the
 * same body whether or not an account matched — this prevents account
 * enumeration. The recovery link lands on /reset-password.
 */
export const POST = withLogger("auth.forgot-password.create", async (request) => {
  const { data, errorResponse } = await validateBody(request, ForgotPasswordSchema);
  if (errorResponse) return errorResponse;

  const email = await resolveEmailFromIdentifier(data.identifier);

  if (email) {
    // Behind a proxy NEXT_PUBLIC_SITE_URL is authoritative; otherwise derive
    // the origin from the request. redirectTo must be allow-listed in
    // Supabase → Authentication → URL Configuration → Redirect URLs.
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
    await requestPasswordReset(email, `${origin}/reset-password`);
  }

  // Uniform response — never disclose whether the account exists.
  return NextResponse.json({
    success: true,
    message: "If an account exists, a password reset link has been sent.",
  });
});
