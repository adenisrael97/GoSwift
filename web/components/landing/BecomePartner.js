import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bike, Handshake } from "lucide-react";

const cards = [
  {
    image: "/Become/driver.jpeg",
    icon: Bike,
    eyebrow: "For Riders",
    title: "Become a Driver",
    description:
      "Join 2,000+ verified GoSwift drivers. Enjoy flexible hours, daily payout options, free branded gear, and a high-tech platform that keeps your earnings growing.",
    highlights: ["Flexible schedule", "Daily payout options", "Free training & support"],
    ctaLabel: "Become a Driver",
    ctaHref: "/register/driver",
    overlayFrom: "from-orange-700/85",
    overlayTo: "to-[#0A1520]/95",
  },
  {
    image: "/Become/partner.jpeg",
    icon: Handshake,
    eyebrow: "For Businesses",
    title: "Become a Logistics Partner",
    description:
      "Own a business or fleet? Partner with GoSwift to power your deliveries, expand your reach, and tap into thousands of daily orders across Nigeria.",
    highlights: ["Dedicated account manager", "Bulk delivery discounts", "Custom SLA agreements"],
    ctaLabel: "Contact Us",
    ctaHref: "/contact",
    overlayFrom: "from-slate-800/85",
    overlayTo: "to-[#0A1520]/95",
  },
];

export default function BecomePartner() {
  return (
    <section id="partners" className="py-24 px-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-orange-500 text-[10px] font-bold tracking-widest uppercase mb-3">
            Join Our Network
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
            Grow With GoSwift
          </h2>
          <p className="text-slate-500 text-base leading-relaxed max-w-md mx-auto">
            Whether you ride or run a logistics business — there&apos;s a place
            for you in the GoSwift network.
          </p>
        </div>

        {/* Two-column cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {cards.map(
            ({
              image,
              icon: Icon,
              eyebrow,
              title,
              description,
              highlights,
              ctaLabel,
              ctaHref,
              overlayFrom,
              overlayTo,
            }) => (
              <div
                key={title}
                className="group relative rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 min-h-[520px]"
              >
                {/* Background photo */}
                <Image
                  src={image}
                  alt={title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />

                {/* Gradient overlay */}
                <div
                  className={`absolute inset-0 bg-linear-to-t ${overlayFrom} ${overlayTo}`}
                />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-10">
                  {/* Icon chip */}
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center text-white mb-5 border border-white/20">
                    <Icon size={22} />
                  </div>

                  {/* Eyebrow */}
                  <span className="text-orange-400 text-[10px] font-bold tracking-widest uppercase mb-2">
                    {eyebrow}
                  </span>

                  {/* Title */}
                  <h3 className="text-white text-2xl font-extrabold tracking-tight mb-3">
                    {title}
                  </h3>

                  {/* Description */}
                  <p className="text-white/70 text-sm leading-relaxed mb-5">
                    {description}
                  </p>

                  {/* Highlights */}
                  <ul className="space-y-2 mb-8">
                    {highlights.map((h) => (
                      <li
                        key={h}
                        className="flex items-center gap-2 text-white/80 text-xs"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                        {h}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href={ctaHref}
                    className="inline-flex items-center gap-2 self-start bg-orange-600 text-white font-bold text-sm px-7 py-3.5 rounded-xl hover:bg-orange-500 hover:shadow-[0_0_20px_rgba(255,107,53,0.45)] transition-all active:scale-95"
                  >
                    {ctaLabel} <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
