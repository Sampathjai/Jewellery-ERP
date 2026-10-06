/**
 * SHANKAR JEWELLERY ERP — Motion Transitions
 * Reusable spring and tween presets for consistent luxury feel across all modules.
 */

// ─── Spring Presets ───────────────────────────────────────────────────────────

export const springSnappy = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 32,
  mass: 0.8,
};

export const springGentle = {
  type: 'spring' as const,
  stiffness: 280,
  damping: 30,
  mass: 1,
};

export const springBouncy = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 24,
  mass: 0.7,
};

// ─── Easings ──────────────────────────────────────────────────────────────────

export const easeOutExpo = [0.16, 1, 0.3, 1] as const;
export const easeInOutSmooth = [0.4, 0, 0.2, 1] as const;

// ─── Durations ────────────────────────────────────────────────────────────────

export const DURATION = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.24,
  relaxed: 0.35,
  slow: 0.45,
} as const;

// ─── Tweens ───────────────────────────────────────────────────────────────────

export const tweenFast = {
  type: 'tween' as const,
  duration: DURATION.fast,
  ease: easeOutExpo,
};

export const tweenNormal = {
  type: 'tween' as const,
  duration: DURATION.normal,
  ease: easeOutExpo,
};
