import Image from "next/image";
import { ShieldCheck, Truck, Headphones, CheckCircle } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Fully Insured Goods",
    description:
      "Every delivery is covered by our comprehensive insurance policy for your peace of mind.",
  },
  {
    icon: Truck,
    title: "Multiple Vehicle Options",
    description:
      "Choose the right vehicle for your delivery needs — bike, tricycle, pickup, or truck.",
  },
  {
    icon: Headphones,
    title: "24/7 Human Support",
    description:
      "Real people ready to help you at any time, via chat, phone, or email.",
  },
];

export default function Features() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
        {/* Left: Copy */}
        <div>
          <span className="inline-block text-orange-500 text-[10px] font-bold tracking-widest uppercase mb-4">
            Why Choose Us
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-10">
            Why Nigeria Prefers GoSwift
          </h2>
          <div className="space-y-8">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-5">
                <div className="shrink-0 w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                  <Icon size={20} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 mb-1">{title}</h4>
                  <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Images + Badge */}
        <div className="relative">
          <div className="grid grid-cols-2 gap-4">
            <div className="mt-12 rounded-2xl overflow-hidden shadow-lg">
              <Image
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAraq1W_hOO_yp6DOjYL_zunTCerguyfcFNVDGiKkBS3lOgxDmqgNMEPe6kfyvj3t0CRACkDxv3rkH1eyn9Si8lOwbQeIJKIpR1DSO-aKKuUzrB2iMYgoy2_NSK70p_AS_MmVnFrHiXtfrn7i77HYAbqTYlZu6wTNZ2S7HQ3pLanmuq39sRi6HorLi39DwsNE1qiMNSPWGavVvKlJZ0xJXHmtuhMDSeGimghtatLm5L_33oPrlYn4htIXM8fvOSp7dhe_qculJ-vxXI"
                alt="Courier delivering package"
                width={320}
                height={280}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <Image
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAqcsLdWlHCPxh8bTLzrcCHwlT_YxDHgMuO8WrZuzrLAjIXrxdBXfHWIJNDeMPU9CNrlZShQ5F_N3sMact3eErcSDDnfwKHQzmonruz9JqjUCeTn_qelehcNIG8BcVH6IS181D5XpmJaoeZKLNRB10NyeOqiehatoSfX22LbPSwv6AEsWx57T5bcdM3YoXhWc8bHFK18oo0ZRe7RlpwSpd0txShmwSTeKpWK7ko_AVDTuaOQgWtWKrVro4ujlD8aoBFNuK2GTLlw"
                alt="GoSwift logistics operations"
                width={320}
                height={280}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          </div>

          {/* Floating badge */}
          <div className="absolute -bottom-6 -left-6 bg-white px-6 py-5 rounded-2xl shadow-2xl border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shrink-0">
              <CheckCircle size={20} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">99.9%</div>
              <div className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">
                Success Rate
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
