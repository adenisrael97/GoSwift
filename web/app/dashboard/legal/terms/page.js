import PageShell from '@/components/ui/PageShell';
import AppHeader from '@/components/ui/AppHeader';

export const metadata = {
  title: 'Terms & Conditions — GoSwift',
  description: 'The terms governing your use of the GoSwift platform and services.',
};

const LAST_UPDATED = 'May 1, 2026';

const SECTIONS = [
  {
    title: '1. Introduction',
    body: [
      'Welcome to GoSwift. These Terms & Conditions ("Terms") govern your access to and use of the GoSwift website, mobile applications, and delivery services (collectively, the "Service"). By creating an account or using the Service, you agree to be bound by these Terms.',
      'If you do not agree with any part of these Terms, you must not use the Service.',
    ],
  },
  {
    title: '2. Eligibility & Account',
    body: [
      'You must be at least 8 years old to use GoSwift. You agree to provide accurate, current, and complete information during registration and to keep your account information up to date.',
      'You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.',
    ],
  },
  {
    title: '3. User Responsibilities',
    body: [
      'You agree to use the Service only for lawful purposes. You must not use GoSwift to ship illegal, hazardous, or restricted items, including but not limited to firearms, narcotics, perishable biological materials, or counterfeit goods.',
      'You are responsible for packaging items properly and providing accurate pickup and drop-off details. GoSwift is not liable for delays or damages caused by inaccurate information you provide.',
    ],
  },
  {
    title: '4. Service Description',
    body: [
      'GoSwift connects you with independent delivery drivers who fulfill your delivery requests. We act as a technology platform — we do not own the delivery vehicles nor employ the drivers directly.',
      'Estimated delivery times are indicative and may vary based on traffic, weather, and driver availability.',
    ],
  },
  {
    title: '5. Payments & Fees',
    body: [
      'All fees are displayed in Nigerian Naira (NGN) and are inclusive of applicable taxes unless stated otherwise. Payment is required at the time of booking through the supported payment methods.',
      'Refunds, where applicable, are processed back to your original payment method within 5–10 business days.',
    ],
  },
  {
    title: '6. Limitation of Liability',
    body: [
      'To the maximum extent permitted by law, GoSwift shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.',
      'Our total liability for any claim related to the Service is limited to the amount you paid for the specific delivery giving rise to the claim.',
    ],
  },
  {
    title: '7. Termination',
    body: [
      'We may suspend or terminate your access to the Service at any time, without notice, if you violate these Terms or engage in conduct that we determine to be harmful to GoSwift, our users, or third parties.',
      'You may close your account at any time from the Account → Delete Account screen in the app.',
    ],
  },
  {
    title: '8. Changes to These Terms',
    body: [
      'We may update these Terms from time to time. When we do, we will revise the "Last Updated" date at the top of this page. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.',
    ],
  },
  {
    title: '9. Contact Us',
    body: [
      'If you have any questions about these Terms, contact our support team via the Help Center inside the app.',
    ],
  },
];

export default function TermsPage() {
  return (
    <PageShell>
      <AppHeader backHref="/profile" title="Terms & Conditions" subtitle="Legal" rightSlot={<span />} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 pb-24">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F1923] tracking-tight">
            Terms &amp; Conditions
          </h1>
          <p className="mt-3 text-sm font-medium text-slate-500">
            Last updated: <span className="text-slate-700">{LAST_UPDATED}</span>
          </p>
          <p className="mt-6 text-base text-slate-600 leading-relaxed">
            Please read these Terms carefully before using GoSwift. They form a binding agreement
            between you and GoSwift regarding your use of our delivery platform.
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
