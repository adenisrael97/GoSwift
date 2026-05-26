/**
 * Driver-earnings aggregation.
 *
 * Pure function over delivered orders + the current Date. Imported by
 * both the legacy /api/driver/earnings route (still serves the mobile
 * app) and the new /driver/earnings Server Component, so there's one
 * source of truth for what "today / week / month" means.
 *
 * Input: rows from `orders` filtered to the current driver + delivered
 * + within the current calendar month.
 * Output: the shape the Earnings UI consumes.
 */
import 'server-only';

import { formatCurrency } from '@/lib/utils/format';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Date boundaries used to aggregate. Computed once so both summary
 * buckets and weekly-chart buckets share the same instants.
 */
export function earningsBoundaries(now = new Date()) {
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek  = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return { startOfMonth, startOfWeek, startOfToday };
}

/**
 * @param {Array<{ fare_amount: number|string, created_at: string }>} rows
 *        Delivered orders for the driver, within the current month.
 * @param {Date} [now]
 */
export function aggregateEarnings(rows, now = new Date()) {
  const { startOfMonth, startOfWeek, startOfToday } = earningsBoundaries(now);

  function agg(fromDate) {
    const filtered = rows.filter((o) => new Date(o.created_at) >= fromDate);
    return {
      amount: filtered.reduce((s, o) => s + (Number(o.fare_amount) || 0), 0),
      trips:  filtered.length,
    };
  }

  const today = agg(startOfToday);
  const week  = agg(startOfWeek);
  const month = agg(startOfMonth);

  // 7-day chart buckets — keyed by toDateString() for fast lookup.
  /** @type {Record<string, { day: string, amount: number }>} */
  const buckets = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets[d.toDateString()] = { day: DAYS[d.getDay()], amount: 0 };
  }
  for (const o of rows) {
    const key = new Date(o.created_at).toDateString();
    if (buckets[key]) buckets[key].amount += Number(o.fare_amount) || 0;
  }

  return {
    summary: {
      today:   { value: formatCurrency(today.amount), trips: today.trips, tip: formatCurrency(0) },
      week:    { value: formatCurrency(week.amount),  trips: week.trips,  tip: formatCurrency(0) },
      month:   { value: formatCurrency(month.amount), trips: month.trips, tip: formatCurrency(0) },
      pending:  formatCurrency(0),
      payoutTo: 'Bank account not set up',
    },
    earningsWeekly: Object.values(buckets),
    payouts: [],
  };
}
