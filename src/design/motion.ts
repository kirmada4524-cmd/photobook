export const motionTokens = {
  duration: {
    instant: 0.12,
    fast: 0.16,
    base: 0.22,
    slow: 0.32,
    book: 0.58,
    pageTurn: 0.85,
  },
  easing: {
    standard: [0.2, 0.8, 0.2, 1] as const,
    emphasized: [0.2, 0, 0, 1] as const,
    page: [0.4, 0, 0.2, 1] as const,
  },
} as const;

export type MotionDuration = keyof typeof motionTokens.duration;
export type MotionEasing = keyof typeof motionTokens.easing;

export function getTransition(
  duration: MotionDuration = "base",
  easing: MotionEasing = "standard",
) {
  return {
    duration: motionTokens.duration[duration],
    ease: motionTokens.easing[easing],
  };
}
