/**
 * POST /api/payments/initialize
 *
 * Step 1 of the Paystack card-payment flow.
 *
 * - Validates order details
 * - Creates the order row in `pending` state
 * - Initialises a Paystack transaction (order UUID = Paystack reference)
 * - Returns { orderId, authorizationUrl, reference }
 *
 * The client redirects the browser to authorizationUrl.  After the user
 * completes (or abandons) payment, Paystack redirects back to
 * /dashboard/payment/callback, which calls /api/payments/verify.
 *
 * On Paystack failure the pending order row is deleted so the user's
 * order list stays clean and they can retry from checkout.
 */
import 'server-only';

import { requireAuth }             from '@/lib/server/supabase.server';
import { ok, badRequest, serverError } from '@/lib/api/response';
import { validateBody }            from '@/lib/api/validate';
import { withLogger }              from '@/lib/api/withLogger';
import { InitializePaymentSchema } from '@/lib/api/schemas/payments';
import { initializeTransaction }   from '@/lib/server/paystack/client';
import { getAdminSupabase }        from '@/lib/server/supabase.admin';

export const POST = withLogger('payments.initialize', async (request) => {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  // Paystack requires an email address; email+password auth guarantees this.
  if (!user.email) {
    return badRequest('An email address is required for card payments.');
  }

  const { data: payload, errorResponse: validationErr } =
    await validateBody(request, InitializePaymentSchema);
  if (validationErr) return validationErr;

  const {
    pickup, pickupLat, pickupLng,
    dropoff, dropoffLat, dropoffLng,
    packageType, vehicleType, weight, note, fareEstimate,
    senderPhone, receiverName, receiverPhone,
  } = payload;

  // Create order in pending state using the admin client. The hardened RLS
  // INSERT policy enforces status='confirmed' for customer-scoped writes,
  // which would block the 'pending' state we need here. Using the service-role
  // client is safe because user_id comes from the verified JWT (not user input)
  // and all other fields are Zod-validated above.
  const { data: order, error: insertError } = await getAdminSupabase()
    .from('orders')
    .insert({
      user_id:        user.id,
      pickup:         pickup.trim(),
      pickup_lat:     pickupLat  != null ? Number(pickupLat)  : null,
      pickup_lng:     pickupLng  != null ? Number(pickupLng)  : null,
      dropoff:        dropoff.trim(),
      dropoff_lat:    dropoffLat != null ? Number(dropoffLat) : null,
      dropoff_lng:    dropoffLng != null ? Number(dropoffLng) : null,
      package_type:   packageType ?? 'parcel',
      vehicle_type:   vehicleType ?? 'car',
      weight:         Number(weight) || 0,
      note:           note?.trim() || null,
      fare_amount:    Number(fareEstimate),
      payment_method: 'card',
      payment_status: 'pending',
      status:         'pending',
      sender_phone:   senderPhone?.trim()  || null,
      receiver_name:  receiverName?.trim() || null,
      receiver_phone: receiverPhone?.trim() || null,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[payments.initialize] DB insert failed:', {
      code: insertError.code,
      message: insertError.message,
    });
    return serverError('Failed to create order. Please try again.');
  }

  // Amounts in Kobo (NGN × 100). Math.round guards floating-point drift.
  const amountKobo  = Math.round(Number(fareEstimate) * 100);
  const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/payment/callback`;

  const { ok: psOk, data: psData } = await initializeTransaction({
    email:      user.email,
    amountKobo,
    reference:  order.id,   // order UUID is the Paystack reference
    callbackUrl,
    metadata: {
      order_id: order.id,
      user_id:  user.id,
      custom_fields: [
        { display_name: 'Order ID', variable_name: 'order_id', value: order.id },
        { display_name: 'Pickup',   variable_name: 'pickup',   value: pickup },
        { display_name: 'Dropoff',  variable_name: 'dropoff',  value: dropoff },
      ],
    },
  });

  if (!psOk || !psData?.data?.authorization_url) {
    // Roll back the pending order so the user can retry cleanly.
    await getAdminSupabase().from('orders').delete().eq('id', order.id);
    console.error('[payments.initialize] Paystack init failed:', {
      psStatus: psData?.status,
      psMessage: psData?.message,
    });
    return serverError('Payment service unavailable. Please try again.');
  }

  return ok({
    orderId:          order.id,
    authorizationUrl: psData.data.authorization_url,
    reference:        psData.data.reference,
  });
});
