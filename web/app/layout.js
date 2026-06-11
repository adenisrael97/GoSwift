import "./globals.css";
import Providers from "@/context/Providers";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import WhatsAppButton from "@/components/shared/WhatsAppButton";

export const metadata = {
  title: "GoSwift | Fast & Reliable Logistics Nigeria",
  description:
    "Experience the fastest on-demand logistics network in Nigeria. From documents to heavy cargo, we move it with precision.",
  applicationName: "GoSwift",
  // Makes iOS treat the home-screen launch as a standalone app.
  // statusBarStyle "default" keeps the status bar as its own opaque region so
  // it never overlaps our top:0 sticky headers. "black-translucent" would push
  // content under the notch and require env(safe-area-inset-top) padding on
  // every screen — which the app's headers don't currently have.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GoSwift",
  },
  // The manifest <link> and apple-touch-icon are auto-injected by Next from
  // app/manifest.js and app/apple-icon.png — don't add them by hand here.
};

export const viewport = {
  themeColor: "#0F1923",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // extend under the notch when installed
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
        <WhatsAppButton />
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
