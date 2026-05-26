'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, CheckCircle, Loader2 } from 'lucide-react';
import DangerZone from '@/components/profile/DangerZone';
import PageShell from '@/components/ui/PageShell';
import AppHeader from '@/components/ui/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { deleteAccount } from '@/lib/api';

const CONFIRM_WORD = 'DELETE';

export default function DeleteAccountPage() {
  const router = useRouter();
  const { logout } = useAuth();

  const [input,      setInput]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const [error,      setError]      = useState('');

  const confirmed = input.trim().toUpperCase() === CONFIRM_WORD;

  async function handleDelete() {
    if (!confirmed || submitting) return;
    setSubmitting(true);
    setError('');

    const { ok, status, body } = await deleteAccount();

    if (!ok) {
      if (status === 401) setError('Your session has expired. Please sign in again.');
      else setError(body?.error ?? 'Failed to delete account. Please try again.');
      setSubmitting(false);
      return;
    }

    setDone(true);

    // logout() clears the server cookie + Supabase session.
    // useAuthGuard will handle the redirect to /login automatically.
    try { await logout(); } catch {}

    setTimeout(() => router.replace('/login'), 1500);
    setSubmitting(false);
  }

  return (
    <PageShell>
      <AppHeader backHref="/profile" />

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-8 flex flex-col">
        <DangerZone />

        {/* Confirmation form */}
        <div className="flex-1 mt-8 space-y-6">
          <div className="space-y-2">
            <label
              className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1"
              htmlFor="confirm-input"
            >
              Type DELETE to confirm
            </label>
            <input
              id="confirm-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-white border-2 border-red-100 rounded-xl px-4 py-4 font-bold text-center tracking-widest text-red-500 focus:ring-4 focus:ring-red-50 focus:border-red-400 outline-none transition-all placeholder:text-red-200 text-lg"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
            >
              {error}
            </div>
          )}

          <button
            onClick={handleDelete}
            disabled={!confirmed || submitting}
            className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-5 rounded-2xl shadow-[0_8px_16px_rgba(239,68,68,0.25)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
          >
            {submitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <span className="text-lg font-bold">Confirm Deletion</span>
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <Link
            href="/profile"
            className="block w-full py-4 text-center text-slate-500 hover:text-slate-700 transition-colors font-medium text-base active:scale-95"
          >
            I changed my mind, keep my account
          </Link>
        </div>

        <div className="h-8" />
      </main>

      {/* Success overlay */}
      {done && (
        <div className="fixed inset-0 z-100 bg-white flex flex-col items-center justify-center px-8 text-center">
          <div className="relative w-24 h-24 flex items-center justify-center mb-8">
            <CheckCircle size={72} className="text-emerald-500 fill-emerald-50 stroke-emerald-500" />
            <div className="absolute inset-0 border-4 border-emerald-100 rounded-full animate-ping opacity-25" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">Request Submitted</h2>
          <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
            Your account deletion request is being processed. You will be logged out automatically in a few seconds.
          </p>
          <div className="mt-12 w-full max-w-50 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full w-1/3 animate-[progress_3s_ease-in-out_infinite]" />
          </div>
        </div>
      )}
    </PageShell>
  );
}
