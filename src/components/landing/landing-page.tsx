"use client";

import dynamic from "next/dynamic";
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
  return (
    <div className="min-h-screen overflow-hidden bg-white text-[#131722]">
      <Navbar />
      {/* Hero — dark, full viewport */}
      <HeroSection />
      {/* Video showcase — dark section */}
      <VideoShowcaseSection />
      {/* 3D Globe — dark section */}
      <GlobalReachSection />
      {/* All sections below — TradingView light mode */}
      <div className="relative z-10 bg-white">
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
