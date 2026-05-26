import { Smartphone, PlayCircle } from "lucide-react";
import Link from "next/link";

export default function CTA() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="bg-cta-glow max-w-5xl mx-auto rounded-[40px] p-12 md:p-20 text-center relative overflow-hidden">
        {/* Decorative rings */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[700px] h-[700px] rounded-full border border-white/5" />
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[500px] h-[500px] rounded-full border border-white/5" />
        </div>

        <div className="relative z-10 space-y-8">
          {/* Label */}
          <span className="inline-block text-orange-500 text-[10px] font-bold tracking-widest uppercase">
            Get Started Today
          </span>

          <h2 className="text-white font-extrabold tracking-tight leading-tight text-[clamp(2rem,5vw,3.5rem)]">
            Ready to start shipping?
          </h2>

          <p className="text-slate-400 text-base leading-relaxed max-w-md mx-auto">
            Download the GoSwift app today and get{" "}
            <span className="text-orange-400 font-semibold">50% off</span> your
            first 3 deliveries.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2.5 bg-orange-600 text-white font-bold text-sm px-8 py-4 rounded-xl hover:bg-orange-500 transition-all active:scale-95"
            >
              <Smartphone size={18} />
              Get Started Free
            </Link>
            <button className="inline-flex items-center justify-center gap-2.5 bg-white/10 border border-white/20 text-white font-bold text-sm px-8 py-4 rounded-xl hover:bg-white/15 transition-all active:scale-95">
              <PlayCircle size={18} />
              Google Play
            </button>
          </div>

          <p className="text-slate-500 text-xs pt-2">
            Available on iOS &amp; Android — Free to download
          </p>
        </div>
      </div>
    </section>
  );
}
