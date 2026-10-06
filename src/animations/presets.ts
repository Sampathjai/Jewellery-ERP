/**
 * SHANKAR JEWELLERY ERP — Animation Presets
 * Pre-configured micro-interaction props to spread directly onto motion components.
 */

import type { TargetAndTransition } from 'motion/react';

export const cardHoverPreset: { whileHover: TargetAndTransition; whileTap: TargetAndTransition } = {
  whileHover: {
    scale: 1.01,
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.06)',
    transition: { duration: 0.18, ease: 'easeOut' },
  },
  whileTap: {
    scale: 0.995,
    transition: { duration: 0.08 },
  },
};

export const buttonHoverPreset: { whileHover: TargetAndTransition; whileTap: TargetAndTransition } = {
  whileHover: {
    scale: 1.01,
    transition: { duration: 0.12, ease: 'easeOut' },
  },
  whileTap: {
    scale: 0.98,
    transition: { duration: 0.08 },
  },
};

export const quickActionPreset: { whileHover: TargetAndTransition; whileTap: TargetAndTransition } = {
  whileHover: {
    scale: 1.015,
    transition: { duration: 0.14, ease: 'easeOut' },
  },
  whileTap: {
    scale: 0.98,
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
