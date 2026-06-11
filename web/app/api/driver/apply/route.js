/**
 * POST /api/driver/apply
 *
 * Inserts a new driver application row. The form is auth-gated on the
 * frontend so every submission arrives with a valid session; user_id is
 * always set. Returns 401 if the token is missing or invalid.
 */

import { after } from 'next/server';

import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { requireAuth }      from '@/lib/server/supabase.server';
import { created, conflict, serverError } from '@/lib/api/response';
import { validateBody }     from '@/lib/api/validate';
import { ApplyDriverSchema } from '@/lib/api/schemas/drivers';
import { withLogger } from '@/lib/api/withLogger';
import { sendEmail } from '@/lib/server/email/send';
import { driverApplicationReceived } from '@/lib/server/email/templates';

export const POST = withLogger('driver.apply.create', async (request) => {
  const { data: body, errorResponse: validationErr } =
    await validateBody(request, ApplyDriverSchema);
  if (validationErr) return validationErr;

  const { user, errorResponse: authErr } = await requireAuth(request);
  if (authErr) return authErr;
  const userId = user.id;

  const { data: existing } = await getAdminSupabase()
    .from('driver_applications')
    .select('id')
    .eq('user_id', userId)
    .in('status', ['pending', 'approved'])
    .maybeSingle();

  if (existing) {
    return conflict('You already have a pending or approved driver application.');
  }

  const { data: application, error } = await getAdminSupabase()
    .from('driver_applications')
    .insert({
      user_id:         userId,
      full_name:       body.fullName,
      phone:           body.phone,
      email:           body.email          || null,
      date_of_birth:   body.dateOfBirth    || null,
      gender:          body.gender         || null,
      nin:             body.nin            || null,
      address:         body.address        || null,
      state:           body.state          || null,
      vehicle_type:    body.vehicleType,
      vehicle_model:   body.vehicleModel   || null,
      plate_number:    body.plateNumber,
      manufacturer:    body.manufacturer   || null,
      vehicle_color:   body.vehicleColor   || null,
      guarantor_name:  body.guarantorName  || null,
      guarantor_phone: body.guarantorPhone || null,
      license_url:     body.licenseUrl     || null,
      nin_doc_url:     body.ninDocUrl      || null,
      particulars_url: body.particularsUrl || null,
      status:          'pending',
      submitted_at:    new Date().toISOString(),
    })
    .select('id, status, submitted_at')
    .single();

  if (error) {
    console.error('[POST /api/driver/apply]', error.message);
    return serverError('Failed to submit application');
  }

  // "Application received" email. The form email is optional, so fall
  // back to the authed account email. Sent after the response flushes.
  const applicantEmail = body.email || user.email;
  after(async () => {
    const { subject, html } = driverApplicationReceived({ name: body.fullName });
    await sendEmail({ to: applicantEmail, subject, html });
  });

  return created({ applicationId: application.id, status: application.status });
});
