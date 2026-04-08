"use client";

import dynamic from "next/dynamic";
import { HeroSection } from "./sections/hero";
import { Navbar } from "./sections/navbar";

// Lazy-load below-fold sections
const HowItWorksSection = dynamic(() => import("./sections/how-it-works").then((m) => m.HowItWorksSection));
const FeaturesSection = dynamic(() => import("./sections/features").then((m) => m.FeaturesSection));
const TestimonialsSection = dynamic(() => import("./sections/testimonials").then((m) => m.TestimonialsSection));
const InsightsSection = dynamic(() => import("./sections/insights").then((m) => m.InsightsSection));
const CtaSection = dynamic(() => import("./sections/cta").then((m) => m.CtaSection));
const Footer = dynamic(() => import("./sections/footer").then((m) => m.Footer));

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#06060a] text-white">
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <TestimonialsSection />
      <InsightsSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
