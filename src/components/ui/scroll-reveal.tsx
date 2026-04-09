"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

// Slow, smooth easing — long deceleration tail
const ease = [0.16, 1, 0.3, 1] as const;

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
  duration?: number;
  scale?: boolean;
  distance?: number;
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = "up",
  duration = 1,
  scale = false,
  distance = 50,
}: ScrollRevealProps) {
  const ref = useRef(null);
  // amount: 0.2 means 20% of element must be visible before triggering
  const inView = useInView(ref, { once: true, amount: 0.15 });

  const initial: Record<string, number> = { opacity: 0 };
  if (direction === "up") initial.y = distance;
  if (direction === "left") initial.x = -distance;
  if (direction === "right") initial.x = distance;
  if (scale) initial.scale = 0.96;

  const animate = inView
    ? { opacity: 1, y: 0, x: 0, scale: 1 }
    : initial;

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={animate}
      transition={{ delay, duration, ease }}
      className={className}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}

export function StaggerContainer({ children, className, stagger = 0.1, delay = 0 }: StaggerContainerProps) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease } },
};
