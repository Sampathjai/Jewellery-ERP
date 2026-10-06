/**
 * SHANKAR JEWELLERY ERP — GSAP Animation Utilities
 * Selective GSAP timeline helper with automatic cleanup on unmount.
 * Prevents memory leaks and background animation loops.
 */

import gsap from 'gsap';

export interface TimelineOptions {
  defaults?: gsap.TweenVars;
  autoKillOnUnmount?: boolean;
}

/**
 * Creates a scoped GSAP context on a React container element.
 * Safely reverts and kills all tweens when the return cleanup function is called.
 */
export function createScopedTimeline(
  scopeRef: React.RefObject<HTMLElement | null>,
  animationFn: (ctx: gsap.Context) => void
): () => void {
  // Check prefers-reduced-motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    return () => {};
  }

  const ctx = gsap.context(() => {
    animationFn(ctx);
  }, scopeRef);

  return () => ctx.revert();
}

/**
 * Premium gold shimmer sweep effect on an element
 */
export function triggerGoldShimmer(target: HTMLElement | string) {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  gsap.fromTo(
    target,
    { filter: 'brightness(1)', scale: 1 },
    {
      filter: 'brightness(1.15) drop-shadow(0 0 8px rgba(212,175,55,0.4))',
      scale: 1.015,
      duration: 0.25,
      yoyo: true,
      repeat: 1,
      ease: 'power2.out',
    }
  );
}

export default gsap;
