'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { notFound } from 'next/navigation';

import { useAuthGuard }      from '@/hooks/useAuthGuard';
import { getAdminApplication } from '@/lib/api';
import { mapDbApplication }   from '@/lib/utils/mapAdminData';

import DashboardLayout      from '@/components/shared/DashboardLayout';
import PageHeader           from '@/components/shared/PageHeader';
import ApplicationDetails   from '@/components/admin/ApplicationDetails';
import ReviewActions        from '@/components/admin/ReviewActions';

export default function DriverApplicationReviewPage() {
  const { applicationId }              = useParams();
  const { user, loading: authLoading } = useAuthGuard({ requiredRole: 'admin' });
  const [application,  setApplication] = useState(null);
  const [dataLoading,  setDataLoading] = useState(true);

  useEffect(() => {
    if (!user || !applicationId) return;
    let cancelled = false;

    async function load() {
      const { ok, body } = await getAdminApplication(applicationId);
      if (!cancelled) {
        if (ok) setApplication(mapDbApplication(body.application));
        setDataLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user, applicationId]);

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#ff6b35] rounded-full animate-spin" />
      </div>
    );
  }

  if (!application) return null;

  return (
    <DashboardLayout role="admin">
      <PageHeader
        backHref="/admin/drivers"
        title={`Review · ${application.name}`}
        subtitle={`Application #${application.id} • Submitted ${application.submittedAt}`}
      />

      <ApplicationDetails application={application} />

      <div className="mt-6">
        <ReviewActions
          applicationId={application.id}
          applicantName={application.name}
        />
      </div>
    </DashboardLayout>
  );
}
