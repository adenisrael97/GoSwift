import { Phone, MessageCircle, Clock, Mail, ChevronRight } from 'lucide-react';

import PageShell from '@/components/ui/PageShell';
import AppHeader from '@/components/ui/AppHeader';

export const metadata = {
  title: 'Help Center — GoSwift',
  description: 'Get in touch with GoSwift support via WhatsApp or phone.',
};

const WHATSAPP_NUMBER_DISPLAY = '+234 805 402 9416';
const WHATSAPP_URL            = 'https://wa.me/2348054029416';

const CALL_NUMBER_DISPLAY = '+234 703 463 1181';
const CALL_URL            = 'tel:+2347034631181';

const FAQS = [
  { q: 'How do I track my order?',          a: 'Open the Orders tab and tap any active order to see live status.' },
  { q: 'Can I cancel a delivery?',          a: 'Yes — before a driver is assigned, cancel directly from the order screen.' },
  { q: 'What payment methods do you accept?', a: 'Card, bank transfer, and supported mobile wallets — all charged in NGN.' },
  { q: 'How do I report a damaged item?',   a: 'Reach us on WhatsApp within 24 hours of delivery with photos of the package.' },
];

function WhatsappIcon({ size = 22 }) {
  return (
    <MessageCircle size={size} strokeWidth={2.25} />
  );
}

export default function HelpCenterPage() {
  return (
    <PageShell>
      <AppHeader backHref="/profile" title="Help Center" subtitle="Support" rightSlot={<span />} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 pb-24">

        {/* Intro */}
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F1923] tracking-tight">
            How can we help?
          </h1>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            Our support team is here for you. Reach out on WhatsApp for the fastest response,
            or call us directly if it&apos;s urgent.
          </p>
        </header>

        {/* Contact Options */}
        <section className="space-y-4">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 p-5 sm:p-6 rounded-2xl bg-[#25D366] text-white shadow-sm hover:shadow-md active:scale-[0.99] transition-all"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <WhatsappIcon size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base sm:text-lg leading-tight">Chat on WhatsApp</p>
              <p className="text-sm text-white/85 mt-0.5 truncate">{WHATSAPP_NUMBER_DISPLAY}</p>
            </div>
            <ChevronRight
              size={20}
              className="text-white/80 group-hover:translate-x-1 transition-transform shrink-0"
            />
          </a>

          <a
            href={CALL_URL}
            className="group flex items-center gap-4 p-5 sm:p-6 rounded-2xl bg-[#0F1923] text-white shadow-sm hover:shadow-md active:scale-[0.99] transition-all"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Phone size={24} strokeWidth={2.25} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base sm:text-lg leading-tight">Call Support</p>
              <p className="text-sm text-white/70 mt-0.5 truncate">{CALL_NUMBER_DISPLAY}</p>
            </div>
            <ChevronRight
              size={20}
              className="text-white/70 group-hover:translate-x-1 transition-transform shrink-0"
            />
          </a>

          <div className="flex items-start gap-2 px-1 pt-2">
            <Clock size={16} className="text-slate-400 mt-0.5 shrink-0" />
            <p className="text-sm text-slate-500 leading-relaxed">
              We typically respond within minutes on WhatsApp. Phone lines are open
              <span className="font-semibold text-slate-700"> 8am–10pm</span>, every day.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-[#0F1923] mb-4 tracking-tight">
            Frequently asked
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50 overflow-hidden">
            {FAQS.map((item) => (
              <details key={item.q} className="group">
                <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none hover:bg-slate-50 transition-colors">
                  <span className="font-semibold text-slate-700 text-base">{item.q}</span>
                  <ChevronRight
                    size={18}
                    className="text-slate-400 shrink-0 transition-transform group-open:rotate-90"
                  />
                </summary>
                <p className="px-5 pb-5 -mt-1 text-slate-600 text-sm leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Email fallback */}
        <section className="mt-10">
          <div className="flex items-center gap-3 p-5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
              <Mail size={18} className="text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700">Prefer email?</p>
              <a
                href="mailto:support@goswift.app"
                className="text-sm text-[#ff6b35] font-medium hover:underline"
              >
                support@goswift.app
              </a>
            </div>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
