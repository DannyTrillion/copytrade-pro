"use client";

import dynamic from "next/dynamic";
import { HeroSection } from "./sections/hero";
import { Navbar } from "./sections/navbar";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

// Lazy-load below-fold sections
const HowItWorksSection = dynamic(() => import("./sections/how-it-works").then((m) => m.HowItWorksSection));
const FeaturesSection = dynamic(() => import("./sections/features").then((m) => m.FeaturesSection));
const LeoSection = dynamic(() => import("./sections/leo-section").then((m) => m.LeoSection));
const TestimonialsSection = dynamic(() => import("./sections/testimonials").then((m) => m.TestimonialsSection));
const InsightsSection = dynamic(() => import("./sections/insights").then((m) => m.InsightsSection));
const CtaSection = dynamic(() => import("./sections/cta").then((m) => m.CtaSection));
const Footer = dynamic(() => import("./sections/footer").then((m) => m.Footer));

function SectionDivider() {
  return (
    <div className="max-w-[200px] mx-auto">
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#06060a] text-white">
      <Navbar />
      <HeroSection />
      <ScrollReveal>
        <HowItWorksSection />
      </ScrollReveal>
      <SectionDivider />
      <ScrollReveal delay={0.05}>
        <FeaturesSection />
      </ScrollReveal>
      <SectionDivider />
      <ScrollReveal delay={0.05}>
        <LeoSection />
      </ScrollReveal>
      <SectionDivider />
      <ScrollReveal delay={0.05}>
        <TestimonialsSection />
      </ScrollReveal>
      <SectionDivider />
      <ScrollReveal delay={0.05}>
        <InsightsSection />
      </ScrollReveal>
      <SectionDivider />
      <ScrollReveal delay={0.05} scale>
        <CtaSection />
      </ScrollReveal>
      <Footer />
    </div>
  );
}
