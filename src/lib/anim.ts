import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";

/** True when the user has asked the OS to minimize motion. Guards every animation below. */
export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Run the start-state synchronously before paint on the client (minimizes hydration flash),
// while falling back to useEffect on the server to avoid the SSR warning.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Run a gsap timeline scoped to `scope` on mount. The callback receives a `gsap.Context`-bound
 * `self` so any selector-based tweens are automatically cleaned up on unmount. No-ops (and leaves
 * the natural, fully-visible layout untouched) when reduced motion is requested.
 */
export function useGsapEntrance<T extends HTMLElement>(
  build: (ctx: { self: HTMLElement }) => void,
  deps: unknown[] = [],
) {
  const ref = useRef<T | null>(null);

  useIsoLayoutEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    const el = ref.current;
    const ctx = gsap.context(() => build({ self: el }), el);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

/**
 * Reveal elements matching `selector` inside `scope` as they scroll into view.
 * Uses IntersectionObserver (SSR-safe, no ScrollTrigger dependency) and animates each target once.
 */
export function useScrollReveal<T extends HTMLElement>(
  selector: string,
  options?: { y?: number; duration?: number; stagger?: number },
  deps: unknown[] = [],
) {
  const ref = useRef<T | null>(null);

  useIsoLayoutEffect(() => {
    const scope = ref.current;
    if (!scope) return;
    const targets = Array.from(scope.querySelectorAll<HTMLElement>(selector));
    if (targets.length === 0) return;

    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      gsap.set(targets, { clearProps: "all" });
      return;
    }

    const y = options?.y ?? 24;
    const duration = options?.duration ?? 0.6;

    gsap.set(targets, { opacity: 0, y });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          observer.unobserve(el);
          gsap.to(el, { opacity: 1, y: 0, duration, ease: "power3.out" });
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selector, ...deps]);

  return ref;
}
