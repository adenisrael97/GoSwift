import { MapPin, Banknote, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: MapPin,
    title: "Set Pickup & Drop",
    description:
      "Enter your delivery details and choose the right vehicle for your package size.",
    step: "01",
  },
  {
    icon: Banknote,
    title: "Instant Pricing",
    description:
      "No hidden fees. See the exact cost upfront before you confirm your request.",
    step: "02",
  },
  {
    icon: CheckCircle,
    title: "Package Delivered",
    description:
      "A verified driver picks up and delivers your package safely. Get notified at every step.",
    step: "03",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-orange-500 text-[10px] font-bold tracking-widest uppercase mb-3">
            Simple Process
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
            How GoSwift Works
          </h2>
          <p className="text-slate-500 text-base leading-relaxed max-w-md mx-auto">
            The simplest way to move things from A to B.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map(({ icon: Icon, title, description, step }) => (
            <div
              key={step}
              className="group relative bg-white p-10 rounded-3xl shadow-[0_4px_24px_rgba(15,23,42,0.06)] border border-slate-100 hover:-translate-y-2 transition-all duration-300"
            >
              {/* Step number */}
              <span className="absolute top-8 right-8 text-6xl font-black text-slate-900/60 select-none group-hover:text-slate-900/80 transition-colors leading-none">
                {step}
              </span>

              {/* Icon */}
              <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-6 group-hover:bg-orange-100 transition-colors">
                <Icon size={24} />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-3">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
