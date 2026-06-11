/**
 * Web API layer — single entry point for all backend access.
 *
 * Client/UI code imports from '@/lib/api' and gets every read/write
 * helper for auth, profile, orders, drivers, and admin. Direct imports
 * of '@/lib/supabase' from pages / components / hooks are not allowed
 * (see CLAUDE.md "FRONTEND → BACKEND FLOW RULES" — UI components must
 * not call Supabase directly).
 *
 * The raw `supabase` client is re-exported below for the few legitimate
 * cases where the client SDK has to be touched directly (auth state
 * subscriptions wired up in AuthProvider, realtime channel cleanup via
 * supabase.removeChannel). Treat that as a privileged surface — not a
 * back-door for ad-hoc reads.
 *
 * Mirrors the convention in app/services/api/index.js so web and mobile
 * use the same shape for the same kinds of helpers.
 */

// Internal helpers — exported so AuthProvider and realtime hooks can
// reach the singleton client without redefining a module path.
export { supabase, authedFetch, anonymousFetch } from './client';

// Server response helpers (used by /api/* route handlers).
export {
  ok,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  serverError,
} from './response';

// Auth
export {
  register,
  login,
  forgotPassword,
  verifyRecoveryLink,
  updatePassword,
  setSession,
  logout,
  getSession,
  onAuthStateChange,
} from './auth';

// Profile
export {
  getMyProfile,
  getMyProfileSettings,
  updateProfile,
  deleteAccount,
} from './profile';

// Orders (customer-facing)
export {
  CUSTOMER_ACTIVE_STATUSES,
  listMyOrders,
  listRecentMyOrders,
  getMyOrder,
  getMyOrderReceipt,
  createOrder,
  cancelMyOrder,
  advanceOrderStatus,
  subscribeMyOrders,
  subscribeOrderUpdates,
} from './orders';

// Drivers
export {
  getDriverDashboard,
  getDriverEarnings,
  listDriverOrders,
  getDriverProfileDetail,
  getDriverApplicationDocs,
  getDriverOrder,
  listLiveOffers,
  getOfferOrderBrief,
  setDriverOnline,
  postDriverLocation,
  applyAsDriver,
  uploadDriverDocuments,
  acceptOffer,
  rejectOffer,
  releaseOrder,
  subscribeDriverOffers,
  subscribeDriverOrder,
} from './drivers';

// Admin
export {
  getAdminStats,
  listAdminUsers,
  listAdminDrivers,
  listAdminApplications,
  listAdminOrders,
  getAdminSettings,
  getAdminApplication,
  getAdminOrder,
  updateAdminSettings,
  reviewAdminApplication,
  assignAdminOrder,
  cancelAdminOrder,
  subscribeAdminOrders,
  subscribeAdminApplications,
} from './admin';

// Geocoding (address autocomplete)
export { suggestAddress, resolvePlace } from './geocode';

// Payments
export { initializePayment, verifyPayment } from './payments';
export * as payments from './payments';

// Notifications placeholder
export * as notifications from './notifications';
