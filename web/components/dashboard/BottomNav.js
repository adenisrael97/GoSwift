'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Truck, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { id: 'home',    icon: LayoutGrid, label: 'Home',    href: '/dashboard' },
  { id: 'orders',  icon: Truck,      label: 'Orders',  href: '/dashboard/orders' },
  { id: 'account', icon: User,       label: 'Account', href: '/profile' },
];

export default function BottomNav() {
  const pathname      = usePathname();
  const { role }      = useAuth();
  const isDriver      = role === 'driver';

  function isActive(item) {
    if (item.id === 'home')    return pathname === '/dashboard';
    if (item.id === 'orders')  return pathname.startsWith('/dashboard/orders');
    if (item.id === 'account') return pathname.startsWith('/profile');
    return false;
  }

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl z-50 flex justify-around items-center px-2 pb-6 pt-2 bg-white/95 backdrop-blur-xl border-t border-slate-100 shadow-[0_-8px_30px_rgba(15,23,42,0.08)]">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item);
        const Icon   = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 px-6 py-2 rounded-xl transition-all active:scale-90 ${
              active
                ? 'bg-orange-50 text-[#ff6b35]'
                : 'text-slate-400 hover:text-[#ff6b35] hover:bg-slate-50'
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span className="text-xs font-bold uppercase tracking-wider leading-none">
              {item.label}
            </span>
          </Link>
        );
      })}

      {isDriver && (
        <Link
          href="/driver/dashboard"
          className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all active:scale-90 text-[#0F1923] hover:text-[#ff6b35] hover:bg-slate-50"
          aria-label="Switch to Driver Dashboard"
        >
          <Truck size={20} strokeWidth={2} />
          <span className="text-xs font-bold uppercase tracking-wider leading-none">Driver</span>
        </Link>
      )}
    </nav>
  );
}
