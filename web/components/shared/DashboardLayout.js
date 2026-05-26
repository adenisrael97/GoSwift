'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutGrid,
  Package,
  Users,
  ClipboardCheck,
  Settings,
  Truck,
  Banknote,
  UserCircle,
  Menu,
  X,
  Bell,
  ShoppingBag,
} from 'lucide-react';

const NAV_BY_ROLE = {
  admin: [
    { label: 'Dashboard', icon: LayoutGrid,     href: '/admin/dashboard' },
    { label: 'Orders',    icon: Package,        href: '/admin/orders' },
    { label: 'Drivers',   icon: ClipboardCheck, href: '/admin/drivers' },
    { label: 'Users',     icon: Users,          href: '/admin/users' },
    { label: 'Settings',  icon: Settings,       href: '/admin/settings' },
  ],
  driver: [
    { label: 'Dashboard', icon: LayoutGrid, href: '/driver/dashboard' },
    { label: 'Orders',    icon: Package,    href: '/driver/orders' },
    { label: 'Earnings',  icon: Banknote,   href: '/driver/earnings' },
    { label: 'Profile',   icon: UserCircle, href: '/driver/profile' },
    { label: 'Settings',  icon: Settings,   href: '/driver/settings' },
  ],
};

const ROLE_BADGE = {
  admin:  'Admin',
  driver: 'Driver',
};

function isActive(currentPath, href) {
  if (currentPath === href) return true;
  // Treat /admin/orders/[id] as a child of /admin/orders
  const parent = href.split('/').slice(0, 3).join('/');
  return currentPath.startsWith(parent + '/') && parent === href;
}

/**
 * @param {object} props
 * @param {Array<{ label: string, href: string, icon: any }>} props.items
 * @param {string} props.currentPath
 * @param {() => void} [props.onNavigate]
 */
function SidebarLinks({ items, currentPath, onNavigate }) {
  return (
    <nav className="flex-1 px-3 space-y-1">
      {items.map(({ label, icon: Icon, href }) => {
        const active = isActive(currentPath, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={label}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all justify-center lg:justify-start ${
              active
                ? 'bg-[#ab3500] text-white font-semibold shadow-lg shadow-orange-900/20'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Icon size={20} className="shrink-0" />
            <span className="hidden lg:block">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** @param {{ onNavigate?: () => void }} props */
function CustomerModeLink({ onNavigate }) {
  return (
    <div className="px-3 pb-3">
      <div className="border-t border-slate-700 pt-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          title="Book a delivery as a customer"
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all justify-center lg:justify-start bg-[#ff6b35]/10 hover:bg-[#ff6b35]/20 text-[#ff6b35] border border-[#ff6b35]/20"
        >
          <ShoppingBag size={20} className="shrink-0" />
          <span className="hidden lg:block text-sm font-bold">Book a Delivery</span>
        </Link>
      </div>
    </div>
  );
}

function SidebarProfile({ profile }) {
  return (
    <div className="p-4 lg:p-6 border-t border-slate-800">
      <div className="flex items-center gap-3 justify-center lg:justify-start">
        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {profile.initials}
        </div>
        <div className="hidden lg:block overflow-hidden">
          <p className="text-white text-sm font-semibold truncate">{profile.name}</p>
          <p className="text-xs text-slate-400 truncate">{profile.subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function DesktopSidebar({ items, profile, currentPath, roleBadge, role }) {
  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen lg:w-64 md:w-20 bg-[#0F1923] text-slate-300 z-40 border-r border-slate-800">
      <div className="p-6 flex items-center gap-3 justify-center lg:justify-start">
        <Truck size={24} className="text-[#ff6b35] shrink-0 lg:hidden" />
        <Link href="/" className="hidden lg:flex items-center gap-2 group">
          <span className="text-[#ff6b35] font-black text-xl tracking-tight">GoSwift</span>
          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider">
            {roleBadge}
          </span>
        </Link>
      </div>

      <SidebarLinks items={items} currentPath={currentPath} />
      {role === 'driver' && <CustomerModeLink />}
      <SidebarProfile profile={profile} />
    </aside>
  );
}

function MobileTopBar({ onOpen, roleBadge }) {
  return (
    <header className="md:hidden sticky top-0 z-30 bg-[#0F1923] text-white px-4 py-4 flex items-center justify-between shadow-md">
      <Link href="/" className="flex items-center gap-2">
        <Truck size={22} className="text-[#ff6b35]" />
        <span className="font-black text-xl tracking-tight">GoSwift</span>
        <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider">
          {roleBadge}
        </span>
      </Link>
      <div className="flex items-center gap-1">
        <button className="p-2 text-slate-300 hover:text-white transition-colors" aria-label="Notifications">
          <Bell size={20} />
        </button>
        <button onClick={onOpen} className="p-2 text-slate-300 hover:text-white transition-colors" aria-label="Open menu">
          <Menu size={22} />
        </button>
      </div>
    </header>
  );
}

function MobileDrawer({ items, profile, currentPath, onClose, role }) {
  return (
    <div className="fixed inset-0 z-50 bg-[#0F1923] flex flex-col md:hidden overflow-y-auto">
      <div className="p-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Truck size={22} className="text-[#ff6b35]" />
          <span className="font-black text-xl text-white tracking-tight">GoSwift</span>
        </div>
        <button onClick={onClose} className="p-2 text-white" aria-label="Close menu">
          <X size={22} />
        </button>
      </div>

      <nav className="flex-1 px-6 py-6 space-y-1">
        {items.map(({ label, icon: Icon, href }) => {
          const active = isActive(currentPath, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-4 px-4 py-4 rounded-xl font-semibold text-lg transition-all ${
                active ? 'bg-[#ab3500] text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={22} />
              {label}
            </Link>
          );
        })}
      </nav>

      {role === 'driver' && (
        <div className="px-6 pb-4">
          <div className="border-t border-slate-700 pt-4">
            <Link
              href="/dashboard"
              onClick={onClose}
              className="flex items-center gap-4 px-4 py-4 rounded-xl font-semibold text-lg transition-all bg-[#ff6b35]/10 hover:bg-[#ff6b35]/20 text-[#ff6b35] border border-[#ff6b35]/20"
            >
              <ShoppingBag size={22} />
              Book a Delivery
            </Link>
          </div>
        </div>
      )}

      <SidebarProfile profile={profile} />
    </div>
  );
}

function MobileBottomNav({ items, currentPath }) {
  // Show first 4 items on bottom nav for thumb reach
  const visible = items.slice(0, 4);
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border-t border-slate-100 px-4 pb-5 pt-2 flex justify-between items-center z-30">
      {visible.map(({ label, icon: Icon, href }) => {
        const active = isActive(currentPath, href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all flex-1 ${
              active ? 'text-[#ab3500]' : 'text-slate-400 hover:text-[#ab3500]'
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function buildProfile(authProfile, role) {
  const fullName = authProfile?.full_name ?? (role === 'admin' ? 'Admin' : 'Driver');
  const initials = fullName.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const subtitle = role === 'admin' ? 'Logistics Manager' : 'Driver';
  return { initials, name: fullName, subtitle };
}

export default function DashboardLayout({ role = 'admin', children, contentClassName = '' }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { profile: authProfile }    = useAuth();
  const currentPath = usePathname() || '';
  const items = NAV_BY_ROLE[role];
  const profile = buildProfile(authProfile, role);
  const roleBadge = ROLE_BADGE[role];

  return (
    <div className="min-h-screen bg-[#F7F8FA] font-sans antialiased">
      <MobileTopBar onOpen={() => setDrawerOpen(true)} roleBadge={roleBadge} />
      {drawerOpen && (
        <MobileDrawer
          items={items}
          profile={profile}
          currentPath={currentPath}
          role={role}
          onClose={() => setDrawerOpen(false)}
        />
      )}
      <DesktopSidebar
        items={items}
        profile={profile}
        currentPath={currentPath}
        roleBadge={roleBadge}
        role={role}
      />
      <main className={`md:ml-20 lg:ml-64 p-4 md:p-8 pb-28 md:pb-8 max-w-350 ${contentClassName}`}>
        {children}
      </main>
      <MobileBottomNav items={items} currentPath={currentPath} />
    </div>
  );
}
