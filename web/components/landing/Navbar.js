"use client";

import { useState } from "react";
import { Menu, X, Zap } from "lucide-react";
import Link from "next/link";

const navLinks = [
  { label: "Home",             href: "#",           active: true },
  { label: "How it Works",     href: "#how-it-works" },
  { label: "Fleet",            href: "#fleet" },
  { label: "Become a Driver",  href: "#drivers" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <a href="#" className="flex items-center gap-2 select-none">
          <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center shadow-sm">
            <Zap size={15} className="text-white" fill="white" />
          </div>
          <span className="text-xl font-extrabold text-slate-900 tracking-tighter">
            Go<span className="text-orange-500">Swift</span>
          </span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(({ label, href, active }) => (
            <a
              key={label}
              href={href}
              className={`text-sm font-semibold transition-colors ${
                active ? "text-orange-500" : "text-slate-500 hover:text-orange-500"
              }`}
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center gap-2 text-slate-600 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="hidden sm:inline-flex items-center gap-2 bg-orange-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-orange-700 transition-all active:scale-95"
          >
            Get Started
          </Link>
          <button
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pb-6 pt-4 space-y-1">
          {navLinks.map(({ label, href, active }) => (
            <a
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                active
                  ? "bg-orange-50 text-orange-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-orange-500"
              }`}
            >
              {label}
            </a>
          ))}
          <div className="pt-4 flex flex-col gap-2">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center w-full border border-slate-200 text-slate-700 text-sm font-semibold px-5 py-3 rounded-xl hover:bg-slate-50 transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center w-full bg-orange-600 text-white text-sm font-bold px-5 py-3 rounded-xl hover:bg-orange-700 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
