"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 2,
  duration = 1200,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;

    const startTime = performance.now();
    const startValue = 0;

    function update(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (value - startValue) * eased;

      if (decimals === 0) {
        setDisplay(Math.round(current).toLocaleString());
      } else {
        setDisplay(
          current.toLocaleString("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })
        );
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }, [inView, value, decimals, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

/** Formats and animates a currency value */
export function AnimatedCurrency({
  value,
  className,
  duration = 1200,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const isNegative = value < 0;
  const absValue = Math.abs(value);

  return (
    <AnimatedCounter
      value={absValue}
      prefix={isNegative ? "-$" : "$"}
      decimals={2}
      duration={duration}
      className={className}
    />
  );
}
