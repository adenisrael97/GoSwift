'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bike, FileCheck, Mail, Phone, MapPin, Calendar, Star } from 'lucide-react';

import { useAuthGuard } from '@/hooks/useAuthGuard';
import { getDriverProfileDetail, getDriverApplicationDocs } from '@/lib/api';

import DashboardLayout from '@/components/shared/DashboardLayout';
import PageHeader      from '@/components/shared/PageHeader';
import Card            from '@/components/shared/Card';
import Badge           from '@/components/shared/Badge';
import Button          from '@/components/shared/Button';

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-b-0">
      <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
        <Icon size={14} />
      </div>
      <div className="flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-[#0F1923] mt-0.5">{value ?? '—'}</p>
      </div>
    </div>
  );
}

function DocumentRow({ doc }) {
  const variant = doc.status === 'verified' ? 'success' : doc.status === 'expiring' ? 'pending' : 'neutral';
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center">
          <FileCheck size={16} />
        </div>
        <div>
          <p className="text-sm font-bold text-[#0F1923]">{doc.label}</p>
          <p className="text-xs text-slate-400">{doc.note}</p>
        </div>
      </div>
      <Badge label={doc.status} variant={variant} />
    </div>
  );
}

function buildDocuments(application) {
  if (!application) return [];
  return [
    { label: "Driver's License",    status: application.license_url         ? 'verified' : 'pending', note: 'Submitted at registration' },
    { label: 'NIN Document',        status: application.nin_doc_url         ? 'verified' : 'pending', note: 'Submitted at registration' },
    { label: 'Vehicle Particulars', status: application.particulars_url     ? 'verified' : 'pending', note: 'Submitted at registration' },
  ];
}

export default function DriverProfilePage() {
  const { user, loading: authLoading } = useAuthGuard({ requiredRole: 'driver' });
  const [profile,     setProfile]     = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const [profileResult, applicationResult] = await Promise.all([
        getDriverProfileDetail(user.id),
        getDriverApplicationDocs(user.id),
      ]);

      if (!cancelled) {
        const p  = profileResult.data;
        const dp = p?.driver_profiles ?? {};
        const app = applicationResult.data;

        const name = p?.full_name ?? 'Driver';
        const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
        const joinedDate = p?.created_at
          ? new Date(p.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
          : '—';

        setProfile({
          name,
          initials,
          phone:      p?.phone ?? '—',
          email:      p?.email ?? '—',
          joined:     joinedDate,
          rating:     dp.rating     ?? 5.0,
          totalTrips: dp.total_trips ?? 0,
          isOnline:   dp.is_online  ?? false,
          vehicle: {
            type:  dp.vehicle_type  ?? '—',
            model: dp.vehicle_model ?? '—',
            plate: dp.plate_number  ?? '—',
            color: dp.vehicle_color ?? '—',
          },
          documents: buildDocuments(app),
        });
        setDataLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#ff6b35] rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const statusLabel = profile.isOnline ? 'Online' : 'Offline';

  return (
    <DashboardLayout role="driver">
      <PageHeader
        title="Profile"
        subtitle="Your driver profile and verification status."
        actions={
          <Link href="/profile/edit">
            <Button variant="secondary" size="sm">Edit profile</Button>
          </Link>
        }
      />

      {/* Hero card */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-[#ff6b35] to-[#ab3500] text-white font-black text-2xl flex items-center justify-center shrink-0">
            {profile.initials}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-black text-[#0F1923]">{profile.name}</h2>
            <div className="flex items-center gap-3 mt-1 text-sm">
              <span className="inline-flex items-center gap-1 text-amber-500 font-bold">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                {Number(profile.rating).toFixed(2)}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">{profile.totalTrips.toLocaleString()} trips</span>
            </div>
          </div>
          <Badge label={statusLabel} variant={profile.isOnline ? 'online' : 'offline'} dot />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal */}
        <Card>
          <h3 className="text-base font-bold text-[#0F1923] mb-2">Personal Information</h3>
          <p className="text-sm text-slate-500 mb-4">Contact details on file.</p>
          <InfoRow icon={Mail}     label="Email"        value={profile.email} />
          <InfoRow icon={Phone}    label="Phone"        value={profile.phone} />
          <InfoRow icon={Calendar} label="Member since" value={profile.joined} />
        </Card>

        {/* Vehicle */}
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <Bike size={18} className="text-[#ab3500]" />
            <h3 className="text-base font-bold text-[#0F1923]">Vehicle</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">Approved fleet vehicle linked to this account.</p>
          <InfoRow icon={Bike} label="Type"         value={profile.vehicle.type} />
          <InfoRow icon={Bike} label="Model"        value={profile.vehicle.model} />
          <InfoRow icon={Bike} label="Plate Number" value={profile.vehicle.plate} />
          <InfoRow icon={Bike} label="Color"        value={profile.vehicle.color} />
        </Card>

        {/* Documents */}
        {profile.documents.length > 0 && (
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#0F1923]">Documents &amp; Verification</h3>
                <p className="text-sm text-slate-500">Keep these up to date to continue accepting deliveries.</p>
              </div>
              <Button variant="secondary" size="sm">Upload Document</Button>
            </div>
            {profile.documents.map((d) => (
              <DocumentRow key={d.label} doc={d} />
            ))}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
