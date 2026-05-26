const partners = [
  "JUMIA",
  "KONGA",
  "FLUTTERWAVE",
  "PAYSTACK",
  "INTERSWITCH",
  "ANDELA",
  "JUMIA",
  "KONGA",
  "FLUTTERWAVE",
  "PAYSTACK",
];

export default function TrustBar() {
  return (
    <section className="bg-white py-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-10">
          Trusted by Industry Leaders
        </p>
        <div className="relative overflow-hidden">
          {/* Fade edges */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10" />

          <div className="flex items-center gap-20 grayscale opacity-50 w-[200%] animate-marquee">
            {[...partners, ...partners].map((name, i) => (
              <span
                key={i}
                className="text-2xl font-black text-slate-900 whitespace-nowrap"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
