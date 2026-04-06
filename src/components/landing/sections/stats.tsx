"use client";

import { motion, useInView, animate } from "framer-motion";
import { useRef, useEffect, useState } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

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
    { value: 284500, prefix: "$", suffix: "", label: "Total Volume Traded" },
    { value: 2847, prefix: "", suffix: "+", label: "Trades Copied" },
    { value: 48, prefix: "", suffix: "+", label: "Active Master Traders" },
    { value: 180, prefix: "<", suffix: "ms", label: "Avg Execution Speed" },
  ];

  return (
    <section className="relative py-24 lg:py-32" style={{ background: "#080A12" }} ref={ref}>
      <div className="max-w-[1100px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease }}
          className="text-center mb-14"
        >
          <span className="inline-block text-xs font-medium text-white/40 uppercase tracking-[0.2em] mb-4">Performance</span>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-white leading-tight">
            Numbers That Speak
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.06, duration: 0.4, ease }}
            >
              <div className="border border-white/[0.06] rounded-xl p-6 lg:p-8 text-center hover:border-white/[0.1] transition-colors duration-200 h-full" style={{ background: "rgba(255,255,255,0.02)" }}>
                <p className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold text-white mb-1.5 leading-none">
                  <AnimatedCounter
                    target={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    delay={i * 0.1}
                  />
                </p>
                <p className="text-sm text-white/45 font-medium">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
