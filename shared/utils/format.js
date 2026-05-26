/**
 * Shared formatting utilities — platform-agnostic (web + mobile).
 * Keep all presentation-layer data transforms here so components stay declarative.
 */

/**
 * Formats a number as a Nigerian Naira string.
 * e.g. formatCurrency(4250) → "₦4,250.00"
 */
export function formatCurrency(amount) {
  return `₦${Number(amount).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formats a UTC ISO timestamp as a human-readable relative string.
 * e.g. "2 mins ago", "Yesterday", "15 Jan"
 */
export function formatRelativeTime(isoString) {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);

  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  return new Date(isoString).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}
