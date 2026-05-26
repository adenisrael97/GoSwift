'use client';

import OrderReviewCard from './OrderReviewCard';
import PaymentMethodSelector from './PaymentMethodSelector';

export default function CheckoutSummary({ order, paymentMethod, onPaymentMethodChange }) {
  return (
    <div className="space-y-8">
      <OrderReviewCard
        pickup={order.pickup}
        dropoff={order.dropoff}
        packageType={order.packageType}
        vehicleType={order.vehicle ?? 'car'}
        weight={order.weight}
      />

      <PaymentMethodSelector
        selected={paymentMethod}
        onSelect={onPaymentMethodChange}
      />
    </div>
  );
}
