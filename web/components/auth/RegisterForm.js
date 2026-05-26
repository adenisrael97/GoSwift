"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Zap } from "lucide-react";

import { register, setSession } from "@/lib/api";
import PhoneField from "@/components/auth/PhoneField";
import { validateEmail, validatePassword } from "@/lib/utils/validation";

function destinationFor(role, nextUrl) {
  if (nextUrl) return nextUrl;
  if (role === "admin")  return "/admin/dashboard";
  if (role === "driver") return "/driver/dashboard";
  return "/dashboard";
}

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") ?? "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");      // E.164 from PhoneField
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validate = () => {
    if (fullName.trim().length < 2) return "Please enter your full name.";
    const emailRes = validateEmail(email);
    if (!emailRes.valid) return emailRes.error;
    if (!phone) return "Please enter your phone number.";
    const pwRes = validatePassword(password);
    if (!pwRes.valid) return pwRes.error;
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;                 // double-submit guard
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError("");

    try {
      const { ok, status, body } = await register({
        fullName: fullName.trim(),
        email:    email.trim().toLowerCase(),
        phone,
        password,
      });

      if (status === 0) {
        // fetch() threw or timed out — no usable response from the server.
        // Prefer the specific message (e.g. timeout) when the client set one.
        setError(body?.error ?? "Connection failed. Please check your network and try again.");
        return;
      }
      if (!ok) {
        setError(body?.error ?? "Could not create your account. Please try again.");
        return;
      }
      if (!body?.session?.access_token) {
        // Server returned 200 but response body was truncated (flaky connection).
        // Account was created — direct the user to sign in rather than retrying
        // registration, which would hit the duplicate-phone/email guard.
        setError("Account created but sign-in failed. Please sign in manually.");
        return;
      }

      await setSession(body.session);

      let nextUrl = nextParam;
      if (!nextUrl && typeof window !== "undefined") {
        nextUrl = sessionStorage.getItem("auth_next_url") ?? "";
        sessionStorage.removeItem("auth_next_url");
      }
      router.replace(destinationFor(body.role, nextUrl));
    } catch (err) {
      console.error("[RegisterForm] unexpected error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface min-h-screen flex flex-col items-center">
      <div className="w-full max-w-[448px] mx-auto min-h-screen flex flex-col px-4 sm:px-0">
        <header className="flex justify-between items-center w-full py-6">
          <Link
            href="/"
            aria-label="Go back"
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
            <div className="mb-6">
              <h1 className="text-[26px] font-black text-slate-900 leading-tight tracking-tight mb-1.5">
                Create your account
              </h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                Join GoSwift — Nigeria&apos;s fastest logistics platform
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="fullName" className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 ml-1">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  autoFocus
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); if (error) setError(""); }}
                  placeholder="Ada Lovelace"
                  className="w-full border-2 border-slate-100 rounded-xl py-4 px-4 text-base font-semibold text-slate-900 placeholder:text-slate-300 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/8 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 ml-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
                  placeholder="you@example.com"
                  className="w-full border-2 border-slate-100 rounded-xl py-4 px-4 text-base font-semibold text-slate-900 placeholder:text-slate-300 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/8 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 ml-1">
                  Phone Number
                </label>
                <PhoneField onChange={(v) => { setPhone(v); if (error) setError(""); }} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 ml-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
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

              {error && <p className="text-xs text-red-500 font-medium ml-1">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className={[
                  "w-full h-[52px] rounded-full text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] group",
                  loading
                    ? "bg-orange-300 cursor-not-allowed"
                    : "bg-orange-600 hover:bg-orange-700 shadow-[0_8px_20px_-4px_rgba(234,88,12,0.4)]",
                ].join(" ")}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account…
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="text-orange-600 font-bold hover:text-orange-700">
                Sign in
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
