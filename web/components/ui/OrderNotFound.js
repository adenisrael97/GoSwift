import Link from 'next/link';

/**
 * Full-screen empty state shown when an order ID does not match any record.
 * Used by the order detail, tracking, and summary pages.
 */
export default function OrderNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <p className="text-4xl mb-3">📦</p>
        <p className="text-slate-700 font-bold mb-2">Order not found</p>
        <Link href="/dashboard/orders" className="text-sm text-[#ff6b35] font-bold hover:underline">
          ← Back to Orders
        </Link>
      </div>
    </div>
  );
}
