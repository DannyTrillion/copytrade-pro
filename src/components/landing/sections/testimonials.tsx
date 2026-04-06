"use client";

import { motion, useInView, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { BadgeCheck, TrendingUp, BarChart3, Star, Users, Quote, ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const TRADERS = [
  {
    name: "Marcus Chen",
    role: "Senior Crypto Analyst",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
    color: "from-blue-500 to-cyan-400",
    ringColor: "rgba(59,130,246,0.5)",
    quote: "CopyTrade Pro changed how I monetize my research. My followers get the same entries I do, and the commission model pays itself. Best platform I've used in 8 years of trading.",
    stats: { experience: "8+ years", trades: "4,200+", winRate: "73%", followers: "1.2K" },
    rating: 5,
    pnl: "+847%",
  },
  {
    name: "Sarah Williams",
    role: "Quantitative Trader",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
    color: "from-purple-500 to-pink-400",
    ringColor: "rgba(168,85,247,0.5)",
    quote: "The webhook integration with TradingView is flawless. My alerts execute for hundreds of followers in under 200ms. Zero slippage issues since day one. The infrastructure is institutional-grade.",
    stats: { experience: "6+ years", trades: "2,800+", winRate: "71%", followers: "890" },
    rating: 5,
    pnl: "+623%",
  },
  {
    name: "David Okonkwo",
    role: "Prediction Markets Specialist",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face",
    color: "from-emerald-500 to-teal-400",
    ringColor: "rgba(16,185,129,0.5)",
    quote: "I was skeptical at first, but the execution quality won me over. My Polymarket signals are copied instantly and the risk controls protect my followers. It just works.",
    stats: { experience: "5+ years", trades: "3,400+", winRate: "68%", followers: "650" },
    rating: 5,
    pnl: "+412%",
  },
  {
    name: "Elena Petrov",
    role: "Head of Trading, DeFi Capital",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
    color: "from-amber-500 to-orange-400",
    ringColor: "rgba(245,158,11,0.5)",
    quote: "We moved our entire signal service to CopyTrade Pro. The tier system is fair, commissions are transparent, and the dashboard analytics are truly institutional grade.",
    stats: { experience: "10+ years", trades: "5,100+", winRate: "76%", followers: "2.1K" },
    rating: 5,
    pnl: "+1,240%",
  },
  {
    name: "James Park",
    role: "Algorithmic Strategy Lead",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
    color: "from-rose-500 to-red-400",
    ringColor: "rgba(244,63,94,0.5)",
    quote: "Finally a copy trading platform that doesn't feel like 2015. The UI is clean, the API is solid, and my followers trust the infrastructure. That's everything you need.",
    stats: { experience: "7+ years", trades: "6,800+", winRate: "69%", followers: "1.8K" },
    rating: 5,
    pnl: "+935%",
  },
  {
    name: "Aisha Rahman",
    role: "Macro & Crypto Analyst",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face",
    color: "from-indigo-500 to-violet-400",
    ringColor: "rgba(99,102,241,0.5)",
    quote: "What I love most is the transparency. Followers can see my full track record before they copy. It builds trust and keeps me accountable to real performance.",
    stats: { experience: "4+ years", trades: "1,900+", winRate: "72%", followers: "430" },
    rating: 5,
    pnl: "+385%",
  },
];

/* ─── Spotlight featured card (expanded top section) ─── */
function FeaturedCard({ trader, inView }: { trader: typeof TRADERS[number]; inView: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useTransform(mouseY, [-150, 150], [3, -3]);
  const rotateY = useTransform(mouseX, [-150, 150], [-3, 3]);
  const glowX = useTransform(mouseX, [-150, 150], [30, 70]);
  const glowY = useTransform(mouseY, [-150, 150], [30, 70]);

  const handleMouse = (e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease }}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, perspective: 800 }}
      className="relative rounded-2xl overflow-hidden group"
    >
      {/* Animated gradient border */}
      <div className="absolute inset-0 rounded-2xl p-px">
        <motion.div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: useTransform(
              [glowX, glowY],
              ([x, y]) => `radial-gradient(circle at ${x}% ${y}%, ${trader.ringColor}, transparent 60%)`
            ),
          }}
        />
      </div>

      <div
        className="relative rounded-2xl border border-white/[0.08] p-8 lg:p-10 group-hover:border-white/[0.14] transition-colors duration-300"
        style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(20px)" }}
      >
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Left: Avatar + info */}
          <div className="flex flex-col items-center md:items-start shrink-0">
            <div className="relative mb-4">
              {/* Glowing ring */}
              <div
                className="absolute -inset-[3px] rounded-full opacity-50 group-hover:opacity-80 transition-opacity duration-500"
                style={{ background: `linear-gradient(135deg, ${trader.ringColor}, transparent 60%)` }}
              />
              <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white/10">
                <img src={trader.image} alt={trader.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
              {/* Online dot */}
              <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-emerald-400 border-[2.5px] border-[#080A12]" />
            </div>

            <div className="text-center md:text-left">
              <div className="flex items-center gap-1.5 justify-center md:justify-start">
                <h3 className="text-base font-bold text-white">{trader.name}</h3>
                <BadgeCheck className="w-4.5 h-4.5 text-blue-400" />
              </div>
              <p className="text-xs text-white/40 mt-0.5">{trader.role}</p>

              {/* Star rating */}
              <div className="flex items-center gap-0.5 mt-2.5 justify-center md:justify-start">
                {Array.from({ length: trader.rating }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                ))}
              </div>

              {/* PnL badge */}
              <div className="flex items-center gap-1 mt-3 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 w-fit mx-auto md:mx-0">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-400">{trader.pnl} ROI</span>
              </div>
            </div>
          </div>

          {/* Right: Quote + stats */}
          <div className="flex-1 min-w-0">
            <Quote className="w-8 h-8 text-white/[0.06] mb-3 -ml-1" />
            <p className="text-[15px] text-white/65 leading-relaxed mb-6 italic">
              &ldquo;{trader.quote}&rdquo;
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Experience", value: trader.stats.experience, icon: TrendingUp },
                { label: "Trades", value: trader.stats.trades, icon: BarChart3 },
                { label: "Win Rate", value: trader.stats.winRate, icon: TrendingUp },
                { label: "Followers", value: trader.stats.followers, icon: Users },
              ].map((stat, j) => (
                <motion.div
                  key={j}
                  initial={{ opacity: 0, y: 10 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.4 + j * 0.08, duration: 0.4, ease }}
                  className="px-3 py-2.5 rounded-xl border border-white/[0.06] text-center"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                >
                  <stat.icon className="w-3.5 h-3.5 text-white/20 mx-auto mb-1.5" />
                  <p className="text-sm font-bold text-white">{stat.value}</p>
                  <p className="text-2xs text-white/30 mt-0.5">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Grid card ─── */
function TraderCard({ trader, index, inView }: { trader: typeof TRADERS[number]; index: number; inView: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: 0.2 + index * 0.1, duration: 0.5, ease }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative rounded-2xl border border-white/[0.06] p-6 transition-all duration-300 hover:border-white/[0.14] hover:-translate-y-1.5 h-full"
      style={{
        background: "rgba(255,255,255,0.02)",
        backdropFilter: "blur(12px)",
        boxShadow: hovered ? `0 12px 40px rgba(0,0,0,0.3), 0 0 30px ${trader.ringColor.replace("0.5", "0.06")}` : "none",
      }}
    >
      {/* Hover glow effect */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${trader.ringColor.replace("0.5", "0.08")}, transparent 60%)`,
        }}
      />

      {/* Header */}
      <div className="relative flex items-center gap-3.5 mb-5">
        <div className="relative">
          <div
            className="absolute -inset-[2px] rounded-full opacity-40 group-hover:opacity-70 transition-opacity duration-500"
            style={{ background: `linear-gradient(135deg, ${trader.ringColor}, transparent 60%)` }}
          />
          <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white/10">
            <img src={trader.image} alt={trader.name} className="w-full h-full object-cover" loading="lazy" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-white truncate">{trader.name}</p>
            <BadgeCheck className="w-4 h-4 text-blue-400 shrink-0" />
          </div>
          <p className="text-2xs text-white/40 mt-0.5">{trader.role}</p>
        </div>
        {/* PnL mini badge */}
        <div className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/15 shrink-0">
          <ArrowUpRight className="w-3 h-3 text-emerald-400" />
          <span className="text-2xs font-bold text-emerald-400">{trader.pnl}</span>
        </div>
      </div>

      {/* Stars */}
      <div className="relative flex items-center gap-0.5 mb-3">
        {Array.from({ length: trader.rating }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.4 + index * 0.1 + i * 0.05, duration: 0.3, ease }}
          >
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          </motion.div>
        ))}
      </div>

      {/* Quote */}
      <p className="relative text-sm text-white/50 leading-relaxed mb-5 line-clamp-3 group-hover:text-white/60 transition-colors duration-300">
        &ldquo;{trader.quote}&rdquo;
      </p>

      {/* Stats row */}
      <div className="relative flex items-center gap-2 flex-wrap">
        {[
          { icon: TrendingUp, value: trader.stats.experience },
          { icon: BarChart3, value: trader.stats.trades + " trades" },
          { icon: Users, value: trader.stats.followers },
        ].map((stat, j) => (
          <div
            key={j}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/[0.06] group-hover:border-white/[0.1] transition-colors duration-300"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <stat.icon className="w-3 h-3 text-white/25" />
            <span className="text-2xs font-medium text-white/35 group-hover:text-white/50 transition-colors duration-300">{stat.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Carousel navigation dots ─── */
function CarouselDots({ count, active, onSelect }: { count: number; active: number; onSelect: (i: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`transition-all duration-300 rounded-full ${
            i === active ? "w-6 h-2 bg-white/60" : "w-2 h-2 bg-white/15 hover:bg-white/30"
          }`}
          aria-label={`Go to testimonial ${i + 1}`}
        />
      ))}
    </div>
  );
}

/* ─── Main section ─── */
export function TestimonialsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  // Auto-rotate featured card
  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setFeaturedIndex((prev) => (prev + 1) % TRADERS.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (i: number) => {
    setDirection(i > featuredIndex ? 1 : -1);
    setFeaturedIndex(i);
  };

  const goPrev = () => {
    setDirection(-1);
    setFeaturedIndex((prev) => (prev - 1 + TRADERS.length) % TRADERS.length);
  };

  const goNext = () => {
    setDirection(1);
    setFeaturedIndex((prev) => (prev + 1) % TRADERS.length);
  };

  // Grid shows all except the featured one
  const gridTraders = TRADERS.filter((_, i) => i !== featuredIndex);

  return (
    <section className="relative py-24 lg:py-32 overflow-hidden" style={{ background: "#080A12" }} ref={ref} id="testimonials">
      {/* Background accents */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(41,98,255,0.04),transparent_60%)]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.03),transparent_60%)]" />
      </div>

      <div className="relative max-w-[1200px] mx-auto px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease }}
          className="text-center mb-14"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, ease }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] mb-6"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <div className="flex -space-x-2">
              {TRADERS.slice(0, 3).map((t, i) => (
                <div key={i} className="w-5 h-5 rounded-full overflow-hidden border border-[#080A12]">
                  <img src={t.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
            <span className="text-xs text-white/50 font-medium">Trusted by {TRADERS.length}+ expert traders</span>
          </motion.div>

          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-white leading-tight mb-4">
            Hear From Our Top Traders
          </h2>
          <p className="text-base text-white/45 max-w-[520px] mx-auto leading-relaxed">
            Real results from real traders who share their signals on CopyTrade Pro every day.
          </p>
        </motion.div>

        {/* Featured spotlight card with carousel */}
        <div className="relative mb-12">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={featuredIndex}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 60 : -60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -60 : 60 }}
              transition={{ duration: 0.4, ease }}
            >
              <FeaturedCard trader={TRADERS[featuredIndex]} inView={inView} />
            </motion.div>
          </AnimatePresence>

          {/* Navigation arrows */}
          <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 -left-4 lg:-left-6 z-10">
            <button
              onClick={goPrev}
              className="w-10 h-10 rounded-full border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white/80 hover:border-white/[0.2] hover:bg-white/[0.04] transition-all duration-200 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
          <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 -right-4 lg:-right-6 z-10">
            <button
              onClick={goNext}
              className="w-10 h-10 rounded-full border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white/80 hover:border-white/[0.2] hover:bg-white/[0.04] transition-all duration-200 active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <CarouselDots count={TRADERS.length} active={featuredIndex} onSelect={goTo} />
        </div>

        {/* Grid of remaining cards — desktop */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {gridTraders.map((trader, i) => (
            <motion.button
              key={trader.name}
              onClick={() => goTo(TRADERS.indexOf(trader))}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3 + i * 0.06, duration: 0.4, ease }}
              className="group text-left rounded-xl border border-white/[0.06] p-4 transition-all duration-300 hover:border-white/[0.14] hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="relative">
                  <div
                    className="absolute -inset-[2px] rounded-full opacity-30 group-hover:opacity-60 transition-opacity duration-400"
                    style={{ background: `linear-gradient(135deg, ${trader.ringColor}, transparent 60%)` }}
                  />
                  <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white/10">
                    <img src={trader.image} alt={trader.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-semibold text-white truncate">{trader.name}</p>
                    <BadgeCheck className="w-3 h-3 text-blue-400 shrink-0" />
                  </div>
                  <p className="text-2xs text-white/30 truncate">{trader.role}</p>
                </div>
              </div>
              <p className="text-2xs text-white/40 leading-relaxed line-clamp-2 group-hover:text-white/55 transition-colors duration-300">
                &ldquo;{trader.quote}&rdquo;
              </p>
              <div className="flex items-center gap-1 mt-2.5">
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                <span className="text-2xs font-bold text-emerald-400">{trader.pnl}</span>
                <span className="text-2xs text-white/20 ml-1">{trader.stats.winRate} win</span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Mobile horizontal scroll for mini cards */}
        <div className="md:hidden -mx-6 px-6">
          <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
            {TRADERS.filter((_, i) => i !== featuredIndex).map((trader) => (
              <button
                key={trader.name}
                onClick={() => goTo(TRADERS.indexOf(trader))}
                className="snap-start shrink-0 w-[200px] text-left rounded-xl border border-white/[0.06] p-3.5 transition-all duration-200 active:scale-[0.97]"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shrink-0">
                    <img src={trader.image} alt={trader.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{trader.name}</p>
                    <p className="text-2xs text-white/30 truncate">{trader.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                  <span className="text-2xs font-bold text-emerald-400">{trader.pnl}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
