import Image from "next/image";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

const perks = [
  "Daily Payout Options Available",
  "Free Training & Branded Gear",
  "24/7 Driver Support & Safety",
];

export default function DriverCTA() {
  return (
    <section id="drivers" className="bg-night py-24 px-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[160px]" />

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10">
        {/* Image */}
        <div className="flex-1 w-full">
          <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLD2vLlKJdu2Vfulptpo-gZPKsM9-1PRXt72M3spDE8CluGXvb6kc4ytacWAFGXK37A3DMzOmtbScv6J8LJHrdVWlhG1k-_F5SLrnKVAn4CZW4xJOFBu6JY6ewZVshtg31Cs-QtaQDbpsXexvU8YyPAhZCYLBZS7mMp3XhKKRpfjVSA7vWrQXgWBIx_SwpFzILQ5YcBQZ0q7H1NTTkPc93Xa9MVJv-RPc2f1Xh9QnI9kbXiXAf3K47EOsXkcrhghFcHHBgSvrxua0V"
              alt="GoSwift delivery driver on motorcycle"
              width={600}
              height={500}
              className="w-full h-auto object-cover"
              unoptimized
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-8">
          <div>
            <span className="text-orange-500 text-[10px] font-bold tracking-widest uppercase block mb-4">
              Driver Program
            </span>
            <h2 className="text-white text-3xl font-extrabold tracking-tight leading-snug">
              Drive with GoSwift &amp; Earn on Your Terms.
            </h2>
          </div>
          <p className="text-slate-400 text-base leading-relaxed">
            Join 2,000+ drivers who enjoy flexible hours, weekly payments, and
            high-tech support tools.
          </p>

          {/* Earnings Card */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm p-8 rounded-2xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-white font-bold text-sm">Potential Earnings</span>
              <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">
                Weekly
              </span>
            </div>
            <div className="text-white text-3xl font-extrabold tracking-tight mb-6">
              ₦45,000 – ₦80,000+
            </div>
            <Link
              href="/register/driver"
              className="block w-full bg-white text-slate-900 text-sm font-bold py-4 rounded-xl hover:bg-slate-100 transition-all active:scale-95 text-center"
            >
              Become a Driver →
            </Link>
          </div>

          {/* Perks */}
          <ul className="space-y-4">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-3 text-slate-300 text-sm">
                <CheckCircle size={18} className="text-orange-500 shrink-0" />
                {perk}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
