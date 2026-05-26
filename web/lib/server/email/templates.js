/**
 * GoSwift email templates.
 *
 * Each export returns { subject, html }. Plain inline-styled HTML —
 * email clients ignore <style>/external CSS and don't run flexbox/grid,
 * so layout uses tables and inline styles. No build step, no MJML.
 *
 * Keep these content-only; sending/branding identity lives in send.js.
 */

const BRAND = '#0F62FE'; // GoSwift primary
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://goswift.app';

/**
 * Wraps body HTML in the shared GoSwift shell (header wordmark + footer).
 * @param {string} bodyHtml
 */
function layout(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:${BRAND};padding:20px 32px;">
          <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">GoSwift</span>
        </td></tr>
        <tr><td style="padding:32px;font-size:16px;line-height:1.6;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #eee;font-size:12px;color:#888;">
          You're receiving this because you have a GoSwift account.<br>
          &copy; ${new Date().getFullYear()} GoSwift. All rights reserved.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(label, href) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:8px;background:${BRAND};">
    <a href="${href}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${label}</a>
  </td></tr></table>`;
}

function greeting(name) {
  return name ? `Hi ${name},` : 'Hi there,';
}

/**
 * Customer welcome email — sent on account registration.
 * @param {{ name?: string }} [opts]
 */
export function customerWelcome({ name } = {}) {
  return {
    subject: 'Welcome to GoSwift 🎉',
    html: layout(`
      <p style="margin:0 0 16px;">${greeting(name)}</p>
      <p style="margin:0 0 16px;">Welcome to <strong>GoSwift</strong> — your account is ready. You can now request deliveries and track them in real time.</p>
      ${button('Open GoSwift', SITE)}
      <p style="margin:16px 0 0;color:#555;">Need a hand? Just reply to this email and we'll help.</p>
    `),
  };
}

/**
 * Driver "we received your application" email — sent on application submit.
 * @param {{ name?: string }} [opts]
 */
export function driverApplicationReceived({ name } = {}) {
  return {
    subject: 'We received your GoSwift driver application',
    html: layout(`
      <p style="margin:0 0 16px;">${greeting(name)}</p>
      <p style="margin:0 0 16px;">Thanks for applying to drive with <strong>GoSwift</strong>. We've received your application and our team is reviewing it now.</p>
      <p style="margin:0 0 16px;">You'll get another email the moment your application is approved — no need to do anything until then.</p>
      <p style="margin:16px 0 0;color:#555;">Questions about your application? Reply to this email.</p>
    `),
  };
}

/**
 * Driver "you're approved" email — sent on admin approval.
 * @param {{ name?: string }} [opts]
 */
export function driverApproved({ name } = {}) {
  const dashboardUrl = `${SITE}/driver/dashboard`;
  return {
    subject: "You're approved to drive with GoSwift 🚗",
    html: layout(`
      <p style="margin:0 0 16px;">${greeting(name)}</p>
      <p style="margin:0 0 16px;">Great news — your <strong>GoSwift</strong> driver application has been <strong>approved</strong>. You can now go online and start accepting delivery requests.</p>
      ${button('Go to your dashboard', dashboardUrl)}
      <p style="margin:16px 0 0;color:#555;">Welcome to the team. Drive safe!</p>
    `),
  };
}

/**
 * Customer "driver assigned" email — sent when a driver accepts the order.
 * @param {{ name?: string, driverName?: string, orderId?: string, pickup?: string }} [opts]
 */
export function orderDriverAssigned({ name, driverName, orderId, pickup } = {}) {
  const trackUrl = orderId ? `${SITE}/dashboard/orders/${orderId}` : `${SITE}/dashboard`;
  return {
    subject: 'Your driver is on the way — GoSwift',
    html: layout(`
      <p style="margin:0 0 16px;">${greeting(name)}</p>
      <p style="margin:0 0 16px;"><strong>${driverName ?? 'Your driver'}</strong> has accepted your delivery and is heading to the pickup point.</p>
      ${pickup ? `<p style="margin:0 0 16px;background:#f8f8f8;padding:12px 16px;border-radius:8px;font-size:14px;"><strong>Pickup:</strong> ${pickup}</p>` : ''}
      ${button('Track your delivery', trackUrl)}
      <p style="margin:16px 0 0;color:#555;">You will receive another update when your package is picked up.</p>
    `),
  };
}

/**
 * Customer "package picked up" email — sent when driver marks in_transit.
 * @param {{ name?: string, orderId?: string, dropoff?: string }} [opts]
 */
export function orderPickedUp({ name, orderId, dropoff } = {}) {
  const trackUrl = orderId ? `${SITE}/dashboard/orders/${orderId}` : `${SITE}/dashboard`;
  return {
    subject: 'Your package is on its way — GoSwift',
    html: layout(`
      <p style="margin:0 0 16px;">${greeting(name)}</p>
      <p style="margin:0 0 16px;">Your package has been <strong>picked up</strong> and is now on its way to the dropoff location.</p>
      ${dropoff ? `<p style="margin:0 0 16px;background:#f8f8f8;padding:12px 16px;border-radius:8px;font-size:14px;"><strong>Delivering to:</strong> ${dropoff}</p>` : ''}
      ${button('Track your delivery', trackUrl)}
      <p style="margin:16px 0 0;color:#555;">We will notify you when your package arrives.</p>
    `),
  };
}

/**
 * Customer "order delivered" email — sent when driver marks delivered.
 * @param {{ name?: string, orderId?: string }} [opts]
 */
export function orderDelivered({ name, orderId } = {}) {
  const receiptUrl = orderId ? `${SITE}/dashboard/orders/${orderId}/summary` : `${SITE}/dashboard`;
  return {
    subject: 'Your package has been delivered — GoSwift',
    html: layout(`
      <p style="margin:0 0 16px;">${greeting(name)}</p>
      <p style="margin:0 0 16px;">Great news — your package has been successfully <strong>delivered</strong>. Thank you for using GoSwift!</p>
      ${button('View receipt', receiptUrl)}
      <p style="margin:16px 0 0;color:#555;">Need to report an issue? Reply to this email and our team will assist you.</p>
    `),
  };
}
