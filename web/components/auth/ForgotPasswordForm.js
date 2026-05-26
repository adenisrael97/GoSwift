"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, MailCheck, Zap } from "lucide-react";

import { forgotPassword } from "@/lib/api";
import PhoneField from "@/components/auth/PhoneField";

export default function ForgotPasswordForm() {
  const [mode, setMode] = useState("email"); // 'email' | 'phone'
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");      // E.164 from PhoneField
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const identifier = mode === "email" ? email.trim() : phone;
  const canSubmit = identifier.length >= 3 && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;                 // double-submit guard
    if (!canSubmit) {
      setError("Enter your email or phone to continue.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const { ok, body } = await forgotPassword(identifier);
      if (!ok) {
        setError(body?.error ?? "Could not send the reset link. Please try again.");
        return;
      }
      // The endpoint always returns success (no account enumeration), so we
      // always land on the confirmation state.
      setSent(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface min-h-screen flex flex-col items-center">
      <div className="w-full max-w-[448px] mx-auto min-h-screen flex flex-col px-4 sm:px-0">
        <header className="flex justify-between items-center w-full py-6">
          <Link
            href="/login"
            aria-label="Back to sign in"
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white shadow-[0_4px_12px_rgba(15,25,35,0.08)] hover:bg-slate-50 transition-all active:scale-95 text-slate-700"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-sm">
              <Zap size={18} className="text-white" fill="white" />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">GoSwift</span>
          </div>
          <div className="w-12" />
        </header>

        <main className="flex-1 flex flex-col justify-center">
          <div className="bg-white rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.07)] border border-slate-100 mb-8">
            {sent ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MailCheck size={26} className="text-emerald-500" />
                </div>
                <h1 className="text-[22px] font-black text-slate-900 mb-2">Check your email</h1>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                  If an account matches what you entered, we&apos;ve sent a password
                  reset link. The link expires shortly, so use it soon.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 w-full h-[52px] rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm transition-all active:scale-[0.98]"
                >
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="text-[26px] font-black text-slate-900 leading-tight tracking-tight mb-1.5">
                    Reset your password
                  </h1>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Enter your email or phone and we&apos;ll send you a reset link.
                  </p>
                </div>

                <div className="flex p-1 bg-slate-100 rounded-xl mb-5">
                  {["email", "phone"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setMode(m); setError(""); }}
                      className={[
                        "flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all",
                        mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
                      ].join(" ")}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {mode === "email" ? (
                    <div className="space-y-1.5">
                      <label htmlFor="email" className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 ml-1">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
                        placeholder="you@example.com"
                        className="w-full border-2 border-slate-100 rounded-xl py-4 px-4 text-base font-semibold text-slate-900 placeholder:text-slate-300 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/8 transition-all"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 ml-1">
                        Phone Number
                      </label>
                      <PhoneField onChange={(v) => { setPhone(v); if (error) setError(""); }} autoFocus />
                    </div>
                  )}

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
                        Sending…
                      </>
                    ) : (
                      <>
                        Send Reset Link
                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-500">
                  Remember your password?{" "}
                  <Link href="/login" className="text-orange-600 font-bold hover:text-orange-700">
                    Sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
