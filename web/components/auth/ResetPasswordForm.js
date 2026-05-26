"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, ShieldCheck, Zap } from "lucide-react";

import { verifyRecoveryLink, updatePassword, logout } from "@/lib/api";
import { validatePassword } from "@/lib/utils/validation";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 'verifying' → validating the link | 'ready' → show form | 'invalid' | 'done'
  const [phase, setPhase] = useState("verifying");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // The recovery token is single-use: verifyOtp/exchangeCodeForSession
  // consumes it. React StrictMode (dev) double-invokes effects, and a second
  // run would fail on the already-spent token and wrongly flip phase to
  // 'invalid'. This ref ensures the exchange runs exactly once per mount.
  const exchangedRef = useRef(false);

  // Validate the recovery link once on mount so an invalid/expired link is
  // surfaced before the user types anything.
  useEffect(() => {
    if (exchangedRef.current) return;
    exchangedRef.current = true;

    const token_hash = searchParams.get("token_hash") ?? undefined;
    const code = searchParams.get("code") ?? undefined;

    // The default implicit-flow recovery link carries the session in the URL
    // hash (#access_token=…&refresh_token=…&type=recovery), and any link error
    // (e.g. an already-expired token) arrives as #error=…&error_description=….
    // Parse it client-side since the hash is never sent to the server.
    let access_token, refresh_token, hashError;
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      access_token = hash.get("access_token") ?? undefined;
      refresh_token = hash.get("refresh_token") ?? undefined;
      hashError = hash.get("error_description") ?? hash.get("error") ?? undefined;
    }

    (async () => {
      if (hashError) {
        setPhase("invalid");
        return;
      }
      const { error: linkError } = await verifyRecoveryLink({
        token_hash,
        code,
        access_token,
        refresh_token,
      });
      setPhase(linkError ? "invalid" : "ready");
    })();
  }, [searchParams]);

  const canSubmit = password.length >= 8 && confirm.length >= 8 && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;                 // double-submit guard
    const pwRes = validatePassword(password);
    if (!pwRes.valid) {
      setError(pwRes.error);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const { error: updateError } = await updatePassword(password);
      if (updateError) {
        setError(updateError);
        return;
      }
      // Clear the recovery session + cookie so the user signs in fresh with
      // the new password.
      await logout();
      setPhase("done");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface min-h-screen flex flex-col items-center">
      <div className="w-full max-w-[448px] mx-auto min-h-screen flex flex-col px-4 sm:px-0">
        <header className="flex justify-center items-center w-full py-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-sm">
              <Zap size={18} className="text-white" fill="white" />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">GoSwift</span>
          </div>
        </header>

        <main className="flex-1 flex flex-col justify-center">
          <div className="bg-white rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.07)] border border-slate-100 mb-8">

            {phase === "verifying" && (
              <div className="text-center py-10">
                <svg className="animate-spin h-7 w-7 mx-auto text-orange-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-slate-500 mt-4">Verifying your reset link…</p>
              </div>
            )}

            {phase === "invalid" && (
              <div className="text-center py-4">
                <h1 className="text-[22px] font-black text-slate-900 mb-2">Link expired</h1>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                  This password reset link is invalid or has expired. Request a new one to continue.
                </p>
                <Link
                  href="/forgot-password"
                  className="inline-flex items-center justify-center gap-2 w-full h-[52px] rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm transition-all active:scale-[0.98]"
                >
                  Request New Link
                </Link>
              </div>
            )}

            {phase === "done" && (
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={26} className="text-emerald-500" />
                </div>
                <h1 className="text-[22px] font-black text-slate-900 mb-2">Password updated</h1>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                  Your password has been changed. Sign in with your new password.
                </p>
                <button
                  type="button"
                  onClick={() => router.replace("/login")}
                  className="inline-flex items-center justify-center gap-2 w-full h-[52px] rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm transition-all active:scale-[0.98]"
                >
                  Go to Sign In
                </button>
              </div>
            )}

            {phase === "ready" && (
              <>
                <div className="mb-6">
                  <h1 className="text-[26px] font-black text-slate-900 leading-tight tracking-tight mb-1.5">
                    Set a new password
                  </h1>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Choose a strong password you haven&apos;t used before.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div className="space-y-1.5">
                    <label htmlFor="password" className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 ml-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPw ? "text" : "password"}
                        autoComplete="new-password"
                        autoFocus
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
                        placeholder="At least 8 characters"
                        className="w-full border-2 border-slate-100 rounded-xl py-4 pl-4 pr-12 text-base font-semibold text-slate-900 placeholder:text-slate-300 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/8 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label={showPw ? "Hide password" : "Show password"}
                      >
                        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="confirm" className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 ml-1">
                      Confirm Password
                    </label>
                    <input
                      id="confirm"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); if (error) setError(""); }}
                      placeholder="Re-enter your password"
                      className="w-full border-2 border-slate-100 rounded-xl py-4 px-4 text-base font-semibold text-slate-900 placeholder:text-slate-300 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/8 transition-all"
                    />
                  </div>

                  {error && <p className="text-xs text-red-500 font-medium ml-1">{error}</p>}

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={[
                      "w-full h-[52px] rounded-full text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] group",
                      canSubmit
                        ? "bg-orange-600 hover:bg-orange-700 shadow-[0_8px_20px_-4px_rgba(234,88,12,0.4)]"
                        : "bg-orange-300 cursor-not-allowed",
                    ].join(" ")}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Updating…
                      </>
                    ) : (
                      <>
                        Update Password
                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
