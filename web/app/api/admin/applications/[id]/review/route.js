import { after } from 'next/server';

import { requireAdmin }      from '@/lib/server/adminGuard';
import { getAdminSupabase }  from '@/lib/server/supabase.admin';
import { ok, notFound, serverError } from '@/lib/api/response';
import { validateBody }      from '@/lib/api/validate';
import { ReviewApplicationSchema } from '@/lib/api/schemas/admin';
import { withLogger } from '@/lib/api/withLogger';
import { sendEmail } from '@/lib/server/email/send';
import { driverApproved } from '@/lib/server/email/templates';

export const POST = withLogger('admin.applications.review.create', async (request, { params }) => {
  const { user, errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  const { id } = await params;

  const { data: body, errorResponse: validationErr } =
    await validateBody(request, ReviewApplicationSchema);
  if (validationErr) return validationErr;

  const { decision } = body;
  const admin       = getAdminSupabase();
  const cleanNotes  = body.notes?.trim() || null;

  // ── Rejection path — single write, no atomicity needed ──────────────────
  if (decision === 'rejected') {
    const { data: rejected, error } = await admin
      .from('driver_applications')
      .update({
        status:       'rejected',
        review_notes: cleanNotes,
        reviewed_by:  user.id,
        reviewed_at:  new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending') // guard against double-review
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[POST review/rejected]', error.message);
      return serverError('Failed to reject application');
    }
    // Zero rows matched → application is missing or was already reviewed.
    // Without this check we'd return success and the admin UI would think
    // it rejected an application that's been approved.
    if (!rejected) return notFound('Application not found or already reviewed');

    return ok({ decision, applicationId: id });
  }

  // ── Approval path — atomic RPC (single Postgres transaction) ────────────
  // The function approve_driver_application() does all three writes inside
  // one transaction with a FOR UPDATE lock on the application row, so a
  // failure at any step rolls back the entire operation.
  const { error: rpcError } = await admin.rpc('approve_driver_application', {
    p_application_id: id,
    p_reviewer_id:    user.id,
    p_notes:          cleanNotes,
  });

  if (rpcError) {
    if (rpcError.message?.includes('application_not_found')) {
      return notFound('Application not found or already reviewed');
    }
    console.error('[POST review/approved]', rpcError.message);
    return serverError('Failed to approve application');
  }

  // Approval succeeded (the RPC guards against double-approval via
  // status='pending', so this fires exactly once on the real transition).
  // Send the "you're approved" email after the response flushes.
  after(async () => {
    const { data: app } = await admin
      .from('driver_applications')
      .select('email, full_name, user_id')
      .eq('id', id)
      .maybeSingle();
    if (!app) return;

    // Prefer the form email; fall back to the linked account's auth email.
    let to = app.email;
    if (!to && app.user_id) {
      const { data } = await admin.auth.admin.getUserById(app.user_id);
      to = data?.user?.email || null;
    }
    if (!to) return;

    const { subject, html } = driverApproved({ name: app.full_name });
    await sendEmail({ to, subject, html });
  });

  return ok({ decision, applicationId: id });
});
