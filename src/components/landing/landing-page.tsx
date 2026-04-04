"use client";

import dynamic from "next/dynamic";
import { motion, useScroll, useSpring } from "framer-motion";
import { HeroSection } from "./sections/hero";
import { Navbar } from "./sections/navbar";

// Lazy-load below-fold sections — they don't need to block initial render
const VideoShowcaseSection = dynamic(() => import("./sections/video-showcase").then((m) => m.VideoShowcaseSection));
const GlobalReachSection = dynamic(() => import("./sections/global-reach").then((m) => m.GlobalReachSection));
const IntegrationSection = dynamic(() => import("./sections/integrations").then((m) => m.IntegrationSection));
const HowItWorksSection = dynamic(() => import("./sections/how-it-works").then((m) => m.HowItWorksSection));
const FeaturesSection = dynamic(() => import("./sections/features").then((m) => m.FeaturesSection));
const MasterTraderSection = dynamic(() => import("./sections/master-trader").then((m) => m.MasterTraderSection));
const FollowerSection = dynamic(() => import("./sections/follower").then((m) => m.FollowerSection));
const StatsSection = dynamic(() => import("./sections/stats").then((m) => m.StatsSection));
const LeaderboardSection = dynamic(() => import("./sections/leaderboard").then((m) => m.LeaderboardSection));
const SecuritySection = dynamic(() => import("./sections/security").then((m) => m.SecuritySection));
const CtaSection = dynamic(() => import("./sections/cta").then((m) => m.CtaSection));
const Footer = dynamic(() => import("./sections/footer").then((m) => m.Footer));

export function LandingPage() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return (
    <div className="min-h-screen overflow-hidden bg-[#080A12] text-white">
      {/* Scroll progress indicator */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-0.5 z-[200] origin-left"
        style={{
          scaleX,
          background: "linear-gradient(90deg, #2962FF, #26A69A, #AB47BC)",
        }}
      />
      <Navbar />
      {/* Hero — dark, full viewport */}
      <HeroSection />
      {/* Video showcase — dark section */}
      <VideoShowcaseSection />
      {/* 3D Globe — dark section */}
      <GlobalReachSection />
      {/* All sections below — consistent dark theme */}
      <div className="relative z-10">
        <IntegrationSection />
        <HowItWorksSection />
        <FeaturesSection />
        <MasterTraderSection />
        <FollowerSection />
        <StatsSection />
        <LeaderboardSection />
        <SecuritySection />
        <CtaSection />
        <Footer />
      </div>
    </div>
  );
}
