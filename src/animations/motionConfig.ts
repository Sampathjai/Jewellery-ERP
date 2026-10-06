/**
 * SHANKAR JEWELLERY ERP — Motion Config & Accessibility Hooks
 * Integrates prefers-reduced-motion for zero performance overhead on low-spec or sensitive devices.
 */

import { useReducedMotion } from 'motion/react';

export function useMotionSafe() {
  const prefersReduced = useReducedMotion();
  return { prefersReduced: Boolean(prefersReduced) };
}

export const MOTION_FEATURE_CONFIG = {
  reducedMotion: 'user' as const,
};
