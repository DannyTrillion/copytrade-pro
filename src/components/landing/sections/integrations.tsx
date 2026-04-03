"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { BarChart3, ArrowRight, Webhook, Send } from "lucide-react";

export function IntegrationSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const steps = [
    {
      icon: BarChart3,
      platform: "TradingView",
      label: "Signal Source",
      desc: "Master trader creates alert on TradingView chart with custom webhook payload.",
      color: "#2962FF",
      bgColor: "bg-brand/10",
    },
    {
      icon: Webhook,
      platform: "CopyTrade Pro",
      label: "Copy Engine",
      desc: "Webhook receives signal, validates auth, and calculates positions per follower.",
      color: "#26A69A",
      bgColor: "bg-success/10",
    },
    {
      icon: Send,
      platform: "Polymarket",
      label: "Execution",
      desc: "Trades executed on Polymarket for all followers with retry logic.",
      color: "#1452F0",
      bgColor: "bg-brand/10",
    },
  ];

  return (
    <section className="relative py-24 lg:py-32 bg-white" ref={ref}>
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16 lg:mb-20"
        >
          <span className="inline-block text-xs font-semibold text-brand uppercase tracking-widest mb-4">Integration Pipeline</span>
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-bold text-text-primary leading-tight mb-5">
            Three Platforms.{" "}
            <span className="bg-gradient-to-r from-brand to-success bg-clip-text text-transparent">
              One Flow.
            </span>
          </h2>
          <p className="text-base text-text-secondary max-w-[560px] mx-auto leading-relaxed">
            Seamless integration between TradingView signals, our copy engine, and Polymarket execution.
          </p>
        </motion.div>

        {/* Flow diagram */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
          {/* Connecting lines */}
          <div className="hidden md:block absolute top-1/2 left-[33%] right-[33%] h-px bg-gradient-to-r from-brand/15 via-success/15 to-brand-dark/15 -translate-y-1/2 z-0" />

          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10"
            >
              <div className="bg-white border border-border rounded-2xl p-8 hover:border-border-light transition-all duration-300 group hover:shadow-card-hover">
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${step.bgColor}`}
                >
                  <step.icon className="w-6 h-6" style={{ color: step.color }} />
                </div>

                <span className="text-2xs font-semibold uppercase tracking-widest text-text-secondary">{step.label}</span>
                <h3 className="text-xl font-bold text-text-primary mt-1 mb-3">{step.platform}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{step.desc}</p>

                {i < 2 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white border border-border items-center justify-center shadow-sm">
                    <ArrowRight className="w-3.5 h-3.5 text-text-secondary" />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Detail flow */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 bg-surface-2 border border-border rounded-2xl p-8 lg:p-10"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Trader Sends Signal", desc: "Alert fires from TradingView with action, symbol, and price" },
              { step: "02", title: "Webhook Receives", desc: "Our API validates, authenticates, and deduplicates the signal" },
              { step: "03", title: "Engine Processes", desc: "Calculates position size per follower based on individual risk settings" },
              { step: "04", title: "Trades Execute", desc: "Parallel execution on Polymarket with retry logic and error handling" },
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <span className="text-3xl font-black text-brand/10 leading-none flex-shrink-0">{item.step}</span>
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-1.5">{item.title}</h4>
                  <p className="text-xs text-text-secondary leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Live Market Ticker Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 overflow-hidden border border-border rounded-2xl bg-white"
        >
          <div className="flex items-center border-b border-border px-5 py-2.5">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse live-pulse text-success mr-2" />
            <span className="text-2xs font-semibold text-text-secondary uppercase tracking-widest">Live Market Prices</span>
          </div>
          <div className="relative overflow-hidden">
            <motion.div
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="flex whitespace-nowrap py-3.5 px-4"
            >
              {[
                { symbol: "BTC/USD", price: "67,432.50", change: "+2.34%", up: true },
                { symbol: "ETH/USD", price: "3,521.80", change: "+1.87%", up: true },
                { symbol: "SOL/USD", price: "148.65", change: "-0.92%", up: false },
                { symbol: "AAPL", price: "189.72", change: "+0.65%", up: true },
                { symbol: "TSLA", price: "245.30", change: "-1.23%", up: false },
                { symbol: "EUR/USD", price: "1.0842", change: "+0.12%", up: true },
                { symbol: "GOLD", price: "2,345.10", change: "+0.78%", up: true },
                { symbol: "SPY", price: "512.40", change: "+0.45%", up: true },
                { symbol: "BTC/USD", price: "67,432.50", change: "+2.34%", up: true },
                { symbol: "ETH/USD", price: "3,521.80", change: "+1.87%", up: true },
                { symbol: "SOL/USD", price: "148.65", change: "-0.92%", up: false },
                { symbol: "AAPL", price: "189.72", change: "+0.65%", up: true },
                { symbol: "TSLA", price: "245.30", change: "-1.23%", up: false },
                { symbol: "EUR/USD", price: "1.0842", change: "+0.12%", up: true },
                { symbol: "GOLD", price: "2,345.10", change: "+0.78%", up: true },
                { symbol: "SPY", price: "512.40", change: "+0.45%", up: true },
              ].map((item, i) => (
                <div key={i} className="inline-flex items-center gap-3 mr-8 px-4 py-1.5 rounded-lg bg-surface-2 border border-border/50 hover:bg-surface-3 transition-colors duration-200">
                  <span className="text-xs font-semibold text-text-primary">{item.symbol}</span>
                  <span className="text-xs text-text-primary font-medium">${item.price}</span>
                  <span className={`text-xs font-semibold ${item.up ? "text-success" : "text-danger"}`}>
                    {item.change}
                  </span>
                  <svg width="32" height="14" viewBox="0 0 32 14" className="ml-1">
                    <polyline
                      fill="none"
                      stroke={item.up ? "#26A69A" : "#EF5350"}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={item.up ? "0,12 6,9 12,10 18,5 24,6 32,2" : "0,2 6,5 12,4 18,9 24,8 32,12"}
                    />
                  </svg>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
