"use client";

import Link from "next/link";
import { Bell, HelpCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const PROCESS_STEPS = [
  {
    icon: "✅",
    title: "Profile Registration",
    description: "Account created successfully",
    state: "done",
  },
  {
    icon: "⏳",
    title: "Document Verification",
    description: "Checking Driver's License & NIN",
    state: "active",
  },
  {
    icon: "🚗",
    title: "Vehicle Inspection",
    description: "Physical check at Hub",
    state: "upcoming",
  },
  {
    icon: "🛡️",
    title: "Onboarding Complete",
    description: "Start receiving requests",
    state: "upcoming",
  },
];

export default function ApplicationPendingPage() {
  const { user, profile, loading } = useAuth();

  // Display phone from the verified profile, falling back to a generic label.
  const contactDisplay = profile?.phone ?? profile?.email ?? "your registered contact";

  // Show spinner while auth is resolving or while the profile row is still loading
  // (auth resolves before the profile DB round-trip completes).
  if (loading || (user !== null && profile === null)) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#ab3500] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] font-sans flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex justify-between items-center">
          <Link href="/" className="text-xl font-extrabold text-slate-900 tracking-tighter">
            GoSwift
          </Link>
          <div className="flex items-center gap-1 text-slate-400">
            <button aria-label="Notifications" className="p-2 rounded-full hover:bg-slate-50 hover:text-[#ab3500] transition-colors">
              <Bell size={20} />
            </button>
            <button aria-label="Help" className="p-2 rounded-full hover:bg-slate-50 hover:text-[#ab3500] transition-colors">
              <HelpCircle size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left: Status + Timeline */}
          <div className="lg:col-span-8 space-y-6">
            {/* Main status card */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-10 flex flex-col md:flex-row md:items-center gap-8 text-center md:text-left">
              <div className="w-24 h-24 shrink-0 mx-auto md:mx-0 rounded-full bg-amber-50 flex items-center justify-center relative">
                <div className="absolute inset-0 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin [animation-duration:3s]" />
                <span className="text-4xl">⏳</span>
              </div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 bg-amber-50 px-4 py-1.5 rounded-full mb-4">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-amber-600 tracking-widest uppercase">
                    Under Review
                  </span>
                </div>
                <h1 className="text-2xl font-extrabold text-[#0F1923] tracking-tight mb-3">
                  Application in Progress
                </h1>
                <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto md:mx-0">
                  Our compliance team is currently reviewing your documents.
                  This process usually takes 24–48 hours. We&apos;ll notify you via
                  SMS once a decision is made.
                </p>
              </div>
            </div>

            {/* Process tracker */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-10">
              <h2 className="text-lg font-bold text-[#0F1923] mb-6">
                Process Tracker
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {PROCESS_STEPS.map(({ icon, title, description, state }) => (
                  <div
                    key={title}
                    className={`flex flex-col gap-3 p-4 rounded-2xl border transition-all ${
                      state === "done"
                        ? "bg-emerald-50 border-emerald-100"
                        : state === "active"
                        ? "bg-amber-50/50 border-amber-200"
                        : "bg-white border-slate-100"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                        state === "done"
                          ? "bg-emerald-500 shadow-sm"
                          : state === "active"
                          ? "bg-amber-100 border-2 border-amber-400"
                          : "bg-slate-100 border border-slate-200"
                      }`}
                    >
                      {state === "done" ? "✓" : icon}
                    </div>
                    <div>
                      <h3
                        className={`font-bold text-sm ${
                          state === "upcoming" ? "text-slate-300" : "text-[#0F1923]"
                        }`}
                      >
                        {title}
                      </h3>
                      <p
                        className={`text-xs mt-1 ${
                          state === "upcoming" ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="lg:col-span-4 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="text-[#ab3500] text-xl mb-3 bg-[#ab3500]/10 w-10 h-10 rounded-xl flex items-center justify-center">
                  📱
                </div>
                <p className="text-[10px] font-bold text-[#ab3500] tracking-widest uppercase mb-1">
                  SMS Updates
                </p>
                <p className="font-bold text-[#0F1923] text-sm truncate">
                  {contactDisplay}
                </p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="text-[#ab3500] text-xl mb-3 bg-[#ab3500]/10 w-10 h-10 rounded-xl flex items-center justify-center">
                  🎧
                </div>
                <p className="text-[10px] font-bold text-[#ab3500] tracking-widest uppercase mb-1">
                  Support Access
                </p>
                <p className="font-bold text-[#0F1923] text-sm">
                  Available 24/7 Priority
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href="/"
                className="w-full py-4 px-6 bg-[#ab3500] text-white font-bold rounded-2xl shadow-lg shadow-[#ab3500]/20 flex items-center justify-center gap-2 hover:bg-[#922e00] transition-colors active:scale-[0.98]"
              >
                Go to Home →
              </Link>
              <button className="w-full py-4 px-6 bg-white border-2 border-slate-200 text-[#0F1923] font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors active:scale-[0.98]">
                Contact Support
              </button>
            </div>

            {/* Banner */}
            <div className="relative overflow-hidden rounded-2xl h-36 flex items-center px-5 bg-slate-900 cursor-pointer group">
              <div className="absolute inset-0 bg-linear-to-r from-slate-900 to-slate-800" />
              <div className="relative z-10">
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">
                  Drivers Academy
                </p>
                <p className="font-bold text-white text-base leading-snug">
                  New Training Course Available
                </p>
                <p className="text-[#ab3500] text-xs font-bold mt-2 flex items-center gap-1 group-hover:gap-2 transition-all">
                  Enroll now →
                </p>
              </div>
              <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-[#ab3500]/20 rounded-full blur-2xl pointer-events-none" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-10 px-6 bg-slate-900 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <span className="text-[#ab3500] font-black text-xl">GoSwift</span>
          <div className="flex flex-wrap justify-center gap-8">
            {["Terms", "Privacy", "Drivers", "Support"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-slate-400 text-sm hover:text-white transition-colors"
              >
                {link}
              </a>
            ))}
          </div>
          <p className="text-slate-400 text-sm text-center md:text-right">
            © 2024 GoSwift Logistics Nigeria.
          </p>
        </div>
      </footer>
    </div>
  );
}
