import { redirect } from 'next/navigation';

import { getAuthFromCookie } from '@/lib/server/getAuthFromCookie';
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import TrustBar from "@/components/landing/TrustBar";
import HowItWorks from "@/components/landing/HowItWorks";
import Fleet from "@/components/landing/Fleet";
import Features from "@/components/landing/Features";
import DriverCTA from "@/components/landing/DriverCTA";
import Testimonials from "@/components/landing/Testimonials";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export default async function Home() {
  const auth = await getAuthFromCookie();
  if (auth) {
    if (auth.role === 'admin')  redirect('/admin/dashboard');
    if (auth.role === 'driver') redirect('/driver/dashboard');
    redirect('/dashboard');
  }

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <HowItWorks />
        <Fleet />
        <Features />
        <DriverCTA />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </>
  );
}

