import Image from "next/image";
import { Star } from "lucide-react";

const testimonials = [
  {
    quote:
      "GoSwift has transformed my e-commerce business. Deliveries that used to take days now happen in hours. The tracking is amazing!",
    name: "Adesua O.",
    role: "E-Commerce Owner",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDg5KcV4dicJXSKZmrk1VJACca-ZbCkpiuqJ0bB8mw5sKIv5bKS2kVAvbuH9m_8WtECJr2L9CWpx0dVxNc4AzYo43p6wUp-aMMdkHVaJWknTLEfdL0OSXuudaXdLSiJqI19OxzjFSsD3FIvKRgphvsBDKtNxxhdpxOFSKmWU-wa_l9FBfi87gX55CohW_4IHedmWs2V-DaYTbxRQAEWcjqTQKfdpo5AIxPKhoHaLiq3YJBc4HzxNO6gHJUpkksjYeBz4CD2ZNocujBc",
  },
  {
    quote:
      "I needed to move my entire office over the weekend. GoTruck was fast, professional, and very affordable. Highly recommended.",
    name: "Emeka N.",
    role: "Tech CEO",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAoFhDi63G6J3Y0SwVQLg-Kcge-5KzTaRwzT4I52f9jdwPvI8qGQqqgNlc52kZww1DsoPxd0OV3yvpsGzyZnlZ0djIM2cJ2laF7CVMwfpkFYzTMOiYV0Mbh529RIl9wiYFfFQpQNkZWUBYBuYmVLK7q2fs3I042P3r8vJpV17Ml4-K2QDfeJqFGWimhXNXVnzqH5uwrasJTspxLWkBYB6qUOn3QaMF-el9s8smDEYa_EN2zxCUx2DREEVlUWaGlpXz8qGG3n4uvXRct",
  },
  {
    quote:
      "Fastest courier service in Abuja. Sent a document to Garki and it was delivered within 25 minutes. Super impressed!",
    name: "Tunde A.",
    role: "Freelancer",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCDq2k5hW4SeNmFXvbh3sOFemMxfLxrEH1mEwsPgduO3qhhiFi6vKB6vy6MnzFYhYfJRXzgF6cE6_1JyN1bZKDZxj_8Aek1GoR7OE_UtlK0ldF52uNg-yQ6InFDutl726HcHb3iBMF-VNb3OKnn0PPz8LGiA4M4T-Of3NLW3BNK-jCyIOgxJMpXnP7WD0DjaIEXAjJSWM5rN74Qsthh1h29766hro9K-KDbiD8QtF9vdPF3_7s78g2ymDCrAgd6Qd58V8XTCRlx2Gmv",
  },
];

function Stars() {
  return (
    <div className="flex gap-0.5 text-orange-500 mb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={16} fill="currentColor" />
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section className="py-24 px-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-orange-500 text-[10px] font-bold tracking-widest uppercase mb-3">
            Reviews
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            What Our Users Say
          </h2>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map(({ quote, name, role, avatar }) => (
            <div
              key={name}
              className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
            >
              <Stars />
              <p className="text-slate-600 text-sm leading-relaxed italic mb-6">
                &ldquo;{quote}&rdquo;
              </p>
              <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 shrink-0">
                  <Image
                    src={avatar}
                    alt={name}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{name}</div>
                  <div className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">
                    {role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
