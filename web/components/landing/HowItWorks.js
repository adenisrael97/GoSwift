import { PackageSearch, UserCheck, Navigation, PackageCheck } from "lucide-react";

const steps = [
  {
    icon: PackageSearch,
    step: "01",
    title: "Request a Delivery",
    description:
      "Enter your pickup and drop-off locations, choose the right vehicle for your package, and get instant transparent pricing — no hidden fees.",
  },
  {
    icon: UserCheck,
    step: "02",
    title: "Driver Assignment",
    description:
      "Our system instantly matches you with the nearest verified driver. Within minutes, a GoSwift courier is on their way to your pickup location.",
  },
  {
    icon: Navigation,
    step: "03",
    title: "Real-Time Tracking",
    description:
      "Follow your delivery live on the map. Get SMS and in-app notifications at every milestone — pickup, in transit, and approaching destination.",
  },
  {
    icon: PackageCheck,
    step: "04",
    title: "Successful Delivery",
    description:
      "Your package arrives safely and on time. Confirm receipt, rate your driver, and receive a digital proof of delivery instantly.",
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
            Four simple steps from booking to delivery — fast, transparent, and
            fully tracked.
          </p>
        </div>

        {/* Cards — 2 cols on md, 4 on lg */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map(({ icon: Icon, step, title, description }, idx) => (
            <div
              key={step}
              className="group relative bg-white p-8 rounded-3xl shadow-[0_4px_24px_rgba(15,23,42,0.06)] border border-slate-100 hover:-translate-y-2 transition-all duration-300"
            >
              {/* Connector line between cards (desktop) */}
              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 -right-4 w-8 h-0.5 bg-orange-200 z-10" />
              )}

              {/* Step number */}
              <span className="absolute top-7 right-7 text-5xl font-black text-slate-900/5 select-none group-hover:text-orange-500/10 transition-colors leading-none">
                {step}
              </span>

              {/* Icon */}
              <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-6 group-hover:bg-orange-100 group-hover:scale-110 transition-all duration-300">
                <Icon size={24} />
              </div>

              {/* Orange step indicator */}
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-[9px] font-black flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-orange-500 text-[9px] font-bold tracking-widest uppercase">
                  Step {step}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 mb-3">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
