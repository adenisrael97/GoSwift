/**
 * Admin API — every admin read and write goes through the /api/admin/*
 * routes (which run under the service role + adminGuard server-side).
 *
 * No direct Supabase reads here: admin views span all users / drivers /
 * orders, which RLS would never allow for an admin's own JWT. The server
 * is the only place that legitimately holds that authority.
 */
import { supabase, authedFetch } from './client';

// ── Reads ───────────────────────────────────────────────────────────

/**
 * Helper: build a `?page=&limit=` querystring; returns '' when both defaults.
 * @param {string} path
 * @param {{ page?: number, limit?: number }} [opts]
 */
function paginated(path, { page, limit } = {}) {
  if (page == null && limit == null) return path;
  const qs = new URLSearchParams();
  if (page  != null) qs.set('page',  String(page));
  if (limit != null) qs.set('limit', String(limit));
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}${qs.toString()}`;
}

export function getAdminStats()                  { return authedFetch('/api/admin/stats',    { method: 'GET' }); }
export function listAdminDrivers()               { return authedFetch('/api/admin/drivers',  { method: 'GET' }); }
export function getAdminSettings()               { return authedFetch('/api/admin/settings', { method: 'GET' }); }

/** @param {{ page?: number, limit?: number }} [opts] */
export function listAdminUsers(opts = {})        { return authedFetch(paginated('/api/admin/users',        opts), { method: 'GET' }); }
/** @param {{ page?: number, limit?: number }} [opts] */
export function listAdminApplications(opts = {}) { return authedFetch(paginated('/api/admin/applications', opts), { method: 'GET' }); }
/** @param {{ page?: number, limit?: number }} [opts] */
export function listAdminOrders(opts = {})       { return authedFetch(paginated('/api/admin/orders',       opts), { method: 'GET' }); }

export function getAdminApplication(id) {
  return authedFetch(`/api/admin/applications/${id}`, { method: 'GET' });
}

export function getAdminOrder(orderId) {
  return authedFetch(`/api/admin/orders/${orderId}`, { method: 'GET' });
}

// ── Writes ──────────────────────────────────────────────────────────

export function updateAdminSettings(payload) {
  return authedFetch('/api/admin/settings', {
    method: 'PATCH',
    body:   JSON.stringify(payload),
  });
}

/** Approve or reject a driver application. Server records reviewer + reason. */
export function reviewAdminApplication(id, decision) {
  return authedFetch(`/api/admin/applications/${id}/review`, {
    method: 'POST',
    body:   JSON.stringify(decision),
  });
}

export function assignAdminOrder(orderId, driverId) {
  return authedFetch(`/api/admin/orders/${orderId}/assign`, {
    method: 'POST',
    body:   JSON.stringify({ driverId }),
  });
}

export function cancelAdminOrder(orderId, reason) {
  return authedFetch(`/api/admin/orders/${orderId}/cancel`, {
    method: 'POST',
    body:   JSON.stringify({ reason }),
  });
}

// ── Realtime ────────────────────────────────────────────────────────

/**
 * Admin dashboard subscribes to all order changes (not user-filtered).
 *
 * Requires Realtime to be enabled on the orders table with admin-scoped
 * RLS that allows the admin role to receive every row. Returns the
 * channel so callers can clean up on unmount.
 */
export function subscribeAdminOrders(onChange) {
  return supabase
    .channel('admin-orders-feed')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      onChange,
    )
    .subscribe();
}

/**
 * Admin dashboard subscribes to new driver application submissions.
 * Fires on INSERT (new pending application arrives).
 * Migration 029 adds driver_applications to the realtime publication.
 */
export function subscribeAdminApplications(onChange) {
  return supabase
    .channel('admin-applications-feed')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'driver_applications' },
      onChange,
    )
    .subscribe();
}
