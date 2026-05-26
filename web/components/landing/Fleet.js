import { Bike, Truck, Package } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const vehicles = [
  {
    icon: Bike,
    name: "GoBike",
    maxWeight: "Max 20kg",
    description: "Perfect for documents, food, and small parcels across the city.",
    fill: "full",
    featured: false,
  },
  {
    icon: Package,
    name: "GoVan",
    maxWeight: "Max 500kg",
    description: "Ideal for e-commerce deliveries, bulk groceries, and small furniture items.",
    fill: "2/3",
    featured: true,
  },
  {
    icon: Truck,
    name: "GoTruck",
    maxWeight: "Max 5 Tons",
    description: "The powerhouse for heavy equipment, house moving, and bulk cargo.",
    fill: "1/3",
    featured: false,
  },
];

function ProgressBar({ fill, white }) {
  const widthMap = { full: "w-full", "2/3": "w-2/3", "1/3": "w-1/3" };
  return (
    <div className={`h-1 w-full rounded-full overflow-hidden ${white ? "bg-white/10" : "bg-slate-100"}`}>
      <div
        className={`h-full rounded-full ${widthMap[fill]} ${white ? "bg-orange-500 group-hover:bg-white" : "bg-orange-500"} transition-colors`}
      />
    </div>
  );
}

export default function Fleet() {
  return (
    <section id="fleet" className="bg-night py-24 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <span className="text-orange-500 text-[10px] font-bold tracking-widest uppercase block mb-3">
              Our Fleet
            </span>
            <h2 className="text-white text-3xl font-extrabold tracking-tight mb-2">
              Choose Your Ride
            </h2>
            <p className="text-slate-400 text-base">
              From small envelopes to house moving.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white/5 transition-all">
              <ChevronLeft size={18} />
            </button>
            <button className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white/5 transition-all">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-center">
          {vehicles.map(({ icon: Icon, name, maxWeight, description, fill, featured }) =>
            featured ? (
              <div
                key={name}
                className="bg-white p-8 rounded-3xl border border-slate-200 shadow-2xl lg:scale-105 lg:z-10"
              >
                <div className="flex justify-between items-start mb-12">
                  <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                    <Icon size={22} />
                  </div>
                  <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">
                    {maxWeight}
                  </span>
                </div>
                <h3 className="text-slate-900 text-xl font-bold mb-2">{name}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">{description}</p>
                <ProgressBar fill={fill} white={false} />
                <button className="mt-6 w-full bg-orange-600 text-white text-sm font-bold py-3 rounded-xl hover:bg-orange-700 transition-all active:scale-95">
                  Book GoVan
                </button>
              </div>
            ) : (
              <div
                key={name}
                className="group bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-orange-600 transition-all duration-300 cursor-pointer"
              >
                <div className="flex justify-between items-start mb-12">
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-orange-500 group-hover:text-white group-hover:bg-white/10 transition-colors">
                    <Icon size={22} />
                  </div>
                  <span className="text-slate-400 group-hover:text-white/70 text-[10px] font-bold tracking-widest uppercase transition-colors">
                    {maxWeight}
                  </span>
                </div>
                <h3 className="text-white text-xl font-bold mb-2">{name}</h3>
                <p className="text-slate-400 group-hover:text-white/80 text-sm leading-relaxed mb-6 transition-colors">
                  {description}
                </p>
                <ProgressBar fill={fill} white />
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
