/**
 * POST /api/driver/documents
 *
 * Uploads a driver applicant's KYC documents (license, NIN card, vehicle
 * particulars) to the private `driver-docs` Supabase Storage bucket and
 * returns their object paths. The driver-apply flow then persists those
 * paths into driver_applications.{license_url,nin_doc_url,particulars_url}.
 *
 * Why a server route (not a direct client upload): CLAUDE.md forbids UI
 * code from touching Supabase directly, and the bucket is private. The
 * service-role client uploads under a path keyed by the VERIFIED user id
 * (from the JWT, never client input), so a user can only ever write to
 * their own folder.
 *
 * Multipart form fields (all optional — uploads are not required to apply):
 *   license      — image/pdf
 *   nin_doc      — image/pdf
 *   particulars  — image/pdf
 *
 * Returns { licenseUrl, ninDocUrl, particularsUrl } — object paths
 * (e.g. "<userId>/license-1718000000000.jpg"), null when not provided.
 */
import 'server-only';

import { requireAuth }                 from '@/lib/server/supabase.server';
import { ok, badRequest, serverError } from '@/lib/api/response';
import { withLogger }                  from '@/lib/api/withLogger';
import { getAdminSupabase }            from '@/lib/server/supabase.admin';

const BUCKET = 'driver-docs';

// Mirror the bucket's own constraints so we fail fast with a clear message
// instead of a generic storage error.
const MAX_BYTES     = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME  = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const EXT_BY_MIME   = {
  'image/jpeg':      'jpg',
  'image/png':       'png',
  'image/webp':      'webp',
  'application/pdf': 'pdf',
};

// form field → response key
const FIELDS = [
  { field: 'license',     key: 'licenseUrl' },
  { field: 'nin_doc',     key: 'ninDocUrl' },
  { field: 'particulars', key: 'particularsUrl' },
];

export const POST = withLogger('driver.documents.upload', async (request) => {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  let form;
  try {
    form = await request.formData();
  } catch {
    return badRequest('Expected a multipart/form-data body.');
  }

  const admin  = getAdminSupabase();
  const result = { licenseUrl: null, ninDocUrl: null, particularsUrl: null };

  for (const { field, key } of FIELDS) {
    const file = form.get(field);
    if (!file || typeof file === 'string' || file.size === 0) continue; // not provided

    if (file.size > MAX_BYTES) {
      return badRequest(`${field} is larger than 5 MB.`);
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return badRequest(`${field} must be a JPG, PNG, WEBP, or PDF file.`);
    }

    const ext  = EXT_BY_MIME[file.type];
    const path = `${user.id}/${field}-${Date.now()}.${ext}`;

    const bytes = Buffer.from(await file.arrayBuffer());
    const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type,
      upsert:      true,
    });

    if (error) {
      console.error('[driver.documents.upload] storage error:', error.message);
      return serverError('Failed to upload documents. Please try again.');
    }

    result[key] = path;
  }

  return ok(result);
});
