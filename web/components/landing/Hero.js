import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const stats = [
  { value: "15m",  label: "Avg Pickup" },
  { value: "50k+", label: "Deliveries" },
  { value: "4.9/5",label: "Rating" },
  { value: "2k+",  label: "Drivers" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden min-h-[90vh] flex items-center pt-20">
      {/* Background image */}
      <Image
        src="/LandingpageImage/Heroimage.jpg"
        alt="GoSwift logistics operations"
        fill
        className="object-cover object-center"
        priority
      />

      {/* Gradient overlays — left-heavy so text stays readable, right side reveals photo */}
      <div className="absolute inset-0 bg-linear-to-r from-[#0A1520]/95 via-[#0A1520]/80 to-[#0A1520]/30" />
      <div className="absolute inset-0 bg-linear-to-t from-[#0A1520]/80 via-transparent to-transparent" />

      {/* Orange accent glow */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-125 h-125 rounded-full bg-orange-500/15 blur-[120px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 w-full">
        <div className="max-w-2xl space-y-8">
          {/* Location badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-full backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-white text-[10px] font-bold tracking-widest uppercase">
              GoSwift Logistics now in Lagos, Abuja, and Ibadan
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-white font-extrabold leading-[1.08] tracking-tight text-[clamp(2.6rem,6vw,4.2rem)]">
            Deliver Anything,{" "}
            <span className="text-orange-500">Anywhere</span>{" "}
            in Minutes.
          </h1>

          {/* Sub-headline */}
          <p className="text-slate-300 text-base leading-relaxed max-w-lg">
            Experience the fastest on-demand logistics network in Nigeria. From
            documents to heavy cargo, we move it with precision and care.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-orange-600 text-white font-bold text-sm px-8 py-4 rounded-xl hover:bg-orange-500 hover:shadow-[0_0_24px_rgba(255,107,53,0.4)] transition-all active:scale-95"
            >
              Get Started <ArrowRight size={16} />
            </Link>
            <Link
              href="/register/driver"
              className="inline-flex items-center justify-center gap-2 bg-white/5 border border-white/15 text-white font-bold text-sm px-8 py-4 rounded-xl hover:bg-white/10 transition-all active:scale-95 backdrop-blur-sm"
            >
              Become a Driver <ArrowRight size={16} />
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-10 border-t border-white/10">
            {stats.map(({ value, label }) => (
              <div key={label}>
                <div className="text-orange-500 text-2xl font-extrabold tracking-tight">
                  {value}
                </div>
                <div className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mt-0.5">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
