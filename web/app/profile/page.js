'use client';

import { useState } from 'react';
import { User, Trash2, FileText, Lock, Headphones, LogOut } from 'lucide-react';

import { useAuth }          from '@/context/AuthContext';
import { useAuthGuard }     from '@/hooks/useAuthGuard';
import { useDashboardData } from '@/hooks/useDashboardData';

import ProfileCard  from '@/components/profile/ProfileCard';
import SettingsList from '@/components/profile/SettingsList';
import BottomNav    from '@/components/dashboard/BottomNav';
import PageShell    from '@/components/ui/PageShell';
import AppHeader    from '@/components/ui/AppHeader';

const APP_VERSION = '1.0.0';

const ACCOUNT_ITEMS = [
  { icon: User,   label: 'Edit Profile',   href: '/profile/edit',   iconBg: 'bg-orange-50', iconColor: 'text-[#ab3500]' },
  { icon: Trash2, label: 'Delete Account', href: '/profile/delete', iconBg: 'bg-red-50',    iconColor: 'text-red-500' },
];

const SUPPORT_ITEMS = [
  { icon: FileText,   label: 'Terms & Conditions', href: '/dashboard/legal/terms' },
  { icon: Lock,       label: 'Privacy Policy',     href: '/dashboard/legal/privacy' },
  { icon: Headphones, label: 'Help Center',        href: '/dashboard/support/help-center' },
];

function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function memberSince(isoDate) {
  if (!isoDate) return 'Member';
  const years = Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24 * 365));
  return years < 1 ? 'New Member' : `${years} yr${years === 1 ? '' : 's'}`;
}

function SignOutButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-white border border-slate-100 text-red-500 font-bold hover:bg-red-50 transition-colors active:scale-95"
    >
      <LogOut size={18} />
      Sign Out
    </button>
  );
}

export default function ProfilePage() {
  const { logout }                         = useAuth();
  const { user, loading: authLoading }     = useAuthGuard();
  const { profile, orders, dataLoading }   = useDashboardData(user);
  const [showSignOut, setShowSignOut]      = useState(false);
  const [signingOut,  setSigningOut]       = useState(false);

  // Navigation after sign-out is handled centrally by useAuthGuard's
  // onAuthStateChange listener (SIGNED_OUT → /login). Don't navigate here
  // or you get two competing router calls — and a double GET /login.
  async function handleSignOut() {
    setSigningOut(true);
    try {
      await logout();
    } catch {
      // best-effort
    } finally {
      setSigningOut(false);
    }
  }

  if (authLoading || (user && dataLoading)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#ff6b35] rounded-full animate-spin" />
      </div>
    );
  }

  const uiUser = {
    fullName:       profile?.full_name  ?? '',
    email:          profile?.email      ?? '',
    avatarInitials: getInitials(profile?.full_name),
    totalOrders:    orders.length,
    memberYears:    memberSince(profile?.created_at),
    rating:         '5.0',
    version:        APP_VERSION,
  };

  return (
    <PageShell>
      <AppHeader />

      <main className="flex-1 pb-32">
        <div className="max-w-7xl mx-auto w-full">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:px-8">

            {/* Left: Profile Card */}
            <div className="lg:col-span-5 xl:col-span-4">
              <section className="px-4 lg:px-0 pt-6 lg:sticky lg:top-21">
                <ProfileCard user={uiUser} />

                {/* Sign Out — desktop */}
                <div className="hidden lg:block mt-8">
                  <SignOutButton onClick={() => setShowSignOut(true)} />
                  <p className="text-center text-slate-400 text-sm mt-4">Version {APP_VERSION}</p>
                </div>
              </section>
            </div>

            {/* Right: Settings */}
            <div className="lg:col-span-7 xl:col-span-8 px-4 lg:px-0">
              <SettingsList title="Account" items={ACCOUNT_ITEMS} />
              <SettingsList title="Support & Legal" items={SUPPORT_ITEMS} />

              {/* Sign Out — mobile */}
              <section className="mt-12 lg:hidden mb-8">
                <SignOutButton onClick={() => setShowSignOut(true)} />
                <p className="text-center text-slate-400 text-sm mt-4">Version {APP_VERSION}</p>
              </section>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />

      {/* Sign-out bottom sheet overlay */}
      {showSignOut && (
        <div
          className="fixed inset-0 bg-black/40 z-60 flex items-end justify-center"
          onClick={() => setShowSignOut(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl p-8 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
            <h3 className="text-center font-extrabold text-2xl text-[#0F1923] mb-2">Sign Out?</h3>
            <p className="text-center text-slate-500 text-base mb-8">
              Are you sure you want to sign out of your account?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-all disabled:opacity-60"
              >
                {signingOut ? 'Signing out…' : 'Sign Out'}
              </button>
              <button
                onClick={() => setShowSignOut(false)}
                className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
