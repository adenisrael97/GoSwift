"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, HelpCircle, ShieldCheck } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { applyAsDriver, uploadDriverDocuments } from "@/lib/api";
import StepIndicator from "@/components/driver/StepIndicator";
import PersonalInfoStep from "@/components/driver/PersonalInfoStep";
import VehicleInfoStep from "@/components/driver/VehicleInfoStep";
import DocumentUploadStep from "@/components/driver/DocumentUploadStep";
import FormNavigationButtons from "@/components/driver/FormNavigationButtons";

const TOTAL_STEPS = 3;
// Keyed by user ID so different accounts on the same device never share drafts.
const draftKey = (userId) => `goswift_driver_app_draft_${userId}`;

const INITIAL_FORM = {
  fullName:       "",
  phone:          "",
  email:          "",
  dateOfBirth:    "",
  gender:         "",
  nin:            "",
  address:        "",
  vehicleType:    "",
  vehicleModel:   "",
  plateNumber:    "",
  manufacturer:   "",
  vehicleColor:   "",
  guarantorName:  "",
  guarantorPhone: "",
  license:        "",
  nin_doc:        "",
  particulars:    "",
};

function readDraft(userId) {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = sessionStorage.getItem(draftKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeDraft(userId, value) {
  if (typeof window === "undefined" || !userId) return;
  try {
    if (!value) sessionStorage.removeItem(draftKey(userId));
    else        sessionStorage.setItem(draftKey(userId), JSON.stringify(value));
  } catch {
    // sessionStorage quota / disabled — non-fatal
  }
}

/**
 * Validates the visible fields for a given step.
 * Returns an object whose keys are field names and values are error strings.
 * An empty object means the step is valid.
 */
function validateStep(step, formData) {
  const errors = {};

  if (step === 0) {
    const name = formData.fullName.trim();
    if (!name)          errors.fullName = "Full name is required";
    else if (name.length < 2) errors.fullName = "Must be at least 2 characters";

    if (!formData.phone.trim()) errors.phone = "Phone number is required";

    if (formData.email) {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(formData.email)) errors.email = "Enter a valid email address";
    }

    if (formData.nin) {
      const digits = formData.nin.replace(/\s/g, "");
      if (!/^\d{11}$/.test(digits)) errors.nin = "NIN must be 11 numbers — check your NIMC card or NIN slip (e.g. 12345678901)";
    }
  }

  if (step === 1) {
    if (!formData.vehicleType) errors.vehicleType = "Please select a vehicle type";

    const plate = formData.plateNumber.trim();
    if (!plate)          errors.plateNumber = "Plate number is required";
    else if (plate.length < 3) errors.plateNumber = "Enter a valid plate number";

    if (formData.guarantorPhone) {
      const digits = formData.guarantorPhone.replace(/\D/g, "");
      if (digits.length < 7) errors.guarantorPhone = "Enter a valid phone number";
    }
  }

  // Step 2 (documents) — uploads are not required at submission time
  return errors;
}

export default function DriverRegistrationPage() {
  const router = useRouter();
  const { user, role, profile, loading: authLoading } = useAuth();

  // Start blank — draft is loaded per-user once auth resolves (see effect below).
  const [state, setState] = useState({ step: 0, formData: INITIAL_FORM });
  const [isLoading,   setIsLoading]   = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [stepErrors,  setStepErrors]  = useState({});

  // Selected document File objects. Kept OUT of `formData` on purpose: formData
  // is JSON-serialised into the per-user draft (localStorage), and File objects
  // don't survive that round-trip. These live only for the current session.
  const [docFiles, setDocFiles] = useState({
    license: null, nin_doc: null, particulars: null,
  });

  // Guards so each one-time effect only runs once per mount.
  const draftLoadedRef = useRef(false);
  const prefillDoneRef = useRef(false);

  const { step, formData } = state;

  // ── Auth gate ─────────────────────────────────────────────────────────
  // Redirect unauthenticated visitors to login, storing the intent so they
  // come back here automatically after signing in.
  // Redirect already-approved drivers to their dashboard — no need to apply.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      sessionStorage.setItem("auth_next_url", "/register/driver");
      router.replace("/login");
      return;
    }
    if (role === "driver") {
      router.replace("/driver/dashboard");
    }
  }, [user, role, authLoading, router]);

  // ── Draft restore ─────────────────────────────────────────────────────
  // Load the saved draft for THIS user only — runs once after user is known.
  // Keying by user.id means a different account on the same device never
  // inherits a previous applicant's in-progress form.
  useEffect(() => {
    if (!user || draftLoadedRef.current) return;
    draftLoadedRef.current = true;
    const draft = readDraft(user.id);
    if (!draft) return;
    const restoredForm = { ...INITIAL_FORM, ...(draft.formData ?? {}) };
    // Sanitize: if nin contains anything other than digits and spaces it's a
    // leftover filename from before the nin/nin_doc field rename fix — clear it.
    if (restoredForm.nin && !/^[\d\s]+$/.test(restoredForm.nin)) {
      restoredForm.nin = "";
    }
    setState({
      step: typeof draft.step === "number"
        ? Math.min(Math.max(draft.step, 0), TOTAL_STEPS - 1)
        : 0,
      formData: restoredForm,
    });
  }, [user]);

  // ── Profile pre-fill ──────────────────────────────────────────────────
  // Once the profile row arrives, seed the form with the verified phone and
  // the name the user entered in the welcome sheet (if any). Only runs once
  // so subsequent user edits are not clobbered.
  useEffect(() => {
    if (!profile || prefillDoneRef.current) return;
    prefillDoneRef.current = true;
    setState((prev) => ({
      ...prev,
      formData: {
        ...prev.formData,
        fullName: prev.formData.fullName || profile.full_name || "",
        phone:    profile.phone          || prev.formData.phone || "",
      },
    }));
  }, [profile]);

  // ── Draft persistence ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    writeDraft(user.id, { step, formData });
  }, [user, step, formData]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleChange = (field, value) => {
    setState((prev) => ({ ...prev, formData: { ...prev.formData, [field]: value } }));
    if (stepErrors[field]) {
      setStepErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
    if (submitError) setSubmitError("");
  };

  const setStep = (next) =>
    setState((prev) => ({
      ...prev,
      step: typeof next === "function" ? next(prev.step) : next,
    }));

  const handleNext = () => {
    const errors = validateStep(step, formData);
    if (Object.keys(errors).length > 0) {
      setStepErrors(errors);
      return;
    }
    setStepErrors({});
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
  };

  const handleBack = () => {
    setStepErrors({});
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    const errors = validateStep(step, formData);
    if (Object.keys(errors).length > 0) {
      setStepErrors(errors);
      return;
    }
    setStepErrors({});
    if (isLoading) return;

    setIsLoading(true);
    setSubmitError("");

    try {
      // Upload any selected documents first, then attach their storage paths
      // to the application. Uploads are optional — skip the call entirely when
      // nothing was selected so the existing no-document flow is unchanged.
      let docPaths = {};
      const hasDocs = docFiles.license || docFiles.nin_doc || docFiles.particulars;
      if (hasDocs) {
        const up = await uploadDriverDocuments(docFiles);
        if (!up.ok) {
          setSubmitError(
            up.body?.error ?? "Could not upload your documents. Please try again."
          );
          return;
        }
        docPaths = {
          licenseUrl:     up.body.licenseUrl,
          ninDocUrl:      up.body.ninDocUrl,
          particularsUrl: up.body.particularsUrl,
        };
      }

      const { ok, status, body } = await applyAsDriver({ ...formData, ...docPaths });

      if (!ok || !body?.applicationId) {
        setSubmitError(
          status === 401
            ? "Session expired. Please sign in again."
            : status === 409
            ? "You already have a pending or approved driver application."
            : "Could not submit your application. Please go back and check your details."
        );
        return;
      }

      writeDraft(user.id, null);
      router.push(`/register/driver/pending?id=${body.applicationId}`);
    } catch (err) {
      setSubmitError(
        err?.message?.includes("Failed to fetch")
          ? "Network error. Check your connection and try again."
          : "Unexpected error. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Loading / redirect states ─────────────────────────────────────────
  if (authLoading || !user || role === "driver") {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#ab3500] rounded-full animate-spin" />
      </div>
    );
  }

  const lockedPhone = Boolean(profile?.phone);

  return (
    <div className="min-h-screen bg-[#F7F8FA] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex justify-between items-center">
          <Link href="/" className="text-xl font-extrabold text-slate-900 tracking-tighter">
            GoSwift
          </Link>
          <div className="flex items-center gap-1 text-slate-400">
            <button
              aria-label="Notifications"
              className="p-2 rounded-full hover:bg-slate-50 hover:text-[#ab3500] transition-colors"
            >
              <Bell size={20} />
            </button>
            <button
              aria-label="Help"
              className="p-2 rounded-full hover:bg-slate-50 hover:text-[#ab3500] transition-colors"
            >
              <HelpCircle size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 pt-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

          {/* Left column */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <StepIndicator currentStep={step} />
              <h1 className="text-2xl font-extrabold text-[#0F1923] tracking-tight mt-4 mb-1">
                Driver Application
              </h1>
              <p className="text-sm text-slate-500">
                {step === 0 && "Tell us about yourself."}
                {step === 1 && "Describe your vehicle and guarantor."}
                {step === 2 && "Upload your verification documents."}
              </p>
            </div>

            {/* Earnings banner */}
            <div className="bg-[#ab3500]/5 border border-[#ab3500]/10 rounded-2xl p-5 flex items-center gap-4">
              <div className="bg-[#ab3500] text-white p-3 rounded-xl shrink-0 text-xl">
                💰
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#ab3500] uppercase tracking-widest mb-0.5">
                  Earning Potential
                </p>
                <p className="text-lg font-extrabold text-[#5f1900]">
                  Earn ₦45,000+ per week
                </p>
              </div>
              <span className="ml-auto text-[#ab3500] text-xl">📈</span>
            </div>

            {/* Identity verified card (desktop) */}
            <div className="hidden lg:block bg-slate-900 rounded-3xl p-8 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <ShieldCheck size={16} className="text-emerald-400" />
                  </div>
                  <h3 className="text-white font-bold text-xl">Account Verified</h3>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  You&apos;re signed in. Your application is securely linked to
                  your GoSwift account.
                </p>
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-emerald-400 font-semibold">✓ Account created</p>
                  <p className="text-xs text-emerald-400 font-semibold">✓ Signed in securely</p>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-[#ab3500] opacity-20 blur-3xl rounded-full pointer-events-none" />
            </div>
          </div>

          {/* Right column: Form */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
              {step === 0 && (
                <PersonalInfoStep
                  formData={formData}
                  onChange={handleChange}
                  errors={stepErrors}
                  lockedPhone={lockedPhone}
                />
              )}
              {step === 1 && (
                <VehicleInfoStep
                  formData={formData}
                  onChange={handleChange}
                  errors={stepErrors}
                />
              )}
              {step === 2 && (
                <DocumentUploadStep
                  files={docFiles}
                  onChange={(id, file) =>
                    setDocFiles((prev) => ({ ...prev, [id]: file }))
                  }
                />
              )}
            </div>

            {/* Identity verified card (mobile) */}
            <div className="lg:hidden mt-6 bg-slate-900 rounded-2xl p-6 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <h3 className="text-white font-bold text-base">Account Verified</h3>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  You&apos;re signed in and this application is linked to your account.
                </p>
              </div>
              <div className="absolute -bottom-8 -right-8 w-36 h-36 bg-[#ab3500] opacity-20 blur-3xl rounded-full pointer-events-none" />
            </div>
          </div>
        </div>
      </main>

      {/* Submit error toast */}
      {submitError && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg z-50"
        >
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-lg flex items-start gap-3">
            <span className="text-lg leading-none">⚠</span>
            <span className="flex-1">{submitError}</span>
            <button
              type="button"
              onClick={() => setSubmitError("")}
              className="text-red-500 hover:text-red-700 text-lg leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <FormNavigationButtons
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        onBack={handleBack}
        onNext={handleNext}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
