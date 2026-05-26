const STEP_LABELS = ["Personal Info", "Vehicle Details", "Documents"];

export default function StepIndicator({ currentStep }) {
  return (
    <div>
      <div className="flex gap-2 w-full mb-3">
        {STEP_LABELS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= currentStep ? "bg-[#ab3500]" : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        Step {currentStep + 1} of {STEP_LABELS.length} —{" "}
        <span className="text-[#ab3500]">{STEP_LABELS[currentStep]}</span>
      </p>
    </div>
  );
}
