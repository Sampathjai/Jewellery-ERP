/**
 * SHANKAR JEWELLERY ERP — Animation Presets
 * Pre-configured micro-interaction props to spread directly onto motion components.
 */

import type { TargetAndTransition } from 'motion/react';

export const cardHoverPreset: { whileHover: TargetAndTransition; whileTap: TargetAndTransition } = {
  whileHover: {
    scale: 1.012,
    boxShadow: '0 8px 28px rgba(212, 175, 55, 0.12)',
    transition: { type: 'spring', stiffness: 420, damping: 30, mass: 0.7 },
  },
  whileTap: {
    scale: 0.99,
    transition: { duration: 0.08 },
  },
};

export const buttonHoverPreset: { whileHover: TargetAndTransition; whileTap: TargetAndTransition } = {
  whileHover: {
    scale: 1.02,
    transition: { type: 'spring', stiffness: 450, damping: 28 },
  },
  whileTap: {
    scale: 0.97,
    transition: { duration: 0.08 },
  },
};

export const quickActionPreset: { whileHover: TargetAndTransition; whileTap: TargetAndTransition } = {
  whileHover: {
    scale: 1.025,
    transition: { type: 'spring', stiffness: 450, damping: 28 },
  },
  whileTap: {
    scale: 0.97,
    transition: { duration: 0.08 },
  },
};

export const iconHoverPreset: { whileHover: TargetAndTransition } = {
  whileHover: {
    rotate: 6,
    scale: 1.08,
    transition: { type: 'spring', stiffness: 500, damping: 20 },
  },
};

export const navItemPreset: { whileHover: TargetAndTransition; whileTap: TargetAndTransition } = {
  whileHover: {
    x: 2,
    transition: { duration: 0.14, ease: 'easeOut' },
  },
  whileTap: {
    scale: 0.98,
  },
};
