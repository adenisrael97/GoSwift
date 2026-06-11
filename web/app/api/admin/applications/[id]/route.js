import { requireAdmin }   from '@/lib/server/adminGuard';
import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { ok, notFound, serverError } from '@/lib/api/response';
import { withLogger } from '@/lib/api/withLogger';

export const GET = withLogger('admin.applications.get', async (request, { params }) => {
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  const { id } = await params;

  const admin = getAdminSupabase();

  const { data, error } = await admin
    .from('driver_applications')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return notFound('Application not found');

  // Mint short-lived signed URLs for the private KYC documents so the admin
  // can view them without the bucket ever being public. Links expire in 5
  // minutes — the review page can be reloaded to refresh them.
  const documents = {};
  const DOC_COLUMNS = [
    { col: 'license_url',     key: 'license' },
    { col: 'nin_doc_url',     key: 'ninDoc' },
    { col: 'particulars_url', key: 'particulars' },
  ];
  for (const { col, key } of DOC_COLUMNS) {
    const path = data[col];
    if (!path) { documents[key] = null; continue; }
    const { data: signed } = await admin
      .storage.from('driver-docs')
      .createSignedUrl(path, 300);
    documents[key] = signed?.signedUrl ?? null;
  }

  return ok({ application: { ...data, documents } });
});
