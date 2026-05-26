/**
 * /driver/earnings — server-rendered earnings dashboard.
 *
 * Migrated from a 'use client' useEffect-fetch page in Sprint 3. The
 * data is the same monthly aggregation /api/driver/earnings returns
 * (shared via lib/server/earnings); rendering it server-side removes
 * the post-hydrate spinner that every driver currently sees.
 */
import { Banknote, Clock, TrendingUp, Wallet, ChevronRight } from 'lucide-react';

import { requireAuthRSC }       from '@/lib/server/getAuthFromCookie';
import { getAdminSupabase }     from '@/lib/server/supabase.admin';
import { aggregateEarnings, earningsBoundaries } from '@/lib/server/earnings';

import DashboardLayout from '@/components/shared/DashboardLayout';
import PageHeader      from '@/components/shared/PageHeader';
import Card            from '@/components/shared/Card';
import Badge           from '@/components/shared/Badge';
import Button          from '@/components/shared/Button';

function PeriodCard({ label, period, icon: Icon }) {
  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#ab3500] flex items-center justify-center">
          <Icon size={18} />
        </div>
      </div>
      <div className="text-3xl font-black text-[#0F1923] tracking-tight">{period.value}</div>
      <div className="mt-3 flex items-center gap-4 text-xs">
        <span className="text-slate-500">
          <span className="font-semibold text-[#0F1923]">{period.trips}</span> trips
        </span>
        <span className="text-slate-500">
          Tips <span className="font-semibold text-emerald-600">{period.tip}</span>
        </span>
      </div>
    </Card>
  );
}

function WeeklyChart({ data }) {
  const max = Math.max(...data.map((d) => d.amount), 1);

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-[#0F1923]">This Week</h3>
          <p className="text-sm text-slate-500">Daily earnings breakdown</p>
        </div>
        <Badge label="Last 7 days" variant="neutral" />
      </div>

      <div className="flex items-end gap-3 h-48">
        {data.map((d) => {
          const heightPct = Math.max((d.amount / max) * 100, 4);
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400">
                ₦{(d.amount / 1000).toFixed(1)}k
              </span>
              <div className="w-full bg-slate-50 rounded-t-lg flex items-end h-full">
                <div
                  className="w-full bg-linear-to-t from-[#ab3500] to-[#ff6b35] rounded-t-lg transition-all"
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {d.day}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function PayoutRow({ payout }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-b-0">
      <div>
        <p className="text-sm font-bold text-[#0F1923]">{payout.label}</p>
        <p className="text-xs text-slate-400">Paid on {payout.date}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-bold text-[#0F1923]">{payout.amount}</span>
        <Badge label={payout.status} variant={payout.status === 'paid' ? 'success' : 'pending'} />
      </div>
    </div>
  );
}

export default async function DriverEarningsPage() {
  const auth = await requireAuthRSC({ allowedRoles: ['driver'] });

  const { startOfMonth } = earningsBoundaries();
  const { data: rows } = await getAdminSupabase()
    .from('orders')
    .select('fare_amount, created_at')
    .eq('driver_id', auth.userId)
    .eq('status', 'delivered')
    .gte('created_at', startOfMonth.toISOString())
    .order('created_at', { ascending: false });

  const { summary: s, earningsWeekly: weekly, payouts } = aggregateEarnings(rows ?? []);

  return (
    <DashboardLayout role="driver">
      <PageHeader
        title="Earnings"
        subtitle="Track your trips, tips, and payouts at a glance."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <PeriodCard label="Today"      period={s.today} icon={Banknote} />
        <PeriodCard label="This Week"  period={s.week}  icon={TrendingUp} />
        <PeriodCard label="This Month" period={s.month} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <WeeklyChart data={weekly} />
        </div>

        <Card>
          <div className="flex items-start justify-between mb-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pending payout
              </span>
              <p className="text-3xl font-black text-[#0F1923] mt-2">{s.pending}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
              <Wallet size={18} />
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 mb-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Payout to
            </p>
            <p className="text-sm font-bold text-[#0F1923]">{s.payoutTo}</p>
          </div>
          <Button fullWidth>Withdraw now</Button>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#0F1923]">Payout History</h3>
            <button className="text-[#ab3500] font-bold text-sm hover:underline inline-flex items-center gap-0.5">
              See all <ChevronRight size={14} />
            </button>
          </div>
          {payouts.length > 0
            ? payouts.map((p) => <PayoutRow key={p.id} payout={p} />)
            : <p className="text-sm text-slate-400 py-4 text-center">No payouts yet.</p>
          }
        </Card>
      </div>
    </DashboardLayout>
  );
}
