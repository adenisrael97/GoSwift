import { NextResponse, after } from "next/server";

import {
  registerAccount,
  signInWithPassword,
} from "@/lib/server/auth/sessionService";
import { sendEmail } from "@/lib/server/email/send";
import { customerWelcome } from "@/lib/server/email/templates";
import { validateBody }      from "@/lib/api/validate";
import { RegisterSchema }    from "@/lib/api/schemas/auth";
import { withLogger }        from "@/lib/api/withLogger";

/**
 * POST /api/auth/register
 *
 * Creates an account (email + password, phone stored as the delivery
 * contact), signs the new user in, and returns the session tokens. The client
 * hydrates the browser client with setSession(), which persists the session
 * into the Supabase auth cookies that proxy.js refreshes on every request.
 */
export const POST = withLogger("auth.register.create", async (request) => {
  const { data, errorResponse } = await validateBody(request, RegisterSchema);
  if (errorResponse) return errorResponse;

  const { fullName, email, phone, password } = data;

  const created = await registerAccount({ fullName, email, phone, password });
  if (created.error) {
    return NextResponse.json(
      { error: created.error },
      { status: created.code === "conflict" ? 409 : 400 },
    );
  }

  // Welcome email — sent after the response flushes so it never adds
  // latency or fails the signup. sendEmail() swallows its own errors.
  after(async () => {
    const { subject, html } = customerWelcome({ name: fullName });
    await sendEmail({ to: email, subject, html });
  });

  // Mint a session via the normal sign-in path so register and login share
  // one token-issuing surface.
  const { session, user, code: signInCode } = await signInWithPassword(email, password);
  if (signInCode || !session) {
    // The account was created but auto sign-in failed (e.g. a transient
    // network blip) — point the user at the login page rather than erroring
    // opaquely.
    return NextResponse.json(
      { error: "Account created. Please sign in." },
      { status: 503 },
    );
  }

  // New accounts are always 'customer' — driver promotion only happens via
  // explicit application + admin approval, never at registration time.
  return NextResponse.json({
    success: true,
    role: "customer",
    profileName: fullName,
    user:    { id: user?.id, phone, email },
    session: {
      access_token:  session.access_token,
      refresh_token: session.refresh_token,
    },
  });
});
