'use client';

import { useState, useEffect } from 'react';
import { Bell, Sliders, Shield, LogOut } from 'lucide-react';

import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useAuth }      from '@/context/AuthContext';
import { getMyProfileSettings, updateProfile } from '@/lib/api';

import DashboardLayout from '@/components/shared/DashboardLayout';
import PageHeader      from '@/components/shared/PageHeader';
import Card            from '@/components/shared/Card';
import Button          from '@/components/shared/Button';

const DEFAULT_SETTINGS = {
  notifications: {
    newOrders:   true,
    earnings:    true,
    promotions:  false,
    appUpdates:  true,
  },
  preferences: {
    autoAccept:   false,
    maxDistance:  '15 km',
    workingHours: '6:00 AM – 10:00 PM',
    language:     'English',
  },
};

function Section({ icon: Icon, title, description, children }) {
  return (
    <Card>
      <div className="flex items-start gap-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ab3500] flex items-center justify-center shrink-0">
          <Icon size={20} />
        </div>
        <div>
          <h3 className="text-base font-bold text-[#0F1923]">{title}</h3>
          {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0">
      <div>
        <p className="text-sm font-semibold text-[#0F1923]">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        aria-label={label}
        className={`w-11 h-6 rounded-full p-0.5 flex items-center transition-all duration-200 shrink-0 ${
          checked ? 'bg-[#ab3500] justify-end' : 'bg-slate-300 justify-start'
        }`}
      >
        <span className="w-5 h-5 bg-white rounded-full shadow" />
      </button>
    </div>
  );
}

/**
 * @param {object} props
 * @param {React.ReactNode} props.label
 * @param {any} props.value
 * @param {(v: string) => void} [props.onChange]
 * @param {boolean} [props.readOnly]
 */
function Field({ label, value, onChange, readOnly = false }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-[#0F1923] focus:outline-none focus:border-[#ab3500] focus:bg-white transition-colors"
      />
    </label>
  );
}

export default function DriverSettingsPage() {
  const { user, loading: authLoading } = useAuthGuard({ requiredRole: 'driver' });
  const { logout }                     = useAuth();
  const [profile,       setProfile]     = useState(null);
  const [notifications, setNotifications] = useState(DEFAULT_SETTINGS.notifications);
  const [preferences,   setPreferences]   = useState(DEFAULT_SETTINGS.preferences);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const data = await getMyProfileSettings(user.id);
      if (!cancelled && data) {
        setProfile(data);
        const s = data.settings ?? {};
        if (s.notifications) setNotifications((n) => ({ ...n, ...s.notifications }));
        if (s.preferences)   setPreferences((p)   => ({ ...p, ...s.preferences }));
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setSaved(false);

    await updateProfile({ settings: { notifications, preferences } });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleSignOut() {
    // logout() clears server cookie + Supabase session in one shot;
    // useAuthGuard handles the redirect via the SIGNED_OUT event.
    await logout();
  }

  function toggleNotif(key) { return (v) => setNotifications((n) => ({ ...n, [key]: v })); }
  function setPref(key)     { return (v) => setPreferences((p)   => ({ ...p, [key]: v })); }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#ff6b35] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout role="driver">
      <PageHeader
        title="Settings"
        subtitle="Tune your delivery preferences, notifications, and account."
        actions={
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section
          icon={Bell}
          title="Notifications"
          description="Choose what reaches your phone while you're driving."
        >
          <Toggle
            label="New orders"
            description="Push alert when a request matches your zone."
            checked={notifications.newOrders}
            onChange={toggleNotif('newOrders')}
          />
          <Toggle
            label="Earnings updates"
            description="Daily summary of trips and tips."
            checked={notifications.earnings}
            onChange={toggleNotif('earnings')}
          />
          <Toggle
            label="Promotions &amp; bonuses"
            description="Surge multipliers, weekend bonuses, missions."
            checked={notifications.promotions}
            onChange={toggleNotif('promotions')}
          />
          <Toggle
            label="App updates"
            description="Important changes to GoSwift policies."
            checked={notifications.appUpdates}
            onChange={toggleNotif('appUpdates')}
          />
        </Section>

        <Section
          icon={Sliders}
          title="Driving Preferences"
          description="Control which orders reach you and when."
        >
          <Toggle
            label="Auto-accept nearby orders"
            description="Skip the 30-second window and take orders within 2 km automatically."
            checked={preferences.autoAccept}
            onChange={setPref('autoAccept')}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            <Field label="Max distance"   value={preferences.maxDistance}  onChange={setPref('maxDistance')} />
            <Field label="Working hours"  value={preferences.workingHours} onChange={setPref('workingHours')} />
            <Field label="Language"       value={preferences.language}     onChange={setPref('language')} />
          </div>
        </Section>

        <Section
          icon={Shield}
          title="Account &amp; Security"
          description="Password, two-factor auth, and sessions."
        >
          <div className="space-y-4">
            <Field label="Account email" value={profile?.email ?? profile?.phone ?? '—'} readOnly />
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" fullWidth>Change password</Button>
              <Button variant="secondary" fullWidth>Enable 2FA</Button>
            </div>
          </div>
        </Section>

        <Section
          icon={LogOut}
          title="Danger Zone"
          description="Permanent actions that affect your account."
        >
          <div className="space-y-3">
            <Button variant="secondary" fullWidth onClick={handleSignOut}>Sign out</Button>
            <Button variant="danger" fullWidth>Delete account</Button>
          </div>
        </Section>
      </div>
    </DashboardLayout>
  );
}
