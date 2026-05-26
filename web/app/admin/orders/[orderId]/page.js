'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Phone, MessageCircle, MapPin, Package, CreditCard, User, UserCheck, ChevronDown } from 'lucide-react';

import { useAuthGuard } from '@/hooks/useAuthGuard';
import {
  getAdminOrder,
  listAdminDrivers,
  assignAdminOrder,
  cancelAdminOrder,
} from '@/lib/api';

import DashboardLayout from '@/components/shared/DashboardLayout';
import PageHeader      from '@/components/shared/PageHeader';
import Badge           from '@/components/shared/Badge';
import Button          from '@/components/shared/Button';
import Card            from '@/components/shared/Card';

/**
 * Renders Call + Message buttons that open the OS's tel:/sms: handler.
 * Falls back to a "no phone on file" pill when the phone is missing so
 * the layout doesn't shift.
 */
function ContactRow({ phone }) {
  if (!phone) {
    return (
      <p className="text-xs text-slate-400 italic">No phone on file</p>
    );
  }
  const cleaned = phone.replace(/[^\d+]/g, '');
  return (
    <div className="grid grid-cols-2 gap-2">
      <a href={`tel:${cleaned}`} className="block">
        <Button variant="secondary" size="sm" className="gap-1.5" fullWidth>
          <Phone size={14} />
          Call
        </Button>
      </a>
      <a href={`sms:${cleaned}`} className="block">
        <Button variant="secondary" size="sm" className="gap-1.5" fullWidth>
          <MessageCircle size={14} />
          Message
        </Button>
      </a>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-100 last:border-b-0">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-[#0F1923] text-right">{value}</span>
    </div>
  );
}

export default function AdminOrderDetailPage() {
  const { orderId }                    = useParams();
  const { user, loading: authLoading } = useAuthGuard({ requiredRole: 'admin' });

  const [order,       setOrder]       = useState(null);
  const [drivers,     setDrivers]     = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedId,  setSelectedId]  = useState('');
  const [assigning,   setAssigning]   = useState(false);
  const [assignError, setAssignError] = useState('');
  const [cancelOpen,  setCancelOpen]  = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling,  setCancelling]  = useState(false);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    if (!user || !orderId) return;
    let cancelled = false;

    async function load() {
      const [orderRes, driversRes] = await Promise.all([
        getAdminOrder(orderId),
        listAdminDrivers(),
      ]);

      if (cancelled) return;
      if (orderRes.ok   && orderRes.body.order)     setOrder(orderRes.body.order);
      if (driversRes.ok && driversRes.body.drivers) setDrivers(driversRes.body.drivers);
      setDataLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [user, orderId]);

  async function handleCancel() {
    if (cancelling) return;
    setCancelling(true);
    setCancelError('');

    const { ok, body } = await cancelAdminOrder(orderId, cancelReason.trim() || null);
    if (ok) {
      setOrder((prev) => prev ? { ...prev, status: 'cancelled' } : prev);
      setCancelOpen(false);
      setCancelReason('');
    } else {
      setCancelError(body?.error ?? 'Failed to cancel order');
    }
    setCancelling(false);
  }

  async function handleAssign() {
    if (!selectedId || assigning) return;
    setAssigning(true);
    setAssignError('');

    const { ok, body } = await assignAdminOrder(orderId, selectedId);
    if (ok) {
      const assigned = drivers.find((d) => d.id === selectedId);
      setOrder((prev) => ({
        ...prev,
        status:   body.status,
        driverId: body.driverId,
        driver: assigned ? {
          name:     assigned.name,
          phone:    assigned.phone,
          initials: assigned.name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
          vehicle:  assigned.vehicle,
          plate:    assigned.plate,
          type:     assigned.type,
        } : prev.driver,
      }));
    } else {
      setAssignError(body?.error ?? 'Failed to assign driver');
    }
    setAssigning(false);
  }

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#ff6b35] rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-400">Order not found.</p>
        </div>
      </DashboardLayout>
    );
  }

  const isAssignable = !order.driverId && ['confirmed', 'processing'].includes(order.status);

  return (
    <DashboardLayout role="admin">
      <PageHeader
        backHref="/admin/orders"
        title={`Order #${order.id.slice(0, 8)}`}
        subtitle={`${order.pickup} → ${order.dropoff} • Placed ${order.placedAt}`}
        actions={<Badge label={order.status} variant={order.status} dot={order.status === 'processing'} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Route */}
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <MapPin size={18} className="text-[#ab3500]" />
              <h3 className="text-base font-bold text-[#0F1923]">Route</h3>
            </div>

            <div className="relative flex flex-col gap-6">
              <div className="absolute left-2.75 top-4 bottom-4 border-l-2 border-dashed border-slate-200" />

              <div className="flex items-start gap-4 relative">
                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ab3500]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Pickup</p>
                  <p className="text-sm font-bold text-[#0F1923]">{order.pickup}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 relative">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Dropoff</p>
                  <p className="text-sm font-bold text-[#0F1923]">{order.dropoff}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 pt-5 border-t border-slate-100">
              {order.eta && (
                <div className="px-3 py-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-600">
                  ETA · {order.eta}
                </div>
              )}
              <div className="px-3 py-2 bg-orange-50 rounded-lg text-xs font-bold text-[#ab3500]">
                Fare · {order.fare}
              </div>
            </div>
          </Card>

          {/* Package */}
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <Package size={18} className="text-[#ab3500]" />
              <h3 className="text-base font-bold text-[#0F1923]">Package</h3>
            </div>
            <InfoRow label="Type"   value={order.package.type} />
            <InfoRow label="Weight" value={order.package.weight} />
            {order.package.note && <InfoRow label="Notes" value={order.package.note} />}
          </Card>

          {/* Payment */}
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <CreditCard size={18} className="text-[#ab3500]" />
              <h3 className="text-base font-bold text-[#0F1923]">Payment</h3>
            </div>
            <InfoRow label="Method" value={order.payment.method} />
            <InfoRow label="Status" value={order.payment.status} />
            <InfoRow label="Total"  value={order.fare} />
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Customer */}
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <User size={18} className="text-[#ab3500]" />
              <h3 className="text-base font-bold text-[#0F1923]">Customer</h3>
            </div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm">
                {order.customer.initials}
              </div>
              <div>
                <p className="font-bold text-[#0F1923]">{order.customer.name}</p>
                <p className="text-xs text-slate-400">{order.customer.phone}</p>
              </div>
            </div>
            {order.sender?.phone && (
              <div className="mb-4 px-3 py-2 bg-slate-50 rounded-lg">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Sender Phone</p>
                <p className="text-sm text-slate-700">{order.sender.phone}</p>
              </div>
            )}
            <ContactRow phone={order.customer.phone} />
          </Card>

          {/* Receiver */}
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <User size={18} className="text-emerald-600" />
              <h3 className="text-base font-bold text-[#0F1923]">Receiver</h3>
            </div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                {order.receiver.initials}
              </div>
              <div>
                <p className="font-bold text-[#0F1923]">{order.receiver.name}</p>
                <p className="text-xs text-slate-400">{order.receiver.phone}</p>
              </div>
            </div>
            <ContactRow phone={order.receiver.phone} />
          </Card>

          {/* Driver — assigned */}
          {order.driver && (
            <Card>
              <h3 className="text-base font-bold text-[#0F1923] mb-5">Driver</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">
                  {order.driver.initials}
                </div>
                <div>
                  <p className="font-bold text-[#0F1923]">{order.driver.name}</p>
                  <p className="text-xs text-slate-400">{order.driver.phone}</p>
                </div>
              </div>
              {(order.driver.vehicle || order.driver.plate) && (
                <div className="mb-4 px-3 py-2 bg-slate-50 rounded-lg">
                  <p className="text-xs font-bold text-slate-500">
                    {[order.driver.vehicle, order.driver.plate].filter(Boolean).join(' · ')}
                  </p>
                </div>
              )}
              {drivers.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Reassign to
                  </label>
                  <div className="relative">
                    <select
                      value={selectedId}
                      onChange={(e) => setSelectedId(e.target.value)}
                      className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-[#0F1923] pr-8 focus:outline-none focus:ring-2 focus:ring-[#ab3500]/20 focus:border-[#ab3500]"
                    >
                      <option value="">Select driver…</option>
                      {drivers.filter((d) => d.id !== order.driverId).map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}{d.isOnline ? ' ●' : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  <Button
                    fullWidth
                    size="sm"
                    disabled={!selectedId || assigning}
                    onClick={handleAssign}
                  >
                    {assigning ? 'Reassigning…' : 'Reassign Driver'}
                  </Button>
                  {assignError && (
                    <p className="text-xs text-red-500 font-medium">{assignError}</p>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Driver — unassigned + assign UI */}
          {!order.driver && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <UserCheck size={18} className="text-slate-400" />
                <h3 className="text-base font-bold text-[#0F1923]">Driver</h3>
              </div>

              {isAssignable ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500">No driver assigned yet. Manually assign one below.</p>

                  <div className="relative">
                    <select
                      value={selectedId}
                      onChange={(e) => setSelectedId(e.target.value)}
                      className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-[#0F1923] pr-8 focus:outline-none focus:ring-2 focus:ring-[#ab3500]/20 focus:border-[#ab3500]"
                    >
                      <option value="">Select driver…</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}{d.vehicle ? ` — ${d.vehicle}` : ''}{d.isOnline ? ' ●' : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>

                  {selectedId && (
                    <div className="px-3 py-2 bg-orange-50 rounded-lg">
                      {(() => {
                        const d = drivers.find((x) => x.id === selectedId);
                        return d ? (
                          <p className="text-xs font-bold text-[#ab3500]">
                            {d.name}{d.plate ? ` · ${d.plate}` : ''}
                            {d.isOnline ? ' · Online' : ' · Offline'}
                          </p>
                        ) : null;
                      })()}
                    </div>
                  )}

                  <Button
                    fullWidth
                    disabled={!selectedId || assigning}
                    onClick={handleAssign}
                  >
                    {assigning ? 'Assigning…' : 'Assign Driver'}
                  </Button>
                  {assignError && (
                    <p className="text-xs text-red-500 font-medium">{assignError}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  {order.status === 'cancelled'
                    ? 'This order was cancelled before a driver was assigned.'
                    : 'No driver assigned.'}
                </p>
              )}
            </Card>
          )}

          {/* Admin actions */}
          {['confirmed', 'processing', 'in_transit'].includes(order.status) && (
            <Card>
              <h3 className="text-base font-bold text-[#0F1923] mb-3">Admin actions</h3>
              <div className="space-y-2">
                {order.driver?.phone && (
                  <a href={`tel:${order.driver.phone}`} className="block">
                    <Button variant="secondary" fullWidth>Contact Driver</Button>
                  </a>
                )}
                <Button variant="danger" fullWidth onClick={() => setCancelOpen(true)}>
                  Cancel Order
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {cancelOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4"
          onClick={() => !cancelling && setCancelOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#0F1923]">Cancel this order?</h3>
            <p className="text-sm text-slate-500 mt-1">
              This frees the assigned driver and expires any live offers. The customer will see the order as cancelled.
            </p>
            <label className="block mt-5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                Reason (optional, max 500 chars)
              </span>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value.slice(0, 500))}
                rows={3}
                disabled={cancelling}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:border-[#ab3500] focus:bg-white resize-none"
                placeholder="e.g. customer requested cancellation"
              />
            </label>
            {cancelError && (
              <p role="alert" className="mt-3 text-sm font-medium text-red-600">{cancelError}</p>
            )}
            <div className="mt-6 flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setCancelOpen(false)} disabled={cancelling}>
                Keep order
              </Button>
              <Button variant="danger" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? 'Cancelling…' : 'Confirm cancellation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
