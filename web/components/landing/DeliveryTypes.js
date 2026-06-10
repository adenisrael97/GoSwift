import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const types = [
  {
    image: "/Deliverytypes/bike.jpeg",
    name: "GoBike",
    subtitle: "Express Courier",
    description:
      "Lightning-fast delivery for documents, food, and small parcels. Perfect for same-day, time-sensitive deliveries across the city.",
    weight: "Up to 20 kg",
    eta: "15 – 30 min",
  },
  {
    image: "/Deliverytypes/tricyle.jpeg",
    name: "GoTricycle",
    subtitle: "Local Delivery",
    description:
      "Reliable and affordable for medium-sized goods, groceries, and neighbourhood-to-neighbourhood transfers.",
    weight: "Up to 100 kg",
    eta: "20 – 45 min",
  },
  {
    image: "/Deliverytypes/van.jpeg",
    name: "GoVan",
    subtitle: "Bulk & Retail",
    description:
      "Spacious and professionally managed — ideal for e-commerce stock, furniture, and bulk retail transfers.",
    weight: "Up to 500 kg",
    eta: "30 – 60 min",
  },
  {
    image: "/Deliverytypes/truck.jpeg",
    name: "GoTruck",
    subtitle: "Heavy Haulage",
    description:
      "The powerhouse for heavy equipment, house removals, construction materials, and large-scale cargo.",
    weight: "Up to 5 Tons",
    eta: "Scheduled",
  },
  {
    image: "/Deliverytypes/trucks.jpeg",
    name: "GoFleet",
    subtitle: "Enterprise Logistics",
    description:
      "Full fleet solutions for businesses with high-volume delivery needs — scale with dedicated drivers and vehicles.",
    weight: "Unlimited",
    eta: "Custom SLA",
  },
];

export default function DeliveryTypes() {
  return (
    <section id="delivery-types" className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-orange-500 text-[10px] font-bold tracking-widest uppercase mb-3">
            What We Move
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
            Delivery Types
          </h2>
          <p className="text-slate-500 text-base leading-relaxed max-w-lg mx-auto">
            From a single envelope to an entire fleet — GoSwift has the right
            vehicle for every delivery need across Nigeria.
          </p>
        </div>

        {/* Cards grid — 2 cols on mobile, 3 on md, 5 on xl */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {types.map(({ image, name, subtitle, description, weight, eta }) => (
            <div
              key={name}
              className="group relative rounded-2xl overflow-hidden shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer"
            >
              {/* Photo */}
              <div className="relative h-60 w-full">
                <Image
                  src={image}
                  alt={`${name} — ${subtitle}`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
                />
                {/* Dark gradient so text is always readable */}
                <div className="absolute inset-0 bg-linear-to-t from-[#0A1520]/90 via-[#0A1520]/40 to-transparent" />
              </div>

              {/* Content overlaid on bottom of card */}
              <div className="absolute inset-0 flex flex-col justify-end p-5">
                {/* Subtitle */}
                <span className="text-orange-400 text-[9px] font-bold tracking-widest uppercase mb-1">
                  {subtitle}
                </span>

                {/* Name */}
                <h3 className="text-white text-lg font-extrabold mb-2 leading-tight">
                  {name}
                </h3>

                {/* Description — hidden until hover */}
                <p className="text-white/75 text-xs leading-relaxed mb-3 max-h-0 overflow-hidden group-hover:max-h-24 transition-all duration-300">
                  {description}
                </p>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] bg-white/15 backdrop-blur-sm text-white px-2.5 py-1 rounded-full font-semibold">
                    {weight}
                  </span>
                  <span className="text-[10px] bg-orange-500/30 backdrop-blur-sm text-orange-300 px-2.5 py-1 rounded-full font-semibold">
                    {eta}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-orange-600 text-white font-bold text-sm px-8 py-4 rounded-xl hover:bg-orange-500 hover:shadow-[0_0_24px_rgba(255,107,53,0.35)] transition-all active:scale-95"
          >
            Book a Delivery <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
