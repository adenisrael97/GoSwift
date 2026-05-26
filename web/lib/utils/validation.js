// E.164: + followed by 8–15 digits (covers all country codes + subscriber)
const E164_REGEX = /^\+\d{8,15}$/;
// Pragmatic email shape — full RFC 5322 is overkill; this rejects the
// obvious garbage and Supabase does the authoritative check on signUp.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72; // bcrypt truncates beyond 72 bytes; reject early so
                         // users aren't silently authenticated on a prefix.

/**
 * Normalizes a (countryCode, localNumber) pair into E.164 format.
 * Strips leading 0 from localNumber — common for Nigerian inputs (0801... → 801...).
 */
export function buildE164(countryCode, localDigits) {
  const digits = localDigits.replace(/\D/g, "");
  const stripped = digits.startsWith("0") ? digits.slice(1) : digits;
  return `${countryCode}${stripped}`;
}

export function validatePhone(phone) {
  if (!phone || typeof phone !== "string") {
    return { valid: false, error: "Phone number is required" };
  }
  const sanitized = phone.trim();
  if (!E164_REGEX.test(sanitized)) {
    return { valid: false, error: "Invalid phone number format (expected E.164)" };
  }
  return { valid: true, phone: sanitized };
}

export function validateEmail(email) {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required" };
  }
  const sanitized = email.trim().toLowerCase();
  if (sanitized.length > 254 || !EMAIL_REGEX.test(sanitized)) {
    return { valid: false, error: "Enter a valid email address" };
  }
  return { valid: true, email: sanitized };
}

export function validatePassword(password) {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" };
  }
  if (password.length < PASSWORD_MIN) {
    return { valid: false, error: `Password must be at least ${PASSWORD_MIN} characters` };
  }
  if (password.length > PASSWORD_MAX) {
    return { valid: false, error: `Password must be at most ${PASSWORD_MAX} characters` };
  }
  return { valid: true, password };
}

/**
 * Classifies a login identifier as an email or a phone number. The login
 * form sends a single `identifier` field; the server uses this to decide
 * whether to sign in directly (email) or resolve phone → email first.
 *
 * Returns { type: 'email', email } | { type: 'phone', phone } | { type: null, error }.
 */
export function classifyIdentifier(identifier) {
  if (!identifier || typeof identifier !== "string") {
    return { type: null, error: "Email or phone is required" };
  }
  const sanitized = identifier.trim();
  if (sanitized.includes("@")) {
    const r = validateEmail(sanitized);
    return r.valid ? { type: "email", email: r.email } : { type: null, error: r.error };
  }
  const r = validatePhone(sanitized);
  return r.valid ? { type: "phone", phone: r.phone } : { type: null, error: r.error };
}
