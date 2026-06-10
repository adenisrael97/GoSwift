"use client";

import { useState, useEffect, useCallback } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "GoSwift has transformed my e-commerce business. Deliveries that used to take days now happen in hours. The real-time tracking is incredibly reassuring.",
    name: "Adesua O.",
    role: "E-Commerce Owner",
    city: "Lagos",
    rating: 5,
    initials: "AO",
    color: "bg-orange-500",
  },
  {
    quote:
      "I needed to move my entire office over the weekend. GoTruck was fast, professional, and very affordable. The team handled everything with care.",
    name: "Emeka N.",
    role: "Tech CEO",
    city: "Abuja",
    rating: 5,
    initials: "EN",
    color: "bg-slate-700",
  },
  {
    quote:
      "Fastest courier service in Abuja. Sent a document to Garki and it was delivered within 25 minutes. Super impressed — I use GoSwift every week now!",
    name: "Tunde A.",
    role: "Freelancer",
    city: "Abuja",
    rating: 5,
    initials: "TA",
    color: "bg-orange-700",
  },
  {
    quote:
      "As a small business owner, I rely on GoSwift for daily dispatches. The pricing is transparent, drivers are always professional, and support is always available.",
    name: "Kemi B.",
    role: "Fashion Retailer",
    city: "Lagos",
    rating: 5,
    initials: "KB",
    color: "bg-emerald-600",
  },
  {
    quote:
      "I was skeptical at first but GoSwift delivered my fragile electronics safely and on time. The packaging guidelines and care from the driver were exceptional.",
    name: "Chidi O.",
    role: "Electronics Reseller",
    city: "Ibadan",
    rating: 5,
    initials: "CO",
    color: "bg-blue-600",
  },
];

function Stars({ count = 5 }) {
  return (
    <div className="flex gap-0.5 text-orange-500">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={14} fill="currentColor" />
      ))}
    </div>
  );
}

export default function Testimonials() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const total = testimonials.length;

  const next = useCallback(() => {
    setActive((prev) => (prev + 1) % total);
  }, [total]);

  const prev = useCallback(() => {
    setActive((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Auto-advance every 5 s, pause on hover
  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [paused, next]);

  const current = testimonials[active];
  // Precompute adjacent indices for the preview thumbnails
  const prevIdx = (active - 1 + total) % total;
  const nextIdx = (active + 1) % total;

  return (
    <section
      className="py-24 px-6 bg-night overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-orange-500 text-[10px] font-bold tracking-widest uppercase mb-3">
            Customer Stories
          </span>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            What Our Users Say
          </h2>
        </div>

        {/* Carousel */}
        <div className="relative max-w-4xl mx-auto">
          {/* Main card */}
          <div
            key={active}
            className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-3xl p-10 md:p-14 text-center animate-fade-in"
          >
            {/* Quote icon */}
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 bg-orange-600/20 rounded-full flex items-center justify-center">
                <Quote size={20} className="text-orange-500" />
              </div>
            </div>

            {/* Stars */}
            <div className="flex justify-center mb-6">
              <Stars count={current.rating} />
            </div>

            {/* Quote */}
            <blockquote className="text-white text-lg md:text-xl leading-relaxed font-medium mb-10 max-w-2xl mx-auto">
              &ldquo;{current.quote}&rdquo;
            </blockquote>

            {/* Author */}
            <div className="flex flex-col items-center gap-3">
              <div
                className={`w-14 h-14 ${current.color} rounded-full flex items-center justify-center text-white font-extrabold text-lg select-none`}
              >
                {current.initials}
              </div>
              <div>
                <div className="text-white font-bold text-base">{current.name}</div>
                <div className="text-slate-400 text-xs font-semibold tracking-wide">
                  {current.role} &middot; {current.city}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation arrows */}
          <button
            onClick={prev}
            aria-label="Previous testimonial"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 md:-translate-x-10 w-11 h-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white hover:bg-orange-600 hover:border-orange-600 transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={next}
            aria-label="Next testimonial"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 md:translate-x-10 w-11 h-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white hover:bg-orange-600 hover:border-orange-600 transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Dot navigation */}
        <div className="flex justify-center gap-2.5 mt-10">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Go to testimonial ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === active
                  ? "w-8 h-2.5 bg-orange-500"
                  : "w-2.5 h-2.5 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>

        {/* Preview row — hidden on mobile */}
        <div className="hidden md:flex justify-center gap-6 mt-10">
          {[prevIdx, nextIdx].map((idx) => {
            const t = testimonials[idx];
            return (
              <button
                key={idx}
                onClick={() => setActive(idx)}
                className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 hover:bg-white/10 transition-all group"
              >
                <div
                  className={`w-9 h-9 ${t.color} rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0`}
                >
                  {t.initials}
                </div>
                <div className="text-left">
                  <div className="text-white text-xs font-bold">{t.name}</div>
                  <div className="text-slate-500 text-[10px]">{t.role}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
