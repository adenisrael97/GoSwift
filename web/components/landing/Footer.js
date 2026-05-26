import { X, Globe } from "lucide-react";

const footerLinks = {
  Company: ["About Us", "Careers", "Blog", "Contact"],
  Services: ["Courier", "Haulage", "Corporate", "Warehousing"],
  Support: ["Help Center", "Terms", "Privacy", "Safety"],
};

export default function Footer() {
  return (
    <footer className="bg-slate-950 pt-20 pb-10 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Main grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12 border-b border-white/5 pb-16">
          {/* Brand */}
          <div className="col-span-2">
            <div className="text-orange-500 font-black text-2xl mb-4">
              Go<span className="text-white">Swift</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Nigeria&apos;s premium on-demand logistics platform. Moving the nation,
              one parcel at a time.
            </p>
            <div className="flex gap-3 mt-8">
              <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-300 hover:bg-orange-600 hover:text-white transition-all">
                <X size={16} />
              </button>
              <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-300 hover:bg-orange-600 hover:text-white transition-all">
                <Globe size={16} />
              </button>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-white font-bold text-sm mb-6">{heading}</h4>
              <ul className="space-y-4">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-slate-400 hover:text-white transition-colors text-sm"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-500 text-sm">
            © 2024 GoSwift Logistics Nigeria. Fast. Reliable. Secure.
          </p>
          <div className="flex gap-8">
            <span className="text-slate-500 text-sm">English (NG)</span>
            <span className="text-slate-500 text-sm">
              Waitlist:{" "}
              <span className="text-orange-500 font-semibold">2,431</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
