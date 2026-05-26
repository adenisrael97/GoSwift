import PageShell from '@/components/ui/PageShell';
import AppHeader from '@/components/ui/AppHeader';

export const metadata = {
  title: 'Privacy Policy — GoSwift',
  description: 'How GoSwift collects, uses, and protects your personal information.',
};

const LAST_UPDATED = 'May 1, 2026';

const SECTIONS = [
  {
    title: '1. Data Collection',
    body: [
      'We collect information you provide directly to us — such as your name, email address, phone number, and delivery addresses — when you create an account, place an order, or contact support.',
      'We also collect device and usage information automatically, including your IP address, device type, browser, app version, approximate location, and interactions with our Service.',
    ],
  },
  {
    title: '2. Data Usage',
    body: [
      'We use your information to operate, maintain, and improve the GoSwift Service. This includes processing your orders, dispatching drivers, sending status updates, preventing fraud, and providing customer support.',
      'With your consent, we may also use your information to send you promotional offers or product updates. You can opt out of marketing communications at any time.',
    ],
  },
  {
    title: '3. Cookies & Similar Technologies',
    body: [
      'We use cookies and similar tracking technologies to keep you signed in, remember your preferences, measure performance, and understand how the Service is used.',
      'You can control cookies through your browser settings, although disabling them may affect parts of the Service.',
    ],
  },
  {
    title: '4. Data Sharing',
    body: [
      'We share limited information with the independent drivers fulfilling your deliveries — such as your name, phone number, and pickup/drop-off addresses — strictly to complete your order.',
      'We may also share information with payment processors, analytics providers, and law-enforcement authorities where required. We do not sell your personal information.',
    ],
  },
  {
    title: '5. Your Rights',
    body: [
      'You have the right to access, correct, or delete the personal information we hold about you. You can also object to or restrict certain processing, and request a copy of your data in a portable format.',
      'To exercise any of these rights, use the in-app controls under Account, or contact us through the Help Center.',
    ],
  },
  {
    title: '6. Data Security',
    body: [
      'We use industry-standard safeguards — including TLS encryption in transit and access controls — to protect your information. No system is perfectly secure, but we work continuously to maintain a high standard of protection.',
    ],
  },
  {
    title: '7. Data Retention',
    body: [
      'We retain your personal information for as long as your account is active or as needed to provide the Service. After account closure, we retain limited data only as required for legal, accounting, or fraud-prevention purposes.',
    ],
  },
  {
    title: '8. Changes to This Policy',
    body: [
      'We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or via email and update the "Last Updated" date above.',
    ],
  },
  {
    title: '9. Contact Us',
    body: [
      'For privacy questions or to exercise your rights, reach us through the Help Center inside the app.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <PageShell>
      <AppHeader backHref="/profile" title="Privacy Policy" subtitle="Legal" rightSlot={<span />} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 pb-24">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F1923] tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm font-medium text-slate-500">
            Last updated: <span className="text-slate-700">{LAST_UPDATED}</span>
          </p>
          <p className="mt-6 text-base text-slate-600 leading-relaxed">
            Your privacy matters. This policy explains what information we collect, how we use it,
            and the choices you have about your data.
          </p>
        </header>

        <article className="space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F1923] mb-3 tracking-tight">
                {section.title}
              </h2>
              <div className="space-y-4 text-slate-600 text-base leading-relaxed">
                {section.body.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </article>
      </main>
    </PageShell>
  );
}
