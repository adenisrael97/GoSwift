"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { reviewAdminApplication } from "@/lib/api";

const REDIRECT_DELAY_MS = 1200;

export default function ReviewActions({ applicationId, applicantName }) {
  const router = useRouter();
  const [notes,      setNotes]    = useState("");
  const [decision,   setDecision] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]    = useState("");

  // After a successful decision, return to the list so the new status
  // is visible. Short delay lets the admin read the confirmation banner.
  useEffect(() => {
    if (!decision) return;
    const id = setTimeout(() => router.push("/admin/drivers"), REDIRECT_DELAY_MS);
    return () => clearTimeout(id);
  }, [decision, router]);

  async function submitReview(nextDecision) {
    if (submitting || decision) return;
    setSubmitting(true);
    setError("");

    const { ok, body } = await reviewAdminApplication(applicationId, {
      decision: nextDecision,
      notes,
    });

    if (!ok) {
      setError(body?.error ?? "Failed to submit review");
      setSubmitting(false);
      return;
    }

    setDecision(nextDecision);
    setSubmitting(false);
  }

  return (
    <div className="space-y-4">
      {/* Review notes */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[#ab3500] text-lg">📝</span>
          <h2 className="text-base font-bold text-[#0F1923]">Internal Review Notes</h2>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add internal review notes here (e.g., identity verification results, phone interview summary)…"
          rows={5}
          disabled={!!decision}
          className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-sm text-[#0F1923] focus:ring-2 focus:ring-[#ab3500] focus:border-[#ab3500] outline-none resize-none transition-all disabled:opacity-60"
        />
        <p className="mt-2 text-xs text-slate-400 flex items-center gap-1">
          🔒 These notes are only visible to the admin team.
        </p>
      </section>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl text-sm font-bold text-red-700 bg-red-50 border border-red-200">
          {error}
        </div>
      )}

      {/* Decision banner */}
      {decision && (
        <div
          className={`p-4 rounded-xl text-sm font-bold text-center ${
            decision === "approved"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {decision === "approved"
            ? `✅ Application approved for ${applicantName}`
            : `❌ Application rejected for ${applicantName}`}
        </div>
      )}

      {/* Sticky action footer */}
      <div className="sticky bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] -mx-4 md:-mx-8 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-end">
          <p className="hidden lg:block text-slate-400 text-sm italic mr-auto">
            Reviewing: <strong className="text-slate-700">{applicantName}</strong>
          </p>
          <button
            type="button"
            onClick={() => submitReview("rejected")}
            disabled={!!decision || submitting}
            className="w-full sm:w-auto min-w-35 py-3.5 px-8 rounded-xl border-2 border-red-500 text-red-500 font-bold tracking-wide hover:bg-red-50 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "…" : "✕ Reject"}
          </button>
          <button
            type="button"
            onClick={() => submitReview("approved")}
            disabled={!!decision || submitting}
            className="w-full sm:w-auto min-w-55 py-3.5 px-8 rounded-xl bg-emerald-500 text-white font-bold tracking-wide hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting…" : "✓ Approve Partner"}
          </button>
        </div>
      </div>
    </div>
  );
}
