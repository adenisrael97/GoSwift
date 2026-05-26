'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

import { useAuthGuard }     from '@/hooks/useAuthGuard';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAuth }          from '@/context/AuthContext';
import { updateProfile }    from '@/lib/api';

import ProfileForm from '@/components/profile/ProfileForm';
import SaveButton  from '@/components/profile/SaveButton';
import PageShell   from '@/components/ui/PageShell';
import AppHeader   from '@/components/ui/AppHeader';
import Toast       from '@/components/ui/Toast';

function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-[#ff6b35] rounded-full animate-spin" />
    </div>
  );
}

// Pure-state child mounted only once the profile has loaded, so we can
// initialise form fields directly from props instead of syncing them via
// an effect (which would trigger the react-hooks/set-state-in-effect rule).
function EditProfileForm({ profile, onProfileRefreshed }) {
  const [fields, setFields] = useState({
    fullName:     profile.full_name ?? '',
    email:        profile.email     ?? '',
    phoneDisplay: profile.phone     ?? '',
  });
  const [saveStatus, setSave]  = useState('idle'); // idle | saving | saved
  const [toastMsg,   setToast] = useState('');

  function handleChange(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }));
    if (saveStatus === 'saved') setSave('idle');
  }

  async function handleSave() {
    if (saveStatus === 'saving') return;
    setSave('saving');

    const { ok, body } = await updateProfile({
      full_name: fields.fullName.trim(),
      email:     fields.email.trim(),
    });

    if (!ok) {
      setToast(body?.error ?? 'Failed to save profile');
      setSave('idle');
      return;
    }

    // Sync AuthContext so every consumer (header, hero, profile card) reflects
    // the new name without a page reload. Fire and forget — UI feedback is the toast.
    onProfileRefreshed();

    setSave('saved');
    setToast('Profile updated successfully');
    setTimeout(() => { setSave('idle'); setToast(''); }, 3000);
  }

  const initials = getInitials(fields.fullName);

  return (
    <>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 pt-8 pb-36">
        <section className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-[#0F1923] border-4 border-white shadow-xl flex items-center justify-center">
            <span className="text-white font-black text-3xl md:text-4xl">{initials}</span>
          </div>
        </section>

        <div className="max-w-3xl mx-auto">
          <ProfileForm fields={fields} onChange={handleChange} />
        </div>
      </main>

      <SaveButton onClick={handleSave} status={saveStatus} />
      <Toast message={toastMsg} onClose={() => setToast('')} />
    </>
  );
}

export default function EditProfilePage() {
  const { user, loading: authLoading } = useAuthGuard();
  const { profile, dataLoading }       = useDashboardData(user);
  const { refreshProfile }             = useAuth();

  if (authLoading || (user && dataLoading) || !profile) return <LoadingScreen />;

  return (
    <PageShell>
      <AppHeader
        backHref="/profile"
        title="Edit Profile"
        rightSlot={
          <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors" aria-label="Help">
            <HelpCircle size={20} />
          </button>
        }
      />
      <EditProfileForm profile={profile} onProfileRefreshed={refreshProfile} />
    </PageShell>
  );
}
