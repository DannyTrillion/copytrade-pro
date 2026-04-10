"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { Play, Clock, TrendingUp, Shield, BarChart3, Users, X, BookOpen, Zap } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const INSIGHTS = [
  {
    title: "How Copy Trading Works on Webull",
    description: "A complete walkthrough of connecting your account, choosing traders, and executing your first automated trade on the platform.",
    duration: "8:24",
    category: "Getting Started",
    icon: TrendingUp,
    color: "#0D71FF",
    featured: true,
    videoId: null, // Replace with YouTube ID when available
    thumbnail: "/screenshots/dashboard-dark.png",
  },
  {
    title: "Risk Management for Copy Traders",
    description: "How to configure allocation limits, set daily loss caps, and protect your capital while maximizing returns.",
    duration: "5:12",
    category: "Strategy",
    icon: Shield,
    color: "#6366F1",
    videoId: null,
  },
  {
    title: "Reading Trader Performance Metrics",
    description: "Understanding win rate, ROI, drawdown, and Sharpe ratio — and how to pick the right trader to copy.",
    duration: "6:45",
    category: "Analytics",
    icon: BarChart3,
    color: "#0D71FF",
    videoId: null,
  },
  {
    title: "Building a Diversified Portfolio",
    description: "Why copying multiple traders reduces risk and how to allocate across different strategies and markets.",
    duration: "7:18",
    category: "Strategy",
    icon: Users,
    color: "#8B5CF6",
    videoId: null,
  },
  {
    title: "Understanding Tier Benefits",
    description: "How deposit-based tiers work, commission rates, daily trade limits, and when to upgrade for maximum value.",
    duration: "4:30",
    category: "Platform",
    icon: Zap,
    color: "#0D71FF",
    videoId: null,
  },
  {
    title: "Beginner's Guide to Webull Trading",
    description: "Everything a first-time trader needs to know — from account setup to placing your first automated copy trade.",
    duration: "10:15",
    category: "Education",
    icon: BookOpen,
    color: "#6366F1",
    videoId: null,
  },
];

/* ─── Video Modal ─── */
function VideoModal({ isOpen, onClose, title, videoId }: { isOpen: boolean; onClose: () => void; title: string; videoId: string | null }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-[720px] rounded-2xl overflow-hidden bg-[#0a0a12] border border-white/[0.06]"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
              <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors text-white/40 border-none bg-transparent">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              {videoId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              ) : (
                <div className="text-center px-8">
                  <Play className="w-12 h-12 text-white/10 mx-auto mb-4" />
                  <p className="text-sm text-white/30">Video coming soon</p>
                  <p className="text-xs text-white/15 mt-2">This content is being produced and will be available shortly.</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function InsightsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });
  const [activeVideo, setActiveVideo] = useState<{ title: string; videoId: string | null } | null>(null);

  const featured = INSIGHTS[0];
  const grid = INSIGHTS.slice(1);

  return (
    <section className="relative py-24 lg:py-32" style={{ background: "#06060a" }} ref={ref} id="insights">
      <div className="max-w-[1140px] mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.9, ease }} className="text-center mb-14">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={inView ? { opacity: 1, scale: 1 } : {}} transition={{ delay: 0.1, duration: 0.8, ease }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#0D71FF]/15 bg-[#0D71FF]/[0.05] mb-6">
            <BookOpen className="w-3 h-3 text-[#0D71FF]/70" />
            <span className="text-xs font-medium text-[#0D71FF]/80 uppercase tracking-wider">Learn</span>
          </motion.div>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-white leading-tight mb-4">
            Insights & <span className="text-white/30 italic">Education</span>
          </h2>
          <p className="text-[15px] text-white/35 max-w-[480px] mx-auto leading-relaxed">Guides, breakdowns, and strategies to help you trade smarter.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Featured card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1, duration: 0.9, ease }}
            onClick={() => setActiveVideo({ title: featured.title, videoId: featured.videoId ?? null })}
            className="lg:col-span-7 group relative rounded-2xl border border-white/[0.04] overflow-hidden cursor-pointer transition-all duration-300 hover:border-white/[0.08]"
            style={{ background: "rgba(255,255,255,0.015)" }}
          >
            <div className="relative h-[200px] md:h-[280px] overflow-hidden">
              {featured.thumbnail ? (
                <img src={featured.thumbnail} alt={featured.title} className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-500" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#0D71FF]/20 to-[#6366F1]/10" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#06060a] via-[#06060a]/40 to-transparent" />

              {/* Play */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center group-hover:bg-white/15 group-hover:scale-110 transition-all duration-300">
                  <Play className="w-6 h-6 text-white ml-0.5" fill="white" fillOpacity={1} />
                </div>
              </div>

              <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#0D71FF]/20 text-[#0D71FF] border border-[#0D71FF]/15">
                {featured.category}
              </div>
              <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm">
                <Clock className="w-2.5 h-2.5 text-white/50" />
                <span className="text-[10px] text-white/60 tabular-nums">{featured.duration}</span>
              </div>
            </div>

            <div style={{padding: "20px 24px"}}>
              <h3 className="text-base font-semibold text-white mb-1.5 group-hover:text-[#0D71FF] transition-colors duration-300">{featured.title}</h3>
              <p className="text-[13px] text-white/35 leading-relaxed">{featured.description}</p>
            </div>
          </motion.div>

          {/* Side grid */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            {grid.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.7, ease }}
                onClick={() => setActiveVideo({ title: item.title, videoId: item.videoId ?? null })}
                className="group flex gap-3.5 rounded-xl border border-white/[0.04] p-3.5 cursor-pointer transition-all duration-300 hover:border-white/[0.08] hover:bg-white/[0.01]"
              >
                {/* Thumbnail */}
                <div className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0" style={{ background: `${item.color}08` }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                      <Play className="w-3 h-3 text-white/60 ml-0.5" fill="white" fillOpacity={0.8} />
                    </div>
                  </div>
                  <div className="absolute bottom-1 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm">
                    <span className="text-[8px] text-white/60 tabular-nums">{item.duration}</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <item.icon className="w-3 h-3" style={{ color: `${item.color}90` }} />
                    <span className="text-[10px] font-medium" style={{ color: `${item.color}70` }}>{item.category}</span>
                  </div>
                  <h4 className="text-[13px] font-medium text-white/70 mb-0.5 group-hover:text-white transition-colors line-clamp-1">{item.title}</h4>
                  <p className="text-[11px] text-white/25 leading-relaxed line-clamp-1">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Video Modal */}
      <VideoModal
        isOpen={!!activeVideo}
        onClose={() => setActiveVideo(null)}
        title={activeVideo?.title || ""}
        videoId={activeVideo?.videoId ?? null}
      />
    </section>
  );
}
