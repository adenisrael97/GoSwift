'use client';

import { useState, useEffect } from 'react';
import { Building2, DollarSign, Bell, Shield, Truck } from 'lucide-react';

import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useAuth }      from '@/context/AuthContext';
import { getAdminSettings, updateAdminSettings } from '@/lib/api';
import { VEHICLE_IDS, VEHICLE_RATES, DEFAULT_VEHICLE_PRICING } from '@/lib/pricing/vehicleRates';

import DashboardLayout from '@/components/shared/DashboardLayout';
import PageHeader      from '@/components/shared/PageHeader';
import Card            from '@/components/shared/Card';
import Button          from '@/components/shared/Button';

// Defaults seeded from the shared pricing constants so a missing
// admin_settings row still produces a sensible form.
const DEFAULT_VEHICLES_FORM = VEHICLE_IDS.reduce((acc, id) => {
  acc[id] = {
    baseFare: String(DEFAULT_VEHICLE_PRICING[id].baseFare),
    perKg:    String(DEFAULT_VEHICLE_PRICING[id].perKg),
  };
  return acc;
}, {});

const DEFAULTS = {
  business: {
    companyName:    'GoSwift Logistics',
    supportEmail:   'support@goswift.ng',
    supportPhone:   '+234 800 000 0000',
    operatingHours: '7:00 AM – 10:00 PM WAT',
    baseCity:       'Lagos, Nigeria',
  },
  pricing: {
    baseFare:        '1200',
    perKm:           '150',
    serviceFee:      '350',
    cancellationFee: '500',
    vehicles:        DEFAULT_VEHICLES_FORM,
  },
  notifications: {
    newApplications: true,
    failedDeliveries: true,
    weeklyReports:    false,
    marketingEmails:  false,
  },
};

function SettingsSection({ icon: Icon, title, description, children }) {
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

/**
 * @param {object} props
 * @param {React.ReactNode} props.label
 * @param {any} props.value
 * @param {(v: string) => void} [props.onChange]
 * @param {string} [props.type]
 * @param {boolean} [props.readOnly]
 */
function Field({ label, value, onChange, type = 'text', readOnly = false }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-[#0F1923] focus:outline-none focus:border-[#ab3500] focus:bg-white transition-colors"
      />
    </label>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3">
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

export default function AdminSettingsPage() {
  const { user, loading: authLoading } = useAuthGuard({ requiredRole: 'admin' });
  const { logout } = useAuth();

  const [business,      setBusiness]      = useState(DEFAULTS.business);
  const [pricing,       setPricing]       = useState(DEFAULTS.pricing);
  const [notifications, setNotifications] = useState(DEFAULTS.notifications);
  const [dataLoading,   setDataLoading]   = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [saveStatus,    setSaveStatus]    = useState('');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const { ok, body } = await getAdminSettings();
      if (!cancelled) {
        if (ok) {
          const settings = body.settings;
          if (settings?.business)      setBusiness((b) => ({ ...b, ...settings.business }));
          if (settings?.pricing) {
            // Merge vehicles map separately so a partial admin payload
            // (e.g. only "car" customised) still surfaces defaults for
            // the other vehicles.
            const { vehicles: vehiclesFromServer, ...rest } = settings.pricing;
            setPricing((p) => ({
              ...p,
              ...rest,
              vehicles: { ...p.vehicles, ...(vehiclesFromServer ?? {}) },
            }));
          }
          if (settings?.notifications) setNotifications((n) => ({ ...n, ...settings.notifications }));
        }
        setDataLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setSaveStatus('');

    const { ok } = await updateAdminSettings({ business, pricing, notifications });
    setSaveStatus(ok ? 'saved' : 'error');
    setSaving(false);
    setTimeout(() => setSaveStatus(''), 3000);
  }

  function updateBusiness(key)     { return (v) => setBusiness((b)      => ({ ...b, [key]: v })); }
  function updatePricing(key)      { return (v) => setPricing((p)       => ({ ...p, [key]: v })); }
  function toggleNotification(key) { return (v) => setNotifications((n) => ({ ...n, [key]: v })); }
  function updateVehiclePricing(vehicleId, field) {
    return (v) => setPricing((p) => ({
      ...p,
      vehicles: {
        ...p.vehicles,
        [vehicleId]: { ...(p.vehicles?.[vehicleId] ?? {}), [field]: v },
      },
    }));
  }

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#ff6b35] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout role="admin">
      <PageHeader
        title="Settings"
        subtitle="Configure your platform, pricing, and notification preferences."
        actions={
          <div className="flex items-center gap-3">
            {saveStatus === 'saved' && (
              <span className="text-sm font-semibold text-emerald-600">Saved!</span>
            )}
            {saveStatus === 'error' && (
              <span className="text-sm font-semibold text-red-500">Save failed</span>
            )}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SettingsSection
          icon={Building2}
          title="Business Information"
          description="Public-facing company details shown on receipts and emails."
        >
          <div className="space-y-4">
            <Field label="Company Name"    value={business.companyName}    onChange={updateBusiness('companyName')} />
            <Field label="Support Email"   value={business.supportEmail}   onChange={updateBusiness('supportEmail')}   type="email" />
            <Field label="Support Phone"   value={business.supportPhone}   onChange={updateBusiness('supportPhone')} />
            <Field label="Operating Hours" value={business.operatingHours} onChange={updateBusiness('operatingHours')} />
            <Field label="Base City"       value={business.baseCity}       onChange={updateBusiness('baseCity')} />
          </div>
        </SettingsSection>

        <SettingsSection
          icon={DollarSign}
          title="Pricing"
          description="Base rates applied to every order. Changes take effect immediately."
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Base Fare (₦)"        value={pricing.baseFare}        onChange={updatePricing('baseFare')} />
            <Field label="Per KM Rate (₦)"      value={pricing.perKm}           onChange={updatePricing('perKm')} />
            <Field label="Service Fee (₦)"      value={pricing.serviceFee}      onChange={updatePricing('serviceFee')} />
            <Field label="Cancellation Fee (₦)" value={pricing.cancellationFee} onChange={updatePricing('cancellationFee')} />
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Truck}
          title="Vehicle Pricing"
          description="Each vehicle's fare = base + (weight kg × per-kg rate). Customers see this on the order form."
        >
          <div className="space-y-3">
            {VEHICLE_IDS.map((id) => {
              const v   = VEHICLE_RATES[id];
              const row = pricing.vehicles?.[id] ?? DEFAULT_VEHICLES_FORM[id];
              return (
                <div
                  key={id}
                  className="grid grid-cols-[auto_1fr_1fr] gap-3 items-end p-3 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center gap-2 pb-2.5">
                    <span className="text-xl">{v.emoji}</span>
                    <span className="text-sm font-bold text-[#0F1923]">{v.label}</span>
                  </div>
                  <Field
                    label="Base (₦)"
                    type="number"
                    value={row.baseFare}
                    onChange={updateVehiclePricing(id, 'baseFare')}
                  />
                  <Field
                    label="Per kg (₦)"
                    type="number"
                    value={row.perKg}
                    onChange={updateVehiclePricing(id, 'perKg')}
                  />
                </div>
              );
            })}
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Bell}
          title="Notifications"
          description="Decide which platform events email your team."
        >
          <div className="divide-y divide-slate-100">
            <Toggle
              label="New driver applications"
              description="Alert reviewers as soon as someone applies."
              checked={notifications.newApplications}
              onChange={toggleNotification('newApplications')}
            />
            <Toggle
              label="Failed deliveries"
              description="Get notified the moment an order is cancelled or fails."
              checked={notifications.failedDeliveries}
              onChange={toggleNotification('failedDeliveries')}
            />
            <Toggle
              label="Weekly performance reports"
              description="Sunday-morning roll-up of orders, revenue, and driver health."
              checked={notifications.weeklyReports}
              onChange={toggleNotification('weeklyReports')}
            />
            <Toggle
              label="Marketing email digest"
              description="Updates from the GoSwift team about new features."
              checked={notifications.marketingEmails}
              onChange={toggleNotification('marketingEmails')}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Shield}
          title="Security"
          description="Account protection and admin access controls."
        >
          <div className="space-y-4">
            <Field label="Admin email" value="admin@goswift.ng" readOnly />
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" fullWidth>Change password</Button>
              <Button variant="secondary" fullWidth>Enable 2FA</Button>
            </div>
            <div className="pt-2">
              <Button variant="danger" fullWidth onClick={logout}>Sign out everywhere</Button>
            </div>
          </div>
        </SettingsSection>
      </div>
    </DashboardLayout>
  );
}
