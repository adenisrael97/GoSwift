export default function FormNavigationButtons({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSubmit,
  isLoading,
}) {
  const isLast = currentStep === totalSteps - 1;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl shadow-[0_-8px_30px_rgba(0,0,0,0.06)] border-t border-slate-100 px-4 md:px-8 py-4">
      <div className="max-w-5xl mx-auto flex gap-4 items-center">
        {currentStep > 0 && (
          <button
            type="button"
            onClick={onBack}
            className="w-14 h-14 shrink-0 border border-slate-200 rounded-2xl font-bold text-[#0F1923] flex items-center justify-center hover:bg-slate-50 transition-colors text-lg"
            aria-label="Go back"
          >
            ←
          </button>
        )}
        <button
          type="button"
          onClick={isLast ? onSubmit : onNext}
          disabled={isLoading}
          className="flex-1 py-4 bg-[#ab3500] text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-[#ab3500]/20 hover:bg-[#922e00] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading
            ? "Submitting…"
            : isLast
            ? "Submit Application ✓"
            : "Continue to Next Step →"}
        </button>
      </div>
    </div>
  );
}
