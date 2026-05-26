import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const stats = [
  { value: "15m", label: "Avg Pickup" },
  { value: "50k+", label: "Deliveries" },
  { value: "4.9/5", label: "Rating" },
  { value: "2k+", label: "Drivers" },
];

export default function Hero() {
  return (
    <section className="bg-hero-glow relative overflow-hidden pt-20 pb-32 px-6">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-orange-500/10 blur-[120px]" />

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
        {/* Left: Copy */}
        <div className="space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-full">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-white text-[10px] font-bold tracking-widest uppercase">
              Now operating in Lagos, Abuja &amp; PH
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
            documents to heavy cargo, we move it with precision.
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
              className="inline-flex items-center justify-center gap-2 bg-white/5 border border-white/15 text-white font-bold text-sm px-8 py-4 rounded-xl hover:bg-white/10 transition-all active:scale-95"
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

        {/* Right: Image */}
        <div className="relative">
          <div className="absolute -top-16 -right-16 w-80 h-80 bg-orange-500/20 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhcTOLSyVfehqrSQfbnwDHiLw_zZudCzmUAqlxcOfejn5ww0-Wc4GKmJgaCkPhlv4K8KLZ-pnM3OvmpDHjmcGoDOOg2HGgkjiqXSpNaUBKpIYH5Y1ylqa9SAqZQPuZTQAB0KZq8tITMk23ABSP6v3XSFW5Zt0zQVYC043Hsv0XGXDX60N25nQxjnCDnNx4lMe0l3_iOTDIVYiHzfasmIae9udVwTgwJsZyQDAwO5gJAwCJur2GGcdbMXPisBPa2Jm1XViWUdlvTwtt"
              alt="GoSwift logistics — courier with tablet in front of delivery vans"
              width={700}
              height={500}
              className="w-full h-auto object-cover"
              priority
              unoptimized
            />
          </div>
        </div>
      </div>
    </section>
  );
}
