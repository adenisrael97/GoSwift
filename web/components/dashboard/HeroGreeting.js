import Link from 'next/link';
import { Package, ClipboardList } from 'lucide-react';

function resolveDisplayName(fullName, phone) {
  if (fullName) return fullName.split(' ')[0];
  if (phone)    return phone.replace('+234', '0').slice(0, 8) + '...';
  return 'there';
}

export default function HeroGreeting({ phone, fullName }) {
  const displayName = resolveDisplayName(fullName, phone);

  return (
    <section className="relative bg-[#0F1923] rounded-2xl p-6 sm:p-8 text-white overflow-hidden shadow-xl">
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff6b35]/20 blur-[100px] rounded-full -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#ff6b35]/10 blur-[80px] rounded-full -ml-16 -mb-16 pointer-events-none" />

      <div className="relative z-10">
        <p className="text-sm text-slate-400 mb-1">Welcome back,</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-6 tracking-tight">
          Hello, {displayName} 👋
        </h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/dashboard/new-order"
            className="flex-1 sm:max-w-xs bg-[#ff6b35] hover:bg-[#e55c28] text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-[#ff6b35]/30"
          >
            <Package size={18} />
            Send Package
          </Link>
          <Link
            href="/dashboard/orders"
            className="flex-1 sm:max-w-xs bg-white/10 hover:bg-white/20 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <ClipboardList size={18} />
            My Orders
          </Link>
        </div>
      </div>
    </section>
  );
}
