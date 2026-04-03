"use client";

import { motion, useInView, animate } from "framer-motion";
import { useRef, useEffect, useState } from "react";

/** Design-system color tokens for SVG attributes */
const STAT_COLORS = ["#2962FF", "#26A69A", "#AB47BC", "#FF9800"] as const;

function AnimatedCounter({ target, suffix = "", prefix = "", duration = 2, delay = 0 }: {
  target: number; suffix?: string; prefix?: string; duration?: number; delay?: number;
}) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const timeout = setTimeout(() => {
      const controls = animate(0, target, {
        duration,
        ease: "easeOut",
        onUpdate: (v) => setValue(Math.round(v)),
      });
      return () => controls.stop();
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [inView, target, duration, delay]);

  return (
    <span ref={ref}>
      {prefix}{value.toLocaleString()}{suffix}
    </span>
  );
}

export function StatsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const stats = [
    { value: 284500, prefix: "$", suffix: "", label: "Total Volume Traded", icon: "chart" },
    { value: 2847, prefix: "", suffix: "+", label: "Trades Copied", icon: "copy" },
    { value: 48, prefix: "", suffix: "+", label: "Active Master Traders", icon: "users" },
    { value: 180, prefix: "<", suffix: "ms", label: "Avg Execution Speed", icon: "zap" },
  ];

  return (
    <section className="relative py-24 lg:py-32 bg-surface-0" ref={ref}>
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-semibold text-warning uppercase tracking-[0.08em] mb-4">Platform Performance</span>
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-bold text-text-primary leading-tight">
            Numbers That{" "}
            <span className="bg-gradient-to-r from-warning to-danger bg-clip-text text-transparent">
              Speak
            </span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="bg-white border border-border rounded-2xl p-8 text-center hover:border-border-light transition-all duration-300 hover:shadow-card-hover h-full">
                <p className="text-[clamp(2rem,4vw,3rem)] font-bold text-text-primary mb-2 leading-none">
                  <AnimatedCounter
                    target={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    delay={i * 0.12}
                  />
                </p>
                <p className="text-sm text-text-secondary font-medium mb-3">{stat.label}</p>
                {/* Sparkline — draws itself on scroll */}
                <svg width="100%" height="32" viewBox="0 0 120 32" preserveAspectRatio="none" className="mt-1">
                  <defs>
                    <linearGradient id={`spark-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={STAT_COLORS[i]} stopOpacity="0.12" />
                      <stop offset="100%" stopColor={STAT_COLORS[i]} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <motion.path
                    d={[
                      "M0,24 L10,22 L20,18 L30,20 L40,15 L50,17 L60,12 L70,14 L80,8 L90,10 L100,6 L110,7 L120,4 L120,32 L0,32 Z",
                      "M0,20 L10,18 L20,22 L30,16 L40,14 L50,18 L60,10 L70,12 L80,8 L90,11 L100,5 L110,6 L120,3 L120,32 L0,32 Z",
                      "M0,26 L10,24 L20,20 L30,22 L40,18 L50,15 L60,17 L70,12 L80,14 L90,10 L100,8 L110,9 L120,5 L120,32 L0,32 Z",
                      "M0,18 L10,20 L20,16 L30,14 L40,18 L50,12 L60,10 L70,14 L80,8 L90,6 L100,9 L110,5 L120,3 L120,32 L0,32 Z",
                    ][i]}
                    fill={`url(#spark-grad-${i})`}
                    initial={{ opacity: 0 }}
                    animate={inView ? { opacity: 1 } : {}}
                    transition={{ delay: 0.8 + i * 0.15, duration: 0.6 }}
                  />
                  <motion.polyline
                    fill="none"
                    stroke={STAT_COLORS[i]}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={[
                      "0,24 10,22 20,18 30,20 40,15 50,17 60,12 70,14 80,8 90,10 100,6 110,7 120,4",
                      "0,20 10,18 20,22 30,16 40,14 50,18 60,10 70,12 80,8 90,11 100,5 110,6 120,3",
                      "0,26 10,24 20,20 30,22 40,18 50,15 60,17 70,12 80,14 90,10 100,8 110,9 120,5",
                      "0,18 10,20 20,16 30,14 40,18 50,12 60,10 70,14 80,8 90,6 100,9 110,5 120,3",
                    ][i]}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={inView ? { pathLength: 1, opacity: 1 } : {}}
                    transition={{ delay: 0.5 + i * 0.15, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  />
                </svg>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
