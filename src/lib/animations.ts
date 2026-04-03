export const EASING = {
  outExpo: [0.16, 1, 0.3, 1] as const,
  outQuart: [0.25, 1, 0.5, 1] as const,
  spring: [0.34, 1.56, 0.64, 1] as const,
} as const;

export const DURATION = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
} as const;

export const pageTransition = {
  duration: DURATION.normal,
  ease: EASING.outExpo,
} as const;

export const staggerChildren = (delay: number = 0.04) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: DURATION.normal, ease: EASING.outExpo },
}) as const;

export const fadeIn = (delay: number = 0) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { delay, duration: DURATION.normal },
}) as const;

export const slideUp = (delay: number = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: DURATION.normal, ease: EASING.outExpo },
}) as const;
