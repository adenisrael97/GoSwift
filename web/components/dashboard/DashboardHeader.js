import Link from 'next/link';
import { Bell, HelpCircle, Truck } from 'lucide-react';

function getInitials(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function DashboardHeader({ phone, fullName, role }) {
  const initials = fullName ? getInitials(fullName) : null;

  return (
    <header className="sticky top-0 z-50 flex justify-between items-center w-full px-4 sm:px-8 py-4 bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm">
      <span className="text-xl font-extrabold text-slate-900 tracking-tight">GoSwift</span>

      <div className="flex items-center gap-2">
        {role === 'driver' && (
          <Link
            href="/driver/dashboard"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1923] hover:bg-slate-800 active:bg-slate-900 text-white text-xs font-bold transition-all"
            aria-label="Switch to Driver Dashboard"
          >
            <Truck size={14} />
            Driver Mode
          </Link>
        )}

        <button
          className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 active:scale-95"
          aria-label="Notifications"
        >
          <Bell size={20} />
        </button>
        <button
          className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 active:scale-95"
          aria-label="Help"
        >
          <HelpCircle size={20} />
        </button>

        <Link
          href="/profile"
          aria-label="My account"
          className="ml-1 active:scale-95 transition-transform"
        >
          {initials ? (
            <div className="w-9 h-9 rounded-full bg-[#ff6b35] flex items-center justify-center hover:opacity-90 transition-opacity">
              <span className="text-white text-xs font-extrabold tracking-wide">{initials}</span>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
              <span className="text-slate-400 text-xs font-bold">?</span>
            </div>
          )}
        </Link>
      </div>
    </header>
  );
}
