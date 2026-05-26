import Link from 'next/link';
import { Bike, Truck, ClipboardList, LifeBuoy } from 'lucide-react';

/**
 * Three dashboard entry points:
 *   - Bike: fast path, skips the vehicle picker (vehicle=bike pre-selected).
 *   - Request: opens the picker for tricycle / car / pickup / truck.
 *   - My Orders: history view.
 *
 * Bike is the primary CTA because it's the highest-volume use case
 * on a logistics MVP; heavier vehicles route through Request.
 */
const ACTIONS = [
  {
    icon:    Bike,
    label:   'Send by Bike',
    sub:     'Quick small-package delivery',
    href:    '/dashboard/new-order?vehicle=bike',
    primary: true,
  },
  {
    icon:    Truck,
    label:   'Request a Vehicle',
    sub:     'Tricycle, car, pickup or truck',
    href:    '/dashboard/new-order/request',
    primary: false,
  },
  {
    icon:    ClipboardList,
    label:   'My Orders',
    sub:     'View history',
    href:    '/dashboard/orders',
    primary: false,
  },
  {
    icon:    LifeBuoy,
    label:   'Support',
    sub:     'Help center & FAQs',
    href:    '/dashboard/support/help-center',
    primary: false,
  },
];

export default function QuickActions() {
  return (
    <section>
      <h2 className="text-base font-bold text-slate-900 mb-3">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map(({ icon: Icon, label, sub, href, primary }) => (
          <Link key={label} href={href} className="block">
            <div
              className={`p-5 rounded-2xl border flex flex-col gap-3 hover:shadow-md active:scale-95 transition-all shadow-sm h-full ${
                primary
                  ? 'bg-[#ff6b35] border-transparent shadow-orange-200'
                  : 'bg-white border-slate-100'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  primary ? 'bg-white/20' : 'bg-orange-50'
                }`}
              >
                <Icon size={20} className={primary ? 'text-white' : 'text-[#ff6b35]'} />
              </div>
              <div>
                <p className={`text-sm font-bold leading-tight ${primary ? 'text-white' : 'text-slate-800'}`}>
                  {label}
                </p>
                <p className={`text-xs mt-0.5 ${primary ? 'text-white/70' : 'text-slate-400'}`}>
                  {sub}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
