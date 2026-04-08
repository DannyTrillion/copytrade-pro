"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Play, Clock, TrendingUp, Shield, BarChart3, Users } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const INSIGHTS = [
  {
    title: "How Copy Trading Works on Webull",
    description: "A complete walkthrough of connecting your account, choosing traders, and your first automated trade.",
    duration: "8:24",
    category: "Getting Started",
    icon: TrendingUp,
    color: "#0D71FF",
    featured: true,
  },
  {
    title: "Risk Management Strategies",
    description: "How to set allocation limits, daily loss caps, and protect your capital while copy trading.",
    duration: "5:12",
    category: "Strategy",
    icon: Shield,
    color: "#6366F1",
  },
  {
    title: "Reading Trader Performance Data",
    description: "Understanding win rate, drawdown, Sharpe ratio, and how to pick the right trader to copy.",
    duration: "6:45",
    category: "Analytics",
    icon: BarChart3,
    color: "#0D71FF",
  },
  {
    title: "Building a Diversified Copy Portfolio",
    description: "Why copying multiple traders reduces risk and how to allocate across different strategies.",
    duration: "7:18",
    category: "Strategy",
    icon: Users,
    color: "#8B5CF6",
  },
];

export function InsightsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const featured = INSIGHTS.find((i) => i.featured);
  const rest = INSIGHTS.filter((i) => !i.featured);

  return (
    <section className="relative py-24 lg:py-32" style={{ background: "#06060a" }} ref={ref} id="insights">
      <div className="max-w-[1140px] mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, ease }} className="text-center mb-14">
          <span className="inline-block text-xs font-medium text-[#0D71FF] uppercase tracking-[0.2em] mb-4">Insights</span>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-white leading-tight mb-4">Learn From the Best</h2>
          <p className="text-base text-white/35 max-w-[480px] mx-auto leading-relaxed">Trader breakdowns, market analysis, and strategy guides to sharpen your edge.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Featured card — large */}
          {featured && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1, duration: 0.6, ease }}
              className="lg:col-span-7 group relative rounded-2xl border border-white/[0.05] overflow-hidden cursor-pointer transition-all duration-300 hover:border-white/[0.1] hover:-translate-y-1"
              style={{ background: "rgba(255,255,255,0.015)" }}
            >
              {/* Thumbnail area */}
              <div className="relative h-[220px] md:h-[280px] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0D71FF]/20 to-[#6366F1]/10" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#06060a] via-transparent to-transparent" />

                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center group-hover:bg-white/15 transition-colors duration-300"
                  >
                    <Play className="w-6 h-6 text-white ml-0.5" fill="white" fillOpacity={0.9} />
                  </motion.div>
                </div>

                {/* Category badge */}
                <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#0D71FF]/20 text-[#0D71FF] border border-[#0D71FF]/15">
                  {featured.category}
                </div>

                {/* Duration */}
                <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm">
                  <Clock className="w-2.5 h-2.5 text-white/50" />
                  <span className="text-[10px] text-white/60 tabular-nums">{featured.duration}</span>
                </div>

                {/* Chart pattern decorative */}
                <svg className="absolute bottom-0 left-0 w-full h-20 opacity-20" viewBox="0 0 400 60" preserveAspectRatio="none">
                  <path d="M0 50 C50 40,100 45,150 25 C200 5,250 15,300 10 C350 5,380 8,400 3" stroke="white" strokeWidth="1" fill="none" strokeLinecap="round" />
                </svg>
              </div>

              {/* Text */}
              <div className="p-5 md:p-6">
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-[#0D71FF] transition-colors duration-300">{featured.title}</h3>
                <p className="text-sm text-white/30 leading-relaxed">{featured.description}</p>
              </div>
            </motion.div>
          )}

          {/* Side cards */}
          <div className="lg:col-span-5 space-y-4">
            {rest.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.5, ease }}
                className="group flex gap-4 rounded-xl border border-white/[0.05] p-4 cursor-pointer transition-all duration-300 hover:border-white/[0.1] hover:-translate-y-0.5"
                style={{ background: "rgba(255,255,255,0.015)" }}
              >
                {/* Thumbnail */}
                <div className="relative w-24 h-[72px] rounded-lg overflow-hidden shrink-0" style={{ background: `${item.color}08` }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                      <Play className="w-3 h-3 text-white/60 ml-0.5" fill="white" fillOpacity={0.5} />
                    </div>
                  </div>
                  <div className="absolute bottom-1 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm">
                    <span className="text-[8px] text-white/60 tabular-nums">{item.duration}</span>
                  </div>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <item.icon className="w-3 h-3" style={{ color: item.color }} />
                    <span className="text-[10px] font-medium" style={{ color: `${item.color}99` }}>{item.category}</span>
                  </div>
                  <h4 className="text-sm font-medium text-white/80 mb-0.5 group-hover:text-white transition-colors line-clamp-1">{item.title}</h4>
                  <p className="text-[11px] text-white/25 leading-relaxed line-clamp-2">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
